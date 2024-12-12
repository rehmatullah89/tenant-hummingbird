const GenerateExportDocumentWorkFlows = {
    async send_reports_routine(job, wm) {
        console.log("send_reports_routine in workflow data: ", job.data);

        try {

            await SendReportsRoutine.sendReportsToRecipients(job.data)
            await wm.continueWorkflow(job, job.data);

        } catch (err) {
            job.data.msg = err.toString();
            job.data.send_reports_error = err;
            console.log("send_reports_routine in workflow error ", job.data);
            await wm.error(job);
        }
    }
}

module.exports = {
    send_reports_routine: async (job, wm) => {
        return await GenerateExportDocumentWorkFlows.send_reports_routine(job, wm);
    },
};

var SendReportsRoutine = require(__dirname + '/../routines/send_reports_routines.js');
