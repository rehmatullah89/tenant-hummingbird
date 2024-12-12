"use strict";

var models  = require(__dirname + '/../models');
let LeaseRentChangeModel = require(__dirname + '/../models/rent-management/lease_rent_change.js')
let PropertyRentManagementModel = require(__dirname + '/../models/rent-management/property_rent_management');
var settings    = require(__dirname + '/../config/settings.js');
var Promise = require('bluebird');
var validator = require('validator');
var moment      = require('moment');

var e  = require(__dirname + '/../modules/error_handler.js');

const getQueue = require("../modules/queue");
const Queue = getQueue('hummingbirdQueue');

var Product = require(__dirname + '/../classes/product.js');
const clsContext = require('../modules/cls_context');
var Checklist = require('../classes/checklist.js');
const Hash = require('../modules/hashes.js');
const Hashes = Hash.init();
class Lease {

    constructor(data){

      data = data || {};
        this.id = data.id || null;
        this.unit_id = data.unit_id || null;
        this.start_date = data.start_date || null;
        this.end_date = data.end_date || null;
        this.bill_day = data.bill_day || 1;
        this.create_invoice_day = data.create_invoice_day || 1;
        this.notes = data.notes || null;
        this.terms = data.terms || null;
        this.rent =  data.rent || 0;
        this.status = data.status || 0;
        this.token = data.token || null;
        this.achtoken = data.achtoken || null;
        this.send_invoice = data.send_invoice || 0;
        this.discount_id = data.discount_id || null;
        this.security_deposit = data.security_deposit || null;
        this.monthly = data.monthly || null;
        this.lease_standing_id = data.lease_standing_id || null;
        this.rent_paid_through = data.rent_paid_through || null;
        this.last_payment_date = data.last_payment_date || "";
        this.code = data.code || null;
        this.moved_out = data.moved_out || null;
        this.decline_insurance = data.decline_insurance || null;
        this.insurance_exp_month = data.insurance_exp_month || null;
        this.insurance_exp_year = data.insurance_exp_year || null;
        this.rent_change_exempt = data.rent_change_exempt || null;
        this.auction_status = data.auction_status || null;
        this.deny_payments = data.deny_payments || 0;
        this.created = data.created;
        this.payment_cycle = data.payment_cycle;
        this.to_overlock = data.to_overlock;
        this.Discounts = [];
        this.Promotions = [];
        this.Invoice = {};
        this.Tenants = [];
        this.Invoices = [];
        this.Payments = [];
        this.PaymentMethods = [];
        this.Checklist = [];
        this.Unit = {};
        this.msg = '';
        this.MaintenanceRequests = [];
        this.MaintenanceRequestCount= '';
        this.Reservation = {};
        this.Services = [];
        this.ApplicationServices = [];
        this.InsuranceServices = [];
        this.ReservationServices = [];
        this.move_in_costs = '';
        this.total_rent_due = '';
        this.balance =0;
        this.open_balance = 0;
        this.OpenInvoices =[];
        this.OpenPayments =[];
        this.PastDue = [];
        this.Ledger = [];
        this.Standing = {};
        // Currently there can be one vehicle in a lease
        this.Vehicles = {};
        this.MoveInInvoice = {};
        this.Transfer = null;
        this.Lead = {};
        this.Property = {};
        this.LeaseAuction = {};
        this.Uploads = [];
        this.Delinquency = {};
        this.has_open_invoice = false;
        this.created_by = data.created_by; 
        this.auto_pay_after_billing_date = data.auto_pay_after_billing_date;
        this.last_billed = data.last_billed;
        this.current_property_date = data.current_property_time || null;
        this.sensitive_info_stored = data.sensitive_info_stored || 0;
        this.total_rent_raises_count = data.total_rent_raises_count || 0;
        this.CreatedBy = {};
        this.last_rent_raise = data.last_rent_raise || null;
        this.last_rent_raise_amount =  data.last_rent_raise_amount || null;
        this.future_rent_raise =  data.future_rent_raise || null;
        this.future_rent_raise_amount =  data.future_rent_raise_amount || null;
        this.move_in_rent =  data.move_in_rent || null;
        this.is_transferred = data.is_transferred || 0;
        this.reservation_date =  data.reservation_date || null;
        this.Contact = {};
        this.offerToken = data.offerToken || null;
        this.move_in= {};
        this.stored_contents = "";
        this.idv_id = data.idv_id || null;
        this.transferred_from = data.transferred_from || null;
        this.exempted = false;
        this.modified_by = data.modified_by || null;
        this.statuses = [
            'active',
            'pending',
            'innactive',
            'ended'
        ]  
        this.revert_payment_cycle = null;
        this.enable_payment_cycles = null;
        this.PaymentCycle = {};
        this.PaymentCycleOptions = [];
         
        this.tier_type = data.tier_type || null;
        this.rent_change_id = data.rent_change_id = null
        this.rent_management = data.rent_management || {};
        return this;

    }

    async findActiveRentService(connection, date){
      return await Service.getActiveRentService(connection, this.id, date)
    }

    async findActiveInsuranceService(connection){
      return await Service.getActiveInsuranceService(connection, this.id);
    }

    async setCurrentLocalPropertyDate(connection, format = 'YYYY-MM-DD') {
      const property = await this.getProperty(connection);
			this.current_property_date = await property.getLocalCurrentDate(connection, format);
    }

    async getCurrentLocalPropertyDate(connection, format = 'YYYY-MM-DD') {
      if(!this.current_property_date) {
        await this.setCurrentLocalPropertyDate(connection, format);
      }

      return moment(this.current_property_date).format(format);
    }

    async setLeaseTemplate(connection) {
      const property = await this.getProperty(connection);
      const unit = await this.getUnit(connection);
      await property.getTemplates(connection, unit.type);
    }

    async getLeaseTemplate(connection) {
      const leasePropertyTemplate = this.Property?.LeaseTemplates && this.Property.LeaseTemplates[this.Unit?.type]?.Template;
      if(!leasePropertyTemplate) {
        await this.setLeaseTemplate(connection);
      }
      

      return this.Property.LeaseTemplates[this.Unit.type].Template;
    }

    async getPaymentCycleOptions(connection, payment_cycle){
      
      await this.getLeaseTemplate(connection);
       
      this.PaymentCycleOptions = this.Property.LeaseTemplates[this.Unit.type].Template.payment_cycle_options;
      this.revert_payment_cycle = this.Property.LeaseTemplates[this.Unit.type].Template.revert_payment_cycle;
      this.enable_payment_cycles = this.Property.LeaseTemplates[this.Unit.type].Template.enable_payment_cycles;
      let pc = payment_cycle || this.payment_cycle;
      
      if(!pc || !this.enable_payment_cycles ) return null; 
      
      let payment_cycle_option = this.PaymentCycleOptions.find(o => o.label.toLowerCase() === pc.toLowerCase());
      if(!payment_cycle_option) e.th(409, "This is not a valid payment cycle option.");
      
      payment_cycle_option.Promotion = new Promotion({id: payment_cycle_option.promotion_id});
      await payment_cycle_option.Promotion.find(connection);
       
      return payment_cycle_option;

    }
 

    async getActivePaymentCycle(connection, date){
      let property_date = this.current_property_date || await this.getCurrentLocalPropertyDate(connection); 

      let payment_cycle = await models.Lease.getActivePaymentCycle(connection, date || property_date, this.id);
      
      // this.payment_cycle = payment_cycle ? payment_cycle.payment_cycle : null; 
      this.PaymentCycle = payment_cycle; 

    }

    async getActivePaymentCyclesFromDateOnward(connection, date){
      let property_date = this.current_property_date || await this.getCurrentLocalPropertyDate(connection); 

      let payment_cycles = await models.Lease.getActivePaymentCyclesFromDateOnward(connection, date || property_date, this.id) || [];
      
      if(!this.PaymentCycle?.id)
        this.PaymentCycle = payment_cycles?.length > 0 ? payment_cycles[payment_cycles.length - 1] : {};

        return payment_cycles;
    }

    
    async getInvoicesInPaymentCycle(connection, payment_cycle = {}){
      if(!payment_cycle?.id && !this.PaymentCycle?.id){
        await this.getActivePaymentCycle(connection)
      }

      let start_date = payment_cycle?.start_date || this.PaymentCycle?.start_date; 
      let end_date = payment_cycle?.end_date || this.PaymentCycle?.end_date; 
      let invoices = await  models.Invoice.findInvoicesBetweenDates(connection,this.id,  start_date, end_date);

      return invoices;
    }


    async createPaymentCycleAdjustmentInvoice(connection, invoices, company_id, date){
      // must call findInvoicesToRefund first, and pass these invoices here 
      // must call getPaymentCycleOptions first
      // must call getActivePaymentCycle first
      let account_balance = 0;
      let adjustment_invoice = {};

      let first_credit_invoice = invoices.length ? invoices.find(i => i.credit > 0): {};

      let end_date = first_credit_invoice ? moment(first_credit_invoice.period_start) :  moment();
			let start_date = moment(this.PaymentCycle.start_date);
      // how many months have elapsed?
			let months = end_date.diff(start_date, 'months')
      
      
      // see if they support a quarterly payment cycle;
      // sort highest to lowest, and find the cycle with a period less than the number of elapsed months. 
      let fallback_payment_cycle = this.PaymentCycleOptions.sort(( a, b) =>  a.period < b.period ? 1 : -1 ).find(p => p.period < months);
        
      let months_at_full_price = 0;
      let months_in_payment_cycle = 0;
      if(!fallback_payment_cycle) {
        // convert to monthly 
        // months_in_payment_cycle = 1;
        months_at_full_price = months;
      } else {
        months_in_payment_cycle = Math.floor(months / fallback_payment_cycle.period) * fallback_payment_cycle.period;
        months_at_full_price = months % fallback_payment_cycle.period;

      }
      
      
        // get all invoices in payment cycle, 
				let payment_cycle_invoices = await this.getInvoicesInPaymentCycle(connection); 

        // loop through and remove discounts for any invoices already past
        for(let i = 0; i < payment_cycle_invoices.length; i++){
          let invoice = new Invoice(payment_cycle_invoices[i]);
          await invoice.find(connection);
          invoice.Lease = {};
          invoice.id = null;
          await invoice.total();
          
          if(i < months_in_payment_cycle + months_at_full_price){
            // remove the old discount
            invoice.removeDiscounts();
          }
          await invoice.total();
          
          if(i < months_in_payment_cycle){
            // add the new discount
            let discount = new Discount({
              start: invoice.period_start,
              end: invoice.end,
              promotion_id: fallback_payment_cycle.promotion_id,
              Promotion: fallback_payment_cycle.Promotion,
              lease_id: this.id,
              value: fallback_payment_cycle.Promotion.value,
              type: fallback_payment_cycle.Promotion.type,
              pretax: fallback_payment_cycle.Promotion.pretax,
              round: fallback_payment_cycle.Promotion.round

            })
            await invoice.addDiscount(connection, discount);
            await invoice.total();
          } 

          account_balance += invoice.balance; 
        }
        console.log("account_balanceaccount_balance", account_balance)
        // if there is an account balance, lets make a new invoice and total it up. 
        if(account_balance){

          let product = new Product({
            name: "Rent Adjustment"
          })
          
          try {
            await product.findByName(connection, company_id);
          } catch(err){
            e.th(404, "No rent adjustment product was found. Cannot process refund")

          }

          var s = new Service({
            lease_id: this.id,
            product_id: product.id,
            price: account_balance,
            qty: 1,
            start_date: date,
            end_date: date,
            recurring: 0,
            prorate: 0,
            prorate_out: 0,
            service_type: 'lease',
            });
          
            s.Product = product;
      
            adjustment_invoice = new Invoice({
              lease_id: this.id,
              user_id: null,
              date: date,
              due: date,
              company_id: company_id,
              type: "auto",
              status: 1
            });
          adjustment_invoice.Lease = this;
          adjustment_invoice.Company = {
            id: company_id
          };
          
          await adjustment_invoice.makeFromServices(connection, [s], this, moment(date, 'YYYY-MM-DD').startOf('day'), moment(date, 'YYYY-MM-DD').startOf('day'), [], company_id);
          adjustment_invoice.total();
        }


        return adjustment_invoice;

    }


    async removePaymentCycle(connection, date, params = {}){
      let { delete_discount_ids = [] } = params;
      if(date){
        await models.Lease.removePaymentCycle(connection, date, this.id);
        if(delete_discount_ids.length > 0)
          await models.Discount.deleteLeasesFromDiscountsByIds(connection, delete_discount_ids);
      }
      this.payment_cycle = null;
      await models.Lease.save(connection, {payment_cycle: null}, this.id);
      this.PaymentCycle = {};
    }

    async saveMoveInPaymentCycle(connection, start_date, end_date, company_id, dryrun){

      if(!this.payment_cycle) e.th(400, "No payment cycle set.");
      let payment_cycle = this.PaymentCycleOptions.find(po => po.label.toLowerCase() === this.payment_cycle.toLowerCase());
      if(!payment_cycle) e.th(404, "Payment Cycle not available for this lease.");

      if(dryrun) return payment_cycle;

      let discount = await this.addPromotion(connection, payment_cycle.promotion_id, company_id, false, null, null, end_date);
      
      let current_rent_service = await this.findActiveRentService(connection, start_date)
      
      let payload = {
        lease_id: this.id,
        start_date: start_date.format('YYYY-MM-DD'),
        end_date: end_date.format('YYYY-MM-DD'),
        rent: discount.type === 'percent' ? utils.r(current_rent_service.price * (1 - (discount.value / 100))) : utils.r(current_rent_service.price - discount.value),
        payment_cycle: payment_cycle.label,
        periods: payment_cycle.period,
        discount_id: discount.id,
        pay_by_date: start_date.clone().add(this.revert_payment_cycle, 'day').format('YYYY-MM-DD')
      }

      await models.Lease.save(connection, {payment_cycle: this.payment_cycle}, this.id);
      await models.Lease.savePaymentCycle(connection, payload);

      return payment_cycle;

    }

    async savePaymentCycle(connection, nextBillingDate, billed_months, company_id, dryrun, payment_cycle = null){
      // Apply discount here?
      // await models.Lease.save(connection, {payment_cycle: this.payment_cycle}, this.id);
      // end current payment cycle as of today, 
      // save discount here. 

      /* QAL-503 changes */
      // let currentPaymentCycles = await models.Lease.getActivePaymentCycle(connection, nextBillingDate.format('YYYY-MM-DD'), this.id);
      
      // if(currentPaymentCycles){
      //   e.th(409, "This lease is already in an active payment cycle during this time.")
      // }

      // transfers can pass in an override, otherwise, we default to whats on the lease.

      if(!payment_cycle){
        if(!this.payment_cycle) e.th(400, "No payment cycle set.")
        payment_cycle = this.PaymentCycleOptions.find(po => po.label.toLowerCase() === this.payment_cycle.toLowerCase());
      }
      
      if(!payment_cycle) e.th(404, "Payment Cycle not available for this lease.");
      
      billed_months = billed_months || payment_cycle.period;
      if(billed_months % payment_cycle.period !== 0) e.th(404, `Payment Cycles must be billed in groups of ${payment_cycle.period} months.`);
      
      const shouldGeneratePaymentCycle = await this.shouldGenerateNewPaymentCycle(connection, { 
        next_billing_date: nextBillingDate.format('YYYY-MM-DD')
      });

      if(dryrun) return payment_cycle;

      let current_rent_service = await this.findActiveRentService(connection, nextBillingDate);
 
      if(!shouldGeneratePaymentCycle) {
        return;
      }

      for(let i = 0; i < billed_months / payment_cycle.period; i++){

        let endBillingDate = nextBillingDate.clone().add(payment_cycle.period, 'months').subtract(1, 'day');
        
        let discount = await this.addPromotion(connection, payment_cycle.promotion_id, company_id, false, nextBillingDate, payment_cycle.period);
        
        let payload = {
          lease_id: this.id,
          start_date: nextBillingDate.format('YYYY-MM-DD'),
          end_date: endBillingDate.format('YYYY-MM-DD'),
          rent: discount.type === 'percent' ? utils.r(current_rent_service.price * (1 - (discount.value / 100))) : utils.r(current_rent_service.price - discount.value),
          periods: payment_cycle.period,
          payment_cycle: payment_cycle.label,
          discount_id: discount.id,
          pay_by_date: nextBillingDate.clone().add(this.revert_payment_cycle, 'day').format('YYYY-MM-DD')
        }
        
        await models.Lease.save(connection, {payment_cycle: this.payment_cycle}, this.id);
        await models.Lease.savePaymentCycle(connection, payload);

        nextBillingDate = endBillingDate.add(1, 'day'); 

      }
      
      
      return payment_cycle;

    }

    async getUnit(connection) {
      if(!this.Unit?.id) {
        await this.findUnit(connection);
      }

      return this.Unit;
    }

    
    async setLastBilled(connection) {
      let latestInvoice = await models.Invoice.findLatestRentInvoice(connection, {
				lease_id: this.id
			});

      const currentLocalDate = await this.getCurrentLocalPropertyDate(connection);
      const nextBillingDate = this.getNextBillingDate(moment(currentLocalDate));

      // this.last_billed = moment(latestInvoice.period_end) > moment(nextBillingDate).subtract(1, 'day') ? 
      //   moment(latestInvoice.period_end) : 
      //   moment(nextBillingDate).subtract(1, 'day');
      // this.last_billed = moment(this.last_billed).format('YYYY-MM-DD');
      
      if(latestInvoice)
        this.last_billed = moment(latestInvoice.period_end).format('YYYY-MM-DD');
      else
        this.last_billed = moment(nextBillingDate).subtract(1, 'day').format('YYYY-MM-DD');
    }

    // returns max of latest rent invoice -> period end AND actual (next billing day - 1) irrespective of generation
    async getLastBilledDate(connection) {
      if(!this.last_billed) {
        await this.setLastBilled(connection);
      }
      
      return this.last_billed;
    }

    async getOpenInvoices(connection) {
      if(!this.OpenInvoices?.length) {
        await this.getCurrentBalance(connection);
      } 

      return this.OpenInvoices;
    }

    async setActiveDiscounts(connection, payload = {}) {
      const { date, discountType } = payload;

      let discountList = await models.Promotion.findActiveDiscounts(connection, this.id, moment(date).clone().format('YYYY-MM-DD'));
			for (let i = 0; i < discountList.length; i++) {
        if(!discountType || discountList[i].type == discountType) {
          let discount = new Discount({ id: discountList[i].id });
  				await discount.find(connection);
	  			this.Discounts.push(discount);
        }
			}
    }

    async getActiveDiscounts(connection, payload = {}) {
      if(!this.Discounts?.length) {
        await this.setActiveDiscounts(connection, payload);
      }

      return this.Discounts;
    }



    async validate(connection, hold_token, reservation_id, edit_lease){

        var momentStart;
        var momentEnd;
        let error;

        if(!validator.isDate(this.start_date + '')) {
          e.th(400,"Please enter a valid start date")
        }

        if(validator.isEmpty(this.unit_id + '')) {
          e.th(500,"An error occurred. Please try refreshing your browser")
        }

        momentStart = moment(this.start_date, 'YYYY-MM-DD').startOf('day');
        momentEnd = moment(this.end_date, 'YYYY-MM-DD').startOf('day');

        if(momentStart > momentEnd ) {
          e.th(400,"Your end date must be after your start date")
        }

        if(!this.unit_id) {
          e.th(500, "unit id not set")
        }

        // if we are editing lease and lease is pending state then it will igonre the conflict otherwise it will check for any conflicts.
        if (!edit_lease || this.status !== 2) {
          let conflicts = await models.Lease.findLeaseConflict(connection, this);
          console.log("conflicts", conflicts);
          if(conflicts.length){
            e.th(409, "Your dates overlap with an existing lease starting on " + moment(conflicts[0].start_date).format('MM/DD/YYYY') + ". Please check your dates and try again.")
          }
        }

        let reservation = await models.Reservation.findByUnitId(connection, this.unit_id)
        if(reservation.length && reservation[0].id !== reservation_id){
          e.th(409, "This unit is reserved.")
        }



        let hold = await models.Unit.getHold(connection, this.unit_id);
        if(hold && hold.id !== hold_token){
          e.th(409, "This unit is being held by another customer.")
        }
    }

    async update(connection, params) {
      if(!this.id) e.th(500, "LeaseId is required to update data");

      let updatedLease = {};
      for (let p in params) {
        updatedLease[p] = params[p];
        this[p] = params[p];
      }

      await models.Lease.save(connection, updatedLease, this.id);

    }

    async save(connection, hold_token, reservation_id, edit_lease) {

        await this.validate(connection, hold_token, reservation_id, edit_lease);

        var save = {
            id: this.id,
            unit_id: this.unit_id,
            start_date: this.start_date,
            idv_id: this.idv_id,
            end_date: this.end_date,
            bill_day: this.bill_day,
            create_invoice_day: this.create_invoice_day,
            notes: this.notes,
            terms: this.terms,
            rent: this.rent,
            security_deposit: +(this.security_deposit||0),
            token: this.token,
            status: this.status,
            achtoken: this.achtoken,
            send_invoice: this.send_invoice,
            discount_id: this.discount_id,
            monthly: this.monthly,
            lease_standing_id: this.lease_standing_id,
            code: this.code,
            moved_out: this.moved_out,
            insurance_exp_month: this.insurance_exp_month,
            insurance_exp_year: this.insurance_exp_year,
            rent_change_exempt: this.rent_change_exempt,
            deny_payments : this.deny_payments,
            auction_status: this.auction_status,
            payment_cycle: this.payment_cycle,
            created_by: this.created_by,
            auto_pay_after_billing_date: this.auto_pay_after_billing_date,
            advance_rental: moment(this.start_date, 'YYYY-MM-DD').isAfter(moment(),'day'),
            sensitive_info_stored: this.sensitive_info_stored,
            modified_by: this.modified_by
        };


        if(this.status === 'pending'){
            save.status = 2;
        }

        if(this.status === 'active' || this.status === 'innactive' || this.status === 'ended' ) {
            save.status = 1;
        }

        if(!save.status) save.status = 0;

        let result = await  models.Lease.save(connection, save, this.id)
       
        if (result.insertId) this.id = result.insertId;
        return true;


    }

    async updateAuctionStatus(connection, status){
      await  models.Lease.updateAuctionStatus(connection, status, this.id);
      let standing = "Auction";

      if(status === Enums.LEASE_AUCTION_STATUS.COMPLETE){
        return true;
      }

      if(status === Enums.LEASE_AUCTION_STATUS.SCHEDULE){
        standing = "Active Lien";
      }

      this.updateStanding(connection, standing);
      return true;
    }

    async close(connection, move_out, user_id){

      await this.getCurrentBalance(connection);

      await models.Lease.save(connection, {
        moved_out: move_out,
        end_date: move_out,
        modified_by: user_id,
        moved_out_by: user_id
      }, this.id);

      clsContext.push(Enums.EVENTS.END_DELINQUENCY, { 
				lease_ids: [this.id],
        lease_event_type: Enums.LEASE_AUCTION_STATUS.MOVE_OUT
			});
    }

