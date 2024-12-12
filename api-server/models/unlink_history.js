
const UnlinkHistory = {

  save: function(connection, data, id){
    var sql;
    if(id){
      sql = "UPDATE unlink_history set ? where id = " + connection.escape(id);
    } else {
      sql = "insert into unlink_history set ?";
    }

    console.log("UnlinkHistory save SQL: ", sql);
    return connection.queryAsync(sql, data);
  },

  updateUnlinkHistory: async function(connection, payload){

    const { primary_contact_id, secondary_contact_id } = payload;
    let sql;
    sql =  `UPDATE unlink_history set old_contact_id =  ${connection.escape(primary_contact_id)} where old_contact_id =  ${connection.escape(secondary_contact_id)}`;
    console.log("UnlinkHistory update old_contact_id SQL: ", sql);
    await connection.queryAsync(sql);

    sql =  `UPDATE unlink_history set new_contact_id =  ${connection.escape(primary_contact_id)} where new_contact_id =  ${connection.escape(secondary_contact_id)}`;
    console.log("UnlinkHistory update new_contact_id SQL: ", sql);
    return connection.queryAsync(sql);
  },
};

module.exports = UnlinkHistory;