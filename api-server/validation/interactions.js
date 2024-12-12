
var BaseJoi  = require('joi');
var Extension = require('joi-date-extensions');
var Joi = BaseJoi.extend(Extension);

module.exports = {
    update: Joi.object().keys({
        pinned: Joi.number(),
        read: Joi.number(),
        status: Joi.string(),
        document_batches_deliveries: Joi.string().length(10),
        lease_id: Joi.string().length(10),
        status_type_id: Joi.string().length(10),
        status: Joi.string(),
        resolved: Joi.boolean()
    })
}