"use strict";

var models  = require(__dirname + '/../models');
var settings    = require(__dirname + '/../config/settings.js');
var Promise = require('bluebird');
var QB = require('node-quickbooks');
var validator = require('validator')
var moment      = require('moment');
var e  = require(__dirname + '/../modules/error_handler.js');
var Enums = require(__dirname + '/../modules/enums.js');

class Product {

    constructor(data){
        data = data || {};
        this.id = data.id ;
        this.company_id = data.company_id ;
        this.vendor_id = data.vendor_id ;
        this.name = data.name ;
        this.description = data.description ;
        this.status = data.status ;
        this.price = data.price ;
        this.prorate = data.prorate ;
        this.prorate_out = data.prorate_out ;
        this.recurring = data.recurring;
        this.type = data.type ;
        this.product_category_id = data.product_category_id ;
        this.sku = data.sku;
        this.has_inventory = data.has_inventory;
        this.taxable = data.taxable ;
        this.qb_income_account = data.qb_income_account;
        this.qb_token = data.qb_token;
        this.default_type = data.default_type;
        this.amount_type = data.amount_type || 'fixed';
        this.category_type = data.category_type;
        this.income_account_id = data.income_account_id || null;
        this.msg = '';
        this.income_subtype = '';
        this.cogs_subtype = '';
        this.concession_subtype = '';
        this.liability_subtype = '';
        this.per_unit_cost = '';
        this.inventory_count = '';

        this.Vendor = {};
        this.Accounting = {};
        this.ProductCategory = {};
        this.Properties = [];
        this.Rules = [];
    }

    async validate(connection){

      if (!this.company_id) e.th(400, 'Invalid company id');
      if (!this.type) e.th(400, 'Please choose a product type');
      if (!this.name) e.th(400, 'Please choose a name for this product');

      let existing = await models.Product.findByName(connection, this.name, this.company_id)
      if(existing && (!this.id || (this.id && existing.id !== this.id))){
        {
          if (this.default_type === 'late') e.th(409, "A Fee with this name already exists");
          else if (this.default_type === 'insurance') e.th(409, "A Coverage plan with this name already exists");
          else e.th(409, "A Product with this name already exists");
        }
      }
    }

    // TODO lets save inventory in another call.
    async save(connection, contact){

      await this.validate(connection);

      let save = {
        company_id: this.company_id,
        name: this.name,
        description: this.description,
        type: this.type,
        default_type: this.default_type,
        price: this.price,
        taxable: this.taxable,
        prorate: this.prorate,
        prorate_out: this.prorate_out,
        recurring: this.recurring,
        product_category_id: this.product_category_id,
        sku: this.sku,
        has_inventory: this.has_inventory,
        amount_type: this.amount_type,
        category_type: this.category_type || 'service',
        income_account_id: this.income_account_id,
        expense_account_id: this.expense_account_id,
        concession_account_id: this.concession_account_id,
        liability_account_id: this.liability_account_id
      };
      //This code is commented because already event is listen on prouduct_created

      // let product = {
      //   income_subtype : this.income_subtype,
      //   cogs_subtype: this.cogs_subtype,
      //   concession_subtype: this.concession_subtype,
      //   liability_subtype: this.liability_subtype,
      //   per_unit_cost: this.per_unit_cost,
      //   per_unit_price: this.price,
      //   ...save
      // }

      // let account = new Accounting({
      //   company_id: this.company_id
      // });

      // await account.getCompany(this.company_id);

      // if(account.Company){
      //   await account.saveInventory(product, contact);
      // }

      let result = await models.Product.save(connection, save, this.id)
      this.id = (result.insertId) ? result.insertId: this.id;

    }

    async delete(connection){
      let prodProperties = await models.Product.findPropertiesByProduct(connection, this.id);
      for (var i = 0; i < prodProperties.length; i++) {
        await models.Property.deleteProductOverride(connection, prodProperties[i].id)
      }

      await models.Product.delete(connection, this.id);
    }

