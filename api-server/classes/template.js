"use strict";

var Promise = require('bluebird');
var validator = require('validator')
var moment      = require('moment');

class Template {

	constructor(data) {

		data = data || {};
		this.id = data.id || null;
		this.company_id = data.company_id || null;
		this.name = data.name || null;
		this.description = data.description || null;
		this.security_deposit_months = data.security_deposit_months;
		this.lease_type = data.lease_type;
		this.lease_duration = data.lease_duration;
		this.lease_duration_type = data.lease_duration_type;
		this.bill_day = data.bill_day;
		this.gate_code_length = data.gate_code_length || null;
		this.gate_code_format = data.gate_code_format;
		this.terms = data.terms;
		this.email_statement = data.email_statement;
		this.unit_type = data.unit_type;
		this.status = data.status;
		this.is_default = data.is_default;
		this.tax_rent = data.tax_rent;
		this.prorate_rent = data.prorate_rent;
		this.prorate_rent_out = data.prorate_rent_out;
		this.auto_pay = data.auto_pay;
		this.invoiceSendDay = data.invoiceSendDay;
		this.allow_back_days = data.allow_back_days;
		this.prorate_days = data.prorate_days;
		this.security_deposit_type = data.security_deposit_type;
		this.deposit_amount = data.deposit_amount;
		this.security_deposit = data.security_deposit;
		this.auto_pay_after_billing_date = data.auto_pay_after_billing_date;
		this.auto_pay_max_times = data.auto_pay_max_times;
		this.created_by = data.created_by || null;
		this.last_updated_by = data.last_updated_by || null;
		this.enable_payment_cycles = data.enable_payment_cycles || null;
		this.revert_payment_cycle = data.revert_payment_cycle || null;

		this.payment_cycle_options = [];
		this.ReservationServices = [];
		this.ApplicationServices = [];
		this.Services = [];
		this.products = [];
		this.InsuranceServices = [];
		this.message = '';
		this.requiredFields = [];
		this.Checklist = [];
	}

	addService(data){

		this.Services.push({
			id: data.id || null,
			product_id: data.Product.id,
			price: data.price,
			qty: data.qty,
			prorate: data.prorate,
      		prorate_out: data.prorate_out,
			recurring: data.recurring,
			service_type: data.service_type
		});

		return true;

	}


	validate(){

		return Promise.resolve().then(() => {

			if (!this.company_id) {
				e.th(500,'Invalid company id');
			}

			if (!this.lease_type) {
				e.th(400,'Please enter a lease type');
			}

			if (this.lease_type == "Fixed Length" && (!this.lease_duration_type || !this.lease_duration)){
				e.th(400, 'Please enter a lease duration');
			}

			if (!this.bill_day) {
				e.th(400, 'Please enter a bill day');
			}
			return true;
		})
	}

	validateService(service){

		return Promise.resolve().then(() => {

			if(['lease','insurance','reservation','application'].indexOf(service.service_type) < 0)
				e.th(400, 'Invalid service type');

			if (!service.product_id)
				e.th(400, 'Invalid product_id');

			if (!service.service_type) {
				e.th(400, 'Please enter a service type');
			}
			return true;
		})
	}

	async validateChecklist(connection, checklist) {

    if (!checklist.document_type_id) return true;
		let document_type = await models.Document.findTypeById(connection, checklist.document_type_id);
    if (!document_type || document_type.company_id !== this.company_id) {
      e.th(400, 'Invalid document type');
    }

    // if (!checklist.document_id) return true;
    // return models.Document.findById(connection, checklist.document_id).then(d => {
    //   if (!d || d.company_id != this.company_id) {
    //     e.th(400, 'Invalid document');
    //   }
    // })

	}

