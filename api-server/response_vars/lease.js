
module.exports = {
  '/pending': {
    get: 'id,unit_id,payment_cycle,start_date,end_date,rent,created,Transfer(id,from_lease_id,to_lease_id,contact_id,date,TransferBy(id,salutation,first,middle,last,suffix,email,company)),Unit(id,property_id,category_id,address_id,number,type,status,Address(address,address2,city,state,neighborhood,zip,country,lat,lng)),Tenants(id,contact_id,lease_id,sort,created_at,Contact(id,salutation,first,middle,last,suffix,email,company,Phones(id,type,phone,sms)))'
  },

  '/:lease_id': {
		get: 'id,unit_id,payment_cycle,promotion_id,start_date,end_date,idv_id,bill_day,exempted,notes,terms,rent,status,send_invoice,security_deposit,monthly,code,balance,open_balance,decline_insurance,moved_out,rent_paid_through,lease_standing_id,insurance_exp_month,insurance_exp_year,tier_type,move_in,Standing(*),auction_status,OpenInvoices(id,lease_id,number,date,due,discounts,sub_total,total_tax,total_due,total_payments,balance,Payments(*)),Unit(id,property_id,category_id,price,set_rate,label,address_id,number,type,status,state,Address(address,address2,city,state,neighborhood,zip,country,lat,lng)),Metrics(*),Tenants(id,contact_id,lease_id,sort,created_at,Contact(id,salutation,first,middle,last,suffix,email,company,dob,ssn,gender,driver_license,active_military,military_branch,email,source,status,Phones(id,type,phone,sms),Addresses(Address(id,address,city,state,zip)))),Discounts(*),InsuranceService(*),Unit(id,price,set_rate,label,number,type,property_id),stored_contents,transferred_from,PaymentCycle(id,discount_id,end_date,pay_by_date,payment_cycle,start_date,created),stored_contents,transferred_from,rent_management(rent_plan_id,rent_plan_status,rent_change_id,next_rent_change(schedule_rent,rent_change,rent_change_amt,notification(status,date),schedule_date,affect_timeline,rent_plan_name),last_rent_change(rent_change,schedule_date),rent_sell_variance(percentage,amount),notice_status,rent_change_notice(id,name))',
		post: []
	},

	'/:lease_id/payment-cycles': {
		get: 'id,payment_cycle,PaymentCycleOptions(id,label,period,promotion_id,template_id,Promotion(company_id,consecutive_pay,created_at,created_by,days_threshold,description,enable,end_date,id,label,months,name,offset,pretax,required_months,round,sort,start_date,type,value))',
	},


	'/': {
		get: 'id,unit_id,promotion_id,payment_cycle,start_date,end_date,bill_day,exempted,notes,terms,rent,status,send_invoice,contact_id,has_autopay,paid_through_date,last_payment_date,property_id,security_deposit,monthly,code,balance,open_balance,decline_insurance,moved_out,rent_paid_through,lease_standing_id,insurance_exp_month,insurance_exp_year,move_in_rent,total_rent_raises,last_rent_raise,future_rent_raise,future_rent_raise_amount,reservation_date,documents_pending,Standing(id,name,sort,type,status,color,overlock,deny_access),auction_status,OpenInvoices(id,lease_id,number,date,due,discounts,sub_total,total_tax,total_due,total_payments,balance,Payments(*)),Unit(id,property_id,category_id,address_id,number,type,status,state,Address(address,address2,city,state,neighborhood,zip,country,lat,lng)),Metrics(lifetime_payments,paid_through_date,prepaid_balance,has_autopay),Tenants(id,contact_id,lease_id,sort,created_at,Contact(id,salutation,first,middle,last,suffix,email,company,dob,ssn,gender,driver_license,active_military,military_branch,email,source,status,Phones(id,type,phone,sms,primary),Addresses(Address(id,address,city,state,zip)))),CreatedBy(id,salutation,first,middle,last,suffix,email,company,dob,ssn,gender,driver_license,active_military,military_branch,email,source,status),Discounts(id,promotion_id,coupon_id,start,end,lease_id,company_id,value,type,pretax,msg,Promotion(*),name,round),InsuranceService(*),Unit(id,price,label,number,type,property_id)',
	},
	'/move-out': {
		get: 'id,unit_id,promotion_id,payment_cycle,start_date,end_date,bill_day,notes,terms,rent,status,send_invoice,security_deposit,monthly,code,balance,open_balance,decline_insurance,moved_out,has_autopay,paid_through_date,last_payment_date,property_id,rent_paid_through,lease_standing_id,insurance_exp_month,insurance_exp_year,move_in_rent,total_rent_raises,last_rent_raise,reservation_date,Standing(*),auction_status,OpenInvoices(id,lease_id,number,date,due,discounts,sub_total,total_tax,total_due,total_payments,balance,Payments(*)),Unit(id,property_id,category_id,address_id,number,type,status,state,Address(address,address2,city,state,neighborhood,zip,country,lat,lng)),Metrics(*),Tenants(id,contact_id,lease_id,sort,created_at,Contact(id,salutation,first,middle,last,suffix,email,company,dob,ssn,gender,driver_license,active_military,military_branch,email,source,status,Phones(id,type,phone,sms,primary),Addresses(Address(id,address,city,state,zip)))),CreatedBy(id,salutation,first,middle,last,suffix,email,company,dob,ssn,gender,driver_license,active_military,military_branch,email,source,status),Discounts(*),InsuranceService(*),Unit(id,price,label,number,type,property_id)',
	},

	'/:lease_id/uploads':{
		get: 'id,lease_id,generated_by_name,uploaded_by_name,unit_number,unit_type,private,DocumentType(*),uploaded_by,type,requires_signature,upload_date,extension,encoding,mimetype,size,name,src,signers(id,email,signed,status,Contact(id,first,last,email,Phones(id,phone,type,sms))),Revisions(iid,type,upload_date,extension,encoding,mimetype,size,name,src)'
	},

	'/:lease_id/payment-methods': {
		get: 'id,lease_id,unit_number,company,first,last,name_on_card,type,card_end,card_type,rent,utilities,nonce',
		post: 'id,lease_id,address_id,company,first,last,name_on_card,auto_charge,type,card_end,card_type,rent,utilities,nonce'
	},
  '/:lease_id/payment-methods/autopay': {
    get: 'id,lease_id,unit_number,company,first,last,name_on_card,type,card_end,card_type,rent,utilities,nonce'
  },

	'/:lease_id/payments': {
		get: 'id,payment_methods_id,lease_id,amount,transaction_id,date,number,ref_name,notes,type,method,card_type,status,total_applied,payment_remaining,PaymentMethod(id,lease_id,first,last,name_on_card,type,card_end,card_type),AppliedPayments(id,invoice_id,payment_id,amount,date,created)'
	},

	'/:lease_id/payments/open': {
		get: 'id,payment_methods_id,lease_id,amount,transaction_id,date,number,ref_name,notes,type,method,card_type,status,total_applied,payment_remaining,PaymentMethod(id,lease_id,first,last,name_on_card,type,card_end,card_type),AppliedPayments(id,invoice_id,payment_id,amount,date,created)'
	},

	'/:lease_id/current-charges': {
		get: 'lease_id,date,due,InvoiceLines(product_id,service_id,qty,cost,date,start_date,end_date,Service(id,lease_id,product_id,price,start_date,end_date,name,description,qty,recurring,prorate,prorate_out,taxable,last_billed),Product(id,company_id,name,description,active,price,taxable,prorate,default_type),TaxLines(taxrate),DiscountLines(discount_id,amount,pretax,Promotion(id,company_id,name,description))),discounts,sub_total,total_tax,total_due,balance'
	},

	'/:lease_id/services': {
		get: 'id,lease_id,product_id,price,start_date,end_date,name,description,qty,recurring,prorate,prorate_out,taxable,last_billed,insurance_id,Product(id,company_id,name,description,active,price,taxable,prorate,prorate_out,default_type)'
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
		get: 'id,lease_id,contact_id,sort,created_at,Contact(id,salutation,first,middle,last,suffix,email,company,dob,ssn,gender,status,driver_license,active_military,military_branch,email,source,Phones(id,type,phone,sms),Addresses(id,type,Address(address,address2,city,state,neighborhood,zip,country,lat,lng)),Relationships(id,contact_id,related_contact_id,lease_id,type,is_cosigner,is_emergency,is_alternate,is_military,Contact(id,salutation,first,middle,last,suffix,email,company,dob,ssn,gender,driver_license,active_military,military_branch,email,source,Phones(id,type,phone,sms),Addresses(id,type,Address(id,address,address2,city,state,neighborhood,zip,country,lat,lng))))'
	},
	'/:lease_id/insurance': {
		get: 'insurance_service(id,lease_id,insurance_id,price,start_date,end_date,name,description,qty,recurring,prorate,prorate_out,last_billed,Vendor(*)),options(id,company_id,name,description,taxable,prorate,prorate_out,coverage,premium,premium_value,premium_type,deductible,due_today,Vendor(*))'
	},
	'/:lease_id/checklist': {
		get: 'id,lease_id,checklist_item_id,upload_id,completed,sort,created,document_id,name,description,status,Upload(id,filename,upload_date,src,name,mimetype,DocumentType(*),signers(id,email,signed,status,Contact(id,first,last,email,Phones(*))))'

	},
	'/:lease_id/checklist/open': {
		get: 'id,lease_id,checklist_item_id,upload_id,completed,sort,created,document_type_id,document_id,name,description,Document(*),Upload(*)'

	},
	'/:lease_id/property': {
		get: 'id,company_id,address_id,name,description,phone,email,Address(*),Phones(*),Emails(*)',
	},
	'/:lease_id/vehicles': {		
		get: `id,contact_id,type,make,model,license_plate_number,year,license_plate_state,license_plate_country,vechile_identification_number,insurance_provider_name,registration_expiry_date,
			lease_id,color,registration_upload_id,insurance_policy_upload_id,hull_identification_number,serial_number,approximation_value,registered_owner(first_name,last_name,address_id,address,address2,city,state,country,zip,is_tenant),legal_owner(first_name,last_name,address_id,address,address2,city,state,country,zip,is_tenant)`
	},
	'/:lease_id/payment-options': {		
		get: `Promotion(id,name),id,period,template_id,promotion_id`
	},
	'/:lease_id/over-payments': {
		get: 'id,number,date,due,paid,type,status,period_start,period_end,total_tax,total_discounts,total_payments,balance,InvoiceLines(id,qty,cost,date,start_date,end_date,total_tax,total_discounts,Product(id,name,default_type),TaxLines(id,amount),DiscountLines(*),DiscountTotals(*),Credit(*),total,totalTax,totalDiscounts,subtotal),Payments(id,invoice_id,amount,date,created,modified,Payment(*)),discounts,total_due,sub_total,open_payments,void_date,voided_at,voided_by_contact_id,created_by,effective_date,ReissuedFrom(*),ReissuedTo(*),credit'
		
	}
}
