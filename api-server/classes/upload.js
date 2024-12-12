"use strict";

var models = require(__dirname + '/../models');
var settings = require(__dirname + '/../config/settings.js');
var Promise = require('bluebird');
var validator = require('validator');
var moment = require('moment');
var Validation = require(__dirname + '/../modules/validation.js');
var Scheduler = require(__dirname + '/../modules/scheduler.js');
var fs = Promise.promisifyAll(require('fs'));
var Hash = require(__dirname + '/../modules/hashes.js');
var Hashes = Hash.init();
var crypto = require('crypto');
var pdf = require('html-pdf');
var hummus = require('hummus');
var pandadocs = require(__dirname + '/../modules/pandadocs.js');
var request = require("request-promise");
var Utils = require(__dirname + '/../modules/utils.js');
var { getGDSPropertyMappingId } = require('../modules/messagebus_subscriptions');
const axios = require('axios');
const path = require('path');
//Promise.promisifyAll(fs);
Promise.promisifyAll(pdf);


var e = require(__dirname + '/../modules/error_handler.js');

var options = {
	format: 'Letter',
	border: {
		top: "0.5in",            // default is 0, units: mm, cm, in, px
		right: "0.25in",
		bottom: "0.5in",
		left: "0.25in"
	}

};

//
// var pandadocs = {
//   "access_token": "b6ff4852c69e7fd29c5d516a39e0f0c5845ef546",
//   "expires_in": 31535999,
//   "expires_at": 1598850061.085458,
//   "token_type": "Bearer",
//   "scope": [
//     "read",
//     "write",
//     "read+write"
//   ],
//   "refresh_token": "281d6a4ab71b0a28fbaee8a09116580e5f4772d8"
// }


var mimes = {
	image: [
		'image/bmp',
		'image/prs.btif',
		'image/gif',
		'image/x-icon',
		'image/ief',
		'image/jpeg',
		'image/vnd.ms-modi',
		'image/x-pict',
		'image/x-portable-anymap',
		'image/x-portable-bitmap',
		'image/x-portable-graymap',
		'image/png',
		'image/x-portable-pixmap',
		'image/svg+xml',
		'image/x-rgb',
		'image/tiff',
		'image/vnd.wap.wbmp',
		'image/webp',
		'image/x-xbitmap',
		'image/x-xwindowdump'
	],
	files: [
		//pdf
		'application/pdf',

		//word
		'application/vnd.openxmlformats-officedocument.wordprocessingml.template',
		'application/vnd.openxmlformats-officedocument.wordprocessingml.document',

		//excel
		'application/vnd.ms-excel',
		'application/vnd.ms-excel.addin.macroenabled.12',
		'application/vnd.ms-excel.sheet.binary.macroenabled.12',
		'application/vnd.ms-excel.template.macroenabled.12',
		'application/vnd.ms-excel.sheet.macroenabled.12',

		//text
		'text/csv',
		'text/html',
		'application/vnd.oasis.opendocument.text-web',
		'application/vnd.oasis.opendocument.text',
		'application/vnd.oasis.opendocument.text-master',
		'application/vnd.oasis.opendocument.text-template',
		'application/vnd.sun.xml.writer',
		'application/vnd.sun.xml.writer.global',
		'application/vnd.sun.xml.writer.template',
		'application/rtf',
		'text/richtext',
		'text/x-setext',
		'text/tab-separated-values',
		'application/tei+xml',
		'text/plain',
		'text/yaml'
	],
	document: [
		//pdf
		'application/pdf'
	]
};
var pdf2img = require('pdf2img');
var e = require(__dirname + '/../modules/error_handler.js');

var AWS = require("aws-sdk");


class Upload {

	constructor(data) {
		data = data || {};
		//	this.model = data.model || null;


		this.id = data.id || null;
		this.filename = data.filename || null;
		this.file_path = data.file_path || null;
		this.sort = data.sort || 0;
		this.document_type_id = data.document_type_id || null;
		this.uploaded_by = data.uploaded_by || null;
		this.uploaded_by_name = data.uploaded_by_name || null;
		this.generated_by_name = data.generated_by_name || null;
  
		this.type = data.type || null;
		this.upload_date = data.upload_date || null;
		this.extension = data.extension || null;
		this.encoding = data.encoding || null;
		this.mimetype = data.mimetype || null;
		this.size = data.size || 0;
		this.name = data.name || null;
		this.private = !!data.private || true;
		this.contact_id = data.contact_id || null;
		this.contact_type = data.contact_type;


		this.src = data.src || null;
		this.description = data.description || null;
		this.reference_number = data.reference_number || null;
		this.foreign_id = data.foreign_id || null;
		this.status = data.status || 1;
		this.downloading = data.downloading || 0;
		this.fileloc = data.fileloc || null;
		this.path = data.path || null;
		this.msg = '';
		this.Pages = [];
		this.Revisions = [];
		this.DocumentType = {};
		this.Leases = [];
		this.Lease = {};

		this.signers = [];
		this.cosigners = [];
		this.admin_signers = [];

		this.bucket_name = data.bucket_name || process.env.AWS_BUCKET_NAME;
		this.destination = data.destination || null;
		this.destination_file_path = data.destination_file_path || null;
		this.document = null;
		this.last_downloaded_by = data.last_downloaded_by;
		this.last_downloaded = data.last_downloaded;
        this.contentBase64 = data.contentBase64
		this.external_interaction = data.external_interaction
		return this;

	}

