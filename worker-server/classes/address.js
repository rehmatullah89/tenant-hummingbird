"use strict";

var models      = require(__dirname + '/../models');
var settings    = require(__dirname + '/../config/settings.js');

var Promise = require('bluebird');
var QB = require('node-quickbooks');
var validator = require('validator')
var moment      = require('moment');
var e  = require(__dirname + '/../modules/error_handler.js');

class Address {

    constructor(data){

        data = data || {};
        this.id = data.id || null;
        this.address = data.address || null;
        this.address2 = data.address2 || null;
        this.neighborhood = data.neighborhood || null;
        this.city = data.city || null;
        this.state = data.state || null;
        this.zip = data.zip || null;
        this.country = data.country || null;
        this.lat = data.lat || null;
        this.lng = data.lng || null;
        this.formatted_address = data.formatted_address || null;
        this.msg = '';

    }

    async findOrSave(connection){

        let address = {};

        if(this.id){
            address = await models.Address.findById(connection, this.id);
        } else {
            address = await models.Address.findByAddress(connection, this);
        }

        if(address){
            this.id = address.id;
            this.address = address.address;
            this.address2 = address.address2;
            this.neighborhood = address.neighborhood;
            this.city = address.city;
            this.state = address.state;
            this.zip = address.zip;
            this.country = address.country;
            this.lat = address.lat;
            this.lng = address.lng;
            this.formatted_address = address.formatted_address;
            return true;
        }

        // save new address
        await this.findFormatted();
        await this.save(connection);


    }

    find(connection){

        if(!this.id) e.th(500, 'id missing');
        return models.Address.findById(connection, this.id)
            .then(address => {
                if(!address) e.th(404, "Address not found");
                this.id = address.id;
                this.address = address.address;
                this.address2 = address.address2;
                this.neighborhood = address.neighborhood;
                this.city = address.city;
                this.state = address.state;
                this.zip = address.zip;
                this.country = address.country;
                this.lat = address.lat;
                this.lng = address.lng;
                this.formatted_address = address.formatted_address;
                return true;
            })
    }

    findFormatted(){
        //TODO  implememnt geocoding for all addresses
        return Promise.resolve();

    }

    validate(){

        try {
            //
            // if (!this.city) {
            //     throw 'City is missing';
            // }
            //
            // if (!this.state ) {
            //     throw 'State is missing';
            // }

            // if (!this.zip) {
            //     throw 'Zip is missing';
            // }

            if (!this.address) {
                throw 'Street number is missing';
            }

            if (!this.lat || !this.lng) {
                // Currently optional
                //          throw 'Latitude/longitude is missing';
            }

        } catch(err){
            e.th(400, err.toString())
        }

        return true;


    }

    async save(connection){

        this.validate();
        let save = {
            address: this.address,
            address2: this.address2,
            neighborhood: this.neighborhood,
            city: this.city,
            state: this.state,
            zip: this.zip,
            country: this.country,
            lat: this.lat,
            lng: this.lng,
            formatted_address: this.formatted_address
        };

        let result = await models.Address.save(connection, save)

        if (result.insertId) {
            this.id = result.insertId;
        }

    }
}

module.exports = Address;
