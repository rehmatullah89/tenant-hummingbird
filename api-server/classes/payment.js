"use strict";

var models  = require(__dirname + '/../models');
var settings    = require(__dirname + '/../config/settings.js');
var Promise = require('bluebird');

var validator = require('validator');
var moment      = require('moment');
var moment_tz   = require('moment-timezone');
var Accounting  = require('../classes/accounting.js');
var e  = require(__dirname + '/../modules/error_handler.js');
var { getISOOffset } = require('../modules/utils');
var Enums = require(__dirname + '/../modules/enums.js');
var GDS = require('../modules/gds_translate');
const clsContext = require('../modules/cls_context');
var payments = require(__dirname + '/../models/payments.js');

class Payment {

    constructor(data){
        data = data || {};
        this.id = data.id || null;
        this.payment_methods_id = null;  // cannot set payment methods ID in the constructor.
        this.lease_id = data.lease_id || null;
        this.leases = data.leases || null;
        this.property_id = data.property_id;
        this.contact_id = data.contact_id;
        this.device_id = data.device_id;
        this.amount = data.amount || null;
        this.transaction_id = data.transaction_id || null;
        this.auth_code = data.auth_code || null;
        this.applied = data.applied || 0;
        this.date = data.date || null;
        this.number = data.number || null;
        this.ref_name = data.ref_name || null;
        this.notes = data.notes || null;
        this.credit_type = data.credit_type || null;
        this.source = data.source || null;
        this.method = data.method || null;
        this.sub_method = data.sub_method || null;
        this.accepted_by = data.accepted_by;
        this.amt_remaining = data.amt_remaining || 0;
        this.amount_tendered = data.amount_tendered || null;
        this.payment_method_type_id = data.payment_method_type_id || null;
        this.verification_method = data.verification_method || null;
        this.payment_method_type_id = data.payment_method_type_id || null;
        this.aid = data.aid || null;
        this.effective_date = null;
        this.status_desc = data.status_desc || null;
        this.payment_gateway = data.payment_gateway || null;
        this.payment_source = data.payment_source || null;
        this.can_reverse = false;
        this.status = true;
        this.msg = '';
        this.response = {
            status: 0,
            msg: ''
        }
        this.Property = {};
        this.Contact = {};
        this.Lease = {};
        this.AcceptedBy = {};
        this.PaymentMethod = {};
        this.AppliedPayments = [];
        this.Refunds = [];
        this.Refund = {};
        this.LeaseAuction = {};
        this.InterPropertyPayment = {};
        this.PaymentInfo = {};

        this.invoicesPayment = [];
        this.total_applied = 0;
        this.payment_remaining = 0;
        this.account_balance = 0;
        this.is_inter_property_payment = false;
    }
    /*
    * This takes a connection and a paymethod object and adds it to the payment
    *
    */

    setPaymentMethod(paymentMethod){

        this.method = paymentMethod.type;
        this.PaymentMethod = paymentMethod; // is a class
        this.payment_methods_id = paymentMethod.id;

        return Promise.resolve();
    }

    validate(){

        return Promise.resolve().then(() => {
            if (!this.amount) e.th(400, 'Payment Amount is required');
            if (!this.date || !validator.isDate(this.date + '')) e.th(400, 'Date is required');
          //  if (!this.source) e.th(400, 'Payment Source is required');
          //  if (!this.ref_name) e.th(400, 'Ref Name is required');
            return true;
        })
    }

    async setPropertyDate(connection, date, formatted_time) {
      try {
        this.Property = new Property({id: this.property_id});
        await this.Property.find(connection);
        // Get time zone from geolocation table
        let time_zone = await models.Property.findPropertyTimeZone(connection,
                                this.Property.Address.country, this.Property.Address.zip);
        console.log("time_zone ", time_zone);                        
        if (!time_zone) return;
        if(!date) return this.date = moment_tz.tz(moment(formatted_time), time_zone).format('YYYY-MM-DD');

        let paymentOffset = getISOOffset(date);
        // Check if it is iso format string
        if(moment(date, moment.ISO_8601).isValid() && paymentOffset !== "+00:00") {
          return this.date = moment(date).utcOffset(paymentOffset).format('YYYY-MM-DD');
        }
        // We will consider it as unix epoic, and consider it as UTC. Convert to property timezone
        this.date = moment_tz.tz(moment(date), time_zone).format('YYYY-MM-DD');
    } catch (err) {
        console.log("Error in setPropertyDate : ", err);
    }
  }

    async addUtcOffSetInDate(connection, date){
      this.Property = new Property({id: this.property_id});
      let off_set = await this.Property.getUtcOffset(connection);
      if(!date) return this.date = moment().utcOffset(off_set).format('YYYY-MM-DD');

      let paymentOffset = getISOOffset(date);
      // Check if it is iso format string
      if(moment(date, moment.ISO_8601).isValid() && paymentOffset !== "+00:00") {
        return moment(date).utcOffset(paymentOffset).format('YYYY-MM-DD');
      }
      // We will consider it as unix epoic, and consider it as UTC. Add the offset.
      this.date = moment(date).utcOffset(off_set).format('YYYY-MM-DD');
    }

    async save(connection){

        await this.validate();

        if(this.id){
          await this.getPaymentApplications(connection)
        }
        else {
          if(!this.Property || !this.Property.id)
            await this.getProperty(connection, false);

          this.effective_date = await this.Property.getEffectiveDate(connection);
        }

        if(!this.ref_name){
          await this.setReferenceName(connection);
        }

        var save = {
            payment_methods_id: this.payment_methods_id,
            credit_type: this.credit_type || 'payment',
            lease_id: this.lease_id,
            property_id: this.property_id,
            contact_id: this.contact_id,
            amount: this.amount,
            device_id: this.device_id,
            transaction_id: this.transaction_id,
            auth_code: this.auth_code,
            applied: this.applied || 0,
            date: this.date,
            method: this.method,
            sub_method: this.sub_method,
            ref_name: this.ref_name,
            notes: this.notes,
            number: this.number,
            source: this.source ? this.source.toLowerCase(): null,
            accepted_by: this.accepted_by,
            amt_remaining: this.payment_remaining,
            amount_tendered: this.amount_tendered,
            verification_method: this.verification_method,
            aid: this.aid,
            status: this.status,
            status_desc: this.status_desc,
            payment_gateway: this.payment_gateway,
            payment_source: this.payment_source,

            payment_method_type_id: this.payment_method_type_id,
            ...(!this.id && {effective_date: this.effective_date})
        };



        let result = await models.Payment.save(connection, save, this.id);
        if (result.insertId) this.id = result.insertId;

    }

    async create(connection, data, paymentMethod = {}, source = 'manual', contact_id){

      // if no payment method and type != cash or check, throw error,

      // this.lease_id = data.lease_id;
      this.amount = Math.round(data.amount * 1e2) / 1e2;
      // this.date = data.date || moment().utcOffset("-12:00").format('YYYY-MM-DD');
      this.created = moment().format('YYYY-MM-DD HH:mm:ss');
      this.property_id = data.property_id;
      this.contact_id = data.contact_id;
      this.ref_name = data.ref_name || null;
      this.number = data.number || null;
      this.source = data.source || 'e-commerce';
//      this.source = data.source || source;
      this.method = data.method;
      this.sub_method = data.sub_method;
      this.notes = data.notes;
      this.accepted_by = contact_id || null;
      this.amount_tendered = (paymentMethod && paymentMethod.type.toLowerCase() === 'cash') ? ((data.amount_tendered && Math.round(data.amount_tendered * 1e2) / 1e2) || null) : null;

      // Set date based on timezone obtained from property country and zip
      await this.setPropertyDate(connection, data.date, this.created);

      if (this.date == null) {
        //set date according to offset timezone
        await this.addUtcOffSetInDate(connection, data.date);
      }

      // If there is no property id, get it from the lease
      if(!this.property_id){
        this.getProperty(connection);
      }

      // If there is no contact id, get it from the lease - pull primary
      if(!this.contact_id){
        this.getContact(connection);
      }

      if((paymentMethod.type.toLowerCase() === 'cash' || paymentMethod.type.toLowerCase() === 'check') && !this.ref_name){
          e.th(400, "Please include a reference name");
      }

      if(paymentMethod.type.toLowerCase() === 'check' && !this.number){
          e.th(400, "Please enter the check number");
      }
      
      if(paymentMethod.type.toLowerCase() === Enums.PAYMENT_METHODS.GIFTCARD) {
        const isValidGiftCard = this.ref_name && this.number;
        if(!isValidGiftCard) {
          e.th(400, 'Reference name and number is required for git card payment');
        }
      }

      if(paymentMethod.type.toLowerCase() === 'paypal'){
        paymentMethod.paypal_order_id = data.paypalOrderId;
        paymentMethod.paypal_payer_id = data.paypalPayerId;
        // WHich one?  Test please  Should use below
        paymentMethod.paypal_payer_id = data.payerID;
        paymentMethod.paypal_payment_id = data.paymentID;
          //TODO Store email address in payment method
      }

      if(paymentMethod.type.toLowerCase() === 'amazon'){
          paymentMethod.access_token = data.access_token;
          paymentMethod.token_type = data.token_type;
          paymentMethod.expires_in = data.expires_in;
          paymentMethod.order_reference_id = data.orderReferenceId;

      }

      if(paymentMethod.type.toLowerCase() === 'google'){
          paymentMethod.paymentToken = data.paymentToken;
      }

      if(paymentMethod.type.toLowerCase() === 'apple'){
          paymentMethod.paymentToken = data.paymentToken;
      }

      if(paymentMethod.device_id){
        this.payment_source = "Payment Terminal";
      } 
      else {
        if(paymentMethod.is_new === true && this.source.toLowerCase() === "in-store" && (paymentMethod.type.toLowerCase() === "card" || paymentMethod.type.toLowerCase() === "ach")){
          this.payment_source = "Keyed In";
        }
        else if(paymentMethod.is_new === false && this.source.toLowerCase() === "in-store" && (paymentMethod.type.toLowerCase() === "card" || paymentMethod.type.toLowerCase() === "ach")){
          this.payment_source = "On File - Manual";
        }
        else if(this.source.toLowerCase() === "e-commerce"){
            this.payment_source = "e-commerce";
        } 
        else if(this.source.toLowerCase() === "ofti"){
          this.payment_source = "Tenant Interface";
        }
        else if(this.source.toLowerCase() === "ofcoop" || this.source.toLowerCase() === "oftw"){
          this.payment_source = "Website";
        }
        else if(this.source.toLowerCase() === "xps"){
          this.payment_source = "XPS";
        }
        else if(this.source.toLowerCase() === "paymentlink"){
          this.payment_source = "Payment Link";
        }
        else if(this.source.toLowerCase() === "in-store" && paymentMethod.type.toLowerCase() === 'cash'){
          this.payment_source = "Cash";
        }
        else if(this.source.toLowerCase() === "in-store" && paymentMethod.type.toLowerCase() === 'check'){
          this.payment_source = "Check";
        }
        else if(this.source.toLowerCase() === "callpotential"){
          this.payment_source = "Call Potential";
        }
        else if(this.source.toLowerCase() === "nectar"){
          this.payment_source = "Nectar API";
        }
        else if(this.source.toLowerCase() === "ivr"){
          this.payment_source = "IVR";
        }
    }
      paymentMethod.lease_id = this.lease_id;

      await this.setPaymentMethod(paymentMethod)
      await this.setPaymentMethodTypeId(connection,paymentMethod)
      await this.save(connection);
    }

