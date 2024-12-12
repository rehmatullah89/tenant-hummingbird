const { createLogger, format, transports } = require("winston");
const _ = require("lodash");
const { combine, timestamp, printf } = format;
const settings = require("../config/settings.js");
const SlackLogTransport = require(__dirname +
    "/../helpers/slackLogTransport.js");
const GDSLogTransport = require(__dirname + "/../helpers/gdsLogTransport.js");

const customLevels = {
    levels: {
        httpError: 0,
        http: 1,
        error: 2,
        warn: 3,
        info: 4,
        verbose: 5,
        debug: 6,
    },
};
const consoleFormat = combine(
    timestamp(),
    // eslint-disable-next-line no-shadow
    printf(({ level, message, timestamp, ...metadata }) => {
        let msgStr = `${timestamp} [${level}]: ${message}`;
        if (!_.isEmpty(metadata)) {
            msgStr += `\n${JSON.stringify(metadata)}`;
        }
        return msgStr;
    })
);

let logger = createLogger({
    levels: customLevels.levels,
});

if (process.env.SLACK_WEBHOOK_URL) {
    logger.add(
        new SlackLogTransport({
            level: "httpError",
        })
    );
}

if (process.env.NODE_ENV !== "test" && process.env.NODE_ENV !== "local") {
    logger.add(
        new GDSLogTransport({
            level: "http",
        })
    );
}

if (process.env.NODE_ENV !== "production") {
    logger.add(
        new transports.Console({
            level: "debug",
            format: consoleFormat,
        })
    );
} else {
    logger.add(
        new transports.Console({
            level: "info",
            format: consoleFormat,
        })
    );
}

module.exports = logger;
