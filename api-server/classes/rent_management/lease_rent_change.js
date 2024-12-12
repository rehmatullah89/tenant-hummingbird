const e = require("../../modules/error_handler.js")
const utils = require("../../modules/utils.js");
const models = require(`./../../models`)
const PropertyModel = require("../../models/property.js")
const UnitModel = require("../../models/units.js")
const LeaseRentChangeModel = require("../../models/rent-management/lease_rent_change.js")
const PropertyRentManagementModel = require('../../models/rent-management/property_rent_management.js');
const CompanyRentManagementSettingsModel = require('../../models/rent-management/company_rent_management.js');
const RentChangeLeasesModel = require(__dirname + '/../../models/rent_change_leases');
const moment = require('moment');
const RoundOff = require('../../modules/rounding.js');
const Lease = require('../lease.js');
const Hash = require('../../modules/hashes.js');
const Hashes = Hash.init();

const bullmq = require('bullmq')
const IORedis = require('ioredis')
const allowances = require("../../models/msr/allowances/index.js")
const redis_connection = new IORedis({ host: process.env.REDIS_HOST })
const Queue = new bullmq.Queue('hummingbirdQueue', { connection: redis_connection })
var Report = require(__dirname + '../../report.js');


class LeaseRentChange {
    constructor(params, body) {
        this.property_id = params?.property_id || null;
        this.company_id = params?.company_id || null;
        this.rent_change_id = params?.rent_change_id || body?.rent_change_id || body?.rentChangeId || null;
        this.rentChangeIds = body?.rent_change_ids || body?.rentChangeIds || [];
        this.userId = body?.user_id || body?.userId || null;
        this.consolidatedRentChangeData = [];
        this.action = params?.action || null;
        this.tagged = body?.tag;
        this.resolved = body?.resolve;
        this.note = body?.note?.trim() || null;
        this.validRentChanges = [];
        this.failedOperations = [];
        this.successfulOperations = [];
        this.validRentChangeIds = [];
        this.rentChangeType = body?.type || null;
        this.targetDate = body?.target_date || null;
        this.changeDirection = body?.change_direction || 'Increase';
        this.approval_type = body?.approval_type || null
    }

    async getConsolidatedRentChangeData(connection) {
        this.consolidatedRentChangeData = await LeaseRentChangeModel.fetchConsolidatedRentChangeData(connection, this.rentChangeIds)
    }

    async getScheduledRentChanges(connection, effectiveDate, rentChangeIds, deploymentMonth) {
        let rentChanges = await LeaseRentChangeModel.getScheduledRentChanges(
            connection,
            this.property_id,
            effectiveDate,
            deploymentMonth,
            rentChangeIds,
            moment().format('YYYY-MM-DD')
        )
        if (!rentChangeIds) {
            // If rent change ids are present in the request data
            for (let rentChange of rentChanges) {
                this.rentChangeIds.push(rentChange.rent_change_id)
            }
        }
        this.consolidatedRentChangeData = rentChanges;
    }

    async validateRentChange(connection) {
        let rentChange = await LeaseRentChangeModel.fetchConsolidatedRentChangeData(connection, [this.rent_change_id]);
        this.rentChange = rentChange[0];

        if (!this.rentChange) e.th(400, `Invalid Rent Change ID`);
    }

    static validateRentChangeActionsRequest(req, res, next) {
        const { params: { action }, body } = req;

        if (action == `resolve`) {
            if (body.resolve == undefined) e.th(400, `'resolve' is required`);
            if (body.months_skipped) e.th(400, `'months_skipped' not allowed`);
        }

        if (action == `skip` && body.resolve !== undefined)  e.th(400, `'resolve' is not allowed`);
        next();
    }

    validateRentChanges() {
        let error;
        this.validRentChanges = this.consolidatedRentChangeData;

        if(this.action != `tag`) {
            // no action except tag is supported for leases in auctioned status;
            this.validRentChanges = this.validRentChanges.filter((rentChange) => {
                if (['move_out', 'auction_payment'].includes(rentChange?.auction_status)) {
                    let error = `Cannot ${this.action} an auctioned unit`
                    this.failedOperations.push({ rent_change_id: rentChange.rent_change_id, error });
                    return false;
                }
                return true;
            });
        }

        if ([`skip`, `cancel`].includes(this.action)) {
            this.validRentChanges = this.validRentChanges.filter(rentChange => ([`initiated`, `approved`].includes(rentChange.rent_change_status)));
            error = `Cannot find a pending or approved Rent Change with this ID`;
        }
        else if (this.action == `tag`) {
            error = `Cannot find the rent change to ${this.tagged ? `tag` : `untag`}`;
        }
        else if (this.action == `approve`) {
            error = `Cannot find the rent change to approve`;
        }
        else if (this.action == `resolve`) this.validateRentChangeForResolving();

        this.rentChangeIds.forEach(rentChangeId => {
            if (
                !this.validRentChanges.some(rentChange => (rentChange.rent_change_id == rentChangeId)) &&
                !this.failedOperations.some(rentChange => (rentChange.rent_change_id == rentChangeId))
            ) this.failedOperations.push({ rent_change_id: rentChangeId, error });
        });

    }

    validateRentChangeForResolving() {
        if (this.resolved) {
            this.validRentChanges = this.validRentChanges.filter((rentChange) => {

                if (moment().add((rentChange.notification_period), `days`).isBefore(rentChange.effective_date)) {
                    let error = `There's still time left to automatically notify the tenant`
                    this.failedOperations.push({ rent_change_id: rentChange.rent_change_id, error });
                    return false;
                }

                if (rentChange.rent_change_status != `approved`) {
                    let error = `Rent change not in approved status`
                    this.failedOperations.push({ rent_change_id: rentChange.rent_change_id, error });
                    return false;
                }

                if ((rentChange.notification_status != `error`) && (rentChange.interaction) && (rentChange.interaction?.status != `error`)) {
                    let error = `Notification already sent`
                    this.failedOperations.push({ rent_change_id: rentChange.rent_change_id, error });
                    return false;
                }

                if (rentChange.resolved || rentChange.interaction?.resolved) {
                    let error = `Rent change ${ (rentChange.interaction?.resolved && 'interaction') } already resolved`
                    this.failedOperations.push({ rent_change_id: rentChange.rent_change_id, error });
                    return false;
                }

                return true;
            });
        }
        else {
            this.validRentChanges = this.validRentChanges.filter((rentChange) => {
                if (!rentChange.resolved && !rentChange.interaction?.resolved) {
                    let error = `Rent change is not in resolved status`
                    this.failedOperations.push({ rent_change_id: rentChange.rent_change_id, error });
                    return false;
                }

                return true;
            });
        }
    }