    async find(connection, property_id){
          if(!this.id) e.th(500, "Product id not set");

          let data = await models.Product.findById(connection, this.id, this.company_id, property_id);
          if(!data) e.th(404, "Product not founds");

          // TODO combine with make..
          this.company_id = data.company_id;
          this.name = data.name;
          this.price = data.price;
          this.description = data.description;
          this.vendor_id = data.vendor_id;
          this.status = data.status;
          this.type = data.type;
          this.default_type = data.default_type;
          this.prorate = data.prorate;
          this.prorate_out = data.prorate_out;
          this.recurring = data.recurring;
          this.taxable = data.taxable;
          this.taxrate = data.taxrate;
          this.sku = data.sku;
          this.has_inventory = data.has_inventory;
          this.amount_type = data.amount_type;
          this.product_category_id = data.product_category_id;
          this.category_type = data.category_type;
          this.income_account_id = data.income_account_id;
          this.expense_account_id = data.expense_account_id;
          this.concession_account_id = data.concession_account_id;
          this.liability_account_id = data.liability_account_id;
    }

    async findByName(connection, company_id){

        if(!this.name) e.th(500, "Name not set");
        let data = await models.Product.findByName(connection, this.name, company_id)

        if(!data) e.th(404, "Product not found");

        // TODO combine with make..
        this.id = data.id;
        this.company_id = data.company_id;
        this.name = data.name;
        this.price = data.price;
        this.description = data.description;
        this.vendor_id = data.vendor_id;
        this.status = data.status;
        this.type = data.type;
        this.sku = data.sku;
        this.has_inventory = data.has_inventory;
        this.product_category_id = data.product_category_id;
        this.default_type = data.default_type;
        this.prorate = data.prorate;
        this.prorate_out = data.prorate_out;
        this.recurring = data.recurring;
        this.taxable = data.taxable;
        this.taxrate = data.taxrate;
        this.qb_income_account = data.qb_income_account;
        this.qb_id = data.qb_id;
        this.amount_type = data.amount_type;
        this.category_type = data.category_type;
    }

    getVendor(connection){

        var _this = this;
        if(!this.id) throw 'No Id is set';

        return models.Vendor.findById(connection, this.vendor_id).then(function(vendor){
            if(!vendor) return;
            console.log(_this.vendor_id);
            _this.Vendor = vendor;
            return true;
        });

    }

    verifyAccess(company_id){
        if(this.company_id !== company_id) {
            var error = new Error("Not authorized");
            error.code = 403;
            throw error;
        }
        return Promise.resolve();
    }

    async update(connection, data) {

        if(this.name.toLowerCase().trim() !== data.name.toLowerCase()){
            let valid = await Product.verifyName(connection, data.name, this.company_id, this.id);
            if(!valid) e.th(409, "A product with this name already exists");
        }

        this.name = data.name.trim();
        this.price = data.price || null;
        this.description = data.description;
        this.sku = data.sku;
        this.has_inventory = data.has_inventory ? 1 : 0;
        this.prorate = data.prorate ? 1 : 0;
        this.prorate_out = data.prorate_out ? 1 : 0;
        this.recurring = data.recurring ? 1 : 0;
        this.taxable = data.taxable ? 1 : 0;
        this.product_category_id = data.product_category_id;
        this.vendor_id = data.vendor_id;
        this.type = data.type || this.type;
        this.default_type = data.default_type || this.default_type;
        this.income_account_id = data.income_account_id,
        this.expense_account_id = data.expense_account_id,
        this.concession_account_id = data.concession_account_id,
        this.liability_account_id = data.liability_account_id,
        this.sku = data.sku;
        this.has_inventory = data.has_inventory;
        this.amount_type = data.amount_type;
        this.category_type = data.category_type;
        this.income_account_id = data.income_account_id;
        this.expense_account_id = data.expense_account_id;
        this.concession_account_id = data.concession_account_id;
        this.liability_account_id = data.liability_account_id;
    }