	static async findByEntity(connection, entity, entity_id) {
		return await models.Upload.findByEntity(connection, entity, entity_id);
	}

	setSrc(cid) {
		if (this.filename && this.id) {
			this.src = settings.config.get_base_url() + "companies/" + Hashes.encode(cid) + "/uploads/files/" + Hashes.encode(this.id, cid) + "/" + this.filename;
		}
	}

	setFile(file, src, documentName,content) {
		if (!file && !src && !content) e.th(400, 'You must either provide a file, or a reference to a file')
	
		if (file) {
			var nameSplit = file.path.split('/');
			var newFilename = nameSplit[1];
			var readableNameSplit = file.originalname.split('.');
			this.filename = newFilename;
			this.extension = file.extension;
			this.encoding = file.encoding;
			this.mimetype = file.mimetype;
			this.size = file.size;
			this.name = Validation.slugify(readableNameSplit[0]) + '.' + file.extension;
			this.fileloc = file.path;
			this.original_file = file;
			this.private = !!file.private || true;
		} else if (src) {
			this.src = src
		} else if(content){
			var newFilename = generateRandomString(32);
			var readableNameSplit = ''
			readableNameSplit = content.Name ?? content.name ?? "file"  ;
			readableNameSplit = readableNameSplit.split('.') 
			this.extension = path.extname(content.Name ?? content.name ).slice(1);
			this.filename = newFilename + '.' + this.extension;
			this.mimetype = content.ContentType ?? content.contentType ?? content.contenttype;
			this.name = Validation.slugify(readableNameSplit[0]) + '.' + this.extension;
		}
		if (documentName) {
			this.name = documentName
		}
		function generateRandomString(length) {
			const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
			const timestamp = new Date().getTime(); 
			let result = '';
			for (let i = 0; i < length; i++) {
			  const randomIndex = Math.floor(Math.random() * characters.length);
			  result  += characters.charAt(randomIndex);
			}
		  
			return result+timestamp;
		  }
	}


	validate() {

		var validMimeType = 'all';

		if (this.type == 'image' || this.type == 'floorplan') {
			validMimeType = 'image';
		} else if (this.type == 'lease' && this.model == 'lease' || (this.type == 'file' && this.model == 'document')) {
			validMimeType = 'document';
		}

		if (validMimeType == 'all') {
			return mimes['image'].indexOf(this.mimetype) || mimes['files'].indexOf(this.mimetype);
		}


		if (mimes[validMimeType].indexOf(this.mimetype) < 0) throw "This file type is not allowed";


		if (!this.fileloc) throw "No file location provided";

		return true;

	}

	async setDownloading(connection) {
		await models.Upload.save(connection, { downloading: 1 }, this.id);
	}

	async update(connection, data) {
		if (!this.id) e.th(500, 'Id not set');
		await models.Upload.save(connection, data, this.id);
	}

	async save(connection, orig_doc_id, payload = {}) {
        		const { should_upload = true } = payload;
		// if(!this.document_type_id) e.th(500, 'Document type ID not set');

		if (!this.validate()) e.th(400, "This file type is not allowed.");

		if (this.filename && this.fileloc && should_upload) {
			await this.uploadToS3();
			await this.deleteTmpFile();
		}else if(this.external_interaction){
			await this.uploadToS32(this.contentBase64)
		}


		var data = {
			filename: this.filename,
			uploaded_by: this.uploaded_by,
			file_path: this.file_path,
			document_type_id: this.document_type_id,
			upload_date: this.upload_date || moment().utc().format('YYYY-MM-DD HH:mm:ss'),
			extension: this.extension,
			mimetype: this.mimetype,
			encoding: this.encoding,
			size: this.size,
			foreign_id: this.foreign_id,
			name: this.name,
			description: this.description,
			reference_number: this.reference_number,
			private: !!this.private,
			downloading: this.downloading,
			contact_id: this.contact_id,
			contact_type: this.contact_type,
			status: this.status,
			src: this.src,
			destination: this.destination,
			destination_file_path: this.destination_file_path,
			last_downloaded_by: this.last_downloaded_by,
			last_downloaded: this.last_downloaded
		};
        
		let upload_id = await models.Upload.save(connection, data, this.id);
        
		this.id = upload_id;
		if (!this.src || this.filename) return;

		await new Promise((resolve, reject) => {
			Scheduler.addJobs([{
				category: 'fetch_document',
				data: {
					id: this.id
				}
			}], function (err) {
				if (err) return reject(err);
				return resolve();
			});
		})
	}

