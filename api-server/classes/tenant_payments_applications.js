"use strict";

var moment = require('moment');
const moment_tz = require('moment-timezone');
var zipcode_to_timezone = require('zipcode-to-timezone');
var models = require(__dirname + '/../models');
var e = require(__dirname + '/../modules/error_handler.js');
var { sendUpdateBankEmail, updatePayoutBankAccountTemplate, sendChargeBackNotificationEmail, chargeBackNotificationEmailTemplate, achreversalNotificationEmailTemplate } =
    require('./../modules/mail');
var Roles = require(__dirname + '/../models/roles.js');
var Payment = require(__dirname + '/../classes/payment.js');
var Contact = require(__dirname + '/../classes/contact.js');
var Property = require(__dirname + '/../classes/property.js');
var Company = require(__dirname + '/../classes/company.js');
const db = require(__dirname + '/../modules/db_handler.js');
var {sendMessageToSlackChannel} = require('../modules/slack.js');
var Enums = require(__dirname + '/../modules/enums.js');
let Validator = require('validator');



class TenantPaymentApplications {
    constructor(data){
        this.id = data.id;
        this.property_id = data.property_id;
        this.contact_id = data.contact_id;
        this.status = data.status;
        this.account_number = data.account_number;
        this.password = data.password;
        this.source_email = data.source_email;
        this.tier = data.tier;

    this.account_type = data.AccountType;
    this.expiration_date = data.expiration_date;
    this.cc_trans_limit = data.cc_trans_limit;
    this.ach_trans_limit = data.ach_trans_limit;
    this.cc_monthly_limit = data.cc_monthly_limit;
    this.ach_monthly_limit = data.ach_monthly_limit;
    this.propay_in = data.propay_in;
    this.propay_out = data.propay_out;
    this.ach_from = data.ach_from;
    this.ach_to = data.ach_to;
    this.cc_processing = data.cc_processing;
    this.renewal_term = data.renewal_term;
    this.line_of_credit = data.line_of_credit;
    this.cc_hold_days = data.cc_hold_days;
    this.ach_hold_days = data.ach_hold_days;
    this.identity_id = data.identity_id;
    this.act_chg_reason = data.act_chg_reason;
    this.cc_transaction_fee_pct = data.cc_transaction_fee_pct;
    this.ach_transaction_fee = data.ach_transaction_fee;
    this.ach_return_fee = data.ach_return_fee;
    this.cc_chargeback_fee = data.cc_chargeback_fee;

    this.bank_ownership_type = data.bank_ownership_type;
    this.bank_account_type = data.bank_account_type;
    this.bank_name = data.bank_name;
    this.bank_routing_num = data.bank_routing_num;
    this.bank_account_num = data.bank_account_num;
    this.bank_country_code = data.bank_country_code;
    this.bank_name_on_account = data.bank_name_on_account;

        this.api_key = data.api_key;
        this.propay_device_id = data.propay_device_id;
        this.site_id = data.site_id;

    this.general = {
        "entity_type" : data.entity_type,
        "registration_code": data.registration_code,
        "beneficiary_owners": data.beneficiary_owners,
        "terms": data.terms,
        "submit_by": data.submit_by,
        "modified_by": data.modified_by
    },
    this.account_owner = {
        "first_name": data.first_name,
        "last_name": data.last_name,
        "dob": data.dob,
        "email_address": data.business_email,
        "ownership": data.ownership,
        "address": data.c_address,
        "address2": data.c_address2,
        "city": data.c_city,
        "state": data.c_state,
        "country": data.c_country,
        "zip": data.c_zip
    },
    this.business_information = {
        "dba": data.dba,
        "website": data.website,
        "business_email": data.business_email,
        "ein": data.ein,
        "legal_name": data.legal_name,
        "legal_address": {
            "address": data.l_address,
            "address2": data.l_address2,
            "city": data.l_city,
            "state": data.l_state,
            "country": data.l_country,
            "zip": data.l_zip
        },
        "property_timezone": data.property_timezone,
        "facility_phone": {
            "country_code": data.f_country_code,
            "phone": data.f_phone,
            "extension": data.f_extension
        },
        "business_phone": {
            "country_code": data.b_country_code,
            "phone": data.b_phone,
            "extension": data.b_extension
        },
        "address": data.f_address,
        "address2": data.f_address2,
        "city": data.f_city,
        "state": data.f_state,
        "country": data.f_country,
        "zip": data.f_zip
    },
    this.equipment = {
        "will_purchase_equipment": data.will_purchase_equipment,
        "ship_to_alternate": data.ship_to_alternate,
        "address": data.s_address,
        "address2": data.s_address2,
        "city": data.s_city,
        "state": data.s_state,
        "country": data.s_country,
        "zip": data.s_zip
    }

    }

