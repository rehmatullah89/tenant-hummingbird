"use strict"

var settings    = require(__dirname + '/../config/settings.js');
var moment  = require('moment');

var rp = require('request-promise')

module.exports = {


	slugify: function(text){
		return text.toString().toLowerCase()
			.replace(/\s+/g, '-')           // Replace spaces with -
			.replace(/[^\w\-]+/g, '')       // Remove all non-word chars
			.replace(/\-\-+/g, '-')         // Replace multiple - with single -
			.replace(/^-+/, '')             // Trim - from start of text
			.replace(/-+$/, '');            // Trim - from end of text
	},
	saveTiming(connection, req, locals){
		var trackingData = {
			api_id: locals.api ? locals.api.id: null,
			contact_id: locals.contact ? locals.contact.id: null,
			ip_address: req.headers['x-forwarded-for'] || req.connection.remoteAddress,
			endpoint: req.originalUrl,
			query: JSON.stringify(req.query),
			time:  Date.now() - locals.timing
		}
		var trackingSql = "insert into tracking set ? ";
		return connection.queryAsync(trackingSql, trackingData);
	},
	async closeConnection(pool, connection){
		console.log("Trying to close connection");
		if(pool._freeConnections.indexOf(connection) < 0){
			console.log("INDEX", pool._freeConnections.indexOf(connection));
			if (typeof connection.release === "function") { 
				connection.release();
			}
		}
		return Promise.resolve();

	},
	async sendLogsToGDS(logs, origin, log_level, request_id, trace_id = ''){
	

		var data = {
		  uri: `${settings.get_logging_app_url()}/log`,
		  headers: {
			"x-storageapi-key": settings.get_gds_api_key(),
			"X-storageapi-trace-id": trace_id,
			"X-storageapi-request-id": request_id,
			"X-storageapi-date": moment().format('x'),
		  },
		  method: 'POST',
		  json: true,
		  body: {
			origin: origin,
			component: 'HB_GATE_ACCESS_APP',
			log_level: log_level,
			log: logs
		  }
		}

		console.log('data headers for New Relic', data);
	
		return await rp(data);
	}

};