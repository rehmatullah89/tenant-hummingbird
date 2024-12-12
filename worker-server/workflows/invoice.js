const InvoiceRoutines = require(__dirname + '/../routines/invoice_routines.js');

const InvoiceWorkFlows = {
    async create_invoice_routine(job, wm) {
        console.log("create_invoice_routine in workflow data: ", job.data);

        const { previous, workflow, ...d} = job.data;
        let data = previous ? Object.assign(previous, d) : d;
        data.job_id = job.id;

        try {
            await InvoiceRoutines.createInvoiceRoutine(data, job);
            await wm.continueWorkflow(job, data);
        } catch (err) {
            job.data.msg = err.toString();
            console.log("create_invoice_routine in workflow error ", job.data);
            await wm.continueWorkflow(job, job.data);
            // await wm.error(job);
        }
    },

    async advance_invoices_exports(job, wm) {
        console.log("Advance Invoices Exports in workflow: ", job.data);

        const { previous, workflow, ...d } = job.data;
        let data = previous ? Object.assign(previous, d) : d;
        
        try {
            await InvoiceRoutines.generateAdvanceInvoicesExports(data);
            await wm.continueWorkflow(job, data);
        } catch (err) {
            job.data.msg = err.toString();
            console.log("Advance Invoices Exports error: ", job.data);
            await wm.continueWorkflow(job, job.data);
        }
    },

    async revenue_recognition_routine(job, wm) {
        console.log("advance_paid_invoices_routine in workflow : ", job.data);

        const { previous, workflow, ...d} = job.data;
        let data = previous ? Object.assign(previous, d) : d;
        
        try {
            await InvoiceRoutines.recognizeAdvancePaidInvoicesRoutine(data, job);
            await wm.continueWorkflow(job, data);
        } catch (err) {
            job.data.msg = err.toString();
            console.log("advance_paid_invoices_routine error in workflow: ", job.data);
            await wm.continueWorkflow(job, job.data);
        }
    },

    async generate_invoice_allocation_routine(job, wm) {
        console.log("generate_invoice_allocation_routine in workflow : ", job.data);

        const { previous, workflow, ...d} = job.data;
        let data = previous ? Object.assign(previous, d) : d;
        
        try {
            await InvoiceRoutines.generateInvoiceAllocation(data, job);
            await wm.continueWorkflow(job, data);
        } catch (err) {
            job.data.msg = err.toString();
            console.log("generate_invoice_allocation_routine error in workflow: ", job.data);
            await wm.continueWorkflow(job, job.data);
        }
    },

    async send_missing_invoice_emails(job, wm){
        console.log("send_missing_invoice_emails in workflow : ", job.data);

        const { previous, workflow, ...d} = job.data;
        let data = previous ? Object.assign(previous, d) : d;
        
        try {
            await InvoiceRoutines.sendInvoicesEmailsForCompanies(data, job);
            await wm.continueWorkflow(job, data);
        } catch (err) {
            job.data.msg = err.toString();
            console.log("send_missing_invoice_emails error in workflow: ", job.data);
            await wm.continueWorkflow(job, job.data);
        }
    }
}

module.exports = {
    create_invoice_routine: async (job, wm) => {
        return await InvoiceWorkFlows.create_invoice_routine(job, wm);
    },
    revenue_recognition_routine: async (job, wm) => {
        return await InvoiceWorkFlows.revenue_recognition_routine(job, wm);
    },
    advance_invoices_exports: async (job, wm) => {
        return await InvoiceWorkFlows.advance_invoices_exports(job, wm);
    },
    generate_invoice_allocation_routine: async (job, wm) => {
        return await InvoiceWorkFlows.generate_invoice_allocation_routine(job, wm);
    },
    send_missing_invoice_emails: async (job, wm) => {
        return await InvoiceWorkFlows.send_missing_invoice_emails(job, wm);
    },
};