"use strict";

var models  = require(__dirname + '/../models');
var settings    = require(__dirname + '/../config/settings.js');
var Hash = require(__dirname + '/../modules/hashes.js');

var Promise = require('bluebird');
var validator = require('validator');
var moment      = require('moment');
var e  = require(__dirname + '/../modules/error_handler.js');


class Role {

	constructor(data){

		data = data || {};
    console.log(data);
		this.id = data.id;
		this.company_id = data.company_id;
		this.name = data.name;
		this.description = data.description;
		this.sort = data.sort;
		this.is_default = data.is_default;
		this.created = data.created;

		this.Permissions = [];

		return this;

	}

	async find(connection){
		let role = {};
		if(!this.id && !this.name) {
		  e.th(500, 'Role id not set');
		}

		if(this.id){
		  role = await models.Role.findById(connection, this.id);
		} else {
		  role = await models.Role.findByName(connection, this.name);
		}

		if (!role) e.th(404,"Role not found." );

		this.id = role.id;
		this.company_id = role.company_id;
		this.name = role.name;
		this.description = role.description;
		this.sort = role.sort;
		this.is_default = role.is_default;
	}

	async save(connection){
		await this.validate(connection);

		let save = {
		  company_id: this.company_id,
		  name: this.name,
		  description: this.description,
		  is_default: this.is_default === ''? 0: this.is_default 
		};

		if(this.is_default){
      await models.Role.resetDefaultRole(connection, this.company_id)
    }


		let result = await models.Role.save(connection, save, this.id)
		if(!this.id){
			this.id = result.insertId;
		}


	}

	update(data){
		if(typeof data.id != 'undefined') this.id = data.id;
		if(typeof data.company_id != 'undefined') this.company_id = data.company_id;
		if(typeof data.name != 'undefined') this.name = data.name;
		if(typeof data.description != 'undefined') this.description = data.description;
		if(typeof data.sort != 'undefined') this.sort = data.sort;
		if(typeof data.is_default != 'undefined') this.is_default = data.is_default;
	}

	async validate (connection){
		if(!this.company_id) e.th(500, "Company Id Not Set");
		if(!this.name) e.th(400, "Please enter a name for this role");

		let existing = await models.Role.findByName(connection, this.name, this.company_id);
		if(existing && existing.find(e => e.id !== this.id)){
		  e.th(409, "A role with this name already exists");
		}
	}

	verifyAccess(company_id){
		if (company_id !== this.company_id) {
		  e.th(401,"You are not authorized to view this resource");
		}
		return Promise.resolve();
	}

	async getPermissions(connection){
		if(!this.id) e.th(500, "Role id not set");
		let permissions = await models.Role.findPermissions(connection, this.id);
		this.Permissions = permissions;
		return true;
	}

	async updatePermissions(connection, permissions){
		if (!this.id) {
			e.th(401,"Role id is not set");
    }

    console.log("Permissions", permissions)
		await models.Role.deletePermissions(connection, permissions, this.id );
		for(let i = 0; i < permissions.length; i++){
		  await models.Role.savePermission(connection, permissions[i], this.id );
		}
	}

	static async getAllPermissions(connection){
    return await models.Role.findAllPermissions(connection);

  	}

	async checkRoleInUse(connection){
		var result = await models.Role.checkRoleInUse(connection, this.id);
		if(result[0].inUse) e.th(409,"Role is in use.");
	}

	async delete(connection){
		await models.Role.delete(connection, this.id);
	}

}

module.exports = Role;
