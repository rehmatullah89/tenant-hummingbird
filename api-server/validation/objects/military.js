var BaseJoi      = require('joi');
const Extension = require('joi-date-extensions');
const Joi = BaseJoi.extend(Extension);

const Phone = require('./phone.js');
const Address = require('./address.js');


 
module.exports = {
    id: Joi.string().length(10).allow('', null),
    address_id: Joi.string().length(10).allow('', null),
    contact_id: Joi.string().length(10).allow('', null),
    commanding_officer_contact_id: Joi.string().length(10).allow('', null),
    active: Joi.number().min(0).max(1).allow('', null),
    branch: Joi.string().allow('', null),
    // first_name: Joi.string().allow('', null),
    // last_name: Joi.string().allow('', null),
    service_member_email: Joi.string().allow('', null),
    service_expiration: Joi.string().allow('', null),
    identification_number: Joi.string().allow('', null),
    // phone: Joi.string().allow('', null),
    // phone_type: Joi.string().allow('', null),
    // country_code: Joi.string().allow('', null),
    rank: Joi.string().allow('', null),
    date_of_birth: Joi.date().format('YYYY-MM-DD').allow('', null),
    unit_name: Joi.string().allow('', null),
    Address: Address,
    Phone: Phone,
    CommandingOfficer:  Joi.object().keys({
        id: Joi.string().length(10).allow('', null),
        first: Joi.string().allow('', null),
        last: Joi.string().allow('', null),
        email: Joi.string().allow('', null),
        Phone: Phone
    }),
};