    async createCredit(connection, data, contact_id){

      this.amount = Math.round(data.amount * 1e2) / 1e2;
      this.date = data.date || moment().format('YYYY-MM-DD');
      this.created = moment().format('YYYY-MM-DD HH:mm:ss');
      this.property_id = data.property_id;
      this.contact_id = data.contact_id;
      this.ref_name =  null;
      this.number = data.number || null;
      this.source = null;
      this.method = 'credit';
      this.sub_method = data.sub_method || null;
      this.credit_type = 'credit';
      this.notes = data.notes;
      this.accepted_by = contact_id;
      this.lease_id = data.lease_id;

      if(!data.lease_id) e.th(400,'Missing lease id');

      await this.setPaymentMethodTypeId(connection, { type: 'Credit' });
      await this.save(connection);   
      
      clsContext.push(Enums.EVENTS.GENERATE_EVENT_EXPORT, {
        event_id: Enums.ACCOUNTING.EVENTS.ALLOWANCE, 
        payment_id: this.id, 
        property_id: this.property_id 
      });
    }

    async createAdjustment(connection, data, contact_id){

      const { source_payment_id } = data;

      this.amount = Math.round(data.amount * 1e2) / 1e2;
      this.date = data.date || moment().format('YYYY-MM-DD');
      this.created = moment().format('YYYY-MM-DD HH:mm:ss');
      this.property_id = data.property_id;
      this.contact_id = data.contact_id;
      this.ref_name =  null;
      this.number = data.number || null;
      this.source = null;
      this.method = 'adjustment';
      this.sub_method = data.sub_method;
      this.credit_type = 'adjustment';
      this.notes = data.notes;
      this.accepted_by = contact_id;
      this.lease_id = data.lease_id;

      // if(!data.lease_id) e.th(400,'Missing lease id');

      await this.setPaymentMethodTypeId(connection, { type: 'Credit' });
      await this.save(connection);

      if(source_payment_id) {
        const interPropertyPayment = new InterPropertyPayment({
          payment_id: this.id,
          source_payment_id: source_payment_id,
          created_by: contact_id,
          modified_by: contact_id
        });

        await interPropertyPayment.create(connection);
      }
      
      const { INTER_PROPERTY_PAYMENT } = Enums.ADJUSTMENT_SUB_METHOD;
      if(this.sub_method && ![ Enums.ADJUSTMENT_SUB_METHOD.AUCTION, Enums.ADJUSTMENT_SUB_METHOD.CLEANING_DEPOSIT, Enums.ADJUSTMENT_SUB_METHOD.RETAINED_REVENUE,  ].includes(this.sub_method)){
        if(this.sub_method == INTER_PROPERTY_PAYMENT) { 
          clsContext.push(Enums.EVENTS.GENERATE_EVENT_EXPORT, {
            event_id: Enums.ACCOUNTING.EVENTS.INTER_PROPERTY_PAYMENT, 
            source_payment_id: source_payment_id,
            payment_id: this.id, 
            property_id: this.property_id 
          });
        } else {
          clsContext.push(Enums.EVENTS.GENERATE_EVENT_EXPORT, {
            event_id: Enums.ACCOUNTING.EVENTS.ALLOWANCE, 
            payment_id: this.id, 
            property_id: this.property_id 
          });
        }
      }
    }

    async charge(connection, company_id, dryrun, contact, authorization, ip_override, paymentRef = {}){

      if(!this.Property || !this.Property.id)
            await this.getProperty(connection, false);

      let refund_effective_date = await this.Property.getEffectiveDate(connection);

      let payment_info = {}, error = null;

      try {
        payment_info = await this.PaymentMethod.charge(connection, this.amount, this.id, company_id, dryrun, contact, this.source, authorization, refund_effective_date, ip_override, paymentRef);
      } catch (err) {
        error = err;
        paymentRef.id = this.id;
      }

      await this.find(connection);
      await this.getRefunds(connection);

      if (error) e.th(400, error.msg || error.message, error.actual_cause);
      return payment_info;

    }

    async findAuction(connection, company_id){

      if(!this.id) throw "payment id not set";

      let lease_auction = await models.Lease_Auction.findByPaymentId(connection, this.id);

      if(lease_auction){
        let auction = new LeaseAuction({id : lease_auction.id});
        await auction.findById(connection, company_id);
        this.LeaseAuction = auction;
      }
  }

    async find(connection){

      if(!this.id) e.th(500, 'payment id not set');

      let data = await models.Payment.findPaymentById(connection, this.id);

      if(!data) e.th(404);

      this.payment_methods_id = data.payment_methods_id;
      this.lease_id = data.lease_id;
      this.amount = data.amount;
      this.property_id = data.property_id;
      this.contact_id = data.contact_id;
      this.device_id = data.device_id;
      this.transaction_id = data.transaction_id;
      this.auth_code = data.auth_code;
      this.applied = data.applied;
      this.date = data.date.split(' ')[0];
      this.ref_name = data.ref_name;
      this.notes = data.notes;
      this.number = data.number;
      this.type = data.type;
      this.method = data.method;
      this.sub_method = data.sub_method;
      this.qb_id = data.qb_id;
      this.status = data.status;
      this.status_desc = data.status_desc;
      this.payment_gateway = data.payment_gateway;
      this.accepted_by = data.accepted_by;
      this.amt_remaining = data.amt_remaining;
      this.created = data.created;
      this.credit_type = data.credit_type;
      this.amount_tendered = data.amount_tendered;
      this.verification_method = data.verification_method;
      this.aid = data.aid;
      this.effective_date = data.effective_date;
      this.payment_method_type_id = data.payment_method_type_id || null;
      this.source = data.source || null;
      this.is_migrated = data.is_migrated || 0;
      this.is_auction_payment = data.is_auction_payment || 0;
      this.is_auctioned_lease_payment = data.is_auctioned_lease_payment || 0;
      this.payment_source = data.payment_source;

      // TODO FIX
      if(this.payment_methods_id){
        await this.getProperty(connection);
        try {
          this.PaymentMethod = await this.Property.getPaymentMethod(connection, this.method, this.payment_methods_id);
        } catch(err){
          console.log("Err", err)
        }
      } else {
        switch(this.method){
          case 'cash':
            this.PaymentMethod = new Cash({type: 'Cash'});
            break;
          case 'check':
            this.PaymentMethod = new Check({type: 'Check'});
            break;
          case 'card':
            this.PaymentMethod = new Card({type: 'Card'});
            break;
          case 'ach':
            this.PaymentMethod = new Ach({type: 'ACH'});
            break;
          case Enums.PAYMENT_METHODS.GIFTCARD:
            this.PaymentMethod = new GiftCard({ type: 'GiftCard' });
            break;
        }
      }

    }



    async getPaymentApplications(connection,payload){

        if(!this.id) e.th(500, "Payment id not set");

        this.AppliedPayments = await models.Payment.findPaymentApplications(connection, this.id, payload);
        await this.getRefunds(connection);
        this.getTotalApplied();
        this.payment_remaining = this.amount - this.total_applied - this.Refunds.reduce((a, r) => a + r.amount, 0);
        this.payment_remaining = Math.round(this.payment_remaining * 1e2) / 1e2;

        return true;

    }

    async setReferenceName(connection){

      if(this.method){
        switch(this.method.toLowerCase()){

          case 'card':
          case 'ach':
            this.ref_name = this.PaymentMethod && this.PaymentMethod.name_on_card;
            break;

          case 'credit':
          case 'loss':
            await this.getContact(connection);
            this.ref_name = this.Contact.id && this.Contact.first +' '+ this.Contact.last;
            break;

        }
      }

    }

    async getPaymentMethod(connection){

      if(!this.Property.id){
        await this.getProperty(connection);
      }

      this.PaymentMethod = await this.Property.getPaymentMethod(connection, this.method, this.payment_methods_id);
      await this.PaymentMethod.getContact(connection);

    }

