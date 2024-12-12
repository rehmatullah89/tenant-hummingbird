module.exports = {
	'/:unit_id': {
		get: 'id,property_id,category_id,product_id,space_mix_id,unit_group_id,number,floor,type,description,price,set_rate,default_price,featured,available_date,status,next_lease_start,terms,security_deposit,length,width,height,label, unit type,door type,vehicle storage,beds,baths,sqft,parking,pets,furnished,laundry,year built,state,gate_status,created,Address(*),Product(*),Lease(id,start_date,end_date,status,Tenants(id,first,last)),Images(*),Floorplan(*),Category(*),Amenities(id,name,value,category_name)',
		post: []
	},

	'/:unit_id/lease-set-up': {
		get: 'security_deposit,monthly,start_date,end_date,bill_day,terms,rent,auto_pay_after_billing_date,sensitive_info_stored,Invoices(*),Discounts(*),Promotions(name,description,value,type,months,offset,pretax,active),Charges(date,due,discounts,sub_total,total_tax,total_due,balance,Detail(product_id,name,qty,cost,tax,discounts,date,start_date,end_date,total_cost,Product(id,name,description,price,taxable,default_type))),ReservationCharges(date,due,discounts,sub_total,total_tax,total_due,balance,Detail(product_id,name,qty,cost,tax,discounts,date,start_date,end_date,Product(id,name,description,price,taxable,default_type)))',
		post: 'security_deposit,monthly,start_date,end_date,bill_day,terms,rent,auto_pay_after_billing_date,sensitive_info_stored,Invoices(*),Discounts(*),Promotions(name,description,value,type,months,offset,pretax,active),Charges(date,due,discounts,sub_total,total_tax,total_due,balance,Detail(product_id,name,qty,cost,tax,discounts,date,start_date,end_date,total_cost,Product(id,name,description,price,taxable,default_type))),ReservationCharges(date,due,discounts,sub_total,total_tax,total_due,balance,Detail(product_id,name,qty,cost,tax,discounts,date,start_date,end_date,Product(id,name,description,price,taxable,default_type)))'
	},

	'/:unit_id/lease': {
		get: 'id,unit_id,promotion_id,start_date,end_date,bill_day,notes,terms,rent,status,send_invoice,security_deposit,balance,decline_insurance,insurance_exp_month,insurance_exp_year,moved_out,Tenants(id,contact_id,lease_id,sort,created_at,Contact(id,salutation,first,middle,last,suffix,email,company,dob,ssn,gender,driver_license,active_military,military_branch,email,source,Phones(id,type,phone,sms)))',
		post: 'id,promotion_id,security_deposit,monthly,start_date,end_date,bill_day,terms,rent,Discounts(promotion_id,start,end,value,type,pretax),Invoice(id,date,due,discounts,sub_total,total_tax,total_due,balance,InvoiceLines(id,product_id,qty,cost,date,start_date,end_date,Product(id,name,description,price,taxable,default_type),TaxLines(id,taxrate),DiscountLines(id,amount,pretax)))'
	},
	'/:unit_id/pending': {
		get: 'id,promotion_id,security_deposit,monthly,start_date,end_date,bill_day,terms,notes,decline_insurance,insurance_exp_month,insurance_exp_year,send_invoice,rent,sensitive_info_stored,auto_pay_after_billing_date,payment_cycle,PaymentCycleOptions(*),Discounts(promotion_id,start,end,value,type,pretax),Invoice(id,date,due,discounts,sub_total,total_tax,total_due,balance,InvoiceLines(id,product_id,qty,cost,date,start_date,end_date,Product(id,name,description,price,taxable,default_type),TaxLines(id,taxrate),DiscountLines(id,amount,pretax)))'
	},
	'/:unit_id/leases': {
		get: 'id,promotion_id,security_deposit,monthly,start_date,end_date,bill_day,terms,rent,Tenants(Contact(id,salutation,first,middle,last,suffix,email,Phones(*)))'
	},
	'/list': {
		get: 'id,property_id,number,floor,type,description,price,set_rate,default_price,available_date'
	},
	'/:unit_id/reserve': {
		post: 'reservation(lease_id,reservation_id,Invoice(id),tenants(id,Contact(id)))'
	},
	'/:unit_id/lease': {
		post: 'lease(Access(name),Invoice(id),Invoices(id),lease_id,payment_id,payment_method_id,tenants(id,contact_id,pin))'
	},
	'/:unit_id/payment-cycles': {
		get: 'id,label,period,promotion_id,template_id,Promotion(company_id,consecutive_pay,created_at,created_by,days_threshold,description,enable,end_date,id,label,months,name,offset,pretax,required_months,round,sort,start_date,type,value)'
	}
}
