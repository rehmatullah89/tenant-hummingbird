const ExecuteScriptsRoutines = require('../routines/execute_scripts_routines.js')


let ExecuteScriptsWorkflow = {
    async execute_scripts_routine(job, wm) {
        console.log("execute_scripts_routine in workflow data: ", job.data);
        const { previous, workflow, ...d } = job.data;
        let data = previous ? Object.assign(previous, d) : d;

        try {
            await ExecuteScriptsRoutines.executeScriptsRoutine(data, job);
            await wm.continueWorkflow(job, data);
        } catch (err) {
            job.data.msg = err.toString();
            console.log("execute_scripts_routine in workflow error ", job.data);
            await wm.continueWorkflow(job, job.data);
            // await wm.error(job);
        }
    }

};

module.exports = {
    execute_scripts_routine: async (job, wm) => {
        return await ExecuteScriptsWorkflow.execute_scripts_routine(job, wm);
    },
}