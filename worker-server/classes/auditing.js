var models  = require(__dirname + '/../models');

class Auditing {

    constructor() {
        
    }

    async runCreatedAtAndModifiedAt ({connection, table_limit = -1, run_on_tables = []}) {
        try {
            let results = [];
            // getting all tables of db
            const tables = await models.Auditing.findAllDBTables(connection);
            for(let t=0; t<tables.length; t++){
                // setting table name
                let tableName = tables[t][`Tables_in_${connection.config.database}`];

                if ((run_on_tables.length && run_on_tables.indexOf(tableName) > -1) || (!run_on_tables.length)) {
                    console.log("table: ", tableName);

                    results[t] = {
                        table: tableName, 
                        cols: [],
                    };

                    // getting all columns of table
                    const colsData = await models.Auditing.getTableColumns(connection, tableName);
                    // setting only columns name in array, because above qeury return more data from DESCRIBE query of mysql
                    var cols = colsData.map(function (el) { return el.Field; });

                    console.log("cols: ", cols);
                    // checking created_at exists or not
                    if (cols.indexOf('created_at') == -1) {
                        console.log("c-col: ");
                        await models.Auditing.addCreatedAtCol(connection, tableName);
                        results[t].cols.push("created_at");
                    }

                    // checking modified_at exists or not
                    if (cols.indexOf('modified_at') == -1) {
                        console.log("m-col: ");
                        await models.Auditing.addModifiedAtCol(connection, tableName);
                        results[t].cols.push("modified_at");
                    }

                    if (table_limit > -1 && table_limit == results.length) {
                        break;
                    }
                }
            }
            results = results.filter(() => true);
            return results;
        } catch (err) {
            throw new Error (err);
        }
    }

    async runMissingAuditingScript ({connection, table_limit = -1, run_on_tables = []}) {

        try {
            let results = [];
            // results[connection.config.host][connection.config.database].data = [];
            // getting all tables of db
            const tables = await models.Auditing.findAllDBTables(connection);
            for(let t=0; t<tables.length; t++){
                // setting table name
                let tableName = tables[t][`Tables_in_${connection.config.database}`];

                if ((run_on_tables.length && run_on_tables.indexOf(tableName) > -1) || (!run_on_tables.length)) {
                    console.log("table: ", tableName);

                    // setting up results array
                    results[t] = {
                        table: tableName,
                        missing_cols: []
                    };

                    // getting all columns of table
                    const colsData = await models.Auditing.getTableColumns(connection, tableName);
                    // setting only columns name in array, because above qeury return more data from DESCRIBE query of mysql
                    var cols = colsData.map(function (el) { return el.Field; });

                    console.log("cols: ", cols);

                    if (cols.indexOf('created_by') == -1) results[t].missing_cols.push("created_by");
                    if (cols.indexOf('created_at') == -1) results[t].missing_cols.push("created_at");

                    if (cols.indexOf('modified_by') == -1) results[t].missing_cols.push("modified_by");
                    if (cols.indexOf('modified_at') == -1) results[t].missing_cols.push("modified_at");

                    if (cols.indexOf('deleted_by') == -1) results[t].missing_cols.push("deleted_by");
                    if (cols.indexOf('deleted_at') == -1) results[t].missing_cols.push("deleted_at");

                    if (table_limit > -1 && table_limit == results.length) {
                        break;
                    }
                }
            }
            results = results.filter(() => true);
            return results;
        } catch (err) {
            throw new Error (err);
        }
    }

    canRunScriptOnServer({connection, userProvidedDbs}){
        try {
            if (!Object.keys(userProvidedDbs).length) {
                return true;
            } else {
                if (connection.config.host in userProvidedDbs && userProvidedDbs[connection.config.host].length && userProvidedDbs[connection.config.host].indexOf(connection.config.database) > -1) {
                    return true;
                } else if (connection.config.host in userProvidedDbs && !userProvidedDbs[connection.config.host].length){
                    return true;
                } else {
                    return false;
                }
            }
        } catch (err) {
            throw new Error (err);
        }
    }
}

module.exports = Auditing;