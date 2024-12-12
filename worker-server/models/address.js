var moment      = require('moment');


module.exports = {
    findById: function(connection, id){
        var addressSql =  "Select * from addresses where id = "  + connection.escape(id);
        return connection.queryAsync( addressSql ).then(function(addressRes){
            return addressRes[0] || null
        });
    },

    
    findAddressByUnitId: function(connection, id){
        var addressSql =  "SELECT " +
        "IFNULL((SELECT address FROM addresses WHERE id = units.address_id), (SELECT address FROM addresses WHERE id = (SELECT address_id FROM properties WHERE id = units.property_id))) AS address, " +
        "IFNULL((SELECT city FROM addresses WHERE id = units.address_id), (SELECT city FROM addresses WHERE id = (SELECT address_id FROM properties WHERE id = units.property_id))) AS city, " +
        "IFNULL((SELECT state FROM addresses WHERE id = units.address_id), (SELECT state FROM addresses WHERE id = (SELECT address_id FROM properties WHERE id = units.property_id))) AS state, " +
        "IFNULL((SELECT neighborhood FROM addresses WHERE id = units.address_id), (SELECT neighborhood FROM addresses WHERE id = (SELECT address_id FROM properties WHERE id = units.property_id))) AS neighborhood, " +
        "IFNULL((SELECT zip FROM addresses WHERE id = units.address_id), (SELECT zip FROM addresses WHERE id = (SELECT address_id FROM properties WHERE id = units.property_id))) AS zip, " +
        "IFNULL((SELECT lat FROM addresses WHERE id = units.address_id), (SELECT lat FROM addresses WHERE id = (SELECT address_id FROM properties WHERE id = units.property_id))) AS lat, " +
        "IFNULL((SELECT lng FROM addresses WHERE id = units.address_id), (SELECT lng FROM addresses WHERE id = (SELECT address_id FROM properties WHERE id = units.property_id))) AS lng, " +
        "(SELECT unit_number FROM addresses WHERE id = units.address_id) AS unit_number "+
        "FROM units WHERE id = "  + connection.escape(id);

        return connection.queryAsync( addressSql ).then(function(addressRes){
            if(addressRes[0]){
                addressRes[0].id = addressRes[0].id;
            }
            return addressRes[0];
        })

    },
    save: function(connection, data, address_id){
        var sql;

        if(address_id){
            sql = "UPDATE addresses set ? where id = " + connection.escape(address_id);
        } else {
            sql = "insert into addresses set ?";
        }
        return connection.queryAsync(sql, data);
    },
    findByAddress: function(connection, address){
        var _this = this;
        var sql = "Select * from addresses where address = " + connection.escape(address.address) + " and ("
        if (address.address2 == null){
            sql += " address2 is null "
        } else {
            sql += "address2 = " + connection.escape(address.address2)
        }
        sql += ") and " +
            " city = " + connection.escape(address.city) + " and " +
            " state = " + connection.escape(address.state) + " and " +
            " zip = " + connection.escape(address.zip) + " limit 1 ";
        return connection.queryAsync(sql).then(function(addressRes){
            if(!addressRes.length) return false;
            return addressRes[0];
        });
    },
    findOrSave: function(connection, address){

        if(!address.address || !address.city || !address.state || !address.zip) return null;

        var _this = this;
        var sql = "Select * from addresses where address = " + connection.escape(address.address) + " and " +
            " neighborhood = " + connection.escape(address.neighborhood) + " and " +
            " city = " + connection.escape(address.city) + " and " +
            " state = " + connection.escape(address.state) + " and " +
            " zip = " + connection.escape(address.zip) + " limit 1 ";


        return connection.queryAsync(sql).then(function(addressRes){
            if(addressRes.length){
                return addressRes[0].id;
            } else {
                return _this.save(connection, address).then(function(result){
                    return result.insertId;
                });
            }
        });
    },
    findByIdsInBulk(connection, ids){
        let sql = `Select * from addresses where id in (${ids.map(id => connection.escape(id)).join()})`;
        return connection.queryAsync(sql);
    }
};