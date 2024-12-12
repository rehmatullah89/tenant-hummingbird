"use strict"
const models = require(__dirname + '/../../models');
const e = require(__dirname + '/../../modules/error_handler.js');
const request = require('request-promise');
const AccessControl = require('./access_control');

const requestWithAutoRetry = require('../autoRetry');

var getNamespace = require('cls-hooked').getNamespace;
var session = getNamespace('gatePortals');

const logger = require(__dirname + '/../../modules/logger.js')
const logging = require(__dirname + '/../../helpers/portalLogging.js')

class SpiderDoor extends AccessControl {

    constructor(facility_id) {
        super(facility_id, 11, 'spiderdoor');

        // Endpoint DEFINITION
        this.endpoint = 'https://providers-api.spiderdoor.com/api/v1';
        this.rental_endpoint = '/rentals';
        this.units_endpoint = '/units';

    }

    async initial_load() {

    }


    async move_in(unit, user) {
        let result = {};


        let reqObj = {
            headers: this.setHeader(),
            uri: this.endpoint + this.rental_endpoint,
            body: {
                id: String(unit.external_id),
                tenant_id: String(user.id),
                tenant_first_name: user.first,
                tenant_last_name: user.last,
                tenant_mobile: user.phone,
                tenant_email: user.email,
                access_code: user.pin,
                balance: '0.0',
                locked: false,
                keypad_zone_id: '0',
                time_zone_id: '0'
            },
            method: 'POST',
            json: true
        }
        await requestWithAutoRetry(reqObj)
            .then(response => { result = response })
            .catch(error => {
                logger.error(`Failed Move-In : ${error}`);
                logger.error(logging.setLogs(error, error.options, session.get('transaction'), 'SpiderDoor move_in error'));
                e.th(error.statusCode, error.toString());
            })
        logger.http(logging.setLogs(result, reqObj, session.get('transaction'), 'SpiderDoor move_in'));
        let returnVal = result && result.unit && result.unit.id;
        return { external_id: returnVal, space_level: true };

    }

    async add_user_to_unit(unit, user) {
        this.move_in(unit, user)
    }

    async update_user_to_unit(unit, user) {

        let spaceDetail = user.Spaces.find(u => u.space_id === unit.id);

        if (spaceDetail && spaceDetail.external_id) {
            await this.updateTenant(user, spaceDetail);
        }
    }

