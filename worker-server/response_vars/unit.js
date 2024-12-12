


module.exports = {
	'/:unit_id': {
		get: 'id,property_id,number,floor,type,description,price,set_rate,featured,available_date,status,terms,security_deposit,length,width,height,unit type,door type,vehicle storage,state,Address(*),Lease(id,start_date,end_date,status,Tenants(id,first,last)),Images(*),Floorplan(*),Category(*),Amenities(*(id,name,value,category_type,category_name))',
		post: []
	},

	'/:unit_id/lease-set-up': {
		get: 'security_deposit,monthly,start_date,end_date,bill_day,terms,rent,Discounts(promotion_id,start,end,value,type,pretax),Charges(date,due,discounts,sub_total,total_tax,total_due,balance,Detail(product_id,name,qty,cost,date,start_date,end_date,Product(id,name,description,price,taxable,default_type))),ReservationCharges(date,due,discounts,sub_total,total_tax,total_due,balance,Detail(product_id,name,qty,cost,date,start_date,end_date,Product(id,name,description,price,taxable,default_type))),ApplicationCharges(date,due,discounts,sub_total,total_tax,total_due,balance,Detail(product_id,name,qty,cost,date,start_date,end_date,Product(id,name,description,price,taxable,default_type)))',
		post: []
	},

	'/:unit_id/lease': {
		post: 'id,promotion_id,security_deposit,monthly,start_date,end_date,bill_day,terms,rent,Discounts(promotion_id,start,end,value,type,pretax),Invoice(id,date,due,discounts,sub_total,total_tax,total_due,balance,InvoiceLines(id,product_id,qty,cost,date,start_date,end_date,Product(id,name,description,price,taxable,default_type),TaxLines(id,taxrate),DiscountLines(id,amount,pretax)))'
	},
	'/:unit_id/leases': {
		get: 'id,promotion_id,security_deposit,monthly,start_date,end_date,bill_day,terms,rent,Tenants(Contact(salutation,first,middle,last,suffix,email,Phones(*)))'
	},

	'/list': {
		get: 'id,property_id,number,floor,type,description,price,set_rate,available_date'
	},


}