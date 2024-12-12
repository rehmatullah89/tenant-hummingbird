"use strict";

var models      = require(__dirname + '/../models');
var moment      = require('moment');
var e  = require(__dirname + '/../modules/error_handler.js');
var Hash = require(__dirname + '/../modules/hashes.js');
var Hashes = Hash.init();

class AccountingExportConfigurations {

  constructor(data) {

    data = data || {};
    this.id = data.id;
    this.company_id = data.company_id;
    this.property_ids = data.property_ids;
    this.frequency = data.frequency;
    this.day_of_week = data.day_of_week;
    this.day_of_month = data.day_of_month;
    this.date = data.date;
    this.type = data.type;
    this.format = data.format;
    this.send_to = data.send_to;
    this.scheduled_by = data.scheduled_by;
    this.active = data.active;
    this.book_id = data.book_id;
  }

  async find(connection) {

    if(!this.id) e.th(400,'Export configuration id is not set');
    let exportConfig = await models.Accounting.findExportConfigById(connection, this.id);

    if(!exportConfig) e.th(400,'Export configuration not found');

    this.assembleConfiguration(exportConfig)
  }

  assembleConfiguration (data){
    this.id = data.id;
    this.company_id = data.company_id;
    this.property_ids = typeof data.property_ids === 'string' ? JSON.parse(data.property_ids) : data.property_ids;
    this.frequency = data.frequency;
    this.day_of_week = data.day_of_week;
    this.day_of_month = data.day_of_month;
    this.date = data.date;
    this.type = data.type;
    this.format = data.format;
    this.send_to = data.send_to && typeof data.send_to === 'string' ? JSON.parse(data.send_to) : data.send_to;
    this.active = data.active;
    this.scheduled_by = data.scheduled_by;
    this.created_at = data.created_at;
    this.modified_at = data.modified_at;
    this.modified_by = data.modified_by;
    this.book_id = data.book_id;
  }

  async save(connection) {
    let save = {
      company_id: this.company_id,
      property_ids: JSON.stringify(this.property_ids),
      format: this.format,
      type: this.type,
      frequency: this.frequency,
      day_of_week: this.day_of_week,
      day_of_month: this.day_of_month,
      date: this.date,
      scheduled_by: this.scheduled_by,
      send_to: this.send_to && JSON.stringify(this.send_to),
      active: this.active,
      book_id: this.book_id
    };

    let result = await models.Accounting.saveExportConfiguration(connection, save);
    if (result.insertId) {
      this.id = result.insertId;
    }
  }

  updateProperties(properties = [], payload_props = []) {
    let deleted_props = properties.filter(prop => !payload_props.includes(prop));
    let updated_props = this.property_ids.filter(prop => !deleted_props.includes(prop));
    
    payload_props.forEach(prop => {
      if(!updated_props.includes(prop)) updated_props.push(prop)
    });
    return updated_props;
  }

  async update(connection, data, properties) {

    if(typeof data.property_ids !== 'undefined') this.property_ids = this.updateProperties(properties, data.property_ids) || [];
    if(typeof data.type !== 'undefined') this.type = data.type || '';
    if(typeof data.format !== 'undefined') this.format = data.format || '';
    if(typeof data.frequency !== 'undefined') this.frequency = data.frequency || '';
    if(typeof data.day_of_week !== 'undefined') this.day_of_week = data.day_of_week || '';
    if(typeof data.day_of_month !== 'undefined') this.day_of_month = data.day_of_month || '';
    if(typeof data.date !== 'undefined') this.date = data.date || '';
    if(typeof data.send_to !== 'undefined') this.send_to = data.send_to && JSON.stringify(data.send_to);
    if(typeof data.book_id !== 'undefined') this.book_id = data.book_id || '';
    
    this.modified_at = moment().format('YYYY-MM-DD HH:mm:ss');
    this.modified_by = data.modified_by || '';

    let payload = {...this};
    payload.property_ids = JSON.stringify(payload.property_ids)
    return models.Accounting.saveExportConfiguration(connection, payload);

  }

  async delete(connection, data){
    if(!this.id) e.th(400, "Export configuration id not set");

    return await models.Accounting.saveExportConfiguration(connection, {
      id: this.id,
      deleted_by: data.deleted_by,
      deleted_at: moment().format('YYYY-MM-DD HH:mm:ss'),
      active: 0
    })
  }

  static async findAll(connection, company_id, properties = [], all = false) {
    let scheduled_exports = await models.Accounting.findAllExportConfiguration(connection, company_id, all);
    
    return scheduled_exports.filter(se => {
      let filtered_props = typeof se.property_ids === 'string' ? JSON.parse(se.property_ids) : se.property_ids;
      console.log("filtered_props:", filtered_props);
      filtered_props = filtered_props.filter(prop => properties.includes(prop))
        .map(prop => {
          return { id: prop }
        })

      if(!filtered_props.length) return

      se.properties = filtered_props
      delete se.property_ids
      return se
    });
  }

}

module.exports = AccountingExportConfigurations;
