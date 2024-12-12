


module.exports = {
	'/list': {
		get: 'id,company_id,name,address,city,state,zip,description',
		post: []
	},
	'/': {
		get: 'id,company_id,address_id,name,description,email,phone,email,status,unit_count,lease_count,Address(*),Phones(*),Emails(*),Images(*)',
		post: []
	},
	'/:property_id':{
		get: 'id,company_id,address_id,name,description,email,status,unit_count,lease_count,Address(*),Phones(id,property_id,type,phone,sort),Emails(id,property_id,type,email,sort)'
	},
	'/:property_id/units':{
		get: 'id,category_id,address_id,template_id,number,floor,type,description,price,set_rate,featured,lease_duration,lease_duration_type,available_date,state,terms,security_deposit,Address(*),length,width,height,unit type,door type,vehicle storage,Lease(id,start_date,end_date,status,Tenants(id,contact_id,lease_id,sort,type,created_at,Contact(salutation,first,middle,last,suffix,email,company,Phones(id,type,phone,sms))),Reservation(id)),Images(*),Floorplan(*),Category(*)'
	},
	'/:property_id/units/featured':{
		get: 'id,category_id,address_id,template_id,number,floor,type,description,price,set_rate,featured,lease_duration,lease_duration_type,available_date,state,terms,security_deposit,Address(*),length,width,height,unit type,door type,vehicle storage,Lease(id,start_date,end_date,status,Tenants(id,contact_id,lease_id,sort,type,created_at,Contact(salutation,first,middle,last,suffix,email,company,Phones(id,type,phone,sms))),Reservation(id)),Images(*),Floorplan(*),Category(*)'
	},
	'/:property_id/hours':{
		get: 'id,property_id,start_hr,start_min,start_ap,end_hr,end_min,end_ap,first_day,last_day,type,order'
	},
	'/:property_id/categories':{
		get: 'id,company_id,name,description,price,Units(min_price,max_price,unit_count),Vacant(min_price,max_price,unit_count)'
	},
	'/:property_id/images':{
		get: 'id,DocumentType(*),uploaded_by,type,upload_date,extension,encoding,mimetype,size,name,src'
	}
}