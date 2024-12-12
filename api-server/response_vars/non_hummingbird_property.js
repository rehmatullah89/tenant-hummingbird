module.exports = {
	'/': {
		get: 'id,company_id,address_id,gds_id,name,number,description,phone,email,status,is_day_closed,map_published_at,Address(*),Phones(*),Emails(*)',
	},
	'/:property_id':{
		get: 'id,company_id,address_id,gds_id,name,number,description,email,status,Address(*),Phones(id,property_id,type,phone,sort),Emails(id,property_id,type,email,sort)'
	},

}