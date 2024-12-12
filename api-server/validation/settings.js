var BaseJoi      = require('joi');
const Extension = require('joi-date-extensions');
const Joi = BaseJoi.extend(Extension);

module.exports = {
	createApiKey: Joi.object().keys({
		name: Joi.string().required(),
		description: Joi.string().required()
	}),
  createAccount: Joi.object().keys({
    description: Joi.string().required(),
    gl_string: Joi.string().required(),
    category: Joi.string().required(),
    acct_type: Joi.string().required(),
    sub_type: Joi.string().required()
  }),
  updateAccount: Joi.object().keys({
    description: Joi.string().required(),
    gl_string: Joi.string().required()
  }),
  
  // Validation for saving stored contents
  storedContent: Joi.object().keys({
    name: Joi.string().required(),
    note: Joi.string(),
    active: Joi.boolean().truthy(1, "1").falsy("0", 0).allow('', null)
  })

}