    async create(connection, unit, template, contacts, company_id){

      await this.save(connection);

      let default_standing = await models.Lease.getDefaultStanding(connection, company_id);

      let standing = await this.saveStanding(connection, default_standing.id);

      //let rentProduct = await models.Product.findRentProduct(connection, company_id);
      await unit.getProduct(connection);
      let rentProduct = unit.Product;

      rentProduct.taxable = template.tax_rent;
      rentProduct.prorate = template.prorate_rent;
      rentProduct.prorate_out = template.prorate_rent_out;

      await unit.buildService(connection, this, rentProduct, this.start_date, this.end_date, this.rent, 1, rentProduct.prorate, rentProduct.prorate_out, 1, 'lease', 'lease');

      if(this.security_deposit){
        let securityProduct = await models.Product.findSecurityDepositProduct(connection, company_id);
        await unit.buildService(connection, this, securityProduct, this.start_date, this.start_date, this.security_deposit, 1, 0, 0, 0,  'lease', 'lease');
      }

      if(template && template.Services){
        for(let i = 0; i < template.Services.length; i++ ) {
          let service = template.Services[i];
          if(!service.optional && (service.service_type === 'lease' || service.service_type === 'insurance')){
            let s = new Service({
              lease_id: this.id,
              product_id: service.product_id,
              price: service.price,
              qty: service.qty,
              start_date: this.start_date,
              end_date: (service.recurring)? null: this.start_date,
              recurring: service.recurring,
              prorate: service.prorate,
              prorate_out: service.prorate_out,
              service_type: service.service_type,
              taxable: service.taxable,
              name: service.name
            });
            if( service.service_type === 'lease'){
              s.name = service.Product.name;

            } else if(service.service_type === 'insurance'){
              s.name = service.Insurance.name;
            }
            await s.save(connection);
          }
        }
      }


      if(template.Checklist){
        for(let i = 0; i < template.Checklist.length; i++ ) {
          let checklist = template.Checklist[i];
          let save = {
            lease_id: this.id,
            checklist_item_id: checklist.id,
            name: checklist.name,
            document_type_id: checklist.document_type_id,
            document_id: checklist.document_id,
            description: checklist.description,
            completed: 0,
            sort: checklist.sort
          };
          await models.Checklist.saveItem(connection, save)
        }

      }

      if(this.end_date){
          if (moment(unit.available_date) < moment(this.end_date)) {
            await unit.save(connection, { available_date: this.end_date});
          }
      }


      for(let i = 0; i < contacts.length; i++ ) {
        let data = {
          contact_id: contacts[i].id,
          lease_id: this.id,
          primary: body.primary || 0
        };

        await models.ContactLeases.save(connection, data);
      }



    }

    async createAndSaveChecklist(connection, checklist) {
      if(checklist){
        for(let i = 0; i < checklist.length; i++ ) {
          let save_checklist = checklist[i];
          let save = {
            lease_id: this.id,
            checklist_item_id: save_checklist.id,
            name: save_checklist.name,
            document_type_id: save_checklist.document_type_id,
            document_id: save_checklist.document_id,
            description: save_checklist.description,
            completed: 0,
            sort: save_checklist.sort
          };
          checklist[i].lease_id = await models.Checklist.saveItem(connection, save)
        }
        
      }

      return checklist
    }
    
    saveInvoice(connection, company_id){
        var _this = this;

        return Promise.resolve().then(function(){
            _this.Invoice.company_id = company_id;
            return _this.Invoice.save(connection);

        }).then(function(saveRes){
            if(!saveRes) throw new Error(_this.Invoice.msg);
            return true;
        }).catch(function(err){
            console.log(err);
            _this.msg = err.toString();

            return false;
        })
    }

    async saveServices(connection, type){
        for(let i = 0; i < this.Services.length; i++ ){
            if(this.Services[i].service_type !== type) continue;
            this.Services[i].lease_id = this.id;
            await this.Services[i].save(connection);
        }
    }

    async saveChecklist(connection, type){
        for(let i = 0; i < this.Checklist.length; i++ ){
          this.Checklist[i].lease_id = this.id;
          this.Checklist[i].id = await models.Checklist.saveItem(connection, this.Checklist[i]);
        }
    }

    async saveStanding(connection, lease_standing_id, date){
      if(!this.id) e.th(500, "An error occurred");
      await models.Lease.saveStandingActivity(connection, this.lease_standing_id || null, lease_standing_id, this.id);
      await models.Lease.save(connection, { lease_standing_id: lease_standing_id}, this.id);
    }

    async saveDiscounts(connection, excluded = []){
      let lease_discounts = await models.Promotion.getDiscountByLeaseId(connection, this.id);

      for(let i = 0; i < this.Discounts.length; i++){
        console.log("excluded", excluded)
        if(excluded && excluded.indexOf(this.Discounts[i].promotion_id) >= 0) continue;
        let result = lease_discounts.find(ls => ls.promotion_id === this.Discounts[i].promotion_id);

        if(result){
          this.Discounts[i].id = result.id;
        }
        this.Discounts[i].lease_id = this.id;
        await this.Discounts[i].save(connection);
      }

      for (var j = 0; j < lease_discounts.length; j++) {
        let result = this.Discounts.find(p => p.promotion_id === lease_discounts[j].promotion_id);

        if(!result){
          await models.Promotion.removeDiscountFromLease(connection, this.id, lease_discounts[j].promotion_id);
        }
      }
    }

    // TODO, this should be in Payment Method Class
    async savePaymentMethod(connection, pm, company_id, payment){

      try{
        let address = {};
        if(!this.id) e.th(500, "Lease Id Not Set");
        if(pm.address){
          address = new Address({
            address: pm.address,
            address2: pm.address2,
            city: pm.city,
            state: pm.state,
            zip: pm.zip
          });

          await address.findOrSave(connection);

        }

        let propertyRes = await models.Property.findByLeaseId(connection, this.id);

        let property = new Property(propertyRes);
        let paymentMethod = await property.getPaymentMethod(connection, pm.type);


        paymentMethod.setAddress(address);
        paymentMethod.lease_id = this.id;

        await paymentMethod.setData(connection, pm, this.rent);
        await paymentMethod.save(connection, company_id, payment);

        paymentMethod.setNonce();
        if(paymentMethod.auto_charge){
          await models.Payment.resetAutoChargeStatus(connection, this.id, paymentMethod.id);
        }

        return paymentMethod;

      } catch(err) {
        console.log("In class", err)
        console.log(err.stack)
        throw err;

      }

    }

  // Used in worker server
    async suspendTenants(connection, company, property){

      if(property){
        this.Property = property;
      } else {
        if(!this.Property){
          await this.getProperty(connection, company.id);
        }
      }
      await this.Property.getAccessControl(connection);
      if(this.Property.Access) return;
      await this.getTenants(connection);
      for(let i = 0; i < this.Tenants.length; i++){
        await this.Property.Access.suspendUser(this.Tenants[i].contact_id);

        // save activity. Emit Event?
        let activity = new Activity();
        await activity.create(connection, company.id, null, 15, 35, this.Tenants[i].contact_id);
      }
    }

    async denyPayments(connection){
    if(!this.id) e.th(500, "Lease id not found");
    return await models.Lease.save(connection, {deny_payments: 1}, this.id)

    }

    async acceptPayments(connection){
      if(!this.id) e.th(500, "Lease id not found");
      return await models.Lease.save(connection, {deny_payments: 0}, this.id)

    }

    values() {
        var _this = this;

        var data = {
            id: _this.id,
            unit_id: _this.unit_id,
            checklist_id: _this.checklist_id,
            start_date: moment(_this.start_date, 'YYY-MM-DD').format('MM/DD/YYYY'),
            end_date: _this.end_date? moment(_this.end_date, 'YYY-MM-DD').format('MM/DD/YYYY'):null,
            bill_day: _this.bill_day,
            create_invoice_day: _this.create_invoice_day,
            notes: _this.notes,
            rent: _this.rent,
            security_deposit: _this.security_deposit,
            token: _this.token,
            achtoken: _this.achtoken,
            status: _this.status,
            send_invoice: _this.send_invoice,
            discount_id: _this.discount_id,
            monthly: _this.monthly,
            lease_standing_id: _this.lease_standing_id,
            auto_pay_after_billing_date: this.auto_pay_after_billing_date,
            sensitive_info_stored: this.sensitive_info_stored,

            Unit: _this.Unit,
            PaymentMethods: _this.PaymentMethods,
            Invoices: _this.Invoices,
            Invoice: _this.Invoice
        }

        return data;
    }

    findActive(connection){
        var _this = this;

        if(!this.id) {
            var error = new Error("Invalid lease id.");
            error.code = 404;
            throw error;
        }
        return models.Lease.findActiveById(connection, _this.id)
            .then(lease => _this.assembleLease(lease))
    }

    async find(connection){
      
        if(!this.id) e.th(500,"Invalid lease id.");

        let lease = await models.Lease.findById(connection, this.id);
        await this.assembleLease(lease);
    }

    async findUnitLeaseData(connection){
      
      if(!this.id) e.th(400, `Invalid Leases: '${Hashes.encode(this.id, connection.cid)}'`);
      let lease = await models.Lease.findUnitLeaseData(connection, this.id);
      if (!lease) e.th(400, `Invalid Leases: '${Hashes.encode(this.id, connection.cid)}'`);
      return lease
    }

    static async getConciseLeaseInfo(connection, company, searchParams, moveOut = false) {
      let totalLeases = []
      let leases = moveOut ? await models.Lease.findConciseMoveOutLeaseInfo(connection, company, searchParams) : 
                             await models.Lease.findConciseLeaseInfo(connection, company, searchParams);
      let leaseIds = leases.map((lease) => lease.id)
      let contacts =  await models.ContactLeases.findAllContacts(connection, leaseIds)
      let leaseContactMap = {}
      for (let contact of contacts) {
        if (contact.lease_id in leaseContactMap) {
          leaseContactMap[contact.lease_id].push({contact_id: contact.contact_id})
        } else {
          leaseContactMap[contact.lease_id] = [{contact_id: contact.contact_id}]
        }
      }
      if (leases && leases.length) {
        for (let leaseItem of leases) {
          leaseItem['Tenants'] = leaseContactMap[leaseItem.id] ?? []
          totalLeases.push(leaseItem);
        }
      }
      return totalLeases
    }
    /**
     * Return all leases in a company
     * @param {Object} connection Connection details
     * @param {String} company Company ID
     * @param {Object} searchParams Search parameters
     * @param {Boolean} count To return lease count
     * @returns {Array} Returns array of leases in a particular company
     **/
     static async findAll(connection, company, searchParams, count) {
      let totalLeases = []
      let leases = await models.Lease.findAll(connection, company, searchParams, count);
    
      if (leases && leases.length) {
        for (let leaseItem of leases) {
          let lease = new Lease(leaseItem);
          totalLeases.push(lease);
        }
        return totalLeases
      } else return leases;
    }

    async getActiveRent(connection){
      const activeRentService = await this.findActiveRentService(connection);
      this.rent = activeRentService ? activeRentService.price : this.rent;
    }

    //This method will return total rent raise count for the given lease id.
    async getTotalRentRaises(connection) {
      let total_rent_raises_count = await models.Rent_Change_Lease.getTotalRentRaisesCount(connection,this.id);
      this.total_rent_raises = total_rent_raises_count[0].count
    }

    assembleLease(lease){

        if(!lease) e.th(404,"Invalid lease id.");
        this.unit_id = lease.unit_id;
        this.start_date = lease.start_date;
        this.end_date = lease.end_date;
        this.bill_day = lease.bill_day;
        this.create_invoice_day = lease.create_invoice_day;
        this.notes = lease.notes;
        this.terms = lease.terms;
        this.code = lease.code;
        this.rent =  lease.rent;
        this.security_deposit = lease.security_deposit;
        this.monthly = lease.monthly;
        this.lease_standing_id = lease.lease_standing_id;
        this.token = lease.token;
        this.achtoken = lease.achtoken;
        this.send_invoice = lease.send_invoice;
        this.discount_id = lease.discount_id;
        this.lease_standing_id = lease.lease_standing_id;
        this.status = lease.status;
        this.decline_insurance = lease.decline_insurance;
        this.moved_out = lease.moved_out;
        this.created = lease.created;
        this.to_overlock = lease.to_overlock;
        this.insurance_exp_month = lease.insurance_exp_month;
        this.insurance_exp_year = lease.insurance_exp_year;
        this.rent_change_exempt = lease.rent_change_exempt;
        this.deny_payments = lease.deny_payments;
        this.auction_status = lease.auction_status;
        this.advance_rental = lease.advance_rental;
        this.created_by = lease.created_by;
        this.auto_pay_after_billing_date = lease.auto_pay_after_billing_date
        this.sensitive_info_stored = lease.sensitive_info_stored
        this.modified_by = lease.modified_by
        this.payment_cycle = utils.capitalizeFirst(lease.payment_cycle)
        this.idv_id = lease.idv_id;
        // Set lease status
        // if(this.end_date && moment(this.end_date, 'YYYY-MM-DD').format('x') < moment().startOf('day').format('x')){
        //     this.status = 'ended';
        // }

        // TODO  Reinclude this next API version.  Breaking for StoreLocal
        // else if(moment().startOf('day').format('x') < moment(this.start_date, 'YYYY-MM-DD').format('x')){
        //     this.status = 'innactive';
        // } else if(lease.status === 1){
        //     this.status = 'active';
        // } else if(lease.status === 2){
        //     this.status = 'pending';
        // }

        return Promise.resolve().then(() => true);
    }

    async findFull(connection, company_id, properties){

      await this.findUnit(connection);
      await this.Unit.getCategory(connection);


      await this.getUnitDetails(connection);
      await this.getProperty(connection, company_id, properties);
      await this.Property.getPhones(connection);
      await this.Property.getAddress(connection);
      await this.Property.getEmails(connection);

      await this.getTenants(connection);

      if(!this.Tenants.length) e.th(409,"Please add a tenant to this lease");
      for(let i = 0; i < this.Tenants.length; i++){

          try {
            await this.Tenants[i].Contact.findAccessCredentials(connection, this.Property )
          } catch(err){
            console.log("Could not get access credentials", err);
          }

          let relationships = await this.Tenants[i].Contact.getContactRelationships(connection);
          for(let j = 0; j < relationships.length; j++ ){
              relationships[j].Contact = new Contact({ id: relationships[j].related_contact_id});
              await relationships[j].Contact.find(connection,  company_id);
              this.Tenants[i].Contact.Relationships.push(relationships[j])
          }
      }
      await this.getChecklist(connection, company_id);
      this.getTotalRentDue(connection);
      await this.getMoveInCosts(connection);
      await this.getCosigners(connection, company_id);

      this.Unit.Utilities = await models.Unit.getUtilities(connection, this.Unit.id);
      this.Unit.Amenities = await models.Amenity.findUnitAmenityNames(connection,  this.Unit.id, this.Unit.type);
      this.AmenityTypes = await models.Amenity.findAllAmenities(connection, this.Unit.type, company_id);

      await this.getServices(connection);
      await this.getPastDueInvoices(connection);
      await this.getTotalDueInvoices(connection);
      await this.getPromotion(connection);



    }

    getUnitDetails(connection){
        var _this = this;
        return models.Unit.getUtilities(connection, _this.Unit.id).then(function(utilities){
            _this.Unit.Utilities = utilities;

            return models.Amenity.findUnitAmenityNames(connection,  _this.Unit.id, _this.Unit.type).then( amenities => {
                _this.Unit.Amenities = amenities;
                return true;
            })
        }).then(()=>{
            return models.Amenity.findAllAmenities(connection, _this.Unit.type).then(function(amenityTypes){
                _this.AmenityTypes = amenityTypes;
                return true;
            })
        })
    }

    async processChecklist(connection) {
      let auto_pay = this.PaymentMethods.map(a => {if(a.AutoPay) return a;})
			let active_military = this.Tenants.map(a => {if(a.Contact.active_military) return a.Contact.active_military})
      
      if (active_military[0] == null){
        active_military[0] = false;
      }
      
      let processed_checklist = []
      for(let i = 0; i<this.Checklist.length; i++){
          let check_list = new Checklist({id: this.Checklist[i].id});
          let item = await check_list.findItemById(connection);
          if (!!this.decline_insurance && item.document_tag === 'deny-coverage') {
              continue;
          }

          if (this.InsuranceServices.length === 0 && item.document_tag === 'enroll-coverage') {
              continue;
          }

          if (!auto_pay[0] && item.document_tag === 'autopay') {
              continue;
          }

          if (!active_military[0] && item.document_tag === 'military') {
              continue;
          }

          processed_checklist.push(this.Checklist[i]);
      }

      return processed_checklist;
    }

    async findUnit(connection){

        if(!this.unit_id) throw "Unit id not set";

        var unit = new Unit({
            id: this.unit_id
        });

        await unit.find(connection);
        //await unit.getSpaceLevel(connection);
        await unit.getAddress(connection);
        await unit.getFeatures(connection);
        await unit.setState(connection);
        
        this.Unit = unit;

    }

    async findAuction(connection, company_id){

      if(!this.id) throw "lease id not set";
      console.log(`Find Lease Auction for lease_id ${this.id}`);
      let lease_auction = await models.Lease_Auction.findByLeaseId(connection, this.id);

      if(lease_auction){
        let auction = new LeaseAuction({id : lease_auction.id});
        await auction.findById(connection, company_id);
        this.LeaseAuction = auction;
      }
  }

  async removeLeaseAuction(connection,company_id){
    await this.findAuction(connection,company_id);
    if(this.LeaseAuction?.id) {
      console.log(`Removing Lease Auction ${this.LeaseAuction}`);
      this.LeaseAuction.update(connection, {deleted_at: moment().format('YYYY-MM-DD HH:mm:ss')});
    }
  }

  async findRentPlanByLeaseId(connection) {
    let lease_rent_plan = await PropertyRentManagementModel.findRentPlanByLeaseId(connection, this.id)
    this.rent_management["rent_plan_id"] = lease_rent_plan?.rent_plan_id || null
    this.rent_management["rent_plan_status"] = lease_rent_plan?.status || null
    if(lease_rent_plan?.status === 'exempt') this.exempted = true;
  }

    async findRentChange(connection){
      if(!this.id) throw "lease id not set";
      let facility_date = await this.getCurrentLocalPropertyDate(connection);
      const date = this.start_date > facility_date? this.start_date : facility_date;
      let rent_change = await models.Service.findRentchange(connection, this.id, moment(date).format('YYYY-MM-DD'));
      this.rent_management['rent_change_id'] = await LeaseRentChangeModel.getPendingRentChangeId(connection, this.id);
      this.rent = rent_change;
      this.setRentSellVariance()
    }
    
    async getNextRentChange(connection) {
      let rentChange = await LeaseRentChangeModel.getNextRentChangeByLeaseId(connection, this.id, this.Property.id)
      
      this.rent_management["next_rent_change"] = null
      if (rentChange && rentChange?.new_rent_amt) {
        let rent_plan_name = null
        if (rentChange.rent_plan_id) {
          let rentPlan = await PropertyRentManagementModel.findPlanByRentChangeId(connection, rentChange.id)
          rent_plan_name = rentPlan.name
        }
        this.rent_management["next_rent_change"] = {
          schedule_rent: rentChange.new_rent_amt,
          rent_change: parseFloat((( rentChange.new_rent_amt - this.rent ) / this.rent * 100).toFixed(2)),
          rent_change_amt: parseFloat(( rentChange.new_rent_amt - this.rent ).toFixed(2)), 
          notification: this.setRentChangeNotificationDate(rentChange),
          schedule_date: moment(rentChange.effective_date).utc() || null,
          affect_timeline: Boolean(rentChange?.affect_timeline),
          rent_plan_name
        }

        if (rentChange.id) {
          let { notice_status, ...rent_change_notice } = await LeaseRentChangeModel.getNoticeStatusByRentChangeId(connection, rentChange.id);
          this.rent_management["notice_status"] = notice_status || null;
          this.rent_management["rent_change_notice"] = rent_change_notice || {};
        }
      }
    }
    
    async setRentSellVariance() {
      let variance = (( this.rent - this.Unit.price ) / this.Unit.price * 100).toFixed(2)
      this.rent_management = {
        ...this.rent_management,
        rent_sell_variance: {
          percentage: parseFloat(variance),
          amount: parseFloat((this.rent - this.Unit.price).toFixed(2))
        }
      }
    }

    async getLastRentChange(connection) {
      let rentChange = await LeaseRentChangeModel.getLastRentChangeByLeaseId(connection, this.id)
      this.rent_management["last_rent_change"] = null
      if (rentChange && rentChange?.new_rent_amt) {
        this.rent_management["last_rent_change"] = {
          rent_change: Math.round(rentChange.change_percentage),
          schedule_date: moment(rentChange.effective_date).utc() || null
        }
      }
    }

    setRentChangeNotificationDate(rentChange) {
      let { notification_status: status, notification_sent: date } = rentChange
      if (date) { return { status, date }}
      else {
        return {
          status,
          date: rentChange.effective_date ? rentChange.notification_sent || moment(rentChange.effective_date).subtract(rentChange.notification_period, 'days').utc(): null
        }
      }
    }

    async getTenants(connection){
        this.Tenants = [];
        if(!this.id) e.th(500,"Lease id not set");
        let cid = await models.Lease.findCompanyId(connection, this.id);
        if(!this.Property.id){
          await this.getProperty(connection);
        }
        let company_id = cid.company_id;
        let tenants = await models.ContactLeases.findTenantsByLeaseId(connection, this.id);
        for(let i = 0; i < tenants.length; i++){
          let contact = new Contact({id: tenants[i].contact_id});
          await contact.find(connection);
          await contact.getPhones(connection);
          await contact.getLocations(connection);
          await contact.getStatus(connection, [this.Property.id]);
          await contact.findMilitaryInfo(connection);
          tenants[i].Contact = contact;
          tenants[i].isPrimary = tenants[i].primary == '1' ? true : false;
          this.Tenants.push(tenants[i]);
        }
    }

    /* Takes a date and returns the next bill date */
    getBillDateAfterDate(date, anniversary_bill_day){
        //Do not pass default date here, or else it will break the scenario of Feb and March 29 and 30th
        let defaultCurrentMonth = date? false: true;
        date = date || moment();
        var today = date.format("D");
        var billday = anniversary_bill_day || this.bill_day;
        var daysInMonth = date.daysInMonth();
        var billDayDoesExist = billday <= daysInMonth;

        var daysInNextMonth = date.clone().add(1, 'months').daysInMonth();
        var nextMonthBillDayExist = billday <= daysInNextMonth;
        //INC-171 changes here
        if(parseInt(today) < parseInt(billday)){
          if(!billDayDoesExist && today < daysInMonth){
            return date.endOf('month').startOf('day');
          } else if(!billDayDoesExist && nextMonthBillDayExist && today == daysInMonth){
            return date.add(1, 'months').date(billday).startOf('day');
          } else if(!billDayDoesExist && today == daysInMonth) {
            // Specific scenario where today is last day of the month
            return date.add(1, 'months').endOf('month').startOf('day');
          }
          return date.date(billday).startOf('day');
        } else {
          let day = date.format('D');
          let month = date.format('M');
          // Special case for billday 29 and 30 for the month of Feburary and March.
          if(month == 3 && (day == 30 || day == 29)){
            return !defaultCurrentMonth ? date.add(1, 'month').date(billday).startOf('day'): date.date(billday).startOf('day');
          }
          if(!nextMonthBillDayExist){
            return date.add(1, 'months').endOf('month').startOf('day')
          }
          return date.add(1, 'month').date(billday).startOf('day');
        }

    }

    async getProductDetails(connection, product, property){

    if(property){
      this.Property = property;
    } else {
      await this.getProperty(connection);
    }
    return await this.Property.getProductDetails(connection, product.id, this.rent);

  }

