var BaseJoi      = require('joi');
const Extension = require('joi-date-extensions');
const Joi = BaseJoi.extend(Extension);

module.exports = {
  createProductCategory: Joi.object().keys({
    name: Joi.string().required(),
    product_ids: Joi.array().items(Joi.string().length(10))
  })
}