	async updateChecklist(connection, body){
		let CheckList = await models.Checklist.findByTemplateId(connection, this.id);
		
		let checklist_ids = body.checklist.map(x => x.id);
		let local_difference = CheckList.filter(x => !checklist_ids.includes(x.id));
		let update_checklist = body.checklist.filter(x => x.id != null);
		let new_checklist = body.checklist.filter(x => x.id == null);

		if(local_difference.length > 0){
			await this.deleteChecklist(connection, local_difference.map(x=>x.id), body.last_updated_by || null);
		}

		for(let i = 0; i< update_checklist.length; i++) {
			let item = await this.findChecklistItem(connection, update_checklist[i].id);

			if(!item) e.th(404, "Item not found");

			item.document_id = update_checklist[i].document_id;
			if (body.last_updated_by) {
				item.last_updated_by = body.last_updated_by;
			}
			await this.saveChecklist(connection, item, item.id);
		}

		for(let i=0; i<new_checklist.length; i++){
			let item = this.makeChecklistItem(new_checklist[i]);
			if (body.last_updated_by) {
				item.created_by = body.last_updated_by;
			}

			item.id = await this.saveChecklist(connection, item);
		}
		return;
	}

	async updateProducts(connection, body){
		let services = await models.LeaseTemplate.findServices(connection, 'lease', this.id);
		
		let service_ids = body.products.map(x => x.id);
		let local_difference = services.filter(x => !service_ids.includes(x.id));
		let update_products = body.products.filter(x => x.id != null);
		let new_products = body.products.filter(x => x.id == null);

		if(local_difference.length > 0){
			await this.deleteService(connection, local_difference.map(x=>x.id));
		}

		for(let i = 0; i< update_products.length; i++) {
			let service = await this.findService(connection, update_products[i].id);

				if(!service) e.th(404, "Item not found");

				// if(service.service_type != params.service_type) e.th(400, "Invalid service type");
				// if(service.template_id != params.template_id) e.th(400, "Invalid service");

				service.product_id = update_products[i].product_id;
				service.price = update_products[i].price;
				service.qty = update_products[i].qty || 1;
				service.optional= false;

				await this.saveService(connection, service, service.id);
		}

		for(let i=0; i<new_products.length; i++){
			let service = this.makeService(new_products[i], 'lease');

			await this.saveService(connection, service);
		}
		return;
	}
	

	save(connection){
		return this.validate()
			.then(() => {
				var save = {
					company_id: this.company_id,
					name: this.name,
					description: this.description,
					security_deposit_months: this.security_deposit_months,
					unit_type: this.unit_type,
					lease_type: this.lease_type,
					lease_duration: this.lease_duration,
					lease_duration_type: this.lease_duration_type,
					bill_day: this.bill_day,
					terms: this.terms,
					email_statement: this.email_statement,
					tax_rent: this.tax_rent,
					prorate_rent: this.prorate_rent,
					prorate_rent_out: this.prorate_rent_out,
					auto_pay: this.auto_pay,
					security_deposit_type: this.security_deposit_type,
					deposit_amount: this.deposit_amount,
					invoiceSendDay: this.invoiceSendDay,
					allow_back_days: this.allow_back_days,
					prorate_days: this.prorate_days,
					auto_pay_after_billing_date: this.auto_pay_after_billing_date,
					auto_pay_max_times: this.auto_pay_max_times,
					enable_payment_cycles: this.enable_payment_cycles,
					revert_payment_cycle:  this.revert_payment_cycle
				};
				if(this.created_by) {
					save.created_by = this.created_by;
				}
				if(this.last_updated_by) {
					save.last_updated_by = this.last_updated_by;
				}
				
				return models.LeaseTemplate.save(connection, save, this.id).then(id => {
					this.id = id;
					return true;
				})
			})
			.then(() =>{
				console.log("tthis.is_default", this.is_default);
				if(!this.is_default) return true;
				return this.setAsDefault(connection);
			})
	}

	saveService(connection, service, service_id){

		if(!this.id) e.th(500,"Values not set properly")
		return Promise.resolve()
			.then(() => this.validateService(service))
			.then(() => models.LeaseTemplate.saveService(connection, {
				product_id: service.product_id,
				template_id: service.template_id,
				price: service.price || 0,
				qty: service.qty,
				recurring: service.recurring,
				prorate: service.prorate,
        		prorate_out: service.prorate_out,
				optional: service.optional,
				service_type: service.service_type,
				status: service.status

			}, service_id))
			.then(service_id => {
				service.id = service_id;
				this.Services.push(service);
				return service_id;
			})
	}

