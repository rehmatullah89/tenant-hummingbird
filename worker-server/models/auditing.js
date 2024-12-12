let Auditing = {  
    findAllDBTables(connection) {
        let sql = `SHOW FULL TABLES FROM ${connection.config.database} WHERE Table_Type = "BASE TABLE"`;
		console.log("findAllDBTables: ", sql);
        return connection.queryAsync(sql);
    },
	getTableColumns(connection, tableName) {
        let sql = `DESCRIBE ${tableName}`;
		console.log("getTableColumns: ", sql);
        return connection.queryAsync(sql);
    },
	addCreatedAtCol(connection, tableName){
		let sql = `ALTER TABLE ${tableName} ADD created_at DATETIME DEFAULT CURRENT_TIMESTAMP`;
		console.log("addCreatedAtCol: ", sql);
        connection.queryAsync(sql);
        return this.update(connection, tableName, {"created_at" : "2020-01-01 00:00:00"});
	},
	addModifiedAtCol(connection, tableName){
		let sql = `ALTER TABLE ${tableName} ADD modified_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP`;
		console.log("addModifiedAtCol: ", sql);
        connection.queryAsync(sql);

        return this.update(connection, tableName, {"modified_at" : "2020-01-01 00:00:00"});
	},
    update(connection, tableName, data){
		var sql = `UPDATE ${tableName} set ? where 1`;
        console.log("update: ", sql);
		return connection.queryAsync(sql, data);;

	},
  };
  module.exports = Auditing;
  