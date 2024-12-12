"use strict"
const models = require(__dirname + '/../../models');
const e = require(__dirname + '/../../modules/error_handler.js');
const request = require('request-promise');
const moment = require('moment');
const utils = require('../utils');
const AccessControl = require('./access_control');

const requestWithAutoRetry = require('../autoRetry');

var getNamespace = require('cls-hooked').getNamespace;
var session = getNamespace('gatePortals');

const logger = require(__dirname + '/../../modules/logger.js')
const logging = require(__dirname + '/../../helpers/portalLogging.js')

class PtiCloud extends AccessControl {

    constructor(facility_id) {
        super(facility_id, 2, 'pti_cloud');

        this.endpoint = process.env.PTI_AUTH_URL;
        this.clientId = process.env.PTI_CLIENT_ID;
        this.api_key = process.env.PTI_API_KEY;
        this.token_endpoint = 'authtoken'
        this.name = 'PTI';
        this.units_endpoint = 'units'
        this.users_endpoint = 'users'
    }

    getBearerValue() {
        return `Bearer ${this.Credentials.token}`
    }

    async create_unit(unit) {
        await this.renewCredentials();

        let response = {};

        try {
            let reqObj = {
                method: 'POST',
                uri: `${this.endpoint}/${this.units_endpoint}/add`,
                headers: {
                    Authorization: this.getBearerValue()
                },
                form: {
                    UnitName: unit.name,
                    UnitDescription: unit.name,
                    AccessAreaId: 1,
                    LightingAreaId: 0,
                    Rearmtime: 60,
                    StopRearmWithDoorOpen: true
                }
            }

            await requestWithAutoRetry(reqObj)
            .then( result => { response = result })
            .catch( error => {
                logger.error(`Failed create unit: ${error}`)
            })
            logger.http(logging.setLogs(response, reqObj, session.get('transaction'), 'PTI_cloud create'));
            let responseObj = JSON.parse(response);
            return responseObj && responseObj.ResultCode;
        } catch (err) {
            logger.httpError(logging.setLogs(err, err.options, session.get('transaction'), 'PTI_cloud create_unit error'));
            e.th(err.statusCode, err.toString());
        }
    }

    async update_user(user, existingPin) {
        await this.renewCredentials();

        let response = {};

        logger.info("update_user existing pin => " + existingPin)
        
        if (existingPin != null && existingPin != user.pin) {
            let cardIds = [];
            await this.getUserCards(user.external_id)
            .then( response => { cardIds = response })
            .catch( error => { console.log('Error Getting User Card IDs', error)})
            if(cardIds.length)
            for (let cardId of cardIds) {
                await this.deleteUserCard(cardId);
            }
        }

        try {
            let reqObj = {
                method: 'PUT',
                uri: `${this.endpoint}/${this.users_endpoint}/edit/${user.external_id}`,
                headers: {
                    Authorization: this.getBearerValue()
                },
                form: {
                    FirstName: user.first,
                    LastName: user.last,
                    EmailAddress: user.email,
                    MobilePhone: user.phone,
                    AccessCode: user.pin,
                }
            }

            await requestWithAutoRetry(reqObj)
            .then( result => { response = result })
            .catch( error => { logger.error(`Failed Update User: ${error}`) })

            logger.http(logging.setLogs(response, reqObj, session.get('transaction'), 'PTI_cloud update_user'));
        } catch (err) {
            logger.httpError(logging.setLogs(err, err.options, session.get('transaction'), 'PTI_cloud update_user error'));
            e.th(err.statusCode, err.toString());
        }

    }

    async update_card(user) {
        await this.renewCredentials();

        let response = {};

        logger.info("update_card updated pin => " + user.pin)

        try {
            let reqObj = {
                method: 'PUT',
                uri: `${this.endpoint}/${this.users_endpoint}/edit/${user.external_id}`,
                headers: {
                    Authorization: this.getBearerValue()
                },
                form: {
                    FirstName: user.first,
                    LastName: user.last,
                    EmailAddress: user.email,
                    MobilePhone: user.phone,
                    AccessCode: user.pin,
                }
            }

            await requestWithAutoRetry(reqObj)
                .then(result => { response = result })
                .catch(error => { logger.error(`Failed Update User card: ${error}`) })

            logger.http(logging.setLogs(response, reqObj, session.get('transaction'), 'PTI_cloud update_card'));
        } catch (err) {
            logger.httpError(logging.setLogs(err, err.options, session.get('transaction'), 'PTI_cloud update_card error'));
            e.th(err.statusCode, err.toString());
        }
    }