    getNextBillDate(lastBillingDate, anniversary_bill_day){
        var nextBillDateFromToday = this.getBillDateAfterDate(lastBillingDate, anniversary_bill_day);
        var nextBillDateFromLeaseStart = this.getBillDateAfterDate(moment(this.start_date, 'YYYY-MM-DD'), anniversary_bill_day);
        return nextBillDateFromToday.isSameOrAfter(nextBillDateFromLeaseStart)? nextBillDateFromToday : nextBillDateFromLeaseStart;
    }

    /*
    *
    *   START - GREATER of LAST BILLING END + 1 DAY & LEASE START DATE
    *    END - LESSOR of ( NEXT BILLING DATE + ADDITIONAL MONTHS ) - 1 DAY & LEASE END DATE
    *
    *   IF Anniversary discount is present - then follow next consecutive 1 month pattern until anniversary discount ends
     */

    async getCurrentInvoicePeriod(connection, lastBillingDate, additionalMonths = 0, leaseCreated){
      let leasePromotions;

      if(leaseCreated == false) {
        leasePromotions = this.Discounts;
      }
      else {
        leasePromotions = await this.findPromotionsByLeaseId(connection);
      }

      let invoicePeriod = await this.getBillDayByPromotion(connection, leasePromotions, lastBillingDate, leaseCreated);

      if(invoicePeriod != null) {
        return invoicePeriod;
      }

      if(lastBillingDate){
        lastBillingDate.clone()
      }

      // var nextBillingDate = this.getNextBillDate(lastBillingDate);
      // //INC-171 fix
      // var maxInvoicePeriod = null;
      // var targetInovicePeriodDate = nextBillingDate.clone().add(additionalMonths-1, 'months');

      // // TODO: this logic needs to be cleaned up.
      // var daysInTargetMonth = targetInovicePeriodDate.daysInMonth();
      // if(this.bill_day >  daysInTargetMonth){
      //   let daysInNextMonth = targetInovicePeriodDate.clone().add(1, 'months').daysInMonth();
      //   if(this.bill_day < daysInNextMonth){
      //     maxInvoicePeriod = targetInovicePeriodDate.clone().add(1, 'months').subtract(1,'day').date(this.bill_day).subtract(1,'days').startOf('day');
      //   }else{
      //     maxInvoicePeriod = targetInovicePeriodDate.add(1, 'months').endOf('month').subtract(1, 'day').startOf('day');
      //   }
      // }else{
      //   maxInvoicePeriod = targetInovicePeriodDate.add(1, 'months').subtract(1,'day');
      // }
      // // maxInvoicePeriod = targetInovicePeriodDate.subtract(1,'day');
      //  var leaseStartMoment = moment(this.start_date, 'YYYY-MM-DD').startOf('day')

      //  let leaseEndMoment = moment(this.end_date, 'YYYY-MM-DD').startOf('day');
      // var invoicePeriodStart;
      // var invoicePeriodEnd;

      // if(lastBillingDate){
      //     //lastBillingDate.add(1, 'day');
      //     invoicePeriodStart = leaseStartMoment.isSameOrAfter(lastBillingDate) ? leaseStartMoment: lastBillingDate;
      // } else {
      //     invoicePeriodStart = leaseStartMoment;
      // }

      // if(this.end_date){
      //     invoicePeriodEnd = maxInvoicePeriod.isSameOrBefore(leaseEndMoment) ? maxInvoicePeriod: leaseEndMoment
      // } else {


      //     //invoicePeriodEnd = nextBillingDate.clone().add(additionalMonths, 'month').subtract(1,'day');
      //     invoicePeriodEnd = maxInvoicePeriod.clone();
      // }

      let leaseStartMoment = moment(this.start_date, 'YYYY-MM-DD').startOf('day')
      let leaseEndMoment = moment(this.end_date, 'YYYY-MM-DD').startOf('day');
      
      let invoicePeriodStart, invoicePeriodEnd, date;

      if(lastBillingDate)
        invoicePeriodStart = lastBillingDate.clone().add(1, 'Days');
      else 
        invoicePeriodStart = leaseStartMoment;

      let prop_date = await this.getCurrentLocalPropertyDate(connection);
      prop_date = moment(prop_date);

      // for move in or future move in invoice
      if(lastBillingDate) date = invoicePeriodStart;
      else if(invoicePeriodStart.isAfter(prop_date)) date = invoicePeriodStart;
      else date = prop_date;


      invoicePeriodEnd = this.getInvoicePeriodEnd(moment(date));
      if(this.end_date)
        invoicePeriodEnd = invoicePeriodEnd.isSameOrBefore(leaseEndMoment) ? invoicePeriodEnd: leaseEndMoment
    
      for(let i=0; i < additionalMonths - 1; i++){
        invoicePeriodEnd = this.getInvoicePeriodEnd(invoicePeriodEnd.clone().add(1,'Days'));
        
        if(this.end_date)
          invoicePeriodEnd = invoicePeriodEnd.isSameOrBefore(leaseEndMoment) ? invoicePeriodEnd: leaseEndMoment
      }
    

      return {
        start: invoicePeriodStart,
        end: invoicePeriodEnd
      }

    }
    
    // This receives invoice start date and returns invoice end date. Longest invoice would be for a month.
    getInvoicePeriodEnd(start_date, bill_day){
      if (!moment.isMoment(start_date)) return null;

      let is_month_changed = (start_date.format('M') - start_date.clone().add(1, 'Months').format('M')) != 0;
      let days_in_next_month = start_date.clone().add(1, 'months').daysInMonth();
      let days_in_month = start_date.clone().daysInMonth()
      let inv_start = +start_date.format('D')
      
      bill_day = bill_day || this.bill_day;

      let next_month_bill_day = bill_day <= days_in_next_month; 
      let bill_day_exists = bill_day <= days_in_month;


      if(is_month_changed && !next_month_bill_day && inv_start == bill_day)
        return start_date.add(1, 'Months').endOf('Month').subtract(1, 'Days');
      
      else if(inv_start >= bill_day || inv_start == days_in_month)
        return start_date.add(1,'Months').date(bill_day).subtract(1, 'Days');

      else if(bill_day_exists && inv_start < bill_day)
        return start_date.date(bill_day).subtract(1, 'Days');
      
      else if(!bill_day_exists && inv_start < days_in_month)
        return start_date.endOf('Month').subtract(1, 'Days')

    }

    IsAnniversaryPromotionEnding(discount, date) {
      const promotionEndDate = discount.end;
      let invoiceStartMoment = moment(date).format('YYYY-MM-DD');

      if(promotionEndDate == invoiceStartMoment) {
        return true;
      }
      return false;
    }

    IsAnniversaryPromotionStarted(discount, date) {
      const promotionEndDate = discount.end;
      let invoiceStartMoment = moment(date).format('YYYY-MM-DD');

      if(promotionEndDate > invoiceStartMoment) {
        return true;
      }
      return false;
    }

    async getBillDayByPromotion(connection, discounts, date, leaseCreated){
      let invoicePeriodStart = date && date.clone() || moment(this.start_date, 'YYYY-MM-DD').startOf('day');
      let invoicePeriodEnd;

      let isAnniversaryMannerDiscount = false;
      const fixedRentMonthDiscount = discounts.find(discount => discount.type == 'fixed');
      let discount = null;

			if(fixedRentMonthDiscount) {
				discount = await models.Promotion.getById(connection, fixedRentMonthDiscount.promotion_id);
        if(discount.consecutive_pay && 
            discount.months > 1) 
            {
          isAnniversaryMannerDiscount = true;
				}
      }

      let isAnniversaryMannerDiscountStarted = false, isAnniversaryMannerDiscountEnding = false;
      if(isAnniversaryMannerDiscount) {
        const leaseStartMoment = moment(this.start_date, 'YYYY-MM-DD').startOf('day')
        const leaseEndMoment = moment(this.end_date, 'YYYY-MM-DD').startOf('day');

        //Check: We can do it without the db call?
        isAnniversaryMannerDiscountStarted = await models.Discount.findIfActivePromotionStarted(connection, this.id, invoicePeriodStart.clone().format('YYYY-MM-DD'));
        isAnniversaryMannerDiscountEnding = await models.Discount.findIfActivePromotionEnding(connection, this.id, invoicePeriodStart.clone().format('YYYY-MM-DD'));
        if(leaseCreated == false) {
          isAnniversaryMannerDiscountStarted = this.IsAnniversaryPromotionStarted(fixedRentMonthDiscount, invoicePeriodStart.clone());
          isAnniversaryMannerDiscountEnding = this.IsAnniversaryPromotionEnding(fixedRentMonthDiscount, invoicePeriodStart.clone());
        }

        if(isAnniversaryMannerDiscountStarted && !isAnniversaryMannerDiscountEnding) {
          if(date != null) {
            invoicePeriodStart = invoicePeriodStart.add(1, 'days');
          } else {
            invoicePeriodStart = leaseStartMoment.isSameOrBefore(invoicePeriodStart) ? leaseStartMoment: invoicePeriodStart;
          }

          invoicePeriodEnd = invoicePeriodStart.clone().add(1, 'months').subtract(1, 'day');
        } else if(isAnniversaryMannerDiscountEnding) {
          invoicePeriodStart = invoicePeriodStart.add(1, 'days');
          //let nextBillingStartDate = this.getNextBillDate(invoicePeriodStart.clone()); 
          //invoicePeriodEnd = nextBillingStartDate.clone().subtract(1, 'day');
          invoicePeriodEnd = this.getInvoicePeriodEnd(invoicePeriodStart.clone())
        } else {
          return null;
        }

        if(this.end_date){
            invoicePeriodEnd = invoicePeriodEnd.isSameOrBefore(leaseEndMoment) ? invoicePeriodEnd: leaseEndMoment
        }

        return {
          start: invoicePeriodStart,
          end: invoicePeriodEnd
        }
      } else {
        return null;
      }
    }

    getNextBillingDate(date, billToday){

      date = date || moment(); //Ideally it should be property's current date
      /*
      var today = date.format("D");
        var billday = this.bill_day;

        if((parseInt(today) < parseInt(billday) ) || (billToday && parseInt(today) == parseInt(billday))   ){
            if(billday > date.daysInMonth()){
              return date.endOf('month').startOf('day');
            }
            return date.date(billday).startOf('day');
        } else {
            return date.add(1, 'month').date(billday).startOf('day');
        }
        */

        return this.getInvoicePeriodEnd(date).add(1, 'Days');

    }

    async getBillingIntervals(connection, params = {}){
      
      let billingIntervals = {};
      let { past_months, future_months } = params;
      let propertyCurrDate = await this.getCurrentLocalPropertyDate(connection);

      //Current billing period
      let start = propertyCurrDate;
      let end = this.getInvoicePeriodEnd(moment(propertyCurrDate)).format('YYYY-MM-DD');

      billingIntervals.current = {start, end};

      //Future billing period
      let futureIntervals = [];
      for (let i = 0; i < future_months; i++){
        start = moment(end).add(1, 'Days').format('YYYY-MM-DD');
        end = this.getInvoicePeriodEnd(moment(start)).format('YYYY-MM-DD');
        futureIntervals.push({start, end});
      }
      billingIntervals.future = futureIntervals;

      let pastIntervals = [];
      if(past_months){
        let limit = parseInt(past_months);
        let intervalResponse = await this.getPastBillingIntervals(connection, { date: propertyCurrDate, limit});
        if(intervalResponse && intervalResponse.length){
          pastIntervals = [...intervalResponse];
        }
      }
      
      billingIntervals.past = pastIntervals;

      return billingIntervals;
    }

    getPastBillingIntervals(connection, params){
      return models.Invoice.findPastBillingIntervals(connection, this.id, params);
    }

    getLastBillingDate(connection, activeInvoice = true){
        return models.Invoice.findLastBilled(connection, this.id, activeInvoice);
    }

    getCosigners(connection, company_id){
        var _this = this;

        // TODO support multiple cosigners?

        return Promise.mapSeries(this.Tenants, (t, i) => {
            return models.Cosigner.findByTenantId(connection, t.id, _this.id).then(function(c){

                if(!c) return true;

                var cosigner = new Contact({id: c[0].related_contact_id});
                return cosigner.find(connection, company_id).then(()=>{
                    t.Cosigner = c;
                    return true;
                })
            })
        })
    }

    async findOpenInvoices(connection ){
        let invoices = await models.Billing.findOpenInvoicesByLease(connection, this.id, { paid: 0 });
        for(let i = 0; i < invoices.length; i++){
          let invoice = new Invoice({
            id: invoices[i].id
          });
          await invoice.find(connection)
          await invoice.total();
          this.OpenInvoices.push(invoice)
        };
    }

    async findInvoices(connection, options){

      let invoices = await models.Billing.findInvoicesByLease(connection, this.id, {}, options);
      for(let i = 0; i < invoices.length; i++){
        let invoice = new Invoice({
          id: invoices[i].id
        });
        await invoice.find(connection)
        await invoice.total();
        this.Invoices.push(invoice)
      };
    }

    async getOpenPayments(connection ){
        let payments = await models.Payment.findPaymentOpenPaymentsByLeaseId(connection, this.id);

        for(let i = 0; i < payments.length; i++){
          let payment = new Payment({
            id: payments[i].id
          });
          await payment.find(connection);
          await payment.getPaymentApplications(connection);
          this.OpenPayments.push(payment);
        }
    }

    async getPastDueInvoices(connection, date){
      let invoices = await models.Invoice.findPastDueByLease(connection, this.id, date);
      for(let i = 0; i < invoices.length; i++){
        let invoice = new Invoice({
          id: invoices[i].id
        });
        await invoice.find(connection);
        await invoice.total();
        this.PastDue.push(invoice)
      };
    }

    // find all unpaid invoices which are either past due or due today.
    async getTotalDueInvoices(connection){
      let invoices = await models.Invoice.findTotalDueByLease(connection, this.id);
      for(let i = 0; i < invoices.length; i++){
        let invoice = new Invoice({
          id: invoices[i].id
        });
        await invoice.find(connection);
        await invoice.total();
        this.TotalDue.push(invoice)
      };
    }

    async nextNonGeneratedBillingInvoice(connection) {
      const date = await this.getLastBilledDate(connection); 
      const nextBillingDate = moment(date).add(1, 'Days');
      return nextBillingDate;
    }

    async getDiscounts(connection, date, label) {
        this.Discounts = [];
        let discounts = await models.Promotion.findAllDiscounts(connection, this.id, date)
        for(let i = 0; i < discounts.length; i++) {
            let discount = new Discount(discounts[i]);
            await discount.find(connection);

            // To filter discounts or promotions if needed
            if(!label || label == discount.Promotion.label) {
              this.Discounts.push(discount);
            }
        }
    }

    async categorizeDiscountsData() {
      const leaseDiscounts = {
        discounts: {
          past: [],
          present: [],
          future: []
        },
        promotions: {
          past: [],
          present: [],
          future: []
        }
      }

      for(let i = 0; i < this.Discounts.length; i++) {
        const { label: discountLabel } = this.Discounts[i].Promotion;
        const { start: discountStartDate, end: discountEndDate } = this.Discounts[i];        
        const currentDate = (this.Property && this.Property.localCurrentDate) ? moment(this.Property.localCurrentDate) : moment();

        const isFutureDiscount = moment(discountStartDate).isAfter(currentDate);
        const isPastDiscount = moment(discountStartDate).isBefore(currentDate) && moment(discountEndDate).isBefore(currentDate);

        if(discountLabel === 'discount') {
          if(isFutureDiscount) {
            leaseDiscounts.discounts.future.push(this.Discounts[i]);
          } else if(isPastDiscount) {
            leaseDiscounts.discounts.past.push(this.Discounts[i]);
          } else {
            leaseDiscounts.discounts.present.push(this.Discounts[i]);
          }
        } else if(discountLabel === 'promotion') {
          if(isFutureDiscount) {
            leaseDiscounts.promotions.future.push(this.Discounts[i]);
          } else if(isPastDiscount) {
            leaseDiscounts.promotions.past.push(this.Discounts[i]);
          } else {
            leaseDiscounts.promotions.present.push(this.Discounts[i]);
          }
        }
      }

      return leaseDiscounts;
    }

    async endDiscount(connection, discountId, endDate) {
      const discount = new Discount({ id: discountId });
      await discount.find(connection);
      discount.end = endDate;
      await discount.save(connection);
    }

    async addDiscount(connection, promotionID, startDate) {
      let nextBillingInvoice;
      if(!startDate) {      
        nextBillingInvoice = await this.nextNonGeneratedBillingInvoice(connection);
      }

      const promotion = new Promotion({ id: promotionID });
      await promotion.find(connection);
      const { id, value, type, pretax } = promotion;

      const discountStartDate = startDate || nextBillingInvoice.format('YYYY-MM-DD');
      let discountEndDate = '';

      const discount = new Discount({
        id: null,
        promotion_id: id,
        coupon_id: null,
        start: discountStartDate,
        end: discountEndDate,
        lease_id: this.id,
        value: value,
        type: type,
        pretax: pretax
      });

      await discount.save(connection);
      return discount;
    }

    // TODO: See if functionality can be merged with addPromotions function
    async addPromotion(connection, promotionID, companyID, dryRun = false, invoicePeriodStart, months_override, invoicePeriodEnd) {
      
      const discount = new Discount({
        company_id: companyID,
        promotion_id: promotionID,
        lease_id: this.id
      });

      

      await discount.makeFromPromotion(connection, this, invoicePeriodStart, months_override, invoicePeriodEnd);
      
      await discount.findPromotion(connection);

      if(!dryRun) {
        await discount.save(connection); 
      }

      return discount;
    }

    async deleteDiscount(connection, discountID) {
      const discount = new Discount({ id: discountID });
      await discount.delete(connection); 
    }

    async updateDiscount(connection, oldDiscountId, newDiscountId, isFutureDiscountUpdated) {
      let nextBillingInvoice = await this.nextNonGeneratedBillingInvoice(connection);
      if (!validator.isDate(nextBillingInvoice + '')){
        nextBillingInvoice = this.getNextBillingDate();
      }

      const discountEndDate = nextBillingInvoice.clone().subtract(1, 'day');

        if(newDiscountId) {
          let all_discounts = await models.Promotion.getDiscountByLeaseId(connection, this.id);
          if (all_discounts.length) {
            for (let i=0; i<all_discounts.length; i++) {
              if(all_discounts[i].end) { continue; }
              await this.checkLineitemAndUpdate(connection, all_discounts[i].id, discountEndDate);
            }
            await this.addDiscount(connection, newDiscountId, nextBillingInvoice.format('YYYY-MM-DD'))
          } else {
            await this.addDiscount(connection, newDiscountId, nextBillingInvoice.format('YYYY-MM-DD'));
          }
        } else {
          await this.checkLineitemAndUpdate(connection, oldDiscountId, discountEndDate);
        }
    }

    async sortLeaseDiscounts(connection, discounts, date) {
      const sortedDiscounts = [];
      const leasePaymentCycle = this.payment_cycle
        ? await models.Lease.getPaymentCycle(connection, { lease_id: this.id, date })
        : [];
    
      if (leasePaymentCycle.length) {
        const paymentCycleDiscount = discounts.find(d => d.id === leasePaymentCycle[0].discount_id);
        if (paymentCycleDiscount) {
          sortedDiscounts.push(paymentCycleDiscount);
          discounts = discounts.filter(d => d.id !== leasePaymentCycle[0].discount_id);
        }
      }
    
      const promoList = discounts.filter(item => item.end !== null);
      promoList.sort((a, b) => a.id - b.id);
      sortedDiscounts.push(...promoList, ...discounts.filter(item => item.end === null));
    
      return sortedDiscounts;
    }
    
    async checkLineitemAndUpdate (connection, oldDiscountId, discountEndDate) {
      let discountLineItems = await models.Discount.getDiscountLineItems(connection, oldDiscountId);
      const oldDiscount = new Discount({ id: oldDiscountId });
      await oldDiscount.find(connection);

      if(discountEndDate < moment(oldDiscount.start) || !discountLineItems.length){
        await this.deleteDiscount(connection, oldDiscountId);
      } else {
        await this.endDiscount(connection, oldDiscountId, discountEndDate.format('YYYY-MM-DD'));
      }
    }

    async getProperty(connection, company_id, properties, loggedInUserId, permissions = [], api= {}){
      if(this.Property?.id) {
        return this.Property;
      }

      let property = null;
      if(this.id){
        property = await models.Property.findByLeaseId(connection, this.id);
      }else {
        property = await models.Property.findByUnitId(connection, this.unit_id);
      }
      
      this.Property = new Property(property);
      if(company_id){
        await this.Property.verifyAccess({connection, company_id, properties, contact_id: loggedInUserId, permissions, api})
      }

      return this.Property;
    }

    findAllDiscounts(connection, nextBilling){

        return models.Promotion.getDiscountByLeaseId(connection, this.id).map(d => {
            var discount = new Discount({
                id: d.id
            });

            return discount.find(connection).then(() => {
                this.Discounts.push(discount);
                return true;
            })
        });

    }

    async getReservation(connection){
        let r = await models.Reservation.findByLeaseId(connection, this.id)
        this.Reservation = r;
        let lead = await models.Lead.findByLeaseId(connection, this.id);
        this.Lead = lead;
    }

    async getServices(connection, excludeProducts, allServices = false) {
      
      let services_list = await models.Service.findAllByLeaseId(connection, this.id);
      
      for(let i = 0; i < services_list.length; i++) {
        let service = new Service(services_list[i]);
        await service.find(connection);
        await service.getLastBilled(connection);

        const excludeService = excludeProducts && service.Product && excludeProducts.includes(service.Product.default_type); 
        if(excludeService) continue;
        
        switch (service.service_type) {
          case 'insurance':
              if(allServices) {
                this.InsuranceServices.push(service);
                break;
              }
              let InsuranceServices = await Service.getActiveInsuranceService(connection, this.id, moment(this.start_date));
              this.InsuranceServices.push(InsuranceServices);
              break;
          case 'lease':
              this.Services.push(service);
            break;
          case 'reservation':
            this.ReservationServices.push(service);
            break;
          case 'application':
            this.ApplicationServices.push(service);
            break;
        }
      }
    }

    async getAllInsurances(connection) {
			await this.getServices(connection, null, true);
      
      for(let i = 0; i < this.InsuranceServices.length; i++) {
        this.InsuranceServices[i].insurance = await models.Insurance.findByProductId(connection, this.InsuranceServices[i].product_id);
      }

      return this.InsuranceServices;
    }

    getObjectStructure(object_name){

      if(object_name === 'discounts'){                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                
        return {
          discounts: {
            past: [],
            present: [],
            future: []
          },
          promotions: {
            past: [],
            present: [],
            future: []
          }
        }
      } else {
        return {
          [object_name]: {
            past: [],
            present: [],
            future: []
          }
        }
      }

    }

    getTime(startDate, endDate, currentDate){
        const isFuture = moment(startDate).isAfter(currentDate);
        const isPast = moment(startDate).isBefore(currentDate) && moment(endDate).isBefore(currentDate);  

        if(isFuture)  return 'future'
        else if(isPast) return 'past'
        else return 'present'  
    }

    getDataObject(data_label){

      switch (data_label) {
        case 'application':
            return this.ApplicationServices;
        case 'discounts':
            return this.Discounts;
        case 'services':
           return this.Services;
        case 'insurances':
         return this.InsuranceServices;
      }
    }