	async sendDocument(company) {

		try {
			let response = await pandadocs.sendDocument(this.foreign_id, company);
		} catch (err) {
			console.log(err);
		}
		// if(!response) {
		//   e.th(500, "Could not get a response from Panda Docs")
		// }

		// let URI = 'https://api.pandadoc.com/public/v1/documents/' + this.foreign_id + '/send';
		// let respose = await request({
		//   headers: {
		//     Authorization: 'Bearer ' + pandadocs.access_token
		//   },
		//   body:{
		//     message: 'Message Sent from API',
		//     subject: "Panda Doc File",
		//   },
		//   json:true,
		//   uri: URI,
		//   method: 'POST'
		// });
		//
		// if(!respose) {
		//   e.th(500, "Could not get a response from Panda Docs")
		// }

		let status = await this.getStatus(company);
		return true;
	}

	async getSession(connection, company, signer_id) {
		this.Signer = await this.findSigner(connection, company.id, signer_id);
		let response = await pandadocs.getSession(this.foreign_id, this.Signer, company);




		return response.id;
	}

	async getStatus(company) {
		return await pandadocs.getStatus(this.foreign_id, company);
		// let URI = 'https://api.pandadoc.com/public/v1/documents/' + this.foreign_id;
		// //let URI = 'https://api.pandadoc.com/public/v1/documents';
		//
		// let response = {};
		// try{
		//   response = await request({
		//     headers: {
		//       Authorization: 'Bearer ' + pandadocs.access_token
		//     },
		//     json:true,
		//     uri: URI,
		//     method: 'GET'
		//   });
		// } catch(err){
		//   console.log("Panda Error", err);
		// }
		//
		// if(!response) {
		//   e.th(500, "Could not get a response from Panda Docs")
		// }
		// return response;

	}

	async waitForDraftBeforeSend(company) {

		await new Promise(resolve => {
			const interval = setInterval(async () => {
				let r = await this.getStatus(company);

				if (r.status === 'document.draft') {
					clearInterval(interval);
					resolve()
				};
			}, 2000);
		});

		await this.sendDocument(company);

	}

	async downloadPandaDoc(company) {
		return await pandadocs.download(this.foreign_id, company, this.fileloc);
	}

	savePending(connection, lease, document, contact_id) {

		var upload = {
			document_type_id: document.document_type_id,
			filename: null,
			file_path: null,
			uploaded_by: contact_id,
			upload_date: moment.utc().valueOf(),
			status: 1
		}

		return models.Upload.save(connection, upload).then(upload_id => {
			var uploadsLease = {
				upload_id: upload_id,
				lease_id: lease.id,
				status: 1
			}
			return models.Upload.saveUploadLease(connection, uploadsLease)
		})

	}

	async findSigners(connection, company_id, signer_id) {

		let signers = await models.Upload.findSigners(connection, this.id, signer_id);
		for (let i = 0; i < signers.length; i++) {
			let contact = new Contact({ id: signers[i].contact_id });
			await contact.find(connection, company_id);
			await contact.getPhones(connection);
			this.signers.push({
				id: signers[i].id,
				Contact: contact,
				email: signers[i].email,
				signed: signers[i].signed,
				status: signers[i].status
			});
		}


	}

	async findSigner(connection, company_id, signer_id) {
		return await models.Upload.findSigners(connection, this.id, signer_id);
	}


	setDocumentType(connection, document_type_id, document_type, company_id) {
		return Promise.resolve().then(() => {
			if (!document_type_id) return null;
			return models.Document.findDocumentTypeById(connection, document_type_id, company_id).then(dt => {
				if (!dt) e.th('Invalid document type id');
				return dt.id;
			})
		}).then(document_type_id => {
			if (document_type_id) {
				this.document_type_id = document_type_id;
				return document_type_id;
			}
			return this.getDocumentType(connection, document_type || 'file', company_id)
				.then(document_type => {
					if (!document_type) return e.th('Could not set document type');
					this.document_type_id = document_type.id;
					return true;
				})
		})
	}

	saveUploadContact(connection, contact_id) {
		var data = {
			contact_id: contact_id,
			upload_id: this.id
		}
		return models.Upload.saveUploadContact(connection, data)
	}

	saveUploadDocument(connection, doc_id) {
		var data = {
			doc_id: doc_id,
			upload_id: this.id
		}
		return models.Upload.saveUploadDocument(connection, data)
	}

	saveUploadRevision(connection, revision_id) {
		var data = {
			revised_upload_id: revision_id,
			upload_id: this.id
		}
		return models.Upload.saveUploadRevision(connection, data)
	}

	saveUploadLease(connection, lease_id) {
		var data = {
			lease_id: lease_id,
			upload_id: this.id
		};
		return models.Upload.saveUploadLease(connection, data)

	}

	saveUploadInteraction(connection, interaction_id) {
		var data = {
			interaction_id: interaction_id,
			upload_id: this.id,
		};
		return models.Upload.saveUploadInteraction(connection, data)

	}

	saveUploadProperty(connection, property_id) {
		var data = {
			property_id: property_id,
			upload_id: this.id
		}
		return models.Upload.saveUploadProperty(connection, data)
	}