    async move_out(unit, creds, user) {
        let result = {};

        let reqObj = {
            headers: this.setHeader(),
            uri: this.endpoint + this.rental_endpoint + '/' + unit.external_id,
            method: 'DELETE'
        }

        await requestWithAutoRetry(reqObj)
            .then(response => { result = response })
            .catch(error => {
                logger.error(`Failed Move-Out : ${error}`);
                logger.error(logging.setLogs(error, error.options, session.get('transaction'), 'SpiderDoor move_out error'));
                throw error;
            })
        logger.http(logging.setLogs(result, reqObj, session.get('transaction'), 'SpiderDoor move_out'));


    }


async suspend(user, unit) {

    let units = unit && unit.id ? user.Spaces.filter(u => u.space_id === unit.id) : user.Spaces;
    console.log("suspend units => ", units)
    for (let i = 0; i < units.length; i++) {
        if (user.Spaces[i].external_id) {
            await this.suspendTenant(user, units[i].external_id);
        }
    }
}



async unsuspend(user, unit) {

    let units = unit && unit.id ? user.Spaces.filter(u => u.space_id === unit.id) : user.Spaces;
    console.log("unsuspend Units => ", units)
    for (let i = 0; i < units.length; i++) {
        if (units[i].external_id) {
            await this.unSuspendTenant(user, units[i].external_id);
        }
    }
}


async suspendTenant(user, unit_id) {
    let result = {};

    let reqObj = {
        headers: this.setHeader(),
        uri: this.endpoint + this.rental_endpoint + '/' + unit_id,
        body: {
            tenant_id: String(user.id),
            tenant_first_name: user.first,
            tenant_last_name: user.last,
            tenant_mobile: user.phone,
            tenant_email: user.email,
            access_code: user.pin,
            balance: '0.0',
            locked: true,
            keypad_zone_id: '0',
            time_zone_id: '0'
        },
        method: 'PUT',
        json: true
    }

    await requestWithAutoRetry(reqObj)
        .then(response => { result = response })
        .catch(error => {
            logger.error(`Failed Suspend Units : ${error}`);
            logger.error(logging.setLogs(error, error.options, session.get('transaction'), 'SpiderDoor suspend error'));
            e.th(error.statusCode, error.toString());
        })
    logger.http(logging.setLogs(result, reqObj, session.get('transaction'), 'SpiderDoor suspend'));
    return result;
}
async unSuspendTenant(user, unit_id) {
    let result = {};

    let reqObj = {
        headers: this.setHeader(),
        uri: this.endpoint + this.rental_endpoint + '/' + unit_id,
        body: {
            tenant_id: String(user.id),
            tenant_first_name: user.first,
            tenant_last_name: user.last,
            tenant_mobile: user.phone,
            tenant_email: user.email,
            access_code: user.pin,
            balance: '0.0',
            locked: false,
            keypad_zone_id: '0',
            time_zone_id: '0'
        },
        method: 'PUT',
        json: true
    }

    await requestWithAutoRetry(reqObj)
        .then(response => { result = response })
        .catch(error => {
            logger.error(`Failed Unsuspend Units : ${error}`);
            logger.error(logging.setLogs(error, error.options, session.get('transaction'), 'SpiderDoor unsuspend error'));
            e.th(error.statusCode, error.toString());
        })
    logger.http(logging.setLogs(result, reqObj, session.get('transaction'), 'SpiderDoor unsuspend'));
    return result;
}

async create_unit(unit) {

    let result = {};

    let units = [];
    let unitDetails = {
        "units": [
            {
                "id": String(unit.id),
                "name": unit.name,
                "rent_fee": 0
            }
        ]
    }
    let unitsArray = JSON.stringify(unitDetails);


    let reqObj = {
        headers: this.setHeader(),
        uri: this.endpoint + this.units_endpoint,
        body: unitsArray,
        method: 'POST'
    }

    await requestWithAutoRetry(reqObj)
        .then(response => { result = response })
        .catch(error => {
            logger.error(`Failed Create Unit : ${error}`);
            logger.error(logging.setLogs(error, error.options, session.get('transaction'), 'SpiderDoor create_unit error'));
            e.th(error.statusCode, error.toString());
        })
    logger.http(logging.setLogs(result, reqObj, session.get('transaction'), 'SpiderDoor create unit'));
    return unit.id;
}

async get_unit(unit) {

}

async get_unit_overlocks(unit) {

}

async get_unit_users(unit) {

}

async get_users() {

}

async get_user(user) {

}

async get_user_group(user) {

}

async get_facilities() {

    let result = {};

    try {
        result = await request({
            headers: this.setHeader(),
            uri: this.endpoint + '/locations',
            method: 'GET'
        });
        return result && JSON.parse(result);

    } catch (err) {
        console.log(err);
        e.th(err.statusCode, err.toString());
    }

}

async get_facility_details(facility) {

}

async add_user(user) {

}

async update_user(user) {
    for (let i = 0; i < user.Spaces.length; i++) {
        if (user.Spaces[i].external_id) {
            await this.updateTenant(user, user.Spaces[i]);
        } else {
            const updateErr = new Error('unable to update user space: external_id was missing')
            logger.httpError(logging.setLogs(updateErr, updateErr.options, session.get('transaction'), 'SpiderDoor update_user error'));
        }
    }
}

async updateTenant(user, userSpace) {
    let result = {};

    let lockedOut = false;
    if (user.status === 'SUSPENDED') {
        lockedOut = true;
    }

    let reqObj = {
        headers: this.setHeader(),
        uri: this.endpoint + this.rental_endpoint + '/' + userSpace.external_id,
        body: {
            tenant_id: String(user.id),
            tenant_first_name: user.first,
            tenant_last_name: user.last,
            tenant_mobile: user.phone,
            tenant_email: user.email,
            access_code: user.pin,
            balance: '0.0',
            locked: lockedOut,
            keypad_zone_id: '0',
            time_zone_id: '0'
        },
        method: 'PUT',
        json: true
    }

    await requestWithAutoRetry(reqObj)
        .then(response => { result = response })
        .catch(error => {
            logger.error(`Failed Update User : ${error}`);
            logger.error(logging.setLogs(error, error.options, session.get('transaction'), 'SpiderDoor updateTenant error'));
            e.th(error.statusCode, error.toString());
        })
    logger.http(logging.setLogs(result, reqObj, session.get('transaction'), 'SpiderDoor updateTenant'));
    return result && result.rental && result.rental.id;
}

async add_user_to_group(user, group) {

}

async remove_user_from_group(user, group) {

}

async sync() {

}

async get_group(group) {

}

async get_groups() {

}

async create_group(group) {


}


async add_group(group) {

}


setHeader() {
    return {
        "api-key": this.Credentials.api_key,
        "location-id": this.Credentials.site_id,
        "Content-Type": 'application/json'
    }
}


}



module.exports = SpiderDoor;

const SpaceService = require('../../services/spaceService');
const GroupService = require('../../services/groupService');
const UserService = require('../../services/userService');