    async find(connection){
        
        let data = null;

        if(this.id){
            data = await models.TenantPaymentsApplication.findById(connection, this.id);

        } else if (this.property_id){
            data = await models.TenantPaymentsApplication.findByPropertyId(connection, this.property_id);
            
        } else if (this.account_number){
            data = await models.TenantPaymentsApplication.findByAccountNumber(connection, this.account_number);
        }        
        
        if(!data) e.th(404, "Application not found")
        this.id = data.id;
        this.property_id = data.property_id;
        this.contact_id = data.contact_id;
        this.account_number = data.account_number;
        this.status = data.status;
        this.password = data.password;
        this.source_email = data.source_email;
        this.tier = data.tier;
        this.created_at = data.created_at;

        this.account_type = data.account_type;
        this.expiration_date = data.expiration_date;
        this.cc_trans_limit = data.cc_trans_limit
        this.ach_trans_limit = data.ach_trans_limit;
        this.cc_monthly_limit = data.cc_monthly_limit;
        this.ach_monthly_limit = data.ach_monthly_limit;
        this.propay_in = data.propay_in 
        this.propay_out = data.propay_out
        this.ach_from = data.ach_from
        this.ach_to = data.ach_to
        this.cc_processing = data.cc_processing 
        this.renewal_term = data.renewal_term;
        this.line_of_credit = data.line_of_credit
        this.cc_hold_days = data.cc_hold_days;
        this.ach_hold_days = data.ach_hold_days;
        this.identity_id = data.identity_id;
        this.act_chg_reason = data.act_chg_reason;

        this.cc_transaction_fee_pct = data.cc_transaction_fee_pct;
        this.ach_transaction_fee = data.ach_transaction_fee;
        this.ach_return_fee = data.ach_return_fee;
        this.cc_chargeback_fee = data.cc_chargeback_fee;

        this.bank_ownership_type = data.bank_ownership_type;
        this.bank_account_type = data.bank_account_type;
        this.bank_name = data.bank_name;
        this.bank_routing_num = data.bank_routing_num;
        this.bank_account_num = data.bank_account_num;
        this.bank_country_code = data.bank_country_code;
        this.bank_name_on_account = data.bank_name_on_account;


        this.api_key = data.api_key;
        this.propay_device_id = data.device_id;
        this.site_id = data.site_id;

    this.general = {
        "entity_type" : data.entity_type,
        "registration_code": data.registration_code,
        "beneficiary_owners": data.beneficiary_owners,
        "terms": data.terms,
        "submit_by": data.submit_by,
        "modified_by": data.modified_by
    },
    this.account_owner = {
        "first_name": data.first_name,
        "last_name": data.last_name,
        "dob": data.dob,
        "email_address": data.business_email,
        "ownership": data.ownership,
        "address": data.c_address,
        "address2": data.c_address2,
        "city": data.c_city,
        "state": data.c_state,
        "country": data.c_country,
        "zip": data.c_zip
    },
    this.business_information = {
        "dba": data.dba,
        "website": data.website,
        "business_email": data.business_email,
        "ein": data.ein,
        "legal_name": data.legal_name,
        "legal_address": {
            "address": data.l_address,
            "address2": data.l_address2,
            "city": data.l_city,
            "state": data.l_state,
            "country": data.l_country,
            "zip": data.l_zip
        },
        "property_timezone": data.property_timezone,
        "facility_phone": {
            "country_code": data.f_country_code,
            "phone": data.f_phone,
            "extension": data.f_extension
        },
        "business_phone": {
            "country_code": data.b_country_code,
            "phone": data.b_phone,
            "extension": data.b_extension
        },
        "address": data.f_address,
        "address2": data.f_address2,
        "city": data.f_city,
        "state": data.f_state,
        "country": data.f_country,
        "zip": data.f_zip
    },
    this.equipment = {
        "will_purchase_equipment": data.will_purchase_equipment,
        "ship_to_alternate": data.ship_to_alternate,
        "address": data.s_address,
        "address2": data.s_address2,
        "city": data.s_city,
        "state": data.s_state,
        "country": data.s_country,
        "zip": data.s_zip
    }

    }

    async updateACH(connection, data){
       this.api_key = data.secretApiKey;
       this.propay_device_id = data.deviceId;
       this.site_id = data.siteId;
       await this.save(connection);
    }

