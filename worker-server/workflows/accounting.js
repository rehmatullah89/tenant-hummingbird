const AccountingRoutines = require(__dirname + '/../routines/accounting.js');

var AccountingWorkFlows = {
    async run_accounting_flow(job, wm) {
        console.log("Run Accounting Export: ", job.data);

        let wf = new Workflow('run_accounting_flow', 'accounting_export_flow_success', 'accounting_export_flow_error');
        
        wf.addDependency('exports_routine', job.data);
        
        await wm.addWorkflow(wf);
    },
    
    async accounting_export_flow_success(job, wm) {
        console.log("Accounting Export Flow Success!");
    },

    async exports_routine(job, wm) {
        try {
            await AccountingRoutines.exportRoutine(job.data);
            await wm.continueWorkflow(job, job.data);
        } catch (err) {
            job.data.msg = err.toString();
            job.data.error = err?.stack.toString() || err.toString();
            console.log("export_routine in workflow error ", job.data);
            await wm.error(job);
        }
    },

    async accounting_export_flow_error(job) {}
}

module.exports = {
    run_accounting_flow: async(job, wm) => {
		return await AccountingWorkFlows.run_accounting_flow(job, wm);
	},
    accounting_export_flow_success: async(job, wm) => {
		return await AccountingWorkFlows.accounting_export_flow_success(job, wm);
    },
    accounting_export_flow_error: async(job, wm) => {
		return await AccountingWorkFlows.accounting_export_flow_error(job, wm);
    },
    exports_routine: async(job, wm) => {
		return await AccountingWorkFlows.exports_routine(job, wm);
    }
};

const { Workflow } = require(__dirname + '/../modules/workflow_manager.js');