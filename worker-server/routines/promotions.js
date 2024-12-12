"use strict";

var db = require(__dirname + '/../modules/db_handler.js');

var PromotionsRoutine = {

	async runPromotionsRoutine(data) {

		try {
			let { promotion_id, property_id, cid, job } = data;
			let connection = await db.getConnectionByType('write', cid);  // change it to write
			await PromotionEvent.updateUnitsAssociatedPromotions(connection, null, { property_id, promotion_id, job });
		} catch (err) {
			logError(data, err, 'runPromotionsRoutine');
		}

		await db.closeConnection(connection);
		return data;
	}
}



module.exports = {
	runPromotionsRoutine: function (data) {
		return PromotionsRoutine.runPromotionsRoutine(data);
	}
};

const PromotionEvent = require(__dirname + '/../events/promotions');