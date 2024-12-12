'use strict';

const moment = require('moment');

class AccountingTemplate {
	constructor(data = {}) {
		this.assembleAccountingTemplate(data);
	}

	assembleAccountingTemplate(data) {
		const { id, name, is_default, company_id, created_at, created_by, modified_at, modified_by, deleted_at, deleted_by, AccountingSetup, Properties, GlEvents, DefaultSubTypeAccounts } = data;
		
		this.id = id;
		this.name = name;
		this.is_default = is_default || 0;
		this.company_id = company_id;
		this.created_at = created_at;
		this.created_by = created_by;
		this.modified_at = modified_at;
		this.modified_by = modified_by;
		this.deleted_at = deleted_at;
		this.deleted_by = deleted_by;

		this.AccountingSetup = AccountingSetup;
		this.Properties = Properties;
		this.GlEvents = GlEvents;
		this.DefaultSubTypeAccounts = DefaultSubTypeAccounts;
	}

	async find(connection, payload) {
		const { filters } = payload;
		
		let templates = await models.AccountingTemplate.find(connection, { filters });
		if(templates.length) {
			this.assembleAccountingTemplate(templates[0]);
			return templates[0];
		}
	}

	async findAccountingSetup(connection, payload = {}) {
		const { filters } = payload;
		
		let setup = await models.Accounting.findAccountingSetup(connection, { filters });
		if(setup?.length) {
			this.AccountingSetup = setup[0];
			return setup[0];
		}
	}

	async findAccountingDefaultSubtypes(connection, payload) {
		const { filters, params = {} } = payload;
		const { fetch_accounts = false } = params;

		let defaultSubTypes = [];
		
		if(fetch_accounts) {
			defaultSubTypes = await models.AccountingTemplate.getTemplateDefaultSubTypeAccountsDetails(connection, { accounting_template_id: this.id });
		} else {
			defaultSubTypes = await models.AccountingTemplate.findAccountingDefaultSubtypes(connection, { filters });
		}

		if(defaultSubTypes?.length) {
			this.DefaultSubTypeAccounts = defaultSubTypes;
			return defaultSubTypes;
		}
	}

	async findDetails(connection, payload) {
		const { filters, params = {} } = payload;
		const { fetch_accounts, fetch_template, fetch_setup, fetch_events, fetch_default_sub_types } = params;
		
		await this.find(connection, { filters });

		if(fetch_setup) { 
			await this.findAccountingSetup(connection, { 
				filters: { accounting_template_id: this.id } 
			}) 
		};

		if(fetch_default_sub_types) { 
			await this.findAccountingDefaultSubtypes(connection, { 
				filters: { accounting_template_id: this.id },
				params: { fetch_accounts } 
			}) 
		};

		if(fetch_events) { 
			this.GlEvents = await JournalEvent.findAllEvents(connection, this.id, { fetch_accounts }) 
		};
	}

  static async findAllTemplates(connection, payload) {
		let templates = await models.AccountingTemplate.findDetails(connection, { ...payload });
		if(!templates?.length) {
			return {};
		}

		const propertyIdsSet = new Set();
		const accountingSetupIdsSet = new Set();

		for(let i = 0; i < templates.length; i++) {
			const propertyIds = templates[i].property_ids?.split(',');
			propertyIds?.forEach(propertyIdsSet.add, propertyIdsSet);

			const accountingSetupId = templates[i].accounting_setup_id;
			if(accountingSetupId) {
				accountingSetupIdsSet.add(accountingSetupId);
			}
		}

		const templatesProperties = propertyIdsSet?.size ? await Property.findInBulk(connection, [...propertyIdsSet]) : [];
		const templatesSetups = accountingSetupIdsSet?.size ? await Accounting.findAccountingSetup(connection, { filters: { 
			id: [...accountingSetupIdsSet]}
		}) : [];

		const templateObjs = [];
		for(let i = 0; i < templates.length; i++) {
			const setup = templates[i].accounting_setup_id ? templatesSetups.filter(s => s.id === templates[i].accounting_setup_id)[0] : {};
			
			const templatePropertyIds = templates[i].property_ids?.split(',');
			const properties = templatePropertyIds?.length ? templatesProperties.filter(tp => templatePropertyIds.some(p => tp.id == p)) : [];

			const template = new AccountingTemplate({ 
				...templates[i],
				Properties: properties,
				AccountingSetup: setup
			});

			templateObjs.push(template);
		}

		return templateObjs;
	}