	async saveChecklist(connection, checklist, checklist_id) {

		if(!this.id) e.th(500, "Values not set properly");

		await this.validateChecklist(connection, checklist);
    checklist_id = await models.Checklist.saveChecklistItem(connection, checklist, checklist_id);
    return checklist_id;

	}
	

	findInsuranceServices(connection){

		if(!this.id) e.th(500, "Values not set properly");

		return models.LeaseTemplate.findServices(connection, 'insurance', this.id).map(data => {
      console.log("data", data);
			var insurance = new Insurance({ product_id: data.product_id });
			return insurance.find(connection).then(() => {

				var service = {
					id: data.id,
					product_id: data.product_id,
					template_id: data.template_id,
					price: data.price,
					qty: data.qty,
					prorate: data.prorate,
          prorate_out: data.prorate_out,
					recurring: data.recurring,
					start_date: moment().format('YYYY-MM-DD'),
					end_date: null,
					service_type: data.service_type,
					optional: data.optional,
					Insurance:  insurance
				};
				this.Services.push(service);
				return true;

			});
		})

	}


	findServices(connection, type){


		if(!this.id) e.th(500, "Values not set properly");
		
		return models.LeaseTemplate.findServices(connection, type, this.id).map(data => {
			var product = new Product({ id: data.product_id });

			return product.find(connection).then(() => {
				var service = {
					id: data.id,
					product_id: data.product_id,
					template_id: data.template_id,
					price: product.price ? product.price : data.price,
					qty: data.qty,
					prorate: data.prorate,
          			prorate_out: data.prorate_out,
					recurring: data.recurring,
					start_date: moment().format('YYYY-MM-DD'),
					end_date: null,
					service_type: data.service_type,
					optional: data.optional,
					name: product.name,
					category_type : product.category_type,
					default_type: product.default_type,
					Product:  product
				};
				// let products = {};
				// if(!this.Products[product.category_type]){
				// 	this.Products[product.category_type] = [service];
				// }

				// else{ 
				// 	this.Products[product.category_type].push(service);
				// }
				this.products.push(service);
				this.Services.push(service);
				// let service_type = {key: product.category_type , value: service};
				// if(type == 'lease'){
					// this.Services.push(products);
				//
				// } else if(type == 'reservation'){
				// 	_this.ReservationServices.push(service);
				//
				// } else if(type == 'application'){
				// 	_this.ApplicationServices.push(service);
				//
				// }

			});
		})
	}

	findService(connection, service_id){
		var _this = this;

		if(!this.id){
			var error = new Error("values not set properly");
			error.code = 500;
			throw error;
		}

		return models.LeaseTemplate.findServiceById(connection, service_id, this.id).then(function(data){

			var product = new Product({ id: data.product_id });
			return product.find(connection).then(function(result){
				var service = {
					id: data.id,
					product_id: data.product_id,
					template_id: data.template_id,
					price: data.price,
					qty: data.qty,
					prorate: data.prorate,
          prorate_out: data.prorate_out,
					recurring: data.recurring,
					service_type: data.service_type,
					status:  data.status,
					Product:  product
				};
				return service;
			});
		})
	}

	findChecklist(connection){

		if(!this.id) e.th(500, "Values not set properly");

		return models.Checklist.findByTemplateId(connection, this.id).then( checklist => {
			this.checklist = checklist;
			this.Checklist = checklist;
			return true;
		});


	}

	findChecklistItem(connection, checklist_id){

		if(!this.id) e.th(500, "Values not set properly");

		return models.Checklist.findById(connection, checklist_id, this.id)


	}





	setAsDefault(connection){

		if(!this.id || !this.company_id || !this.unit_type){
			e.th(500, "values not set properly")
		}

		return models.LeaseTemplate.unsetDefault(connection, this.company_id, this.unit_type)
			.then(() => models.LeaseTemplate.setDefault(connection, this.id))

	}

	saveServices(){
		// _this.id = result;
		// // save Services
		// // Delete all Service
		//
		// return models.LeaseTemplate.deleteAllServices(connection, _this.id).then(function(result){
		//
		// 	if(!_this.Services.length) return;
		// 	var promises = [];
		// 	_this.Services.forEach(s => {
		//
		// 		s.template_id = _this.id;
		// 		promises.push(models.LeaseTemplate.saveService(connection, s, s.id));
		// 	});
		// 	return Promise.all(promises);
		// });
	}

