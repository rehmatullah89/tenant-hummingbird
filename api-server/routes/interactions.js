var express = require('express');
const interaction = require('../models/interaction.js');
var router = express.Router();
var control = require(__dirname + '/../modules/site_control.js');
var Hash = require(__dirname + '/../modules/hashes.js');
var Hashes = Hash.init();
var models = require(__dirname + '/../models');
var utils = require(__dirname + '/../modules/utils.js');


var e = require(__dirname + '/../modules/error_handler.js');
var Interaction = require('../classes/interaction.js');
let InteractionStatusHistory = require('../classes/interaction_status_history');
const Note = require('../classes/note.js');
const bullmq  = require('bullmq');
const IORedis = require('ioredis');
const redis_connection = new IORedis({host: process.env.REDIS_HOST});
const Queue = new bullmq.Queue('hummingbirdQueue', { connection: redis_connection } );

//Joi validation
var Schema = require('../validation/interactions');
const joiValidator = require('express-joi-validation')({
	passError: true
});

module.exports = function (app) {

	router.post('/:interaction_id/markread', [control.hasAccess(['admin', 'api']), Hash.unHash], async (req, res, next) => {
		var connection = res.locals.connection;
		try {
			let params = req.params;

			var interaction = new Interaction({ id: params.interaction_id });
			await interaction.find(connection);
			interaction.read = true;
			await interaction.save(connection);
			let interactor = await Interaction.interactorDetails(connection, interaction.contact_id);

			utils.send_response(res, {
				status: 200,
				data: {
					interaction: Hash.obscure(interaction, req),
					interactor: Hash.obscure(interactor, req)
				}
			});

		} catch (err) {
			next(err);
		}

	});

	router.post('/:interaction_id/upload', [control.hasAccess(['admin']), control.hasPermission('manage_contacts'), Hash.unHash], async (req, res, next) => {
		try {
			var connection = res.locals.connection;
			let company = res.locals.active;
			let files = req.files;
			let params = req.params;
			let body = req.body;

			let interaction = new Interaction({ id: params.interaction_id });
			await interaction.find(connection);
			await contact.verifyAccess(company.id);

			let upload = new Upload();
			await upload.setDocumentType(connection, body.document_type_id, body.document_type || 'file', company.id);

			var file = files.file || files['file[0]'];
			upload.setFile(file, body.src);
			upload.uploaded_by = user ? user.id : null;
			await upload.save(connection);
			await upload.saveUploadInteraction(connection, interaction.id);

			utils.send_response(res, {
				status: 200,
				data: {
					uploads: Hash.obscure(upload, req)
				},
			})

			// eventEmitter.emit('uploaded_contact_file', { company, user, contact, upload, cid: res.locals.company_id , locals: res.locals});


		} catch (err) {
			next(err);
		}

	});

	router.get('/:interaction_id/notes', [control.hasAccess(['admin', 'api']), joiValidator.body(Schema.update), Hash.unHash], async (req, res, next) => {
		try {
			let connection = res.locals.connection;
			let params = req.params; 
			
			let interaction = new Interaction({id: params.interaction_id});
			await interaction.find(connection);

			await interaction.findNotes(connection);

			utils.send_response(res, {
				status: 200,
				data: {
					notes: Hash.obscure(interaction.Notes, req)
				},
			})
		}catch (err) {
			next(err);
		}
	});

	router.post('/retry-send', [control.hasAccess(['admin', 'api']), Hash.unHash], async(req, res, next) => {

		var connection = res.locals.connection;

		try {
			let body = req.body;
			let user = res.locals.contact;
			
			var errorDocs = [];

			for(let i = 0; i < body.documents.length; i++){
				if(body.documents[i].status == "error") {
					errorDocs.push(body.documents[i]);
				}
			}

			var leases = [];

			for(let i=0; i < errorDocs.length; i++) {
				leases.push(errorDocs[i].lease_id);
			}

			var uploads = []

			for(let i=0; i < errorDocs.length; i++) {
				uploads.push(errorDocs[i].generated_document.id);
			}

			if (errorDocs.length > 0) { 
				await Queue.add('retry_bulk_notifications', {
					cid: res.locals.company_id,
					priority: 10,
					contact_id: user.id,
					socket_details: {
						contact_id: user.id,
						company_id: res.locals.company_id,
					},
					customer_leases: leases,
					uploads: uploads,
					document_batch_id: body.batch_info.document_batch_id,
					document_delivery_id: body.batch_info.document_delivery_id,
					property_id: body.batch_info.property_id,
					document_template_id: body.batch_info.template.template_doc_id,
					document_type: body.batch_info.document_type,
					document_name: body.batch_info.template.name,
					trace_id: res.locals.trace_id
				}, { priority: 10 });
			}


		} catch {
			console.log("Error");
		}


		utils.send_response(res, {
			status: 200,
			data: {
				details: req.body.documents
			}
		});

	});

	router.post('/:interaction_id/notes', [control.hasAccess(['admin', 'api']), Hash.unHash], async (req, res, next) => {
		try {
			let connection = res.locals.connection;
			let params = req.params;
			let body = req.body;
			let user = res.locals.contact;
			let interaction = new Interaction({id: params.interaction_id});
			await interaction.find(connection);

			body.last_modified_by = user.id;
			body.interaction_id = interaction.id;
			let note = new Note({});
			await note.update(body);
			await note.save(connection);

			utils.send_response(res, {
				status: 200,
				data: {
					note_id: Hashes.encode(note.id, res.locals.company_id)
				},
			})
		} catch (err) {
			next(err);
		}
		

	});

	router.put('/:interaction_id', [control.hasAccess(['admin', 'api']), joiValidator.body(Schema.update), Hash.unHash], async (req, res, next) => {

		try {
			let connection = res.locals.connection;
			let body = req.body;
			let params = req.params;

			let interaction = new Interaction({ id: params.interaction_id });

			if (body.resolved === true) {
				body[`resolved_at`] = new Date;
				body[`resolved_by`] = res.locals.contact.id;
			}

			await interaction.find(connection);
			await interaction.update(body);
			await interaction.save(connection);

			utils.send_response(res, {
				status: 200,
				data: {
					interaction: Hash.obscure(interaction.data, req)
				},
			})
		} catch (err) {
			next(err);
		}

	});

	return router;
};


