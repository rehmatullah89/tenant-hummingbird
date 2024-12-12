const XLSX = require("xlsx");
const moment = require("moment");
const fs = require('fs');

let excel = {
    // data must be an array of json
    convertJsonToExcel : function (data = [], params = {}) {
        let { folder_name = undefined, rds_instance = "hummingbird-local", query_number } = params;
        let path = '', date = moment().format("YYYY-MM-DD");
    
        if (data?.length > 0) {
            // Convert JSON to XLSX sheet
            const work_book = XLSX.utils.book_new();
            let work_sheet = XLSX.utils.json_to_sheet(data);
            XLSX.utils.book_append_sheet(work_book, work_sheet, rds_instance);
    
            if (folder_name) {
                // Create a new folder
                const folderName = `${folder_name}`;
                if (!fs.existsSync(folderName)) {
                    fs.mkdirSync(folderName, { recursive: true });
                }
    
                // Save the XLSX file
                path = `${folderName}/Query#${query_number} - (${date}).xlsx`;
            } else {
                path = `Query#${query_number} - (${date}).xlsx`;
            }
    
            XLSX.writeFile(work_book, path, {
                bookType: "xlsx",
                compression: true
            });
    
            console.log("Exports generated Successfully\n");
            return path;
        } else {
            console.log("No Data found");
        }
    },
};


module.exports = excel;