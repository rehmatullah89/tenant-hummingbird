
/***** Data Structure
 {
   job_name : 'send_email',
   error_job: 'send_email_error',
   dependencies : [
   {
          job_name: 'create_document',
          completed : false,
          initiated: false,
          data : {
              payment_id: '12345',
              link: ''
              ...
          }
      },
   ...
   ],
   completed_job: 'send_email_completed'
 }
 ******/
const { v4: uuidv4 } = require('uuid');
const Utils = require(__dirname + '/../modules/utils');


class WorkflowManager {

  constructor(queue){
    this.Queue = queue;
  }


  initJob(job, event_name){
    job.data.tracking = job.data.tracking || {}
    job.data.tracking.request_id = uuidv4();
    const { previous, workflow, ...d} = job.data;
    if(job.data.previous){
      job.data = Object.assign(job.data.previous, d);
      job.data.workflow = workflow
    } 
    
    job.data.tracking.trace_id = job.data.tracking.trace_id || job.data.tracking.request_id;
    job.data.tracking.event_name = event_name || job.data.tracking.event_name;

    return job;

  }

  async continueWorkflow(job, data) {
    if(!job.data || !job.data.workflow || !job.data.workflow.dependencies) {
      console.log("No further workflow found.");
      return;
    }
    
    let job_index = job.data.workflow.dependencies.findIndex(d => d.status === 'initiated');
    if(job_index >=0 && job.data.workflow.dependencies[job_index].status){
      job.data.workflow.dependencies[job_index].status = 'complete';
   
      if(data){
        const { workflow, previous, ...params } = data;
        job.data.workflow.dependencies[job_index].data = params
      }

      await this.Queue.add('workflow', job.data.workflow);
    } else {
      console.log("dependency index not found. job.data.workflow.dependencies", job.data.workflow.dependencies)
      
    }
  }

  async addWorkflow(wf){
    await this.Queue.add('workflow', wf);
  }

  async replay(job, data, delay){

    //const { previous, workflow, ...d} = job.data;

    job.data = Object.assign(job.data, data);
    let job_index = job.data.workflow.dependencies.findIndex(d => d.status === 'initiated');
    job.data.workflow.dependencies[job_index].status = 'ready';
    await this.Queue.add('workflow', job.data.workflow, {delay: delay || 0});
  }

  async inject(name, data, job){

    let job_index = job.data.workflow.dependencies.findIndex(d => d.status === 'initiated');
    job.data.workflow.dependencies[job_index].status = 'complete';

    job.data.workflow.dependencies.splice(job_index + 1, 0, {
      job_name: name,
      status: 'ready',
      data: data
    });


    console.log("inject job.data", JSON.stringify(job.data.workflow, null, 2));
    if(data){
      const { workflow, previous, ...params } = data;
      job.data.workflow.dependencies[job_index].data = params
    }

    await this.Queue.add('workflow', job.data.workflow);
  }

  async error(job){
    console.log("ERROR Handler", job.data, job.error);

    const { workflow, previous, error, event_name, ...d } =  job.data;

    if(job.error){
      let logs = {
        request: {
          id: job.id,
          name: job.name, 
          data: d
        },
        response: {
          error: job.error,
          stack: job.error.stack
        }
      } 

      if(workflow && workflow.dependencies?.length){
        logs.request.workflows = workflow.dependencies.map(d => `${d.job_name}: ${d.status}`);
      }

      console.log("Sending Logs", job.data);
      Utils.sendLogsToGDS('HB_WORKER_SERVER', logs, null, 'error', job.data.tracking?.request_id, job.data.tracking?.trace_id, {event_name: job.data.tracking?.event_name || 'WorkerLoggerEvent' } )
    }
    if(job.data?.workflow?.error_job){
      await this.Queue.add(job.data.workflow?.error_job, job.data);
    } 

  }

  async processWorkflow(job) {
    console.log("processWorkflow");
    try {
      let prev = {};
      if (!job.data.dependencies || !job.data.dependencies.length) return;
      for (let i = 0; i < job.data.dependencies.length; i++) {
        if (job.data.dependencies[i].status === 'complete') continue;
        if (job.data.dependencies[i].status === 'initiated') {
          throw "dependency initiated but not complete";
        }
        job.data.dependencies[i].status = 'initiated';
        let prev = {};
        if(i > 0){
          const { workflow, previous, ...previous_params } = job.data.dependencies[i-1].data;
          prev = previous_params;
        }

        let delay = 0;
        if(job.data.dependencies[i].data && job.data.dependencies[i].data.delay){
          delay = job.data.dependencies[i].data.delay
        }
        await this.Queue.add(job.data.dependencies[i].job_name, {
          ...job.data.dependencies[i].data,
          previous: prev,
          workflow: job.data
        }, {delay: delay});
        return;
      }

      if (job.data.completed_job) {

        await this.Queue.add(job.data.completed_job, job.data);
      }
    } catch (err) {
      console.log("err", err);
      if (job.data.error_job) {
        await this.Queue.add(job.data.error_job, job.data);
      }
    }
  }

};

class Workflow {

  constructor(name, completed_job, error_job){
    this.name = name;
    this.error_job = error_job;
    this.completed_job = completed_job;
    this.dependencies = [];
    
  }
  addDependency(name, data) {
    this.dependencies.push({
      job_name: name,
      status: 'ready',
      data: data
    });

  }
};



module.exports = {
  WorkflowManager,
  Workflow
};
