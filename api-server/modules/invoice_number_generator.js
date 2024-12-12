const db = require("./db_handler");
const models = require('../models');

module.exports = {

    async generate(cid, company_id){
        let inv_number;
        let connection = await db.getConnectionByType('write', null, cid);

        try {
            await connection.beginTransactionAsync();
            inv_number = await models.Billing.assignCompanyNewInvoiceNumber(connection, company_id);
            await connection.commitAsync();
        } catch(err) {
            await connection.rollbackAsync();
            console.log(err.stack)
            throw err;
        } finally {
            await db.closeConnection(connection);
        }

        return inv_number ? parseInt(inv_number) : 99;
    }

};