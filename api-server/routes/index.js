var express     = require('express');
var router      = express.Router();
var moment      = require('moment');
var settings    = require(__dirname + '/../config/settings.js');
var jwt         = require('jsonwebtoken');
var models      = require(__dirname + '/../models');

var request = require('request');
var Promise = require('bluebird');
var path        = require('path');
var crypto      = require('crypto');
var Hash = require(__dirname + '/../modules/hashes.js');
var Hashes = Hash.init();
var Scheduler = require(__dirname + '/../modules/scheduler.js');
var ApiKey  = require(__dirname + '/../classes/api_key.js');

var validator = require('validator');
var control    = require(__dirname + '/../modules/site_control.js');
var User = require(__dirname + '/../classes/user.js');
var Contact = require(__dirname + '/../classes/contact.js');


const Property = require('../classes/property');

var e  = require(__dirname + '/../modules/error_handler.js');
var utils    = require(__dirname + '/../modules/utils.js');
var Company = require(__dirname + '/../classes/company.js');
var TenantPaymentsApplication = require(__dirname + '/../classes/tenant_payments_applications.js');
var eventEmitter = require(__dirname + '/../events/index.js');
const joiValidator = require('express-joi-validation')({
    passError: true
});

var Schema = require(__dirname + '/../validation/index.js');
var db = require(__dirname + '/../modules/db_handler.js');


