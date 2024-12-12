let Auctions = {  
    save(connection, data, auction_id) {
      let sql;
      
      if(auction_id){
        sql = "UPDATE auctions set ? where id = " + connection.escape(auction_id);
      } else {
        sql = "INSERT INTO auctions set ?";
      }

      return connection.queryAsync(sql, data);
    },
  
    findById(connection, auctions_id) {
        let sql = `SELECT * from auctions where id = ${connection.escape(auctions_id)}`;

        return connection.queryAsync(sql);
    },
    
    findAll(connection, company_id) {
        let sql = `SELECT * from auctions where company_id = ${connection.escape(company_id)}`;
  
        return connection.queryAsync(sql);
    }

  };
  
  module.exports = Auctions;
  