const models = require('../models');

const DocumentManagerRoutines = {

  generateDocument: async (data) => {
    let upload = {};
    try {
      console.log("Generate document routine data: ", data);

      let { cid, company_id, lease_id, document_id, rent_change_lease_id, document_batch_id, recipient_type, reversal, uploaded_by} = data;
	  // :rent_change_lease_id here means id of lease_rent_changes table
	  if (!rent_change_lease_id) {
		// The ID will be under :rent_change_id for the workflow triggered from rent management cronjob
		rent_change_lease_id = data.rent_change_id
	  }
      const { UPLOAD_DESTINATIONS } = ENUMS;

      var connection = await db.getConnectionByType('write', cid);

      const lease = new Lease({ id: lease_id, });
      await lease.find(connection);

      const company = new Company({ id: company_id });
      await company.find(connection);

      let document = new DocumentManager({ id: document_id, Company: company });
      
      await document.getTemplateDetails();

      await lease.findFull(connection, company, [], document, data.recipient);
      
      if(!rent_change_lease_id) {
		// When document is generated manually from tenant profile
        rent_change_lease_id = await lease.getLeaseRentChangeId(connection); // Fetches the ID for next rent changes of the lease
      }

      if (rent_change_lease_id) {
        await lease.getRentRaiseDetails(connection, company, rent_change_lease_id);
      }

      await document.mergeTokens(connection, lease, { reversal });
      console.log("document", document); 
      const transformedData = document.transformTokens();
      console.log('Value Tokens: ', transformedData);

      
      upload = new Upload({
        generation_status: 'pending',
        contact_type: recipient_type,    
        contact_id: lease.Recipient.id,
        uploaded_by: uploaded_by?uploaded_by:null		            
      })

      await upload.save(connection);
      await upload.saveUploadLease(connection, lease.id);
      // await upload.saveUploadContact(connection, lease.Recipient.id);

      const response = await document.render({ cid });

      upload.document_batch_id = document_batch_id;
      upload.foreign_id = response.fileId;
      upload.name = document.Details.name;
      upload.filename = response.key;
      upload.mimetype = 'application/pdf';
      upload.destination = UPLOAD_DESTINATIONS.DOCUMENT_MANAGER;
      upload.destination_file_path = `${company.gds_owner_id}/documents/${response.key}`;
      upload.generation_status = `generated`;

      await upload.setDocumentType(connection, null, 'file', company.id);
      upload.setSrc(cid);
      await upload.save(connection, { should_upload: false });

      data.upload_id = upload.id;
      data.fileId = response.fileId;
      document.upload_id = upload.id;
      // document.fileId = response.fileId;
      // await document.saveDocument(connection); 
      
      // await DocumentManagerRoutines.getGeneratedDocument(data);
      await DocumentManagerRoutines.getGeneratedDocumentFromDocManager(document, data);

      console.log("Generated document through document manager!");

      return { 
        document: document, 
        // document: data, 
        recipient: lease.Recipient,
        primary_contact_id: lease.primary_contact_id
      };
    } catch (err) {
      console.log('Generate document routine error: ', err);
      upload.generate_status = 'error';
      upload.error_msg = err.toString();
      throw err;
    } finally {
      await db.closeConnection(connection);
    }
  },

  getGeneratedDocumentFromDocManager: async (document, data) => {
    try {
        
    //   var connection = await db.getConnectionByType('write', cid);

    let isDocumentGenerated = false, retryTimes = 1;
    let retryAfterSeconds = [2, 4, 8, 30, 60, 120, 180, 300];

    let maximumRetries = retryAfterSeconds.length;

    // console.log(`Checking ${upload_id} for generation`);

    while (!isDocumentGenerated && retryTimes < maximumRetries) {
      const doc = await document.getGeneratedDocument(data);

      if(doc && doc.storekey) {
        isDocumentGenerated = true;
        break;
      }
      console.log(`Retrying after ${retryAfterSeconds[retryTimes - 1]} seconds..`);
      await new Promise(resolve => setTimeout(resolve, (retryAfterSeconds[retryTimes - 1]) * 1000));
      retryTimes++;
    }

      if (!isDocumentGenerated) {
        const upload = new Upload({ id: upload_id });
        upload.description = 'Document not generated after several retries.';
        await upload.update(connection, {
          status: 0,
          description: upload.description
        });

        e.th(500, upload.description);
      }
    } catch (err) {
      console.log("err", err)
      throw err;
    } finally {
      // await db.closeConnection(connection);
    }
  },
  getGeneratedDocument: async (data) => {
    try {
      const { cid, upload_id } = data;
      var connection = await db.getConnectionByType('write', cid);

      let isDocumentGenerated = false, retryTimes = 1;
      let retryAfterSeconds = [2, 4, 8, 30, 60, 120, 180, 300];

      let maximumRetries = retryAfterSeconds.length;

      console.log(`Checking ${upload_id} for generation`);

      while (!isDocumentGenerated && retryTimes < maximumRetries) {
        const upload = await models.Upload.findById(connection, upload_id);
        if (upload.filename) {
          isDocumentGenerated = true;
          break;
        }

        console.log(`Retrying after ${retryAfterSeconds[retryTimes - 1]} seconds..`);
        await new Promise(resolve => setTimeout(resolve, (retryAfterSeconds[retryTimes - 1]) * 1000));
        retryTimes++;
      }

      if (!isDocumentGenerated) {
        const upload = new Upload({ id: upload_id });
        upload.description = 'Document not generated after several retries.';
        await upload.update(connection, {
          status: 0,
          description: upload.description
        });

        e.th(500, upload.description);
      }
    }
    catch (err) {
      throw err;
    } finally {
      await db.closeConnection(connection);
    }
  },
  sendDocument: async (data) => {
    try {
      console.log("sendDocument data", data); 
      if(!data?.socket_details) return;

      const { company_id, contact_id } = data?.socket_details || {};
      let socket = new Socket({
        company_id: company_id,
        contact_id: contact_id,
      });
      
      
      let connected = await socket.isConnected(contact_id);
      console.log("Checking socket connection..", connected);
      if (!connected) return;

      await socket.createEvent("pandadoc_generation_update", { status: 'finished' }); 

      return data;
    } catch (err) {
      console.log('Send document routine error: ', err);
      throw err;
    }
  },
  async generateDeliveries(data) {

		try {
			var connection = await db.getConnectionByType('write', data.cid);

			let documentBatch = new DocumentBatch({
				created_by: data.contact_id, 
				property_id: data.property_id,
				document_manager_template_id: data.document_template_id,
				document_type: data.document_type
			});
			
			await documentBatch.save(connection);
      		let delivery_methods_id = await documentBatch.getDeliveryMethodsId(connection, data.document_batch_id);
			let delivery_id = null;
			if (delivery_methods_id) {
				// save document_batch_deliveries
				delivery_id = await documentBatch.saveDelivery(connection, delivery_methods_id);
			} 

			let delivery = await DocumentBatch.getDeliveryById(connection, data.document_delivery_id);
			let email_info = null;
			let rate_change_id = null;
			let email_text = null;
			let email_subject = null;
			if(delivery.delivery_type == "email") {
				email_info = await documentBatch.getDocumentBatchFromRateChange(connection, data.document_batch_id);
				rate_change_id = email_info.rate_change_id;
				email_text = email_info.email_text;
				email_subject = email_info.email_subject;
			}


			// Disassociate old interactions

			for (let i = 0; i < data.customer_leases.length; i++) {


				// clear upload
				await documentBatch.deleteUploadInteraction(connection, data.uploads[i]);

				//Call Generate Document workflow

				await Queue.add('resend_notification', {
					document_batch_id: documentBatch.id,
					document_batch_delivery_id: delivery_id,
					cid: data.cid,
					priority: data.priority,
					company_id: data.cid,
					lease_id: data.customer_leases[i],
          			upload_id: data.uploads[i],
					rate_change_id: rate_change_id,
					email_text: email_text,
					email_subject: email_subject,
					contact_id: data.contact_id,
          			document_name: data.document_name,
          			property_id: data.property_id,
					old_db_id: data.document_batch_id,
					tracking: {
						trace_id: data.tracking?.trace_id,
						event_name: data.tracking?.event_name
					},
					// email: {
					// 	message: rate_change.email_text,
					// 	subject: rate_change.email_subject
					// },
					socket_details: {
						contact_id: data.socket_details.contact_id,
						company_id: data.socket_details.company_id,
					},   
					trace_id: data.trace_id
				}, { priority: data.priority });
			}

			return data;
		} catch (err) {
			try {
				console.log(err.stack);
			} catch (err) {
				console.log(err);
			}
			throw err;
		} finally {
			await db.closeConnection(connection);
		}
	},
  async retryDocument(data) {
		console.log("retryDocument data", data);
		let { document_batch_id, document_batch_delivery_id, cid, company_id, lease_id, upload_id, trace_id } = data;

		try {
			var connection = await db.getConnectionByType('write', cid);

			let company = new Company({ id: company_id });
			await company.find(connection);

			// get Lease
			let lease = new Lease({ id: lease_id });
			await lease.find(connection);
			await lease.getTenants(connection);
			await lease.getProperty(connection, company.id);
			let tenant = lease.Tenants.find(t => t.contact_id == lease.primary_contact_id)

			if (!company.gds_owner_id || !lease.Property.gds_id) {
				console.log("Missing company's owner_id or properties GDS id");
				console.log("Company: ", company.gds_owner_id);
				console.log("Property: ", lease.Property.gds_id);
				await utils.closeConnection(pool, connection);
				return data;
			}

			let upload = new Upload({ id: upload_id });
			let upload_date = moment.utc().format('YYYY-MM-DD HH:mm:ss');
			let name = "Retry " + data.document_name;
			await upload.find(connection);
			await upload.findSigners(connection, company.id);
			upload.setBucketNameByDocumentType(Enums.DOCUMENT_TYPES.UN_SIGNED);
			await upload.update(connection, { 
				upload_date: upload_date, 
				document_batch_id: document_batch_id, 
				name: name, 
			});
			let file = await upload.download();

			let attachments = [{
				upload_id: upload.id,
				content_type: "application/pdf",
				name: `${upload.name}.pdf`, 	// change ?
				content: file.Body.toString('base64'),
			}];

			let delivery = await DocumentBatch.getDeliveryById(connection, document_batch_delivery_id);

			let dm = {
				id: delivery.delivery_methods_id,
				gds_key: delivery.gds_key,
			}

			let response = {};
			
			switch (delivery.gds_key) {
				case 'certified_mail':
				case 'first_class':
				case 'certificate_of_mailing':
				case 'certified_mail_with_err':
					response = await tenant.Contact.sendMail(connection, attachments, 'rent_raise', company.gds_owner_id, lease.Property.gds_id, dm, null, lease.primary_contact_id, lease.id, delivery.id, null,  trace_id);
					break;
				case 'registered_email':
				case 'certified_email':
				case 'standard_email':

					await lease.findUnit(connection);
					await lease.getCurrentBalance(connection, company.id);
					await lease.getActiveRent(connection);
					
					if (!tenant.Contact.email) {
						throw `Email not present for Contact ${tenant.Contact.first} ${tenant.Contact.last}`; 
					} 

					let message = await DocumentManagerRoutines.mergeTokens(connection, data.email_text, lease, company, lease.property);
					response = await tenant.Contact.sendEmail(connection, data.email_subject, message, attachments, null, 'rent_raise', company.gds_owner_id, lease.Property.gds_id, dm, lease.primary_contact_id, lease.id, delivery.id, null, trace_id);
					break;
			}
	

			console.log("retryDocument response", response)
			
			data.interaction_id = response.interaction_id;
			
			return data;

		} catch (err) {
			console.log("retryDocument err", err)
			throw err; 
		} finally {
			await db.closeConnection(connection);
		}
	},

	async mergeTokens(connection, message, lease, company, property, is_html) {
		// document.Details.tokens

		if (!message) return '';
		try {

			let found_tokens = [];
			for (let s in Tokens) {
				if (typeof Tokens[s] === 'function') continue;
				let section = Tokens[s];
				const regex = /[A-Z]/g;
				for (let i = 0; i < section.length; i++) {
					if (message.indexOf(`[${section[i]}]`) < 0) continue;
					found_tokens.push({
						name: section[i]
					})
				}
			}

			let document = {
				Details: {
					tokens: found_tokens
				}
			}

			await lease.findFull(connection, company, [property], document)
			let merged_tokens = await PandaDocs.mergeTokens(connection, lease, document.Details)
			merged_tokens = merged_tokens || [];
			for (let i = 0; i < merged_tokens.length; i++) {
				var re = new RegExp(`\\[${merged_tokens[i].name}\\]`, 'g');
				message = message.replace(re, merged_tokens[i].value)
			}
			if (is_html) {
				message = message.replace(/\n/g, '<br />');
			}

			return message;

		} catch (err) {
			throw err;
		}

		// extract tokens, 
		// find full, 
		// str replace tokens
	},

  async renotifySuccess(wf) {
		console.log("*********WorkFlow:", wf);
		try {
			if (wf.dependencies.length) {
				let data = wf.dependencies[wf.dependencies.length - 1].data;
				console.log('renotifySuccess data', data);
				var connection = await db.getConnectionByType('write', data.cid);
				let workflow = JSON.stringify(wf.dependencies, null, 2);
				console.log("*********WorkFlow:", workflow);
				await DocumentManagerRoutines.checkFinal(connection, data);
			}
		} catch (err) {
			try {
				console.log(err.stack);
			} catch (err) {
				console.log(err);
			}
			if (connection) {
				await db.closeConnection(connection);
			}
			throw err;
		} finally {
			if (connection) {
				await db.closeConnection(connection);
			}
		}
	},

  async renotifyFailure(data) {

		var connection = await db.getConnectionByType('write', data.cid);
		try {
			console.log("********RetryFailure:", data);
			if (data) {

				let message = data.msg;
				let wf = data.workflow && data.workflow.dependencies && data.workflow.dependencies.find(d => d.status == 'initiated');
				if (wf) {
					message = `Step: ${wf.job_name}${data.msg ? `, Message: ${data.msg}` : ''}`;
				}

				await DocumentManagerRoutines.checkFinal(connection, data);
			}
		} catch (err) {
			try {
				console.log(err.stack);
			} catch (err) {
				console.log(err);
			}
			await db.closeConnection(connection);
			throw err;
		} finally {
			await db.closeConnection(connection);
		}
	},
  

  async checkFinal(connection, data) {
		try {

			console.log("Our final checks :) ", data);

      			var name = "Retry " + data.document_name;

				// Generate documents
				// write job to assemble PDf document
				await Queue.add('merge_document_routine', {
					filename: name,
					document_batch_id: data.document_batch_id,
					document_batch_delivery_id: data.document_batch_delivery_id,
					old_db_id: data.old_db_id,
					rate_change_id: data.rate_change_id,
					cid: data.cid,
					company_id: data.company_id,
					property_id: data.property_id,
					socket_details: data.socket_details,
					tracking: {
						trace_id: data.tracking?.trace_id,
						event_name: data.tracking?.event_name
					},
				});
        /*
				// Auto approved automated rent changes will always have a reviewed date
				// Avoid creating tasks in this scenario
				if (!rate_change.reviewed) {
					try {
						let task = new Task({
							company_id: property.company_id,
							event_type: Enums.EVENT_TYPES.RATE_CHANGE.GENERATED_RATE_CHANGE_DOCUMENTS,
							task_type: Enums.TASK_TYPE.RATE_CHANGE,
							created_by: data.contact_id || null,
							object_id: rate_change.id,
						});
	
						await task.save(connection, property.company_id);
					} catch (err) {
						console.log("Generate Documenents error" + err);
					}
	
					try {
						let task = new Task({
							company_id: property.company_id,
							event_type: Enums.EVENT_TYPES.RATE_CHANGE.APPROVE_RATE_CHANGE,
							task_type: Enums.TASK_TYPE.RATE_CHANGE,
							created_by: data.contact_id || null,
							object_id: rate_change.id,
						});
	
						await task.save(connection, property.company_id);
					} catch (err) {
						console.log("Approve Rate Change error" + err);
					} 
				} */
		} catch (err) {
			try {
				console.log(err.stack);
			} catch (err) {
				console.log(err);
			}
		}
	},

  assembleDocumentBatch: async (data) => { 
    let { document_batch_id, cid, filename, company_id, property_id } = data;
    let file;

    console.log("Entry point ", data);

	let
		event_name = "assembleDocumentBatchLoggerEvent",
		summary = {};
	if (data?.event_name) {
		// If the request was from the rent management cronjob
		event_name = data.event_name
	}
	if (event_name === "RentManagementCron") {
		summary = {
			date: data?.date,
			time: (new Date).toLocaleString()
		}
		if (data?.property) {
			summary.property = {
				id: data?.property?.id,
				name: data?.property?.property_name,
				company_id: data?.property?.company_id
			}
		}
	}
    try {
    
      var connection = await db.getConnectionByType('write', cid);
      
  		let property = new Property({id: property_id});
      await property.find(connection);
      
      let company = new Company({id: property.company_id});
      await company.find(connection);

      let document_batch = new DocumentBatch({ id: document_batch_id });

      await document_batch.find(connection); 
      await document_batch.getDocuments(connection);

      if(document_batch.Documents.length){
        try {
		  console.time('combineToFileBufferTimer')
          file = await Upload.combineToFileBuffer(document_batch.Documents, filename);
		  console.timeEnd('combineToFileBufferTimer')
        } catch(err){
          console.log("Merged file generation error ", err);
          e.th(400, "Merged file generation error: " + err.toString()); 
        }
      }

      let upload = new Upload({
        name: filename,
        filename: file.file_name,
        fileloc: file.file_loc,
        mimetype: 'application/pdf',
        file: file.file_data.toString('base64')
      });

	  // If document type is rent change, then the tmp file is needed to upload the file to s3 (asynchronously file upload using file-app). The tmp file will be deleted in asynchronousUploadToS3 function
      let delete_tmp = (document_batch.document_type == 'Rent Change') ? false : true;
      await upload.setDocumentType(connection, null, 'file', company_id);
      await upload.save(connection, {delete_tmp});

	  let file_data;
      if (document_batch.document_type == 'Rent Change') {
		file_data = await upload.asynchronousUploadToS3(property, company, document_batch.Documents, !delete_tmp);
	  } else {
		file_data = await upload.sendFiletoS3(property, company, document_batch.Documents);
	  }

      upload.foreign_id = file_data.id; 
      await upload.update(connection, { foreign_id: file_data.id });

	  console.log("Second middle point ", { upload_id: upload?.id, upload_filename: upload?.filename })
      
      document_batch.upload_id = upload.id
      await document_batch.save(connection);

	  utils.sendLogs({
        event_name: event_name,
        logs: {
          payload: {
            data: {
				...data,
				merged_document_id: upload.id
			},
            stage: `MergeDocumentSuccess`
          }
        },
		summary: {
			...summary,
			stage: `MergeDocumentSuccess`
		}
      });

    } catch(err) {
      console.log("err", err)
      console.log(err.stack)

      utils.sendLogs({
        event_name: event_name,
        logs: {
          payload: {
            data: data,
            stage: `MergeDocumentsFailed`
          },
          error: err?.stack || err?.msg || err
        },
		summary: {
			...summary,
			stage: `MergeDocumentsFailed`
		}
      });
    }

    if(data.socket_details){
      let socket = new Socket({
        company_id: data.socket_details.company_id,
        contact_id: data.socket_details.contact_id,
      });

      try {
        let connected = await socket.isConnected(data.socket_details.contact_id);
        console.log("ARE We CONNECTED", connected);
      
        if(connected){
          if(file){
            await socket.createEvent("pdf_generated", {
              id: data.socket_details.document_id,
              data: file.file_data,
              content_type: 'application/pdf',
              filename: file.file_name,
              success: true
            });
          } else {
            await socket.createEvent("pdf_generated",  {
              id: data.socket_details.document_id,
              message: "Error occured on generating document",
              success: false
            });
          }
        }
      } catch(err){
        console.log("Err", err)
        console.log("Im catching this error, and it shouldn't make a big fuss about it");
      }
    }




    // let documents = [];
		// 		let rent_change_leases_records = await rent_change_lease.findByRateChangeId(connection);
		// 		for(let i = 0; i < rent_change_leases_records.length; i++){
		// 			if(rent_change_leases_records[i].upload_id){
		// 				let upload = new Upload({id: rent_change_leases_records[i].upload_id});
		// 				await upload.find(connection);
		// 				upload.setBucketNameByDocumentType(Enums.DOCUMENT_TYPES.UN_SIGNED);
		// 				if(upload.filename) documents.push(upload);
		// 			}
		// 		}

		// 		let rate_change = new RateChange({ id: rent_change_lease.rate_change_id });
		// 		await rate_change.findById(connection);

		// 		let property = new Property({id: rate_change.property_id});
		// 		await property.find(connection);

		// 		let file;
		// 		if(documents && documents.length){
		// 			try {
		// 				file = await Upload.combineToFileBuffer(documents, rate_change.name);
		// 			} catch(err){
		// 				console.log("Merged file generation error ", err);
		// 			}
		// 		}
		// 		console.log("file", file);
		// 		if(file){
		// 			let upload = new Upload({
		// 				name: rate_change.name,
		// 				filename: file.file_name,
		// 				fileloc: file.file_loc,
		// 				mimetype: 'application/pdf',
		// 				file: file.file_data.toString('base64')
		// 			});

		// 			await upload.setDocumentType(connection, null, 'file', property.company_id);
		// 			await upload.save(connection);

		// 			let company = new Company({id: data.company_id});
    //         		await company.find(connection);

		// 			await upload.sendFiletoS3(property,company,documents);

		// 			await rate_change.update(connection, {upload_id: upload.id});
		// 		} else {
		// 			console.log("no file to send");
		// 		}

		// 		if(data.socket_details){
		// 			let socket = new Socket({
		// 				company_id: data.socket_details.company_id,
		// 				contact_id: data.socket_details.contact_id,
		// 			});

		// 			try {
		// 				let connected = await socket.isConnected(data.socket_details.contact_id);
		// 				console.log("ARE We CONNECTED", connected);
		// 				if(connected){
		// 					if(file){
		// 						await socket.createEvent("pdf_generated", {
		// 							id: data.socket_details.document_id,
		// 							data: file.file_data,
		// 							content_type: 'application/pdf',
		// 							filename: file.file_name,
		// 							success: true
		// 						});
		// 					} else {
		// 						await socket.createEvent("pdf_generated",  {
		// 							id: data.socket_details.document_id,
		// 							message: "Error occured on generating document",
		// 							success: false
		// 						});
		// 					}
		// 				}
		// 			} catch(err){
		// 				console.log("Im catching this error, and it shouldn't make a big fuss about it");
		// 			}
    //     }
        



  },
}

