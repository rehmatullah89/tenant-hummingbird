/**
 * This is a quazi query builder classs which has helper methods for
 * general sql query building
 */

const _ = require('lodash');

class QueryBuilder {
    constructor(table) {
        this.table = table;
    }

    raw(sql) {
        this._sql = sql;
    }

    /**
     * where can check for multiple equal comparison
     * //TODO add other comparators
     * @param {*} filter 
     * @returns 
     */
    where(filter) {

        if (!this._sql) {
            throw new Error('init sql not formed!');
        }

        let hasWhere = false;
        if (!_.isEmpty(filter)) {
            for (const [key, val] of Object.entries(filter)) {
                if (!hasWhere) {
                    this._sql += " WHERE ";
                    hasWhere = true;
                } else {
                    this._sql += " AND ";
                }

                this._sql += `${key} = ${val}`;
            }
        }
        return this;
    }

    select(fields = []) {

        if (!this.table) {
            throw new Error("Could not find table name!");
        }

        if (!Array.isArray(fields)) {
            throw new TypeError('fields should be an array!');
        }
        this._sql = _.isEmpty(fields) ? `SELECT *` : `SELECT `;
        this._sql += `${fields.join(', ')}`

        this._sql += ` FROM ${this.table}`;

        return this;
    }

    toSQL() {
        return this._sql;
    }
}

module.exports = QueryBuilder;
