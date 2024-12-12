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
var qs = require('querystring');
var request = require('request');
var requestPromise = require('request-promise');

var models = require(__dirname + '/../models');

var QB = require('node-quickbooks');
var QuickBooks  = require(__dirname + '/../classes/quickbooks.js');
var Setting  = require(__dirname + '/../classes/settings.js');
var ApiKey  = require(__dirname + '/../classes/api_key.js');
var Product  = require(__dirname + '/../classes/product.js');
var Insurance  = require(__dirname + '/../classes/insurance.js');
var utils    = require(__dirname + '/../modules/utils.js');
var Activity  = require(__dirname + '/../classes/activity.js');
var Settings  = require(__dirname + '/../classes/settings.js');
var Accounting  = require(__dirname + '/../classes/accounting.js');
var Role  = require(__dirname + '/../classes/role.js');
var LeaseStanding = require(__dirname + '/../classes/lease_standing.js');
var Property  = require(__dirname + '/../classes/property.js');
var eventEmitter = require(__dirname + '/../events/index.js');
var e  = require(__dirname + '/../modules/error_handler.js');
let StoredContents = require(__dirname + '/../classes/stored_contents.js');

const joiValidator = require('express-joi-validation')({
    passError: true
});

var Schema = require(__dirname + '/../validation/settings.js');


