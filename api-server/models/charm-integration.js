module.exports = {
    findPhoneCallDetailsByStatus: function(connection, status, params) {
        console.log('Params', params)
        let sql = `SELECT * FROM phone_calls pc INNER JOIN interactions i on pc.interaction_id = i.id WHERE pc.status IN (?) AND i.read = 0`;
        if (params.direction) {
            sql += ' AND pc.direction = '+ connection.escape(params.direction);
        }
        if (params.missed) {
            sql += ' AND pc.recording_url is null OR pc.recording_url = "" ';
        }
        if (params && params.limit) {
            params.offset = params.offset || 0;
            sql += ` LIMIT ${params.offset} , ${params.limit}`;
        }
        console.log('Sql', sql)
        return connection.queryAsync(sql, [status]).then(result => {
            return result;
        });
    },

    findPhoneCallWithVoiceMails: function(connection, status, params) {
        let sql = `SELECT * FROM phone_calls pc INNER JOIN interactions i on pc.interaction_id = i.id WHERE pc.status IN (?) AND i.read = 0 AND pc.recording_url is not null AND pc.recording_url <> ""`;
        if (params && params.limit) {
            params.offset = params.offset || 0;
            sql += ` LIMIT ${params.offset} , ${params.limit}`;
        }
        return connection.queryAsync(sql, [status]).then(result => {
            return result;
        });
    },

    findPhoneCallDetailsById: function(connection, id) {
        let sql = `SELECT * FROM phone_calls pc INNER JOIN interactions i on pc.interaction_id = i.id WHERE i.id = ` + connection.escape(id);
        return connection.queryAsync(sql).then(result => {
            if (result.length > 0) return result[0];
            return null;
        });
    },
};
