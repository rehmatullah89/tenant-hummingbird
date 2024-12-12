var express = require('express');
var router = express.Router();
var moment      = require('moment');
var settings    = require(__dirname + '/../config/settings.js');
var Hash = require(__dirname + '/../modules/hashes.js');
var Hashes = Hash.init();
var response = {};
var control  = require(__dirname + '/../modules/site_control.js');
var Promise = require('bluebird');
var validator = require('validator');

var utils    = require(__dirname + '/../modules/utils.js');
var models  = require(__dirname + '/../models');
var QuickBooks  = require(__dirname + '/../classes/quickbooks.js');
var Product  = require(__dirname + '/../classes/product.js');
var Property  = require(__dirname + '/../classes/property.js');
var Accounting  = require(__dirname + '/../classes/accounting.js');
var Lease  = require(__dirname + '/../classes/lease.js');
var Unit  = require(__dirname + '/../classes/unit.js');
var Activity  = require(__dirname + '/../classes/activity.js');
var e  = require(__dirname + '/../modules/error_handler.js');
var eventEmitter = require(__dirname + '/../events/index.js');
var Enums = require(__dirname + '/../modules/enums.js');

var Schema = require(__dirname + '/../validation/products.js');
const joiValidator = require('express-joi-validation')({
    passError: true
});

