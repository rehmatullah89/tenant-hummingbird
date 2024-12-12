const GenerateReportWorkFlows = {
    async generate_reports_routine(job, wm) {
        console.log("generate_reports_routine in workflow data: ", job.data);

        try {
            let payload =  await GenerateReportsRoutine.generateReportsForRecipients(job.data)
            job.data.reports_with_docid = payload.reports_with_docid;
            job.data.property_info = payload.property_info
            await wm.continueWorkflow(job, job.data);

        } catch (err) {
            job.data.msg = err.toString();
            console.log("generate_reports_routine in workflow error ", job.data);
            await wm.error(job);
        }
    }
}

module.exports = {
    generate_reports_routine: async (job, wm) => {
        return await GenerateReportWorkFlows.generate_reports_routine(job, wm);
    },
};

let AccountingExports = require(__dirname + '/../classes/accounting_exports.js');
let pool 		= require(__dirname + '/../modules/db.js');
let utils    = require(__dirname + '/../modules/utils.js');
let db = require(__dirname + '/../modules/db_handler.js');
var rp = require('request-promise');
var moment = require('moment');
var GenerateReportsRoutine = require(__dirname + '/../routines/generate_reports_routines.js');
let e    = require(__dirname + '/../modules/error_handler.js');