    categorizeData(data_labels) {

      if(!data_labels) e.th(500, "data label missing");

      let categorized_data = this.getObjectStructure(data_labels[0]);
      let data = this.getDataObject(data_labels[0])

      for(let i = 0; i < data.length; i++) {

        const startDate = data[i].start || data[i].start_date;
        const endDate = data[i].end || data[i].end_date;
        const currentDate = (this.Property && this.Property.localCurrentDate) ? moment(this.Property.localCurrentDate) : moment();

        let time = this.getTime(startDate, endDate, currentDate);
        const label = (data[i].Promotion && data[i].Promotion.label + 's')  || data_labels[0]; 
        categorized_data[label][time].push(data[i]);
      }
      
      return categorized_data;
    }    

    categorizeServices(){
     return this.categorizeData(['services'])
    }

    categorizeInsurances() {
      const insurances = this.categorizeData(['insurances']);
      insurances.declinedInsurance = this.getDeclinedInsuranceDetails();
      return insurances;
    }

    async getPromotion(connection){
        if(!this.promotion_id) return;
        let promotion = new Promotion({id: this.promotion_id});
        await promotion.find(connection);
        this.Promotion = promotion;
    }

    async getDiscount(connection){
      if(!this.discount_id) return;
      let discount = new Promotion({id: this.discount_id});
      await discount.find(connection);
      this.Discount = discount;
    }

    async getEligiblePromotions(connection, label = 'promotion') {
      if(!this.Unit?.id) {
        this.Unit = new Unit({ id: this.unit_id });
        await this.Unit.find(connection);
      } 

      if(!this.Unit.Promotions?.length) {
        await this.Unit.getPromotions(connection, label);
      }
  
      const leaseStartDateOfMonth = moment(this.start_date, 'YYYY-MM-DD').date();
      const leaseRentInvoices = await models.Invoice.findAll(connection, {
        leaseId: this.id,
        status: 1,
        defaultType: 'rent'
      }); 

      this.Unit.Promotions && this.Unit.Promotions.map(promotion => {
        let { 
          offset: promotionOffset, 
          days_threshold: promotionDaysThreshold, 
          consecutive_pay: isConsecutivePayPromotion,
          required_months: requiredMonthsToPayToBeEligibleForPromotion 
        } = promotion;

        if(isConsecutivePayPromotion) { 
          return 
        };

        const shouldMovePromotionToNextMonth = promotionOffset === 0 && promotionDaysThreshold !== 0 && leaseStartDateOfMonth > promotionDaysThreshold;
        promotionOffset = shouldMovePromotionToNextMonth ? promotionOffset + 1 : promotionOffset;
        const isPromotionEligibleStartDatePassed = (promotionOffset === 0 && promotionDaysThreshold === 0) || (leaseRentInvoices.length > promotionOffset);

        if(isPromotionEligibleStartDatePassed) {
          return;
        }

        promotion.months_to_pay = Math.max(0, requiredMonthsToPayToBeEligibleForPromotion - leaseRentInvoices.length);
        this.Promotions.push(promotion);
      });

      return this.Promotions;
    }

    getLeaseServices(connection){
        return models.Service.findLeaseService(connection, this.id).then(s => {
            this.Services = s;
        })

    }

    /*
    *
    *    For a given invoice period, find:
    *    - Recurring services within the time period,
    *    - One time services before INVOICE END DATE ???
    * */
    getCurrentServices(connection, company_id, period_start, period_end, start_limit){

        return Promise.resolve().then(() => {
            if(['auction_payment','move_out'].includes(this.auction_status)) return [];
            if(!period_start || !period_end) e.th(500, 'Please include invoice dates');
            if(this.end_date && moment(this.end_date, 'YYYY-MM-DD').startOf('day').format('x') < period_start.format('x')){
                e.th(409, "This lease has ended");
            }

            return models.Service.findBillableServices(connection, this.id, period_start, period_end, company_id, start_limit)
        }).mapSeries(s => {
            var service = new Service(s);
            return service.find(connection)
                .then(() => {
                    service.last_billed = s.last_billed;
                    return service;
                })
        })
    }

    async activate(connection, payload){
        let {company = {}, logged_in_user = {}, dryrun = false} = payload;
        if (this.status === 0){
          e.th(500, 'You cannot finalize a deleted lease.');
        }
        await models.Lease.save(connection, { status: 1 }, this.id);
        this.status = 1;

        await this.generateThresholdInvoice(connection, company, logged_in_user, dryrun);

        this.updateStanding(connection, "Current" )
    }

    async deleteLease(connection, company, admin_id){
      
      let ipbs = [];
      
      if (this.status === 1){
        e.th(500, 'You are trying to delete a lease that has already been finalized.');
      }

      if(this.status === 2){
        let invoices = await models.Lease.findInvoicesByLeasesId(connection, this.id);
        for(let j=0; j < invoices.length; j++){
          let invoice = new Invoice(invoices[j]);

          let ipb_ids = await invoice.unapplyPayments(connection);
          let payment = new Payment();
          let ipb = [];

          if(ipb_ids && ipb_ids.length)
            ipb = await payment.findInvoicePaymentBreakdownById(connection, ipb_ids);
          
          if(ipb && ipb.length)
            ipbs = ipbs.concat(ipb);

          await invoice.void_invoice(connection, { id: admin_id });
        }
      }

      await models.Lease.deleteLease(connection, this.id, company.id, admin_id);
      let payment_ids = [...new Set(ipbs.map(item => item.payment_id))];

      for(let i = 0; i < payment_ids.length; i++) {
        let ipb_ids = (ipbs.filter(ipb => ipb.payment_id === payment_ids[i])).map(x=>x.id);
        let payment = new Payment({ id: payment_ids[i] });
        await payment.find(connection);
        await payment.canReverse(connection,{by_pass:true});
        await payment.refund(connection, company, payment.amount, "",  "Refund after pending lease delete", null, ipb_ids);
      }

      return true;
    }

    async getMoveInCosts(connection, company){
        if(!this.id) e.th(500, "Lease id not set");
        try {
          let inv = await  models.Invoice.findFirstLeaseInvoice(connection, this.id);

          let invoice = new Invoice(inv);
          await invoice.find(connection);
          await invoice.total();
          this.MoveInInvoice = invoice;
          return;
        } catch(err) {
          console.log(err);
        }
          // no invoice yet, create one from the services for today...
        let data = await this.generateMoveInInvoice(connection, 0, company, false);

         this.MoveInInvoice = {
            InvoiceLines: data.invoice.InvoiceLines,
            total_due: data.invoice.total_due,
            balance: data.invoice.balance,
            sub_total: data.invoice.sub_total,
            total_discounts: data.invoice.total_discounts,
            total_tax: data.invoice.total_tax
          }

    }

    async generateMoveInInvoice(connection, billed_months, company, save){

      let discount;
      if (this.promotion_id){
        let promotion = new Promotion({
          id: this.promotion_id
        });

        await promotion.find(connection);
        await promotion.verifyAccess(company.id);
        // TODO verify promotion is on unit

        discount = new Discount({
          promotion_id: promotion.id,
          lease_id: this.id,
          company_id: company.id
        });

        await discount.makeFromPromotion(connection, this);

        this.Discounts.push(discount);
      }


      if (this.discount_id){
        let discount = new Promotion({
          id: this.discount_id
        });

        await discount.find(connection);
        await discount.verifyAccess(company.id);
        // TODO verify promotion is on unit

        discount = new Discount({
          promotion_id: discount.id,
          lease_id: this.id,
          company_id: company.id
        });

        await discount.makeFromPromotion(connection, this);

        this.Discounts.push(discount);
      }

  		let isAnniversaryMannerDiscount = await Discount.findIfFixedAnniversaryPromotion(connection, discounts);

      let lastBillingDate =  await this.getLastBillingDate(connection);
      let lastBilled = lastBillingDate ? moment(lastBillingDate, 'YYYY-MM-DD HH:mm:ss').startOf('day'): null;
      let invoicePeriod = await this.getCurrentInvoicePeriod(connection, lastBilled, billed_months || 0, isAnniversaryMannerDiscount);

      let services = await this.getCurrentServices(connection, company.id, invoicePeriod.start.clone(), invoicePeriod.end.clone())
        .filter(s => s.service_type === 'lease' || s.service_type === 'insurance' );


      let datetime = await this.getCurrentLocalPropertyDate(connection, 'YYYY-MM-DD')
      let invoice = new Invoice({
        lease_id: this.id,
        user_id: null,
        date: moment(datetime).format('YYYY-MM-DD'),
        due: moment(datetime).format('YYYY-MM-DD'),
        company_id: company.id,
        type: "auto",
        status: 1
      });
      invoice.Lease = this;
      invoice.Company = company;

      await invoice.makeFromServices(
        connection,
        services,
        this,
        invoicePeriod.start,
        invoicePeriod.end,
        this.Discounts,
        company.id,
        false
      );

      await invoice.calculatePayments();
      //await invoice.getOpenPayments(connection);

      console.log("MOVE IN INVOICE", JSON.stringify(invoice, null, 2));
      console.log("totla_diue", invoice.total_due);

      return {
        invoice,
        discount
      }


    }

    getTotalRentDue(connection){
        var monthsDiff = moment(this.end_date).diff(moment(this.start_date), 'months', true);
        this.total_rent_due = monthsDiff * this.rent;
    }

    async getLastestInsuranceApplicationDate(connection) {
      const insurances = await models.Service.findAllByType(connection, this.id, 'insurance');
      let insurancesApplicationDates = [];

      for(let i = 0; i < insurances.length; i++) {
        let insuranceService = new Service({ id: insurances[i].id });
        await insuranceService.getLastBilled(connection);
        if(insuranceService.last_billed) {
          insurancesApplicationDates.push(moment(insuranceService.last_billed));
        }
      }

      return insurancesApplicationDates.length ? moment.max(insurancesApplicationDates).format('YYYY-MM-DD') : null;
    }

    getDeclinedInsuranceDetails() {
      return {
        status: this.decline_insurance,
        expirationMonth: this.insurance_exp_month,
        expirationYear: this.insurance_exp_year
      }
    }

    async declineInsurance(connection, decline, exp_month, exp_year){
        if(!this.id) e.th(500, "Lease id not set");

        return await models.Lease.save(connection, {
            decline_insurance: decline,
            insurance_exp_month: exp_month? exp_month : null,
            insurance_exp_year: exp_year? exp_year : null
        }, this.id)

    }

    sendActivationLinkToTenants(connection, company_id, tenant_id){
        var jobParams = [];

        this.Tenants.map(function(t){


            if(tenant_id && t.id != tenant_id) return;

            if(!t.user_id){
                jobParams.push({
                    category: 'welcomeEmail',
                    data: {
                        id: t.id,
                        action: 'email',
                        label: 'setup',
                        company_id: company_id
                    }
                });
            } else {
                jobParams.push({
                    category: 'welcomeEmail',
                    data: {
                        id: t.id,
                        action: 'email',
                        label: 'newLease',
                        company_id: company_id
                    }
                });
            }

            return Scheduler.addJobs(jobParams, function(err) {
                if (err) throw err;

            });
        });




    }

    async findPayments(connection, conditions, options) {
      let payments = [];
      let payments_result = await models.Payment.findPaymentsByLeaseId(connection, this.id, conditions, options);
      for (let i = 0; i < payments_result.length; i++) {
        let payment = new Payment({id: payments_result[i].id});
        await payment.find(connection)
        await payment.getPaymentApplications(connection);
        payments.push(payment);
      }
      this.Payments = payments

    }

    async findLedger(connection, conditions, options) {
      this.Ledger = await models.Lease.findLedgerByLeaseId(connection, this.id, conditions, options);
    }

    async findAutoPaymentMethods(connection, conditions, options){

        let payment_methods = await models.Payment.findPaymentMethodsByLeaseId(connection, this.id, false);
        for(let i = 0; i < payment_methods.length; i++){
            let pm = new PaymentMethod({id: payment_methods[i].payment_method_id } );
            await pm.find(connection);
            pm.setNonce();
            this.PaymentMethods.push(pm);
        }
    }

    async findPaymentMethods(connection, conditions, options, company_id){

    if(!this.Tenants.length){
      await this.getTenants(connection, company_id);
    }
    if(this.Property){
      await this.getProperty(connection, company_id);
    }

    for(let i = 0; i < this.Tenants.length; i++){
      let contact = new Contact({id: this.Tenants[i].contact_id});
      await contact.getPaymentMethods(connection, this.Property.id);
      for(let j = 0; j < contact.PaymentMethods.length; j++) {
        let pm = new PaymentMethod({id: contact.PaymentMethods[j].id } );
        await pm.find(connection);
        await pm.getAutoPayStatus(connection, this.id);
        pm.setNonce();
        this.PaymentMethods.push(pm);
      }
    }
  }

    convertPaymentMethodRentToValue(){

        this.PaymentMethods = this.PaymentMethods.map(pm => {
            pm.rent = Math.round(pm.rent * this.rent) / 1e2;
            return pm;
        })


    }

    async canAccess(connection, company_id, properties = []){
        let canAccess = await models.Lease.canAccess(connection, this.id, company_id, properties);
        if(canAccess) return true;
        e.th(403, "You do not have permission to access this resource");
    }

    async getChecklist(connection, company_id){
        if(!this.id) throw new Error("Lease id not set");

        let items = await models.Checklist.findChecklistItems(connection, this.id);
        for(let i = 0; i < items.length; i++){
          let item = items[i];
            item.Document = {};
            // if (!item.document_id) {
            // } else {
            //   let document = await models.Document.findById(connection, item.document_id);
            //   item.Document = document || null;
            // }

            if(item.checklist_item_id) {
              item.Checklist = await models.Checklist.findItemById(connection, item.checklist_item_id);
            }

            if (item.upload_id) {
              item.Upload = new Upload({id: item.upload_id});
              await item.Upload.find(connection);
              await item.Upload.findSigners(connection, company_id);
            }

            item.status = 'not_processed';
            if(item.Upload && item.Upload.id && !item.Upload.src){
              item.status = 'loading';
            }
            if(item.Upload && item.Upload.src){
              item.status = 'ready';
            }
            if(item.completed && (!item.Upload || item.Upload.downloading)){
              item.status = 'complete';
            }
            if(item.completed && item.Upload && !item.Upload.downloading){
              item.status = 'finished';
            }




          this.Checklist.push(item);
        }
    }

    async findMaintenance(connection, type, company){

        if(!this.id) e.th(500, 'Lease id not set');

        let maintenance_result = await models.Maintenance.findByLeaseId(connection, this.id, type);

        let requests = [];

        for(let i = 0; i < maintenance_result.length; i++){
    		let maintenance = new MaintenanceRequest({id: maintenance_result[i].id});
    		await maintenance.find(connection, company.id)
            requests.push(maintenance);

        }
        return requests;



    }

    async getChecklistItem(connection,checklist_item_id){
        let checklist_item = await models.Checklist.findLeaseItemById(connection, checklist_item_id);

        if(!checklist_item) e.th(404, "Checklist item not found");
        if(checklist_item.lease_id !== this.id) e.th(403, "you are not authorized to access this resource");
        return checklist_item

    }

    async createChecklistItem(connection, data, company_id, contact, ip_address, properties){

        await this.getChecklist(connection, company_id);

        //Todo move to validateChecklist call
        if(!data.name) e.th(400, "Please enter a name");

        var save = {
            lease_id: this.id,
            document_id: data.document_id,
            document_type_id: data.document_type_id,
            sort: this.Checklist.length,
            description: data.description,
            name: data.name,
            completed: 0
        };

        await connection.beginTransactionAsync();

        let item_id = '';
        try{

          if(!save.document_id) {
              item_id = await models.Checklist.saveItem(connection, save);
          } else {

              var document = new Document({ id: save.document_id });
              await document.find(connection);
              await document.verifyAccess(company_id);
              await document.setCompany(connection);

              await this.findFull(connection, company_id, properties);

              save.document_type_id = document.document_type_id;

              document.mergeFields(this);
              document.setPaths(this.id);

              let upload = await document.generate(connection, this, contact.id, ip_address);
              save.upload_id = upload.id;

              item_id = await models.Checklist.saveItem(connection, save)
          }

          await connection.commitAsync();

          save.id = item_id;

        } catch(err){
          connection.rollbackAsync();
          throw err;
        }

          return save;


    }

    async updateChecklistItem(connection, data, checklist_item_id){

        let checklist_item = await  this.getChecklistItem(connection,checklist_item_id);

        if(typeof data.upload_id !== 'undefined'){
          checklist_item.upload_id = data.upload_id;
        }

        if(typeof data.completed !== 'undefined') {
          checklist_item.completed = data.completed;
        }

        console.log("checklist_item", checklist_item);

        await models.Checklist.saveItem(connection, checklist_item, checklist_item.id);

        // If there is an upload_id, Remove signers,
        if( checklist_item.upload_id &&  !checklist_item.completed){
          await models.Upload.save(connection, { status: 0 },  checklist_item.upload_id );
         // await models.Checklist.removeSignersFromUpload(connection, checklist_item, checklist_item.id);
        }



        // return since we are updating an object that is not this class.
        return checklist_item;
    }

    async deleteChecklistUpload(connection, checklist_item_id){

      let checklist_item = await  this.getChecklistItem(connection, checklist_item_id);
      await models.Upload.delete(connection, checklist_item.upload_id);
      checklist_item.upload_id = null;
      checklist_item.completed = false;
      await models.Checklist.saveItem(connection, checklist_item, checklist_item.id);

    }

    async deleteChecklistItem(connection, data, checklist_item_id){


        let checklist_item = await  this.getChecklistItem(connection,checklist_item_id);

        try {
          await connection.beginTransactionAsync();

          if(checklist_item.upload_id){
              await models.Upload.delete(connection, checklist_item.upload_id);
          }

          await models.Checklist.deleteLeaseItem(connection, checklist_item.id);
          await connection.commitAsync();

        } catch(err){
          connection.rollbackAsync();
        }
    }

    async getCurrentBalance(connection, source) {

        if (!this.id) throw "Lease id not set";
        this.OpenInvoices = [];

        await this.getProperty(connection);
        let date = await this.Property.getLocalCurrentDate(connection);
        let invoices = await models.Billing.findOpenInvoicesByLease(connection, this.id, {source: source})

        for(let i = 0; i < invoices.length; i++ ){
            let inv = new Invoice(invoices[i]);
            await inv.find(connection);
            await inv.total();
            this.OpenInvoices.push(inv);
        }

        this.has_open_invoice = (this.OpenInvoices && !!this.OpenInvoices.length) || false;

        this.balance = Math.round(this.OpenInvoices.filter(oi => moment(oi.due) < moment(date)).reduce((a,b)=> { return a + b.balance }, 0) * 1e2) / 1e2;
        this.open_balance = Math.round(this.OpenInvoices.filter(oi => moment(oi.due) <= moment(date)).reduce((a,b)=> { return a + b.balance }, 0) * 1e2) / 1e2;
        console.log(`getCurrentBalance: lease_id ${this.id} balance: `, this.balance);
    }

    async updateCurrentStanding(connection){

      // This should only reset to Current if the balance is 0
      await this.getStanding(connection);

      await this.getCurrentBalance(connection);
      if(this.balance > 0 && this.Standing && (this.Standing.name === 'Auction' || this.Standing.name === 'Lease Closed')){
        return;
      }

      if (!this.balance && this.moved_out && this.end_date){
        this.updateStanding(connection, "Lease Closed" );
      } else if(!this.balance){
        this.updateStanding(connection, "Current" );
      }

    }

    async updateStanding(connection, name){

      let standing = await models.Setting.getLeaseStandingByName(connection, name);
      if(!standing) e.th(404, name + " is not a valid lease standing value");
      this.saveStanding(connection, standing.id);

    }

    async getStanding(connection){

      let standing = await models.Setting.getLeaseStandingById(connection, this.lease_standing_id);
      if(!standing){
        standing = {
          name: 'Current'
        };
        // e.th(500, "Invalid lease standing ID");
      }
      this.Standing = standing;
    }

    async finalize(connection, company_id, user_id, ip_address, domain, template, properties){

        await this.activate(connention);


        // return this.find(connection, company_id)
        //     .then(() => this.findFull(connection, company_id, properties))
        //     .then(() => {

        //          // Add Checklists
        //         if(!template.Checklist || !user_id) return true;

        //         return Promise.mapSeries(template.Checklist, item => {
        //             var save = {
        //                 lease_id: this.id,
        //                 checklist_item_id: item.id,
        //                 name: item.name,
        //                 document_type_id: item.document_type_id,
        //                 document_id: item.document_id,
        //                 description: item.description,
        //                 completed: 0,
        //                 sort: item.sort
        //             };

        //             if(!item.document_id || !user_id) return models.Checklist.saveItem(connection, save);
        //             // generate Document Now

        //             var document = new Document({ id: item.document_id });
        //             var upload = {};

        //             return document.find(connection)
        //                 .then(() => document.verifyAccess(company_id))
        //                 .then(() => document.setCompany(connection))
        //                 .then(() => {
        //                     document.mergeFields(this);
        //                     document.setPaths(this.id);
        //                     return document.generate(connection, this, user_id, ip_address);
        //                 }).then(uploadRes => {
        //                     upload = uploadRes;
        //                     save.upload_id = upload.id;

        //                     return models.Checklist.saveItem(connection, save);
        //                 }).then(() =>{

        //                     if (!save.upload_id) return true;
        //                     return models.DocumentSign.findByUploadId(connection, save.upload_id).mapSeries(function (signer) {
        //                         var signer = new Signer(signer);
        //                         return signer.find(connection, company_id).then(signerStatus => {
        //                             return signer.sendSignEmail(upload, company_id)
        //                         })
        //                     })
        //                 })
        //         })
        //     })
           // .then(() => this.activate(connection))
           // .then(() => this.sendActivationLinkToTenants(connection, company_id))
            //.then(() => {

                //set access code
            //     var property;
            //     return Promise.map(this.Tenants, t => {
            //         var lead = new Lead({contact_id: t.contact_id });
            //         return lead.find(connection, company_id)
            //             .then(() => lead.updateStatus(connection, 'converted'))
            //             .catch(err => {
            //                 return true;
            //             })
            //             .then(() => {
            //                 // Manage get access
            //                 return models.Property.findByLeaseId(connection, this.id)
            //                     .then((p)=> {
            //                         property = new Property(p);
            //                         return property.verifyAccess(company_id, properties)
            //                     })
            //                     .then(() => property.getAccessControl(connection))
            //                     .then(() => {
            //                         if(!property.Access) return;

            //                         return property.Access.generateCode()
            //                             .then(code => {
            //                                 var contact = new Contact({id: t.contact_id});
            //                                 return contact.find(connection, company_id)
            //                                     .then(() => contact.findAccessCredentials(connection, property))
            //                                     .then(() => {
            //                                       // dont overwrite code if this user already has one..
            //                                       if(!contact.Access.pin){
            //                                         return contact.saveAccess(connection, property, {pin: code, status: 1}, this)
            //                                       }
            //                                     })

            //                             })
            //                             .then(() => this.findUnit(connection))
            //                             .then(() => property.Access.addContactToSpace(connection, t.Contact, this.Unit))
            //                             .then(() => {
            //                                 if(!property.Access) return;
            //                                 return property.Access.updateUser(t.Contact);
            //                             }).catch(err => {
            //                               console.log(err);
            //                               return;
            //                           })
            //                     })
            //             }).catch(err => {
            //               console.log("Cant manage gate access", err);
            //               return;
            //             })
            //     });
            // })
    }