    async resolveRentChanges(connection) {
        let notesPayLoad = [], interactionIds = [];

        if (!this.validRentChanges?.length) return;

        for (let rentChange of this.validRentChanges) {

            this.validRentChangeIds.push(rentChange.rent_change_id);
            this.successfulOperations.push({
                rent_change_id: rentChange.rent_change_id,
                message: `Successfully ${ this.resolved ? 'resolved' : 'unresolved'}`
            });

            if (this.note) notesPayLoad.push({
                content: this.note,
                contact_id: rentChange.contact_id,
                last_modified_by: this.userId,
                lease_id: rentChange.lease_id,
                rent_change_id: rentChange.rent_change_id,
                creation_type: `manual`,
                context: `rent_management`,
                pinned: false
            });

            if(rentChange.interaction?.id) interactionIds.push(rentChange.interaction?.id);
        }

        let updatePayload = {
            resolved: this.resolved,
            resolved_by: this.userId,
            resolved_at: new Date
        }

        await LeaseRentChangeModel.update(connection, updatePayload, this.validRentChangeIds);
        await LeaseRentChange.saveNotes(connection, notesPayLoad);
        await models.Interaction.bulkUpdate(connection, updatePayload, interactionIds)

    }

    async approveRentChanges(connection, approved_by) {
        this.validateRentChanges();

        this.rentChangeIds.forEach(rentChangeId => {
            if (!this.failedOperations.some(rentChange => (rentChange.rent_change_id == rentChangeId)))
                this.successfulOperations.push({
                    rent_change_id: rentChangeId,
                    message: `Successfully approved`
                });
        });
        this.validRentChangeIds = [];
        if (this.validRentChanges && this.validRentChanges.length) {
            for (let rentChange of this.validRentChanges) {
                this.validRentChangeIds.push(rentChange.rent_change_id)
            }
            await LeaseRentChangeModel.bulkStatusUpdate(connection, 'approved', this.validRentChangeIds, approved_by);
        }
        
    }

    /**
     * Assign an array of rentChangeIds to this.rentChangeids and call this.consolidatedRentChangeData() and this.validateRentChanges() before calling skipRentChanges function
     * @param { SqlConnectionObject } connection
     */
    async skipRentChanges(connection) {
        let 
            updatePayload = [], 
            insertPayload = [], 
            notesPayload = [],
            status = `skipped`,
            rentChangeIntervalFailMessage = `Unfortunately, skipping the rent change is not possible in this case. 
            The new effective date falls within the minimum rent change interval specified for the manually scheduled rent change, which means it cannot be skipped. 
            Please consider an alternative approach or adjust the minimum rent change interval accordingly to proceed with the desired changes`,
            anotherRentChangePresentMessage = `Unfortunately, skipping the rent change is not possible in this case. A rent change has already been present in the same month where it was supposed to be skipped.`
        ;
            
        this.validRentChanges?.forEach((rentChange = {})=> {
            if (![`initiated`, `approved`].includes(rentChange.rent_change_status)) return;
            
            let
                skipTo = null,
                newEffectiveDate,
                isInvalid = false,
                isAnotherRentChangePresent = false,

                billDay = (rentChange.bill_day?.toString().length == 1 ? `0${rentChange.bill_day}`: rentChange.bill_day) || `01`
            ;

            if (moment(rentChange.effective_date).diff(moment(), `days`) < rentChange.notification_period) {
                skipTo = moment().add(rentChange.notification_period, `days`).format(`YYYY-MM-DD`);
                if (moment(skipTo).isSame(moment(rentChange.effective_date))) skipTo = moment(rentChange.effective_date).add(1, `month`).format(`YYYY-MM-DD`)
            } else {
                skipTo = moment(rentChange.effective_date).add(1, `month`).format(`YYYY-MM-DD`);
            }
            
            if (skipTo) newEffectiveDate = LeaseRentChange.calculateEffectiveDate(billDay, skipTo);

            rentChange.future_rent_changes?.forEach((manualRentChangeData)=> {
                isAnotherRentChangePresent = LeaseRentChange.checkSameEffectiveMonth(manualRentChangeData?.effective_date, newEffectiveDate);
                isInvalid = LeaseRentChange.checkIfEffectiveDateWithinMinimumInterval(manualRentChangeData?.effective_date, newEffectiveDate, rentChange.min_rent_change_interval);
                if (isInvalid || isAnotherRentChangePresent) {
                    
                    this.failedOperations.push({
                        rent_change_id: rentChange.rent_change_id,
                        lease_id: rentChange.lease_id,
                        error: isAnotherRentChangePresent ? anotherRentChangePresentMessage: rentChangeIntervalFailMessage
                    });
                };
            });
            if (isInvalid || isAnotherRentChangePresent) return;
            
            let data = {
                update: {
                    status,
                    status_updated_at: new Date,
                    skipped_by: this.userId,
                    last_modified_by: this.userId
                },
                insert: {
                    effective_date: newEffectiveDate,
                    tagged: false,
                    status: `initiated`,
                    rent_plan_trigger: null,
                    last_modified_by: this.userId,
                    skipped_by: null,
                    deployment_month: moment(newEffectiveDate).format('MMM YYYY')
                },
                note: {
                    content: this.note,
                    last_modified_by: this.userId,
                    type: status
                }
            };
            let { insertData, updateData, notesData } = LeaseRentChange.generateActionsPayload(rentChange, data);

            if (insertData) insertPayload.push(insertData)
            if (updateData) updatePayload.push(updateData);
            if (notesData) notesPayload.push(notesData);

            this.successfulOperations.push({
                rent_change_id: rentChange.rent_change_id,
                lease_id: rentChange.lease_id,
                message: `Successfully skipped. New effective date is ${newEffectiveDate}`
            });
        });

        await LeaseRentChange.saveRentChangeDataAndNotes(connection, { insertPayload, updatePayload, notesPayload });
        await LeaseRentChange.addDeletedAtForConflictingRentChanges(connection, insertPayload)
    }

    /**
     * Two ways to use this function:
     * 1. Assign an array of rentChangeIds to the property this.rentChangeids and call this.consolidatedRentChangeData and this.validateRentChanges before calling cancelRentChanges function
     * 2. Directly call cancelRentChanges function after assigning validRentChanges property of this object's instance with an array of object. The object should contain lease_id, rent_change_id, contact_id
     * @param { SqlConnectionObject } connection 
     * @param { object } fields
     */
    async cancelRentChanges(connection, fields = {}) {
        let status = `cancelled`, updatePayload = [],  notesPayload = [];
        
        this.validRentChanges.forEach((rentChange)=> {
            let data = {
                update: {
                    status,
                    status_updated_at: new Date,
                    cancelled_by: this.userId,
                    last_modified_by: this.userId,
                    ...fields
                },
                note: {
                    content: rentChange?.note ?? this.note,
                    last_modified_by: this.userId,
                    type: status
                }
            };
        
            let { updateData, notesData } = LeaseRentChange.generateActionsPayload(rentChange, data);

            if (updateData) updatePayload.push(updateData);
            if (notesData) notesPayload.push(notesData);

            this.successfulOperations.push({
                rent_change_id: rentChange.rent_change_id,
                lease_id: rentChange.lease_id,
                message: `Successfully cancelled`
            });
        });

        await LeaseRentChange.saveRentChangeDataAndNotes(connection, { updatePayload, notesPayload });
    }

