'use strict';
var db = require(__dirname + '/../modules/db_handler.js');
// var pool = require(__dirname + '/../modules/db.js');
var moment  = require('moment');
var Scheduler = require(__dirname + '/../modules/scheduler.js');
var utils    = require(__dirname + '/../modules/utils.js');
var Promotion  = require('../classes/promotion.js');
var Property  = require('../classes/property.js');
const queue = require('../modules/queue');



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
		}
		await db.closeConnection(connection);
	},


	async updateUnitsAssociatedPromotions(connection, units, { property_id = '', promotion_id = '', job = null } = {}) {
		try {			
			let properties = await Property.filteredPropertiesFromUnits(connection, units, property_id);
			for (let prop of properties) {
				let property = new Property({ id: prop.property_id });
				await property.findPropertyPromotions(connection, promotion_id);
				let promosLength = property.Promotions.length;
				for (let index = 0; index < promosLength; index++) {
					const promo = property.Promotions[index];
					let promotion = new Promotion({ id: promo.promotion_id });
					await promotion.find(connection);
					await promotion.findPromoRulesByPromotionId(connection);
					await promotion.modifyAffectedUnits(connection, prop.units);
					if(job) {
						await queue.updateProgress(job, { total: promosLength, done: index + 1 })
					}
				}
			}
		} catch (err) {
			console.log(err);
			let payload = { units }
			if(job) {
				payload = {
					...payload,
					property_id: property_id || '',
					promotion_id: promotion_id || '',
					routine: 'promotion_cache_routine'
				}
			}
			utils.sendEventLogs({
                eventName: ENUMS.LOGGING.UPDATE_PROMOTION_UNITS,
                data: payload,
                error: err
            });
		}
	},



}

const ENUMS = require(__dirname + '/../modules/enums.js');