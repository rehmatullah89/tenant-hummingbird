var express = require('express');
const Accounting = require('../classes/accounting');
const AccountingUtils = require('../classes/accounting/utils');
const JournalEvent = require(__dirname + '/../classes/journal_event.js');
var router = express.Router();
var Hash = require(__dirname + '/../modules/hashes.js');
var Hashes = Hash.init();
var control  = require(__dirname + '/../modules/site_control.js');


var models = require(__dirname + '/../models');
var utils    = require(__dirname + '/../modules/utils.js');

var eventEmitter = require(__dirname + '/../events/index.js');
var e  = require(__dirname + '/../modules/error_handler.js');
const joiValidator = require('express-joi-validation')({
    passError: true
});

var Schema = require(__dirname + '/../validation/accounting.js');
var GlAccount  = require(__dirname + '/../classes/gl_account.js');
var ExportConfigurations  = require(__dirname + '/../classes/accounting_export_configurations.js');
var ENUMS = require(__dirname + '/../modules/enums.js');

const getQueue = require("../modules/queue");
const Queue = getQueue('hummingbirdQueue');

const moment = require('moment');


module.exports = function(app) {

  router.get('/accounts', [control.hasAccess(['admin']), control.hasPermission('accounting_config')], async(req, res, next) => {
    var connection = res.locals.connection;
    try{
      const company = res.locals.active;
      const query = req.query;
      let accounts = await GlAccount.findAll(connection,company.id, query.all);

      utils.send_response(res, {
        status: 200,
        data: {
          accounts: Hash.obscure(accounts, req)
        }
      });

    } catch(err){
        next(err)
    }

  });

  router.post('/account', [control.hasAccess(['admin']),Hash.unHash], control.hasPermission('manage_gl_accounts'), async(req, res, next) => {
      var connection = res.locals.connection;
      try{

        const company = res.locals.active;
        const contact = res.locals.contact;
        const body = req.body;

        let glAccount =  new GlAccount(
          {
              ...body,
              company_id: company.id,
              active: 1,
              created_by: contact.id
          });
        await glAccount.save(connection);

        utils.send_response(res, {
          status: 200,
          data: {
            account: Hash.obscure(glAccount, req)
          }
        });

      } catch(err){
        next(err)
      }

  });

  router.get('/is_setup', [control.hasAccess(['admin']), control.hasPermission('accounting_config'), Hash.unHash], async (req, res, next) => {
    try {
      var connection = res.locals.connection;
      const { active: company } = res.locals;

      const accounting = new Accounting({ company_id: company.id });
      const isAccountingSetup = + await accounting.isSetup(connection);

      utils.send_response(res, {
        status: 200,
        data: {
          is_setup: isAccountingSetup
        }
      });
    } catch (err) {
      next(err)
    }
  });

  router.post('/setup', [control.hasAccess(['admin']), control.hasPermission('accounting_config'), Hash.unHash], async (req, res, next) => {
    try {
      var connection = res.locals.connection;
      const { active: company } = res.locals;
      const contact = res.locals.contact;

      await connection.beginTransactionAsync();  
      const accounting = new Accounting({ company_id: company.id });
      
      await accounting.setup(connection, {
        created_by: contact.id
      });
      await connection.commitAsync();

      utils.send_response(res, {
        status: 200,
        data: { }
      });
    } catch (err) {
      connection.rollbackAsync();
      next(err)
    }
  });

  router.get('/templates', [control.hasAccess(['admin']), control.hasPermission('accounting_config'), Hash.unHash], async (req, res, next) => {
    try {
      var connection = res.locals.connection;
      const { active: company, properties : restricted_properties, contact: admin_contact } = res.locals;
      let base_properties = [];

      if (admin_contact) {
        let contact = new Contact({ id: admin_contact.id });
        await contact.find(connection, company.id);
        await contact.getRole(connection, company.id);
        base_properties = contact.Properties.map(p => p.id)
      }
      
      const templates = await AccountingTemplate.findAllTemplates(connection, { filters: {
          company_id: company.id,
          restricted_properties,
          base_properties
        }
      });

      utils.send_response(res, {
        status: 200,
        data: Hash.obscure(templates, req)
      });
    } catch (err) {
      next(err)
    }
  });

  router.post('/template', [control.hasAccess(['admin']), control.hasPermission('accounting_config'), Hash.unHash], async (req, res, next) => {
    try {
      var connection = res.locals.connection;
      const { active: company, contact: admin_contact } = res.locals;
      const { body: template } = req;

      await connection.beginTransactionAsync();  

      const templateObj = {
        company_id: company.id,
        created_by: admin_contact.id,
        modified_by: admin_contact.id,
        name: template.name,
        Properties: template.Properties,
        AccountingSetup: {
          company_id: company.id,
          description: ENUMS.ACCOUNTING_DESCRIPTION[template.AccountingSetup.book_id],
          active : 1,
          created_by: admin_contact.id,
          book_id : template.AccountingSetup.book_id
        },
      };

      const accountingTemplate = new AccountingTemplate(templateObj);

      await accountingTemplate.create(connection);
      await accountingTemplate.updateProperties(connection, {admin_id: admin_contact.id});
      accountingTemplate.AccountingSetup.accounting_template_id = accountingTemplate.id;
      await accountingTemplate.setupAccountingType(connection);

      await connection.commitAsync();

      utils.send_response(res, {
        status: 200,
        data: {
          accounting_template_id: Hashes.encode(accountingTemplate.id, res.locals.company_id)
        }
      });
    } catch (err) {
      connection.rollbackAsync();
      next(err)
    }
  });

  router.put('/template/:accounting_template_id', [control.hasAccess(['admin']), Hash.unHash], async (req, res, next) => {
    try {
      var connection = res.locals.connection;
      const { active: company, contact: admin_contact } = res.locals;
      const { body: template, params } = req;
      const { accounting_template_id } = params;

      await connection.beginTransactionAsync();  

      const templateObj = {
        id: accounting_template_id,
        company_id: company.id,
        modified_by: admin_contact.id,
        name: template.name,
        Properties: template.Properties,
        AccountingSetup: {
          company_id: company.id,
          description: ENUMS.ACCOUNTING_DESCRIPTION[template.AccountingSetup.book_id],
          active : 1,
          created_by: admin_contact.id,
          book_id : template.AccountingSetup.book_id,
          accounting_template_id: accounting_template_id
        },
      };

      const accountingTemplate = new AccountingTemplate(templateObj);

      await accountingTemplate.update(connection);
      await accountingTemplate.updateProperties(connection, {admin_id: admin_contact.id, company_id: company.id});
      await accountingTemplate.updateAccountingType(connection);
      await accountingTemplate.updatePropertiesTrannum(connection, {properties: template.Properties});

      await connection.commitAsync();

      utils.send_response(res, {
        status: 200,
        data: {
          accounting_template_id: Hashes.encode(accountingTemplate.id, res.locals.company_id)
        }
      });
    } catch (err) {
      connection.rollbackAsync();
      next(err)
    }
  });

  router.delete('/template/:template_id', [control.hasAccess(['admin']), control.hasPermission('accounting_config'), Hash.unHash], async (req, res, next) => {
    try {
      var connection = res.locals.connection;
      const { contact: admin_contact } = res.locals;
      const { body: template, params } = req;
      const { template_id } = params;

      await connection.beginTransactionAsync();  

      const templateObj = {
        id: template_id,
        modified_by: admin_contact.id,
        deleted_by: admin_contact.id,
        ...template
      };

      const accountingTemplate = new AccountingTemplate(templateObj);
      await accountingTemplate.delete(connection);

      await connection.commitAsync();

      utils.send_response(res, {
        status: 200,
        data: {
          accounting_template_id: Hashes.encode(accountingTemplate.id, res.locals.company_id)
        }
      });
    } catch (err) {
      connection.rollbackAsync();
      next(err)
    }
  });

  router.put('/template/:accounting_template_id/events/:company_event_id', [control.hasAccess(['admin']), control.hasPermission('edit_journal_templates'), Hash.unHash], async(req, res, next) => {
    var connection = res.locals.connection;
    
    const { active: company, contact: admin_contact } = res.locals;
    const { body, params } = req;
    const { accounting_template_id, company_event_id } = params;

    try {
      const journalEvent =  new JournalEvent({ id: company_event_id });
      await journalEvent.find(connection, { filters: {
        accounting_template_id: accounting_template_id,
        id: company_event_id
      }});
     
      if(!journalEvent?.id) {
        e.th(409, 'Event does not exists against this template.');
      }

      await connection.beginTransactionAsync();  
      await journalEvent.update(connection,body,admin_contact.id, company.id);
      await connection.commitAsync();

      utils.send_response(res, {
        status: 200
      });
    } catch(err) {
      connection.rollbackAsync();
      next(err)
    }
  });
  
  router.put('/template/:accounting_template_id/events/:company_event_id/reset', [control.hasAccess(['admin']), control.hasPermission('edit_journal_templates'), Hash.unHash], async(req, res, next) => {
    var connection = res.locals.connection;
    const { contact: admin_contact } = res.locals;
    const { params } = req;
    const { accounting_template_id, company_event_id } = params;

    try {
      const journalEvent =  new JournalEvent({ id: company_event_id });
      await journalEvent.find(connection, { filters: {
        accounting_template_id: accounting_template_id,
        id: company_event_id
      }});
     
      if(!journalEvent?.id) {
        e.th(409, 'Event does not exists against this template.');
      }

      await connection.beginTransactionAsync();
      await journalEvent.clearJournalEvent(connection, {
        admin_contact
      });
      await connection.commitAsync();
    
      utils.send_response(res, {
        status: 200
      });
    } catch(err){
      connection.rollbackAsync();
      next(err)
    }
  });

  router.put('/template/:accounting_template_id/default-subtypes', [control.hasAccess(['admin']), control.hasPermission('assign_gl_accounts'), Hash.unHash], async (req, res, next) => {
    try {
      var connection = res.locals.connection;
      const { contact: admin_contact } = res.locals;
      const { params, body } = req;
      const { accounting_template_id } = params;

      body.admin_id = admin_contact.id;
      
      await connection.beginTransactionAsync();

      const accountingTemplate = new AccountingTemplate({ id: accounting_template_id });
      await accountingTemplate.updateTemplateDefaultSubTypeAccounts(connection,body);
      
      await connection.commitAsync();

      utils.send_response(res, {
        status: 200
      });

    } catch(err){
      connection.rollbackAsync();
      next(err)
    }
  });

  router.post('/template/:accounting_template_id/duplicate', [control.hasAccess(['admin']), control.hasPermission('accounting_config'), Hash.unHash], async (req, res, next) => {
    try {
      var connection = res.locals.connection;
      const { contact: admin_contact } = res.locals;
      const { params } = req;
      const { accounting_template_id } = params;
      
      await connection.beginTransactionAsync();
      
      const accountingTemplate = new AccountingTemplate({ id: accounting_template_id });
      await accountingTemplate.duplicate(connection, { admin_contact });

      await connection.commitAsync();

      utils.send_response(res, {
        status: 200
      });
    } catch(err){
      connection.rollbackAsync();
      next(err)
    }
  });

  router.get('/template/:accounting_template_id', [control.hasAccess(['admin']), control.hasPermission('accounting_config'), Hash.unHash], async (req, res, next) => {
    try {
      var connection = res.locals.connection;
      const { params, query = {} } = req;
      const { accounting_template_id } = params;
            
      let { fetch_template = false, fetch_setup = false, fetch_events = false, fetch_default_sub_types = false } = query;

      const fetchDetails = {
        fetch_template: fetch_template != false, 
        fetch_setup: fetch_setup != false, 
        fetch_events: fetch_events != false, 
        fetch_default_sub_types: fetch_default_sub_types != false, 
        fetch_accounts: true
      };

      if(!Object.keys(query).length) {
        fetchDetails.fetch_template = true;
        fetchDetails.fetch_setup = true;
        fetchDetails.fetch_events = true;
        fetchDetails.fetch_default_sub_types = true;
      }

      const template = new AccountingTemplate({ id: accounting_template_id });
      await template.findDetails(connection, { 
        filters: { id: accounting_template_id },
        params: fetchDetails 
      });
      
      utils.send_response(res, {
        status: 200,
        data: {
          accounting_template: Hash.obscure(template, req)
        }
      });
    } catch (err) {
      next(err)
    }
  });

  router.put('/account/:account_id', [control.hasAccess(['admin']), control.hasPermission('manage_gl_accounts'), Hash.unHash], async(req, res, next) => {
      var connection = res.locals.connection;
      try{

        const body = req.body;
        const contact = res.locals.contact;
        let params = req.params;

        let glAccount =  new GlAccount({id:params.account_id});
        await glAccount.find(connection);
        await glAccount.update(connection,{...body, modified_by: contact.id});

        utils.send_response(res, {
          status: 200,
          data: {
            account: Hash.obscure(glAccount, req)
          }
        });

      } catch(err){
        next(err)
      }
  });

  router.delete('/account/:account_id', [control.hasAccess(['admin']), control.hasPermission('manage_gl_accounts'), Hash.unHash], async(req, res, next) => {
      var connection = res.locals.connection;
      try{

        const contact = res.locals.contact;
        let params = req.params;

        let glAccount =  new GlAccount({id:params.account_id});
        await glAccount.find(connection);
        await glAccount.delete(connection,{
          deleted_by: contact.id,
        });

        utils.send_response(res, {
          status: 200
        });

      } catch(err){
        next(err)
      }
  });
  
  router.get('/categories', [control.hasAccess(['admin']), Hash.unHash], async(req, res, next) => {
    var connection = res.locals.connection;
    try{
      let categories = await models.GlAccounts.findAllCategories(connection);

      utils.send_response(res, {
        status: 200,
        data: {
          categories: Hash.obscure(categories, req)
        }
      });

    } catch(err){
      next(err)
    }
  });

  router.get('/account-types', [control.hasAccess(['admin']), Hash.unHash], async(req, res, next) => {
    var connection = res.locals.connection;
    try{

      let category_id = req.query.category_id || null;
      let accountTypes = await models.GlAccounts.findTypesByCategoryId(connection,category_id);

      utils.send_response(res, {
        status: 200,
        data: {
          account_types: Hash.obscure(accountTypes, req)
        }
      });

    } catch(err){
      next(err)
    }

  });

  router.get('/account-subtypes', [control.hasAccess(['admin']), Hash.unHash], async(req, res, next) => {
    var connection = res.locals.connection;
    try{
      let account_type_id = req.query.account_type_id || null;
      let accountSubTypes = await models.GlAccounts.findSubTypesByAccountTypeId(connection,account_type_id);
     
      utils.send_response(res, {
        status: 200,
        data: {
          account_subtypes: Hash.obscure(accountSubTypes, req)
        }
      });

    } catch(err){
      next(err)
    }

  });

  router.post('/account/bulk', [control.hasAccess(['admin']),Hash.unHash], async(req, res, next) => {
    var connection = res.locals.connection;
    try{

      const contact = res.locals.contact;
      const company = res.locals.active;
      const body = req.body;
      
      await GlAccount.bulkUpdate(connection,contact,company,body);
      utils.send_response(res, {
        status: 200
      });

    } catch(err){
      next(err)
    }

  });

  router.get('/template/:accounting_template_id/download-je-template', [control.hasAccess(['admin']), Hash.unHash], async(req, res, next) => {
    
    const connection = res.locals.connection;
    const { accounting_template_id } = req.params;

    try{
      
      let buffer = await JournalEvent.downloadTemplate(connection, { accounting_template_id });
    
      utils.send_response(res, {
        status: 200,
        data: {
          buffer: buffer
        }
      });

    }catch(err){
      next(err)
    }
  });

  /* This endpoint is obsolete. We are using reporting module to achieve the functionality*/
  router.get('/exports/history', [control.hasAccess(['admin']), Hash.unHash], async(req, res, next) => {
    
    var connection = res.locals.connection;
    let properties = res.locals.properties;
    let company = res.locals.active;

    try{
      
      let listOfExports = await Accounting.findExportHistory(connection, company.id ,properties);

      utils.send_response(res, {
        status: 200,
        data: {
          exports: Hash.obscure(listOfExports, req)
        }
      });

    }catch(err){
      next(err)
    }
  });

  router.post('/exports/now', [control.hasAccess(['admin']), joiValidator.body( Schema.exportNow), Hash.unHash], async(req, res, next) => {
    
    let contact = res.locals.contact;
    let company_id = res.locals.active.id;
    let body = req.body;
    let company = res.locals.active;

    try{
      let filename = AccountingUtils.generateFileName(body);

      let data = {
        filename,
        owner_id: company.gds_owner_id,
        property_ids: body.property_ids,
        format: body.format,
        type: body.type,
        export_range: body.export_range,
        start_date: moment(body.start_date).isSame(body.end_date)  ? null: body.start_date,
        end_date:  body.end_date,
        generated_by: contact.id,
        ...(body.send_to && {
          send_to: JSON.stringify(body.send_to)
        }),
        timeZone: body.timeZone,
        book_id: body.book_id
      }

      let socket = {
        filename,
        company_id,
        contact_id: contact.id,
        id: "general-ledger-" + moment().format('x'),
        type: "general-ledger"
      }

      await Queue.add('run_export_flow', {
        priority: 1,
        socket,
        company_id,
        ...data,
        cid: res.locals.company_id,
        contact_id: contact.id,

      }, { priority: 1 });

      let result = Hash.obscure(socket, req);
      utils.send_response(res, {
        status: 200,
        data: {
          ...result,
          id:socket.id,
          socket: true
        }
      });

    } catch(err){
      next(err)
    }
  });

  router.post('/exports/scheduled', [control.hasAccess(['admin']), joiValidator.body( Schema.scheduledExport), Hash.unHash], async(req, res, next) => {
    
    var connection = res.locals.connection;
    try {

      const company = res.locals.active;
      const contact = res.locals.contact;
      const body = req.body;

      let exportConfiguration =  new ExportConfigurations(
        {
            ...body,
            company_id: company.id,
            active: 1,
            scheduled_by: contact.id
        });

      await exportConfiguration.save(connection);
      delete exportConfiguration.property_ids
      
      utils.send_response(res, {
        status: 200,
        data: {
          exportConfiguration: Hash.obscure(exportConfiguration, req)
        }
      });

    } catch(err){
      next(err)
    }
  });

  router.put('/exports/scheduled/:config_id', [control.hasAccess(['admin']),joiValidator.body( Schema.scheduledExport),Hash.unHash], async(req, res, next) => {
    var connection = res.locals.connection;
    try{

      const body = req.body;
      const {contact, properties} = res.locals;
      let params = req.params;
      

      let exportConfiguration =  new ExportConfigurations({id:params.config_id});
      await exportConfiguration.find(connection);
      await exportConfiguration.update(connection,{...body, modified_by: contact.id}, properties);
      delete exportConfiguration.property_ids;

      utils.send_response(res, {
        status: 200,
        data: {
          exportConfiguration: Hash.obscure(exportConfiguration, req)
        }
      });

    } catch(err){
      next(err)
    }
  });

  router.delete('/exports/scheduled/:config_id', [control.hasAccess(['admin']),Hash.unHash], async(req, res, next) => {
      var connection = res.locals.connection;
      try{

        const contact = res.locals.contact;
        let params = req.params;

        let exportConfiguration =  new ExportConfigurations({id:params.config_id});
        await exportConfiguration.find(connection);
        await exportConfiguration.delete(connection,{
          deleted_by: contact.id,
        });

        utils.send_response(res, {
          status: 200
        });

      } catch(err){
        next(err)
      }
  });

  router.get('/exports/scheduled', [control.hasAccess(['admin']), Hash.unHash], async(req, res, next) => {
    
    var connection = res.locals.connection;
    let properties = res.locals.properties;
    let company = res.locals.active;

    try{
      
      let listOfExports = await ExportConfigurations.findAll(connection,company.id,properties);

      utils.send_response(res, {
        status: 200,
        data: {
          exports: Hash.obscure(listOfExports, req)
        }
      });

    }catch(err){
      next(err)
    }
  });

  router.get('/download-coa-template', [control.hasAccess(['admin']), Hash.unHash], async(req, res, next) => {
    
    var connection = res.locals.connection;

    try{

      let buffer = await GlAccount.generateTemplate(connection);

      utils.send_response(res, {
        status: 200,
        data: {
          buffer: buffer
        }
      });

    }catch(err){
      next(err)
    }
  });

  router.post('/upload-spreadsheet', [control.hasAccess(['admin'])], async(req, res, next) => {

    var connection = res.locals.connection;

    try{
      
      var company = res.locals.active;
      var contact = res.locals.contact;
      var body = req.body;
      var files = req.files;

      let validate = await GlAccount.validateSpreadsheet(connection,files.file,company,contact);

      utils.send_response(res, {
        status: 200,
        data: {
          accounts: Hash.obscure(validate, req)
        }
      });

    } catch(err){
        next(err)
    }

  });

  router.get('/settings', [control.hasAccess(['admin']),control.hasPermission('accounting_config')], async(req, res, next) => {
    try {
      const connection = res.locals.connection;
      const company = res.locals.active;

      const accounting = new Accounting({ company_id: company.id });
      const accountingSettings = await accounting.getCompanySettings(connection) || {};

      utils.send_response(res, {
        status: 200,
        data: Hash.obscure(accountingSettings, req)
      });
    } catch(err){
      next(err)
    }
  });

  router.post('/settings', [control.hasAccess(['admin'])], async(req, res, next) => {
    try {
      var connection = res.locals.connection;
      const company = res.locals.active;
      const body = req.body;

      await connection.beginTransactionAsync();

      const accounting = new Accounting({ company_id: company.id });
      await accounting.saveSettings(connection, {
				api_info: res,
        settings: body
      });

      await connection.commitAsync();

      utils.send_response(res, {
        status: 200,
        data: 'settings updated'
      });
    } catch(err){
        await connection.rollbackAsync();
        next(err)
    }
  });
  
  router.get('/export-properties', [control.hasAccess(['admin'])], async(req, res, next) => {
    try {
      const { connection, active: company, properties: filteredProperties, contact: loggedInContact }  = res.locals;
      let base_properties = [];

      if(loggedInContact && loggedInContact.id) {
        let contact = new Contact({ id: loggedInContact.id });
        await contact.find(connection, company.id);
        await contact.getRole(connection, company.id);
        base_properties = contact.Properties.map(p => p.id)
      }

      const propertiesWithBooks = await Accounting.getPropertiesAndBooks(connection,{filteredProperties, company_id: company.id, base_properties});

      utils.send_response(res, {
        status: 200,
        data: Hash.obscure(propertiesWithBooks, req)
      });
    } catch(err){
      next(err)
    }
  });

  router.get('/active-processes',  [control.hasAccess(['admin'])], async(req, res, next) => {
    try {
      const { connection } = res.locals;
      const { gl_accounts } = req.query;

      let activeProcesses = [];
      
      if(gl_accounts?.length) {
        activeProcesses = await GlAccount.getActiveProcessesDetails(connection, {gl_accounts});
			}

      utils.send_response(res, {
        status: 200,
        data: Hash.obscure(activeProcesses, req)
      });
    } catch(err){
      next(err)
    }
  });

  router.post('/exports', [control.hasAccess(['admin']), control.hasPermission('accounting_export'), joiValidator.body(Schema.glExport), Hash.unHash], async(req, res, next) => {
    try {
      const connection = res.locals.connection;
      const company = res.locals.active;
      let body = req.body;
      
      let accounting =  new Accounting({company_id: company.id});
      const exports =  await accounting.findGLExports(connection,{
        property_id: body.property_id,
        isSummarized: body.type === 'summarized',
        start_date: body.start_date,
        end_date: body.end_date,
        book_id: body.book_id
      });
      
      utils.send_response(res, {
        status: 200,
        data: Hash.obscure(exports, req)
      });
    } catch(err){
      next(err)
    }
  });

  return router;
};

const AccountingTemplate = require('../classes/accounting/accounting_template');
const Contact = require('../classes/contact');