    make(data, company_id){

        this.company_id = company_id;
        this.name = data.name;
        this.price = data.price || null;
        this.description = data.description;
        this.prorate = data.prorate ? 1 : 0;
        this.prorate_out = data.prorate_out ? 1 : 0;
        this.recurring = data.recurring ? 1 : 0;
        this.taxable = data.taxable ? 1 : 0;
        this.product_category_id = data.product_category_id;
        this.sku = data.sku;
        this.has_inventory = !!data.has_inventory;
        this.amount_type = data.amount_type;
        this.active = 1;
        this.type = data.type;
        this.default_type = data.default_type;
        this.income_account_id = data.income_account_id,
        this.expense_account_id = data.expense_account_id,
        this.concession_account_id = data.concession_account_id,
        this.liability_account_id = data.liability_account_id,
        this.per_unit_cost = data.per_unit_cost;
        this.category_type = data.category_type;

        if(this.has_inventory){
          this.inventory_count = data.inventory_count;
        }

        if (data.qb_income_account) {
            this.qb_income_account = data.qb_income_account;
        }
    }

    values(){
        var _this = this;
        var ret = {
            id: _this.id,
            company_id: _this.company_id,
            name: _this.name,
            description: _this.description,
            status: _this.status,
            price: _this.price,
            prorate: _this.prorate,
            prorate_out: _this.prorate_out,
            recurring: _this.recurring,
            type: _this.type,
            default_type: _this.default_type,
            product_category_id: _this.product_category_id,
            taxable: _this.taxable,
            qb_income_account: _this.qb_income_account
        };

        return ret;

    }

    async updateProperties(connection, properties, rules){

      let prodProperties = await models.Product.findPropertiesByProduct(connection, this.id);

      for (var i = 0; i < properties.length; i++) {
        let result = prodProperties.find(p => p.property_id === properties[i].id);

        let data = {
          product_id: this.id,
          property_id: properties[i].id,
          price: this.price,
          prorate: this.prorate,
          prorate_out: this.prorate_out,
          recurring: this.recurring,
          taxable: this.taxable,
          amount_type: this.amount_type,
          income_account_id: this.income_account_id
        }

        if(!result)
          await models.Property.saveProductOverride(connection, data);
        // Do not update product settings at property level on updating corporate level settings
        // else
        //   await models.Property.saveProductOverride(connection, data,result.id);
        
        if(rules && rules.length){
          rules.map(r => r.id = null);
          await this.updateRules(connection, rules, properties[i].id);

        } 
      }

      for (var j = 0; j < prodProperties.length; j++) {
        let result = properties.find(p => p.id === prodProperties[j].property_id);

        if(!result){
          await models.Property.deleteProductOverride(connection, prodProperties[j].id)
          await models.ProductRule.deleteProductRules(connection, null, this.id, prodProperties[j].property_id);
        }

      }

    }

    async getProperties(connection){
      let prodProperties = await models.Product.findPropertiesByProduct(connection, this.id);
      this.Properties = prodProperties.map(val => {
        return {id: val.property_id};
      });
    }

    async deleteProperty(connection, override_id, property_id){
      if(!override_id && !(this.id && property_id)) e.th(500, "OverrideId or property, product ids are missing");
      await models.Property.deleteProductOverride(connection, override_id, this.id, property_id);
    }

    async updateRules(connection, rules, property_id){

      let rule_ids = rules && rules.length && rules.filter(s => s.id).map(s => s.id).join(',');
      await models.ProductRule.removeRules(connection, this.id, rule_ids && rule_ids.replace(/,\s*$/, ""), { property_id });

      for(let i = 0 ; i < rules.length; i++){
        let data = rules[i];
        let rule = new ProductRule();
        rule.make(data, this.id, property_id);
        await models.ProductRule.save(connection, rule, rule.id);
      }
    }
  