  async save(connection, payload) {
    const { accounting_template } = payload;

		let templates = await models.AccountingTemplate.findByOR(connection, {
      filters: { 
        name: accounting_template.name,
        company_id: accounting_template.company_id,
				is_default: 1
      }
    });

		if(templates?.length) {
			const isNameAlreadyPresent = templates.find(t => t.name == accounting_template.name && t.id != accounting_template.id);
			const isDefaultAlreadyPresent = templates.find(t => t.is_default == 1 && t.id != accounting_template.id) && accounting_template.is_default == 1; 
			const isTemplatePresent = (isNameAlreadyPresent || isDefaultAlreadyPresent) ? true : false;
			if(isTemplatePresent) {
				e.th(409, 'Template with this configuration already exists, make sure name is unique and default template is not already setup.');
			}
		}

		let result = await models.AccountingTemplate.save(connection, { data: accounting_template });

		this.id = this.id || result.insertId;
		return this.id;
	}
  
  async create(connection) {
    const accountingTemplate = {
			id: this.id,
			name: this.name,
			company_id: this.company_id,
			is_default: this.is_default,
			created_by: this.created_by,
			modified_by: this.modified_by,
			deleted_at: this.deleted_at,
			deleted_by: this.deleted_by
		};

    return await this.save(connection, { accounting_template: accountingTemplate });
  }

  async update(connection) {
    const accountingTemplate = {
      id: this.id,
			name: this.name,
			company_id: this.company_id,
			modified_by: this.modified_by
		};

    return await this.save(connection, { accounting_template: accountingTemplate });
  }

  async removeDefaultSubtypeAccountsOfTemplate(connection, payload){
		await models.AccountingTemplate.removeDefaultSubtypeAccountsOfTemplate(connection, payload);
  }

  async delete(connection) {
    const accountingTemplate = {
      id: this.id,
			modified_by: this.modified_by,
      deleted_by: this.deleted_by,
      deleted_at: moment().format('YYYY-MM-DD HH:mm:ss'),
		};

	let propertyUsingTemplate = await models.AccountingTemplate.findPropertyTemplate(connection, {filters: {accounting_template_id: this.id }});
	if(propertyUsingTemplate.length){
		e.th(400, 'Some property is using this template. Cannot delete it right now.')
	}

    return this.save(connection, { accounting_template: accountingTemplate });
  }

	async setupAccountingType(connection) {
		let setup = await models.AccountingTemplate.findAccountingSetup(connection, { filters: {
			accounting_template_id: this.AccountingSetup.accounting_template_id
		}});

		if(setup?.length) {
      e.th(409, 'Accounting is already setup against this template');
    }

		await models.AccountingTemplate.saveDefaultAccountingEvents(connection, {
			company_id: this.AccountingSetup.company_id,
			book_id: this.AccountingSetup.book_id,
			accounting_template_id: this.AccountingSetup.accounting_template_id
		});

    await models.AccountingTemplate.saveAccountingSetup(connection, {
			data: this.AccountingSetup
		});

		await this.addTemplateDefaultSubTypeAccounts(
			connection,{
				accounting_template_id: this.AccountingSetup.accounting_template_id, 
				admin_id: this.AccountingSetup.created_by
			}
		);
	}