module.exports = function(app) {

    router.post('/', [control.hasAccess(['admin']), Hash.unHash], async (req, res, next) => {

        try {
            let company = res.locals.active;
            let contact = res.locals.contact;
            var connection = res.locals.connection;
            let settings_data = req.body;
            let setting = new Setting();

            await setting.saveSettings(connection, settings_data, company.id);

            utils.send_response(res, {
                status: 200
            });


            eventEmitter.emit('settings_updated', { contact, company, settings, cid: res.locals.company_id, locals: res.locals});

        } catch(err){
            next(err)
        }



    });

    /*****  API KEYS *****/
    router.get('/api-keys', [control.hasAccess(['admin', 'api']), Hash.unHash], async (req, res, next) => {

        var connection = res.locals.connection;
        try{
            const company = res.locals.active;
            let apiKeys = await models.Api.findKeys(connection, company.id);

            utils.send_response(res,  {
                status: 200,
                data: {
                    keys: Hash.obscure(apiKeys, req)
                }
            });



        } catch(err){
            next(err)
        }


    });

    router.post('/api-keys', [control.hasAccess(['admin', 'api']), joiValidator.body( Schema.createApiKey), Hash.unHash], async(req, res, next) => {


        try{
            const company = res.locals.active;
            const contact = res.locals.contact;
            let body = req.body;

            var connection = res.locals.connection;

            let apiKey = new ApiKey();
            await apiKey.createApiKey(connection, body, company.id);

            utils.send_response(res, {
                status: 200,
                data: {
                    apikey: Hash.obscure(apiKey, req)
                }
            });


            eventEmitter.emit('api_key_created', { contact, company, apiKey, cid: res.locals.company_id, locals: res.locals});

        } catch(err){
            next(err)
        }


    });

    router.put('/api-keys/:apiKey_id', [control.hasAccess(['admin']), joiValidator.body( Schema.createApiKey), Hash.unHash], async (req, res, next) => {

        try{
            const company = res.locals.active;
            const contact = res.locals.contact;
            let body = req.body;
            let params = req.params;

            var connection = res.locals.connection;
            body.id = params.apiKey_id;

            let apiKey = new ApiKey(body);
            await apiKey.updateKey(connection, body, company.id);

            utils.send_response(res, {
                status: 200,
                data: {
                    apikey: apiKey
                }
            });



            eventEmitter.emit('api_key_updated', { contact, company, apiKey, cid: res.locals.company_id, locals: res.locals});

        } catch(err){
            next(err)
        }


    });

    router.delete('/api-keys/:apiKey_id', [control.hasAccess(['admin']), Hash.unHash], async (req, res, next) => {

        try{
            const company = res.locals.active;
            const contact = res.locals.contact;
            const params = req.params;


            var connection = res.locals.connection;

            let apiKey = new ApiKey();
            await apiKey.deleteApiKey(connection, params.apiKey_id, company.id);


            utils.send_response(res, {
                status: 200,
                data:{}
            });


            eventEmitter.emit('api_key_deleted', { contact, company, apiKey, cid: res.locals.company_id, locals: res.locals});

        } catch(err){
            next(err)
        }




    });

    router.get('/billing', [control.hasAccess(['admin','tenant']), Hash.unHash], async(req, res, next) => {

        var connection = res.locals.connection;
        try{
            const company = res.locals.active;
            let settings = await Settings.findSettings(connection, 'billing', company.id);

            utils.send_response(res,  {
                status: 200,
                data: {
                    settings: Hash.obscure(settings, req)
                }
            });



        } catch(err){
            next(err)
        }



    });

    router.get('/notifications', [control.hasAccess(['admin']), Hash.unHash], async (req, res, next) =>  {


        var connection = res.locals.connection;
        try{
            const company = res.locals.active;
            let settings = await Settings.findSettings(connection, 'notifications', company.id);

            utils.send_response(res,  {
                status: 200,
                data: {
                    settings: Hash.obscure(settings, req)
                }
            });



        } catch(err){
            next(err)
        }
    });

    router.get('/accounting', [control.hasAccess(['admin']), Hash.unHash], async(req, res, next) => {

      var connection = res.locals.connection;
      try{

        const company = res.locals.active;
        let account = new Accounting({
          company_id: company.id
        })

        await account.getCompany(company.id);
        if(account.Company){
          await account.getCOA();
        }
        utils.send_response(res, {
          status: 200,
          data: {
            account: Hash.obscure(account, req)
          }
        });
      } catch(err){
        next(err)
      }



    });

    router.get('/accounting/tax-accounts', [control.hasAccess(['admin']), Hash.unHash], async(req, res, next) => {

    var connection = res.locals.connection;

    try{
      const company = res.locals.active;
      let account = new Accounting({
        company_id: company.id
      });

      await account.getCompany(company.id);
      if(account.Company){
        await account.getTaxAccounts();
      }
      utils.send_response(res, {
        status: 200,
        data: {
          tax_accounts: Hash.obscure(account.TaxAccounts, req)
        }
      });
    } catch(err){
      next(err)
    }


  });

    router.post('/accounting/account', [control.hasAccess(['admin']), joiValidator.body( Schema.createAccount), Hash.unHash], async(req, res, next) => {
      var connection = res.locals.connection;
      try{
        const company = res.locals.active;
        const body = req.body;
        body.type_cd = body.acct_type;
        let account = new Accounting({
          company_id: company.id
        });
        await account.getCompany(company.id);
        if(account.Company){
          await account.saveAccount(body);
        }
        utils.send_response(res, {
          status: 200,
          data: {
            account: Hash.obscure(account, req)
          }
        });

      } catch(err){
        next(err)
      }

    });

    router.put('/accounting/account/:account_id', [control.hasAccess(['admin']), joiValidator.body( Schema.updateAccount), Hash.unHash], async(req, res, next) => {
      var connection = res.locals.connection;
      try{
        const company = res.locals.active;
        const body = req.body;
        let params = req.params;
        body.account_id = params.account_id;
        let account = new Accounting({
          company_id: company.id
        });

        await account.getCompany(company.id);

        if(account.Company){
          await account.saveAccount(body);
        }

        utils.send_response(res, {
          status: 200,
          data: {
            account: Hash.obscure(account, req)
          }
        });


      } catch(err){
        next(err)
      }
    });

    router.get('/accounting/categories', [control.hasAccess(['admin']), Hash.unHash], async(req, res, next) => {
      var connection = res.locals.connection;
      try{
        const company = res.locals.active;
        let account = new Accounting({
          company_id: company.id
        });
        await account.getCategories();

        utils.send_response(res, {
          status: 200,
          data: {
            categories: Hash.obscure(account.Categories, req)
          }
        });

      } catch(err){
        next(err)
      }

    });

    router.get('/accounting/account-types', [control.hasAccess(['admin']), Hash.unHash], async(req, res, next) => {
      var connection = res.locals.connection;
      try{
        const company = res.locals.active;
        let account = new Accounting({
          company_id: company.id
        })
        await account.getTypes();
        utils.send_response(res, {
          status: 200,
          data: {
            account_types: Hash.obscure(account.AccountTypes, req)
          }
        });

      } catch(err){
        next(err)
      }

    });

    router.get('/accounting/account-subtypes', [control.hasAccess(['admin']), Hash.unHash], async(req, res, next) => {
    var connection = res.locals.connection;
    try{
      const company = res.locals.active;
      let account = new Accounting({
        company_id: company.id
      })
      await account.getSubtypes();
      utils.send_response(res, {
        status: 200,
        data: {
          account_subtypes: Hash.obscure(account.AccountSubtypes, req)
        }
      });

    } catch(err){
      next(err)
    }

  });

    router.post('/accounting', [control.hasAccess(['admin']), Hash.unHash], async(req, res, next) => {
    var connection = res.locals.connection;
    try{
      const company = res.locals.active;
      let account = new Accounting({
        company_id: company.id
      });

      await account.create(connection, company.name);
      await account.copyBaseLedger();

      // Get properties of the company and create Facilities in Ledger
      let properties = await Property.findByCompanyId(connection, company.id);

      for (let i = 0; i < properties.length; i++){
        await account.createProperty(properties[i]);
      }

      utils.send_response(res, {
        status: 200,
        data: {}
      });
      //TODO emit event

    } catch(err){
      next(err)
    }

  });



    // //TODO validate body
    // router.post('/accounting', control.hasAccess(['admin']), async(req, res, next) => {
    //
    //   var connection = res.locals.connection;
    //   try{
    //
    //     const company = res.locals.active;
    //     const body = req.body;
    //
    //     let account = new Accounting({
    //       company_id: company.id,
    //       name: body.name,
    //       account_number: body.account_number,
    //       account_type: body.account_type,
    //       status: 1
    //     });
    //
    //     await account.save(connection);
    //
    //     utils.send_response(res, {
    //       status: 200,
    //       data: {}
    //     });
    //
    //     //TODO emit event
    //
    //
    //   } catch(err){
    //     next(err)
    //   }
    //   await ;
    //
    //
    // });

    router.get('/accounting/products', [control.hasAccess(['admin']), Hash.unHash], async (req, res, next) => {

      var connection = res.locals.connection;
      try{

        const company = res.locals.active;
        const query = req.query;
        let products = [];
        let product_list = await Product.findByCompanyId(connection, company.id, query.type);
        for(let i = 0; i < product_list.length; i++){
          let product = new Product(product_list[i]);
          await product.find(connection);
          await product.findAccount(connection);
          products.push(product);
        }

        //TODO redact response
        utils.send_response(res, {
          status: 200,
          data: {
            products: Hash.obscure(products, req)
          }
        });



      } catch(err){
        next(err)
      }



    });

    router.post('/accounting/products/:product_id', [control.hasAccess(['admin']), Hash.unHash], async (req, res, next) => {

    var connection = res.locals.connection;
    try{

      const company = res.locals.active;
      const contact = res.locals.contact;
      const params = req.params;
      const body = req.body;

      let product = new Product({id: params.product_id});
      await product.find(connection);

      await product.verifyAccess(company.id);
      await product.findAccount(connection);

      product.setAccountData(body);
      await product.saveAccount(connection);

      utils.send_response(res, {
        status: 200,
        data: {}
      });



    } catch(err){
      next(err)
    }


    });

    // router.get('/quickbooks', control.hasAccess(['admin']), function(req, res, next) {
    //     var connection = {};
    //     var company = res.locals.active;
    //     var company_id = company.id;
    //     var qb;
    //     var qbAccounts;
    //     var qbTaxCodes;
    //     pool.getConnectionAsync()
    //         .then(function(conn){
    //             connection = conn;
    //             qb =  new QuickBooks(company_id);
    //             return qb.init(connection);
    //         })
    //         .then(() => qb.listAccounts({AccountType: 'Income'}))
    //         .then(() => qb.listTaxCodes())
    //         .then(() => {
    //             res.send({
    //                 status: true,
    //                 data: {
    //                     settings: qb.user_settings,
    //                     qbCompany: qb.company_file,
    //                     qbConfigured: qb.isConfigured,
    //                     qbAccounts: qb.income_accounts,
    //                     qbTaxCodes: qb.tax_codes
    //                 }
    //             })
    //         })
    //     .then(() => utils.saveTiming(connection, req, res.locals))
    //     .catch(next)
    //     .finally(() => utils.closeConnection(pool, connection))
    //
    // });
    //
    // router.get('/link-qb',  control.hasAccess(['admin']), function(req, res, next){
    //     var connection;
    //     var company = res.locals.active;
    //
    //
    //     var postBody = {
    //         url: settings.quickbooks.request_token,
    //         oauth: {
    //             callback: settings.config.protocol + '://' + res.locals.active.subdomain + '.' + settings.config.domain + '/settings/qb-callback',
    //             consumer_key: settings.quickbooks.consumer_key,
    //             consumer_secret: settings.quickbooks.consumer_secret
    //         }
    //     };
    //     request.post(postBody, function (e, r, data) {
    //         var requestToken = qs.parse(data);
    //
    //         pool.getConnectionAsync().then(conn =>{
    //             connection = conn;
    //             return models.Setting.saveSettings(connection, {
    //                 qbOauthTokenSecret: requestToken.oauth_token_secret,
    //                 qbOauthToken: requestToken.oauth_token
    //             }, 'quickbooks', company.id)
    //         }).then(() => {
    //             res.send({
    //                 status:200,
    //                 data: {
    //                     redirect: QB.APP_CENTER_URL + requestToken.oauth_token
    //                 }
    //             });
    //         })
    //         .then(() => utils.saveTiming(connection, req, res.locals))
    //         .catch(next)
    //         .finally(() => utils.closeConnection(pool, connection))
    //     })
    // });
    //
    // router.get('/disconnect-qb', control.hasAccess(['admin']), function(req, res, next){
    //     var connection = {};
    //     var company = res.locals.active;
    //     var company_id = company.id;
    //
    //     var userSettings = {};
    //
    //     var qbCompany = {};
    //
    //     pool.getConnectionAsync().then(conn => {
    //         connection = conn;
    //
    //         return models.Setting.findSettings(connection, 'quickbooks', company_id);
    //
    //     }).then(settingsRes => {
    //         settingsRes.forEach(function(setting){
    //             userSettings[setting.name] = setting.value;
    //         });
    //
    //         if(!settingsRes.length) return false;
    //         var postBody = {
    //             url: settings.quickbooks.disconnect_url,
    //             oauth: {
    //                 consumer_key:    settings.quickbooks.consumer_key,
    //                 consumer_secret: settings.quickbooks.consumer_secret,
    //                 token:           userSettings.qbOauthToken,
    //                 token_secret:    userSettings.qbOauthTokenSecret
    //             }
    //         };
    //
    //         return requestPromise.post(postBody)
    //
    //     }).then(() => {
    //
    //         // TODO remove database entries
    //
    //         res.send({status: true});
    //     })
    //     .then(() => utils.saveTiming(connection, req, res.locals))
    //     .catch(next)
    //     .finally(() => utils.closeConnection(pool, connection))
    //
    // });
    //
    // router.get('/qb-callback',  control.hasAccess(['admin']), function(req, res, next) {
    //     var connection;
    //     var company = res.locals.active;
    //     var company_id = company.id;
    //
    //     pool.getConnectionAsync().then(conn => {
    //         connection = conn;
    //         return models.Setting.findCompanySetting(connection, 'qbOauthTokenSecret', company_id);
    //     }).then(qbOauthTokenSecretRes => {
    //
    //
    //         var postBody = {
    //             url: QB.ACCESS_TOKEN_URL,
    //             oauth: {
    //                 consumer_key:    settings.quickbooks.consumer_key,
    //                 consumer_secret: settings.quickbooks.consumer_secret,
    //                 token:           req.query.oauth_token,
    //                 token_secret:    qbOauthTokenSecretRes.value,
    //                 verifier:        req.query.oauth_verifier,
    //                 realmId:         req.query.realmId
    //             }
    //         };
    //
    //
    //         request.post(postBody, function (e, r, data) {
    //             var accessToken = qs.parse(data);
    //             return models.Setting.saveSettings(connection, {
    //                 qbOauthTokenSecret: accessToken.oauth_token_secret,
    //                 qbOauthToken: accessToken.oauth_token,
    //                 qbRealmId: postBody.oauth.realmId,
    //                 qbTokenRenewal: moment().add(151,'days').format('YYYY-MM-DD')
    //             }, 'quickbooks', company_id).then(() => {
    //
    //                 res.send({status: true});
    //             })
    //         })
    //     })
    //     .then(() => utils.saveTiming(connection, req, res.locals))
    //     .catch(next)
    //     .finally(() => utils.closeConnection(pool, connection))
    //
    // });


    router.get('/brivo', [control.hasAccess(['admin']), Hash.unHash], function(req, res, next) {

        var clientID = '2587d849-6927-40bc-9c1f-bf7b3c2e9346';
        var clientSecret = 'zlliEh2tLSfM2CBZPsZVnTFTuEz8tALV';

        var  apikey = 'r74snddmmgww6reja95h2ku9';
        // var secret = 'your secret';

        var authHeader = new Buffer(clientID+":"+clientSecret).toString('base64');

        utils.send_response(res, {
            status: true,
            data:{
                clientID: clientID,
                Authorization: "Basic " + authHeader,
                apikey: 'r74snddmmgww6reja95h2ku9'
            }
        });
    });

    router.get('/lease-standings', [control.hasAccess(['admin','api','tenant']), Hash.unHash], async(req, res, next) => {

      var connection = res.locals.connection;
      try{

        let lease_standings = await LeaseStanding.findAll(connection);

        utils.send_response(res,  {
          status: 200,
          data: {
            lease_standings: Hash.obscure(lease_standings, req)
          }
        });



      } catch(err){
        next(err)
      }


    });

    router.post('/lease-standings',  [control.hasAccess(['admin', 'api']), Hash.unHash],  async (req, res, next) => {

      var connection = res.locals.connection;

      try {

        let company = res.locals.active;
        let contact = res.locals.contact;
        let body = req.body;

        var lease_standing = new LeaseStanding({
            name: body.name,
            overlock: body.overlock,
            deny_access: body.deny_access
        });

        let lease_standing_id = await lease_standing.save(connection);

        utils.send_response(res, {
          status: 200,
          data: {
            lease_standing_id: Hashes.encode(lease_standing_id, res.locals.company_id)
          }
        });

        // TODO Save Activity


      } catch(err) {
        next(err);
      }




    });

    router.put('/lease-standings/:lease_standing_id', [control.hasAccess(['admin', 'api']), Hash.unHash], async (req, res, next) => {
        var connection = res.locals.connection;

        try {
            let company = res.locals.active;
            let body = req.body;
            const params = req.params;

            let lease_standing = new LeaseStanding({id: params.lease_standing_id});
            await lease_standing.find(connection);

            lease_standing.verifyAccess(company.id);
            lease_standing.update(body);
            await connection.beginTransactionAsync();
            await lease_standing.save(connection);
            await connection.commitAsync();

            utils.send_response(res, {
                status: 200,
                data: {
                  lease_standing_id: Hashes.encode(lease_standing.id, res.locals.company_id)
                }
            });


        } catch (err) {
            await connection.rollbackAsync();
            next(err);
        } finally {

        }
    });

    /*****  API KEYS *****/
    router.get('/permissions', [control.hasAccess(['admin', 'api']), Hash.unHash], async (req, res, next) => {

      var connection = res.locals.connection;

      try{

        const company = res.locals.active;

        let permissions = await Role.getAllPermissions(connection);

        utils.send_response(res, {
          status: 200,
          data: {
            permissions: Hash.obscure(permissions, req)
          }
        });



      } catch(err){
        next(err)
      }



    });

    router.post('/transactional', [control.hasAccess(['admin']), control.hasPermission('manage_settings_bill')], async(req, res, next) => {
      try {
        const company = res.locals.active;
        var connection = res.locals.connection;        
        await connection.beginTransactionAsync();
        await Setting.saveMultiple(connection, {
          company_id: company.id,
          settings: req.body,
          setting_category: 'transactional',
          api_info: res
        });
        await connection.commitAsync();

        utils.send_response(res,{
          status: 200,
          data: {}
        });

      } catch(err) {
        await connection.rollbackAsync();
        next(err);
      }
    });
    
    router.get('/transactional', [control.hasAccess(['admin']), Hash.unHash], async (req, res, next) =>  {
      var connection = res.locals.connection;

      try {
        const company = res.locals.active;
        let settings = new Settings({ company_id: company.id });
        let transactionalSettings = await settings.getTransactionalSettings(connection);
        utils.send_response(res, {
          status: 200,
          data: transactionalSettings
        });
      } catch(err){
        next(err)
      }
  });

  /* To get stored content list */
  router.get('/stored-contents', [control.hasAccess(['admin', 'api']), Hash.unHash],  async(req, res, next) => {
    let connection = res.locals.connection;
    let query = req.query;
    let queryParamStatus = query?.status?.toLowerCase() ?? null;
    let status = ['all', 'active', 'inactive'].includes(queryParamStatus) ? queryParamStatus : 'active';

    try {
      let data = await StoredContents.getAll(connection, status);

      utils.send_response(res, {
        status: 200,
        data: {
          stored_contents: Hash.obscure(data, req)
        }
      });
    } catch(err) {
      next(err);
    }
  });

  /* For updating existing stored content */
  router.put('/stored-contents/:stored_content_id', [control.hasAccess(['admin', 'api']), joiValidator.body( Schema.storedContent), Hash.unHash],  async(req, res, next) => {
    let connection = res.locals.connection;
    let body = req.body;

    try {
      let storedContent = new StoredContents(body);
      let content = await storedContent.findById(connection, req.params.stored_content_id)
      if(!content) e.th(404, "Cannot find stored content");

      await storedContent.update(connection);
      utils.send_response(res, {
        status: 200,
        data: Hash.obscure(storedContent, req),
        message: "Success"
      });
    } catch(err) {
      next(err);
    }
  });

  /* For saving new stored content */
  router.post('/stored-contents', [control.hasAccess(['admin', 'api']), joiValidator.body( Schema.storedContent), Hash.unHash],  async(req, res, next) => {
    let connection = res.locals.connection;
    let body = req.body;

    try {
      let storedContent = new StoredContents(body);
      await storedContent.create(connection);
      utils.send_response(res, {
        status: 200,
        data: Hash.obscure(storedContent, req),
        message: "Success"
      });
    } catch(err) {
      next(err);
    }
  });


  /* For deleting stored content */
  router.delete('/stored-contents/:stored_content_id', [control.hasAccess(['admin', 'api']), Hash.unHash],  async(req, res, next) => {
    let connection = res.locals.connection;

    try {
      let storedContent = new StoredContents({id: req.params.stored_content_id});
      let content = await storedContent.findById(connection, req.params.stored_content_id)
      if(!content) e.th(404);

      await storedContent.delete(connection);
      utils.send_response(res, {
        status: 200,
        data: Hash.obscure({id: storedContent?.id}, req),
        message: "Success"
      });
    } catch (err) {
      next(err);
    }
  });

  router.get('/reservation', [control.hasAccess(['admin'])], async (req, res, next) => {
    const connection = res.locals.connection;

      try {
        const company = res.locals.active;
        
        const reservationSettings = await Settings.getByCategory(connection, { setting_category: 'reservation', company_id: company.id });
        
        utils.send_response(res, {
          status: 200,
          data: reservationSettings
        });
      } catch (err) {
        next(err);
      }
    });

    router.get('/', [control.hasAccess(['admin']), Hash.unHash], async (req, res, next) =>  {
      try {
        const { connection, active: company } = res.locals;
        const { query } = req;
        const { property_id, category } = query;

        const settings = await Settings.findPropertyOrDefaultSettings(connection, { 
          category: category, 
          company_id: company.id, 
          property_id  
        });

        utils.send_response(res, {
          status: 200,
          data: { 
            settings: Hash.obscure(settings, req),
          }
        });
      } catch(err){
        next(err)
      }
    });  
    
    router.post('/:category', [control.hasAccess(['admin']), Hash.unHash], async(req, res, next) => {
      try {
        const company = res.locals.active;
        let params = req.params;
        var connection = res.locals.connection;        
        await connection.beginTransactionAsync();
        await Setting.saveMultiple(connection, {
          company_id: company.id,
          settings: req.body.settings,
          setting_category: params.category,
          api_info: res
        });
        await connection.commitAsync();

        utils.send_response(res,{
          status: 200,
          data: {}
        });

      } catch(err) {
        await connection.rollbackAsync();
        next(err);
      }
    });

    return router;

};
