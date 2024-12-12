const moment = require('moment');
const path = require('path');

const EXECUTION_FOLDER = __dirname + `/../../queries-executions`, 
      ARCHIVE_FOLDER = __dirname + `/../../archive-folders`;

let execute_scripts = {

    async executeScripts(queries = [], params = {}) {
        let { db_config = {}, job, id: script_job_id } = params;

        if (Object.keys(db_config)?.length === 0) {
            e.th(404, 'DB Config not found');
        }
        if (queries?.length === 0) {
            e.th(404, 'There are no Scripts to Execute');
        }

        let { database, schema } = db_config;
        let data = [], data_count_for_each_query = {},
            execution_sub_folder = `${database}_${schema}_${moment().format('YYYY-MM-DD_HHmmss')}`,
            execution_folder = `${EXECUTION_FOLDER}/${execution_sub_folder}`;
        
        let transaction_started = false;

        var logger = new Logger({ log_file_path: execution_folder });
        logger.cLog("QUERIES Length:", queries.length);

        try {

            var connection = await db.getConnectionByDBName("write", database, schema, "executeScripts");

            logger.cLog(`--------------------------------------------------`)
            logger.cLog(`Connected to ${database} database!\n`);

            for (let j = 0; j < queries.length; j++) {
                const query = queries[j], query_num = j + 1
                isDDLorDMLQuery = ScriptsUtils.isDDLorDMLQuery(query);

                logger.cLog(`DB ( ${database} ) & Schema ( ${schema} )  => Query # ${j + 1}`);

                if (transaction_started === false && isDDLorDMLQuery) {
                    await connection.beginTransactionAsync();
                    transaction_started = true;
                }

                try {
                    data = await connection.queryAsync(query);

                } catch (error) {
                    if (isDDLorDMLQuery)
                        throw error;
                    logger.cLog(`Query # ${j + 1} error:`, error);
                    continue;
                }

                // if query is "SELECT" then export that data, otherwise just print the data
                if (!isDDLorDMLQuery) {
                    excel.convertJsonToExcel(data, { rds_instance: database.split('_')[1] || database || 'localhost', folder_name: `${execution_folder}/queries`, query_number: query_num });

                    // preparing data of count to write in the file.
                    let query_number = `query_${query_num}`;
                    if (!data_count_for_each_query.hasOwnProperty(schema)) {
                        data_count_for_each_query[schema] = {};
                    }
                    data_count_for_each_query[schema][query_number] = data?.length || 0;

                } else {
                    logger.cLog('Query results:', data);
                }

                if (job) {
                    await queue.updateProgress(job, { total: queries.length, done: j + 1 });
                }

            }

            if(transaction_started){
                await connection.commitAsync();
                transaction_started = false;
            }

            if (connection) {
                await db.closeConnection(connection);
                logger.cLog(`Database ${database} connection closed.`);
                logger.cLog(`--------------------------------------------------\n`)
            }

            logger.cLog("\nDone, Ran Queries on ALL DBs");

            let payload = {
                data_count_for_each_query,
                execution_folder,
                execution_sub_folder,
                script_job_id,
                queries,
                logger
            };

            await this.compressAndUploadFolder(payload);

            console.log("Finished execution.");

        } catch (error) {
            if (transaction_started) {
                await connection.rollbackAsync();
                transaction_started = false;
            }
            if (connection) {
                await db.closeConnection(connection);
            }
            logger.cLog("error occurred while execution", error);

            let payload = {
                data_count_for_each_query,
                execution_folder,
                execution_sub_folder,
                script_job_id,
                queries,
                logger,
            };

            await this.compressAndUploadFolder(payload);
            e.th(400, error);
        }
    },

    async compressAndUploadFolder(params = {}) {
        let { data_count_for_each_query, execution_folder, execution_sub_folder, script_job_id, queries, logger } = params;

        logger.cLog("Doing compressAndUploadFolder");

        if (Object.keys(data_count_for_each_query)?.length > 0)
            await fh.writeDataInFile(data_count_for_each_query, execution_folder, { fileName: 'COUNT.txt' });

        let formatted_queries_string = ScriptsUtils.formateQueriesArray(queries);
        await fh.writeDataInFile(formatted_queries_string, execution_folder, { fileName: 'queries.sql' });

        let zip_folder_path = await archive.compressFolderToZip(execution_folder, execution_sub_folder, { output_zip_folder: ARCHIVE_FOLDER });

        // delete the folders from "execution_folders" generated locally
        await fh.deleteFolderRecursive(execution_folder);

        let zip_file_name = path.basename(zip_folder_path);

        await s3.uploadToS3(zip_file_name, zip_folder_path);

        let pre_signed_url = s3.getSignedUrl(zip_file_name);

        await db.updateScriptJob(script_job_id, { download_link: pre_signed_url });

        // delete the zip file inside the "archive-folder" generated locally
        await fh.deleteFile(zip_folder_path);

        console.log("DONE compressAndUploadFolder");

    },
};


module.exports = execute_scripts;

const excel = require("./excel");
const e = require('../error_handler');
const db = require('../db_handler');
const fh = require('./file_handler');
const archive = require('./archive.js');
const queue = require('../queue');
const ScriptsUtils = require('./utils.js');
const s3 = require('./s3.js');
const Logger = require('../../classes/logger.js');