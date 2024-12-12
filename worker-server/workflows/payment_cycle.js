var PaymentCycleRoutines = require(__dirname + '/../routines/payment_cycle_routines.js');

var PaymentCycleFlows = {
    async revert_payment_cycle(job, wm) {
        console.log("revert_payment_cycle in workflow data: ", job.data);
        

        try {
            let data = job.data
            await PaymentCycleRoutines.revertPaymentCycle(data, job);
            await wm.continueWorkflow(job, data);
        } catch (err) {
            job.data.msg = err.toString();
            console.log("revert_payment_cycle in workflow error ", job.data);
            await wm.continueWorkflow(job, job.data);
            // await wm.error(job);
        }
    }
}

module.exports = {
    revert_payment_cycle: async (job, wm) => {
        return await PaymentCycleFlows.revert_payment_cycle(job, wm);
    }
};