	async saveUploadSigner(connection, signer) {
		var data = {
			contact_id: signer.contact_id,
			email: signer.email,
			upload_id: this.id,
			signed: signer.signed,
			status: signer.status
		}
		return await models.Upload.saveUploadSigner(connection, data, signer.id)
	}

	saveUploadSubmessage(connection, submessage_id, sort) {
		var data = {
			submessage_id: submessage_id,
			sort: sort,
			upload_id: this.id
		}
		return models.Upload.saveUploadSubmessage(connection, data)
	}

	async saveUploadUnit(connection, unit_id) {
		var data = {
			unit_id: unit_id,
			upload_id: this.id
		}
		let results = await models.Upload.saveUploadUnit(connection, data);
		data.id = results.insertId;
		return data;
	}

	transferSignatureFields(connection, oldPages) {
		var promises = [];
		var _this = this;
		for (var i = 0; i < oldPages.length; i++) {
			oldPages[i].fields.forEach(function (field) {
				if (field.type == 'Signature' || field.type == 'Initials') {
					promises.push(models.Document.saveField(connection, {
						x_start: field.x_start,
						y_start: field.y_start,
						width: field.width,
						type: field.type,
						signer_type: field.signer_type,
						signer_position: field.signer_position,
						height: field.height,
						page_id: _this.Pages[i].id
					}));
				}
			});
		}
		return Promise.all(promises);
	}

	async uploadToS3() {

		let s3 = new AWS.S3({
			endpoint: 'https://s3.amazonaws.com',
			region: process.env.AWS_REGION
		});

		let params = {
			params: {
				Bucket: process.env.AWS_BUCKET_NAME,
				Key: this.filename,
				Body: fs.createReadStream(this.fileloc),
			},
			service: s3
		};
		


		var upload = new AWS.S3.ManagedUpload(params);
		let promise = upload.promise();
		try {
		var response = await promise;
		} catch (err) {
		console.log("err", err);
		e.th(404, err);
		}
	}
	async uploadToS32(content) {
		let s3 = new AWS.S3({
			endpoint: 'https://s3.amazonaws.com',
			region: process.env.AWS_REGION
		});
		const binaryData = Buffer.from(content, 'base64');
		let params = {
			params: {
				Bucket: process.env.AWS_BUCKET_NAME,
				Key: this.filename,
				Body:binaryData,
			},
			service: s3
		};
		var upload = new AWS.S3.ManagedUpload(params);
		let promise = upload.promise();
		try {
			
		var response = await promise;
		} catch (err) {
		console.log("err", err);
		e.th(404, err);
		}
	}

	async deleteTmpFile() {
		return await fs.unlinkSync(this.fileloc); // Empty temp folder
	}

	setBucketNameByDocumentType(document_type) {
		const { DOCUMENT_TYPES } = ENUMS;

		switch (document_type) {
			case DOCUMENT_TYPES.SIGNED:
				this.bucket_name = process.env.AWS_BUCKET_NAME;
				break;
			case DOCUMENT_TYPES.UN_SIGNED:
				this.bucket_name = settings.document_manager.bucket_name;
				break;
			default:
				this.bucket_name = null;
		}
	}

	setBucketNameByDestination() {
		const { UPLOAD_DESTINATIONS } = ENUMS;

		switch (this.destination) {
			case UPLOAD_DESTINATIONS.DOCUMENT_MANAGER:
				this.bucket_name = settings.document_manager.bucket_name;
				break;
			default:
				this.bucket_name = process.env.AWS_BUCKET_NAME;
		}
	}

	async download() {
		console.log(`downloading ${this.id} from ${this.bucket_name}`);
				let aws_params = {
			Bucket: this.bucket_name,
			Key: this.destination_file_path || this.filename
		}
		let s3Promise = new AWS.S3({
			endpoint: 'https://s3.amazonaws.com',
			region: process.env.AWS_REGION
		}).getObject(aws_params).promise();

		try {
			this.document = await s3Promise;
			return this.document;
		} catch (err) {
			console.log("err", err);
			e.th(404, "File not found");
		}

	}

