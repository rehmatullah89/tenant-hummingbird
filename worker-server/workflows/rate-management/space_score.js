var SpaceScoreUpdateRoutines = require('../../routines/rate-management/space_score')

var RateManagementSpaceScoreFlows = {
    async updateSpaceScoreData(job, wm) {
        try {
            await SpaceScoreUpdateRoutines.startSpaceScoreUpdate(job.data)
            await wm.continueWorkflow(job, job.data);
        } catch (error) {
            console.log("STEP updateSpaceScoreData error function", job.data);
        }        
    }
}

module.exports = {
    trigger_space_score_updation: async(job, wm) => {
        console.log("trigger_space_score_updation: workflow started");
        return await RateManagementSpaceScoreFlows.updateSpaceScoreData(job, wm)
    }
}