"use strict";

var models      = require(__dirname + '/../models');
var moment      = require('moment');
var e  = require(__dirname + '/../modules/error_handler.js');
var Hash = require(__dirname + '/../modules/hashes.js');
var Hashes = Hash.init();
var Excel = require('./reports/report_formats/excel');
var templateConfig = require('./reports/report_fields/coa_template');
var Upload = require('./upload');

class GlAccount {

  constructor(data) {
    data = data || {};
    this.id = data.id;
    this.company_id = data.company_id;
    this.code = data.code;
    this.name = data.name;
    this.category_id = data.category_id;
    this.account_type_id = data.account_type_id;
    this.account_subtype_id = data.account_subtype_id;
    this.active = data.active;
    this.created_by = data.created_by;
    this.upload_id = data.upload_id || null;
  }

  async find(connection) {

    if(!this.id) e.th(400,'GL account id is not set');
    let account = await models.GlAccounts.findById(connection, this.id);

    if(!account) e.th(400,'GL account not found');

    this.assembleAccount(account)
  }

  assembleAccount(data){
    this.id = data.id;
    this.company_id = data.company_id;
    this.code = data.code;
    this.name = data.name;
    this.category_id = data.category_id;
    this.account_type_id = data.account_type_id;
    this.account_subtype_id = data.account_subtype_id;
    this.active = data.active;
    this.created_by = data.created_by;
    this.created_at = data.created_at;
    this.modified_at = data.modified_at;
    this.modified_by = data.modified_by;
    this.upload_id = data.upload_id;
  }

  async save(connection) {
    let save = {
      company_id: this.company_id,
      code: this.code,
      name: this.name,
      category_id: this.category_id,
      account_type_id: this.account_type_id,
      account_subtype_id: this.account_subtype_id,
      active: this.active,
      created_by: this.created_by,
      upload_id: this.upload_id
    };

    let result = await models.GlAccounts.save(connection, save);
    if (result.insertId) {
      this.id = result.insertId;
    }
  }

  async update(connection, data) {

    if(typeof data.code !== 'undefined') this.code = data.code || '';
    if(typeof data.name !== 'undefined') this.name = data.name || '';
    if(typeof data.account_type_id !== 'undefined') this.account_type_id = data.account_type_id || '';
    if(typeof data.account_subtype_id !== 'undefined') this.account_subtype_id = data.account_subtype_id || '';
    if(typeof data.category_id !== 'undefined') this.category_id = data.category_id || '';
    if(typeof data.upload_id !== 'undefined') this.upload_id = data.upload_id || '';

    this.modified_at = moment().format('YYYY-MM-DD HH:mm:ss');
    this.modified_by = data.modified_by || '';

    return models.GlAccounts.save(connection, this);

  }

  async delete(connection, data){
    if(!this.id) e.th(400, "GL account id not set");

    return await models.GlAccounts.save(connection, {
      id: this.id,
      deleted_by: data.deleted_by,
      deleted_at: moment().format('YYYY-MM-DD HH:mm:ss'),
      active: 0
    })
  }

  static findAll(connection, company_id, all = false) {
    return models.GlAccounts.findAll(connection, company_id, all);
  }

  static async bulkUpdate(connection,contact,company,params) {
    let accounts = params.accounts.filter(x => x.id);
    let newAccounts = params.accounts.filter(x => !x.id);
    
    for(let i=0 ;i<accounts.length; i++) {
      let glAccount =  new GlAccount({id: accounts[i].id});
      await glAccount.find(connection);
      await glAccount.update(connection,{...accounts[i], modified_by: contact.id});
    }

    if(params.deleted && params.deleted.length > 0) {
      let data = {
        deleted_by: contact.id,
        deleted_at: moment().format('YYYY-MM-DD HH:mm:ss'),
        active: 0
      }
      await models.GlAccounts.bulkDelete(connection,params.deleted.map(x=> x.id),data);
    }

    if(newAccounts && newAccounts.length){
      newAccounts.forEach(x =>{
        x.active = 1;
        x.company_id = company.id;
      })

      for(let account of newAccounts){
        let glAccount =  new GlAccount(account);
        await glAccount.save(connection);
      }
    }
    
    return true;
  }

  static async findExportAccounts(connection, payload) {
    const { event_id, property } = payload;

    let credit_debit_account = []
    let accounts = await models.GL_Event_Company.findAccounts(connection, property.PropertyAccountingTemplate.id, event_id, property.PropertyAccountingTemplate.AccountingSetup.book_id);
    
    for(let i=0 ; i<accounts.length; i++){
      let account = accounts[i];
      account.over_ride_accounts = await models.GL_Event_Company.findOverrideAccounts(connection, accounts[i].event_company_id, accounts[i].type); 
      credit_debit_account.push(account);
    }

    return credit_debit_account;
  }

  static async findAccountBySubType(connection, company_id, sub_type_id){
    let result = await models.GlAccounts.findAccountBySubType(connection, company_id, sub_type_id);
    return result;
  }

  static async findTaxAccount(connection, property_id, type){
    let result = await models.GlAccounts.findTaxAccount(connection, property_id, type);
    return result;
  }

  static async findDefaultAccounts(connection, company_id){
    let result = await models.GlAccounts.findDefaultAccounts(connection, company_id);
    return Object.assign({}, ...result.map((x) => ({[x.type]: x})));
  }

  static async generateTemplate(connection){
    let data = [{}];
    let config = templateConfig;
    let template = new Excel(data,config,[],config.name);

    return await template.generateTemplate();
  }

  static async validateSpreadsheet(connection,file,company,contact){
    let extension = file.name.split('.')[1];
    if(extension !== 'csv' && extension !== 'xls'&& extension !== 'xlsx'){
      e.th(400, 'File type not supported. Supported types are xlsx, csv, xls.')
    }
    
    let upload = new Upload();
    upload.setFile(file);
    upload.uploaded_by = contact? contact.id: null;
    upload.status = 1;
    
    let data = await Excel.validateSpreadsheet(file.path,connection);
    await upload.save(connection);
    data.forEach(x => x.upload_id = upload.id);
    return data;
  }

  static async getActiveProcessesDetails(connection, payload){
    const { gl_accounts } = payload;
    let processList = [];
    let gl_accounts_list = [];

    for(let gl_account of gl_accounts) {
      const accountId = Hashes.decode(gl_account)[0];
      gl_accounts_list.push(accountId);
      processList.push({gl_account_id: accountId, processDetails: []})
    }

    const processes = await models.GlAccounts.getActiveProcessesDetailsofGlAccounts(connection, gl_accounts_list);
    
    if(processes.length){
      for(let process of processes) {
        let processType = `${process.process_type === 'late' ? 'Fees' : process.process_type === 'insurance' ? 'Coverage' : process.process_type === 'product' ? 'Product' : process.process_type === 'tax' ? 'Tax Profile' : process.process_type === 'event'? 'GL Event' :  process.process_type === 'default_subtype' ? 'Default COA' : process.process_type === 'override' ? 'GL Event Override' : ''}`;
        let processName = `${process.process_name}`;
        let processLevel = `${process.level? 'at '+ process.level + ' level': ''}`;
        let processTemplate = `${process.template_name ? 'in ' + process.template_name : ''}`;
        let details = `${processType? processType : ''} - ${processName? processName : ''} ${processLevel? processLevel : ''}${processTemplate? processTemplate : ''}`;
        
        processList.find(p => p.gl_account_id == process.gl_account_id).processDetails.push(details);
      }
    }
    return processList;

  }
}

module.exports = GlAccount;
