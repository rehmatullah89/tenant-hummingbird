"use strict";

var PropertyAmenities = require('../../classes/space-management/property_amenities')
var PropertyRateManagement = require('../../classes/property_rate_management')
var db = require(__dirname + '/../../modules/db_handler.js');
var Socket = require(__dirname + '/../../classes/sockets.js');
var Utils = require(__dirname + '/../../modules/utils.js');

const bullmq  = require('bullmq');
const IORedis = require('ioredis');
const redis_connection = new IORedis({host: process.env.REDIS_HOST});
const Queue = new bullmq.Queue('hummingbirdQueue', { connection: redis_connection } );

var PropertyAmenitiesUpdateRoutines = {
    async startAmenitiesUpdateRoutine(data) {
        try {
            let propertyId;
            let amenityPayload = {}
            const count = data.property_amenities_to_update.length + data.property_amenities_to_add.length;
            this.send_update("Ready", `Process has been started to add ${count} Amenities for ${data.space_type}.`, 200, "update_property_amenities", data.socket_details);
            var connection = await db.getConnectionByType('write', data.cid);

            await connection.beginTransactionAsync();
            if (data.property_amenities_to_delete.length > 0) {
              await this.deleteAmenities(connection, data.contact_id, data.property_amenities_to_delete, data.cid);
              let amenityPropertyIds = await this.findUnitGroupProfileAmenities(connection, data.property_amenities_to_delete);
              if(amenityPropertyIds.length){
                await this.deleteUnitGroupProfileAmenities(connection, data.property_amenities_to_delete, amenityPropertyIds);
              }
              propertyId = data.property_amenities_to_delete[0].property_id;
            }
            if (data.property_amenities_to_add.length > 0) {
              amenityPayload.insert = await this.addAmenities(connection, data.property_amenities_to_add, data.cid);
              propertyId = data.property_amenities_to_add[0].property_id;
            }
            if (data.property_amenities_to_update.length > 0) {
                let existingAmenityData = await this.getAmenities(connection, data.property_amenities_to_delete);
                if(!await Utils.equalArrays(existingAmenityData, data.property_amenities_to_delete)) {
                    propertyId = data.property_amenities_to_update[0].property_id;
                };
                amenityPayload.update = await this.updateAmenities(connection, data.property_amenities_to_update);
               
            }
            await connection.commitAsync();
            this.updateSpaceScoreData(amenityPayload)
            if(propertyId) {
                const propertyRateManagement = new PropertyRateManagement();
                return await propertyRateManagement.refreshUnitGroup(connection, { property_id: propertyId });
            }
            this.send_update("Done", `${count} Features and Amenities have been added to ${data.space_type}.`, 200, "update_property_amenities", data.socket_details);
        } catch(err) {
            this.send_update("Error", "Amenities Update Routine Error", 400, "update_property_amenities", data.socket_details);
            console.log("Amenities update Routine error: ", err);
            await connection.rollbackAsync();
        } finally {
            await db.closeConnection(connection);
        }
    },

    async startCustomAmenitiesCreateRoutine(data) {
        try {
            const amenity = data.amenity;
            let amenityPayload = {}
            this.send_update("Ready", `Process has been started for adding ${amenity.name} to ${amenity.property_type}.`, 200, "custom_amenity_creation", data.socket_details);
            var connection = await db.getConnectionByType('write', data.cid);

            await connection.beginTransactionAsync();
            amenity.field_type = (amenity.default == 'Yes') || (amenity.default == 'No')? 'boolean' : 'text';
            const { amenity_id } = await this.createAmenities(connection, amenity);

            amenityPayload.create = await this.addAmenities(connection, [{
                data: [amenity_id, amenity.property_id, amenity.name, amenity.category_id, JSON.stringify(amenity.options), amenity.default, amenity.sort_order, amenity.property_type, amenity.field_type],
                property_id: amenity.property_id,
                property_type: amenity.property_type
            }], data.cid);
            await connection.commitAsync();
            this.updateSpaceScoreData(amenityPayload)
            this.send_update("Done", `${amenity.name} has been added to ${amenity.property_type}.`, 200, "custom_amenity_creation", data.socket_details);
            
        } catch(err) {
            this.send_update("Error", "Add Custom Amenity routine Error", 400, "custom_amenity_creation", data.socket_details);
            console.log("Custom Amenities Add routine error: ", err);
            await connection.rollbackAsync();
        } finally {
            await db.closeConnection(connection);
        }
    },

    async startAmenitiesDeleteRoutine(data) {
        try {
            let propertyId;
            let amenityPayload = {}
            const deletedAmenity = data.property_amenities_to_delete[0];
            this.send_update("Ready", `Process has been started for removing ${deletedAmenity.name} from ${data.space_type}.`, 200, "property_amenities_deletion", data.socket_details);
            var connection = await db.getConnectionByType('write', data.cid);

            await connection.beginTransactionAsync();
            if (data.property_amenities_to_delete.length > 0) {
                amenityPayload.delete = await this.deleteAmenities(connection, data.contact_id, data.property_amenities_to_delete, data.cid);
                let amenityPropertyIds = await this.findUnitGroupProfileAmenities(connection, data.property_amenities_to_delete);
                if(amenityPropertyIds.length){
                    await this.deleteUnitGroupProfileAmenities(connection, data.property_amenities_to_delete, amenityPropertyIds);
                }
                propertyId = data.property_amenities_to_delete[0].property_id;
            }
            if (data.property_amenities_to_update.length > 0) {
              let existingAmenityData = await this.getAmenities(connection, data.property_amenities_to_delete);
              if(!await Utils.equalArrays(existingAmenityData, data.property_amenities_to_delete)){
                propertyId = data.property_amenities_to_update[0].property_id;
              }
              await this.updateAmenities(connection, data.property_amenities_to_update);
            }
            await connection.commitAsync();
            this.updateSpaceScoreData(amenityPayload)
            if(propertyId) {
                const propertyRateManagement = new PropertyRateManagement();
                return await propertyRateManagement.refreshUnitGroup(connection, { property_id: propertyId });
                
            }
            this.send_update("Done", `${deletedAmenity.name} has been removed from ${data.space_type}.`, 200, "property_amenities_deletion", data.socket_details);
        } catch(err) {
            this.send_update("Error", "Amenity Delete Routine Error", 400, "property_amenities_deletion", data.socket_details);
            console.log("Amenities Delete Routine error: ", err);
            await connection.rollbackAsync();
        } finally {
            await db.closeConnection(connection);
        }
    },

    async findUnitGroupProfileAmenities(connection, info) {
        const propertyAmenities = new PropertyAmenities(info);
        return await propertyAmenities.findUnitGroupProfileAmenities(connection);
    },

    async deleteUnitGroupProfileAmenities(connection, info, amenityPropertyIds) {
        const propertyAmenities = new PropertyAmenities(info);
        return await propertyAmenities.deleteUnitGroupProfileAmenities(connection, amenityPropertyIds);
    },

    async addAmenities(connection, info, company_id) {
        const propertyAmenities = new PropertyAmenities(info);
        return await propertyAmenities.addAmenities(connection, company_id);
    },

    async updateAmenities(connection, info) {
        const propertyAmenities = new PropertyAmenities(info);
        return await propertyAmenities.updateAmenities(connection);
    },

    async getAmenities(connection, info) {
        const propertyAmenities = new PropertyAmenities(info);
        return await propertyAmenities.getAmenities(connection);
    },

    async deleteAmenities(connection, user, info, company_id) {
        const propertyAmenities = new PropertyAmenities(info);
        return await propertyAmenities.deleteAmenities(connection, user, company_id);
    },

    async createAmenities(connection, info) {
        const propertyAmenities = new PropertyAmenities();
        return await propertyAmenities.createAmenities(connection, info);
    },

    async send_update(state, message, status, event, socket_details) {
        const socket = new Socket({
            company_id: socket_details.company_id,
            contact_id: socket_details.contact_id,
        });
        try {
            console.log(event, { state, message, status })
            const connected = await socket.isConnected(socket_details.contact_id);
            if(!connected) return;

            await socket.createEvent(event, { state, message, status });
        } catch(err) {
            console.log("Cant send socket event", err);
            return;
        }
    },

    async updateSpaceScoreData(data) {
        for (let type in data) {
            data?.[type]?.forEach((amenity) => {
                let payload = {
                    type,
                    property_id: amenity.property_id,
                    cid: amenity.company_id
                }
                switch (type) {
                    case "create":
                        payload.data = amenity.insertId
                        break;
                    case "delete":
                        payload.data = amenity.data
                        break;
                    default:
                        return console.log("Couldn't update the space score data");
                }
                Queue.add('trigger_space_score_updation', payload, {priority: 1});
            })
        }
    }
}

module.exports = {
    startAmenitiesUpdateRoutine: async(data) => {
		return await PropertyAmenitiesUpdateRoutines.startAmenitiesUpdateRoutine(data);
	},
    startCustomAmenitiesCreateRoutine: async(data) => {
		return await PropertyAmenitiesUpdateRoutines.startCustomAmenitiesCreateRoutine(data);
	},
    startAmenitiesDeleteRoutine: async(data) => {
		return await PropertyAmenitiesUpdateRoutines.startAmenitiesDeleteRoutine(data);
	},
}
