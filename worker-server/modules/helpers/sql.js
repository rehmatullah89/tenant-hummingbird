const moment = require('moment');

exports.conditionalAnd = (check, sql, sub) => {
    if (typeof sql !== 'string' || typeof sub !== 'string') {
        throw new TypeError('invalid sql statement type: expected string')
    }

    if (check) {
        return sql + ` AND ${sub}`;
    }

    return sql;
}

exports.toMysqlDate = (date) => {
    return moment(date).format('YYYY-MM-DD HH:mm:ss')
}

/**
 * Escape mysql query values in an object
 * 
 *  
    1. Booleans are converted to true / false
    2. Date objects are converted to 'YYYY-mm-dd HH:ii:ss' strings
    3. Buffers are converted to hex strings, e.g. X'0fa5'
    4. Strings are safely escaped
    5. Arrays are turned into list, e.g. ['a', 'b'] turns into 'a', 'b'
    6. Nested arrays are turned into grouped lists (for bulk inserts), 
        e.g. [['a', 'b'], ['c', 'd']] turns into ('a', 'b'), ('c', 'd')
    7. Numbers are left untouched
    8. Objects that have a toSqlString method will have .toSqlString() called 
        and the returned value is used as the raw SQL.
    9. Objects are turned into key = 'val' pairs for each enumerable property on the object. 
        If the property's value is a function, it is skipped; 
        if the property's value is an object, toString() is called on it and the returned value is used.
    10. undefined / null are converted to NULL
    11. NaN / Infinity are left as-is. MySQL does not support these, 
        trying to insert them as values will trigger MySQL errors until they implement support
 * @param {mysql_connection} connection 
 * @param {*} obj 
 */
exports.escape = (connection, obj) => {
    for (let [key, value] of Object.entries(obj)) {
        obj[key] = connection.escape(value);
    }
}