    async getRules(connection, property_id){
      let prodRules = await models.ProductRule.findRulesByProduct(connection, this.id, { property_id });
      this.Rules = prodRules;
    }
  
    async deleteRule(connection, id, property_id){
      if(!id && !(this.id && property_id)) e.th(500, "Id or property, product ids are missing");
      await models.ProductRule.deleteProductRules(connection, id, this.id, property_id);
    }

    async findAccount(connection){

      if(!this.id) e.th(500, "Product id not set");
      let account = await models.Accounting.findAccountByProductId(connection, this.id);
      this.Accounting = account || {
        account_id: '',
        account_number: ''
      };

    }

    async findProductGlAccount(connection, level = 'corporate', property_id){

      if(!this.id) e.th(500, "Product id not set");
      let glAccount = await models.Accounting.findProductGlAccount(connection, level, this.id, property_id);
      this.gl_account_code = glAccount && glAccount.code;
      this.gl_account_name = glAccount && glAccount.name;
      this.gl_account_active = glAccount && glAccount.active;
    }

    async findCategory(connection){
      if(!this.product_category_id) return;
      this.ProductCategory = new ProductCategory({id: this.product_category_id});
      await this.ProductCategory.find(connection);
    }

    async getAccountingDetails(){

      let account = new Accounting({
        company_id: this.company_id
      });

      let details =  await account.getInventoryItem(this.id);
      if(!details.length) return;
      this.income_account_id = details[0].income_account_id;
      this.expense_account_id = details[0].expense_account_id;
      this.concession_account_id = details[0].concession_account_id;
      this.liability_account_id = details[0].liability_account_id;

    }

    setAccountData(data){
      this.Accounting.id = data.id;
      this.Accounting.account_number = data.account_number;
      this.Accounting.account_id = data.account_id;
  }

    async saveAccount(connection, body){

      if(!this.id) e.th(500, "Product id not set");

      let data = await models.Accounting.findAccountByProductId(connection, this.id);
      data = data || {
        product_id: this.id
      }

      data.account_number = this.Accounting.account_number;
      data.account_id = this.Accounting.account_id;

      await models.Accounting.saveProductAccount(connection, data, data.id);

    }

    async usage(connection){
      // Check lease templates
      let templates_usage =  await models.Product.findLeaseTemplateUsage(connection, this.id); 
      let delinquency_usage =  await models.Product.findDelinqunecyUsage(connection, this.id);
      let rent_usage =  await models.Product.findRentUsage(connection, this.id);
      return templates_usage.concat(delinquency_usage, rent_usage);  
    }


    static async verifyName(connection, name, company_id, existing_id){

        let products = await models.Product.findByName(connection, name, company_id)

        if(!products) return true;

        if(products.length && products[0].id == existing_id){
            return true;
        }

        return false;

    }

    static async findByCompanyId(connection, company_id, type, category){
        return await models.Product.findByCompanyId(connection, company_id, type, category ? Enums.CATEGORY_TYPE[category.toUpperCase()]: null);
    }

    static async searchByCompanyId(connection, conditions, company_id){
      return await models.Product.searchByCompanyId(connection, conditions, company_id);
    }

  async findDefault(connection, payload) {
    const { default_type } = payload;
    const product = await models.Product.findDefaultProduct(connection, this.company_id, default_type);
    this.product = product;
    return this.product;
  }

    static async findRentProduct(connection, company_id){
        return await models.Product.findRentProduct(connection, company_id);
    }

    static async findSecurityDepositProduct(connection, company_id){
        return await models.Product.findSecurityDepositProduct(connection, company_id);
    }

    static async findRentAdjustmentProduct(connection, company_id){
      return await models.Product.findRentAdjustmentProduct(connection, company_id);
  }





}

module.exports = Product;
var Accounting  = require(__dirname + '/./accounting.js');
var ProductCategory  = require(__dirname + '/./product_categories.js');
var ProductRule = require(__dirname + '/./product_rules.js');
