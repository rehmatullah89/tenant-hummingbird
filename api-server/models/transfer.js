let Transfer = {  
    save(connection, data, transfer_id) {
      let sql;
      
      if(transfer_id){
          sql = "UPDATE transfers set ? where id = " + connection.escape(transfer_id);
      } else {
          sql = "INSERT INTO transfers set ?";
      }

      return connection.queryAsync(sql, data);
    },
  
    findById(connection, transfer_id) {
      let sql = `SELECT * from transfers where id = ${connection.escape(transfer_id)}`;

      return connection.queryAsync(sql);
    },

    findByToLeaseId(connection, to_lease_id){
      let sql = `SELECT * from transfers where to_lease_id = ${connection.escape(to_lease_id)}`;
      
      return connection.queryAsync(sql).then(t => t.length? t[0]: null)
    },
     
    getTransferredUnitInfo(connection, to_lease_id){
      let sql = `SELECT 
                  l.unit_id 
                FROM 
                  transfers t 
                  JOIN leases l on t.from_lease_id = l.id 
                WHERE 
                  t.to_lease_id = ${connection.escape(to_lease_id)} 
                ORDER BY
                  t.id DESC limit 1;`;
      
      return connection.queryAsync(sql).then(t => t.length? t[0]: null)
    }
  };
  
  module.exports = Transfer;
  