module.exports = {
  generateDocument: async (data) => {
    return await DocumentManagerRoutines.generateDocument(data);
  },
  sendDocument: async (data) => {
    return await DocumentManagerRoutines.sendDocument(data);
  },
  assembleDocumentBatch: async (data) => {
    return DocumentManagerRoutines.assembleDocumentBatch(data);
  }, 
  generateDeliveries: async (data) => {
    return DocumentManagerRoutines.generateDeliveries(data);
  }, 
  retryDocument: async (data) => {
    return DocumentManagerRoutines.retryDocument(data);
  }, 
  renotifySuccess: async (data) => {
    return DocumentManagerRoutines.renotifySuccess(data);
  }, 
  renotifyFailure: async (data) => {
    return DocumentManagerRoutines.renotifyFailure(data);
  }, 
};

const db = require(__dirname + '/../modules/db_handler.js');
const e = require('../modules/error_handler');
var moment = require('moment');
const RateChangeRoutines = require('../routines/rate_change.js');

const bullmq  = require('bullmq');
const IORedis = require('ioredis');
const redis_connection = new IORedis({host: process.env.REDIS_HOST});
const Queue = new bullmq.Queue('hummingbirdQueue', { connection: redis_connection } );

const Socket = require('../classes/sockets.js');
const DocumentManager = require('../classes/document_manager');
const DocumentBatch = require('../classes/document_batch');
const Lease = require('../classes/lease');
const Property = require('../classes/property');
const Company = require('../classes/company');
const Upload = require('../classes/upload');
const RateChange = require('../classes/rate_change.js');
const ENUMS = require('../modules/enums');
var Enums = require(__dirname + '/../modules/enums.js');
const PandaDocs = require('../modules/pandadocs.js');
const Tokens = require(__dirname + '/../modules/tokens');
const utils = require('../modules/utils.js');