"use strict";

var models  = require(__dirname + '/../models');
var settings    = require(__dirname + '/../config/settings.js');
var Promise = require('bluebird');

var validator = require('validator');
var moment      = require('moment');
var Activity  = require(__dirname + '/../classes/activity.js');
var Accounting  = require('../classes/accounting.js');
const { property } = require('../modules/tokens.js');
var e  = require(__dirname + '/../modules/error_handler.js');

class TenantPaymentStatement {

    constructor(data){

        data = data || {};
        this.id = data.id || null;
        this.property_id = data.property.id || null;
        this.property_name = data.property_name || null;
        this.property_city = data.property_city || null;
        this.property_address = data.property_address || null;
        this.property_email = data.property_email || null;
        this.property_timezone = data.property_timezone || null;
        this.company_id = data.company_id || null;
        this.company_name = data.company_name || null;
        this.company_email = data.company_email || null;
        this.company_subdomain = data.company_subdomain || null;
        this.ProFacPortico_AccountID = data.ProFacPortico_AccountID || null ;
        this.month = null ; //done
        this.year = null ; //done
        this.cc_transaction_fee_pct = data.cc_transaction_fee_pct || null; //done
        this.cc_transaction_volume = data.cc_transaction_volume || null; //done
        this.cc_transaction_count = data.payment_method_type_id || null; //done
        this.ach_transaction_fee = data.ach_transaction_fee || null; //done
        this.ach_transaction_volume = data.ach_transaction_volume || null; //done
        this.ach_transaction_count = data.ach_transaction_count || null; //done
        this.cc_chargeback_count = data.cc_chargeback_count || 0;
        this.ach_reversal_count = data.ach_reversal_count || 0;
        this.currency = data.currency || 'USD'; //done




    }

    /* TO-DO
     * check if any validation is required
     */

    validate(){

        return Promise.resolve().then(() => {
            //if (!this.amount) e.th(400, 'Payment Amount is required');
            //if (!this.date || !validator.isDate(this.date + '')) e.th(400, 'Date is required');
            //  if (!this.source) e.th(400, 'Payment Source is required');
            //  if (!this.ref_name) e.th(400, 'Ref Name is required');
            return true;
        })
    }

    async ProcessMontlyTenantPaymentCharges(connection, data) {

        this.property_id = data.property.id;
        console.log("ProcessMontlyTenantPaymentCharges for Property - " + this.property_id);
        try {

            //Get Transactions fee Details
            let transactionFee = await models.Payment.findPropertyTransactionFee(connection, this.property_id);
            let ach_reversal_count = await models.Payment.findACHReversalCount(connection, data.property.id);
            let cc_chargeback_count = await models.Payment.findCCChargebackCount(connection, data.property.id);


            if (transactionFee.length) {
                this.ach_transaction_fee = transactionFee[0].ach_transaction_fee;
                this.cc_transaction_fee_pct = transactionFee[0].cc_transaction_fee_pct;
                this.ProFacPortico_AccountID = transactionFee[0].account_number;
                this.ach_transaction_volume = transactionFee[0].achsum;
                this.ach_transaction_count = transactionFee[0].achTotal;
                this.cc_transaction_volume = transactionFee[0].ccsum;
                this.cc_transaction_count = transactionFee[0].ccTotal;
                this.property_city = transactionFee[0].city;

            }
            if (ach_reversal_count.length) {
                this.ach_reversal_count = ach_reversal_count[0].total;
            }
            if (cc_chargeback_count.length) {
                this.cc_chargeback_count = cc_chargeback_count[0].total;
            }


            const date = new Date();
            console.log("Date : " + date.toLocaleDateString());
            date.setMonth(date.getMonth() - 1);
            const month = date.toLocaleString('default', { month: 'long' });
            const year = date.getFullYear();
            console.log(month + " : " + year);

            this.month = month;
            this.year = year;
            this.property_id = data.property.id;
            this.property_name = data.property.name;
            this.property_address = data.property.address_id;
            this.property_email = data.property.email;
            this.property_timezone = data.property.timezone_abrv;
            this.company_id = data.property.company_id;
            this.company_name = data.property.company_name;
            this.company_email = data.property.company_email;
            this.company_subdomain = data.property.company_subdomain;

            //Compute ACH and CC Montly Transaction changers for Tenant
            //TO-DO

            //Save to dataBase
            console.log("Company ID : " + data.property.company_id + " - Property ID : " + data.property.id + " - ACH transaction count : " + this.ach_transaction_count + " - CC transaction Count : " + this.cc_transaction_count );
            //if (this.cc_transaction_count > 0 || this.ach_transaction_count > 0)
            await this.save(connection);

        }
        catch (err) {
            console.dir(data);
            console.log("Failed to get Tenant Payment Transactions ", err?.stack || err?.msg || err);
        }
    }

    async save(connection){

        await this.validate();

        let company = new Company({ id: this.company_id });
        await company.find(connection);
        console.log("Company Object : ", company.name);

        console.log("Inside this.save")
        var save = {

            property_id: this.property_id,
            property_name: this.property_name,
            property_city: this.property_city,
            property_address: this.property_address,
            property_email: this.property_email,
            property_timezone: this.property_timezone,
            company_id: this.company_id,
            company_name: company.name,
            company_email: company.company_email,
            company_subdomain: company.subdomain,
            ProFacPortico_AccountID: this.ProFacPortico_AccountID,
            month: this.month,
            year: this.year,
            cc_transaction_fee_pct: this.cc_transaction_fee_pct,
            cc_transaction_volume: this.cc_transaction_volume,
            cc_transaction_count: this.cc_transaction_count,
            ach_transaction_fee: this.ach_transaction_fee,
            ach_transaction_volume: this.ach_transaction_volume,
            ach_transaction_count: this.ach_transaction_count,
            cc_chargeback_count: this.cc_chargeback_count,
            ach_reversal_count: this.ach_reversal_count,
            currency: this.currency || 'USD'
        };
        try {
            let update = await models.Payment.checkTenantPaymentDetails(connection, this.property_id, this.year, this.month);
            if (update.length) {
                console.log("************* TenanatPaymnet ID ", update[0].id);
                let result = await models.Payment.saveTenantPaymentDetails(connection, save, update[0].id);
            }
            else {
                let result = await models.Payment.saveTenantPaymentDetails(connection, save, this.id);
                if (result.insertId) {
                    this.id = result.insertId;
                    console.log("************* TenanatPaymnet ID : " + this.id)
                }
            }
        } catch(err){
            console.log("threadId", connection.threadId);
            console.log("connection", connection.config);
            console.log("err", err);
            throw err
        }
    }

    delete(connection){

        if(!this.id) e.th(500, 'payment id not set');
        return this.getPaymentApplications(connection)
            .then(() => {
                if(this.AppliedPayments.length) e.th(400, "You must un-apply all this payment from all invoices before deleting it.");
                return models.Payment.deletePayment(connection, this.id);
            })
    }

}

module.exports = TenantPaymentStatement;
var Company = require(__dirname + '/../classes/company.js');

//var Property = require(__dirname + '/../classes/property.js');
