const { Workflow } = require(__dirname + '/../modules/workflow_manager.js');
var InvoiceRoutines = require(__dirname + '/../routines/invoice_routines.js');

var TransactionWorkFlows = {
    async run_transaction_flow(job, wm) {
        console.log("Transactions Flow start: ", job.data);

        // // success function is executed after all dependencies are completed successfully
        let wf = new Workflow('run_transaction_flow', 'transaction_flow_success', 'transaction_flow_error');
        
        // // Workflow dependencies execute in following order
        wf.addDependency('revenue_recognition_routine', job.data);
        wf.addDependency('create_invoice_routine', job.data);
        wf.addDependency('auto_payment_routine', job.data);
        wf.addDependency('revert_payment_cycle', job.data); 
        wf.addDependency('run_trigger_routine', job.data);
        wf.addDependency('advance_invoices_exports', job.data);

        await wm.addWorkflow(wf);
    },
    
    async transaction_flow_success(job, wm) {
        console.log("Transaction Flow Success!");
        console.log("Events: ", job.data);
    },

    async transaction_flow_error(job) {
        utils.sendLogs({
            logs: job.data
        });
    }
}

module.exports = {
    run_transaction_flow: async(job, wm) => {
		return await TransactionWorkFlows.run_transaction_flow(job, wm);
	},
    transaction_flow_success: async(job, wm) => {
		return await TransactionWorkFlows.transaction_flow_success(job, wm);
    },
    transaction_flow_error: async(job, wm) => {
		return await TransactionWorkFlows.transaction_flow_error(job, wm);
    },
};

const utils = require(__dirname + '/../modules/utils.js');