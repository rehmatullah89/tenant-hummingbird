const AWS = require("aws-sdk");

const MAX_S3_FILE_UPLOAD_CHECK_RETRIES = 5;

var GenerateReportsRoutine = {

  async generateReportsForRecipients(data) {

    let payload = {};
    try {
      var connection = await db.getConnectionByType('write', data.cid);

      //send to s3 
      let company_data = await models.Company.findById(connection, data.company_id);

      var GDS_FILE_APP_ID = process.env.GDS_FILE_APP_ID;
      var file_upload_url =  `${settings.get_gds_url()}applications/${GDS_FILE_APP_ID}/v1/owners/${company_data.gds_owner_id}/files/`;
      var file_upload_options = {
        headers: {
          'X-storageapi-key': process.env.GDS_API_KEY,
          'X-storageapi-date': moment().format('x'),
          "Content-Type": "application/json"
        },
        uri: file_upload_url,
        json: true,
        method: 'POST'
      };
      console.log(file_upload_url,'file_upload_url');

      let reports_with_docid = [];
      let property_info = [];
      let batch_payload_S3 =[];

      await Promise.all(data.properties.map(async property => {
        let pid = Hashes.decode(property)[0];
        console.log(pid, 'pid');
        let property_data = await models.Property.findById(connection, pid);
        property_info.push({
          property_id: property,
          property_name: property_data.name,
          property_number: property_data.number,
          facility_id: property_data.gds_id
        });
      }))

      //generating payload for batch upload api
      for(const report_original of data.reports){

        let route = "";
        if (report_original.format == 'xlsx' && report_original.filters)
          route = "generate-report-share"
        else if (report_original.format == 'xlsx' && !report_original.filters)
          route = 'download-xlsx-report-share';
        else
          route = 'download-pdf-report-share';

        if(report_original.multiple_properties){
          let file_name = (report_original.name +'-'+ company_data.name).replace(/\s/g, '');
          batch_payload_S3.push(GenerateReportsRoutine.getBatchPayload(route, file_name));
        } else {
          for(const property_id of data.properties){
            property_data = property_info.find(p => p.property_id == property_id)
            let file_name = (report_original.name +'-'+ property_data.property_number+'-'+property_data.property_name).replace(/\s/g, '');
            batch_payload_S3.push(GenerateReportsRoutine.getBatchPayload(route, file_name));
          }
        }

      }
 
      file_upload_options.body = batch_payload_S3;

      console.log(file_upload_options, 'file_upload_options');

      //all files pushed at once without actual file data
      let upload_batch_response = batch_payload_S3.length && await rp(file_upload_options); 
      let upload_batch_response_data  = upload_batch_response.applicationData[GDS_FILE_APP_ID][0].data;
      console.log("Upload to S3 URL", upload_batch_response_data);
      
      let index = 0;

       // uploading buffer data to s3 individually
      for(const report_original of data.reports){

        if(report_original.multiple_properties){
          let report = report_original;
          report = {
            ...report,
            ...(!report.filters && { property_ids: data.properties }),// if static
            ...(report.filters && { properties: [property_id] }) // if dynamic
          }

          let file_name = (report_original.name +'-'+ company_data.name).replace(/\s/g, '');
          let upload_info = upload_batch_response_data[index];

          if(!(upload_info.name.includes(file_name) && (upload_info.name == batch_payload_S3[index].file_name )))  e.th(500,'Upload failed');

          let result = await GenerateReportsRoutine.generateAndUploadFile(connection, report, upload_info);
          reports_with_docid.push(result);
          
          index++;
        } else {
          for(const property_id of data.properties){
            let report = report_original;
            report = {
              ...report,
              ...(!report.filters && { property_id: property_id }),// if static
              ...(report.filters && { properties: [property_id] }) // if dynamic
            }
  
            let property_data = property_info.find(p => {
              return p.property_id == property_id;
            })
  
            let file_name = (report.name +'-'+ property_data.property_number+'-'+property_data.property_name).replace(/\s/g, '');
            let upload_info = upload_batch_response_data[index];
  
            if(!(upload_info.name.includes(file_name) && (upload_info.name == batch_payload_S3[index].file_name )))  e.th(500,'Upload failed');

            let result = await GenerateReportsRoutine.generateAndUploadFile(connection, report, upload_info);
            reports_with_docid.push(result);
            
            index++;
          }
        }
      }
        
      utils.sendLogs({
        event_name: ENUMS.LOGGING.GENERATE_SHARE_REPORTS,
        logs: {
          payload: data,
        }
      });

      return { reports_with_docid, property_info };

    } catch(err) {
      console.log('Error in generateReportsForRecipients');
      console.log("---ERROR----");
      console.log(err);
      utils.sendLogs({
        event_name: payload.event_name || ENUMS.LOGGING.SHARE_REPORT,
        logs: {
          payload: data,
          error: err?.stack || err?.msg || err
        }
      });

      throw err;
    } finally {
      await utils.closeConnection(pool, connection);
    }
  },

  async generateAndUploadFile(connection, report, upload_info) {

    const base_url = `http://${process.env.API_SERVICE_NAME}:${process.env.API_SERVICE_PORT}/v1/companies/${Hashes.encode(connection.cid)}/reports/`;
    console.log(base_url,':base_url');

    let route = "";
    if (report.format == 'xlsx' && report.filters)
      route = "generate-report-share"
    else if (report.format == 'xlsx' && !report.filters)
      route = 'download-xlsx-report-share';
    else
      route = 'download-pdf-report-share';

    var options = {
      headers: {
        "x-tenant-api-token": process.env.SHARING_REPORT_AUTH_TOKEN||"aslfkjaoiwrowlois9aslfkjalfkjsaeo" 
      },
      json: true,
      method: 'POST'
    };
    options.uri = base_url + route;
    options.body = report;

    let uploadToS3 ={
      'method': 'POST',
      'url':upload_info.upload_url,
      'headers': {
        'X-storageapi-key': process.env.GDS_API_KEY,
        'X-storageapi-date':  moment().format('x'),
        'Content-Type': 'application/json'
      },
      formData: {
        'key': upload_info.upload_fields.key,
        'AWSAccessKeyId':  upload_info.upload_fields.AWSAccessKeyId,
        'policy': upload_info.upload_fields.policy,
        'signature': upload_info.upload_fields.signature,
      }
    }

    if (route == "download-pdf-report-share") {
      options.body.generate_pdf_payload = true;

      let pdf_payload = await rp(options);    //download pdf api

      if(report.filters && pdf_payload.data.report_data && pdf_payload.data.report_data.report_dates)
      {
        report.notify_start = pdf_payload.data.report_data.report_dates.start || pdf_payload.data.report_data.report_dates.end;
        report.notify_end = pdf_payload.data.report_data.report_dates.end;
      }
      else{
        report.notify_start = pdf_payload.data.body.date;
        report.notify_end = pdf_payload.data.body.end_date;
      
      }

      let file = await Report.generatePDF(pdf_payload.data);
      let buffer_file = Buffer.from(file.data)

      uploadToS3.formData['Content-Type'] = 'application/pdf';
      uploadToS3.formData['file'] = {
        'value': buffer_file,
        options: {}
      };
  
    }
    else if (route == "generate-report-share" || route == "download-xlsx-report-share") {

      let file = await rp(options);

      if(report.filters && file.report_data && file.report_data.report_dates)
      {
        report.notify_start = file.report_data.report_dates.start || file.report_data.report_dates.end;
        report.notify_end = file.report_data.report_dates.end;
      }
      else{
        report.notify_start = file.body.date;
        report.notify_end = file.body.end_date;
      
      }

      let buffer_file = Buffer.from(file.data)

      uploadToS3.formData['Content-Type'] = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
      uploadToS3.formData['file'] = {
        'value': buffer_file,
        options: {}
      };
        
    }
    // search this using "owner_id"
    console.log("payload upload to S3", uploadToS3);

    await GenerateReportsRoutine.uploadToS3(uploadToS3);
    report.docid = upload_info.id;

    return report;

  },

  async uploadToS3(payload) {
    try {
      await rp(payload);
    }catch(err) {
      console.log('uploadToS3 error:', err);
      if(err && err.statusCode == 503) {
        let bucket = payload.url?.trim().split('/').pop();
        let key = payload.formData.key;
        await GenerateReportsRoutine.checkFileExistsS3(bucket, key);
        return;
      }
      throw err;
    }
  },

  async checkFileExistsS3(bucket, key, retryCount=0) {
    await new Promise((resolve) => setTimeout(resolve, Math.pow(2, retryCount) * 5000));
    retryCount++;
    let awsParams = {
      Bucket: bucket,
      Key: key
    }
    console.log('aws s3 params:', awsParams);
    let s3Promise = new AWS.S3({
      endpoint: 'https://s3.amazonaws.com',
      region: process.env.AWS_REGION
    }).headObject(awsParams).promise();

    try {
      let data = await s3Promise;
      console.log('checkFileExistsS3 sucess:', data);
      console.log('retry count:', retryCount)
      return true
    }catch(err) {
      console.log('checkFileExistsS3 error:', err);
      console.log('retry count:', retryCount)
      if(retryCount < MAX_S3_FILE_UPLOAD_CHECK_RETRIES){
        return await GenerateReportsRoutine.checkFileExistsS3(bucket, key, retryCount);
      }
      throw err;
    }
  },

  getBatchPayload(route, file_name) {
    if (route == "download-pdf-report-share") {
      return ( 
        {
            "file_name": file_name + ".pdf",
            "description": "",
            "file_type": "report",
            "content_type": "application/pdf"
        }
      );             
    }
    else if (route == "generate-report-share" || route == "download-xlsx-report-share") {
      return (
        {
            "file_name": file_name + ".xlsx",
            "description": "",
            "file_type": "report",
            "content_type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        }
      );
    }
  }
}


module.exports = GenerateReportsRoutine;

var moment = require('moment');
var Company = require(__dirname + '/../classes/company.js');
var Report = require(__dirname + '/../classes/report.js');
var Promise = require('bluebird');
var Mail = require(__dirname + '/../modules/mail.js');
const Socket = require(__dirname + '/../classes/sockets.js');
var rp = require('request-promise');
const { forEach } = require('traverse');
var e = require(__dirname + '/../modules/error_handler.js');
var db = require(__dirname + '/../modules/db_handler.js');
var models = require(__dirname + '/../models/index.js');
var Hash = require(__dirname + '/../modules/hashes.js');
var Hashes = Hash.init();
var settings    = require(__dirname + '/../config/settings.js');
var pool = require(__dirname + "/../modules/db.js");
var utils = require(__dirname + "/../modules/utils.js");
const ENUMS = require('../modules/enums');