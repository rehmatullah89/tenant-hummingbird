var CloseOfDayRoutines = require(__dirname + '/../routines/close_of_day.js');

const CloseOfDayWorkFlows = {
    async close_of_day_routine(job, wm) {
        console.log("close_of_day_routine in workflow : ", job.data);
        try {
            await CloseOfDayRoutines.closeOfDayRoutine(job.data);
            await wm.continueWorkflow(job, job.data);
        } catch (err) {
            job.data.msg = err.toString();
            console.log("close_of_day_routine error in workflow: ", job.data);
            // await wm.error(job);
            await wm.continueWorkflow(job, job.data);
        }
    }
}

module.exports = {
    close_of_day_routine: async (job, wm) => {
        return await CloseOfDayWorkFlows.close_of_day_routine(job, wm);
    },
};