	async find(connection, payload = {}) {

		let data = {};
		let uploads = {};
		if (this.id) {
			data = await models.Upload.findById(connection, this.id);
			console.log(data);
		} else if (this.foreign_id) {

			data = await models.Upload.findByForeignId(connection, this.foreign_id, payload);
		}

		console.log("ID", this.id);

		if (!data) {
			e.th(404, "Document Not Found");
		}


		this.id = data.id;
		this.filename = data.filename;
		this.file_path = data.file_path;
		this.model = data.model;
		this.sort = data.sort;
		this.uploaded_by = data.uploaded_by;
		this.document_type_id = data.document_type_id;
		this.type = data.type;
		this.upload_date = data.upload_date;
		this.extension = data.extension;
		this.encoding = data.encoding;
		this.mimetype = data.mimetype;
		this.size = data.size;
		this.name = data.name;
		this.foreign_id = data.foreign_id;
		this.src = data.src;
		this.description = data.description;
		this.reference_number = data.reference_number;
		this.downloading = data.downloading;
		this.fileloc = settings.config.base_path + settings.img_path + this.filename;
		this.private = !!data.private
		this.destination = data.destination || null;
		this.destination_file_path = data.destination_file_path || null;
		if(data.uploaded_by) {
			let contact = new Contact({id: data.uploaded_by});
			await contact.find(connection);
			this.uploaded_by_name = contact.first + " " + contact.last;
		} else {
			this.generated_by_name = "System Generated";
		}
		
		if (this.filename) {
			this.src = settings.config.get_base_url() + `companies/${Hashes.encode(connection.cid)}/uploads/files/` + Hashes.encode(this.id, connection.cid) + "/" + this.filename;
		}

		this.DocumentType = await models.Document.findDocumentTypeById(connection, data.document_type_id)


		this.Pages = [];
		await this.findPages(connection);

		let files = await models.Upload.findRevisionByUploadId(connection, this.id);

		for (let i = 0; i < files.length; i++) {
			let file = files[i];
			let upload = new Upload({ id: file.revised_upload_id });
			await upload.find(connection);
			this.Revisions.push(upload)
		}

	}

	async findPages(connection) {

		let pages = await models.Document.findPagesByUploadId(connection, this.id);

		for (let i = 0; i < pages.length; i++) {
			let page = pages[i];
			let fields = await models.Document.findFieldsByPageId(connection, page.id);
			for (let j = 0; j < fields.length; j++) {
				let field = fields[j];
				try {
					field.merge_fields = JSON.parse(field.merge_fields);
				} catch (err) {
					console.log("ERROR");
					field.merge_fields = [];
				}
			}
			page.fields = fields;
			this.Pages.push(page);
		}
	}

	async findUploadLeases(connection) {
		if (!this.id) e.th(500);
		let leases = await models.Upload.findUploadLeases(connection, this.id);
		for (let i = 0; i < leases.length; i++) {
			let lease = new Lease({ id: leases[i].lease_id });
			await lease.find(connection);
			this.Leases.push(lease);
		}
	}

	async updateChecklistItem(connection) {

		let checklistItem = await models.Upload.findChecklistItemByUploadId(connection, this.id);

		if (!checklistItem) return;

		checklistItem.completed = 1;
		await models.Checklist.saveItem(connection, { completed: 1 }, checklistItem.id);
		return checklistItem;
	}

	async findLease(connection) {
		if (!this.id) e.th(500);
		let leases = await models.Upload.findUploadLeases(connection, this.id);
		if (!leases.length) e.th(404, 'not found');
		this.Lease = new Lease({ id: leases[0].lease_id });
		await this.Lease.find(connection);
	}

	makePages(connection) {

		try {

			this.Pages = [];

			// var input = settings.config.base_path + settings.img_path + this.filename;
			var output = settings.config.base_path + settings.img_path + this.id + '_' + this.filename;

			pdf2img.setOptions({
				type: 'png',
				size: 1024,
				density: 600,
				outputdir: settings.config.base_path + settings.img_path,
				outputname: this.id + '_' + this.filename,  // Changed from this.foreign_id  + '_' + this.filename
				page: null
			});

		} catch (err) {
			console.error(err);
		}
		return new Promise((resolve, reject) => {
			return pdf2img.convert(this.file_path, (err, info) => {
				if (err) return reject(err);
				return resolve(info.message);
			})
		}).catch(err => {
			console.log(err);
			throw err;
		}).mapSeries(file => {

			var newfilename = this.name.substring(0, this.name.lastIndexOf(".")) + ".png";

			var pageData = {
				upload_id: this.id,
				filename: file.name,
				sort: file.page,
				src: settings.config.get_base_url() + "documents/pages/" + Hashes.encode(this.id, connection.cid) + "/" + file.name,
				location: settings.config.base_path + settings.img_path + file.name
			};
			return models.Document.savePage(connection, pageData).then(page_id => {
				pageData.id = page_id;
				this.Pages.push(pageData);
				return true;
			})
		})

	}

	forScreen() {
		return {
			id: this.id,
			foreign_id: this.foreign_id,
			filename: this.filename,
			model: this.model,
			sort: this.sort,
			uploaded_by: this.uploaded_by,
			type: this.type,
			upload_date: this.upload_date,
			extension: this.extension,
			mimetype: this.mimetype,
			encoding: this.encoding,
			size: this.size,
			name: this.name,
			description: this.description,
			src: this.src,
			fileloc: this.fileloc,
			Pages: this.Pages || [],
			Revisions: this.Revisions || [],
			private: !!this.private
		}

	}

