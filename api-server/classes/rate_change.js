"use strict";

var models  = require(__dirname + '/../models');
var settings    = require(__dirname + '/../config/settings.js');
var Promise = require('bluebird');
var validator = require('validator');
var moment      = require('moment');
var utils    = require(__dirname + '/../modules/utils.js');

var XLSX = require('xlsx');
var e  = require(__dirname + '/../modules/error_handler.js');
var fs = require('fs');
class Rate_Change {

  constructor(data){

    data = data || {};
    this.id = data.id || null;
    this.rate_change_configuration_id = data.rate_change_configuration_id || null;
    this.property_id = data.property_id || null;
    this.name = data.name || null;
    this.type = data.type || null;
    this.change_amt = data.change_amt || null;
    this.notification_period = data.notification_period || null;
    this.change_direction = data.change_direction || null;
    this.change_type = data.change_type || null;
    this.document_id = data.document_id || null;
    this.email_text = data.email_text || null;
    this.email_subject = data.email_subject || null;
    this.deleted_at = data.deleted_at || null;
    this.reviewed = data.reviewed || null;
    this.completed = data.completed || null;
    this.target_date = data.target_date || null;
    this.skipped = data.skipped || null;
    this.upload_id = data.upload_id || null;
    this.uploads = data.uploads || [];
    this.emails = data.emails || [];
    this.src = data.src || null;
    this.filename = data.filename || null;
    this.rounding = (data.rounding && RoundOff.joinData(data.rounding)) || null;
    this.delivery_methods_id = data.delivery_methods_id || null

    this.Property = {};
    this.Upload = {};
    this.Summary = [];
    this.RentChangeLeases = [];
  }

  async save(connection, user) {

    var save = {
      id : this.id,
      rate_change_configuration_id : this.rate_change_configuration_id,
      property_id : this.property_id,
      name : this.name,
      type : this.type,
      change_amt : this.change_amt,
      notification_period : this.notification_period,
      change_direction : this.change_direction,
      change_type : this.change_type,
      document_id : this.document_id,
      email_text : this.email_text,
      email_subject : this.email_subject,
      deleted_at : this.deleted_at,
      reviewed : this.reviewed,
      completed : this.completed,
      target_date : this.target_date,
      skipped : this.skipped,
      upload_id : this.upload_id,
      delivery_methods_id : this.delivery_methods_id,
    }

    let result = await  models.Rate_Change.save(connection, save, this.id);
    if (result.insertId) this.id = result.insertId;

    await this.saveRounding(connection, user);
  }

  async saveRounding(connection, user) {
    let data = {
      object_id : this.id,
      object_type: 'rate_change',
      rounding_type: this.rounding,
      status: 1,
      created_by: user?.id
    }
    let rounding = new Rounding(data);
    await rounding.update(connection);
  }

  async findById(connection){

    if (!this.id) e.th(400, "Rate Change id required");
    let rate_change = await  models.Rate_Change.findById(connection, this.id);
    this.assembleRateChange(rate_change);
  }

  transformRounding(split = false){
    if(split) this.rounding = RoundOff.splitData(this.rounding);
    else this.rounding = RoundOff.joinData(this.rounding);
  }

  static async findAll(connection, company_id, params, properties){
	  let rate_changes = await models.Rate_Change.findRateChanges(connection, company_id, params, properties);
	  return rate_changes;
  }

  async getUpload(connection){
    if(!this.upload_id) return;
    this.Upload = new Upload({id: this.upload_id});
    await this.Upload.find(connection);
  }

  assembleRateChange(rate_change){

    if(!rate_change) e.th(404,"Invalid rate_change.");
    if(typeof rate_change.id !== 'undefined' && !this.id) this.id = rate_change.id;
    if(typeof rate_change.rate_change_configuration_id !== 'undefined') this.rate_change_configuration_id = rate_change.rate_change_configuration_id;
    if(typeof rate_change.property_id !== 'undefined') this.property_id = rate_change.property_id;
    if(typeof rate_change.name !== 'undefined') this.name = rate_change.name;
    if(typeof rate_change.type !== 'undefined') this.type = rate_change.type;
    if(typeof rate_change.change_amt !== 'undefined') this.change_amt = rate_change.change_amt;
    if(typeof rate_change.notification_period !== 'undefined') this.notification_period = rate_change.notification_period;
    if(typeof rate_change.change_direction !== 'undefined') this.change_direction = rate_change.change_direction;
    if(typeof rate_change.change_type !== 'undefined') this.change_type = rate_change.change_type;
    if(typeof rate_change.document_id !== 'undefined') this.document_id = rate_change.document_id;
    if(typeof rate_change.email_text !== 'undefined') this.email_text = rate_change.email_text;
    if(typeof rate_change.email_subject !== 'undefined') this.email_subject = rate_change.email_subject;
    if(typeof rate_change.deleted_at !== 'undefined') this.deleted_at = rate_change.deleted_at;
    if(typeof rate_change.reviewed !== 'undefined') this.reviewed = rate_change.reviewed;
    if(typeof rate_change.completed !== 'undefined') this.completed = rate_change.completed;
    if(typeof rate_change.target_date !== 'undefined') this.target_date = rate_change.target_date;
    if(typeof rate_change.skipped !== 'undefined') this.skipped = rate_change.skipped;
    if(typeof rate_change.upload_id !== 'undefined') this.upload_id = rate_change.upload_id;
    if(typeof rate_change.uploads !== 'undefined') this.uploads = rate_change.uploads;
    if(typeof rate_change.emails !== 'undefined') this.emails = rate_change.emails;
    if(typeof rate_change.src !== 'undefined') this.src = rate_change.src;
    if(typeof rate_change.filename !== 'undefined') this.filename = rate_change.filename;
    if(typeof rate_change.rounding !== 'undefined') this.rounding = rate_change.rounding;
    if(typeof rate_change.delivery_methods_id !== 'undefined') this.delivery_methods_id = rate_change.delivery_methods_id;

  }

