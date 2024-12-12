'use strict';

// var pool = require(__dirname + '/../modules/db.js');
var db = require(__dirname + '/../modules/db_handler.js');
var moment  = require('moment');
var Scheduler = require(__dirname + '/../modules/scheduler.js');
var Promise = require('bluebird');
var utils    = require(__dirname + '/../modules/utils.js');
var GDS = require('../modules/gds_translate');
var { updateGdsUnitStatus } = require('../modules/messagebus_subscriptions');
var Hash = require(__dirname + '/../modules/hashes.js');
var Hashes = Hash.init();
let { generateContactEvent } = require('../modules/messagebus_subscriptions/contactEvents');
let { generateLeadEvent } = require('../modules/messagebus_subscriptions/leadEvents');
const { raiseDocSignEvent } = require('../modules/messagebus_subscriptions/docEvents');
const { raisePaymentEvent } = require('../modules/messagebus_subscriptions/paymentEvents');
const { raiseRentalEvent } = require('../modules/messagebus_subscriptions/rentalEvents');



const GDSEvents = {

    newLead: async payload => {

        try {
            let translate_payload = [{
                pmstype: "leasecaptain",
                facility: Hashes.encode(payload.property.id, payload.cid),
                ...(payload && payload.unit && payload.unit.space_mix_id && {spacetypes: [payload.unit.space_mix_id]}) 
            }]


            console.log("newLead payload", payload); 
            var mapped_ids = await GDS.getGDSMappingIds(translate_payload);
            await GDS.registerLead(Hashes.encode(payload.contact.id, payload.cid), Hashes.encode(payload.property.id, payload.cid));
            //Temp fix to avoid sending emails to leads generated from call potential
            let is_callpotential = payload?.user?.first === "CallPotential"
            let is_coupon_click = payload?.lead_type === "coupon"
            if((payload.user?.type === 'application' || payload.api?.id) && !is_callpotential && !is_coupon_click){
                let gdsSpaceType = mapped_ids && mapped_ids.spacetypes && mapped_ids.spacetypes.length && mapped_ids.spacetypes[0].gdsid;
                await GDS.lead(payload.contact, payload.lead, payload.company.gds_owner_id, mapped_ids.facility.gdsid, payload.property, gdsSpaceType);
            }
            
        } catch(err){
            console.log("GDS newReservation ERROR", err)
            // send email to admins if there is an error
        }
    },
    


	/*
	 * Register new person in GDS
	 * Expects: contact, unit
	 *
	 */

	newReservation: async payload => {
        
        var connection = await db.getConnectionByType('read', null, payload.cid)
        
        try {
            let tenant_id = payload.lease.Tenants[0].id; 
            let contact = payload.lease.Tenants[0].Contact; 
            await payload.unit.setSpaceMixId(connection);
            let  gds_reservation = await GDS.getGdsReservationInfo(Hashes.encode(payload.reservation.id, payload.cid), Hashes.encode(payload.property.id, payload.cid));
            let gds_tenant = await GDS.tenantOnBoarding(Hashes.encode(tenant_id, payload.cid), Hashes.encode(payload.property.id, payload.cid));


            let translate_payload = [{
                pmstype: "leasecaptain",
                facility: Hashes.encode(payload.property.id, payload.cid),
                spaces: [Hashes.encode(payload.unit.id, payload.cid)],
                spacetypes: [payload.unit.space_mix_id], 
                reservations: [Hashes.encode(payload.reservation.id, payload.cid)]
            }]

            var mapped_ids = await GDS.getGDSMappingIds(translate_payload);

            let start_date = moment(payload.lease.start_date).utcOffset(payload.property.utc_offset,true).toISOString(true);    
            var reservation = await GDS.reservation(mapped_ids, payload.company.gds_owner_id, contact, payload.reservation, payload.unit, gds_tenant, gds_reservation, start_date,  connection);
        
        } catch(err){
            console.log("GDS newReservation ERROR", err)
            // send email to admins if there is an error
        }
        
        await db.closeConnection(connection);
    },
    
    newLease: async payload => {
        
        let accessCode = {};
        let accessFound = false;
        let payment = {};
        let payment_method = {};
        let property = payload.property;
        var connection = await db.getConnectionByType('read', null, payload.cid)
        console.log("newLease: documents: ",payload.documents)
        try{
            let tenant_id = payload.lease.Tenants[0].id; 
            let contact = payload.lease.Tenants[0].Contact; 
            let primaryContact = payload.lease.Tenants.find(x=> x.primary);
            let advanceRental = moment(payload.lease.start_date, 'YYYY-MM-DD').isAfter(moment(),'day');

            if(!property){
                property = new Property({id:payload.unit.property_id});
                await property.find(connection);
            }
            
            let start_date = moment(payload.lease.start_date).utcOffset(property.utc_offset,true).toISOString(true);    
            payload.lease.start_date =  start_date;

            // Only give access code if rental in not in the future.    
            if(primaryContact && !advanceRental) { 
                if(!primaryContact.Contact.Access || !primaryContact.Contact.Access.pin){
                    await primaryContact.Contact.findAccessCredentials(connection,property); 
                }
                if(primaryContact.Contact.Access && primaryContact.Contact.Access.pin){
                    accessFound = true;
                }

                accessCode = {
                    type: property.Access.access_name,
                    pin: accessFound ? primaryContact.Contact.Access.pin : primaryContact.pin
                }
            }
            await payload.lease.getMoveInCosts(connection);         
            await payload.lease.getChecklist(connection, payload.company.id);
            await payload.unit.setSpaceMixId(connection);
            let gds_tenant = await GDS.tenantOnBoarding(Hashes.encode(tenant_id, payload.cid), Hashes.encode(property.id, payload.cid));


            let translate_payload = [{
                pmstype: "leasecaptain",
                facility: Hashes.encode(property.id, payload.cid),
                spaces: [Hashes.encode(payload.unit.id, payload.cid)],
                spacetypes: [payload.unit.space_mix_id], 
          //      reservations: payload.reservation ? [Hashes.encode(payload.reservation.id, payload.cid)] : null
            }] 

            
            var mapped_ids = await GDS.getGDSMappingIds(translate_payload);
            if(!payload.lease.MoveInInvoice.id){
                await payload.lease.getMoveInCosts(connection);    
            }
            if(payload.lease.MoveInInvoice.id && payload.lease.MoveInInvoice.Payments && payload.lease.MoveInInvoice.Payments.length > 0 && payload.lease.MoveInInvoice.Payments[0].PaymentMethod){
                payment_method = new PaymentMethod({id: payload.lease.MoveInInvoice.Payments[0].PaymentMethod.id});
                await payment_method.find(connection);
                await payment_method.getAddress(connection); 
                await payment_method.getAutoPayStatus(connection,payload.lease.id);
                payload.payment_method = payment_method; 
            }
            if(payment_method && payment_method.AutoPay){
                var autopay_result = await GDS.autoPay(connection, payload.company.id, mapped_ids, payload.unit.number, gds_tenant)
            }
            var rental_result = await GDS.rental(connection, payload.company.id, payload.lease.Tenants[0].Contact, payload.lease, payload.unit, mapped_ids, gds_tenant, payload.payment_method, accessCode, payload.documents, payload.payment_cycle, payload.confidence_interval, payload.appId);
            

            // let {gds_tenant, mapped_ids} = await GDSEvents.registerContact(connection, payload)
            
            console.log("rental_result", rental_result)
        } catch(err){
            console.log("GDS NEWLEASE ERROR", err)
            // send email to admins if there is an error
        }

        await db.closeConnection(connection);
 
         
    }, 

    updateGdsUnitStatus: async payload => {
        var connection = await db.getConnectionByType('read', null, payload.cid)
        try {
            await updateGdsUnitStatus(connection, payload.unit.property_id,payload.unit.id);
		} catch(err) {
			console.log("Update unit status error =>", err);
        }
        
        await db.closeConnection(connection);
    },

    async registerContact(connection, payload) {
    },
    async updateGDSContactStatus(payload) {

        var connection = await db.getConnectionByType('read', null, payload.cid);

        try {
            await generateContactEvent(connection, payload.contact, payload.cid)
        } catch (error) {
            console.log(error);
        }

        await db.closeConnection(connection);
    },
    async updateGDSLeadStatus(payload) {
        
        var connection = await db.getConnectionByType('read', null, payload.cid);

        try {
            await generateLeadEvent(connection, payload.property.id, payload.lead, payload.newLead, payload.cid)
        } catch (error) {
            console.log('error occurred while raising update lead event ', error);
        }
        await db.closeConnection(connection);
    },
    
    /**
     * This function is used to update messagebus about payment creation
     * @param payload - The payload of the event payment_created.
     */
     async newPayment(payload) {

        var connection = await db.getConnectionByType('read', null, payload.cid);
        try {
            await raisePaymentEvent(connection, payload)
        } catch (error){
            console.log('error occurred while raise a payment event in gds >> ',error);
        }

        await db.closeConnection(connection);
     },
     
    /**
     * This function is used to update messagebus about rental creation
     * @param payload - The payload of the event rental_created.
     */
    async newRental(payload) {
        var connection = await db.getConnectionByType('read', null, payload.cid);
        try {
            await raiseRentalEvent(connection, payload)
        }
        catch (error) {
            console.log('error occurred while raising rental event ', error);
        }

        await db.closeConnection(connection);
    },
    /**
         * This is a function that is used to update messagebus about document signed
         * @param {Object} payload - The payload of the event document_signed event
         */
    async documentSigned(payload) {
        let connection = await db.getConnectionByType('read', null, payload.cid);
        try {
            await raiseDocSignEvent(connection, payload)
        }
        catch (error) {
            console.log('error occurred while raising doc event ', error);
        }
        await db.closeConnection(connection);
    },
}

module.exports = GDSEvents;

var Property= require('../classes/property.js');
var Payment      = require('../classes/payment.js');
var PaymentMethod = require('../classes/payment_method.js');
var Lead  = require('../classes/lead.js');
var Lease  = require('../classes/lease.js');