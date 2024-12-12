
const { Workflow } = require('../modules/workflow_manager.js');
var RateChangeRoutines = require('../routines/rate_change.js');
var RentManagementRoutines = require('../routines/rent_management.js');

const eventName = 'RentRaise';


var RateChangeWorkFlows = {

    async send_bulk_notifications(job, wm){
        console.log("send_bulk_notifications: ", job);

        try{ 
 
            job = wm.initJob(job, eventName);
            let data = await RateChangeRoutines.generateNotifications(job.data);
            await wm.continueWorkflow(job, data);
    
        } catch(err){
            // job.data.msg = err.toString();
            console.log("err", err.stack); 
            job.error = err;
            await wm.error(job); 
        }
    },
 
    async send_notification(job, wm){
        console.log("send_notification");
    
        let wf = new Workflow('send_notification', 'send_notification_success', 'send_notification_error');
        
        wf.addDependency('generate_document_routine', job.data, {priority: job.data.priority || 1 });
        wf.addDependency('send_document_routine', {}, {priority: job.data.priority || 1 });
        wf.addDependency('deliver_document_routine', {}, {priority: job.data.priority || 1 });
        // wf.addDependency('send_email', {}, {priority: job.data.priority });
    
        await wm.addWorkflow(wf);
    },

    async deliver_document_routine(job, wm){
        
        try{

            console.log("deliver_document_routine: ", job.data); 
            job = wm.initJob(job, eventName);
            
            if(!job.data.document_batch_delivery_id) await wm.continueWorkflow(job, job.data);
            
            let  data = await RateChangeRoutines.deliverDocument(job.data);
            
            await wm.continueWorkflow(job, job.data);
    
        } catch(err){
            // job.data.msg = err.toString();
            console.log("STEP send_email error function", job.data);
            job.error = err;
            await wm.error(job);
        }


    },
 
    // async send_email(job, wm){

    //     console.log("send_email: ", job.data);  
    //     const { previous, workflow, ...d} = job.data;

    //     let data = Object.assign(job.data.previous, d);
    
    //     if(!data.email) await wm.continueWorkflow(job, data);
    
    //     try{
    //         data = await RateChangeRoutines.sendEmails(data);
    //         await wm.continueWorkflow(job, data);
    
    //     } catch(err){
    //         job.data.msg = err.toString();
    //         console.log("STEP send_email error function", job.data);
    //         await wm.error(job);
    //     }
    
    // },
    
    async send_notification_success(job, wm){
    
        console.log("send_notification_success: ", job.data);
        await RateChangeRoutines.notificationSuccess(job.data);
    },

    async send_notification_error(job, wm){

        console.log("send_notification_error: ", job.data);
        await RateChangeRoutines.notificationFailure(job.data);
    },
    
    async apply_rate_change(job, wm){
        console.log("apply_rate_change: ", job.data);

        try{
            job = wm.initJob(job);
            let data = await RateChangeRoutines.applyRateChange(job.data);
            await wm.continueWorkflow(job,  data);   
        } catch(err){
           //  job.data.msg = err.toString();
            console.log("STEP apply_rate_change error function", job.data, err);
            await wm.error(job);
        }
    },

    async rent_raise_routine(job, wm){
        console.log("rent_raise_routine: ", job.data);

        try {
            job = wm.initJob(job);
            let data = await RateChangeRoutines.createNotifications(job.data);
            // await wm.continueWorkflow(job,  data);   
        } catch(err){
        //     job.data.msg = err.toString()

            console.log("STEP rent_raise_routine error function", job.data, err);
            await wm.error(job);
        }
    },
}


module.exports = {
    send_bulk_notifications: async(job, wm) => {
		return await RateChangeWorkFlows.send_bulk_notifications(job, wm);
    },
    send_notification: async(job, wm) => {
		return await RateChangeWorkFlows.send_notification(job, wm);
	},
	send_email: async(job, wm) => {
		return await RateChangeWorkFlows.send_email(job, wm);
    },
	deliver_document_routine: async(job, wm) => {
		return await RateChangeWorkFlows.deliver_document_routine(job, wm);
    },
    send_notification_success: async(job, wm) => {
		return await RateChangeWorkFlows.send_notification_success(job, wm);
    },
    send_notification_error: async(job, wm) => {
		return await RateChangeWorkFlows.send_notification_error(job, wm);
	},
	apply_rate_change: async(job, wm) => {
		return await RateChangeWorkFlows.apply_rate_change(job, wm);
    },
    rent_raise_routine: async(job, wm) => {
		return await RateChangeWorkFlows.rent_raise_routine(job, wm);
    },
    create_and_deploy_rent_change: async(job, wm)=> {
		return await RateChangeWorkFlows.create_and_deploy_rent_change(job, wm);
    },
    send_rent_change_notification: async(job, wm)=> {
		return await RateChangeWorkFlows.send_rent_change_notification(job, wm);
    },
};