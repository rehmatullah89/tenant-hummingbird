
module.exports = {
  '/': {
    get: 'id,vendor_id,name,description,price,prorate,prorate_out,recurring,type,default_type,sku,has_inventory,amount_type,category_type,taxable,product_category_id,income_subtype_id,cogs_subtype_id,concession_subtype_id,liability_subtype_id,ProductCategory(*),Vendor(id,name,phone,email),Rules(id,price,type,rent_threshold),income_account_id,liability_account_id,gl_account_code,gl_account_name,gl_account_active',
    post: 'id,vendor_id,name,description,price,prorate,prorate_out,recurring,type,default_type,taxable,sku,has_inventory,amount_type,category_type,Vendor(id,name,phone,email)'
  },
  '/insurance': {
    get: 'id,vendor_id,name,description,price,taxable,sku,Vendor(id,name,phone,email)'
  },
  '/list':{
    get: 'id,vendor_id,name,description,price,type,taxable,sku,has_inventory,Vendor(id,name,phone,email),category_type'
  },
  '/rent':{
    get: 'id,name,description'
  },
  '/security':{
    get: 'id,name,description,has_inventory,price'
  },
  '/search':{
    post: 'id,vendor_id,name,description,price,type,taxable,sku,has_inventory,income_account_id,Vendor(id,name,phone,email)'
  },
  '/:product_id':{
    get: 'id,vendor_id,name,description,price,prorate,prorate_out,recurring,type,default_type,taxable,sku,has_inventory,amount_type,category_type,income_account_id,expense_account_id,concession_account_id,liability_account_id,Vendor(id,name,phone,email),Properties(id),Rules(*)'
  }
}