    async update(connection, data) {
        console.log("data-----------: ", data)
        if (data.Status && Enums.TENANT_PAYMENTS.APPLICATION_STATUS.find(c => c.toLowerCase() === data.Status.toLowerCase()) && 
                data.AccountStatusChangeReason && Enums.TENANT_PAYMENTS.APPLICATION_REASON.find(c => c.toLowerCase() === data.AccountStatusChangeReason.toLowerCase())) {
            this.status = data.Status;
    
            const toSnakeCase = (str) => {
                return str.slice(0,1).toLowerCase() + str.split('').slice(1).map((char) => {
                    if (char == char.toUpperCase()) return '_' + char.toLowerCase();
                    else return char;
                }).join('');
            }
    
            this.status = toSnakeCase(data.Status);

            this.source_email = data.UserEmail;
            this.account_number = data.AccountNumber;
    
            this.account_type = data.AccountType;
            this.expiration_date = data.ExpirationDateTime;
            if (data.PerTransactionLimitCC) this.cc_trans_limit = data.PerTransactionLimitCC.replace(/[^0-9.]/g, '');
            if (data.PerTransactionLimitAch) this.ach_trans_limit = data.PerTransactionLimitAch.replace(/[^0-9.]/g, '');
            if (data.MonthlyLimitCC) this.cc_monthly_limit = data.MonthlyLimitCC.replace(/[^0-9.]/g, '');
            if (data.MonthlyLimitAch) this.ach_monthly_limit = data.MonthlyLimitAch.replace(/[^0-9.]/g, '');
            this.propay_in = data.PropayIn === "False" ? false : true;
            this.propay_out = data.PropayOut === "False" ? false : true;
            this.ach_from = data.AchFrom === "False" ? false : true;
            this.ach_to = data.AchTo === "False" ? false : true;
            this.cc_processing = data.CCProcessing == "False" ? false : true;
            this.renewal_term = data.RenewalTerm;
            if (data.LineOfCredit) this.line_of_credit = data.LineOfCredit.replace(/[^0-9.]/g, '');
            this.cc_hold_days = data.CCHoldDays;
            this.ach_hold_days = data.AchHoldDays;
            this.identity_id = data.IdentityId;
            this.act_chg_reason = data.AccountStatusChangeReason;
    
            this.cc_transaction_fee_pct = data.cc_transaction_fee_pct || this.cc_transaction_fee_pct;
            this.ach_transaction_fee = data.ach_transaction_fee || this.ach_transaction_fee;
            this.ach_return_fee = data.ach_return_fee || this.ach_return_fee;
            this.cc_chargeback_fee = data.cc_chargeback_fee || this.cc_chargeback_fee;
    
            console.log(this.status);
    
    
            await this.save(connection);
        }
    }
    async updateBankInfo(connection, data){
        let payload = {
            "AccountNumber": this.account_number,
            "BankAccount": {
                "AccountCountryCode": data.banking_info.country_code,
                "BankAccountNumber": data.banking_info.account_number,
                "RoutingNumber": data.banking_info.routing_number,
                "AccountOwnershipType": data.banking_info.ownership_type,
                "BankName": data.banking_info.bank_name,
                "AccountType": data.banking_info.account_type,
                
            }
        }

        let bankHistoryPayload = {
            tenant_payments_applications_id: this.id,
            name_on_account: this.bank_name_on_account,
            account_number: this.bank_account_num,
            routing_number: this.bank_routing_num,
            ownership_type: this.bank_ownership_type,
            bank_name: this.bank_name,
            account_type: this.bank_account_type,
            modified_by: data.contact_id
        }

        this.bank_ownership_type = data.banking_info.ownership_type;
        this.bank_account_type = data.banking_info.account_type;
        this.bank_name = data.banking_info.bank_name;
        this.bank_routing_num = data.banking_info.routing_number;
        this.bank_account_num = data.banking_info.account_number;
        this.bank_country_code = data.banking_info.country_code;
        this.bank_name_on_account = data.banking_info.name_on_account;
        
        await TenantPaymentsCard.updateBankInfo(payload, this.account_number);

        await this.save(connection);

        //save bank historic data
        await models.TenantPaymentsApplication.saveBankHistory(connection, {data: bankHistoryPayload});
    }

    async sendUpdateBankInfoEmail(connection, company, property) {

    let subject = 'Merchant Bank Details Updated';

    try {
            let send_email = false;
            let recipient_emails = [];
            let adminList = await Contact.findAdminsByPropertyId(connection, company.id, property.id);
            let htmlTemplate = updatePayoutBankAccountTemplate(property.name);
            for (let i = 0; i < adminList.length; i++) {
                let permissionList = await Roles.findPropertyPermissionsLabel(connection, 
                                            company.id, adminList[i].contact_id, property.id);
                if (permissionList.find(obj => obj.label === 'update_payout_account')) {
                    if (adminList[i].email && Validator.isEmail(adminList[i].email)) {
                        recipient_emails.push(adminList[i].email);
                        send_email = true;
                    }
                }
            }
                
            if (send_email == true) {
                await sendUpdateBankEmail(connection, property.id, company.gds_owner_id , recipient_emails, htmlTemplate);
            } else {
                let property_emails = await models.Property.findEmails(connection, property.id);
                for (let i = 0; i < property_emails.length; i++) {
                    if (property_emails[i].email && Validator.isEmail(property_emails[i].email)) {
                        recipient_emails.push(property_emails[i].email);
                        send_email = true;
                    }
                }
                if (send_email == true) {
                    await sendUpdateBankEmail(connection, 
                        property.id, company.gds_owner_id, recipient_emails, htmlTemplate);
                } else{
                    await sendMessageToSlackChannel("No property email to send Update Bank Account email for company ID : " 
                                + company.id + " and property ID : " + property.id + " property name : " + property.name);    
                }
            }
        } catch (err) {
            console.log(property.id, "Error in sendDelayEmailToAdminWithPermission : ", err);
            await sendMessageToSlackChannel("Failed to send Update Bank Account email for company ID : " 
                            + company.id + " and property ID : " + property.id + " property name : " + property.name);
                //await TenantPaymentsPayoutsRoutines.sendPayoutErrorEmail(
            //property.id, "Alert - Error in sendDelayEmailToAdminWithPermission: " + err);
        }

    }