	computeAddedAndDeletedBookId(payload) {
		const { current_accounting_setup } = payload;
		const currentBookId = current_accounting_setup.book_id;
		const newBookId = this.AccountingSetup.book_id;
		let addedBookId = '', deletedBookId = '';

		if(newBookId == ENUMS.ACCOUNTING_TYPE.DOUBLE_BOOK) {
			addedBookId = currentBookId == ENUMS.ACCOUNTING_TYPE.CASH_BOOK ? ENUMS.ACCOUNTING_TYPE.ACCRUAL_BOOK : ENUMS.ACCOUNTING_TYPE.CASH_BOOK;
		} else {
			if(currentBookId != ENUMS.ACCOUNTING_TYPE.DOUBLE_BOOK) {
				addedBookId = newBookId;
			}

			deletedBookId = newBookId == ENUMS.ACCOUNTING_TYPE.CASH_BOOK ? ENUMS.ACCOUNTING_TYPE.ACCRUAL_BOOK : ENUMS.ACCOUNTING_TYPE.CASH_BOOK;
		}

		return { addedBookId, deletedBookId };
	}

	async updateAccountingType(connection) {
		const updateAccountingBooks = async (payload) => {
			const { currentAccountingSetup } = payload;
	
			await models.Accounting.deleteAccountingSetupById(connection, currentAccountingSetup.id, this.AccountingSetup.created_by);
			await models.AccountingTemplate.saveAccountingSetup(connection, {
				data: this.AccountingSetup
			});
		}

		const updateAccountingEvents = async (payload) => {
			const { currentAccountingSetup } = payload;
	
			const { addedBookId, deletedBookId } = this.computeAddedAndDeletedBookId({
				current_accounting_setup: currentAccountingSetup 
			});
	
			if (deletedBookId) {
				const glEventCompany = await models.AccountingTemplate.findAccountingEvents(connection, {
					filters: {
						accounting_template_id: this.AccountingSetup.accounting_template_id,
						book_id: deletedBookId
					}
				});
	
				await models.AccountingTemplate.deleteAccountingEvents(connection, {
					gl_event_company_ids: glEventCompany.map(e => e.id),
					admin_contact_id: this.AccountingSetup.created_by
				});
			}
	
			if (addedBookId) {
				await models.AccountingTemplate.saveDefaultAccountingEvents(connection, {
					company_id: this.AccountingSetup.company_id,
					book_id: addedBookId,
					accounting_template_id: this.AccountingSetup.accounting_template_id
				});
			}
		}

		const setup = await models.AccountingTemplate.findAccountingSetup(connection, { filters: {
			accounting_template_id: this.AccountingSetup.accounting_template_id
		}});

		if(!setup?.length) {
			console.log(`Setting up accounting type for template ${this.accounting_template_id}`);
			await this.setupAccountingType(connection);
			return;
      // e.th(409, 'Accounting is not setup against this template');
    }

		let currentAccountingSetup = setup[0];
		const isBookUpdated = this.AccountingSetup.book_id != currentAccountingSetup.book_id;
		if(!isBookUpdated) {
			return;
		}
		
		await updateAccountingEvents({ currentAccountingSetup }); 
		await updateAccountingBooks({ currentAccountingSetup });
	}

  async findUniqueCopyName(connection){
    let copyNumber = 1;
    let templateCopies =  await models.AccountingTemplate.findTemplateCopies(connection,{template_name: this.name});
    if(templateCopies.length){
      let copiesCount = templateCopies.map(t => parseInt(t.name.match(/\d/g)[0]));
      copyNumber = Math.max(...copiesCount) + 1;
    }
    return `Copy${copyNumber} - ${this.name}`;
  }

	async duplicateTemplate(connection, payload) {
		const { admin_contact, uniqueCopyName } = payload;
		const newAccountingTemplate = new AccountingTemplate({
			name: uniqueCopyName,
			is_default: 0,
			company_id: this.company_id,
			created_by: admin_contact.id,
			modified_by: admin_contact.id
		});
		
		await newAccountingTemplate.create(connection);
		return newAccountingTemplate;
	}

