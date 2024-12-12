
module.exports = {
	'/':{
		get: 'id,contact_id,lease_id,sort,type,created_at,Lease(id,unit_id,start_date,end_date,bill_day,terms,rent,status,send_invoice,security_deposit,moved_out),Contact(id,salutation,first,middle,last,suffix,email,company,dob,ssn,gender,driver_license,active_military,military_branch,email,source,Phones(id,type,phone,sms),Addresses(id,type, unit_number,Address(*)),Business,Relationships(id,contact_id,lease_id,related_contact_id,type,is_cosigner,is_emergency,is_alternate,is_military,is_authorized,is_lien_holder,created_at,Contact(id,salutation,first,middle,last,suffix,email,company,dob,ssn,gender,driver_license,active_military,military_branch,email,source,Phones(id,type,phone,sms),Addresses(id,type,unit_number,Address(*))))),Reservation(id,lease_id,expires,created,time)'
	},

	'/:tenant_id':{
		get: 'id,contact_id,lease_id,sort,type,created_at,Lease(id,unit_id,start_date,end_date,bill_day,terms,rent,status,send_invoice,security_deposit,moved_out,transferred_from),Contact(id,salutation,first,middle,last,suffix,email,company,dob,ssn,gender,driver_license,active_military,military_branch,email,source,Phones(id,type,phone,sms),Addresses(id,type, unit_number,Address(*)),Relationships(id,contact_id,lease_id,related_contact_id,type,is_cosigner,is_emergency,is_alternate,is_military,is_authorized,is_lien_holder,created_at,Contact(id,salutation,first,middle,last,suffix,email,company,dob,ssn,gender,driver_license,active_military,military_branch,email,source,Phones(id,type,phone,sms),Addresses(id,type,unit_number,Address(*))))),Reservation(id,lease_id,expires,created,time)'
	}
	
}