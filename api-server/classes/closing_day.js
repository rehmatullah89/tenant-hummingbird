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
        data = data || {};
        this.id = data.id;
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

        let result = await models.Closing_Day.save(connection, save, this.id);
        return result;
    }

    async find(connection, params){
        let closing_day = {};
		if(!this.id && !params) {
		  e.th(500, 'Either closing_day ID or params are not set');
		}

		if(this.id){
            closing_day = await models.Closing_Day.findById(connection, this.id);
		} else {
            closing_day = await models.Closing_Day.findByParams(connection, params);
		}

		if (!closing_day) e.th(404,"Closing day data not found." );

        this.id = closing_day.id;
		this.property_id = closing_day.property_id;
        this.date = closing_day.date;
        this.time = closing_day.time;
        this.active = closing_day.active;
    }

    async setInactive(connection, deleted_by){

        let update = {
            deleted_by,
            active: 0,
        };
        let result = await models.Closing_Day.save(connection, update, this.id);
        return result;
    }

    async updateEffectiveDate(connection){

        let property = new Property({id: this.property_id});
        let effective_date = await property.getLocalCurrentDate(connection);
        let current_effective_date = moment(effective_date).add(1, 'days').format('YYYY-MM-DD');

        await models.Closing_Day.undoEffectiveDates(connection, current_effective_date, effective_date, this.property_id);
    }
}

module.exports = ClosingDay;