	async duplicateAccountingSetup(connection, payload) {
		const { admin_contact, new_accounting_template } = payload;
		await this.findAccountingSetup(connection, { filters: { accounting_template_id: this.id }});
		
		if(this.AccountingSetup?.id) {
			await models.AccountingTemplate.saveAccountingSetup(connection, {
				data: { 
					book_id: this.AccountingSetup.book_id,
					company_id: this.AccountingSetup.company_id,
					description: this.AccountingSetup.description,
					active: 1,
					created_by: admin_contact.id,
					accounting_template_id: new_accounting_template.id 
				}
			});
		}
	}

	async duplicateAccountingEvents(connection, payload) {
		const { admin_contact, new_accounting_template } = payload;

		this.GlEvents = await JournalEvent.findAllEvents(connection, this.id);
		const glEvents = [], glOverrides = [];

		this.GlEvents.map(async ge => {
			const glEventObj = {
				gl_event_id: ge.gl_event_id, 
				book_id: ge.book_id, 
				company_id: ge.company_id, 
				gl_account_credit_id: ge.gl_account_credit_id, 
				gl_account_debit_id: ge.gl_account_debit_id, 
				active: 1, 
				accounting_template_id: new_accounting_template.id
			};

			if(!ge.Overrides?.length) {
				glEvents.push(glEventObj);
			} else {
				const glEvent = new JournalEvent(glEventObj);
				await glEvent.create(connection);

				ge.Overrides.map(o => {
					glOverrides.push({
						company_id: o.company_id,
						gl_event_company_id: glEvent.id,
						product_id: o.product_id,
						credit_debit_type: o.credit_debit_type,
						actual_gl_account_id: o.actual_gl_account_id,
						override_gl_account_id: o.override_gl_account_id,
						active: o.active,
						created_by: admin_contact.id,
						product_type: o.product_type
					});
				});
			}
		});

		if(glEvents.length) {
			await models.Accounting.bulkSaveGlEvents(connection, { data: glEvents });
		}

		if(glOverrides.length) {
			await models.Accounting.bulkSaveGlEventOverrides(connection, { data: glOverrides });
		}
	}

	async duplicateAccountingDefaultSubTypes(connection, payload) {
		const { admin_contact, new_accounting_template } = payload;

		await this.findAccountingDefaultSubtypes(connection, { filters: { accounting_template_id: this.id } });
		if (this.DefaultSubTypeAccounts?.length) {
			const defaultSubTypes = [];
			this.DefaultSubTypeAccounts.map(d => {
				defaultSubTypes.push({
					gl_account_id: d.gl_account_id,
					accounting_template_id: new_accounting_template.id,
					gl_default_subtype_id: d.gl_default_subtype_id,
					created_by: admin_contact.id,
					modified_by: admin_contact.id
				});
			});

			await models.Accounting.bulkSaveGlDefaultAccounts(connection, { data: defaultSubTypes });
		}
	}

	async duplicate(connection, payload) {
		const { admin_contact } = payload;

		await this.find(connection, { filters: { id: this.id }});		

    const uniqueCopyName = await this.findUniqueCopyName(connection);
		const newAccountingTemplate = await this.duplicateTemplate(connection, { admin_contact, uniqueCopyName });
		await this.duplicateAccountingSetup(connection, { admin_contact, new_accounting_template: newAccountingTemplate });
		await this.duplicateAccountingEvents(connection, { admin_contact, new_accounting_template: newAccountingTemplate });
		await this.duplicateAccountingDefaultSubTypes(connection, { admin_contact, new_accounting_template: newAccountingTemplate });
	}

  async addTemplateDefaultSubTypeAccounts(connection, payload){
		return await models.AccountingTemplate.addTemplateDefaultSubTypeAccounts(connection, payload);
  }

