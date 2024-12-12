var Promise = require('bluebird');
var apiKey = Promise.promisify(require("crypto").randomBytes);
var models = require(__dirname + '/../models');
var validator = require('validator');
var moment = require('moment');
var e  = require(__dirname + '/../modules/error_handler.js');


class ApiKey {

	constructor(data = {}){

		this.id = data.id;
		this.company_id = data.company_id;
		this.apikey = data.apikey;
		this.name = data.name;
		this.description = data.description;
		this.created = data.created;
		this.status = data.status;

	}


	async find(connection){

		if(!this.id && !this.apikey) e.th(500, "ID and key missing");
		let data;

		if(this.id){
			data = await models.Api.findKeyById(connection, this.id);
		} else {
			data = await models.Api.findKeyByAPIKey(connection, this.apikey);
		}

		if(!data) e.th(404, "Key not found");

		this.id = data.id;
		this.company_id = data.company_id;
		this.apikey = data.apikey;
		this.name = data.name;
		this.description = data.description;
		this.created = data.created;
		this.status = data.status;
		return true;

	}

	async createApiKey(connection, data, company_id){

		let apiKey = await this.generateApiKey();

		this.company_id = company_id;
		this.apikey = apiKey.toString('hex');
		this.name = data.name;
		this.description = data.description || null;
		this.created = moment.utc().format('YYYY-MM-DD HH:mm:ss');
		this.status = 1;

		await this.save(connection);
	}

	validate(){

		if(!this.name) e.th(400, "Missing name");
		if(!this.company_id) e.th(500, "Missing Company ID");

		return true;

	}

	async save(connection){

		this.validate();
		let key = {
			company_id: this.company_id,
			apikey: this.apikey,
			name: this.name,
			description:  this.description,
			created: this.created,
			status:  this.status
		};

		this.id = await models.Api.saveKey(connection, key, this.id);
	}

	async updateKey(connection, data, company_id){

		this.id = data.id;
		await this.find(connection);

		if(this.company_id !== company_id) e.th(403, "You do not have access to this resource");

		this.name = data.name;
		this.description = data.description;

		let key = {
			company_id: this.company_id,
			apikey: this.apikey,
			name: this.name,
			description:  this.description,
			created: this.created,
			status:  this.status
		};

		await models.Api.saveKey(connection, key, this.id);

	}

	async deleteApiKey(connection, apiKey_id, company_id){
		this.id = apiKey_id;

		await this.find(connection);
		if(this.company_id != company_id) e.th(403, "You do not have permission to delete this api key");
		return await models.Api.deleteKey(connection, this.id);

	}

	async generateApiKey(){
		return apiKey(16);
	}

	async saveSettings(connection, settings, company_id){


		if(settings.category && settings.data.qbTaxCode){
			let qb =  new QuickBooks(company_id);
			await qb.init(connection);
			if(!qb.isConfigured) e.th(400, "QuickBooks is not configured. Please refresh the page.");

			let qbTaxRate = await qb.getQbTaxRate(connection, settings.data.qbTaxCode);
			settings.data.taxRate = qbTaxRate;
		}

		if(validator.isEmpty(settings.category)) e.th(400, "Incomplete data");
		if(typeof settings.data == 'undefined') e.th(400, "No data to process");

		await models.Setting.saveSettings(connection, settings.data, settings.category, company_id);

		return settings;

	}

	// async validateApiKey(req, res, next) {
	//
	// 	var apiKey = req.query.key;
	//
	// 	pool.getConnection(function(err, connection) {
	// 		var sql = 'Select * from api_keys where apikey = ' + connection.escape(apiKey);
	// 		if(err){
	// 			res.send(400, 'An error occurred');
	// 		} else {
	// 			connection.query(sql, function (err, result) {
	// 				if (result.length) {
	// 					req.account = result[0];
	// 					connection.release();
	// 					next();
	// 				} else {
	// 					var data = {
	// 						msg:'Missing or incorrect authorization header'
	// 					};
	// 					res.status(400).send(JSON.stringify(data));
	// 				}
	// 			});
	// 		}
	//
	//
	// 	})
	// }




}

module.exports = ApiKey;
