var BaseJoi      = require('joi');
const Extension = require('joi-date-extensions');
const Joi = BaseJoi.extend(Extension);

const supported_formats = ['pdf','csv_yardi','csv_quickbooks','iif_quickbooks','csv_sageintacct','pdf_accountant_summary','csv_charges_detail','csv_charges_journal','pdf_charges_journal','pdf_balance_sheet', 'csv_yardifinancialjournal', 'iifQuickbooks_class_code','csv_yardi-financial-journal-ipp'];

module.exports = {
	exportNow: {
		property_ids: Joi.array().required(),
		format: Joi.string().valid(...supported_formats).required(),
		type: Joi.string().valid('summarized','detailed').required(),
		export_range: Joi.string().valid('yesterday','last_seven_days','last_calendar_month','date_range','date').required(),
		start_date: Joi.date().format('YYYY-MM-DD').required(),
		end_date:  Joi.date().format('YYYY-MM-DD').required(),
		timeZone: Joi.string().allow('', null),
		send_to:  Joi.array().items(
			Joi.object().keys({
				email: Joi.string().email().required(),
				first: Joi.string().allow('', null),
				last: Joi.string().allow('', null),
				name: Joi.string().allow('', null)
			})
		),
		book_id: Joi.string().valid('0','1','2').allow('', null),
	},
	scheduledExport: {
		property_ids: Joi.array().required(),
		format: Joi.string().valid(...supported_formats).required(),
		type: Joi.string().valid('summarized','detailed').required(),
		frequency: Joi.string().valid('daily','weekly','monthly','quarterly','biweekly').required(),
		day_of_week: Joi.when('frequency', { is: ['weekly','biweekly'], 
						then: Joi.string().valid('monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday').required()
					}),
		day_of_month: Joi.when('frequency', { is: ['monthly', 'quarterly'] ,
						then: Joi.number().min(1).max(31).required() 
					}),
		date: Joi.when('frequency', { is: ['quarterly','monthly'], 
						then: Joi.date().format('YYYY-MM-DD').required()
					}),
		send_to:  Joi.array().items(
			Joi.object().keys({
				email: Joi.string().email().required(),
				first: Joi.string().allow('', null),
				last: Joi.string().allow('', null),
				name: Joi.string().allow('', null)
			})
		),
		book_id: Joi.string().valid('0','1','2').allow('', null),
	},
	glExport: {
		property_id: Joi.array().required(),
		type: Joi.string().valid('summarized','detailed').required(),
		start_date: Joi.date().format('MM-DD-YYYY').required(),
		end_date:  Joi.date().format('MM-DD-YYYY').required(),
		book_id: Joi.string().valid('0','1','2').allow('', null),
	},

}
