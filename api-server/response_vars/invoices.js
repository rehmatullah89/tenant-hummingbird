
module.exports = {
	'/:invoice_id': {
		get:  'id,lease_id,contact_id,number,date,due,status,period_start,period_end,paid,balance,utilities_total,rent_total,total_due,total_amt,total_tax,total_discounts,total_payments,discounts,sub_total,can_void_adjust,void_date,can_reissue,ReissuedFrom(number,date,due),InvoiceLines(*),Payments(*),Lease(*),Property(id,name,number,Address(*)),Contact(*)'
	},
	'/web/:invoice_id': {
		get:  'id,lease_id,contact_id,number,date,due,status,period_start,period_end,paid,balance,utilities_total,rent_total,total_due,total_amt,total_tax,total_discounts,total_payments,discounts,sub_total,Company(*),InvoiceLines(*),Payments(*),Lease(*),Property(id,name,number,Address(*),Phones(*)),Contact(*)'
	},
	// '/adjust/:invoice_id': {
	// 	post:  'id,prior_invoice_number,new_invoice_number'
	// }
}
