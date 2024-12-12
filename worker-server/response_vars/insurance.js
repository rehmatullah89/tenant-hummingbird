
module.exports = {
	'/': {
		get:  'id,vendor_id,name,description,coverage,premium_value,premium_type,deductible,prorate,taxable,Vendor(id,name,phone,email))'
	},
	'/search': {
		get:  'id,product_id,vendor_id,name,description,coverage,premium_value,premium_type,deductible,prorate,taxable,Vendor(id,name,phone,email))'
	}
}