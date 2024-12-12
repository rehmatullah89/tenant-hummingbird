var BaseJoi      = require('joi');
const Extension = require('joi-date-extensions');
const Joi = BaseJoi.extend(Extension);


module.exports = Joi.array().items(Joi.object().keys({
    record_type: Joi.string().allow('', null),
    platform_source: Joi.string().allow('', null),
    platform_device: Joi.string().allow('', null),
    platform_dossier: Joi.string().allow('', null),
    platform_tenant: Joi.string().allow('', null),
    referrer_request_url: Joi.string().allow('', null),
    referrer_url: Joi.string().allow('', null),
    referrer_domain: Joi.string().allow('', null),
    referrer_device: Joi.string().allow('', null),
    referrer_source: Joi.string().allow('', null),
    referrer_medium: Joi.string().allow('', null),
    referrer_keyword: Joi.string().allow('', null),
    referrer_cid: Joi.string().allow('', null),
    referrer_query: Joi.string().allow('', null),
    referrer_gclid: Joi.string().allow('', null),
    referrer_fbclid: Joi.string().allow('', null),
    referrer_timestamp: Joi.string().allow('', null)
  })
);
