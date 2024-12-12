"use strict"
const models = require(__dirname + '/../../models');
const e = require(__dirname + '/../../modules/error_handler.js');
const request = require('request-promise');
const FormData = require('form-data');
const moment = require('moment');
const AccessControl = require('./access_control');

const requestWithAutoRetry = require('../autoRetry');

var getNamespace = require('cls-hooked').getNamespace;
var session = getNamespace('gatePortals');

const logger = require(__dirname + '/../../modules/logger.js')
const logging = require(__dirname + '/../../helpers/portalLogging.js')

class PDK extends AccessControl {

    constructor(facility_id) {
        super(facility_id, 10, 'pdk');

        this.endpoint = process.env.PDK_ACCESS_URL;
        this.email = process.env.PDK_USER_EMAIL;
        this.password = process.env.PDK_USER_PASSWORD;
        this.users_endpoint = 'tenants';

    }

    async initial_load() {

    }


    async testConnection() {

        let result = {};

        let reqObj = {
            headers: this.setHeader(),
            body: {
                session: { cloudNode: this.Credentials.cloud_node, email: this.email, password: this.password }
            },
            uri: this.endpoint + '/get-token',
            method: 'POST',
            json: true,
        }

        await requestWithAutoRetry(reqObj)
            .then(response => { result = response })
            .catch(error => {
                logger.error(`Connection Failed : ${error}`);
            })

        return !!result.data?.token;
    }

    async move_in(unit, user) {

        if (!user.external_id) {
            let result = {};

            let reqObj = {
                headers: this.setHeader(),
                uri: `${this.endpoint}/${this.users_endpoint}`,
                body: {
                    session: { cloudNode: this.Credentials.cloud_node, email: this.email, password: this.password },
                    firstName: user.first,
                    lastName: user.last,
                    email: user.email,
                    pin: user.pin,
                    duressPin: user.pin + "1",
                    enabled: true,
                    expireDate: moment().add(20, 'y').utc().toISOString(),
                    hbID: String(user.id)
                },
                method: 'POST',
                json: true
            }
            await requestWithAutoRetry(reqObj)
                .then(response => { result = response })
                .catch(error => {
                    logger.error(`Failed Move-In : ${error}`);
                    logger.error(logging.setLogs(error, error.options, session.get('transaction'), 'PDK move_in error'));
                    throw error;
                })

            logger.http(logging.setLogs(result, reqObj, session.get('transaction'), 'PDK move_in'));
            let returnVal = result && result.data && result.data.id

            if (typeof returnVal != "undefined") {
                let reqGroupObj = {
                    headers: this.setHeader(),
                    uri: `${this.endpoint}/${this.users_endpoint}/${returnVal}/groups`,
                    body: {
                        session: { cloudNode: this.Credentials.cloud_node, email: this.email, password: this.password },
                        groups: [parseInt(this.Credentials.group_id)]
                    },
                    method: 'PUT',
                    json: true
                }
                await requestWithAutoRetry(reqGroupObj)
                    .then(response => { result = response })
                    .catch(error => {
                        logger.error(`Failed Assign group Move-In : ${error}`);
                        logger.error(logging.setLogs(error, error.options, session.get('transaction'), 'PDK Assign group move_in error'));
                    })
            }

            return { external_id: returnVal, space_level: false };

        } else {
            await this.update_user(user);
        }


    }

    async update_user(user) {
        let result = {};

        let reqObj = {
            headers: this.setHeader(),
            uri: `${this.endpoint}/${this.users_endpoint}/${user.external_id}`,
            body: {
                session: { cloudNode: this.Credentials.cloud_node, email: this.email, password: this.password },
                firstName: user.first,
                lastName: user.last,
                email: user.email,
                pin: user.pin,
                enabled: user.status === 'SUSPENDED' ? false : true,
                activeDate: moment().subtract(1, 'd').utc().toISOString(),
                expireDate: moment().add(20, 'y').utc().toISOString(),
                hbID: String(user.id)
            },
            method: 'PUT',
            json: true
        }
        if (user.external_id != null) {
            await requestWithAutoRetry(reqObj)
                .then(response => { result = response })
                .catch(error => {
                    logger.error(`Failed Update User : ${error}`);
                    logger.error(logging.setLogs(error, error.options, session.get('transaction'), 'PDK update_user error'));
                    throw error;
                })
            logger.http(logging.setLogs(result, reqObj, session.get('transaction'), 'PDK update_user'));
        } else {
            result.error = "Failed Update User: Missing user external id";
            logger.error(logging.setLogs(result, reqObj, session.get('transaction'), 'PDK update_user external id error'));
        }

    }