    async getUserCards(user_id) {

        let cards = [];

        let response = {};

        try {
            let reqObj = {
                method: 'GET',
                uri: `${this.endpoint}/${this.users_endpoint}/${user_id}/cards`,
                headers: {
                    Authorization: this.getBearerValue()
                },
            }

            await requestWithAutoRetry(reqObj)
            .then( result => { response = result })
            .catch( error => { 
                logger.error(`Failed Getting User Cards : ${error}`);
                logger.http(logging.setLogs(response, reqObj, session.get('transaction'), 'PTI_cloud getUserCards'));
            })

            if(response){
               
            let responseObj = JSON.parse(response);
                for (var i = 0; i < responseObj.length; i++) {
                    cards.push(responseObj[i].ObjectId);
                }
            }
            logger.info("getUserCard card id's => " + cards);
        } catch (err) {
            logger.httpError(logging.setLogs(err, err.options, session.get('transaction'), 'PTI_cloud getUserCards error'));
            e.th(err.statusCode, err.toString());
        }


        return cards;

    }

    async deleteUserCard(card_id) {

        let response = {};

        try {
            let reqObj = {
                method: 'DELETE',
                uri: `${this.endpoint}/cards/${card_id}`,
                headers: {
                    Authorization: this.getBearerValue()
                },
            }
            
            await requestWithAutoRetry(reqObj)
            .then( result => { response = result })
            .catch( error => { 
                logger.error(`Failed Deleting User Cards : ${error}`);
            })
            logger.http(logging.setLogs(response, reqObj, session.get('transaction'), 'PTI_cloud delete_user_cards'));
        } catch (err) {
            logger.httpError(logging.setLogs(err, err.options, session.get('transaction'), 'PTI_cloud deleteUserCard error'));
            e.th(err.statusCode, err.toString());
        }
    }

    async generateCode(connection) {
        let validCode = false;
        var count = 0;
        var triesLimit = 10;
        var code = "";

        while (!validCode) {
            if (count > triesLimit) {
                e.th(500, "Cannot generate gate access code")
            }
            count++;

            code = this.makeNewCode();
            try {
                await this.validateCode(connection, code);
                validCode = true;
            } catch (err) {
                console.log("Error: ", err);
            }
        }

        return code;
    }

    makeNewCode() {
        var pinLength = 4;
        var text = "";
        var possible0 = "123456789";
        var possible = "0123456789";

        if (typeof this.Credentials !== 'undefined' && this.Credentials.pin_format) {
            pinLength = this.Credentials.pin_format;
        }
        // limit code to not start with 0
        for (var i = 0; i < pinLength; i++) {
            if (i === 0) {
                text += possible0.charAt(Math.floor(Math.random() * possible0.length));
            } else {
                text += possible.charAt(Math.floor(Math.random() * possible.length));
            }
        }
        return text;
    }

    async add_user(user) {
        await this.renewCredentials();
        if (user.external_id == null) {

            let response = {}
            try {
                let reqObj = {
                    method: 'POST',
                    uri: `${this.endpoint}/${this.users_endpoint}/add`,
                    headers: {
                        Authorization: this.getBearerValue()
                    },
                    form: {
                        InterfaceId: user.id,
                        FirstName: user.first,
                        LastName: user.last,
                        AccessCode: user.pin,
                        EmailAddress: user.email,
                        MobilePhone: user.phone,
                        EasyCodeEligible: true,
                        TimeZone: 1

                    }
                }
                
                await requestWithAutoRetry(reqObj)
                .then( result => { response = result })
                .catch( error => { 
                    logger.error(`Failed Adding User : ${error}`);
                })
                logger.http(logging.setLogs(response, reqObj, session.get('transaction'), 'PTI_cloud create'));
                let responseObj = JSON.parse(response);
                return responseObj && responseObj.ResultCode;
            } catch (err) {
                logger.httpError(logging.setLogs(err, err.options, session.get('transaction'), 'PTI_cloud add_user error'));
                e.th(err.statusCode, err.toString());
            }
        }
    }

