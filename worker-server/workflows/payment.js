var PaymentRoutines = require(__dirname + '/../routines/payment_routines.js');

var PaymentWorkFlows = {
    async auto_payment_routine(job, wm) {
        console.log("auto_payment_routine in workflow data: ", job.data);
        const { previous, workflow, ...d} = job.data;
        let data = previous ? Object.assign(previous, d) : d;

        try {
            await PaymentRoutines.autoPayRoutine(data, job);
            await wm.continueWorkflow(job, data);
        } catch (err) {
            job.data.msg = err.toString();
            console.log("auto_payment_routine in workflow error ", job.data);
            await wm.continueWorkflow(job, job.data);
            // await wm.error(job);
        }
    }, 
    async adjust_reserve_balance(job, wm){
        console.log("adjust_reserve_balance in workflow data: ", job.data);

        try {
            await PaymentRoutines.adjustReserveBalance(job.data, job);
            await wm.continueWorkflow(job, job.data);
        } catch (err) {
            job.data.msg = err.toString();
            console.log("adjust_reserve_balance in workflow error ", job.data);
            await wm.continueWorkflow(job, job.data);
        }
    },
    async configure_contact_token(job, wm){
        console.log("configure_contact_token in workflow data: ", job.data);
        try {
            await PaymentRoutines.configureContactTokens(job.data);
            await wm.continueWorkflow(job, job.data);
        } catch (err) {
            job.data.msg = err.toString();
            console.log("configure_contact_token in workflow error ", job.data);
            await wm.continueWorkflow(job, job.data);
        }
    },
    async settle_payment_routine(job, wm){
        console.log("settle_payment_routine in workflow data: ", job.data);

        try {
            await PaymentRoutines.settlePayment(job.data);
            await wm.continueWorkflow(job, job.data);
        } catch (err) {
            job.data.msg = err.toString();
            console.log("settle_payment_routine in workflow error ", job.data);
            await wm.continueWorkflow(job, job.data);
        }
    },
}

module.exports = {
    auto_payment_routine: async (job, wm) => {
        return await PaymentWorkFlows.auto_payment_routine(job, wm);
    },
    balance_adjustment_routine: async (job, wm) => {
        return await PaymentWorkFlows.adjust_reserve_balance(job, wm);
    },  
    configure_contact_token_routine: async (job, wm) => {
        return await PaymentWorkFlows.configure_contact_token(job, wm);
    },
    settle_payment_routine: async (job, wm) => {
        return await PaymentWorkFlows.settle_payment_routine(job, wm);
    },
};