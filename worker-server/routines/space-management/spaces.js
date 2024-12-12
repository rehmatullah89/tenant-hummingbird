"use strict";

var Spaces = require('../../classes/space-management/spaces')
var PropertyRateManagement = require('../../classes/property_rate_management')
var db = require(__dirname + '/../../modules/db_handler.js');
const Socket = require(__dirname + '/../../classes/sockets.js');
var Hash = require(__dirname + '/../../modules/hashes.js');
var Hashes = Hash.init();

var SpacesCreationRoutines = {
    async createSpaces(cid, info, socket_details, company_id) {
        try{
            var connection = await db.getConnectionByType('write', cid);
            const spaces = new Spaces(info);
            await this.send_update("Ready", "Create Spaces Process Started", 200, socket_details);

            await connection.beginTransactionAsync();
            const result = await spaces.createSpaces(connection, company_id,socket_details?.contact_id);
            if (result) {
                await PromotionEvent.updateUnitsAssociatedPromotions(connection, [result]);
                const propertyRateManagement = new PropertyRateManagement();
                await propertyRateManagement.refreshUnitGroup(connection, { property_id: Hashes.decode(info.spaceDetails.property_id)[0] });
            }
            await connection.commitAsync();
                const propertyRateManagement = new PropertyRateManagement();
                await propertyRateManagement.refreshUnitGroup(connection, { property_id: Hashes.decode(info.spaceDetails.property_id)[0] });
                let messageTemplate = 'Your Spaces are ready.'
                if(info.duplicateList && info.duplicateList.length > 0){
                    messageTemplate = "Spaces Ready: " +info.unitList+ " Duplicate Spaces Numbers: "+info.duplicateList;
                }
                await this.send_update("Done", messageTemplate, 200, socket_details);

        } catch(err){
            await connection.rollbackAsync();
            console.log("Spaces and amenities creation routine error: ", err);
            await this.send_update("Error", err.message, 400, socket_details);
        } finally {
            await db.closeConnection(connection);
        }
        
    },

    async send_update(state, message, status, socket_details) {
        const socket = new Socket({
            company_id: socket_details.company_id,
            contact_id: socket_details.contact_id,
        });
        try {
            const connected = await socket.isConnected(socket_details.contact_id);
            if(!connected) return;

            await socket.createEvent("space_generation_update", { state, message, status });
        } catch(err){
            console.log("Cant send socket event", err);
            return;
        }
    },  

}

module.exports = {
	createSpaces: async(cid, info, socket_details, company_id) =>{
		return await SpacesCreationRoutines.createSpaces(cid, info, socket_details, company_id);
	},
    send_update: async(state, message, status, socket_details) => {
        return await SpacesCreationRoutines.send_update(state, message, status, socket_details);
    }
}

const PromotionEvent = require(__dirname + '/../../events/promotions');
