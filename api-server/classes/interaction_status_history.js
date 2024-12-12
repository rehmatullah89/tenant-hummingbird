const models = require('../models');

class InteractionStatusHistory {
    constructor(data) {

        this.id = data.id;
        this.interaction_id = data.interaction_id;
        this.status = data.status;
        this.created_at = data.created_at;
        this.last_modified = data.last_modified;
    }

    async find(connection) {

        let _interaction_status = await models.InteractionStatusHistory.get(connection, { id: this.id });
        this.id = _interaction_status.id;
        this.status = _interaction_status.status;
        this.created_at = _interaction_status.created_at;
        this.last_modified = _interaction_status.last_modified;
    }

    static async findByInteraction(connection, interaction_id){
        let _interaction_statuses = await models.InteractionStatusHistory.get(connection, { interaction_id });
        return _interaction_statuses
    }

    static async findLastInteractionStatus(connection, interaction_id){
        let [_interaction_status] = await this.findByInteraction(connection, interaction_id);
        return _interaction_status;
    }

    async save(connection) {

        let _obj = {
            status: this.status,
            interaction_id: this.interaction_id,
        }

        this.id = await models.InteractionStatusHistory.save(connection, _obj, this.id);
    }

}

module.exports = InteractionStatusHistory;