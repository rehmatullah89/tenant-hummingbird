const fs = require('fs').promises;
const path = require("path");

let file_handler = {

    async readDataFormSqlFile(file_path, date_replace_params = {}) {
        let variables_to_replace = Object.keys(date_replace_params) || [];
        let sql_file_data;
        try {
            // Read the SQL file
            sql_file_data = await fs.readFile(file_path, 'utf8');

        } catch (error) {
            console.log("Reading file error", error);
            e.th(400, "Error occurred while reading the file");
        }

        //console.log("SQL DATA BEFORE", sql_file_data);

        // replacing the specific date variables with actual values in the query string
        if (variables_to_replace.length > 0) {
            variables_to_replace.forEach(variable => {
                let var_regex = new RegExp(variable, 'g');
                sql_file_data = sql_file_data.replace(var_regex, date_replace_params[variable])
            });
        }

        //console.log("SQL DATA AFTER", sql_file_data);

        // Remove commented lines from the SQL content
        sql_file_data = sql_file_data
            .split('\n')
            .filter((line) => !line.trim().startsWith('--') && !line.trim().startsWith('/*'))
            .join(' ');

        if (sql_file_data?.length === 0) return [];

        // Split the file content into separate queries
        const queries = sql_file_data.split(';');

        // Remove empty queries
        const filtered_queries = queries.filter((query) => query.trim() !== '');

        return filtered_queries;

    },

    async writeDataInFile(data, folder_name, params = {}) {
        let { fileName = 'file.txt' } = params;

        if (typeof data !== 'string') data = JSON.stringify(data, null, 4);

        try {
            if (folder_name) {
                await fs.mkdir(folder_name, { recursive: true });
                fileName = `${folder_name}/${fileName}`;
            }

            await fs.writeFile(fileName, data);
            console.log(`Data Written to file '${fileName}'`);

        } catch (error) {
            e.th(400, `Error while writing to file or making a folder: ${error}`);
        }

    },

    async copyAndPasteFile(source_folder_name, destination_folder_name, file_name) {
        // read sql data from "queries_file_path" and write it at "write_folder_name"
        if (file_name)
            destination_folder_name = `${destination_folder_name}/${file_name}`;

        try {
            let file_data = await fs.readFile(source_folder_name, 'utf8');

            await fs.writeFile(destination_folder_name, file_data, 'utf8');

            console.log("\'Queries\' file copied successfully")

        } catch (error) {
            console.error('Error occurred while copying file:', error);
            e.th(400, `Error occurred while copying file: ${error}`);
        }
    },

    async deleteFile(file_path) {
        if (file_path === '' || !file_path)
            e.th(404, "File to delete does not exists.");

        try {
            await fs.unlink(file_path);
            console.log(`File ${file_path} has been deleted.`);
        } catch (error) {
            console.error(`Error deleting the file: ${error.message}`);
            e.th(400, `Error deleting the file: ${error.message}`);
        }
    },

    async deleteFolderRecursive(folder_path) {
        try {
            const entries = await fs.readdir(folder_path);
            for (const entry of entries) {
                const entry_path = path.join(folder_path, entry);
                const entry_state = await fs.lstat(entry_path);

                if (entry_state.isDirectory()) {
                    await this.deleteFolderRecursive(entry_path);
                } else {
                    await fs.unlink(entry_path);
                }
            }

            // Delete the empty folder after its contents are removed
            await fs.rmdir(folder_path);
            console.log(`Folder ${folder_path} has been deleted.`);
        } catch (error) {
            console.error(`Error deleting the folder: ${error.message}`);
            e.th(400, `Error deleting the folder: ${error.message}`);
        }
    }
}


module.exports = file_handler;
const e = require('../error_handler');