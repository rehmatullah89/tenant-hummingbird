var TenantPaymentRoutines = require(__dirname + '/../routines/tenant_payment_routines.js');

var TenantPaymentWorkFlows = {
    async auto_tenant_Payment_routine(job, wm) {
        console.log("auto_tenant_Payment_routine Child workflow data Started");
        const { previous, workflow, ...d} = job.data;
        let data = previous ? Object.assign(previous, d) : d;

        try {
            await TenantPaymentRoutines.autoTenantPaymentRoutine(job.data);
            await wm.continueWorkflow(job, job.data);
        } catch (err) {
            job.data.msg = err.toString();
            console.log("auto_tenant_Payment_routine Child workflow data error " + job.data.msg);
            await wm.continueWorkflow(job, job.data);
        }
    }, 
    /*async tenant_payment_generate_csv(job, wm){
        console.log("tenant_payment_generate_csv in workflow data: ", job.data);

        try {
            await TenantPaymentRoutines.generateTenantPaymentCSV(job.data);
            await wm.continueWorkflow(job, job.data);
        } catch (err) {
            job.data.msg = err.toString();
            console.log("tenant_payment_generate_csv in workflow error ", job.data);
            await wm.continueWorkflow(job, job.data);
        }
    },*/
}

module.exports = {
    auto_tenant_Payment_routine: async (job, wm) => {
        return await TenantPaymentWorkFlows.auto_tenant_Payment_routine(job, wm);
    },
    tenant_payment_generate_csv: async (job, wm) => {
        return await TenantPaymentWorkFlows.tenant_payment_generate_csv(job, wm);
    },  
};