"use strict";

var models  = require('../models');
var settings    = require('../config/settings.js');
var Promise = require('bluebird');
var validator = require('validator');
var moment      = require('moment');
var Insurance = require('./insurance');
var Tokens = require('../modules/tokens');
const ENUM = require('../modules/enums.js');

var e  = require('../modules/error_handler.js');
const utils = require('../modules/utils');


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
        this.promotion_id = data.promotion_id || null;
        this.deny_payments = data.deny_payments || null;
        this.security_deposit = data.security_deposit || null;
        this.monthly = data.monthly || null;
        this.lease_standing_id = data.lease_standing_id || null;
        this.rent_paid_through = data.rent_paid_through || null;
        this.code = data.code || null;
        this.moved_out = data.moved_out || null;
        this.to_overlock = data.to_overlock;
        this.auction_status = data.auction_status || null;
        this.created = data.created;
        this.payment_cycle = data.payment_cycle;
        this.Discounts = [];
        this.Promotion = '';
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
        this.ActiveInsuranceService = [];
        this.ReservationServices = [];
        this.move_in_costs = '';
        this.total_rent_due = '';
        this.balance =0;
        this.OpenInvoices =[];
        this.OpenPayments =[];
        this.PastDue = [];
        this.TotalDue = [];
        this.Ledger = [];
        this.Standing = {};
        this.MoveInInvoice = {};
        this.Property = {};
        this.Vehicles = {}; 
        this.RentRaise = {};
        this.total_past_due = '';
        this.Delinquency = {};
        this.auto_pay_after_billing_date = data.auto_pay_after_billing_date;
        this.last_billed = data.last_billed || null;
        this.sensitive_info_stored = data.sensitive_info_stored || 0;
        this.has_vehicle_storage = data.has_vehicle_storage;
        this.payment_cycle_rent = data.payment_cycle_rent || 0;
        this.rent_past_due_days = '';
        this.stored_contents = "";
        this.Recipient = {}
        this.statuses = [
            'active',
            'pending',
            'innactive',
            'ended'
        ]
        this.primary_contact_id = null;
        this.monthly_cost = 0;

        this.PaymentCycleOptions = [];
        this.confidence_interval = "";

        return this;
    }
       
    validate(connection, hold_token, reservation_id){
        var _this = this;
        var momentStart;
        var momentEnd;

        return Promise.resolve().then(function(){
            if(!validator.isDate(_this.start_date + '')) {
                var error = new Error("Please enter a valid start date");
                error.code = 400;
                throw error;

            };
            if(!validator.isDate(_this.end_date+ '') && validator.equals(_this.monthly + '', '0')) {
                var error = new Error("Please enter a valid end date");
                error.code = 400;
                throw error;
            };
            if(validator.isEmpty(_this.unit_id + '')) {
                var error = new Error("An error occurred. Please try refreshing your browser.");
                error.code = 500;
                throw error;
            };
            momentStart = moment(_this.start_date, 'YYYY-MM-DD').startOf('day');
            momentEnd = moment(_this.end_date, 'YYYY-MM-DD').startOf('day');

            if(momentStart > momentEnd ) {
                var error = new Error("Your end date must be after your start date");
                error.code = 400;
                throw error;
            };
        }).then(function(){

            if(!_this.unit_id) {
                var error = new Error("Unit id not set.");
                error.code = 500;
                throw error;
            };

            return models.Lease.findLeaseConflict(connection, _this).then(function(conflicts){
                if(conflicts.length){
                    var error = new Error("Your dates overlap with an existing lease starting on " + moment(conflicts[0].start_date).format('MM/DD/YYYY') + ". Please check your dates and try again.");
                    error.code = 409;
                    throw error;

                }
                return true;
            }).then(() => {
                return models.Reservation.findByUnitId(connection, _this.unit_id).then(function(reservation){
                    if(reservation.length && reservation[0].id != reservation_id){
                        var error = new Error("This unit is reserved.");
                        error.code = 409;
                        throw error;
                    }
                    return true;
                });

            }).then(() => {
                return models.Unit.getHold(connection, _this.unit_id).then(function(hold){
                    if(hold && hold.id != hold_token){
                        var error = new Error("This unit is being held by another customer.");
                        error.code = 409;
                        throw error;
                    }
                    return true;
                });
            });

        })
    }

    save(connection, hold_token, reservation_id){
        var _this = this;
        return Promise.resolve().then(function(){
            return _this.validate(connection, hold_token, reservation_id);
        }).then(function(validationRes){

            if(!validationRes) throw _this.msg;
            var save = {
                id: _this.id,
                unit_id: _this.unit_id,
                start_date: _this.start_date,
                end_date: _this.end_date,
                bill_day: _this.bill_day,
                create_invoice_day: _this.create_invoice_day,
                notes: _this.notes,
                terms: _this.terms,
                rent: _this.rent,
                security_deposit: +_this.security_deposit,
                payment_cycle: _this.payment_cycle,
                token: _this.token,
                achtoken: _this.achtoken,
                status: _this.status == 'ended' ? 1 : _this.status,
                send_invoice: _this.send_invoice,
                promotion_id: _this.promotion_id,
                monthly: _this.monthly,
                code: _this.code,
                moved_out: _this.moved_out,
                auto_pay_after_billing_date: this.auto_pay_after_billing_date
            };

            return models.Lease.save(connection, save, _this.id).then(function(result) {
                if (result.insertId) _this.id = result.insertId;
                return true;
            });
        }).catch(function(err){
            console.log(err);
            throw(err);
        })
    }

    async close(connection, move_out){

        return await models.Lease.save(connection, {
            moved_out: move_out,
            end_date: move_out
        }, this.id);

    }

    async getLeaseRentChangeId(connection) {
        // This function will return the ID for next rent change of the lease
        if(!this.id) e.th(500, "Lease Id Not Set");
        return await models.Lease.getLeaseRentChangeId(connection, this.id);
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
            await models.Lease.AddTenantToLease(connection, contacts[i].id, this.id)
        }



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

    async saveStanding(connection, lease_standing_id, date){
        if(!this.id) e.th(500, "An error occurred");

        await models.Lease.saveStandingActivity(connection, this.lease_standing_id, lease_standing_id, this.id);
        await models.Lease.save(connection, { lease_standing_id: lease_standing_id}, this.id);

        // save activity. Emit Event?
        // let activity = new Activity();
        // await activity.create(connection, company.id, null, 15, 35, this.Tenants[i].contact_id);

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

    async suspendTenants(connection, company, property){

        if(property){
            this.Property = property;
        } else {
            if(!this.Property){
                await this.getProperty(connection, company.id);
            }
        }
        await this.Property.getAccessControl(connection);
        
        if(!this.Property.Access) return;

        if (this.Property.Access.access_name.toLowerCase() === 'derrels') {

            await this.Property.Access.suspendUnit(this.unit_id);

        } else {

            await this.getTenants(connection);

            // TODO if gate is noke, dont make a task
            for (let i = 0; i < this.Tenants.length; i++) {
                console.log("suspending User");
                await this.Property.Access.suspendUser(this.Tenants[i].contact_id);
                // save activity. Emit Event?
                let activity = new Activity();
                await activity.create(connection, company.id, null, 15, 35, this.Tenants[i].contact_id);
            }
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
            promotion_id: _this.promotion_id,
            monthly: _this.monthly,

            Unit: _this.Unit,
            PaymentMethods: _this.PaymentMethods,
            Invoices: _this.Invoices,
            Invoice: _this.Invoice,
            auto_pay_after_billing_date: this.auto_pay_after_billing_date
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
        let lease = await  models.Lease.findById(connection, this.id);
        await this.assembleLease(lease);

    }

    assembleLease(lease){
        if(!lease) {
            var error = new Error("Lease not found.");
            error.code = 404;
            throw error;
        };
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
        this.promotion_id = lease.promotion_id;
        this.discount_id = lease.discount_id;
        this.lease_standing_id = lease.lease_standing_id;
        this.status = lease.status;
        this.decline_insurance = lease.decline_insurance;
        this.deny_payments = lease.deny_payments;
        this.moved_out = lease.moved_out;
        this.to_overlock = lease.to_overlock;
        this.created = lease.created;
        this.insurance_exp_month = lease.insurance_exp_month;
        this.insurance_exp_year = lease.insurance_exp_year;
        this.rent_change_exempt = lease.rent_change_exempt;
        this.deny_payments = lease.deny_payments;
        this.auction_status = lease.auction_status;
        this.advance_rental = lease.advance_rental;
        this.created_by = lease.created_by;
        this.auto_pay_after_billing_date = lease.auto_pay_after_billing_date;
        this.sensitive_info_stored = lease.sensitive_info_stored;
        this.payment_cycle = lease.payment_cycle;

        if(this.end_date && moment(this.end_date, 'YYYY-MM-DD').format('x') < moment().startOf('day').format('x')){
            this.status = 'ended';
        }

        return Promise.resolve().then(() => true);
    }

    async findFullDetails(connection, company_id, properties){

        await this.findUnit(connection);
        await this.Unit.getCategory(connection);
  
  
        await this.getProperty(connection, company_id, properties);
        await this.getUnitDetails(connection);
        await this.Property.getPhones(connection);
        await this.Property.getAddress(connection);
        await this.Property.getEmails(connection);
  
        await this.getTenants(connection);
  
        if(!this.Tenants.length) e.th(409,"Please add a tenant to this lease");

        this.getTotalRentDue(connection);
        await this.getMoveInCosts(connection);
  
        this.Unit.Utilities = await models.Unit.getUtilities(connection, this.Unit.id);
        this.Unit.Amenities = await models.Amenity.findUnitAmenityNames(connection,  this.Unit.id, this.Unit.type);
        this.AmenityTypes = await models.Amenity.findAllAmenities(connection, this.Unit.type, this.Property.id);
  
        await this.getServices(connection);
        await this.getPastDueInvoices(connection);
    }

    async findFull(connection, company, properties, document, recipient) {

        
        const currentDate = await this.getCurrentLocalPropertyDate(connection);
        const company_id = company.id;

        const token_obj = Tokens.convert_obj_keys(document.Details.tokens);
        const pricingTables = document.Details.pricing?.tables;

        if(Tokens.unit.filter(t => token_obj[t]).length){
            await this.findUnit(connection);
            await this.Unit.getCategory(connection);
            await this.getProperty(connection, company_id, properties);
            await this.getUnitDetails(connection);
            this.Unit.Utilities = await models.Unit.getUtilities(connection, this.Unit.id);
            this.Unit.Amenities = await models.Amenity.findUnitAmenityNames(connection, this.Unit.id, this.Unit.type);
            this.AmenityTypes = await models.Amenity.findAllAmenities(connection, this.Unit.type, this.Property.id);
        }

        if(Tokens.property.filter(t => token_obj[t]).length){
            console.log('Looking at the property')
            await this.getProperty(connection, company_id, properties);
        }
        if(Tokens.property_phone.filter(t => token_obj[t]).length){
            console.log('Looking at the property phone')
            if(!this.Property.id){
                await this.getProperty(connection, company_id, properties);
            }
            await this.Property.getPhones(connection);
        }
        if(Tokens.property_email.filter(t => token_obj[t]).length){
            console.log('Looking at the property email')
            if(!this.Property.id){
                await this.getProperty(connection, company_id, properties);
            }
            await this.Property.getEmails(connection);
        }


        if(Tokens.property_address.filter(t => token_obj[t]).length){
            console.log('Looking at the property email')
            if(!this.Property.id){
                await this.getProperty(connection, company_id, properties);
            }
            await this.Property.getAddress(connection);
        }
        if(Tokens.products.filter(t => token_obj[t]).length){
            console.log('Looking at the property products')
            if(!this.Property.id){
                await this.getProperty(connection, company_id, properties);
            }
            this.Property.Products = await this.Property.getProducts(connection);

            if(token_obj['Facility.LateFee']){
                let product = this.Property.Products.filter(p => p.name.toLowerCase().includes('late fee'));
                product = product && product.length ? await this.Property.getProductDetails(connection, product[0].id, this.rent): null;
                this.Property.LateFee = product && product.price;
            }
        }


        await this.getTenants(connection);
        await this.getStoredContents(connection);
        let all_vehicles = [];
        if (!this.Tenants.length) e.th(409, "Please add a tenant to this lease");
        for (let i = 0; i < this.Tenants.length; i++) {
            if(Tokens.gate_access.filter(t => token_obj[t]).length){
                console.log('Looking at the gate access')
                try {
                    if (!this.Property.id) {
                        await this.getProperty(connection, company_id, properties);
                    }                    
                    await this.Tenants[i].Contact.findAccessCredentials(connection, this.Property)
                } catch (err) {
                    console.log("Could not get access credentials", err);
                }
            }
            if(Tokens.military.filter(t => token_obj[t]).length){
                console.log('Looking at the military')
                await this.Tenants[i].Contact.findMilitaryInfo(connection);
            }

            if(Tokens.company.filter(t => token_obj[t]).length){
                console.log('Looking at the tenant company')
                await this.Tenants[i].Contact.findBusinessInfo(connection);
            }

            if(Tokens.relationships.filter(t => token_obj[t]).length || recipient){
                console.log('Looking at the relationships')
                let relationships = await this.Tenants[i].Contact.getContactRelationships(connection);
                for (let j = 0; j < relationships.length; j++) {
                    relationships[j].Contact = new Contact({id: relationships[j].related_contact_id});
                    await relationships[j].Contact.find(connection, company_id);
                    await relationships[j].Contact.getPhones(connection);
                    await relationships[j].Contact.getLocations(connection);
                    await relationships[j].Contact.getStatus(connection);
                    this.Tenants[i].Contact.Relationships.push(relationships[j])
                }
                await this.getCosigners(connection, company_id);
            }

            if(Tokens.payment_methods.filter(t => token_obj[t]).length){
                console.log('Looking at the  payment methods')
                let pmethods = await models.Payment.findPaymentMethodsByLeaseId(connection, this.id);
                for(let i = 0; i < pmethods.length; i++){
                    let _pm = new PaymentMethod({id: pmethods[i].payment_method_id } );
                    await _pm.find(connection);
                    this.PaymentMethods.push(_pm);
                }
                if(!this.PaymentMethods.length){
                    let pm = await models.Payment.findPaymentMethodsByContactId(connection, this.Tenants[i].contact_id);
                    if (pm?.length) {
                        for (let i = 0; i < pm.length; i++) {
                            let _pm = new PaymentMethod({ id: pm[i].id });
                            await _pm.find(connection);
                            this.PaymentMethods.push(_pm);
                        }
                    }
                }
            }

            if(Tokens.vehicles.filter(t => token_obj[t]).length){
                console.log('Looking at the vehicles')
                let vehicle = await models.Contact.findVehicles(connection, this.Tenants[i].contact_id);
                if(vehicle && vehicle.length){
                    this.Tenants[i].Contact.Vehicles.push(...vehicle);
                    all_vehicles.push(...vehicle);
                }
            }
        }

        let primary_contact = this.Tenants.find(t => t.primary);

        if(recipient && recipient !== 'primary'){
            
            let relationship = await primary_contact.Contact.Relationships.find(r => {
                switch(recipient){
                    case 'alternate':
                        return r.is_alternate;
                    case 'lien':
                        return r.is_lien_holder;
                }
            });
            console.log("relationship", relationship)
            if(!relationship){
                e.th(400, `Recipient "${recipient}" not found`)
            }
            this.Recipient = relationship.Contact;
        } else {
            this.Recipient = primary_contact.Contact
        }
        
        if(Tokens.vehicles.filter(t => token_obj[t]).length){
            console.log('Looking at more vehicles')
            await this.findVehicles(connection);
        }
        
        if(Tokens.auction.filter(t => token_obj[t]).length){
            console.log('Looking at the auction')
            this.lease_auction = await models.LeaseAuction.findByLeaseId(connection,this.id);
            if(this.lease_auction){
                let modified_at = this.lease_auction.modified_at;
                this.lease_auction.modified_at_local = modified_at ? await this.Property.getFacilityDateTime(connection, modified_at): null;
                this.lease_auction.payment = (this.lease_auction && this.lease_auction.payment_id) ? await models.Payment.findPaymentById(connection, this.lease_auction.payment_id): null;
            }
        }

        if(Tokens.uploads.filter(t => token_obj[t]).length){
            console.log('Looking at the uploads')
            await this.getUploads(connection, company_id)
        }

        if(Tokens.invoices.filter(t => token_obj[t]).length){
            console.log('Looking at the invoices')
            await this.getPastDueInvoices(connection);
            await this.getTotalDueInvoices(connection);
            //await this.findInvoices(connection);
            await this.getPaidThroughDate(connection);
            await this.findRentPastDueDaysByLease();
        }

        if(Tokens.promotions.filter(t => token_obj[t]).length){
            console.log('Looking at the promotions')
            await this.getDiscounts(connection,this.start_date);
            this.Promotion =  this.Discounts.map(discount => discount.Promotion.name).join(" ,");
           // await this.getPromotion(connection, false);
        }

        if(Tokens.move_in_invoices.filter(t => token_obj[t]).length){
            console.log('Looking at the move in invoices')
            await this.getMoveInCosts(connection);
        }

        if(Tokens.services.filter(t => token_obj[t]).length){
            console.log('Looking at the services')
            await this.getServices(connection);
            await this.getMonthlyCost(connection);
        }

        if(Tokens.current_rent.filter(t => token_obj[t]).length){
            console.log('Looking at the current rent')
            this.getTotalRentDue(connection);
        }

        if(pricingTables && pricingTables.filter(t => t.name === ENUM.PRICING_TABLE.OPEN_INVOICES).length){
            console.log('Looking at the delinquency');
            await this.getOpenInvoices(connection);
        }

        if(pricingTables && pricingTables.filter(t => t.name === ENUM.PRICING_TABLE.FUTURE_CHARGES_WITH_FEE).length){
            console.log('Looking at the future delinquency charges');
            await this.getFutureDelinquency(connection, company_id);
        }

        if(Tokens.vehicle_storage.filter(t => token_obj[t]).length){
            console.log('Looking at the vehicles')
            let vehicle = await models.Lease.getVehicles(connection, this.id);
            this.has_vehicle_storage = vehicle && vehicle.length
        }

        await this.getPaymentCycleRent(connection, { date: currentDate });
    }

    async getRentRaiseDetails(connection, company, rent_change_id) {
        let rentRaise = {
            new_rate: null,
            new_rate_date: null,
            rent_with_tax: null,
            monthly_charges: null,
            new_rent_with_tax: null,
            new_monthly_charges: null,
        }

        const isLeaseClosed = this.moved_out != null;
        if(isLeaseClosed) {
            console.log('Lease has been closed');
            this.RentRaise = {
                ...rentRaise
            }
            return;
        }

        console.log('Looking at the rent raise');
        await this.findRentChanges(connection, rent_change_id);
        
        let date = moment();
        let current_invoice = await this.getMoveInInvoice(connection,0,company, date);
        let rentProductIndex = current_invoice?.InvoiceLines?.findIndex(il => il.Product.default_type === 'rent');
        if(rentProductIndex > -1) {
            rentRaise.new_rate = this.new_rate;
            rentRaise.new_rate_date = this.new_rate_date;
            rentRaise.rent_with_tax  = current_invoice.InvoiceLines[rentProductIndex].total;
            rentRaise.monthly_charges = current_invoice.balance;

            date = this.getBillDateAfterDate();
            current_invoice = await this.getMoveInInvoice(connection,1,company, date);
            current_invoice.InvoiceLines[rentProductIndex].cost = this.new_rate;
            current_invoice.total();

            rentRaise.new_rent_with_tax  = current_invoice.InvoiceLines[rentProductIndex].total;
            rentRaise.new_monthly_charges = current_invoice.balance;
        }

        this.RentRaise = {
            ...rentRaise
        }
    }

    async findRentChanges(connection, rent_change_id){

        let rent_change = await models.LeaseRentChange.fetchRentChangesById(connection, rent_change_id);

        if(rent_change) {
            this.new_rate = rent_change.new_rent_amt;
        }
        this.new_rate_date = rent_change.effective_date;

    }

    async getUploads(connection, company_id) {
        //There is a circular dependency and tomorrow is the release. This is hack. Need remove the circular dependency
        let Upload = require('./upload');
        if(!this.Unit || !this.Unit.id){
          await this.findUnit(connection);
        }
        try{
        let files = await Upload.findByEntity(connection, 'lease', this.id);
        let uploads = [];
        for(let i = 0; i < files.length; i++){
          let upload = new Upload({id: files[i].upload_id});
          await upload.find(connection);
          await upload.findSigners(connection, company_id);  
          upload.lease_id = this.id;
          upload.unit_number = this.Unit.number;
          upload.unit_type = this.Unit.type;
     
          uploads.push(upload);
        };
      
        this.Uploads = uploads;
        } catch(err){
            console.log(err);
        }
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
            return models.Amenity.findAllAmenities(connection, _this.Unit.type,  this.Property.id).then(function(amenityTypes){
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
            if (!this.decline_insurance && item.document_tag === 'deny-coverage') {
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

    findUnit(connection){
        var _this = this;

        if(!this.unit_id) throw "Unit id not set";
        var unit = new Unit({
            id: this.unit_id
        });
        return unit.find(connection).then(() => {
            return unit.getAddress(connection);
        }).then(() => {
            return unit.getFeatures(connection)
        }).then(()=> {
            _this.Unit = unit;
        });

    }

    async removeLeaseAuction(connection){
        let lease_auction = await models.LeaseAuction.findByLeaseId(connection, this.id);
        if(lease_auction){
            console.log("Removing Lease Auction");
            await models.LeaseAuction.save(connection,{deleted_at: moment().format('YYYY-MM-DD HH:mm:ss')}, lease_auction.id);
        }
    }

    async getTenants(connection, params = {}){
        let { get_primary_only = false } = params;
        this.Tenants = [];
        if(!this.id) e.th(500,"Lease id not set");
        let tenants = await models.ContactLeases.findTenantsByLeaseId(connection, this.id);
        for(let i = 0; i < tenants.length; i++){
          let contact = new Contact({id: tenants[i].contact_id});
          
          if(tenants[i].primary == 1) {
            this.primary_contact_id = contact.id;
          } else {
            if(get_primary_only) continue;
          }
          
          await contact.find(connection);
          await contact.getPhones(connection);
          await contact.getLocations(connection);
          await contact.getStatus(connection);
          tenants[i].Contact = contact;
          this.Tenants.push(tenants[i]);
        }

        if(!this.primary_contact_id){
            this.primary_contact_id = tenants[0].contact_id; 
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

        let activeRentService = await Service.getActiveRentService(connection, this.id);
        console.log("C:lease.js/getProductDetails: Active Rent Service Object => ", JSON.stringify(activeRentService));
        console.log("C:lease.js/getProductDetails: Getting Product Details");
        return await this.Property.getProductDetails(connection, product.id, activeRentService && activeRentService.price);

    }

    getNextBillDate(lastBillingDate, anniversary_bill_day){
        var nextBillDateFromToday = this.getBillDateAfterDate(lastBillingDate, anniversary_bill_day);
        var nextBillDateFromLeaseStart = this.getBillDateAfterDate(moment(this.start_date, 'YYYY-MM-DD'), anniversary_bill_day);
        return nextBillDateFromToday.isSameOrAfter(nextBillDateFromLeaseStart)? nextBillDateFromToday : nextBillDateFromLeaseStart;
    }

    /*
    *
    *   END - LESSOR of ( NEXT BILLING DATE + ADDITIONAL MONTHS ) - 1 DAY & LEASE END DATE
    *   START - GREATER of LAST BILLING END + 1 DAY & LEASE START DATE
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
        
        var nextBillingDate = this.getNextBillDate(lastBillingDate);
        
        //INC-171 fix
        var maxInvoicePeriod = null;
        var targetInovicePeriodDate = nextBillingDate.clone().add(additionalMonths-1, 'months');
  
        // TODO: this logic needs to be cleaned up.
        var daysInTargetMonth = targetInovicePeriodDate.daysInMonth();
        if(this.bill_day >  daysInTargetMonth){
          let daysInNextMonth = targetInovicePeriodDate.clone().add(1, 'months').daysInMonth();
          if(this.bill_day < daysInNextMonth){
            maxInvoicePeriod = targetInovicePeriodDate.clone().add(1, 'months').subtract(1,'day').date(this.bill_day).subtract(1,'days').startOf('day');
          }else{
            maxInvoicePeriod = targetInovicePeriodDate.add(1, 'months').endOf('month').subtract(1, 'day').startOf('day');
          }
        }else{
          maxInvoicePeriod = targetInovicePeriodDate.add(1, 'months').subtract(1,'day');
        }
        // maxInvoicePeriod = targetInovicePeriodDate.subtract(1,'day');
        var leaseStartMoment = moment(this.start_date, 'YYYY-MM-DD').startOf('day')
  
        let leaseEndMoment = moment(this.end_date, 'YYYY-MM-DD').startOf('day');
        var invoicePeriodStart;
        var invoicePeriodEnd;
  
        if(lastBillingDate){
            //lastBillingDate.add(1, 'day');
            invoicePeriodStart = leaseStartMoment.isSameOrAfter(lastBillingDate) ? leaseStartMoment: lastBillingDate;
        } else {
            invoicePeriodStart = leaseStartMoment;
        }
  
        if(this.end_date){
            invoicePeriodEnd = maxInvoicePeriod.isSameOrBefore(leaseEndMoment) ? maxInvoicePeriod: leaseEndMoment
        } else {
  
  
            //invoicePeriodEnd = nextBillingDate.clone().add(additionalMonths, 'month').subtract(1,'day');
            invoicePeriodEnd = maxInvoicePeriod.clone();
        }
  
        return {
          start: invoicePeriodStart,
          end: invoicePeriodEnd
        }
  
    }   

    async findPromotionsByLeaseId(connection){
        return await models.Promotion.getDiscountIdsByLeaseId(connection,this.id);
    }

    async getBillDayByPromotion(connection, discounts, date, leaseCreated){
        // Move the DD portion of date (YYYY/MM/DD) according to lease start date
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
            let nextBillingStartDate = this.getNextBillDate(invoicePeriodStart.clone());
            invoicePeriodEnd = nextBillingStartDate.clone().subtract(1, 'day');
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

        date = date || moment();
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
    }

    getUpdatedNextBillingDate(date) {
        date = date || moment(); //Ideally it should be property's current date
        return this.getInvoicePeriodEnd(date).add(1, 'Days');
    }

    getLastBillingDate(connection, params = {}){
        return models.Invoice.findLastBilled(connection, this.id, params);
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
          await invoice.find(connection);
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

    async getPastDueInvoices(connection ){
        this.PastDue = [];
        let invoices = await models.Invoice.findPastDueByLease(connection, this.id);
        for(let i = 0; i < invoices.length; i++){
            let invoice = new Invoice({
                id: invoices[i].id
            });
            await invoice.find(connection);
            await invoice.total();
            this.PastDue.push(invoice)
        };
    }

    /* find all unpaid invoices which are either past due or due today. */
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

    async findRentPastDueDaysByLease(){
        if (this.PastDue.length) {
            this.rent_past_due_days = moment().diff(moment(this.PastDue[0].due), "days");
        }
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
        
        this.last_billed = moment(latestInvoice.period_end).format('YYYY-MM-DD');
          
      }
  
      // returns max of latest rent invoice -> period end AND actual (next billing day - 1) irrespective of generation
      async getLastBilledDate(connection) {
        if(!this.last_billed) {
          await this.setLastBilled(connection);
        }
        
        return this.last_billed;
      }



    async getOpenInvoices(connection ){
        this.PastDue = [];
        let invoices = await models.Invoice.findOpenByLease(connection, this.id);
        for(let i = 0; i < invoices.length; i++){
            let invoice = new Invoice({
                id: invoices[i].id
            });
            await invoice.find(connection);
            await invoice.total();
            this.PastDue.push(invoice)
        };
    }


    async getFutureDelinquency(connection, company_id) {
        
        let lease = await new Lease({id: this.id});
        await lease.find(connection)
        await lease.findUnit(connection)
        await lease.getDelinquency(connection);

        let company =  new Company({id: company_id});
        await company.find(connection);

        let property = new Property({id: lease.Unit.property_id});
        await property.find(connection);

        let delinquency_day = 45;   // As per discussion with Karan
        let delinquency_months = 0;
        let start_date = moment();
        let end_date = moment().add(delinquency_day, 'days');

        while(start_date.isSameOrBefore(end_date)) {
            start_date = lease.getBillDateAfterDate(start_date);
            if(start_date.isSameOrBefore(end_date))  delinquency_months++;
        }

        let future_rent_invoices = [];
        for(let i=0; i< delinquency_months; i++){
            let inv = await lease.getMoveInInvoice(connection, i, company);
            future_rent_invoices.push(inv);
        }
 
        let invoices = [ ...future_rent_invoices ];

        if(lease.Delinquency && lease.Delinquency.Actions) {
            let fee_actions = lease.Delinquency.Actions.filter(a => a.action === 'fee');
            for(let i=0; i< fee_actions?.length; i++) {
                if(!fee_actions[i].Fee) continue;
                for(let j=0; j<future_rent_invoices.length;j++) {
                    try {
    
                        let trigger_date = moment(future_rent_invoices[j].period_start).add(fee_actions[i].Trigger.start, 'days').format('YYYY-MM-DD');
                        if(!moment(trigger_date).isSameOrBefore(end_date)) continue;
    
                        let fee_invoice = await lease.Delinquency.applyLateFees(connection, lease, fee_actions[i], company, property, trigger_date, true)
                        invoices.push(fee_invoice);
    
                    } catch (err) {
                        console.log('error while addig late fee', err);
                    }
                }
            }
        }

        invoices.sort((a,b) =>{
            if (moment(a.due).format('x') < moment(b.due).format('x')) return -1;
            if (moment(a.due).format('x') > moment(b.due).format('x')) return 1;
            return 0;
        });

        this.FutureCharges = [ ...invoices ];
    }

    async getDiscounts(connection, date){
        let discounts = await models.Promotion.findAllDiscounts(connection, this.id, date)
        for(let i = 0; i < discounts.length; i++){
            let discount = new Discount(discounts[i]);
            await discount.find(connection);
            this.Discounts.push(discount);
        }

    }

    async getProperty(connection, company_id){
        let property = null;
        
        if(this.id){
            property = await models.Property.findByLeaseId(connection, this.id);
        }else {
        
            property = await models.Property.findByUnitId(connection, this.unit_id);
        }
        this.Property = new Property(property);
    
        if(company_id) {
            await this.Property.verifyAccess(company_id)
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

    getReservation(connection){

        return models.Reservation.findByLeaseId(connection, this.id).then(r => {
            this.Reservation = r;
        })

    }

    async getServices(connection){
        let services_list = await models.Service.findAllByLeaseId(connection, this.id);

        for(let i = 0; i < services_list.length; i++) {
            let service = new Service(services_list[i]);
            await service.find(connection);

            await service.getLastBilled(connection);
            switch (service.service_type) {
                case 'insurance':
                    let insurance = new Insurance({product_id: service.product_id});
                    await insurance.find(connection);
                    service.Insurance = insurance;
                    this.InsuranceServices.push(service);
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
        this.ActiveInsuranceService = await Service.getActiveRecurringInsuranceService(connection, this.id, false);
        this.FutureInsuranceService = await Service.getFutureInsuranceService(connection, this.id);
    }

    /* Sum or all active services for a lease including tax. */
    async getMonthlyCost(connection) {
        if (!this.id) e.th(500, 'Lease ID not defined');
        console.log(`Getting monthly cost of lease - ${this.id}`);

        let unit = await models.Unit.findByLeaseId(connection, this.id);
        let services_list = await models.Service.findAllByLeaseId(connection, this.id);
        let active_services = services_list.filter(sl => (moment(sl.start_date) <= moment()) && (moment(sl.end_date) >= moment() || sl.end_date === null));
        console.log("active_services", active_services);

        if (active_services.length > 0) {

            let product_ids = active_services.map(as => as.product_id);
            let products = await models.Product.findByIds(connection, product_ids, null, unit.property_id);
            let property_tax_profiles = await models.Property.findTaxRates(connection, unit.property_id);

            this.monthly_cost = active_services.reduce((monthly_cost, active_service) => {
                if (active_service.taxable === 1) {
                    let tax = TaxLines.getTaxOfService(active_service, products, property_tax_profiles, { unit_type: unit.type })
                    monthly_cost += tax;
                }
                return monthly_cost + rounding.round(active_service.qty * active_service.price);
            }, 0);
        }

        return this.monthly_cost;

    }

    async getPromotion(connection, active = true){
        if(!this.promotion_id) return;
        let promotion = new Promotion({id: this.promotion_id});
        await promotion.find(connection, active);
        this.Promotion = promotion;
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
    getCurrentServices(connection, company_id, period_start, period_end, start_limit, allowVoided = false){

        return Promise.resolve().then(() => {

            if(!period_start || !period_end) e.th(500, 'Please include invoice dates');
            if(this.end_date && moment(this.end_date, 'YYYY-MM-DD').startOf('day').format('x') < period_start.format('x')){
                e.th(409, "This lease has ended");
            }

            return models.Service.findBillableServices(connection, this.id, period_start, period_end, company_id, start_limit, allowVoided )
        }).mapSeries(s => {
            var service = new Service(s);
            return service.find(connection)
                .then(() => {
                    service.last_billed = s.last_billed;
                    return service;
                })
        })
    }

    async activate(connection){
        await models.Lease.save(connection, { status: 1 }, this.id);
        let result = await models.Lease.findCompanyId(connection, this.id);
        let default_standing = await models.Lease.getDefaultStanding(connection, result.company_id);
        await this.saveStanding(connection, default_standing.id);
    }

    async deleteLease(connection, company_id){
        return await models.Lease.deleteLease(connection, this.id, company_id);
    }

    async getMoveInCosts(connection, company){
        if(!this.id) e.th(500, "Lease id not set");
        let rent_lines = []
        let move_in_rent = 0;

        try {
            let inv = await  models.Invoice.findFirstLeaseInvoice(connection, this.id);
            if(!inv){
                let allInvoices = await  models.Invoice.findAllInvoicesOfLease(connection, this.id);
                if(allInvoices.filter(i => i.status > -1).length){
                    e.th(500, "Lease contains non voided invoices");
                }
                else{
                    return;
                }
            }
            let invoice = new Invoice(inv);
            await invoice.find(connection);
            await invoice.total();
            
            rent_lines = invoice.InvoiceLines.filter(x=> x.Product.default_type === 'rent');
            if(rent_lines && rent_lines.length > 0) {
                move_in_rent = rent_lines[0].cost;
            }
            this.MoveInInvoice = {
                ...invoice,
                move_in_rent
            }
            return;

        } catch(err) {
            console.log(err);
        }
        // no invoice yet, create one from the services for today...
        let data = await this.generateMoveInInvoice(connection, 0, company, false);
        rent_lines = data.invoice.InvoiceLines.filter(x=> x.Product.default_type === 'rent');
        if(rent_lines && rent_lines.length > 0) {
            move_in_rent = rent_lines[0].cost;
        }

        this.MoveInInvoice = {
            InvoiceLines: data.invoice.InvoiceLines,
            total_due: data.invoice.total_due,
            balance: data.invoice.balance,
            sub_total: data.invoice.sub_total,
            total_discounts: data.invoice.total_discounts,
            total_tax: data.invoice.total_tax,
            move_in_rent
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
        let isAnniversaryMannerDiscount = await Discount.findIfFixedAnniversaryPromotion(connection, this.Discounts);
        let lastBillingDate =  await this.getLastBillingDate(connection);
        let lastBilled = lastBillingDate ? moment(lastBillingDate, 'YYYY-MM-DD HH:mm:ss').startOf('day'): null;
        let invoicePeriod = await this.getCurrentInvoicePeriod(connection,lastBilled, billed_months || 0,isAnniversaryMannerDiscount);

        let services = await this.getCurrentServices(connection, company.id, invoicePeriod.start.clone(), invoicePeriod.end.clone())
            .filter(s => s.service_type === 'lease' || s.service_type === 'insurance' );


        let datetime = await this.getCurrentLocalPropertyDate(connection,'YYYY-MM-DD')
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
            company.id
        );

        await invoice.calculatePayments();
        //await invoice.getOpenPayments(connection);

        console.log("MOVE IN INVOICE", JSON.stringify(invoice, null, 2));
        

        return {
            invoice,
            discount
        }


    }

    getTotalRentDue(connection){
        var monthsDiff = moment(this.end_date).diff(moment(this.start_date), 'months', true);
        this.total_rent_due = monthsDiff * this.rent;
    }

    declineInsurance(connection, decline){
        if(!this.id) e.th(500, "Lease id not set");

        return models.Lease.save(connection, {
            decline_insurance: decline
        }, this.id)

    }

    sendActivationLinkToTenants(connection, domain, tenant_id){
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
                        domain: domain
                    }
                });
            } else {
                jobParams.push({
                    category: 'welcomeEmail',
                    data: {
                        id: t.id,
                        action: 'email',
                        label: 'newLease',
                        domain: domain
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

    async findPaymentsByContactId(connection, contact_id, conditions, options) {
        let payments = [];
        let payments_result = await models.Payment.findPaymentsByContactId(connection, contact_id, conditions, options);
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
            await pm.getAutoPayStatus(connection, this.id);
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
            if (!item.document_id) {
                item.Document = {};
            } else {
                let document = await models.Document.findById(connection, item.document_id);
                item.Document = document || null;
            }
            
            if (item.upload_id) {
                item.Upload = new Upload({id: item.upload_id});
                await item.Upload.find(connection);
                await item.Upload.findSigners(connection, company_id);
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

    async findRateChanges(connection, rent_change_lease_id){

        let rent_change_lease = await models.RentChangeLease.findById(connection, rent_change_lease_id);
        let rent_change = await models.RateChanges.findById(connection, rent_change_lease.rate_change_id);

        if(rent_change_lease) {
            this.new_rate = rent_change_lease.new_rent_amt;
        }

        /*let activeRentService = await Service.getActiveRentService(connection, this.id, moment(rent_change.target_date));

        let amount;
		let direction = rent_change.change_direction === 'Increase' ? 1 : -1;
		switch (rent_change.change_type) {
			case 'fixed':
				amount = rent_change.change_amt;
				break;
			case 'percent':
				let change_amt = Math.round(((rent_change.change_amt/100) * activeRentService.price) * 1e2) / 1e2;
				amount = (direction * change_amt) + activeRentService.price;
				break;
			case 'dollar':
				amount = (direction * rent_change.change_amt) + activeRentService.price;
				break;
		}

        this.new_rate = amount;*/
        this.new_rate_date = this.getNextBillingDate(moment(rent_change.target_date, 'YYYY-MM-DD'), true);

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

                var company = new Company({id: company_id});
                await company.find(connection);
                await this.findFull(connection, company, properties);
                
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


        await models.Checklist.saveItem(connection, checklist_item, checklist_item.id);

        // If there is an upload_id, Remove signers,
        if( checklist_item.upload_id ){

            // await models.Checklist.removeSignersFromUpload(connection, checklist_item, checklist_item.id);

        }



        // return since we are updating an object that is not this class.
        return checklist_item;
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

    async getPaidThroughDate(connection, date){

        let response = await models.Lease.getPaidThroughDate(connection, this.id, date)
        this.rent_paid_through = response.end_date;
        

    }

    async getCurrentBalance(connection, company_id) {
        if (!this.id) throw "Lease id not set";
        this.OpenInvoices = [];

        await this.getProperty(connection);
        let date = await this.Property.getLocalCurrentDate(connection);
        let invoices = await models.Billing.findOpenInvoicesByLease(connection, this.id)

        for(let i = 0; i < invoices.length; i++ ){
            let inv = new Invoice(invoices[i]);
            await inv.find(connection);
            await inv.total();
            this.OpenInvoices.push(inv);
        }

        this.has_open_invoice = (this.OpenInvoices && !!this.OpenInvoices.length) || false;
        this.balance = Math.round(this.OpenInvoices.filter(oi => moment(oi.due) < moment(date)).reduce((a,b)=> { return a + b.balance }, 0) * 1e2) / 1e2;

        // let r = await models.Billing.findRentPaidThrough(connection, company_id, this.id);
        // this.rent_paid_through = r.rent_paid_through;
    }

    async updateStanding(connection, name){

        let standing = await models.Setting.getLeaseStandingByName(connection, name);
        if(!standing) e.th(404, name + " is not a valid lease standing value")
        await models.Lease.save(connection, {lease_standing_id: standing.id }, this.id);

    }

    async getStanding(connection){

        let standing = await models.Setting.getLeaseStandingById(connection, this.lease_standing_id);
        if(!standing){
            standing = {
                name: 'Good'
            };
            // e.th(500, "Invalid lease standing ID");
        }
        this.Standing = standing;

    }

    finalize(connection, company_id, user_id, ip_address, domain){

        var _this = this;
        var company = new Company({id: company_id});
        return company.find(connection)
            .then(() => _this.find(connection, company_id))
            .then(() => this.findFull(connection, company))
            .then(() => {
                return models.Checklist.findByPropertyId(connection, _this.Unit.property_id ).mapSeries((item, i) =>{
                    var save = {
                        lease_id: _this.id,
                        checklist_item_id: item.id,
                        completed: 0,
                        sort: item.sort
                    };
                    if(!item.document_id) return models.Checklist.saveItem(connection, save);
                    // generate Document Now

                    var document = new Document({ id: item.document_id });
                    var upload = {};
                    
                    return document.find(connection)
                        .then(function(status){
                            document.mergeFields(_this);
                            document.setPaths(_this.id);
                            return document.generate(connection, _this, user_id, ip_address);
                        }).then(function(uploadRes){
                            upload = uploadRes;
                            save.upload_id = upload.id;
                            return models.Checklist.saveItem(connection, save);
                        }).then(function(){
                            var signers = [];
                            if (!save.upload_id) return true;
                            return models.DocumentSign.findByUploadId(connection, save.upload_id).mapSeries(function (signer) {
                                var signer = new Signer(signer);
                                return signer.find(connection, company_id).then(signerStatus => {
                                    return signer.sendSignEmail(upload, company_id)
                                })
                            })
                        })
                });
            }).then(function(save) {
                return _this.activate(connection);
            }).then(function(){
                return _this.sendActivationLinkToTenants(connection, domain);
            })
    }

    findInvoicesToRefund(connection, date){

        return models.Invoice.findFutureBilled(connection, this.id, date).map(inv => {
            var invoice = new Invoice(inv);
            return invoice.findInvoiceLines(connection)
                .then(() => {
                    return invoice.InvoiceLines.map(inline => inline.totalLineCredit(date))
                })
                .then(() => invoice.findPayments(connection))
                .then(() => invoice.total())
                .then(() => invoice.totalInvoiceCredit())
                .then(() => invoice);
        })
    }

    async removeAutoCharges(connection){
        if(!this.id) e.th(500, "Lease Id Not Set");
        return await models.Lease.removeAutoCharges(connection, this.id);
    }

    async setAsAutoPay(connection, payment_method){

        await this.removeAutoCharges(connection);
        return await payment_method.setAsAutoPay(connection, this.id);

    }

    async updateCurrentStanding(connection) {
        // This should only reset to Current if the balance is 0
        await this.getStanding(connection);
        if(this.Standing && (this.Standing.name === 'Auction' || this.Standing.name === 'Lease Closed')){
          return;
        }
  
        await this.getCurrentBalance(connection);
        if(!this.balance){
          this.updateStanding(connection, "Current" )
        }
    }

    static async  updateLeaseStandings(connection, lease_ids) {
        for(let i = 0; i<lease_ids.length; i++ ){
            let lease = new Lease({id: lease_ids[i]});
            await lease.find(connection);
            await lease.updateCurrentStanding(connection);
        }

        return await models.Trigger.findLeaseStandings(connection);
    }

    async addTenant(connection, data, company_id){

        let contact = {};
        if(!data.contact_id) {
            contact = new Contact();
            contact.company_id = company_id;
        } else {
            contact = new Contact({ id: data.contact_id });
            await contact.find(connection, company_id);
            await contact.verifyUniqueTenantOnLease(connection, this.id)
        }

        contact.update(data);
        await contact.save(connection);

        let tenant_id = await models.Lease.AddTenantToLease(connection, contact.id, this.id);

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
            end_date: this.end_date,
            bill_day: this.bill_day,
            notes: this.notes,
            terms: this.terms,
            rent: this.rent,
            status: this.status,
            token: this.token,
            achtoken: this.achtoken,
            security_deposit: this.security_deposit,
            moved_out: this.moved_out
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

    static async  findPending(connection, company_id, properties){
        return await models.Lease.findPending(connection, company_id, properties)

    }

    static async  findStandings(connection, company_id){
        return await models.Trigger.findLeaseStandings(connection, company_id);

    }

    async getMetrics(connection){
        if(!this.id) e.th(500, "Lease Id Not Set");
        this.Metrics = await models.Lease.getLeaseMetrics(connection, this.id);

        // Check if enrolled in Autopay
        await this.findAutoPaymentMethods(connection);
        this.Metrics.has_autopay = this.PaymentMethods.length > 0;

        // Get lease promotion
        await this.getPromotion(connection);
        this.Metrics.promotion = this.Promotion && this.Promotion.name;


    }

    async findAddress(connection, address_id) {
        let address = new Address({ id: address_id });
        await address.find(connection);
        return address;
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

    async findUploads(connection, date){
        if(!this.id) throw new Error("Lease id not set");
        await models.Upload.findByLeaseId(connection, this.id, date);
    }

    async getDelinquency(connection, date, params = {}){

        let delinquency = new Delinquency({lease_id: this.id});
        
        try {
          await delinquency.find(connection, params);
          await delinquency.findActions(connection, date);
          this.Delinquency = delinquency;
        } catch(err){
            console.log(err); 
          return false;
        }

        return true;
    }

    
    static async findAuctionLeases(connection, params){
        return await models.Lease.findAuctionLeases(connection, params);
    }

    static async applyUnallocatedBalanceOnLease(connection, company_id, lease_id, openPayments, logged_in_user_id, permissions, api = {}) {

        let total_payment_remaining = openPayments.reduce((a, b) => a + b.amount, 0);

        let lease = new Lease({ id: lease_id });
        await lease.find(connection);
        await lease.getProperty(connection, company_id, null, logged_in_user_id, permissions, api);
        await lease.getPaymentCycleOptions(connection);

        let billed_months = 1, pc;
        if (lease.payment_cycle) {
            pc = lease.PaymentCycleOptions.find(pco => pco.label.toLowerCase() === lease.payment_cycle.toLowerCase())
            billed_months = pc ? pc.period : 1;
        }

        let invoices = await models.Invoice.findDueByLease(connection, [lease_id]);
        total_payment_remaining -= invoices.reduce((a, b) => a + b.total_owed, 0);

        for (let j = 0; total_payment_remaining > 0; j++) {

            let current_date = await lease.Property.getLocalCurrentDate(connection);
            let lastBillingDate = await lease.getLastBillingDate(connection, { activeInvoice : true }); // Should be last billed.
            let nextBillingDate = lease.getUpdatedNextBillingDate(moment(current_date)); // Should be next billing

            // subtract a day to get even with lastBillingDate
            nextBillingDate.subtract(1, 'day');
            let lastBillingDateMoment = moment(lastBillingDate, 'YYYY-MM-DD HH:mm:ss').startOf('day');
            let lastBilled = lastBillingDate && (nextBillingDate.format('x') < lastBillingDateMoment.format('x')) ? moment(lastBillingDate, 'YYYY-MM-DD HH:mm:ss').startOf('day') : nextBillingDate;

            let services = [];

            let invoicePeriod = await lease.getCurrentInvoicePeriod(connection, lastBilled.clone(), 1);
            await lease.savePaymentCycleIfApplicable(connection, {
                next_billing_date: invoicePeriod.start,
                billed_months,
                company_id,
                payment_cycle: pc
            });

            for (let i = 0; i < billed_months; i++) {
                console.log("lastBilled", lastBilled)
                invoicePeriod = invoicePeriod || await lease.getCurrentInvoicePeriod(connection, lastBilled.clone(), 1);
                console.log("invoicePeriod", invoicePeriod)
                lastBilled = invoicePeriod.end.clone();

                try {
                    services = await lease.getCurrentServices(connection, company_id, invoicePeriod.start.clone(), invoicePeriod.end.clone())
                        .filter(s => s.recurring === 1 && s.service_type === 'lease' || s.service_type === 'insurance');
                } catch (err) {
                    if (err.code !== 409) {
                        console.log("Error occured while fetching getCurrentServices of a lease");
                        throw err;
                    }
                    services = [];
                }

                let invoice = new Invoice({
                    lease_id: lease.id,
                    date: moment(current_date).format('YYYY-MM-DD'),
                    due: invoicePeriod.start.format('YYYY-MM-DD'),
                    company_id: company_id,
                    type: "auto",
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

                if (!invoice.balance) continue;
                await invoice.save(connection);
                invoice.amount = total_payment_remaining > invoice.balance ? invoice.balance : total_payment_remaining;
                invoices.push(invoice);

                total_payment_remaining -= invoice.balance;
                invoicePeriod = null;
            }
        }

        if (!invoices.length) return;

        let startInvoiceIndex = 0;
        for (let i = 0; i < openPayments.length; i++) {

            let payment = new Payment({ id: openPayments[i].id });
            await payment.find(connection);
            await payment.getPaymentApplications(connection);
            let payment_remaining = payment.payment_remaining;
            let invoicesToApply = [];

            for (let j = startInvoiceIndex; j < invoices.length; j++) {
                let invoice = new Invoice(invoices[j]);
                await invoice.find(connection);
                await invoice.total();

                if (invoice.balance <= payment_remaining) {
                    invoice.amount = invoice.balance;
                    payment_remaining -= invoice.balance;
                    startInvoiceIndex++;
                } else {
                    invoice.amount = payment_remaining;
                    payment_remaining = 0;
                }

                invoicesToApply.push(invoice);
                if (!payment_remaining) break;
            }

            if (invoicesToApply.length) {
                await payment.applyToInvoices(connection, invoicesToApply);
            }

            if (startInvoiceIndex == invoices.length) break;
        }
    }
    async getCurrentLocalPropertyDate(connection, format = 'YYYY-MM-DD') {
        if(!this.Property || !this.Property.id) {
          await this.getProperty(connection);
        }
  
        const propertyTime = await this.Property.getLocalCurrentDate(connection,format);
        return propertyTime;
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
        let property_date = await this.getCurrentLocalPropertyDate(connection); 
  
        let payment_cycle = await models.Lease.getActivePaymentCycle(connection, date || property_date, this.id);
        
        // this.payment_cycle = payment_cycle ? payment_cycle.payment_cycle : null; 
        this.PaymentCycle = payment_cycle; 
  
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
        let adjustment_invoice = 0;
  
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

    async removePaymentCycles(connection, date, params = {}) {
        let delete_discount_ids = [];

        let payment_cycles = await models.Lease.findPaymentCyclesFromDateByLeaseId(connection, this.id, date);
        if (payment_cycles.length > 0) {
            let payment_cycles_ids = payment_cycles.map(pc => pc.id);
            await models.Lease.removePaymentCycleByIds(connection, payment_cycles_ids);

            delete_discount_ids = payment_cycles.map(pc => pc.discount_id);
            await models.Discount.deleteLeasesFromDiscountsByIds(connection, delete_discount_ids);

            this.payment_cycle = null;
            await models.Lease.save(connection, { payment_cycle: null }, this.id);
            this.PaymentCycle = {};
        }
    }
  
      async saveMoveInPaymentCycle(connection, start_date, end_date, company_id, dryrun){

        if(!this.payment_cycle) e.th(400, "No payment cycle set.");
        let payment_cycle = this.PaymentCycleOptions.find(po => po.label.toLowerCase() === this.payment_cycle.toLowerCase());
        if(!payment_cycle) e.th(404, "Payment Cycle not available for this lease.");
  
        if(dryrun) return payment_cycle;
  
        let discount = await this.addPromotion(connection, payment_cycle.promotion_id, company_id, false, null, null, end_date);
        
        let current_rent_service = await this.findActiveRentService(connection, nextBillingDate);

        let payload = {
          lease_id: this.id,
          start_date: start_date.format('YYYY-MM-DD'),
          end_date: end_date.format('YYYY-MM-DD'),
          rent: discount.type === 'percent' ? utils.r(current_rent_service.price * (1 - (discount.value / 100))) : utils.r(current_rent_service.price - discount.value),
          payment_cycle: payment_cycle.label,
          payment_cycle: payment_cycle.label,
          rent: this.rent * payment_cycle.period,
          periods: payment_cycle.period,  
          discount_id: discount.id,
          pay_by_date: start_date.clone().add(this.revert_payment_cycle, 'day').format('YYYY-MM-DD')
        }
  
        await models.Lease.save(connection, {payment_cycle: this.payment_cycle}, this.id);
        await models.Lease.savePaymentCycle(connection, payload);
  
        return payment_cycle;
  
      }
  
      async savePaymentCycle(connection, nextBillingDate, billed_months, company_id, dryrun){
        // Apply discount here?
        // await models.Lease.save(connection, {payment_cycle: this.payment_cycle}, this.id);
        // end current payment cycle as of today, 
  
        // save discount here. 
        
        /* QAL-503 changes */
        // let currentPaymentCycles = await models.Lease.getActivePaymentCycle(connection, nextBillingDate.format('YYYY-MM-DD'), this.id);
        
        // if(currentPaymentCycles){
        //   e.th(409, "This lease is already in an active payment cycle during this time.")
        // }

        
        if(!this.payment_cycle) e.th(400, "No payment cycle set.")
        let payment_cycle = this.PaymentCycleOptions.find(po => po.label.toLowerCase() === this.payment_cycle.toLowerCase());
        
        
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

    async findActiveRentService(connection){
        return await Service.getActiveRentService(connection, this.id)
    }

    async getActiveRent(connection){
        const activeRentService = await this.findActiveRentService(connection);
        this.rent = activeRentService ? activeRentService.price : this.rent;
      }

    async getMoveInInvoice(connection, offset, company, date) {

        let invoice = {}
        let invoicePeriod = {};
        let start_limit = {};

        let startDate = moment(this.start_date).startOf('day').add(+offset + 1, 'months').subtract(1, 'day');
        const leasePromotions = await this.findPromotionsByLeaseId(connection);
        invoicePeriod = await this.getBillDayByPromotion(connection, leasePromotions, date && date.clone() || startDate);

        if(invoicePeriod == null) {
            if(date){
                invoicePeriod = {
                    start: this.getBillDateAfterDate(date.clone()),
                    end: this.getBillDateAfterDate(date.clone()).add(1,'months').subtract(1,'day')
                }
            } else {
                let startDate = moment().add(+offset, 'months');
                let endDate = moment().add(+offset+1, 'months');
                invoicePeriod = {
                    start: this.getNextBillDate(startDate),
                    end: this.getNextBillDate(endDate).subtract(1,'day')
                }
                // For a given invoice period, find:
            }
        }

        // Check if future invoice exisit or not
        let activeRentInvoices = await models.Invoice.findActiveRentInvoices(connection,{
            start: invoicePeriod.start.format("YYYY-MM-DD"),
            end: invoicePeriod.end.format("YYYY-MM-DD"),
            lease_id: this.id,
            status: 1
        }) 

        if(activeRentInvoices && activeRentInvoices.length) {
            let invoice = new Invoice({ id:activeRentInvoices[0].id});
            await invoice.find(connection);
            await invoice.total();
            await invoice.getOpenPayments(connection);
            return invoice;
        }

        start_limit = invoicePeriod.start.clone().subtract(1,'month');
        let services = [];

        try {
            services = await this.getCurrentServices(connection, company.id, invoicePeriod.start.clone(), invoicePeriod.end.clone(), start_limit).filter(s => s.service_type === 'lease' || s.service_type === 'insurance' )
        } catch(err){
            if(err.code !== 409){
            throw err;
            }
            services = [];
        }
        if(services.length){
            let datetime = await this.getCurrentLocalPropertyDate(connection,'YYYY-MM-DD')
            invoice = new Invoice({
                lease_id: this.id,
                user_id: null,
                date: moment(datetime).format('YYYY-MM-DD'),
                due: this.bill_day <= invoicePeriod.start.format('D')? invoicePeriod.start.clone().date(this.bill_day).format('YYYY-MM-DD'): invoicePeriod.start.clone().format('YYYY-MM-DD'),
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
                invoicePeriod.start.clone(),
                invoicePeriod.end.clone(),
                null,
                company.id
            );

            await invoice.calculatePayments();
            await invoice.getOpenPayments(connection)

        }
        return invoice;
    }

    async setAccessOnLease(connection) {
        // Note: Call lease findFullDetails fucntion before calling setAccessOnLease fucntion

        console.log('setAccessOnLease for lease =>', this.id);
        await this.Property.getAccessControl(connection);
        if(!this.Property.Access) return;

        for(let i = 0; i < this.Tenants.length; i++){

            let contact = this.Tenants[i].Contact;
            let code = undefined;
            await contact.findAccessCredentials(connection, this.Property);
            if(!contact.Access || !contact.Access.pin){
                code = await this.Property.Access.generateCode();
            } else {
                code = contact.Access.pin;
            }

            await contact.saveAccess(connection, this.Property, {pin: code, status: 1}, this);
        }
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
    
        let date = await this.getCurrentLocalPropertyDate(connection); 
        await this.Delinquency.complete(connection, date); 
        
    }

    async determineLeaseStanding(connection, payload = {}) {
        const { date } = payload;

        const { LEASE_STANDING } = ENUM;
        const currentDate = date || await this.getCurrentLocalPropertyDate(connection);
        const isLeaseClosed = this.moved_out !== null || (this.end_date && (moment(this.end_date).startOf('day') <= moment(currentDate).startOf('day')));
        const isBalanceDue = this.balance > 0;
        const currentStanding = await this.getStanding(connection);

        console.log('Current Standing: ', currentStanding);

        if(isLeaseClosed) {
            return isBalanceDue ? LEASE_STANDING.BALANCE_DUE : LEASE_STANDING.LEASE_CLOSED;
        }
        
        if(isBalanceDue || currentStanding === LEASE_STANDING.AUCTION) {
            return currentStanding;
        }

        return LEASE_STANDING.CURRENT;
    }

    async findContacts(connection, payload = {}) {
        return await models.Lease.getContacts(connection, {
            lease_id: this.id,
            ...payload
        });
    }

    async createLockRemovalTask(connection) {
        if (!this.Unit?.id) {
            await this.findUnit(connection);
        }

        await this.Unit.getProperty(connection);
        await this.Unit.Property.getAccessControl(connection);

        // if is Noke, dont create the task, just unlock, and save lease status
        if(this.Unit.Property.Access.access_name.toLowerCase() === ENUM.GATE_ACCESS.VENDORS.NOKE) {
            await this.Unit.removeOverlock(connection);
        } else {
            const params = {
                property_id: this.Property.id,
                company_id: this.Property.company_id,
                connection: connection
            };

            let isTaskAlreadyPresent = await models.Todo.findTasksByObjectId(connection, this.id, [ENUM.EVENT_TYPES.DELINQUECY.LOCK_REMOVAL], ENUM.TASK_TYPE.LEASE);
            if(!isTaskAlreadyPresent?.length) {
                TasksEvents.createTask(params, this.id, ENUM.EVENT_TYPES.DELINQUECY.LOCK_REMOVAL, null, 'This event is created from worker server', null, ENUM.TASK_TYPE.LEASE);
            }
        }
    }

    async findBalance(connection, payload) {
        const result = await models.Billing.findBalance(connection, {
          lease_id: this.id,
          ...payload
        });
    
        this.balance = result.balance;
    }

    // Steps which should be execueted when lease past due balance becomes = 0
    async endDelinquencyProcess(connection, payload = {}, shouldCommit = true) {
        if(!this.id) e.th(500, 'LeaseId is required to end delinquency process steps');
        console.log(`End delinquency process started for lease: ${this.id}`);

        const { contact_id, delinquency_id } = payload;
        const { EVENT_TYPES_COLLECTION, TASK_TYPE, LEASE_AUCTION_STATUS } = ENUM;
        const errors = [];

        await this.find(connection);
        await this.findUnit(connection);
        await this.getProperty(connection);
        const isLeaseClosed = this.moved_out !== null;
        
        if(!this.balance) {
            await this.getCurrentBalance(connection);
        }

        if(!isLeaseClosed && this.balance > 0) {
            console.log('Balance is still present on lease');
            return;
        }

        if (delinquency_id) {
            this.Delinquency = new Delinquency({ id: delinquency_id });
            await this.Delinquency.find(connection);
        }

        const currentPropertyDate = await this.getCurrentLocalPropertyDate(connection);
        let contactId = this.Contact?.id || contact_id;  
        if(!contactId) {
            const primaryContact = await this.findContacts(connection, { is_primary: true });
            contactId = primaryContact[0].contact_id;
        }

         // finding lease Auction object
        await this.findAuction(connection);
        
        let actions = {
            collection_call: async () => {
                await Todo.dismissTasks(connection, this.id, EVENT_TYPES_COLLECTION.COLLECTION_CALL, TASK_TYPE.LEASE);
            },
            overlock_space: async () => {
                await Todo.dismissTasks(connection, this.id, EVENT_TYPES_COLLECTION.OVERLOCK_SPACE, TASK_TYPE.LEASE);
                await this.removeToOverlockFromSpace(connection);        
            },
            auction: async () => {
                console.log('Auction status ', this.auction_status);

                await Todo.dismissTasks(connection, this.id, EVENT_TYPES_COLLECTION.AUCTION, TASK_TYPE.LEASE);
                if(!isLeaseClosed && [ENUM.LEASE_AUCTION_STATUS.SCHEDULE,ENUM.LEASE_AUCTION_STATUS.SCHEDULED,ENUM.LEASE_AUCTION_STATUS.AUCTION_DAY,ENUM.LEASE_AUCTION_STATUS.AUCTION_PAYMENT].includes(this.auction_status) && !this.LeaseAuction?.payment_id){
                    await this.removeLeaseAuction(connection);
                    await this.removeAuctionStatus(connection);
                }

                if(isLeaseClosed && [ENUM.LEASE_AUCTION_STATUS.AUCTION_PAYMENT,ENUM.LEASE_AUCTION_STATUS.MOVE_OUT].includes(this.auction_status)){
                    await this.updateAuctionStatus(connection,ENUM.LEASE_AUCTION_STATUS.COMPLETE);
                }        
            },
            lease_standing: async () => {
                const leaseStanding = await this.determineLeaseStanding(connection, { date: currentPropertyDate });
                await this.updateStanding(connection, leaseStanding);        
            },
            accept_payments: async () => {
                if(this.deny_payments) {
                    await this.acceptPayments(connection);
                }
            },
            remove_overlock: async () => {
                let overlock = await this.Unit.getActiveOverlock(connection);
                let current_lease = await this.Unit.getCurrentLease(connection);
                console.log(`To Overlock status for lease: ${this.id} - current lease data:`, current_lease);
                console.log(`Overlocked data for lease: ${this.id} - overlock:`, overlock);
                if (current_lease?.to_overlock == 0 && overlock) {
                    console.log(`calling create lock removal task for lease:`, this.id);
                    await this.createLockRemovalTask(connection);
                }
            },
            end_delinquency: async () => {
                await this.getDelinquency(connection, null, { delinquency_statuses: [ENUM.DELINQUENCY_STATUS.ACTIVE, ENUM.DELINQUENCY_STATUS.PAUSED] }); 
                if(this.Delinquency?.id) {
                    await this.endDelinquency(connection);
                }
            },
            // gate_access actions must be done at the very end
            gate_access: async () => {
                const contact = new Contact({ id: contactId });
                await this.Property.getAccessControl(connection);
                if (this.Property.Access.access_name.toLowerCase() === 'derrels') {
                    // there is 0 balance for the lease, restore the unit
                    console.log('Activating Gate Access for unit');
                    await this.Property.Access.restoreUnit(this.unit_id);
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
        }

        if(!isLeaseClosed && (this.auction_status == ENUM.LEASE_AUCTION_STATUS.AUCTION_PAYMENT || this.auction_status == ENUM.LEASE_AUCTION_STATUS.MOVE_OUT) && this.LeaseAuction?.payment_id) {
            actions = {
              pauseDelinquency: async () => {
                await this.getDelinquency(connection, null, true);
                if(this.Delinquency?.id) {
                  await this.pauseDelinquency(connection,"Pause due to auction payment",contactId,this.Delinquency.id);
                }
              }
            }
        }

        for(let action in actions) {
            try {
                if (shouldCommit) await connection.beginTransactionAsync();
                console.log('Execueting ', action);
                await actions[action]();
                if (shouldCommit) await connection.commitAsync();
            } catch(err) {
                if (shouldCommit) await connection.rollbackAsync();
                console.log('Delinquency action error: ', err);
                if (shouldCommit) errors.push(err?.stack || err);
                else throw err;
            }
        }

        return { 
            are_actions_execueted: true,
            errors
        };
    }

    prorateAllServices() {
        this.Services = this.Services.map((s) => {
            s.prorate = 1;
            return s;
        });
    }

    async removeToOverlockFromSpace(connection){
        return await models.Lease.removeToOverlockFromSpace(connection, this.id);
    }

    async removeAuctionStatus(connection){
        await  models.Lease.updateAuctionStatus(connection, null, this.id);
        return true;
    }

    async findUnpaidInvoices(connection, date) {
        if (!this.id) e.th(500, "Invalid lease id.");
        let invoices = await models.Lease.getUnpaidInvoicesByLease(connection, this.id, date);
        return invoices;
    }

    async getStoredContents(connection) {
        if (!this.id) e.th(500, "Lease Id Not Set");
        let storedContents = await models.Lease.getStoredContents(connection, this.id);
        // To find others and move to the last position of the stored content data
        let otherItems = []
        let contents = []
        for (let content of storedContents) {
            let { name, value } = content;
            if (name === 'Others') {
                if (value) otherItems.push(value);
            } else {
                if (name) contents.push(name);
            }
        }
        this.stored_contents = [...contents, ...otherItems].join(', ')
    }

    async findUnitLeaseData(connection){
        if(!this.id) e.th(400, "Invalid Lease ID");
        let lease = await models.Lease.findUnitLeaseData(connection, this.id);
        if (!lease) e.th(400, "Invalid Lease ID")
        return lease
    }

    /**
     * Function to find all invoices future to the given date with the given status
     * @param { SQL Connection Object } connection
     * @param { String } date Date from which the invoices are to be found
     * @param { String } status Status of invoice. Can be one from ('active', 'void', 'all')
     * @returns An array of invoices future to the given date of the given status
     */
    async getFutureInvoicesByDate(connection, date, status = 'all') {
        if (![`active`, `void`, `all`].includes(status)) return null;
        let invoices = models.Invoice.fetchFutureInvoicesByDateAndLeaseId(connection, this.id, date, status)
        return invoices || [];
    }

    /**
     * @param { SQL Connection Object } connection
     * @returns Array of objects with  payment_id and amount
     */
    async getUnappliedPayments(connection) {
        if (!this.id) return;

		let
            invoicePayments = await models.Invoice.findUnappliedPayments(connection, this.id),
            openPayments = [];

		for(let invoicePayment of invoicePayments) {
			let payment = new Payment({ id: invoicePayment.id });

			await payment.find(connection);
			await payment.getPaymentApplications(connection);

			if(payment.payment_remaining) {
				openPayments.push({
					id: payment.id,
					amount: payment.payment_remaining
				})
			}
		}
		return openPayments;
    }

    /**
     * This function creates a new invoice for the given month
     * @param { SQL Connection Object} connection
     * @param { Date } period Period for the invoice
     * @param { Object } invoicePayload Data to save in invoice
     * @returns Newly created invoice
     */
    async createCustomInvoice(connection, period, invoicePayload, invoiceLines = []) {
        const { company_id: companyId } = invoicePayload;

        await this.find(connection);
        await this.getProperty(connection, companyId);

        //done to handle change in bill_day before invoice adjustment
        this.bill_day = parseInt(moment(period.start).format(`D`));

        let
            invoicePeriod = {},
            lastBilledUpto = moment(period.start).subtract(1, `days`);

        if (period.start && period.end) {
            invoicePeriod.start = moment(period.start);
            invoicePeriod.end = moment(period.end);
        } else {
            invoicePeriod = await this.getCurrentInvoicePeriod(connection, lastBilledUpto, 1)
        }

        let
            services = await this.getCurrentServices(connection, companyId, invoicePeriod.start.clone(), invoicePeriod.end.clone())
                .filter(s => {
                    return (
                        ( (s.service_type == 'lease') || ( s.service_type == 'insurance') ) &&
                        ( (s.recurring === 1) || (!s.recurring && !s.last_billed) )
                    )
                });

        let newInvoice = new Invoice({
            lease_id: this.id,
            date: invoicePeriod.start.format(`YYYY-MM-DD`),
            due: invoicePeriod.start.format(`YYYY-MM-DD`),
            period_start: invoicePeriod.start,
            period_end: invoicePeriod.end,
            status: 1,
            ...invoicePayload
        });

        newInvoice.Lease = this;
        await newInvoice.makeFromServices(
            connection,
            services,
            this,
            invoicePeriod.start,
            invoicePeriod.end,
            null,
            companyId
        );

        if (invoiceLines?.length) {
            let filteredInvoiceLines = invoiceLines.filter(invoiceLine => {
                return !newInvoice.InvoiceLines.some((newInvoiceLine => newInvoiceLine.product_id == invoiceLine.product_id));
            });
            if (filteredInvoiceLines.length) {
                await newInvoice.generateLines(connection, filteredInvoiceLines, [], companyId);
            }
        };

        newInvoice.total();
        if(!newInvoice.balance) return;
        await newInvoice.save(connection, false);

        return newInvoice;

    }
    
    async findAuction(connection){
        if(!this.id) throw "lease id not set";
        this.LeaseAuction = await models.LeaseAuction.findByLeaseId(connection, this.id);
    }

    async getPaymentCycleRent(connection, payload) {
        const { date } = payload;

        const result = await models.Lease.getPaymentCycleRent(connection, {
            lease_id: this.id,
            date
        });

        this.payment_cycle_rent = Math.round(result.payment_cycle_rent * 1e2) / 1e2;
        return this.payment_cycle_rent;
    }

    async savePaymentCycleIfApplicable(connection, payload = {}) {
        const { PAYMENT_CYCLES } = ENUM;
        if (this.payment_cycle == null || this.payment_cycle == PAYMENT_CYCLES.MONTHLY) {
            return false;
        }

        const { next_billing_date, billed_months, company_id, dryrun, payment_cycle } = payload;
        return await this.savePaymentCycle(connection, next_billing_date, billed_months, company_id, dryrun, payment_cycle);
    }

    async shouldGenerateNewPaymentCycle(connection, payload) {
        const { next_billing_date } = payload;

        const leasePaymentCycles = await models.Lease.getPaymentCycle(connection, {
            lease_id: this.id,
            date: next_billing_date
        });

        const leasePaymentCycle = leasePaymentCycles?.length ? leasePaymentCycles[0] : null;
        const leasePaymentCycleStart = leasePaymentCycle?.start_date;

        console.log('Should Generate: ', leasePaymentCycle);

        if (leasePaymentCycleStart) {
            if (leasePaymentCycleStart != next_billing_date) {
                e.th(500, 'Some configuration error occured in active payment cycle for this lease. Payment cycle discount might already be present for this period.');
            }

            return false;
        }

        return true;
    }

  // function to show "remove lock" on door status & and to create a task for lock removal. Situation: when due balance is 0 but To Overlock is not executed 
  async createLockRemovalTaskOnToOverLockState(connection){
    if(!this.Unit || !this.Unit.id){
        await this.findUnit(connection);
        await this.getProperty(connection);    
    }    
    let current_lease = await this.Unit.getCurrentLease(connection);
    let check_overlock = await this.Unit.getActiveOverlock(connection);
    console.log(`createLockRemovalTaskOnToOverLockState for lease: ${current_lease?.id} check_overlock: `, check_overlock);
    console.log(`createLockRemovalTaskOnToOverLockState for lease: ${current_lease?.id} current_lease: `, current_lease);

    if(current_lease?.to_overlock == 1 && !check_overlock?.length){
      console.log(`Balance is 0 but To Overlock is not executed for lease:`, current_lease.id);
      await this.Unit.getProperty(connection);
      await this.Unit.Property.getAccessControl(connection);  
      if (this.Unit.Property.Access.access_name.toLowerCase() !== ENUM.GATE_ACCESS.VENDORS.NOKE) {
        try {
            await this.Unit.setOverlock(connection);
            console.log("unit overlocked for lease: ", current_lease.id);
        } catch(err){
            if(err.code !== 409){
                throw err;
            }
        }
      } // end of if

    }    
  } // end of function create

    // This receives invoice start date and returns invoice end date. Longest invoice would be for a month.
    getInvoicePeriodEnd(start_date, bill_day) {
        if (!moment.isMoment(start_date)) return null;

        let is_month_changed = (start_date.format('M') - start_date.clone().add(1, 'Months').format('M')) != 0;
        let days_in_next_month = start_date.clone().add(1, 'months').daysInMonth();
        let days_in_month = start_date.clone().daysInMonth()
        let inv_start = +start_date.format('D')

        bill_day = bill_day || this.bill_day;

        let next_month_bill_day = bill_day <= days_in_next_month;
        let bill_day_exists = bill_day <= days_in_month;


        if (is_month_changed && !next_month_bill_day && inv_start == bill_day)
            return start_date.add(1, 'Months').endOf('Month').subtract(1, 'Days');

        else if (inv_start >= bill_day || inv_start == days_in_month)
            return start_date.add(1, 'Months').date(bill_day).subtract(1, 'Days');

        else if (bill_day_exists && inv_start < bill_day)
            return start_date.date(bill_day).subtract(1, 'Days');

        else if (!bill_day_exists && inv_start < days_in_month)
            return start_date.endOf('Month').subtract(1, 'Days')

    }

  async findConfidenceInterval(connection) {
    this.confidence_interval = await models.Lease.getConfidenceInterval(connection, this.id);
  }

  static async getRefundDetails(connection, payload) {
    return models.Lease.getRefundDetails(connection, payload);
  }
}



module.exports = Lease;


var Activity = require('../classes/activity.js');
var Address = require('../classes/address.js');
var Invoice  = require('./invoice.js');
var Discount = require('../classes/discount.js');
var Document = require('../classes/document.js');
var Scheduler = require('../modules/scheduler.js');
var Service = require('../classes/service.js');
var Unit = require('../classes/unit.js');
var Upload = require('../classes/upload.js');
var Contact = require('../classes/contact.js');
var Property = require('../classes/property.js');
var Promotion = require('../classes/promotion.js');
var Payment = require('../classes/payment.js');
var Signer = require('../classes/signer.js');
var MaintenanceRequest = require('../classes/maintenance_request.js');
var PaymentMethod = require('../classes/payment_method.js');
var Company = require('../classes/company');
let Delinquency = require('../classes/delinquency.js');
var Trigger = require('../classes/trigger.js');
const TasksEvents = require('../events/tasks');
const Todo = require('./todo');
const rounding = require('../modules/rounding');
const TaxLines = require('./tax_lines');
