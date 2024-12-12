const { readFile } = require('fs/promises')
const pool = require('../modules/db.js');

module.exports = {
        async createDatabase() {
            let data = await readFile("./docker/mysql/test.sql", "utf8");
            try{    
                
                let connection = await pool.getConnectionAsync();
                await connection.queryAsync(data);  
                await connection.release(); 
                
            } catch(err) {
                console.log("There was a connection error");
                console.log(err);    
            }
        }
}