const bullmq  = require('bullmq');
const IORedis = require('ioredis');
const redis_connection = new IORedis({host: process.env.REDIS_HOST});
const queue = new bullmq.Queue('hummingbirdQueue', { connection: redis_connection } );
// const queueScheduler = new bullmq.QueueScheduler('hummingbirdQueue', { connection: redis_connection } );

const {  WorkflowManager } = require(__dirname + '/../modules/workflow_manager.js');
let workflowManager = new WorkflowManager(queue);
const WorkerManager = require(__dirname + '/../modules/worker_manager.js');
let workerManager = new WorkerManager(workflowManager);

module.exports = workerManager;