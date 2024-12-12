"use strict"

module.exports = {

    findAllCompanies(connection){
        const userSql = "SELECT * FROM companies WHERE active = 1";
        return connection.queryAsync(userSql); 
    },

    findById: function(connection, id){
        let sql = "SELECT * FROM companies WHERE id = " + connection.escape(id);
        return connection.queryAsync(sql).then(comRes => comRes.length? comRes[0] : null);
    },

    findByName: function(connection, name){
        let sql = "SELECT * FROM companies WHERE name = " + connection.escape(name);
        return connection.queryAsync(sql).then(comRes => comRes.length? comRes[0] : null);
    },

    findByToken: function(connection, token){
        console.log('token', token);

        let sql = "SELECT * FROM companies WHERE token = " + connection.escape(token);
        return connection.queryAsync(sql).then(comRes => comRes.length? comRes[0] : null);
    },



    save: function(connection, data, area_id){
        let sql = '';
        if(area_id){
            sql = "UPDATE companies set ? where id = " + connection.escape(area_id);
        } else {
            sql = "insert into companies set ?";
        }
        return connection.queryAsync(sql, data);
    },

    delete: function(connection, area_id){
        let sql = "Update companies set active = 0 where id = " + connection.escape(area_id);
        return connection.queryAsync(sql);
    },

}