	copyFile(source, target, uploadObj) {

		return new Promise(function (resolve, reject) {

			// Make async
			fs.existsSync(settings.config.base_path + 'public/img/uploads/' + uploadObj.model) || fs.mkdirSync(settings.config.base_path + 'public/img/uploads/' + uploadObj.model);
			fs.existsSync(settings.config.base_path + 'public/img/uploads/' + uploadObj.model + '/' + uploadObj.foreign_id) || fs.mkdirSync(settings.config.base_path + 'public/img/uploads/' + uploadObj.model + '/' + uploadObj.foreign_id);



			var rd = fs.createReadStream(source);
			rd.on("error", function (err) {
				reject(err);
			});
			var wr = fs.createWriteStream(target);
			wr.on("error", function (err) {
				reject(err);
			});
			wr.on("close", function (ex) {
				resolve(ex);
			});
			rd.pipe(wr);
		});
	}

	generateRevision(connection, signers) {


		var page_width = 612;
		var page_height = 792;
		//var promises = [];
		//var re = /(?:\.([^.]+))?$/;

		var filenameparts = this.filename.split('.');
		var newfilename = moment().format('x') + this.filename;
		var ext = filenameparts.pop();

		var revision = {
			//	foreign_id: _this.id,
			filename: newfilename,
			//	model: "document",
			sort: 0,
			document_type_id: this.document_type_id,
			uploaded_by: null,
			//	type: 'revision',
			upload_date: moment.utc().format('YYYY-MM-DD HH:mm:ss'),
			extension: ext,
			mimetype: this.mimetype,
			name: this.name,
			description: this.description,
			private: !!this.private,
			file_path: settings.config.base_path + settings.img_path + newfilename
		}

		return this.copyFile(this.file_path, revision.file_path, revision).then(() => {

			if (!this.id) throw 'Id not set.';

			var pdfReader = hummus.createReader(revision.file_path);
			var pdfWriter = hummus.createWriterToModify(revision.file_path, {
				modifiedFilePath: revision.file_path
			});

			this.Pages.forEach(function (page, index) {
				var parsedPage = pdfReader.parsePage(index);
				var media = parsedPage.getMediaBox();
				page_width = media[2] - media[0];
				page_height = media[3] - media[1];

				var pageModifier = new hummus.PDFPageModifier(pdfWriter, index, true);
				var ctx = pageModifier.startContext().getContext();

				page.fields.forEach(function (field) {

					signers.map(s => {
						return s.Fields.filter(f => {
							if (f.field_id == field.id && f.completed_at) {
								if (field.type == 'Signature') {
									ctx.drawImage(
										page_width * field.x_start + 3,
										page_height - (page_height * field.y_start) - (page_width * field.height) - 33,
										s.signature.fileloc.substr(0, s.signature.fileloc.lastIndexOf(".")) + ".pdf",
										{
											transformation: {
												width: page_width * field.width,
												height: page_height * field.height,
												proportional: true
											}
										}
									);

								} else if (field.type == 'Initials') {

									ctx.drawImage(
										(page_width * field.x_start),
										page_height - (page_height * field.y_start) - (page_width * field.height) - 10,
										s.initials.fileloc.substr(0, s.initials.fileloc.lastIndexOf(".")) + ".pdf",
										{
											transformation: {
												width: page_width * field.width * 1.6,
												height: page_height * field.height * 1.6,
												proportional: true
											}
										}
									);
								}
							}
						});
					});

				});

				pageModifier.endContext().writePage();

			});

			pdfWriter.end();
			return models.Upload.save(connection, revision)
				.then(id => {
					revision.id = id;
					console.log('revision', revision);
					console.log("this.id", this.id);

					return this.saveUploadRevision(connection, revision.id);
				})

		})



	}

	getDocumentType(connection, document_type, company_id) {

		if (!document_type) e.th(400, "Document type not provided");

		return models.Document.findDocumentTypeByName(connection, document_type, company_id)
			.then(document_type_res => {
				if (document_type_res) return document_type_res;
				var save = {
					name: document_type,
					company_id: company_id
				}
				return models.Document.saveDocumentType(connection, save).then(document_type_id => {
					save.id = document_type_id;
					return save;
				})
			})
	}

	async getFile() {
		var bitmap = await fs.readFileAsync(this.file_path);
		// convert binary data to base64 encoded string
		return new Buffer(bitmap).toString('base64');
	}

	static async saveEntitySort(connection, entity_table, pos, upload_id) {
		return models.Upload.saveEntitySort(connection, entity_table, pos, upload_id);
	}

	// need to set model, uploaded_by, foreign_id, type, and sort before calling this
	uploadFile(connection, file) {
		if (!file) {
			var error = new Error("No file sent");
			error.code = 500;
			throw error;
		}

		var nameSplit = file.path.split('/');
		var newFilename = nameSplit[1];

		var reableNameSplit = file.originalname.split('.');
		var lastVal = reableNameSplit.pop();       // Get last element

		this.filename = newFilename;
		this.upload_date = moment.utc().format('YYYY-MM-DD HH:mm:ss');
		this.extension = file.extension;
		this.encoding = file.encoding;
		this.mimetype = file.mimetype;
		this.size = file.size;
		this.name = Validation.slugify(reableNameSplit[0]) + '.' + file.extension;
		this.fileloc = file.path;
		this.private = !!file.private || true;

		return this.save(connection);
	}

