var pool    = require(__dirname + "/../modules/db.js");
var utils   = require(__dirname + "/../modules/utils.js");
var db      = require(__dirname + '/../modules/db_handler.js');
var models  = require(__dirname + '/../models/index.js');
var moment  = require('moment');

var CloseOfDayRoutines = {
  
    async closeOfDayRoutine(data) {
        
        try {

            var connection = await db.getConnectionByType('write', data.cid);

            let property = new Property({ id: data.property_id });
            await property.isDayClosed(connection, data.date);

            if(!property.is_day_closed){
                let closingTime = await models.ClosingDay.getDefaultClosingTime(connection, data.property_id);
                if(!closingTime) closingTime = '23:59:59';

                let closing_day = new ClosingDay({
                    property_id: data.property_id,
                    date: data.date,
                    time: closingTime,
                    active: 1
                });

                let nextDay = moment(data.date).add(1, 'days').format('YYYY-MM-DD');

                await connection.beginTransactionAsync();

                await closing_day.save(connection);
                await models.ClosingDay.updateEffectiveDates(connection, data.date, nextDay, closingTime, data.property_id)

                await connection.commitAsync();
            }

            
        } catch (err) {
            await connection.rollbackAsync();
            console.log('Close of Day Routine error ', err);
            console.log(err.stack);
        }

        await utils.closeConnection(pool, connection);    
    },
};

module.exports = {
    closeOfDayRoutine: async (data) => {
        return await CloseOfDayRoutines.closeOfDayRoutine(data);
    },
};

var Property    = require(__dirname + "/../classes/property.js");
var ClosingDay  = require(__dirname + '/../classes/closing_day.js');
