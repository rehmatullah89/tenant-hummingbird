var Promise = require('bluebird');

module.exports = {

    findAllMailhouse(connection) {
        let sql = "select * from mailhouses";

        return connection.queryAsync(sql);
    },
    findRpostDeliveryMethods(connection, mailhouse, types = []) {
         let sql = `select * from mailhouses m
            join delivery_methods dm on m.id = dm.mailhouse_id
            where m.name = ${connection.escape(mailhouse)}`;

        if (types.length) sql += ` and dm.delivery_type in (${types.map(p => connection.escape(p)).join(', ')})`
        
        console.log("SQL", sql)
        return connection.queryAsync(sql);
    },
    findSimpleCertifiedDeliveryMethods(connection, mailhouse,types = []) {
        let sql = `select * from mailhouses m
           join delivery_methods dm on m.id = dm.mailhouse_id
           where m.name = ${connection.escape(mailhouse)}`;

       if (types.length) sql += ` and dm.delivery_type in (${types.map(p => connection.escape(p)).join(', ')})`
       
       console.log("SQL", sql)
       return connection.queryAsync(sql);
   },
   findHummingbirdDeliveryMethods(connection, mailhouse,types = []) {
    let sql = `select * from mailhouses m
       join delivery_methods dm on m.id = dm.mailhouse_id
       where m.name = ${connection.escape(mailhouse)}`;

   if (types.length) sql += ` and dm.delivery_type in (${types.map(p => connection.escape(p)).join(', ')})`
   
   console.log("SQL", sql)
   return connection.queryAsync(sql);
},

}