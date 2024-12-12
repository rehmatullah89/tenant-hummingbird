"use strict";
class MenuItem {

	constructor(data) {

		data = data || {};
		this.id = data.id;
		this.company_id = data.companyid;
		this.screen_name = data.screenname;
		this.screen_type = data.screentype;
		this.status = data.status;
		this.created_at = data.createdat;
		this.modified_at = data.modifiedat;
	}

	validate(){
		if (!this.screen_name) e.th(400, 'Invalid screenname')
		if (!this.screen_type) e.th(400, 'Invalid screentype')
		if (!this.status) e.th(400, 'Invalid status')
		return true;
	}

	async create(connection, companyId){
	  
		this.validate();

		if(!this.company_id){
			this.company_id = companyId;
		}

		var menuListing = {
			screen_name: this.screen_name,
			screen_type: this.screen_type,
			status: this.status,
			company_id: this.company_id
		  };

		if(!this.id){
			this.id = await models.Onboarding.findMenuItems(connection,menuListing);
		}

		return await models.Onboarding.saveMenuItems(connection, menuListing, this.id);

	}

	async getOnboardingMenu(connection){

		var response = await models.Onboarding.getAllMenuiItems(connection, this.company_id);
		response.forEach(function(menu){
			delete menu.company_id;
			delete menu.id;
		});

		return response;
	}
}

module.exports = MenuItem;
var models  = require(__dirname + '/../../models');
var e  = require(__dirname + '/../../modules/error_handler.js');