    async findInvoicesToRefund(connection, date) {

      await this.getLeaseTemplate(connection);
      
      const template = this.Property.LeaseTemplates[this.Unit.type].Template
      let { prorate_days: prorateDays, prorate_rent_out: prorateRentOut } = template;
      if(!prorateRentOut) {
        prorateDays = 0;
      }

      let proratedDate = moment(date);
      proratedDate = proratedDate.subtract(prorateDays + 1, 'days');
      proratedDate = proratedDate.format('YYYY-MM-DD');

      
      let invoiceToRefund = [];
      let invoices = await models.Invoice.findFutureBilled(connection, this.id, date, {moved_out: true});
      
      for(let i = 0; i < invoices.length; i++ ){
        var invoice = new Invoice(invoices[i]);
        await invoice.find(connection);
        
        let prorateRentOut = invoices[i].due && 
        moment(invoices[i].due).isAfter(moment(proratedDate)) ? true : false; 
      
        invoice.InvoiceLines.map(inline => inline.totalLineCredit(date, true, false, prorateRentOut));
        await invoice.total();
        invoice.credit = await invoice.totalInvoiceCredit();

        invoiceToRefund.push(invoice);
      }

      return invoiceToRefund;
    }

    async findTransferCreditInvoices(connection, date, params){
      let invoiceToRefund = [];
      let invoices = await models.Invoice.findFutureBilled(connection, this.id, date, params);
      
      for(let i = 0; i < invoices.length; i++ ){
        var invoice = new Invoice(invoices[i]);
        await invoice.find(connection);

        

        let isActiveInv = moment(date, 'YYYY-MM-DD').startOf('day').isSameOrAfter(moment(invoice.period_start));
        invoice.InvoiceLines.map(inline => inline.totalLineCredit(date, false, isActiveInv));
        await invoice.total();
        invoice.credit = await invoice.totalInvoiceCredit();
        
        let applied_amount = invoice.Payments.filter(x => x.Payment.credit_type !== "loss").reduce((a, p) => a + p.amount, 0) || 0;

        if(isActiveInv && applied_amount === 0) invoice.credit = 0;

        if(!isActiveInv && applied_amount < invoice.credit) invoice.credit = applied_amount;

        invoice.credit = invoice.credit - (invoice.Payments.filter(x => x.Payment.credit_type == "loss").reduce((a, p) => a + p.amount, 0));
        invoice.credit = (invoice.credit && invoice.credit > 0) ? Math.round(invoice.credit * 1e2) / 1e2 : 0;
        invoiceToRefund.push(invoice);
      }
      return invoiceToRefund;
    }

    async removeAutoCharges(connection){
        if(!this.id) e.th(500, "Lease Id Not Set");
        return await models.Lease.removeAutoCharges(connection, this.id);
    }

    async setAsAutoPay(connection, payment_method){

        await this.removeAutoCharges(connection);
        return await payment_method.setAsAutoPay(connection, this.id);

    }

    async addTenant(connection, data, company_id){

        let contact = {};
        if(!data.contact_id) {
            contact = new Contact();
            contact.company_id = company_id;
        } else {
            contact = new Contact({ id: data.contact_id });
            await contact.find(connection, company_id);
            await contact.verifyUniqueTenantOnLease(connection, this.id);
        }

        await contact.update(connection, data);
        await contact.save(connection);

        let tenant = {
          contact_id: contact.id,
          lease_id: this.id,
          primary: data.primary || 0
        };

        let tenant_id = await models.ContactLeases.save(connection, tenant);

        return {
            id: tenant_id,
            contact_id: contact.id,
            lease_id: this.id
        }


    }

    async transfer(connection, unit_id, start_date, company_id){

      await this.getTenants(connection);
      await this.getServices(connection);
      await this.findAllDiscounts(connection);
      await this.findPaymentMethods(connection);
      await this.getCurrentBalance(connection);
      await this.getChecklist(connection, company_id);


      let transferLease = new Lease({
        unit_id: unit_id,
        start_date: start_date,
        bill_day: this.bill_day,
        notes: this.notes,
        terms: this.terms,
        rent: this.rent,
        status: this.status,
        token: this.token,
        achtoken: this.achtoken,
        security_deposit: this.security_deposit,
      });

      await transferLease.save(connection);
      return transferLease;
    }


    async moveOut(connection, date){
      this.end_date = date;
      this.moved_out = date;
      if(moment(this.end_date, 'YYYY-MM-DD').isBefore(moment(this.start_date, 'YYYY-MM-DD'))){
        this.end_date = this.start_date;
      }
      return await this.save(connection);
    }

    async getDocuments(connection, company){
      if(!this.id) e.th(500, "Lease id not set");
      let documents =  await Document.getUnitDocumentTemplates(connection, this.unit_id)

    }

    async findPinnedInteractions(connection){
      this.PinnedInteractions = await models.Lease.findPinnedInteractions(connection, this.id);
    }

    static async  findPending(connection, company_id, properties, contact_id){
      return await models.Lease.findPending(connection, company_id, properties, contact_id)

    }

    static async  findStandings(connection){
      return await models.Trigger.findLeaseStandings(connection);

    }

    static async  updateLeaseStandings(connection, lease_ids){

      for(let i = 0; i<lease_ids.length; i++ ){

        let lease = new Lease({id: lease_ids[i]});
        await lease.find(connection);
        await lease.getCurrentBalance(connection);
        await lease.updateCurrentStanding(connection);
        if (lease.balance <= 0 && lease.deny_payments) {
          await lease.acceptPayments(connection);
        }
      }

      return await models.Trigger.findLeaseStandings(connection);

    }

    async getMetrics(connection){
      if(!this.id) e.th(500, "Lease Id Not Set");

      await this.getProperty(connection);
      let date = await this.Property.getLocalCurrentDate(connection);
      this.Metrics = await models.Lease.getLeaseMetrics(connection, this.id, {date});

      // Check if enrolled in Autopay
      await this.findAutoPaymentMethods(connection);
      this.Metrics.has_autopay = this.PaymentMethods.length > 0;

      // Get lease promotion
      await this.getPromotion(connection);
      this.Metrics.promotion = this.Promotion && this.Promotion.name;


    }

    isActiveLease(date){
      var d = date || moment();
      if(!this.end_date || (this.end_date && moment(this.end_date) > d)) return;
      e.th(409, 'Invalid lease');
    }

    async findPromotionsByLeaseId(connection){
      return await models.Promotion.getDiscountIdsByLeaseId(connection,this.id);
    }

    async addPromotions(connection, promotions, company_id, fetchdiscount = false){
      
      for(let i = 0; i < promotions.length; i++){
        let  promotion = new Promotion({
           id: promotions[i].promotion_id
        });
      
        await promotion.find(connection);
        await promotion.verifyAccess(company_id);

        let valid_promo = promotion.validatePromotionOnUnit(connection, this.unit_id);
        if(!valid_promo){
          e.th(400, "This promotion is not available for this unit");
        }
        let discount = new Discount({
          id: promotions[i] && promotions[i].id || null,
          promotion_id: promotion.id,
          lease_id: this.id,
          company_id
        });
        await discount.makeFromPromotion(connection, this);
        if(fetchdiscount && discount && discount.id) await discount.findPromotion(connection);
        this.Discounts.push(discount);
      }
    }

    async findAddress(connection, address_id) {
      let address = new Address({ id: address_id });
      await address.find(connection);
      return address;
    }

    async constructRegisteredVehicleOwner(connection, registered_owner_address_id, vehicle) {
      const registered_owner_address = registered_owner_address_id && await this.findAddress(connection, registered_owner_address_id);

      let registered_owner = {
        first_name: vehicle.registered_owner_first_name,
        last_name: vehicle.registered_owner_last_name,
        is_tenant: vehicle.is_registered_owner_tenant,
        address_id: registered_owner_address_id
      }

      if(registered_owner_address) {
        registered_owner = {
          ...registered_owner,
          ...registered_owner_address
        }
      }

      return registered_owner;
    }

    async constructLegalVehicleOwner(connection, legal_owner_address_id, vehicle) {
      const legal_owner_address = legal_owner_address_id && await this.findAddress(connection, legal_owner_address_id);

      let legal_owner = {
        first_name: vehicle.legal_owner_first_name,
        last_name: vehicle.legal_owner_last_name,
        is_tenant: vehicle.is_legal_owner_tenant,
        address_id: legal_owner_address_id
      }

      if(legal_owner_address) {
        legal_owner = {
          ...legal_owner,
          ...legal_owner_address
        }
      }

      return legal_owner;
    }

    async findVehicles(connection){
      const vechile_data = await models.Lease.getVehicles(connection, this.id);

      const vehicle = vechile_data.length && vechile_data[0];

      const { registered_owner_address_id, legal_owner_address_id } = vehicle;

      const registered_owner = await this.constructRegisteredVehicleOwner(connection, registered_owner_address_id, vehicle);
      const legal_owner = await this.constructLegalVehicleOwner(connection, legal_owner_address_id, vehicle);

      this.Vehicles = vehicle ? {
        ...vehicle,
        registered_owner: registered_owner,
        legal_owner: legal_owner
      } : {}
    }

    async saveAddress(connection, data) {
      let address = {};

      if(data) {
        address = new Address({
          id: data.address_id,
          address: data.address || " ",
          address2: data.address2,
          city: data.city,
          state: data.state,
          country: data.country,
          zip: data.zip   // zip is also refered as postal code
        })

        await address.save(connection);
      }

      return address;
    }

    assembleVehicle(data, registered_owner, legal_owner, registered_owner_address_id, legal_owner_address_id) {
      return {
        lease_id: this.id,
        type: data.type,

        contact_id: data.contact_id || null,
        make: data.make || null,
        year: data.year || null,
        model: data.model || null,
        color: data.color || null,
        license_plate_number: data.license_plate_number || null,
        license_plate_state: data.license_plate_state || null,
        license_plate_country: data.license_plate_country || null,
        registration_expiry_date: data.registration_expiry_date || null,
        registration_upload_id: data.registration_upload_id || null,
        insurance_provider_name: data.insurance_provider_name || null,
        insurance_policy_upload_id: data.insurance_policy_upload_id || null,
        vechile_identification_number: data.vechile_identification_number || null,
        hull_identification_number: data.hull_identification_number || null,
        serial_number: data.serial_number || null,
        approximation_value: data.approximation_value || null,

        registered_owner_first_name: (registered_owner && registered_owner.first_name) || null,
        registered_owner_last_name: (registered_owner && registered_owner.last_name) || null,
        is_registered_owner_tenant: (registered_owner && registered_owner.is_tenant) || null,

        legal_owner_first_name: (legal_owner && legal_owner.first_name) || null,
        legal_owner_last_name: (legal_owner && legal_owner.last_name) || null,
        is_legal_owner_tenant: (legal_owner && legal_owner.is_tenant) || null,

        registered_owner_address_id: registered_owner_address_id,
        legal_owner_address_id: legal_owner_address_id || null
      };
    }

    async removeVehicle(connection, data) {
  		if(!this.id) e.th(500, "Lease id not set");
      
      const vehicleId = data.id;
      const updateData = {
        deleted_at: moment().format('YYYY-MM-DD hh:mm:ss')
      }

      await models.Lease.saveVehicle(connection, updateData, vehicleId);
      return vehicleId;
    }

    async saveVehicle(connection, data) {
  		if(!this.id) e.th(500, "Lease id not set");

      const vechile_id = data.id;
      const { registered_owner, legal_owner } = data

      let registered_owner_address = {};

      // address is null if none of registered_ownwer fields are entered
      if(registered_owner.address != null) {
        registered_owner_address = await this.saveAddress(connection, registered_owner);
      }

      let legal_owner_address = {};
      if(legal_owner.address != null) {
        legal_owner_address = await this.saveAddress(connection, legal_owner);
      }

      const registered_owner_address_id = registered_owner_address.id;
      const legal_owner_address_id = legal_owner_address.id;

      const vehicle_data = this.assembleVehicle(data, registered_owner, legal_owner, registered_owner_address_id, legal_owner_address_id)

      let result = await models.Lease.saveVehicle(connection, vehicle_data, vechile_id);
      return result && result.insertId ? result.insertId : vechile_id
    }

    async transferLease(connection, body, post_params, company, res, permissions) {
      // step 0 - check lease has past due balance
      // step 1 - Previous lease moveout
      // step 2 - New Lease movein
      // step 3 - Generate Invoice
      // step 4 - Payment details
      // step 5 - Credit the last payment amount
      try{

        await this.getPastDueInvoices(connection);
        await this.getCurrentBalance(connection);
        // GET payment cycle 
        await this.getActivePaymentCycle(connection);

        if(this.balance > 0){
          throw new Error("Lease has some past due amount.");
        }

        let day = moment(post_params.start_date).format('YYYY-MM-DD');
        let contact = new Contact({id: body.contact_id});
        await contact.find(connection);
        await contact.verifyAccess(company.id);

        let property = new Property({id: body.property_id});
        await property.find(connection);

        
        await property.verifyAccess({connection, company_id: company.id, properties: res.locals.properties, contact_id: res.locals.contact.id, permissions});

        let paymentMethod = {};
        let payment = {};
        let openPayments = [];
        let endDates = [];

        let reservation = {};
        let api = res.locals.api || null;
        let loggedInUser = res.locals.contact || {};
        let unit = new Unit({id: body.unit_id } );

        await this.close(connection, day, post_params?.user_id);

			  await unit.find(connection, api);
			  await unit.verifyAccess(connection, company.id, res.locals.properties);
			  await unit.setState(connection);

			  await unit.updatePromotions(connection, post_params, company.id);
			  await unit.canRent(connection, moment(post_params.start_date, 'YYYY-MM-DD'), body.hold_token, body.reservation_id);

        let { lease, leaseServices } = await unit.buildLease(connection, api, post_params, company.id, reservation, Enums.CATEGORY_TYPE.TRANSFER);
        lease.status = 2;
        await lease.save(connection, body.hold_token, body.reservation_id);
        lease.Services = leaseServices;
        await lease.saveServices(connection, 'lease');
         // saving insurance service if any
        let insuranceService = lease.Services.find(s=> s.service_type === 'insurance');
         if(insuranceService) {
           await lease.saveServices(connection, 'insurance');
         }
        await lease.saveDiscounts(connection);
        await lease.saveChecklist(connection);
        
        if(lease.end_date){
          await unit.save(connection, { available_date: lease.end_date});
        }
        // transfer Tenants
        for(let i = 0; i < this.Tenants.length; i++){
          let tenant = {
            contact_id: this.Tenants[i].contact_id,
            lease_id: lease.id,
          };

          await models.ContactLeases.save(connection, tenant);
        }

        if(body.decline_insurance){
          lease.declineInsurance(connection, body.decline_insurance, body.insurance_exp_month, body.insurance_exp_year);
        }

        await lease.getTenants(connection);
        await lease.findUnit(connection);

        let currDate = moment(day).startOf('day');

      
        if(this.PaymentCycle?.id){
          
          await lease.getPaymentCycleOptions(connection);

          let payment_cycle = lease.PaymentCycleOptions.find(o => o.label.toLowerCase() == this.PaymentCycle.payment_cycle.toLowerCase());
          // let discount = new Discount({id: this.PaymentCycle.discount_id });
          // await discount.find(connection);
          // if(post_params.promotions.filter(p => p.promotion_id !== discount.promotion_id ).length){
          //   e.th(409, 'Payment cycle promotions cannot be combined with other offers')
          // }
          // post_params.promotions = [{promotion_id: discount.promotion_id }];
          
          // Calculating billed months according to Multi Month Payment Cycle.
          post_params.billed_months = post_params.billed_months == 0 ? payment_cycle.period : Math.ceil(post_params.billed_months / payment_cycle.period) * payment_cycle.period;
         
          if(post_params.billed_months > 0 && (post_params.billed_months % payment_cycle.period ) !== 0){
            e.th(409, `Payment Cycles must be billed in groups of ${payment_cycle.period}`);
          }
          
          let start_date_mom = moment(post_params.start_date, 'YYYY-MM-DD');
          let payment_cycle_end_mom = moment( this.PaymentCycle.end_date, 'YYYY-MM-DD');
          
          
          lease.payment_cycle = this.PaymentCycle.payment_cycle;
        
          await lease.saveMoveInPaymentCycle(connection, start_date_mom, payment_cycle_end_mom, company.id); 
           
          // add subsequent payment cycles

          await lease.savePaymentCycle(connection, payment_cycle_end_mom.add(1, 'day'), post_params.billed_months, company.id, false); 

          // let bd = payment_cycle_end_mom.clone();
          // for(let i = 0; i < post_params.billed_months; i++){
            
          //   if((i % payment_cycle.period ) === 0){
          //     bd.add(1, 'day'); 
          //     let bd_end = bd.clone().add(payment_cycle.period, 'month').subtract(1, 'day'); 

          //     await lease.saveMoveInPaymentCycle(connection, bd, bd_end, company.id);
          //     bd = bd_end; 

          //   }
          // }
          let transfer_months_billed = payment_cycle_end_mom.diff(start_date_mom, 'months') + 1;
          if(transfer_months_billed > post_params.billed_months){
              post_params.billed_months = Math.ceil(transfer_months_billed  / payment_cycle.period) * payment_cycle.period;
          } 

        }


        let invoices = await unit.generateInvoice(connection,lease, company.id, leaseServices, post_params.billed_months, true, true, loggedInUser.id, api ? api.id : null);

        invoices.forEach(x => endDates.push(moment(x.period_end).format('YYYY-MM-DD')));
        let transfer_in_balance = invoices.reduce((a, p) => a + p.balance, 0);
        
        let refund_invoices = await this.findTransferCreditInvoices(connection, day, { search_all: false });
        console.log("refund_invoices", refund_invoices.map(ri => ri.id));
        let unpaid_invoices = refund_invoices.filter(ri => ri.Payments?.length === 0);
        refund_invoices = refund_invoices.filter(ri => ri.credit);
        let transfer_out_balance = refund_invoices.reduce((a, p) => a + p.credit, 0);

        for (let i = 0; i < refund_invoices.length; i++){

          let payment_invoice = new Invoice({id: refund_invoices[i].id});
          await payment_invoice.findPayments(connection);
          let applied_payment;
          let credit = refund_invoices[i].credit;;
          for(let j = 0; j < payment_invoice.Payments.length; j++){

            let paymentApplication = await Payment.getPaymentApplicationById(connection, payment_invoice.Payments[j].id);
            if(paymentApplication.amount >= credit){
              applied_payment = paymentApplication.amount - credit;
              credit = 0;
            }
            else{
              applied_payment = 0;
              credit -= paymentApplication.amount;
            }
            await models.Payment.applyPayment(connection, { date: currDate.format('YYYY-MM-DD'), amount : Math.round(applied_payment * 1e2) / 1e2 }, payment_invoice.Payments[j].id);

            let payment = new Payment({id: payment_invoice.Payments[j].payment_id});
            await payment.find(connection);
            await payment.getPaymentApplications(connection);

            let payment_remaining = payment.payment_remaining;

            for(let k = 0; k < invoices.length; k++){
              if(invoices[k].balance <= payment_remaining){
                invoices[k].amount = invoices[k].balance;
                payment_remaining -= invoices[k].balance;
              } else {
                invoices[k].amount = payment_remaining;
                payment_remaining = 0;
              }

              if(!payment_remaining) break;
            }

            if(payment_remaining) {
              let paymentIndex = openPayments.findIndex(x=> x.id === payment.id);
              if(paymentIndex === -1) {
                openPayments.push({
                  id: payment.id,
                  amount: payment_remaining
                })
              } else {
                openPayments[paymentIndex].amount = payment_remaining;
              }
            }

            await payment.applyToInvoices(connection, invoices);

          }

          // Generating credit payment for current invoice and void the pre-paid invoices

          if(currDate.isSameOrAfter(moment(refund_invoices[i].period_start))){
            var data = {
              amount: refund_invoices[i].credit,
              property_id: body.property_id,
              contact_id: body.contact_id,
              date: currDate.format('YYYY-MM-DD'),
              lease_id: refund_invoices[i].lease_id,
              sub_method: Enums.ADJUSTMENT_SUB_METHOD.TRANSFER,
              notes: "Transfer adjustment",
            }
            let creditPayment = new Payment();
            await creditPayment.createAdjustment(connection, data, res.locals.contact.id);

            var invoicePayment = {
              amount: refund_invoices[i].credit,
              payment_id: creditPayment.id,
              invoice_id: refund_invoices[i].id,
              date: currDate.format('YYYY-MM-DD')
            }
            await models.Payment.applyPayment(connection, invoicePayment);

          } else {
            let invoice = new Invoice({id: refund_invoices[i].id});
            await invoice.find(connection);
            await invoice.void_invoice(connection, res.locals.contact);
          }

        }

        // voiding the unpaid invoices
        for (let i = 0; i < unpaid_invoices?.length; i++) {
          let invoice = new Invoice({ id: unpaid_invoices[i].id });
          await invoice.find(connection);
          await invoice.void_invoice(connection, res.locals.contact);
        }

        if(body.payment){
          var logged_in_user = res.locals.contact;
          if(body.payment.id){
            // Apply existing payment to invoices

            payment = new Payment({id: body.payment.id});
            await payment.find(connection);
            await payment.verifyAccess(connection, company.id, res.locals.properties);
            await payment.getPaymentApplications(connection);

            let payment_remaining = payment.payment_remaining;
            for(let k = 0; k < invoices.length; k++){
              if(invoices[k].balance <= payment_remaining){
                invoices[k].amount = invoices[k].balance;
                payment_remaining -= invoices[k].balance;
              } else {
                invoices[k].amount = payment_remaining;
                payment_remaining = 0;
              }

              if(!payment_remaining) break;
            }

            await payment.applyToInvoices(connection, invoices);

          } else {
            paymentMethod = await contact.getPaymentMethod(connection, property, body.payment.payment_method_id, body.payment.type, body.payment.source, body.paymentMethod );
            payment = new Payment();
            body.payment.date = body.start_date;
            body.payment.property_id = body.property_id;
            body.payment.contact_id = body.contact_id;
            await payment.create(connection, body.payment, paymentMethod, null, logged_in_user ? logged_in_user.id : null);
            await payment.getPaymentApplications(connection);
            if(payment.status && payment.payment_remaining && invoices){
              let payment_remaining = payment.payment_remaining;
              for(let k = 0; k < invoices.length; k++){
                if(invoices[k].balance <= payment_remaining){
                  invoices[k].amount = invoices[k].balance;
                  payment_remaining -= invoices[k].balance;
                } else {
                  invoices[k].amount = payment_remaining;
                  payment_remaining = 0;
                }
                if(!payment_remaining) break;
              }

              await payment.applyToInvoices(connection, invoices);
            }
            if(paymentMethod && paymentMethod.id && paymentMethod.auto_charge){
              await lease.setAsAutoPay(connection, paymentMethod);
            }
          }

          await payment.charge(connection, company.id, false, logged_in_user );
        }

        // step 6
        if(body.auto_pay_id){
          let paymentMethod = new PaymentMethod({id: body.auto_pay_id});
          if(paymentMethod) {
            await lease.setAsAutoPay(connection, paymentMethod);
          }
        }

        // step 7
        if(body.notes){
          let note = new Note({});
          let data = {
              content: body.notes,
              context: 'transfer',
              pinned: 0,
              contact_id: contact.id,
              last_modified_by: res.locals.contact.id
          }
          await note.update(data);
          await note.save(connection);
          
        }

        // step 8
        const transferData = {
          from_lease_id: this.id,
          to_lease_id: lease.id,
          reason: body.reason,
          notes: body.notes,
          contact_id: res.locals.contact.id,
          date: day,
          payment_id: payment.id,
          transfer_out_balance,
          transfer_in_balance,
        }

        const transfer = new Transfer(transferData);
        await transfer.save(connection);
        return {lease, payment, openPayments, invoices, endDates};
      }
      catch(err) {
        console.log(err.stack)
        throw err;
      }
      // step 7 - Create a task
    }

