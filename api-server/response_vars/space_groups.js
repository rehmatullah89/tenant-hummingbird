module.exports = {
	'/:space_group_id/groups': {
		get: 'id,storage(groups(name,amenities(*),tiers(tier_id,description,min_sqft,max_sqft,width,length,units(count,min_price,max_price),vacant(count,min_price,max_price),amenities(*),promo(*),insurance(*),costs(security_deposit,monthly,start_date,end_date,bill_day,terms,rent,auto_pay_after_billing_date,sensitive_info_stored,Discounts(*),Promotions(name,description,value,type,months,offset,pretax,active),Charges(date,due,discounts,sub_total,total_tax,total_due,balance,Detail(product_id,name,qty,cost,date,start_date,end_date,total_cost,Product(id,name,description,price,taxable,default_type))),ReservationCharges(date,due,discounts,sub_total,total_tax,total_due,balance,Detail(product_id,name,qty,cost,date,start_date,end_date,Product(id,name,description,price,taxable,default_type))),ApplicationCharges(date,due,discounts,sub_total,total_tax,total_due,balance,Detail(product_id,name,qty,cost,date,start_date,end_date,Product(id,name,description,price,taxable,default_type)))))),num_spaces,num_groups),parking(groups(name,amenities(*),tiers(tier_id,description,min_sqft,max_sqft,width,length,units(count,min_price,max_price),vacant(count,min_price,max_price),amenities(*),promo(*),insurance(*),costs(security_deposit,monthly,start_date,end_date,bill_day,terms,rent,auto_pay_after_billing_date,sensitive_info_stored,Discounts(*),Promotions(name,description,value,type,months,offset,pretax,active),Charges(date,due,discounts,sub_total,total_tax,total_due,balance,Detail(product_id,name,qty,cost,date,start_date,end_date,total_cost,Product(id,name,description,price,taxable,default_type))),ReservationCharges(date,due,discounts,sub_total,total_tax,total_due,balance,Detail(product_id,name,qty,cost,date,start_date,end_date,Product(id,name,description,price,taxable,default_type))),ApplicationCharges(date,due,discounts,sub_total,total_tax,total_due,balance,Detail(product_id,name,qty,cost,date,start_date,end_date,Product(id,name,description,price,taxable,default_type)))))),num_spaces,num_groups)',
	},
}