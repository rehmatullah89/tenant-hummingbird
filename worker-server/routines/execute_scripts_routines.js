const { v4: uuidv4 } = require('uuid');

let ExecuteScriptsRoutines = {
    async executeScriptsRoutine(data, job) {
        console.log("IN executeScriptsRoutine");
        //console.log("JOB DATA -- ex", data);
        let { database, schema, queries, file_name } = data;
        let db_config = {}, id =  uuidv4();
        let formatted_queries = ScriptsUtils.formateQueriesArray(data.queries);
        let log_payload = {
            ...data,
            queries: formatted_queries
        };

        // add the data of that job to dynamo
        await db.addScripJobs({
            id,
            job_id: job.id,
            timestamp: job.timestamp,
            processed_on: job.processedOn,
            file_name,
            database,
            schema
        });

        console.log("Added Script Job data in dynamo.");

        try {
            db_config = {
                database,
                schema
            };
            await es.executeScripts(queries, { db_config, job, id });

            await this.sendLogs(log_payload, Enums.LOGGING.EXECUTE_SCRIPTS);

        } catch (err) {
            console.log("error--executeScriptsRoutine", err);
            console.log(err.stack);
            await this.sendLogs(log_payload, Enums.LOGGING.EXECUTE_SCRIPTS, { err });
        }

    },
    async sendLogs(data, event_name, params = {}) {
        let { err } = params;

        await Utils.sendLogs({
            event_name,
            logs: {
                payload: {
                    ...data
                },
                ...(err && { error: err?.stack || err?.msg || err })
            }
        });
    }

};

module.exports = ExecuteScriptsRoutines;

const es = require('../modules/execute-scripts/execute_scripts');
const Enums = require('../modules/enums');
const Utils = require('../modules/utils');
const ScriptsUtils = require('../modules/execute-scripts/utils');
const db = require('../modules/db_handler');