var moment = require('moment');
const Sql = require(__dirname + '/../modules/sql_snippets.js');

module.exports = {

    // We are not using these functions in the application.

    /* revenueTD: async (connection, date,  credit_type = 'payment', payment_type = [], timeframe, properties) =>  {
        let sql = "SELECT SUM(amount) as total_paid from payments where status = 1 and property_id in (" + connection.escape(properties) + ") ";
    
        sql +=  " and credit_type = " + connection.escape(credit_type) + " and effective_date <= " + connection.escape( date);
    
        if(payment_type){
          payment_type.map(type => {
    
            if(type === 'other'){
              sql +=  " and method not in ( 'cash', 'check', 'ach', 'card' ) ";
            } else {
              sql +=  " and method = " + connection.escape(type.toLowerCase());
            }
    
          });
        }
    
        switch(timeframe) {
          case 'mtd':
            sql += " AND Month(`effective_date`) = Month(" + connection.escape(date) + ") and effective_date <= " + connection.escape(date)
            sql += " AND Year(`effective_date`) =  Year(" + connection.escape(date) + ") and effective_date <= " + connection.escape(date);
            break;
          case 'ytd':
            sql += " AND Year(`effective_date`) =  Year(" + connection.escape(date) + ") and effective_date <= " + connection.escape(date);
            break;
          case 'daily':
            sql += " AND `effective_date` = " + connection.escape(date);
            break;
        }
    
        return connection.queryAsync(sql).then(r => r.length ? r[0].total_paid : {});
    }, */

    /* reversalsTD: async (connection, date, payment_type = [], timeframe, properties) =>  {
        let sql = `SELECT SUM(r.amount) as total_revesals 
                  from refunds r
                  inner join payments p on r.payment_id = p.id
                  where r.type = 'refund' and p.status = 1 and p.property_id in ( ${connection.escape(properties)}) `;

        if(payment_type){
          payment_type.map(type => {
    
            if(type === 'other'){
              sql +=  " and p.method not in ( 'cash', 'check', 'ach', 'card' ) ";
            } else {
              sql +=  " and p.method = " + connection.escape(type.toLowerCase());
            }
    
          });
        }
    
        switch(timeframe) {
          case 'mtd':
            sql += " AND Month(r.effective_date) = Month(" + connection.escape(date) + ") and r.effective_date <= " + connection.escape(date)
            sql += " AND Year(r.effective_date) =  Year(" + connection.escape(date) + ") and r.effective_date <= " + connection.escape(date);
            break;
          case 'ytd':
            sql += " AND Year(r.effective_date) =  Year(" + connection.escape(date) + ") and r.effective_date <= " + connection.escape(date);
            break;
          case 'daily':
            sql += " AND DATE(r.effective_date) = " + connection.escape(date);
            break;
        }
    
        console.log("Reversal: ", sql);
    
        return connection.queryAsync(sql).then(r => r.length ? r[0].total_revesals : {});
    
    } */

};