    async tagRentChanges(connection) {
        let updatePayload = [],  notesPayload = [];
        this.action = `tag`;
        this.validateRentChanges();

        this.validRentChanges.forEach((rentChange)=> {
            let data = {
                update: { tagged: this.tagged },
                note: {
                    content: this.note,
                    last_modified_by: this.userId,
                    type: this.action
                }
            };
            let { updateData, notesData } = LeaseRentChange.generateActionsPayload(rentChange, data);

            if (updateData) updatePayload.push(updateData);
            if (notesData) notesPayload.push(notesData);

            this.successfulOperations.push({
                rent_change_id: rentChange.rent_change_id,
                lease_id: rentChange.lease_id,
                message: `Successfully ${this.tagged ? `tagged` : `untagged`}`
            });
        });

        await LeaseRentChange.saveRentChangeDataAndNotes(connection, { updatePayload, notesPayload });
    }

    async addRentChangeNotes(connection) {
        let notesData = {
            content: this.note,
            contact_id: this.contactId,
            last_modified_by: this.userId,
            lease_id: this.rentChange.lease_id,
            rent_change_id: this.rentChange.rent_change_id,
            creation_type: `manual`,
            context: `rent_management`,
            pinned: 0
        }
        return await LeaseRentChange.saveNotes(connection, [notesData]);
    }

    static generateActionsPayload(rentChange = {}, data = {}) {
        let updateData = null, notesData = null, insertData = null;

        updateData = {
            data: data.update,
            id: rentChange.rent_change_id
        };

        if (data.note?.content) {
            notesData = {
                ...data.note,
                lease_id: rentChange.lease_id,
                rent_change_id: rentChange.rent_change_id,
                contact_id: rentChange.contact_id,
                creation_type: `manual`,
                context: `rent_management`,
                pinned: 0
            };
        };

        if (data.insert) {
            insertData = [
                rentChange.type,
                rentChange.lease_id,
                rentChange.property_id,
                rentChange.rent_plan_id,
                data.insert?.rent_plan_trigger,
                data.insert?.status,
                data.insert?.tagged,
                rentChange.affect_timeline,
                rentChange.change_type,
                rentChange.change_value,
                rentChange.change_amt,
                rentChange.new_rent_amt,
                moment(rentChange.target_date).format(`YYYY-MM-DD`),
                data.insert?.effective_date,
                rentChange.created_by,
                data.insert?.last_modified_by,
                data.insert?.skipped_by,
                data.insert?.cancelled_by,
                data.insert?.deployment_month
            ];
        };
        return { updateData, notesData, insertData };
    }

    static async saveRentChangeDataAndNotes(connection, payload = {}) {
        console.log(`Payload: `, payload)
        let
            insertResult, updateResult, notesResult,
            { insertPayload = [], updatePayload = [], notesPayload = [] } = payload,
            rentChangeTableFields = [
                `type`,
                `lease_id`,
                `property_id`,
                `rent_plan_id`,
                `rent_plan_trigger`,
                `status`,
                `tagged`,
                `affect_timeline`,
                `change_type`,
                `change_value`,
                `change_amt`,
                `new_rent_amt`,
                `target_date`,
                `effective_date`,
                `created_by`,
                `last_modified_by`,
                `skipped_by`,
                `cancelled_by`,
                `deployment_month`
            ]
        ;
        if (
            (insertPayload.length && (insertPayload.length !== updatePayload.length)) ||
            (notesPayload.length && (notesPayload.length != updatePayload.length))
        ) e.th(500, `Error while saving data`);

        if (insertPayload.length)
            insertResult = await LeaseRentChangeModel.bulkInsert(connection, insertPayload, rentChangeTableFields);
        if (updatePayload.length)
            updateResult = await LeaseRentChangeModel.bulkUpdateLeaseRentChanges(connection, updatePayload);
        if (notesPayload.length)
            notesResult = await LeaseRentChange.saveNotes(connection, notesPayload);

        let updateResultLength = (updateResult?.length || updateResult?.affectedRows);

        if (
            (insertPayload.length && (insertResult?.affectedRows != updateResultLength)) ||
            (notesPayload.length && (notesResult?.affectedRows != updateResultLength))
        ) e.th(500, `Error while saving data`);
    }

    /**
     * Expects the note object in the following structure
     *  { content: string(note content), contact_id: string(id of the tenant whom the note is associated with), last_modified_by: string (id of the note author),
     *    lease_id: string, rent_change_id: string, creation_type: `manual` || `auto`,
     *    context: string, pinned: boolean }
     * @param { connection object } connection
     * @param { An array of notes payload object } notesPayLoad
     * @returns { Object returned from mysql }
     */
    static async saveNotes(connection, notesPayLoad = [{}]) {
        if (!(notesPayLoad.length > 0)) return;

        let
            relationPayload = [],
            saveNotesResult = await LeaseRentChangeModel.insertNotes(connection, notesPayLoad)
        ;

        for (let i = 0; i < notesPayLoad.length; i++) {
            let
                relationTableData = [
                    (saveNotesResult[i]?.insertId ?? saveNotesResult?.insertId),
                    notesPayLoad[i].lease_id,
                    notesPayLoad[i].rent_change_id,
                    notesPayLoad[i].type,
                    notesPayLoad[i].creation_type
                ]
            ;
            relationPayload.push(relationTableData);
        }

        let saveRelationResult = await LeaseRentChangeModel.insertNotesRelation(connection, relationPayload);

        if (saveRelationResult.affectedRows != (saveNotesResult?.length ?? saveNotesResult?.affectedRows))
            e.th (500, `Error while saving notes`);

        return saveRelationResult;
    }

    static async addDeletedAtForConflictingRentChanges(connection, payload) {
        if (payload?.length == 0) return;
        let
            conditionsArray = [],
            data = { deleted_at: new Date }
        ;

        payload.forEach((rentChange) => {
            conditionsArray.push(`(
                lease_id = ${rentChange[1]} AND
                property_id = ${rentChange[2]} AND
                status IN ('skipped', 'cancelled') AND
                DATE_FORMAT(effective_date, "%b %Y") = DATE_FORMAT('${rentChange[13]}', "%b %Y")
            )`)
        });

        let condition = conditionsArray.join(` OR `);
        await LeaseRentChangeModel.bulkUpdateLeaseRentChange(connection, data, condition);
    }

