"use strict"

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
	async closeConnection(pool,connection){
		if(pool._freeConnections.indexOf(connection) < 0){
			connection.release();
		}
		return Promise.resolve();

	}

};