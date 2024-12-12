var moment      = require('moment');

module.exports = {
    findById: function(connection, model, id ){
        var sql = "Select * from " + model + " where id = " + connection.escape(id);
        return connection.queryAsync(sql).then(function(resultSet){
            return resultSet.length ? resultSet[0] : null;
        });
    },
    find: function(connection, model, params ){
        var _this = this;
        var unitSql = "SELECT * FROM " + connection.escapeId(model);
        var searchParams = [];
        if(params.conditions){
            unitSql += " WHERE ? ";
            searchParams.push(params.conditions)
        }
        if(params.having){
            unitSql += " HAVING ? ";
            searchParams.push(params.having)
        }
        if(params.group){
            unitSql += " GROUP BY ? ";
            searchParams.push(params.group)
        }
        if(params.order){  // Should Be object
            unitSql += " ORDER BY ?? ";
            searchParams.push(params.order); // TODO fix direction
        }

        if(params.limit){
            unitSql += " LIMIT ? ";
            searchParams.push(params.limit)
        }
        var mysqlQuery = connection.format( unitSql, searchParams);
        return connection.queryAsync(mysqlQuery );
    },
    save: function(connection, data,address_id){

    }

};