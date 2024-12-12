const Transport = require("winston-transport");
const settings = require("../config/settings.js");

const request = require("request-promise");
const logger = require("../modules/logger.js");

class SlackLogTransport extends Transport {
    constructor(data = {}) {
        super(data);
    }

    log(info, callback) {
        const { level, message, meta = {} } = info;

        let reqObj = {
            headers: {
                "content-type": "application/json",
            },
            body: {
                text: message,
            },
            json: true,
            method: "POST",
            uri: settings.config.SLACK_WEBHOOK_URL,
        };
        request(reqObj);

        callback();
    }
}

module.exports = SlackLogTransport;
