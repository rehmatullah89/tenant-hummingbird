
const bullmq = require('bullmq');
const IORedis = require('ioredis');
const redis_connection = new IORedis({ host: process.env.REDIS_HOST });
const Queue = new bullmq.Queue('hummingbirdQueue', { connection: redis_connection });
 



module.exports = {
    concurrency_test: async (job, wm) => {
        console.log("job started", job.data.name);
    
    },
    event_test: async (job, wm) => {

        console.log("IN event_test", job.opts);

        // const values = await job.getChildrenValues();
        // console.log("values", values);
        // const status = await job.getState();
        // console.log("status", status);
        
        Queue.add('event_test_two', {
                name: "event_test_two",
                tracking: {
                    trace_id: data.tracking?.trace_id,
                    event_name: data.tracking?.event_name
                },
            },
            
        );
       // console.log("wm", wm);
    },
    event_test_two: async (job, wm) => {
        console.log("IN event_test_two", job.opts);
        
    
    }
};

