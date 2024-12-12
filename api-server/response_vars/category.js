


module.exports = {
	'/':{
		post: 'id,company_id,name,description,price,Attributes(*)',
		get: 'id,company_id,name,description,price,unit_type,Attributes(*),Units(min_price,max_price,unit_count),Vacant(min_price,max_price,unit_count)'
	},
	'/:category_id':{
		put: 'id,company_id,name,description,price,Attributes(*)',
		get: 'id,company_id,name,description,price,unit_type,Attributes(*),Units(min_price,max_price,unit_count),Vacant(min_price,max_price,unit_count)'
	},

}