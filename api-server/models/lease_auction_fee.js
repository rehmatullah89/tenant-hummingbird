var e  = require(__dirname + '/../modules/error_handler.js');

module.exports = {

    save: function(connection, data, auction_fee_id){
        var sql;
        if(auction_fee_id){
            sql = `UPDATE lease_auction_fees set ? where id = ${connection.escape(auction_fee_id)}`;
        } else {
            sql = "INSERT INTO lease_auction_fees set ?";
        }
        return connection.queryAsync(sql, data);
    },

    findById: function(connection, auction_fee_id){

        if (!auction_fee_id) e.th(400, "Auction Fee id required");

        var sql = `Select * from lease_auction_fees where id = ${connection.escape(auction_fee_id)}`;
        return connection.queryAsync(sql).then(rc => rc.length? rc[0]: null);
    }
};