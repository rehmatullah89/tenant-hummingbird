
module.exports = {
	'/': {
		get: 'id,company_id,name,description,value,label,type,months,offset,pretax,sort,public,active,days_threshold,required_months,consecutive_pay,enable,active_period,start_date,end_date,rounding,created_at,Creator(*),created_at,Properties(id,name),PromotionRules(*)'
	},
	'/sold': {
		get: 'id,promotion_name,label,periods_applied,start_month,date,unit_id,unit_number,invoice_id,invoice_number,amount,lease_id,contact_id,name,discount_id,start_date,end_date,type,property_id'
	}

}