  async update(connection, data, user){
    if (!this.id) e.th(400, "Rate Change id not set");
    this.assembleRateChange(data);
    if(typeof this.rounding !== 'string') this.transformRounding();
    await this.save(connection, user);
  }

  async deleteRounding(connection){
    let rounding = new Rounding({object_id: this.id});
    await rounding.deleteByObjectId(connection);
  }

  async saveDuplicate(connection){

    if(this.id) this.id  = null;
    await this.save(connection);
  }

  async findRentChangeLeases(connection){
    if (!this.id) e.th(400, "Rate Change id not set");
    let rate_change_leases = await models.Rate_Change.findRateChangeLeases(connection, this.id);
	  this.RentChangeLeases = rate_change_leases;
  }

  async getStats(connection){

    // moved this calculation out of this function.  only calculate if it hasnt been passed in.
    if(!this.Property.lease_count || this.Property.unit_count){
      this.Property = new Property({id: this.property_id});
      await this.Property.getUnitCount(connection);
      await this.Property.getLeaseCount(connection);
    }

   // let categories = await property.getUnitCategories(connection, 1, this.property_id);

    // let sum_occupancy = 0;
    // for(let j = 0; j < categories.length; j++){
    //     sum_occupancy += ((categories[j].Units.unit_count - categories[j].Vacant.unit_count) / categories[j].Units.unit_count) * 1e2;
    // }

    let target_date = moment(new Date(this.target_date), 'YYYY-MM-DD');
    //this.target_group_occupancy =  Math.round((sum_occupancy/categories.length) * 1e2) / 1e2;
    this.scheduled_date = target_date.clone().endOf('day').subtract(this.notification_period , 'days').format('YYYY-MM-DD');

    let store_occupancy = (this.Property.lease_count / this.Property.unit_count) * 1e2;
    this.store_occupancy = Math.round(store_occupancy * 1e2) / 1e2;
    this.move_out_after_raise = 0;

    let revenue = 0;
    let total_tenants = 0;

    for(let k = 0; k < this.RentChangeLeases.length; k++){
        if(this.RentChangeLeases[k].deleted_at){
            continue;
        }

        // let lease = new Lease({id: this.RentChangeLeases[k].lease_id});
        // await lease.find(connection);
        let hasMoveOut = this.RentChangeLeases[k].end_date && moment(this.RentChangeLeases[k].end_date, 'YYYY-MM-DD') < moment().endOf('day');

        this.move_out_after_raise += +hasMoveOut;
        total_tenants += +(!hasMoveOut);

        // this.RentChangeLeases[k].Lease = lease;
        //let activeRentService = await Service.getActiveRentService(connection, lease.id, moment(this.target_date));


        let direction = this.change_direction === 'Increase' ? 1 : -1;
        switch (this.change_type) {
            case 'fixed':
                revenue += (this.change_amt - this.RentChangeLeases[k].price);
                break;
            case 'percent':
                revenue += (direction * ((this.change_amt/1e2) * this.RentChangeLeases[k].price));
                break;
            case 'dollar':
                revenue += (direction * this.change_amt);
                break;
        }
    }

    // this.is_uploaded = uploaded;
    // this.is_emailed = emailed;
    this.monthly_revenue = Math.round(revenue * 1e2) / 1e2;
    this.Total = total_tenants;
  }

