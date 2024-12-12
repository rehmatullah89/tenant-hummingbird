
module.exports = {
	'/': {
		get:  'id,vendor_id,name,description,coverage,premium_value,premium_type,deductible,prorate,prorate_out,recurring,taxable,unit_type,income_account_id,Properties(id),Vendor(id,name,phone,email),gl_account_code,gl_account_name,gl_account_active'
	},
	'/search': {
		get:  'id,product_id,vendor_id,name,description,coverage,premium_value,premium_type,deductible,prorate,prorate_out,recurring,taxable,unit_type,Vendor(id,name,phone,email)'
	}
}