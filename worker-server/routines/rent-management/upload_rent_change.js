var db = require(__dirname + '/../../modules/db_handler.js');
var UploadRentChange = require('../../classes/rent-management/upload_rent_change.js')

var UploadRentChangeRoutines = {
    async startRentChangeUploadProcess(data) {
        let {
            document_id,
            company,
            column_structure,
            template,
            socket_details,
            deployment_month,
            property_id,
            is_admin,
            bypass_notification_period
        } = data
        const connection = await db.getConnectionByType('write', socket_details.company_id);
        const uploadRentChange = new UploadRentChange({
            document_id,
            column_structure,
            template,
            socket_details,
            company,
            is_admin,
            bypass_notification_period
        });
        try {
            await connection.beginTransactionAsync();
            let rentChanges = await uploadRentChange.aggregateRentChanges()
            await uploadRentChange.triggerValidationAndRentUpdates(connection, rentChanges)
            await uploadRentChange.saveDocumentAndHistory(connection, property_id, deployment_month)
            await connection.commitAsync();
            uploadRentChange.send_update("success")
        } catch (error) {
            uploadRentChange.send_update("error")
            console.log("Upload Rent Change Routine error: ", error);
            await connection.rollbackAsync();
        }
        finally {
            await db.closeConnection(connection);
        }  
    }
}

module.exports = {
    startRentChangeUpload: async (data) => {
        return await UploadRentChangeRoutines.startRentChangeUploadProcess(data)
    } 
}