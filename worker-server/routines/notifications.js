var moment      = require('moment');

var jade = require('jade');
var fs = require('fs');

var pool;
var settings = require(__dirname + '/../config/settings.js');

var Hash = require(__dirname + '/../modules/hashes.js');
var Hashes = Hash.init();

var models      = require(__dirname + '/../models/index.js');
var Activity   = require(__dirname + '/../classes/activity.js');
var Contact   = require(__dirname + '/../classes/contact.js');

var Promise = require('bluebird');
var Notification      = require(__dirname + '/../classes/notification.js');
var Company      = require(__dirname + '/../classes/company.js');
var Mail = require(__dirname + '/../modules/mail.js');

var NotificationObj = {

	notify: function(data, pool) {
		var notification = {};
		var company = {};
		var connection = {};

		return pool.getConnectionAsync()
			.then(function (conn) {
				connection = conn;
				notification = new Notification({id: data.id});
				return notification.find(connection)
			})
			.then(() => {
				notification.Contact = new Contact({id: notification.contact_id});
				return notification.Contact.find(connection, notification.company_id);
			})
			.then(() => {
				notification.Activity = new Activity({id: notification.activity_id});

				return notification.Activity.find(connection)
					.then(() => notification.Activity.findContact(connection, notification.company_id))
					.then(() => notification.Activity.findActivityObject(connection))
					.then(() => notification.Activity.findActivityAction(connection))
					.then(() => notification.Activity.findObject(connection))
					.then(() => notification.Activity.buildMessage())
					.then(() => notification)
			})
			.then(() => {
				company = new Company({id: notification.company_id});
				return company.find(connection)
			})
			.then(() => notification.sendMessage(connection, company))
			.then(() => {
				connection.release();
				return 
			})

	}
}

module.exports = {
	notify: function(data, pool){
		return NotificationObj.notify(data, pool);
	}


};