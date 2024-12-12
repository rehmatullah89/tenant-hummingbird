var models = require(__dirname + '/../models');
var Property  = require(__dirname + '/../classes/property.js');
var e = require(__dirname + '/../modules/error_handler.js');

class TriggerGroup {
    constructor(data) {
        data = data || {};
        this.id = data.id || null;
        this.company_id = data.company_id;
        this.name = data.name;
        this.description = data.description;
        this.propertyTriggerGroups = data.propertyTriggerGroups || [];
        this.Properties = data.Properties || [];
    }

    async find(connection) {
        if (!this.id) e.th(500, 'No Id is set');
        let data = await models.TriggerGroup.findById(connection, this.id);

        if (!data) {
            e.th(404, "Trigger group not found");
        }

        this.id = data.id || null;
        this.company_id = data.company_id;
        this.name = data.name || null;
        this.description = data.description || null;
    }
}

module.exports = TriggerGroup;