module.exports = {

  save(connection, data, id){
    let sql;

    if(id) sql =  `update rounding set ? where id = ${connection.escape(id)}`
    else sql = `insert into rounding set ?`;
    
    return connection.queryAsync(sql, data);
  },

  findByObjectId(connection, object_id) {
    let sql = `Select * from rounding where object_id = ${object_id} and status = 1`
    return connection.queryAsync(sql).then(r => r[0] );
  },

  deleteByObjectId(connection, object_id) {
    let sql = `update rounding set status = 0 where object_id = ${object_id} and status = 1`
    return connection.queryAsync(sql);
  }
}