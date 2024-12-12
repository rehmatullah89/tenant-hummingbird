const AWS = require("aws-sdk");
var Promise = require('bluebird');
var fs = Promise.promisifyAll(require('fs'));
if (process.env.NODE_ENV === 'local') {
    AWS.config.update({
        region: process.env.AWS_REGION,
        endpoint: 'https://s3.amazonaws.com'
    });
}

let s3_handler = {

    createS3Instance() {
        const s3 = new AWS.S3({
            endpoint: 'https://s3.amazonaws.com',
            region: process.env.AWS_REGION
        });

        return s3;
    },
    async uploadToS3(file_name, file_location, params = {}) {

        let s3 = this.createS3Instance();

        let upload_params = {
            params: {
                Bucket: this.getBucketName(),
                Key: file_name,
                Body: fs.createReadStream(file_location),
            },
            service: s3
        };


        var upload = new AWS.S3.ManagedUpload(upload_params);
        let s3_promise = upload.promise();
        try {
            var response = await s3_promise;
            console.log("Zip folder has been uploaded to S3");
            return response;
        } catch (err) {
            console.log("Err while uploading to S3", err);
            e.th(404, err);
        }
    },

    getSignedUrl(key, params = {}) {
        let s3 = this.createS3Instance();

        const aws_params = {
            Bucket: this.getBucketName(),
            Key: key,
            Expires: 60 * 60,
        };

        const signed_url = s3.getSignedUrl('getObject', aws_params);

        console.log("SIGNED URL", signed_url);
        return signed_url;
    },

    async downloadFile(file_name, params = {}) {
        console.log(`downloading ${file_name} from S3`);

        let s3 = this.createS3Instance();
        let download_params = {
            Bucket: this.getBucketName(),
            Key: file_name
        };

        let s3_promise = s3.getObject(download_params).promise();

        try {
            let res = await s3_promise;
            console.log("Zip File response", res)
            console.log("Zip folder has been downloaded form S3");
            return res;
        } catch (err) {
            console.log("err", err);
            e.th(404, err);
        }
    },

    async deleteFileFromS3(key, params = {}) {
        console.log(`Deleting ${key} from S3`);

        let s3 = this.createS3Instance();
        let delete_params = {
            Bucket: this.getBucketName(),
            Key: key
        };

        let s3_promise = s3.deleteObject(delete_params).promise();
        try {
            let res = await s3_promise;
            console.log(`File ${key} has been deleted form S3`);
        } catch (err) {
            console.log("Error deleting object from S3", err);
            e.th(400, err);
        }
    },

    getBucketName() {
        let bucket_name = process.env.AWS_SCRIPT_EXECUTION_BUCKET;
        if (!bucket_name || bucket_name === '')
            return null;

        switch (process.env.NODE_ENV) {
            case 'staging':
                bucket_name += '/staging';
                break;
            case 'production':
                bucket_name += '/production';
                break;
            default:
                bucket_name += '/uat';
                break;
        }
        return bucket_name;
    }
}

module.exports = s3_handler;
const e = require("../error_handler");