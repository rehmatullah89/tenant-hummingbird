"use strict";

var models  = require(__dirname + '/../models');
var settings    = require(__dirname + '/../config/settings.js');
var Promise = require('bluebird');

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
        // this.status = data.status || null;
        // this.active = !!data.active;
        // this.account_number = data.account_number;
        this.property_id = data.property_id || null;
        this.created_at = data.created_at || new Date();
        this.created_by = data.created_by || null;
        this.modified_at = data.modified_at || null;
        this.modified_by = data.modified_by || null;
        this.msg = '';
        this.Devices = data.Devices || null;
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
                case 'quickbooks':
                    if(!this.value.qbClass)
                        e.th(400, 'All values are required');
                    break;

            }
            return true;
        })
    }

    async savePreviousConnection(connection, deleted_by) {

        if(!this.id) e.th(400, 'Id is not set');
        if(!this.property_id) e.th('Property id is not set');

        let data = await models.Property.findConnectionById(connection, this.id);
        if(!data) e.th(400, 'Connection not found for this property' );

        delete data.id;
        data.deleted_by = deleted_by
        data.deleted_at = new Date()

        await models.Property.savePreviousConnection(connection, data);
    }

    async deleteConnection(connection){
        
        if(!this.id) throw new Error('Id is not set');
        if(!this.property_id) throw new Error('Property id is not set');
        await models.Property.removeConnectionDevices(connection, this.id)
        // invalidate all payment methods at facility. 
        await models.Property.deleteAutopays(connection,  this.property_id, this.type)
        await models.Property.deleteAllPaymentMethods(connection,  this.property_id, this.type)
        await models.Property.deleteConnection(connection, this.id, this.property_id)
    }

    async save(connection){

        await this.validate();

        let pm = this.getPaymentMethod();
        if(this.name === 'tsys'){
          await pm.generateKey();
          this.value.transactionKey = pm.transactionKey;
        } else if (this.name == 'tenant_payments'){
            await pm.validateCredentials();
        }

        let save = {
            property_id: this.property_id,
            created_at: this.created_at,
            created_by: this.created_by,
            modified_at: this.modified_at,
            modified_by: this.modified_by,
            name: this.name,
            // status: this.status,
            // active: this.active,
            // account_number: this.account_number,
            value: JSON.stringify(this.value),
            type: this.type
        };

        let result = await models.Property.saveConnection(connection, save, this.id)
        if(result.insertId) {
          this.id = result.insertId;
        }

		this.Devices = this.Devices || [];

		let device_ids = this.Devices.filter(d => d.id).map(d => d.id).join(',');

		await models.Property.removeConnectionDevices(connection, this.id, device_ids.replace(/,\s*$/, ""))

		for(let i = 0; i< this.Devices.length; i++){
			let d = this.Devices[i];

			let deviceSave = {
				connection_id: this.id,
				name: d.name,
				ip: d.ip,
                port: d.port,
                identifier: d.identifier
			}
			await this.saveConnectionDevice(connection, deviceSave, d.id)
		}
    }

    async saveConnectionDevice(connection, device, device_id){
        return await models.Property.saveConnectionDevice(connection, device, device_id)
    }

    async find(connection){

        if (!this.id) e.th(500, "Connection ID is not set");
        
        var data = await models.Property.findConnectionById(connection, this.id);
        
        if(!data) e.th(404, "Connection not found" );

        this.property_id = data.property_id;
        this.name = data.name;
        this.type = data.type;
        this.created_at = data.created_at
        this.created_by = data.created_by
        this.modified_at = data.modified_at
        this.modified_by = data.modified_by        
        // this.status = data.status ;
        // this.active = data.active;
        // this.account_number = data.account_number;
        try{
            this.value = JSON.parse(data.value);
        } catch(err){
            e.th(400, "There was a misconfiguration. Please make sure you have entered your payment configuration values properly.")
        }
       
        await this.getDevices(connection);
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
                // this.status = data.status ;
                // this.active = data.active;
                // this.account_number = data.account_number;

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

    getPaymentMethod(pm_result = {}, device_id){

        //if(!this.id) e.th(500, 'ID not set');
        if(!this.type) e.th(500, 'Connection type not set');
   
        if(device_id){
            this.value.Devices = this.Devices;
      }
        
        switch(this.name){
            case 'forte':
                return new Forte(pm_result, this.value, this.name);
            case 'tsys':
                if(this.type === 'card'){
                    if(device_id){
                        // this.value.Devices = this.Devices;
                        return new TsysSwipe(pm_result, this.value, this.name);
                    }
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
                return new Authnet(pm_result, this.value, this.name, this.name);
            case 'amazon':
                return new AmazonPayments(pm_result, this.value, this.name);
            case 'paypal':
                return new Paypal(pm_result, this.value, this.name);

        }
        return e.th(500,"Unknown processor type");
    }

    async getDevices(connection){

        let devices = await models.Property.findConnectionDevices(connection, this.id);
        
        this.Devices = devices.length ? devices : undefined;
    }

    async checkDeviceHeartBeat(connection, paymentMethod, device_id, ip_override){

        this.type = 'card';
        
        let device = this.Devices.find(d => d.id === device_id);
        if(!device) e.th(404, "Device not found");

        let result = await paymentMethod.checkDeviceHeartBeat(device, ip_override)
        console.log("result.ip_address", result.ip)
        console.log("device.ip_address", device.ip)
        if(result.ip_address !== device.ip){
            device.ip = result.ip_address; 
            await this.saveConnectionDevice(connection, device, device.id)
        }

    }

    update(values){
        this.type = values.type;
        this.name = values.name;
        this.value = values.value;
        this.modified_at = new Date();
        this.modified_by = values.modified_by
        // this.status = values.status;
        // this.active = values.active;
        // this.account_number = values.account_number;
        if(typeof values.Devices !== 'undefined') {
			this.Devices = values.Devices || [];
		};

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
var TsysSwipe = require(__dirname + '/./payment_methods/tsys_swipe.js');
var TenantPaymentsCard      = require(__dirname + '/./payment_methods/tenant_payments_card.js');
var TenantPaymentsAch      = require(__dirname + '/./payment_methods/tenant_payments_ach.js');

var Paypal      = require('../classes/payment_methods/paypal.js');
var GooglePayments      = require('../classes/payment_methods/google_payments.js');
var AmazonPayments      = require('../classes/payment_methods/amazon_payments.js');
var ApplePay      = require('../classes/payment_methods/apply_pay.js');