  async updateTemplateDefaultSubTypeAccounts(connection,payload){
		const { admin_id } = payload;

		let existingDefaultSubTypeAccounts = await models.AccountingTemplate.getTemplateDefaultSubTypeAccounts(connection, {filters : {accounting_template_id: this.id}});
		let defaultSubTypeAccounts = payload.default_subtype_accounts;
		let updateDefaultSubTypeAccounts = [];

		defaultSubTypeAccounts.forEach(a => {
			let defaultAccount = existingDefaultSubTypeAccounts.find(d => d.id === a.gl_template_default_account_id);
			if(defaultAccount && defaultAccount.gl_account_id != a.gl_account_id){
				updateDefaultSubTypeAccounts.push(
					{
						id: a.gl_template_default_account_id, 
						gl_account_id: a.gl_account_id, 
						accounting_template_id: defaultAccount.accounting_template_id,
						gl_default_subtype_id: defaultAccount.gl_default_subtype_id,
						created_by: defaultAccount.created_by,
						modified_by: admin_id
					}
				);
			}
		});
	
		if(updateDefaultSubTypeAccounts.length) await models.AccountingTemplate.updateTemplateDefaultSubTypeAccounts(connection,updateDefaultSubTypeAccounts);
  }

  async removePropertiesFromOtherTemplates(connection, payload){
		await models.AccountingTemplate.removePropertiesFromOtherTemplates(connection, payload);
  }

  async addPropertiesForTemplate(connection, payload){
		await models.AccountingTemplate.addPropertiesForTemplate(connection, payload);
  }

  async movePropertiesToDefaultTemplate(connection, payload){
	  await models.AccountingTemplate.movePropertiesToDefaultTemplate(connection, payload);
  }

  async updateProperties(connection, payload){
		const { admin_id, company_id } = payload;
		let propertiesTemplates = [];
		let propertiesToUpdate = [];
		let propertiesToKeep = [];
		let propertiesToRemove = [];
		let propertiesToDefault = [];

		let selectedPropertiesIds = this.Properties.map(m => m.id);

		let propertiesInTemplate = await models.AccountingTemplate.findPropertyTemplate(connection, {filters: {accounting_template_id: this.id}});
		propertiesInTemplate = propertiesInTemplate.map(pt => pt.property_id);
	
		if(propertiesInTemplate.length){
			propertiesToRemove = propertiesInTemplate.filter(s => !selectedPropertiesIds.includes(s));
			propertiesToDefault = [...propertiesToRemove];
		}

		if(selectedPropertiesIds.length){
			propertiesTemplates = await models.AccountingTemplate.findPropertyTemplate(connection, {filters: {property_id: selectedPropertiesIds}});
			if(propertiesTemplates.length){
				propertiesTemplates.forEach(pt => {
					if(pt.accounting_template_id != this.id){
						propertiesToRemove.push(pt.property_id);
					}else{
						propertiesToKeep.push(pt.property_id);
					}

				});
			}
			propertiesToUpdate = selectedPropertiesIds.filter(p => !propertiesToKeep.includes(p));
		}

		if(propertiesToRemove.length)	await this.removePropertiesFromOtherTemplates(connection, {propertiesToRemove, admin_id, deleted_at: moment().format('YYYY-MM-DD HH:mm:ss')});
		if(propertiesToUpdate.length) await this.addPropertiesForTemplate(connection,{propertiesToUpdate, admin_id, accounting_template_id: this.id});
		if(propertiesToDefault.length) await this.movePropertiesToDefaultTemplate(connection, {propertiesToDefault, admin_id, company_id});
	
  }

	async updatePropertiesTrannum(connection, payload){
		let {properties} = payload;
		let prop_ids = properties.map(p =>p.id);

		if(!prop_ids.length) return;
		let non_exist_props = await models.GL_Export.hasProperties(connection, {properties: prop_ids});
		if(!non_exist_props.length) return;

		let data = [];
		non_exist_props.map(p => data.push({property_id: p.id, trannum: 1}));

		await models.GL_Export.addPropertiesTrannum(connection, data);
	}
}

module.exports = AccountingTemplate;

const e = require('../../modules/error_handler');
const models = require('../../models');
const ENUMS = require('../../modules/enums');

const Property = require('../property');
const JournalEvent = require('../journal_event');
const GlAccount = require('../gl_account.js');
const Accounting = require('../accounting');