    async getNotesByRentChangeId(connection) {
        this.notes = await LeaseRentChangeModel.fetchNotesByRentChangeId(connection, this.rent_change_id);
    }

    async getContactByRentChangeId(connection) {
        let contact = await LeaseRentChangeModel.fetchContactByRentChangeId(connection, this.rent_change_id);
        this.contactId = contact.id;
        this.contactName = `${ contact.first } ${ contact.last }`;
    }

    static checkIfEffectiveDateWithinMinimumInterval(manualRentChangeDate, newEffectiveDate, minRentChangeInterval) {
        let
            minDate = moment(manualRentChangeDate).subtract(minRentChangeInterval, `month`).startOf(`month`).format(`YYYY-MM-DD`),
            maxDate = moment(manualRentChangeDate).add(minRentChangeInterval, `month`).endOf(`month`).format(`YYYY-MM-DD`)
        ;
        return (moment(newEffectiveDate).isBetween(minDate, maxDate, null, []));
    }

    static async checkLeaseIdsValid(connection, data, property_id, dynamo_company_id, edit = false) {
        let invalidIds = [];
        let ids = [];
        if(edit){
            ids = data.map(rentChange => rentChange.rent_change_id);
            invalidIds = await LeaseRentChangeModel.getInvalidLeaseIdsByRentChangeIds(connection, ids, property_id);
        } else{
            ids = data.map(rentChange => rentChange.lease_id);
            invalidIds = await LeaseRentChangeModel.getInvalidLeaseIdsByLeaseIds(connection, ids, property_id);
        }
        if(invalidIds.length) {
            e.th(400,  `Invalid Leases: ${invalidIds.map(leaseId => `'${Hashes.encode(leaseId, dynamo_company_id)}'`)}`, {})
        }
    }

    static async getInvalidLeaseIds(connection, propertyId, leaseIds) {
        return await LeaseRentChangeModel.getInvalidLeaseIds(connection, propertyId, leaseIds);
    }

    static async getExemptedLeaseIds(connection, propertyId, leaseIds) {
        return await LeaseRentChangeModel.getExemptedLeaseIds(connection, propertyId, leaseIds);
    }

    async findRentManagementSettings(connection) {
        this.propertyRentSettings = await PropertyRentManagementModel.getConfiguration(connection, this.property_id);
        this.companyRentSettings = await CompanyRentManagementSettingsModel.getConfiguration(connection, this.company_id);
        if (!this.propertyRentSettings || !this.propertyRentSettings?.active)
            e.th(403,  `Rent management settings not configured`, {})
    }

    async doManualRentChangeCalculations(connection){
        let lease = new Lease({ id: this.leaseId });
        let rentSettingsRounding = this.propertyRentSettings?.round_to ?? this.companyRentSettings?.round_to
        this.leaseData = await lease.findUnitLeaseData(connection);
        let billDay = (this.leaseData.bill_day?.toString().length == 1 ? `0${this.leaseData?.bill_day}`: this.leaseData?.bill_day) || `01`;
        this.rentService = await lease.findActiveRentService(connection);
        if(!this.rentService) e.th(403,  `No active rent service for selected leases: '${Hashes.encode(this.leaseId, connection.cid)}'`, {});
        this.allRentChanges = await LeaseRentChangeModel.findRentChanges(connection, this.leaseId); // includes all rent changes except deployed
        this.rentChanges = this.allRentChanges.filter(rentChange => [`initiated`, `approved`].includes(rentChange.status));
        this.currentRent = this.rentService?.price || 0;
        this.calculatedValues = LeaseRentChange.calculateRent(this.changeDirection, this.currentRent, this.rentChange.change_value, this.rentChange.change_type, this.leaseId, connection.cid);
        this.effectiveTargetDate = LeaseRentChange.calculateEffectiveDate(billDay, this.rentChange?.target_date);
        this.toDeleteRentChanges = [...this.toDeleteRentChanges, ...LeaseRentChange.findRentChangeIdsToDelete(this.allRentChanges, this.effectiveTargetDate)];
        this.newRent = LeaseRentChange.calculateRounding(rentSettingsRounding, this.calculatedValues?.newRent);
        this.calculatedValues.changeAmt = this.newRent - this.currentRent;  
        if(this.edit){
            this.rentChanges = this.rentChanges.filter(rentChange => (rentChange.id != this.rentChange?.rent_change_id));
        } else {
            this.currentRentChange = LeaseRentChange.findCurrentRentChanges(this.rentChanges, this.effectiveTargetDate);
        }
    }

    static findRentChangeIdsToDelete(allRentChanges, effectiveDate){
        let rentChanges = allRentChanges.filter(rentChange => moment(rentChange.effective_date).format("YYYY-MM") === moment(effectiveDate).format("YYYY-MM") 
        && ([`cancelled`, `skipped`].includes(rentChange.status)));
        return rentChanges.map(rentChange => rentChange.id) ?? [];
    }

    async checkRentChangeConditions(connection){
        this.isValidTargetDate = true;
        this.isValidNotificationPeriod = true;
        this.isWithInRentCap = { status: true };
        this.isOutsideRentInterval = { status: true };
        this.isSameEffectiveMonth = false;
        this.rentChangeExistsForEdit = false;
        this.rentChangeExists = false;
        this.isExemptedLease = this.leaseData?.exempted;
        this.isWithinPrepayPeriod = false;
        this.isAuctioned = false;
        this.isValidTargetDate = LeaseRentChange.checkValidTargetDate(this.effectiveTargetDate);
        // currentRentChange value is present only when editing rent change
        this.isValidNotificationPeriod = LeaseRentChange.checkValidNotificationPeriod(this.effectiveTargetDate, this.propertyRentSettings);
        if(this.currentRentChange && this.newRent < this.currentRentChange?.new_rent_amt) this.isValidNotificationPeriod = true;
        this.isDeployedRentChange = LeaseRentChange.checkDeployedRentChange(this.allRentChanges, this.effectiveTargetDate);
        if (this.propertyRentSettings?.min_rent_change_interval) {
            this.isOutsideRentInterval = LeaseRentChange.checkOutsideRentInterval(this.rentChanges, this.effectiveTargetDate, this.propertyRentSettings?.min_rent_change_interval);
        }
        if (this.propertyRentSettings?.rent_cap) {
            this.isWithInRentCap = await LeaseRentChange.checkWithInRentCap(connection, this.leaseData?.unit_id, this.propertyRentSettings?.rent_cap, this.newRent);
        }
        this.checkWhetherAuctioned();
        if(this.leaseData?.prepay_paid_upto && (moment(this.effectiveTargetDate) <= moment(this.leaseData?.prepay_paid_upto))) this.isWithinPrepayPeriod = true;
        if(this.edit) { // when edit rent change is done
            this.isSameEffectiveMonth = LeaseRentChange.checkSameEffectiveMonth(this.currentRentChange?.effective_date, this.effectiveTargetDate);
            this.checkValidRentChangeForEdit();
        } else if (this.currentRentChange) { // when another rent change exists in selected month - for bulk manual rent change
            this.isOutsideRentInterval = { status: true };
            this.rentChangeExists = true;
        }
    }

