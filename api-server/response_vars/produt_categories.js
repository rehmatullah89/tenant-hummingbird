module.exports = {
  '/': {
    get: 'id,name,created,Products(id,vendor_id,name,description,price,type,sku,has_inventory,taxable,income_subtype_id,cogs_subtype_id,concession_subtype_id,liability_subtype_id,Vendor(id,name,phone,email))',
    post: []
  }

}
