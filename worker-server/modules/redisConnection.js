"use strict"

const IORedis = require('ioredis');
const client = new IORedis({ host: process.env.REDIS_HOST },{
  retry_strategy: (options) => {
      const {error, total_retry_time, attempt} = options;
      if (error && error.code === "ECONNREFUSED") {
          log(error.code); // take actions or throw exception
      }
      if (total_retry_time > 1000 * 15) { //in ms i.e. 15 sec
          log('Retry time exhausted'); // take actions or throw exception
      }
      if (options.attempt > 10) {
          log('10 attempts done'); // take actions or throw exception
      }
      console.log("Attempting connection");
      // reconnect after
      return Math.min(options.attempt * 1000, 30000); //in ms
  },
});

client.on('connect'     , log('connect'));
client.on('ready'       , log('ready'));
client.on('reconnecting', log('reconnecting'));
// client.on('error'       , log('error'));
client.on('end'         , log('end'));

function log(type) {
    return function() {
        console.log(type, arguments);
    }
}


// redis_connection.on('connect', function() {
//   console.log('Redis client connected, testing');
// });

//Incase any error pops up, log it
client.on("error", function(err) {
  console.log("Error " + err);
});

module.exports = client;
