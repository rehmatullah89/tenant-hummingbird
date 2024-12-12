var moment      = require('moment');
const Sql = require(__dirname + '/../modules/sql_snippets.js');

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
        var sql = "Select * from addresses where address = " + connection.escape(address.address) + " and ("
        if (address.address2 == null){
            sql += " address2 is null "
        } else {
            sql += "address2 = " + connection.escape(address.address2)
        }
        sql += ") and " +
            " city = " + connection.escape(address.city) + " and " +
            " state = " + connection.escape(address.state) + " and " +
            " zip = " + connection.escape(address.zip) + " and " +
            " region = " + connection.escape(address.region) + " and " +
            " district = " + connection.escape(address.district) + " limit 1 " ;
        console.log("ADDRESS findByAddress", connection.format(sql))    
        return connection.queryAsync(sql).then(function(addressRes){
            if(!addressRes.length) return false;
            return addressRes[0];
        });
    },
    async findOrSave (connection, address) {

        let sql = "Select * from addresses where address = " + connection.escape(address.address) + " and " +
            " address2 = " + connection.escape(address.address2) + " and " +
            " neighborhood = " + connection.escape(address.neighborhood) + " and " +
            " city = " + connection.escape(address.city) + " and " +
            " state = " + connection.escape(address.state) + " and " +
            " zip = " + connection.escape(address.zip) + " limit 1 ";


        let address_result = await connection.queryAsync(sql)
        if(address_result.length){
            return address_result[0].id;
        } else {
            let result = await this.save(connection, address);
            return result.insertId;
        }

    },
    // addCompanyAddress(connection,data){
    //     let sql = "insert into addresses set ?";
    //     return connection.queryAsync(sql, data).then(function(response){
    //         return response.insertId;
    //     });
    // },
    addAddress(connection,data,address_id){
        var sql;
        if(address_id){
            sql = "UPDATE addresses set ? where id = " + connection.escape(address_id);
        }
        else{
            sql = "insert into addresses set ?";
        }
        return connection.queryAsync(sql, data).then(function(response){
            return address_id || response.insertId;
        });
        
        
    },

    async duplicateAddress(connection, address_id) {
        let columns_to_copy_sql = Sql.getColumnNames('addresses');
        let columns_to_copy = await connection.queryAsync(columns_to_copy_sql);
        columns_to_copy = columns_to_copy.map(i => `\`${i.COLUMN_NAME}\``).join(', ');
        console.log("duplicateAddress columns_to_copy :", columns_to_copy);

        let sql = `
            INSERT INTO addresses (${columns_to_copy})
            SELECT ${columns_to_copy}
            FROM addresses
            WHERE id = ${connection.escape(address_id)}
        `
        console.log("duplicateAddress SQL:", sql);
        return connection.queryAsync(sql).then(r => r.insertId);
    },
};