    async canReverse(connection,payload){
      const { by_pass } = payload;
      const reversal_type = 'reversal_type' in payload ? payload.reversal_type : "";
      const api = 'api' in payload ? payload.api : {};
      const defaultSetting = Enums.REVERSAL;

      if(!this.id) e.th(500, 'Missing Payment ID')
      let paymentReverseSetting = await models.Payment.getPaymentReversalSetting(connection, { payment_id: this.id });
      if(!this.Property.id){
        await this.getProperty(connection);
      }

      // exclude thresholds and reversal permissions for other than transcation history sections.
      if(by_pass) {
        this.can_reverse = true;
        this.has_reversal_permission = true;
        return this.can_reverse;
      }

      let currentDate = await this.Property.getLocalCurrentDate(connection);
      let paymentReversalDays = JSON.parse(paymentReverseSetting?.payment_reversal_days) || {};

      // check if we have payment of adjustment, auction etc
      // we dont need to do anything on these type of payments
      if(!(defaultSetting.hasOwnProperty(this.method))) return this.can_reverse ;
      
      // get this empty when we get payment details in order to refund
      // check for do we need to enable reversal button or not.
      // here we just check if settings exists or not against specific method.
      // first we check from database if not then consider default settings
      if(reversal_type == ''){
        let reversal_type_config = defaultSetting[this.method];

        if(Object.keys(reversal_type_config).length > 0){
          this.can_reverse = true;
        }
        return this.can_reverse ;
      }

      // Check permission to that specific reversal type
      try {
        const permission = defaultSetting[this.method][reversal_type]?.permission_label

        if(!permission) return this.has_reversal_permission = true;
        await utils.hasPermission({connection, company_id: this.Property?.company_id, contact_id: connection.meta?.contact_id, api: api, permissions: [permission]});
        this.has_reversal_permission = true;
      } catch(err){
        return this.has_reversal_permission = false;
      }

      // get number of days from default settings then check from their private settings from DB
      let days = Number(defaultSetting[this.method][reversal_type]?.threshold);
      if(Object.keys(paymentReversalDays).length > 0 && Object.keys(paymentReversalDays[this.method]).length > 0)
        days = Number(paymentReversalDays[this.method][reversal_type]);

      if(days){
        const reversalDate = moment(this.date).add(days, 'days').format("YYYY-MM-DD");
        let canReverse = moment(reversalDate).isAfter(currentDate);
        this.can_reverse = canReverse;
        return this.can_reverse;
      }
    }

    getRefunds(connection){
        if(!this.id) throw "Payment id not set";
        var _this = this;
        return models.Payment.findRefunds(connection, this.id).then(function(refunds){
            _this.Refunds = refunds;
            return true;
        })
    }

    getTotalApplied(){
      this.total_applied = 0;
      this.AppliedPayments.forEach(app =>{
          this.total_applied += app.amount;
      });

      return true;
    }


    // BUILD Property if property_id is set, otherwise get it from the lease and build, otherwise throw error
    async getProperty(connection, findDetails = true){

      if(this.property_id){
        this.Property = new Property({id: this.property_id});
        
        if(findDetails)
          await this.Property.find(connection);

        return
      }
      if(!this.lease_id)  e.th(500, "Property reference not found");

      let p = await models.Property.findByLeaseId(connection, this.lease_id);
      this.property_id = p.id;
      this.Property = new Property({id: this.property_id});
      
      if(findDetails)
        await this.Property.find(connection);

    }

  // BUILD Contact if contact_id is set, otherwise get first tenant from the lease and build, otherwise throw error
    async getContact(connection){

      if(!this.property_id) await this.getProperty(connection);

      if(this.contact_id) {
        this.Contact = new Contact({id: this.contact_id });
        await this.Contact.find(connection, this.Property.company_id);
        await this.Contact.getPhones(connection)
        return;
      }

      // if(!this.lease_id)  e.th(500, "Contact reference not found");
      //
      // let lease = new Lease({id: this.lease_id});
      // await lease.getTenants(connection);
      // this.contact_id = lease.Tenants[0].contact_id;
      // this.Contact = new Contact({id: this.contact_id });
      // await this.Contact.find(connection, this.Property.company_id);

    }

    async getAcceptedBy(connection, company_id){
      if(!this.accepted_by) return;
      let contact = new Contact({id: this.accepted_by});
      await contact.find(connection, company_id);

      this.AcceptedBy = contact;

    }

    values(){

        var _this = this;
        var data = {
            id: _this.id,
            payment_methods_id: _this.payment_methods_id,
            lease_id: _this.lease_id,
            amount: _this.amount,
            amount_tendered: _this.amount_tendered,
            verification_method: _this.verification_method,
            aid: _this.aid,
            device_id: _this.device_id,
            transaction_id: _this.transaction_id,
            applied: _this.applied,
            date: _this.date,
            number: _this.number,
            source: _this.source,
            ref_name: _this.ref_name,
            notes: _this.notes,
            method: _this.method,
            sub_method: _this.sub_method,
            qb_id: _this.qb_id,
            AppliedPayments: _this.AppliedPayments,
            total_applied: _this.total_applied,
            payment_method_type_id: _this.payment_method_type_id,
            PaymentMethod: _this.PaymentMethod
        };

        return data;
    }

    delete(connection){

        if(!this.id) e.th(500, 'payment id not set');
        return this.getPaymentApplications(connection)
            .then(() => {
                if(this.AppliedPayments.length) e.th(400, "You must un-apply all this payment from all invoices before deleting it.");
                return models.Payment.deletePayment(connection, this.id);
            })
    }

    async autoApplyToInvoices(connection, invoices){

      if(!this.Property.id){
        await this.getProperty(connection);
      }
      let propCurrDate = await this.Property.getLocalCurrentDate(connection);

      for(let i = 0; i < invoices.length; i++){
        let invoice = new Invoice({id: invoices[i].id});
        await invoice.find(connection);
        invoice.total();
        console.log("this.payment_remaining", this.payment_remaining);
        if(this.payment_remaining > 0){
          let invoicesPayment = {};
          if(this.payment_remaining >= invoice.balance){
            invoicesPayment = {
              invoice_id: invoice.id,
              date: propCurrDate,
              amount: Math.round(invoice.balance * 1e2) / 1e2
            };

            this.payment_remaining -= invoice.balance;
          } else if(this.payment_remaining < invoice.balance){
            invoicesPayment = {
              invoice_id: invoice.id,
              date: propCurrDate,
              amount: Math.round(this.payment_remaining * 1e2) / 1e2
            };
            this.payment_remaining = 0;

          }
          invoicesPayment.payment_id = this.id;
          this.invoicesPayment.push(invoicesPayment);
          await models.Payment.applyPayment(connection, invoicesPayment);


        }
      }
    }

    async applyToInvoices(connection, invoices, params = {}){

      let { applied_line, ignore_contact_id, admin_id } = params;
      this.amount_remaining = this.payment_remaining;

      let lease_list = [];

      if(!this.Property.id){
        await this.getProperty(connection);
      }
      let propCurrDate = await this.Property.getLocalCurrentDate(connection);

      for (let i = 0; i < invoices.length; i++){
    
          if(!invoices[i].amount ) continue;
          let invoice = new Invoice({ id: invoices[i].id});

          await invoice.find(connection);
          invoice.total();

          if(invoice.property_id != this.property_id) {
            e.th(500, 'Invoice property should be same as of payment');
          } 

          if(!ignore_contact_id && invoice.contact_id !== this.contact_id) {
            console.log('Invoice =>',invoice);
            console.log('Payment =>',this);
            e.th(400, "Invoice contact id is different than payment being applied.");
          }

          if(invoice.lease_id && lease_list.indexOf(invoice.lease_id) < 0){
            lease_list.push(invoice.lease_id);
          }

          let amtToApply = Math.round(invoices[i].amount * 1e2) / 1e2;
          if(amtToApply === 0) continue;

          if(amtToApply > this.amount_remaining){
              e.th(400,"You are trying to apply more than the payment amount to the invoices. Please adjust the payment as necessary.");
          }

          if(amtToApply > invoice.balance) {
              e.th(400,"Trying to apply $" + amtToApply.toFixed(2) + " but there is only $" +  invoice.balance.toFixed(2) + " due. Please adjust the amount you are trying to apply.");
          };

          let invoicesPayment = {
              invoice_id: invoice.id,
              payment_id: this.id,
              date: propCurrDate,
              amount: amtToApply
          };

          let unappliedPayment = await models.Payment.findPriorPaymentsOnInvoice(connection, invoice.id, this.id);
          let generate_accounting_exports = this.PaymentMethod && this.PaymentMethod.device_id ? false : true;

          if(unappliedPayment) {
            invoicesPayment.amount += unappliedPayment.amount 
          }

          await models.Payment.applyPayment(connection, invoicesPayment, unappliedPayment ? unappliedPayment.id : null, { generate_accounting_exports, applied_line });
        
          invoicesPayment = {
            ...invoicesPayment,
            lease_id: invoice?.lease_id,
            space_id: invoice?.Lease?.unit_id,
            tenant_id: invoice?.Lease?.Tenants?.length ? invoice?.Lease?.Tenants[0]?.id : null,
          }; // payment event payload
          this.invoicesPayment.push(invoicesPayment);

          invoices[i].amount -= amtToApply;
          invoices[i].balance = Math.round((invoice.balance - amtToApply) * 1e2) / 1e2;
          this.amount_remaining = Math.round( (this.amount_remaining - amtToApply) * 1e2 ) / 1e2;

      }

      await Lease.updateLeaseStandings(connection, lease_list);
      await this.save(connection);

      clsContext.push(Enums.EVENTS.END_DELINQUENCY, { 
				lease_ids: lease_list,
				contact_id: admin_id ? admin_id: this.contact_id 
			});
    }

    async getStatus(connection, company_id){
      
      if(this.PaymentMethod && this.PaymentMethod.id){
        let status = await this.PaymentMethod.getPaymentStatus(connection, this, company_id);      
        this.is_settled = !!status.is_settled;
      } else {
        this.is_settled = true;
      }

    }

    shouldRefundFromPaymentGateway(reversalType) {
      const { REVERSAL_TYPES } = Enums;
      if(reversalType === REVERSAL_TYPES.REFUND) {
        return true;
      }

      return false;
    }

    async refundFromPaymentGateway(connection, { company_id, amount, refund, reason, reversalType, validateShouldRefund }, device_identifier) {
      if(validateShouldRefund && !this.shouldRefundFromPaymentGateway(reversalType)) return;
      
      let refund_response = await this.PaymentMethod.refund(connection, this, company_id, amount, refund, reason, device_identifier);
      let data = {
        type: refund_response.type || 'refund',
        ref_num: refund_response.ref_num,
        auth_code: refund_response.auth_code,
        transaction_id: refund_response.transaction_id
      };
      
      await models.Payment.saveRefund(connection, data, refund.id);
      this.Refund = { ...this.Refund, ...data };
      return data;
    }

    shouldChargeReversalFee(reversalType) {
      const { REVERSAL_TYPES } = Enums;

      const chargeableReversals = [
        REVERSAL_TYPES.NSF,
        REVERSAL_TYPES.ACH,
        REVERSAL_TYPES.CHARGEBACK
      ];

     return chargeableReversals.includes(reversalType);
    }

