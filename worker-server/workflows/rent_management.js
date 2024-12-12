const PropertyRentManagement = require('../classes/rent-management/property_rent_management.js');
const { Workflow } = require('../modules/workflow_manager.js');
const RentManagementRoutines = require('../routines/rent_management.js');
const eventName = 'RentRaise';

const RentManagementWorkFlows = {

  async sendRentChangeNotification(job, wm) {
    console.log("send_rent_change_notification");

    let wf = new Workflow('send_rent_change_notification', 'send_rent_change_notification_success', 'send_rent_change_notification_error');
    wf.addDependency('generate_document_routine', job.data, {priority: job.data.priority });
    wf.addDependency('deliver_rent_change_document_routine', {}, {priority: job.data.priority });

    await wm.addWorkflow(wf);
  },

  async deliverRentChangeDocumentRoutine(job, wm) {
    try{
        console.log("inside deliver_rent_change_document_routine: ", job.data);
        job = wm.initJob(job, eventName);
        if(!job.data.notification_methods) await wm.continueWorkflow(job, job.data);
        PropertyRentManagement.sendRentManagementCronLogs({
          data: {
            ...job.data,
            job_id: job.id
          },
          stage: `DocumentDeliveryInitiated`,
          time: (new Date).toLocaleString()
        });
        await RentManagementRoutines.deliverDocument(job.data);
        await wm.continueWorkflow(job, job.data);
    } catch(err) {
        // job.data.msg = err.toString();
        console.log("STEP send_email error function", job.data);
        job.error = err;
        await wm.error(job);
        PropertyRentManagement.sendRentManagementCronLogs({
          data: {
            ...job.data,
            job_id: job.id
          },
          stage: `DeliverRentChangeDocumentError`,
          time: (new Date).toLocaleString()
        }, err);
    }
  },

  async sendRentChangeNotificationSuccess(job, wm) {
      console.log("send_rent_change_notification_success: ", job.data);
      await RentManagementRoutines.notificationSuccess(job.data);
  },

  async sendRentChangeNotificationError(job, wm) {
      console.log("send_rent_change_notification_error: ", job.data);
      await RentManagementRoutines.notificationFailure(job.data);
  },

  async sendRentManagementAlertMails(job, wm) {
      console.log(`sendRentManagementAlertMails Job`, job.data);

      if (job.data.rentChangesToBeApproved) await RentManagementRoutines.sendAlertMailsForPendingApprovals(job.data);

      await RentManagementRoutines.sendAlertMailsForDeploymentFailure(job.data);
      await RentManagementRoutines.sendAlertMailsForNotificationFailure(job.data);
  },

  // async manualApprovalOfRentChange(job, wm) {
  //   console.log("inside manualApprovalOfRentChange: ", job.data);
  //   await RentManagementRoutines.manualApprovalOfRentChange(job.data);
  // },

  async rentManagementCronJob(job = {}, wm) {
    console.log(`Initiate Rent Management Cron Job for property - ${job.data?.property?.id}`);
    try {
      PropertyRentManagement.sendRentManagementCronLogs({
        data: {
          ...job.data,
          job_id: job.id
        },
        stage: `Initiated`,
        time: (new Date).toLocaleString()
      });

      await RentManagementRoutines.cancelMovedOutLeaseAndAuctionedRentChanges(job.data);
      await RentManagementRoutines.scheduleRentChange(job.data);
      await RentManagementRoutines.approveRentChanges(job.data);
      await RentManagementRoutines.deployRentChanges(job.data);
      await RentManagementRoutines.sendAlertMails(job.data)

      PropertyRentManagement.sendRentManagementCronLogs({
        data: {
          job_id: job.id,
          company_id: job.data.cid,
          property: job.data.property,
          triggered_at: job.data.triggered_at
        },
        stage: `Completed`,
        time: (new Date).toLocaleString()
      });

    } catch (err) {
      PropertyRentManagement.sendRentManagementCronLogs({
        data: {
          ...job.data,
          job_id: job.id
        },
        stage: `Error`,
        time: (new Date).toLocaleString()
      }, err);

      job.data.msg = err.toString();
      console.log("Error while runnning Rent Management cron job", job.data, err);
      await wm.error(job);

    }
  }
}

module.exports = {

  rent_management_cron_job: async(job, wm) => {
		return await RentManagementWorkFlows.rentManagementCronJob(job, wm);
  },
  send_rent_change_notification: async(job, wm) => {
		return await RentManagementWorkFlows.sendRentChangeNotification(job, wm);
  },
  deliver_rent_change_document_routine: async(job, wm) => {
    return await RentManagementWorkFlows.deliverRentChangeDocumentRoutine(job, wm);
  },
  send_rent_change_notification_success: async(job, wm) => {
    return await RentManagementWorkFlows.sendRentChangeNotificationSuccess(job, wm);
  },
  send_rent_change_notification_error: async(job, wm) => {
    return await RentManagementWorkFlows.sendRentChangeNotificationError(job, wm);
  },
  send_rent_management_alert_mails: async(job, wm) => {
    return await RentManagementWorkFlows.sendRentManagementAlertMails(job, wm);
  },
  // manually_approve_rent_changes: async(job, wm) => {
  //   return await RentManagementWorkFlows.manualApprovalOfRentChange(job, wm);
  // }

}