    async findTransfer(connection){
      try{
        let transfer = new Transfer({to_lease_id: this.id});
        await transfer.find(connection);
        this.Transfer = transfer;
      } catch(err) {
        console.log("findTransfer: Couldn't find transfer");
      }
    }

    async killServicesDiscountsAndCheckList(connection){
      if (!this.id) return Promise.resolve();
      return await models.Lease.killServicesDiscountsAndCheckList(connection, this.id);
    }

    async getUploads(connection, company_id) {
      if(!this.Unit || !this.Unit.id){
        await this.findUnit(connection);
      }

      let files = await Upload.findByEntity(connection, 'lease', this.id);
      let uploads = [];
      for(let i = 0; i < files.length; i++){
        let upload = new Upload({id: files[i].upload_id});
        await upload.find(connection, {company_id});
        await upload.findSigners(connection, company_id);
        upload.lease_id = this.id;
        upload.unit_number = this.Unit.number;
        upload.unit_type = this.Unit.type;

        uploads.push(upload);
      };

      this.Uploads = uploads;
    }

    async removeToOverlockFromSpace(connection){
      return await models.Lease.removeToOverlockFromSpace(connection, this.id);
    }

    async saveDocuments(connection, documents, cid, company_id, is_prod, contact_id){
      let uploadJobParams = [];
      for(let i = 0; i < documents.length; i++){
        let d = documents[i];
        var upload = new Upload();
        await upload.setDocumentType(connection, d.document_type_id, d.document_type || 'file', company_id);
        upload.setFile(null, d.src, d.filename)
        upload.uploaded_by = contact_id || null;  // TODO SHOULD INCLUDE API
        await upload.save(connection);
        await upload.saveUploadLease(connection, this.id);
        
        uploadJobParams.push({
          category: 'fetch_document',
          data: {
            cid: cid,
            id: upload.id,
            prod: is_prod
          }
        });
        
      }
      return uploadJobParams;

    }


    async getDelinquency(connection, delinquency_id, paused){
      
      
      try {
        if(delinquency_id){
          this.Delinquency = new Delinquency({id: delinquency_id });
        } else {
          this.Delinquency = new Delinquency({lease_id: this.id});
        }
        
          await this.Delinquency.find(connection, paused);
          await this.Delinquency.findActions(connection);
          await this.Delinquency.findPauses(connection);
          console.log(`Delinquency found for lease_id ${this.id}`);
          
        } catch(err){
          return false;
        }

    }

    async pauseDelinquency(connection, reason, contact_id, delinquency_id){

      if(!this.Delinquency.id){
        await this.getDelinquency(connection, delinquency_id);
      }

      if(!this.Delinquency.id){
        e.th(404, "Delinquency not found.")
      }
      if(this.Delinquency.status !== 'active'){
        e.th(409, "No active delinquency"); 
      }

      if(!reason){
        e.th(400, "Please provide a reason for pausing this delinquency"); 
      }
      
      let date = await this.getCurrentLocalPropertyDate(connection); 
      await this.Delinquency.pause(connection, reason, contact_id, date); 
      
    }


    async resumeDelinquency(connection, resumed_by, delinquency_id){
      
      if(!this.Delinquency.id){
        await this.getDelinquency(connection, delinquency_id);
      }

      if(!this.Delinquency.id){
        e.th(404, "Delinquency not found.")
      }
      if(this.Delinquency.status !== 'paused'){
        e.th(409, "Delinquency is not paused"); 
      }
    
      let date = await this.getCurrentLocalPropertyDate(connection); 
        
      await this.Delinquency.resume(connection, resumed_by, date); 


  }

  async endDelinquency(connection){

    if(!this.Delinquency.id){
      await this.getDelinquency(connection);
    }

    if(!this.Delinquency.id){
      e.th(404, "Delinquency not found.")
    }
    if(this.Delinquency.status !== 'active' && this.Delinquency.status !== 'paused'){
      e.th(409, "No active delinquency"); 
    }
    console.log(`Complete the delinquency for lease_id ${this.id}`);
    let date = await this.getCurrentLocalPropertyDate(connection); 
    await this.Delinquency.complete(connection, date); 
    
  }




    static async setAccessOnLease(connection, lease_id, lease_closed = false, transfer){
      try{
        var lease = new Lease({id: lease_id});
        await lease.find(connection);
        await lease.findUnit(connection);
        await lease.getProperty(connection);
        await lease.Property.getAccessControl(connection);
        if(!lease.Property.Access) return;
        await lease.getTenants(connection);

        for(let i = 0; i < lease.Tenants.length; i++){
          let contact = lease.Tenants[i].Contact;
          let code = undefined;

          let unit = new Unit({
            id: lease.unit_id
          });
          await unit.find(connection);
          await contact.findAccessCredentials(connection, lease.Property);
          
          if (lease.Property.Access.access_name === "Derrels") {
            let spacePin = await lease.Property.Access.getSpaceCode(unit.id);
            if (!spacePin) {
              code = await lease.Property.Access.generateSpaceCode(unit.number, unit.id);
            } else {
              code = spacePin;
            }
          } else {
            if (!contact.Access || !contact.Access.pin) {
              code = await lease.Property.Access.generateCode();
            } else {
              code = contact.Access.pin;
            }
          }

          if (lease.Property.Access.access_name === "Derrels") await contact.saveAccess(connection, lease.Property, {pin: code, is_transfer: transfer, unit_number: unit.number}, lease, unit.id);
          else await contact.saveAccess(connection, lease.Property, {pin: code, is_transfer: transfer}, lease);
        }
      } catch(err){
        console.log("Error in saving Access for lease: ", err);
      }
    } 

    async getPaidThroughDate (connection, payload = {}) {
      const { date } = payload;
      let r = await models.Lease.getPaidThroughDate(connection, this.id, date);
      this.rent_paid_through = r.end_date;
    }

    async generatePandadoc (connection, cid, document_id, checklist_id, company_id, contact_id) {
      await Queue.add('generatePandaDoc', {
        cid: cid,
        lease_id: this.id,
        document_id: document_id,
        checklist_id: checklist_id,
        company_id: company_id,
        contact_id: contact_id,
        priority: 1,
        socket_details: {
          company_id: cid,
          contact_id: contact_id
        }
      }, {priority: 1})
    }

    async getCredits(connection, params = {}){
      this.Payments = await models.Payment.findOpenCreditsByLeaseId(connection, this.id);
      this.Payments.map(p => {  
        p.amt_remaining = Math.round( ( p.amount - p.amount_used ) *1e2) /1e2;
        return p;
      })
    }
    
    static async applyUnallocatedBalanceOnlease(connection, company_id, lease_id, openPayments, logged_in_user_id, permissions, api = {}){

      let total_payment_remaining = openPayments.reduce((a, b) => a + b.amount, 0);

      let lease = new Lease({ id: lease_id });
      await lease.find(connection);
      await lease.getProperty(connection, company_id, null, logged_in_user_id, permissions, api);
      await lease.getPaymentCycleOptions(connection);

      let billed_months = 1, pc;
      if(lease.payment_cycle) {
        pc = lease.PaymentCycleOptions.find(pco => pco.label.toLowerCase() === lease.payment_cycle.toLowerCase())
        billed_months = pc ? pc.period: 1;
      }

      let invoices = await models.Invoice.findDueByLease(connection, lease_id);
      total_payment_remaining -= invoices.reduce((a, b) => a + b.total_owed, 0);

      for(let j=0; total_payment_remaining > 0; j++) {

        let current_date = await lease.Property.getLocalCurrentDate(connection);
        let lastBillingDate = await lease.getLastBillingDate(connection); // Should be last billed.
        let nextBillingDate = await lease.getNextBillingDate(moment(current_date), false); // Should be next billing
    
        // subtract a day to get even with lastBillingDate
        nextBillingDate.subtract(1, 'day');
        let lastBillingDateMoment = moment(lastBillingDate, 'YYYY-MM-DD HH:mm:ss').startOf('day');
        let lastBilled = lastBillingDate && (nextBillingDate.format('x') < lastBillingDateMoment.format('x')) ? moment(lastBillingDate, 'YYYY-MM-DD HH:mm:ss').startOf('day') : nextBillingDate;
        
        // let invoicePeriod = await lease.getCurrentInvoicePeriod(connection, lastBilled.clone(), 1);
        //lastBilled = invoicePeriod.end.clone();
        let services = [];

        let invoicePeriod = await lease.getCurrentInvoicePeriod(connection, lastBilled.clone(), 1);
        await lease.savePaymentCycleIfApplicable(connection, {
          next_billing_date: invoicePeriod.start,
          billed_months,
          company_id,
          payment_cycle: pc
        });

        for(let i = 0; i < billed_months; i++ ) {
          console.log("lastBilled", lastBilled )
          invoicePeriod = invoicePeriod || await lease.getCurrentInvoicePeriod(connection, lastBilled.clone(), 1);
          console.log("invoicePeriod", invoicePeriod )
          lastBilled = invoicePeriod.end.clone();

          try {
            services = await lease.getCurrentServices(connection, company_id, invoicePeriod.start.clone(), invoicePeriod.end.clone())
                .filter(s => s.recurring === 1 && s.service_type === 'lease' || s.service_type === 'insurance');
          } catch (err) {
            if (err.code !== 409) {
              throw err;
            }
            services = [];
          }

          let invoice = new Invoice({
            lease_id: lease.id,
            date: moment(current_date).format('YYYY-MM-DD'),
            due: invoicePeriod.start.format('YYYY-MM-DD'),
            company_id: company_id,
            type: "manual",
            status: 1
          });
          invoice.Lease = lease;
          await invoice.makeFromServices(
            connection,
            services,
            lease,
            invoicePeriod.start,
            invoicePeriod.end,
            null,
            company_id
            );
            
            await invoice.total();
            
          if(!invoice.balance) continue;
          await invoice.save(connection);
          invoice.amount = total_payment_remaining > invoice.balance ? invoice.balance : total_payment_remaining;
          invoices.push(invoice);

          total_payment_remaining -= invoice.balance;     
          invoicePeriod = null;
        }





        
  
        // let invoice = new Invoice({
        //   lease_id: lease.id,
        //   user_id: null,
        //   date: invoicePeriod.start.format('YYYY-MM-DD'),
        //   due: invoicePeriod.start.format('YYYY-MM-DD'),
        //   company_id: company_id,
        //   type: "manual",
        //   status: 1,
        //   created_by: logged_in_user_id
        // });
  
        // invoice.Lease = lease;
        // await invoice.makeFromServices(
        //   connection,
        //   services,
        //   lease,
        //   invoicePeriod.start,
        //   invoicePeriod.end,
        //   null,
        //   company_id
        // );
  
        // await invoice.total();
        // if(!invoice.balance) break;

        // await invoice.save(connection);
        // invoice.amount = total_payment_remaining > invoice.balance ? invoice.balance : total_payment_remaining;
        // invoices.push(invoice);

        // total_payment_remaining -= invoice.balance;         
      }

      if(!invoices.length)  return;

      let startInvoiceIndex = 0;
      for(let i = 0; i < openPayments.length; i++){

        let payment = new Payment({id: openPayments[i].id});
        await payment.find(connection);
        await payment.getPaymentApplications(connection);
        let payment_remaining = payment.payment_remaining;
        let invoicesToapply = [];
  
        for(let j = startInvoiceIndex; j < invoices.length; j++){
          let invoice = new Invoice(invoices[j]);
          await invoice.find(connection);
          await invoice.total();
  
          if(invoice.balance <= payment_remaining){
            invoice.amount = invoice.balance;
            payment_remaining -= invoice.balance;
            startInvoiceIndex++;
          } else {
            invoice.amount = payment_remaining;
            payment_remaining = 0;
          }
      
          invoicesToapply.push(invoice);    
          if(!payment_remaining) break;
        }
  
        if(invoicesToapply.length){
          await payment.applyToInvoices(connection, invoicesToapply);
        }
  
        if(startInvoiceIndex == invoices.length) break;
      }
    }
    
    async getLastBilledInvoiceEndDate(connection, payload = {}) {
      const { leaseData } = payload;

      if (leaseData?.last_billed) {
        this.last_billed = moment(leaseData.last_billed);
      } else {
        const nextInvoicePeriod = await this.nextNonGeneratedBillingInvoice(connection);
        this.last_billed = nextInvoicePeriod.clone().subtract(1,'day');
        const billedMonths = leaseData?.billed_months;
        if (billedMonths > 0) {
          const invoicePeriod = await this.getCurrentInvoicePeriod(connection, this.last_billed, billedMonths);
          this.last_billed = invoicePeriod.end;
        }
      }
    }

    async generateInvoicesByUnit(connection, payload) {
      const { company, user, api, billed_months = 0 } = payload;

      const invoices = await this.Unit.generateInvoice(connection, this, company.id, this.Services, billed_months, false, true, user?.id, api?.id, this.last_billed);
      return invoices;
    }

    prorateAllServices() {
      this.Services = this.Services.map((s) => {
        s.prorate = 1;
        return s;
      });
    }

    async generateInvoice(connection, payload) {
      let { invoicePeriod } = payload;
      const { company, dryrun, discounts, shouldProrateAllServices, should_fetch_discounts = true } = payload; 

      if(!invoicePeriod) {
        if(!this.last_billed) await this.getLastBilledInvoiceEndDate(connection);
        invoicePeriod = await this.getCurrentInvoicePeriod(connection, this.last_billed.clone(), 1);
        let lastBilled = invoicePeriod.end.clone();
        this.last_billed = lastBilled;  
      }
      
      this.Services = [];
      try {
        this.Services = await this.getCurrentServices(connection, company.id, invoicePeriod.start.clone(), invoicePeriod.end.clone())
          .filter(s => s.recurring === 1 && s.service_type === 'lease' || s.service_type === 'insurance');
      } catch (err) {
        if (err.code !== 409) {
          throw err;
        }
      }

      if(shouldProrateAllServices) {
        this.prorateAllServices();
      }

      let currentPropertyDate = await this.getCurrentLocalPropertyDate(connection, 'YYYY-MM-DD');
      let invoice = new Invoice({
        lease_id: this.id,
        date: moment(currentPropertyDate).format('YYYY-MM-DD'),
        due: invoicePeriod.start.format('YYYY-MM-DD'),
        company_id: company.id,
        type: "manual",
        status: 1
      });

      invoice.Lease = this;
      invoice.Company = company;

      await invoice.makeFromServices(
        connection,
        this.Services,
        this,
        invoicePeriod.start,
        invoicePeriod.end,
        discounts,   
        company.id,
        should_fetch_discounts,
        payload
      ); 

      await invoice.total();
      await invoice.calculatePayments();
      await invoice.getOpenPayments(connection);

      let lastBilled = invoicePeriod.end;
      this.last_billed = lastBilled;  
      
      if(!dryrun) {
        await invoice.save(connection);
      } 

      return invoice;
    }

    async makeInvoicefromService({ connection, product, property_id,dryrun, skip_payment, payment_details, company, logged_in_user, api, res, save_service_only, accept_late_payments, same_end_date_as_start, required_permissions }){
      let  start_date  =  product.start_date; 
      let end_date = await this.getNextBillingDate(moment(start_date));
      end_date.subtract(1,'days');

      let service = new Service();
      await service.create(connection, product, this.id, company.id, dryrun, property_id);

      if(save_service_only) return { service };
      let datetime = await this.getCurrentLocalPropertyDate(connection, 'YYYY-MM-DD')
      let invoice = new Invoice({
        lease_id: this.id,
        user_id: null,
        date: moment(datetime).format('YYYY-MM-DD'),
        due: start_date,
        company_id: company.id,
        type: "manual",
        status: 1,
        created_by: logged_in_user.id,
        apikey_id: api?.id
      });
  
      invoice.Lease = this;
      invoice.Company = company;

      await invoice.makeFromServices(
        connection,
        [service],
        this,
        moment(start_date),
        (service.recurring && !same_end_date_as_start) ? end_date : moment(start_date),
        null,
        company.id
      );
      await invoice.total();
      await invoice.calculatePayments();
      await invoice.getOpenPayments(connection);
		
      if(dryrun) return { invoice };

      await invoice.save(connection);

      if(skip_payment) return { invoice, service };
        
      let updated_payment_details = { ...payment_details }; 
      invoice.amount = updated_payment_details.payment && updated_payment_details.Invoices[0].amount;
      invoice.credits_amount_used = updated_payment_details.payment && updated_payment_details.Invoices[0].credits_amount_used;
      updated_payment_details.Invoices[0] = invoice;
      
      const paymentData = await service.payment(updated_payment_details, connection, res, accept_late_payments, required_permissions);
      return {
        ...paymentData,
        service,
        invoice
      };
    }

    async hasInvoiceGenerationThresholdPassed(connection, payload) {
      const { billDayDifference = 0, billingDate } = payload;      
      const leaseTemplate = await this.getLeaseTemplate(connection);
      const { invoiceSendDay } = leaseTemplate;
      const currentPropertyDate = await this.getCurrentLocalPropertyDate(connection);

      let last_billed = await this.getLastBilledDate(connection);
      let is_billing_date_in_future = moment(billingDate).clone().subtract((invoiceSendDay + billDayDifference), 'days') > moment(currentPropertyDate);
      let no_gap_last_billed_next_billed = moment(last_billed).add(1, 'days').isSameOrAfter(billingDate);

      if(is_billing_date_in_future && no_gap_last_billed_next_billed) {
        return false;
      }

      return true;
    }

    calculateProrateMutliplier(payload) {
      const { invoicePeriod } = payload;
      if(invoicePeriod) {
        const { start, end } = invoicePeriod;
        const invoicePeriodDays = moment(end).diff(start, 'days') + 1;
        const totalNoOfDays = moment(start, 'YYYY-MM').daysInMonth();
        return invoicePeriodDays / totalNoOfDays;
      }

      return null;
    }

    async overrideInvoicePeriod(connection) {
      const fixRateConsecutivePromotion = await models.Discount.findFixRateConsecutivePayPromotion(connection, {
        lease_id: this.id,
        date: this.last_billed
      });

      let shouldProrateAllServices = true;
      const isFixedRateConsecutivePayPromotionFound = fixRateConsecutivePromotion.length > 0;

      let invoicePeriod = null;
      if(isFixedRateConsecutivePayPromotionFound) {
        shouldProrateAllServices = false;
        invoicePeriod = await this.getCurrentInvoicePeriod(connection, moment(this.last_billed).clone(), 1, true);
      }

      return { invoicePeriod, shouldProrateAllServices };
    }

    async generateNextBillingPeriodInvoice(connection, payload) {
      const { newBillDay, company, dryrun } = payload;
      let start_date, end_date;

      let { invoicePeriod, shouldProrateAllServices } = await this.overrideInvoicePeriod(connection);
      if(!invoicePeriod) {
        shouldProrateAllServices = true;

        start_date =  moment(this.last_billed).clone().add(1, 'day');
        end_date = this.getInvoicePeriodEnd(start_date.clone(), newBillDay);

        invoicePeriod = {
          start: start_date,
          end: end_date
        }
      }

      const activePercentageDiscounts = await this.getActiveDiscounts(connection, {
        date: invoicePeriod.end,
        discountType: 'percent'
      });
      const prorateMultiplier = this.calculateProrateMutliplier({ invoicePeriod });
      const invoice = await this.generateInvoice(connection, { 
        company, 
        dryrun, 
        invoicePeriod, 
        shouldProrateAllServices, 
        discounts: activePercentageDiscounts,
        should_fetch_discounts: false, 
        prorate_multiplier: prorateMultiplier, 
        override_prorate: true
      });

      return invoice;
    }

    async shouldGenerateNextBillingPeriodInvoice(connection, payload) {
      const { newBillDay } = payload;

      const isNewBillDaySmaller = this.bill_day > newBillDay;
      if(!isNewBillDaySmaller) return false;

      const billDayDifference = this.bill_day - newBillDay;
      const propertyCurrentDate = await this.getCurrentLocalPropertyDate(connection);
      const nextBillingDateWithOldBillDay = this.getInvoicePeriodEnd(moment(propertyCurrentDate)).add(1,'Days');

      const hasInvoiceGenerationThresholdPassed = await this.hasInvoiceGenerationThresholdPassed(connection, { 
        billDayDifference,
        billingDate: nextBillingDateWithOldBillDay
      });
      
      if(!hasInvoiceGenerationThresholdPassed) return false;

      const lastBilledPeriodEndDate = await this.getLastBilledDate(connection);
      
      const nextBillingDateWithNewBillDay = this.getInvoicePeriodEnd(moment(nextBillingDateWithOldBillDay), newBillDay).add(1,'Days');
      
      const isNextBillingPeriodInvoiceGenerated = moment(lastBilledPeriodEndDate) >= moment(nextBillingDateWithNewBillDay.clone().subtract(1, 'day'));
      return !isNextBillingPeriodInvoiceGenerated;
    }

    async shouldGenerateInvoiceBetweenOldAndNewBillDay(connection, payload) {
      const { newBillDay } = payload;

      const propertyCurrentDate = await this.getCurrentLocalPropertyDate(connection);
      
      //let nextBillingDate = this.getBillDateAfterDate(moment(propertyCurrentDate), newBillDay); //
        let nextBillingDate = this.getInvoicePeriodEnd(moment(propertyCurrentDate), newBillDay).add(1, 'Days');

      const currentMonthBillingDate = moment(propertyCurrentDate).date() >= newBillDay ? 
        moment(nextBillingDate).clone().subtract(1, 'months') : nextBillingDate;
      const hasInvoiceGenerationThresholdPassed = await this.hasInvoiceGenerationThresholdPassed(connection, { billingDate: currentMonthBillingDate });
      if(newBillDay > moment(propertyCurrentDate).date() && hasInvoiceGenerationThresholdPassed) {
        nextBillingDate = nextBillingDate.add(1, 'months');
      }

      const lastBilledPeriodEndDate = await this.getLastBilledDate(connection);  
      const hasInvoiceNotGenerated = moment(nextBillingDate).clone().subtract(1, 'day') > moment(lastBilledPeriodEndDate);
      
      if(hasInvoiceGenerationThresholdPassed && hasInvoiceNotGenerated) {
        return true;
      }

      return false;
    }

    async mergeOpenInvoices(connection, payload) {
      const { nextBilledInvoice } = payload;
      const openInvoices = await this.getOpenInvoices(connection);
      return { 
        invoices: {
          open_invoices: openInvoices,
          change_bill_day_invoices: [nextBilledInvoice]
        }
      };
    }

