const moment = require('moment');
const _ = require('lodash');
const { escape } = require('../helpers/sql');
const QueryBuilder = require('../helpers/queryBuilder');

class Status {

    async find(connection, filter) {

        escape(connection, filter);
        const qb = new QueryBuilder('status');

        qb.select().where(filter);
        const result = await connection.queryAsync(qb.toSQL());

        return result
    }

    //TODO
    update(connection, data) {

    }

    async add(connection, data) {
        escape(connection, data)
        let sql = 'insert into lead_touchpoints set ? ';
        let { insertId } = await connection.queryAsync(sql, data);
        return insertId;
    }

    async findById(connection, status_id) {
        escape(connection, status_id);
        const qb = new QueryBuilder('status');
        qb.select().where({ id: status_id });
        let result = await connection.queryAsync(qb.toSQL());
        return result;
    }
}

module.exports = Status;