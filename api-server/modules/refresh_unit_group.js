
const getQueue = require("./queue");
const Queue = getQueue('hummingbirdQueue');

var RefreshUnitGroup = {
    checkDataChange(oldData, InsertedData) {
        let sameLength = oldData.length == InsertedData.length
        let unique = oldData.every(function (element, index) {
            return element == InsertedData[index]
        })
        return sameLength && unique
    },

    async callRefreshUnitGroupProcedure(company_id, procedureConditions, runCron = false) {
        console.log('Adding procedure to queue...', procedureConditions)
        return await Queue.add(
            'refresh_unit_group',
            {
                cid: company_id,
                procedure_conditions: procedureConditions,
                runCron
            },
            { priority: 1 }
        )
    },

    async triggerRateChangeCron(company_id, cronConditions) {
        console.log('Adding cron conditions to queue...', cronConditions)
        return await Queue.add(
            'rate_change_cron',
            {
                cid: company_id,
                cron_conditions: cronConditions
            },
            { priority: 1 }
        )
    }
}

module.exports = RefreshUnitGroup
