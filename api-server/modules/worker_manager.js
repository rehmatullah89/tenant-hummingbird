const bullmq  = require('bullmq');
const IORedis = require('ioredis');
const redis_connection = new IORedis({host: process.env.REDIS_HOST});

const PdfQueue = new bullmq.Queue('pdf', { connection: redis_connection } );
const Queue = new bullmq.Queue('hummingbirdQueue', { connection: redis_connection } );

class WorkerManager {

    constructor(WorkflowManager){
        this.Worker = {};
        this.WorkflowManager = WorkflowManager;

        this.delegate = {
            workflow,
            test_job,
            error_test,
            completed_test,
            generate_pdf
        }
    }
    async initWorker() {
        this.Worker = new bullmq.Worker('hummingbirdQueue', async job => {

            await this.delegate[job.name](job, this.WorkflowManager);
        }, { connection: redis_connection });
    }
};

const test_job = async(job, wm) => {
    await setTimeout(async () => {
        job.data.added = "This is now added";
        await wm.continueWorkflow(job,  job.data);
    }, job.data.delay);
};

const workflow = async(job, wm) => {
    await wm.processWorkflow(job);
};


const error_test = async( job) => {
    console.log("An Error Occurred");
};


const completed_test = async(job) => {

    console.log("We Completed a test!");
};



const generate_pdf = async(job) => {
    await PdfQueue.add('generatePdf', job.data);
}


module.exports = WorkerManager;
