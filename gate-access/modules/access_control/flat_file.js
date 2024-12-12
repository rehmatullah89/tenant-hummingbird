"use strict"
const models = require(__dirname + '/../../models');
const e = require(__dirname + '/../../modules/error_handler.js');
const request = require('request-promise');
const moment = require('moment');
const AccessControl = require('./access_control');

class FlatFile extends AccessControl {

    constructor(facility_id) {
        super(facility_id, 3, 'flat_file');
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

    async add_group(group) { }

    updateCredentials(data) { }


}

module.exports = FlatFile;

const SpaceService = require('../../services/spaceService');
const GroupService = require('../../services/groupService');
const UserService = require('../../services/userService');