    async updateGrossSettleInfo(connection, data){
        let payload = {
            "AccountNumber": this.account_number,
            "GrossBillingInformation": {
                "GrossSettleBankAccount":{
                    "AccountName": data.banking_info.first_name + " " + data.banking_info.last_name,
                    "AccountType": data.banking_info.account_type === "Checking" ? "C" : "S",
                    "BankAccountNumber": data.banking_info.account_number,
                    "RoutingNumber": data.banking_info.routing_number,
                    "AccountCountryCode": data.banking_info.country_code,
                    "AccountNum": this.account_number
                }            
            }, 
        }
    
        await TenantPaymentsCard.updateGrossSettleInfo(payload, this.account_number);


        await this.save(connection);
    }


    async save(connection){

    let save = {
      property_id: this.property_id,
      contact_id: this.contact_id,
      account_number: this.active,
      status: this.status,
      account_number: this.account_number,
      password: this.password,
      source_email: this.source_email,
      tier: this.tier,
      account_type: this.account_type,
      expiration_date: this.expiration_date,
      cc_trans_limit: this.cc_trans_limit,
      cc_monthly_limit: this.cc_monthly_limit,
      ach_transaction_fee: this.ach_transaction_fee,
      ach_trans_limit: this.ach_trans_limit,
      ach_monthly_limit: this.ach_monthly_limit,
      propay_in: this.propay_in,
      propay_out: this.propay_out,
      ach_from: this.ach_from,
      ach_to: this.ach_to,
      cc_processing: this.cc_processing,
      renewal_term: this.renewal_term,
      line_of_credit: this.line_of_credit,
      cc_hold_days: this.cc_hold_days,
      ach_hold_days: this.ach_hold_days,
      identity_id: this.identity_id,
      act_chg_reason: this.act_chg_reason,
      cc_transaction_fee_pct: this.cc_transaction_fee_pct,
      ach_transaction_fee: this.ach_transaction_fee,
      ach_return_fee: this.ach_return_fee,
      cc_chargeback_fee: this.cc_chargeback_fee,

      bank_ownership_type: this.bank_ownership_type,
      bank_account_type: this.bank_account_type,
      bank_name: this.bank_name,
      bank_routing_num: this.bank_routing_num,
      bank_account_num: this.bank_account_num,
      bank_country_code: this.bank_country_code,
      bank_name_on_account: this.bank_name_on_account,

            api_key: this.api_key,
            device_id: this.propay_device_id,
            site_id: this.site_id

        };
        
        let result = await models.TenantPaymentsApplication.save(connection, save, this.id)
        if(result.insertId) {
            this.id = result.insertId;
          }
    }

    async updateSaveAndClose(connection, data) {
        this.property_id = data.property_id;
        this.contact_id = data.contact_id;
        this.account_number = data.account_number;
        this.status = data.status;
        this.password = data.password;
        this.source_email = data.source_email;
        this.tier = data.tier;
        this.created_at = data.created_at;

        this.account_type = data.account_type;
        this.expiration_date = data.expiration_date;
        this.cc_trans_limit = data.cc_trans_limit
        this.ach_trans_limit = data.ach_trans_limit;
        this.cc_monthly_limit = data.cc_monthly_limit;
        this.ach_monthly_limit = data.ach_monthly_limit;
        this.propay_in = data.propay_in 
        this.propay_out = data.propay_out
        this.ach_from = data.ach_from
        this.ach_to = data.ach_to
        this.cc_processing = data.cc_processing 
        this.renewal_term = data.renewal_term;
        this.line_of_credit = data.line_of_credit
        this.cc_hold_days = data.cc_hold_days;
        this.ach_hold_days = data.ach_hold_days;
        this.identity_id = data.identity_id;
        this.act_chg_reason = data.act_chg_reason;

        this.cc_transaction_fee_pct = data.cc_transaction_fee_pct;
        this.ach_transaction_fee = data.ach_transaction_fee;
        this.ach_return_fee = data.ach_return_fee;
        this.cc_chargeback_fee = data.cc_chargeback_fee;

        this.bank_ownership_type = data.bank_ownership_type;
        this.bank_account_type = data.bank_account_type;
        this.bank_name = data.bank_name;
        this.bank_routing_num = data.bank_routing_num;
        this.bank_account_num = data.bank_account_num;
        this.bank_country_code = data.bank_country_code;
        this.bank_name_on_account = data.bank_name_on_account;


        this.api_key = data.api_key;
        this.propay_device_id = data.device_id;
        this.site_id = data.site_id;

        //tenant payments details
        await this.saveAndClose(connection, data);
    }

    async saveAndClose(connection, data){
        const { banking_info, beneficiaries, contact_id } = data;
        if(banking_info) {
            const {name_on_account, country_code, account_number, routing_number, ownership_type, bank_name, account_type } = banking_info;
            this.bank_name_on_account = name_on_account;
            this.bank_country_code = country_code;
            this.bank_account_num = account_number;
            this.bank_routing_num = routing_number;
            this.bank_ownership_type = ownership_type ? ownership_type.toLowerCase() : null;
            this.bank_name = bank_name;
            this.bank_account_type = account_type ? account_type.toLowerCase() : null;
        }
        await this.save(connection);
        if(this.id) {
            await this.saveTenantPaymentsDetails(connection, data);
            await this.saveTenantPaymentsBeneficiaries(connection, {active_beneficiary_items: beneficiaries, contact_id: contact_id });
        }
    }

