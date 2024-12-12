const fs = require('fs');
const archiver = require('archiver');

const ARCHIVE_FOLDER = __dirname + '/../../archive-folders';

let archive = {
    async compressFolderToZip(source_folder, output_zip_file_name, params = {}) {
        let { output_zip_folder = ARCHIVE_FOLDER } = params;

        try {
            console.log("IN THE ARCHIVE FUNC");

            this.validateFolders(source_folder, output_zip_file_name);

            let output_dir = output_zip_folder;

            if (!fs.existsSync(output_dir)) {
                fs.mkdirSync(output_dir, { recursive: true });
            }

            output_dir = `${output_dir}/${output_zip_file_name}.zip`

            console.log("ARCHIVER DECLARED");

            await this.zipDirectory(source_folder, output_dir);

            return output_dir;

        } catch (error) {
            console.log("error in archiver", error);
            throw error;
            //e.th(400, error);
        }
    },

    zipDirectory(sourceDir, outPath) {
        const zip_archive = archiver('zip', { zlib: { level: 9 } });
        const stream = fs.createWriteStream(outPath);

        return new Promise((resolve, reject) => {
            zip_archive
                .directory(sourceDir, false)
                .on('error', err => reject(err))
                .on('end', () => {
                    console.log('ZIP file created successfully.');
                })
                .pipe(stream)
                ;

            stream.on('close', () => resolve());
            zip_archive.finalize();
        });
    },

    validateFolders(source_folder, output_zip_file_name) {
        if (output_zip_file_name === '') {
            console.log("Zip Destination File Name cannot be empty");
            e.th(400, "Zip Destination File Name cannot be empty");
        }

        if (!fs.existsSync(source_folder)) {
            console.log("Folder to Zip does not exist");
            e.th(404, "Folder to Zip does not exist");
        }

    }
};


module.exports = archive
const e = require('../error_handler');