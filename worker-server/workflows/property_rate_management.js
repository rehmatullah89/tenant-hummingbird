var PropertyRateManagement = require(__dirname + '/../routines/property_rate_management.js');

const PropertyRateManagementWorkflow = {
    async rate_management_cron_routine(job, wm) {
        console.log("{ Property Rate Management workflow } : ", job.data);
        try {
            const { company_id, hb_company_id, property_id, profile_id, unit_id } = job.data ?? {};
            await PropertyRateManagement.PropertyRateManagementRoutine({
                company_id,
                hb_company_id,
                property_id, 
                profile_id, 
                unit_id
            });
            await wm.continueWorkflow(job, job.data);
        } catch (err) {
            job.data.msg = err.toString();
            console.log("Error { Property Rate Management workflow } : ", err);
            await wm.continueWorkflow(job, job.data);
        }
    }
}

module.exports = {
    rate_management_cron_routine: async (job, wm) => {
        return await PropertyRateManagementWorkflow.rate_management_cron_routine(job, wm);
    },
};