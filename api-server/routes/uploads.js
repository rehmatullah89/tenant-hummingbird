var express = require('express');
var router = express.Router();
var moment = require('moment');
var Promise = require('bluebird');
var settings = require(__dirname + '/../config/settings.js');


var flash = require(__dirname + '/../modules/flash.js');
var Validation = require(__dirname + '/../modules/validation.js');


var Hash = require('../modules/hashes');
var Hashes = Hash.init();

var control = require(__dirname + '/../modules/site_control.js');
var Upload = require('../classes/upload');
var Contact = require(__dirname + '/../classes/contact.js');
var Property = require(__dirname + '/../classes/property.js');
var Lease = require(__dirname + '/../classes/lease.js')
var Unit = require(__dirname + '/../classes/unit.js');;
var Company = require(__dirname + '/../classes/company.js');
var Socket = require(__dirname + '/../classes/sockets.js');
var crypto = require('crypto');
var models = require(__dirname + '/../models');
var Schema = require(__dirname + '/../validation/uploads.js');
var request = require('request-promise');

var path = require('path');
var pdf2img = require('pdf2img');
var stages = [
  'REQUEST SIGNING',
  'CONSENT TO ELECTRONIC SIGN',
  'CONFIRM'
];

var e = require(__dirname + '/../modules/error_handler.js');
var Activity = require(__dirname + '/../classes/activity.js');
var utils = require(__dirname + '/../modules/utils.js');

var eventEmitter = require(__dirname + '/../events/index.js');

var { sendGenericEmail, leaseSigningConfirmationTemplate } = require('./../modules/mail');
var { sendSMS, signedLeaseTemaplate } = require('./../modules/sms');
const { autoFinalizeLease } = require('../modules/autofinalize');

const validUploadModels = [
  'contact',
  'document',
  'lease',
  'property',
  'submessage',
  'unit'
];

// const { promises: fs } = require("fs");
const joiValidator = require('express-joi-validation')({
  passError: true
});

const getQueue = require("../modules/queue");
const Queue = getQueue('hummingbirdQueue');

const GDS_PANDADOC_TOKEN_URI = process.env.GDS_PANDADOC_TOKEN_URI