    async transformBulkUpdateBeneficiarySaveData(connection, payload) {
        const { beneficiary_items, tenant_payments_applications_id } = payload;
        const beneficiaryItems = [];
        for(var i in beneficiary_items) {
            let beneficiary_address_id = beneficiary_items[i].address_id;
            let b_ownership = beneficiary_items[i].ownership; 
            let ownership = (((b_ownership-1)*(b_ownership-100)) <= 0) ? beneficiary_items[i].ownership : null;
            const { id, first_name, last_name, dob, same_as_director } = beneficiary_items[i];
            //save beneficiary address
            let address_id = await this.saveTenantPaymentsAddress(connection, beneficiary_items[i], beneficiary_address_id);
            beneficiaryItems.push([id, tenant_payments_applications_id, address_id, first_name, last_name, dob, same_as_director, ownership]);
        }
        return beneficiaryItems;
    }

    async saveTenantPaymentsBeneficiaries(connection, payload) {
        const { active_beneficiary_items, contact_id } = payload;
        const updateSaveBeneficiaryItems = await this.transformBulkUpdateBeneficiarySaveData(connection, { beneficiary_items: active_beneficiary_items, tenant_payments_applications_id: this.id });
        const previousBeneficiaryItems = await models.TenantPaymentsApplication.findBeneficiariesByApplicationId(connection, this.id);
        const removedBeneficiaryItems = previousBeneficiaryItems.filter(p => !active_beneficiary_items.some(b => b.id === p.id));
        if(updateSaveBeneficiaryItems?.length) {
            await models.TenantPaymentsApplication.bulkUpdateSave(connection, { data: updateSaveBeneficiaryItems });
        }
        if(removedBeneficiaryItems?.length) {
            let data = {
                deleted_by: contact_id,
                deleted_at: moment().format('YYYY-MM-DD HH:mm:ss')
              }
            await models.TenantPaymentsApplication.bulkDelete(connection, removedBeneficiaryItems.map(x => x.id), data);
        }
    }

    async saveTenantPaymentsAddress(connection, payload, address_id) {
        const { address, address2, city, state, country, zip } = payload;
        let result =  await models.Address.addAddress(connection, { address, address2, city, state, country, zip }, address_id);
        if(result) {
            return result;
        }
        return address_id;
    }

    async saveTenantPaymentsDetails(connection, data) {
        const { general, business_information, account_owner, equipment = {}, is_submit, contact_id } = data;
        const { entity_type, registration_code, beneficiary_owners, terms } = general;
        const { dba, website, ein, legal_name, property_timezone, facility_phone, business_phone, legal_address } = business_information;
        const { first_name, last_name, dob, email_address } = account_owner;
        const { will_purchase_equipment, ship_to_alternate } = equipment;

        let tenant_payments_details = await models.TenantPaymentsApplication.findTenantPaymentsDetailsByApplicationId(connection, this.id);
        let tenant_payments_details_id = tenant_payments_details ? tenant_payments_details.id : null;
        let facility_phone_id = tenant_payments_details ? tenant_payments_details.facility_phone_id : null;
        let business_phone_id = tenant_payments_details ? tenant_payments_details.business_phone_id : null;
        let facility_address_id = tenant_payments_details ? tenant_payments_details.facility_address_id : null;
        let customer_address_id = tenant_payments_details ? tenant_payments_details.customer_address_id : null;
        let shipping_address_id = tenant_payments_details ? tenant_payments_details.shipping_address_id : null;
        let legal_address_id = tenant_payments_details ? tenant_payments_details.legal_address_id : null;

        //save facility phone
        let facilityPhoneId = facility_phone_id;
        if(facility_phone) {
            let result =  await models.TenantPaymentsApplication.savePhone(connection, facility_phone, facility_phone_id);
            if(result.insertId) {
                facilityPhoneId = result.insertId;
            }
        }
        //save business phone
        let businessPhoneId = business_phone_id;
        if(business_phone  && entity_type == 'registered_business') {
            let result =  await models.TenantPaymentsApplication.savePhone(connection, business_phone, business_phone_id);
            if(result.insertId) {
                businessPhoneId = result.insertId;
            }
        }

        //save facility/business address
        let facilityAddressId = await this.saveTenantPaymentsAddress(connection, business_information, facility_address_id);

        //save customer/personal address
        let customerAddressId = await this.saveTenantPaymentsAddress(connection, account_owner, customer_address_id);

        //save shipping/equipment address
        let shippingAddressId = await this.saveTenantPaymentsAddress(connection, equipment, shipping_address_id);

        //save legal address
        let legalAddressId = legal_address_id;
        if(legal_address && entity_type == 'registered_business') {
            legalAddressId = await this.saveTenantPaymentsAddress(connection, legal_address, legal_address_id);
        }
        
        let saveTenantPaymentDetails = {
            tenant_payments_applications_id: this.id,
            facility_phone_id: facilityPhoneId,
            business_phone_id: entity_type == 'registered_business' ? businessPhoneId : null ,
            facility_address_id: facilityAddressId,
            customer_address_id: customerAddressId,
            shipping_address_id: shippingAddressId,
            legal_address_id: entity_type == 'registered_business' ? legalAddressId : null,
            entity_type,
            dba,
            website,
            business_email: email_address || null,
            ein: entity_type == 'registered_business' ? ein : null,
            legal_name: entity_type == 'registered_business' ? legal_name : null,
            property_timezone,
            first_name,
            last_name,
            dob,
            registration_code,
            will_purchase_equipment,
            ship_to_alternate,
            beneficiary_owners,
            terms,
            submit_by: is_submit ? contact_id: null,
            submit_at: is_submit ? moment().format('YYYY-MM-DD HH:mm:ss') : null,
            modified_by: contact_id || null
        };
        await models.TenantPaymentsApplication.saveTenantPaymentsDetails(connection, saveTenantPaymentDetails, tenant_payments_details_id);
    }

