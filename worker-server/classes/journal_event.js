"use strict";

var models      = require(__dirname + '/../models');
var moment      = require('moment');
var e  = require(__dirname + '/../modules/error_handler.js');
var Hash = require(__dirname + '/../modules/hashes.js');
var Hashes = Hash.init();

class JournalEvent {

  constructor(data) {
    data = data || {};
    this.id = data.id;
    this.gl_event_id = data.company_id;
    this.book_id = data.code;
    this.company_id = data.name;
    this.gl_account_credit_id = data.category_id;
    this.gl_account_debit_id = data.account_type_id;
    this.accounting_template_id = data.accounting_template_id;
    this.active = data.active;
    this.created_at = data.created_at;
    this.deleted_at = data.deleted_at;
    this.deleted_by = data.deleted_by;
  }

  async find(connection, payload) {
    const { filters } = payload;

    const glEventCompany = await models.AccountingTemplate.findAccountingEvents(connection, { filters });

    if(glEventCompany?.length) {
			this.assembleEvent(glEventCompany[0]);
			return glEventCompany[0];
		}
  }

  async save(connection, payload) {
    const { event } = payload;

		let result = await models.Accounting.saveJournalEvent(connection, event);
		this.id = this.id || result.insertId;
		return this.id;
	}
  
  async create(connection) {
    const event = {
      gl_event_id: this.gl_event_id,
      book_id: this.book_id,
      company_id: this.company_id,
      gl_account_credit_id: this.gl_account_credit_id,
      gl_account_debit_id: this.gl_account_debit_id,
      accounting_template_id: this.accounting_template_id,
      active: this.active
    };

    return await this.save(connection, { event });
  }

  static async findAllEvents(connection, accounting_template_id, payload = {}) {
      const { fetch_accounts } = payload;

      if(!accounting_template_id) e.th(400,'Template id is missing');
      
      let allEvents;
      if(fetch_accounts) {
        allEvents = await models.Accounting.findGlEventDetailsByTemplateId(connection, accounting_template_id);
      } else {
        allEvents = await models.Accounting.findAccountingEvents(connection, { filters: { accounting_template_id }});
      }

      if(allEvents && allEvents.length > 0){
        for(let i=0; i<allEvents.length; i++){
          let overrides = await models.Accounting.findOverridesByEventId(connection,allEvents[i].id);
          allEvents[i].Overrides = overrides && overrides.length > 0? overrides : [];
        };
      }
      return allEvents;  
  }

  async clearJournalEvent(connection, payload) {
    const { admin_contact } = payload;
    await models.Accounting.clearJournalEvent(connection, this.id, admin_contact.id);
  }

  assembleEvent(data){
    this.id = data.id;
    this.gl_event_id = data.id;
    this.book_id = data.book_id;
    this.company_id = data.company_id;
    this.gl_account_credit_id = data.gl_account_credit_id || null;
    this.gl_account_debit_id = data.gl_account_debit_id || null;
    this.accounting_template_id = data.accounting_template_id;
    this.active = data.active;
    this.created_at = data.created_at;
    this.deleted_at = data.deleted_at || null;
    this.deleted_by = data.deleted_by || null;
  }

  async updateOverrides(connection,overrides,contact_id,company_id){
      let alr_overrides = await models.Accounting.findOverridesByEventId(connection,this.id);

      let to_remove = alr_overrides && alr_overrides.length > 0? alr_overrides.filter(x1 => overrides.every(x2 => x1.id != x2.id)) : [];
      let to_add = alr_overrides && alr_overrides.length > 0? overrides.filter(x1 => alr_overrides.every(x2 => x1.id != x2.id)) : overrides.filter(x1 =>{return !x1.id});
      let to_update = alr_overrides && alr_overrides.length > 0? overrides.filter(o1 => alr_overrides.some(o2 => {return o1.id && o1.id === o2.id})) : overrides.filter(x1 =>{return x1.id});
      
      if(to_remove && to_remove.length > 0){
        let _ids = to_remove.filter(p => p.id).map(p => p.id).join(',');
        await models.Accounting.removeOverride(connection, contact_id, _ids.replace(/,\s*$/, ""))
      }
      if(to_add && to_add.length > 0){
          for(let i = 0; i < to_add.length; i++){
              let o = to_add[i];
              let _data = {
                  company_id: company_id,
                  gl_event_company_id: this.id,
                  product_type: o.product_type,
                  product_id: o.product_id,
                  credit_debit_type: o.credit_debit_type,
                  actual_gl_account_id: o.actual_gl_account_id,
                  override_gl_account_id: o.override_gl_account_id,
                  active: 1,
                  created_by: contact_id
              }
              await models.Accounting.saveOverride(connection,_data)
          }
      }
      if(to_update && to_update.length > 0){
          for(let i = 0; i < to_update.length; i++){
            let o = to_update[i];
            let _data = {};
            if(typeof o.product_type !== 'undefined') _data.product_type = o.product_type || null;
            if(typeof o.product_id !== 'undefined') _data.product_id = o.product_id || null;
            if(typeof o.actual_gl_account_id !== 'undefined') _data.actual_gl_account_id = o.actual_gl_account_id || null;
            if(typeof o.override_gl_account_id !== 'undefined') _data.override_gl_account_id = o.override_gl_account_id || null;
            await models.Accounting.saveOverride(connection,_data,o.id);
          }
      }
      

  }

  async update(connection,data,contact_id,company_id) {

    if(typeof data.gl_account_credit_id !== 'undefined') this.gl_account_credit_id = data.gl_account_credit_id || null;
    if(typeof data.gl_account_debit_id !== 'undefined') this.gl_account_debit_id = data.gl_account_debit_id || null;
    await models.Accounting.saveJournalEvent(connection,this,this.id);
    if(data.overrides && data.overrides.length > 0){
        await this.updateOverrides(connection,data.overrides,contact_id,company_id);
    }
  }
  
}

module.exports = JournalEvent;
