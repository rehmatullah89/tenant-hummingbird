var AutoReconcileRoutines = require(__dirname + '/../routines/auto_reconcile.js');

const AutoReconcileWorkFlows = {
    async auto_reconcile_routine(job, wm) {
        console.log("auto_reconcile_routine_in_worflow : ", job.data);
        try {

            await AutoReconcileRoutines.autoReconcileAllContactsRoutine(job.data);
            await wm.continueWorkflow(job, job.data);
        } catch (err) {
            job.data.msg = err.toString();
            console.log("auto_reconcile_routine error in workflow: ", job.data);
            // await wm.error(job);
            await wm.continueWorkflow(job, job.data);
        }
    }
}

module.exports = {
    auto_reconcile_routine: async (job, wm) => {
        return await AutoReconcileWorkFlows.auto_reconcile_routine(job, wm);
    },
};