  async generateReport(connection){

    let name = "RentRaise";
    var wb = {
      SheetNames: [name],
      Sheets: {}
    };
    var sheets = {};
    sheets[name] = {
      row: 1,
      ws: {}
    }
    sheets[name].ws['A1'] = { v: "Name", t: 's'}
    sheets[name].ws['B1'] = { v: "Unit", t: 's'}
    sheets[name].ws['C1'] = { v: "Notification Sent", t: 's'}
    sheets[name].ws['D1'] = { v: "Email Sent To", t: 's'}
    sheets[name].ws['E1'] = { v: "Document Link", t: 's'}
    sheets[name].ws['F1'] = { v: "Message", t: 's'}
    sheets[name].ws['G1'] = { v: "Status", t: 's'}
    sheets[name].ws['H1'] = { v: "Finalized", t: 's'}



    for(let i = 0; i < this.RentChangeLeases.length; i++){

      if(this.RentChangeLeases[i].deleted_at) continue;
      // if(this.RentChangeLeases[i].Lease)
      //   await this.RentChangeLeases[i].Lease.findUnit(connection);
      //   await this.RentChangeLeases[i].Lease.getTenants(connection);
      //   if(this.RentChangeLeases[i].email_id){
      //     this.RentChangeLeases[i].Email = new Email({id: this.RentChangeLeases[i].email_id});
      //     await this.RentChangeLeases[i].Email.find(connection)
      //   }
      //
      //   if(this.RentChangeLeases[i].upload_id){
      //     this.RentChangeLeases[i].Upload = new Upload({id: this.RentChangeLeases[i].upload_id});
      //     await this.RentChangeLeases[i].Upload.find(connection)
      //   }

        console.log(this.RentChangeLeases[i]);

      let contact_name = '';
      let email_sent_to = '';
      let email_subject = '';
      let src = '';
      let docname = '';

      if(this.RentChangeLeases[i].to &&  this.RentChangeLeases[i].email_address){
        email_sent_to = this.RentChangeLeases[i].to + ' - ' + this.RentChangeLeases[i].email_address;
      }

      src = this.RentChangeLeases[i].src;
      docname = this.RentChangeLeases[i].name;
      contact_name = this.RentChangeLeases[i].first + ' ' + this.RentChangeLeases[i].last;

      sheets[name].ws[XLSX.utils.encode_cell({ c: 0, r: i+1 })] = { v: contact_name, t: 's'};
      sheets[name].ws[XLSX.utils.encode_cell({ c: 1, r: i+1 })] = { v: this.RentChangeLeases[i].number || '', t: 's'};
      if(this.RentChangeLeases[i].notification_sent){
        sheets[name].ws[XLSX.utils.encode_cell({ c: 2, r: i+1 })] = { v: this.RentChangeLeases[i].notification_sent, t: 'd'};
      } else {
        sheets[name].ws[XLSX.utils.encode_cell({ c: 2, r: i+1 })] = { v: '', t: 's'};
      }
      sheets[name].ws[XLSX.utils.encode_cell({ c: 3, r: i+1 })] = { v: email_sent_to, t: 's'};
      console.log('src', src);
      console.log('docname', docname);
      console.log('this.RentChangeLeases[i].src', this.RentChangeLeases[i].src);
      if(src) {
        sheets[name].ws[XLSX.utils.encode_cell({ c: 4, r: i+1 })] = { v: docname, l: { Target: src, Tooltip: 'View Document' } };
      } else {
        sheets[name].ws[XLSX.utils.encode_cell({ c: 4, r: i+1 })] = { v: '', t: 's' };
      }

      sheets[name].ws[XLSX.utils.encode_cell({ c: 5, r: i+1 })] = { v: this.RentChangeLeases[i].message || '', t: 's'};
      sheets[name].ws[XLSX.utils.encode_cell({ c: 6, r: i+1 })] = { v: this.RentChangeLeases[i].status || '', t: 's'};

    }

    wb.Sheets[name] = sheets[name].ws;
    wb.Sheets[name]['!ref'] = XLSX.utils.encode_range({
      s: {
        r: 0,
        c: 0
      },
      e: {
        r: this.RentChangeLeases.length + 1,
        c: 5
      }
    });
    // /* generate buffer */
    return XLSX.write(wb, {type:'buffer', bookSST: false, bookType:"xlsx"});





  }

  isRecalculateRent(data) {
    let is_amount_changed = this.change_amt === data.change_amt;
    let is_direction_changed = this.change_direction === data.change_direction;
    let is_type_changed = this.change_type === data.change_type;
    let is_rounding_changed = this.rounding === RoundOff.joinData(data.rounding)
    return !(is_amount_changed && is_direction_changed &&  is_type_changed && is_rounding_changed);
  }
}


module.exports = Rate_Change;
var Property      = require('../classes/property.js');
var Lease         = require('../classes/lease.js');
var Service       = require('../classes/service.js');
var Upload        = require('../classes/upload.js');
var Email         = require('../classes/email.js');
var Rounding      = require(__dirname + '/../classes/rounding.js');
var RoundOff = require(__dirname + '/../modules/rounding.js');