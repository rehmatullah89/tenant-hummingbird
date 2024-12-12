
module.exports = {

	'/omni-search':{
		post: 'id,contact_id,salutation,first,middle,last,suffix,email,company,dob,ssn,gender,driver_license,active_military,military_branch,email,status,source,created,notes,content,Phones(id,type,phone,sms),Addresses(type,address,city,state,neighborhood,zip,country,lat,lng)',
	},
	'/:contact_id':{
		get: 'id,company_id,user_id,salutation,first,middle,last,suffix,email,gender,company,ssn,dob,driver_license,driver_license_state,driver_license_exp,active_military,military_branch,source,Employment(*),Vehicles(*),Relationships(id,related_contact_id,lease_id,type,is_cosigner,is_emergency,is_military,is_authorized,is_lien_holder,Contact(id,contact_id,salutation,first,middle,last,suffix,email,Phones(id,type,phone,sms),Addresses(type,number,Address(address,city,state,neighborhood,zip,country,lat,lng)))),Phones(id,type,phone,sms),Addresses(type,number,move_in,move_out,rent,landlord,phone,Address(address,city,state,neighborhood,zip,country,lat,lng)),Leases(id,unit_id,promotion_id,start_date,end_date,bill_day,notes,terms,rent,status,send_invoice,security_deposit,monthly,Unit(id,property_id,category_id,address_id,number,type,Address(*))'
	},
	'/:contact_id/access':{
		get: 'id,access_id,contact_id,property_id,pin,status,Property(id,company_id,address_id,description,status,name,access_id,Address(*)),Access(*))'
	}

}