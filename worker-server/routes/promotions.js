var express = require('express');
var router = express.Router();
var control = require(__dirname + '/../modules/site_control.js');
var db = require(__dirname + '/../modules/db_handler.js');
var Scheduler = require(__dirname + '/../modules/scheduler.js');


module.exports = function(app) {

	router.get('/:company_id/promotions', control.hasAccess(), async(req, res, next) => {
		try {
            let { query }  = req;
			let mapping = await db.getMappingByCompanyId(parseInt(req.params.company_id));
			var connection = await db.getConnectionByType('read', mapping.company_id);
			let promotions_list = await Promotion.findByCompanyId(connection, mapping.hb_company_id, { type: 'promotion' });
            res.send({
				status: 200,
				data: {
					promotions_list
				}
			})
		} catch(err){
			next(err);
		}finally {
			await db.closeConnection(connection);
		}
	});

    router.post('/:company_id/promotions', control.hasAccess(), async(req, res, next) => {
		try {
            let { body: { properties, promotion_id }, params: { company_id } }  = req;
			let mapping = await db.getMappingByCompanyId(parseInt(company_id));
			var connection = await db.getConnectionByType('read', parseInt(company_id));
            let promProperties = [];
			let { hb_company_id } = mapping;
            if (properties && properties.length > 0) {
                promProperties = properties;
            } else {
                promProperties = await Property.findByCompanyId(connection, hb_company_id, null);
				promProperties = promProperties.map(item => item.id);
            }

			await Scheduler.applyPromotions(hb_company_id, promotion_id, promProperties)
			res.send({
				status: 200,
				msg: 'Apply promotions started successfully'
			});
		} catch(err){
			next(err);
		}finally {
			await db.closeConnection(connection);
		}

	});
	  
	return router;

};

const Promotion = require('../classes/promotion');
const PromotionEvent = require(__dirname + '/../events/promotions');
var Property      = require(__dirname + '/../classes/property.js');