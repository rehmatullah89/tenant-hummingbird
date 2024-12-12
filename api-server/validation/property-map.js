var BaseJoi      = require('joi');
const Extension = require('joi-date-extensions');
const Joi = BaseJoi.extend(Extension);

module.exports = {
    getUnits: {
        property_id: Joi.string().required()
    }
}