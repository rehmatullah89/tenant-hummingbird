var express = require('express');
var router = express.Router();
var moment      = require('moment');
// var Joi      = require('joi');
// var expressJoi      = require('express-joi-validator');
var settings    = require(__dirname + '/../config/settings.js');
var Hash = require(__dirname + '/../modules/hashes.js');
var Hashes = Hash.init();
var flash    = require(__dirname + '/../modules/flash.js');

var { updateGdsUnitStatus } = require('../modules/messagebus_subscriptions');
var response = {};

var control  = require(__dirname + '/../modules/site_control.js');
var Enums = require(__dirname + '/../modules/enums.js');
var Promise = require('bluebird');

var validator = require('validator');

var models = require(__dirname + '/../models');
var Unit = require(__dirname + '/../classes/unit.js');

var Address = require(__dirname + '/../classes/address.js');
var Lease = require(__dirname + '/../classes/lease.js');
var Lead = require(__dirname + '/../classes/lead.js');
var Contact = require(__dirname + '/../classes/contact.js');
var Event      = require('../classes/event.js');
var Upload      = require('../classes/upload.js');
var Property = require(__dirname + '/../classes/property.js');
var Category = require(__dirname + '/../classes/category.js');
var Application = require(__dirname + '/../classes/application.js');
var Payment = require(__dirname + '/../classes/payment.js');
var Scheduler = require(__dirname + '/../modules/scheduler.js');
var Reservation = require(__dirname + '/../classes/reservation.js');
var Touchpoint = require(__dirname + '/../classes/touchpoints.js');
var Settings = require(__dirname + '/../classes/settings.js');
var LeaseStoredContents = require(__dirname + '/../classes/lease_stored_contents.js');
var Todo = require(__dirname + '/../classes/todo.js');
var Promotion = require(__dirname + '/../classes/promotion.js');
var Discount = require(__dirname + '/../classes/discount.js');
var Schema = require(__dirname + '/../validation/units.js');
var utils    = require(__dirname + '/../modules/utils.js');
var Joi      = require('joi');
const contact = require('../models/contact');
const joiValidator = require('express-joi-validation')({
    passError: true
});
var User         = require('../classes/user.js');

var UnitSearch = require(__dirname + '/../modules/unit_searcher.js');

var Activity = require(__dirname + '/../classes/activity.js');
var e  = require(__dirname + '/../modules/error_handler.js');

var eventEmitter = require(__dirname + '/../events/index.js');

const getQueue = require("../modules/queue");
const Queue = getQueue('hummingbirdQueue');

var jwt         = require('jsonwebtoken');
var settings    = require(__dirname + '/../config/settings.js');


