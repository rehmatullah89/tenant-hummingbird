var settings    = require(__dirname + '/../config/settings.js');
var moment = require('moment');

module.exports = {
    findKeys:function(connection, company_id){

        var adminSql = "Select * from api_keys where company_id = " +  connection.escape(company_id) + ' and status = 1 ';

        return connection.queryAsync(adminSql);
    },

    findKeyById:function(connection, apikey_id){

        var adminSql = "Select * from api_keys where id = " +  connection.escape(apikey_id) + ' and status = 1';
        return connection.queryAsync(adminSql).then(key => key.length? key[0]: null);
    },

    createKey: function(connection, data, id){

        var sql;
        if(id){
            sql = "UPDATE api_keys set ? where id = " + connection.escape(id);
        } else {
            sql = "insert into api_keys set ? ";
        }
        return connection.queryAsync(sql, data);

    },
    deleteKey: function(connection, id){
        var sql = "UPDATE api_keys set status = 0  where id = " + connection.escape(id);
        return connection.queryAsync(sql);
    }


};