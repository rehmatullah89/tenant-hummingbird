var express = require('express');
var router = express.Router();
const retry = require('async-retry');
var settings    = require(__dirname + '/../config/settings.js');
var control    = require(__dirname + '/../modules/site_control.js');
var Hash = require(__dirname + '/../modules/hashes.js');
var Hashes = Hash.init();
var utils    = require(__dirname + '/../modules/utils.js');

var Promise = require('bluebird');

var Upload = require(__dirname + '/../classes/upload.js');
var Contact = require(__dirname + '/../classes/contact.js');
var Company = require(__dirname + '/../classes/company.js');

var models = require(__dirname + '/../models');
var fs = require("fs");
var mime = require('mime');
var path = require("path");

var pdf = require('html-pdf');
var e  = require(__dirname + '/../modules/error_handler.js');

var Guides = require(__dirname + '/../uploads/guides');


Promise.promisifyAll(fs);
Promise.promisifyAll(pdf);


module.exports = function() {

	router.get('/', [control.hasAccess(['admin']), Hash.unHash], async (req, res, next) => {
		let connection = res.locals.connection;

		try {
			const { query } = req;
			let company = new Company({ id: res.locals.active.id });
			await company.find(connection);

			const { SIGNED, UN_SIGNED } = ENUMS.DOCUMENT_TYPES;
			const { document_type } = query;
			const { limit, offset, type, sort = 'name', sortdir = 'asc', tag, fetch_details = false, template, property_ids, should_fetch_property_details = 'true' } = query;

			let documentInstanceType = null;
			if (!document_type && !type?.length) documentInstanceType = Document;
			else if(document_type) {
				switch(document_type) {
					case SIGNED: 
						documentInstanceType = Document;
						break;
					case UN_SIGNED:
						documentInstanceType = DocumentManager;
						break;
				}
			}

			const documentFactory = new DocumentFactory({ static_instance: true, type: type?.length && type[0], instance_type: documentInstanceType });
			const document = documentFactory.createDocument();

			let documents = {};
			let searchParams = {};
			if (documentFactory.instance_type === Document) {
				searchParams = {
					count: limit || 20,
					page: offset || 1,
					sort,
					sortdir,
					tag: type?.length ? type[0]: tag 
				};
				
				if(template) {
					documents = await document.getLeaseDocuments(company, searchParams);
				} else {
					documents = await document.getDocuments(company, searchParams);
				}

				if(fetch_details) { 
					for(let i = 0; i < documents.length; i++) {
						const document = new Document({ id: documents[i].id }); 
						await document.getTemplateDetails(company);
						documents[i].type = document.Details.tags.length ? document.Details.tags[0] : null;
					}
				}
			} else {
				limit ? searchParams.count = limit : '';
				offset ? searchParams.page = offset : '';
				type?.length ? searchParams.type = type : '';

				if(property_ids?.length) {
					let properties = await Property.findInBulk(connection, property_ids);
					properties = await Property.findGDSIds(connection, properties, { update_properties_table: false });
					const propertyGdsIds = properties.map(p => {
						return p.gds_id;
					});

					propertyGdsIds?.length ? searchParams.property_gds_ids = propertyGdsIds : '';
				}
				
				documents = await document.getDocuments(connection, company, searchParams, { 
					api_info: res, 
					should_fetch_property_details: should_fetch_property_details == 'true'
				});
			}

			utils.send_response(res, {
				status: 200,
				data: {
					documents: documents
				}
			});
		} catch (err) {
			next(err);
		}
	});

	router.post('/', [control.hasAccess(['admin']), Hash.unHash], async (req, res, next) => {
		let connection = res.locals.connection;

		try {
			const company = res.locals.active;
			
			const { body, files } = req;

			let { name, type, description, Properties } = body;
			if(Properties?.length) {
				Properties = Hash.clarify(JSON.parse(Properties));
			}

			const { template } = files;			
			const document = new DocumentManager({
				Company: company,
				name: name,
				DocumentType: { name: type },
				description: description,
				template: template,
				Properties: Properties
			});

			const documentId = await document.save(connection, {
				api_info: res
			});

			utils.send_response(res, {
				status: 200,
				data: { document_id: documentId }
			});
		} catch (err) {
			next(err);
		}
	});

	router.put('/:document_id', [control.hasAccess(['admin']), Hash.unHash], async (req, res, next) => {
		let connection = res.locals.connection;

		try {
			const company = res.locals.active;
			const { body, files } = req;

			let { name, type, description, Properties } = body;
			Properties = Hash.clarify(JSON.parse(Properties));
			const { template } = files;			

			let { params } = req; 
			params = Hash.clarify(params);
			const { document_id } = params;

			const document = new DocumentManager({
				id: document_id,	 
				Company: company,
				name: name,
				DocumentType: { name: type },
				description: description,
				template: template,
				Properties: Properties
			});

			const documentId = await document.save(connection, {
				api_info: res
			});

			utils.send_response(res, {
				status: 200,
				data: { document_id: documentId }
			});
		} catch (err) {
			next(err);
		}
	});

	router.delete('/:document_id', [control.hasAccess(['admin']), Hash.unHash], async (req, res, next) => {
		try {
			let { params } = req; 
			params = Hash.clarify(params);
			let { document_id } = params;

			const document = new DocumentManager({ id: document_id });
			const documentId = await document.delete({
				api_info: res
			});

			utils.send_response(res, {
				status: 200,
				data: { document_id: documentId }
			});
		} catch (err) {
			next(err);
		}
	});

	router.get('/:document_id/download', [control.hasAccess(['admin']), Hash.unHash], async (req, res, next) => {
		try {
			const company = res.locals.active;
			let { params, query } = req; 
			const { key } = query;
			params = Hash.clarify(params);
			let { document_id } = params;

			const document = new DocumentManager({ id: document_id, key: key });
			const result = await document.download(company);

			utils.send_response(res, {
				status: 200,
				data: result
			});
		} catch (err) {
			next(err);
		}
	});

	router.get('/types', control.hasAccess(['admin']), async function(req, res, next) {
		let connection = res.locals.connection;

		try {
			let company = res.locals.active;
			let { query } = req;
			const { SIGNED, UN_SIGNED } = ENUMS.DOCUMENT_TYPES;
			const { document_type = SIGNED } = query;

			let types = '';
			switch (document_type) {
				case SIGNED:
					types = ENUMS.SIGNED_DOCUMENT_TYPES;
					break;

				case UN_SIGNED:
					/*types = [
						{ name: 'Rent Change', value: 'rent-change' },
						{ name: 'Delinquency', value: 'delinquency' },
						{ name: 'Reversal', value: 'reversal' },
						{ name: 'Other', value: 'other' }
					];*/
					types = await DocumentManager.getTypes({ api_info: res });
					break;

				default:
					types = await models.Document.findTypesByCompanyId(connection, company.id);
					break;
			}
			
			utils.send_response(res, {
				status: 200,
				data: {
					types: Hash.obscure(types, req)
				}
			});
		} catch (err) {
			next(err);
		} 

        // utils.saveTiming(connection, req, res.locals)
    });

	router.get('/:document_id/active-processes', control.hasAccess(['admin']), async function(req, res, next) {
        let connection = res.locals.connection;

		try {
			const { document_id } = req.params; 
			const { query } = req;
			const { property_ids, is_corporate } = query;
			
			const properties = [];
			
			if(property_ids?.length) {
				for(let property_id of property_ids) {
					const propertyId = Hashes.decode(property_id)[0];
					const property = new Property({ id: propertyId });
					properties.push(property);
				}
			}

			const document = new DocumentManager({
				id: document_id,
				Properties: properties	 
			});

			const result = await document.getActiveProcessesDetails(connection, { is_corporate: is_corporate });
			utils.send_response(res, {
				status: 200,
				data: result
			});
		} catch (err) {
			next(err);
		}
    });

	router.post('/generated', control.hasAccess(['doc_manager']), async function(req, res, next) {
		try {
			console.log('Generated document: ', req.body);

			var connection = res.locals.connection;
			const company = new Company({ id: res.locals.local_company_id });
			await company.find(connection);

			const { UPLOAD_DESTINATIONS } = ENUMS;
			const { data } = req.body;
			const { fileId, key } = data;
			let upload;

			/* 	Worker server adds the upload entry into db, there can be an issue if worker server has not yet inserted the entry and 
				webhook is called by document manager. Retrying makes sure that we find the upload_id. */
			await retry(
				async () => {
					console.log('Updating upload information..');
					upload = new Upload({ foreign_id: fileId });
					await upload.find(connection, { destination: UPLOAD_DESTINATIONS.DOCUMENT_MANAGER });
				}, { retries: 4 , minTimeout: 1000, randomize: false }
			);

			upload.filename = key;
			upload.setSrc(connection.cid);
			
			await connection.beginTransactionAsync();

			await upload.update(connection, { 
				filename: key,
				src: upload.src,
		        destination_file_path: `${company.gds_owner_id}/documents/${key}`
			});
			
			await connection.commitAsync();

			utils.send_response(res, {
				status: 200,
				upload_id: Hashes.encode(this.id, connection.cid)
			});
		} catch (err) {
			connection.rollbackAsync();
			next(err);
		}
    });

  /* Deprecated */
	// router.get('/types', control.hasAccess(['admin']), function(req, res, next) {
	// 	var company = res.locals.active;
  //
	// 	var connection;
	// 	pool.getConnectionAsync()
	// 		.then(function(conn) {
	// 			connection = conn;
	// 			return models.Document.findTypesByCompanyId(connection, company.id);
	// 		})
	// 		.then(function(types){
	// 			utils.send_response(res, {
	// 				status: 200,
	// 				data:{
	// 					types: Hash.obscure(types, req)
	// 				}
	// 			})
	// 		})
	// 		.then(() => utils.saveTiming(connection, req, res.locals))
	// 		.catch(next)
	// 		.finally(() => utils.closeConnection(pool, connection))
	// });
  //
  // /* Deprecated */
	// router.post('/types', [control.hasAccess(['admin']), joiValidator.body(Schema.createDocumentType)], function(req, res, next) {
  //
	// 	var company = res.locals.active;
	// 	var contact = res.locals.contact;
	// 	var body = req.body;
	// 	var type_id = '';
	// 	var connection;
  //
	// 	pool.getConnectionAsync()
	// 		.then(function(conn) {
	// 			connection = conn;
	// 			var data = {
	// 				company_id: company.id,
	// 				name: body.name
	// 			};
	// 			return models.Document.saveDocumentType(connection, data);
	// 		})
	// 		.then(document_type_id => {
  //
	// 			type_id = document_type_id;
	// 			var activity = new Activity();
	// 			return activity.create(connection, company.id, contact.id , 2, 37, type_id);
	// 		})
	// 		.then(function(){
	// 			utils.send_response(res, {
	// 				status: 200,
	// 				data:{
	// 					type_id: Hashes.encode(type_id)
	// 				}
	// 			})
	// 		})
	// 		.then(() => utils.saveTiming(connection, req, res.locals))
	// 		.catch(next)
	// 		.finally(() => utils.closeConnection(pool, connection))
	// });
  //
  // /* Deprecated */
	// router.put('/types/:document_types_id', [control.hasAccess(['admin']), joiValidator.body(Schema.createDocumentType)], function(req, res, next) {
  //
	// 	var company = res.locals.active;
	// 	var contact = res.locals.contact;
	// 	var body = req.body;
	// 	var params = req.params;
  //
	// 	var connection;
	// 	pool.getConnectionAsync()
	// 		.then(function(conn) {
	// 			connection = conn;
  //
	// 			return models.Document.findTypeById(connection, params.document_types_id);
	// 		}).then(function(document_type){
  //
	// 			if(document_type.company_id != company.id){
	// 				e.th(403, "You are not authorized to access this resource");
	// 			}
  //
	// 			var save = {
	// 				name: body.name
	// 			};
  //
	// 			return models.Document.saveDocumentType(connection, save, params.document_types_id);
	// 		})
	// 		.then(function(){
	// 			var activity = new Activity();
	// 			return activity.create(connection, company.id, contact.id , 3, 37, params.document_types_id);
	// 		})
	// 		.then(function(){
	// 			utils.send_response(res, {
	// 				status: 200,
	// 				data:{
	// 					type_id: params.document_type_id
	// 				}
	// 			})
	// 		})
	// 		.then(() => utils.saveTiming(connection, req, res.locals))
	// 		.catch(next)
	// 		.finally(() => utils.closeConnection(pool, connection))
	// });
  //
  //
  // /* Deprecated */
	// router.post('/', [control.hasAccess(['admin']), joiValidator.body(Schema.createDocument)], function(req, res, next) {
  //
	// 	var company = res.locals.active;
	// 	var contact = res.locals.contact;
	// 	var d = {};
	// 	var body = req.body;
  //
	// 	var connection;
	// 	pool.getConnectionAsync()
	// 		.then(function(conn) {
	// 			connection = conn;
	// 			var document = {
	// 				company_id: company.id,
	// 				name: body.name,
	// 				description: body.description,
	// 				unit_type: body.unit_type,
	// 				document_type_id: body.document_type_id,
	// 				status: 1,
	// 				public: body.public || 0
	// 			};
  //
	// 			d = new Document(document);
	// 			return d.save(connection);
  //
	// 		}).then(function(){
  //
  //
	// 			var activity = new Activity();
	// 			return activity.create(connection, company.id, contact.id , 2, 38, d.id);
  //
  //
	// 		}).then(function(){
  //
	// 			utils.send_response(res, {
	// 				status: 200,
	// 				data:{
	// 					document_id: Hashes.encode(d.id)
	// 				}
	// 			})
	// 		})
	// 		.then(() => utils.saveTiming(connection, req, res.locals))
	// 		.catch(next)
	// 		.finally(() => utils.closeConnection(pool, connection))
	// });
  //
  // /* Deprecated */
	// router.put('/:document_id', [control.hasAccess(['admin']), joiValidator.body(Schema.createDocument)], function(req, res, next) {
  //
	// 	var company = res.locals.active;
	// 	var contact = res.locals.contact;
	// 	var d = {};
	// 	var body = req.body;
	// 	var params = req.params;
	// 	var connection;
  //
	// 	pool.getConnectionAsync()
	// 		.then(function(conn) {
	// 			connection = conn;
	// 			d = new Document({id: params.document_id});
	// 			return d.find(connection);
	// 		})
	// 		.then(()=> d.verifyAccess(company.id))
	// 		.then(()=> d.update(body))
	// 		.then(()=> d.save(connection))
	// 		.then(() => {
  //
	// 			var activity = new Activity();
	// 			return activity.create(connection, company.id, contact.id , 3, 38, d.id);
  //
  //
	// 		})
	// 		.then(() => {
  //
	// 			console.log("DOCUMENT@@@@", d);
  //
	// 			utils.send_response(res, {
	// 				status: 200,
	// 				data:{
	// 					document_id: Hashes.encode(d.id)
	// 				}
	// 			})
	// 		})
	// 		.then(() => utils.saveTiming(connection, req, res.locals))
	// 		.catch(next)
	// 		.finally(() => utils.closeConnection(pool, connection))
  //
	// })
  //
  // /* Deprecated */
	// router.delete('/:document_id', control.hasAccess(['admin']), function(req, res, next) {
	// 	var params = req.params;
	// 	var company = res.locals.active;
	// 	var contact = res.locals.contact;
	// 	var connection;
	// 	var document;
	// 	pool.getConnectionAsync()
	// 		.then(function(conn) {
	// 			connection = conn;
	// 			document = new Document({id: params.document_id});
	// 			return document.find(connection)
	// 		})
	// 		.then(() => document.verifyAccess(company.id))
	// 		.then(() => document.delete(connection))
	// 		.then(() => {
	// 			var activity = new Activity();
	// 			return activity.create(connection, company.id, contact.id , 4, 38, document.id);
	// 		})
	// 		.then(() => {
	// 			return utils.send_response(res, {
	// 				status: 200
	// 			});
	// 		})
	// 		.then(() => utils.saveTiming(connection, req, res.locals))
	// 		.catch(next)
	// 		.finally(() => utils.closeConnection(pool, connection))
	// });

	// // No Longer In Use
	// router.post('/generate-document', control.hasAccess(['admin', 'api']), async(req, res, next) => {
  //
  //   try{
  //
  //     let company = res.locals.active;
  //     let body = req.body;
  //     var connection = res.locals.connection;
  //
  //     //move to lease, keep going!
  //
  //     let response = await Document.getTemplateDetails(company);
  //     await Document.mergeFields(connection);
  //
  //     utils.send_response(res, {
  //       status: 200,
  //       data: {
  //         documents: Hash.obscure(results)
  //       }
  //     });
  //
  //
  //
  //   } catch(err) {
  //     next(err);
  //   }
  //
  //
	// });

  // /* Deprecated */
	// router.delete('/fields/:field_id', control.hasAccess(['admin']), function(req, res, next) {
  //
	// 	var company = res.locals.active;
	// 	var contact = res.locals.contact;
	// 	var connection;
  //
	// 	var params = req.params;
  //
	// 	pool.getConnectionAsync().then(function(conn) {
	// 		connection = conn;
	// 		return models.Document.deleteField(connection, params.field_id);
	// 	}).then(function(){
	// 		var activity = new Activity();
	// 		return activity.create(connection, company.id, contact.id , 4, 39, params.field_id);
	// 	}).then(() =>{
	// 		utils.send_response(res, {
	// 			status: 200,
	// 			data:{}
	// 		})
	// 	})
	// 	.then(() => utils.saveTiming(connection, req, res.locals))
	// 	.catch(next)
	// 	.finally(() => utils.closeConnection(pool, connection))
	// });
  //
  // /* Deprecated */
	// router.post('/save-signature', control.getAccountInfo, function(req, res, next) {
  //
	//     var connection;
	//     var d = new Date();
	//     var upload = {};
  //
	//     var body = req.body;
	//     var decoded_image = '';
	//     var encoded_image = body.img.replace(/^data:image\/svg\+xml;base64,/, "");
	//     var company = {};
  //
  //
	//     var signer = '';
  //
	//     pool.getConnectionAsync().then(function(conn) {
	// 	    connection = conn;
  //
  //
	// 	    return models.Company.findBySubdomain(connection, res.locals.subdomain);
	//     }).then(c => {
  //
	// 	    company = c;
	// 	    signer = new Signer({id:  body.signer_id});
	// 	    return signer.find(connection, company.id);
  //
	//     }).then(() => {
	// 		console.log("signer", signer);
	// 	    decoded_image =  Buffer.from(encoded_image, 'base64').toString('ascii');
	// 	    return fs.writeFileAsync(settings.config.base_path + settings.img_path + body.type + "_" + d.getTime() + ".svg", encoded_image, 'base64')
  //
	//     }).then(function(result) {
  //
	// 	    upload = new Upload({
	// 		    filename: body.type + "_" + d.getTime() + ".svg",
	// 		    sort: 0,
	// 		    uploaded_by: body.signer_id,
	// 		    type: body.type + '_image',
	// 		    upload_date: moment.utc().format('YYYY-MM-DD HH:mm:ss'),
	// 		    extension: "svg",
	// 		    mimetype: "image/svg+xml",
	// 		    name: body.type + "_svg.svg",
	// 		    file_path: settings.config.base_path + settings.img_path + body.type + "_" + d.getTime() + ".svg",
	// 		    fileloc: settings.img_path + body.type + "_" + d.getTime() + ".svg"
	// 	    });
  //
	// 	    return upload.setDocumentType(connection, null, body.type + '_image', company.id)
	// 		    .then(() => upload.save(connection))
	// 		    .then(() => upload.saveUploadSigner(connection, signer.id))
	// 		    .then(() => upload.saveUploadContact(connection, signer.Contact.id))
	// 		    .then(() => upload.find(connection));
  //
	//     }).then(function() {
	// 	    var opts = {
	// 			width: "514px",
	// 			height: "320px"
	// 	    };
	//         pdf.create(decoded_image, opts).toFile(settings.config.base_path + settings.img_path + body.type + "_" + d.getTime() + ".pdf", (err, result) => {
  //
	// 			var pdfUpload = {};
  //
	// 				pdfUpload = new Upload({
	// 					// foreign_id: body.signer_id,
	// 					filename: body.type + "_" + d.getTime() + ".pdf",
	// 					// model: "signer",
	// 					sort: 0,
	// 					uploaded_by: body.signer_id,
	// 					//type: body.type + '_file',
	// 					upload_date: moment.utc().format('YYYY-MM-DD HH:mm:ss'),
	// 					extension: "pdf",
	// 					mimetype: "application/pdf",
	// 					name: body.type + "_pdf.pdf",
	// 					file_path: settings.config.base_path + settings.img_path + body.type + "_" + d.getTime() + ".pdf",
	// 					fileloc: settings.img_path + body.type + "_" + d.getTime() + ".svg"
	// 				});
  //
	// 	        return pdfUpload.setDocumentType(connection, null, body.type + '_image', company.id)
	// 			.then(() => pdfUpload.save(connection))
	// 			.then(() => pdfUpload.saveUploadSigner(connection, signer.id))
	// 			.then(() => pdfUpload.saveUploadContact(connection, signer.Contact.id))
	// 			.then(() => pdfUpload.find(connection))
	// 			.then(function() {
	// 				// Don't have access to company <- try now
	// 				var activity = new Activity();
	// 				return activity.create(connection, company.id, signer.Contact.id, 2, 39, upload.id);
	// 		    }).then(function() {
	// 			    utils.send_response(res, {
	// 				    status: 200,
	// 				    data: {
	// 					    signature: Hash.obscure(upload)
	// 				    }
	// 			    });
	// 		    })
	// 			.catch(next)
	// 			.finally(() => utils.closeConnection(pool, connection))
	// 	    });
  //
	//     })
	//     .then(() => utils.saveTiming(connection, req, res.locals))
	//     .catch(next)
	//     .finally(() => utils.closeConnection(pool, connection))
  //
	// });

  /* Todo - Is this deprecated? */
	// router.get('/sign-document/:hash', control.getAccountInfo, function(req, res, next) {
  //
	// 	var connection;
	// 	var company = {};
	// 	var decrypted = {};
	// 	var method = '';
	// 	var upload = {};
	// 	var signer = {};
	// 	var subdomain = res.locals.subdomain;
  //
	// 	pool.getConnectionAsync().then(function(conn) {
	// 		connection = conn;
	// 		var hash = req.params.hash;
	// 		try{
	// 			var decipher = crypto.createDecipher(settings.security.algorithm, settings.security.key);
	// 			decrypted = JSON.parse(decipher.update(hash, 'hex', 'utf8') + decipher.final('utf8'));
	// 			method =    decrypted.method;
	// 			var sent = moment(decrypted.requested);
	// 			var ms = moment().diff(moment(sent));
	// 			if( ms > 1000 * 2 * 60 * 60 * 24 * 2) e.th(400,  'You followed an invalid or expired link. Please ask an administrator to resend the email to you.');
	// 		} catch(err){
	// 			e.th(400,  'You followed an invalid or expired link. Please ask an administrator to resend the email to you.');
	// 		}
  //
	// 		if(!decrypted.signer_id) e.th(400,  'You followed an invalid or expired link. Please ask an administrator to resend the email to you.');
	// 		return models.Company.findBySubdomain(connection, subdomain);
  //
	// 	}).then(function(companyRes){
  //
	// 		company = companyRes;
  //
	// 		signer = new Signer({id: decrypted.signer_id});
  //
	// 		return signer.find(connection, company.id).then(() => {
  //
	// 			upload = new Upload({
	// 				id: signer.upload_id
	// 			});
  //
	// 			return upload.find(connection);
  //
	// 		}).then(signer.getSignatureFiles(connection, company.id))
	// 	})
	// 	.then(() => {
  //
	// 		utils.send_response(res, {
	// 			status: 200,
	// 			data:{
	// 				signer: Hash.obscure(signer),
	// 				upload: Hash.obscure(upload.forScreen()),
	// 				method: method
	// 			}
	// 		})
	// 	})
	// 	.then(() => utils.saveTiming(connection, req, res.locals))
	// 	.catch(next)
	// 	.finally(() => utils.closeConnection(pool, connection))
	// });

	router.post('/send-sign-link', [control.hasAccess(['admin']), Hash.unHash], async(req, res, next) => {

      try{
        var connection = res.locals.connection;
        var company = res.locals.active;
        var logged_in_user = res.locals.contact;

        var upload = {};
        var body = req.body;

        var docs = [];
        for(let i = 0; i < body.docs.length; i++){
          upload = new Upload({
            id: body.docs[i].upload_id
          });

          await upload.find(connection);
          docs.push(upload);
          // let signer = await upload.findSignerByContact(connection, company.id, body.contact_id);
          // if(signer.upload_id !== upload.id) e.th(403, "Access to this document is denied.");
        }
        body.admin_id = logged_in_user.id;
        body.appId = res.locals.appId || "";

        let contact = new Contact({id:  body.contact_id});
        await contact.find(connection);
        await contact.verifyAccess(company.id);
        await contact.getPhones(connection);

         await Upload.sendEmailForSignature(connection, contact, docs, company, true, body);

        utils.send_response(res, {
          status: 200,
          data: {}
        });


      } catch(err) {
        next(err);
      }

	});

	router.post('/get-sign-link', [control.hasAccess(['admin', 'api']), Hash.unHash], async (req, res, next) =>{


    try {

      var connection = res.locals.connection;
      var upload = {};
      var body = req.body;
      var company = res.locals.active;
      var docs = [];
      for(let i = 0; i < body.docs.length; i++){
        upload = new Upload({
          id: body.docs[i].upload_id
        });

        await upload.find(connection);
        docs.push(upload);
        // let signer = await upload.findSignerByContact(connection, company.id, body.contact_id);
        // if(signer.upload_id !== upload.id) e.th(403, "Access to this document is denied.");
      }
      console.log(body);
      let contact = new Contact({id:  body.contact_id});
      await contact.find(connection);
      await contact.verifyAccess(company.id);
      body.appId = res.locals.appId || "";


      let link = await Upload.sendEmailForSignature(connection, contact, docs, company, false, body);

      console.log("link", link);
      utils.send_response(res, {
        status: 200,
        data: {
          link: link
        }
      });



    } catch(err) {
      next(err);
    }



	});
  // /* deprecated */
	// router.post('/record-sign-action', function(req, res, next){
	// 	var connection;
  //
	// 	var upload_id = Hashes.decode(req.body.upload_id)[0];
	// 	var tenant_id = Hashes.decode(req.body.tenant_id)[0];
	// 	var created_at = req.body.created_at;
  //
	// 	pool.getConnectionAsync().then(function(conn) {
	// 		connection = conn;
  //
	// 		var logged_in_user = (res.locals.contact) ? res.locals.contact.id :  null;
  //
	// 		var signer = new Signer({
	// 			tenant_id: tenant_id,
	// 			upload_id: upload_id,
	// 			action: req.body.action,
	// 			logged_in_user:logged_in_user,
	// 			ip_address: req.ip,
	// 			created_at: created_at
	// 		});
  //
	// 		return signer.save(connection);
  //
  //
	// 	}).then(function(){
  //
	// 		utils.send_response(res, {
	// 			status: 200
	// 		})
	// 	})
	// 	.then(() => utils.saveTiming(connection, req, res.locals))
	// 	.catch(next)
	// 	.finally(() => utils.closeConnection(pool, connection))
  //
	// });

  /* deprecated */
	// router.post('/record-sign-status', control.getAccountInfo,  function(req, res, next){
	// 	var connection;
  //
	// 	var signer_id = Hashes.decode(req.body.signer_id)[0];
	// 	var created_at = req.body.created_at;
	// 	var company;
	// 	var signer;
	// 	var subdomain = res.locals.subdomain;
  //
	// 	var logged_in_user = (res.locals.contact) ? res.locals.contact.id :  null;
  //
  //
	// 	pool.getConnectionAsync().then(function(conn) {
	// 		connection = conn;
  //
	// 		return models.Company.findBySubdomain(connection, subdomain);
	// 	}).then(function(companyRes){
  //
	// 		company = companyRes;
  //
	// 		signer = new Signer({
	// 			id: signer_id
	// 		});
	// 		return signer.find(connection, company.id);
  //
	// 	}).then(function(){
	// 		return signer.saveStatus(connection, req.body.status, req.ip, logged_in_user )
  //
	// 	}).then(function(){
  //
	// 		utils.send_response(res, {
	// 			status: 200
	// 		})
	// 	})
	// 	.then(() => utils.saveTiming(connection, req, res.locals))
	// 	.catch(next)
	// 	.finally(() => utils.closeConnection(pool, connection))
  //
	// });

  /* Todo - Is this deprecated? */
	// router.post('/generate-pdf', control.getAccountInfo, function(req, res, next){
  //
	// 	// var upload = req.body.upload;
	// 	var signer_id = Hashes.decode(req.body.signer_id)[0];
	// 	var fields = req.body.fields;
	// 	var signer = {};
	// 	var upload = {};
  //
	// 	var logged_in_user = (res.locals.contact) ? res.locals.contact.id: null;
	// 	var connection = {};
	// 	var subdomain = res.locals.subdomain;
  //
	// 	var company = {};
  //
	// 	pool.getConnectionAsync().then(function(conn) {
	// 		connection = conn;
  //
	// 		return models.Company.findBySubdomain(connection, subdomain);
  //
	// 	}).then(function(companyRes){
  //
	// 		company = companyRes;
  //
	// 		signer = new Signer({id: signer_id});
	// 		return signer.find(connection, company.id)
	// 	}).then(() => {
	// 		return Promise.mapSeries(fields, f => {
	// 			return models.DocumentSign.saveAction(connection, {completed_at: f.completed_at}, Hashes.decode(f.id)[0]);
	// 		});
	// 	}).then(() => {
	// 		return models.DocumentSign.findByUploadId(connection, signer.upload_id).map(s => {
	// 			var signer = new Signer({id: s.id});
	// 			return signer.find(connection, company.id).then(() => {
	// 				return signer.getSignatureFiles(connection, company.id)
	// 			}).then(() => {
	// 				return signer;
	// 			})
	// 		})
	// 	}).then(signerRes => {
	// 		var signers = signerRes;
	// 		upload = new Upload({id: signer.upload_id});
	// 		return upload.find(connection).then(() => {
	// 			return upload.generateRevision(connection, signers);
	// 		});
  //
	// 	}).then(() => {
	// 		return signer.saveStatus(connection, 'CONFIRM', req.ip, logged_in_user);
	// 	}).then(() => {
  //
	// 		var activity = new Activity();
	// 		return activity.create(connection, company.id, signer.Contact.id, 20, 38, upload.id);
  //
	// 	}).then(() => {
	// 		utils.send_response(res, {
	// 			status: 200,
	// 			data: {}
	// 		});
  //
	// 	})
	// 	.then(() => utils.saveTiming(connection, req, res.locals))
	// 	.catch(next)
	// 	.finally(() => utils.closeConnection(pool, connection))
	// });

  /* Todo - Is this deprecated? */
	// router.get('/:document_id', control.hasAccess(['admin']), function(req, res, next) {
  //
	// 	var params = req.params;
	// 	var company = res.locals.active;
	// 	var d = {};
	// 	var connection;
  //
	// 	pool.getConnectionAsync()
	// 		.then(function(conn) {
	// 			connection = conn;
	// 			d = new Document({ id: params.document_id });
	// 			return d.find(connection);
	// 		})
	// 		.then(() => d.verifyAccess(company.id))
	// 		.then(function(){
	// 			utils.send_response(res, {
	// 				status: 200,
	// 				data:{
	// 					document: Hash.obscure(d, req)
	// 				}
	// 			})
	// 		})
	// 		.then(() => utils.saveTiming(connection, req, res.locals))
	// 		.catch(next)
	// 		.finally(() => utils.closeConnection(pool, connection))
  //
	// });
  /* Todo - Is this deprecated? */
	// router.get('/pages/:upload_id/:filename', function(req, res, next) {
  //
	// 	var params = req.params;
	// 	var file;
	// 	var connection;
  //
	// 	pool.getConnectionAsync()
	// 		.then(function(conn) {
	// 			connection = conn;
	// 			var imgsql = "Select * from pages where upload_id = " + connection.escape(params.upload_id) + " and filename = " + connection.escape(params.filename);
	// 			return connection.queryAsync(imgsql)
	// 		}).then(function(fileRes){
	// 			if(!fileRes.length){
	// 				var error = new Error("Not found");
	// 				error.code = 404;
	// 				throw error
	// 			}
	// 			file = fileRes[0];
	// 			return fs.readFileAsync(file.location);
	// 		}).then(function(contents){
  //
	// 			if(!contents){
	// 				var error = new Error("Not found");
	// 				error.code = 404;
	// 				throw error;
	// 			}
  //
	// 			res.writeHead(200, {
	// 				'Content-Length': Buffer.byteLength(contents),
	// 				'Content-Type': 'png'
	// 			});
	// 			res.end(contents);
	// 		})
	// 		.then(() => utils.saveTiming(connection, req, res.locals))
	// 		.catch(next)
	// 		.finally(() => utils.closeConnection(pool, connection))
	// });

  /* Todo - Is this deprecated? */
	// router.post('/:document_id/upload', control.hasAccess(['admin']),  function(req, res, next) {
  //   // TODO factor port if it applies
	// 	var company = res.locals.active;
	// 	var loggedInContact = res.locals.contact;
	// 	var connection = {};
  //
	// 	var params = req.params;
	// 	var body = req.body;
	// 	var files = req.files;
	// 	var document = {};
	// 	var upload = {};
  //
	// 	pool.getConnectionAsync()
	// 		.then(function(conn) {
	// 			connection = conn;
	// 			document = new Document({id: params.document_id});
	// 			return document.find(connection);
	// 		})
	// 		.then(() => document.verifyAccess(company.id))
	// 		.then(() => {
	// 			upload = new Upload();
	// 			upload.document_type_id = document.document_type_id;
	// 			upload.setFile(files.file);
	// 			upload.uploaded_by = loggedInContact.id;
	// 			return upload.save(connection)
	// 		})
	// 		.then(() => upload.makePages(connection))
	// 		.then(() => models.Document.save(connection, {upload_id: upload.id}, document.id))
	// 		.then(() => {
	// 			//TODO record activity
	// 			return true;
	// 		})
	// 		.then(() => {
	// 			utils.send_response(res, {
	// 				status: 200,
	// 				data: {
	// 					upload_id: Hashes.encode(upload.id)
	// 				},
	// 			})
	// 		})
	// 		.then(() => utils.saveTiming(connection, req, res.locals))
	// 		.catch(next)
	// 		.finally(() => utils.closeConnection(pool, connection))
  //
	// });

  /* Todo - Is this deprecated? */
	// router.post('/fields', control.hasAccess(['admin']), function(req, res, next) {
  //
	// 	var company = res.locals.active;
	// 	var contact = res.locals.contact;
	// 	var body = req.body;
	// 	var field_id = '';
  //
	// 	var connection;
	// 	pool.getConnectionAsync().then(function(conn) {
	// 		connection = conn;
	// 		var field = {
	// 			page_id: body.page_id,
	// 			x_start: req.body.x_start,
	// 			y_start: req.body.y_start,
	// 			width: req.body.width,
	// 			height: req.body.height,
	// 			signer_position: req.body.signer_position,
	// 			signer_type: req.body.signer_type ||'Tenant',
	// 			type: req.body.type,
	// 			merge_fields: JSON.stringify(req.body.merge_fields)
	// 		};
  //
	// 		return models.Document.saveField(connection, field, body.id);
	// 	}).then(field_id_res => {
	// 		field_id = field_id_res;
	// 		var activity = new Activity();
	// 		return activity.create(connection, company.id, contact.id , 2, 39, field_id);
	// 	}).then(() => {
	// 			utils.send_response(res, {
	// 				status: 200,
	// 				data:{
	// 					field_id: Hashes.encode(field_id)
	// 				}
	// 			})
	// 		})
	// 		.then(() => utils.saveTiming(connection, req, res.locals))
	// 		.catch(next)
	// 		.finally(() => utils.closeConnection(pool, connection))
	// });

	router.get('/guide/:type', [Hash.unHash], async (req, res, next) => {
		try {
			let { params } = req;

			if (!Guides[params.type]) e.th(400, "Document type not found");

			let file_name = Guides[params.type];
			let file_path = settings.config.base_path + 'uploads/guides/' + file_name;
			let file_exists_local = fs.existsSync(file_path);

			if (!file_exists_local) e.th(400, "Document does not exist");

			let data = fs.readFileSync(file_path);
			let type = mime.lookup(file_path);
			//res.sendFile(file_path);
			utils.send_response(res, {
				status: 200,
				data: {
					file_name: path.basename(file_path),
					content_type: type,
					data
				}
			});

		} catch (err) {
			next(err);
		}
	});

    return router;

};

const Document = require('../classes/document');
const DocumentManager = require('../classes/document_manager');
const DocumentFactory = require('../classes/document_factory');
const ENUMS = require('../modules/enums.js');
const Property = require('../classes/property');