module.exports = function(app) {

    router.get('/list', [control.hasAccess(['admin']), Hash.unHash], async(req, res, next) => {
        var connection = res.locals.connection;
        try{

            let contact = res.locals.contact;
            let company = res.locals.active;
            let units = await Unit.findUniqueNumbers(connection, company.id);

            utils.send_response(res, {
                status: 200,
                data: {
                    units: Hash.obscure(units, req)
                }
            });
        } catch(err) {
            next(err);
        }
    });

    router.post('/omni-search', [control.hasAccess(['admin', 'api']), Hash.unHash], async (req, res, next) => {


        var connection = res.locals.connection;
        try{

            let contact = res.locals.contact;
            let company = res.locals.active;
            let body = req.body;
            let properties = body?.property_id && body?.source == 'linking' ? [body?.property_id] : res.locals.properties;
            let query = req.query;
            res.fns.addStep('start');
            let list = await Unit.omniSearch(connection, body, company.id, properties, query.type, res);
            res.fns.addStep('end');

            utils.send_response(res, {
                status: 200,
                data: {
                    results: Hash.obscure(list.results, req),
                    t: body.t
                }
            });


        } catch(err) {
            next(err);
        }

    });

    router.put('/bulk-edit', [control.hasAccess(['admin', 'api']), control.hasPermission('edit_space'), Hash.unHash], async(req, res, next) => {

        var connection = res.locals.connection;

        try{

            let contact = res.locals.contact;
            let company = res.locals.active;
            let body = req.body;

            try { 
                if(body.unit_ids)
                    body.unit_ids = body.unit_ids.map(item => item.id)
            } catch(err) {
                e.th(400 , 'Unit ids are not in object format');
            }

            await Unit.bulkEdit(connection, body, company.id,contact.id);
            utils.send_response(res, {
                status: 200,
                data: {}
            });

            let unit_ids = body.unit_ids.map(d => d.id);
            eventEmitter.emit('units_bulk_edited', {company, contact, units: body.unit_ids.join(', '), cid: res.locals.company_id, locals: res.locals});
            eventEmitter.emit('promotion_unit_update', {company, contact, units: unit_ids, cid: res.locals.company_id, locals: res.locals});
            
        } catch(err) {
            next(err);
        }

    });

    router.put('/bulk-edit-prices', [control.hasAccess(['admin', 'api']), joiValidator.body(Schema.bulkEditPrices), control.hasPermission('manage_rate_plans'), Hash.unHash], async(req, res, next) => {
        
      try{
        let { api, contact, isNectarRequest, appId, active: company, connection } = res.locals 

        let body = req.body;
        let dryrun = body && body.length && body[0].dryrun ? true : false;
        let data = {};

        let unit_price = await Unit.bulkEditPrices(connection, body, company.id, contact.id, { isNectarRequest, appId });
        if(dryrun) data = unit_price;

        utils.send_response(res, {
          status: 200,
          data: Hash.obscure(data, req)
        });

        if(!dryrun){
            let unit_ids = body.map(d => d.id);
            eventEmitter.emit('units_bulk_edited', {company, contact, api, units: unit_ids.join(', '), cid: res.locals.company_id, locals: res.locals});
            eventEmitter.emit('promotion_unit_update', {company, contact, units: unit_ids, cid: res.locals.company_id, locals: res.locals});
        }

      } catch(err) {
        next(err);
      }

    });

    router.get('/:unit_id/lease', [control.hasAccess(['admin']), Hash.unHash],  async (req, res, next) => {

        var connection = res.locals.connection;
        
        try {

            let contact = res.locals.contact;
            let company = res.locals.active;
            let params = req.params;

            let unit = new Unit({id: params.unit_id});
            await unit.find(connection)
            await unit.verifyAccess(connection, company.id, res.locals.properties);
            let lease = await unit.getCurrentLease(connection);
            if(!lease) e.th(404);

            await unit.Lease.getTenants(connection);
            await unit.Lease.getActiveRent(connection); // This is to get latest rent of lease
            //TODO should this return the unit?
            utils.send_response(res, {
                status: 200,
                data: {
                    lease:  Hash.obscure(unit.Lease, req)
                }
            });



        } catch(err) {
            next(err);
        }



    });

    router.post('/:unit_id/apply', [control.getAccountInfo,  joiValidator.query(Schema.apply), Hash.unHash], async (req, res, next) => {

        var connection = res.locals.connection;
        try{


            let params = req.params;
            let body = req.body;

            let company = await models.Company.findBySubdomain(connection, res.locals.subdomain);

            let unit = new Unit({id: params.unit_id});
            await unit.find(connection);
            await unit.verifyAccess(connection, company.id, res.locals.properties);

            let  property = new Property({id: unit.property_id});
            await  property.findApplication(connection);

            let application = new Application(body);

            await connection.beginTransactionAsync();
            await application.createApplication(connection, property.Application, body, unit, company.id);

            await connection.commitAsync();

            utils.send_response(res, {
                status: 200,
                data: {
                    application_id:  Hashes.encode(application.id, res.locals.company_id),
                    contact_id:  Hashes.encode(application.contact_id, res.locals.company_id)
                }
            });

            eventEmitter.emit('unit_application_created', {company, application, cid: res.locals.company_id, locals: res.locals});



        } catch(err) {
            connection.rollbackAsync();
            next(err);
        }



    });

    router.get('/rents', [control.hasAccess(['admin']), Hash.unHash], async (req, res, next) => {


        var connection = res.locals.connection;
        try{

            let contact = res.locals.contact;
            let company = res.locals.active;
            let rents = await Unit.getRents(connection, company.id);

            utils.send_response(res, {
                status: 200,
                data: {
                    min: rents[0].min,
                    max: rents[0].max
                }
            });


        } catch(err) {
            next(err);
        }



    });

    router.get('/floors', [control.hasAccess(['admin']), Hash.unHash], async(req, res, next) => {

        var connection = res.locals.connection;
        try{

            let contact = res.locals.contact;
            let company = res.locals.active;
            let properties = res.locals.properties;
            let query = req.query;

            if(query.property_id){
              properties = res.locals.properties.filter(p => p === query.property_id)
            }

            let floors = await Unit.getFloors(connection, company.id, properties);


            utils.send_response(res, {
                status: 200,
                data: {
                    floors: Hash.obscure(floors, req)
                }
            });


        } catch(err) {
            next(err);
        }



    });

    router.get('/sizes', [control.hasAccess(['admin']), Hash.unHash], async(req, res, next) => {

        var connection = res.locals.connection;
        try{

            let contact = res.locals.contact;
            let company = res.locals.active;
            let properties = res.locals.properties;
            let query = req.query;

            if(query.property_id){
              properties = res.locals.properties.filter(p => p === query.property_id)
            }

            let sizes = await Unit.getSizes(connection, company.id, properties);


            utils.send_response(res, {
                status: 200,
                data: {
                    sizes: Hash.obscure(sizes, req)
                }
            });


        } catch(err) {
            next(err);
        }



    });

    router.get('/beds', [control.hasAccess(['admin']), Hash.unHash], async(req, res, next) =>  {


        var connection = res.locals.connection;
        try{

            let contact = res.locals.contact;
            let company = res.locals.active;
            let beds = await Unit.getBeds(connection, company.id);

            utils.send_response(res, {
                status: 200,
                data: {
                    beds: beds
                }
            });


        } catch(err) {
            next(err);
        }



    });

    router.get('/baths', [control.hasAccess(['admin']), Hash.unHash], async (req, res, next) => {

        var connection = res.locals.connection;
        try{

            let contact = res.locals.contact;
            let company = res.locals.active;
            let baths = await Unit.getBaths(connection, company.id);

            utils.send_response(res, {
                status: 200,
                data: {
                    baths: baths
                }
            });


        } catch(err) {
            next(err);
        }



    });

    router.get('/unit-types', [control.hasAccess(['admin']), Hash.unHash], async (req, res, next) => {

        var connection = res.locals.connection;
        try{

            let contact = res.locals.contact;
            let company = res.locals.active;
            let unit_types = await Unit.getUnitTypes(connection, company.id);

            utils.send_response(res, {
                status: 200,
                data: {
                    types: Hash.obscure(unit_types, req)
                }
            });


        } catch(err) {
            next(err);
        }



    });

    router.get('/options', [control.hasAccess(['admin']), Hash.unHash], async(req, res, next) => {

        var connection = res.locals.connection;
        try{
            let contact = res.locals.contact;
            let company = res.locals.active;
            let properties = res.locals.properties;
            let query = req.query;

            if(query.property_id){
              properties = res.locals.properties.filter(p => p == query.property_id)
            }

            let unit_options = await Unit.getUnitOptions(connection, company.id, properties);

            utils.send_response(res, {
                status: 200,
                data: {
                    options: Hash.obscure(unit_options, req)
                }
            });


        } catch(err) {
            next(err);
        }



    });

    router.post('/bulk-config', [control.hasAccess(['admin']), Hash.unHash], async(req, res, next) => {

      var connection = res.locals.connection;
      try{

        let contact = res.locals.contact;
        let company = res.locals.active;
        let body = req.body;

        let unit_ids = body.unit_ids.map(item => item.id);
        let unit_list = await Unit.getMultipleById(connection, unit_ids, res.locals.properties, res.locals.active.id);

        utils.send_response(res, {
          status: 200,
          data: {
            units: Hash.obscure(unit_list, req)
          }
        });


      } catch(err) {
        next(err);
      }



    });

	  router.get('/:unit_id/leases', [control.hasAccess(['admin']), Hash.unHash], async(req, res, next) => {

        var connection = res.locals.connection;
        try{

            let contact = res.locals.contact;
            let company = res.locals.active;
	        let params = req.params;

            let unit = new Unit({id: params.unit_id})
            await unit.find(connection);
            await unit.verifyAccess(connection, company.id, res.locals.properties);
            await unit.getLeaseHistory(connection);

            utils.send_response(res, {
                status: 200,
                data: {
                    leases: Hash.obscure(unit.Leases, req)
                }
            });


        } catch(err) {
            next(err);
        }



    });

    router.post('/:unit_id/upload', [control.hasAccess(['admin']), control.hasPermission('edit_space'), Hash.unHash],  async(req, res, next) => {
      var company = res.locals.active;
      var loggedInContact = res.locals.contact;
      var api = res.locals.api;

      try {

        var params = req.params;
        var body = req.body;
        var files = req.files;
        var connection = res.locals.connection;

        let unit = new Unit({id: params.unit_id})
        await unit.find(connection);
        await unit.verifyAccess(connection, company.id, res.locals.properties);

        let file_list = [];
        if (Array.isArray(files.file)){
          file_list = files.file;
        } else {
          file_list.push(files.file);
        }
        let saved_uploads = []
        for (let i = 0; i < file_list.length; i++){
          let file = file_list[i];
          let upload = new Upload();
          await upload.setDocumentType(connection, body.document_type_id, body.document_type, company.id)
          upload.setFile(file, body.src);
          upload.uploaded_by = loggedInContact? loggedInContact.id: null;
          await upload.save(connection);
          let unit_upload = await upload.saveUploadUnit(connection, unit.id);
          // eventEmitter.emit('unit_file_uploaded', {company, upload, unit_upload, {contact: loggedInContact, locals: res.locals});
          saved_uploads.push({id: upload.id});
        }
        utils.send_response(res, {
          status: 200,
          data: {
            upload_id: Hash.obscure(saved_uploads, req)
          }
        });

      } catch (error) {
        next(error);
      }



      //
		  //
	    // } catch(err) {
		  //   next(err);
	    // }
      //
	    //



        // var company = res.locals.active;
        // var loggedInContact = res.locals.contact;
        // var connection = {};
        //
        // var params = req.params;
        // var body = req.body;
        // var files = req.files;
        // var unit = {};
        // var upload = {};
        //
        // pool.getConnectionAsync()
        //     .then(function(conn) {
        //         connection = conn;
        //         unit = new Unit({id: params.unit_id});
        //         return unit.find(connection);
        //     })
        //     .then(() => unit.verifyAccess(connection, company.id))
        //     .then(() => {
        //         upload = new Upload();
        //         return upload.setDocumentType(connection, body.document_type_id, body.document_type, company.id);
        //     })
        //     .then(() => {
        //         upload.setFile(files.file);
        //         upload.uploaded_by = loggedInContact.id;
        //         return upload.save(connection)
        //     })
        //     .then(() => upload.saveUploadUnit(connection, unit.id))
        //     .then(() => {
        //         //activity
        //         return true;
        //     })
        //     .then(() => {
        //         utils.send_response(res, {
        //             status: 200,
        //             data: {
        //                 upload_id: upload.id
        //             },
        //         })
        //     })
        //     .then(() => utils.saveTiming(connection, req, res.locals))
        //     .catch(next)
        //     .finally(() => utils.closeConnection(pool, connection))

    });

    router.put('/:unit_id/upload/sort', [control.hasAccess(['admin']), control.hasPermission('edit_space'), Hash.unHash], async(req, res, next) => {



	    var connection = res.locals.connection;
	    try{

		    let contact = res.locals.contact;
		    let company = res.locals.active;
		    let params = req.params;
		    let body = req.body;

		    let unit = new Unit({id: params.unit_id})
		    await unit.find(connection);
		    await unit.verifyAccess(connection, company.id, res.locals.properties);

		    for(let i = 0; i < body.uploads.length; i++ ){
			    await Upload.saveEntitySort(connection, 'uploads_units', i, body.uploads[i].id)
		    }

		    utils.send_response(res, {
			    status: 200,
			    data: {

			    }
		    });
		    //eventEmitter.emit('unit_file_uploaded', {company, contact, upload,  unit_upload, locals: res.locals});

	    } catch(err) {
		    next(err);
	    }



    });

    router.get('/amenities/:type', [control.hasAccess(['admin']), Hash.unHash], async (req, res, next) => {

        var connection = res.locals.connection;
        try{

            let contact = res.locals.contact;
            let company = res.locals.active;
            let params = req.params;
            let amenities;

            // TODo move to Amenity class
            if(params.type === 'all') {
                amenities = await models.Amenity.findUnitAmenitiesByProperty(connection, res.locals.properties ); 
            } else {
                amenities = await Unit.findAmenities(connection, params.type, company.id);
            }
            

            utils.send_response(res, {
                status: 200,
                data: {
                    amenities: Hash.obscure(amenities, req)
                }
            });


        } catch(err) {
            next(err);
        }



    });

    router.get('/features/:type', [control.hasAccess(['admin']), Hash.unHash], async (req, res, next) => {

        var connection = res.locals.connection;
        try{

            let contact = res.locals.contact;
            let company = res.locals.active;
            let params = req.params;

            // TODO move to Amenity class

            let features = await Unit.findFeatures(connection, params.type);

            utils.send_response(res, {
                status: 200,
                data: {
                    features: Hash.obscure(features, req)
                }
            });


        } catch(err) {
            next(err);
        }



    });

    router.post('/:unit_id/amenities', [control.hasAccess(['admin']), control.hasPermission('manage_space_amenities'), Hash.unHash], async (req, res, next) => {
        var connection = res.locals.connection;
        
        try{

            let contact = res.locals.contact;
            let company = res.locals.active;
            let params = req.params;
            let query = req.query;
            let body = req.body;
            body.cid = res.locals.company_id;

            let unit = new Unit({id: params.unit_id})
            await unit.find(connection);
            await unit.verifyAccess(connection, company.id, res.locals.properties);

            await unit.saveAmenities(connection, body, query.type);

            utils.send_response(res, {
                status: 200,
                data: {
                }
            });
            eventEmitter.emit('unit_amenities_updated', {company, contact, unit, cid: res.locals.company_id, locals: res.locals});

        } catch(err) {
            next(err);
        }





    });

    router.get('/:unit_id/amenities', [control.hasAccess(['admin', 'api']), Hash.unHash], async (req, res, next) => {

        var connection = res.locals.connection;
        try{

            let contact = res.locals.contact;
            let api = res.locals.api;
            let company = res.locals.active;
            let params = req.params;

            let unit = new Unit({id: params.unit_id})
            await unit.find(connection, api);
            await unit.verifyAccess(connection, company.id, res.locals.properties);

            await unit.getAmenities(connection);

            utils.send_response(res, {
                status: 200,
                data: {
                    unit: Hash.obscure(unit, req)
                }
            });

        } catch(err) {
            next(err);
        }



    });

    router.get('/:unit_id/utilities', [control.hasAccess(['admin', 'api']), Hash.unHash], async (req, res, next) => {

        var connection = res.locals.connection;
        try{

            let contact = res.locals.contact;
            let company = res.locals.active;
            let params = req.params;

            let unit = new Unit({id: params.unit_id})
            await unit.find(connection);
            await unit.verifyAccess(connection, company.id, res.locals.properties);

            await unit.getUtilities(connection);

            utils.send_response(res, {
                status: 200,
                data: {
                    unit: Hash.obscure(unit, req)
                }
            });

        } catch(err) {
            next(err);
        }




        // var company =  res.locals.active;
        // var params =  req.params;
        // var connection;
        // var unit = {};
        // pool.getConnectionAsync()
        //     .then(function(conn) {
        //         connection = conn;
        //         unit = new Unit({id: params.unit_id});
        //         return unit.find(connection);
        //     })
        //     .then(() => unit.verifyAccess(connection, company.id))
        //     .then(() => unit.getUtilities(connection))
        //     .then(function(){
        //         utils.send_response(res, {
        //             status: 200,
        //             data: {
        //                 unit: Hash.obscure(unit)
        //             }
        //         });
        //     })
        //     .then(() => utils.saveTiming(connection, req, res.locals))
        //     .catch(next)
        //     .finally(() => utils.closeConnection(pool, connection))



    });

    router.post('/:unit_id/utilities', [control.hasAccess(['admin']), control.hasPermission('edit_space'), Hash.unHash], async (req, res, next) => {

        var connection = res.locals.connection;
        try{

            let contact = res.locals.contact;
            let company = res.locals.active;
            let params = req.params;
            let body = req.body;

            let unit = new Unit({id: params.unit_id})
            await unit.find(connection);
            await unit.verifyAccess(connection, company.id, res.locals.properties);
            await unit.saveUtility(connection, body.utility);
            utils.send_response(res, {
                status: 200,
                data: {}
            });


            eventEmitter.emit('unit_utilities_created', {company, contact, unit, cid: res.locals.company_id, locals: res.locals});


        } catch(err) {
            next(err);
        }



        //
        // var connection;
        // var unit_id =  '';
        // var property;
        // var unit;
        // var company =  res.locals.active;
        // var contact =  res.locals.contact;
        // var unitAmenities ={};
        // var amenities ={};
        //
        // pool.getConnectionAsync().then(function(conn) {
        //     connection = conn;
        //     unit_id =  Hashes.decode(req.body.unit_id)[0];
        //
        //     if(!unit_id) throw "Unit ID missing.";
        //
        //     unit = new Unit({id: unit_id});
        //     return unit.find(connection);
        //
        // }).then(function(unitRes){
        //
        //     return unit.saveUtility(connection, req.body.utility);
        //
        // }).then(function(){
        //     utils.send_response(res, {
        //         status: true,
        //         data: {
        //         }
        //     });
        //
        // })
        // .then(() => utils.saveTiming(connection, req, res.locals))
        // .catch(next)
        // .finally(() => utils.closeConnection(pool, connection))
    });

    router.delete('/:unit_id/utilities/:utility_id', [control.hasAccess(['admin']), control.hasPermission('edit_space'), Hash.unHash], async (req, res, next) => {

        var connection = res.locals.connection;
        try{

            let contact = res.locals.contact;
            let company = res.locals.active;
            let params = req.params;
            let body = req.body;

            let unit = new Unit({id: params.unit_id})
            await unit.find(connection);
            await unit.verifyAccess(connection, company.id, res.locals.properties);

            await unit.getUtilities(connection);

            let utility = unit.Utilities.find(u => u.id === params.utility_id);
            if(!utility) e.th(404);
            await unit.deleteUtility(connection, utility.id);

            utils.send_response(res, {
                status: 200,
                data: {}
            });

            eventEmitter.emit('unit_utilities_deleted', {company, contact, unit, cid: res.locals.company_id, locals: res.locals});


        } catch(err) {
            next(err);
        }



        //
        // var connection;
        // var utility_id =  '';
        // var property;
        // var unit;
        // var company_id =  res.locals.active.id;
        //
        // // TODO: Limit to utilities from this unit / user has access to
        // pool.getConnectionAsync().then(function(conn) {
        //     connection = conn;
        //
        //     utility_id =  Hashes.decode(req.params.utility_id)[0];
        //
        //     if(!utility_id) throw "Utility ID missing.";
        //
        //     return models.Unit.findUtilityById(connection, utility_id);
        //
        // }).then(function(utilityRes){
        //     if(!utilityRes) throw "utility Not Found";
        //
        //     return models.Unit.deleteUtility(connection, utility_id);
        //
        // }).then(function(){
        //
        //
        //         utils.send_response(res, {
        //             status: true,
        //             data: {}
        //         });
        //     })
        //     .then(() => utils.saveTiming(connection, req, res.locals))
        //     .catch(next)
        //     .finally(() => utils.closeConnection(pool, connection))
    });

    router.get('/:unit_id/rent-rules', [control.hasAccess(['admin']), Hash.unHash], async (req, res, next) => {


        var connection = res.locals.connection;
        try{

            let contact = res.locals.contact;
            let company = res.locals.active;
            let params = req.params;
            let body = req.body;

            let unit = new Unit({id: params.unit_id})
            await unit.find(connection);
            await unit.verifyAccess(connection, company.id, res.locals.properties);

            let rules = await unit.getApiPrices(connection);

            utils.send_response(res, {
                status: 200,
                data: {
                    rules: Hash.obscure(rules, req)
                }
            });


        } catch(err) {
            next(err);
        }



    });

    //TODO Validation here for max number here is not working

    router.post('/:unit_id/rent-rule', [control.hasAccess(['admin']), joiValidator.query(Schema.rentRule), control.hasPermission('manage_rate_plans'), Hash.unHash], async(req, res, next) => {

        var connection = res.locals.connection;
        try{

            let contact = res.locals.contact;
            let company = res.locals.active;
            let params = req.params;
            let body = req.body;

            let unit = new Unit({id: params.unit_id})
            await unit.find(connection);
            await unit.verifyAccess(connection, company.id, res.locals.properties);

            let rule = await unit.saveApiPrice(connection, body);

            utils.send_response(res, {
                status: 200,
                data: {
                    rule_id: Hashes.encode(rule.id, res.locals.company_id)
                }
            });

            eventEmitter.emit('unit_rent_rule_created', {company, contact, unit, rule, cid: res.locals.company_id, locals: res.locals});


        } catch(err) {
            next(err);
        }


    });

    router.delete('/:unit_id/rent-rule/:api_unit_id', [control.hasAccess(['admin']), control.hasPermission('manage_rate_plans'), Hash.unHash], async (req, res, next) => {

        var connection = res.locals.connection;
        try{

            let contact = res.locals.contact;
            let company = res.locals.active;
            let params = req.params;
            let body = req.body;

            let unit = new Unit({id: params.unit_id})
            await unit.find(connection);
            await unit.verifyAccess(connection, company.id, res.locals.properties);

            let rules = await unit.getApiPrices(connection);
            let rule = rules.find(r => r.id === params.api_unit_id);
            if(!rule) e.th(404);

            await unit.deleteApiPrice(connection, rule.id);

            utils.send_response(res, {
                status: 200,
                data: {}
            });

            eventEmitter.emit('unit_rent_rule_deleted', {company, contact, unit, rule, cid: res.locals.company_id, locals: res.locals});


        } catch(err) {
            next(err);
        }



    });

    router.get('/:unit_id', [control.hasAccess(['admin', 'api']), Hash.unHash], async(req, res, next) => {


        try{

          var connection = res.locals.connection;
          let contact = res.locals.contact;
          let company = res.locals.active;
          let params = req.params;

          let api =  res.locals.api || {};
          let unit = new Unit({id: params.unit_id});
          let { grouping_profile_id } = req.query
          await unit.find(connection, api);

          await unit.verifyAccess(connection, company.id, res.locals.properties);
          await unit.getProduct(connection);

          await unit.getFeatures(connection);
          await unit.getCategory(connection);
          await unit.getCurrentLease(connection);
          await unit.getNextLeaseStart(connection);
          await unit.getImages(connection, company.id);
          await unit.getFloorplan(connection, company.id);
          await unit.getAddress(connection);
          await unit.getHold(connection);
          await unit.setState(connection);
          await unit.getGateStatus(connection);
          await unit.setSpaceMixId(connection);

          if(unit.Lease){
              await unit.Lease.getTenants(connection);
          }

          if(!unit.Lease && unit.next_lease_start){
            await unit.getFutureLease(connection,unit.next_lease_start);
          }
          if (grouping_profile_id) {
            await unit.findUnitGroup(connection, grouping_profile_id)
          }

          utils.send_response(res, {
              status: 200,
              data: {
                  unit: Hash.obscure(unit, req)
              }
          });


        } catch(err) {
          console.log("err", err);
            next(err);
        }

    });

    router.get('/:unit_id/features', [control.hasAccess(['admin', 'api']), Hash.unHash], async(req, res, next) => {

        var connection = res.locals.connection;

        try{

            let contact = res.locals.contact;
            let company = res.locals.active;
            let params = req.params;
            let api =  res.locals.api || {};

            let unit = new Unit({id: params.unit_id})


            await unit.find(connection, api);
            await unit.verifyAccess(connection, company.id, res.locals.properties);
            await unit.getFeatures(connection);
            await unit.getCategory(connection);
            await unit.getProduct(connection);


            utils.send_response(res, {
                status: 200,
                data: {
                    unit: Hash.obscure(unit, req)
                }
            });


        } catch(err) {
            next(err);
        }



    });

    router.get('/:unit_id/images', [control.hasAccess(['admin', 'api']), Hash.unHash], async(req, res, next) => {


        var connection = res.locals.connection;

        try{

            let contact = res.locals.contact;
            let company = res.locals.active;
            let params = req.params;
            let api =  res.locals.api || {};

            let unit = new Unit({id: params.unit_id})


            await unit.find(connection, api);
            await unit.verifyAccess(connection, company.id, res.locals.properties);
            await unit.getImages(connection, company.id);

            utils.send_response(res, {
                status: 200,
                data: {
                    images: Hash.obscure(unit.Images, req)
                }
            });


        } catch(err) {
            next(err);
        }



    });

    router.get('/:unit_id/floorplan', [control.hasAccess(['admin', 'api']), Hash.unHash], async (req, res, next) => {

        var connection = res.locals.connection;

        try{

            let contact = res.locals.contact;
            let company = res.locals.active;
            let params = req.params;
            let api =  res.locals.api || {};

            let unit = new Unit({id: params.unit_id})


            await unit.find(connection, api);
            await unit.verifyAccess(connection, company.id, res.locals.properties);
            await unit.getFloorplan(connection, company.id);

            utils.send_response(res, {
                status: 200,
                data: {
                    floorplan: Hash.obscure(unit.Floorplan, req)
                }
            });


        } catch(err) {
            next(err);
        }



    });

    router.get('/:unit_id/pending', [control.hasAccess(['admin', 'api']), Hash.unHash], async(req, res, next) => {

        var connection = res.locals.connection;

        try{

            let contact = res.locals.contact;
            let company = res.locals.active;
            let params = req.params;
            let api =  res.locals.api || {};

            let unit = new Unit({id: params.unit_id})


            await unit.find(connection, api.id);
            await unit.verifyAccess(connection, company.id, res.locals.properties);
            await unit.getPendingLease(connection, company.id);

            utils.send_response(res, {
                status: 200,
                data: {
                    lease: Hash.obscure(unit.Pending, req)
                }
            });


        } catch(err) {
            next(err);
        }



    });

    router.get('/:unit_id/promotions', [control.hasAccess(['admin', 'api']), Hash.unHash], async(req, res, next) => {


        var connection = res.locals.connection;

        try{

            let contact = res.locals.contact;
            let company = res.locals.active;
            const query = req.query;
            let params = req.params;
            let api =  res.locals.api || {};

            const { label } = query;
            let unit = new Unit({id: params.unit_id})

            await unit.find(connection, api);
            await unit.verifyAccess(connection, company.id, res.locals.properties);
            await unit.getPromotions(connection, label);

            utils.send_response(res, {
                status: 200,
                data: {
                    promotions: Hash.obscure(unit.Promotions, req)
                }
            });


        } catch(err) {
            next(err);
        }



    });

    router.post('/:unit_id/hold', [control.hasAccess(['admin', 'api']), Hash.unHash], async (req, res, next) => {

        var connection = res.locals.connection;

        try{

            let contact = res.locals.contact;
            let company = res.locals.active;
            let params = req.params;
            let api =  res.locals.api || {};

            let unit = new Unit({id: params.unit_id})


            await unit.find(connection, api);
            await unit.verifyAccess(connection, company.id, res.locals.properties);
            //await unit.getHold(connection);
            await unit.setState(connection);
            await unit.canRent(connection);
            let token = await unit.setHold(connection);

            utils.send_response(res, {
                status: 200,
                data: {
                    hold_token: Hashes.encode(token, res.locals.company_id)
                }
            });
            eventEmitter.emit('unit_hold_created', {company, contact, api,unit, cid: res.locals.company_id, locals: res.locals});

        } catch(err) {
            next(err);
        }



    });

    router.delete('/:unit_id/hold/:hold_id', [control.hasAccess(['admin', 'api']), Hash.unHash], async(req, res, next) => {


        var connection = res.locals.connection;

        try{

            let contact = res.locals.contact;
            let company = res.locals.active;
            let params = req.params;
            let api =  res.locals.api || {};

            let unit = new Unit({id: params.unit_id});


            await unit.find(connection, api);
            await unit.verifyAccess(connection, company.id, res.locals.properties);
            await unit.getHold(connection);
            if(!unit.hold_token || unit.hold_token !== params.hold_id){
                e.th(404, "Hold Token not found");
            }
            await unit.removeHold(connection);

            utils.send_response(res, {
                status: 200,
                data: {

                }
            });
            eventEmitter.emit('unit_hold_deleted', {company, contact, unit, cid: res.locals.company_id, locals: res.locals});

        } catch(err) {
            next(err);
        }

    });

    router.get('/:unit_id/payment-cycles', [control.hasAccess(['admin', 'api']), Hash.unHash], async(req, res, next) => {

        var connection = res.locals.connection;

        try {

            let contact = res.locals.contact || {};
            let company = res.locals.active;
            let params = req.params;
            
            let unit = new Unit({id: params.unit_id});
            await unit.find(connection);
            await unit.verifyAccess(connection, company.id, res.locals.properties);
            let property = new Property({id: unit.property_id});
            await property.find(connection);
            await property.getTemplates(connection);
            
            let template = property.LeaseTemplates[unit.type].Template || {};
            
            if(!template.id) e.th(404, "Template not found");
        
        
            await template.findPaymentCycles(connection);
        
            utils.send_response(res, {
                status: 200,
                data: {
                    PaymentCycleOptions: Hash.obscure(template.payment_cycle_options, req)
                }
            });
        
        } catch(err) {
            next(err);
        }

    });


    router.get('/:unit_id/lease-set-up', [control.hasAccess(['admin', 'api']),  joiValidator.query(Schema.leaseSetUp), Hash.unHash], async(req, res, next) => {

        var connection = res.locals.connection;

        try{

            let contact = res.locals.contact || {};
            let company = res.locals.active;
            let params = req.params;
            let query = req.query;
            let body = req.body;
            let api =  res.locals.api || {};
            if(query.promotions && query.promotions.length > 1){
                query.promotions = Array.from(new Set(query.promotions.map(a => a.promotion_id)))
 					.map(id => {
   						return query.promotions.find(a => a.promotion_id === id)
					 });
            }
            let query_params = {
                start_date: query.start_date || moment().format('YYYY-MM-DD'),
                //promotions : (query && query.promotions && query.promotions.length && query.promotions.filter((p, index, self) => self.findIndex(t => t.promotion_id === p && p.promotion_id) === index)) || [],
                promotions : query.promotions || [],
                coupons : query.coupons || [],
                insurance_id : query.insurance_id || null,
                billed_months: query.additional_months || 0,
                payment_cycle: query.payment_cycle || null,
                hold_token: query.hold_token || null,
                products: query.products || [],
                reservation_id: query.reservation_id || null,
                fetch_discounts: false
            };

        
            let unit = new Unit({id: params.unit_id});

            await unit.find(connection, api);
            await unit.verifyAccess(connection, company.id, res.locals.properties);
            await unit.getNextLeaseStart(connection);
            await unit.getCurrentLease(connection);
            await unit.getHold(connection);
            await unit.setState(connection);
            await unit.getPromotions(connection);
            await unit.canRent(connection, moment(query_params.start_date, 'YYYY-MM-DD'), query_params.hold_token, query_params.reservation_id );


            let property = new Property({id: unit.property_id});
            await property.find(connection);
            await property.getAddress(connection);
            await property.getTemplates(connection);

         
            let reservation = {};
            
            if(query_params.reservation_id){
                reservation = new Reservation({id: query_params.reservation_id});
                await reservation.find(connection);
                await reservation.Lease.canAccess(connection, company.id, res.locals.properties);
                await reservation.Lease.findUnit(connection);
                await reservation.Lease.getTenants(connection);
                await reservation.Lease.getCurrentBalance(connection);
            }
            
            
            let data = await unit.rentUnit(connection, {
                api,
                params: query_params,
                template: property.LeaseTemplates[unit.type].Template || {},
                company_id: company.id,
                reservation,
                save: false,
                contact,
                override_prorate: false,
                StepTimer: res.fns.addStep
            });
            let results = Unit.formatLeaseSetup(data, unit);
            utils.send_response(res, {
                status: 200,
                data: {
                    details: Hash.obscure(results,req)
                }
            });
           

        } catch(err) {
            next(err);
        }
    });

    router.post('/:unit_id/lease-set-up', [control.hasAccess(['admin', 'api']),  joiValidator.query(Schema.leaseSetUp), Hash.unHash], async(req, res, next) => {
        var connection = res.locals.connection;

        try{

            let contact = res.locals.contact || {};
            let company = res.locals.active;
            let params = req.params;
            let query = req.query;
            let body = req.body;
            let api =  res.locals.api || {};
            let reqBody = {
                start_date: body.start_date || moment().format('YYYY-MM-DD'),
                //promotions : (query && query.promotions && query.promotions.length && query.promotions.filter((p, index, self) => self.findIndex(t => t.promotion_id === p && p.promotion_id) === index)) || [],
                promotions : body.promotions || [],
                coupons : body.coupons || [],
                insurance_id : body.insurance_id || null,
                billed_months: body.additional_months || 0,
                hold_token: body.hold_token || null,
                payment_cycle: body.payment_cycle || null,
                products: body.products || [],
                reservation_id: body.reservation_id || null,
                token : body.token 
            };

            let unit = new Unit({id: params.unit_id});

            await unit.find(connection, api);
            await unit.verifyAccess(connection, company.id, res.locals.properties);
            await unit.getNextLeaseStart(connection);
            await unit.getCurrentLease(connection);
            await unit.getHold(connection);
            await unit.setState(connection);
            await unit.getPromotions(connection);
            await unit.canRent(connection, moment(reqBody.start_date, 'YYYY-MM-DD'), reqBody.hold_token, reqBody.reservation_id );


            let property = new Property({id: unit.property_id});
            await property.find(connection);
            await property.getAddress(connection);
            await property.getTemplates(connection);


            let reservation = {};
            
            if(reqBody.reservation_id){
                reservation = new Reservation({id: reqBody.reservation_id});
                await reservation.find(connection);
                await reservation.Lease.canAccess(connection, company.id, res.locals.properties);
                await reservation.Lease.findUnit(connection);
                await reservation.Lease.getTenants(connection);
                await reservation.Lease.getCurrentBalance(connection);
            }

            let decoded = reqBody.token ? decodeToken(reqBody.token) : null
            let data = await unit.rentUnit(connection, {
                api,
                params: reqBody,
                template: property.LeaseTemplates[unit.type].Template || {},
                company_id: company.id,
                reservation,
                save: false,
                contact,
                token: decoded,
                StepTimer: res.fns.addStep
            });
            let results = Unit.formatLeaseSetup(data, unit);
            utils.send_response(res, {
                status: 200,
                data: {
                   details: Hash.obscure(results,req),
               
                }
            });


        } catch(err) {
            next(err);
        }
    });
 
    /* Includes
    *
    * x Lease Start Date     * Required
    * x Type                 * Required  Lease or Reservation (taken from Endpoint)
    * x Lead Id
    *   Application ID
    * X Contact Ids          (Array) to turn into tenants
    * x Products             (Array) of objects to be billed for in addition to whats on the lease template
    *                        { product_id, qty }
    * x Insurance Id         Will be added to the Lease and Invoice
    * x Promotion Id         Will Be added to the lease, and applied to the invoice if possible
    * X Payment Method       Object - To pay the generated invoice
    * x Billed Months        Number of additional months to bill for upfront
    * x Hold Token           Hold token if this unit has been held - will give access to generate lease or reservation
    *
    * */

    router.post('/:unit_id/overlock', [control.hasAccess(['admin', 'api']), Hash.unHash], async (req, res, next) => {

      var connection = res.locals.connection;
      try {
        var params = req.params;
        var contact = res.locals.contact || {};
        var api = res.locals.api || {};
        var unit = new Unit({id: params.unit_id } );
        var body = req.body;

        let lease_id = body.lease_id ? body.lease_id : null;
        await unit.find(connection, api);

        await connection.beginTransactionAsync();
        try {
            await unit.setOverlock(connection);
        } catch(err){
            if(err.code !== 409){
                throw err;
            }
        }
        if(lease_id){
            await Todo.dismissTasks(connection, lease_id, Enums.EVENT_TYPES_COLLECTION.OVERLOCK_SPACE, Enums.TASK_TYPE.LEASE, contact.id, api.id);
        }

        await connection.commitAsync();

        utils.send_response(res, {
          status: 200,
          data: { }
        });

      } catch (error) {
        await connection.rollbackAsync();
        next(error)
      }
    });

    router.delete('/:unit_id/overlock', [control.hasAccess(['admin', 'api']), Hash.unHash], async (req, res, next) => {
      var connection = res.locals.connection;
      let loggedInUser = res.locals.contact || {};
      try {
        var params = req.params;
        var api = res.locals.api || {};
        var unit = new Unit({id: params.unit_id } );
        var query = req.query;

        const lease_id = query.lease_id ? query.lease_id : null;
        await unit.find(connection, api);

        await connection.beginTransactionAsync();
        try {
            await unit.removeOverlock(connection);
        } catch(err){
            if(err.code !== 409){
                throw err;
            }
        }
        if(lease_id){
            await Todo.dismissTasks(connection, lease_id, Enums.EVENT_TYPES_COLLECTION.LOCK_REMOVAL, Enums.TASK_TYPE.LEASE, loggedInUser.id, api.id);
        }

        await connection.commitAsync();

        utils.send_response(res, {
          status: 200,
          data: { }
        });


      } catch (error) {
        await connection.rollbackAsync();
        next(error);
      }

    });

    router.post('/overlock-all', [control.hasAccess(['admin', 'api']), Hash.unHash], async (req, res, next) => {



        var connection = res.locals.connection;        
        let loggedInUser = res.locals.contact || {};
        var company = res.locals.active || {};
        var properties = res.locals.properties || {};
        try {
          var params = req.params;
          var api = res.locals.api || {};

            // get all overlock tasks for manager, 
            // let open_todos = await Todo.findTasksByEventType(connection, Enums.EVENT_TYPES_COLLECTION.OVERLOCK_SPACE, contact.id, company.id, properties);
            let eventTypes = await Event.findEventTypes(connection);

            let ids = eventTypes.filter(e => Enums.EVENT_TYPES_COLLECTION.OVERLOCK_SPACE.indexOf(e.slug) >= 0).map(e => e.id); 
        
            await connection.beginTransactionAsync();
  
            let open_todos = await Todo.findOpen(connection, company.id, loggedInUser.id, false, {event_type_ids: ids},  properties);
            let task_ids = open_todos.map(o => o.id); 
            

            let units = await Todo.findUnitsFromTasks(connection, task_ids);
            let unit_ids = units.map(o => o.id); 

            await Unit.setAllOverlocks(connection, unit_ids); 
            await Todo.dismissAllById(connection, loggedInUser.id, task_ids); 
        
            await connection.commit();
        
            utils.send_response(res, {
                status: 200,
                data: { }
            });
  
  
        } catch (error) {
          await connection.rollbackAsync();
          next(error);
        }

      });
  
      router.delete('/overlock-all', [control.hasAccess(['admin', 'api']), Hash.unHash], async (req, res, next) => {
        
        var connection = res.locals.connection;        
        let loggedInUser = res.locals.contact || {};
        var company = res.locals.active || {};
        var properties = res.locals.properties || {};
        try {
          var params = req.params;
          var api = res.locals.api || {};

            // get all overlock tasks for manager, 
            // let open_todos = await Todo.findTasksByEventType(connection, Enums.EVENT_TYPES_COLLECTION.OVERLOCK_SPACE, contact.id, company.id, properties);
            let eventTypes = await Event.findEventTypes(connection);

            let ids = eventTypes.filter(e => Enums.EVENT_TYPES_COLLECTION.LOCK_REMOVAL.indexOf(e.slug) >= 0).map(e => e.id); 
        
            await connection.beginTransactionAsync();
  
            let open_todos = await Todo.findOpen(connection, company.id, loggedInUser.id, false, {event_type_ids: ids},  properties);
            let task_ids = open_todos.map(o => o.id); 

            await Unit.removeAllOverlocks(connection, properties); 
            await Todo.dismissAllById(connection, loggedInUser.id, task_ids); 
            
            await connection.commit();
          
  
          utils.send_response(res, {
            status: 200,
            data: { }
          });
  
  
        } catch (error) {
          await connection.rollbackAsync();
          next(error);
        }
  
      });
  

    router.put('/:unit_id/catches', [control.hasAccess(['admin', 'tenant', 'api']), Hash.unHash], async (req, res, next) => {

        var connection = res.locals.connection;
        try {

            let company = res.locals.active;
            let params = req.params;

            let property = new Property({ id: req.body.property_id });
            await property.find(connection);
            await property.verifyAccess({company_id: company.id});
            await property.getAccessControl(connection);

            let unit = new Unit({id: params.unit_id});
            await unit.find(connection)
            await property.Access.createSpaceIfNotExist(unit);
            await property.Access.updateCatches(params.unit_id, req.body);


            utils.send_response(res, {
                status: 200,
                data: {}
            });

        } catch (err) {
            next(err);
        }
    });

    router.get('/:unit_id/space-code', [control.hasAccess(['admin', 'tenant', 'api']), Hash.unHash], async (req, res, next) => {

        var connection = res.locals.connection;
        try {

            let company = res.locals.active;
            let params = req.params;
            let query = req.query;

            let property = new Property({ id: query.property_id });
            await property.find(connection);
            await property.verifyAccess({company_id: company.id});
            await property.getAccessControl(connection);

            let pin = await property.Access.getSpaceCode(params.unit_id);


            utils.send_response(res, {
                status: 200,
                data: {
                    pin: Hash.obscure(pin, req)
                }
            });

        } catch (err) {
            next(err);
        }
    });
      

    router.put(['/:unit_id/enable', '/:unit_id/disable' ], [control.hasAccess(['admin']), Hash.unHash], async(req, res, next) => {

        var connection = res.locals.connection;
        try{

        let contact = res.locals.contact;
        let company = res.locals.active;
        var body = req.body;
        var params = req.params;

        let unit = new Unit({id: params.unit_id});
        await unit.find(connection)
        await unit.verifyAccess(connection, company.id, res.locals.properties);
        let status = req.url.indexOf('enable') >= 0 ? 1 : 0;

        unit.update({status});
        await unit.save(connection);
        await updateGdsUnitStatus(connection, unit.property_id,unit.id);

        let activity = new Activity();
        await activity.create(connection, company.id, contact.id, 3, 16, params.unit_id);


        utils.send_response(res, {
            status: 200,
            data: { }
        });


        } catch(err) {
        next(err);
        }


  });

    router.put('/:unit_id/reserve/:reservation_id', [control.hasAccess(['admin']), joiValidator.body(Schema.createLease), Hash.unHash], async (req, res, next) => {
      var connection = res.locals.connection;
      try {
        let user = res.locals.contact || {};
        let company = res.locals.active;
        let company_id = company.id;
        let body = req.body;
        let params = req.params;
        let contacts = body.contacts || [];

        // var time = req.body.time ? moment(req.body.time, 'YYYY-MM-DD HH:mm:ss'): moment(body.start_date, 'YYYY-MM-DD');
        var time = req.body.time ? moment(req.body.time, 'YYYY-MM-DD HH:mm:ss'): moment();
        let unit = new Unit({id: params.unit_id } );
        await unit.find(connection);
        await  unit.verifyAccess(connection, company.id, res.locals.properties);

        let reservation = new Reservation({id: params.reservation_id});
        await reservation.find(connection);
        await reservation.Lease.canAccess(connection, company.id, res.locals.properties);
        await reservation.Lease.getTenants(connection);

        const { auto_pay_after_billing_date: autoPayAfterBillingDate } = body;
        reservation.Lease.start_date = body.start_date;
        reservation.Lease.end_date = body.end_date;
        reservation.Lease.notes = body.comments;
        reservation.Lease.rent = body.rent;
        reservation.Lease.security_deposit = body.security_deposit;
        reservation.Lease.unit_id = unit.id;
        reservation.Lease.Unit = unit;
        reservation.Lease.discount_id = body.discount_id;
        reservation.Lease.promotions = body.promotions;
        reservation.Lease.auto_pay_after_billing_date = autoPayAfterBillingDate || 0;  
        reservation.Lease.modified_by = user?.id;   

        try {
            await utils.hasPermission({connection, company_id: company.id, contact_id: user.id, api, permissions: ['edit_bill_day_onboarding_process']});
            reservation.Lease.bill_day = body.bill_day;
        } catch(err){
            console.log("edit_bill_day_onboarding_process reservation PUT error", err);
        }

        var reservationExpiration = await Settings.getSettingValue(connection, 'reservationExpiration', {company_id: company.id, property_id: unit.property_id});
        reservation.expires =  time.clone().add(reservationExpiration || 1, 'days').format('YYYY-MM-DD HH:mm:ss');

        //console.log(reservation.Lease);
        reservation.expires =  time.clone().add(reservationExpiration || 1, 'days').format('YYYY-MM-DD HH:mm:ss');
        let previous_promotions = await reservation.Lease.findPromotionsByLeaseId(connection);
        previous_promotions = previous_promotions.map(a => a.promotion_id);
        let lease = reservation.Lease;

        await lease.addPromotions(connection, body.promotions, company_id);
        if(body.discount_id){
            await lease.addPromotions(connection, [{promotion_id: body.discount_id}], company_id);
        }
        await lease.saveDiscounts(connection)

        await reservation.Lease.save(connection, null,  reservation.id);
        await reservation.save(connection);

        if(contacts?.length) {
            for (let i = 0; i < contacts.length; i++) {
                let c = contacts[i];
                if (c.id) {
                    let contact = new Contact({id: c.id});
                    await contact.find(connection, company.id);
                    await contact.findLeadByContactIdAndLeaseId(connection, unit.property_id, lease.id);
                    if(contact?.id && contact?.Lead?.id){
                        contact.Lead.status = 'active';
                        await contact.Lead.save(connection);
                    }
                }
            }
        }

        utils.send_response(res, {
          status: 200,
          data: {
            reservation
          }
        });


      } catch(err) {
        //  await connection.rollbackAsync();
        next(err);
      }


    });


    /* Testing 

        Validation
            Available unit gets rented
            unavailable units fails
            fails without contact info
            payment method exists if theres a balance due
        
        Make reservation -
            Lease gets created with status 0
            Reservation gets created
            contact_leases entry is made
            Lead gets entered
            touchpoints get saved to the contact
            New contact info gets sent to GDS
            if a payment is due, charge the payment method
            invoice should be created and marked paid

            Brand New Contact 
                Contact gets entered with relevant phone, address info
                
            Existing Contact with no previous lease
                Contact gets updated with new information
                ...

            Existing contact with a previous Lease
                Contact gets added to if new information
                ...
            
            Existing Contact with a previous active lead
                no new lead is created
                ...

            Existing Contact with a previous retired lead
                A new lead is created
                ...

        New Rental
            Brand new Contact
y                Contact gets entered with relevant phone, address info
y                Lease gets created with status 1
y                contact_leases entry is made
y                Lead gets entered
y                touchpoints get saved to the contact
y                if a payment is due, charge the payment method
y                if a payment is due, throw an error if there is no payment method
y                invoice should be created and marked paid
                 Do not match to existing contact even with same email and phone
x                Set access on Gate
y                Set converted on lead - upadte to converted and set lease_id
x                Save uploaded documents
y                Dont Send out rental email
y                Register GDS tenant
y                Update GDS unit status

            
            If has a reservation and no previous Lease
            Existing Contact Id
            Existing Lead Id
                Contact gets updated with new information
                ...


            If has a reservation and previous Lease 
            Existing Contact Id
            Existing Lead Id
                Contact gets added to if new information
                ...

    */

    router.post(['/:unit_id/lease', '/:unit_id/reserve'], [control.hasAccess(['admin', 'api']), joiValidator.body(Schema.createLease), Hash.unHash], async (req, res, next) => {
        var connection = res.locals.connection;
        let gds_owner_id = res?.locals?.active?.gds_owner_id;
        let  status = ''
        const appId = res.locals.appId || "";

        try {
            res.fns.addStep('start');
            
            let user = res.locals.contact || {};

            let company = res.locals.active;
            let params = req.params;
            let query = req.query;
            
            let body = req.body;
            let api =  res.locals.api || {};
            let events = [];
            let contacts = body.contacts || [];
            let storedContents = body.stored_contents || [];
            let payment = {};
            let uploadJobParams = [];
            let payment_method = {};
            let type = req.url.indexOf('lease') >= 0 ? 'lease' : 'reservation';
            let primary_contact = null;
            let reservation = {};
            let tenant_id;

            var results = {tenants : [] };
            var dataObj = {};
            let pending = !!body.pending;
            const payment_cycle = body.payment_cycle || '';
            const confidence_interval = contacts?.[0]?.driver_license_confidence_interval ?? 0;


            if(api && !api.id) {
                if(type === 'reservation') {
                    utils.hasPermission({connection, company_id: company.id, contact_id: user.id, api, permissions: ['create_leads']});
                } else if (type === 'lease' && pending) {
                    utils.hasPermission({connection, company_id: company.id, contact_id: user.id, api, permissions: ['create_leads']});
                } else if (type === 'lease' ){
                    utils.hasPermission({connection, company_id: company.id, contact_id: user.id, api, permissions: ['create_rentals']});
                } else {
                    e.th(500, "An error has occurred");
                }
            }



            // Checking duplicate promotions
            if(body.promotions && body.promotions.length > 1){
                let promotionIds =  body.promotions.map(x=> x.promotion_id)
                let newPromotions = [...new Set(promotionIds)]
                if(newPromotions.length !== body.promotions.length) {
                    e.th(400, "Duplicate promotions are not allowed.");
                }
            }
            
            const { auto_pay_after_billing_date } = body;

          //TODO: Remove this after demo of 4-Sep-2020. Currently we are getting time field instead of start_date from GDS.
            var post_params = {
                start_date : body.start_date ? moment(body.start_date).format('YYYY-MM-DD') : moment().format('YYYY-MM-DD'),
                // if we allow rent and security deposit to be changed
                rent: body.rent,
                security_deposit: body.security_deposit,
                promotions: body.promotions || [],
                discount_id: body.discount_id,
                coupons : body.coupons || [],
                insurance_id : body.insurance_id,
                payment_cycle: body.payment_cycle,
                billed_months: body.additional_months || 0,
                hold_token: body.hold_token,
                products: body.products || [],
                comments: body.comments,
                type: type,
                reservation_id: body.reservation_id || null,
                primary: body.primary || 0,
        		auto_pay_after_billing_date: auto_pay_after_billing_date,
                sensitive_info_stored: body.sensitive_info_stored,
                offerToken : body.token || null,
                user_id: user?.id,
                idv_id: body?.idv_id
            };
             
            
            let unit = new Unit({id: params.unit_id } );
            await unit.find(connection, api);
            await unit.verifyAccess(connection, company.id, res.locals.properties),
            await unit.getCurrentLease(connection),
            await unit.getNextLeaseStart(connection),
            await unit.getHold(connection),
            await unit.setState(connection),
            await unit.getCategory(connection),
            await unit.setSpaceMixId(connection)
        
           
            res.fns.addStep('getUnitInfo');
            let property = new Property({id: unit.property_id});
            await property.find(connection);
            await property.getTemplates(connection, unit.type);
            res.fns.addStep('getPropertyInfo');
        
            if(body.reservation_id){
                reservation = new Reservation({id: body.reservation_id});
                await reservation.find(connection);
                await reservation.Lease.canAccess(connection, company.id, res.locals.properties),
                await reservation.Lease.findUnit(connection),
                await reservation.Lease.getTenants(connection),
                await reservation.Lease.getCurrentBalance(connection)
                

                if(contacts.length && !contacts[0].id && reservation.Lease.Tenants && reservation.Lease.Tenants.length){
                    contacts[0].id = reservation.Lease.Tenants[0].contact_id;

                }
				if (reservation.Lease.Tenants && contacts.length) {
					if (!reservation.Lease.Tenants[0].Contact.email)
					  reservation.Lease.Tenants[0].Contact.email = contacts[0].email;
					//if (!reservation.Lease.Tenants[0].contact.Phones)
					//  reservation.Lease.Tenants[0].contact.Phones.phone = contacts[0].Phones[0].phone;
				}
            }


            // Check for CONTACTS
            if(!body.lead_id && !contacts.length && (!reservation.Lease || !reservation.Lease.id)){
                e.th(400, "Customer information missing.  Please include a lead id or contact information");
            }
          
            res.fns.addStep('getReservationInfo');
            await connection.beginTransactionAsync();
            let decoded = {}
                if (post_params.offerToken){
                    decoded = decodeToken(post_params.offerToken)
                } else{
                    decoded = null
                }

            let valueTierType = decoded?.value_tier?.type || `good`;
            await unit.getDefaultRentPlan(connection, valueTierType);

            // RENT UNIT CALL
            let data = await unit.rentUnit(connection, {
                api,
                params: post_params,
                template: property.LeaseTemplates[unit.type].Template || {},
                company_id: company.id,
                reservation,
                save: type,
                contact: user,
                override_prorate: false,
                token: decoded, 
                unit
            });
            
            res.fns.addStep('rentUnit');
            // console.log("data", data);
            // e.th(400, "Test")
            // Moved until after we know if the unit can be rented successfully
            try{

                await property.getAccessControl(connection);
                results.access = {
                    name: property.Access.access_name
                }
                res.fns.addStep('getAccessControl');

            } catch(err){
                console.log(err);
            }

            await data.lease.findUnit(connection);
            results.lease_id = data.lease.id;
            results.Invoices = data.invoices.map(i => {
                return {
                    id: i.id
                }
            })
            
            if(storedContents.length) {
                let reqData = {
                    user: user?.id,
                    lease_id: data.lease.id,
                    active_stored_contents: storedContents
                };
                await LeaseStoredContents.bulkUpdate(connection, reqData);
            }
            

            if(contacts?.length) {
                for (let i = 0; i < contacts.length; i++) {
                    let existing_contacts = [];
                    let c = contacts[i];
                    c.gds_owner_id = gds_owner_id;

                    let contact = {};
                    if (c.id) {
                        contact = new Contact({id: c.id});
                    } else {   
                        if(!c.first || !c.last) e.th(400, "First and last name are required");
                        if(c.Phones && c.Phones.length && c.Phones.find(p => !p.phone)) e.th(400, "An invalid phone number was entered");
                        if(!c.email && (!c.Phones || !c.Phones.length)) e.th(400, "Either an email address or phone number is required")
                        contact = new Contact({company_id: company.id});    
                        // checking for existing contact
                        existing_contacts = await Contact.findMatchedContact(connection, company.id, c.email, c.Phones && c.Phones.length ? c.Phones[0].phone : null); // update to return most relevant first.  Dont know the criteria                        
                        if (existing_contacts?.length) {
                            contact = new Contact({ id: existing_contacts[0].id });
                        }

                    }
                    
                    if(contact.id){
                        await contact.find(connection, company.id);
                        await contact.verifyAccess(company.id);
                        // await contact.getTouchpoints(connection); I dont think this is needed here.  Eliminating it makes it easier to add lead-relative touchpoints
                        await contact.getLeases(connection);
                        //await contact.getLocations(connection);
                        //await contact.getActiveLead(connection, property.id);
                        
                        if(contact.Leases.length){  //if there is an existing leases, just add to it, otherwise, replace the infomration
                            await contact.updateIfNew(connection, c);
                        } else {
                            await contact.update(connection, c);       
                        } 
                    } else {
                        await contact.update(connection, c);    
                    }
                    
                    await contact.save(connection, 'contacts');
                    

                    /// SAVE LEAD ATTRIBUTION - Should save source
                    if (body.tracking && body.tracking.touchpoints && body.tracking.touchpoints.length) {
                        await contact.saveTouchpoints(connection, body.tracking.touchpoints, type);
                        res.fns.addStep('saveTouchpoints');
                    }
                
                    // Make a new lead if there isnt a reference to an existing reservation 
                    
                    if(!body.reservation_id){

                        
                        await contact.getActiveLeadByLeaseId(connection, property.id, data.lease.id);
                        
                        // if we have an existing active lead for a contact and it doesnt have a lease_id, convert that open lead.
                        // This specifically check c.id which is the data passed from the frontend.  Only use existing lead if they explicity pass contact_id 
                        if(c.id && contact.ActiveLead.id && !contact.ActiveLead.lease_id){
                            contact.ActiveLead.lease_id = data.lease.id;
                            contact.ActiveLead.category_id = unit.category_id;
                            contact.ActiveLead.unit_id = unit.id;
                        } else {
                            // let source = '';
                            // if(body.source){
                            //     source = body.source;
                            // } else if(api.id) {
                            //     source = api.name
                            // } else if(user.id && user.role === 'application'){
                            //     source = user.first + " " + user.last;
                            // }

                            if(!body.source && api.id){  
                                body.source = api.name; 
                            }
                
                            if(!body.source && user.roles.includes('application')){
                              body.source = user.first + ' ' + user.last; 
                            }

                            if (!body.source && contact.Touchpoints.length) {
                                body.source = contact.Touchpoints[0].platform_source
                            }                        
    
                            contact.ActiveLead = new Lead({
                                contact_id: contact.id,
                                property_id: unit.property_id,
                                category_id: unit.category_id,
                                unit_id: unit.id,
                                source: body.source,
								move_in_date: body.move_in_date,
                                length_of_stay: body.length_of_stay,
                                content: body.content,
                                touchpoint_id: contact.Touchpoints.length ?  contact.Touchpoints[0].id: null, 
                                status: 'active',
                                created_by: user && user.id, 
                                modified_by: user && user.id,
                                lease_id: data.lease.id
                            });
                        }
                        
                        await contact.ActiveLead.save(connection);
                    }

                    // save tenant
                    var tenant = {
                        contact_id: contact.id,
                        lease_id: data.lease.id,
                        type: 'tenant',
                        primary:  i === 0
                    };
                    // see if tenant exists, if not, save it
                    tenant.id = await contact.findTenantId(connection, data.lease.id);
                    if (!tenant.id) {
                        tenant.id = await models.ContactLeases.save(connection, tenant);
                    }
                    
                    if(property.Access){
                        await property.Access.createSpaceIfNotExist(unit);
                        if(property.Access.access_name.toLowerCase() === 'derrels'){
                            try {
                                // If they dont have any, generate some, 
                                await contact.findAccessCredentials(connection, property);
                            } catch (err) {
                                e.th(400, "There is an issue with Gate Access Configurations.");
                            }

                            if(body.gate_code){
                                try{
                                    let spaceCode = parseInt(body.gate_code.toString().slice(-4));
                                    let pinResult = await property.Access.validateSpaceCode(spaceCode, unit.number, unit.id);
                                    if(pinResult){
                                        await property.Access.updateSpaceCode(property.id, unit.id, pinResult);
                                        tenant.pin = pinResult;
                                    }
                                } catch(err) {
                                    throw "This gate code is not available";
                                }
                            } else {
                                let spaceCode = await property.Access.getSpaceCode(unit.id);
                                if(spaceCode != null){
                                    tenant.pin = spaceCode;
                                } else {
                                    try {
                                        // If they dont have any, generate some, 
                                        let codeResult = await property.Access.generateSpaceCode(unit.number, unit.id);
                                        await property.Access.updateSpaceCode(property.id, unit.id, codeResult);
                                        tenant.pin = codeResult;
                                    } catch (err) {
                                        e.th(400, "There is an issue with Gate Access Configurations.");
                                    }
                                }
                            
                            }
                        }else{
                            // Check contact credentials
                            try {
                                // If they dont have any, generate some, 
                                await contact.findAccessCredentials(connection, property);
                            } catch (err) {
                                e.th(400, "There is an issue with Gate Access Configurations.");
                            }
                            if(body.gate_code){
                                // if a code was passed in, verify it isnt't taken, if they are throw an error. 
                                try{
                                    await property.Access.validateCode(body.gate_code, contact.id);
                                    tenant.pin = body.gate_code;
                                } catch(err) {
                                    throw "This gate code is not available";
                                }
                            } else {
                                if(contact.Access && contact.Access.pin){
                                    tenant.pin = contact.Access.pin;
                                } else {
                                    try {
                                        // If they dont have any, generate some, 
                                        tenant.pin = await property.Access.generateCode();
                                    } catch (err) {
                                        e.th(400, "There is an issue with Gate Access Configurations.");
                                    }
                                }
                            
                            }
                            res.fns.addStep('accessCredsFound');
                        }
                    }
                    
                    // tenants.push(tenant);


                    tenant.Contact = contact;

                    let sameTenant = data.lease.Tenants.find(x=> x.id === tenant.id);
                    if(sameTenant){
                        sameTenant.pin = sameTenant.pin ? sameTenant.pin : tenant.pin;
                        data.lease.Tenants.splice(data.lease.Tenants.findIndex(t => t.id === sameTenant.id), 1);
                        data.lease.Tenants.push(sameTenant);
                    }else{
                        data.lease.Tenants.push(tenant);
                    }
                    results.tenants.push(tenant);
                    if (i === 0) {
                        primary_contact = contact;
                    }
                }
            }
 
            // SAVE RESERVATION CALL
            if(type === 'reservation') {
                let hours = moment().utcOffset(property.utc_offset).format('HH:mm:ss');
                let exp = post_params.start_date + ' ' + hours;
                let expiry_date = moment(exp, 'YYYY-MM-DD HH:mm:ss')

                // get reservation expiration by store...
                var reservationExpiration = await Settings.getSettingValue(connection, 'reservationExpiration', {company_id: company.id, property_id: property.id});
                var reservationAdvance = await Settings.getSettingValue(connection, 'maxAdvanceReservation', {company_id: company.id, property_id: property.id});
                
                if(expiry_date.diff(moment().utcOffset(property.utc_offset).startOf('day'), 'days') > reservationAdvance ){
                    e.th(409, `Reservations are only allowed to be made ${reservationAdvance} day${reservationAdvance === 1? '': 's'} in advance.`);
                }
                
                
                reservation = new Reservation({
                    id:         body.reservation_id || null,
                    lease_id:   data.lease.id,
                    time:       moment(expiry_date).format('YYYY-MM-DD HH:mm:ss'),
                    expires:    expiry_date.clone().add(reservationExpiration || 1, 'days').format('YYYY-MM-DD HH:mm:ss'),
                    created_by: user.id
                });

                try {
                    await utils.hasPermission({connection, company_id: company.id, contact_id: user.id, api, permissions: ['edit_bill_day_onboarding_process']});
                    if(post_params.bill_day) reservation.Lease.bill_day = post_params.bill_day;
                } catch(err){
                    console.log("edit_bill_day_onboarding_process reservation and lease post error", err);
                }

                post_params.rent = post_params.rent || data.lease.rent
                if(post_params.rent) reservation.Lease.rent = post_params.rent;
                if(post_params.offerToken) reservation.Lease.offerToken = post_params.offerToken;
                if(post_params.security_deposit) reservation.Lease.security_deposit = post_params.security_deposit;
                if(post_params.discount_id) reservation.Lease.discount_id = post_params.discount_id;
                if(post_params.user_id) reservation.Lease.created_by = post_params.user_id;

                if(reservation.id){
                    await reservation.Lease.save(connection);
                }
            
                await reservation.save(connection);
                res.fns.addStep('saveReservation');
           
            // events.push('new_reservation');
            } else { // type == lease
                if (
                    ['website', 'storelocal website', 'storagefront app'].includes((user?.first)?.toLowerCase()) &&
                    user?.type?.toLowerCase() === "application"
                  ) {
                    try {
                      await models.ContactLeases.updateConfidenceInterval(
                        connection,
                        data.lease.id,
                        confidence_interval
                      );
                    } catch (err){
                      console.log("Failed to update confidence interval", err)
                    }
                  }

                if(body.documents?.length) {
                    uploadJobParams =  await data.lease.saveDocuments(connection, body.documents, res.locals.company_id, company.id,  settings.is_prod, tenant.contact_id); 
                    res.fns.addStep('uploadDocuments');
                } else {
                    pending = true;
                }
                // Activate lease
                if(!pending){
                    await data.lease.activate(connection, {company, logged_in_user: user});
                    events.push('lease_finalized');
                    res.fns.addStep('finalizeLease');
                }

                for(let i = 0; i < data.invoices.length; i++){
                    let inv = data.invoices[i];
                    if(inv && !inv.contact_id) {
                        data.invoices[i].contact_id = primary_contact.id;
                        await models.Invoice.saveInvoice(connection, {
                            contact_id: primary_contact.id,
                            lease_id: data.lease.id
                        }, inv.id);
                    }
                }

                if(body.reservation_id){
                    await Todo.dismissTasks(connection, reservation.Lease.id, Enums.EVENT_TYPES_COLLECTION.RESERVATION, Enums.TASK_TYPE.LEASE, user? user.id : null, api ? api.id : null);
                }

                data.lease.advance_rental = moment(data.lease.start_date, 'YYYY-MM-DD').isAfter(moment(), 'day');
            }
     
            // dismissing all LEAD tasks
            if (primary_contact?.id) {
                console.log("Dismiss All LEAD Tasks");
                await Todo.dismissTasks(connection, primary_contact? primary_contact.id : null, Enums.EVENT_TYPES_COLLECTION.LEAD, Enums.TASK_TYPE.CONTACT, user ? user.id : null, api ? api.id : null);
            }
            let balance = data.invoices.reduce((a,b) => a + b.balance, 0); 
            balance = Math.round(balance * 1e2) / 1e2;
            
            // PAY INVOICE
            if(body.payment_method) {
                // if this should be set to autopay, we have to save it, so set it to be saved
                if(body.payment_method.auto_charge){
                    body.payment_method.save_to_account = true;  
                }
                
                payment_method = await primary_contact.getPaymentMethod(connection, property, body.payment_method.id, body.payment_method.type, 'e-commerce', body.payment_method);
                
                // charge payment Method
               
                if (balance) {  // there is a balance, try to pay
                    let payment_data = {
                        property_id: property.id,
                        contact_id: primary_contact.id,
                        amount: balance, 
                        date: moment().toString(),
                        created: moment().utc().format('YYYY-MM-DD'),
                        ref_name: payment_method.name_on_card,
                        number: null,
                        method: payment_method.type,
                        source: body.source || 'e-commerce',
                        notes: '',
                        accepted_by: user.id
                    }

                    payment = new Payment();
                    await payment.create(connection, payment_data, payment_method, 'e-commerce', user.id );
                    await payment.getPaymentApplications(connection);
                    events.push('payment_created');

                    let propCurrDate = await property.getLocalCurrentDate(connection);

                    for(let i = 0; i < data.invoices.length; i++){
                        let invoice_data = [{
                            invoice_id: data.invoices[i].id,
                            payment_id: payment.id,
                            date: propCurrDate,
                            amount: data.invoices[i].balance
                        }];
                        await models.Payment.applyPayment(connection, invoice_data);
                    }

                    await payment.charge(connection, company.id);
                    if(payment && payment.status_desc && payment.status_desc.toLowerCase() === "partially approved"){
                        e.th(400, "This payment was only  authorized for $" + payment.amount.toFixed(2) + ' and has been voided');
                    }
                    
                    results.payment_method_id = payment_method.id;
                    results.payment_id = payment.id;
                
                    res.fns.addStep('paymentCharged');
                    if (body.payment_method.auto_charge) {
                        await data.lease.setAsAutoPay(connection, payment_method);
                    }
                }
            } else {
                if(balance > 0) {
                    e.th(400, "Please provide payment for the balance of $" + balance.toFixed(2));
                }
            }

            // function create advance invoice incase of threshold passed.
            // if(type !== 'reservation') {
            //     await data.lease.generateThresholdInvoice(connection,company,user);
            // }

            await connection.commitAsync();
            res.fns.addStep('transactionCommitted');
            if (type === 'lease') {
                dataObj.lease = results;
            
            } else {
                dataObj.reservation = results;
                dataObj.reservation.reservation_id = reservation.id;
                events.push('new_reservation');
            }
            


            res.fns.addStep('done');
          
            if(type =='lease'){
                req.route.path = '/:unit_id/lease';
            } else {
                req.route.path = '/:unit_id/reserve';
            }



          res.fns.addStep('responseSentComplete');
          await data.lease.getChecklist(connection, company.id);
          res.fns.addStep('get_checklist_completed');
          console.log(`is pending ${pending}`);
          if (pending) {
            let template = property.LeaseTemplates[unit.type].Template || {};
            let checklist_documents = [];
            await data.lease.getAllInsurances(connection);
            
            data.lease.Checklist = template.Checklist;
            data.lease.Checklist = await data.lease.createAndSaveChecklist(connection, template.Checklist);
            data.lease.Checklist = await data.lease.processChecklist(connection);

            for (let i = 0; i < data.lease.Checklist.length; i++){
                if (data.lease.Checklist[i].document_id != null) {
                    checklist_documents.push(data.lease.Checklist[i]);
                }
            }
            
            await Queue.add('generateAndEmailPandaDoc', {
                cid: res.locals.company_id,
                property_id: property.id,
                lease_id: data.lease.id,
                checklist_documents: checklist_documents,
                company_id: company.id,
                contact_id: data.lease.Tenants[0].Contact.id ,
                uploaded_by : user?.id,
                unit_id: unit.id,
                appId: appId,
                priority: 1,
                socket_Details: {
                    company_id: company.id,
                    contact_id: res.locals.contact ? res.locals.contact.id : null
                }

            })
  
          }

          res.fns.addStep('responseSent');
          let lease = data.lease;
          let invoice = data.invoices && data.invoices.length > 0 ? data.invoices[0]: {};
          let paymentMethod = payment_method;
          //contact = user;

       
        if(property.Access){
            console.log('Setting the Access to tenants with property access =>', JSON.stringify(property.Access));
            events.push('update_user_space');
        }


        res.fns.addStep('accessSetOnLease');
        utils.send_response(res, {
            status: 200,
            data: Hash.obscure(dataObj, req)
        });

        
        // EMIT ALL THE EVENTS THAT HAPPENED
          events.map(e => {
              eventEmitter.emit(e, {
                  company,
                  api,
                  user,
                  payment,
                  lease,
                  reservation,
                  unit,
                  property,
                  contact: user,
                  paymentMethod,
                  invoice,
                  'contact_id': contact.id,
                  'status': status,
                  cid: res.locals.company_id,
                  locals: res.locals,
                  documents: body.documents,
                  payment_cycle,
                  confidence_interval,
                  appId
              });
          });
          
          if(uploadJobParams.length) {
            await new Promise((resolve, reject) => {
              Scheduler.addJobs(uploadJobParams, (err) => {
                if (err) e.th(500, err);
                return resolve();
              });
            });
          }

        } catch(err) {
         await connection.rollbackAsync();
          next(err);
        }

    });

    router.post('/:unit_id/configure', [control.hasAccess(['admin', 'api']), Hash.unHash], async (req, res, next) => {

      var connection = res.locals.connection;

      try {
        let user = res.locals.contact || {};
        let company = res.locals.active;
        let params = req.params;
        let query = req.query;
        let body = req.body;
        let api = res.locals.api;
        let permissions = res.locals.permissions;

        let type = null;
        let primary_contact = null;
        let reservation = {};

        // Checking duplicate promotions
        if(body.promotions && body.promotions.length > 1){
            let promotionIds =  body.promotions.map(x=> x.promotion_id)
            let newPromotions = [...new Set(promotionIds)]
            if(newPromotions.length !== body.promotions.length) {
                e.th(400,"Duplicate promotions are not allowed.");
            }
        }

        const { auto_pay_after_billing_date: autoPayAfterBillingDate } = body;
        var post_params = {
          id: body.id,
          start_date: body.start_date || moment().format('YYYY-MM-DD'),
          end_date: body.end_date || null,
          rent: body.rent,
          security_deposit: body.security_deposit,
          coupons: body.coupons || [],
          insurance_id: body.insurance_id,
          promotions: body.promotions ? body.promotions.filter(p => p.promotion_id) : [],
          discount_id: body.discount_id || null,
          billed_months: body.billed_months ? +body.billed_months : 0,
          hold_token: body.hold_token,
          products: body.products || [],
          payment_cycle: body.payment_cycle, 
          type: body.type,
          save: body.save,
          reservation_id: body.reservation_id || null,
          is_transfer: !!body.is_transfer,
          transfer_lease_id: body.transfer_lease_id,

          edit_lease: body.edit_lease,
          auto_pay_after_billing_date: autoPayAfterBillingDate,
          user_id: user?.id
        };


        post_params.payment_cycle = post_params.payment_cycle && post_params.payment_cycle.toLowerCase() === 'monthly' ? null : post_params.payment_cycle; // kinda hacky

        try {
          utils.hasPermission({connection, company_id: company.id, contact_id: user.id, api, permissions: ['edit_move_in_rate']});
          post_params.rent = body.rent;
        } catch(err){
          console.log("err", err);
        }

        let permission = body?.transfer_lease_id ? 'edit_bill_day_transfer_process' : 'edit_bill_day_onboarding_process'
        try {
            await utils.hasPermission({connection, company_id: company.id, contact_id: user.id, api, permissions: [permission]});
            post_params.bill_day = body.bill_day;
        } catch(err){
            console.log(`${permission} error`, err);
        }

        try {
          utils.hasPermission({connection, company_id: company.id, contact_id: user.id, api, permissions: ['apply_promotions']});
          post_params.discount_id = body.discount_id || null;
          post_params.promotions = body.promotions.filter(p => p.promotion_id);
        } catch(err){
          console.log("err", err);
        }


        // GET Unit Detail
        let unit = new Unit({id: params.unit_id } );
        await unit.find(connection, api);
        await unit.verifyAccess(connection, company.id, res.locals.properties);
        await unit.setState(connection);
        let payment_cycle = {};

        let transfer_months_billed = 0;

        
        if(body.transfer_lease_id && post_params.is_transfer){

            let oldlease = new Lease({id: body.transfer_lease_id});
            await oldlease.find(connection);
            await oldlease.getActivePaymentCycle(connection);
            
            if(oldlease.PaymentCycle){
                payment_cycle = await oldlease.getPaymentCycleOptions(connection, oldlease.PaymentCycle.payment_cycle);
                // let discount = new Discount({id: oldlease.PaymentCycle.discount_id });
                // await discount.find(connection);
                // console.log("DISCOUNT", doscount)
                // if(post_params.promotions.filter(p => p.promotion_id !== discount.promotion_id ).length){
                //     e.th(409, 'Payment cycle promotions cannot be combined with other offers')
                // }
                
                // post_params.promotions.push({promotion_id: payment_cycle.promotion_id });
                // Copy promotions, 
                // Set billed months here. 
                
                post_params.payment_cycle = oldlease.PaymentCycle.payment_cycle
                let start_date_mom = moment(post_params.start_date, 'YYYY-MM-DD');
                let payment_cycle_end_mom = moment( oldlease.PaymentCycle.end_date, 'YYYY-MM-DD');
                
                transfer_months_billed = payment_cycle_end_mom.diff(start_date_mom, 'months') + 1;
            }
            
        }
        // Default value of billed month should be one
        post_params.billed_months = post_params.billed_months || 1;

        if(post_params.payment_cycle ){
            let property = new Property({id: unit.property_id});
            await property.find(connection);
            await property.getTemplates(connection);
            let template = property.LeaseTemplates[unit.type].Template

            await template.findPaymentCycles(connection);
            payment_cycle = template.payment_cycle_options.find(o => o.label.toLowerCase() === post_params.payment_cycle.toLowerCase())
            
            if(!payment_cycle) {
                e.th(400, "Invalid Payment Cycle");
            }

            // if(post_params.promotions.filter(p => p.promotion_id !== payment_cycle.promotion_id ).length){
            //     e.th(409, 'Payment cycle promotions cannot be combined with other offers')
            // }
           
            if(post_params.promotions.filter(p => p.promotion_id !== payment_cycle.promotion_id ).length){
                try {
                    await utils.hasPermission({connection, company_id: company.id, contact_id: user.id, api, permissions: ['payment_cycle_promotions']});
                } catch(err){
                    e.th(403, "Payment cycle promotions cannot be combined with other promotions");
                }
            }

            if(post_params.discount_id){
                try {
                    await utils.hasPermission({connection, company_id: company.id, contact_id: user.id, api, permissions: ['payment_cycle_discounts']});
                } catch(err){
                    e.th(403, "Payment cycle promotions cannot be combined with other discounts");
                }
            }

            post_params.promotions.push({promotion_id: payment_cycle.promotion_id });

            // Calculating billed months according to Multi Month Payment Cycle.
            post_params.billed_months = Math.ceil(post_params.billed_months / payment_cycle.period) * payment_cycle.period;
            if(post_params.billed_months > 0 && (post_params.billed_months % payment_cycle.period ) !== 0){
                e.th(409, `Payment Cycles must be billed in groups of ${payment_cycle.period}`);
            }
        }
         
        if(transfer_months_billed > post_params.billed_months){
            post_params.billed_months = Math.ceil(transfer_months_billed  / payment_cycle.period) * payment_cycle.period;
        } 
        
        await unit.updatePromotions(connection, post_params, company.id);
        await unit.canRent(connection, moment(post_params.start_date, 'YYYY-MM-DD'), body.hold_token, body.reservation_id,body.edit_lease);
        
        // TODO
        // handle states - on hold - compare hold token
        // handle states - pending - compare pending
        // handle states - reserved - compare Reservation Code
        // handle states - leased, overlocked, remove overlock, Offline,  - reject
        
        let { lease, leaseServices, applicationServices, reservationServices } = await unit.buildLease(connection, api, post_params, company.id, reservation, body.save, Enums.CATEGORY_TYPE.MOVEIN);
        
        lease.id = body.id;
        lease.status = 2;

        if(body.save){
          await connection.beginTransactionAsync();

          await lease.save(connection, body.hold_token, body.reservation_id, body.edit_lease);

          if(lease.status === 2 && !lease.lease_standing_id){
            lease.updateStanding(connection, 'Pending');
          }

          lease.Services = leaseServices;
          await lease.saveServices(connection, body.type);
          // saving insurance service if any
          let insuranceService = lease.Services.find(s=> s.service_type === 'insurance');
          if(insuranceService) {
            await lease.saveServices(connection, 'insurance');
          }
          // if(!post_params.payment_cycle){
          await lease.saveDiscounts(connection, payment_cycle.promotion_id ? [payment_cycle.promotion_id] :  null);
          // }
          await lease.saveChecklist(connection);
          if(lease.end_date){
              await unit.save(connection, { available_date: lease.end_date});
          }
          await Todo.dismissTasks(connection, lease.id, Enums.EVENT_TYPES_COLLECTION.RESERVATION, Enums.TASK_TYPE.LEASE, user.id, api ? api.id : null);
          await connection.commitAsync()
        }
        
        let invoice = await unit.generateInvoice(connection,lease, company.id, leaseServices, post_params.billed_months, false, true, user.id, api ? api.id : null, null, false, false);
        
        let applicationInvoice = await unit.generateInvoice(connection,lease, company.id, applicationServices, post_params.billed_months, false, true, user.id, api ? api.id : null, null, false, false);
        let reservationInvoice = await unit.generateInvoice(connection,lease, company.id, reservationServices, post_params.billed_months, false, true, user.id, api ? api.id : null, null, false, false);


        // if(body.save && post_params.payment_cycle){
        
        //     await lease.removePaymentCycle(connection, post_params.start_date, true); 
        //     await lease.getPaymentCycleOptions(connection);	
        //     lease.payment_cycle = post_params.payment_cycle; 
            
        //     let period_start = moment(invoice[0].period_start, 'YYYY-MM-DD 00:00:00');
        //     let period_end = moment(invoice[invoice.length - 1].period_end, 'YYYY-MM-DD 00:00:00');
        //     await lease.saveMoveInPaymentCycle(connection, period_start, period_end, company.id); 
        // }



        utils.send_response(res, {
          status: 200,
          data: Hash.obscure({
            lease,
            invoice,
            applicationInvoice,
            reservationInvoice,
            leaseServices,
            applicationServices,
            reservationServices,
          }, req)
        });


      } catch(err) {
        await connection.rollbackAsync();
        next(err);
      }

    });

    return router;

};

function decodeToken(token) {
    try {
        let _decoded = jwt.verify(token, settings.security.key);
        return _decoded
    } catch (error) {
        e.th(498, error.name, error.message)
    }
}
