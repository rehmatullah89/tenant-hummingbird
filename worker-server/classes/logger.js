const fs = require('fs');
const moment = require('moment');

class Logger {

    constructor(data = {}) {
        this.logFilePath = data.log_file_path || __dirname;
    }

    // Custom logging function
    cLog(...args) {

        if (!fs.existsSync(this.logFilePath)) {
            fs.mkdirSync(this.logFilePath, { recursive: true });
        }

        console.log(...args);

        const logStream = fs.createWriteStream(`${this.logFilePath}/logs.txt` || './logs-file.txt', { flags: 'a' });

        let log_msg = `[${moment().format('HH:MM:ss.l')}] ${args.map(arg => (typeof arg !== 'string') ? JSON.stringify(arg, null, 4) : arg)}\n`;
        logStream.write(log_msg);
    }

}

module.exports = Logger;
