var Settings      = require(__dirname + '/../config/settings.js');


var kue = require('kue');
var redis = require('redis');

queue = kue.createQueue({
    redis: {
        createClientFactory: function(){
            return redis.createClient({
                port: '6379',
                host: Settings.redis_host
            });
        }
    }
});


var Promise = require('bluebird');
var createQueue = Promise.promisify(queue.create);
var moment = require('moment');

var queueAsync = Promise.promisify(queue.create);


module.exports = {
    kick: function(){
        interval = setInterval(function(){

            // check for invoices to create
            // get current date
            // loop through companies, and see which ones process invoices today
            // create job to create invoice creation jobs

            // check for late notices to send
            // get current date
            // loop through companies, and see which ones process lat notices today
            // create job to create late notices
            // late notice jobs apply late fee, then queue a job for late notice to go out

        }, 5000);
    },
    scheduleEmail: function(data){

    },
    addJobs: function(jobs, fn){
        var promises = [];

        var total = jobs.length;
        var count = 0;
        jobs.forEach(function(job, i) {
           var job = queue.create(job.category, job.data).save( function(err){
                if( !err ) console.log( job.data );
                count++;
                if(total == count) fn(null);
            });
        });

    },
    addJobsAsync: function(jobs, fn) {
        var promises = [];

        return Promise.mapSeries(jobs, (job, i) => {
            return new Promise((resolve, reject) => {


                return queue.create(job.category, job.data).save(function (err) {
                    if (err) console.log(err);
                    resolve();
                });
            })
        })
    }
};
