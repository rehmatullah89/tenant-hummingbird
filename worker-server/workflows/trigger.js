var TriggerRoutines = require(__dirname + '/../routines/triggers.js');

var TriggerWorkFlows = {
    async run_trigger_routine(job, wm) {
        console.log("run_trigger_routine in workflow data: ", job.data);

        job = wm.initJob(job, "Delinquency");

        // const { previous, workflow, ...d} = job.data;
        let data = job.data
        try {
            await TriggerRoutines.runTriggerRoutine(data);
            await wm.continueWorkflow(job, data);
        } catch (err) { 
            job.data.msg = err.toString();
            console.log("run_trigger_routine in workflow error ", job.data);
            await wm.continueWorkflow(job, job.data);
            // await wm.error(job);
        }
    }, 
    async end_delinquency_routine(job, wm) {
        console.log("end_delinquency_routine in workflow data: ", job.data);
        job = wm.initJob(job, "EndDelinquency");
        try {
            await TriggerRoutines.runEndDelinquencyRoutine(job.data);
            await wm.continueWorkflow(job, job.data);
        } catch (err) {
            job.data.msg = err.toString();
            console.log("end_delinquency_routine in workflow error ", job.data);
            await wm.continueWorkflow(job, job.data);
        } 
    },
}
 
module.exports = {
    run_trigger_routine: async (job, wm) => {
        return await TriggerWorkFlows.run_trigger_routine(job, wm);
    },
    end_delinquency_routine: async (job, wm) => {
        return await TriggerWorkFlows.end_delinquency_routine(job, wm);
    }
};