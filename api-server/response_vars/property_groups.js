module.exports = {
  '/': {
    get: 'id,name,global,created,Properties(id,company_id,address_id,name,number,description,phone,email,status,unit_count,lease_count,Address(*))',
    post: []
  }

}
