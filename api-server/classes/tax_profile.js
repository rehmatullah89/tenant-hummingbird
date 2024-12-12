"use strict";

var moment      = require('moment');

var models = require(__dirname + '/../models');
var e  = require(__dirname + '/../modules/error_handler.js');

class TaxProfile {

    constructor(data){
      data = data || {};
      this.id = data.id || null;
      this.company_id = data.company_id || null;
      this.tax_rate = data.tax_rate || null;
      this.name = data.name || null;
      this.state = data.state || null;
      this.account_id = data.account_id || null;
      this.deleted_at = data.deleted_at || null;
      this.modified_at = data.modified_at || null;
      this.created_by = data.created_by || null;
      this.modified_by = data.modified_by || null;
      this.deleted_by = data.deleted_by || null;
    }

    async assembleTaxProfile(data) {
      if (!data) e.th(404, "Tax Profile Data is invalid");

      if(typeof data.id !== 'undefined' && !this.id) this.id = data.id;
      if(typeof data.company_id !== 'undefined') this.company_id = data.company_id;
      if(typeof data.tax_rate !== 'undefined') this.tax_rate = data.tax_rate;
      if(typeof data.name !== 'undefined') this.name = data.name;
      if(typeof data.state !== 'undefined') this.state = data.state;
      //if(typeof data.gl_code !== 'undefined') this.gl_code = data.gl_code;
      if(typeof data.modified_at !== 'undefined') this.modified_at = data.modified_at;
      if(typeof data.deleted_at !== 'undefined') this.deleted_at = data.deleted_at;
      if(typeof data.account_id !== 'undefined') this.account_id = data.account_id;
      if(typeof data.created_by !== 'undefined') this.created_by = data.created_by;
      if(typeof data.modified_by !== 'undefined') this.modified_by = data.modified_by;
      if(typeof data.deleted_by !== 'undefined') this.deleted_by = data.deleted_by;
    }

    async verifyAccess(company_id){
      if(this.company_id !== company_id) e.th(403, "Not authorized");
    }

    static async getAllByCompany(connection, company_id, searchParams) {
      if (!company_id) e.th(400, "Company id is not set");

      let taxProfiles = await models.TaxProfile.findAllByCompany(connection, company_id, searchParams);

      // let account = new Accounting({company_id: company_id});
      // let taxes = await account.getTaxProfiles();

      // for(let i = 0; i < taxProfiles.length; i++){
      //   let saved_tax = taxes.find(t => t.tax_profile_id === taxProfiles[i].id);
      //   if(saved_tax){
      //     taxProfiles[i].account_id = saved_tax.account_id;
      //   }
      // }
      return taxProfiles;
    }

    async find(connection) {
      if (!this.id) e.th(400, "Tax Profile id is not set or is invalid");

      let tax_profile = await models.TaxProfile.findById(connection, this.id);
      await this.assembleTaxProfile(tax_profile);

      // let account = new Accounting({company_id: tax_profile.company_id});
      // let taxes = await account.getTaxProfiles();
      // let saved_tax = taxes.find(t => t.tax_profile_id === this.id);
      // if(saved_tax){
      //   this.account_id = saved_tax.account_id
      // }
    }

    async validate(connection){

      if (!this.company_id) e.th(400, 'Invalid company id');
      if (!this.name) e.th(400, 'Please choose a name for this tax profile');

      let taxProfiles = await TaxProfile.getAllByCompany(connection, this.company_id, {name: this.name});
      if(taxProfiles && taxProfiles.length && (!this.id || (this.id && taxProfiles[0].id !== this.id))){
        e.th(409, 'A tax profile with this name already exists')
      }
    }

    async save(connection) {

      await this.validate(connection);

      let data = {
        id: this.id,
        company_id: this.company_id,
        tax_rate: this.tax_rate,
        name: this.name,
        state: this.state,
        // gl_code: this.gl_code,
        deleted_at: this.deleted_at,
        modified_at: this.modified_at,
        account_id: this.account_id,
        created_by: this.created_by,
        modified_by: this.modified_by,
        deleted_by: this.deleted_by
      };

      let result = await models.TaxProfile.save(connection, data, this.id);
      if (result.insertId) this.id = result.insertId;

      // save accounting information
      // let account = new Accounting({company_id: this.company_id});
      // await account.getCompany();

      // if(result.insertId) {
      //   await account.addTaxProfile({ id: this.id, account_id: this.account_id });
      // } else {
      //   await account.updateTaxProfile({ id: this.id, account_id: this.account_id });
      // }
    }

    async update(connection, data){
      if (!this.id) e.th(400, "Tax Profile id not set");
      await this.assembleTaxProfile(data);
      await this.save(connection);
    }

    async delete(connection, contact) {
      if (!this.id) e.th(400, "Tax Profile id not set");
      await this.update(connection, {deleted_at: moment().format('YYYY-MM-DD HH:mm:ss'), deleted_by: contact.id});
      await Property.deleteTaxRate(connection, this.id);
    }
}

module.exports = TaxProfile;


var Accounting  = require('./accounting.js');
var Property  = require('./property.js');
