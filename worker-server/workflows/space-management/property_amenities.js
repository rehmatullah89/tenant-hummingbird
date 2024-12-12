var PropertyAmenitiesUpdateRoutines = require(__dirname + '/../../routines/space-management/property_amenities_update.js');

var PropertyAmenityUpdateWorkFlows = {
  async update_property_amenities(job, wm) {
    try {
      await PropertyAmenitiesUpdateRoutines.startAmenitiesUpdateRoutine(job.data);
      await wm.continueWorkflow(job, job.data);
    } catch(err) {
      job.data.msg = err.toString();
      console.log("STEP property_amenities_update error function", job.data);
      await wm.error(job);
    }
  },
  async custom_amenity_creation(job, wm) {
    try {
      await PropertyAmenitiesUpdateRoutines.startCustomAmenitiesCreateRoutine(job.data);
      await wm.continueWorkflow(job, job.data);
    } catch(err) {
      job.data.msg = err.toString();
      console.log("STEP custom_amenity_creation error function", job.data);
      await wm.error(job);
    }
  },
  async property_amenities_deletion(job, wm) {
    try {
      await PropertyAmenitiesUpdateRoutines.startAmenitiesDeleteRoutine(job.data);
      await wm.continueWorkflow(job, job.data);
    } catch(err) {
      job.data.msg = err.toString();
      console.log("STEP property_amenities_deletion error function", job.data);
      await wm.error(job);
    }
  }
}

module.exports = {
  update_property_amenities: async(job, wm) => {
    return await PropertyAmenityUpdateWorkFlows.update_property_amenities(job, wm);
  },
  custom_amenity_creation: async(job, wm) => {
    return await PropertyAmenityUpdateWorkFlows.custom_amenity_creation(job, wm);
  },
  property_amenities_deletion: async(job, wm) => {
    return await PropertyAmenityUpdateWorkFlows.property_amenities_deletion(job, wm);
  },
}