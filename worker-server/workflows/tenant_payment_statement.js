const { Workflow } = require(__dirname + '/../modules/workflow_manager.js');
const utils = require(__dirname + '/../modules/utils.js');
var TenantPaymentRoutines = require(__dirname + '/../routines/tenant_payment_routines.js');

var TenantPaymentWorkFlows = {
    async run_tenantPayment_flow(job, wm) {

        console.log("Tenant Payments Statement workFlow start : ", job.data);

        let wf = new Workflow('run_tenantPayment_flow', 'run_tenantPayment_flow_success', 'run_tenantPayment_flow_error');

        //wf.addDependency('auto_tenant_Payment_routine', job.data);
        try {
            await TenantPaymentRoutines.autoTenantPaymentRoutine(job.data);
            await wm.continueWorkflow(job, job.data);
        } catch (err) {
            job.data.msg = err.toString();
            console.log("auto_tenant_Payment_routine Child workflow data error " + job.data.msg);
            await wm.continueWorkflow(job, job.data);
        }

        await wm.addWorkflow(wf);
    },

    async run_tenantPayment_flow_success(job, wm) {
        console.log("Tenant Payments Statement Flow Success!");
    },

    async run_tenantPayment_flow_error(job) {
        utils.sendLogs({
            logs: "Tenant Payments Statement Parent WorkFlow Error"
        });
    }
}


module.exports = {
    run_tenantPayment_flow: async (job, wm) => {
        return await TenantPaymentWorkFlows.run_tenantPayment_flow(job, wm);
    },
   run_tenantPayment_flow_success: async (job, wm) => {
        return await TenantPaymentWorkFlows.run_tenantPayment_flow_success(job, wm);
    },
   run_tenantPayment_flow_error: async (job, wm) => {
        return await TenantPaymentWorkFlows.run_tenantPayment_flow_error(job, wm);
    }
};

