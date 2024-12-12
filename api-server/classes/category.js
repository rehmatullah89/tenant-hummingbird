"use strict";

var models = require(__dirname + '/../models');
var settings = require(__dirname + '/../config/settings.js');
var validator = require('validator')
var moment = require('moment');
var validation = require('../modules/validation.js');
var e = require(__dirname + '/../modules/error_handler.js');
var Hash = require(__dirname + '/../modules/hashes.js');
var Hashes = Hash.init();


class Category {

    constructor(data) {

        data = data || {};
        this.id = data.id;
        this.company_id = data.company_id;
        this.name = data.name;
        this.description = data.description;
        this.price = data.price;
        this.unit_type = data.unit_type;
        this.Units = {
            min_price: '',
            max_price: '',
            unit_count: ''
        };
        this.Vacant = {
            min_price: '',
            max_price: '',
            unit_count: ''
        };

        this.Attributes = [];
        this.width_id = 0;
        this.height_id = 0;
        this.length_id = 0;

        this.msg = '';
    }


    async validate() {

        if (!this.company_id) e.th(500, 'Invalid company id');
        if (!this.name) e.th(400, 'Please enter a name for this category');


    }

    async save(connection) {
        await this.validate();
        var save = {
            company_id: this.company_id,
            name: this.name,
            description: this.description,
            price: this.price,
            unit_type: this.unit_type,
            sort: this.sort || 0
        };

        await this.verifyUnique(connection);

        let result = await models.UnitCategory.save(connection, save, this.id);

        if (result.insertId) {
            this.id = result.insertId;
        }
        let attributes_ids = [];

        for (let i = 0; i < this.Attributes.length; i++) {
            if (this.Attributes[i].id) {
                attributes_ids.push(this.Attributes[i].id);
            }
        }

        await models.UnitCategory.removeAttributes(connection, attributes_ids, this.id);

        for (let i = 0; i < this.Attributes.length; i++) {

            let save = {
                value: this.Attributes[i].value,
                amenity_id: this.Attributes[i].amenity_id,
                category_id: this.id,
            }

            await models.UnitCategory.saveAttributes(connection, save, this.Attributes[i].id);
        }

    }

    async findOrSave(connection) {
        await this.validate();
        let data = await Category.findByName(connection, this.name, this.company_id)
        if (data) {
            this.id = data.id;
            this.name = data.name;
            this.description = data.description;
            this.price = data.price;
            this.unit_type = data.unit_type;
        } else {
            await this.save(connection);
        };

        return;

    }

    async verifyUnique(connection) {
        let data = await models.UnitCategory.findByName(connection, this.name, this.company_id, true);
        if (!data || !data.length) return true;
        let found = data.filter(d => d.id !== this.id);
        if (found.length) e.th(409, "There is already a category with this name.");
    }

    async find(connection) {

        await this.verifyId();
        let data = await models.UnitCategory.findById(connection, this.id);

        if (!data || data.status == 0) {
            e.th(404, 'Category not found')
        }

        this.id = data.id;
        this.company_id = data.company_id;
        this.name = data.name;
        this.description = data.description;
        this.price = data.price;
        this.unit_type = data.unit_type;

    }

    async getPropertyBreakdown(connection, property_id) {

        await this.verifyId();
        let data = await models.UnitCategory.getBreakdown(connection, this.id, this.company_id, property_id);

        this.Units.unit_count = data.count;
        this.Units.min_price = data.min;
        this.Units.max_price = data.max;

    }

    async getAttributes(connection) {

        await this.verifyId();

        this.Attributes = await models.UnitCategory.getAttributes(connection, this.id);

        console.log(this.Attributes);

    }

    async getAmenities(connection) {

        await this.verifyId();
        let attributes = await models.UnitCategory.getAttributes(connection, this.id);

        attributes.forEach((item) => {
            if (item.name && item.name.toLowerCase() === "height") {
                this.height_id = item.amenity_id;
                this.Attributes.push({ name: 'height', 'value': item.value })
            };
            if (item.name && item.name.toLowerCase() === "width") {
                this.width_id = item.amenity_id;
                this.Attributes.push({ name: 'width', 'value': item.value })
            };
            if (item.name && item.name.toLowerCase() === "length") {
                this.length_id = item.amenity_id;
                this.Attributes.push({ name: 'length', 'value': item.value })
            };
        });
    }

    /* Deprecated */
    // generateSpaceMixId() {
    //     //space-mix-id should be [categoryId, lengthId, widthId, heightId]
    //     let space_mix_id = Hashes.encode([this.id, this.length_id, this.width_id, this.height_id]);
    //     delete this.length_id;
    //     delete this.height_id;
    //     delete this.width_id;
    //     return space_mix_id;
    // }

    async getPropertyAvailableBreakdown(connection, property_id) {

        await this.verifyId();
        let data = await models.UnitCategory.getAvailableBreakdown(connection, this.id, this.company_id, property_id);
        this.Vacant.unit_count = data.count;
        this.Vacant.min_price = data.min;
        this.Vacant.max_price = data.max;

    }

    async verifyId() {
        if (!this.id) e.th(500, 'No category id is set');
    }

    async verifyAccess(company_id) {
        if (this.company_id !== company_id) e.th(403);
    }

    async deleteCategory(connection) {
        await this.verifyId();
        await models.UnitCategory.delete(connection, this.id);
        await models.UnitCategory.unsetUnits(connection, this.id);
    }

    static async search(connection, company_id, properties, params) {
        return models.UnitCategory.findCategoryList(connection, company_id, properties, params)
    }

    static async getCategoryDetails(connection, company_id, params) {
        return models.UnitCategory.getCategoryDetails(connection, company_id, params)
    }

    static async findByName(connection, name, company_id) {
        return await models.UnitCategory.findByName(connection, name, company_id)
    }


}

module.exports = Category;
