


module.exports = {
	'/monthly':{
		get: 'id,company_id,name,unit_count,Units(id,property_id,number,type,description,price,state,Address(id,address,address2,unit_number,city,state,neighborhood,zip,country,lat,lng),Category(id,company_id,name,description,price)),Address(id,address,address2,unit_number,city,state,neighborhood,zip,country,lat,lng),Bills(id,property_id,vendor_id,product_id,name,current_amount,billed_for,custom,pbill_id,amount,splittype),total_bills,total_entered'
	},
	'/:category_id':{
		put: 'id,company_id,name,description,price',
		get: 'id,company_id,name,description,price,Units(min_price,max_price,unit_count),Vacant(min_price,max_price,unit_count)'
	},

}