    async updateRefund(connection, params) {
      if(!this.Refund.id) e.th(500, "Refund Id is required to update data");

      let updatedRefund = {};
      for (let p in params) {
        updatedRefund[p] = params[p];
      }

      await models.Payment.saveRefund(connection, updatedRefund, this.Refund.id);
    }

    async chargeReversalFee(connection, { company, reversalType, loggedInUser, validateShouldCharge = true, required_permissions }, invoice_payment_breakdown_ids) {
      if(validateShouldCharge && !this.shouldChargeReversalFee(reversalType)) return;

      const reversal = new Reversal({
        type: reversalType,
        company_id: company.id,
        property_id: this.property_id
      });

      await reversal.findSetting(connection);

      const property = new Property({ id: this.property_id, company_id: company.id });
      await property.getProducts(connection, reversal.product_id);
      const product = property?.Products[0];

      if(!product) {
        e.th(500, `Reversal Fee set is not accessible in the property`);
      }

      const reversalFee = reversal?.product_id;
      if(reversalFee) {
        let leases = await this.getLeases(connection, invoice_payment_breakdown_ids);

        const propertyTime = await property.getLocalCurrentDate(connection);
        product.start_date = propertyTime;
        product.end_date = propertyTime;

        await this.generateReversalInvoices(connection, {leases, product, company, logged_in_user: loggedInUser, required_permissions})
    }
  }

    async generateReversalInvoices(connection, {leases, product, company, logged_in_user, required_permissions = []}) {
      let reversal_fee_invoices = [];
        for(let i = 0; i < leases?.length; i++) {
          let lease = new Lease({id: leases[i]?.lease_id})
          await lease.find(connection);

          const { invoice } = await lease.makeInvoicefromService({ 
            connection, 
            product, 
            property_id: this.property_id,
            dryrun: false, 
            skip_payment: true, 
            company: company, 
            logged_in_user, 
            save_service_only: false,
            same_end_date_as_start: true,
            required_permissions
          });

          let reversal_fee = [this.Refund?.id, invoice?.id, logged_in_user?.id];
          reversal_fee_invoices.push(reversal_fee);
        }

        await models.Reversal.bulkSaveReversalFeeInvoice(connection, reversal_fee_invoices);
    }
    
    async processChargebackOrReversal(connection, data, property_id, authCode, reversal_type, res) {
      let api = {};
      let paymentDetails = null;

      if (reversal_type == 'chargeback') {
        paymentDetails = await payments.findPaymentByPropertyIdAndAuthCode(connection, property_id, authCode);
        console.log(property_id, " chargeback : paymentDetails : ", paymentDetails);
      }else {
        paymentDetails = await models.Payment.findPaymentByPropertyIdAndTransactionId(
        connection, property_id, data.TransactionNumber);
        console.log(property_id, " achReject : paymentDetails : ", paymentDetails);
      }

      if (!paymentDetails) {
        return null;
      }

      let payment = new Payment({id :paymentDetails.id});
      await payment.find(connection);
      await payment.getRefunds(connection);
			await payment.getPaymentApplications(connection);
      await payment.getProperty(connection, false);
      console.log(payment);

      let effective_date = await payment.Property.getEffectiveDate(connection);

      let duplicateData = {
        payment_id: paymentDetails.id,
        amount: data.amountDollars,
        type: reversal_type,
        reason: data.ReasonCode
      };
      if(await this.checkDuplicateRefundEntry(connection, duplicateData)){
        console.log("Duplicate entry, skipping recording entry : ",JSON.stringify(data));
        return {isDuplicate: true};
      }
      
      if (payment.Refunds.length != 0) {
        console.log("A refund already exists : ",JSON.stringify(data));
        return {alreadyExists: true};
      }
      if (data.amountDollars != payment.amount) {
        console.log("Original txn amount is not same as refund : ", data.amountDollars, payment.amount);
        return {amountMismatch: true};
      }
      if (reversal_type == 'ach'){
        let amount=data.TransactionAmount.replace('$', '').replace(',', '');
        if(amount != payment.amount){
          console.log("Original txn amount is not same as refund : ", amount, payment.amount);
          return {amountMismatch: true};
      }
    }

      let invoices = [];
      for(var i=0; i<payment.AppliedPayments.length; i++) {
        invoices.push({
          invoices_payment_id: payment.AppliedPayments[i].id,
          amount: payment.AppliedPayments[i].amount
        });
      }

      let body = {amount:data.amountDollars, is_prepay:false, 
                  invoices: invoices, reversal_type:reversal_type, 
                  reason:data.ReasonCode, transaction_id:data.TransactionNumber};
      await payment.canReverse(connection,{by_pass:true});
      await payment.processRefund(connection, body, res.locals.active, res.locals.contact, api, res);

      return {
        payment_id: paymentDetails.id,
        amount: data.amountDollars,
        reason: data.ReasonCode,
        date: effective_date,
        property_id: property_id,
        contact_id: paymentDetails.contact_id,
        payment: payment
      }
    }  

    // Note: Use this function in refund process too and replace current logic
    async reApplyLatestInvoicesPaymentsToPastInvoices(connection, payload) {
      const { invoices, api_info  } = payload;
      const  { api } = api_info.locals;

      let leases = {};
      const invoiceIds = Object.keys(invoices);

      if (invoiceIds.length) {
        for(let i = 0; i < invoiceIds.length; i++) {
          let inv = await models.Billing.findInvoiceById(connection, invoiceIds[i]);
          const leaseUnAppliedAmount = (leases[inv.lease_id]?.unapplied_amount || 0) + invoices[invoiceIds[i]].unapplied_amount;

          if(!leases[inv.lease_id]) {
            leases[inv.lease_id] = { date: inv.due, invoice_id: invoiceIds[i] };
          }

          if(moment(inv.due).isBefore(leases[inv.lease_id].date)) {
            leases[inv.lease_id] = { date: moment(inv.due).format('YYYY-MM-DD'), invoice_id: invoiceIds[i] };
          }

          leases[inv.lease_id].unapplied_amount = leaseUnAppliedAmount;
        }

        console.log('Unapplying leases invoices ', leases);

        const leaseKeys = Object.keys(leases);
        await Promise.all(leaseKeys.map(async lease_id => {
          let invObj = new Invoice({ lease_id });
          await invObj.setRefundedInvoices(connection, api_info, leases[lease_id].date, lease_id, leases[lease_id].invoice_id, leases[lease_id].unapplied_amount, ['card_void_permission'], api);
        }));
      }
    }

    async processRefund(connection, body, company, user, api, res) {
      try{
        let invoiceIds = [];
        let leases = {};
        let rr_invoice_id = null;

        console.log("processRefund : ", body, company, user, api, res);
        
        await connection.beginTransactionAsync();
        await this.find(connection);
        await this.verifyAccess(connection, company.id, res.locals.properties);
        
        // if payment.device_id, get device info. 
  
        let invoice_payment_breakdown_id = [];
        if (body.invoices){
          for(let i = 0; i < body.invoices.length; i++){
            let invoice = body.invoices[i];
            let payment_application = await Payment.getPaymentApplicationById(connection, invoice.invoices_payment_id);
            
            if(body.is_auction_retained_revenue_refund) rr_invoice_id = payment_application.invoice_id
            else  invoiceIds.push(payment_application.invoice_id);
  
            if(!payment_application) e.th(404);
            let amount_to_unapply = invoice.amount || null
            let new_amount = 0
            if(amount_to_unapply && amount_to_unapply > 0) {
              new_amount = payment_application.amount - amount_to_unapply
            }
            let breakdown_id = await this.unapply(connection, payment_application.id, new_amount);
            invoice_payment_breakdown_id.push(breakdown_id);
          }
        }
  
        let { reversal_type } = body;
        reversal_type = reversal_type || Enums.REVERSAL_TYPES.REFUND;

        if(!body.is_prepay){
          if(body.refund_to && body.refund_to === 'state'){
            // find state contact
            let state_contact = await models.Contact.findStateContact(connection);
            body.refund_contact_id = state_contact && state_contact.length > 0 ? state_contact[0].id : null;
          }
  
          await this.refund(connection, company, body.amount, body.ref_num,  body.reason, body.is_void, 
                  invoice_payment_breakdown_id, reversal_type, user,[], body.refund_contact_id, body.transaction_id);
  
          // adjust invoices
          if (invoiceIds.length) {
            for(let i = 0; i < invoiceIds.length; i++) {
              let inv = await models.Billing.findInvoiceById(connection, invoiceIds[i]);
  
              if (!leases[inv.lease_id]) {
                leases[inv.lease_id] = { date: inv.due , invoice_id: invoiceIds[i] };
              }
              if ( moment(inv.due).isBefore(leases[inv.lease_id].date) ){
                  leases[inv.lease_id] = { date: moment(inv.due).format('YYYY-MM-DD'), invoice_id: invoiceIds[i]} ;
              }
            }

            const leaseKeys = Object.keys(leases);
            for(const lease_id in leases) {
              let invObj = new Invoice({ lease_id });
              await invObj.setRefundedInvoices(connection, res, leases[lease_id].date, lease_id, leases[lease_id].invoice_id, body.amount, [], api);
            }

          }
          
          if(body.is_auction_retained_revenue_refund && rr_invoice_id){
            let rrInvoice = new Invoice({ id: rr_invoice_id });
            await rrInvoice.find(connection);
            var data = {
              amount: (rrInvoice.sub_total + rrInvoice.total_tax - rrInvoice.total_discounts),
              property_id: rrInvoice.property_id,
              contact_id: rrInvoice.contact_id,
              lease_id: rrInvoice.lease_id,
              sub_method: Enums.ADJUSTMENT_SUB_METHOD.RETAINED_REVENUE,
              notes: "Retained Revenue credit adjustment",
            }
            rrInvoice.amount = data.amount;
            let creditPayment = new Payment();
            await creditPayment.createAdjustment(connection, data, user.id);
            await creditPayment.getPaymentApplications(connection);
            await creditPayment.applyToInvoices(connection, [rrInvoice]);
          }
        }
  
        await connection.commitAsync();
       } catch(err) {
        await connection.rollbackAsync();
        throw err;
      }

    }
    
