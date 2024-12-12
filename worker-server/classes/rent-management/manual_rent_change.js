const PropertyRentManagementSettingsModel = require(__dirname + "/../../models/rent-management/property_rent_management_settings.js")
const CompanyRentManagementModel = require(__dirname + "/../../models/rent-management/company_rent_management.js")
const LeaseRentChangeModel = require(__dirname + "/../../models/rent-management/lease_rent_change.js")
const Lease = require('../lease.js');
const utils = require("../../modules/utils.js")
const RoundOff = require(__dirname + '/../../modules/rounding.js');
const UnitModel = require("./../../models/units.js")
var e = require(__dirname + '/../../modules/error_handler.js');
const moment = require('moment');
const bullmq = require('bullmq');
const IORedis = require('ioredis');

const redis_connection = new IORedis({ host: process.env.REDIS_HOST });
const Queue = new bullmq.Queue('hummingbirdQueue', { connection: redis_connection });

class ManualRentChange {
    constructor(body) {
        this.property_id = body.property_id ?? ""
        this.company_id = body.company_id ?? ""
        this.user_id = body.user_id ?? ""
        this.changeDirection = body?.change_direction || 'Increase';
        this.rentChangeType = body?.type || 'manual'
        this.dynamo_company_id = body?.dynamo_company_id ?? "";
        this.is_admin = body.is_admin;
        this.bypass_notification_period = body.bypass_notification_period;
    }