    async payInvoices(connection, payload) {
      const { paymentDetails, nextBilledInvoice, res, acceptLatePayments } = payload;
      const { Invoices: invoices } = paymentDetails;
      const invoicesToPay = [];

      for(let i = 0; i < invoices.length; i++) {
        if(!invoices[i].id) {
          nextBilledInvoice.amount = invoices[i].amount;
          invoicesToPay.push(nextBilledInvoice);
        } else {
          invoicesToPay.push(invoices[i]);
        }
      }

      const updatedPaymentDetails = { ... paymentDetails };
      updatedPaymentDetails.Invoices = invoicesToPay;

      const payment = new Payment();
		  const paymentRes = await payment.processInBulk(connection, updatedPaymentDetails, res, acceptLatePayments);
      return { events: paymentRes.events, eventsData: paymentRes.eventsData, payment_id: paymentRes.paymentData.id, invoice_id: nextBilledInvoice.id };
    }

    // API server will only generate invoice if worker server cannot
    async shouldGenerateInvoiceOnChangingBillDay(connection, payload) {
      const { newBillDay } = payload;     
      const isNewBillDaySmaller = this.bill_day > newBillDay;

      if(isNewBillDaySmaller) {
        const shouldGenerateNextBillingPeriodInvoice = await this.shouldGenerateNextBillingPeriodInvoice(connection, payload);
        if(shouldGenerateNextBillingPeriodInvoice) return true;  
      } else {
        const shouldGenerateInvoiceBetweenOldAndNewBillDay = await this.shouldGenerateInvoiceBetweenOldAndNewBillDay(connection, payload);
        if(shouldGenerateInvoiceBetweenOldAndNewBillDay) return true;
      }

      return false;
    }

    async changeBillDay(connection, payload) {
      const { paymentDetails, newBillDay, dryrun, modified_by } = payload;
      
      // const shouldGenerateInvoice = await this.shouldGenerateInvoiceOnChangingBillDay(connection, payload);
      // if(!shouldGenerateInvoice) {
      //   if(!dryrun) {
      //     await this.update(connection, { bill_day: newBillDay, modified_by});    
      //   }
      //   return;      
      // }

      await this.setLastBilled(connection);
      const nextBilledInvoice = await this.generateNextBillingPeriodInvoice(connection, payload);
      if(dryrun) {
        return await this.mergeOpenInvoices(connection, { nextBilledInvoice });
      }

      let isPaymentSkipped = (paymentDetails?.payment == null) ? true : false;
      if(isPaymentSkipped) {
        await this.update(connection, { bill_day: newBillDay, modified_by});          
        return { 
          invoice_id: nextBilledInvoice.id
        };
      }

      await this.update(connection, { bill_day: newBillDay, modified_by});          
      return await this.payInvoices(connection, { nextBilledInvoice, ...payload });
    }

  /**
   * 
   * This method returns the move outs for a given date range.
   * @param {Object} connection the connection to the database
   * @param {String} company_id Company ID
   * @param {Object} searchParams limit,offset,from_date,to_date,days,property_id
   * @param {Boolean} count if true, it will return the count of the total move outs
   * @returns move-out leases
   */
  static async getMoveOuts(connection, company_id, searchParams, count) {
    let moveOutLeases = await models.Lease.findMoveOuts(connection, company_id, searchParams, count);
    let totalLeases = []
    if (moveOutLeases && moveOutLeases.length) {
      if (count) {
        return moveOutLeases[0].count
      }
      else {
        for (let leaseItem of moveOutLeases) {
          let lease = new Lease(leaseItem);
          await lease.find(connection);
          await lease.findUnit(connection);
          await lease.getTenants(connection);
          await lease.getCurrentBalance(connection);
          await lease.getStanding(connection);
          await lease.getActiveRent(connection);
          await lease.findAllDiscounts(connection);
          await lease.getPaidThroughDate(connection);
          await lease.getMetrics(connection);
          await lease.getCreatedByInfo(connection);
          await lease.getTotalRentRaises(connection);
          await lease.getMoveInRent(connection);
          await lease.getPastRentRaise(connection);
          await lease.getReservationDetails(connection);
          await lease.getLastPaymentByLease(connection)
          totalLeases.push(lease)
        }

      }
    }
    return totalLeases
  };

    async generateThresholdInvoice(connection, company, logged_in_user, dryrun=false) {

      const lastBillingDate = await this.getLastBillingDate(connection);
      if(!lastBillingDate) return;
      
      let threshold = await this.hasInvoiceGenerationThresholdPassed(connection, { billingDate: lastBillingDate });
      if (threshold) {
				let lastBilled = lastBillingDate ? moment(lastBillingDate, 'YYYY-MM-DD HH:mm:ss').startOf('day') : null;
				let invoicePeriod = await this.getCurrentInvoicePeriod(connection, lastBilled.clone(), 1);
				let services = [];
				try {
					services = await this.getCurrentServices(connection, company.id, invoicePeriod.start.clone(), invoicePeriod.end.clone())
						.filter(s => (s.recurring === 1) && s.service_type === 'lease' || s.service_type === 'insurance');
				} catch (err) {
					if (err.code !== 409) {
						throw err;
					}
					services = [];
				}

				let dateTime = await this.getCurrentLocalPropertyDate(connection, 'YYYY-MM-DD');
				let invoice = new Invoice({
					lease_id: this.id,
					user_id: null,
					date: moment(dateTime).format('YYYY-MM-DD'),
					due: invoicePeriod.start.format('YYYY-MM-DD'),
					company_id: company.id,
					type: "manual",
					status: 1,
					created_by: logged_in_user?.id
				});
				invoice.Lease = this;
				invoice.Company = company;
				await invoice.makeFromServices(connection, services, this, invoicePeriod.start, invoicePeriod.end, [], company.id);
				if (!dryrun) {
					if (!invoice.property_id) await invoice.findPropertyIdByInvoice(connection);
					await invoice.save(connection);
				}
        return invoice;
			} else {
        return null;
      }
    }
    /**
     * This method finds contact details of contact that created the lease.
     * @param {Object} connection 
     */
    async getCreatedByInfo(connection) {
      if(!this.id) e.th(500,"Lease id not set");
      if (this.created_by) {
        this.CreatedBy = await models.Contact.findById(connection, this.created_by);
      }
    }

    async findSecurityDepositLines(connection){
      let lines = await models.Lease.getSecurityDepositLineForLease(connection, this.id);
      return lines;
    }

    async refundSecurityDeposit(connection, refund_amount, params = {}){

      let amount = refund_amount;
      let { company, user } = params;
      let sec_deposit_lines = await this.findSecurityDepositLines(connection);

      if(!sec_deposit_lines || !sec_deposit_lines.length){
        e.th(400, "This lease doesn't have any security deposit to refund");
      }

      let sec_deposit_amount = sec_deposit_lines.reduce((a,b) => a += b.amount, 0);

      if(sec_deposit_amount < amount) {
        e.th(400, "This refund amount is greater than security deposit amount left");
      }

      if(sec_deposit_lines && sec_deposit_lines.length){

        let invoice_id = sec_deposit_lines[0].invoice_id;
        let invoice_line_id = sec_deposit_lines[0].invoice_line_id;

        for(let i = 0; i < sec_deposit_lines.length; i++ ) {
          let line_alloc = sec_deposit_lines[i];
          if(!line_alloc.amount) continue;
          
          let amount_to_unapply = amount;

          if(line_alloc.amount < amount){
            amount_to_unapply = line_alloc.amount;
          }

          let payment = new Payment({ id: line_alloc.payment_id });
          await payment.find(connection);
          let breakdown_id = await payment.unapply(connection, line_alloc.invoice_payment_id, line_alloc.ip_amount - amount_to_unapply, { invoice_line_id });
          await payment.canReverse(connection,{by_pass:true});
          await payment.refund(connection, company, amount_to_unapply, "",  "security deposit refund", null, [breakdown_id]);
          amount -= amount_to_unapply;

          if(amount <= 0) break;
        }

        let invoice = new Invoice({id: invoice_id});
        invoice.amount = refund_amount;

        var data = {
          amount: refund_amount,
          property_id: this.Property && this.Property.id,
          contact_id: this.Tenants && this.Tenants.length && this.Tenants[0].Contact.id,
          lease_id: this.id,
          sub_method: Enums.ADJUSTMENT_SUB_METHOD.SECURITY_DEPOSIT,
          notes: "Security deposit refund adjustment",
          
        }
        let creditPayment = new Payment();
        await creditPayment.createAdjustment(connection, data, user.id);
        await creditPayment.getPaymentApplications(connection);
        await creditPayment.applyToInvoices(connection, [invoice], { 
            applied_line: {
            invoice_line_id: invoice_line_id,
            type: 'line'
          } 
        });
        
      }

    }

  async findBalance(connection, payload) {
    const result = await models.Billing.findBalance(connection, {
      lease_id: this.id,
      ...payload
    });

    this.balance = result.balance;
  }

  async restoreUnit(connection) {

    if (!this.Unit?.id) {
      await this.findUnit(connection);
    }

    if (!this.Property.Access) {
      await this.Property.getAccessControl(connection);
    }

    let body = {
      late_catch: 0
    }

    await this.Property.Access.updateCatches(this.Unit.id, body);

  }


  async createLockRemovalTask(connection, params = {}) {    
    if (!this.Unit?.id) {
      await this.findUnit(connection);
    }

    console.log("lockRemovalTask Lease ", this.id);

    await this.Unit.getProperty(connection);
    await this.Unit.Property.getAccessControl(connection);

    console.log("Access Control found for lease", this.id);

    // if is Noke, don't create the task, just unlock, and save lease status
    if (this.Unit.Property.Access.access_name.toLowerCase() === Enums.GATE_ACCESS.VENDORS.NOKE) {
      await this.Unit.removeOverlock(connection);
      console.log("Lock removed  for lease...", this.id);
    } else {
      let isTaskAlreadyPresent = await models.Todo.findTasksByObjectId(connection, this.id, [Enums.EVENT_TYPES.DELINQUECY.LOCK_REMOVAL], Enums.TASK_TYPE.LEASE);
      if (!isTaskAlreadyPresent?.length) {
        let task = new Task({
          company_id: this.Property.company_id,
          event_type: Enums.EVENT_TYPES.DELINQUECY.LOCK_REMOVAL,
          task_type: Enums.TASK_TYPE.LEASE,
          created_by: params.logged_in_user_id,
          object_id: this.id
        });

        await task.save(connection, this.Property.company_id);
        console.log("LockRemovalTask Created for lease", this.id)
      }
    }
  }

  async findContacts(connection, payload = {}) {
    return await models.Lease.getContacts(connection, {
      lease_id: this.id,
      ...payload
    });
  }

  async removeAuctionStatus(connection) {
    console.log(`Update auction status for lease: ${this.id}`);
    await models.Lease.updateAuctionStatus(connection, null, this.id);
  }

  async determineLeaseStanding(connection, payload = {}) {
    const { date } = payload;

    const { LEASE_STANDING } = Enums;
    const currentDate = date || await this.getCurrentLocalPropertyDate(connection);
    const isLeaseClosed = this.moved_out !== null || (this.end_date && (moment(this.end_date).startOf('day') <= moment(currentDate).startOf('day')));
    const isBalanceDue = this.balance > 0;
    const currentStanding = await this.getStanding(connection);

    if(isLeaseClosed) {
      return isBalanceDue ? LEASE_STANDING.BALANCE_DUE : LEASE_STANDING.LEASE_CLOSED;
    }
    
    if(isBalanceDue || currentStanding === LEASE_STANDING.AUCTION) {
      return currentStanding;
    }

    return LEASE_STANDING.CURRENT;
  }

  // Steps which should be execueted when lease past due balance becomes = 0
  async endDelinquencyProcess(connection, payload = {}) {
    if (!this.id) e.th(500, 'LeaseId is required to end delinquency process steps');
    console.log(`End delinquency process started for lease: ${this.id}`);
    console.log(`End delinquency for lease: ${this.id} payload:`, payload);

    const { contact_id, delinquency_id, res, lease_event_type } = payload;
    const { locals } = res;
    const { EVENT_TYPES_COLLECTION, TASK_TYPE, LEASE_AUCTION_STATUS } = Enums;
    const loggedInUserId = locals.contact?.id;
    const apiKeyId = locals.api?.id;
    const errors = [];
    console.log(`Delinquency payload assigned to constants for lease: ${this.id}`);
    await this.find(connection);
    console.log(`Delinquency lease info:`, this);
    await this.findUnit(connection);
    console.log(`Delinquency lease & unit: ${this.id} & ${this.Unit}`);
    await this.getProperty(connection);
    console.log(`Delinquency lease & property: ${this.id} & ${this.Property}`);
    const isLeaseClosed = this.moved_out !== null;

    if(!this.balance) {
      await this.getCurrentBalance(connection);
    }

    if(!isLeaseClosed && this.balance > 0) {
      console.log(`Balance is still present on lease ${this.id}`);
      return;
    }

    if (delinquency_id) {
      this.Delinquency = new Delinquency({ id: delinquency_id });
      await this.Delinquency.find(connection);
      console.log(`Found the delinquency ${this.Delinquency} for lease ${this.id}`);
    }

    const currentPropertyDate = await this.getCurrentLocalPropertyDate(connection);
    let contactId = this.Contact?.id || contact_id;  
    if(!contactId) {
      const primaryContact = await this.findContacts(connection, { is_primary: true });
      contactId = primaryContact[0].contact_id;
      console.log(`Found the contactId ${contactId} for lease ${this.id}`);
    }

    // finding lease Auction object
    await this.findAuction(connection,this.Property?.company_id);

    let actions = {
      collection_call: async () => {
        await Todo.dismissTasks(connection, this.id, EVENT_TYPES_COLLECTION.COLLECTION_CALL, TASK_TYPE.LEASE, loggedInUserId, apiKeyId);
      },
      overlock_space: async () => { 
        await Todo.dismissTasks(connection, this.id, EVENT_TYPES_COLLECTION.OVERLOCK_SPACE, TASK_TYPE.LEASE, loggedInUserId, apiKeyId);
        await this.removeToOverlockFromSpace(connection);
      },
      auction: async () => {
        await Todo.dismissTasks(connection, this.id, EVENT_TYPES_COLLECTION.AUCTION, TASK_TYPE.LEASE, loggedInUserId, apiKeyId);
        
        if(!isLeaseClosed && [Enums.LEASE_AUCTION_STATUS.SCHEDULE,Enums.LEASE_AUCTION_STATUS.SCHEDULED,Enums.LEASE_AUCTION_STATUS.AUCTION_DAY,Enums.LEASE_AUCTION_STATUS.AUCTION_PAYMENT].includes(this.auction_status) && !this.LeaseAuction?.payment_id){
          await this.removeLeaseAuction(connection);
          await this.removeAuctionStatus(connection);
        }

        if(isLeaseClosed && [Enums.LEASE_AUCTION_STATUS.AUCTION_PAYMENT,Enums.LEASE_AUCTION_STATUS.MOVE_OUT].includes(this.auction_status)){
          await this.updateAuctionStatus(connection,Enums.LEASE_AUCTION_STATUS.COMPLETE);
        }
      },
      lease_standing: async () => {
        const leaseStanding = await this.determineLeaseStanding(connection, { date: currentPropertyDate });
        await this.updateStanding(connection, leaseStanding);
      },
      accept_payments: async () => {
        if (this.deny_payments) {
          await this.acceptPayments(connection);
        }
      },
      remove_overlock: async () => {

        let overlock = await this.Unit.getActiveOverlock(connection);
        if(lease_event_type && lease_event_type === Enums.LEASE_AUCTION_STATUS.MOVE_OUT){
          await this.Unit.removeOverlock(connection);
        }else{
          let current_lease = await this.Unit.getCurrentLease(connection);
          console.log(`To Overlock status for lease: ${this.id} - current lease data:`, current_lease);
          console.log(`Overlocked data for lease: ${this.id} - overlock:`, overlock);
          if (current_lease?.to_overlock == 0 && overlock) {
            console.log(`calling create lock removal task for lease:`, this.id);
            await this.createLockRemovalTask(connection);
          }  
        }
        
      },
      gate_access: async () => {
        const contact = new Contact({ id: contactId });

        await this.Property.getAccessControl(connection);
        if (this.Property.Access.access_name.toLowerCase() === 'derrels') {
          // there is 0 balance for the lease, restore the unit
          console.log('Activating Gate Access for unit');
          await this.restoreUnit(connection);
        } else {

          await contact.findBalance(connection, {
            property_id: this.Property?.id
          });

          console.log('currentBalance: ', contact.balance);
          if (contact.balance <= 0) {
            console.log('Activating Gate Access');
            await contact.updateAccessStatus(connection, { property: this.Property });
          }
        }
      },
      end_delinquency: async () => {
        await this.getDelinquency(connection, null, true);
        if(this.Delinquency?.id) {
          await this.endDelinquency(connection);
        }
      }
    }

    if(!isLeaseClosed && (this.auction_status == Enums.LEASE_AUCTION_STATUS.AUCTION_PAYMENT || this.auction_status == Enums.LEASE_AUCTION_STATUS.MOVE_OUT) && this.LeaseAuction?.payment_id) {
      actions = {
        pauseDelinquency: async () => {
          await this.getDelinquency(connection, null, true);
          if(this.Delinquency?.id) {
            await this.pauseDelinquency(connection,"Pause due to auction payment",contactId,this.Delinquency.id);
          }
        }
      }
    }

    for (let action in actions) {
      try {
        await connection.beginTransactionAsync();
        console.log(`Executing ${action} for lease ${this.id}`);
        await actions[action]();
        await connection.commitAsync();
      } catch (err) {
        await connection.rollbackAsync();
        console.log(`Delinquency for lease ${this.id} action error: `, err);
        errors.push(err?.stack || err);
      }
    }

    return { 
      are_actions_execueted: true,    
      errors
    };
  }

    /**
     * It returns all the leases for a given property.
     * @param {Object} connection database connection details
     * @param {Object} searchParams This is an object that contains the search parameters
     * @param {String} property_id the id of the property you want to search for
     * @param {Boolean} count flag for returning total count 
     * @returns An array containing lease objects
     */
    static async findAllByProperty(connection, searchParams, property_id, count) {
      let leases = await models.Lease.getAllByPropertyId(connection, searchParams, property_id, count);
      if (leases && leases.length) {
        if (count) {
          return leases[0].count;
        } else {
          const lease_ids = leases.map((l) => l.id);
          const allTenants = (await models.ContactLeases.findTenantDetails(connection, lease_ids)) ?? [];
          const allOpenInvoices = (await models.Billing.findAllOpenInvoicesByLeaseIds(connection, lease_ids)) ?? [];
          const invoice_ids = allOpenInvoices.filter((inv) => inv.total_payments > 0).map((inv) => inv.id);
          let allOpenInvoicePayments = [];
          if (invoice_ids.length) {
            allOpenInvoicePayments = (await Invoice.getPaymentDetailsByInvoiceIds(connection, invoice_ids)) ?? [];
          }
  
          const allDiscounts = (await models.Promotion.getDiscountsByLeaseIds(connection, lease_ids)) ?? [];
          let appliedPromotions = [];
          if (allDiscounts.length) {
            const promotion_ids = [...new Set(allDiscounts.map((obj) => obj.promotion_id).filter(Boolean))];
            if (promotion_ids.length) appliedPromotions = await models.Promotion.getByIds(connection, promotion_ids);
          }
  
          let leaseOpenInvMap = {};
          for (let openInvoice of allOpenInvoices) {
            const total_due = Math.round((openInvoice.subtotal + openInvoice.total_tax) * 1e2) / 1e2;
            const total_balance =
              Math.round((total_due - openInvoice.total_payments - openInvoice.total_discounts) * 1e2) / 1e2;
            openInvoice["total_due"] = total_due;
            openInvoice["balance"] = total_balance;
            openInvoice["sub_total"] = openInvoice.subtotal;
            openInvoice["discounts"] = openInvoice.total_discounts;
            openInvoice["Payments"] = [];
            for (let payment of allOpenInvoicePayments) {
              if (payment.invoice_id === openInvoice.id) {
                openInvoice["Payments"].push(payment);
              }
            }
            if (openInvoice.lease_id in leaseOpenInvMap) {
              leaseOpenInvMap[openInvoice.lease_id].push(openInvoice);
            } else {
              leaseOpenInvMap[openInvoice.lease_id] = [openInvoice];
            }
          }
  
          let leaseDiscountMap = {};
          for (let discount of allDiscounts) {
            discount["Promotion"] = {};
            for (let promo of appliedPromotions) {
              if (promo.id === discount.promotion_id) {
                discount.name = promo.name || "";
                discount.round = promo.round;
                discount["company_id"] = null;
                discount.msg = "";
                discount["Promotion"] = promo;
              }
            }
            if (discount.lease_id in leaseDiscountMap) {
              leaseDiscountMap[discount.lease_id].push(discount);
            } else {
              leaseDiscountMap[discount.lease_id] = [discount];
            }
          }
  
          for (let lease of leases) {
            const lease_id = lease.id;
            lease["Tenants"] = allTenants.filter((tenant) => tenant.lease_id === lease_id);
            lease["Discounts"] = leaseDiscountMap[lease.id] ?? [];
            lease["OpenInvoices"] = leaseOpenInvMap[lease.id] ?? [];
          }
          return leases;
        }
      }
      return leases;
    }

    /**
     * It returns last rent raise details and future rent raise details for the given lease id
     * @param {Object} connection database connection details
     * @param {String} type Search for future rent raise details if the type is future, else search for past/current rent raise details.
     * @returns An array containing lease rent raise details
     */
    async getRentRaiseDetails(connection, type) {
      if(!this.id) e.th(500, "Lease Id Not Set");
      let rent_raise = type === "future" ? "future_rent_raise" : "last_rent_raise"
      let rent_amount = type === "future" ? "future_rent_raise_amount" : "last_rent_raise_amount"
      let rentRaiseDetails = await models.Lease.getRentRaiseDetails(connection, this.id, type);
      if (rentRaiseDetails.length) {
        this[rent_raise] = rentRaiseDetails[0].rent_raise_date;
        this[rent_amount] = rentRaiseDetails[0].rent_change_amount;
      }
    }

    /**
     * It gets the rent at move in for a lease.
     * @param connection - the connection to the database
     */
    async getMoveInRent(connection) {
      if(!this.id) e.th(500, "Lease Id Not Set");
      let moveInRent = await models.Lease.getMoveInRent(connection, this.id)
      if (moveInRent.length) this.move_in_rent = moveInRent[0].price;
    }
    
    /**
     * It returns whether the lease is transferred or not
     * @param connection - the connection to the database
     * @returns True or False.
     */
    async getTransferStatus(connection) {
      if(!this.id) e.th(500, "Lease Id Not Set");
      let is_transferred = await models.Transfer.findByToLeaseId(connection, this.id)
      this.is_transferred = is_transferred ? 1 : 0
    }

    /**
     * It gets the reservation date for a lease
     * @param connection - The connection to the database.
     */
    async getReservationDetails(connection) {
      if(!this.id) e.th(500, "Lease Id Not Set");
      let reservationDetails = await models.Reservation.findByLeaseId(connection, this.id)
      if (reservationDetails) this.reservation_date = moment(reservationDetails.time).format('YYYY-MM-DD');
    }

  /**
   *This method creates an instance of contact associated with the lease
   */
  async getContactByLeaseId(connection) {
    if (!this.id) e.th(500, "Lease Id Not Set");
    let contact = await models.Contact.findByLeaseId(connection, this.id);
    this.Contact = new Contact({ id: contact[0].id });
    await this.Contact.find(connection);
  }

