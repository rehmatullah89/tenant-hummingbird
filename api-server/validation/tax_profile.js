var BaseJoi      = require('joi');
var Extension = require('joi-date-extensions');
var Joi = BaseJoi.extend(Extension);

module.exports = {
  TaxProfile: {
    tax_rate: Joi.number().required(),
    name: Joi.string().max(45).required(),
    state: Joi.string().max(45).required(),
    account_id: Joi.string().max(45).allow(null, "")
  }
}
