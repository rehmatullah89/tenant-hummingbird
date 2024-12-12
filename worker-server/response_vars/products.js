
module.exports = {
	'/': {
		get: 'id,vendor_id,name,description,price,taxable,Vendor(id,name,phone,email)',
		post: 'id,vendor_id,name,description,price,taxable,Vendor(id,name,phone,email)'
	},
	'/insurance': {
		get: 'id,vendor_id,name,description,price,taxable,Vendor(id,name,phone,email)'
	},
	'/list':{
		get: 'id,vendor_id,name,description,price,taxable,Vendor(id,name,phone,email)'
	},
	'/rent':{
		get: 'id,name,description'
	},
	'/security':{
		get: 'id,name,description,price'
	},
	'/search':{
		post: 'id,vendor_id,name,description,price,type,taxable,sku,has_inventory,income_account_id,Vendor(id,name,phone,email)'
	}
}