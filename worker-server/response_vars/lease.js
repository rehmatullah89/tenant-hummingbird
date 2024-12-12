
module.exports = {
	'/:lease_id': {
		get: 'id,unit_id,promotion_id,start_date,end_date,bill_day,notes,terms,rent,status,send_invoice,security_deposit,monthly,code,balance,decline_insurance,moved_out,OpenInvoices(id,lease_id,number,date,due,discounts,sub_total,total_tax,total_due,total_payments,balance, Payments(*)),Unit(id,property_id,category_id,address_id,number,type,Address(address,city,state,neighborhood,zip,country,lat,lng)),Tenants(id,contact_id,lease_id,sort,created_at,Contact(id,salutation,first,middle,last,suffix,email,company,dob,ssn,gender,driver_license,active_military,military_branch,email,source,Phones(id,type,phone,sms)))',
		post: []
	},

	'/:lease_id/uploads':{
		get: 'id,DocumentType(*),uploaded_by,type,upload_date,extension,encoding,mimetype,size,name,src,Revisions(iid,type,upload_date,extension,encoding,mimetype,size,name,src)'
	},
	'/:lease_id/payment-methods': {
		get: 'id,lease_id,unit_number,company,first,last,name_on_card,auto_charge,type,card_end,card_type,rent,utilities,nonce',
		post: 'id,lease_id,address_id,company,first,last,name_on_card,auto_charge,type,card_end,card_type,rent,utilities,nonce'
	},
	'/:lease_id/payments': {
		get: 'id,payment_methods_id,lease_id,amount,transaction_id,date,number,ref_name,notes,type,method,card_type,status,total_applied,payment_remaining,PaymentMethod(id,lease_id,first,last,name_on_card,type,card_end,card_type),AppliedPayments(id,invoice_id,payment_id,amount,date,created)'
	},
	'/:lease_id/payments/open': {
		get: 'id,payment_methods_id,lease_id,amount,transaction_id,date,number,ref_name,notes,type,method,card_type,status,total_applied,payment_remaining,PaymentMethod(id,lease_id,first,last,name_on_card,type,card_end,card_type),AppliedPayments(id,invoice_id,payment_id,amount,date,created)'
	},
	'/:lease_id/current-charges': {
		get: 'lease_id,date,due,InvoiceLines(product_id,service_id,qty,cost,date,start_date,end_date,Service(id,lease_id,product_id,price,start_date,end_date,name,description,qty,recurring,prorate,last_billed),Product(id,company_id,name,description,active,price,taxable,prorate,default_type),TaxLines(taxrate),DiscountLines(discount_id,amount,pretax,Promotion(id,company_id,name,description))),discounts,sub_total,total_tax,total_due,balance'
	},
	'/:lease_id/services': {
		get: 'id,lease_id,product_id,price,start_date,end_date,name,description,qty,recurring,prorate,last_billed,Product(id,company_id,name,description,active,price,taxable,prorate,default_type)'
	},


	'/:lease_id/invoices/past-due': {
		get: 'id,lease_id,number,date,due,type,status,period_start,period_end,discounts,total_due,total_tax,sub_total,total_payments,balance,decline_insurance,InvoiceLines(id,invoice_id,product_id,discount_id,qty,cost,start_date,end_date,Discount(*),Product(id,company_id,vendor_id,name,description,price,taxable,prorate),TaxLines(id,invoice_line_id,tax_authority_id,taxrate),DiscountLines(*),Payments(id,invoice_id,payment_id,lease_id,amount,date,Payment(id,payment_methods_id,amount,ate,type,method,notes)))'
	},
	'/:lease_id/invoices/calculate': {
		post: 'lease_id,date,due,type,period_start,period_end,discounts,total_due,total_tax,sub_total,InvoiceLines(product_id,discount_id,qty,cost,start_date,end_date,description,Discount(*),Product(id,company_id,vendor_id,name,description,price,taxable,prorate),TaxLines(id,invoice_line_id,tax_authority_id,taxrate),DiscountLines(*))'
	},
	'/:lease_id/invoices/:type': {
		get: 'id,lease_id,number,date,due,type,status,period_start,period_end,discounts,total_due,total_tax,sub_total,total_payments,balance,decline_insurance,InvoiceLines(id,invoice_id,product_id,discount_id,qty,cost,start_date,end_date,description,Discount(*),Product(id,company_id,vendor_id,name,description,price,taxable,prorate),TaxLines(id,invoice_line_id,tax_authority_id,taxrate),DiscountLines(*),Payments(id,invoice_id,payment_id,lease_id,amount,date,Payment(id,payment_methods_id,amount,ate,type,method,notes)))'
	},

	'/:lease_id/tenants': {
		get: 'id,lease_id,contact_id,sort,created_at,Contact(id,salutation,first,middle,last,suffix,email,company,dob,ssn,gender,driver_license,active_military,military_branch,email,source,Phones(id,type,phone,sms),Addresses(id,type,Address(address,city,state,neighborhood,zip,country,lat,lng)),Relationships(id,contact_id,related_contact_id,lease_id,type,is_cosigner,is_emergency,is_military,Contact(id,salutation,first,middle,last,suffix,email,company,dob,ssn,gender,driver_license,active_military,military_branch,email,source,Phones(id,type,phone,sms),Addresses(id,type,Address(id,address,city,state,neighborhood,zip,country,lat,lng))))'
	},
	'/:lease_id/insurance': {
		get: 'insurance_service(id,lease_id,price,start_date,end_date,name,description,qty,recurring,prorate,last_billed,Vendor(*)),options(id,company_id,name,description,taxable,prorate,coverage,premium,premium_value,premium_type,deductible,due_today,Vendor(*))'
	}
}