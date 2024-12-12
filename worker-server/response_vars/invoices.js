
module.exports = {
	'/:invoice_id': {
		get:  'id,lease_id,user_id,number,date,due,status,period_start,period_end,paid,balance,utilities_total,rent_total,total_due,total_tax,total_payments,discounts,sub_total,InvoiceLines(*),Payments(*),Lease(*)'
	},
	'/web/:invoice_id': {
		get:  'id,lease_id,user_id,number,date,due,status,period_start,period_end,paid,balance,utilities_total,rent_total,total_due,total_tax,total_payments,discounts,sub_total,InvoiceLines(*),Payments(*),Lease(*)'
	}
}