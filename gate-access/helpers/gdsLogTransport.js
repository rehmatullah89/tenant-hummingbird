const request = require("request-promise");
const settings = require("../config/settings.js");
const Transport = require("winston-transport");
const { debug } = require("request");

class GDSLogTransport extends Transport {
    constructor(data = {}) {
        super(data);
        this.headers = {
            "x-storageapi-key": settings.get_gds_api_key(),
            "X-storageapi-date": Date.now().toString(),
        };
        this.method = "POST";
        this.uri = `${settings.get_logging_app_url()}/log`;
    }

    log(info, callback) {
        const { level, message, meta = {} } = info;
        let messageObj = typeof message === 'string' ? JSON.parse(message) : message
        
        this.headers["X-storageapi-trace-id"] = messageObj.trace_id;
        this.headers["X-storageapi-request-id"] = messageObj.trace_id;

        let data = {
            uri: this.uri,
            headers: this.headers,
            method: "POST",
            json: true,
            body: {
                origin: "gate_access_app",
                component: messageObj.component || "HB_GATE_ACCESS_APP",
                log_level: level && level === "httpError" ? 'error' : "info",
                log: messageObj,
            },
        };

        request(data);

        callback();
    }
}

module.exports = GDSLogTransport;
