var db = require(__dirname + '/../../modules/db_handler.js');
var SpaceScore = require('../../classes/rate-management/space_score')

var SpaceScoreUpdateRoutines = {
    async startSpaceScoreUpdate(data) {
        try {
            var connection = await db.getConnectionByType('write', data.cid);
            await connection.beginTransactionAsync();
            const spaceScore = new SpaceScore();
            await spaceScore.driver(connection, data)
            await connection.commitAsync();
        } catch (error) {
            console.log("Space Score Update Routine error: ", error);
            await connection.rollbackAsync();
        }
        finally {
            await db.closeConnection(connection);
        }  
    }
}

module.exports = {
    startSpaceScoreUpdate: async (data) => {
        return await SpaceScoreUpdateRoutines.startSpaceScoreUpdate(data)
    } 
}