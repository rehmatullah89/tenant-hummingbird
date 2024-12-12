
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


class WorkflowManager {
  constructor(queue){
    this.Queue = queue;
  }

  async continueWorkflow(job, data){
    let job_index = job.data.workflow.dependencies.findIndex(d => d.initiated && !d.completed);
    job.data.workflow.dependencies[job_index].completed = true;
    if(data){
      const { workflow, ...params } = data;
      job.data.workflow.dependencies[job_index].data = params
    }
    await this.Queue.add('workflow', job.data.workflow);
  }

  async addWorkflow(wf){
    await this.Queue.add('workflow', wf);
  }

  async processWorkflow(job){

    try {
      if(!job.data.dependencies || !job.data.dependencies.length) return;
      for(let i = 0; i < job.data.dependencies.length; i++) {
        if(job.data.dependencies[i].completed) continue;
        if(job.data.dependencies[i].initiated) {
          throw "dependency initiated but not complete";
        }

        job.data.dependencies[i].initiated = true;

        await this.Queue.add(job.data.dependencies[i].job_name, {
          ...job.data.dependencies[i].data,
          workflow: job.data
        });
        return;
      }
      if(job.data.completed_job){
        console.log("completed_job", JSON.stringify(job.data,  null, 2));
        await this.Queue.add(job.data.completed_job, job.data);
      }
    } catch(err) {
      console.log("Workflow worker err", err);
      if(job.data.error_job){
        await this.Queue.add(job.data.error_job, job.data);
      } else {
        await this.Queue.add('job_error', job.data);
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
      completed: false,
      initiated: false,
      data: data
    })
  }
};



module.exports = {
  WorkflowManager,
  Workflow
};