    /**
     * Calculates the new rent and change amount based on the given parameters.
     *
     * @param {string} changeDirection - The direction of the rent change ('increase' or 'decrease').
     * @param {number} currentRent - The current rent value.
     * @param {number} changeValue - The value of the new rent change.
     * @param {string} changeType - The type of rent change ('fixed', 'rent_percent', or 'dollar_amount').
     * @returns {Object} - An object containing the new rent and change amount
     */
    static calculateRent(changeDirection, currentRent, changeValue, changeType) {
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

    /**
     * Calculates the effective date based on the given bill day and target date.
     *
     * @param {number} billDay - The day of the month when the rent is billed.
     * @param {string} targetDateGiven - The target date for the effective date calculation.
     * @returns {string} - The calculated effective date in 'YYYY-MM-DD' format.
     */
    static calculateEffectiveDate(billDay, targetDateGiven) {
        let givenFormat = "MM/DD/YYYY"
        let
            effectiveDate,
            targetDay = moment(targetDateGiven, givenFormat).format(`DD`),
            targetMonth = moment(targetDateGiven, givenFormat).format(`YYYY-MM`),
            oneMonthAfterTarget = moment(targetDateGiven, givenFormat).add(1, 'month').format(`YYYY-MM`),
            lastDayOfTargetMonth = moment(targetDateGiven, givenFormat).endOf(`month`).format(`DD`)
        ;
        if (parseInt(lastDayOfTargetMonth) < parseInt(billDay)) {
            effectiveDate = `${targetMonth}-${lastDayOfTargetMonth}`
        } else if (parseInt(targetDay) <= parseInt(billDay)) {
            effectiveDate = `${targetMonth}-${billDay}`;
        } else {
            effectiveDate = `${oneMonthAfterTarget}-${billDay}`;
        }
        effectiveDate = moment(effectiveDate, 'YYYY-MM-DD').format("YYYY-MM-DD");
        return effectiveDate;
    }

    /**
     * Calculates the rounded value based on the given rounding type and value.
     *
     * @param {string} roundingType - The type of rounding to apply ('up', 'down', 'up_half', 'down_half', etc.).
     * @param {number} value - The value to be rounded.
     * @returns {number} - The rounded value.
     */
    static calculateRounding(roundingType, value) {
        let newValue = value;
        if (roundingType && value % 1 !== 0) {
            let rounding = roundingType.replace(/-/g, "_");
            if ([`up_half`, `down_half`].includes(rounding))
                newValue = ManualRentChange.roundToHalfDollars(value, rounding);
            else
                newValue = RoundOff.convert({ value: value, type: rounding });
        }
        return newValue;
    }

    /**
     * Temporary function to use until bugs in HB rounding module is fixed.
     * @param { number } amount
     * @param { string } roundingType
     */

    static roundToHalfDollars(amount, roundingType) {
        let
            roundedValues = {},
            decimalPart = ManualRentChange.getDecimalPart(amount)
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

    /**
     * Finds the current rent changes that match the target date.
     *
     * @param {Array} rentChanges - An array of rent change objects.
     * @param {string} targetDate - The target date for finding rent changes.
     * @returns {Object|null} - The first rent change object that matches the target date, or null if not found.
     */
    static findCurrentRentChanges(rentChanges, targetDate) {
        return rentChanges.filter(rentChange => moment(rentChange.effective_date).format("YYYY-MM") === moment(targetDate).format("YYYY-MM") && rentChange.status !== 'deployed')[0] ?? null;
    }

    /**
     * Finds the current deployed rent changes that match the target date.
     *
     * @param {Array} rentChanges - An array of rent change objects.
     * @param {string} targetDate - The target date for finding rent changes.
     */
    static checkDeployedRentChange(rentChanges, targetDate) {
        return rentChanges.some(rentChange => moment(rentChange.effective_date).format("YYYY-MM") === moment(targetDate).format("YYYY-MM") && rentChange.status === 'deployed');
    }

    /**
     * Checks if the target date is valid and is after the current date.
     *
     * @param {string} targetDate - The target date to be checked.
     * @returns {boolean} - True if the target date is valid and after the current date, false otherwise.
     */
    static checkValidTargetDate(targetDate) {
        return moment(targetDate, "YYYY-MM-DD").isAfter(moment());
    }


    /**
     * Checks if the effective target date falls within the valid notification period.
     * @param {string} currentEffectiveTargetDate - The current effective target date for the rent change.
     * @param {string} newEffectiveTargetDate - The given effective target date for the rent change.
     * @param {Object} propertyRentSettings - The rent management settings for the property.
     * @returns {boolean} - True if the effective target date is outside the notification period, false otherwise.
     */
    static checkValidNotificationPeriod(newEffectiveTargetDate, propertyRentSettings) {
        const date = moment(newEffectiveTargetDate, 'YYYY-MM-DD');
        let daysDiff = date.diff(moment(), 'days');
        let notificationPeriod = propertyRentSettings?.notification_period ?? 30;
        return daysDiff > notificationPeriod;
    }

    /**
     * Checks if the given effective target date falls within a valid invoice period.
     * @param {string} effectiveTargetDate - The effective target date in 'YYYY-MM-DD' format.
     * @param {number} invoicePeriod - The invoice period in days.
     * @returns {boolean} True if the effective target date is within a valid invoice period, otherwise false.
     */
    static checkValidInvoicePeriod(effectiveTargetDate, invoicePeriod) {
        const date = moment(effectiveTargetDate, 'YYYY-MM-DD');
        const currDate = moment().format('YYYY/MM/DD')
        let subtractedDate = moment(date).subtract(invoicePeriod + 3, 'days').format(`YYYY/MM/DD`)
        return moment(subtractedDate).isAfter(currDate);
    }


    /**
     * Checks if the target date is outside the rent interval of the rent changes.
     *
     * @param {Array} rentChanges - An array of rent change objects.
     * @param {string} targetDate - The target date to be checked.
     * @param {number} month - The number of months to consider for the rent interval (default: 1).
     * @returns {Object} - An object containing the status and value of the rent interval check.
     */
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
        return { status: isOutsideRentInterval, value: minCheckDate.concat(" - ", maxCheckDate) };
    }


    /**
     * Checks if the new rent is within the rent cap based on the unit's price data and rent cap.
     *
     * @param {Object} connection - Mysql connection object.
     * @param {string} unitId - ID of the unit.
     * @param {string} rentCap - The rent cap settings.
     * @param {number} newRent - The new rent value to be checked.
     * @returns {Object} - An object containing the status and value of the rent cap check.
     */
    static async checkWithInRentCap(connection, unitId, rentCap, newRent) {
        let basePrice;
        let capPrice;
        rentCap = JSON.parse(rentCap)
        let priceData = await UnitModel.findById(connection, unitId);
        if (rentCap?.type === 'sell_rate_percent') {
            basePrice = priceData?.price;
        } else if (rentCap?.type === 'set_rate_percent') {
            basePrice = priceData?.set_rate;
        }
        capPrice = (basePrice * rentCap?.value) / 100;
        if (newRent <= capPrice) {
            return { status: true, value: capPrice };
        } else {
            return { status: false, value: capPrice };
        }
    }


    /**
     * Prepares the notes data for the lease based on the following parameters.
     *
     * @param {Object} leaseData - The lease data object.
     * @param {string} manualNote - The manual note to be added.
     * @param {boolean} tagged - The tagged status indicating if the rent change is tagged.
     * @param {string} rentChangeId - The ID of the rent change.
     * @param {string} contactId - The ID of the contact.
     * @param {Array|null} taggedMessage - The tagged message containing the reasons for tagging (optional).
     * @returns {Array} - An array of notes data.
     */
    static prepareNotesData(leaseData, manualNote, tagged, rentChangeId, contactId, taggedMessage = null, isSuccessRentChange, is_admin) {
        let notes = [];
        let errors = taggedMessage?.map((message, index) => `${index + 1}. ${message?.reason}`)?.join(' ');
        if (manualNote) {
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

        if (isSuccessRentChange) {
            let successNote = ManualRentChange.getSuccessNote(is_admin)
            notes.push({
                lease_id: leaseData?.id,
                rent_change_id: rentChangeId ?? null,
                type: 'create',
                creation_type: `auto`,
                last_modified_by: contactId,
                contact_id: leaseData?.contact_id,
                content: successNote,
                context: `rent_management`,
                pinned: 0
            })
        } else if (tagged && errors) {
            notes.push({
                lease_id: leaseData?.id,
                rent_change_id: rentChangeId ?? null,
                type: 'create',
                creation_type: `auto`,
                last_modified_by: contactId,
                contact_id: leaseData?.contact_id,
                content: `Rent change tagged due to the following reasons: ${errors}`,
                context: `rent_management`,
                pinned: 0
            })
        }
        return notes;
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
            e.th(500, `Error while saving notes`);

        return saveRelationResult;
    }

    static getSuccessNote(isAdmin) {
        return isAdmin ?
            "The change has been made by Admin through Admin portal" 
            : "The change has been made through XLSX upload"
    }

    async findRentManagementSettings(connection) {
        this.isEnabledRentManagement = false;
        this.propertyRentSettings = await PropertyRentManagementSettingsModel.getConfiguration(connection, this.property_id);
        this.companyRentSettings = await CompanyRentManagementModel.getConfiguration(connection, this.company_id);
        this.isEnabledRentManagement = !!(this.propertyRentSettings?.active)
    }

    async doManualRentChangeCalculations(connection) {
        let lease = new Lease({ id: this.leaseId });
        let rentSettingsRounding = this.propertyRentSettings?.round_to ?? this.companyRentSettings?.round_to
        this.leaseData = await lease.findUnitLeaseData(connection);
        this.rentService = await lease.findActiveRentService(connection);
        this.allRentChanges = await LeaseRentChangeModel.findRentChanges(connection, this.leaseId); // includes all rent changes except deployed
        this.rentChanges = this.allRentChanges.filter(rentChange => [`initiated`, `approved`].includes(rentChange.status));
        this.currentRent = this.rentService?.price;
        this.calculatedValues = ManualRentChange.calculateRent(this.changeDirection, this.currentRent, this.rentChange.change_value, this.rentChange.change_type);
        this.targetDate = moment(this.rentChange?.target_date, "MM/DD/YYYY").format("YYYY-MM-DD")
        this.effectiveTargetDate = ManualRentChange.calculateEffectiveDate(this.leaseData?.bill_day, this.rentChange?.target_date);
        this.newRent = ManualRentChange.calculateRounding(rentSettingsRounding, this.calculatedValues?.newRent);
        this.currentRentChange = ManualRentChange.findCurrentRentChanges(this.rentChanges, this.effectiveTargetDate);
    }

    async checkRentChangeConditions(connection) {
        this.isValidTargetDate = true;
        this.isDeployedRentChange = false;
        this.isValidNotificationPeriod = true;
        this.isValidInvoicePeriod = true;
        this.isWithInRentCap = { status: true };
        this.isOutsideRentInterval = { status: true };
        this.isSameEffectiveDate = false;
        this.rentChangeExists = false;
        this.isAuctioned = false;
        this.isWithinPrepayPeriod = false;
        this.isExemptedLease = this.leaseData?.exempted;
        this.isValidTargetDate = ManualRentChange.checkValidTargetDate(this.effectiveTargetDate);
        this.isNotificationResolved = false;
        let validNotificationPeriod = ManualRentChange.checkValidNotificationPeriod(this.effectiveTargetDate, this.propertyRentSettings);
        if (this.bypass_notification_period) {
            let unit = await UnitModel.findByLeaseId(connection, this.leaseId);
            let propertyDetails = await PropertyRentManagementSettingsModel.findRentManagementEnabledProperties(
                connection,
                this.company_id,
                this.rentChange.property_id,
                true
            );
            let invoicePeriod = unit.type === "storage" ? propertyDetails[0].storageInvoiceSendDay : propertyDetails[0].parkingInvoiceSendDay
            this.isValidInvoicePeriod = ManualRentChange.checkValidInvoicePeriod(this.effectiveTargetDate, invoicePeriod);
            this.isNotificationResolved = (!validNotificationPeriod && this.isValidInvoicePeriod);
        } else {
            this.isValidNotificationPeriod = (this.newRent < this.currentRentChange?.new_rent_amt) ? true : validNotificationPeriod;
        }
        
        if (this.propertyRentSettings?.min_rent_change_interval) {
            this.isOutsideRentInterval = ManualRentChange.checkOutsideRentInterval(this.rentChanges, this.effectiveTargetDate, this.propertyRentSettings?.min_rent_change_interval);
        }
        if (this.propertyRentSettings?.rent_cap) {
            this.isWithInRentCap = await ManualRentChange.checkWithInRentCap(connection, this.leaseData?.unit_id, this.propertyRentSettings?.rent_cap, this.newRent);
        }
        this.isDeployedRentChange = ManualRentChange.checkDeployedRentChange(this.allRentChanges, this.effectiveTargetDate)
        if (this.currentRentChange) {
            this.isOutsideRentInterval = { status: true };
            this.rentChangeExists = true;
        }
        if(this.leaseData?.prepay_paid_upto && (moment(this.effectiveTargetDate) <= moment(this.leaseData?.prepay_paid_upto))) this.isWithinPrepayPeriod = true;
        this.checkWhetherAuctioned();
        this.isValidRentChange = (this.isEnabledRentManagement
        && this.isValidTargetDate
        && this.isValidNotificationPeriod
        && this.isValidInvoicePeriod
        && this.rentService
        && !this.isDeployedRentChange
        && !this.isAuctioned)
        
        if (!this.isValidRentChange) this.isNotificationResolved = false
    }

    checkWhetherAuctioned() {
        if(this.leaseData?.auction_status && (![`schedule`, `complete`].includes(this.leaseData?.auction_status))) this.isAuctioned = true;
    }


    async addRentChangeErrorReason() {
        let errorMessages = {
            isEnabledRentManagement: "Rent management settings not configured",
            isWithInRentCap: "Have exceeded the established maximum rent cap amount",
            isValidTargetDate: "Selected date is less than the current date",
            isOutsideRentInterval: "Come within the minimum rent change interval",
            isRentChangeExist: "Already have a rent change scheduled for the selected target month",
            isDeployedRentChangeExist: "Already have a deployed rent change for the selected target month",
            isValidNotificationPeriod: "Do not meet the minimum notification period",
            isValidInvoicePeriod: "Do not satisfy the invoice period",
            isExemptedLease: "Have exempted leases",
            activeRentService: "No active rent service",
            isWithinPrepayPeriod: "Come within the prepay period. Future invoices will be adjusted during deployment",
            isAuctioned: "Bid amount for auction has been paid and are ready to move out",
            isNotificationResolved: "The notification has been resolved by admin through admin portal"
        };

        this.rentChangeErrors = [];
        if (!this.rentService) this.rentChangeErrors.push({ reason: errorMessages.activeRentService, required: true });
        if (!this.isEnabledRentManagement) this.rentChangeErrors.push({ reason: errorMessages.isEnabledRentManagement, required: true })
        if (!this.isWithInRentCap?.status) this.rentChangeErrors.push({ reason: errorMessages.isWithInRentCap, required: false });
        if (!this.isOutsideRentInterval?.status) this.rentChangeErrors.push({ reason: errorMessages.isOutsideRentInterval, required: false });
        if (!this.isValidTargetDate) this.rentChangeErrors.push({ reason: errorMessages.isValidTargetDate, required: true });
        if (!this.isValidNotificationPeriod) this.rentChangeErrors.push({ reason: errorMessages.isValidNotificationPeriod, required: true });
        if (!this.isValidInvoicePeriod) this.rentChangeErrors.push({ reason: errorMessages.isValidInvoicePeriod, required: true });
        if (this.isDeployedRentChange) this.rentChangeErrors.push({ reason: errorMessages.isDeployedRentChangeExist, required: true });
        if (this.rentChangeExists) this.rentChangeErrors.push({ reason: errorMessages.isRentChangeExist, required: false });
        if (this.isExemptedLease) this.rentChangeErrors.push({ reason: errorMessages.isExemptedLease, required: false });
        if(this.isWithinPrepayPeriod) this.rentChangeErrors.push({reason: errorMessages.isWithinPrepayPeriod, required: false});
        if(this.isAuctioned) this.rentChangeErrors.push({reason: errorMessages.isAuctioned, required: true});
        if (this.isNotificationResolved) this.rentChangeErrors.push({reason: errorMessages.isNotificationResolved, required: false})
    }

    async setValidRentChangeData() {
        let responseObj = {
            property_id: this.property_id,
            lease_id: this.leaseData?.id,
            tagged: 0,
            new_rent: this.rentChange?.change_value,
            target_date: this.effectiveTargetDate,
            unique_id: this.rentChange.unique_id
        }
        this.hasMinorError = !(
            this.isWithInRentCap?.status
            && this.isOutsideRentInterval?.status
            && !this.rentChangeExists
            && !this.isExemptedLease
            && !this.isWithinPrepayPeriod
            && !this.isNotificationResolved
        );

        if (this.isValidRentChange) {
            if (this.hasMinorError) {
                responseObj["note"] = "Rent change tagged due to the following reasons: \n" + 
                    this.rentChangeErrors.map((error, index) => `${index + 1}. ${error.reason}`).join('\n')
                responseObj["tagged"] = 1;
            } else { 
                responseObj["note"] = ManualRentChange.getSuccessNote(this.is_admin)
            }
            this.rentChange['note'] = "";
            responseObj["rent_change_status"] = "approved"

            this.successLeaseIds.push(responseObj)
            await this.prepareRentChangeSaveData()
        } else {
            responseObj["error"] = this.rentChangeErrors.map(error => error.reason)
            this.failureLeaseIds.push(responseObj)
        }
    }


    async deleteRentChanges(connection) {
        let rentChangeIds = this.allRentChanges.filter(rentChange => moment(rentChange.effective_date).format("YYYY-MM") === moment(this.effectiveTargetDate).format("YYYY-MM") &&
            ([`cancelled`, `skipped`].includes(rentChange.status))).map(rentChange => rentChange.id) ?? [];
        if (rentChangeIds.length) await LeaseRentChangeModel.deleteRentChanges(connection, rentChangeIds);
    }

    async prepareRentChangeSaveData() {
        let
            changeAmt = this.calculatedValues?.changeAmt,
            changeValue = this.rentChange?.change_value,
            changeType = this.rentChange?.change_type
        ;

        this.isTagged = this.hasMinorError;
        let isSuccessRentChange = this.isValidRentChange && !this.isTagged
        

        if (this.changeDirection.toLowerCase() == "decrease" && changeType != "fixed") {
            changeValue = -changeValue;
            changeAmt = -changeAmt;
        }

        let leaseRentChangeData = [
            this.rentChangeType,
            this.leaseId,
            this.property_id,
            'approved',
            this.isTagged,
            this.rentChange?.affect_timeline,
            changeType,
            changeValue,
            changeAmt,
            this.newRent,
            this.targetDate,
            this.effectiveTargetDate,
            moment(this.effectiveTargetDate).format('MMM YYYY'),
            moment().format('YYYY-MM-DD HH:mm:ss'),
            this.user_id
        ];

        if (this.currentRentChange) {
            this.rentChangeUpdate.push([
                this.currentRentChange.id,
                ...leaseRentChangeData,
                this.user_id
            ]);
            let rentChangeHistory = ManualRentChange.prepareRentChangeHistoryData(this.currentRentChange)
            this.rentChangeHistory.push([
                ...rentChangeHistory,
                this.user_id
            ]);
            if (this.rentChange?.note != null || this.hasMinorError) {
                this.notesForUpdateRentChange.push(...ManualRentChange.prepareNotesData(
                    this.leaseData,
                    this.rentChange?.note,
                    this.isTagged,
                    this.currentRentChange.id,
                    this.user_id,
                    this.rentChangeErrors,
                    isSuccessRentChange,
                    this.is_admin
                ));
            }
            if (this.currentRentChange?.status != 'approved') this.updatedRentChangeIds.push(this.currentRentChange.id);
        } else {
            let approvedBy = this.user_id;
            let resolved_by, resolved_at, notification_status = null;
            if (this.isNotificationResolved) {
                resolved_by = this.isNotificationResolved ? this.user_id : null;
                resolved_at = this.isNotificationResolved ? moment().format('YYYY-MM-DD HH:mm:ss') : null;
                notification_status = this.isNotificationResolved ? 'done' : null;
            }
            if (this.approval_type == 'manual' && this.rentChangeType != 'hummingbird') approvedBy = null
            if (this.rentChange?.note != null || this.hasMinorError) {
                this.rentChangeInsert.push({
                    rent_change: [
                        ...leaseRentChangeData,
                        approvedBy,
                        this.user_id,
                        this.isNotificationResolved,
                        resolved_by,
                        resolved_at,
                        notification_status
                    ],
                    note: ManualRentChange.prepareNotesData(
                        this.leaseData,
                        this.rentChange?.note,
                        this.isTagged,
                        null,
                        this.user_id,
                        this.rentChangeErrors,
                        isSuccessRentChange,
                        this.is_admin
                    )
                });
            } else {
                this.rentChangeInsertOther.push([
                    ...leaseRentChangeData,
                    approvedBy,
                    this.user_id,
                    resolved_by,
                    resolved_at,
                    notification_status
                ]);
            }

        }
    }

    async bulkSaveRentChange(connection) {
        this.notes = [];
        this.insertedIds = [];
        let rentChangeFields = [
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
            `last_modified_by`,
            `resolved`,
            `resolved_by`,
            `resolved_at`,
            `notification_status`
        ];
        if (this.rentChangeInsert.length) {
            for (let insertData of this.rentChangeInsert) {
                let insertResult = await LeaseRentChangeModel.insert(connection, insertData.rent_change, rentChangeFields);
                insertData.note.map(note => note.rent_change_id = insertResult.insertId);
                this.notes.push(...insertData.note);
                this.insertedIds.push(insertResult.insertId);
            }
        }
        if (this.rentChangeInsertOther.length) {
            let insertedResult = await LeaseRentChangeModel.bulkInsert(connection, this.rentChangeInsertOther, rentChangeFields, true);
            this.insertedIds.push(...insertedResult);
        }
        if (this.rentChangeUpdate.length) {
            await LeaseRentChangeModel.bulkUpdate(connection, this.rentChangeUpdate);
            await LeaseRentChangeModel.bulkInsertHistory(connection, this.rentChangeHistory);
        }
    }

    async bulkManualRentChange(connection) {
        try {
            await this.bulkSaveRentChange(connection)
            await ManualRentChange.saveNotes(connection, [...this.notes, ...this.notesForUpdateRentChange]);

        } catch (error) {
            console.log("Error while saving rent changes", error)
            throw error
        }
        return { "success_lease_ids": this.successLeaseIds, "failure_lease_ids": this.failureLeaseIds }
    }


    async checkConditions(connection, rentChanges) {
        try {
            await this.findRentManagementSettings(connection);
            this.rentChangeInsertOther = [];
            this.rentChangeInsert = [];
            this.rentChangeUpdate = [];
            this.rentChangeHistory = [];
            this.successLeaseIds = [];
            this.failureLeaseIds = [];
            this.notesForUpdateRentChange = [];
            this.updatedRentChangeIds = [];

            for (let rentChange of rentChanges) {
                this.rentChange = rentChange;
                this.leaseId = rentChange.lease_id;
                await this.doManualRentChangeCalculations(connection);
                await this.checkRentChangeConditions(connection);
                await this.addRentChangeErrorReason();
                await this.setValidRentChangeData()
                await this.deleteRentChanges(connection);
            }
        } catch (error) { throw error }
    }
}


module.exports = ManualRentChange