const slackToken = process.env.ERROR_NOTIFICATION_SLACK_TOKEN;
const slackChannel = '#'+process.env.ERROR_NOTIFICATION_SLACK_CHANNEL; // Appending # here, as # in environment file will be treated as a comment.
const { WebClient } = require('@slack/web-api');
const web = new WebClient(slackToken);
module.exports = {
    async sendMessageToSlackChannel(message) {
        try {
            console.log("Posting Message to Slack Channel: ",slackChannel);
            await web.chat.postMessage({
                channel: slackChannel,
                text: message
            })
        } catch (err) {
            console.log(err)
        }        
    }
}