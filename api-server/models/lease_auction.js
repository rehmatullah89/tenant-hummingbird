var moment = require('moment');
var Promise = require('bluebird');
const { findByLeaseId } = require('./contact');
var e  = require(__dirname + '/../modules/error_handler.js');


module.exports = {

    save: function(connection, data, auction_id){
        
        var sql;
        if(auction_id){
            sql = "UPDATE lease_auctions set ? where id = " + connection.escape(auction_id);
        } else {
            sql = "INSERT INTO lease_auctions set ?";
        }
        console.log("Lease auction save/update", sql);
        return connection.queryAsync(sql, data);
    },

    findById: function(connection, auction_id){

        if (!auction_id) e.th(400, "Auction id required");

        var sql = "Select * from lease_auctions where id = " + connection.escape(auction_id)  + " and deleted_at is null";
        return connection.queryAsync(sql).then(rc => rc.length? rc[0]: null);
    },

    findByLeaseId: function(connection, lease_id){

        if (!lease_id) e.th(400, "Lease id required");

        var sql = "Select * from lease_auctions where lease_id = " + connection.escape(lease_id) + " and deleted_at is null";
        return connection.queryAsync(sql).then(rc => rc.length? rc[0]: null);
    },

    findByPaymentId: function(connection, payment_id){

        if (!payment_id) e.th(400, "payment id required");

        var sql = "Select * from lease_auctions where payment_id = " + connection.escape(payment_id) + " and deleted_at is null";
        return connection.queryAsync(sql).then(rc => rc.length? rc[0]: null);
    },

    findLeaseAuctionFees: function(connection, lease_auction_id){
        var sql = `SELECT 
                        laf.*,
                        p.slug
                    FROM lease_auction_fees laf 
                    INNER JOIN products p on laf.product_id = p.id
                    WHERE lease_auction_id = ${connection.escape(lease_auction_id)}`;
        return connection.queryAsync(sql);
    },

    async updateLeaseAuctionContactId(connection, payload) {

        let sql = `
            UPDATE lease_auctions 
            SET contact_id = ${connection.escape(payload.new_contact_id)}
            WHERE contact_id = ${connection.escape(payload.contact_id)}
                AND lease_id = ${connection.escape(payload.lease_id)}
        ;`
        console.log('updateLeaseAuctionContactId SQL:',sql);
        return await connection.queryAsync(sql);
    }

};