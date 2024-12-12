var { Producer, KafkaClient } = require('kafka-node');
var settings = require('../config/settings.js');

var client = new KafkaClient({ kafkaHost: settings.kafka.broker_address});


if(!settings.kafka.broker_address) return;

var producer = new Producer(client);



var topicsDictionary = { production: 'live-api', uat: 'uat-api', staging: 'staging-api', local: 'dev-api' };

producer.on('ready', () => {
    console.log('producer is ready to send payload');
});

producer.on('error', (err) => console.log(err));

producer.on('close', () => console.log('Producer closed'));

module.exports = {
    log(message){

        var payload = { topic: topicsDictionary[settings.config.env], message };
        return new Promise((resolve, reject) => {
            producer.send([payload], (err, result) => {
                if(err) {
                    console.error(err);
                    reject(err);
                }
                resolve(result)
            });
        });
    }
}
