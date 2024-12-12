var ShareReportsWorkFlows = {
    async share_reports_flow(job, wm) {
        console.log("Share Reports Flow start: ", job.data);                

        // success function is executed after all dependencies are completed successfully
        let wf = new Workflow('share_reports_flow','share_reports_flow_success','share_reports_flow_error');
        
        // Workflow dependencies execute in following order
        wf.addDependency('generate_reports_routine', job.data);
        wf.addDependency('send_reports_routine', job.data);

        await wm.addWorkflow(wf);
    },

    async share_reports_flow_success(job) {

        if(job.data.dependencies[0].data.socket_details){

            const { company_id, contact_id } = job.data.dependencies[0].data.socket_details;
            let socket = new Socket({
              company_id: company_id,
              contact_id: contact_id,
            });
            try {
                const connected = await socket.isConnected(contact_id);
                if(!connected) return;
                console.log(contact_id,"contact_id")
                await socket.createEvent("share_reports_update", { status: 'success' , id : job.data.dependencies[0].data.socket_details.id , reports: job.data.dependencies[0].data.reports});
    
            } catch(err){
                console.log("Cant send socket event", err);
                return;
            }
        
            }
        console.log("Share report Flow Success ok!",job.data);

    },

    async share_reports_flow_error(job) {

        if(job.data.socket_details){
        const { company_id, contact_id } = job.data.socket_details;
        let socket = new Socket({
          company_id: company_id,
          contact_id: contact_id,
        });

        let error_details = [];

        let show_error_details = (job.data.send_reports_error && job.data.send_reports_error.error && job.data.send_reports_error.error.applicationData) ? true: false;

        if(show_error_details){  
            error_details = job.data.send_reports_error.error.applicationData[SHARE_REPORT_APP_ID][0].data.errors.origin.message;
        }

        try {
            const connected = await socket.isConnected(contact_id);
            if(!connected) return;
  
            await socket.createEvent("share_reports_update", { status: 'error' ,id :job.data.socket_details.id , reports: job.data.reports ,
            ...( show_error_details &&{error_details})
            });

        } catch(err){
            console.log("Cant send socket event", err);
            return;
        }
    
        }
        console.log("Share report Flow error!", job.data);
      },
}

module.exports = {
    share_reports_flow: async(job, wm) => {
		return await ShareReportsWorkFlows.share_reports_flow(job, wm);
	},
    share_reports_flow_success: async(job, wm) => {
		return await ShareReportsWorkFlows.share_reports_flow_success(job, wm);
	},
    share_reports_flow_error: async (job, wm) => {
        return await ShareReportsWorkFlows.share_reports_flow_error(job, wm);
      }
};

const { Workflow } = require(__dirname + '/../modules/workflow_manager.js');
const AccountingExport = require(__dirname + '/../classes/accounting_exports.js');
var pool 		= require(__dirname + '/../modules/db.js');
var utils    = require(__dirname + '/../modules/utils.js');
var db = require(__dirname + '/../modules/db_handler.js');
const Socket = require('../classes/sockets');
