const PropertyProgressWorkFlows = {
    async property_progress_routine(job, wm) {

        console.log("property_progress_routine in workflow : ", job.data);
        try {
            await PropertyProgressRoutines.propertyProgressRoutine(job.data);
            await wm.continueWorkflow(job, job.data);
        } catch (err) {
            job.data.msg = err.toString();
            console.log("property_progress_routine error in workflow: ", job.data);
            // await wm.error(job);
            await wm.continueWorkflow(job, job.data);
        }
    }
}

module.exports = {
    property_progress_routine: async (job, wm) => {
        return await PropertyProgressWorkFlows.property_progress_routine(job, wm);
    },
};

var PropertyProgressRoutines = require(__dirname + '/../routines/property_progress.js');
