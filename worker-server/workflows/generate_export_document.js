let AccountingExports = require(__dirname + '/../classes/accounting_exports.js');
let pool 		= require(__dirname + '/../modules/db.js');
let utils    = require(__dirname + '/../modules/utils.js');
let db = require(__dirname + '/../modules/db_handler.js');

const GenerateExportDocumentWorkFlows = {
    async generate_export_document_routine(job, wm) {
        console.log("generate_export_document_routine in workflow data: ", job.data);

        try {

            var connection = await db.getConnectionByType('write', job.data.cid);
            
            let _export = new AccountingExports(job.data);
            let document = await _export.generateDocument(connection);
            job.data.document = document;
            job.data.data_range_string = _export.data_range_string;
            job.data.company = _export.company;
            
            if(!job.data.dryrun){
                await _export.save(connection);
            }
            
            await utils.closeConnection(pool, connection);
            await wm.continueWorkflow(job, job.data);

        } catch (err) { 
            job.data.msg = err.toString();
            console.log("generate_export_document_routine in workflow error ", job.data);
            await utils.closeConnection(pool, connection);
            await wm.error(job);
        }
    }
}

module.exports = {
    generate_export_document_routine: async (job, wm) => {
        return await GenerateExportDocumentWorkFlows.generate_export_document_routine(job, wm);
    },
};