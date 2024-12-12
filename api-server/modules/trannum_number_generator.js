const db = require("./db_handler");
const models = require('../models');
const ENUMS = require('./enums');
var utils    = require('./utils.js');

module.exports = {

    async generate(cid, payload){
        let trannum;
        let connection;
        
        try {
            connection = await db.getConnectionByType('write', null, cid);
            await connection.beginTransactionAsync();
            trannum = await models.GL_Export.assignPropertyNewTrannum(connection, payload);
            await connection.commitAsync();
        } catch(err) {
            await connection?.rollbackAsync();
            console.log(err.stack);
            payload.cid = cid;
            utils.sendEventLogs({
                eventName: ENUMS.LOGGING.ACCOUNTING_TRANNUM,
                data: payload,
                error: err 
            });
            console.log("Trannum not generated", err)
        } finally {
            if(connection) await db.closeConnection(connection);
        }

        return trannum ? parseInt(trannum) : null;
    }

};