  /**
   * This method gets all the uploads that are not signed for this lease
   */
  async getUnsignedUploads(connection) {
    if (!this.id) e.th(500, "Lease Id Not Set");
    this.Uploads = await models.Upload.findUnsignedUploads(connection, this.id);
  }
  
  /**
   * This method checks to see if the lease is created by an integration.
   * @returns A boolean value.
   */
  async isIntegration(connection) {
    if (!this.id) e.th(500, "Lease Id Not Set");
    await this.getCreatedByInfo(connection);
    let user = await models.User.findById(connection, this.CreatedBy.user_id);
    return (!!user?.gds_application_id);
  }


  /**
   * This method checks whether all documents had been signed
   * @returns A boolean value.
   */
  async hasAllDocumentsBeenSigned(connection) {
    if (!this.id) e.th(500, "Lease Id Not Set");
    await this.getUploads(connection);
    if (!this.Uploads.length) return false;
    for (let upload of this.Uploads) {
      if (!upload?.signers?.[0]?.signed) return false;
    }
    return true;
  }

  /**
   * It gets the last rent raise date and amount for a lease.
   * Update for veritec
   */
  async getPastRentRaise(connection) {
    if (!this.id) e.th(500, "Lease Id Not Set");
    let rentDetails = await models.Lease.getPastRentRaise(connection, this.id);
    if (rentDetails.length) {
      if (rentDetails[1]) {
        this.last_rent_raise = rentDetails[0].start_date;
        this.last_rent_raise_amount = rentDetails[1].price;
      }
    }
  }

  /**
   * Method to generate a key -> Array map for a given object
   * @param {Array} data An Array of Objects
   * @param {String} key A key in each object by which the map is generated
   * @returns {Object} A Key-Array Map for given data
   */
  static async generateMap(data, key) {
    let map = {}
    for (let element of data) {
        if (element[key] in map) {
            map[element[key]].push(element)
        } else {
            map[element[key]] = [element]
        }
    }
    return map
  }

  static async getRecurringTransactions(connection, searchParams, properties) {
    let total_records = await models.Invoice.findRecurringInvoiceLines(connection, searchParams, properties, true);
    let invoiceLines = await models.Invoice.findRecurringInvoiceLines(connection, searchParams, properties, false);
    let invoiceLineIds = []
    invoiceLines.forEach((invoiceLine) => {
        delete invoiceLine.total_records
        invoiceLine['promotions'] = []
        invoiceLineIds.push(invoiceLine.id)
    })
    if (invoiceLineIds.length) {
        let discountLines = await models.Discount.findDiscountLinesByInvoiceIds(connection, invoiceLineIds);
        let discountHashMap = await this.generateMap(discountLines, 'invoice_line_id');
        for (let invoiceLine of invoiceLines) {
            invoiceLine['promotions'] = discountHashMap?.[invoiceLine?.id] ?? [];
        }
    }
    return {
        data: invoiceLines,
        total_records: total_records
    }
  }

  async findFutureUnpaidInvoices(connection, date) {
    if (!this.id) e.th(500, "Invalid lease id.");
    let invoices = await models.Lease.getFutureUnpaidInvoicesByLease(connection, this.id, date);
    console.log(`Unpaid Future invoices for lease - ${this.id}`, invoices);
    return invoices;
  }
  async saveValuePrices(connection, data) {
    if (!this.id) e.th(500, "Invalid lease id.");
    return await models.Lease.saveValuePrice(connection,data);
  }

  async assignRentPlan(connection, data) {
    if (!this.id) e.th(500, "Invalid lease id.");
    data.lease_id = this.id;
    await PropertyRentManagementModel.bulkInsertLeaseToPlanConfig(connection, [data])
  }

  async getMoveInData(connection) {
    this.move_in =  await models.Lease.findMoveInData(connection, this.id);
  }
  

  async getStoredContents(connection){
    if(!this.id) e.th(500, "Lease Id Not Set");
    let storedContents = await models.Lease.getStoredContents(connection, this.id);
    
    // To find others and move to the last position of the stored content data
    let otherItems = []
    let contents = []
    for (let content of storedContents) {
      if (content.name === 'Others') {
        otherItems?.push(content?.value ?? null)
      } else {
        contents?.push(content?.name ?? null)
      }
    }
    this.stored_contents = [...contents, ...otherItems].join(', ')
  }
  
  async generateInvoiceAccordingToThreshold(connection, payload){
    let {billing_date, company} = payload; 

    if(!billing_date){ 
      let prop_date = await this.getCurrentLocalPropertyDate(connection);
      billing_date = moment(prop_date);
    }

    let is_threshold_passed = await this.hasInvoiceGenerationThresholdPassed(connection, {billingDate: billing_date.clone()});

    if(is_threshold_passed){
      let invoicePeriod = {};
      invoicePeriod.start = billing_date.clone();
      invoicePeriod.end = this.getInvoicePeriodEnd(invoicePeriod.start.clone());

      let payload = {
        dryrun: false,
        invoicePeriod,
        company
      };
      await this.generateInvoice(connection, payload);
    }

  }

  async getTransferredUnitInfo(connection){
      let tranferred_data = await models.Transfer.getTransferredUnitInfo(connection, this.id);
      this.transferred_from = tranferred_data?.unit_id;
    }

  async checkExemptStatusForLease(connection) {
    this.exempted = await models.Lease.checkExemptStatusForLease(connection, this.id);
  }
  
  /**
  * Retrieves the last payment made on a lease and updates the last_payment_date property of the current object.
    If a lease_id is provided as a parameter, the function retrieves the last payment made on the specified lease.
    Otherwise, it retrieves the last payment made on the lease associated with the current object.
  * @param {Object} connection - The database connection object.
  * @returns {Promise<Object>} - The last payment made for the lease.
  */
  async getLastPaymentByLease(connection, lease_id) {
    let last_payment = await models.Payment.getLastPaymentByLease(connection, lease_id ?? this.id)
    this.last_payment_date = (last_payment?.date && moment(last_payment.date).format("YYYY-MM-DD")) || "";
    return last_payment
  }


  // function to show "remove lock" on door status & and to create a task for lock removal. Situation: when due balance is 0 but To Overlock is not executed 
  async createLockRemovalTaskOnToOverLockState(connection){
    if (!this.Unit?.id) {
      await this.findUnit(connection);
    }  
    let current_lease = await this.Unit.getCurrentLease(connection);
    let check_overlock = await this.Unit.getActiveOverlock(connection);
    console.log(`check_overlock in createLockRemovalTaskOnToOverLockState for lease: ${this.id} check_overlock: `, check_overlock);
    console.log(`current_lease data - createLockRemovalTaskOnToOverLockState for lease: ${this.id}: `, current_lease);
    if(current_lease?.to_overlock == 1 && !check_overlock?.length){
      console.log(`Balance is 0 but To Overlock is not executed for lease:`, this.id);
      await this.Unit.getProperty(connection);
      await this.Unit.Property.getAccessControl(connection);
      if (this.Unit.Property.Access.access_name.toLowerCase() !== Enums.GATE_ACCESS.VENDORS.NOKE) {
        try {
          await this.Unit.setOverlock(connection);
          console.log("overlocked set for lease: ", this.id);
        } catch(err){
            if(err.code !== 409){
                throw err;
            }
        }
      } // end of if

    }    
  } // end of function create

  async checkOverlockStatusAndRemove(connection, apiKeyId, loggedInUserId){

    if (!this.Unit?.id) {
      await this.findUnit(connection);
    }  

    await this.Unit.getProperty(connection);
    await this.Unit.Property.getAccessControl(connection);
  
    let overlock = await this.Unit.getActiveOverlock(connection);
  
    if(overlock && overlock.status == 1){
      let isTaskAlreadyPresent = await models.Todo.findTasksByObjectId(connection, this.id, [Enums.EVENT_TYPES.DELINQUECY.LOCK_REMOVAL], Enums.TASK_TYPE.LEASE);
      if(isTaskAlreadyPresent?.length){
        await Todo.dismissTasks(connection, this.id, Enums.EVENT_TYPES_COLLECTION.LOCK_REMOVAL, Enums.TASK_TYPE.LEASE, loggedInUserId, apiKeyId);
        await this.Unit.removeOverlock(connection);
      }
    }
  }

  async verifyLeasePayment(connection, contact_id){
    const result = await models.Payment.getPaymentAppliedOnMultipleLease(connection, contact_id, this.id);
    if (result && result.length) e.th(400, "We cannot allow unlinking of these spaces because a single payment is applied to the invoices of these spaces. Please contact the Hummingbird team.");
  }

  async processPaymentCycleShifting(connection, current_date, res, params = {}) {
    let { payment_cycle, voided_by, dryrun = false, previous_payment_cycle } = params;

    let last_billed = null, invoices = [], open_payments = [],
       rent_invs_from_date_onward = [], curr_inv, delete_discount_ids = [];

    console.log(`Processing Payment Cycle Shifting for lease ${this.id}`);

    // fetch PTD
    if(this?.rent_paid_through == null)
      await this.getPaidThroughDate(connection, { 
        date: current_date
      });

    // get the current period w.r.t current_date,
    rent_invs_from_date_onward = await this.findRentInvoicesFromDateOnward(connection, current_date);

    if(rent_invs_from_date_onward.length == 0) {
      const billingIntervals = await this.getBillingIntervals(connection);
      last_billed = moment(billingIntervals.current.end);
      return { last_billed, open_payments, delete_discount_ids };
    }

    curr_inv = rent_invs_from_date_onward[0];

    // comparing the PTD with current_period 
    if(moment(this.rent_paid_through).isSameOrAfter(curr_inv.period_end)){
      // payment is in future
      last_billed = moment(this.rent_paid_through);
    } else if (this.rent_paid_through == null || moment(this.rent_paid_through).isBefore(curr_inv.period_end)){

      let pay_cycle_revert_threshold_date = await this.calculatePaymentCycleRevertThresholdDate(connection, curr_inv.due, payment_cycle);
      
      // if "pay_cycle_revert_threshold_date" has not passed include the "current_month" otherwise move to "next month"
      if(moment(current_date).isSameOrBefore(pay_cycle_revert_threshold_date)){
        last_billed = moment(curr_inv.period_start).subtract(1, 'days');
      } else {
        last_billed = moment(curr_inv.period_end);
      }
    }

    console.log(`Last_Billed (${last_billed}) of this lease ${this.id}`);
    res.fns.addStep('PaymentCycleShift-CalculatedLastBilled');

    // if Q/A -> M or Q -> A or A -> Q, removing the Previous Payment-Cycle and Discounts
    if (previous_payment_cycle != null) {
      
      let active_payment_cycles =  await this.getActivePaymentCyclesFromDateOnward(connection, moment(last_billed).clone().add(1, 'days').format('YYYY-MM-DD'));
      delete_discount_ids = active_payment_cycles?.map(pc => pc.discount_id);
      console.log(`Discount_ids (${delete_discount_ids.join(', ')}) to exclude for this lease ${this.id}`);

      if(!dryrun){
        if(active_payment_cycles.length > 0){
          let discount = new Discount({ id: active_payment_cycles[0].discount_id });
    
          await discount.find(connection);
          if(moment(discount.start).isBefore(last_billed)){
            discount.end = moment(last_billed).format('YYYY-MM-DD');
            await discount.save(connection);
            delete_discount_ids = delete_discount_ids.filter(d_id => d_id != discount.id);
          }
          
          await this.removePaymentCycle(connection, current_date, { delete_discount_ids });
        } else {
          console.log(`No Active Payment cycle found for lease ${this.id} while shifting`);
        }
      }
      
      res.fns.addStep('PaymentCycleShift-RemovedPaymentCycle');
    }


    invoices = rent_invs_from_date_onward.filter(inv => moment(inv.period_start).isAfter(last_billed));


    for (let i = 0; i < invoices?.length; i++) {
      let invoice = new Invoice({ id: invoices[i].id });
      await invoice.find(connection);

      if (invoice?.Payments?.length > 0) {
        let applied_payments = invoice.Payments.map(pay => {
          return { id: pay.payment_id, amount: pay.amount }
        });
        console.log(`applied_payments for invoice ${invoice.id} of lease ${invoice.lease_id}\n`, JSON.stringify([...applied_payments], null, 2));
        open_payments = [...open_payments, ...applied_payments];
      }
      if (!dryrun) {
        // unapply payments from those invoices
        await invoice.unapplyPayments(connection);

        // void those invoices
        await invoice.void_invoice(connection, voided_by);
        res.fns.addStep('PaymentCycleShift-PaymentUnappliedAndInvoicesVoided');
      }

    }

    return { last_billed, open_payments, delete_discount_ids };

  }

  async findRentInvoicesFromDateOnward(connection, date, params = {}) {
    let { lease_id } = params;
    let invoices = await models.Invoice.findRentInvoicesFromDateOnward(connection, lease_id || this.id, date);
    return invoices;
  }

  async calculatePaymentCycleRevertThresholdDate(connection, date, payment_cycle) {
    if (this?.revert_payment_cycle == null) {
      let payment_cycle_option = await this.getPaymentCycleOptions(connection, payment_cycle);
      if(!payment_cycle_option) e.th(400, "Payment cycle not found");
    }
    
    let pay_by_date = moment(date).clone().add(this.revert_payment_cycle, 'days').format('YYYY-MM-DD');

    // let pay_by_date = moment(current_date).startOf('month').add((this.revert_payment_cycle + this.bill_day - 1), "days").format("YYYY-MM-DD");
    console.log(`PaymentCycleRevertThresholdDate ${pay_by_date} for lease ${this.id}`);
    return pay_by_date;
  }

  computePaymentCycleInvoices() {
    const { PAYMENT_CYCLES } = Enums; 

    switch(this.payment_cycle) {
      case PAYMENT_CYCLES.MONTHLY:
        return 1;
      case PAYMENT_CYCLES.QUARTERLY:
        return 3;
      case PAYMENT_CYCLES.ANNUAL:
        return 12;
      default:
        return 1;
    }
  }

  /*isValidNoOfInvoices(payload) {
    const { billed_months, throw_error = true } = payload;
    const requiredNoOfMonths = this.computePaymentCycleInvoices();
    
    if(billed_months % requiredNoOfMonths === 0) {
      return true;
    }

    if(throw_error) {
      e.th(500, `You are trying to create ${billed_months} invoices, it must be in groups of ${requiredNoOfMonths}`);
    }

    return false;
  }*/

  async shouldGenerateNewPaymentCycle(connection, payload) {
    const { next_billing_date } = payload;

    const leasePaymentCycles = await models.Lease.getPaymentCycle(connection, {
      lease_id: this.id,
      date: next_billing_date
    });

    const leasePaymentCycle = leasePaymentCycles?.length ? leasePaymentCycles[0] : null;
    const leasePaymentCycleStart = leasePaymentCycle?.start_date;
    
    console.log('Should Generate: ', leasePaymentCycle);

    if(leasePaymentCycleStart) {
      if(leasePaymentCycleStart != next_billing_date) {
        e.th(500, 'Some configuration error occured in active payment cycle for this lease. Payment cycle discount might already be present for this period.');
      }

      return false;
    }

    return true;
  }

  async savePaymentCycleIfApplicable(connection, payload = {}) {
    const { PAYMENT_CYCLES } = Enums; 
    if(this.payment_cycle == null || this.payment_cycle == PAYMENT_CYCLES.MONTHLY) {
      return false;
    } 

    const { next_billing_date, billed_months, company_id, dryrun, payment_cycle } = payload;
    return await this.savePaymentCycle(connection, next_billing_date, billed_months, company_id, dryrun, payment_cycle);
  } 

  async isInvoiceThresholdPassed(connection, payload) {
    const { invoice_due_date } = payload;      
    const leaseTemplate = await this.getLeaseTemplate(connection);
    const { invoiceSendDay } = leaseTemplate;
    const currentPropertyDate = await this.getCurrentLocalPropertyDate(connection);

    const isThresholdPassed = moment(currentPropertyDate).isSameOrAfter(moment(invoice_due_date).clone().subtract(invoiceSendDay, 'days'));
    if(isThresholdPassed) {
      return true;
    }

    return false;
  }

  async saveInvoices(connection, payload) {
		const { no_of_months, company, dryrun = false } = payload;
    let invoices = [];

    for(let i = 0; i < no_of_months; i++) {
      let invoice = await this.generateInvoice(connection, { 
        company,
        dryrun: dryrun
      });

      invoices.push(invoice);
    }

    console.log('Invoices to save: ', invoices);
    return invoices;
	}

  async savePaymentCycleChangeInvoicesIfApplicable(connection, payload) {
    const { next_billing_date, company } = payload;
    const billedMonths = this.computePaymentCycleInvoices();
    let isInvoiceThresholdPassed = await this.isInvoiceThresholdPassed(connection, { 
      invoice_due_date: next_billing_date 
    });

    while(isInvoiceThresholdPassed) {
      await this.savePaymentCycleIfApplicable(connection, {
        next_billing_date, 
        company_id: company.id
      });

      await this.saveInvoices(connection, {
        no_of_months: billedMonths,
        company
      });

      const isMultiMonthPaymentCycle = billedMonths > 1;
      if(isMultiMonthPaymentCycle) return;

      isInvoiceThresholdPassed = await this.isInvoiceThresholdPassed(connection, { 
        invoice_due_date: moment(this.last_billed).clone().add(1, 'days') 
      });
    }
  }

  async changePaymentCycle(connection, payload) {
    const { api_info, new_payment_cycle, company } = payload;
    const { contact: admin_contact, api } = api_info.locals;

    await this.find(connection);
    const currentDate = await this.getCurrentLocalPropertyDate(connection);
    const paymentCycleShiftData = await this.processPaymentCycleShifting(connection, currentDate, api_info, { 
      payment_cycle: new_payment_cycle, 
      voided_by: admin_contact, 
      previous_payment_cycle: this.payment_cycle 
    });
    
    const { last_billed, open_payments } = paymentCycleShiftData;
    let newInvoicePeriod = await this.getCurrentInvoicePeriod(connection, last_billed.clone(), 1);
    
    this.last_billed = last_billed;
    this.payment_cycle = new_payment_cycle;
    
    await this.getPaymentCycleOptions(connection, new_payment_cycle);

    await this.savePaymentCycleChangeInvoicesIfApplicable(connection, {
      next_billing_date: newInvoicePeriod.start.clone(),
      company
    });
  
    await this.update(connection, { payment_cycle: this.payment_cycle }); 
    
    await Lease.applyUnallocatedBalanceOnlease(connection, company.id, this.id, open_payments, admin_contact.id, ['change_payment_cycle'], api);
  }

  async getAuctionAssets(connection) {
      let files = await models.Upload.getAuctionAssets(connection, this.id);
      let auctionAssets = [];
      for(let i = 0; i < files.length; i++){
          let upload = new Upload({id: files[i].upload_id});
          await upload.find(connection);
          let auctionAsset = new AuctionAsset(upload, files[i].categories, files[i].description, files[i].is_published);
          auctionAssets.push(auctionAsset);
      };
      this.AuctionAssets = auctionAssets;
  }
  async verifyLeasePayment(connection, contact_id){
    const result = await models.Payment.getPaymentAppliedOnMultipleLease(connection, contact_id, this.id);
    if (result && result.length) e.th(400, "We cannot allow unlinking of these spaces because a single payment is applied to the invoices of these spaces. Please contact the Hummingbird team.");
  }

  static async getAllLeaseInfo(connection, leasesArray, property_ids) {

    const leases = await models.Lease.getAllByPropertyId(connection, {}, property_ids, false, "active", leasesArray)
    const allTenants = await models.ContactLeases.findTenantDetails(connection, leasesArray)
    const allOpenInvoices = await models.Billing.findAllOpenInvoicesByLeaseIds(connection, leasesArray)
    const allDiscounts = await models.Promotion.getDiscountsByLeaseIds(connection, leasesArray)
    const promotionIds = [...new Set(allDiscounts.map((obj) => obj.promotion_id).filter(Boolean))];
    const appliedPromotions = await models.Promotion.getByIds(connection, promotionIds)
    const invoice_ids = allOpenInvoices.filter((inv) => inv.total_payments > 0).map((inv) => inv.id);

    let allOpenInvoicePayments = [];
    if (invoice_ids.length) {
      allOpenInvoicePayments = await Invoice.getPaymentDetailsByInvoiceIds(connection, invoice_ids)
    }
    const leaseOpenInvMap = {};
    const leaseDiscountMap = {};

    for (const openInvoice of allOpenInvoices) {
      const total_due = Math.round((openInvoice.subtotal + openInvoice.total_tax) * 1e2) / 1e2;
      const total_balance = Math.round((total_due - openInvoice.total_payments - openInvoice.total_discounts) * 1e2) / 1e2;
      openInvoice["total_due"] = total_due;
      openInvoice["balance"] = total_balance;
      openInvoice["sub_total"] = openInvoice.subtotal;
      openInvoice["discounts"] = openInvoice.total_discounts;
      openInvoice["Payments"] = allOpenInvoicePayments.filter((payment) => payment.invoice_id === openInvoice.id);
      leaseOpenInvMap[openInvoice.lease_id] = leaseOpenInvMap[openInvoice.lease_id] || [];
      leaseOpenInvMap[openInvoice.lease_id].push(openInvoice);
    }

    for (const discount of allDiscounts) {
      discount["Promotion"] = {};
      const promo = appliedPromotions.find((promo) => promo.id === discount.promotion_id);
      if (promo) {
        discount.name = promo.name || "";
        discount.round = promo.round;
        discount["company_id"] = null;
        discount.msg = "";
        discount["Promotion"] = promo;
      }
      leaseDiscountMap[discount.lease_id] = leaseDiscountMap[discount.lease_id] || [];
      leaseDiscountMap[discount.lease_id].push(discount);
    }

    for (const lease of leases) {
      lease["Tenants"] = allTenants.filter((tenant) => tenant.lease_id === lease.id);
      lease["Discounts"] = leaseDiscountMap[lease.id] || [];
      lease["OpenInvoices"] = leaseOpenInvMap[lease.id] || [];
    }

    return leases
  }
}

module.exports = Lease;

const utils = require('../modules/utils');
var Activity = require(__dirname + '/../classes/activity.js');
var Address = require(__dirname + '/../classes/address.js');
var Invoice  = require(__dirname + '/invoice.js');
var Discount = require(__dirname + '/../classes/discount.js');
var Property = require(__dirname + '/../classes/property.js');
var Document = require(__dirname + '/../classes/document.js');
var Promotion  = require(__dirname + '/promotion.js');
var Scheduler = require(__dirname + '/../modules/scheduler.js');
var Enums = require(__dirname + '/../modules/enums.js');
var Service = require(__dirname + '/../classes/service.js');
var Unit = require(__dirname + '/../classes/unit.js');
var Upload = require(__dirname + '/../classes/upload.js');
var Contact = require(__dirname + '/../classes/contact.js');
var Note = require(__dirname + '/../classes/note.js');
var Payment = require(__dirname + '/../classes/payment.js');
var MaintenanceRequest = require(__dirname + '/../classes/maintenance_request.js');
var PaymentMethod = require(__dirname + '/../classes/payment_method.js');
let Transfer = require(__dirname + '/../classes/transfer.js');
let Interaction = require(__dirname + '/../classes/interaction.js');
let {LeaseAuction, AuctionAsset} = require("./lease_auction");
let Delinquency = require(__dirname + '/../classes/delinquency.js');
const Todo = require('./todo');
const Task = require('./task');
var { payBill } = require('../modules/gds_translate');
const { content } = require('pdfkit/js/page');
const { json } = require('body-parser');