    checkWhetherAuctioned() {
        if(this.leaseData?.auction_status && ([`auction_payment`, `move_out`].includes(this.leaseData?.auction_status))) this.isAuctioned = true;
    }

    checkValidRentChangeForEdit() {
        this.rentChangeExistsForEdit = LeaseRentChange.findCurrentRentChanges(this.rentChanges, this.effectiveTargetDate);
    }

    addRentChangeErrorReason() {
        let errorMessages = {
            isWithInRentCap: "Have exceeded the established maximum rent cap limit",
            isValidTargetDate: "Selected date is less than the current date",
            isOutsideRentInterval: "Come within the minimum rent change interval",
            isRentChangeExist: "Already have a rent change scheduled for the selected target month",
            isValidNotificationPeriod: "Do not meet the minimum notification period",
            isExemptedLease: "Have exempted leases",
            isDeployedRentChangeExist: "Already have a deployed rent change for the selected target month",
            isWithinPrepayPeriod: "Come within the prepay period. Future invoices will be adjusted during deployment",
            isAuctioned: "Bid amount for auction has been paid and are ready to move out"
        };
        
        this.rentChangeErrors = [];
        if(!this.isWithInRentCap?.status) this.rentChangeErrors.push({reason: errorMessages.isWithInRentCap, required: false});
        if(!this.isOutsideRentInterval?.status) this.rentChangeErrors.push({reason: errorMessages.isOutsideRentInterval, required: false});
        if(!this.isValidTargetDate) this.rentChangeErrors.push({reason: errorMessages.isValidTargetDate, required: true});
        if(!this.isValidNotificationPeriod) this.rentChangeErrors.push({reason: errorMessages.isValidNotificationPeriod, required: true});
        if(this.rentChangeExistsForEdit) this.rentChangeErrors.push({reason: errorMessages.isRentChangeExist, required: true});
        if(this.rentChangeExists) this.rentChangeErrors.push({reason: errorMessages.isRentChangeExist, required: false});
        if(this.isExemptedLease) this.rentChangeErrors.push({reason: errorMessages.isExemptedLease, required: false});
        if(this.isDeployedRentChange) this.rentChangeErrors.push({reason: errorMessages.isDeployedRentChangeExist, required: true})
        if(this.isWithinPrepayPeriod) this.rentChangeErrors.push({reason: errorMessages.isWithinPrepayPeriod, required: false})
        if(this.isAuctioned) this.rentChangeErrors.push({reason: errorMessages.isAuctioned, required: true})
        
    }
    
    async deleteRentChanges(connection) {
        if(this.toDeleteRentChanges.length) await LeaseRentChangeModel.deleteRentChanges(connection, this.toDeleteRentChanges);
    }
    
    
    prepareManualRentChangeSaveData(contactId, dryrun, hbAppContactId) {
        let bulkChangeStatus = true;
        this.isValidRentChange = true;
        
        if (this.isValidTargetDate && this.isValidNotificationPeriod && !this.rentChangeExistsForEdit && !this.isDeployedRentChange && !this.isAuctioned) {
            this.isValidRentChange = (this.rentChangeErrors?.length === 0);
            if(this.edit && !this.isSameEffectiveMonth) {
                this.validRentChanges.push({rent_change_id: this.currentRentChange.id, lease_id: this.currentRentChange.lease_id});
            }
            if (!this.rentChangeType) {
                this.rentChangeType = 'manual'
            }
            if (!this.targetDate) {
                this.targetDate = this.effectiveTargetDate
            }
            let status = 'approved'
            if (this.approval_type && this.approval_type === 'manual') {
                status = 'initiated'
            }
            let
                changeAmt = this.calculatedValues?.changeAmt,
                changeValue = this.rentChange?.change_value,
                changeType = this.rentChange?.change_type
            ;
            if (this.changeDirection.toLowerCase() == "decrease" && changeType != "fixed" ) {
                changeValue = -changeValue;
                changeAmt = -changeAmt;
            }
            let leaseRentChangeData = [
                this.rentChangeType,
                this.leaseId,
                this.property_id,
                status,
                !this.isValidRentChange,
                this.rentChange?.affect_timeline,
                changeType,
                changeValue,
                changeAmt,
                this.newRent,
                this.targetDate,
                this.effectiveTargetDate,
                moment(this.effectiveTargetDate).format('MMM YYYY'),
                moment().format('YYYY-MM-DD HH:mm:ss'),
                contactId
            ];
            if(!this.edit) 
                this.saveCondition = this.currentRentChange;
            else 
                this.saveCondition = this.isSameEffectiveMonth;
            if ((this.saveCondition) && (this.isValidRentChange || !dryrun)) {
                
                this.rentChangeUpdate.push([
                    this.currentRentChange.id,
                    ...leaseRentChangeData,
                    contactId
                ]);
                let rentChangeHistory = LeaseRentChange.prepareRentChangeHistoryData(this.currentRentChange)
                this.rentChangeHistory.push([
                    ...rentChangeHistory,
                    contactId
                ]);
                if (this.rentChange?.note != null || !this.isValidRentChange) {
                    let notesData = LeaseRentChange.prepareNotesData(this.leaseData, this.rentChange?.note, !this.isValidRentChange, this.currentRentChange.id, contactId, this.rentChangeErrors, hbAppContactId)
                    this.notesForUpdateRentChange.push(...notesData);
                }
            } else if ((!this.saveCondition) && (this.isValidRentChange || !dryrun)) {
                let approvedBy = contactId;
                // If integration pushes a rent change and its approval type is manual, then the rent change will be only in scheduled state
                if (this.approval_type == 'manual' && this.rentChangeType != 'hummingbird')
                    approvedBy = null
                if (this.rentChange?.note != null || !this.isValidRentChange) {
                    this.rentChangeInsert.push({
                        rent_change: [
                            ...leaseRentChangeData,
                            approvedBy,
                            contactId
                        ],
                        note: LeaseRentChange.prepareNotesData(this.leaseData, this.rentChange?.note, !this.isValidRentChange, null, contactId, this.rentChangeErrors, hbAppContactId)
                    });
                } else {
                    this.rentChangeBulkInsert.push([
                        ...leaseRentChangeData,
                        approvedBy,
                        contactId
                    ]);
                }
            } else {
                bulkChangeStatus = false;
            }
        } else {
            bulkChangeStatus = false;
        }
        if (bulkChangeStatus) {
            this.successLeaseIds.push({
                lease_id: this.leaseData?.id
            });
        } else {
            this.failureLeaseIds.push({
                lease_id: this.leaseData?.id,
                unit_number: this.leaseData?.number,
                tenant_name: this.leaseData?.tenant_name,
                errors: this.rentChangeErrors
            });
        }
    }

