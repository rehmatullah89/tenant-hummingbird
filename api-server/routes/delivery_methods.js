var express = require('express');
var router = express.Router();
var control    = require(__dirname + '/../modules/site_control.js');

var Hash = require(__dirname + '/../modules/hashes.js');
var Hashes = Hash.init();
var utils    = require(__dirname + '/../modules/utils.js');

var DeliveryMethod = require(__dirname + '/../classes/delivery_method.js');
module.exports = function(app) {

    router.get('/:delivery_methods_id', [control.hasAccess(['admin', 'api']), Hash.unHash], async (req, res, next) => {
        try {
            let connection = res.locals.connection;
            let params = req.params;

            let deliveryMethod = new DeliveryMethod({id: params.delivery_methods_id})
            await deliveryMethod.find(connection);

            utils.send_response(res, {
				status: 200,
				data: {
					delivery_method: Hash.obscure(deliveryMethod, req)
				}
			});

        } catch (err) {
            next(err);
        }
    });

    return router;
}