	static combineToFile(uploads) {

		try {
			let timestamp = moment().format('x');
			let pdfWriter = hummus.createWriter(settings.config.base_path + '/uploads/print' + timestamp + '.pdf');
			for (let i = 0; i < uploads.length; i++) {
				pdfWriter.appendPDFPagesFromPDF(uploads[i].file_path);
			}
			pdfWriter.end();
			return settings.config.base_path + '/uploads/print' + timestamp + '.pdf';

		} catch (err) {
			console.log(err);
		}

	}

	static createLabels(contacts) {

		var page_width = 612;
		var page_height = 792;
		try {
			let timestamp = moment().format('x');
			let pdfWriter = hummus.createWriter(settings.config.base_path + '/uploads/label_' + timestamp + '.pdf');

			var font = pdfWriter.getFontForFile(settings.config.base_path + 'fonts/OpenSans-Regular.ttf');
			var boldFont = pdfWriter.getFontForFile(settings.config.base_path + 'fonts/OpenSans-ExtraBold.ttf');
			var uncheckedFont = pdfWriter.getFontForFile(settings.config.base_path + 'fonts/fa-regular-400.ttf');
			var checkedFont = pdfWriter.getFontForFile(settings.config.base_path + 'fonts/fa-solid-900.ttf');

			let labelWidth = (2.625 / 8.5) * 612; //(3.625 / 8.5) * 612;
			let labelheight = (1 / 11) * 792; //(2.125 / 11 ) * 792;
			let gutter = (.125 / 11) * 792; //.125;
			let margin_top = (.5 / 11) * 792; //.1875;
			let margin_left = (.19 / 8.5) * 612; //.1875;


			var textOptions = {
				font: font,
				size: 9,
				colorspace: 'black',
				color: 0x00,
				underline: false
			};

			var titleTextOptions = {
				font: boldFont,
				size: 9,
				colorspace: 'black',
				color: 0x00,
				underline: false
			};

			let pathStrokeOptions = { color: 'Black', width: 1 };

			let row = 1;
			let col = 1;

			let current_page = pdfWriter.createPage(0, 0, page_width, page_height);
			let cxt = pdfWriter.startPageContentContext(current_page);

			let found = 0;

			for (let i = 0; i < contacts.length; i++) {

				if (!contacts[i].Addresses.length) continue;

				let line1 = contacts[i].first + ' ' + contacts[i].last;
				let line2 = contacts[i].Addresses[0].Address.address + ' ' + contacts[i].Addresses[0].Address.address2 || '';
				let line3 = contacts[i].Addresses[0].Address.city + ' ' + contacts[i].Addresses[0].Address.state + ' ' + contacts[i].Addresses[0].Address.zip;

				let leftOffset = margin_left + ((labelWidth + gutter) * (col - 1));
				let topOffset = page_height - margin_top - labelheight - ((labelheight) * (row - 1));

				// cxt.drawRectangle(
				//   leftOffset,
				//   topOffset,
				//   labelWidth,
				//   labelheight,
				//   pathStrokeOptions);

				cxt.writeText(line1, leftOffset + 15, topOffset + labelheight - 25, titleTextOptions);
				cxt.writeText(line2, leftOffset + 15, topOffset + labelheight - 25 - 12, textOptions);
				cxt.writeText(line3, leftOffset + 15, topOffset + labelheight - 25 - 12 - 12, textOptions);

				if (i > 0 && (row * col) === 30) {
					pdfWriter.writePage(current_page);
					current_page = pdfWriter.createPage(0, 0, page_width, page_height);
					cxt = pdfWriter.startPageContentContext(current_page);
					row = 1;
					col = 1;
				} else {
					if (col === 3) {
						row++;
						col = 1;
					} else {
						col++;
					}
				}

			}
			pdfWriter.writePage(current_page);
			pdfWriter.end()

			return settings.config.base_path + '/uploads/label_' + timestamp + '.pdf';

		} catch (err) {
			console.log(err);
		}

	}

	sendSignEmail(signer, company, send, params) {
		var shipment = {
			upload_id: this.id,
			requested: moment.utc(),
			signer_id: signer.id,
			property_id: params.property_id,
			item_id: params.item_id,
			date: moment()
		};

		var cipher = crypto.createCipher(settings.security.algorithm, settings.security.key);
		var encrypted = cipher.update(JSON.stringify(shipment), 'utf8', 'hex') + cipher.final('hex');


		if (send) {
			var jobParams = [];

			jobParams.push({
				category: 'emailSignature',
				data: {
					upload_id: this.id,
					signer_id: signer.id,
					action: 'sendEmail',
					label: 'sign',
					name: this.name,
					encrypted: encrypted,
					company_id: company.id,
					send_email: params.send_email,
					send_sms: params.send_sms,
					email_address: params.email_address,
					sms_number: params.sms_number,
				}
			});

			return new Promise((resolve, reject) => {
				Scheduler.addJobs(jobParams, function (err) {
					if (err) return reject(err);
					return resolve();
				});
			})
		} else {
			return process.env.WEB_PROTOCOL + '://' + company.subdomain + '.' + process.env.DOMAIN + '/sign-documents/' + encrypted;


		}
	}

