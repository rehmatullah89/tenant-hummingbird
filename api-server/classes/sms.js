var models = require(__dirname + '/../models');
var e = require(__dirname + '/../modules/error_handler.js');

class Sms {
    constructor(data) {
        data = data || {};
        this.id = data.id || null;
        this.interaction_id = data.interaction_id || null;
        this.phone = data.phone || null;
        this.message = data.message || null;

    }

    async findById(connection) {
        let sms = await models.Sms.findById(connection, this.id);
        return sms;
    }

    async findByInteractionId(connection, interaction_id) {
        let sms = await models.Sms.findByInteractionId(connection, interaction_id);
        return sms;
    }

    async save(connection) {
        let save = {
            interaction_id : this.interaction_id,
            message: this.message, 
            phone: this.phone
        }

        this.id = await models.Sms.save(connection, save, this.id)
    }
}

module.exports = Sms