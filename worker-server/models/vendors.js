var settings    = require(__dirname + '/../config/settings.js');


module.exports = {

    getVendorByNameOrSave: function(connection, name,company_id){
        var vendorSql =  "Select id from vendors where lower(name) = " + connection.escape(name.toLowerCase());
        var vendor_id = false;

        return connection.queryAsync(vendorSql)
            .then(function(vendorRes) {
                if(vendorRes.length){
                    vendor_id = vendorRes[0].id;
                    return false;
                } else {
                    var vendor = {
                        name: name.toLowerCase(),
                        company_id: company_id
                    };
                    var vendorInsertSql = "Insert into vendors (name, company_id) VALUES (" + connection.escape(name.toLowerCase()) +", "+ company_id +" ) ";


                    return connection.queryAsync(vendorInsertSql, vendor);
                }
            }).then(function(vendorInsertRes){

                if(vendorInsertRes){
                    vendor_id = vendorInsertRes.insertId;
                }
                return vendor_id;
            }).catch(function(err){
                console.error(err);
                return false;
            });
    },
    findById(connection, vendor_id){
        var sql = "Select * from vendors where id = " + connection.escape(vendor_id);
        return connection.queryAsync( sql ).then(vendors => vendors.length? vendors[0]: null);
    },
    searchByCompanyId: function(connection, search, company_id){

        var vendorsSql = "Select * from vendors where company_id = " + company_id;

        if(search){
            vendorsSql += " and lower(name) like " + connection.escape('%'+ search.toLowerCase() + '%');
        }

        console.log(vendorsSql);

        return connection.queryAsync( vendorsSql ).then(function(vendorsRes){
            vendorsRes.forEach(function(v, i){
                vendorsRes[i].id = v.id;
            });

            return vendorsRes;
        });
    }
};