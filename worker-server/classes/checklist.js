"use strict";

var models  = require(__dirname + '/../models');
var settings    = require(__dirname + '/../config/settings.js');
var Promise = require('bluebird');
var validator = require('validator')
var moment      = require('moment');
var validation      = require('../modules/validation.js');




class Checklist {

	constructor(data) {

		data = data || {};
		this.id = data.id || null;
		this.company_id = data.company_id || null;
		this.name = data.name || null;
		this.completed = data.completed || 0;

		this.Items = [];
	}

	addItem(data){

		this.Items.push({
			id: data.id || null,
			name: data.name,
			description: data.description,
			document_id: data.document_id || null,
			document_type_id: data.document_type_id || null
		});
		return true;
	}


	validate(){
		var _this = this;

		try {
			if (!_this.company_id) {
				throw 'Invalid company id';
			}

			if (!_this.name) {
				throw 'Please enter a name for this checklist';
			}

			if (!_this.Items.length) {
				throw 'Please enter some items for this checklist';
			}

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
				id: _this.id || null,
				company_id: _this.company_id || null,
				name: _this.name || null
			};

			return models.Checklist.save(connection, save, _this.id)


		}).then(function(result){

			_this.id = result;

			return models.Checklist.deleteItems(connection, _this.id);

		}).then(function(){
			console.log("Items", _this.Items);

			Promise.mapSeries(_this.Items, function(item, i){
				item.sort = i;
				item.checklist_id = _this.id;

				console.log("item item", item)

				return models.Checklist.saveItems(connection, item).then(function(itemResult){
					item.id = itemResult;
					return;
				});
			})

		}).then(function(result){
			return;
		}).catch(function(err){
			console.log(_this.msg);
			throw err;
		})
	}

	delete(connection){
		var _this = this;

		Promise.resolve().then(function(){
			return models.Checklist.delete(connection, _this.id)
		});

	}

	find(connection){

		var _this = this;
		return Promise.resolve().then(function() {

			if (!_this.id) throw 'No Id is set';

			return models.Checklist.findById(connection, _this.id)

		}).then(function(data){

			if(!data){
				_this.message = 'Checklist not found';
				return false;
			}

			_this.id = data.id || null;
			_this.company_id =  data.company_id || null;

			_this.name =  data.name || null;
			_this.description =  data.description || null;
			_this.Items = [];

			return models.Checklist.findItemsByChecklistId(connection, _this.id);
		}).then(function(items){
			console.log(items);
			_this.Items = items;

			return true;

		}).catch(function(err){
			_this.msg = err.toString();
			console.log(err);
			console.log(err.stack);
			throw err;
		})

	}

	saveToLease(connection, lease, user_id, ip_address){

		var _this = this;
		var save = {};
		var document = {};

		return Promise.mapSeries(_this.Items, i => {

			if (!_this.id) throw 'No Id is set';
			save = {
				lease_id: lease.id,
				checklist_item_id: i.id,
				completed: 0,
				sort: i.sort
			};
			
			if(!i.document_id) return models.Checklist.saveItem(connection, save);


			// generate Document Now
			document = new Document({ id: i.document_id });
			return document.find(connection).then(function(){
				document.mergeFields(lease);
				document.setPaths(lease.id);
				return document.generate(connection, lease, user_id, ip_address);
			}).then(function(upload){
				save.upload_id = upload.id;
				return models.Checklist.saveItem(connection, save);
			});
		}).catch(function(err){
			_this.msg = err.toString();
			console.log(err);
			console.log(err.stack);
			throw err;
		})




	}

}



module.exports = Checklist;

var Document      = require('../classes/document.js');
var Product      = require('../classes/product.js');