	deleteService(connection, service_ids){

		if(!this.id || !this.company_id || !this.unit_type){
			var error = new Error("values not set properly");
			error.code = 500;
			throw error;
		}
		return models.LeaseTemplate.deleteService(connection, service_ids)

	}

	deleteChecklist(connection, checklist_ids, deleted_by){

		if(!this.id){
			var error = new Error("values not set properly");
			error.code = 500;
			throw error;
		}
		console.log("HHH##E#E#");

		return models.Checklist.deleteChecklistItem(connection, checklist_ids, deleted_by)
	}

	async delete(connection){
			if(!this.id) return;
			await models.LeaseTemplate.deleteAllServices(connection, this.id);
			await models.LeaseTemplate.delete(connection, this.id);
	}

	find(connection){

		return Promise.resolve()
			.then(() => {
				if(!this.id) e.th(500, "Values not set properly");
				return models.LeaseTemplate.findById(connection, this.id)
			})
			.then(data => {
				if(!data) e.th(404, "Template not found");

				this.id = data.id;
				this.company_id =  data.company_id;
				this.name =  data.name;
				this.description =  data.description;
				// this.security_deposit_months = data.security_deposit_months;
				this.security_deposit = (data.security_deposit_type) ? 1: 0;
				this.unit_type =  data.unit_type;
				this.is_default =  data.is_default;
				this.tax_rent =  data.tax_rent;
				this.prorate_rent =  data.prorate_rent;
				this.prorate_rent_out =  data.prorate_rent_out;

				this.lease_type =  data.lease_type;
				this.lease_duration =  data.lease_duration;
				this.lease_duration_type =  data.lease_duration_type;
				this.bill_day =  data.bill_day;
				this.gate_code_length =  data.gate_code_length;
				this.gate_code_format =  data.gate_code_format;
				this.terms =  data.terms;
				this.email_statement =  data.email_statement;
				this.status =  data.status;
				this.security_deposit_type = data.security_deposit_type;
				this.deposit_amount = data.deposit_amount;
				this.auto_pay_after_billing_date = data.auto_pay_after_billing_date;
				this.enable_payment_cycles = data.enable_payment_cycles;
				this.revert_payment_cycle = data.revert_payment_cycle;
				if(!this.enable_payment_cycles) this.revert_payment_cycle = null; 
				this.auto_pay_max_times = data.auto_pay_max_times;

				if (this.security_deposit_type && this.deposit_amount) {
					this.security_deposit = true;
				}
				this.invoiceSendDay = data.invoiceSendDay;
				this.allow_back_days = data.allow_back_days;
				this.prorate_days = data.prorate_days;
				this.auto_pay = data.auto_pay;

				this.Services = [];
				this.ReservationServices = [];
				this.ApplicationServices = [];
				this.InsuranceServices = [];
		})

	}

	verifyAccess(company_id){
		if(this.company_id !== company_id) e.th(401, "You do not have access to view this resource");
		return Promise.resolve()
	}

	update(data){
		const { auto_pay_max_times, auto_pay_after_billing_date } = data;		

		this.name = data.name;
		this.description = data.description;
		if(data.security_deposit){
			this.security_deposit_type = data.security_deposit_type;
			this.deposit_amount = data.deposit_amount;
		} else {
			this.security_deposit_type = null;
			this.deposit_amount = null;
		}
		this.unit_type = data.unit_type;
		this.is_default = !!data.is_default;
		this.lease_type = data.lease_type;

		if(this.lease_type == Enums.LEASE_TYPE.FIXED_LENGTH){
			this.lease_duration = data.lease_duration;
			this.lease_duration_type = data.lease_duration_type;
		} else {
			this.lease_duration = null;
			this.lease_duration_type = null;
		}
		
		this.bill_day = data.bill_day;
		this.terms = data.terms;
		this.email_statement = !!data.email_statement;
		this.tax_rent = !!data.tax_rent;
		this.prorate_rent = !!data.prorate_rent;
		this.prorate_rent_out = !!data.prorate_rent_out;
		this.auto_pay = data.auto_pay;

		// if (data.security_deposit_type === 'number') {
		// 	this.security_deposit_months = data.deposit_amount;
		// }
		// else{
			
		this.security_deposit_months = null;
		// }

		// this.security_deposit = (data.security_deposit_type) ? 1: 0;

		this.invoiceSendDay = data.invoiceSendDay;
		this.allow_back_days = data.allow_back_days;
		this.prorate_days = data.prorate_days;

		this.auto_pay_after_billing_date = auto_pay_after_billing_date;
		this.auto_pay_max_times = auto_pay_max_times;
		this.enable_payment_cycles = data.enable_payment_cycles || false;
		this.revert_payment_cycle = data.revert_payment_cycle  || false;
		if (data.created_by) {
			this.created_by = data.created_by;
		}
		if (data.last_updated_by) {
			this.last_updated_by = data.last_updated_by;
		}
	}

