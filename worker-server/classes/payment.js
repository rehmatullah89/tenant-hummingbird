"use strict";

var models  = require(`./../models`);
var settings    = require(__dirname + '/../config/settings.js');
var Promise = require('bluebird');

var validator = require('validator');
var moment      = require('moment');
var Activity  = require(__dirname + '/../classes/activity.js');
var Accounting  = require('../classes/accounting.js');
var e  = require(__dirname + '/../modules/error_handler.js');

class Payment {

    constructor(data){

        data = data || {};
        this.id = data.id || null;
        this.payment_methods_id = null;  // cannot set payment methods ID in the constructor.
        this.lease_id = data.lease_id || null;
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
        this.source = data.source || null;
        this.method = data.method || null;
        this.accepted_by = data.accepted_by;
        this.amt_remaining = data.amt_remaining || 0;
        this.payment_method_type_id = data.payment_method_type_id || null;
        this.verification_method = data.verification_method || null;
        this.aid = data.aid || null;
        this.effective_date = null;
        this.status_desc = null;
        this.payment_source = data.payment_source || null;

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

        this.invoicesPayment = [];
        this.total_applied = 0;
        this.payment_remaining = 0;
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
            payment_source: this.payment_source,
            payment_method_type_id: this.payment_method_type_id,
            ...(!this.id && {effective_date: this.effective_date})
        };
        try{
            let result = await models.Payment.save(connection, save, this.id);
            if (result.insertId) this.id = result.insertId;

        } catch(err){
            console.log("threadId", connection.threadId);
            console.log("connection", connection.config);
            console.log("err", err);
            throw err
        }




    }

    async create(connection, data, paymentMethod = {}, source = 'manual', contact_id, dryrun){

        // if no payment method and type != cash or check, throw error,

        // this.lease_id = data.lease_id;
        this.amount = Math.round(data.amount * 1e2) / 1e2;
        this.date = data.date || moment().format('YYYY-MM-DD');
        this.created = moment().format('YYYY-MM-DD HH:mm:ss');
        this.property_id = data.property_id;
        this.contact_id = data.contact_id;
        this.ref_name = data.ref_name || null;
        this.number = data.number || null;
        this.source = data.source || 'e-commerce';
//      this.source = data.source || source;
        this.method = data.method;
        this.notes = data.notes;
        this.accepted_by = contact_id || null;

        // If there is no property id, get it from the lease
        if(!this.property_id){
            this.getProperty(connection);
        }

        // If there is no contact id, get it from the lease - pull primary
        if(!this.contact_id){
            this.getContact(connection);
        }


        if((paymentMethod.type.toLowerCase() === 'cash' || paymentMethod.type.toLowerCase() === 'check' || paymentMethod.type.toLowerCase() === Enums.PAYMENT_METHODS.GIFTCARD) && !this.ref_name){
            e.th(400, "Please include a reference name");
        }

        if(paymentMethod.type.toLowerCase() === 'check' && !this.number){
            e.th(400, "Please enter the check number");
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

        if((this.source.toLowerCase() === 'auto')){
            this.payment_source = "AutoPay"
        }

        paymentMethod.lease_id = this.lease_id;

        await this.setPaymentMethod(paymentMethod)
        await this.setPaymentMethodTypeId(connection,paymentMethod)
        await this.validate();
        if(dryrun) return;
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
        this.method = null;
        this.credit_type = 'credit';
        this.notes = data.notes;
        this.accepted_by = contact_id;
        this.lease_id = data.lease_id;
        
        if(!data.lease_id) e.th(400,'Missing lease id');
        await this.setPaymentMethodTypeId(connection, { type: 'Credit' });
        
        await this.save(connection);


    }

    async charge(connection, company_id, dryrun, contact, authorization){

        if(!this.Property || !this.Property.id)
            await this.getProperty(connection, false);

        let refund_effective_date = await this.Property.getEffectiveDate(connection);

        let payment_info = {};
        let error = null;
        try{
            payment_info = await this.PaymentMethod.charge(connection, this.amount, this.id, company_id, dryrun, contact, this.source, authorization, refund_effective_date);
        } catch(err){
            error = err;
        }

        await this.find(connection);
        await this.getRefunds(connection);
        
        if(error) e.th(400, error.msg || error.message);
        return payment_info;
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
        this.qb_id = data.qb_id;
        this.status_desc = data.status_desc;
        this.status = data.status;
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
        this.sub_method = data.sub_method || null;

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

    async getPaymentApplications(connection){
        try{
            if(!this.id) e.th(500, "Payment id not set");

            this.AppliedPayments = await models.Payment.findPaymentApplications(connection, this.id);
            await this.getRefunds(connection);
            this.getTotalApplied();
            this.payment_remaining = this.amount - this.total_applied - this.Refunds.reduce((a, r) => a + r.amount, 0);
            this.payment_remaining = Math.round(this.payment_remaining * 1e2) / 1e2;

            return true;
        } catch(err) {
            console.log("Err", err);
            throw err;
        }

    }

    async getPaymentMethod(connection){

        if(!this.Property.id){
            await this.getProperty(connection);
        }

        this.PaymentMethod = await this.Property.getPaymentMethod(connection, this.method, this.payment_methods_id);
        await this.PaymentMethod.getContact(connection);

    }

    async getRefunds(connection){
        if(!this.id) throw "Payment id not set";

        try{
            let refunds = await models.Payment.findRefunds(connection, this.id);
            this.Refunds = refunds;
            return true;
        } catch(err){
            console.log("e threadId", connection.threadId);
            console.log("e connection", connection.config);
            console.log("err", err);
            throw err
        }



    }

    getTotalApplied(){
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
        if(!this.Property.id) {
            this.Property = new Property({ id: this.property_id });
        }

        const currentPropertyDate = await this.Property.getLocalCurrentDate(connection);

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
                        date: moment().format('YYYY-MM-DD'),
                        amount: Math.round(invoice.balance * 1e2) / 1e2
                    };

                    this.payment_remaining -= invoice.balance;
                } else if(this.payment_remaining < invoice.balance){
                    invoicesPayment = {
                        invoice_id: invoice.id,
                        date: currentPropertyDate,
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

    async updateInvoiceLineAllocation(connection, invoicesPaymentsBreakdownId) {
        await models.Payment.updateInvoiceLineAllocation(connection, invoicesPaymentsBreakdownId);
    }

    async applyToInvoices(connection, invoices, is_err=false, shouldCommit = true){
        
        if(!this.Property.id) {
            await this.getProperty(connection);
        }

        const currentPropertyDate = await this.Property.getLocalCurrentDate(connection);
        let lease_list = [];
        let invoiceList = [];

        this.amount_remaining = this.payment_remaining;

        for (let i = 0; i < invoices.length; i++){
            if(!invoices[i].amount ) continue;
            let invoice = new Invoice({ id: invoices[i].id});

            await invoice.find(connection);
            invoice.total();

            if(invoice.lease_id && lease_list.indexOf(invoice.lease_id) < 0) {
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
                date: invoices[i]?.alloc_date ? invoices[i]?.alloc_date : currentPropertyDate,
                amount: is_err ? 0 : amtToApply
            };

            this.invoicesPayment.push(invoicesPayment);

            let invoice_payment_breakdown_id;
            let unappliedPayment = await models.Payment.findPriorPaymentsOnInvoice(connection, invoice.id, this.id);
            if(unappliedPayment) {
                invoicesPayment.amount += unappliedPayment.amount
                invoice_payment_breakdown_id = await models.Payment.applyPayment(connection, invoicesPayment, unappliedPayment.id);
            } else {
                invoice_payment_breakdown_id = await models.Payment.applyPayment(connection, invoicesPayment);
            }

            if(invoice_payment_breakdown_id){
                let payload = {
                    invoicesPaymentsBreakdownId: invoice_payment_breakdown_id, 
                    invoiceId: invoice.id, 
                    paymentId: this.id, 
                    propertyId: this.Property.id,
                    date: invoices[i]?.alloc_date ? invoices[i]?.alloc_date : currentPropertyDate,
                    cid: connection.cid
                };
                invoiceList.push({
                    id: invoice?.id,
                    lease_id: invoice?.lease_id,
                    space_id: invoice?.Lease?.unit_id,
                    tenant_id: invoice?.Lease?.Tenants[0]?.id,
                    amount: invoicesPayment?.amount
                });
    
                await this.updateInvoiceLineAllocation(connection, invoice_payment_breakdown_id); 
                await PaymentEvent.generateAccountingExport(connection, payload);
            }

            invoices[i].amount -= amtToApply;            
            invoice.balance = Math.round((invoice.balance - amtToApply) * 1e2) / 1e2;
            this.amount_remaining = Math.round( (this.amount_remaining - amtToApply) * 1e2 ) / 1e2;

        }
        
        if (invoiceList.length) {
            let eventPayload = {
                cid: connection.cid,
                property_id: this.Property.id || this.property_id,
                contact_id: this.contact_id,
                payment_id: this.id,
                payment_amount: this.amount,
                invoices: invoiceList
            };
            PaymentEvent.newPayment(eventPayload);
        }

        await Lease.updateLeaseStandings(connection, lease_list);
        await this.save(connection);

        await DelinquencyEvent.endDelinquency(connection, { lease_ids: lease_list }, shouldCommit);
    }

    updateStatus(connection, company_id){
        return this.PaymentMethod.getPaymentStatus(connection, this, company_id);
    }

    async refund(connection, company_id, amount, ref_num, reason){

        if(!this.id) e.th(500, 'payment id not set');

        await this.getPaymentApplications(connection);

        if(this.payment_remaining < amount) e.th(400, 'You are trying to refund more than the remaining payment amount');

        if(!this.Property || !this.Property.id)
            await this.getProperty(connection, false);

        let refund_effective_date = await this.Property.getEffectiveDate(connection);

        let refund = {
            amount: amount,
            payment_id: this.id,
            ref_num: ref_num,
            reason: reason,
            date: moment.utc().format('YYYY-MM-DD HH:mm:ss'),
            effective_date: refund_effective_date
        }

        let response = await models.Payment.saveRefund(connection, refund)

        refund.id = response.insertId;

        let refund_response = await this.PaymentMethod.refund(connection, this,  company_id, amount, refund, reason);

        let data = {
            type: refund_response.type || 'refund',
            ref_num: refund_response.ref_num,
            auth_code: refund_response.auth_code,
            transaction_id: refund_response.transaction_id
        };

        await models.Payment.saveRefund(connection, data, refund.id);
        this.Refund = {...refund, ...data }
    }

    async getRefundById(connection, refund_id){
        this.Refund = await models.Payment.getRefund(connection, refund_id);
    }

    async getRefund(connection, refund_id){
        this.Refund = await models.Payment.getRefundById(connection, this.id, refund_id);
        if(!this.Refund) e.th(404);
    }

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

    async unapply(connection, payment_application_id, new_amount, params = {}){
        return await models.Payment.unapplyPayment(connection, payment_application_id, new_amount, params);

        // await this.getPaymentApplications(connection);
        // await models.Payment.save(connection, {
        //   amt_remaining: this.payment_remaining
        // }, this.id);

    }

    async unapplyInvoicePayment(connection, invoicesPaymentsId, newAmount = 0, invoice) {
        if(!this.Property?.id) await this.getProperty(connection);
        let
            date = await this.Property.getLocalCurrentDate(connection),
            invoicePayment = await models.Payment.fetchInvoicePaymentsById(connection, invoicesPaymentsId),
            amountDelta = newAmount - invoicePayment.amount,
            invoicesPaymentsUpdatePayload = { amount: newAmount, date };

        await models.Payment.updateInvoicesPayments(connection, invoicesPaymentsId, invoicesPaymentsUpdatePayload);
        await models.Payment.updateTotalPaymentInInvoices(connection, invoicePayment.invoice_id);

        if (amountDelta) {
            let invoicePaymentInfo = await models.Payment.fetchInvoicePaymentInfo(connection, invoicesPaymentsId);

            if (invoicePaymentInfo) {
                let insertResult = await this.unapplyInvoicePaymentBreakDown(connection, invoicePaymentInfo, amountDelta);
                if (insertResult?.insertId) {

                    let accountingPayload = {
                        invoicesPaymentsBreakdownId: insertResult.insertId,
                        invoiceId: invoice.id,
                        paymentId: this.id,
                        propertyId: this.Property.id,
                        date,
                        cid: connection.cid
                    };

                    await this.unapplyInvoiceLineAllocation(connection, insertResult.insertId);
                    await PaymentEvent.generateAccountingExport(connection, accountingPayload);
                }
            }
        }
    }

    async unapplyInvoicePaymentBreakDown(connection, invoicePaymentInfo, amount) {
        let insertPayloadForInvoicePaymentBreakDown = {
            invoice_id: invoicePaymentInfo.invoice_id,
            payment_id: invoicePaymentInfo.payment_id,
            invoice_payment_id: invoicePaymentInfo.id,
            amount,
            date: invoicePaymentInfo.curr_date,
            effective_date: invoicePaymentInfo.effective_date
        }
        return await models.Payment.insertIntoInvoicePaymentBreakDown(connection, insertPayloadForInvoicePaymentBreakDown);
    }

    async unapplyInvoiceLineAllocation(connection, invoicePaymentBreakDownId) {
        let
            invoiceAllocations = [],
            productPaymentAllocation,
            productLevelTax = null,
            productPaymentOrder = [
                "rent",
                "auction",
                "late",
                "insurance",
                "product",
                "security",
                "cleaning"
            ],
            invoicePaymentBreakDown = await models.Payment.fetchInvoicePaymentBreakDownById(connection, invoicePaymentBreakDownId),
            { applied_line } = invoicePaymentBreakDown;

        if (!invoicePaymentBreakDown || !invoicePaymentBreakDown.amount) return;

        let
            paidAmount = Math.abs(invoicePaymentBreakDown.amount),
            sign = (invoicePaymentBreakDown.amount < 0) ? -1 : 1,
            paymentSettings = await models.Payment.fetchPaymentSettingsByInvoicePaymentBreakDownId(connection, invoicePaymentBreakDown.id);

        if (paymentSettings.product_level_tax) productLevelTax = JSON.parse(paymentSettings.product_level_tax);

        if (paymentSettings.payment_order) {
            let order = paymentSettings.payment_order
                .replace('fees', 'late')
                .replace('merchandise', 'product')
                .replace('deposit', 'security,cleaning');
            productPaymentOrder = order.split(`,`);
        }

        if (productLevelTax) {
            productPaymentAllocation = Payment.reducePaymentOrderArray(productPaymentOrder, applied_line?.type || 'both');
        } else if (applied_line && applied_line?.type !== `both`) {
            productPaymentAllocation = Payment.reducePaymentOrderArray(productPaymentOrder, applied_line?.type);
        } else {
            let
                productLine = Payment.reducePaymentOrderArray(productPaymentOrder, `line`),
                productTax = Payment.reducePaymentOrderArray(productPaymentOrder, `tax`);
            productPaymentAllocation = productLine.concat(productTax);
        }

        let invoiceLineInfo = await models.Invoice.fetchInvoiceLineInfo(connection, invoicePaymentBreakDown.invoice_id, applied_line?.invoice_line_id, sign);

        if (invoiceLineInfo?.length) {
            let priorityProductArray = (sign > 0) ? productPaymentAllocation : [...productPaymentAllocation].reverse();

            for (let priorityProduct of priorityProductArray) {
                let lines = invoiceLineInfo.filter(il => il.type === priorityProduct.product_type);

                if (lines?.length) {
                    for (let line of lines) {
                        let invoiceAllocation = [
                            invoicePaymentBreakDown.invoice_id,
                            invoicePaymentBreakDown.invoice_payment_id,
                            line.id,
                            invoicePaymentBreakDown.id,
                            invoicePaymentBreakDown.date,
                            invoicePaymentBreakDown.effective_date,
                        ];
                        let totalAllocation = (priorityProduct.type == 'line')
                            ? line.line_amount
                            : (priorityProduct.type == 'tax')
                                ? line.tax_amount
                                : line.line_amount + line.tax_amount;
                        if (!totalAllocation) continue;

                        let minAmount = Math.min(paidAmount, totalAllocation);
                        paidAmount -= minAmount;

                        let amountAllocation = 0, taxAllocation = 0;

                        if (priorityProduct.type == 'both') {
                            if (minAmount == totalAllocation) {
                                amountAllocation = line.line_amount;
                                taxAllocation = line.tax_amount;
                            } else {
                                amountAllocation = rounding.round((minAmount / totalAllocation) * line.line_amount);
                                taxAllocation = rounding.round(minAmount - amountAllocation);
                            }
                        } else {
                            (priorityProduct.type == 'line')
                                ? amountAllocation = minAmount
                                : taxAllocation = minAmount;
                        }

                        let invoiceLineAllocations = [];

                        if (amountAllocation) {
                            let invoiceLine = [...invoiceAllocation];
                            invoiceLine.push('line', sign * amountAllocation);
                            invoiceLineAllocations.push(invoiceLine);
                        }
                        if (taxAllocation) {
                            let invoiceLine = [...invoiceAllocation];
                            invoiceLine.push('tax', sign * taxAllocation);
                            invoiceLineAllocations.push(invoiceLine);
                        }

                        invoiceAllocations = invoiceAllocations.concat(invoiceLineAllocations);

                        if (!paidAmount) break;
                    }
                }
                if (!paidAmount) break;
            }
        }

        if (invoiceAllocations.length)
        return await models.Payment.insertIntoInvoiceLinesAllocation(connection, invoiceAllocations);
    }

    static reducePaymentOrderArray(paymentOrderArray = [], type) {
        if (!paymentOrderArray.length || !type) return;

        return paymentOrderArray.reduce((obj, item) => {
            return [
                ...obj,
                { product_type: item, type }
            ]
        }, []);
    }

    static async getPaymentApplicationById(connection, payment_application_id){

        return await models.Payment.findPaymentApplicationById(connection, payment_application_id);


    }

    async getPaymentByCompanyId(connection, company_id, creditType){

        return await models.Payment.findPaymentByCompanyId(connection, company_id, creditType);
    }

    async getPaymentByContactId(connection, contact_id, creditType){
        return await models.Payment.findPaymentByContactId(connection, contact_id, creditType);
    }
  
    async verifyAccess(connection, company_id, properties = []){
        if (!this.id)  e.th(500, 'Payment id not defined');
        let property = await models.Payment.findPropertyFromPaymentId(connection, this.id);
        console.log(property);
        if(property.company_id !== company_id) e.th(403, 'You are not authorized to view this resource.');
        if(properties.length && properties.indexOf(property.id) < 0) e.th(403, 'You are not authorized to view this resource.');

    }

    async getMethod(connection) {
        if(!this.method){
          await this.find(connection);
        }
  
        return this.method
    }

    async findInvoicePaymentBreakdownById(connection, id){
        return await models.Payment.getInvoicePaymentBreakdownById(connection, id);
    }

    async findPaymentOfBreakdown(connection, break_down_id){
        let payment = await models.Payment.getPaymentOfBreakdown(connection, break_down_id);
        if(payment && payment.id){
          this.id = payment.id;
          await this.find(connection);
        }
    }

    async setPaymentMethodTypeId(connection,paymentMethod){
        let pm_type = paymentMethod.type.toLowerCase();
        if(pm_type === 'cash' || pm_type === 'check' || pm_type === 'credit' || pm_type === 'adjustment' || pm_type === Enums.PAYMENT_METHODS.GIFTCARD){
          this.payment_method_type_id = await models.Payment.getPaymentMethodTypeId(connection,pm_type);
        }
        else{
          this.payment_method_type_id = paymentMethod.payment_method_type_id;
        }
    }

    async applyOpenAmount(connection, params){

        let { company_id, active_leases, date_wise_allocation } = params;
        let invoices = await models.Invoice.findDueByLease(connection, active_leases);

        let inv_count = 0;
        let sortList = [];

        if(invoices.length) sortList.push( { invoice: invoices[inv_count], date: moment(invoices[inv_count].due) } );

        for(let i = 0; i < active_leases.length; i++){
            let lease = new Lease({ id: active_leases[i] });
            await lease.find(connection);
            let lastBillingDate = await lease.getLastBillingDate(connection); // Should be last billed.
            let lastBilled = moment(lastBillingDate, 'YYYY-MM-DD HH:mm:ss').startOf('day');
            sortList.push( { lease, lastBilled, date: lastBilled.clone().add(1, 'day') } );
        }

        let payment_remaining = this.payment_remaining;
        let invoicesToApply = [];
        let zeroBalanceCounter = 0;

        console.log('Initial Sort List:', sortList);
        console.log('Initial Payment to Apply:', payment_remaining);

        while(payment_remaining > 0){
            sortList = sortList.sort((a, b) => { return a.date.format('X') - b.date.format('X') } );
            let priority = sortList[0];
            let invoice;

            if(priority.invoice){
                invoice = priority.invoice;
                invoice.balance = invoice.total_owed;
                inv_count++

                if(inv_count < invoices.length){
                    sortList[0] = { invoice: invoices[inv_count], date: moment(invoices[inv_count].due) }
                } else {
                    sortList.shift();
                }
            } else if(priority.lease){
                let invoicePeriod = await priority.lease.getCurrentInvoicePeriod(connection, priority.lastBilled.clone(), 1);
            
                let services = await priority.lease.getCurrentServices(connection, company_id, invoicePeriod.start.clone(), invoicePeriod.end.clone())
                    .filter(s => (s.service_type === 'lease' || s.service_type === 'insurance') && ((s.recurring === 1) || (!s.recurring && !s.last_billed)) );
            
                invoice = new Invoice({
                    lease_id: priority.lease.id,
                    property_id: this.property_id,
                    contact_id: this.contact_id,
                    user_id: null,
                    date: invoicePeriod.start.format('YYYY-MM-DD'),
                    due: invoicePeriod.start.format('YYYY-MM-DD'),
                    company_id: company_id,
                    type: "manual",
                    status: 1
                });
            
                invoice.Lease = priority.lease;
                await invoice.makeFromServices(
                    connection,
                    services,
                    priority.lease,
                    invoicePeriod.start,
                    invoicePeriod.end,
                    null,
                    company_id
                );
            
                await invoice.total();
                await invoice.save(connection);

                let lastBilled = invoicePeriod.end.clone();
                sortList[0].lastBilled = lastBilled;
                sortList[0].date = lastBilled.clone().add(1, 'day');
            }

            let cap_index = date_wise_allocation.findIndex(x => x.capacity > 0);
            let invoice_balance = invoice.balance;

            while(date_wise_allocation[cap_index].capacity > 0){

                let amount_to_apply = Math.min(invoice_balance, payment_remaining);
                amount_to_apply = Math.min(amount_to_apply, date_wise_allocation[cap_index].capacity);
                invoice.amount = amount_to_apply;

                invoice_balance = Math.round( ( invoice_balance - amount_to_apply ) * 1e2) /1e2 ;
                payment_remaining = Math.round( ( payment_remaining - amount_to_apply ) * 1e2) /1e2 ;
                date_wise_allocation[cap_index].capacity = Math.round( ( date_wise_allocation[cap_index].capacity - amount_to_apply ) * 1e2) /1e2;

                invoice.alloc_date = date_wise_allocation[cap_index].date;
                invoicesToApply.push(invoice);
                cap_index = date_wise_allocation.findIndex(x => x.capacity > 0);

                if(!invoice_balance || !payment_remaining || cap_index == -1){
                    break;
                }
            }

            zeroBalanceCounter = invoice.balance == 0 ? zeroBalanceCounter + 1 : 0;

            console.log('Modified Sort List:', sortList);
            console.log('Remaining Payment to Apply:', payment_remaining);
            console.log('Invoices To Apply:', invoicesToApply);
            console.log('ZeroBalance Counter:', zeroBalanceCounter);

            if(zeroBalanceCounter > 18){
                if(this.payment_remaining !== payment_remaining){
                    invoicesToApply = invoicesToApply.filter(i => i.balance > 0);
                    break;
                } else {
                    throw 'Cannot allocate payment as all generated invoices have a balance of 0';
                }
            }
        }

        if(invoicesToApply.length){
            await this.applyToInvoices(connection, invoicesToApply);
        }

    }

    static async findOldestOpenInvoicesWithPayments(connection, params) {

        let { property_id, lease_id } = params;

        let oldest_open_invoices = await models.Invoice.findOldestOpenInvoice(connection, { property_id, lease_id });
        let filtered_oldest_open_invoices = [];

        for(let i = 0; i < oldest_open_invoices.length; i++){
            let open_invoice = oldest_open_invoices[i];
            let invoices = await models.Invoice.findAllInvoicesByDate(connection, open_invoice.due, open_invoice.lease_id);
            let min_invoice_index = null;

            // removing zero balance in min_due invoices
            for(let j = 0; j < invoices.length && min_invoice_index === null; j++){
                if(j === 0 && invoices[j].status === -1) continue;
                if(min_invoice_index === null && invoices[j].balance > 0) min_invoice_index = j;
            }

            // if there is no active min invoice
            if(min_invoice_index === null) continue;

            // removing invoices which do not have payment to apply
            let filtered_invoices = invoices.slice(min_invoice_index, invoices.length);
            let anyFuturePayment = filtered_invoices.filter(x=> x.id !== invoices[min_invoice_index].id && x.payment_amount > 0)

            if(anyFuturePayment && anyFuturePayment.length) {
                filtered_oldest_open_invoices.push({
                    due: open_invoice.due,
                    lease_id: open_invoice.lease_id,
                    invoices: [...filtered_invoices]
                });
            }
        }
        return filtered_oldest_open_invoices;
    }

    static async applyLeaseOldestPaymentsToInvoice(connection, lease_id, lease_open_payments = []) {
        
        lease_open_payments = lease_open_payments.sort((a,b) => a.payment_date - b.payment_date);

        for(let i=0; i < lease_open_payments.length;i++){
            let oip = lease_open_payments[i];
            let actual_open = await models.Payment.getRemainingAmount(connection, oip.payment_id);
            let amount_to_apply = oip.applied_amount > actual_open ? actual_open: oip.applied_amount;

            if(amount_to_apply === 0) continue;

            let invoices = await models.Invoice.findDueByLease(connection, [lease_id]);
            for(let j = 0; j < invoices.length; j++){
                
                let invoice = new Invoice({id: invoices[j].id});
                await invoice.find(connection);
                invoice.total();

                if(invoice.balance === 0) continue;

                if(amount_to_apply > 0){
                    let invoicesPayment = {};
                    if(amount_to_apply >= invoice.balance){
                        invoicesPayment = {
                            invoice_id: invoice.id,
                            date: oip.payment_date,
                            amount: Math.round(invoice.balance * 1e2) / 1e2
                        };
    
                        amount_to_apply -= invoice.balance;
                    } else if(amount_to_apply < invoice.balance){
                        invoicesPayment = {
                            invoice_id: invoice.id,
                            date: oip.payment_date,
                            amount: Math.round(amount_to_apply * 1e2) / 1e2
                        };
                        amount_to_apply = 0;
                    }

                    invoicesPayment.payment_id = oip.payment_id;
                     
                    await models.Payment.applyPayment(connection, invoicesPayment);
                } else {
                    break;
                }
            }

        }
    }
}

module.exports = Payment;

var Invoice = require(__dirname + '/../classes/invoice.js');
var Property = require(__dirname + '/../classes/property.js');
var Contact = require(__dirname + '/../classes/contact.js');
var Lease = require(__dirname + '/../classes/lease.js');

var Cash      = require(__dirname +'/../classes/payment_methods/cash.js');
var Check      = require(__dirname +'/../classes/payment_methods/check.js');
var Ach      = require(__dirname +'/../classes/payment_methods/ach.js');
var Card      = require(__dirname +'/../classes/payment_methods/card.js');
var GiftCard = require(__dirname +'/../classes/payment_methods/gift_card.js');
const PaymentEvent = require(__dirname + '/../events/payment.js');
const DelinquencyEvent = require('../events/delinquency');
const rounding = require('../modules/rounding');
const Enums = require(__dirname + '/../modules/enums');