    async sendEasyCodeAccess(user) {
        await this.renewCredentials();
        let response = {}
        try {
            let reqObj = {
                method: 'GET',
                uri: `${this.endpoint}/easycodeex/${user.pin}`,
                headers: {
                    Authorization: this.getBearerValue()
                }
            }

            response = await request(reqObj);
            logger.http(logging.setLogs(response, reqObj, session.get('transaction'), 'PTI_cloud sendEasyCodeAccess'));

            let devices = response[0];

            for (let device = 0; device < devices; device++) {
                await this.renewCredentials();
                let AccessCodeReqObj = {
                    method: 'POST',
                    uri: `${this.endpoint}/${device.ObjectId}/coderequestex/${user.pin}`,
                    headers: {
                        Authorization: this.getBearerValue()
                    }
                }

                response = await request(reqObj);
                logger.http(logging.setLogs(response, AccessCodeReqObj, session.get('transaction'), 'PTI_cloud accessCodeRequest'));

            }

        } catch (err) {
            logger.httpError(logging.setLogs(err, err.options, session.get('transaction'), 'PTI_cloud sendeasycodeaccess error'));
            e.th(err.statusCode, err.toString());
        }

    }

    async move_in(unit, user) {
        await this.renewCredentials();

        let response = {};

        try {
            let reqObj = {
                method: 'POST',
                uri: `${this.endpoint}/${this.units_endpoint}/rent/${unit.name}`,
                headers: {
                    Authorization: this.getBearerValue()
                },
                form: {
                    StorLogixId: user.external_id
                }
            }

            await requestWithAutoRetry(reqObj)
                .then( result => { response = result })
                .catch( error => { 
                    logger.error(`Failed Move-In : ${error}`);
                })
            logger.http(logging.setLogs(response, reqObj, session.get('transaction'), 'PTI_cloud move_in'));

            // for transfers make sure the user has a card assigned to them    
            let cardIds = [];
            await this.getUserCards(user.external_id)
                .then(response => { cardIds = response })
                .catch(error => { console.log('Error Getting User Card IDs', error) })
            if (!cardIds.length && user.external_id) {
                await this.update_card(user);
            }

        } catch (err) {
            logger.httpError(logging.setLogs(err, err.options, session.get('transaction'), 'PTI_cloud move_in error'));
            e.th(err.statusCode, err.toString());
        }
    }

    async move_out(unit, creds) {
        await this.renewCredentials();

        let response = {};

        try {
            let reqObj = {
                method: 'DELETE',
                headers: {
                    Authorization: this.getBearerValue()
                },
                uri: `${this.endpoint}/${this.units_endpoint}/vacate/${unit.name}`
            }

            
            await requestWithAutoRetry(reqObj)
                .then( result => { response = result })
                .catch( error => { 
                    logger.error(`Failed Move-Out : ${error}`);
                })
            logger.http(logging.setLogs(response, reqObj, session.get('transaction'), 'PTI_cloud move_out'));

            logger.info("PTI move_out creds => " + creds);
            if (creds && creds.external_id) {
                let cardIds = await this.getUserCards(creds.external_id)
                for (let cardId of cardIds) {
                    await this.deleteUserCard(cardId);
                }

            }

        } catch (err) {
            logger.httpError(logging.setLogs(err, err.options, session.get('transaction'), 'PTI_cloud move_out error'));
            e.th(err.statusCode, err.toString());
        }
    }

    async suspend(user) {
        await this.renewCredentials();

        let response = {};

        try {
            let reqObj = {
                method: 'POST',
                uri: `${this.endpoint}/${this.users_endpoint}/${user.external_id}/suspended/true`,
                headers: {
                    Authorization: this.getBearerValue()
                }
            }

            
            await requestWithAutoRetry(reqObj)
                .then( result => { response = result })
                .catch( error => { 
                    logger.error(`Failed Suspend : ${error}`);
                })
            logger.http(logging.setLogs(response, reqObj, session.get('transaction'), 'PTI_cloud suspend'));

        } catch (err) {
            logger.httpError(logging.setLogs(err, err.options, session.get('transaction'), 'PTI_cloud suspend error'));
            e.th(err.statusCode, err.toString());
        }

    }

