
module.exports = {

	'/:tenant_id':{
		get: 'id,contact_id,lease_id,sort,type,created_at,Contact(salutation,first,middle,last,suffix,email,company,dob,ssn,gender,driver_license,active_military,military_branch,email,source,Phones(id,type,phone,sms),Addresses(id,type,address,city,state,neighborhood,zip,country,lat,lng),Relationships(*)'
	}
	
}