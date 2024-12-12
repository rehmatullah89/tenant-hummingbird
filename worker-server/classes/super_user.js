"use strict";

var models  = require(__dirname + '/../models');
var settings    = require(__dirname + '/../config/settings.js');
var Promise = require('bluebird');
var validator = require('validator')
var moment      = require('moment');
var validation      = require('../modules/validation.js');
var control    = require(__dirname + '/../modules/site_control.js');
var e  = require(__dirname + '/../modules/error_handler.js');

class User {

    constructor(data) {

        data = data || {};
        this.id = data.id;
        this.email = data.email;
        this.password = data.password;
        this.active = data.active;
        this.created_at = data.created_at;
        this.Contact = {};
    }

    validate(){
        if (!this.email) {
            e.th(400,'Please enter a email address for this user');
        }
        return true;
    }

     async save(connection) {

        this.validate();

        var save = {
            email: this.email,
            password: this.password,
            active: this.active,
            superuser: true
        };

        let result = await models.User.save(connection, save, this.id);
        this.id = result;

        return
    }

    async delete(connection){
        return models.User.delete(connection, this.id)
    }

    async login(connection, password, requestUrl){

        if(!this.email) e.th(400, "Invalid email address");

        await this.find(connection);

        var salt = moment(this.created_at).format('x');

        let pass = control.hashPassword(password, salt);

        if(pass !== this.password) e.th(403, "No user was found with that email address, password combination");
        return true;

    }

    async find(connection){

        let data = {};
        if(this.id){
            data = await models.User.findById(connection, this.id)
        } else if (this.email){
            data = await  models.SuperUser.findByEmail(connection, this.email)
        } else {
            e.th(500, "No user id or email is set");
        }


        if(!data) e.th(404, "User not found");

        this.id = data.id;
        this.email = data.email;
        this.password = data.password;
        this.active = data.active;
        this.created_at = data.created_at;
        this.super = data.super;

    }


}



module.exports = User;

var Contact = require(__dirname + '/../classes/contact.js');