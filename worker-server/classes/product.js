"use strict";

var models  = require(__dirname + '/../models');
var settings    = require(__dirname + '/../config/settings.js');
var Promise = require('bluebird');
var QB = require('node-quickbooks');
var validator = require('validator')
var moment      = require('moment');
var e  = require(__dirname + '/../modules/error_handler.js');


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
        this.msg = '';
        this.income_subtype = '';
        this.cogs_subtype = '';
        this.concession_subtype = '';
        this.liability_subtype = '';
        this.per_unit_cost = '';
        this.inventory_count = '';
        
        this.Vendor= {};
    }

    validate(){
        return Promise.resolve().then(() => {
            var error = {};
            if (!this.company_id) {
                error = new Error('Invalid company id');
                error.code = 400;
                throw error;
            }
            if (!this.name) {
                error = new Error('Please enter a name for this product');
                error.code = 400;
                throw error;
            }
            if (!this.type) {
                error = new Error('Please choose a product type');
                error.code = 400;
                throw error;
            }
            return true;
        })

    }

    save(connection){
        var _this = this;
        return _this.validate().then(function() {
            var save = {
                company_id: _this.company_id,
                name: _this.name,
                description: _this.description,
                type: _this.type,
                default_type: _this.default_type,
                price: _this.price,
                taxable: _this.taxable,
                qb_income_account: _this.qb_income_account,
                qb_id: _this.qb_id
            };
            return models.Product.save(connection, save, _this.id).then(function(result){
                _this.id = (result.insertId) ? result.insertId: _this.id;
                return true;
            })
        })
    }

    delete(connection){
        var _this = this;
        return models.Product.delete(connection, _this.id);

    }

    async find(connection, property_id){

        if(!this.id) e.th(500, "Product id not set");

        let data = await models.Product.findById(connection, this.id, this.company_id, property_id);
        if(!data) e.th(404, "Product not founds");


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
        this.income_account_id = data.income_account_id || null;
        this.expense_account_id = data.expense_account_id;
        this.concession_account_id = data.concession_account_id;
        this.liability_account_id = data.liability_account_id;
        this.qb_income_account = data.qb_income_account;
        this.qb_id = data.qb_id;
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

    async findProductGlAccount(connection, level = 'corporate'){

        if(!this.id) e.th(500, "Product id not set");
        let glAccount = await models.Accounting.findProductGlAccount(connection, this.id, level);
        this.gl_account_code = glAccount && glAccount.code;
        this.gl_account_name = glAccount && glAccount.name;
        this.gl_account_active = glAccount && glAccount.active;
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
            type: _this.type,
            default_type: _this.default_type,
            taxable: _this.taxable,
            qb_income_account: _this.qb_income_account
        };

        return ret;

    }

    getPrice(connection, property_id, lease){





    }

}

module.exports = Product;