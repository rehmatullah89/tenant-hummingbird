'use strict';
var db = require(__dirname + '/../modules/db_handler.js');
// var pool = require(__dirname + '/../modules/db.js');
var moment  = require('moment');
var Scheduler = require(__dirname + '/../modules/scheduler.js');
var utils    = require(__dirname + '/../modules/utils.js');
var Promotion  = require('../classes/promotion.js');
var Property  = require('../classes/property.js');



module.exports = {

	/*
	 * Gets the rules for a given promotion, and applies them to units
	 * Expects: Promotion ID
	 *
	 */

	async updateUnits(promotion_id, company_id){
    var connection = await db.getConnectionByType('write', null, company_id)
		try {
			let promotion = new Promotion({id: promotion_id});
			await promotion.find(connection);
			await promotion.findPromoRulesByPromotionId(connection)
			await promotion.getPromotionUnits(connection);
			await promotion.updateAffectedUnits(connection);
		} catch (err) {
			console.log(err);
			utils.sendEventLogs({
                eventName: ENUMS.LOGGING.UPDATE_PROMOTION_UNITS,
                data: {promotion_id, company_id},
                error: err
            });
		}
		await db.closeConnection(connection);
	},


	async updateUnitsAssociatedPromotions(cid, units, company_id) {
		var connection = await db.getConnectionByType('write', null, cid);
		try {			
			let properties = await Property.filteredPropertiesFromUnits(connection, units);
			for (let prop of properties) {
				let property = new Property({ id: prop.property_id });
				await property.findPropertyPromotions(connection);
				for (const promo of property.Promotions) {
					let promotion = new Promotion({ id: promo.promotion_id });
					await promotion.find(connection);
					await promotion.findPromoRulesByPromotionId(connection);
					await promotion.modifyAffectedUnits(connection, prop.units);
				}
			}
		} catch (err) {
			console.log(err);
		}
		await db.closeConnection(connection);
	},



}

const ENUMS = require(__dirname + '/../modules/enums.js');