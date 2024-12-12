var models = require('../models');
const property = require('../models/property');
var e = require(__dirname + '/../modules/error_handler.js');

class Mailhouse {
    constructor(data) {
        data = data || {};
        this.id = data.id || null;
        this.name = data.name || null;
        this.created_at = data.created_at || null;
        this.modified = data.modified || null;
    }

    async findAllMailhouses(connection) {
        let mailhouses = await models.Mailhouse.findAllMailhouse(connection)
        console.log("MAILHOISE", mailhouses)
        return mailhouses
    }

    async findRpostDeliveryMethods(connection, types) {
        
        let deliveryMethods = await models.Mailhouse.findRpostDeliveryMethods(connection, 'RPost', types);

        return deliveryMethods
    }

    async findSimpleCertifiedDeliveryMethods(connection, types) {
        
        let deliveryMethods = await models.Mailhouse.findSimpleCertifiedDeliveryMethods(connection, 'Simple Certified', types);

        return deliveryMethods
    }

    async findHummingbirdDeliveryMethods(connection, types) {
        
        let deliveryMethods = await models.Mailhouse.findHummingbirdDeliveryMethods(connection, 'Hummingbird', types);

        return deliveryMethods
    }

}

module.exports = Mailhouse;