  async submit(connection, data, company_id) {

    let tier = null;

    //Get Property Timezone
    try {
          let pincode = await models.TenantPaymentsApplication.findPropertyZip(connection, this.property_id);
          //const timezone = zipcode_to_timezone.lookup(pincode.zip);
          let timezone = await models.Property.findPropertyTimeZone(connection, null, pincode.zip);
          if (timezone !== null) {
            if (['America/Phoenix', 'US/Arizona'].includes(timezone)) {
                tier = 'Arizona';
            } else {
                tier = moment_tz.tz(moment(), timezone).zoneAbbr();
            }
            console.log("standardTimezone Tier for pincode", pincode.zip, "::::", tier, timezone);

            if (tier) {
                tier = tier.replace(/DT/g, 'ST');
                console.log("-----tier: ", tier);
            }

            if (!tier) e.th(404, "Tier not found");
        } else {
            e.th(404, "Timezone is not found for the given pincode: "+pincode.zip);
        }
        //   console.log("data.general.registration_code", data.general.registration_code);
    } catch (err) {
      console.log("Error while getting Tier Value  : ", err);
      e.th(404, err);
    }
    //set derived tier value to class property
    this.tier = tier;

    let businessDescription = `Business Type: self storage, DBA Address: ${data.account_owner.address}, ${data.account_owner.state}, ${data.account_owner.country},${data.account_owner.zip}`;
    let phoneNumber = null;
    //Fixing Phone Number Format
    if (data && data.business_information && data.business_information.business_phone && data.business_information.business_phone.phone) {
      phoneNumber = data.business_information.business_phone.phone.replace(/[^\d]/g, '');
      console.log("phoneNumber ::::: ", phoneNumber);
    }


    let payload = {
      "PersonalData": {
        "FirstName": data.account_owner.first_name,
        //    "MiddleInitial": null,
        "LastName": data.account_owner.last_name,
        "DateOfBirth": moment(data.account_owner.dob, 'YYYY-MM-DD').format('MM-DD-YYYY'),
        "SocialSecurityNumber": data.account_owner.ssn.replace(/-/g, ''),
        "SourceEmail": data.account_owner.email_address,
        "PhoneInformation": {
          "DayPhone": phoneNumber,
          "EveningPhone": phoneNumber,
        },
        "NotificationEmail": "profacmerchantnotifications@tenantinc.com",
        "TimeZone": data.business_information.property_timezone || 'PT'
      },
      "SignupAccountData": {
        "ExternalId": company_id,
        "CurrencyCode": "USD",
        "Tier": tier
      },
      "BusinessData": {
        "BusinessLegalName": data.business_information.legal_name,
        "DoingBusinessAs": data.business_information.dba,
        "EIN": data.business_information.ein.replace(/-/g, ''),
        "MerchantCategoryCode": "4225",
        "WebsiteURL": data.business_information.website.slice(0, 80), // needs http, truncate url if greater than 80 char, as we can only submit 80 char to propay while creating account
        "BusinessDescription": businessDescription.slice(0, 255),
        "MonthlyBankCardVolume": "75000",
        "AverageTicket": "150",
        "HighestTicket": "1000"
      },

      "Address": {
        //        "ApartmentNumber": data.account_owner.address2,
                "Address1": data.account_owner.address,
                "Address2": data.account_owner.address2,
                "City": data.account_owner.city,
                "State": data.account_owner.state,
                "Country": data.account_owner.country,
                "Zip": data.account_owner.zip
            },
            "MailAddress": {
                "Address1": data.business_information.address,
                "Address2": data.business_information.address2,
                "City": data.business_information.city,
                "State": data.business_information.state,
                "Country": data.business_information.country,
                "Zip": data.business_information.zip
            },
            "BusinessAddress": { 
                "Address1": data.business_information.address,
                "Address2": data.business_information.address2,
                "City": data.business_information.city,
                "State": data.business_information.state,
                "Country": data.business_information.country,
                "Zip": data.business_information.zip
            },
            "BankAccount": { 
                "AccountName": (data.banking_info.name_on_account).substring(0, 32),
                "AccountCountryCode": data.banking_info.country_code || "USA",
                "BankAccountNumber": data.banking_info.account_number,
                "RoutingNumber": data.banking_info.routing_number,
                "AccountOwnershipType": data.banking_info.ownership_type,
                "BankName": data.banking_info.bank_name,
                "AccountType": data.banking_info.account_type == "checking" ? "C" : "S",
            },
            //sub-accounts are setup for net settlement, no need to send gross billing bank account information for account creation (and any update calls)
            // "GrossBillingInformation": {
            //     "GrossSettleBankAccount":{
            //         "AccountName": data.banking_info.first_name + " " + data.banking_info.last_name,
            //         "AccountType": data.banking_info.account_type === "Checking" ? "C" : "S",
            //         "BankAccountNumber": data.banking_info.account_number,
            //         "RoutingNumber": data.banking_info.routing_number,
            //         "AccountCountryCode": data.banking_info.country_code
            //     }            
            // }, 
            "BeneficialOwnerData": {
                "OwnerCount": data.beneficiaries.length,
                "Owners": []
            },
           
        }


        for(let i = 0; i <  data.beneficiaries.length; i++){
            payload.BeneficialOwnerData.Owners.push({ 
                "FirstName": data.beneficiaries[i].first_name,
                "LastName": data.beneficiaries[i].last_name,
                "SSN": data.beneficiaries[i].ssn ? data.beneficiaries[i].ssn.replace(/-/g, ''): '',
                "DateOfBirth": data.beneficiaries[i].dob ? moment(data.beneficiaries[i].dob, 'YYYY-MM-DD').format('MM-DD-YYYY'): '',
                "Email": 'profacmerchantnotifications@tenantinc.com',
                "Address": data.beneficiaries[i].address,
                "City": data.beneficiaries[i].city,
                "State": data.beneficiaries[i].state,
                "Zip": data.beneficiaries[i].zip,
                "Country": data.beneficiaries[i].country,
                "Title": data.beneficiaries[i].title || 'owner',
                "Percentage": data.beneficiaries[i].ownership
            })
        }

        
        payload.Devices = [
            {
                "Name": "Tenant Secure Submit",
                "Quantity": 1
            }
        ]
        if( data.equipment.will_purchase_equipment){
            payload.Devices.push(
                {
                    "Name": data.equipment.device_name || "Tenant A35",
                    "Quantity": 1
                }
            )
            payload.CreditCardData = {
                "NameOnCard": data.equipment.name_on_card,
                "CreditCardNumber": data.equipment.card_number,
                "ExpirationDate": data.equipment.exp_date.replace(/\//g, ''),
                "CVV": data.equipment.cvv
            }
            
            payload.MailAddress = {
                "Address1": data.equipment.address,
                "Address2": data.equipment.address2,
                "City": data.equipment.city,
                "State": data.equipment.state,
                "Country": data.equipment.country,
                "Zip": data.equipment.zip
            }
        }
    
        console.log("TenantPaymentApplicationSubmissionPayload", payload);        
        let response =  await TenantPaymentsCard.submitApplication(payload);

        if(response)
          console.log("TenantPaymentApplicationSubmissionResponse", response);

        this.status = response.status;
        this.account_number = response.account_number;
        this.password = response.password;
        this.source_email = response.source_email;
        //this.tier_id = tier.id;
        //this.cc_transaction_fee_pct = tier.cc_transaction_fee_pct;
        //this.ach_transaction_fee = tier.ach_transaction_fee;
        //this.ach_return_fee = tier.ach_return_fee;
        //this.cc_chargeback_fee = tier.cc_chargeback_fee;

        this.bank_country_code = data.banking_info.country_code;
        this.bank_account_num = data.banking_info.account_number;
        this.bank_routing_num = data.banking_info.routing_number;
        this.bank_ownership_type = data.banking_info.ownership_type.toLowerCase();
        this.bank_name = data.banking_info.bank_name;
        this.bank_account_type = data.banking_info.account_type.toLowerCase();

        
        await this.save(connection)
        
        return {
            status: this.status,
            account_number: this.account_number 
        }

    }
  async orderProPayDevice(data, property_name, property_phone) {

    let payload = {
      "AccountNumber": this.account_number,
      "ShipTo": property_name,
      "shipToContact": data.equipment.contact_name,
      "BusinessAddress": {
        "Address1": data.equipment.address,
        "Address2": data.equipment.address2,
        "City": data.equipment.city,
        "State": data.equipment.state,
        "Country": data.equipment.country,
        "Zip": data.equipment.zip
      },
      "Device": {
        "Name": data.equipment.device_name,
        "Quantity": 1
      },
      "CreditCardData": {
        "NameOnCard": data.equipment.name_on_card,
        "CreditCardNumber": data.equipment.card_number,
        "ExpirationDate": data.equipment.exp_date.replace(/\//g, ''),
        "CVV": data.equipment.cvv,
        "CardZip": data.equipment.card_zip
      },
      "MailAddress": {
        "Address1": data.equipment.address,
        "Address2": data.equipment.address2,
        "City": data.equipment.city,
        "State": data.equipment.state,
        "Country": data.equipment.country,
        "Zip": data.equipment.zip,
        "Phone": data.equipment.phone
      }
    }

    if(payload.ShipTo.length>30){
        payload.ShipTo = payload.ShipTo.substring(0,30);
    }
    let response = await TenantPaymentsACH.submitEquipmentPurchaseRequest(payload);
    if(response){
    this.status = response.status;
    console.log("----response: ", response);
    }
    return {
      status: response,
    }
  }

    async sendChargeBackNotificationInfoEmail(connection, notificationDetails, notificationEvent, slack_data) {
    try {
        let payment = new Payment({ id: notificationDetails.payment_id });
        await payment.find(connection);
        let contact = new Contact({ id: notificationDetails.contact_id });
        await contact.find(connection);
        console.log("Contact: ", contact);
        let property = new Property({ id: notificationDetails.property_id });
        await property.find(connection);
        console.log("property", property);
        let company = new Company({ id: contact.company_id });
        await company.find(connection, true);
        await property.getAddress(connection);
        let address = property.Address;
        console.log("address: ", address.state);
        let email_details ={};
        email_details.from_email = process.env.REVERSAL_NOTIFICATION_EMAIL_ID;
        email_details.bcc_email = process.env.REVERSAL_NOTIFICATION_EMAIL_BCC;

        let htmlTemplate = '';
        let recipient_email = [];
        let addresses = '';
        let prop = '';
        
        contact.middle = contact.middle == null ? '' : contact.middle;
        contact.last = contact.last == null ? '' : contact.last;

        // prop = property.name != null ? property.name : '';
        prop = property.number != null ? property.number : ' ';

        addresses = address.address !== null ? address.address : '';
        addresses = address.address2 !== null ? addresses + ', ' + address.address2 : addresses;
        addresses = address.city !== null ? addresses + ', ' + address.city : addresses;
        addresses = address.state !== null ? addresses + ', ' + address.state : addresses;
        addresses = address.zip !== null ? addresses + ', ' + address.zip : addresses;

        let item=await db.getMappingByCompanyId(company.id)

        let domain={};
        domain.name = property.name
        domain.subdomain = item.subdomain

            let send_email = false;
            switch(notificationEvent){
            case 'chargeback':
                email_details.subject = 'ProPay Chargeback Notice';
                email_details.title = 'Chargeback Notification';
                htmlTemplate = await chargeBackNotificationEmailTemplate(connection, payment, prop, contact, addresses, notificationDetails, domain);
                break;
            case 'ACHReject':
                email_details.subject = 'ACH Payment Return Notice';
                email_details.title = 'ACH payment Reject Notification';
                htmlTemplate = await achreversalNotificationEmailTemplate(connection, payment, prop, contact, addresses, notificationDetails, domain);
                break;
            default:
                htmlTemplate = null;
            }

            if (htmlTemplate == null)
                await sendMessageToSlackChannel("Failed to send Notification Email for recent "+notificationEvent+". Please send email manually. Details: "+JSON.stringify(notificationDetails));

            let adminList = await Contact.findAdminsByPropertyId(connection, company.id, property.id);
            for (let i = 0; i < adminList.length; i++) {
                let permissionList = await Roles.findPropertyPermissionsLabel(connection,
                    company.id, adminList[i].contact_id, property.id);
                if ((permissionList.find(obj => obj.label === 'chargeback_email') && notificationEvent === 'chargeback')
                    || (permissionList.find(obj => obj.label === 'ach_reversal_email') && notificationEvent === 'ACHReject')) {
                    if (adminList[i].email && Validator.isEmail(adminList[i].email)) {
                        recipient_email.push(adminList[i].email);
                        send_email = true;
                    }
                }
            }

            if (send_email) {
                await sendChargeBackNotificationEmail(company.gds_owner_id, prop, email_details, recipient_email, htmlTemplate);
            } else {
                let property_emails = await models.Property.findEmails(connection, property.id);
                console.log("prop emails", property_emails);
                for (let i = 0; i < property_emails.length; i++) {
                    if (property_emails[i].email && Validator.isEmail(property_emails[i].email)) {
                        recipient_email.push(property_emails[i].email);
                    }
                }
                if (recipient_email.length > 0) {
                    await sendChargeBackNotificationEmail(company.gds_owner_id, prop, email_details, recipient_email, htmlTemplate);
                } else {
                    await sendMessageToSlackChannel("No property email found, email not sent for "+notificationEvent+". \nTransaction Details: " + slack_data);        
                }
            }
        } catch (err) {
            console.log("Error while sending notification email for recent "+notificationEvent+". Error:"+err);
            await sendMessageToSlackChannel("Error while sending notification email for recent "+notificationEvent+". \nError:"+ err + "Transaction Details: "+ slack_data);
        }
    }
}



module.exports = TenantPaymentApplications;


var TenantPaymentsCard      = require(__dirname + '/./payment_methods/tenant_payments_card.js');
var TenantPaymentsACH = require(__dirname + '/./payment_methods/tenant_payments_ach.js');