    async checkDuplicateRefundEntry(connection, duplicateData) {
      let response = await models.Payment.getRefundByDetails(connection, duplicateData);
      return response.length > 0;
    }

    async refund(connection, company, amount, ref_num, reason, is_void, invoice_payment_breakdown_id, reversal_type = 'refund', logged_in_user, required_permissions = [], refund_to = null, transaction_id = null) {
        if(!this.id) e.th(500, 'payment id not set');
        await this.getPaymentApplications(connection);


        if (!this.has_reversal_permission) {
          e.th(403, "You do not have permission to perform this action. Please contact your administrator.");
        }

        if (!this.can_reverse) {
          e.th(400, "Reversal Threshold has passed. Please contact your administrator to extend the threshold.");
        }
        if(this.method == 'credit' && reversal_type == 'refund') e.th(400, 'Can not refund payment with credit type');
        if(reversal_type == 'void' && this.payment_remaining != amount) e.th(400, 'You need to void the entire amount');
        if(this.payment_remaining < amount) e.th(400, 'You are trying to refund more than the remaining payment amount');
        

        if(!this.Property || !this.Property.id)
            await this.getProperty(connection, false);

        const date = await this.Property.getLocalCurrentDate(connection, 'YYYY-MM-DD hh:mm:ss');
        let refund_effective_date = await this.Property.getEffectiveDate(connection);

        let refund = {
            amount: amount,
            payment_id: this.id,
            ref_num: ref_num,
            reason: reason,
            date,
            effective_date: refund_effective_date,
            type: reversal_type,
            created_by: logged_in_user ? logged_in_user.id : null,
            refund_to,
            transaction_id: transaction_id
        }

        let response = await models.Payment.saveRefund(connection, refund, null, invoice_payment_breakdown_id)
        refund.id = response.insertId;
        this.Refund = { ...refund };

        if(this.shouldRefundFromPaymentGateway(reversal_type)) {
          let device = {};
          if(this.device_id){
            device = await models.Property.findConnectionDeviceById(connection, this.device_id);
          }


          await this.refundFromPaymentGateway(connection, { 
            company_id: company.id, 
            amount, 
            refund, 
            reason,
            reversalType: reversal_type, 
            validateShouldRefund: false
          }, device.identifier);
        }
        
        if(this.shouldChargeReversalFee(reversal_type)) {
          const reversalFeeData = {
            company: company,
            reversalType: reversal_type,
            loggedInUser:logged_in_user,
            validateShouldCharge: false,
            required_permissions: required_permissions.length? required_permissions : []
          };

          await this.chargeReversalFee(connection, reversalFeeData, invoice_payment_breakdown_id);
        }

        clsContext.push(Enums.EVENTS.REFUND_PROCESSED, { Payment: this, refund_: refund });
        clsContext.push(Enums.EVENTS.GENERATE_EVENT_EXPORT, { event_id: Enums.ACCOUNTING.EVENTS.REFUNDS, refund_id: refund.id, property_id: this.property_id });
    }

    async void(connection, company_id, payload = {}) {
      const { api_info } = payload;
      if(!this.id) e.th(500, 'payment id not set');
      let device = {};
      
      if(this.device_id){
        device = await models.Property.findConnectionDeviceById(connection, this.device_id);
      }
      
      let void_response = await this.PaymentMethod.void(connection, this, company_id, null, null, device && device.identifier);

      let data = {
        status: -1,
        status_desc: 'Payment Voided Successfully',
        auth_code: void_response.auth_code,
        transaction_id: void_response.transaction_id
      };

      const res = await models.Payment.save(connection, data, this.id);
      let invoices = {};
      this.AppliedPayments.map(p => { 
        invoices[p.invoice_id] = { unapplied_amount: p.amount }
      });
      await this.reApplyLatestInvoicesPaymentsToPastInvoices(connection, {
        invoices,
        api_info
      });

      return res;
    }

    async hasPermissionToVoid(connection, api){

      let properties = this.AppliedPayments?.map(ap => ap.Invoice?.property_id)?.filter((v, i ,self) => i == self.indexOf(v));

      if(!properties || properties?.length === 0) return;

      try {
        await Property.verifyAccessInBulk(connection, {contact_id: connection.meta?.contact_id, properties, api, permission: 'card_void_permission' })
      } catch(error){
        e.th(403, "You do not have Void Card Payment Permission to perform this action. Please contact your administrator.");
      }

      return;
    }
    async lanSwipeResponseCapture(connection, reqData, res, payment) {

      if (!this.id) e.th(500, 'payment id not set');
      console.log("Payment Object ::", this);

      this.PaymentMethod = await this.Property.getPaymentMethod(connection, this.method, this.payment_methods_id);
      console.log("PaymentMethod ::", this.PaymentMethod);
      await this.setPaymentMethodTypeId(connection, this.PaymentMethod)
      console.log("reqData ::: ", reqData);
      let swipe_response = await this.PaymentMethod.lanSwipeResponseCapture(connection, reqData, this.id);

      console.log("swipe_response ::: ", swipe_response);
      let data = {
        status: 1,
        status_desc: 'APPROVAL',
        auth_code: swipe_response.auth_code,
        transaction_id: swipe_response.transaction_id,
        token: swipe_response.token,
        amount: swipe_response.authorized_amount
      };

      return data;
    }

    async getRefund(connection, refund_id){
      this.Refund = await models.Payment.getRefundById(connection, this.id, refund_id);
      if(!this.Refund) e.th(404);
    }

    async getRefundById(connection, refund_id){
      this.Refund = await models.Payment.getRefund(connection, refund_id);
    }
    /* TODO: Verify if this is in use */
    async returnReversal(connection, reason, amount, company_id) {
      if (!this.Refund) e.th(500, "Refund not set");
      if (!this.Refund.transaction_id) e.th(400, "This transaction is not eligible for a refund");

      if (amount > this.Refund.amount) e.th(400, "You are trying to reverse more than the refund amount");

      let refund_response = await this.PaymentMethod.returnReversal(connection, this, this.Refund, company_id, amount);

    }

    async getLease(connection){
      this.Lease = new Lease({id: this.lease_id});
      await this.Lease.find(connection);

    }

    async getLeases(connection, invoice_payment_breakdown_ids = []) {
      if(!invoice_payment_breakdown_ids.length) return 
      return models.Payment.getLeaseIdFromPaymentsBreakdown(connection, invoice_payment_breakdown_ids);
    }

    async unapply(connection, payment_application_id, new_amount, params = {}){
        return await models.Payment.unapplyPayment(connection, payment_application_id, new_amount, params);

        // await this.getPaymentApplications(connection);
        // await models.Payment.save(connection, {
        //   amt_remaining: this.payment_remaining
        // }, this.id);

    }

    static async getPaymentApplicationById(connection, payment_application_id){

        return await models.Payment.findPaymentApplicationById(connection, payment_application_id);


    }

    async verifyAccess(connection, company_id, properties = []){
        if (!this.id)  e.th(500, 'Payment id not defined');
        let property = await models.Payment.findPropertyFromPaymentId(connection, this.id);
        console.log(property);
        if(property.company_id !== company_id) e.th(403, 'You are not authorized to view this resource.');
        if(properties.length && properties.indexOf(property.id) < 0) e.th(403, 'You are not authorized to view this resource.');

    }

    async getAccountBalanceAfterPayment(connection){
      let balance = await models.Payment.findAccountBalanceWhenPaymentLastApplied(connection, this.id);
      this.account_balance = balance;
    }
    
