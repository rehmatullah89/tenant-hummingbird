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

var validator = require('validator');

var control    = require(__dirname + '/../modules/site_control.js');
var User = require(__dirname + '/../classes/user.js');
var Contact = require(__dirname + '/../classes/contact.js');

var e  = require(__dirname + '/../modules/error_handler.js');

var utils    = require(__dirname + '/../modules/utils.js');

var mask = require('json-mask');
var qs = require('querystring');
var Socket  = require(__dirname + '/../classes/sockets.js');
var Activity = require(__dirname + '/../classes/activity.js');
var Property = require(__dirname + '/../classes/property.js');
var Company = require(__dirname + '/../classes/company.js');
var Setting = require(__dirname + '/../classes/settings.js');
var Invoice = require(__dirname + '/../classes/invoice.js');

var mandrill = require('mandrill-api/mandrill');
var mandrill_client = new mandrill.Mandrill(settings.mandrill_api_key);
var mandrill_content_aysnc =  Promise.promisify(mandrill_client.messages.content)

var eventEmitter = require(__dirname + '/../events/index.js');

var db = require(__dirname + '/../modules/db_handler.js');


const joiValidator = require('express-joi-validation')({
  passError: true
});

var Schema = require(__dirname + '/../validation/index.js');



module.exports = function(app) {

  router.post('/set-properties', [control.hasAccess(['admin']), Hash.unHash], async (req, res, next) => {

    try {

      var connection = res.locals.connection;
      let body = req.body;
      const company = res.locals.active;
      let contact = new Contact({id: res.locals.contact.id});
      let all_properties = res.locals.properties;

      let ipp_feature = connection.meta?.ipp_feature;
      await contact.find(connection);
      await contact.getRole(connection, company.id);
      if(!company) e.th(403, "Access Denied");
      let properties = body.property_ids || [];
      let token;

      // if empty, no filter
      for(let i = 0; i < properties.length; i++){
        let property = new Property({id: properties[i]});
        await property.find(connection);
        property.verifyAccess({company_id: company.id});

        if(!contact.Properties.find(prop => prop.id === property.id)){
          e.th(403, "You do not have access to that property")
        }
      }

      

      if(ipp_feature && properties.length) {
        token = User.generateToken(company, contact, all_properties, res.locals.company_id, null, properties);
      }
      else {
        token = User.generateToken(company, contact,  properties, res.locals.company_id);
      }

      utils.send_response(res, {
        status: 200,
        data:{
          token: token
        }
      });
    } catch(err){
      next(err);
    }
  });

  router.post('/authenticate', [ joiValidator.body( Schema.authenticate), control.hasAccess(['api'] ), Hash.unHash],  async (req, res, next) => {

    try {

      let contact = {};
      let user = {};
      var connection = res.locals.connection;
      var company     = res.locals.active;
      var api     = res.locals.api || {};
      var body = req.body;

      var emptyUserPass = !body.username || !body.password;
      var emptyUnitGateCode = !body.gate_code || !body.property_id || !body.unit_number;

      if(emptyUserPass && emptyUnitGateCode) e.th(400, "Either provide a username and password, or a property_id, gate_code and unit_number");

      if(!emptyUserPass){
        user = new User({email: body.username});
        contact = await user.login(connection, body.password, company, req.originalUrl)
      }

      if(!emptyUnitGateCode){
        user = new User();
        contact = await user.loginWithGateCode(connection, body.gate_code, body.property_id, body.unit_number, company)
      }

      utils.send_response(res, {
        status: 200,
        data: {
          contact_id: Hashes.encode(contact.id, res.locals.company_id)
        }
      });


      eventEmitter.emit('user_authenticated', { api, contact, company, cid: res.locals.company_id, locals: res.locals});

    } catch(err) {
      next(err);
    }

    // await utils.closeConnection(pool, connection)

  });

  router.post('/websocket-test', [control.hasAccess(['admin', 'api']), Hash.unHash], async(req, res, next) => {

    var connection = res.locals.connection;

    try {
      var body = req.body;
      let contact_id = body.contact_id;
      let company_id = res.locals.company_id;
      let contact = new Contact({id: contact_id});
      await contact.find(connection);
      let event = body.event || 'test';
      let socket = new Socket({
        company_id: company_id,
        contact_id: contact_id
      });

      

      await socket.isConnected(contact.id);

      if(!socket.connected){
        e.th(400, "User is not connected");
      }

      await socket.createEvent(event, body.payload || {});

      utils.send_response(res, {status: 200});

    } catch(err){
      next(err)
    }
  });

  // router.get('/accounting-export', async(req,res,next) => {

  //   var connection = res.locals.connection;
  //   let transactions = {}
  //   let output = '';
  //   try {

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




  //     console.log("transactions", JSON.stringify(transactions, null, 2));


  //     utils.send_response(res, {status: 200, body: transactions});

  //   } catch(err){
  //     console.log("Err", err);
  //     next(err)
  //   }

  // })
 
  router.get('/global-settings', async(req,res,next) => {
    var connection = res.locals.connection;
    try{
      let global_settings = await Setting.getGlobalSettings(connection);

      utils.send_response(res, {
        status: 200,
        data: {
          global_settings: global_settings && global_settings.length ? Object.assign({}, ...global_settings.map(i => ({ [i.name]: i.value }))): {},
        }
      });


    } catch(err) {
      next(err);
    }

 
  });

  // router.get('/invoice-breakdown-allocation', async(req, res, next) => {
  //
  //   //req.clearTimeout(); // clear request timeout
  //   req.setTimeout(300000); //set a 5mins timeout for this request
  //
  //   try{
  //     let query = req.query;
  //     var connection = res.locals.connection;
  //     await Invoice.setInvoiceBreakdownAllocation(connection, query.company_id, query.property_id);
  //
  //     utils.send_response(res, {
  //       status: 200
  //     });
  //
  //
  //   } catch(err) {
  //     next(err);
  //   }
  //
  //
  // });


  return router;

};

var Enums = require(__dirname + '/../modules/enums.js');