    async rentChangesForIntegration(connection, data, contactId, cid) {
        try {
            this.propertyRentSettings = await PropertyRentManagementModel.getConfiguration(connection, this.property_id);

            // If rent management is not enabled, or an invalid engine is provided in the request body
            if (
                (!this.propertyRentSettings) || 
                (!this.propertyRentSettings?.active) ||
                (this.propertyRentSettings && this.propertyRentSettings.rent_engine != this.rentChangeType)
            )
                e.th(403,  `Rent Management is not configured for '${this.rentChangeType}'`, {});
            this.rentChangeBulkInsert = [];
            this.rentChangeInsert = [];
            this.rentChangeUpdate = [];
            this.rentChangeHistory = [];
            this.successLeaseIds = [];
            this.failureLeaseIds = [];
            this.toDeleteRentChanges = [];
            this.notesForUpdateRentChange = [];
            this.updatedRentChangeIds = [];

			let { id: hbAppContactId } = await models.Contact.findContactByAppId(connection, process.env.HUMMINGBIRD_APP_ID);

            for (let rentChange of data) {
                this.rentChange = rentChange;
                this.leaseId = rentChange.lease_id;
                await this.doManualRentChangeCalculations(connection);
                await this.checkRentChangeConditions(connection);
                this.addRentChangeErrorReason();
                this.prepareManualRentChangeSaveData(contactId, false, hbAppContactId);
            }
            let failureLeaseReasons = this.failureLeaseReasonsConsolidation(true);
            if (!this.failureLeaseIds?.length) {
                    await this.deleteRentChanges(connection);
                    await this.bulkSaveRentChange(connection);
                    await LeaseRentChange.saveNotes(connection, [...this.notes, ...this.notesForUpdateRentChange]);
                    // if (this.approval_type == "automated")
                    //     await LeaseRentChange.approveBulkRentChanges(connection, cid, contactId, [...this.insertedIds, ...this.updatedRentChangeIds], this.company_id, this.property_id);
                return { "success_lease_ids": this.successLeaseIds, "failure_lease_ids": failureLeaseReasons };
            } else {
                return { "manual_rent_change": LeaseRentChange.prepareResponse(data), "success_lease_ids": this.successLeaseIds, "failure_lease_ids": failureLeaseReasons };
            }
        } catch (err) {
            throw err;
        }
    }

    async bulkManualRentChange(connection, data, contactId, cid, dryrun = false) {
        try {
            await this.findRentManagementSettings(connection);
            this.rentChangeBulkInsert = [];
            this.rentChangeInsert = [];
            this.rentChangeUpdate = [];
            this.rentChangeHistory = [];
            this.successLeaseIds = [];
            this.failureLeaseIds = [];
            this.toDeleteRentChanges = [];
            this.notesForUpdateRentChange = [];
            this.updatedRentChangeIds = [];

			let { id: hbAppContactId } = await models.Contact.findContactByAppId(connection, process.env.HUMMINGBIRD_APP_ID);

            for (let rentChange of data) {
                this.rentChange = rentChange;
                this.leaseId = rentChange.lease_id;
                await this.doManualRentChangeCalculations(connection);
                await this.checkRentChangeConditions(connection);
                this.addRentChangeErrorReason();
                this.prepareManualRentChangeSaveData(contactId, dryrun, hbAppContactId);
            }
            let failureLeaseReasons = this.failureLeaseReasonsConsolidation();
            if (!dryrun && !this.failureLeaseIds?.length) {
                await this.deleteRentChanges(connection);
                await this.bulkSaveRentChange(connection);
                await LeaseRentChange.saveNotes(connection, [...this.notes, ...this.notesForUpdateRentChange]);
                // await LeaseRentChange.approveBulkRentChanges(connection, cid, contactId, [...this.insertedIds, ...this.updatedRentChangeIds], this.company_id, this.property_id);
                return { "success_lease_ids": this.successLeaseIds, "failure_lease_ids": failureLeaseReasons };
            } else {
                return { "manual_rent_change": LeaseRentChange.prepareResponse(data), "success_lease_ids": this.successLeaseIds, "failure_lease_ids": failureLeaseReasons };
            }
        } catch (err) {
            throw err;
        }
    }

    async editRentChange(connection, data, contactId, cid, req,dryrun = false) { 
        try {
            await this.findRentManagementSettings(connection);
            this.inValidRentChangeIds = [];
            this.rentChangeBulkInsert = [];
            this.rentChangeInsert = [];
            this.rentChangeUpdate = [];
            this.rentChangeHistory = [];
            this.successLeaseIds = [];
            this.failureLeaseIds = [];
            this.toDeleteRentChanges = [];
            this.notesForUpdateRentChange = [];
            this.updatedRentChangeIds = [];

			let { id: hbAppContactId } = await models.Contact.findContactByAppId(connection, process.env.HUMMINGBIRD_APP_ID);

            for (let rentChange of data) {
                this.rentChange = rentChange;
                this.currentRentChange = await LeaseRentChangeModel.findRentChangeById(connection, this.rentChange.rent_change_id);
                if (!this.currentRentChange) {
                    this.inValidRentChangeIds.push(this.rentChange.rent_change_id);
                    continue;
                }
                this.leaseId = this.currentRentChange.lease_id;
                this.edit= true;
                await this.doManualRentChangeCalculations(connection);
                await this.checkRentChangeConditions(connection);
                this.addRentChangeErrorReason();
                this.prepareManualRentChangeSaveData(contactId, dryrun, hbAppContactId);
            }
            if(this.inValidRentChangeIds.length) e.th(400,  `Invalid Rent Changes: ${this.inValidRentChangeIds.map(id => `'${Hashes.encode(id, connection.cid)}'`)}`, {})
            let failureLeaseReasons = this.failureLeaseReasonsConsolidation();
            if (!dryrun && !this.failureLeaseIds?.length) {
                await this.deleteRentChanges(connection);
                await this.bulkSaveRentChange(connection);
                await LeaseRentChange.saveNotes(connection, [...this.notes, ...this.notesForUpdateRentChange]);
                await this.cancelRentChanges(connection);
                // await LeaseRentChange.approveBulkRentChanges(connection, cid, contactId, [...this.insertedIds, ...this.updatedRentChangeIds], this.company_id, this.property_id);
                return { "success_lease_ids": this.successLeaseIds, "failure_lease_ids": failureLeaseReasons };
            } else {
                return { "manual_rent_change": LeaseRentChange.prepareResponse(data), "success_lease_ids": this.successLeaseIds, "failure_lease_ids": failureLeaseReasons };
            }
        } catch (err) {
            throw err;
        }
    }

