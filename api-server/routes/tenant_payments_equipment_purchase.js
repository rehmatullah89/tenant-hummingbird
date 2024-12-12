
var express = require('express');
var router = express.Router();
var Hash = require(__dirname + '/../modules/hashes.js');
var control    = require(__dirname + '/../modules/site_control.js');
var Property  = require(__dirname + '/../classes/property.js');
const TenantPaymentsApplication = require('../classes/tenant_payments_applications'); 
const Company = require('../classes/company');
var utils    = require(__dirname + '/../modules/utils.js');

const joiValidator = require('express-joi-validation')({
    passError: true
});

var e  = require(__dirname + '/../modules/error_handler.js');

module.exports = function(app) {

  router.put('/:application_id', [control.hasAccess(['admin']), control.hasPermission('manage_payment_gateways'), Hash.unHash], async (req, res, next) => {
    var connection = res.locals.connection;

    try {
      let body = req.body;
      let company = res.locals.active;
      let contact = res.locals.contact;

      let params = req.params;


      let application = new TenantPaymentsApplication({
        id: params.application_id
      });
      await application.find(connection);

      let property = new Property({ id: application.property_id });
      await property.find(connection);
      await property.verifyAccess({connection, company_id: company.id, properties: res.locals.properties, contact_id: contact.id, permissions: ['manage_payment_gateways']});

      let response = await application.orderProPayDevice(body, property.name, property.phone);

      utils.send_response(res, {
        status: 200,
        data: {
          status: response.status.status_code
        }
      });

    } catch (err) {
      next(err);
    }
  });


  return router;
}