    // Code has been moved from /bulk payment endpoint (can be refactored)
    async processInBulk(connection, body, res, accept_late_payments, ip_override, paymentRef = {}, permissions = []) {
      let company = res.locals.active;
      var logged_in_user = res.locals.contact || {};
      let property = new Property({ id: body.property_id }); 
      let api = res.locals.api || {};


      await property.find(connection);
      await property.verifyAccess({connection, company_id: company.id, properties: res.locals.properties, contact_id: logged_in_user.id, permissions: permissions.filter(p => p !== 'accept_late_payments'), api});
      if(permissions.includes('accept_late_payments')){
        try{
          await property.verifyAccess({connection, company_id: company.id, properties: res.locals.properties, contact_id: logged_in_user.id, permissions: ['accept_late_payments'], api});
        }catch(err){
          //user accepting payment doesn't have permission on property
          if(!res.locals.isAdminAccess) e.th(403, err.msg + ' on payment property.')
        }
      }
      
      this.property_id = property.id;
      const currentPropertyDate = await property.getLocalCurrentDate(connection);
      res.fns.addStep('getPropertyInfo');
      let payment = {};
      let lease = {};
      
      let leases = [];
      let invoice_leases = [];
      let events = [];
      let invoices = [];
      let contact = new Contact({ id: body.contact_id });
      await contact.find(connection);
      await contact.verifyAccess(company.id);
      res.fns.addStep('getContactInfo');
      let paymentMethod = {};
      body.leases = body.leases || [];
      let leasesPaymentsValidTill = [];
      let invoice_end = '';
      // save payment
      // apply to invoices for each lease
      // change payment
      const { use_credits } = body;

      for (let i = 0; i < body.leases.length; i++) {
        let payment_cycle_shift_data = {}, current_payment_cycle = null, previous_payment_cycle = null, open_payment_to_apply = 0;
        lease = new Lease({ id: body.leases[i].id });
        await lease.find(connection);
    
        await lease.canAccess(connection, company.id, res.locals.properties);
        await lease.getProperty(connection, company.id, res.locals.properties, logged_in_user.id, permissions.filter(p => p !== 'accept_late_payments'), api);
        if(permissions.includes('accept_late_payments')){
          try{
            await lease.Property.verifyAccess({connection, company_id: company.id, properties: res.locals.properties, contact_id: logged_in_user.id, permissions: ['accept_late_payments'], api});
          }catch(err){
            //permission not present for the property of lease
            if(!res.locals.isAdminAccess) e.th(403, err.msg + ' on one of the applied property.')
          }
        }
        
        leases.push(lease);
        
        res.fns.addStep('getLeaseInfo');
        
        if (!res.locals.isAdminAccess && (!accept_late_payments || lease.deny_payments)){
          e.th(409, "Payment cannot be accepted at this time. ");
        }
        
        let billed_months = body.leases[i].billed_months || 0;
        let current_date = await lease.Property.getLocalCurrentDate(connection);
        let latestInvoice = await models.Invoice.findLatestRentInvoice(connection, {lease_id: lease.id}); // Should be last billed.
        let lastBillingDate = latestInvoice?.period_end
        let nextBillingDate = await lease.getNextBillingDate(moment(current_date), false); // Should be next billing
        current_payment_cycle = body.leases[i].payment_cycle;
        previous_payment_cycle = lease.payment_cycle;
        res.fns.addStep('getNextBillingDate');
        
        // subtract a day to get even with lastBillingDate
        nextBillingDate.subtract(1, 'day');
        //let lastBillingDateMoment = moment(lastBillingDate, 'YYYY-MM-DD HH:mm:ss').startOf('day');
        //let lastBilled = lastBillingDate && (nextBillingDate.format('x') < lastBillingDateMoment.format('x')) ? moment(lastBillingDate, 'YYYY-MM-DD HH:mm:ss').startOf('day') : nextBillingDate;
        
        let lastBilled;
        if(lastBillingDate)
          lastBilled = moment(lastBillingDate, 'YYYY-MM-DD HH:mm:ss').startOf('day');
        else
          lastBilled = moment(nextBillingDate, 'YYYY-MM-DD HH:mm:ss').startOf('day');


        if (previous_payment_cycle != current_payment_cycle) {
          payment_cycle_shift_data = await lease.processPaymentCycleShifting(connection, current_date, res, { payment_cycle: body.leases[i].payment_cycle, voided_by: res.locals.contact, previous_payment_cycle: lease.payment_cycle });
          lastBilled = payment_cycle_shift_data.last_billed || lastBilled;
          open_payment_to_apply = payment_cycle_shift_data?.open_payments.reduce((total, op) => total + op.amount, 0);

          res.fns.addStep('GetPaymentCycleShiftData');
        }
      
        if(body.leases[i].payment_cycle && billed_months > -1){
          lease.payment_cycle = body.leases[i].payment_cycle;
          
          await lease.getPaymentCycleOptions(connection);	
          let invoicePeriod = await lease.getCurrentInvoicePeriod(connection, lastBilled.clone(), 1);
          // await lease.getDiscounts(connection, invoicePeriod.start.format('YYYY-MM-DD'));
          // if(lease.Discounts.length){
          //   e.th(409, "Payment cycle discounts cannot be combined with any other offer")
          // }

          // let discount = await lease.addPromotion(connection, option.promotion_id, company.id, false, invoicePeriod.start);
          await lease.savePaymentCycle(connection, invoicePeriod.start.clone(), billed_months, company.id); 
          // await lease.save(connection);
          
          
          // TODO check for other active promotions;
         
        }
        
        let applied_balance = 0;
        for (let i = 0; i < billed_months; i++) {
          let firstAdvanceInvoice = i == 0;
          let invoicePeriod = await lease.getCurrentInvoicePeriod(connection, lastBilled.clone(), 1);
          lastBilled = invoicePeriod.end.clone();
          
          invoice_end = invoicePeriod.end.format('YYYY-MM-DD');
    
          let services = await lease.getCurrentServices(connection, company.id, invoicePeriod.start.clone(), invoicePeriod.end.clone())
            .filter(s => (s.service_type === 'lease' || s.service_type === 'insurance') && ((s.recurring === 1) || (!s.last_billed && !s.recurring && firstAdvanceInvoice)));
          
          let datetime = await lease.getCurrentLocalPropertyDate(connection,'YYYY-MM-DD')
          let invoice = new Invoice({
            lease_id: lease.id,
            user_id: null,
            date: moment(datetime).format('YYYY-MM-DD'),
            due: invoicePeriod.start.format('YYYY-MM-DD'),
            company_id: company.id,
            type: "manual",
            status: 1,
            created_by: logged_in_user.id,
            apikey_id: api.id
          });
    
    
          invoice.Lease = lease;
          invoice.Company = company;
          res.fns.addStep('invoicemakefromservice');
          await invoice.makeFromServices(
            connection,
            services,
            lease,
            invoicePeriod.start,
            invoicePeriod.end,
            null,
            company.id
          );
    
          await invoice.total();
          await invoice.calculatePayments();
          await invoice.getOpenPayments(connection);
          await invoice.save(connection);

          // adjusting the balance of newly created invoices as per the "open_payment_to_apply"
          if (previous_payment_cycle != current_payment_cycle && applied_balance < open_payment_to_apply && open_payment_to_apply > 0){
            let remaining_balance = open_payment_to_apply - applied_balance;
            if(invoice.balance <= remaining_balance){
              applied_balance += invoice.balance;
              invoice.balance = 0
            } else {
              invoice.balance -= remaining_balance;
              applied_balance += remaining_balance;
            }
          }
          
          invoices.push(invoice);
          res.fns.addStep('PushInvoices');
          
          // sb: check why
          let foundIndex = body.Invoices.findIndex(inv => {
            return inv.period_start === invoice.period_start &&
              inv.period_end === invoice.period_end &&
              inv.balance === invoice.balance &&
              inv.lease_id === invoice.lease_id;
          });

          if(foundIndex == -1) {
            console.log("Err Inv Details (period_start)", invoice.period_start);
            console.log("Err Inv Details (period_end)", invoice.period_end);
            console.log("Err Inv Details (lease_id)", invoice.lease_id);
            console.log("Err Inv Details (balance)", invoice.balance);
            e.th(500, 'Failed to create invoice(s), an invoice with this period might already exist'); 
          }

          body.Invoices[foundIndex].id = invoice.id;
          body.Invoices[foundIndex].property_id = invoice.property_id;
    
          leasesPaymentsValidTill[i] = invoice_end;
        }
        if (payment_cycle_shift_data?.open_payments?.length > 0) {
          // applying unallocated balance on lease
          //await Lease.applyUnallocatedBalanceOnlease(connection, company.id, body.leases[i].id, payment_cycle_shift_data.open_payments, logged_in_user.id, [], {}, { generate_invoices: false, invoices_to_pay: body.Invoices });
          await Invoice.applyOpenPaymentsToInvoices(connection, body.Invoices, payment_cycle_shift_data.open_payments);
          res.fns.addStep('OpenBalanceAppliedToInvoices');
        }
      }

      res.fns.addStep('getPaymentInvoicesInfo');

      if(!body.Invoices?.length) {
        e.th(500, 'Invoice(s) should be attached to payment');
      }

      if (!leasesPaymentsValidTill.length && body.Invoices && body.Invoices.length > 0) {
        for (let i = 0; i < body.Invoices.length; i++) {
          let invoice_ = new Invoice({ id: body.Invoices[i].id });
          await invoice_.find(connection);
          body.Invoices[i].property_id = body.Invoices[i].property_id || invoice_.property_id;
          let _lease = invoice_.Lease;
          await _lease.find(connection);
          await _lease.canAccess(connection, company.id, res.locals.properties);
          await _lease.getProperty(connection, company.id, null, logged_in_user.id, permissions, api);
          let current_date = await _lease.Property.getLocalCurrentDate(connection);
          let nextBillingDate = await _lease.getNextBillingDate(moment(current_date), false); // Should be next billing
    
    
          // subtract a day to get even with lastBillingDate
          nextBillingDate.subtract(1, 'day');
          leasesPaymentsValidTill[i] = nextBillingDate.format('YYYY-MM-DD');
        }
        res.fns.addStep('getPaymentInvoicesInfoIfNewRental');
      }

      const newPaymentMade = !(!body.payment.type && !body.paymentMethod && use_credits);

      // In case of credits/Reserved balance if specific payment is made
      // Might not get called from hummingbird side after updated design changes
      // remove it as payment_id would not be coming from FE ?? 
      /*if (body.payment.id) {
        // Apply existing payment to invoices
        payment = new Payment({ id: body.payment.id });
        await payment.find(connection);
        await payment.verifyAccess(connection, company.id, res.locals.properties);
        await payment.getPaymentApplications(connection);
        await payment.applyToInvoices(connection, sourcePropertyInvoices);

        res.fns.addStep('getPaymentInfo');
    
      } else */
      
      if (newPaymentMade) {
    
        // Extra check for save_to_account if leases is enrolled in auto payment
        if (body.auto_pay_leases && body.auto_pay_leases.length > 0) {
          body.paymentMethod.save_to_account = true;
        }
        res.fns.addStep('getPaymentInfoIfNew');
        
        
        paymentMethod = await contact.getPaymentMethod(connection, property, body.payment.payment_method_id, body.payment.type, body.payment.source, body.paymentMethod);
 
        payment = new Payment();
        await payment.create(connection, body.payment, paymentMethod, null, logged_in_user ? logged_in_user.id : null);
        events.push('payment_created', { lease, contact, company, payment, paymentMethod, 'user': contact });
    
        await payment.getPaymentApplications(connection);

        const { sourcePropertyInvoices, interPropertyInvoices } = await categorizeInvoices();
        if (payment.status && payment.payment_remaining && sourcePropertyInvoices) {
          await payment.applyToInvoices(connection, sourcePropertyInvoices);

          for (let i = 0; i < sourcePropertyInvoices.length; i++) {
            var invoice = new Invoice({ id: sourcePropertyInvoices[i].id });
            await invoice.find(connection);
            if (paymentMethod.auto_charge) {
              await invoice.Lease.setAsAutoPay(connection, paymentMethod);
            }
            invoice_leases.push(invoice);
          }

          res.fns.addStep('NewPaymentInfoCreated');
        }
         res.fns.addStep('chargePaymentMethod');

        if(interPropertyInvoices) {
          await applyInterPropertyPayments({ interPropertyInvoices });
        }

        paymentRef.payment_methods_id = (payment && payment?.payment_methods_id != null) ? payment.payment_methods_id : null;
        await payment.charge(connection, company.id, false, logged_in_user, null, ip_override, paymentRef);
      }
      
      // Sol for now - Payment has been charged so display success message
      try {
      if (body.auto_pay_leases && paymentMethod.id) {
        for (let i = 0; i < body.auto_pay_leases.length; i++) {
          let lease = new Lease({ id: body.auto_pay_leases[i].lease_id });
          await lease.find(connection);
          await lease.setAsAutoPay(connection, paymentMethod);
        }
        res.fns.addStep('setAutoPay');
      }
    } catch(err) {
      console.log('Bulk payment error ', err);
    }

      // commenting out as now HB is responsible for all emails
      // if (api && !api.id) {
        try {
          var pay_bill = GDS.payBillAndEmail(connection, invoice_leases, property.id, company.id, payment, contact, leasesPaymentsValidTill);
          res.fns.addStep('paymentInfoEmailSent');
        } catch (err) {
          console.log("paybill error" , err);
        }
      // }
        
      if (payment && payment.status_desc && ['partial approval', 'partially approved'].indexOf(payment.status_desc.toLowerCase()) >= 0 ) {
        e.th(400, "This payment was only authorized for $" + payment.amount.toFixed(2) + ' and has been voided');
      }
          
      let invoiceLeases = invoice_leases.map(x => x.Lease);

      return { 
        paymentData: payment,
        events: events,
        eventsData: { leases, contact, company, payment, paymentMethod, invoices, invoiceLeases, 'user': logged_in_user, property_id: property.id, cid: res.locals.company_id, locals: res.locals }
      };

      async function categorizeInvoices() {
        const interPropertyInvoices = [];
        const sourcePropertyInvoices = [];
        let anyInterPropertyInvoice = false;
        const adjustmentInvoice = new Invoice({
          date: moment(currentPropertyDate).format('YYYY-MM-DD'),
          due: moment(currentPropertyDate).format('YYYY-MM-DD'),
          period_start: moment(currentPropertyDate).format('YYYY-MM-DD'),
          period_end: moment(currentPropertyDate).format('YYYY-MM-DD'),
          company_id: company.id,
          type: 'manual',
          status: 1,
          created_by: logged_in_user.id,
          apikey_id: api.id,
          property_id: property.id,
          contact_id: contact.id,
          InvoiceLines: []
        });

        adjustmentInvoice.amount = 0;

        const settings = await models.Setting.findSettings(connection, 'billing', company.id);
        let allowInterPropertyPayments = settings.filter(setting => setting.name === "allowInterPropertyPayments");
        console.log("categorizeInvoices allowInterPropertyPayments : ", allowInterPropertyPayments);

        for (let i = 0; i < body.Invoices.length; i++) {
          const invoice = new Invoice({ id: body.Invoices[i].id });
          if(!body.Invoices[i].property_id) {
            await invoice.find(connection);
            body.Invoices[i].property_id = invoice.property_id;
          }

          const invoicePropertyId = body.Invoices[i].property_id || invoice.property_id;
          const isInterPropertyInv = invoicePropertyId != payment.property_id;

          if(isInterPropertyInv && (allowInterPropertyPayments[0]?.value === "0" && !invoicePropertyId && !(payment.property_id))){
            e.th(400, 'Inter property payment is not allowed.');
          }
  
          if(!anyInterPropertyInvoice && isInterPropertyInv && allowInterPropertyPayments[0]?.value === "1"){
            anyInterPropertyInvoice = true;
            let payment_property = new Property({id: payment.property_id})
            await payment_property.find(connection)
            await payment_property.verifyAccess({connection, company_id: company.id, properties: res.locals.properties, contact_id: logged_in_user.id, permissions: ['accept_inter_prop_payment']});
          }

          if (isInterPropertyInv && allowInterPropertyPayments[0]?.value === "1") {
            adjustmentInvoice.amount += body.Invoices[i].amount;
            interPropertyInvoices.push(body.Invoices[i]);
          } else {
            sourcePropertyInvoices.push(body.Invoices[i]);
          }
        }

        if (adjustmentInvoice.amount > 0) {
          const product = new Product({ company_id: company.id });
          const interPropertyProduct = await product.findDefault(connection, { default_type: Enums.PRODUCT_DEFAULT_TYPES.INTER_PROPERTY_ADJUSTMENT });
  
          adjustmentInvoice.InvoiceLines.push(new InvoiceLine ({
            product_id: interPropertyProduct?.id,
            qty: 1,
            cost: adjustmentInvoice.amount,
            date: currentPropertyDate,
            start_date: currentPropertyDate,
            end_date: currentPropertyDate
          }));
          
          await adjustmentInvoice.save(connection);
          sourcePropertyInvoices.push(adjustmentInvoice);
        }

        return { sourcePropertyInvoices, interPropertyInvoices };
      }

      async function applyInterPropertyPayments(payload) {
        const { interPropertyInvoices } = payload;

        const propertyGroupedInvoices = {};
        for(let i = 0; i < interPropertyInvoices.length; i++) {
          if(!propertyGroupedInvoices[interPropertyInvoices[i].property_id]) {
            propertyGroupedInvoices[interPropertyInvoices[i].property_id] = {
              amount: 0,
              invoices: []
            }
          }

          propertyGroupedInvoices[interPropertyInvoices[i].property_id].amount += interPropertyInvoices[i].amount;
          propertyGroupedInvoices[interPropertyInvoices[i].property_id].invoices.push(interPropertyInvoices[i]);
        }

        for(let propertyId in propertyGroupedInvoices) {
          const data = {
            amount: propertyGroupedInvoices[propertyId].amount,
            date: moment(currentPropertyDate).format('YYYY-MM-DD'),
            property_id: propertyId,
            contact_id: contact.id,
            sub_method: Enums.ADJUSTMENT_SUB_METHOD.INTER_PROPERTY_PAYMENT,
            notes: 'Inter property payment',
            source_payment_id: payment.id
          };

          let creditPayment = new Payment();
          creditPayment.payment_remaining = propertyGroupedInvoices[propertyId].amount;
          await creditPayment.createAdjustment(connection, data, logged_in_user.id);
          await creditPayment.applyToInvoices(connection, propertyGroupedInvoices[propertyId].invoices);
        }
      }
    }

