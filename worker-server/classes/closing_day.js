"use strict";

var models  = require(__dirname + '/../models');
var settings    = require(__dirname + '/../config/settings.js');
var Promise = require('bluebird');
var validator = require('validator')
var moment      = require('moment');
var validation      = require('../modules/validation.js');
const Property = require('./property.js');
var control    = require(__dirname + '/../modules/site_control.js');
var e  = require(__dirname + '/../modules/error_handler.js');
var Hash = require(__dirname + '/../modules/hashes.js');
var Hashes = Hash.init();
var utils    = require(__dirname + '/../modules/utils.js');

class ClosingDay {
    
    constructor(data){
        this.property_id = data.property_id;
        this.created_at = data.created_at || moment().format('YYYY-MM-DD HH:mm:ss');
        this.date = data.date;
        this.time = data.time;
        this.created_by = data.created_by;
        this.active = data.active || 1;
        this.deleted_by = data.deleted_by;
    }

    async save(connection){

        let save = {
            property_id: this.property_id,
            created_at: this.created_at,
            date: this.date,
            time: this.time,
            created_by: this.created_by,
            active: this.active || 1,
        };

        let result = await models.ClosingDay.save(connection, save, this.id);
        return result;
    }

    async setInactive(connection){

        let update = {
            property_id: this.property_id,
            deleted_by: this.deleted_by,
            active: 0,
        };
        let result = await models.ClosingDay.save(connection, update, this.property_id);
        return result;
    }

    async updateEffectiveDate(connection){

        let property = new Property({id: this.property_id});
        let effective_date = await property.getLocalCurrentDate(connection);
        let current_effective_date = moment(effective_date).add(1, 'days').format('YYYY-MM-DD');

        await models.ClosingDay.updateInvoiceEffectiveDate(connection, current_effective_date, effective_date, this.property_id);
        await models.ClosingDay.updatePaymentsEffectiveDate(connection, current_effective_date, effective_date, this.property_id);
        await models.ClosingDay.updateRefundsEffectiveDate(connection, current_effective_date, effective_date, this.property_id);
        await models.ClosingDay.updateInvoicesPaymentsBreakdownEffectiveDate(connection, current_effective_date, effective_date, this.property_id);
        await models.ClosingDay.updateInvoiceLinesAllocationEffectiveDate(connection, current_effective_date, effective_date, this.property_id);
    }
}

module.exports = ClosingDay;