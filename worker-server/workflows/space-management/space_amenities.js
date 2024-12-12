var SpacesAmenitiesUpdateRoutines = require(__dirname + '/../../routines/space-management/space_amenities_update.js');

var SpacesAmenityUpdateWorkFlows = {
    async unit_amenity_update(job, wm){
      try {
        await SpacesAmenitiesUpdateRoutines.updateAmenities(job.data.cid, job.data.info, job.data.socket_details);
        await wm.continueWorkflow(job, job.data);
      } catch(err) {
        job.data.msg = err.toString();
        console.log("STEP unit_amenity_update error function", job.data);
        await wm.error(job);
      }  
    },
  }
  
  module.exports = {
    unit_amenity_update: async(job, wm) => {
          return await SpacesAmenityUpdateWorkFlows.unit_amenity_update(job, wm);
    },
  }