    async move_out(unit, creds, user, deleteUser) {
        if (deleteUser) {
            let result = {};
            let reqObj = {
                headers: this.setHeader(),
                uri: `${this.endpoint}/${this.users_endpoint}/${user.external_id}`,
                body: {
                    session: { cloudNode: this.Credentials.cloud_node, email: this.email, password: this.password },
                },
                method: 'DELETE',
                json: true
            }
            await requestWithAutoRetry(reqObj)
                .then(response => { result = response })
                .catch(error => {
                    logger.error(`Failed Move-Out : ${error}`);
                    logger.error(logging.setLogs(error, error.options, session.get('transaction'), 'PDK move_out error'));
                    throw error;
                })
            logger.http(logging.setLogs(result, reqObj, session.get('transaction'), 'PDK move_out'));

        }

    }

    async suspend(user, unit) {
        let result = {};

        let reqObj = {
            headers: this.setHeader(),
            uri: `${this.endpoint}/${this.users_endpoint}/${user.external_id}`,
            body: {
                session: { cloudNode: this.Credentials.cloud_node, email: this.email, password: this.password },
                firstName: user.first,
                lastName: user.last,
                email: user.email,
                pin: user.pin,
                enabled: false,
                activeDate: moment().subtract(1, 'd').utc().toISOString(),
                expireDate: moment().add(20, 'y').utc().toISOString(),
                hbID: String(user.id)
            },
            method: 'PUT',
            json: true
        }
        await requestWithAutoRetry(reqObj)
            .then(response => { result = response })
            .catch(error => {
                logger.error(`Failed Suspend User : ${error}`);
                logger.error(logging.setLogs(error, error.options, session.get('transaction'), 'PDK suspend_user error'));
                throw error;
            })
        logger.http(logging.setLogs(result, reqObj, session.get('transaction'), 'PDK suspend_user'));

    }


    async unsuspend(user, unit) {
        let result = {};

        let reqObj = {
            headers: this.setHeader(),
            uri: `${this.endpoint}/${this.users_endpoint}/${user.external_id}`,
            body: {
                session: { cloudNode: this.Credentials.cloud_node, email: this.email, password: this.password },
                firstName: user.first,
                lastName: user.last,
                email: user.email,
                pin: user.pin,
                enabled: true,
                activeDate: moment().subtract(1, 'd').utc().toISOString(),
                expireDate: moment().add(20, 'y').utc().toISOString(),
                hbID: String(user.id)
            },
            method: 'PUT',
            json: true
        }
        await requestWithAutoRetry(reqObj)
            .then(response => { result = response })
            .catch(error => {
                logger.error(`Failed Unsuspend User : ${error}`);
                logger.error(logging.setLogs(error, error.options, session.get('transaction'), 'PDK unsuspend_user error'));
                throw error;
            })
        logger.http(logging.setLogs(result, reqObj, session.get('transaction'), 'PDK unsuspend_user'));

    }

    async remove_access(user) {
        await this.suspend(user);
    }

    async get_units() {

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

    async get_facilities(facility) { }

    async get_facility_details(facility) { }

    async set_suspended(user, suspended) { }

    async add_user(user) {

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
            "Content-Type": 'application/json'
        }
    }

}



module.exports = PDK;

const SpaceService = require('../../services/spaceService');
const GroupService = require('../../services/groupService');
const UserService = require('../../services/userService');