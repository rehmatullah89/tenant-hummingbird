module.exports = {    
    getSavedReportsAddonsData: function(connection, collection_type, collection_id , company_id) {
        let sql = "";

            sql = `select * from saved_reports_addons where collection_id = ${connection.escape(collection_id)} and company_id = ${connection.escape(company_id)} and active = 1`
        
        return connection.queryAsync(sql);        
    },
    addDetailData: function (connection, data) {   

        let sql = `INSERT INTO saved_reports_addons(collection_id, report_id, company_id) values ?`
        return connection.queryAsync(sql, [data]);
      },
}