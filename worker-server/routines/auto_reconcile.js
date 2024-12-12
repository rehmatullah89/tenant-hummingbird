var pool = require(__dirname + "/../modules/db.js");
var utils = require(__dirname + "/../modules/utils.js");
const Contact = require(__dirname + '/../classes/contact.js');
var models = require(__dirname + '/../models/index.js');
var eventEmitter = require(__dirname + '/../events/index.js');
var db = require(__dirname + '/../modules/db_handler.js');
const clsContext = require('../modules/cls_context');

var AutoReconcileRoutines = {
    log: {},
    logs: [],
    async autoReconcileAllContactsRoutine(data) {
        
        try {

            let property_id = data.property.id;
            let logs = [];
            let connection = await db.getConnectionByType('read', data.cid, null, "autoReconcileAllContactsRoutine");

            let company = new Company({ id: data.property.company_id });
            await company.find(connection);
            console.log("property_id", property_id);
            let contactsWithOpenInvoicesAndCredits = await models.Contact.findContactsWithOpenInvoicesAndCredits(connection, property_id, ['credit', 'payment']);

            console.log("contactsWithOpenInvoicesAndCredits", contactsWithOpenInvoicesAndCredits);

            await db.closeConnection(connection);

            for(let j = 0; j < contactsWithOpenInvoicesAndCredits.length; j++) {

                // TODO GENERATE REQUEST ID
                try {
                    let log = await this.autoReconcileContactRoutine({
                        contact_id: contactsWithOpenInvoicesAndCredits[j].contact_id,
                        property_id: data.property.id ,
                        dryrun: data.dryrun,
                        cid: data.cid
                    });
                    logs.push(log);
                } catch(err){
                    logs.push(err.log);
                }
            }

            // TODO Save Logs

            await db.saveData({
                created_at: + new Date(),
                record_type: 'auto-reconcile',
                property_id: data.property.id,
                property_name: data.property.name,
                dryrun: data.dryrun,
                company_id: data.cid,
                company_name: company.name,
                data: JSON.stringify(this.logs),
                admin: data.admin.first + ' ' + data.admin.last
                // output: PaymentRoutines.output
            });

            const eventData = clsContext.get(Enums.EVENTS.PAYMENT_PROCESSED);
		    if(eventData) eventEmitter.emit(Enums.EVENTS.PAYMENT_PROCESSED, eventData); 
        } catch (err) {
            console.log('Auto Reconcile all contacts error ', err);
            console.log(err.stack);
        }
    },

    async autoReconcileContactRoutine(data) {
        console.log('company id ' + data.cid);
        let connection = await db.getConnectionByType('write', data.cid, null, "autoReconcileContactRoutine");
        let log = {};
        try {

            let { contact_id, property_id } = data;
            
            let contact = new Contact({ id: contact_id });
            await contact.find(connection);

            let property = new Property({ id: property_id });
            await property.find(connection);

            log = {
                contact_id: contact_id,
                contact_name: contact.first + ' ' + contact.last,
                property_id: property_id,
                property_name: property.name,
            };

            await connection.beginTransactionAsync();

            let { leases, invoice_list, payment_list } = await contact.reconcile(connection, [property.id], [], data.dryrun);

            log.invoice_list = invoice_list.map(il => {
                return {
                    id: il.id,
                    lease_id: il.lease_id,
                    number: il.number,
                    balance: il.balance,
                    total_tax: il.total_tax,
                    total_discounts: il.total_discounts,
                    sub_total: il.sub_total,
                    total_due: il.total_due,
                    total_payments: il.total_payments,
                    unit_number: il.Lease.Unit.number
                }
            });
            log.payment_list = payment_list;

            await connection.commitAsync();

            let events = ["payment_applied"];
            if(!data.dryrun){
                events.map((e) => {
                    eventEmitter.emit(e, {
                        cid: data.cid,
                        company_id: property.company_id,
                        contact: { id: null },
                        property_id: property.id,
                        leases,
                        invoice_leases: leases,
                    });
                });
            }
            return log;
        } catch (err) {
            await connection.rollbackAsync();
            log.error = err;
            err.log = log;
            await db.closeConnection(connection);
            throw err;
        }
        await db.closeConnection(connection);
    },
};

module.exports = {
    autoReconcileAllContactsRoutine: async (data) => {
        return await AutoReconcileRoutines.autoReconcileAllContactsRoutine(data);
    },
};

var Property = require(__dirname + "/../classes/property.js");
var Company = require(__dirname + "/../classes/company.js");
