const db = require("./db_handler");
const models = require('../models');
var utils    = require('./utils.js');
const ENUMS = require('./enums');

module.exports = {

    async generate(cid, payload){
        let trannum;
        let connection;
        
        try {
            connection = await db.getConnectionByType('write', cid, null);
            await connection.beginTransactionAsync();
            trannum = await models.GL_Export.assignPropertyNewTrannum(connection, payload);
            await connection.commitAsync();
        } catch(err) {
            await connection?.rollbackAsync();
            console.log(err.stack)
            payload.cid = cid;
            utils.sendLogs({
                event_name: ENUMS.LOGGING.ACCOUNTING_TRANNUM,
                logs: {
                    payload,
                    error: err?.stack || err?.msg || err
                }
            });
            console.log("Trannum not generated", err)
        } finally {
            if (connection) await db.closeConnection(connection);
        }

        return trannum ? parseInt(trannum) : null;
    }

};