const db = require("./db_handler");
const models = require('../models');
var utils    = require('./utils.js');
const ENUMS = require('./enums');

module.exports = {

    async generate(cid, company_id){
        let inv_number;
        let connection;
        
        try {
            connection = await db.getConnectionByType('write', cid, null);
            await connection.beginTransactionAsync();
            inv_number = await models.Billing.assignCompanyNewInvoiceNumber(connection, company_id);
            await connection.commitAsync();
        } catch(err) {
            await connection?.rollbackAsync();
            console.log(err.stack)
            utils.sendLogs({
                event_name: ENUMS.LOGGING.INVOICE_NUMBER,
                logs: {
                    cid,
                    company_id,
                    error: err?.stack || err?.msg || err
                }
            });
        } finally {
            if(connection) await db.closeConnection(connection);
        }

        return inv_number ? parseInt(inv_number) : 99;
    }

};