    async unsuspend(user) {
        await this.renewCredentials();

        let response = {};

        try {
            let reqObj = {
                method: 'POST',
                uri: `${this.endpoint}/${this.users_endpoint}/${user.external_id}/suspended/false`,
                headers: {
                    Authorization: this.getBearerValue()
                }
            }

            await requestWithAutoRetry(reqObj)
                .then( result => { response = result })
                .catch( error => { 
                    logger.error(`Failed Unsuspend : ${error}`);
                })
            logger.http(logging.setLogs(response, reqObj, session.get('transaction'), 'PTI_cloud unsuspend'));

        } catch (err) {
            logger.httpError(logging.setLogs(err, err.options, session.get('transaction'), 'PTI_cloud unsuspend error'));
            e.th(err.statusCode, err.toString());
        }
    }

    async remove_access(user) {
        await this.renewCredentials();
        console.log("remove access for user:", user);

        let cardIds = await this.getUserCards(user.external_id)
        if (cardIds && cardIds.length > 0) {
            for (let cardId of cardIds) {
                await this.deleteUserCard(cardId);
            }
        }
    }

    getAuthHeader() {
        let header = this.clientId + ":" + this.api_key;
        let authHeader = new Buffer(header).toString('base64');
        return "Basic " + authHeader;
    }

    async getOperToken() {
        let header = this.Credentials.site_id + ":" + this.Credentials.site_username + ':' + this.Credentials.site_password
        let base_64_encoding = btoa(header)
        let encodedOperToken = encodeURI(base_64_encoding)
        this.Credentials.oper_token = encodedOperToken
    }

    async renewCredentials(connection) {
        await this.getOperToken();
        let pti_response = {}
        try {
            let reqObj = {
                method: 'POST',
                uri: `${this.endpoint}/${this.token_endpoint}`,
                headers: {
                    Authorization: this.getAuthHeader()
                },
                form: {
                    grant_type: 'client_credentials',
                    site_key: this.Credentials.site_key,
                    oper_token: this.Credentials.oper_token
                }

            }

            pti_response;
            await requestWithAutoRetry(reqObj)
                .then( result => { pti_response = result })
                .catch( error => { 
                    logger.error(`Failed Renewing Credentials: ${error}`);
                })
            logger.http(logging.setLogs(pti_response, reqObj, session.get('transaction'), 'PTI_cloud renewCredentials'));

        } catch (err) {
            let error = JSON.parse(err.error);
            logger.httpError(logging.setLogs(err, err.options, session.get('transaction'), 'PTI_cloud renewCredentials error'));
            e.th(err.statusCode, error.error_description);
        }

        this.updateCredentials(this.parseTokenData(pti_response));
    }

    parseTokenData(data) {

        try {
            var d = JSON.parse(data)
        } catch (err) {
            throw new Error('Unable to parse token data');
        }

        return {
            Credentials: {
                token: d.access_token,
                token_type: d.token_type,
                expires: moment.utc().add(d.expires_in, 'seconds').toDate(),
            }
        };
    }

    updateCredentials(pti_response) {
        this.Credentials.token = pti_response.Credentials.token ? pti_response.Credentials.token : this.Credentials.token;
        this.Credentials.token_type = pti_response.Credentials.token_type ? pti_response.Credentials.token_type : this.Credentials.token_type;
        this.Credentials.expires = pti_response.Credentials.expires ? pti_response.Credentials.expires : this.Credentials.expires;
    }

    async saveCredentials(connection) {


        let data = await models.Credentials.findFacilityCreds(connection, this.facility_id, this.gate_vendor_id);

        for (let cred in this.Credentials) {
            let param = data.find(d => d.name === cred);

            let save = {
                facility_id: this.facility_id,
                gate_vendor_id: this.gate_vendor_id,
                name: cred,
                value: this.Credentials[cred]
            }
            await models.Credentials.saveCredentials(connection, save, param ? param.id : null);
        }


    }

}

module.exports = PtiCloud;

const SpaceService = require('../../services/spaceService');
const GroupService = require('../../services/groupService');
const UserService = require('../../services/userService');
const { response } = require('express'); const users = require('../../routes/users');