    static checkSameEffectiveMonth(date1, date2) {
        const effectiveDate1 = moment(date1, 'YYYY-MM-DD');
        const effectiveDate2 = moment(date2, 'YYYY-MM-DD');
        return effectiveDate1.isSame(effectiveDate2, 'month');
    }

    static prepareNotesData(leaseData, manualNote, tagged, rentChangeId, contactId, taggedMessage = null, hbAppContactId) {
        let notes = []; 
        let errors = taggedMessage?.map((message, index) => `${index + 1}. ${message?.reason}`)?.join(' ');
        if(manualNote){
            notes.push({
                lease_id: leaseData?.id,
                rent_change_id: rentChangeId ?? null,
                type: 'create', 
                creation_type: `manual`,
                last_modified_by: contactId,
                contact_id: leaseData?.contact_id,
                content: manualNote,
                context: `rent_management`,
                pinned: 0
            })
        } 
        if(tagged && errors) {
            notes.push({
                lease_id: leaseData?.id,
                rent_change_id: rentChangeId ?? null,
                type: 'create', 
                creation_type: `auto`,
                last_modified_by: hbAppContactId || contactId,
                contact_id: leaseData?.contact_id,
                content: `Rent change tagged due to the following reasons: ${errors}`,
                context: `rent_management`,
                pinned: 0
            })
        }
        return notes;
    }

    async bulkSaveRentChange(connection) {
            this.notes = [];
            this.insertedIds = [];
            let rentChangeTableFields = [
                `type`,
                `lease_id`,
                `property_id`,
                `status`,
                `tagged`,
                `affect_timeline`,
                `change_type`,
                `change_value`,
                `change_amt`,
                `new_rent_amt`,
                `target_date`,
                `effective_date`,
                `deployment_month`,
                `approved_at`,
                `created_by`,
                `approved_by`,
                `last_modified_by`
            ];
            if (this.rentChangeInsert.length) {
                for(let insertData of this.rentChangeInsert){
                    let insertResult = await LeaseRentChangeModel.insert(connection, insertData.rent_change, rentChangeTableFields);
                    insertData.note.map(note => note.rent_change_id = insertResult.insertId);
                    this.notes.push(...insertData.note);
                    this.insertedIds.push(insertResult.insertId);
                }
            } 
            if(this.rentChangeBulkInsert.length) {
                let insertedResult= await LeaseRentChangeModel.bulkInsert(connection, this.rentChangeBulkInsert,  rentChangeTableFields, true);
                this.insertedIds.push(...insertedResult);
            }
            if (this.rentChangeUpdate.length) {
                await LeaseRentChangeModel.bulkUpdate(connection, this.rentChangeUpdate);
                await LeaseRentChangeModel.bulkInsertHistory(connection, this.rentChangeHistory);
            }
    }
    

    static calculateRent(changeDirection, currentRent, changeValue, changeType, leaseId, dynamoCompanyId) {        
        let newRent;
        let delta;
        let changeAmt;
        let direction = changeDirection.toLowerCase() == 'increase' ? 1 : -1;

        switch (changeType) {
            case 'fixed':
                newRent = changeValue;
                delta = changeValue - currentRent;
                changeAmt = delta;
                break;
            case 'rent_percent':
                if(!currentRent) e.th(403,  `Current rent cannot be zero for selected leases: '${Hashes.encode(leaseId, dynamoCompanyId)}' `, {});
                changeAmt = Math.round(((changeValue / 100) * currentRent) * 1e2) / 1e2;
                delta = direction * changeAmt;
                newRent = (direction * changeAmt) + currentRent;
                break;
            case 'dollar_amount':
                changeAmt = changeValue;
                delta = direction * changeValue;
                newRent = (direction * changeValue) + currentRent;
                break;
        }
        return { newRent: newRent, changeAmt: changeAmt };
    }

    static calculateEffectiveDate(billDay, targetDateGiven) {
        let
            effectiveDate,
            targetDay = moment(targetDateGiven).format(`DD`),
            targetMonth = moment(targetDateGiven).format(`YYYY-MM`),
            oneMonthAfterTarget = moment(targetDateGiven).add(1, 'month').format(`YYYY-MM`),
            lastDayOfTargetMonth = moment(targetDateGiven).endOf(`month`).format(`DD`),
            lastDayOfOneMonthAfterTarget = moment(oneMonthAfterTarget).endOf(`month`).format(`DD`)
        if (parseInt(lastDayOfTargetMonth) < parseInt(billDay)) {
            effectiveDate = `${targetMonth}-${lastDayOfTargetMonth}`
        } else if (parseInt(targetDay) <= parseInt(billDay)) {
            effectiveDate = `${targetMonth}-${billDay}`;
        } else if(parseInt(lastDayOfOneMonthAfterTarget) < parseInt(billDay)) {
            effectiveDate = `${ oneMonthAfterTarget }-${ lastDayOfOneMonthAfterTarget }`
        } else {
            effectiveDate = `${oneMonthAfterTarget}-${billDay}`;
        }
        effectiveDate = moment(effectiveDate, 'YYYY-MM-DD').format("YYYY-MM-DD");
        return effectiveDate;
    }
    
    static findCurrentRentChanges(rentChanges, targetDate) {
        return rentChanges.filter(rentChange => moment(rentChange.effective_date).format("YYYY-MM") === moment(targetDate).format("YYYY-MM") && rentChange.status !== 'deployed')[0] ?? null;
    }

    static checkDeployedRentChange(rentChanges, targetDate) {
        return rentChanges.some(rentChange => moment(rentChange.effective_date).format("YYYY-MM") === moment(targetDate).format("YYYY-MM") && rentChange.status === 'deployed');
    }

    static checkOutsideRentInterval(rentChanges, targetDate, month = 1) {
        let isOutsideRentInterval = true;
        let minCheckDate = '';
        let maxCheckDate = '';
        for (let rentChange of rentChanges) {
            minCheckDate = moment(rentChange?.effective_date).subtract(month, 'M').format("YYYY-MM-DD");
            maxCheckDate = moment(rentChange?.effective_date).add(month, 'M').format("YYYY-MM-DD");
            if ((targetDate > maxCheckDate) || (targetDate < minCheckDate)) {
                isOutsideRentInterval = true;
            } else {
                isOutsideRentInterval = false;
                break;
            }
        }
        return { status: isOutsideRentInterval, value: minCheckDate.concat(" - ", maxCheckDate)};
    }

