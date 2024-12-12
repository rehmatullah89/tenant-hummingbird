var SendAccountingExportRoutine = require(__dirname + '/../routines/send_accounting_export_routines.js');

const GenerateExportDocumentWorkFlows = {
    async send_export_document_routine(job, wm) {
        console.log("send_export_document_routine in workflow data: ", job.data);

        try {

            await SendAccountingExportRoutine.sendReportToRecipients(job.data)
            await wm.continueWorkflow(job, job.data);

        } catch (err) {
            job.data.msg = err.toString();
            console.log("send_export_document_routine in workflow error ", job.data);
            await wm.error(job);
        }
    }
}

module.exports = {
    send_export_document_routine: async (job, wm) => {
        return await GenerateExportDocumentWorkFlows.send_export_document_routine(job, wm);
    },
};