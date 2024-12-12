let db = {
    async getDatabaseSchemas(connection){
        let sql = `SHOW DATABASES WHERE \`Database\` NOT IN ('mysql', 'information_schema', 'performance_schema', 'sys')`;
        console.log("Schemas SQL --> ", sql);
        let schemas = await connection.queryAsync(sql);
        return schemas;
    }
};

module.exports = db;