module.exports = function (app) {


  //TODO restrict only to worker server
  /* Todo - Is this deprecated? */
  // router.post('/receive', function(req, res, next){
  //   var connection = {};
  //   var upload = '';
  //   pool.getConnectionAsync()
  //     .then(function(conn){
  //       connection = conn;
  //       upload = new Upload({id: req.body.upload_id});
  //       return upload.find(connection)
  //     })
  //     .then(() => {
  //       upload.setFile(req.files.file);
  //       return upload.save(connection);
  //     })
  //     .then(()=>{
  //       return utils.send_response(res, {
  //         status: 200
  //       });
  //     })
  //     .then(() => utils.saveTiming(connection, req, res.locals))
  //     .catch(next)
  //     .finally(() => utils.closeConnection(pool, connection))
  // })

  /* Todo - Is this deprecated? */
  router.post('/', [control.hasAccess(['admin', 'tenant']), Hash.unHash], async (req, res, next) => {


    try {

      var body = req.body;
      // HACK blacklisted foreign_id so need to manually unhash it
      //body.foreign_id = Hashes.decode(req.body.foreign_id);

      var company = res.locals.active;
      var contact = res.locals.contact;

      if (typeof req.files.file == 'undefined') e.th(400, "No files sent.");

      if (!body.model || validUploadModels.indexOf(body.model) < 0) {
        e.th(400, "Invalid or missing upload model");
      }

      if (!body.foreign_id) {
        e.th(400, "Invalid or missing foreign id");
      }

      var file = req.files.file;

      var upload = {};
      const connection = res.locals.connection;


      var nameSplit = req.files.file.path.split('/');
      var newFilename = nameSplit[1];

      var reableNameSplit = file.originalname.split('.');
      var lastVal = reableNameSplit.pop();       // Get last element

      var data = {
        filename: newFilename,
        sort: 1,
        uploaded_by: contact.id,
        upload_date: moment.utc().format('YYYY-MM-DD HH:mm:ss'),
        extension: file.extension,
        encoding: file.encoding,
        mimetype: file.mimetype,
        size: file.size,
        name: Validation.slugify(reableNameSplit.join(".")) + '.' + file.extension,
        fileloc: file.path,
        reference_number: body.reference_number
      };


      upload = new Upload(data);
      await upload.save(connection);
      await upload.find(connection)
      var activity = new Activity();
      await activity.create(connection, company.id, contact.id, 2, 50, upload.id);

      utils.send_response(res, {
        status: 200,
        data: Hash.obscure(upload, req)
      });
    } catch (err) {
      next(err);
    }
  });

  router.put('/:upload_id', [control.hasAccess(['admin']), joiValidator.body(Schema.updateUpload), Hash.unHash], async (req, res, next) => {
    var connection = res.locals.connection;

    try {
      let params = req.params;
      let body = req.body;

      let upload = new Upload({ id: params.upload_id });
      await upload.update(connection, body);

      utils.send_response(res, {
        status: 200,
        data: {
          upload: Hashes.encode(upload.id, res.locals.company_id)
        }
      });


    } catch (err) {
      next(err);
    }
  });

  //na
  /* deprecated */
  // router.get('/get-lease/:lease_id', control.hasAccess(['admin']), function(req, res, next) {
  //
  //     var lease = {};
  //     var lease_id = Hashes.decode(req.params.lease_id)[0];
  //     var count;
  //     var connection = {};
  //   var upload = {};
  //
  //     pool.getConnectionAsync().then(function (conn) {
  //         connection = conn;
  //
  //         if(!lease_id) throw "Lease not Found";
  //
  //       lease = new Lease({id: lease_id});
  //
  //       return lease.find(connection);
  //
  //     }).then(function () {
  //
  //         return models.Upload.findByForeignId(connection,  'lease',  lease_id, 'lease').then(function(uploads){
  //           return uploads[0] || null;
  //         })
  //
  //     }).then(function (u) {
  //
  //       upload = u;
  //       if(!u) return;
  //       return Promise.mapSeries(lease.Tenants, (tenant, i)=> {
  //         lease.Tenants[i].stage = null;
  //         lease.Tenants[i].signer_position = null;
  //         return models.Document.findSignsOfDocument(connection, upload.id, tenant.id).map(function(signs){
  // 	        if(stages.indexOf(signs.action) >= 0 && (!tenant.stage ||  stages.indexOf(signs.action) >  stages.indexOf(tenant.stage))) {
  // 		        lease.Tenants[i].stage = signs.action;
  // 		        if(signs.action == "REQUEST SIGNING"){
  // 			        lease.Tenants[i].signer_position = signs.order;
  // 			        lease.Tenants[i].created_at = signs.created_at;
  // 		        }
  // 	        }
  // 	        return true;
  //         })
  //       })
  //     }).then(function () {
  //       lease.Tenants.sort(function(a, b) {
  //         if(a.stage) return false;
  //         return b.stage - a.stage;
  //       });
  // 	lease.Upload = upload || {};
  //         utils.send_response(res, {
  //             status: true,
  //             data:{
  //                 lease: Hash.obscure(lease)
  //             }
  //         });
  //
  //     })
  //     .then(() => utils.saveTiming(connection, req, res.locals))
  //     .catch(next)
  //     .finally(() => utils.closeConnection(pool, connection))
  // });

  // Todo: Write tests
  router.get('/files/:model/:id/:filename', [Hash.unHash], function (req, res, next) {

    var connection = res.locals.connection;

    res.redirect(301, settings.config.protocol + '://api.' + settings.config.domain + "/v1/companies/" + Hashes.encode(connection.cid) + "/uploads/files/" + req.params.id + "/" + req.params.filename);

  });

  router.get('/files/:id/:filename', [Hash.unHash], async (req, res, next) => {

    try {
      let connection = res.locals.connection;
      let params = req.params;

      if (!params.id) e.th(404);

      let upload = new Upload({ id: params.id });
      await upload.find(connection);

      upload.setBucketNameByDestination();

      let data = await upload.download();

      console.log("data", data);

      res.writeHead(200, {
        'Content-Length': data.ContentLength,
        'Content-Type': upload.mimetype,
      });

      let buffer = data.Body

      res.end(buffer);
    } catch (err) {
      next(err);
    }
  });

  // TODO this deletes any upload.. should we have a separate endpoint for deleting tenant docs
  router.delete('/:id', [control.hasAccess(['admin', 'tenant']), control.hasPermission('delete_documents'), Hash.unHash], async (req, res, next) => {

    try {
      var connection = res.locals.connection;

      var upload_id = req.params.id;
      var upload = {};


      // TODO only allow if they uploaded it

      var company = res.locals.active;
      var contact = res.locals.contact;

      upload = new Upload({ id: upload_id });
      await upload.find(connection);
      await models.Upload.delete(connection, upload_id)
      await models.Checklist.deleteLeaseUpload(connection, upload_id)

      var activity = new Activity();
      await activity.create(connection, company.id, contact.id, 4, 50, upload.id);

      utils.send_response(res, {
        status: 200,
      })
    } catch (err) {
      next(err);
    }
  });

  // Todo: Write tests
  router.post('/set-sort', [control.hasAccess(['admin']), Hash.unHash], function (req, res, next) {
    var body = req.body;

    var company = res.locals.active;
    var contact = res.locals.contact;

    var connection = res.locals.connection;
    var promises = [];
    body.uploads.forEach(function (upload, i) {
      promises.push(models.Upload.save(connection, { sort: i }, body.upload.id)[0]);
    });
    return Promise.all(promises).then(() => {
      utils.send_response(res, {
        status: 200
      })
    })
      .catch(next)

  });


  router.get('/sign-document/:hash', [control.getAccountInfo, Hash.unHash], async (req, res, next) => {

    try {
      var connection = res.locals.connection;
      let hash = req.params.hash;
      let decipher = '';
      let decrypted = '';
      let subdomain = res.locals.subdomain;
      let uploads = [];
      try {

        decipher = crypto.createDecipher(settings.security.algorithm, settings.security.key);
        decrypted = JSON.parse(decipher.update(hash, 'hex', 'utf8') + decipher.final('utf8'));

        let method = decrypted.method;

        let sent = moment(decrypted.requested);
        let ms = moment().diff(moment(sent));
        if (ms > 1000 * 2 * 60 * 60 * 24 * 2) e.th(400, 'You followed an invalid or expired link. Please ask an adminstrator to resend the email to you.');

      } catch (err) {

        e.th(400, 'You followed an invalid or expired link. Please ask an administrator to resend the email to you.');
      }

      if (!decrypted.property_id) e.th(400, 'You followed an invalid or expired link. Please ask an administrator to resend the email to you.');
      if (!decrypted.uploads) e.th(400, 'You followed an invalid or expired link. Please ask an administrator to resend the email to you.');
      if (!decrypted.contact_id) e.th(400, 'You followed an invalid or expired link. Please ask an administrator to resend the email to you.');
      let company = await models.Company.findBySubdomain(connection, subdomain);


      console.log("decrypted.uploads", decrypted.uploads)

      for (let i = 0; i < decrypted.uploads.length; i++) {
        let upload = new Upload({ id: decrypted.uploads[i] });
        await upload.find(connection);
        await upload.findSigners(connection);
        console.log("the upload", upload)
        // await upload.findLease(connection);

        upload.fileloc = process.env.BASE_PATH + utils.slugify(upload.name) + '.pdf';
        uploads.push(upload);
      }

      let contact = new Contact({ id: decrypted.contact_id });
      await contact.find(connection);

        // TODO validate contact is the signer
        let return_data = {
          uploads:  Hash.obscure(uploads, req),
          contact: Hash.obscure(contact, req),
          property_id: Hashes.encode(decrypted.property_id, res.locals.company_id),
          appId: decrypted.appId || ""
        }

      if ('remote' in decrypted) {
        return_data['remote'] = decrypted.remote;
        return_data['unit_id'] = Hashes.encode(decrypted.unit_id, res.locals.company_id);
      }

      console.log("uploads", uploads)
      utils.send_response(res, {
        status: 200,
        data: return_data
      });


      let admins = await Contact.findAdminsByPropertyId(connection, company.id, decrypted.property_id);

      for (let i = 0; i < admins.length; i++) {


        let socket = new Socket({
          company_id: company.id,
          contact_id: admins[i].contact_id,
        });

        for (let i = 0; i < uploads.length; i++) {
          console.log(uploads[i]);
          try {
            await socket.createEvent("pandadoc_generation_update", Hash.obscure({
              lease_id: uploads[i].lease_id,
              document_id: uploads[i].foreign_id,
              status: 'initiated',
              completed: false,
              Upload: {
                id: uploads[i].id,
                src: uploads[i].src,
                name: uploads[i].name,
                upload_date: uploads[i].upload_date,
                filename: uploads[i].filename,
                mimetype: uploads[i].mimetype,
                signers: uploads[i].signers.map(s => {
                  return {
                    id: s.id,
                    email: s.email,
                    signed: s.signed,
                    status: s.status,
                    Contact: {
                      first: s.Contact.first,
                      last: s.Contact.last,
                      Phones: s.Contact.Phones
                    }
                  }
                })
              },
            }, req), 'initiated');
          } catch (err) {

          }
        }
      }





    } catch (err) {
      next(err);
    }



  });

  router.get('/:upload_id/download', [control.hasAccess(['admin']), Hash.unHash], async (req, res, next) => {
    
    try {

      let connection = res.locals.connection;
      let contact = res.locals.contact
      let company = res.locals.active;
      let params = req.params;

      if (!params.upload_id) e.th(404);

      let upload = new Upload({ id: params.upload_id });

      await upload.find(connection);

      let file = await upload.download(company);

      if(!file){
        throw new Error(`document download failed ${upload.id}`);
      }

      utils.send_response(res, {
        status: 200,
        data: {
          file: file,
          name: upload.filename,
          mimetype: upload.mimetype,
        }
      });

    } catch (err) {
      console.log(err);
      next(err);
    }
  });

  router.put('/:upload_id/download', [control.hasAccess(['admin']), Hash.unHash], async (req, res, next) => {
    
    try {

      let connection = res.locals.connection;
      let contact = res.locals.contact
      let company = res.locals.active;
      let {setDestination} = req.query;
      let params = req.params;

      if (!params.upload_id) e.th(404);

      let upload = new Upload({ id: params.upload_id });

      await upload.find(connection);

      if(setDestination){
        upload.setBucketNameByDestination();
      }

      let file = await upload.download(company);

      if(!file){
        throw new Error(`document download failed ${upload.id}`);
      }

      // update last downloaded info
      let last_downloaded = moment().utc().format('YYYY-MM-DD HH:mm:ss');
      upload.last_downloaded = last_downloaded;
      upload.last_downloaded_by = contact.id;

      await upload.update(connection,{last_downloaded_by: contact.id, last_downloaded});

      utils.send_response(res, {
        status: 200,
        data: {
          file: file,
          name: upload.filename,
          mimetype: upload.mimetype,
          last_downloaded: last_downloaded,
          last_downloaded_by: {
            id: Hashes.encode(contact.id, company.id),
            first_name: contact.first,
            last_name: contact.last
          }
        }
      });


    } catch (err) {
      console.log(err);
      next(err);
    }
  });

  router.post('/panda-docs/:upload_id/session', [control.getAccountInfo, Hash.unHash], async (req, res, next) => {
    var connection = res.locals.connection;
    try {

      let contact = res.locals.contact;
      let company = new Company({ subdomain: res.locals.subdomain });
      await company.findBySubdomain(connection);
      let query = req.query;
      let body = req.body;


      let params = req.params;

      let upload = new Upload({ id: params.upload_id });
      await upload.find(connection);
      let session = await upload.getSession(connection, company, body.signer_id);
      utils.send_response(res, {
        status: 200,
        data: {
          session_id: session
        }
      });

    } catch (err) {
      next(err);
    }
  });

  router.get('/panda-docs/:upload_id/:filename', [Hash.unHash], async (req, res, next) => {
    var connection = res.locals.connection;
    try {

      let contact = res.locals.contact;
      let company;

      let params = req.params;
      let upload = new Upload({ id: params.upload_id });
      await upload.find(connection);

      upload.fileloc = process.env.BASE_PATH + utils.slugify(upload.name) + '.pdf';
      try {
        await upload.findLease(connection);
        await upload.Lease.getProperty(connection);

        company = new Company({ id: upload.Lease.Property.company_id });
      } catch (err) {
        // check contact
      }

      if (!company) e.th(404, "Not found");
      await company.find(connection);
      await upload.downloadPandaDoc(company);
      // var readStream = fs.createReadStream(path);
      // var stat = fs.statSync(path);
      // res.setHeader('Content-Length', stat.size);
      //res.setHeader( 'Content-Disposition', 'attachment; filename=' + utils.slugify(upload.name) + '.pdf' );
      res.setHeader('content-type', 'application/pdf');
      res.sendFile(path);

    } catch (err) {
      next(err);
    }


  });

  router.put('/panda-docs/:foreign_id/signed', [control.getAccountInfo, Hash.unHash], async (req, res, next) => {

    var connection = res.locals.connection;

    try {
      //let contact = res.locals.contact;

      let company = new Company({ subdomain: res.locals.subdomain });
      await company.findBySubdomain(connection);

      let query = req.query;
      let body = req.body;
      const appId = body.appId || "";
      console.log("body", body);
      if ('remote' in body && body.remote && !('unit_id' in body)) e.th(400, "unit_id is required in body");

      let property = new Property({ id: body.property_id });
      property.find(connection);
      let params = req.params;
      console.log("params", params);


      let upload = new Upload({ foreign_id: req.params.foreign_id });
      await upload.find(connection);
      console.log("upload", upload);



      let signer = await upload.findSigner(connection, company.id, body.signer_id);

      console.log("signer", signer);

      let signer_contact = new Contact({ id: signer.contact_id });
      await signer_contact.find(connection);
      await signer_contact.getPhones(connection);
      signer.Contact = signer_contact;

      signer.signed = moment().toDate();

      console.log("signer", signer);

      let checklist_item = await upload.updateChecklistItem(connection);
      await upload.saveUploadSigner(connection, signer);

      // Create job to download document and upload it to s3
      await upload.setDownloading(connection);

      await Queue.add('download_signed_pandadoc', {
        priority: 1,
        cid: res.locals.company_id,
        checklist_id: checklist_item ? checklist_item.id : null,
        lease_id: upload.lease_id,
        upload_id: upload.id,
        company_id: company.id,
        retries: 1,
        property_id: body.property_id
      }, { priority: 1 });

      let data = {
        checklist_id: checklist_item ? checklist_item.id : null,
        lease_id: upload.lease_id,
        document_id: upload.document_id,
        status: 'complete',
        completed: true,
        Upload: {
          id: upload.id,
          src: upload.src,
          name: upload.name,
          upload_date: upload.upload_date,
          filename: upload.filename,
          mimetype: upload.mimetype,
          signers: [{
            id: signer.id,
            email: signer.email,
            signed: signer.signed,
            status: signer.status,
            Contact: {
              first: signer.Contact.first,
              last: signer.Contact.last,
              Phones: signer.Contact.Phones
            }
          }]
        }
      }

      let admins = await Contact.findAdminsByPropertyId(connection, company.id, body.property_id);

      for (let i = 0; i < admins.length; i++) {

        let socket = new Socket({
          company_id: company.id,
          contact_id: admins[i].contact_id,
        });

        try {
          await socket.createEvent("pandadoc_generation_update", Hash.obscure(data, req));
        } catch (err) {
          console.log(err);
        }
      }

      utils.send_response(res, {
        status: 200,
        data: Hash.obscure(data, req),
      });

        eventEmitter.emit('document_signed', { company, upload, property, cid: res.locals.company_id, company_id: company.id, lease_id: checklist_item?.lease_id, locals: res.locals, contact_id: signer.contact_id, checklist: checklist_item, signedTime: signer.signed });
        if (appId) {
          // auto finalize lease only if the document sign link is sent by an integration
          autoFinalizeLease({ lease_id: checklist_item?.lease_id, cid: res.locals.company_id });
        };

        if ('remote' in body && body.remote) {
          let name = `${signer.Contact.first} ${signer.Contact.last}`;
          let propertyName = property.name;

        let unit = new Unit({ id: body.unit_id });
        await unit.find(connection);
        await unit.getAddress(connection);

        let unitNumber = unit.number;
        let facilityAddress = `${property.Address.address} ${property.Address.city}, ${property.Address.state} ${property.Address.zip}`;

        await property.getPhones(connection);
        let facilityPhone = `${property.Phones[0].phone}`;

        let subject = "Lease Confirmation";

        if (!(signer_contact.email == null)) {
          let htmlTemplate = leaseSigningConfirmationTemplate(name, propertyName, unitNumber, facilityAddress, facilityPhone);
          await sendGenericEmail(connection, name, signer.email, signer.contact_id, null, subject, htmlTemplate, company.gds_owner_id, property.gds_id);
        }

        if (signer_contact.Phones.length) {
          let smsTemplate = signedLeaseTemaplate(name, unitNumber, propertyName, facilityAddress, facilityPhone);
          let contactPhone = signer_contact.Phones[0].phone;

          await sendSMS(contactPhone, smsTemplate, undefined, company.gds_owner_id, property.gds_id);
        }

      }
    } catch (err) {
      next(err);
    }


  });


  return router;
};
