


module.exports = {
	'/': {
		get: 'id,company_id,description,security_deposit_months,lease_type,lease_duration,lease_duration_type,bill_day,terms,email_statement,unit_type,name,is_default,prorate_rent,prorate_rent_out,enable_payment_cycles,revert_payment_cycle'
	},

	// '/:template_id': {
	// 	get: 'id,company_id,description,security_deposit_months,lease_type,lease_duration,lease_duration_type,bill_day,terms,email_statement,unit_type,name,is_default,prorate_rent,prorate_rent_out,ReservationServices(*),ApplicationServices(*),Services(*),InsuranceServices(*)',
	//
	// },

	'/:template_id': {
		get: 'id,company_id,description,security_deposit_months,lease_type,lease_duration,lease_duration_type,bill_day,terms,email_statement,unit_type,name,is_default,prorate_rent,prorate_rent_out,auto_pay,invoiceSendDay,allow_back_days,security_deposit,prorate_days,security_deposit_type,enable_payment_cycles,revert_payment_cycle,deposit_amount,auto_pay_after_billing_date,auto_pay_max_times,products(*),checklist(*),payment_cycle_options(*)'
	},
	'/:template_id/services/:service_type': {
		get: 'id,product_id,template_id,price,qty,prorate,recurring,start_date,end_date,service_type,optional,Product(id,company_id,vendor_id,name,price,taxable,Vendor(*),Insurance(id,company_id,name,description,taxable,prorate,coverage,premium_value,premium_type,Vendor(*))'

	},
	'/:template_id/checklist': {
		get: 'id,template_id,document_type_id,document_id,name,description,require_all'

	}
}
