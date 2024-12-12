"use strict";

var models  = require(__dirname + '/../models');
var settings    = require(__dirname + '/../config/settings.js');
var Hash = require(__dirname + '/../modules/hashes.js');

var Promise = require('bluebird');
var validator = require('validator');
var moment      = require('moment');
var { findCommonElements } = require('../modules/utils');
var e  = require(__dirname + '/../modules/error_handler.js');
const cmsManager = require(__dirname + '/../modules/cms_manager.js');
class Role {

    constructor(data){

        data = data || {};
    
        this.id = data.id;
        this.company_id = data.company_id;
        this.name = data.name;
        this.description = data.description;
        this.sort = data.sort;
        this.is_default = !!data.is_default;
        this.created = data.created;
        this.is_active = !!data.is_active;
        this.type = data.type || 'admin'
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
          role = await models.Role.findByName(connection, this.name, this.company_id);
          role = role[0];
        }
 
        if (!role) e.th(404,"Role not found." );

        this.id = role.id;
        this.company_id = role.company_id;
        this.name = role.name;
        this.description = role.description;
        this.sort = role.sort;
        this.type = role.type;
        this.is_default = role.is_default;
        this.is_active = role.is_active;
    }

    async save(connection){
        await this.validate(connection);

        let save = {
          company_id: this.company_id,
          name: this.name,
          description: this.description,
          type: this.type,
          is_default: !!this.is_default 
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

        if(!['admin', 'application'].indexOf(this.type) < 0 ) e.th(400, "Please enter a type for this role");

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
        let permissions = await models.Role.findPermissions(connection, [this.id]);
        this.Permissions = permissions;
        return true;
    }

    async updateCmsManagers(connection, cmsPermissions, company, role_id, res, req) {
        let gds_owner_id = res.locals.active.gds_owner_id;
        let contacts = await models.Role.findRoleInUse(connection, role_id, company.id)
        let cmsManagers = []

        let ownerPermissions = cmsManager.getOwnerPermissions();
        let propertyPermissions = cmsManager.getFacilityPermissions();
        
        let selectedOwnerPermissions = findCommonElements(ownerPermissions, cmsPermissions);
        let selectedFacilityPermissions = findCommonElements(propertyPermissions, cmsPermissions);

        for(let contact = 0; contact < contacts.length; contact++){
            let contactDetails = contacts[contact]
            let properties = []
            let contactProperties = await models.Contact.getProperties(connection, contactDetails.id, company.id)
            let contactNonHbProperties = await models.Contact.getNonHbProperties(connection, contactDetails.id, company.id)
            let totalProperties = [...contactProperties, ...contactNonHbProperties]
            
            totalProperties?.forEach(property => {
                let propertyDetails = {
                    id: property.gds_id,
                    permissions: selectedFacilityPermissions ?? []
                }
                if(property.gds_id) properties.push(propertyDetails)
                
            })
            let admin = {
                user: {
                    name: {
                        first: contactDetails.first,
                        last: contactDetails.last
                    },
                    email: contactDetails.email,
                    phone: ""
                },
                permissions: selectedOwnerPermissions ?? [],
                facilities: properties ?? []
              }
            cmsManagers.push(admin)
          }

        cmsManagers.forEach(manager => {
            cmsManager.save(gds_owner_id, manager, req);
          })
    }

    async updatePermissions(connection, permissions){
        if (!this.id) {
            e.th(401,"Role id is not set");
    }

    
    if (!permissions || !permissions.length) return;
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
