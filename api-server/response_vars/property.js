module.exports = {
	'/list': {
		get: 'id,company_id,name,address,city,district,region,state,zip,description',
		post: []
	},
	'/': {
		get: 'id,company_id,address_id,gds_id,name,legal_name,number,description,phone,email,status,unit_count,lease_count,is_day_closed,map_published_at,occupancy,Address(*),Phones(*),Emails(*),Images(*)',
		post: []
	},
	'/:property_id':{
		get: 'id,company_id,address_id,gds_id,name,number,description,email,status,unit_count,lease_count,Address(*),Phones(id,property_id,type,phone,sort),Emails(id,property_id,type,email,sort)'
	},
	'/:property_id/units':{
		get: 'id,category_id,space_mix_id,address_id,template_id,property_id,unit_group_id,product_id,RentProduct(*),number,floor,type,description,price,set_rate,default_price,featured,lease_duration,lease_duration_type,available_date,state,next_lease_start,terms,security_deposit,created,Address(*),length,width,height,x,y,rotate,left,top,unit type,door type,vehicle storage,Lease(id,start_date,end_date,rent,rent_paid_through,status,last_rent_raise,last_rent_raise_amount,future_rent_raise,future_rent_raise_amount,is_transferred,Tenants(id,contact_id,lease_id,sort,type,created_at,Contact(salutation,first,middle,last,suffix,email,company,Phones(id,type,phone,sms))),Reservation(id)),Images(*),Floorplan(*),Category(id,company_id,name,description,price,unit_type),Amenities(*(id,name,value,category_type,category_name))'
	},
	'/:property_id/list':{
		get: 'id,category_id,address_id,template_id,number,floor,type,description,price,set_rate,default_price,featured,lease_duration,lease_duration_type,available_date,state,next_lease_start,terms,security_deposit,Address(*),length,width,height,x,y,rotate,left,top,unit type,door type,vehicle storage,Category(*)'
	},
	'/:property_id/units/featured':{
		get: 'id,category_id,address_id,template_id,product_id,RentProduct(*),number,floor,type,description,price,set_rate,default_price,featured,lease_duration,lease_duration_type,available_date,state,terms,next_lease_start,security_deposit,Address(*),length,width,height,unit type,door type,vehicle storage,Lease(id,start_date,end_date,status,Tenants(id,contact_id,lease_id,sort,type,created_at,Contact(salutation,first,middle,last,suffix,email,company,Phones(id,type,phone,sms))),Reservation(id)),Images(*),Floorplan(*),Category(*)'
	},
	'/:property_id/units/list':{
		get: 'id,category_id,address_id,template_id,product_id,RentProduct(*),number,floor,type,description,price,set_rate,default_price,featured,lease_duration,lease_duration_type,available_date,state,terms,next_lease_start,security_deposit,Address(*),length,width,height,unit type,door type,vehicle storage,Lease(id,start_date,end_date,status,Tenants(id,contact_id,lease_id,sort,type,created_at,Contact(salutation,first,middle,last,suffix,email,company,Phones(id,type,phone,sms))),Reservation(id)),Images(*),Floorplan(*),Category(*)'
	},
	'/:property_id/units/bulk':{
		get: 'id,status,days_vacant,rent,category_id,space_mix_id'
	},
	'/:property_id/units/available':{
		get: 'id,category_id,space_mix_id,address_id,template_id,product_id,RentProduct(*),number,floor,type,description,price,set_rate,default_price,featured,lease_duration,lease_duration_type,available_date,state,terms,next_lease_start,security_deposit,Address(*),length,width,height,unit type,door type,vehicle storage),Images(*),Floorplan(*),Category(id,company_id,name,description,price,unit_type)'
	},
	'/:property_id/hours':{
		get: 'id,property_id,start_hr,start_min,start_ap,end_hr,end_min,end_ap,first_day,last_day,type,order'
	},
	'/:property_id/categories':{
		get: 'id,company_id,name,description,price,Attributes(id,category_id,amenity_id,name,value),Units(min_price,max_price,unit_count),Vacant(min_price,max_price,unit_count)'
	},
	'/:property_id/images':{
		get: 'id,DocumentType(*),uploaded_by,type,upload_date,extension,encoding,mimetype,size,name,src'
	},
	'/:property_id/templates':{
		get: `storage(id,Template(id,company_id,security_deposit_type,deposit_amount,auto_pay,auto_pay_after_billing_date,auto_pay_max_times,invoiceSendDay,allow_back_days,prorate_days,bill_day,description,enable_payment_cycles,revert_payment_cycle,email_statement,lease_duration,lease_duration_type,lease_type,name,prorate_rent,prorate_rent_out,security_deposit,security_deposit_months,tax_rent,payment_cycle_options(*),checklist(*),products(*),Checklist(description,document_id,document_type_id,id,name,require_all,template_id),Services(id,template_id,product_id,name,start_date,end_date,optional,price,prorate,recurring,qty,service_type,taxable,Insurance(id,name,company_id,description,name,price,taxable,coverage,deductible,premium,premium_value,premium_type,product_id,default_type,type,Vendor(*)),Product(id,name,company_id,description,name,price,taxable,default_type,type,Vendor(*))))),residential(id,Template(id,company_id,security_deposit_type,deposit_amount,auto_pay,invoiceSendDay,allow_back_days,prorate_days,bill_day,description,email_statement,lease_duration,lease_duration_type,lease_type,name,prorate_rent,prorate_rent_out,security_deposit,security_deposit_months,tax_rent,payment_cycle_options(*),checklist(*),products(*),Checklist(description,document_id,document_type_id,id,name,require_all,template_id),Services(id,template_id,product_id,name,start_date,end_date,optional,price,prorate,recurring,qty,service_type,taxable,Insurance(id,name,company_id,description,name,price,taxable,coverage,deductible,premium,premium_value,premium_type,product_id,Vendor(*)),Product(id,name,company_id,description,name,price,taxable,Vendor(*))))),parking(id,Template(id,company_id,security_deposit_type,deposit_amount,auto_pay,invoiceSendDay,allow_back_days,prorate_days,bill_day,description,email_statement,lease_duration,lease_duration_type,lease_type,name,prorate_rent,prorate_rent_out,security_deposit,security_deposit_months,tax_rent,payment_cycle_options(*),checklist(*),products(*),Checklist(description,document_id,document_type_id,id,name,require_all,template_id),Services(id,template_id,product_id,name,start_date,end_date,optional,price,prorate,recurring,qty,service_type,taxable,Insurance(id,name,company_id,description,name,price,taxable,coverage,deductible,premium,premium_value,premium_type,product_id,Vendor(*)),Product(id,name,company_id,description,name,price,taxable,Vendor(*)))))`
	},
	'/:property_id/utilities':{
		get: 'id,property_id,product_id,vendor_id,splittype,amount,Product(id,vendor_id,name,description,price,taxable),Vendor(id,name,phone,phone2,email,address_id,Address())'
	},
	'/:property_id/products':{
		get: 'id,vendor_id,name,description,price,amount_type,prorate,prorate_out,recurring,type,default_type,taxable,sku,has_inventory,amount_type,category_type,income_account_id,Rules(*),gl_account_code,gl_account_name,gl_account_active'
	},
  	'/:property_id/connections':{
		get: 'id,name,value(*),type,property_id,Devices(id,connection_id,name,ip,port,identifier,lan)'
	},
	'/:property_id/space-mix/:space_mix_id/units':{
		get: 'id,category_id,space_mix_id,address_id,template_id,product_id,RentProduct(*),number,floor,type,description,price,set_rate,default_price,featured,lease_duration,lease_duration_type,available_date,state,next_lease_start,terms,security_deposit,Address(*),length,width,height,x,y,rotate,left,top,unit type,door type,vehicle storage,Lease(id,start_date,end_date,status,Tenants(id,contact_id,lease_id,sort,type,created_at,Contact(salutation,first,middle,last,suffix,email,company,Phones(id,type,phone,sms))),Reservation(id))'
	},
	'/:property_id/space-mix/:space_mix_id/units/available':{
		get: 'id,property_id,category_id,product_id,number,floor,type,description,price,set_rate,default_price,featured,available_date,status,next_lease_start,terms,security_deposit,length,width,height,unit type,door type,vehicle storage,beds,baths,sqft,parking,pets,furnished,laundry,year built,state,Address(*),Product(*),Lease(id,start_date,end_date,status,Tenants(id,first,last)),Images(*),Floorplan(*),Category(*),Amenities(id,name,value,category_type,category_name)',
	},
	'/:property_id/space-mix':{
		get: 'width,width_id,length,length_id,height,height_id,category,space_group,description,spacemix_category_id,unit_type,Units(count,min_price,max_price),Vacant(count,available,min_price,max_price),id,category_id,Attributes(*(name,value))',
	},
	'/:property_id/leases':{
		get: 'id,unit_id,promotion_id,start_date,end_date,bill_day,exempted,notes,terms,rent,status,send_invoice,security_deposit,monthly,code,balance,open_balance,decline_insurance,moved_out,rent_paid_through,lease_standing_id,insurance_exp_month,insurance_exp_year,Standing(id,name,sort,type,status,color,overlock,deny_access),auction_status,OpenInvoices(id,lease_id,number,date,due,discounts,sub_total,total_tax,total_due,total_payments,balance,Payments(*)),Unit(id,property_id,category_id,address_id,number,type,status,state,Address(address,address2,city,state,neighborhood,zip,country,lat,lng)),Metrics(lifetime_payments,paid_through_date,prepaid_balance,has_autopay),Tenants(id,contact_id,lease_id,sort,created_at,Contact(id,salutation,first,middle,last,suffix,email,company,dob,ssn,gender,driver_license,active_military,military_branch,email,source,status,Phones(id,type,phone,sms,primary),Addresses(Address(id,address,city,state,zip)))),Discounts(id,promotion_id,coupon_id,start,end,lease_id,company_id,value,type,pretax,msg,Promotion(*),name,round),InsuranceService(*),Unit(id,price,label,number,type,property_id)'
	},
	'/:property_id/units/rate-changes':{
		get: 'unit_id,rate_changes(price,start_date,end_date)'
	},
	'/:property_id/unit-groups/:unit_group_id/promotions':{
		get: 'id,name,description,label,value,type,period,months,offset,sort,active,required_months,days_threshold,consecutive_pay,enable,active_period,start_date,end_date,created_at,units()',
	}
}