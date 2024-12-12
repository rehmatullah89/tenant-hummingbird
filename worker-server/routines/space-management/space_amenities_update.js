"use strict";

var SpacesAmenities = require('../../classes/space-management/space_amenities')
var db = require(__dirname + '/../../modules/db_handler.js');
const Socket = require(__dirname + '/../../classes/sockets.js');

var SpacesAmenitiesUpdateRoutines = {
    async updateAmenities(cid, info, socket_details) {
        try{
            console.log("info data",info)
            var connection = await db.getConnectionByType('write', cid);
            await connection.beginTransactionAsync();
            const spacesAmenities = new SpacesAmenities(info);
            await this.send_update("Ready", "Update space amenities process started", 200, socket_details);
            const result = await spacesAmenities.updateAmenities(connection, info.property_id);
            if (result) {
                await this.send_update("Done", "Space amenities updation done.", 200, socket_details);
            } else {
                await this.send_update("Error", result, 400, socket_details);
            }
            await connection.commitAsync();
        } catch(err){
            console.log("Space amenities update routine error: ", err);
            connection.rollbackAsync();
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

            await socket.createEvent("space_amenities_update", { state, message, status });
        } catch(err){
            console.log("Cant send socket event", err);
            return;
        }
    },  

}

module.exports = {
	updateAmenities: async(cid, info, socket_details) =>{
		return await SpacesAmenitiesUpdateRoutines.updateAmenities(cid, info, socket_details);
	}
}