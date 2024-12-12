var UploadRentChangeRoutine = require('../../routines/rent-management/upload_rent_change')

var UploadRentChangeFlows = {
    async uploadRentChanges(job, wm) {
        try {
            await UploadRentChangeRoutine.startRentChangeUpload(job.data)
            await wm.continueWorkflow(job, job.data);
        } catch (error) {
            console.log("STEP upload_rent_changes error function", job.data);
        }        
    }
}

module.exports = {
    upload_rent_changes: async(job, wm) => {
        console.log("upload_rent_changes: workflow started");
        return await UploadRentChangeFlows.uploadRentChanges(job, wm)
    }
}