    async setPaymentMethodTypeId(connection,paymentMethod){
      let pm_type = paymentMethod.type.toLowerCase();
      if(pm_type === 'cash' || pm_type === 'check' || pm_type === 'credit' || pm_type === 'adjustment' || pm_type === Enums.PAYMENT_METHODS.GIFTCARD) {
        this.payment_method_type_id = await models.Payment.getPaymentMethodTypeId(connection,pm_type);
      }
      else{
        this.payment_method_type_id = paymentMethod.payment_method_type_id;
      }
    }

    async getInvoiceLinesFromPayment(connection) {
      //Keep in mind the discounts
      //[account.property_id, account.company_id, account.payment.amount, 'debit', ENUMS.BOOK_TYPES.CASH, ENUMS.ACCOUNT_SUBTYPE.ALLOWANCE]
      let invoice_lines = await models.Payment.getInvoiceLinesFromPayment(connection, this.id);
      let export_data = []
      for(let i=0; i<invoice_lines.length; i++){
        export_data.push([account.property_id, account.company_id, invoice_lines.line_amount, 'credit', ENUMS.BOOK_TYPES.CASH, ENUMS.ACCOUNT_SUBTYPE[invoice_lines.default_type]])
      }
      export_data.push([account.property_id, account.company_id, payment.amount, 'debit', ENUMS.BOOK_TYPES.CASH, ENUMS.ACCOUNT_SUBTYPE[invoice_lines.default_type]]);

      return export_data;
    }

    async creditsAppliedExportData(connection, account, credit_debit_account, over_ride_accounts){
      let export_data = [];
      let payment = new Payment({id: account.payment_id});
      await payment.find(connection);

      for(let i=0; i< credit_debit_account.length; i++){

       export_data.push(this.getSingleAccountExport(credit_debit_account[i], over_ride_accounts, account, payment));
      }
      return export_data;
    }

    async breakDownExportData(connection, account, credit_debit_account, over_ride_accounts){
      let export_data = [];
      
      let lines_allocation = await models.Invoice.findInvoiceBreakDownById(connection, account.break_down_id);
      let payment = new Payment({id: lines_allocation[0].payment_id});
      await payment.find(connection);
      
      for(let i=0; i<credit_debit_account.length; i++){
        
        if(!credit_debit_account[i].is_group){
          export_data.push(this.getSingleAccountExport(credit_debit_account[i], over_ride_accounts, account, payment));
        }
        else{
          if (credit_debit_account[i].account_name === 'Invoice - Invoice Lines') {
            export_data = this.getLinesExportData(lines_allocation, credit_debit_account[i], over_ride_accounts, account);
          }
          else{
            export_data.push(this.getPaymentMethodExportData(connection, account, credit_debit_account[i], payment));
          }
        }
      }
      return export_data;
      
    }

    getSingleAccountExport(credit_debit_account, over_ride_accounts, account, payment){
      let account_id = credit_debit_account.account_id;
      let amount = account.event_id === 7 ? (payment.amount) * (-1) : payment.amount;

        if (over_ride_accounts.length > 0) {
         account_id = over_ride_accounts.find(x => x.credit_debit_type === credit_debit_account.type).override_gl_account_id;;
        }
        
        return [account.property_id, account.company_id, amount, credit_debit_account.type, credit_debit_account.book_id, account_id];
    }

    getLinesExportData(lines_allocation, credit_debit_account, over_ride_accounts, account){
      
      let export_data = [];
      let account_id;
      let product_id_account;
      let product_type_account;

      for(let i=0 ; i< lines_allocation.length; i++){
        
        let amount = account.event === 'refund' ? (lines_allocation[i].amount) * (-1) : lines_allocation[i].amount;

        if (over_ride_accounts.length > 0) {
          product_id_account = over_ride_accounts.find(x => x.credit_debit_type === credit_debit_account.type && lines_allocation[i].product_id === x.product_id);
          product_type_account = over_ride_accounts.find(x => x.credit_debit_type === credit_debit_account.type && lines_allocation[i].default_type === x.product_type);  
        }
       
        if (product_id_account) {
          account_id = product_id_account.override_gl_account_id;
        }
        else if(product_type_account){
          account_id = product_type_account.override_gl_account_id;
        }
        else{
          //Tax type product keep in mind
          account_id = lines_allocation[i].income_account_id ? lines_allocation[i].income_account_id :credit_debit_account.account_id ;
        }
        export_data.push([account.property_id, account.company_id, amount , credit_debit_account.type, credit_debit_account.book_id, account_id]);
      }

      return export_data;
    }

