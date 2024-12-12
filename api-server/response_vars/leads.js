
module.exports = {

	'/':{
		post: 'id,contact_id,salutation,first,middle,last,suffix,email,company,dob,ssn,gender,driver_license,active_military,military_branch,email,status,source,created,notes,content,Phones(id,type,phone,sms),Addresses(type,address,address2,city,state,neighborhood,zip,country,lat,lng),Property(id,name,number,description,phone,Address(id,address,address2,city,state,neighborhood,zip,country,lat,lng)),Unit(id,number,type,price,description,available_date),Category(id,name,description)',

		get: 'id,contact_id,lease_id,property_id,category_id,unit_id,note,content,extras,created,status,source,move_in_date,documents_pending,Contact(id,salutation,first,middle,last,suffix,email,company,dob,ssn,gender,driver_license,active_military,military_branch,Phones(id,type,phone,sms,primary),Addresses(id,primary,type,move_in,move_out,rent,landlord,phone,Address(address,address2,city,state,neighborhood,zip,country,lat,lng)))'

		
	},
	'/:lead_id':{
		get: 'id,contact_id,lease_id,property_id,category_id,unit_id,note,content,extras,created,status,source,Contact(id,salutation,first,middle,last,suffix,email,company,dob,ssn,gender,driver_license,active_military,military_branch,Phones(id,type,phone,sms),Addresses(id,type,address,address2,city,state,neighborhood,zip,country,lat,lng)),Property(id,name,number,description,phone,Address(address,address2,city,state,neighborhood,zip,country,lat,lng)),Unit(id,number,type,price,description,available_date),Category(id,name,description)'
	}

}