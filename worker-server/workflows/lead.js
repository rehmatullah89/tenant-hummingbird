
var db = require(__dirname + '/../modules/db_handler.js');
const queue = require('../modules/queue');
const utils = require('../modules/utils');
const ENUMS = require('../modules/enums');
const e = require('../modules/error_handler');


var autoExpireLeads = {
    log: {},
    logs: [],
    async auto_expire_leads_routine(job) {
        
        try {
            console.log("auto_expire_leads_routine: data", job.data); 
            let property_id = job.data.property_id;
            let logs = [];
            let connection = await db.getConnectionByType('write', job.data.cid, null, "autoReconcileAllContactsRoutine");

            let property = new Property({ id: property_id });
            await property.find(connection);

            let company = new Company({ id: property.company_id });
            await company.find(connection);
            
            // get setting for company, 
            let setting = new Settings({company_id: company.id});
            let auto_expire_days_setting = await setting.findSettingByName(connection, 'reservationAutoExpire');

            await queue.updateProgress(job, { total: 2, done: 0 });

            // dismiss expired reservations todos
            await Todo.dismissExpiredReservationsToDos(connection, property.id); 
            await queue.updateProgress(job, { total: 2, done: 1 });


            if(!auto_expire_days_setting) e.th(400, "no setting found");
                // retire leads that many days ago. 
            
            await Lead.retireLeadsOlderThanDays(connection, auto_expire_days_setting.value, property.id, company.id); 
            await queue.updateProgress(job, { total: 2, done: 2 });

            await db.closeConnection(connection);


            // TODO Save Logs

            // await db.saveData({
            //     created_at: + new Date(),
            //     record_type: 'auto_retire_leads',
            //     property_id: data.property.id,
            //     property_name: data.property.name,
            //     dryrun: data.dryrun,
            //     company_id: data.cid,
            //     company_name: company.name,
            //     data: JSON.stringify(this.logs),
            //     admin: data.admin.first + ' ' + data.admin.last
            //     // output: PaymentRoutines.output
            // })
        } catch (err) {
            console.log('Auto retire leads error ', err);
            console.log(err.stack);
            await utils.sendLogs({
                event_name: ENUMS.LOGGING.AUTO_RETIRE_LEAD,
                logs: {
                    payload : {
                        ...job.data
                    },
                    error: err?.stack || err?.msg || err
                }
            });
        }
    }
};

module.exports = {
    auto_expire_leads_routine: autoExpireLeads.auto_expire_leads_routine
};

var Lead = require(__dirname + "/../classes/lead.js");
var Todo = require(__dirname + "/../classes/todo.js");
var Property = require(__dirname + "/../classes/property.js");
var Settings = require(__dirname + "/../classes/settings.js");
var Company = require(__dirname + "/../classes/company.js");
