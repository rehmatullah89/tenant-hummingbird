const PromotionWorkFlows = {
    async run_promotion_routine(job, wm) {
        try {
            let { promotion_id, property_id, cid } = job.data;
            await PromotionRoutines.runPromotionsRoutine({ property_id, promotion_id, cid, job });
            await wm.continueWorkflow(job, job.data);
        } catch (err) {
            job.data.msg = err.toString();
            await wm.continueWorkflow(job, job.data);
        }
    }
}

module.exports = {
    run_promotion_routine: async (job, wm) => {
        return await PromotionWorkFlows.run_promotion_routine(job, wm);
    },
};

var PromotionRoutines = require(__dirname + '/../routines/promotions.js');
