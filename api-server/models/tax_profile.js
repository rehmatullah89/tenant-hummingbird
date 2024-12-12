let TaxProfile = {  
  save(connection, data, tax_profile_id){
    let sql;
    
    if(tax_profile_id){
        sql = "UPDATE tax_profile set ? where id = " + connection.escape(tax_profile_id);
    } else {
        sql = "INSERT INTO tax_profile set ?";
    }
    return connection.queryAsync(sql, data);

  },

  findById(connection, tax_profile_id){

    if (!tax_profile_id) e.th(400, "Tax profile ID is required");

    let sql = `SELECT * from tax_profile where id = ${connection.escape(tax_profile_id)}`;
    return connection.queryAsync(sql).then(tp => tp.length ? tp[0] : null);

  },  
  
  findAllByCompany(connection, company_id, searchParams){
    let sql = `SELECT tp.*, gla.code as gl_account_code, gla.name as gl_account_name, gla.active as gl_account_active from tax_profile tp left join gl_accounts gla on tp.account_id = gla.id where tp.deleted_at is null and tp.company_id = ${company_id}`

    if(searchParams) {
      if(searchParams.name) {
        sql += ` and tp.name = ${connection.escape(searchParams.name)}`
      }
      
      if(searchParams.state) {
        sql += ` and tp.state = ${connection.escape(searchParams.state)}`
      }

      if (searchParams.limit && searchParams.offset) {
        sql += ` limit ${searchParams.offset}, ${searchParams.limit}`;
      }
    }
    
    return connection.queryAsync(sql);
  }
};

module.exports = TaxProfile;
