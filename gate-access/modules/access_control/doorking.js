"use strict"
const models = require(__dirname + '/../../models');
const e = require(__dirname + '/../../modules/error_handler.js');
const request = require('request-promise');
const moment = require('moment');
const AccessControl = require('./access_control');

class DoorKing extends AccessControl {

    constructor(facility_id) {
        super(facility_id, 9, 'doorking');

    }

    async initial_load(connection, company_id, facility) { }

    async sendUpdatedUnits() { }

    async move_in(unit, user) {

    }

    async add_user_to_unit(unit, user) { }

    async remove_user_from_unit(unit, user) {
    }

    async move_out(unit) { }

    async suspend() { }

    async unsuspend() { }

    update() { }

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
        var possible = "0123456789";
        var possible0 = "0123456";
        var possible1 = "01234";

        if (typeof this.Credentials !== 'undefined' && this.Credentials.pin_format) {
            if (+this.Credentials.pin_format === 5) {
                pinLength = 5;
            }
        }
        if (pinLength === 5) {

            // limit code to 65000
            for (var i = 0; i < pinLength; i++) {
                if (i === 0) {
                    text += possible0.charAt(Math.floor(Math.random() * possible0.length));
                } else {
                    if (text === "6") {
                        text += possible1.charAt(Math.floor(Math.random() * possible1.length));
                    } else {
                        text += possible.charAt(Math.floor(Math.random() * possible.length));
                    }
                }
            }

        } else {
            for (var i = 0; i < pinLength; i++) {
                text += possible.charAt(Math.floor(Math.random() * possible.length));
            }
        }
        return text;
    }

    async create_unit() { }

    async get_units() { }

    async get_unit(unit) { }

    async get_unit_overlocks(unit) { }

    async get_unit_users(unit) { }

    async get_users() { }

    async get_user(user) { }

    async get_user_group(user) { }


    async get_facilities(facility) { }

    async get_facility_details(facility) { }

    async set_suspended(user, suspended) { }

    async add_user(user) { }

    async add_user_to_group(user, group) { }

    async remove_user_from_group(user, group) { }

    async sync() { }

    async get_group(group) { }

    async get_groups() { }

    async create_group(group) { }

    /*
    * Returns external_id
    *
    * */
    async add_group(group) { }

    updateCredentials(data) { }


}

module.exports = DoorKing;

const SpaceService = require('../../services/spaceService');
const GroupService = require('../../services/groupService');
const UserService = require('../../services/userService');