module.exports = function(app) { 

    router.get('/logged-in-user', control.getAccountInfo, async (req, res, next) => {

        try {
            var connection = await res.locals.connection;
            const token = req.headers['authorization'];
            if(!token) e.th(401, "You are not logged in");
            const decoded =  await User.decodeToken(token);
            let user = Hash.clarify(decoded.contact, res.locals.company_id);
			      let company = Hash.clarify(decoded.active, res.locals.company_id);

            if(connection.meta) connection.meta.is_hb_user = true;

            let contact = new Contact({id: user.id});
            let decoded_properties = decoded.properties?.length ? Hashes.decode(decoded.properties) : [];
            let decoded_gps_selection = decoded.gps_selection?.length ? Hashes.decode(decoded.gps_selection) : [];
            let ipp_feature = connection.meta?.ipp_feature;

            await contact.find(connection);
            await contact.getRole(connection, company.id);
            await contact.getPermissions(connection, company.id);
            res.fns.addStep('beforeGettingRolePermission');
            await contact.getPropertiesByRoles(connection, company.id);
            let data = {ipp_feature, company_id: company.id, cid: res.locals.company_id, properties: decoded_properties, gps_selection: decoded_gps_selection}
            await contact.getPermissionProperties(connection, data);
            res.fns.addStep('afterGettingRolePermission');
            
            contact.RolesProperties?.forEach(rp =>{
                rp.Properties = rp.Properties?.filter(p_id => {
                    if(ipp_feature && decoded_gps_selection?.length)
                       return decoded_gps_selection?.includes(p_id)
                    else
                        return decoded_properties.includes(p_id)
                } )
            })

            decoded.contact.Roles =  Hash.obscure(contact.Roles, req);
            
            contact.RolesProperties?.forEach( rp => {
                rp.Properties = rp.Properties?.map(p => Hashes.encode(p, res.locals.company_id))
                rp.NonHbProperties = rp.NonHbProperties?.map(p => Hashes.encode(p, res.locals.company_id))
                
            })

            utils.send_response(res, {
              status: 200,
              data: {
                cid: Hashes.encode(res.locals.company_id),
                contact: decoded.contact,
                active: decoded.active,
                properties: decoded.properties.length ? Hashes.decode(decoded.properties).map(p => Hashes.encode(p, res.locals.company_id)) : [],
                permissions: contact.Permissions.length ? Hash.obscure(contact.Permissions, req): [],
                RolesProperties: contact.RolesProperties.length ? Hash.obscure(contact.RolesProperties, req) : [],
                permission_properties: contact.permission_properties
              }
            })
        } catch (err) {
            console.log(err);
            next(err)
        }
    });

    router.post('/switch-company', [control.hasAccess(['admin'])], async (req, res, next) => {

        try {

            const company = res.locals.contact.Companies.find(c => c.name === req.body.company);
            if(!company) e.th(403, "Access Denied");

            const signed = {
                contact: Hash.obscure(res.locals.contact, req),
                active:  Hash.obscure(company, req)
            }

            const token = jwt.sign(signed, settings.security.key, {
                expiresIn: 60 * 60 * 24 // expires in 24 hours
            });

            utils.send_response(res, {
              status: 200,
              data: {
                r: settings.config.protocol + '://' + company.subdomain + '.' + settings.config.domain +  '/switch?t=' + token
              }
            });

        } catch(err){
            next(err);
        }

    });

    router.post('/login', [joiValidator.body( Schema.login), control.getAccountInfo],  async (req, res, next) => {

        try {
            var connection = res.locals.connection;
            const username = req.body.username;
            const password = req.body.password;

            let company = new Company({subdomain: res.locals.subdomain})

            await company.findBySubdomain(connection);

            // Should login and return a contact
            let user = new User({email: username});

            let contact = await user.login(connection, password, company, req.originalUrl, req.company_id, res);

            let ipp_feature = connection.meta?.ipp_feature

            if(!contact.company_id) contact.company_id = company.id;
            let primary_properties = await contact.getPrimaryRoleProperties(connection);

            let properties = contact.Properties.map(p => p.id)
            let token;
            if(ipp_feature)
                token = User.generateToken(company, contact, properties, res.locals.company_id, null, primary_properties);
            else
                token = User.generateToken(company, contact, properties, res.locals.company_id);
            
            utils.send_response(res, {
                status: 200,
                data: {
                  contact: Hash.obscure(contact, req),
                  token: token,
                  cid: Hashes.encode(res.locals.company_id)
                }
            });

            // eventEmitter.emit('user_logged_in', { contact, company , locals: res.locals});

        } catch(err) {
            next(err);
        }

      //  await utils.closeConnection(pool, connection)

    });

    router.post('/generate-token', [Hash.unHash], async (req,res, next) => {
        try {
            let appId = req.body.appId
            const token = req.headers['authorization'];
            const decoded =  await User.decodeToken(token);
            let properties = Hashes.decode(decoded.properties)
            let contact = Hash.clarify(decoded.contact);
            let company = Hash.clarify(decoded.active);

            const platformAppToken = User.generateToken(company, contact, properties, decoded.cid, appId);
            utils.send_response(res, {
                status: 200,
                data: {
                    token: platformAppToken
              }
                
            });
        } catch (err) {
            next(err)
        }
    })

    router.get('/logout', (req, res) => {
        utils.send_response(res, {
            status: 200
        });
    });

    router.post('/reset-password/:encrypted', [control.getAccountInfo, joiValidator.body( Schema.resetPasswordConfirm)],  async (req, res, next) => {
        var connection = res.locals.connection;
        try {
            const body = req.body;
            const params = req.params;
            let company = await models.Company.findBySubdomain(connection, res.locals.subdomain);
            const decipher = crypto.createDecipher(settings.security.algorithm, settings.security.key);
            const decrypted = JSON.parse(decipher.update(params.encrypted, 'hex', 'utf8') + decipher.final('utf8'));
            let user = new User();

            if(decrypted.fn != 'setup password') {
                await user.resetPassword(connection, decrypted.contact_id, body.password, body.password2, company)
            } else {
                await user.setUpPassword(connection, decrypted.contact_id, body.username, body.password, body.password2, company)
            }

            utils.send_response(res, {
                status: 200,
                msg:  "You're password has been saved, you may now login."
            });

            if(decrypted.fn != 'setup password') {
                eventEmitter.emit('user_reset_password', {  contact: user.Contact, company, cid: res.locals.company_id , locals: res.locals});
            } else {
                eventEmitter.emit('user_setup_password', { contact: user.Contact, company, cid: res.locals.company_id , locals: res.locals});
            }

        } catch(err) {
            next(err);
        }

    });
      
    router.post('/register', [control.getAccountInfo,joiValidator.body( Schema.register) ],  async (req, res, next) => {

        var connection = res.locals.connection;

        try {
            const email = req.body.email;
            let company = await models.Company.findBySubdomain(connection, res.locals.subdomain);
            let contact = new Contact({email: email});

            try{
                await contact.findTenantByEmail(connection, company.id);
            } catch(err){
              console.log(err, "err")
                // Not found - lets search if its an admin
            }

            if(!contact.id){
                try{
                    await contact.findAdminByEmail(connection, company.id);
                } catch(err){
                    // not found
                }
            }

            if(!contact.id) e.th(404, "Email address not found. An administrator must have entered you into our system before you can register. Please contact an adminstrator to confirm your email address");

            if(contact.user_id){
                e.th(409, "This email address has already been registered. If you have forgotten your password, please use the forgot password link");
            }

            //TODO: Decide whether to move to pub/sub
           await contact.sendWelcomeEmail(connection, company.id, 'newLease', settings.config.defaultFromEmail);

            utils.send_response(res, {
                status: 200,
                msg: "An email has been sent to the registered email address."
            });


            eventEmitter.emit('user_initiate_registration', { contact, company, cid: res.locals.company_id , locals: res.locals});

        } catch(err) {
            next(err);
        }



    });

    router.post('/reset-password', [control.getAccountInfo,joiValidator.body( Schema.resetPassword) ], async (req, res, next) => {

        var connection = res.locals.connection;

        try {
            const email = req.body.email;

            let company = await models.Company.findBySubdomain(connection, res.locals.subdomain);

            // Email is username.. doesnt need to be an email
            let user = new User({email:email});

            await user.find(connection, company.id);
            await user.findContact(connection, company.id);
            await user.sendForgetPasswordEmail(connection,company)

            // await new Promise((resolve, reject) => {
            //     Scheduler.addJobs([{
            //         category: 'forgotPassword',
            //         data: {
            //             id: user.Contact.id,
            //             action: 'email',
            //             label: 'forgotPassword',
            //             domain: company.subdomain
            //         }
            //     }], (err) => {
            //         if (err) e.th(500, err);

            //         return resolve();

            //     });
            // });

            utils.send_response(res, {
                status: 200,
                msg: "Please check your email for further instructions on resetting your password"
            });



            eventEmitter.emit('user_initiated_password_reset', { contact: user.Contact, company, cid: res.locals.company_id , locals: res.locals});
        } catch(err) {
            next(err);
        }



    });

    router.post('/forgot-username', [control.getAccountInfo,joiValidator.body( Schema.findUsernames) ], async (req, res, next) => {

        var connection = res.locals.connection;

        try {
            const email = req.body.email;

            let company = await models.Company.findBySubdomain(connection, res.locals.subdomain);

            let user_data = await User.findUserByEmailAtCompany(connection, email, company.id);

            if(user_data == null) e.th(404, "User not found with this email.");

            let user = new User({ id: user_data.id });
            await user.find(connection);
            await user.findContact(connection, company.id);
            await user.sendForgetUsernameEmail(connection, company, user_data)

            utils.send_response(res, {
                status: 200,
                msg: "Please check your email for further instructions."
            });



            eventEmitter.emit('user_find_usernames', { company, email: email, cid: res.locals.company_id, locals: res.locals});
        } catch(err) {
            next(err);
        }



    });

    router.get('/reset-password/:hash', control.getAccountInfo, (req, res) => {

        try{
            var hash = req.params.hash;
            var decipher = crypto.createDecipher(settings.security.algorithm, settings.security.key);
            var decrypted = JSON.parse(decipher.update(hash, 'hex', 'utf8') + decipher.final('utf8'));
	        var sent = moment(decrypted.requested);
	        var ms = moment().diff(moment(sent));
            if( ms > 1000 * 2 * 60 * 60 * 24 * 2) {
                e.th(403, 'You followed an invalid or expired link. Please try again.');

            }

            if(decrypted.fn != 'reset password')
                e.th(403, 'You followed an invalid or expired link. Please try again.');

            utils.send_response(res, {
                status: 200
            });

        } catch(err){
            e.th(403, 'You followed an invalid or expired link. Please try again.');
        }


    });

    router.get('/set-password/:hash', control.getAccountInfo, async (req, res, next) => {

        var connection = res.locals.connection;

        try{
            const hash = req.params.hash;
            const subdomain = res.locals.subdomain;

            let decipher = crypto.createDecipher(settings.security.algorithm, settings.security.key);
            const decrypted = JSON.parse(decipher.update(hash, 'hex', 'utf8') + decipher.final('utf8'));


            var sent = moment(decrypted.requested);
            var ms = moment().diff(moment(sent));
            if( ms > 1000 * 2 * 60 * 60 * 24 * 2) e.th(403, 'You followed an invalid or expired link. Please try again.');

            if(decrypted.fn != 'setup password') e.th(403, 'You followed an invalid or expired link. Please try again.');

            let company = await models.Company.findBySubdomain(connection, subdomain);
            let contact = new Contact({id: decrypted.contact_id});
            await contact.find(connection);

            utils.send_response(res, {
                status: 200,
                data: {
                    hash: hash,
                    contact: Hash.obscure(contact, req)
                }
            });

        } catch(err){
            next(err)
        }



    });

    router.post('/email-sent', async (req, res, next) => {

        var connection = res.locals.connection;

        try{

            if(typeof req.body.mandrill_events == 'undefined') throw "Not found";


            const details = JSON.parse(req.body.mandrill_events);

            details.map(async d => {
                const email = await models.Email.findByReferenceId(connection, d._id)

                if(!email) return;
                switch(d.event){
                    case 'send':
                        email.status = d.msg.state;
                        email.sent = moment.unix(d.msg.ts).utc().format('YYYY-MM-DD HH:mm:ss');
                        break;
                    case 'open':
                        email.opened = moment.unix(d.msg.ts).utc().format('YYYY-MM-DD HH:mm:ss');
                        email.ip = d.ip;
                        email.user_agent = d.user_agent;
                        email.user_agent_details = JSON.stringify(d.user_agent_parsed);
                        email.location = JSON.stringify(d.location);
                        break;
                    case 'hard_bounce':
                    case 'soft_bounce':
                        email.status = d.msg.state;
                        email.reject_reason = d.msg.bounce_description;
                        break;
                    case 'click':
                        email.clicked = 1;
                        email.ip = d.ip;
                        break;
                    case 'spam':
                        email.reject_reason = 'Marked spam';
                        break;
                    case 'reject':
                        email.status = d.msg.state;
                        break;
                }

                await models.Email.save(connection, email, email.id);

            });

            res.send('ok');

        } catch(err){
            res.send('ok');
        }



        // if message but no email, add user email and add to message
        // if email but no message, add as new message on account, and open a ticket

    });

    router.get('/tenant-payments-notification',  async (req, res, next) => {
        try {
            let query = req.query;
            if (query.NotificationEvent === "UserStatusChange" || query.NotificationEvent === "UserSignup") {
                //             var connection = res.locals.connection;
                var connection = await db.exchangeForWriteAccess(res.locals.connection);
                
                res.locals.connection = connection;
                let application = new TenantPaymentsApplication({ account_number: query.AccountNumber });
                await application.find(connection);

                await application.update(connection, query); 
                   
            }
        } catch (err) {
            console.log("--------err: ", err);
            next(err);
        } finally{
            utils.send_response(res, {
                status: 200,
                data: {}
            });
        }
    });


    router.post('/tenant-payments-ach-notification', async (req, res, next) => {
        try {
            let body = req.body;
        
            var connection = res.locals.connection;
            
            let application = new TenantPaymentsApplication({account_number: body.credentials.website});
            await application.find(connection);
            
            await application.updateACH(connection, body.credentials); 
           
            utils.send_response(res, {
                status: 200,
                data: {}
            });
        } catch(err){
            next(err)
        }
    })


    /* List companies */
    router.get('/companies', [control.hasAccess(['admin', 'api'])], async (req, res, next) => {
        var connection = res.locals.connection;
        try {
          let companies = await db.getAllCompanies();
          if (companies.length) {
            companies.sort((a, b) => (a.company_id < b.company_id) ? 1 : -1);
          } else {
            companies = [{
              company_id: 0
            }]
          }

        for(let company = 0; company < companies.length; company++ ){
            companies[company].api_keys = await models.Api.findKeys(connection, companies[company]?.hb_company_id);
        }
          utils.send_response(res, {
            status: 200,
            data: companies
          });
        } catch (err) {
          console.log(err)
        }
      });

    /* Endpoint to create companies */
    router.post('/companies', [control.hasAccess(['admin', 'api'])], joiValidator.body(Schema.createCompany), async (req, res, next) => {

        var connection = res.locals.connection;
        try {
            await connection.beginTransactionAsync();
            let dynamoCompanyMapping;
            try {
                /* Check the domain exist in dynamo db */
                dynamoCompanyMapping = await db.getMappingBySubdomain(req.body.subdomain);
            } catch (err) {
                console.log(err)
            }
            if (dynamoCompanyMapping) {
                e.th(409, "A company with this subdomain already exists in Dynamo DB");
            }

            let company = new Company(req.body);
            /* Is company exist with same subdomain in hummingbird database */
            let duplicateCompany = await models.Company.findBySubdomain(connection, req.body.subdomain);
            if (duplicateCompany) e.th(409, 'A company with this subdomain already exists in Hummingbird database. Please choose a different subdomain.');
        

            /* Get all companies from dynamo database */
            let dynamoDbEntries = await db.getAllCompanies();
            let latestDynamoHbCompanyId = 0;
            let latestDynamoCompanyId = 0;
            dynamoDbEntries.forEach(companies => {
                latestDynamoHbCompanyId = latestDynamoHbCompanyId < companies?.hb_company_id ? companies?.hb_company_id : latestDynamoHbCompanyId;
                latestDynamoCompanyId = latestDynamoCompanyId < companies?.company_id ? companies?.company_id : latestDynamoCompanyId;
            })

            let latestHbCompanyId = await models.Company.findLatestCompanyId(connection);
            let latestCompanyId = Math.max(
                latestDynamoHbCompanyId, 
                latestDynamoCompanyId, 
                latestHbCompanyId
            );
            let newCompanyId = latestCompanyId + 1;

            let data = {
                ...req.body,
                ...{
                    company_id: newCompanyId,
                    hashed_company_id: Hashes.encode(newCompanyId),
                    hb_company_id: newCompanyId
                }
            }
            company.id = newCompanyId;
        
            /* Save company in hummingbird database */
            await company.onboardCompany(connection, res.locals.contact);
        
            let apiKey = new ApiKey();
            let apiDetails = {
                name: "API Key",
                description: "API Key"
            };
            /* Create API key for the newly created company */
            await apiKey.createApiKey(connection, apiDetails, company.id);
        
            company.apikey = apiKey;

            /* Save company in dynamo database */
            await db.saveCompany(data);
        
            /* Get hash id of the newly created company */
            let createdCompany = await db.getMappingBySubdomain(company.subdomain);
            company.hashed_company = createdCompany?.hashed_company_id;
        
            await connection.commitAsync();
            utils.send_response(res, {
                status: 200,
                data: Hash.obscure(company, req)
            });
        
        } catch (err) {
            await connection.rollbackAsync();
            next(err);
        }
      });
    
    // router.get('/accounting-export', async(req,res,next) => {
    //
    //   var connection = res.locals.connection;
    //   let transactions = {}
    //   let output = '';
    //   try {
    //
    //     let payments_sql = "select *, " +
    //       " (select amount - (select SUM(IFNULL(amount,0)) from invoices_payments where payment_id = payments.id and date = payments.date)) as unapplied " +
    //       " from payments where status = 1 and property_id = 69 and date >= '2020-01-01' and date <= '2020-01-31' HAVING unapplied > 0 ";
    //     let invoices_payment_sql = "select *," +
    //       " (select IFNULL(total_tax, 0) from invoices where id = invoices_payments.invoice_id) as invoice_tax, " +
    //       " (select IFNULL(subtotal, 0) + IFNULL(total_tax, 0) - IFNULL(total_discounts, 0) from invoices where id = invoices_payments.invoice_id) as invoice_total, " +
    //       " (select SUM(amount) from invoices_payments ip where ip.invoice_id = invoices_payments.invoice_id and date <= invoices_payments.date and id < invoices_payments.id) as already_applied, " +
    //       " (select number from invoices where id = invoices_payments.invoice_id) as invoice_number, " +
    //       " (select method from payments where id = invoices_payments.payment_id) as payment_type " +
    //       " from invoices_payments where payment_id in (select id from payments where property_id = 69 and status = 1 and  date >= '2020-01-01' and date <= '2020-01-31' )";
    //     let invoicelines_sql = "select *, " +
    //       " (select name from products where id = invoice_lines.product_id) as product_name,  " +
    //       " (select default_type from products where id = invoice_lines.product_id) as product_type,  " +
    //       " (select number from invoices where id = invoice_lines.invoice_id) as invoice_number " +
    //       " from invoice_lines where invoice_id in (select id from invoices where lease_id in (select id from leases where unit_id in (select id from units where property_id = 69))  and status = 1 and date >= '2020-01-01' and date <= '2020-01-31' )";
    //     let void_sql  =  "select * from invoices where status = 0 and  date >= '2020-01-01' and date <= '2020-01-31'";
    //
    //
    //
    //
    //
    //     let payments_results  =  await connection.queryAsync(payments_sql);
    //     console.log("payment_results", payments_results.length);
    //     let invoices_payment_results  =  await connection.queryAsync(invoices_payment_sql);
    //     console.log("invoices_payment_results", invoices_payment_results.length);
    //     let invoicelines_results  =  await connection.queryAsync(invoicelines_sql);
    //     console.log("invoicelines_results", invoicelines_results.length);
    //     let void_results  =  await connection.queryAsync(void_sql);
    //     console.log("void_results", void_results.length);
    //     // console.log(payment_results.length);
    //     // console.log(invoices_payment_results.length);
    //
    //
    //     for(let i = 0; i < payments_results.length; i++){
    //       let payment = payments_results[i];
    //       transactions[payment.date] = transactions[payment.date] || {};
    //       transactions[payment.date].payments = transactions[payment.date].payments || {};
    //       transactions[payment.date].payments[payment.id] = {
    //         id: payment.id,
    //         trans_type: "PAYMENT",
    //         amount: payment.unapplied,
    //         date: payment.date,
    //         number: payment.number,
    //         name: "",
    //         type: "payment.method"
    //       };
    //     }
    //
    //
    //     // for(let i = 0; i < invoices_payment_results.length; i++){
    //     //   let ip = invoices_payment_results[i];
    //     //
    //     //   console.log("ip", ip);
    //     //
    //     //   let il_results  =  await connection.queryAsync("select *, (select name from products where id = (invoice_lines.product_id)) from invoice_lines where invoice_id = " + connection.escape(ip.invoice_id));
    //     //
    //     //   // if invoice amount is same as applied amount - easy to apply, apply everything
    //     //
    //     //   if(ip.amount === ip.invoice_total){
    //     //     for(let j=0; j < il_results.length; j++){
    //     //       let il = il_results[i];
    //     //       transactions[ip.date] = transactions[ip.date] || {};
    //     //       transactions[ip.date].payments = transactions[ip.date].payments || {};
    //     //       transactions[ip.date].payments[ip.id] = {
    //     //         trans_type: "PAYMENT",
    //     //         id: il.id,
    //     //         amount: Math.round((il.cost * il.qty - il.total_discounts) * 1e2) /1e2,
    //     //         date: ip.date,
    //     //         number: ip.invoice_number,
    //     //         name: il.product_name,
    //     //         type: ip.product_type,
    //     //       };
    //     //       console.log({
    //     //         trans_type: "PAYMENT",
    //     //         id: il.id,
    //     //         amount: Math.round((il.cost * il.qty - il.total_discounts) * 1e2) /1e2,
    //     //         date: ip.date,
    //     //         number: ip.invoice_number,
    //     //         name: il.product_name,
    //     //         type: ip.product_type,
    //     //       });
    //     //     }
    //     //     if(ip.invoice_tax > 0){
    //     //       transactions[ip.date] = transactions[ip.date] || {};
    //     //       transactions[ip.date].payments = transactions[ip.date].payments || {};
    //     //       transactions[ip.date].payments[ip.id] = {
    //     //         trans_type: "PAYMENT",
    //     //         id: "",
    //     //         amount: ip.invoice_tax,
    //     //         date: ip.date,
    //     //         number: ip.invoice_number,
    //     //         name: "Sales Tax",
    //     //         type: "Tax",
    //     //       };
    //     //
    //     //
    //     //       console.log({
    //     //         trans_type: "PAYMENT",
    //     //         id: "",
    //     //         amount: ip.invoice_tax,
    //     //         date: ip.date,
    //     //         number: ip.invoice_number,
    //     //         name: "Sales Tax",
    //     //         type: "Tax",
    //     //       });
    //     //
    //     //     }
    //     //   } else {
    //     //
    //     //     console.log("This is a hard one");
    //     //
    //     //
    //     //   }
    //     //
    //     //
    //     //
    //     //
    //     // }
    //
    //
    //     for(let i = 0; i < invoicelines_results.length; i++){
    //       let il = invoicelines_results[i];
    //       transactions[il.date] = transactions[il.date] || {};
    //       transactions[il.date].payments = transactions[il.date].payments || {};
    //       transactions[il.date].payments[il.id] = {
    //         trans_type: "CHARGE",
    //         id: il.id,
    //         amount: Math.round(il.cost * il.qty * 1e2 ) / 1e2,
    //         date: il.date,
    //         number: il.invoice_number,
    //         name: il.product_name,
    //         type: il.product_type
    //       };
    //     }
    //
    //
    //
    //     for(let i = 0; i < void_results.length; i++){
    //       let void_item = void_results[i];
    //       transactions[void_item.date] = transactions[void_item.date] || {};
    //       transactions[void_item.date].payments = transactions[void_item.date].payments || {};
    //       transactions[void_item.date].payments[void_item.id] = {
    //         trans_type: "VOID",
    //         id: void_item.id,
    //         amount: void_item.subtotal + void_item.total_tax - void_item.total_discounts,
    //         date: void_item.date,
    //         number: void_item.number,
    //         name: "",
    //         type: ""
    //       };
    //     }
    //
    //
    //     //
    //     // for(let i = 0; i < invoices_payment_results.length; i++){
    //     //
    //     //   let inv_pay = invoices_payment_results[i];
    //     //
    //     //   let all_applications = await connection.queryAsync("select * from invoices_payments where payment_id = " + inv_pay.payment_id + " order by date asc, id asc ");
    //     //   let all_lines = await connection.queryAsync("select * from invoice_lines where invoice_id = " + inv_pay.invoice_id);
    //     //
    //     //   console.log("all_applications", all_applications);
    //     //   console.log("all_lines", all_lines);
    //     //
    //     //   transactions[inv_pay.date] = transactions[inv_pay.date] || {};
    //     //   transactions[inv_pay.date].application = transactions[inv_pay.date].application || {};
    //     //   transactions[inv_pay.date].application[inv_pay.id] = inv_pay.amount;
    //     // }
    //
    //
    //
    //
    //   console.log("transactions", JSON.stringify(transactions, null, 2));
    //
    //
    //     utils.send_response(res, {status: 200, body: transactions});
    //
    //   } catch(err){
    //     console.log("Err", err);
    //     next(err)
    //   }
    //
    //
    // })


    // router.get('/invoice-breakdown-allocation', async(req, res, next) => {
    //
    //     //req.clearTimeout(); // clear request timeout
    //     req.setTimeout(300000); //set a 5mins timeout for this request
    //
    //     try{
    //         let query = Hash.clarify(req.query);
    //         var connection = res.locals.connection;
    //         await Invoice.setInvoiceBreakdownAllocation(connection, query.company_id, query.property_id);
    //
		// 	utils.send_response(res, {
		// 		status: 200
		// 	});
    //
    //
		// } catch(err) {
		// 	next(err);
		// }
    //
    //
    // });


    return router;

};

const ENUMS = require(__dirname + '/../modules/enums.js');
var Settings = require(__dirname + '/../classes/settings.js');
