let e  = require(__dirname + '/./error_handler.js');

let sql_helper = {
    /**
     * Method for converting an object to SQL condition string with common operator and condition
     * @todo Add support for custom conditions and operators
     * @param {Object} params must be an object with { field: value } structure
     * @param {String} logicalOperator Logical operators
     * @param {String} comparisionOperator Condition by which each field must be compared 
     * @param {String} alias Table alias
     * @returns SQL query string
     */
    convertObjectToSqlCondition(params, comparisionOperator, logicalOperator, alias) {
        if (!params || !logicalOperator || !comparisionOperator) e.th(
            400, 'Invalid parameters. params, logicalOperator and comparisionOperator is required'
        )
        let fields = Object.keys(params)
        let conditionQuery = fields.map((field) => {
                let columnAlias = alias ? alias + '.' : '';
                let value = params[field] === null ? null : `"${params[field]}"`
                return ` ${ columnAlias }${ field } ${ comparisionOperator } ${ value } `
            })
        return conditionQuery.join(logicalOperator)
    }
};

module.exports = sql_helper;