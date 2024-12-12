var moment      = require('moment');

module.exports = {

  findById: function (connection, touchpoint_id) {
    let sql = "SELECT * FROM lead_touchpoints where id =  " + connection.escape(touchpoint_id);
    return connection.queryAsync(sql).then(a => a.length ? a[0] : null );
  },

  findByContactId: function (connection, contact_id) {
    let sql = "SELECT * FROM lead_touchpoints where contact_id =  " + connection.escape(contact_id) + ' order by created desc';
    return connection.queryAsync(sql);
  },

  findByCompanyId: function (connection, company_id) {
    let sql = "SELECT * FROM lead_touchpoints where contact_id in (select id from contcts where company_id =  " + connection.escape(company_id) + ") order by created desc";
    return connection.queryAsync(sql);
  },

  save(connection, data, touchpoint_id){
    let sql = '';
    if(touchpoint_id){
      sql = "update lead_touchpoints set ?  where id = " + connection.escape(touchpoint_id);
    } else {
      sql = "insert into lead_touchpoints set ? ";
    }

    return connection.queryAsync(sql, data).then(r => touchpoint_id ? touchpoint_id : r.insertId);
  }

};
