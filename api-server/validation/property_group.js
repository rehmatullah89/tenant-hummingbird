var BaseJoi      = require('joi');
const Extension = require('joi-date-extensions');
const Joi = BaseJoi.extend(Extension);

module.exports = {
  createPropertyGroup: Joi.object().keys({
    name: Joi.string().required(),
    global: Joi.boolean().truthy(1, "1").falsy("0", 0).allow('', null),
    property_ids: Joi.array().items(Joi.string().length(10))
  })
}

