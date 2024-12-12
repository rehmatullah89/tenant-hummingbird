var BaseJoi      = require('joi');
const Extension = require('joi-date-extensions');
const Joi = BaseJoi.extend(Extension);

module.exports = {
	updateUpload: Joi.object().keys({
        private: Joi.boolean().required().truthy(1, "1").falsy(0, "0")
	}),
}