module.exports = function(app) {

    /** TODO handle filters and searching **/

  /* Deprecated */
    router.post('/search', [control.hasAccess(['admin', 'api']), Hash.unHash],  async (req, res, next) => {

      try{
        var connection = res.locals.connection;
        var company = res.locals.active;
        let query = req.query;

        var body = req.body;
        var conditions = {
          search: body.search,
          types: body.types
        }

        let products = await models.Product.searchByCompanyId(connection, conditions, company.id)
        utils.send_response(res, {
          status: 200,
          data: {
            products: Hash.obscure(products, req)
          }
        });
      } catch(err) {
        next(err);
      }

    });

    router.get('/', [control.hasAccess(['admin', 'api']), Hash.unHash],  async(req, res, next) => {

        try{

            var connection = res.locals.connection;
            let contact = res.locals.contact;
            let company = res.locals.active;
            let query = req.query;
            let params = req.params;

            let type =  query.type || null;
            let search = query.search || query.term || 'product';

            let product_list = await Product.findByCompanyId(connection, company.id, null, query.category_type || null);
            if(search != 'all'){
              product_list = product_list.filter(p => p.default_type === search);
            }

            let products = [];
            let account = new Accounting({
              company_id: this.company_id
            });
            //TODO fix this.. its not setting to anything.. and process.env shouldn't be checked here.
            try{
                if(process.env.NODE_ENV !== 'test'){
                    await account.getInventory();
                }
            } catch(err){
              console.log("Couldnt get accounting inventories");
            }

            for(let i = 0; i < product_list.length; i++ ){
                let product = new Product(product_list[i]);
                await product.find(connection);
                await product.findCategory(connection);
                await product.getVendor(connection);
                await product.getRules(connection);
                await product.findProductGlAccount(connection);
                products.push(product);
            }

            utils.send_response(res, {
                status: 200,
                data: {
                    products: Hash.obscure(products, req)
                }
            });


        } catch(err) {
            next(err);
        }



    });

    router.get('/list', [control.hasAccess(['admin']), Hash.unHash],  async(req, res, next) => {


        try{
          var connection = res.locals.connection;
          let query = req.query;
          let company = res.locals.active;
          let conditions = {
              search: query.search,
              category_type: query.category_type
          }

          if(query.type){
              conditions.types = Array.isArray(query.type) ? query.type : [query.type];
          } else {
              conditions.types = ['product']
          }

          let property_id = '';
          if (query.property_id) {
            property_id = query.property_id
          } else if (query.lease_id) {
            let property = await models.Property.findByLeaseId(connection, query.lease_id);
            property_id = property.id;
          } else if (query.unit_id){
            let unit = new Unit({id: query.unit_id});
            await unit.find(connection)
            property_id = unit.property_id;
          }

          console.log(conditions);

          // requiring property id now to force filters?
          if(property_id){
            //if(!property_id) e.th(400, "Invalid Parameters");
            let property = new Property({id: property_id});
            conditions.property_id = property_id;
            await property.find(connection)
            await property.verifyAccess({company_id: company.id, properties: res.locals.properties});
          }
          let products = await models.Product.searchByCompanyId(connection, conditions, company.id)

          utils.send_response(res, {
              status: 200,
              data: {
                  products: Hash.obscure(products, req)
              }
          });

        } catch(err) {
          next(err);
        }





    });

    router.get('/rent', [control.hasAccess(['admin']), Hash.unHash],  async(req, res, next) => {

        try{

          var connection = res.locals.connection;
          let company = res.locals.active;
          let product = await Product.findRentProduct(connection, company.id)
          utils.send_response(res, {
              status: 200,
              data: {
                  product: Hash.obscure(product, req)
              }
          });


        } catch(err) {
            next(err);
        }



    });

    router.get('/security', [control.hasAccess(['admin']), Hash.unHash],  async(req, res, next) => {


        try{

          var connection = res.locals.connection;
            let company = res.locals.active;
            let product = await Product.findSecurityDepositProduct(connection, company.id)
            utils.send_response(res, {
                status: 200,
                data: {
                    product: Hash.obscure(product, req)
                }
            });


        } catch(err) {
            next(err);
        }





        // var company = res.locals.active;
        // var connection = {};
        // pool.getConnectionAsync().then(function(conn){
        //     connection = conn;
        //     return models.Product.findSecurityDepositProduct(connection, company.id);
        // }).then(product => {
        //     utils.send_response(res, {
        //         status: 200,
        //         data: {
        //             product: Hash.obscure(product, req)
        //         }
        //     });
        // })
        // .then(() => utils.saveTiming(connection, req, res.locals))
        // .catch(next)
        // .finally(() => utils.closeConnection(pool, connection))
    });

    router.put('/:product_id', [control.hasAccess(['admin']), joiValidator.body(Schema.create), Hash.unHash] , async(req, res, next) => {

        try{

            var connection = res.locals.connection;
            let contact = res.locals.contact
            let company = res.locals.active;

            let body = req.body;
            body.Properties = body.Properties || [];

            let params = req.params;

            let product = new Product({id: params.product_id});
            await product.find(connection);
            await product.verifyAccess(company.id);

            await product.update(connection, body);
            await product.save(connection);

            if(body.Rules && body.Rules.length){
                await product.updateRules(connection, body.Rules);
            }

            for(let i = 0; i < body.Properties.length; i++){
                let property = new Property({id: body.Properties[i].id});
                await property.find(connection);
                await property.verifyAccess({company_id: company.id});
            }

            await product.updateProperties(connection, body.Properties, body.Rules);

            // let account = new Accounting({
            //   company_id: company.id
            // });

            // try{
            //     await account.getCompany(company.id);
            //     if(account.Company.facilities){
            //         await account.saveInventory(product, contact);
            //     }
            // } catch(err){
            //   console.log("Couldnt save accounting inventories");
            // }

            utils.send_response(res, {
                status: 200,
                data: {},
            });

            eventEmitter.emit('product_updated', {company, contact, product, cid: res.locals.company_id, locals: res.locals});


        } catch(err) {
            next(err);
        }




    })

    router.post('/', [control.hasAccess(['admin']), joiValidator.body(Schema.create), Hash.unHash], async(req, res, next) => {
        try{

          var connection = res.locals.connection;
            let contact = res.locals.contact
            let company = res.locals.active;

            let body = req.body;
            let params = req.params;

            let valid = await Product.verifyName(connection, body.name, company.id );
            if(!valid) e.th(409, "A product with this name already exists");

            let product = new Product();

            // TODO Save vendor
            product.make(body, company.id);
            await product.save(connection, contact);

            if(body.Rules && body.Rules.length){
                await product.updateRules(connection, body.Rules);
            }

            body.Properties = body.Properties || [];
            for(let i = 0; i < body.Properties.length; i++){
                let property = new Property({id: body.Properties[i].id});
                await property.find(connection);
                await property.verifyAccess({company_id: company.id});
            }

            await product.updateProperties(connection, body.Properties, body.Rules);

            utils.send_response(res, {
                status: 200,
                data: {
                    product: Hash.obscure(product, req)
                }
            });

            eventEmitter.emit('product_created', {company, contact, product, cid: res.locals.company_id, locals: res.locals});

            // qb =  new QuickBooks(company.id);
            //         return qb.init(connection).then(function() {
            //             if(!qb.isConfigured) return true;
            //             return qb.saveItem(product);
            //         })



        } catch(err) {
            next(err);
        }






        //
        // var connection = {};
        // var contact = res.locals.contact;
        // var company = res.locals.active;
        // var product = {};
        // var body = req.body;
        // var qb;
        //
        // pool.getConnectionAsync().then(function(conn) {
        //
        //     connection = conn;
        //
        //     return models.Product.findByName(connection, body.name, company.id).then(duplicate => {
        //         if (!duplicate) return true;
        //         var error = new Error("A product with this name already exists");
        //         error.code = 409;
        //         throw error;
        //     })
        // }).then(function(){
        //     var data = {
        //         company_id: company.id,
        //         name: body.name,
        //         price: body.price || null,
        //         description: body.description,
        //         taxable: (body.taxable) ? 1 : 0,
        //         active: 1,
        //         type: 'product',
        //         default_type: body.type
        //     };
        //
        //     if (body.qb_income_account) {
        //         data.qb_income_account = body.qb_income_account;
        //     }
        //
        //     product = new Product(data);
        //     return product.save(connection);
        //
        //
        // }).then(function(){
        //
        //     qb =  new QuickBooks(company.id);
        //     return qb.init(connection).then(function() {
        //         if(!qb.isConfigured) return true;
        //         return qb.saveItem(product);
        //     })
        // }).then(function(){
        //
        //     var activity = new Activity();
        //     return activity.create(connection,company.id,contact.id,2,9,product.id);
        //
        // }).then(function() {
        //    utils.send_response(res, {
        //        status: 200,
        //        data: {
        //            product: Hash.obscure(product, req)
        //        }
        //    });
        // })
        // .then(() => utils.saveTiming(connection, req, res.locals))
        // .catch(next)
        // .finally(() => utils.closeConnection(pool, connection))
    });

    router.delete('/:product_id',  [control.hasAccess(['admin']), Hash.unHash], async(req, res, next) => {

        try{

          var connection = res.locals.connection;
            let contact = res.locals.contact
            let company = res.locals.active;

            let params = req.params;

            let product = new Product({id: params.product_id});
            await product.find(connection);
            await product.verifyAccess(company.id);
            let usage = await product.usage(connection);
            
            if(usage.length) e.th(409, "This product is currently in use by lease templates or deliquency processes. Please remove it from those processes and try again.")
            await product.delete(connection);

            utils.send_response(res, {
                status: 200,
                data: {},
            });

            eventEmitter.emit('product_deleted', {company, contact, product, cid: res.locals.company_id, locals: res.locals});


        } catch(err) {
            next(err);
        }
    });
    
    router.get('/:product_id/usage', [control.hasAccess(['admin', 'api']), Hash.unHash],  async(req, res, next) => {

        try{

            var connection = res.locals.connection;
            let company = res.locals.active;
            let params = req.params;
            let product = new Product({id: params.product_id});
            await product.find(connection);
            await product.verifyAccess(company.id);
  
            let usage = await product.usage(connection);

            utils.send_response(res, {
                status: 200,
                data: {
                    usage: usage || []
                },
            });
              
        } catch(err) {
            next(err);
        }
    })

    router.get('/:product_id', [control.hasAccess(['admin', 'api']), Hash.unHash],  async(req, res, next) => {

        try{

          var connection = res.locals.connection;
            let contact = res.locals.contact;
            let company = res.locals.active;

            let params = req.params;

            let product = new Product({id: params.product_id});
            await product.find(connection);
            // try {
            //   await product.getAccountingDetails(connection);
            // } catch(err){
            //   console.log("Couldn't get accounting details");
            // }

            await product.getProperties(connection);
            await product.getRules(connection);
            await product.verifyAccess(company.id);

            utils.send_response(res, {
                status: 200,
                data: {
                    product: Hash.obscure(product, req)
                }
            });


        } catch(err) {
            next(err);
        }




        // var company = res.locals.active;
        // var params = req.params;
        // var connection = {};
        // var response = [];
        //
        // pool.getConnectionAsync().then(function(conn){
        //     connection = conn;
        //     return models.Product.findById(connection, params.product_id, company.id);
        // }).then(product => {
        //
        //     utils.send_response(res, {
        //         status: 200,
        //         data: {
        //             product: Hash.obscure(product, req)
        //         }
        //     });
        // })
        // .then(() => utils.saveTiming(connection, req, res.locals))
        // .catch(next)
        // .finally(() => utils.closeConnection(pool, connection))
    });

    return router;

};


