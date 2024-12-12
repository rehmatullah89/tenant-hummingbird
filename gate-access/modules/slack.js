const slackToken = process.env.SLACK_ALERTS_APP
const { WebClient } = require('@slack/web-api');
const web = new WebClient(slackToken);
const settings = require('../config/settings.js')
module.exports = {
    async post_message_to_alerts_noke(message) {
        if (settings.is_uat || settings.is_prod) {
            try {
                await web.chat.postMessage({
                    channel: settings.config.noke_slack_channel,
                    text: message
                })
            } catch (err) {
                console.log(err)
            }
        }
        
    }
}