    static checkValidTargetDate(targetDate) {
        return moment(targetDate,"YYYY-MM-DD").isAfter(moment());
    }

    static calculateRounding(roundingType, value) {
        let newValue = value;
        if (roundingType && value % 1 !== 0) {
            let rounding = roundingType.replace(/-/g, "_");
            if ([`up_half`, `down_half`].includes(rounding))
                newValue = LeaseRentChange.roundToHalfDollars(value, rounding);
            else
                newValue = RoundOff.convert({ value: value, type: rounding });
        }
        return newValue;
    }

    static async checkWithInRentCap(connection, unitId, rentCap, newRent) {
        let basePrice;
        let capPrice;
        // rentCap = JSON.parse(rentCap)
        let priceData = await UnitModel.findById(connection, unitId);
        if (rentCap?.type === 'sell_rate_percent') {
            basePrice = priceData?.price;
        } else if (rentCap?.type === 'set_rate_percent') {
            basePrice = priceData?.set_rate;
        }
        capPrice = (basePrice * rentCap?.value) / 100;
        if (newRent <= capPrice) {
            return { status: true, value: capPrice};
        } else {
            return { status: false, value: capPrice};
        }
    }

    static prepareResponse(data) {
        return data.map(obj => ({ ...obj, target_date: moment(obj.target_date).format("YYYY-MM-DD") }));
    }

    static prepareRentChangeHistoryData(data) {
        return [
            data?.id,
            data?.type,
            data?.rent_plan_id,
            data?.status,
            data?.tagged,
            data?.affect_timeline,
            data?.change_type,
            data?.change_value,
            data?.change_amt,
            data?.new_rent_amt,
            data?.target_date,
            data?.effective_date,
            data?.last_modified_by,
            data?.approved_by,
            data?.approved_at,
            data?.property_id,
            JSON.stringify(data?.rent_plan_trigger),
            data?.status_updated_at
        ];
    }

    failureLeaseReasonsConsolidation(excludeOptional = false) {
        const commonMessage = 'The following spaces';
        const result = this.failureLeaseIds.reduce((acc, curr) => {
            curr.errors.forEach(error => {
                error.reason = `${commonMessage} ${error.reason.toLowerCase()}`;
                let info = acc.find(item => item.reason === error.reason);
                if (!info) {
                    info = { ...error, lease_info: [] };
                    if((!excludeOptional) || (excludeOptional && error?.required) ) acc.push(info);
              }
              info.lease_info.push({ lease_id: curr.lease_id,  unit_number: curr.unit_number, tenant_name: curr.tenant_name });
            });
            return acc;
          }, []);
          return {error: result};
    }

    static checkValidNotificationPeriod(newEffectiveTargetDate, propertyRentSettings) {
        const date = moment(newEffectiveTargetDate, 'YYYY-MM-DD');
        let daysDiff = date.diff(moment(), 'days');
        let notificationPeriod = propertyRentSettings?.notification_period ?? 30;
        return daysDiff > notificationPeriod;
    }

    static async approveBulkRentChanges(connection, cid, contact_id, rent_change_ids, company_id, property_id) {
        if (rent_change_ids && rent_change_ids.length) {
            let property_details = await PropertyRentManagementModel.findRentManagementEnabledProperties(
                connection,
                company_id,
                property_id,
                true
            );

            let document_id = utils.slugify(
                "Rent Change"
                ) + "_" +  moment().format('x');

            if (!property_details)
                e.th(403,  `Rent management settings not configured`, {})

            property_details.notification_methods = JSON.stringify(property_details.notification_methods);


            await Queue.add(
                'manually_approve_rent_changes', {
                    priority: 10,
                    cid: cid,
                    property: property_details,
                    contact_id: contact_id,
                    rent_change_ids: rent_change_ids,
                    socket_details: {
                        contact_id: contact_id,
                        company_id: cid,
                        document_id
                    },
                }, {
                    priority: 10
                }
            );
        }
    }

    async getRentChangeDeploymentMonth(connection) {
        return await LeaseRentChangeModel.fetchRentChangeDeploymentMonth(connection, this.property_id)
    }

    async cancelRentChangesByPropertyId(connection, active) {
        if(active) return
        this.note = 'The rent change is cancelled due to disabling rent management'
        this.validRentChanges = await LeaseRentChangeModel.findRentChangesByPropertyId(connection, this.property_id)
        this.cancelRentChanges(connection, { affect_timeline: false })
    }

    /**
     * Temporary function to use until bugs in HB rounding module is fixed.
     * @param { number } amount
     * @param { string } roundingType
     */
    static roundToHalfDollars(amount, roundingType) {
        let
            roundedValues = {},
            decimalPart = LeaseRentChange.getDecimalPart(amount)
            ;

        if (decimalPart > 0.5) roundedValues = {
            down_half: Math.floor(amount) + 0.5,
            up_half: Math.ceil(amount)
        }

        else if (decimalPart < 0.5) roundedValues = {
            down_half: Math.floor(amount),
            up_half: Math.floor(amount) + 0.5
        }

        return roundedValues[roundingType] || amount;
    }

    static getDecimalPart(value) {
        const decimalPart = ((value + '').split('.'))[1];
        return parseFloat(`0.${decimalPart}`);
    }
    
    async getReportStructure(connection, template, company) {
        let report = new Report({
            template,
            connection,
            company
        });
        await report.setUpReport();

        // sets the report column structure
        await report.reportClass.parseConfig();
        return report.reportClass.getConfig();
    }

    async uploadRentChange(connection, documentId, config) {
        let { active, contact, template, deployment_month } = config
          let structure = await this.getReportStructure(connection, config.template, config.active)
          await Queue.add('upload_rent_changes', {
            document_id: documentId,
            company: active,
            column_structure: structure.column_structure,
            template,
            deployment_month,
            property_id: config.property_id,
            socket_details: {
                contact_id: contact.id,
                company_id: config.dynamo_company_id
            },
        }, { priority: 1 });
    }

    async getRentChangeExportImportHistory(connection, deployment_month = null) {
        let deploymentMonth = moment(deployment_month, "YYYY_MM").isValid() ? moment(deployment_month, "YYYY_MM").format("MMM YYYY") : null;
        let history = await LeaseRentChangeModel.getRentChangeExportImportHistory(connection, this.property_id, deploymentMonth)
        let responseData = {}
        history.forEach(res => {
            if (deploymentMonth) {
                responseData[res.action] = res
            } else {
                if (!responseData[res.action]?.length) responseData[res.action] = []
                responseData[res.action].push(res)
            }
        })
        return responseData
    }
}

module.exports = LeaseRentChange