	/**
	 * This method send email or sms to the provided email/phone number or to the default email/phone
	 * @param connection - the connection to the database
	 * @param contact - An instance of tenant contact
	 * @param uploads - Array containing uploads info
	 * @param company - The company object
	 * @param send - whether to send the email or not
	 * @param params - request body
	 */
	static async sendEmailForSignature(connection, contact, uploads, company, send, params, lease_id) {

	  var shipment = {
      uploads: uploads.map(u => u.id),
      requested: moment.utc(),
      contact_id: contact.id,
      property_id: params.property_id,
      date: moment(),
	  appId: params?.appId || ""
    };

		var cipher = crypto.createCipher(settings.security.algorithm, settings.security.key);
		var encrypted = cipher.update(JSON.stringify(shipment), 'utf8', 'hex') + cipher.final('hex');

		let link = process.env.WEB_PROTOCOL + '://' + company.subdomain + '.' + process.env.DOMAIN + '/sign-documents/' + encrypted;
		let shortenedLinkObj = await Utils.shortenUrl(link);
          
		if (send) {
			let response = {};
			var mapped_property_id = await getGDSPropertyMappingId(connection, params.property_id);
			let owner_id = company.gds_owner_id;
			let facility_id = mapped_property_id;
			let space = 'Tenant';
		    if (lease_id) {
			    let lease = new Lease({id: lease_id});
				await lease.find(connection);
				if (lease && lease.Unit) {
					space = lease.Unit.number;
				}
		    }
			// var eventSettings = null;
			// var socketEvent = null;

			if (params.method && params.method === 'email') {
				params.message += "\r\n" + "\r\n" + shortenedLinkObj.shortUrl;
				response = await contact.sendEmail(connection, params.property_id, space, "Please sign your documents", params.message, [], params.admin_id, 'sign_docs', owner_id, facility_id, params.to_email);
			} else {
				// TOO send phone

				params.message += "\r\n" + "\r\n" + shortenedLinkObj.shortUrl;
				// console.log("params",params);
				// let phone = Hashes.decode(params.method)[0];
				// console.log("m",m);
				// let phone = contact.Phones.find(p => p.id === params.method);
				// console.log("phone", phone);
				// sending sms to a custom mobile number
				let phones = params.to_phone || [Hashes.decode(params.method)[0]];
				let sendSMSPayload = {
					property_id: params.property_id,
					space: space,
					phones,
					message: params.message,
					logged_in_user: params.admin_id,
					context: 'sign_docs',
					owner_id,
					facility_id,
				};
				await contact[params.to_phone ? 'sendSMSToNumber' : 'sendSMS'](connection, sendSMSPayload)
			}
		} else {
			return shortenedLinkObj;
		}
	}

	async sendFiletoS3(property, company, documents) {
		let URI = `${GDS_FILE_APP_TOKEN_URI}owners/${company.gds_owner_id}/files/`
		console.log("URI", URI);
		try {
			var response = await request({
				headers: {
					'X-storageapi-key': process.env.GDS_API_KEY,
					'X-storageapi-date': moment().unix(),
				},
				body: {
					file_name: this.filename,
					file_size: this.size,
					file_type: 'other',
					file: this.file,
					description: this.description || '',
					facility_id: property.gds_id,
					attributes: {
						last_downloaded_on: null,
						downloaded_by: null,
						number_of_documents: documents.length
					}

				},
				json: true,
				uri: URI,
				method: 'POST'
			});
			console.log("response", response);
			if (!response) {
				e.th(500, "Could not get a response from the files app")
			}
		} catch (err) {
			console.log("err", err);
			throw err
		}
	}

  async saveAuctionAssets(connection, lease_id, categories, description) {
    let data = {
      upload_id: this.id,
      lease_id: lease_id,
      type: 'auction',
      categories: categories,
      description: description
    }
    let results = await models.Upload.saveOrUpdateAuctionAssets(connection, data);
    data.id = results.insertId;
    return data;
  }

  async updateAuctionAssets(connection, uploads, lease_auction_id, action, contact_id) {
    const actionMapping = {
      publish: {
        is_published: 1,
        published_date: moment().utc().format('YYYY-MM-DD HH:mm:ss'),
        published_by: contact_id
      },
      cancel: {
        is_published: 2,
        cancelled_date: moment().utc().format('YYYY-MM-DD HH:mm:ss'),
        cancelled_by: contact_id
      }
    };

    for(let i = 0; i < uploads.length; i++){
      const updateData = {
        lease_auction_id: lease_auction_id,
        ...actionMapping[action]
      };
      await models.Upload.saveOrUpdateAuctionAssets(connection, updateData, uploads[i]);
    }
  }
  async downloadDoc(fileUrl){
    return await axios.get(fileUrl, { responseType: 'arraybuffer' })
  }

}

module.exports = Upload;

const ENUMS = require('../modules/enums');

var Lease = require(__dirname + '/../classes/lease.js');
var Contact = require(__dirname + '/../classes/contact.js');