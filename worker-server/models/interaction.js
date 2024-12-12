var moment      = require('moment');

module.exports = {

	async save (connection, data, interaction_id) {
		var sql;
		if(interaction_id){
			sql = "UPDATE interactions set ? where id = " + connection.escape(interaction_id);
		} else {
			sql = "insert into interactions set ?";
    }

		console.log("save qry", connection.format(sql, data));
		const result =  await connection.queryAsync(sql, data);
		return interaction_id ? interaction_id: result.insertId;
  },

    findByContactId: function(connection, contact_id, conditions = {}, searchParams, count) {
        var sql = '';
        if(count){
          sql = "SELECT count(*) as count ";
        } else {
          sql = "SELECT * ";
        }

        sql += "from interactions where contact_id = " +  connection.escape(contact_id);

        if(conditions.content){
          sql += " and content like "  + connection.escape("%" + conditions.content + "%");
        }

        if(conditions.method){
          sql += " and method = "  + connection.escape(conditions.method);
        }

        sql += " order by created DESC";

        if(searchParams){
          sql += " limit ";
          sql += searchParams.offset;
          sql += ", ";
          sql += searchParams.limit;
        }
        return connection.queryAsync(sql);
    },
    
    findAllbyInteractionId(connection, interaction_id) {
      let sql = `SELECT *,
        (select * from mail m where m.interaction_id = interactions.id),
        (select * from emails e where e.interaction_id = interactions.id)
        (select * from sms where sms.interaction_id = interactions.id)
        (select * from phone_calls pc where pc.interaction_id = interactions.id)
        (select * from notes n where n.interaction_id = interactions.id)
        FROM interactions where document_batches_deliveries = ${interaction_id};`
  
        return connection.queryAsync(sql);
    },

    async deleteUploadInteraction(connection, upload_id) {

      let sql = "DELETE from uploads_interactions WHERE upload_id = " + connection.escape(upload_id);

      console.log(sql);

      return connection.queryAsync(sql);
    },


    findById:function(connection, interaction_id){

		var sql = "Select * from interactions where id =  " + connection.escape(interaction_id);

		return connection.queryAsync(sql).then((result) => { return result ? result[0]: null });
  },
  
  saveBulkDeliveryBatches(connection, document_batches_deliveries_id, interaction_ids){
    if(!interaction_ids.length) return;
    var sql = `UPDATE interactions set document_batches_deliveries_id = ${connection.escape(document_batches_deliveries_id) } where id in (${interaction_ids.map(i => connection.escape(i))})`;
    return connection.queryAsync(sql)
  },

  async resolve(connection, interaction_id, note, resolved_by) {
    if (!interaction_id) return;
    let updateSql = `UPDATE interactions SET ? WHERE id = ${connection.escape(interaction_id)}`;
    await connection.queryAsync(
      updateSql,
      {resolved: 1, resolved_by: resolved_by, resolved_at: new Date()}
    );

    let insertSql = `INSERT INTO notes SET ?`;
    await connection.queryAsync(insertSql, {...note, interaction_id});
  }
};
