module.exports = {

    save(connection, data, id){
		var sql = "insert into gl_exports set ?";

		return connection.queryAsync(sql, data).then(r => id ? id : r.insertId)
	},

    bulkSave: function(connection, data) {
        const keys = Object.keys(data[0]);
        const values = data.map(d => keys.map(key => d[key]));

        let sql = `insert into gl_exports (${keys.join(',')}) values ?`;

		return connection.queryAsync(sql, [values]);
    },

    /* bulkSave: function(connection, data){
		 
        let sql = "insert into gl_exports (`property_id`,`company_id`,`amount`,`credit_debit_type`,`book_id`,`company_gl_account_id`, `gl_event_company_id`, `transaction_id`, `object_id`, `export_date`, `notes`) VALUES ?";
		return connection.queryAsync(sql, [data]);
    },*/

    async savePropertiesTrannum(connection, data) {
        const { property_id, transaction_id, book_id, prop_trannum_id } = data;
        let sql = `call sp_bulkSave(${property_id} , ${connection.escape(transaction_id)}, ${connection.escape(book_id)}, ${connection.escape(prop_trannum_id)})`;
        console.log('Properties Trannum ', sql);
        return await connection.queryAsync(sql);
    },

    /* savePropertiesTrannum(connection, data){
        let sql = `INSERT INTO properties_trannum (property_id, trannum, transaction_id, book_id) VALUES (${data.property_id}, 1, '${data.transaction_id}', '${data.book_id}') 
        ON DUPLICATE KEY UPDATE    
        trannum= trannum +1 , transaction_id= '${data.transaction_id}', book_id= '${data.book_id}';`
        return connection.queryAsync(sql);
    }, */

    getEvents(connection, params){
        let { event_id } = params;

        let sql = 'select * from gl_events where active = 1';
        if(event_id){
            sql += ` and id = ${connection.escape(event_id)}`;
        }

        return connection.queryAsync(sql)
    },
    validateIfExist(connection, payload) {
        const { company_id, object_id, gl_event_company_id, gl_event_id, object_id_column } = payload;
                
        let sql = `SELECT * FROM gl_exports where company_id = ${connection.escape(company_id)} and object_id = ${connection.escape(object_id)} and `
        
        if(gl_event_company_id) { 
            sql += `gl_event_company_id = ${connection.escape(gl_event_company_id)}`;
        } else {
            sql += `gl_event_company_id in (SELECT id FROM gl_event_company where gl_event_id = ${connection.escape(gl_event_id)})`
        }

        console.log('GL Exports SQL: ', sql);

        return connection.queryAsync(sql);
    },
    getPropertiesTrannum(connection, property_id) {
        let sql = `Select id from properties_trannum where property_id = ${connection.escape(property_id)}`;
        return connection.queryAsync(sql).then(r => r.length ? r[0] : null);;
    },
    // analyze table locking -- ON DUPLICATE KEY UPDATE
    async assignPropertyNewTrannum(connection, payload) {
        let {property_id, transaction_id, book_id, range = 1} = payload;
        property_id = connection.escape(property_id);
        transaction_id = connection.escape(transaction_id);
        book_id = connection.escape(book_id);
        range = connection.escape(range);

        let sql = `INSERT INTO properties_trannum (property_id, trannum, transaction_id, book_id) 
                    VALUES (${property_id}, ${range}, ${transaction_id}, ${book_id}) 
                    ON DUPLICATE KEY UPDATE    
                    trannum = trannum + ${range}, transaction_id = ${transaction_id}, book_id = ${book_id};`
        await connection.queryAsync(sql);

        sql = `select trannum from properties_trannum where property_id = ${property_id}`

        return connection.queryAsync(sql).then(r => r.length ? r[0].trannum : []);

    },
}