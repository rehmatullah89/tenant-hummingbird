
const moment = require('moment');
const { conditionalAndWhere } = require('../helpers/sql');

class DocBatch {
    constructor(tableName) {
        this.tableName = tableName || 'document_batches';
    }

    async getMailingDocs(connection, filter) {

        let sql;
        const result = await connection.queryAsync(sql);

        return result
    }

    async getById(connection, filter) {

        let sql;
        const result = await connection.queryAsync(sql);

        return result
    }
}


module.exports = DocBatch;