// if (process.env.NODE_ENV !== 'test') {
//     var bullmq = require('bullmq');
//     var IORedis = require('ioredis');
// }

let {Queue} = require('bullmq');
let IORedis = require('ioredis');

let queues = new Map();

function init(){
     addQueue('hummingbirdQueue');
}

function addQueue(queue){
    if(IORedis){
        const redisConnection = new IORedis({ host: process.env.REDIS_HOST });
        q = new Queue(queue, { connection: redisConnection });
        queues.set(queue, q);
    }
}

function getQ(q){
    return queues.get(q);
}

module.exports = {init, getQ};
