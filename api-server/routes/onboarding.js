module.exports = function(app) {

	router.get('/menudetails', [control.hasAccess(['admin']), Hash.unHash], async(req, res, next) => {
		try {
      		var connection = res.locals.connection;
			let menuItems = new MenuItem({companyid: res.locals.active.id});
	        const menuList = await menuItems.getOnboardingMenu(connection);
    	
			utils.send_response(res, {
				status: 200,
				data: {
					menuList: [menuList]
				},
				msg: "Data retrieved successfully!"
			});

		} catch(err) {
			next(err);
		}
	});

	router.post('/menudetails', [control.hasAccess(['admin']), Hash.unHash], async(req, res, next) => {
		var connection = res.locals.connection;
		try{
			await connection.beginTransactionAsync();
			let menu = new MenuItem(req.body);
			await menu.create(connection, res.locals.active.id);
			await connection.commitAsync();

			utils.send_response(res, {
				status: 200,
				data: "Menu created Successfully!"
			});
		} catch(err) {
			await connection.rollbackAsync();
			next(err);
		}
	});

	router.post('/upload-template', [control.hasAccess(['admin']), Hash.unHash], async(req, res, next) => {
		var connection = res.locals.connection;
		let filename = res.locals.active.id + '-' + req.files.file.name;
		let message; 
		let statusCode = 400;
		let data = {};
		try{
			if(req.files.file.size < 104857600){ //max size constant in env file ->104857600 or approx -> 1e8
				let isFileValid = onboardingModule.validateTemplate(req.files.file.name);
				if(isFileValid){
					let cols = onboardingModule.getDefaultTemplateColumns(req.query.template);
					let templateData = onboardingModule.getUploadedTemplateData(req.files.file.path, cols);
						
						let headersMatched = onboardingModule.validateHeadersFromFile(cols,Object.values(templateData[0]));
					if(headersMatched){
						let sheetData = templateData.slice(1);					
						if(sheetData.length){
							let errors = [];
							let resp = Schema[req.query.template].validate(sheetData, {abortEarly: false});
							let sheetRows = onboardingModule.transformKeys(req.query.template, sheetData);

							let template = new OnboardingTemplate(sheetRows);						
							errors = (resp.error != null) ? onboardingModule.collectErrorsForUploadedSheet(resp.error.details) : errors;

							await template.validateSheetDuplicates(errors,req.query.template)

							if(req.query.template == 'products'){	
								let productList = await template.findProductsByCompanyId(connection, res.locals.active.id);
								if(productList && productList.length)
								await template.validate(productList, errors)	
							}	

							if(errors.length){
								await onboardingModule.writeErroredFileForDownload(resp.value, errors,  filename, req.query.template);
								data = {filename : filename };							
								message = "Failed Validation";												
							}else{	
								let tablename = req.query.template;					
	
								await connection.beginTransactionAsync();							
								if(req.query.template == 'products'){		
									template.makeProducts(res.locals.active.id);
								}
								else if (req.query.template == 'spacemix'){
									tablename = 'nw_units_all';
									let payload = {
										activeCompanyName:res.locals.active.name,
										propertyName:req.body.property_name
									}

									await template.removeExistingRecords(connection,payload);

									template.makeUnitsWithTenants(payload);	
									// template.makePromotions(payload);		
									// await template.save(connection, 'nw_promotions_all');

									// template.makeDiscounts(payload);
									// tablename = 'nw_tenant_discounts_all';// change the name of the table- this name for now			
									await OnboardingDocument.updatePropertyStatusByPropertyID(connection, {merge_status:req.body.upload_type} ,req.body.property_id);

								}		
								
								await template.save(connection, tablename);
								await connection.commitAsync();
								statusCode = 200;							
								message = "Data added successfully";					
							}			
						}else{
							message = "No data found in the sheet to process"
						}
					}else{
						message = "Headers are mismatched as per given template. Please check once and reupload file."
					}
				}else{
					message = "Supported file extensions are xlsx, csv, xls"
				}
			}else{
				message = "File size should be less than 100MB"
			}

			if (fs.existsSync(req.files.file.path)) fs.rmSync(req.files.file.path);
			res.status(statusCode).json({
				status : statusCode,
				data:data,
				msg: message
			});
		} catch(err){
			await connection.rollbackAsync();
			next(err);
		}
	});

	router.get('/download-template', [control.hasAccess(['admin']), Hash.unHash], async(req, res, next) => {
        var connection = res.locals.connection;
        try{
            let template = req.query.template;
            var filename;
            let filepath = settings.config.base_path + 'uploads/onboarding/templates';
            if(!template){
                utils.send_response(res, {
                    status: 400,
                    msg: "No template type provided"
                });
            }else {
                filename = filepath+'/'+template+'.xlsx';
            }   
 
            if (!fs.existsSync(filename)){
                utils.send_response(res, {
                    status: 400,
                    msg: "No file found"
                });
            }else{
                res.writeHead(200, {
                    'Content-Disposition': `attachment; filename=`+filename,
                    'Content-Type':  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                })
                fs.createReadStream(filename).pipe(res);
            }
            
        } catch(err) {
            await connection.rollbackAsync();
            next(err);
        }
    });

	router.post('/download-errorfile', [control.hasAccess(['admin']), Hash.unHash], async(req, res, next) => {
        try{
            let filename = req.body.filename;
            let filepath = settings.config.base_path + 'uploads/onboarding/errortemplates/'+filename;
			/*Get the list of files from S3 bucket, 
			check for the 'Contents.length' to verify if the file exist on S3 or not*/
			let fileList = await onboardingModule.getFileList(filename);
			
			if (fileList.Contents.length < 1){
                utils.send_response(res, {
                    status: 400,
                    msg: "No file found"
                });
            }else{
				/*If the file exist on S3 , download the file,
				delete the file from S3 as this is just a temporary file and needs to be downloaded only once*/
                let downloadedData = await onboardingModule.download(filename);
				res.writeHead(200, {
                    'Content-Type':  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                })
				await onboardingModule.deleteFile(filename);
				res.end(downloadedData.Body);
            }
            
        } catch(err) {
            next(err);
        }
    });

	router.get('/products/accounting', [control.hasAccess(['admin']), Hash.unHash], async(req, res, next) => {
		try{
			let feesInventory = [];
			let account = new Accounting({
				company_id: res.locals.active.id
			});
			await account.getInventory();
			if(account.Inventory.length){
				let data = Hash.obscure(account.Inventory,req);
				feesInventory = [...
					new Set(data.map(
					  (obj) => {
						return obj.external_product_id
					  })
					)];
			}		
			utils.send_response(res, {
				status: 200,
				data : feesInventory,
				msg: "Account Inventory loaded!"
			});
		} catch(err) {
			next(err);
		}
	});

	router.get('/documents', [control.hasAccess(['admin']), Hash.unHash], async(req, res, next) => {
		try {
      		var connection = res.locals.connection;
			let onboardingDocument = new OnboardingDocument({company_id: res.locals.active.id, state: req.query.state, type: req.query.type});
	        const documentList = await onboardingDocument.getOnboardingDocuments(connection);
    	
			utils.send_response(res, {
				status: 200,
				data: {
					documentList:  Hash.obscure(documentList, req)
				},
				message: "Document list retrieved successfully!"
			});
		} catch(err) {
			next(err);
		}
	});

	router.post('/download-document/:document_id', [control.hasAccess(['admin']), Hash.unHash], async(req, res, next) => {
		try{
			
			 var connection = res.locals.connection;

            let documentId = Hash.clarify({id : req.params.document_id});
			let document = new OnboardingDocument({company_id: res.locals.active.id, id: documentId.id});
			await document.find(connection);
			let filename = document.name;
            let filepath = settings.config.base_path + 'uploads/onboarding/documents/';
					
			if(document.overrides_doc_id != null){
				filepath = filepath + 'other/' + res.locals.active.subdomain;
				filename = document.override_document_name;
			}else{
				if(document.type == 'general')
					filepath = filepath + document.type + '/' + document.subtype
				else if(document.type =='state' || document.type == 'delinquency' )
					filepath = filepath + document.type + '/' + document.state
				else
					filepath = filepath + document.type	+ '/' + res.locals.active.subdomain
			}	
			filepath = filepath+'/'+filename;	
			
			/*Check if the document exist on local 'uploads' directory,
			if document is not present in 'uploads' then check if the document is present on S3 bucket,
			get the list of files from S3 to verify if the document is present on S3 or not*/
			let fileExistsLocal = fs.existsSync(filepath);
			let fileExistsS3 = !fileExistsLocal ? await onboardingModule.getFileList(res.locals.active.subdomain+'/'+filename) : false ;
			if(!fileExistsLocal){
				fileExistsS3 = fileExistsS3.Contents.length < 1 ? false : true;
			}
			/*If the document is present on either local 'uploads' directory or S3, save the details in DB,
			prepare the document data to send in the response based on the document presence in 'uploads' or S3*/
			if (fileExistsLocal || fileExistsS3){
				document.status = 'downloaded';
				await connection.beginTransactionAsync();
				await document.save(connection);
				await connection.commitAsync();				
				var mimetype = mime.lookup(filepath);				
				res.setHeader('content-type', mimetype);
				
				if(fileExistsS3){
					let downloadedData = await onboardingModule.download(res.locals.active.subdomain+'/'+filename);
					res.end(downloadedData.Body);
					return;
				}	
				
         		res.sendFile(filepath);
				return;
            }
			res.writeHead(400, { "Content-Type": "text/plain" });
			res.end("Document does not exist");            
        } catch(err) {
            next(err);
        }
	});

	router.post('/upload-document/:document_id?', [control.hasAccess(['admin']), Hash.unHash], async(req, res, next) => {
		try{			
			var connection = res.locals.connection;
			let message; 
			let statusCode = 400;
			let data = {};
		    let documentId = Hash.clarify({id : req.params.document_id});
			let document = new OnboardingDocument({company_id: res.locals.active.id});	
			let isFileValid = onboardingModule.validateDocument(req.files.file.name);
			if(isFileValid){
				let newfilename = req.files.file.originalname.split('.')[0]+'_'+moment().utc().format('YYYYMMDDHHmmss')+'.'+req.files.file.extension;
				let path =settings.config.base_path + 'uploads/onboarding/documents/other/'+res.locals.active.subdomain;				
				if (!fs.existsSync(path)){
					fs.mkdirSync(path);
				}
				fs.copyFileSync(req.files.file.path, path+'/'+newfilename);
				if (fs.existsSync(req.files.file.path)) fs.rmSync(req.files.file.path);	
				/*Save the document on S3 bucket,
				delete the temporarily saved local file in 'uploads' directory as this is no longer needed
				because the document is pushed to S3*/
				await onboardingModule.uploadToS3(res.locals.active.subdomain+'/'+newfilename,path+'/'+newfilename);
				await onboardingModule.deleteTmpFile(path+'/'+newfilename);
				/**/
				if(req.params.document_id){
					document.id = documentId.id;
					await document.find(connection);
				}	
				let newDocument = {
					name : newfilename,
					type : document.type || 'other',
					subtype : req.body.subtype || document.subtype,
					state : document.state,
					label : req.files.file.originalname.split('.')[0],
					overrides : req.params.document_id ? 1 : 0
				}
				await connection.beginTransactionAsync();
				let newDocumentId = await document.saveUploadedDocument(connection, newDocument);
				if(req.params.document_id){
					document.overrides_doc_id = newDocumentId;
				}else{
					document.id = newDocumentId;
					await document.find(connection);
				}			
				document.status = "confirmed"					
				await document.save(connection);
				await connection.commitAsync();	
				statusCode = 200;
				data = Hash.obscure(document, req)
				message = "Document Uploaded successfully"
			}else{
				message = "Supported file extensions are xlsx, csv, xls"
			}	
			res.status(statusCode).json({
				status : statusCode,
				data:data,
				msg: message
			});
		} catch(err){
			await connection.rollbackAsync();
			next(err);
		}
	});

	router.post('/confirm-document', [control.hasAccess(['admin']), Hash.unHash], async(req, res, next) => {
		try{
			var connection = res.locals.connection;
			let body = req.body;
			let document = new OnboardingDocument({company_id: res.locals.active.id, id: body.id});
			await document.find(connection);
			 document.status = body.status;
			await connection.beginTransactionAsync();
			await document.save(connection);
			await connection.commitAsync();
			utils.send_response(res, {
                status: 200,
                data: Hash.obscure(document, req),
                message: 'Document confirmed successfully'
            });
		} catch(err){
			await connection.rollbackAsync();
			next(err);
		}
	});	

	router.delete('/delete-document/:document_id', [control.hasAccess(['admin']), Hash.unHash], async(req, res, next) => {
		try{
			var connection = res.locals.connection;
            let documentId = Hash.clarify({id : req.params.document_id});
			let document = new OnboardingDocument({company_id: res.locals.active.id, id: documentId.id});
			await document.find(connection);
			let filename = document.name;
            let filepath = settings.config.base_path + 'uploads/onboarding/documents/';
					
			if(document.overrides_doc_id != null){
				filepath = filepath + 'other/' + res.locals.active.subdomain;
				filename = document.override_document_name;
			}else{
				if(document.type == 'general')
					filepath = filepath + document.type + '/' + document.subtype
				else if(document.type =='state' || document.type == 'delinquency' )
					filepath = filepath + document.type + '/' + document.state
				else
					filepath = filepath + document.type	+ '/' + res.locals.active.subdomain
			}	
			filepath = filepath+'/'+filename;	
			/*Check if the document exist on local 'uploads' directory,
			if document is not present in 'uploads' then check if the document is present on S3 bucket,
			get the list of files from S3 to verify if the document is present on S3 or not*/
			let fileExistsLocal = fs.existsSync(filepath);
			let fileExistsS3 = !fileExistsLocal ? await onboardingModule.getFileList(res.locals.active.subdomain+'/'+filename) : false ;
			if(!fileExistsLocal){
				fileExistsS3 = fileExistsS3.Contents.length < 1 ? false : true;
			}
						
			/*If the document is present on either local 'uploads' directory or S3, delete the details in DB,
			delete the document based on the document presence in 'uploads' or S3*/
			if (fileExistsLocal || fileExistsS3){
				if(fileExistsLocal) fs.rmSync(filepath);
				await connection.beginTransactionAsync();
				await document.deleteDocument(connection);
				await connection.commitAsync();		
				
				if(fileExistsS3){					
					await onboardingModule.deleteFile(res.locals.active.subdomain+'/'+filename);
				}		
				utils.send_response(res, {
					status: 200,
					message: 'Document deleted successfully'
				});
            }else{
				res.writeHead(400, { "Content-Type": "text/plain" });
				res.end("Document does not exist");   
			}			         
        } catch(err) {
            next(err);
        }
	});

	router.get('/onboarding-company', [control.hasAccess(['admin']), Hash.unHash], async(req, res, next) => {
		try {
      		var connection = res.locals.connection;
			let property = {};
			let company= await models.Onboarding.findCompanyById(connection, res.locals.active.id);

			let newProperty = await models.Onboarding.findPropertiesByCompanyId(connection, res.locals.active.id);
			if(newProperty.length){				
				property = new Property({ id: newProperty[0].property_id});
				await property.find(connection);
				await property.getPhones(connection);
				await property.getEmails(connection);
			}

			let data = {
				company: Hash.obscure(company, req),
				property: property ? Hash.obscure(property, req) : {},
				propertyData: newProperty.length ? Hash.obscure(newProperty, req) : []
			}
			utils.send_response(res, {
				status: 200,
				data : data
			});

		} catch(err) {
			next(err);
		}
	});

	router.put('/onboarding-property', [control.hasAccess(['admin']), Hash.unHash], async(req, res, next) => {
		try {
      		var connection = res.locals.connection;
			let data={
                property_percentage:req.body.percentage
            }
			await connection.beginTransactionAsync();
            await models.Onboarding.savePropertyPercentage(connection,data,req.body.id);		
			await connection.commitAsync();	  
			utils.send_response(res, {
				status: 200,
				data : {},
				message : 'Percentage Updated successfully'
			});

		} catch(err) {
			next(err);
		}
	});

	router.post('/onboarding-property/:property_id/property-products', [control.hasAccess(['admin']), Hash.unHash], async(req, res, next) => {
		try{
			var connection = res.locals.connection;

			let params = req.params; 
			if(!params.property_id) e.th(400,'Property id required')

			await connection.beginTransactionAsync();
			await OnboardingDocument.propertyBulkMapping(connection,res.locals.active.id,params.property_id);
			await connection.commitAsync();

			utils.send_response(res, {
				status: 200,
				data: "Property mapped successfully!"
			});
		} catch(err) {
			await connection.rollbackAsync();
			next(err);
		}
	});

	router.get('/spacemix-data', [control.hasAccess(['admin']), Hash.unHash], async(req, res, next) => {
		try {
      		var connection = res.locals.connection;
			  var data ={
				company_name :res.locals.active.name,
				property_name:req.query.property_name
			  }
			const length = await OnboardingDocument.getSpacemixData(connection,data);
			utils.send_response(res, {
				status: 200,
				data: {
				  length
				}
			});
		} catch(err) {
			next(err);
		}
	});

	router.post('/merge-begin', [control.hasAccess(['admin']), Hash.unHash], async(req, res, next) => {
        try{
            var connection = res.locals.connection;
			let payload = {
				activeCompany: res.locals.active.subdomain,
				propertyName:req.body.property_name
			}
			await connection.beginTransactionAsync();
			await OnboardingDocument.deleteSpacemixThroughProcedure(connection, payload );
			await OnboardingDocument.saveSpacemixThroughProcedure(connection, payload );
			await connection.commitAsync();
            utils.send_response(res, {
                status: 200,
                data: "Property merged successfully!"
            });

        } catch(err) {
            await connection.rollbackAsync();
            next(err);
        }
    });

	router.post('/update-onboarding-status', [control.hasAccess(['admin']), Hash.unHash], async(req, res, next) => {
        try{

            var connection = res.locals.connection;
			let propertyStatus ={
				property_status: req.body.status
			  }
			await connection.beginTransactionAsync();
			await OnboardingDocument.updatePropertyStatusByPropertyID(connection, propertyStatus ,req.body.property_id );
			await connection.commitAsync();
            utils.send_response(res, {
                status: 200,
                data: "Property merged fail!"
            });

        } catch(err) {
            await connection.rollbackAsync();
            next(err);
        }
    });

	router.post('/onboarding-email', [control.hasAccess(['admin']), Hash.unHash], async(req, res, next) => {
        try{

            var connection = res.locals.connection;

			let body = req.body;
			let contact_email = body.contact_email;

			if (!body.subject.length) {
				e.th(400, "You have not entered a subject.");
			}

			let contacts = await OnboardingContact.getAllContacts(connection, contact_email);

			if(!(contacts && contacts.length)){
				e.th(400, "No records for this email");
			}

			let contact_id =  contacts[0].contact_id;

			let contact = new OnboardingContact({ id: contact_id });
			await contact.find(connection);

			let template = contact.selectTemplate(body);

			let gds_owner_id = res.locals.active.gds_owner_id;
			let property_id = null;
			let company = null; 	
			let fromEmail = settings.config.defaultFromEmail;

			await contact.sendEmail(connection, 0, 'Tenant', body.subject, template,body.attachments, null ,null, gds_owner_id, property_id, null ,fromEmail );

            utils.send_response(res, {
                status: 200,
                data: "success"
            });

        } catch(err) {
            next(err);
        }
    });

	router.get('/glossary-cms', [control.hasAccess(['admin']), Hash.unHash], async(req, res, next) => {
		try {
			let response = await onboardingModule.glossaryCMS();
			 utils.send_response(res, {
                status: 200,
                data: response
            });
		} catch(err) {
			next(err);
		}
	});



	return router;
};
var express = require('express');
var router = express.Router();
var settings    = require(__dirname + '/../config/settings.js');
var Hash = require(__dirname + '/../modules/hashes.js');
var control  = require(__dirname + '/../modules/site_control.js');

var MenuItem = require(__dirname + '/../classes/onboarding/menu_item.js');
var OnboardingDocument = require(__dirname + '/../classes/onboarding/onboarding_document.js');
var OnboardingTemplate = require(__dirname + '/../classes/onboarding/onboarding_template.js');
var OnboardingContact = require(__dirname + '/../classes/onboarding/onboarding_contact.js');
var Property = require(__dirname + '/../classes/property.js');
var models = require(__dirname + '/../models');
var utils    = require(__dirname + '/../modules/utils.js');
var fs = require('fs');

var e  = require(__dirname + '/../modules/error_handler.js');
var onboardingModule = require(__dirname + '/../modules/onboarding.js');
var Schema = require(__dirname + '/../validation/onboarding.js');
var Accounting  = require(__dirname + '/../classes/accounting.js');
var mime = require('mime');
var moment = require('moment');
var db = require(__dirname + '/../modules/db_handler.js');
