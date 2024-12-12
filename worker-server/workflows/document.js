
const eventName = 'RentRaise';

const DocumentWorkFlows = {
  async run_document_flow(job, wm) {
    console.log('Document Workflow data: ', job.data);

    let wf = new Workflow('run_document_flow', 'document_flow_success', 'document_flow_error');
    wf.addDependency('generate_document_routine', job.data);
    wf.addDependency('send_document_routine', job.data);

    await wm.addWorkflow(wf);
  },

  async document_flow_success(job, wm) {
    console.log("Document flow success!", job.data);
  },

  async document_flow_error(job) {
    const { company_id, contact_id } = job.data.socket_details;
    let socket = new Socket({
      company_id: company_id,
      contact_id: contact_id,
    });

    await socket.createEvent("pandadoc_generation_update", { status: 'error' });
    console.log("Document flow error!", job.data);
  },

  async generate_document_routine(job, wm) {
    let summary = null;
    try {
      job = wm.initJob(job);  
      let event_name = ENUMS.LOGGING.GENERATE_DOCUMENT
      if (job.data.event_name) {
        // If the request was from the rent management cronjob
        event_name = job.data.event_name
      }
      summary = {
        date: job?.data?.date,
        time: (new Date).toLocaleString()
      }
      if (job?.data?.property) {
        summary.property = {
          id: job?.data?.property?.id,
          name: job?.data?.property?.property_name,
          company_id: job?.data?.property?.company_id
        }
      }
      if (job?.data?.rent_change_id) {
        summary.rent_change_id = job.data.rent_change_id
      }
      if (job?.data?.lease_id) {
        summary.lease_id = job.data.lease_id
      }
      await DocumentManagerRoutines.generateDocument(job.data);
      summary.stage = `DocumentGenerated`

      utils.sendLogs({
        event_name: event_name,
        logs: {
          payload: {
            data: {
              ...job.data,
              job_id: job.id
            },
            stage: `DocumentGenerated`
          }
        },
        summary
      });
      await wm.continueWorkflow(job, job.data);
    } catch (err) {
      job.error = err;
      job.data.msg = err.toString();
      job.data.error = err?.stack.toString() || err.toString();
      console.log("generate_document_routine in workflow error: ", job.data);
      let event_name = ENUMS.LOGGING.GENERATE_DOCUMENT
      if (job.data.event_name) {
        // If the request was from the rent management cronjob
        event_name = job.data.event_name
      }
      if (summary)
        summary.stage = `DocumentGenerationFailed`
      utils.sendLogs({
        event_name: event_name,
        logs: {
          payload: {
            data: {
              ...job.data,
              job_id: job.id
            },
            stage: `DocumentGenerationFailed`
          },
          error: err?.stack || err?.msg || err
        },
        summary
      });
      await wm.error(job);
    }
  },

  async send_document_routine(job, wm) {
    try {
      job = wm.initJob(job);
      await DocumentManagerRoutines.sendDocument(job.data);
      await wm.continueWorkflow(job, job.data);
    } catch (err) {
      job.data.msg = err.toString();
      job.data.error = err?.stack.toString() || err.toString();
      console.log("send_document_routine in workflow error: ", job.data);
      job.error = err;
      await wm.error(job);
    }
  },

  async merge_document_routine(job, wm){
    console.log("merge_document_routine in workflow data: ", job.data);
    try {
      job = wm.initJob(job);     
      await DocumentManagerRoutines.assembleDocumentBatch(job.data);
    } catch (err) {
        // job.data.msg = err.toString();
        console.log("merge_document_routine in workflow error ", job.data);
        job.error = err;
        await wm.error(job);
    }
    await wm.continueWorkflow(job, job.data);
  },

  async retry_bulk_notifications(job, wm){
    console.log("retry_bulk_notifications: ", job);

    try{ 

        job = wm.initJob(job, eventName);
        let data = await DocumentManagerRoutines.generateDeliveries(job.data);
        console.log("data: ", data);
        await wm.continueWorkflow(job, data);

    } catch(err){
        // job.data.msg = err.toString();
        console.log("err", err.stack); 
        job.error = err;
        await wm.error(job); 
    }
},

async resend_notification(job, wm){
  console.log("resend_notification: ", job.data);

  let wf = new Workflow('resend_notification', 'resend_notification_success', 'resend_notification_error');
  
  wf.addDependency('resend_document_routine', job.data, {priority: job.data.priority || 1 });

  await wm.addWorkflow(wf);
},

async resend_document_routine(job, wm){
        
  try{

      console.log("resend_document_routine: ", job.data); 
      job = wm.initJob(job, eventName);
      
      if(!job.data.document_batch_delivery_id) await wm.continueWorkflow(job, job.data);
      
      let data = await DocumentManagerRoutines.retryDocument(job.data);
      
      await wm.continueWorkflow(job, job.data);

  } catch(err){
      // job.data.msg = err.toString();
      console.log("Error exists: ", job.data);
      job.error = err;
      await wm.error(job);
  }


},

async resend_notification_success(job, wm){
    
  console.log("resend_notification_success: ", job.data);
  await DocumentManagerRoutines.renotifySuccess(job.data);
},

async resend_notification_error(job, wm){

  console.log("resend_notification_error: ", job.data);
  await DocumentManagerRoutines.renotifyFailure(job.data);
},




}

module.exports = {
  run_document_flow: async (job, wm) => {
    return await DocumentWorkFlows.run_document_flow(job, wm);
  },
  generate_document_routine: async (job, wm) => {
    return await DocumentWorkFlows.generate_document_routine(job, wm);
  },
  send_document_routine: async (job, wm) => {
    return await DocumentWorkFlows.send_document_routine(job, wm);
  },
  document_flow_success: async (job, wm) => {
    return await DocumentWorkFlows.document_flow_success(job, wm);
  },
  document_flow_error: async (job, wm) => {
    return await DocumentWorkFlows.document_flow_error(job, wm);
  },
  merge_document_routine: async (job, wm) => {
    return await DocumentWorkFlows.merge_document_routine(job, wm);
  },
  retry_bulk_notifications: async (job, wm) => {
    return await DocumentWorkFlows.retry_bulk_notifications(job, wm);
  },
  resend_document_routine: async (job, wm) => {
    return await DocumentWorkFlows.resend_document_routine(job, wm);
  },
  resend_notification: async (job, wm) => {
    return await DocumentWorkFlows.resend_notification(job, wm);
  },
  resend_notification_success: async (job, wm) => {
    return await DocumentWorkFlows.resend_notification_success(job, wm);
  },
  resend_notification_error: async (job, wm) => {
    return await DocumentWorkFlows.resend_notification_error(job, wm);
  },
};

const utils = require('../modules/utils.js');
const ENUMS = require('../modules/enums');
const Socket = require('../classes/sockets');
const DocumentManagerRoutines = require('../routines/document_manager.js');
const TriggersRoutines = require('../routines/triggers.js');
const { Workflow } = require('../modules/workflow_manager.js');
