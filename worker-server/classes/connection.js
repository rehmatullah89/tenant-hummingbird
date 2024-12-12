"use strict";

var models  = require(__dirname + '/../models');
var settings    = require(__dirname + '/../config/settings.js');
var Promise = require('bluebird');
var QB = require('node-quickbooks');
var validator = require('validator');
var moment      = require('moment');
var e  = require(__dirname + '/../modules/error_handler.js');
var request = require('request-promise');

class Connection {

    constructor(data){

        data = data || {};
        this.id = data.id || null;
        this.name = data.name || null;
        this.value = data.value || null;
        this.type = data.type || null;
        this.property_id = data.property_id || null;
        this.msg = '';
    }

    validate(){
        return Promise.resolve().then(() => {
            if (!this.property_id) e.th(400, 'Property id missing');
            if (!this.name) e.th(400, 'Name is missing');
            if (!this.type) e.th(400, 'Type is missing');
            switch (this.name) {
                case 'forte':
                    if(!this.value.forteLocationId)
                        e.th(400, 'All values are required');
                    break;
                case 'authroizenet':
                    if(!this.value.authnetLogin || !_this.value.authnetKey)
                        e.th(400, 'All values are required');
                    break;
                    break;
                case 'quickbooks':
                    if(!this.value.qbClass)
                        e.th(400, 'All values are required');
                    break;
                    break;
            }
            return true;
        })
    }

    deleteConnection(connection){
        var _this = this;


        return Promise.resolve().then(function() {

            if(!_this.id) throw new Error('Id is not set');
            if(!_this.property_id) throw new Error('Property id is not set');
            return models.Property.deleteConnection(connection, _this.id, _this.property_id).then(function(result){
                return true;
            });

        }).catch(function(err){
            console.log(err);
            _this.msg = err.toString();
            return false;
        })
    }

    async save(connection){

        await this.validate();

        if(this.name === 'tsys'){
            let pm = this.getPaymentMethod();
            await pm.generateKey();
            this.value.transactionKey = pm.transactionKey;
        }

        let save = {
            property_id: this.property_id,
            name: this.name,
            value: JSON.stringify(this.value),
            type: this.type
        };

        let result = await models.Property.saveConnection(connection, save, this.id)
        if(result.insertId) {
            this.id = result.insertId;
        }
    }

    find(connection){

        if (!this.id) e.th(500, "Connection ID is not set");

        return models.Property.findConnectionById(connection, this.id)
            .then(data => {
                if(!data) e.th(404, "Connection not found" );

                this.property_id = data.property_id;
                this.name = data.name;
                this.type = data.type;
                try{
                    this.value = JSON.parse(data.value);
                } catch(err){
                    e.th(400, "There was a misconfiguration. Please make sure you have entered your payment configuration values properly.")
                }
                return true;

            });
    }

    findByType(connection, property_id, type){

        if (!property_id) e.th(500, "Property ID is not set");
        if (!type) e.th(500, "Type is not set");

        return models.Property.findConnections(connection, property_id, type)
            .then(payment_connections => {
                if(!payment_connections.length)  e.th(404, "Resource not found");
                var data = payment_connections[0];

                this.id = data.id;
                this.name = data.name;

                try{
                    this.value = JSON.parse(data.value);
                } catch(err){
                    e.th(400, "There was a misconfiguration. Please make sure you have entered your payment configuration values properly.")
                }
                this.type = data.type;
                this.property_id = data.property_id;
                return true;
            })
    }

    getPaymentMethod(pm_result = {}){

        //if(!this.id) e.th(500, 'ID not set');
        if(!this.type) e.th(500, 'Connection type not set');

        switch(this.name){
            case 'forte':
                return new Forte(pm_result, this.value, this.name);
            case 'tsys':
                if(this.type === 'card'){
                    return new TsysCard(pm_result, this.value, this.name);
                }
                if(this.type === 'ach'){
                    return new TsysAch(pm_result, this.value, this.name);
                }
                return e.th(500,"Unknown processor type");
            case 'tenant_payments':
                if(this.type === 'ach'){
                    return new TenantPaymentsAch(pm_result, this.value, this.name);
                } else if(this.type === 'card') {
                    return new TenantPaymentsCard(pm_result, this.value, this.name);
                }
                return e.th(500,"Unknown processor type");
            case 'authorizenet':
                return new Authnet(pm_result, this.value, this.name);
            case 'amazon':
                return null;
               // return new AmazonPayments(pm_result, this.value, this.name);
            case 'paypal':
                return new Paypal(pm_result, this.value, this.name);
        }


    }

    update(values){
        this.type = values.type;
        this.name = values.name;
        this.value = values.value;


        return Promise.resolve();
    }

    verifyAccess(property_id){

        if(this.property_id !== property_id) {
            var error = new Error("Not authorized");
            error.code = 403;
            throw error;
        }
        return Promise.resolve();
    }

    // This is a function to get any additional configuration parameters from the payment method object.  Specifically, this is used to a get token for the Tsys Transit Form Fields
    async getCredentials(){

        let pm = this.getPaymentMethod();
        try {
            return await pm.getCreds();
        } catch (err){
            console.log(err);
        }
        return null;

    }

}

module.exports = Connection;


var Authnet = require(__dirname + '/./payment_methods/authnet.js');
var Forte = require(__dirname + '/./payment_methods/forte.js');
var TsysAch = require(__dirname + '/./payment_methods/tsys_ach.js');
var TsysCard = require(__dirname + '/./payment_methods/tsys_card.js');
var TenantPaymentsCard = require(__dirname + '/./payment_methods/tenant_payments_card.js');
var TenantPaymentsAch = require(__dirname + '/./payment_methods/tenant_payments_ach.js');

var Paypal      = require('../classes/payment_methods/paypal.js');
var GooglePayments      = require('../classes/payment_methods/google_payments.js');
// var AmazonPayments      = require('../classes/payment_methods/amazon_payments.js');
var ApplePay      = require('../classes/payment_methods/apply_pay.js');

