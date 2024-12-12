"use strict";

var models  = require(__dirname + '/../models');
var settings    = require(__dirname + '/../config/settings.js');
var Promise = require('bluebird');
var validator = require('validator')
var moment      = require('moment');
var validation      = require('../modules/validation.js');
var e  = require(__dirname + '/../modules/error_handler.js');




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
		this.auto_pay_after_billing_date = data.auto_pay_after_billing_date;
		this.auto_pay_max_times = data.auto_pay_max_times;
		this.enable_payment_cycles = data.enable_payment_cycles || null;
		this.revert_payment_cycle = data.revert_payment_cycle || null;

		this.payment_cycle_options = [];
		this.ReservationServices = [];
		this.ApplicationServices = [];
		this.Services = [];
		this.InsuranceServices = [];
		this.message = '';
		this.requiredFields = [];
	}

	addService(data){

		this.Services.push({
			id: data.id || null,
			product_id: data.Product.id,
			price: data.price,
			qty: data.qty,
			prorate: data.prorate,
			recurring: data.recurring,
			service_type: data.service_type
		});

		return true;

	}


	validate(){

		return Promise.resolve().then(() => {

			if (!this.company_id) {
				throw new Error('Invalid company id');
			}

			if (!this.lease_type) {
				throw new Error('Please enter a lease type');
			}

			if (this.lease_type == "Fixed Length" && (!this.lease_duration_type || !this.lease_duration)){
				throw new Error('Please enter a lease duration');
			}

			if (!this.bill_day) {
				throw new Error('Please enter a bill day');
			}
		}).catch(err => {
			err.code = 500;
			throw err;
		})
	}

	validateService(service){


		return Promise.resolve().then(() => {
			if (!service.product_id) {
				throw new Error('Invalid product_id');
			}

			if (!service.price && service.service_type != 'insurance') {
				throw new Error('Please enter a price');
			}

			if (!service.service_type) {
				throw new Error('Missing service type');
			}

		}).catch(err => {
			err.code = 500;
			throw err;
		})
	}

	validateChecklist(checklist){
		return Promise.resolve().then(() => {
			if (!checklist.name) {
				throw new Error('Invalid name');
			}

		}).catch(err => {
			err.code = 500;
			throw err;
		})
	}

	save(connection){
		var _this = this;

		return Promise.resolve()
			.then(() => this.validate())
			.then(function() {
				var save = {
					company_id: _this.company_id ,
					name: _this.name,
					description: _this.description,
					security_deposit_months: _this.security_deposit_months,
					unit_type: _this.unit_type,
					lease_type: _this.lease_type,
					lease_duration: _this.lease_duration,
					lease_duration_type: _this.lease_duration_type,
					bill_day: _this.bill_day,
					gate_code_length: _this.gate_code_length || null,
					gate_code_format: _this.gate_code_format,
					terms: _this.terms,
					email_statement: _this.email_statement,
					tax_rent: _this.tax_rent,
					prorate_rent: _this.prorate_rent,
					auto_pay_after_billing_date: this.auto_pay_after_billing_date,
					auto_pay_max_times: this.auto_pay_max_times,
					enable_payment_cycles: this.enable_payment_cycles,
					revert_payment_cycle:  this.revert_payment_cycle
				};

				return models.LeaseTemplate.save(connection, save, _this.id).then(id => {
					_this.id = id;
					return true;
				})
			})
			.then(function(){
				if(!_this.is_default) return true;
				return _this.setAsDefault(connection);
			})
	}

	saveService(connection, service, service_id){

		var _this = this;
		if(!this.id){
			var error = new Error("values not set properly");
			error.code = 500;
			throw error;
		}
		return Promise.resolve()
			.then(() => _this.validateService(service))
			.then(() => models.LeaseTemplate.saveService(connection, {
				product_id: service.product_id,
				template_id: service.template_id,
				price: service.price,
				qty: service.qty,
				recurring: service.recurring,
				prorate: service.prorate,
				optional: service.optional,
				service_type: service.service_type,
				status: service.status

			}, service_id))
			.then((service_id) => {
				service.id = service_id;
				_this.Services.push(service);
				return true;
			})
	}

	saveChecklist(connection, checklist, checklist_id) {
		var _this = this;
		if(!this.id){
			var error = new Error("values not set properly");
			error.code = 500;
			throw error;
		}

		return Promise.resolve()
			.then(() => _this.validateChecklist(checklist))
			.then(() => models.Checklist.saveChecklistItem(connection, checklist, checklist_id))

	}

	findInsuranceServices(connection){
		var _this = this;
		if(!this.id){
			var error = new Error("values not set properly");
			error.code = 500;
			throw error;
		}

		return models.LeaseTemplate.findServices(connection, 'insurance', this.id).map(function(data){
			console.log(data);
			var insurance = new Insurance({ product_id: data.product_id });
			return insurance.find(connection).then(function(result){

				var service = {
					id: data.id,
					product_id: data.product_id,
					template_id: data.template_id,
					price: data.price,
					qty: data.qty,
					prorate: data.prorate,
					recurring: data.recurring,
					start_date: moment().format('YYYY-MM-DD'),
					end_date: null,
					service_type: data.service_type,
					optional: data.optional,
					Insurance:  insurance
				};
				
				_this.Services.push(service);
				return true;

			});
		})

	}
	
	
	findServices(connection, type){
		var _this = this;

		if(!this.id){
			var error = new Error("values not set properly");
			error.code = 500;
			throw error;
		}

		return models.LeaseTemplate.findServices(connection, type, this.id).map(function(data){
			var product = new Product({ id: data.product_id });
			return product.find(connection).then(function(result){
				var service = {
					id: data.id,
					product_id: data.product_id,
					template_id: data.template_id,
					price: data.price,
					qty: data.qty,
					prorate: data.prorate,
					recurring: data.recurring,
					start_date: moment().format('YYYY-MM-DD'),
					end_date: null,
					service_type: data.service_type,
					optional: data.optional,
					name: product.name,
					Product:  product
				};
				// if(type == 'lease'){
					_this.Services.push(service);
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

		if(!this.id){
			var error = new Error("values not set properly");
			error.code = 500;
			throw error;
		}
		return models.Checklist.findByTemplateId(connection, this.id).then( checklist => {
			this.Checklist = checklist;
			return true;
		});


	}

	findChecklistItem(connection, checklist_id){

		if(!this.id){
			var error = new Error("values not set properly");
			error.code = 500;
			throw error;
		}
		return models.Checklist.findById(connection, checklist_id, this.id)


	}

	setAsDefault(connection){

		if(!this.id || !this.company_id || !this.unit_type){
			var error = new Error("values not set properly");
			error.code = 500;
			throw error;
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

	deleteService(connection, service_id){

		if(!this.id || !this.company_id || !this.unit_type){
			var error = new Error("values not set properly");
			error.code = 500;
			throw error;
		}
		return models.LeaseTemplate.deleteService(connection, service_id)

	}

	deleteChecklist(connection, checklist_id){

		if(!this.id){
			var error = new Error("values not set properly");
			error.code = 500;
			throw error;
		}
		console.log("HHH##E#E#");

		return models.Checklist.deleteChecklistItem(connection, checklist_id)
	}

	delete(connection){
		var _this = this;

		Promise.resolve().then(function(){
			if(_this.id){
				return models.LeaseTemplate.deleteAllServices(connection, _this.id)
			}
			return;

		}).then(r => { models.LeaseTemplate.delete(connection, _this.id) });

	}

	find(connection){

		var _this = this;
		return Promise.resolve()
			.then(function() {

				if(!_this.id){
					var error = new Error("No id is set");
					error.code = 500;
					throw error;
				};
				
				return models.LeaseTemplate.findById(connection, _this.id)
			})
			.then(function(data){

				if(!data) e.th(404, "Template not found");
				
				_this.id = data.id;
				_this.company_id =  data.company_id;
				_this.name =  data.name;
				_this.description =  data.description;
				_this.security_deposit_months = data.security_deposit_months;
				_this.security_deposit = (data.security_deposit_months) ? 1: 0;
				_this.unit_type =  data.unit_type;
				_this.is_default =  data.is_default;
				_this.tax_rent =  data.tax_rent;
				_this.prorate_rent =  data.prorate_rent;
 
				_this.lease_type =  data.lease_type;
				_this.lease_duration =  data.lease_duration;
				_this.lease_duration_type =  data.lease_duration_type;
				_this.bill_day =  data.bill_day;
				_this.gate_code_length =  data.gate_code_length;
				_this.gate_code_format =  data.gate_code_format;
				_this.terms =  data.terms;
				_this.email_statement =  data.email_statement;
				_this.status =  data.status;
				_this.auto_pay_after_billing_date = data.auto_pay_after_billing_date;
				_this.auto_pay_max_times = data.auto_pay_max_times;
				_this.enable_payment_cycles = data.enable_payment_cycles;
				_this.revert_payment_cycle = data.revert_payment_cycle;

				_this.Services = [];
				_this.ReservationServices = [];
				_this.ApplicationServices = [];
				_this.InsuranceServices = [];
		})

	}

	verifyAccess(company_id){
		return Promise.resolve().then(() => {
			if(this.company_id != company_id){
				var error = new Error("You do not have access to view this resource");
				error.code(401);
				throw error;
			}
		});

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


}



module.exports = Template;
var Product      = require('../classes/product.js');
var Insurance      = require('../classes/insurance.js');
const Promotion = require('../classes/promotion.js');
