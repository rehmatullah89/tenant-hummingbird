module.exports = {
	'/': {
		get: 'id,expires,created,time,lease_id,Promotions(*),Lease(id,unit_id,promotion_id,notes,terms,rent,security_deposit,monthly,code,balance,OpenInvoices(id,lease_id,number,date,due,discounts,sub_total,total_tax,total_due,total_payments,balance,Payments(*)),Unit(id,property_id,category_id,address_id,number,Address(address,address2,city,state,neighborhood,zip,country,lat,lng)),Tenants(id,contact_id,lease_id,sort,created_at,Contact(id,salutation,first,middle,last,suffix,email,company,dob,ssn,gender,driver_license,active_military,military_branch,email,source,Phones(id,type,phone,sms,primary))),CreatedBy(id,salutation,first,middle,last,suffix,email,company,dob,ssn,gender,driver_license,active_military,military_branch,email,source,status)',

	},
	'/:reservation_id': {
		get: 'id,expires,created,time,lease_id,move_in_date,Promotions(*),Charges(date,due,discounts,sub_total,total_tax,total_due,balance,Detail(product_id,name,qty,cost,date,start_date,end_date,Product(id,name,description,price,taxable,default_type))),Lease(unit_id,promotion_id,notes,terms,rent,status,security_deposit,monthly,code,balance,Unit(id,property_id,category_id,address_id,number,Address(address,address2,city,state,neighborhood,zip,country,lat,lng)),Tenants(id,contact_id,lease_id,sort,created_at,Contact(id,salutation,first,middle,last,suffix,email,company,dob,ssn,gender,driver_license,active_military,military_branch,email,source,Phones(id,type,phone,sms)))'

	} 
}