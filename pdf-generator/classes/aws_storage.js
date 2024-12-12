var fs = require('fs');
var AWS = require("aws-sdk");
var e = require(__dirname + '/../modules/error_handler.js');

module.exports = {
    async fileExists(filename) {
        let aws_params = {
            Bucket: process.env.AWS_BUCKET_NAME,
            Key: filename
        };
        let s3Promise = new AWS.S3().headObject(aws_params).promise();
        let r = await s3Promise.catch(err => {
            if (err.statusCode === 404) {
                console.log("File not found on S3")
                return false;
            } else {
                e.th(500, err);
            }

        });
        if (r) return true;
    },
    async upload(filename, file) {
        let params = {
            params: {
                Bucket: process.env.AWS_BUCKET_NAME,
                Key: filename,
                Body: fs.createReadStream(file),
            }
        };
        var upload = new AWS.S3.ManagedUpload(params);
        let promise = upload.promise();
        try {
            var response = await promise;
            return response;
        } catch (err) {
            if (err.statusCode === 404) e.th(404, "Upload failed: File not found");
            e.th(500, err);
        }
    },
    async download(file, name) {
        let s3 = new AWS.S3();
        let ws = fs.createWriteStream(file);
        let aws_params = {
            Bucket: process.env.AWS_BUCKET_NAME,
            Key: name
        };
        let rs = s3.getObject(aws_params).createReadStream();
        return new Promise((resolve, reject) => {
                rs.on('error', (error) => {
                    console.log('reject')
                    reject(error);
                });
                ws.on('close', function() {
                    console.log('writestream close');
                    resolve(true);
                });
                rs.pipe(ws);
        });
    }
}