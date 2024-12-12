
const {getQ} = require('./bullmq');

function getQueue(queueName) {
    return getQ(queueName);
}

module.exports = getQueue;
