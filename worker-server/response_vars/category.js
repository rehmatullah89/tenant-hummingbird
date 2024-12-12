


module.exports = {
	'/':{
		post: 'id,company_id,name,description,price',
		get: 'id,company_id,name,description,price,Units(min_price,max_price,unit_count),Vacant(min_price,max_price,unit_count)'
	},
	'/:category_id':{
		put: 'id,company_id,name,description,price',
		get: 'id,company_id,name,description,price,Units(min_price,max_price,unit_count),Vacant(min_price,max_price,unit_count)'
	},

}