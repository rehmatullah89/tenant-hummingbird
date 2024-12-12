var express = require('express');
var router = express.Router();
var moment      = require('moment');
var settings    = require(__dirname + '/../config/settings.js');
var control    = require(__dirname + '/../modules/site_control.js');
var response = {};
var Hash = require(__dirname + '/../modules/hashes.js');
var Hashes = Hash.init();
var validator = require('validator');
var models = require(__dirname + '/../models');
var Promise = require('bluebird');
var Contact = require(__dirname + '/../classes/contact.js');
var Tenant = require(__dirname + '/../classes/tenant.js');
var Lease = require(__dirname + '/../classes/lease.js');
// var Joi      = require('joi');
// var expressJoi      = require('express-joi-validator');
var Schema = require(__dirname + '/../validation/tenants.js');
var utils    = require(__dirname + '/../modules/utils.js');
var Joi      = require('joi');
const joiValidator = require('express-joi-validation')({
    passError: true
});

var e  = require(__dirname + '/../modules/error_handler.js');
var Activity = require(__dirname + '/../classes/activity.js');


module.exports = function(app) {

    router.post('/search', [control.hasAccess(['admin']), Hash.unHash],  async(req, res, next) => {

    const connection = res.locals.connection;


    try {

      let contact = res.locals.contact;
      let company = res.locals.active;
      let properties = [];
      var body = req.body;

      body.offset = body.offset || 0;
      body.limit = body.limit || 20;
      body.roles_id = body.roles_id || [];
      console.log("body", body)

      if(body.roles_id.length){
				let adminContact = new Contact({id: contact.id});
				await adminContact.getPropertiesByRoles(connection, company.id);
				
				const filteredRoles = adminContact.RolesProperties.filter(role => body.roles_id.includes(role.role_id));
				const filteredRolesProperties = filteredRoles.flatMap(role => role.Properties);
        properties = filteredRolesProperties.filter(propertyId => res.locals.properties.includes(propertyId));
			}else{
				properties = res.locals.properties;
			}

      let contact_leases = await Contact.searchWithActiveLease(connection, body, company.id, properties);
      let contact_leases_count = await models.Contact.searchWithActiveLeaseCount(connection, body, company.id, properties);

      console.log("contact_leases", contact_leases)

      let tenants = [];
      for(let i = 0; i < contact_leases.length; i++){

        let contact = new Contact({id: contact_leases[i].contact_id });
        let lease = new Lease({id: contact_leases[i].lease_id });

        await contact.find(connection);
        await contact.verifyAccess(company.id);
        await lease.find(connection, );
        await lease.findUnit(connection);
        tenants.push({
          Contact: contact,
          Lease: lease,
        })

      }

      utils.send_response(res, {
        status: 200,
        data: {
          tenants: Hash.obscure(tenants, req),
          t: body.t,
          result_count: contact_leases_count,
        }
      });



    } catch(err) {
      next(err);
    }



    //
        // var company = res.locals.active;
    //
    //
        // var searchParams = {};
        // var conditions = {};
        // var tenants = [];
    //
        // if(body.search){
        // 	try{
        // 		if(body.search.status) conditions.status = JSON.parse(body.status).map(s => s.toLowerCase());
        // 	} catch(err){
        // 		conditions.status = [];
        // 	}
        // 	if(body.search.name) conditions.name = body.search.name;
        // 	if(body.search.address) conditions.address = body.search.address;
        // 	if(body.search.unit) conditions.unit = body.search.unit;
        // 	if(body.search.property_id) conditions.property_id = body.search.property_id;
        // 	if(body.search.past_due) conditions.past_due = body.search.past_due;
        // 	if(body.search.current) conditions.current = body.search.current;
        // }
    //
        // searchParams.limit = body.limit || 20;
        // searchParams.offset = body.offset || 0;
        // searchParams.sort =  body.sort.field || 'name';
        // searchParams.sortdir =  body.sort.dir || 'ASC';
    //
        // let connectin = res.locals.connection
    //
        // 	connection = conn;
        // 	return models.ContactLeases.search(connection, conditions, searchParams, company.id, false)
    //
        // }).then(function(results) {
        // 	tenants = results;
        // 	return models.ContactLeases.search(connection, conditions, null, company.id, true)
        // 		.then(count => count[0].count)
        // }).then(function(count) {
        // 		utils.send_response(res, {
        // 			status: 200,
        // 			data: {
        // 				tenants: Hash.obscure(tenants),
        // 				result_count:count
        // 				// pagination:{
        // 				// 	num_results: count,
        // 				// 	num_pages: Math.ceil(count / searchParams.limit),
        // 				// 	showing:{
        // 				// 		from: +searchParams.offset,
        // 				// 		to: +searchParams.offset + tenants.length
        // 				// 	}
        // 				// }
        // 			}
        // 		});
        // 	})
        // 	.then(() => utils.saveTiming(connection, req, res.locals))
        // 	.catch(next)
        // 	.finally(() => utils.closeConnection(pool, connection))
    });

    router.get('/:tenant_id', [control.hasAccess(['admin', 'api']), Hash.unHash],  async(req, res, next) => {
        
        const connection = res.locals.connection;

        try {

            let contact = res.locals.contact;
            let api = res.locals.api;
            let company = res.locals.active;

            let params = req.params;

            let tenant = new Tenant({ id: params.tenant_id });
          
            await tenant.find(connection, company.id, api);

            utils.send_response(res, {
                status: 200,
                data: {
                    tenant: Hash.obscure(tenant, req)
                }
            });



        } catch(err) {
            next(err);
        }




    });

    router.get('/', [control.hasAccess(['admin', 'api']), Hash.unHash],
        async (req, res, next) => {
            const connection = res.locals.connection
            try {
                const api = res.locals.api;
                const company = res.locals.active
                const query = (req.query);
                const statusOptions = ['all', 'active', 'inactive'];
                const defaultStatus = 'active';
                let properties = res.locals.properties;
                let searchParams = {}
                let { limit, offset ,status, property_id } = {
                    ...utils.cleanQueryParams(query, {
                      limit: 100,
                      status: defaultStatus,
                      property_id: ''
                    }, true)
                  };
                status = statusOptions.includes(status) ? status : defaultStatus

                searchParams = { limit, offset, status, property_id };
                let tenant = await Tenant.findAll(connection, company.id, api, searchParams, false, properties);
                let count = await Tenant.findAll(connection, company.id, api, searchParams, true, properties);
                if (searchParams.property_id) searchParams.property_id = Hashes.encode(req.query.property_id, company.id);
                const paging = utils.generatePagingObject(req, searchParams, count, tenant.length, true);

                utils.send_response(res, {
                    status: 200,
                    data: {
                        tenant: Hash.obscure(tenant, req),
                        paging
                    }
                });

            } catch (err) {
                next(err)
            }
        });

    router.post('/delinquent', [control.hasAccess(['admin']), Hash.unHash],  async(req, res, next) => {

        const connection = res.locals.connection;

        try {

            let company = res.locals.active;
            let properties = res.locals.properties;

            let contact_leases = await Contact.searchWithDelinquentLeases(connection, company.id, properties);

            let tenants = [];
            for(let i = 0; i < contact_leases.length; i++){

              let contact = new Contact({id: contact_leases[i].contact_id });
              let lease = new Lease({id: contact_leases[i].lease_id });

              await contact.find(connection);
              await contact.getPhones(connection)
              await contact.verifyAccess(company.id);
            //   await lease.find(connection);
              tenants.push({
                Contact: contact,
                ...contact_leases[i]
              })

            }

            utils.send_response(res, {
              status: 200,
              data: {
                tenants: Hash.obscure(tenants, req)
              }
            });



        } catch(err) {
            next(err);
        }




    });

    return router;


};
