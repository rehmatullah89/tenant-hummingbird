const { Workflow } = require(__dirname + '/../modules/workflow_manager.js');
var db = require(__dirname + '/../modules/db_handler.js');
var moment = require('moment');
var TenantPaymentsPayoutsRoutines = require(__dirname + '/../routines/tenant_payments_payouts_routines.js');

const TenantPaymentsPayouts = {
    async tenant_payments_payouts(job, wm) {
        console.log("tenant_payments_payouts in workflow data: ", job.data);
        let connection = null;
        let company_id = 0;
        let property_id = 0;
        try {
            company_id = job.data.company_id;
            property_id = job.data.property_id;
            let date = job.data.date;
            let send_email = job.data.send_email;
            connection = await db.getConnectionByType('write', job.data.cid);
            let data = {connection, company_id, property_id, date, send_email};
            let payoutDetails = await TenantPaymentsPayoutsRoutines.calculatePayout(data);
            let payoutInfo = await TenantPaymentsPayoutsRoutines.processPayout(data, payoutDetails);
            await TenantPaymentsPayoutsRoutines.updatePayoutInfo(data, payoutDetails, payoutInfo);
            console.log(property_id, " exit tenant_payments_payouts workflow");
            
            await wm.continueWorkflow(job, job.data);
        } catch (err) {
            job.data.msg = err.toString();
            console.log(property_id, "Error in tenant_payments_payouts : ", err);
            await TenantPaymentsPayoutsRoutines.sendPayoutErrorEmail(
                property_id, "Error caught in tenant_payments_payouts " + err);
            await wm.error(job);
        }
        finally {
            await db.closeConnection(connection);
        }
    }
}

module.exports = {
    tenant_payments_payouts: async (job, wm) => {
        return await TenantPaymentsPayouts.tenant_payments_payouts(job, wm);
    },
};

