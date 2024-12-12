var SpacesCreationRoutines = require(__dirname + '/../../routines/space-management/spaces.js');

var SpacesCreationWorkFlows = {
  async spaces_creation(job, wm){
    try {
      console.log("Space Creation Workflow - data", job.data.info);
      await SpacesCreationRoutines.createSpaces(job.data.cid, job.data.info, job.data.socket_details, job.data.company_id);
      await wm.continueWorkflow(job, job.data);
    } catch(err) {
      job.data.msg = err.toString();
      console.log("STEP create_spaces error function", job.data);
      await wm.error(job);
    }  
  },
}

module.exports = {
  spaces_creation: async(job, wm) => {
		return await SpacesCreationWorkFlows.spaces_creation(job, wm);
  },
}