let express = require('express');
let router = express.Router();
var moment = require('moment');
let control = require(__dirname + '/../modules/site_control.js');
let Hash = require(__dirname + '/../modules/hashes.js');
let Hashes = Hash.init();
let utils = require(__dirname + '/../modules/utils.js');
let TaxProfile = require(__dirname + '/../classes/tax_profile');
let Schema = require(__dirname + '/../validation/tax_profile.js');
const joiValidator = require('express-joi-validation')({
	passError: true
});

var Accounting =  require('../classes/accounting.js');

var eventEmitter = require(__dirname + '/../events/index.js');

module.exports = function (app) {

  router.get('/', [control.hasAccess(['admin']), Hash.unHash], async (req, res, next) => {
    var connection = res.locals.connection;

    try {
      let query = req.query;
      let company = res.locals.active;

      let searchParams = {};
      searchParams.limit = query.limit;
      searchParams.offset = query.offset;

      let taxProfiles = await TaxProfile.getAllByCompany(connection, company.id, searchParams);

      utils.send_response(res, {
        status: 200,
        data: {
          tax_profiles: Hash.obscure(taxProfiles, req)
        }
      });


    } catch(err) {
      next(err);
    }


  });

  router.get('/:tax_profile_id', [control.hasAccess(['admin']), Hash.unHash], async (req, res, next) => {

    var connection = res.locals.connection;

    try {
      let company = res.locals.active;
      let params = req.params;

      let taxProfile = new TaxProfile({ id: params.tax_profile_id });
      await taxProfile.find(connection);
      await taxProfile.verifyAccess(company.id);

      utils.send_response(res, {
        status: 200,
        data: {
          tax_profile: Hash.obscure(taxProfile, req)
        }
      });


    } catch(err) {
      next(err);
    }


  });

  router.post('/', [control.hasAccess(['admin']), joiValidator.body(Schema.TaxProfile), Hash.unHash], async (req, res, next) => {

    var connection = res.locals.connection;

    try {
      await connection.beginTransactionAsync();

      let company = res.locals.active;
      let body = req.body;
      let contact = res.locals.contact;

      let taxProfile = new TaxProfile({ company_id: company.id, created_by: contact.id, ...body});
      await taxProfile.save(connection);

      utils.send_response(res, {
        status: 200,
        data: {
          tax_profile: Hash.obscure(taxProfile, req)
        }
      });

      await connection.commitAsync();
    } catch(err) {
      await connection.rollbackAsync();
      next(err);
    }

  });

  router.put('/:tax_profile_id', [control.hasAccess(['admin']), joiValidator.body(Schema.TaxProfile), Hash.unHash], async (req, res, next) => {

    var connection = res.locals.connection;

    try {
      await connection.beginTransactionAsync();

      let company = res.locals.active;
      let body = req.body;
      let params = req.params;
      let contact = res.locals.contact;

      let taxProfile = new TaxProfile({ id: params.tax_profile_id });
      let data = {...body, modified_by: contact.id, modified_at: moment().format('YYYY-MM-DD HH:mm:ss')}

      await taxProfile.find(connection);
      await taxProfile.verifyAccess(company.id);
      await taxProfile.update(connection, data);

      utils.send_response(res, {
        status: 200,
        data: {
          tax_profile_id: Hashes.encode(taxProfile.id, res.locals.company_id)
        }
      });

      await connection.commitAsync();
    } catch(err) {
      await connection.rollbackAsync();
      next(err);
    }


  });

  router.delete('/:tax_profile_id', [control.hasAccess(['admin']), Hash.unHash], async (req, res, next) => {
    var connection = res.locals.connection;
    try {
      let company = res.locals.active;
      let params = req.params;
      let contact = res.locals.contact

      let taxProfile = new TaxProfile({ id: params.tax_profile_id });
      await taxProfile.find(connection);
      await taxProfile.verifyAccess(company.id);
      await taxProfile.delete(connection, contact);

      utils.send_response(res, {
        status: 200,
        data: {
          tax_profile_id: Hashes.encode(taxProfile.id, res.locals.company_id)
        }
      });



    } catch(err) {
      next(err);
    }


  });

  return router;
}