    async getPaymentMethodExportData(connection, account, credit_debit_account, payment, over_ride_accounts){
      // let payment_method = new PaymentMethod({id: account.payment_method_id});
      // await payment_method.find(connection);
      let account_id;
      let amount = account.event === 'refund' ? (payment.amount) * (-1) : payment.amount;
      let payment_method_account = models.GlAccounts.findByPaymentId(connection, payment.id);
      account_id = payment_method_account.id;

      // if (over_ride_accounts.length > 0) {
      //   account_id = over_ride_accounts.find(x => x.credit_debit_type === credit_debit_account.type).override_gl_account_id;;
      //  }
      return [account.property_id, account.company_id, amount, credit_debit_account[i].type, credit_debit_account[i].book_id, account_id];
    }
    
    async getMethod(connection) {
      if(!this.method){
        await this.find(connection);
      }

      return this.method
    }
    async findInvoicePaymentBreakdownById(connection, ids = []){
      if(ids.length === 0)
        return [];
      return await models.Payment.getInvoicePaymentBreakdowns(connection, { ids });
    }

    async findPaymentOfBreakdown(connection, break_down_id){
      let payment = await models.Payment.getPaymentOfBreakdown(connection, break_down_id);
      if(payment && payment.id){
        this.id = payment.id;
        await this.find(connection);
      }
    }

    static findLeaseIndexByMinLastBilled(leases) {
      let minIndex = 0;
      for(let i = 1; i < leases.length; i++) {
        if(leases[i].last_billed < leases[minIndex].last_billed) {
          minIndex = i;
        }    
      }
      
      return minIndex;
    }

    static async computeAdvanceMonths(connection, payload) {
      const { amount, leases, company } = payload;
      let amountRemaining = amount;
      while (amountRemaining > 0) {
        let minPaidThroughLeaseIndex = Payment.findLeaseIndexByMinLastBilled(leases);        
        const lease = leases[minPaidThroughLeaseIndex];        
        const billedMonths = lease.computePaymentCycleInvoices();

        let invoices = [];
        if(lease.id) {
          invoices = await lease.saveInvoices(connection, { no_of_months: billedMonths, company: company, dryrun: true });
          // invoices = await lease.generateInvoice(connection, { company: company, dryrun: true });
        } else {
          invoices = await lease.generateInvoicesByUnit(connection, { company: company, billed_months: billedMonths });
        }

        let balance = 0;
        invoices.map(i => { balance += i.balance });
        amountRemaining -= balance;
        leases[minPaidThroughLeaseIndex].billed_months += billedMonths;
      }
    }

    static async getLeasesBilledMonthsByAmount(connection, params) {
      const { leases: leasesParam, amount, company } = params;
      let leases = [];
      
      for (let i = 0; i < leasesParam.length; i++) {
        let lease;
        if(!leasesParam[i].id && leasesParam[i].unit_id) {
          lease = await Unit.createLease(connection, {
            company: company,
            leaseData: leasesParam[i],
            api: {}  
          });
          lease.payment_cycle = leasesParam[i].payment_cycle;

          await lease.findUnit(connection);
        } else {
          lease = new Lease({ id: leasesParam[i].id });
          await lease.find(connection);
          await lease.getLastBilledInvoiceEndDate(connection, { leaseData: leasesParam[i] });
          lease.billed_months = +leasesParam[i].billed_months;
          lease.payment_cycle = leasesParam[i].payment_cycle;
          lease.auto_charge = !!leasesParam[i].auto_charge;
        } 

        leases.push(lease);
      }
      
      await Payment.computeAdvanceMonths(connection, { amount, leases, company });
      return leases;
    }

    async getAcceptedByForPayment(connection, company_id){
      let AcceptedBy = {};
      if (this.source && this.source === 'auto') {
        AcceptedBy.first = 'AutoPay',
        AcceptedBy.last =  ''
      } else if (this.source && ['oftw', 'ofcoop', 'ofti'].indexOf(this.source) >= 0){
        AcceptedBy.first = 'Website',
        AcceptedBy.last =  'Payment'
      } else if(this.source && this.source === 'xps'){
        AcceptedBy.first = 'XPS',
        AcceptedBy.last =  ''
      } else if(this.is_migrated){
        AcceptedBy.first = 'Migrated',
        AcceptedBy.last =  'Payment'
      } else if(this.accepted_by) {
        let contact = new Contact({id: this.accepted_by});
        await contact.find(connection, company_id);
        AcceptedBy = contact
      } else {
        AcceptedBy.first = 'Not',
        AcceptedBy.last =  'Available'
      }

      this.AcceptedBy = AcceptedBy
    }

    getCleaningDepositInvoiceLines(connection, payment_application_id){
      return models.Payment.getCleaningDepositInvoiceLineAllocation(connection,payment_application_id);
    }

    async getReceiptInvoices(connection, remove_voided_invoices = false) {
      const invoices = [], interPropertyInvoices = [];

      if (Object.keys(this.InterPropertyPayment).length) {
        const interPropertyPayment = this.InterPropertyPayment;
        for (const appliedPayment of interPropertyPayment.appliedPayments) {
          const invoice = await processInvoicePayment(appliedPayment);
          interPropertyInvoices.push(invoice);
        }
      }

      let activeInvoicePayments = JSON.parse(JSON.stringify(this.AppliedPayments));
      if(remove_voided_invoices) {
        activeInvoicePayments = activeInvoicePayments.filter(obj => obj.hasOwnProperty('Invoice'));
      }

      for (const appliedPayment of activeInvoicePayments) {
        const invoice = await processInvoicePayment(appliedPayment);
        invoices.push(invoice);
      }

      return {
        invoices,
        interPropertyInvoices
      };

      // Define a function to process a single invoice payment
      async function processInvoicePayment(payment) {
        const invoice = new Invoice(payment.Invoice);
        await invoice.find(connection);
        
        if (invoice.lease_id) {
          await invoice.Lease.findUnit(connection);
          await invoice.Lease.Unit.getCategory(connection);
          await invoice.Lease.Property.getAddress(connection);
        }
        const invoicePaymentBalance = await invoice.invoiceBalanceAfterPayment(connection, payment.payment_id);
        invoice.total();
        invoice.balance_remaining = invoicePaymentBalance;
        return invoice;
      }
    }

    async getInterPropertyPayment(connection){
      if(!this.id) e.th(500, "Payment id not set");

      let is_adjustment_payment = this.method === Enums.PAYMENT_CREDIT_TYPE.ADJUSTMENT && this.sub_method === Enums.ADJUSTMENT_SUB_METHOD.INTER_PROPERTY_PAYMENT ? true: false;
      let paymentPropertyAdjustments = await models.Payment.findPaymentInterPropertyAdjustmentById(connection, this.id, is_adjustment_payment);

      this.is_inter_property_payment = false;
      let interPropertyPayment = {
        sourcePayment: null,
        appliedPayments: []
      };

      if(paymentPropertyAdjustments?.length) {
        this.is_inter_property_payment = true;

        interPropertyPayment.sourcePayment = new Payment({id:paymentPropertyAdjustments[0].source_payment_id});
        await interPropertyPayment.sourcePayment.find(connection);
        await interPropertyPayment.sourcePayment.getProperty(connection);

        let appliedInvoices = await models.Payment.findPaymentApplications(connection, paymentPropertyAdjustments[0].source_payment_id, { unit_info: true, property_info: true });
        for(let i=0; i< appliedInvoices?.length; i++){
          let ip_inv = await models.Invoice.isInterPropertyInvoiceById(connection, appliedInvoices[i].invoice_id);
          if (!ip_inv || (ip_inv?.length && ip_inv[0].is_inter_property == false)) {
            interPropertyPayment.appliedPayments.push(appliedInvoices[i]);
          }
        }
        
        let appliedPayments = null;
        for(let i=0; i< paymentPropertyAdjustments.length; i++){
          appliedPayments = await models.Payment.findPaymentApplications(connection, paymentPropertyAdjustments[i].payment_id, { unit_info: true, property_info: true });
          if (appliedPayments) {
            interPropertyPayment.appliedPayments.push(...appliedPayments);
          }
        }
        this.InterPropertyPayment = interPropertyPayment;

      }

      return true;
    }

    async captureFailedPayments(connection, payment, payment_details) {
      try {
        let property = new Property({ id: payment_details.property_id}); 
        await property.find(connection);
        let contact = new Contact({ id: payment_details.contact_id});
        await contact.find(connection);
        let payment_method = await contact.getPaymentMethod(connection, property, 
                      payment_details.payment_method_id, payment_details.type, 
                      payment_details.source, payment_details.paymentMethod, false);
        payment_method.is_active = 0;
        let failed_payment  = new Payment(payment);
        failed_payment.id = null;
        failed_payment.status = 0;
        await failed_payment.create(connection, payment, payment_method, undefined, payment.accepted_by);
        await failed_payment.save(connection);
      } catch (err) {
        console.log("Exception in captureFailedPayments: ", err);
      }
    }
}

module.exports = Payment;

const utils = require('../modules/utils');
const InvoiceLine = require('./invoice_lines.js');
var Invoice = require(__dirname + '/../classes/invoice.js');
var Property = require(__dirname + '/../classes/property.js');
var Contact = require(__dirname + '/../classes/contact.js');
var Lease = require(__dirname + '/../classes/lease.js');
var Cash      = require(__dirname +'/../classes/payment_methods/cash.js');
var Check      = require(__dirname +'/../classes/payment_methods/check.js');
var Ach      = require(__dirname +'/../classes/payment_methods/ach.js');
var Card      = require(__dirname +'/../classes/payment_methods/card.js');
const GiftCard = require(__dirname +'/../classes/payment_methods/gift_card.js');
let {LeaseAuction} = require(__dirname + '/../classes/lease_auction.js');
var Todo = require(__dirname + '/../classes/todo.js');
var Reversal = require(__dirname + '/../classes/reversal.js');
const Unit = require(__dirname + '/../classes/unit.js');
const Product = require('./product');
const InterPropertyPayment = require('./inter_property_payment');
