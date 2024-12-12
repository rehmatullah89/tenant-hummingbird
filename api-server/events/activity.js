'use strict';

// var pool = require(__dirname + '/../modules/db.js');
var db = require(__dirname + '/../modules/db_handler.js');
var moment  = require('moment');
var Activity  = require('../classes/activity.js');
var utils    = require(__dirname + '/../modules/utils.js');


module.exports = { 
  
	record_activity: async (cid, company_id, user_id, api_id, activity_action_id, activity_object_id, object_id, description) => {

	  var connection = await db.getConnectionByType('write', null, cid);
		try {
			var activity = new Activity();
		    if(api_id){
		        await activity.createApi(connection, company_id, api_id,activity_action_id,activity_object_id, object_id, description);
		    } else {
		        await activity.create(connection, company_id, user_id ,activity_action_id,activity_object_id, object_id, description);
		    }
		} catch(err) {
			console.log(err);
		}

		await db.closeConnection(connection)
	}
}