	makeChecklistItem(data){

		let item = {
			template_id: this.id,
			document_id: data.document_id,
			document_type_id: data.document_type_id || null,
			sort: 1,
			description: data.description,
			name: data.name || null,
			require_all: data.require_all || false,
			document_tag: data.tag || null
		}

		console.log("item", item);

		return item;

	}

	makeService(data, service_type){

		let service = {
			product_id: data.product_id,
			template_id: this.id,
			price: data.price || null,
			qty: data.qty || 1,
			prorate: !!data.prorate,
      		prorate_out: !!data.prorate_out,
			recurring: !!data.recurring,
			service_type: service_type,
			optional: !!data.optional,
			status: 1
		}
		return service

	}

	async findPaymentCycles(connection){
		if(!this.id) e.th(500, "Values not set properly");
		if(!this.enable_payment_cycles){
			this.revert_payment_cycle = null;
			this.payment_cycle_options = [];
			return;
		}
		let results = await models.LeaseTemplate.findPaymentCycles(connection, this.id)

		for(let i = 0; i < results.length; i++){
            let promotion = new Promotion({id: results[i].promotion_id });
            await promotion.find(connection); 
            results[i].Promotion = promotion;
		} 
	
		this.payment_cycle_options = results;
		return;
	}

	async savePaymentCycles(connection, payment_cycle_options, enable_payment_cycles, company_id){
		
		//let ids = payment_cycle_options.map(bp => bp.id); 
		let enabled = payment_cycle_options.find(pco => pco.enabled);
		if(enable_payment_cycles && !enabled) e.th(409, "Please enable at least one payment cycle"); 

		await models.LeaseTemplate.removePaymentCycles(connection, this.id);
		if(!enable_payment_cycles) return;
		for(let i = 0; i < payment_cycle_options.length; i++){
			
			let {enabled,  promotion_id, label } = payment_cycle_options[i];
			
			if(!enabled) continue; 
			if(!promotion_id) e.th(404, "Please include a promotion."); 
			let promotion = await models.Promotion.findById(connection, promotion_id);
			
			if(!promotion)  e.th(404, "Promotion not found.");
			if(promotion.label !== 'discount') e.th(409, "Only discounts can be used for this.")
			if(promotion.company_id !== company_id) e.th(404, "Promotion not found.");
			let period = 0;
			switch(label){
				case 'Quarterly':
					period = 3;
					 if(promotion.required_months > 3) e.th(404, "Promotion required months cannot be greater than 3.");
					break;
				case 'Annual': 
					period = 12;
					if(promotion.required_months > 12) e.th(404, "Promotion required months cannot be greater than 12.");
					break;
			}
			let save = {
				period, 
				label,
				promotion_id,
				template_id: this.id
			}
			await models.LeaseTemplate.savePaymentCycles(connection, save, payment_cycle_options[i].id); 
			

		}


		let results = await models.LeaseTemplate.findPaymentCycles(connection, this.id)
		this.payment_cycle_options = results;
		return;
	}



	static async findByCompanyId(connection, company_id){
		return await models.LeaseTemplate.findByCompanyId(connection, company_id)
	}

}

module.exports = Template;

const Enums = require('../modules/enums.js');
const e  = require(__dirname + '/../modules/error_handler.js');

const Product = require('../classes/product.js');
const Insurance = require('../classes/insurance.js');
const Promotion = require('../classes/promotion.js');

const models  = require(__dirname + '/../models');