const { Workflow } = require(__dirname + '/../modules/workflow_manager.js');
const AccountingExport = require(__dirname + '/../classes/accounting_exports.js');
var pool 		= require(__dirname + '/../modules/db.js');
var utils    = require(__dirname + '/../modules/utils.js');
var db = require(__dirname + '/../modules/db_handler.js');

var AccountingExportsWorkFlows = {
    async run_export_flow(job, wm) {
        console.log("Accounting Exports Flow start: ", job.data);

        // // success function is executed after all dependencies are completed successfully
        let wf = new Workflow('run_export_flow','run_export_flow_success');
        
        // // Workflow dependencies execute in following order
        wf.addDependency('generate_export_document_routine', job.data);
        wf.addDependency('send_export_document_routine', job.data);

        await wm.addWorkflow(wf);
    },

    async run_export_flow_success(job, wm) {
        console.log("run_export_flow_success Flow Success!");
        const { data } =  job.data.dependencies && job.data.dependencies[0];
        if(!data.dryrun && ['biweekly','quarterly'].includes(data.frequency)) {
            let connection = await db.getConnectionByType('write', data.cid);
            try {
                await AccountingExport.updateAccountingExportedDate(connection,{
                    config_id: data.config_id,
                    date: data.date
                })

                await utils.closeConnection(pool, connection);

            } catch(err) {
                await utils.closeConnection(pool, connection);
            }
        }
    },
}

module.exports = {
    run_export_flow: async(job, wm) => {
		return await AccountingExportsWorkFlows.run_export_flow(job, wm);
	},
    run_export_flow_success: async(job, wm) => {
		return await AccountingExportsWorkFlows.run_export_flow_success(job, wm);
	}
};