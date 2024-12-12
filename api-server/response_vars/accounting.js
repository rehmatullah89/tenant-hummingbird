
module.exports = {
	'/accounts': {
		get:  'id,name,code,category_id,account_type_id,account_subtype_id,is_group,category,account_type,account_subtype,reference_exist'
	},
	'/account': {
		post: 'id,name,code,category_id,account_type_id,account_subtype_id',
		put: 'id,name,code,category_id,account_type_id,account_subtype_id'
	},
	'/categories': {
		get:  'id,name'
	},
	'/account-types': {
		get:  'id,name,gl_category_id'
	},
	'/account-subtypes': {
		get:  'id,name,gl_account_type_id'
	},
	'/accounting-type': {
		get:  'id,description,book_id,company_id,active'
	},
	'/events': {
		get:  'id,gl_event_id,book_id,event_name,credit_account_id,credit_account_code,credit_account_name,debit_account_id,debit_account_code,debit_account_name,Overrides(id,product_type,product_id,credit_debit_type,actual_gl_account_id,override_gl_account_id)'
	},
	'/exports':{
		post: 'company_name,property_name,property_number,yardi_type,trannum,date,post_month,ref,remark,amount,debit_amount,credit_amount,gl_account,book_type,gl_account_name,journal_event'
	}

}