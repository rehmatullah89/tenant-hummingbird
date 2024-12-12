"use strict";

var models  = require(__dirname + '/../models');
var settings    = require(__dirname + '/../config/settings.js');
var Promise = require('bluebird');
var validator = require('validator')
var moment      = require('moment');
var validation      = require('../modules/validation.js');
var control    = require(__dirname + '/../modules/site_control.js');
var e  = require(__dirname + '/../modules/error_handler.js');
var jwt         = require('jsonwebtoken');



class User {

	constructor(data) {

		data = data || {};
		this.id = data.id;
		this.email = data.email;
		this.password = data.password;
		this.active = data.active;
		this.created_at = data.created_at;
		this.Contact = {};
	}

	validate(){
		var _this = this;

		try {
			if (!_this.email) {
				throw 'Please enter a email address for this user';
			}

			// if (!_this.password) {
			// 	throw 'Please enter a password for this user';
			// }

		} catch(err){
			_this.msg = err.toString();
			return false;
		}

		return true;
	}

	save(connection){
		var _this = this;

		return Promise.resolve().then(function() {
			if (!_this.validate()) {
				return false
			}

			var save = {
				id: _this.id,
				email: _this.email,
				password: _this.password,
				active: _this.active
			};

			return models.User.save(connection, save, _this.id);

		}).then(function(result){
			_this.id = result;

			return;
		}).catch(function(err){
			console.log(_this.msg);
			throw err;
		})
	}

	delete(connection){
		var _this = this;
		return models.User.delete(connection, _this.id)
	}

	login(connection, password, company, requestUrl){
		var _this = this;
		var pass = '';
		if(!this.email) e.th(400, "Invalid email address");

		return _this.find(connection, company.id).then(() => {

			if( requestUrl.startsWith('/v1/login') || requestUrl.startsWith('/v1/authenticate') ){
				//var salt = moment(_this.created_at).add(7,'hours').format('x');
				var salt = moment(_this.created_at).format('x');

				pass = control.hashPassword(password, salt);


			} else if(requestUrl == '/v1/switch'){
				pass = password;
			}
			if(pass !== _this.password) e.th(403, "No user was found with that email address, password combination");

			return true;

		});
	}
	
	find(connection, company_id, contact_id ){

		var _this = this;
		var contact = {};
		return Promise.resolve().then(function() {
			
			if(_this.id){
				return models.User.findById(connection, _this.id)
			} else if (_this.email){
				return models.User.findByEmail(connection, _this.email, company_id, contact_id)
			}
			e.th(500, "No user id or email is set");

		}).then(function(data){

			if(!data){
				_this.message = e.th(404, "User not found");
				return false;
			}

			_this.id = data.id;
			_this.email = data.email;
			_this.password = data.password;
			_this.active = data.active;
			_this.created_at = data.created_at;

			return true;

		})
	}

	saveToLease(connection, lease_id){

	}

	static async decodeToken(token){
		return new Promise((resolve, reject) => {
			jwt.verify(token, settings.security.key, (err, decoded) => {
				if (err || !decoded) reject("You are not logged in");
				resolve(decoded);
			});

		}).catch(err => {
			e.th(401, err);
		})
	}
}



module.exports = User;

var Contact = require(__dirname + '/../classes/contact.js');