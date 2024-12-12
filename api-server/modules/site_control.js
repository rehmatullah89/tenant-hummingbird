var crypto = require('crypto');
var config    = require(__dirname + '/../config/settings.js');
var Promise = require('bluebird');
var apiKey = Promise.promisify(require("crypto").randomBytes);
var moment      = require('moment');
var context    = require(__dirname + '/../modules/request_context.js');

var Hash = require(__dirname + '/../modules/hashes.js');
var Hashes = Hash.init();



var Url = require('url');
var jwt = require('jsonwebtoken');
const consoleStamp = require('console-stamp');
var settings    = require(__dirname + '/../config/settings.js');

var e  = require(__dirname + '/./error_handler.js');

// var pool = require(__dirname + '/../modules/db.js');
var errors  = require(__dirname + '/../modules/error_handler.js');


function hash(passwd, salt) {
    return crypto.createHmac('sha256', salt.toString('base64')).update(passwd).digest('hex');
};




let site_control =  {

  getCompanyId(headers, params = {}){
    console.log("PARAMS", params); 
    if(params.company_id) {
      try {
        let unhashed_id = Hashes.decode(params.company_id);
        return unhashed_id[0];
      } catch(err) {
        e.th(400, "Invalid company id" );
      }
    }

  },

	getDomain(headers){
    
    if (process.env.NODE_ENV === 'local' && headers?.origin?.includes('localhost')) {
      headers.origin = `http://sandbox.${process.env.DOMAIN}`;
    }

		var refererDomain = (headers.origin) ? headers.origin.replace(/(^\w+:|^)\/\//, '').split('/')[0] : '';
		if (!refererDomain) return false;
		var refererParts = refererDomain.split('.');

		if (refererParts.length !== 3) return false;

		// hack for our devs to connect remotely

    if(!settings.is_prod){
		  if(refererParts[refererParts.length -2 ] === 'hummingbird' &&  refererParts[refererParts.length - 1 ] === 'local') return refererParts[0];
    }

		if(refererParts[refererParts.length - 2 ] + '.'+  refererParts[refererParts.length -1 ] !== settings.config.domain ) return false;

		return refererParts[0];
	},

  getCompany: async () => {

  },

  getAccountInfo: async (req, res, next) => {

    try {
      let connection =  res.locals.connection;

      var subdomain = site_control.getDomain(req.headers);
      if(!subdomain) {
        return res.status(500).json({
          status: 500,
          msg: "Invalid Request"
        })
      };

      // this is our frontend server
      if (subdomain === 'api' && req.url.startsWith("/v1/switch")) {
        res.locals.api = true;
        res.locals.subdomain = subdomain
      }

      //var connection = await pool.queryAsync();

      var companySql = 'select * from companies where subdomain = ' + connection.escape(subdomain);
      let c = await connection.queryAsync(companySql);

      if (!c.length)  return res.status(401).send(errors.get(401, "Company not found."));

      // connection.release();
      res.locals.api = false;
      res.locals.subdomain = c[0].subdomain;

      let settings = new Settings({company_id: c[0].id});
      let ipp_feature_settings = await settings.findSettingByName(connection, ENUMS.SETTINGS.BILLING.allowInterPropertyPayments.name);
      let ipp_feature = +ipp_feature_settings?.value || null;

      if(connection.meta) {
        connection.meta.ipp_feature = ipp_feature
      }

      next();
    } catch(err){
      throw err;
      // console.log("err", err);
      // res.status(500).send(errors.get(500, err.toString()));
    }

    // if (connection && pool._freeConnections.indexOf(connection) < 0) {
    //   console.log("connection", typeof connection);
    //   connection.release();
    // }

  },

  hasAccess: function(allowed){

    return async (req, res, next) => {

      if ( allowed.indexOf('nectar') >= 0){

        try {
          let nectar_secret = req.headers['x-nectar-is-nectar']; 
          if(nectar_secret !== settings.nectar_secret) e.th(403, "Not authorized.");
          let connection =  res.locals.connection;
          let cid = res.locals.company_id;
          let local_company_id = res.locals.local_company_id;

          company = new Company({id: local_company_id});
          await company.find(connection);
        
          let property_list = await Property.findByCompanyId(connection, company.id);
          let onboarding_status = req?.headers?.['x-onboarding-status']
          if(!property_list.length && onboarding_status != "New")  errors.th(401, "This company is not set up yet");

          res.locals.active = company;
          res.locals.properties = property_list;
      
          return next();
          
        } catch(err) {
          return next(err); 
        }

      }

      if(req.headers['x-nectar-application-id']){

        try {
          // if(allowed.indexOf('api') < 0){
          //   return res.status(403).send('Forbidden');
          // }
          let nectar_secret = req.headers['x-nectar-is-nectar']; 
          if(nectar_secret !== settings.nectar_secret) e.th(403, "Not authorized.")

          let connection =  res.locals.connection;
          let cid = res.locals.company_id;
          let local_company_id = res.locals.local_company_id;
          let company = {}
          let user = new User({gds_application_id: req.headers['x-nectar-application-id']});
          
          try {
            company = new Company({id: local_company_id});
            await company.find(connection);
          } catch(err) {
            errors.th(404, "Company Not found.");
          }
          try {
            var contact = await user.authenticateApplication(connection, company, cid);
          } catch (err){
            console.log("err!!!", err);
            e.th(403, "Not authorized");
          }
          let logs = {
              request_data: {
                  ...res.locals.logging,
                  ...res.headers,
                  message: 'This application does not have any access to this company property'
              },
              env: process.env.NODE_ENV
          };
          if (!contact.Properties.length && logs.env !== 'test' && logs.env !== 'local' && logs.env !== 'data-validation') utils.sendLogsToGDS('HB_API_Server', logs.request_data, '', 'info', res.locals.request_id, res.locals.request_id, {
              event_name: 'PropertyAccessError'
          });
          res.locals.contact =  contact;
          if(connection.meta) {
            connection.meta.contact_id = contact.id;
          }
          res.locals.active = company;
          res.locals.properties = contact.Properties.map(p => p.id);
          res.locals.permissions = contact.Permissions;
          res.locals.isNectarRequest = true;
          res.locals.appId = contact?.gds_application_id;

          return next();
          
        } catch(err) {
          console.log("Nectar application not found.", err); 
          // uncomment when API keys are retired, or all nectar apps are integrated.
          // next(err)
        }
      } 

      if (req.headers['leasecaptain-api-key']){
        
        if(allowed.indexOf('api') < 0){
          return res.status(403).send('Forbidden');
        }
        
        let connection =  res.locals.connection;

        try {

          let company;
          let api_key;

          try {

            api_key = new ApiKey({ apikey: req.headers['leasecaptain-api-key']});

            await api_key.find(connection);

          } catch(err) {
            errors.th(401, "API key not found.");
          }

          try {
            company = new Company({id: api_key.company_id});
            await company.find(connection);
          } catch(err) {
            errors.th(401, "Invalid API Key.");
          }

          let property_list = await Property.findByCompanyId(connection, company.id);
          if(!property_list.length)  errors.th(401, "This company is not set up yet");


          res.locals.api = api_key;
          res.locals.active = company;
          res.locals.properties = property_list.map(p => p.id);

        } catch(err) {
          console.log("err", err)
          console.log(err.code)

          return res.status(err.code).json({
            status: err.code,
            message: err.toString()
          });
        }
       // await utils.closeConnection(pool, connection);
        return next();

      } else if(req.headers['authorization']){

        var token = req.headers['authorization'];
        var superAdmin = false;
        if(!token) return res.send({ success: 500, msg: 'Missing authorization credentials.' });

        jwt.verify(token, settings.security.key, async (err, decoded) => {
          
          
          if (err) return res.status(401).json({ status: 401, msg: 'You are not logged in or your session has expired.  Please log in to continue.' });
          decoded.contact.type = decoded.contact.type || 'admin'; 
          // verify that logged in user is accessing though the proper domain
          // console.log("decoded", decoded);
          var subdomain = site_control.getDomain(req.headers);

          if(subdomain !== decoded.active.subdomain){
            return res.status(401)
          }

          /* temporary hack until we have proper permissions */
          if(decoded.contact.id === 'DeMjRz0jrZ' && allowed.indexOf('superadmin') >= 0){
            superAdmin = true;
          }

          // require 'admin' access for routes
          if(!superAdmin){
            let roles = decoded.contact.roles; 
            let is_allowed = false;

            for(let i=0; i<roles.length; i++){
              if(allowed.includes(roles[i])){
                is_allowed = true;
                break;
              }
            }

            if(!is_allowed)
              return res.status(403).send(errors.get(403, "You are not allowed to access this resource"));
          }

          // if everything is good, save to request for use in other routes

          let connection =  res.locals.connection;
          let ipp_feature;
          try {
            res.locals.contact =  Hash.clarify(decoded.contact, res.locals.company_id);
            // this specifically omits the company_id
            res.locals.properties = decoded.properties ? Hashes.decode(decoded.properties) : [];
            res.locals.gps_selection = decoded.gps_selection ? Hashes.decode(decoded.gps_selection) : [];
            res.locals.active = Hash.clarify(decoded.active, res.locals.company_id);
            res.locals.isAdminAccess = allowed.indexOf('admin') >= 0 ? true : false;
            
            let settings = new Settings({company_id: res.locals.active.id});
            ipp_feature = await settings.findSettingByName(connection, ENUMS.SETTINGS.BILLING.allowInterPropertyPayments.name);
            ipp_feature = +ipp_feature?.value || null;

          } catch(err){
            console.log("err", err)
          }
          let contact = new Contact({
            id: res.locals.contact.id
          });

          res.fns.addStep('beforeGettingPermission');
          await contact.getPermissions(connection, res.locals.active.id);
          res.locals.permissions = contact.Permissions;
          res.fns.addStep('AfterGettingPermission');
          if(connection.meta) {
            connection.meta.contact_id = contact.id;
            connection.meta.gps_selection = res.locals.gps_selection;
            connection.meta.is_hb_user = true;
            connection.meta.ipp_feature = ipp_feature;
          }
          //res.locals.properties = contact.Properties;
          // await utils.closeConnection(pool, connection);

          return next();
        });

      } else if(allowed.indexOf('report_sharing') >= 0) { //Added by BCT team for share port poc
        
        const validToken = process.env.SHARING_REPORT_AUTH_TOKEN || "aslfkjaoiwrowlois9aslfkjalfkjsaeo";
        const inComingToken = req.headers['x-tenant-api-token'];

        if (inComingToken !== validToken) res.status(400).send(errors.get(400, 'You are not allowed to access this resource.'));

        let company;
        let connection = res.locals.connection;
        try {
          company = new Company({ id: res.locals.local_company_id });
          await company.find(connection);
        } catch (err) {
          console.error('Company_id not found.' + (err && err.stack || err));
          return res.status(401).send(errors.get(401, "Invalid Company."));
        }

        let contact = new Contact({
          id: ''
        });

        let property_list = await Property.findByCompanyId(connection, company.id);

        res.locals.contact = contact;
        if(connection.meta) {
          connection.meta.contact_id = contact.id;
        }
        res.locals.properties = property_list.map(p => p.id);
        res.locals.active = company;

        return next();

      } else if(allowed.indexOf('doc_manager') >= 0) {
        const validToken = process.env.DOCUMENT_MANAGER_AUTH_TOKEN;
        const inComingToken = req.headers['x-tenant-doc-token'];

        console.log(`Incoming token: ${inComingToken}`);

        if(inComingToken === validToken) {
          return next();
        }

        e.th(400, 'You are not allowed to access this resource.');
      } else if (req.headers['host'] === '10.0.46.14') {
        next();
      } else if(process.env['test']){
        req.session.user = config.test[process.env['test']].user;
        req.session.active = config.test[process.env['test']].active;
      } else {
        res.send({ status: 401, msg: 'You are not logged in or your session has expired.  Please log in to continue.' });
      }

    }
  },

  hasPermission: function(permission){
    
    return async (req, res, next) => {      
      if(!res.locals.api && permission){
        let data = {company_id: res.locals.active.id, contact_id: res.locals.contact?.id, permissions: [permission]}
        res.fns.addStep('beforeCheckingPermission');
        let unauthorized_permissions = await models.Contact.hasPermissions(res.locals.connection, data)
        res.fns.addStep('AfterCheckingPermission');

        if(unauthorized_permissions?.length)
          return res.status(403).send(errors.get(403, `You are not allowed to access this resource`));
      }
      next();
    }
  },

 /* A middleware function that checks if the user has the required scopes to access
 the resource. */
  hasScopes: function(scopes){
    return async (req, res, next) => {

      let errorMessage = "You are not allowed to access this resource";
      let headerScopes = req.headers['x-nectar-scopes']?.split(",")?.map(scope => scope.trim())?.filter(Boolean) ?? [];

      if (!headerScopes.length) return res.status(403).send(errors.get(403, errorMessage));
      if (!scopes?.every(scope => headerScopes?.includes(scope))) {
        return res.status(403).send(errors.get(403, errorMessage));
      }
      next();
    }
  },

  validateApiKey: function(req, res, next) {

        var apiKey = req.query.key;

        let connection =  res.locals.connection;
        var sql = 'Select * from api_keys where apikey = ' + connection.escape(apiKey);
        if(err){
            res.send(400, 'An error occurred');
        } else {
            connection.query(sql, function (err, result) {
                if (result.length) {
                    req.account = result[0];
                    connection.release();
                    next();
                } else {
                    var data = {
                        msg:'Missing or incorrect authorization header'
                    };
                    res.status(400).send(JSON.stringify(data));
                }
            });
        }
    },

	encode: function(){
        var cipher = crypto.createCipher(config.security.algorithm, config.security.key);
        return cipher.update(JSON.stringify(obj), 'utf8', 'hex') + cipher.final('hex');
    },

	decode: function(hash){
        var decipher = crypto.createDecipher(config.security.algorithm, config.security.key);

        return JSON.parse(decipher.update(hash, 'hex', 'utf8') + decipher.final('utf8'));
    },

	hashPassword:function(passwordString, salt) {
    return hash(passwordString, salt);
  },

};

module.exports = site_control;
var Company    = require(__dirname + '/../classes/company.js');
var Property    = require(__dirname + '/../classes/property.js');
var Contact    = require(__dirname + '/../classes/contact.js');
var ApiKey  = require(__dirname + '/../classes/api_key.js');
var User = require(__dirname + '/../classes/user.js');
var utils    = require(__dirname + '/../modules/utils.js');
var models    = require(__dirname + '/../models');
var Settings = require(__dirname + '/../classes/settings.js');
const ENUMS = require(__dirname + '/enums.js');







