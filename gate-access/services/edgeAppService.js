const edgeServiceModel = require('../models/edgeService')

class EdgeAppService{
    constructor(){}

    async get(connection, facility_id){
        let [_edgeService] = await edgeServiceModel.findByFacilityId(connection, facility_id);
        return _edgeService 
    }

    async register(connection, facility_id){
        let result = await edgeServiceModel.add(connection, {facility_id})
        return result
    }

    async updatePolltime(connection, facility_id, polltime){
        let result = await edgeServiceModel.update(connection, facility_id, {lastpolled_on:polltime})
        return result
    }
}

// services dont save entity state -  no brainer!!!!
module.exports = new EdgeAppService();