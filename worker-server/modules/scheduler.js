var Hashes = require(__dirname + '/../modules/hashes.js').init();
//var Company   = require(__dirname + '/../models/company.js');

var Lease = require(__dirname + '/../classes/lease.js');
//var Invoice   = require(__dirname + '/../models/invoices.js');

var models = require(__dirname + '/../models/index.js');
var utils = require(__dirname + '/../modules/utils.js');
var AccountingUtils = require(__dirname + '/../classes/accounting/utils');

var Enums = require(__dirname + '/../modules/enums.js');


var Mail = require(__dirname + '/../modules/mail.js');
var ErrorStates = require('./error_states');

var crypto = require('crypto');

const moment_tz   = require('moment-timezone');
var moment = require('moment');
var Promise = require('bluebird');
var Jade = require('jade');
var db = require(__dirname + '/../modules/db_handler.js');

var Notification = require(__dirname + '/../classes/notification.js');
var Application = require(__dirname + '/../classes/application.js');

var Activity = require(__dirname + '/../classes/activity.js');
var User = require(__dirname + '/../classes/user.js');
var Event = require(__dirname + '/../classes/event.js');
var Contact = require(__dirname + '/../classes/contact.js');
var Company = require(__dirname + '/../classes/company.js');
var Invoice = require(__dirname + '/../classes/invoice.js');
var Property = require(__dirname + '/../classes/property.js');
var Payment = require(__dirname + '/../classes/payment.js');

var OnboardingProperty = require(__dirname + '/../classes/onboarding/onboarding_property.js');
var eventEmitter = require(__dirname + '/../events/index.js');

var schedule = require('node-schedule');

var MaintenanceRoutines = require(__dirname + '/../routines/maintenance_requests.js');
var ChargesSummaryRoutines = require(__dirname + '/../routines/charges_summary_routines.js');
var PaymentRoutines = require(__dirname + '/../routines/tenant_payment_routines.js');
var PaymentRoutines = require(__dirname + '/../routines/payment_routines.js');
var ReportRoutines = require(__dirname + '/../routines/reports.js');
var MessageRoutines = require(__dirname + '/../routines/send_message.js');
var VerifyToken = require(__dirname + '/../modules/verify_user_verification_token.js');
var EmailSignatureRoutines = require(__dirname + '/../routines/signatures.js');
var QuickBooksRoutines = require(__dirname + '/../routines/quickbooks.js');
var FeeRoutines = require(__dirname + '/../routines/fees.js');
var AutoActionReport = require(__dirname + '/../routines/auto_action_report.js');
var TriggerRoutines = require(__dirname + '/../routines/triggers.js');
var NotificationRoutines = require(__dirname + '/../routines/notifications.js');
var ProcessLeaseStatuses = require(__dirname + '/../routines/process_lease_statuses.js');
var DocumentFetcher = require(__dirname + '/../routines/document_fetch.js');
var { getGDSMappingIds, advanceRental, tenantOnBoarding } = require('../modules/gds_translate');

var Settings = require(__dirname + '/../config/settings.js');
let fs = require("fs");

var kue = require('kue');
var redis = require('redis');

const bullmq = require('bullmq');
const os = require('os');
const redis_connection = require('./redisConnection');
const Queue = new bullmq.Queue('hummingbirdQueue', { connection: redis_connection });
const PdfQueue = new bullmq.Queue('pdf', { connection: redis_connection });
var rp = require('request-promise');
const ScheduleReport = require("../classes/schedule-report");
const rentManagement = require(`../classes/rent-management/property_rent_management`)
const rentManagementWorkFlows = require(`../workflows/rent_management`)
var rcwf = require(`../workflows/rate_change`)

var queue = kue.createQueue({
    redis: {
        createClientFactory: function() {
            return redis_connection
            // return redis.createClient({
            //     port: '6379',
            //     host: Settings.redis_host
            // });
        }
    }
});  

var runRateManagementCronRoutine = async (jobData) => {
    try {
        if (utils.isFalsy(jobData ?? {})) {
            console.log('\n\nCancelling cron due to incomplete data..\n\n')
            return
        }
        await Queue.add('rate_management_cron_routine', jobData);
    } catch (error) {
        console.log(`
            => Error in running rate management routine for ${ job?.hb_company_id || job?.company_id } \n
            => Error Stack: ${error.stack} \n
            `
        )
    }
}

//Added by BCT Team for Schedule report
var runScheduleReport = async (cid, data) => {      
    try {   
        console.log(`->::/modules/scheduler.js - runScheduleReport()::START`);
        var connection = await db.getConnectionByType('read', cid);        
        let scheduleReport = new ScheduleReport({ connection, cid, company_id: data.company_id });
        await scheduleReport.generateScheduleReportPayload(data.executeManually, data.schedule_report_master_id);  

        console.log("ScheduleReportsData--", scheduleReport.data);

        for(let i=0; i< scheduleReport.data.length; i++){
            console.log("->::Payload for <<share_reports_flow>>", JSON.stringify(scheduleReport.data[i]));
            await Queue.add('share_reports_flow', {
                ...scheduleReport.data[i],
                cid,
                company_id: data.company_id
            });
        }
        console.log(`->::/modules/scheduler.js - runScheduleReport()::END`);

         utils.sendLogs({
            event_name: ENUMS.LOGGING.SHARE_REPORTS_PAYLOAD,
            logs: {
                payload: {
                    cid,
                    ...scheduleReport.data
                },
            }
        });

    } catch(err) {    
        console.log("->::Error in runScheduleReport");
        console.log(err.stack);
    } finally {
        await db.closeConnection(connection);
    }
};

var runLeaseStatusUpdate = async (cid, params) => {

    params = params || {};

    let dryrun = params.dryrun || false;

    let date = params.date || moment().format('YYYY-MM-DD');
    let property_id = params.property_id || null;
    let company_id = params.company_id || null;

    var connection = await db.getConnectionByType('read', cid);

    let properties = await Property.findAllActive(connection, property_id, company_id);

    if (properties.length) {

        for (let i = 0; i < properties.length; i++) {
            await queue.create('process_lease_statuses', {
                cid: cid,
                property: properties[i],
                type: 'createInvoices',
                dryrun: dryrun,
                date: date
            }).save();
        }
    }
    await db.closeConnection(connection);
};

var runLeaseStatusDiscrepancies = async (cid, params) => {

    params = params || {};

    let date = params.date || moment().format('YYYY-MM-DD');
    let dryrun = params.dryrun;
    let property_id = params.property_id;
    let company_id = params.company_id;
    let created_at = params.created_at;

    var connection = await db.getConnectionByType('read', cid);

    let properties = await Property.findAllActive(connection, property_id, company_id);

    if (properties.length) {

        for (let i = 0; i < properties.length; i++) {
            await queue.create('lease_status_discrepancies', {
                cid: cid,
                company_id: company_id,
                property: properties[i],
                dryrun: dryrun,
                date: date,
                created_at: created_at,
                admin: params.admin || {}

            }).save();
        }
    }
    await db.closeConnection(connection);
};

const runAutoReconcile = async (cid, data) => {

    try {
        var connection = await db.getConnectionByType('read', cid);

        let property_id = data.property_id || null;
        let company_id = data.company_id || null;
        let created_at = data.created_at || null;
        let min_hour = null;
        let max_hour = null;

        if (!property_id && !company_id) {
            min_hour = 0;
            max_hour = 1;
        }


        let properties = await Property.findAllActive(connection, property_id, company_id, min_hour, max_hour, created_at);
        if (properties.length) {


            for (let i = 0; i < properties.length; i++) {

                // TODO GENERATE TRACE ID
                await Queue.add('auto_reconcile_routine', {
                    cid: cid,
                    company: company_id,
                    property: properties[i],
                    dryrun: data.dryrun,
                    date: data.date,
                    created_at: data.created_at,
                    admin: data.admin || {}
                });
            }
        }
    }
    catch (err) {
        console.log('AutoReconcile Error ');
        console.log(err);
        console.log(err.stack);
    } finally {
        await db.closeConnection(connection);
    }
};

var runInvoiceCreateRoutine = async (cid, data) => {

    try {

        var connection = await db.getConnectionByType('read', cid);
        data = data || {};

        let date = data.date || moment().format('YYYY-MM-DD'); // this will be start date for invoice creation routine
        let till_date = data.till_date || date; // this will end date till which we add the invoice creation routine in que. If not passed from admin panel, it will be same as start date i.e. run routine for 1 day only.
        let dryrun = data.dryrun || false;
        let property_id = data.property_id || null;
        let lease_id = data.lease_id || null;
        let company_id = data.company_id || null;
        let created_at = data.created_at || null;
        let min_hour = null;
        let max_hour = null;

        if (!property_id && !company_id) {
            min_hour = 0;
            max_hour = 1;
        }

        let properties = await Property.findAllActive(connection, property_id, company_id, min_hour, max_hour, created_at);

        if (properties.length) {
            while(moment(date).isSameOrBefore(till_date)){
                for (let i = 0; i < properties.length; i++) {

                    let payload = {
                        cid: cid,
                        property: properties[i],
                        type: 'createInvoices',
                        dryrun: dryrun,
                        date: date,
                        lease_id: lease_id,
                        created_at: created_at,
                        admin: data.admin || {},
                        host_machine_name: ''
                    }

                    let exists = await jobAlreadyInQue('create_invoice_routine', payload);
                    if(exists) {
                        console.log("create_invoice_routine :: job with same specifications already exists in Queue!!");
                        return;
                    };

                    await Queue.add('create_invoice_routine', payload);
                }

                date = moment(date, 'YYYY-MM-DD').add(1, 'd').format('YYYY-MM-DD');
            }
        }
    } catch (err) {

        console.log(err);
        console.log(err.stack);
    }

    await db.closeConnection(connection);
};


var runPaymentCycleRevertRoutine = async (cid, data) => {
    try {

        var connection = await db.getConnectionByType('read', cid);
        data = data || {};

        let date = data.date || moment().format('YYYY-MM-DD');
        let property_id = data.property_id || null;
        let lease_id = data.lease_id || null;
        let company_id = data.company_id || null;
        let created_at = data.created_at || null;
        let min_hour = null;
        let max_hour = null;

        if (!property_id && !company_id) {
            min_hour = 0;
            max_hour = 1;
        }

        let properties = await Property.findAllActive(connection, property_id, company_id, min_hour, max_hour, created_at);

        if (properties.length) {
            for (let i = 0; i < properties.length; i++) {
                await Queue.add('revert_payment_cycle', {
                    cid: cid,
                    property: properties[i],
                    date: date,
                    lease_id: lease_id,
                    created_at: created_at,
                    admin: data.admin || {}
                });
            }
        }
    } catch (err) {

        console.log(err);
        console.log(err.stack);
    }
}


var runAdvanceInvoicesExportsRoutine = async (cid, data) => {
    try {
        var connection = await db.getConnectionByType('read', cid);
        data = data || {};

        let date = data.date || moment().format('YYYY-MM-DD');
        let property_id = data.property_id || null;
        let company_id = data.company_id || null;
        let created_at = data.created_at || null;
        let min_hour = null;
        let max_hour = null;

        if (!property_id && !company_id) {
            min_hour = 0;
            max_hour = 1;
        }

        let properties = await Property.findAllActive(connection, property_id, company_id, min_hour, max_hour, created_at);

        if (properties.length) {
            for (let i = 0; i < properties.length; i++) {
                await Queue.add('advance_invoices_exports', {
                    cid: cid,
                    property: properties[i],
                    date: date
                });
            }
        }
    } catch (err) {
        console.log(err);
        console.log(err.stack);
    }

    await db.closeConnection(connection);
};

var runRevenueRecognitionRoutine = async (cid, data) => {

    try {

        var connection = await db.getConnectionByType('read', cid);
        data = data || {};

        let date = data.date || moment().format('YYYY-MM-DD');
        let property_id = data.property_id || null;
        let company_id = data.company_id || null;
        let created_at = data.created_at || null;
        let min_hour = null;
        let max_hour = null;

        if (!property_id && !company_id) {
            min_hour = 0;
            max_hour = 1;
        }

        let properties = await Property.findAllActive(connection, property_id, company_id, min_hour, max_hour, created_at);

        if (properties.length) {
            for (let i = 0; i < properties.length; i++) {
                await Queue.add('revenue_recognition_routine', {
                    cid: cid,
                    property: properties[i],
                    type: 'revenueRecognition',
                    date: date,
                    //created_at: created_at,
                    //admin: data.admin || {}
                });
            }
        }
    } catch (err) {

        console.log(err);
        console.log(err.stack);
    }

    await db.closeConnection(connection);
};

var runVerifyAutoChargesRoutine = async (cid, data, params) => {

    var connection = await db.getConnectionByType('read', cid);

    try {
        data = data || {};
        params = params || {};
        let date = params.date || moment().format('YYYY-MM-DD');
        let dryrun = params.dryrun || false;
        let property_id = params.property_id || null;
        let company_id = params.company_id || null;

        let properties = await Property.findAllActive(connection, property_id, company_id);

        if (properties.length) {
            for (let i = 0; i < properties.length; i++) {
                await queue.create('verifyAutoCharges', {
                    cid: cid,
                    property: properties[i],
                    dryrun: dryrun,
                    date: date,
                    admin: data.admin || {}
                }).save();
            }
        }
    } catch (err) {
        console.log(err);
        console.log(err.stack);
    }

    await db.closeConnection(connection);
};

var runProcessAutoPaymentsRoutine = async (cid, params) => {

    var connection = await db.getConnectionByType('read', cid);

    try {

        params = params || {};

        let date = params.date || moment().format('YYYY-MM-DD');
        let dryrun = params.dryrun || false;
        let property_id = params.property_id || null;
        let company_id = params.company_id || null;
        let created_at = params.created_at || null;

        let min_hour = null;
        let max_hour = null;

        if (!property_id && !company_id) {
            min_hour = 0;
            max_hour = 1;
        }
        let properties = await Property.findAllActive(connection, property_id, company_id, min_hour, max_hour, created_at);

        if (properties.length) {

            for (let i = 0; i < properties.length; i++) {

                const payload = {
                    cid: cid,
                    property: properties[i],
                    type: 'auto_payment_routine',
                    dryrun: dryrun,
                    date: date,
                    created_at: created_at,
                    admin: params.admin || {},
                    host_machine_name: ''
                }

                let exists = await jobAlreadyInQue('auto_payment_routine', payload)
                if(exists){
                    console.log("auto_payment_routine :: Job with same specifications already exists in Queue!!")
                    continue;
                }

                await Queue.add('auto_payment_routine', payload);
            }
        }
    } catch (err) {

        console.log(err);
        console.log(err.stack);
    }

    await db.closeConnection(connection);
};

const runRateRaiseRoutine = async (cid, data = {}) => {
    const connection = await db.getConnectionByType('read', cid).catch(() => null);
    try {
        if(!connection) return
        let 
            date = data.date || moment().format('YYYY-MM-DD'),
            triggered_at = moment().format('YYYY-MM-DD HH:mm:ss'),
            min_hour = 0,
            max_hour = 1;

        if (data?.bypass == 'true') {
            min_hour = null;
            max_hour = null;
        }
        let properties = await rentManagement.getRentManagementEnabledProperties(connection, data.company_id, data.property_id, min_hour, max_hour);

        if (!properties) return;

        console.log(`\n---->>>>>> Running Rent Management Cron Job For ${data?.company_id} <<<<<<----\n`)

        let { id: hbAppContactId } = await models.Contact.findContactByAppId(connection, process.env.HUMMINGBIRD_APP_ID) || {};

        let jobs = [];
        for (let i = 0; i < properties.length; i++) {
            // await rentManagementWorkFlows.rent_management_cron_job({
            let job = await Queue.add('rent_management_cron_job', {
                date,
                cid,
                property: properties[i],
                admin: data.admin || {},
                hbAppContactId,
                priority: 1,
                triggered_at: triggered_at,
                event_name: ENUMS.LOGGING.RENT_MANAGEMENT_CRON,
                bypass: data?.bypass == 'true'
            });
            // jobs[properties[i].id] = job?.id || null;
            jobs.push({
                property_id: properties[i].id,
                job_id: job?.id || null
            });
        }
        rentManagement.sendRentManagementCronLogs({
            data: data,
            stage: `Triggered`,
            method: `runRateRaiseRoutine`,
            time: triggered_at,
            scheduled_jobs: jobs
        }, null);

    } catch (err) {
        console.log(` ***** Error FROM ${data.company_id} ****** `);
        console.log(err);
        console.log(err.stack);
    } finally {
        if(connection) {
            await db.closeConnection(connection);
        }
    }
};

var runBalanceAdjustmentRoutine = async (cid, data) => {
    try {
        data = data || {};
        let company_id = data.company_id || null;
        let property_id = data.property_id || null;
        let contact_id = data.contact_id || null;
        let admin = data.admin || {};

        let payload = {
            cid,
            company_id,
            property_id,
            contact_id,
            admin,
            host_machine_name: ''
        };

        let exists = await jobAlreadyInQue('balance_adjustment_routine', payload)
        if(exists){
            console.log("balance_adjustment_routine :: Job with same specifications already exists in Queue!!")
            return;
        }

        await Queue.add('balance_adjustment_routine', payload, { priority: 1 });
    } catch (err) {
        console.log(err);
        console.log(err.stack);
    }
};

var runSettlePaymentsRoutine = async (cid, data) => {
    try {
        data = data || {};
        let company_id = data.company_id || null;
        let property_id = data.property_id || null;
        let lease_id = data.lease_id || null;
        let admin = data.admin || {};
        let dryrun = data.dryrun || null;

        let payload = {
            cid,
            company_id,
            property_id,
            lease_id,
            admin,
            dryrun,
            host_machine_name: ''
        };

        let exists = await jobAlreadyInQue('settle_payment_routine', payload)
        if(exists){
            console.log("settle_payment_routine :: Job with same specifications already exists in Queue!!")
            return;
        }

        await Queue.add('settle_payment_routine', payload);
    } catch (err) {
        console.log(err);
        console.log(err.stack);
    }
};

var runMergeDocumentRoutine = async (cid, data) => {
    try {

        await Queue.add('merge_document_routine', {
            cid,
            ...data
        });
    } catch (err) {
        console.log(err);
        console.log(err.stack);
    }
};

var runEndDelinquencyRoutine = async (cid, data) => {
    try {
        data = data || {};
        const { company_id, property_id, lease_id } = data;

        let payload = {
            cid,
            company_id,
            property_id,
            lease_id,
            host_machine_name: ''
        }

        let exists = await jobAlreadyInQue('end_delinquency_routine', payload);
        if(exists) {
            console.log("end_delinquency_routine :: job with same specifications already exists in Queue!!")
            return;
        }

        await Queue.add('end_delinquency_routine', payload);
    } catch (err) {
        console.log('Run delinquency routine - schedular err: ', err);
        console.log(err.stack);
    }
};

var runConfigureContactTokenRoutine = async (cid, data) => {
    try {
        data = data || {};
        let company_id = data.company_id;
        let dryrun = data.dry_run;
        
        console.log("runConfigureContactTokenRoutine: " ,data);

        await Queue.add('configure_contact_token_routine', {
            cid,
            company_id,
            dryrun
        });
    } catch (err) {
        console.log(err);
        console.log(err.stack);
    }
};


var runConfigureContactTokenRoutine = async (cid, data) => {
    try {
        data = data || {};
        let company_id = data.company_id;
        let dryrun = data.dry_run;
        
        console.log("runConfigureContactTokenRoutine: " ,data);

        await Queue.add('configure_contact_token_routine', {
            cid,
            company_id,
            dryrun
        });
    } catch (err) {
        console.log(err);
        console.log(err.stack);
    }
};

/* Runs Workflow in order based on property
1. Invoice Generation
2. Auto Reconcile
3. Auto Payment
4. Triggers
*/
var runTransactionsRoutine = async (cid, data) => {
    try {
        console.log("cid", cid);
        var connection = await db.getConnectionByType('read', cid);

        data = data || {};
 
        var date = data.date || moment().format('YYYY-MM-DD');
        let property_id = data.property_id || null;
        let company_id = data.company_id || null;
        let dryrun = data.dryrun || null;
        let created_at = data.created_at || null;

        let min_hour = null;
        let max_hour = null;

        // property_id = 41;
        // company_id = cid;
        if (!property_id) {
            min_hour = 0;
            max_hour = 1;
        }

        let properties = await Property.findAllActive(connection, property_id, company_id, min_hour, max_hour, created_at);
        console.log("Transactions Properties: ", properties);

        if (properties.length) {
            console.log("Adding to queue ");

            for (let i = 0; i < properties.length; i++) {
                await Queue.add('run_transaction_flow', {
                    cid: cid,
                    company_id: company_id,
                    property: properties[i],
                    dryrun,
                    date,
                    created_at,
                    admin: data.admin || {},
                    action_source: Enums.DELINQUENCY_SOURCE.ROUTINE
                });
            }
        }

    } catch (err) {
        console.log(err);
        console.log(err.stack);
    }

    await db.closeConnection(connection);
};

var runHistoricAccountingExports = async (cid, data) => {      
    try {   
        console.log(`->::/modules/scheduler.js - runHistoricAccountingExports()::START`);

        data = {
            ...data,
            min_hour: 2,
            max_hour: 3,
            prior_days: 4,
            source: 'auto'
        };
        await runPopulateExportsRoutine(cid, data);

        console.log(`->::/modules/scheduler.js - runHistoricAccountingExports()::END`);
    } catch(err) {    
        console.log("->::Error in runHistoricAccountingExports");
        console.log(err.stack);
    }
};

var runPopulateExportsRoutine = async (cid, data) => {
    try {
        var connection = await db.getConnectionByType('read', cid);
        data = data || {};
        
        let { company_id, property_id, min_hour, max_hour, created_at, from_date, to_date, prior_days, source = 'admin' } = data;
        let properties = await Property.findAllActive(connection, property_id, company_id, min_hour, max_hour, created_at);

        if (properties.length) {
            if(!from_date && !to_date && prior_days) {
                let property = new Property({ id: properties[0].id });
                await property.find(connection);
                const currentPropertyDate = await property.getLocalCurrentDate(connection);
                from_date = moment(currentPropertyDate).subtract(prior_days + 1, "days").format('YYYY-MM-DD');
                to_date = moment(currentPropertyDate).subtract(1, "days").format('YYYY-MM-DD');
            }
            for (let i = 0; i < properties.length; i++) {
                const payload = {
                    cid,
                    property_id: properties[i].id,
                    from_date,
                    to_date,
                    source,
                    host_machine_name: ''
                };

                let exists = await jobAlreadyInQue('run_accounting_flow', payload);
                if(exists) {
                    console.log("run_accounting_flow :: Job with same specifications already exists in Queue: ", payload);
                    continue;
                }
                await Queue.add('run_accounting_flow', {
                    ...payload
                });
            }
        }
           
    } catch (err) {
        console.log(err);
        console.log(err.stack);
    } finally {
        await db.closeConnection(connection);
    }
};

var runGenerateInvoiceAllocation = async (cid, data) => {
    try {
        data = data || {};
        let { company_id, property_id, invoice_id } = data;
        
        await Queue.add('generate_invoice_allocation_routine', {
            cid,
            company_id,
            property_id,
            invoice_id
        }, { priority: 1 });
        
    } catch (err) {
        console.log(err);
        console.log(err.stack);
    } finally {
    }
};

var runSendEmailsForInvoices = async (data) => {
    try {
        data = data || {};
        let { companies, created_date_start, created_date_end, due_date_start, due_date_end } = data;

        await Queue.add('send_missing_invoice_emails', {
            companies,
            created_date_start,
            created_date_end,
            due_date_start,
            due_date_end
        });
        
    } catch (err) {
        console.log(err);
        console.log(err.stack);
    } finally {
    }
};


var runAuctionDayRoutine = async (cid, data, params) => {

    var connection = await db.getConnectionByType('read', cid);
    try {

        data = data || {};
        params = params || {};

        var date = data.date || moment().format('YYYY-MM-DD');
        let property_id = data.property_id || null;
        let company_id = data.company_id || null;
        let created_at = data.created_at || null;
        let min_hour = null;
        let max_hour = null;

        if (!property_id) {
            min_hour = 0;
            max_hour = 1;
        }

        let properties = await Property.findAllActive(connection, property_id, company_id, min_hour, max_hour, created_at);

        if (properties.length) {

            for (let i = 0; i < properties.length; i++) {
                await Queue.add('auction_day_routine', {
                    cid,
                    property_id: properties[i].id,
                    date,
                });
            }
        }
    } catch (err) {
        console.log(err);
        console.log(err.stack);
    }

    await db.closeConnection(connection);

};

var runCloseOfDayRoutine = async (cid, data) => {

    var connection = await db.getConnectionByType('read', cid);
    try {

        data = data || {};

        var date = data.date;
        let property_id = data.property_id || null;
        let company_id = data.company_id || null;
        let created_at = data.created_at || null;
        let min_hour = null;
        let max_hour = null;

        if (!property_id) {
            min_hour = 0;
            max_hour = 1;
        }

        let properties = await Property.findAllActive(connection, property_id, company_id, min_hour, max_hour, created_at);

        if (properties.length) {

            if(!date){
                let offset = properties[0].utc_offset ? properties[0].utc_offset : "+00:00"
                date = moment().utcOffset(parseInt(offset)).subtract(1, "days").format('YYYY-MM-DD')
            }

            for (let i = 0; i < properties.length; i++) {
                await Queue.add('close_of_day_routine', {
                    cid,
                    property_id: properties[i].id,
                    date,
                });
            }
        }
    } catch (err) {
        console.log(err);
        console.log(err.stack);
    }

    await db.closeConnection(connection);

};

var runPropertyProgressRoutine = async (data) => {
    try {

        data = data || {};
        let company_id = data.company_id || null;
        let email = data.email || null;
   
        if (!(company_id && email)) {
          return;
        }

        await Queue.add('property_progress_routine', {
            ...data
        });

        }
     catch (err) {
        console.log(err);
        console.log(err.stack);
    }

};

var runAutoExpireLeadsRoutine = async (cid, data) => {

    var connection = await db.getConnectionByType('read', cid);
    try {

        data = data || {};

        var date = data.date;
        let property_id = data.property_id || null;
        let company_id = data.company_id || null;
        let created_at = data.created_at || null;
        let min_hour = null;
        let max_hour = null;

        if (!property_id) {
            min_hour = 0;
            max_hour = 1;
        }

        let properties = await Property.findAllActive(connection, property_id, company_id, min_hour, max_hour, created_at);

        if (properties.length) {

            if(!date){
                let offset = properties[0].utc_offset ? properties[0].utc_offset : "+00:00"
                date = moment().utcOffset(parseInt(offset)).subtract(1, "days").format('YYYY-MM-DD')
            }

            for (let i = 0; i < properties.length; i++) {
                await Queue.add('auto_expire_leads_routine', {
                    cid,
                    property_id: properties[i].id,
                    date,
                });
            }
        }
    } catch (err) {
        console.log(err);
        console.log(err.stack);
    }

    await db.closeConnection(connection);

};

var runRefreshUnitGroupRoutine = async (cid, data) => {
    try {
        let { procedure_conditions } = data || {}
        if(!cid) {
            console.log("Skipping due to invalid company id")
            return
        }
        let jobs = [
            {
                name: 'refresh_unit_group',
                data: {
                    cid,
                    procedure_conditions
                }
            }
        ]
        await Queue.addBulk(jobs)
    } catch (err) {
        console.log(err)
        console.log(err.stack)
    }
}

//
// var runReportsRoutine = function(cid, data) {
//
//     var connection = {};
//     db.getConnectionByType('read', cid).then(function(conn) {
//         connection = conn;
//         return models.Report.findScheduledReports(connection);
//
//     }).each(function(report) {
//         console.log("REPORT", report);
//         var job = {
//             report_id: report.id
//         };
//         var fn = '';
//         switch (report.report_id) {
//             case 1:
//                 fn = 'invoice_summary';
//                 break;
//             case 2:
//                 fn = 'maintenance_summary';
//                 break;
//             case 3:
//                 fn = 'invoice_detail';
//                 break;
//             case 4:
//                 fn = 'charges_summary';
//                 break;
//             case 5:
//                 fn = 'billing_summary';
//                 break;
//         }
//         return queue.create('report_' + fn, job).save();
//     }).catch(function(err) {
//         console.log(err);
//         console.log(err.stack);
//     }).finally(() => utils.closeConnection(pool, connection))
// };
//
// var sendAutoPaymentSummary = function(cid, data) {
//
//     var connection = {};
//     db.getConnectionByType('read', cid).then(function(conn) {
//         connection = conn;
//
//         return models.Company.findAll(connection).map(function(company) {
//             return queue.create('auto_payment_summary', {
//                 company_id: company.id,
//                 date: moment().format('YYYY-MM-DD')
//             }).save();
//         });
//     }).catch(function(err) {
//         console.log(err);
//         console.log(err.stack);
//     }).finally(() => utils.closeConnection(pool, connection));
// };

var sendChargesSummary = function (cid, data) {

    var connection = {};
    db.getConnectionByType('read', cid).then(function (conn) {
        connection = conn;
        return models.Company.findAll(connection).map(function (company) {
            return queue.create('sendChargesSummary', {
                cid,
                company: company,
                type: 'sendSummary'
            }).save();
        });
    }).catch(function (err) {
        console.log(err);
        console.log(err.stack);
    }).finally(() => db.closeConnection(connection));
}

var triggerTriggers = async (cid, data) => {


    try {
        var connection = await db.getConnectionByType('read', cid);
        data = data || {};
        var date = data.date;
        let property_id = data.property_id || null;
        let company_id = data.company_id || null;
        let admin = data.admin || {};

        let dryrun = data.dryrun || false;
        let created_at = data.created_at || null;
        let min_hour = null;
        let max_hour = null;

        if (!property_id && !company_id) {
            min_hour = 0;
            max_hour = 1;
        }

        let properties = await Property.findAllActive(connection, property_id, company_id, min_hour, max_hour, created_at);


        if (properties.length) {
            for (let i = 0; i < properties.length; i++) {
                await Queue.add('run_trigger_routine', {
                    cid: cid,
                    property: properties[i],
                    date: date,
                    dryrun: dryrun,
                    type: data.type,
                    run_actions: data.run_actions,
                    lease_id: data.lease_id, 
                    created_at: created_at,
                    admin: admin,
                    action_source: data.action_source
                });
            }
        }
    } catch (err) {
        console.log(err);
        console.log(err.stack);
    }

    await db.closeConnection(connection);
};

var runErrorStateSummaryRoutine = async (cid, data, params) => {

    try {
        var connection = await db.getConnectionByType('read', cid)
        params = params || {};
        let date = params.date || moment().format('YYYY-MM-DD');
        let property_id = params.property_id || null;
        let company_id = params.company_id || null;
        let created_at = params.created_at || null;
        let min_hour = null;
        let max_hour = null;

        if (!property_id && !company_id) {
            min_hour = 0;
            max_hour = 1;
        }
        let properties = await Property.findAllActive(connection, property_id, company_id, min_hour, max_hour, created_at);
        if (properties.length) {

            await queue.create('createErrorStateReports', {
                cid,
                properties: properties,
                type: 'createErrorStateReports',
                date: date
            }).save();
        }
    } catch (err) {
        console.log(err);
        console.log(err.stack);
    }
    await db.closeConnection(connection);
};

var runSevereErrorStateSummaryRoutine = async (cid, data, params) => {
    try {
        var connection = await db.getConnectionByType('read', cid)
        params = params || {};
        let date = params.date || moment().format('YYYY-MM-DD');
        let property_id = params.property_id || null;
        let company_id = params.company_id || null;
        let created_at = params.created_at || null;
        let min_hour = null;
        let max_hour = null;

        if (!property_id && !company_id) {
            min_hour = 0;
            max_hour = 1;
        }
        let properties = await Property.findAllActive(connection, property_id, company_id, min_hour, max_hour, created_at);

        if (properties.length) {

            await queue.create('createSevereErrorStateReports', {
                cid,
                properties: properties,
                type: 'createSevereErrorStateReports',
                date: date
            }).save();
        }
    } catch (err) {
        console.log(err);
        console.log(err.stack);
    }
    await db.closeConnection(connection);
};

var verifyTriggers = async (cid, data) => {
    try {
        var connection = await db.getConnectionByType('read', cid)
        await queue.create('verifyTriggers', {
            cid,
            property_id: data.property_id,
            company_id: data.company_id,
            date: data.date,
            trigger_id: data.trigger_id
        }).save();

    } catch (err) {
        console.log(err);
        console.log(err.stack);
    }

    await db.closeConnection(connection);
};

var sendAdvanceRentalEmails = async (cid, data) => {


    try {
        var connection = await db.getConnectionByType('read', cid)

        data = data || {};


        // let queue = data.queue;

        let date = data.date || moment().format('YYYY-MM-DD');
        let property_id = data.property_id || null;
        let company_id = data.company_id || null;
        let created_at = data.created_at || null;
        let min_hour = null;
        let max_hour = null;

        if (!property_id) {
            min_hour = 0;
            max_hour = 8;
        }

        let properties = await Property.findAllActive(connection, property_id, company_id, min_hour, max_hour, created_at);

        if (properties.length) {

            for (let i = 0; i < properties.length; i++) {
                await queue.create('sendAdvanceRentalEmails', {
                    cid,
                    property: properties[i],
                    date
                }).save();
            }
        }
    } catch (err) {

        console.log(err);
        console.log(err.stack);
    }

    await db.closeConnection(connection);
};

var runScheduleExportsRoutine = async (cid, data) => {

    try {

        var connection = await db.getConnectionByType('read', cid);
        let date = data.date || moment().format('YYYY-MM-DD');
        let dryrun = data.dryrun || false;
        let property_id = data.property_id || null;
        let company_id = data.company_id || null;
        let created_at = data.created_at || null;
        let min_hour = null;
        let max_hour = null;
        let start_date = null;
        let end_date = null;
        let export_range = null;

        if (!property_id) {
            min_hour = 0;
            max_hour = 1;
        }

        let properties = await Property.findAllActive(connection, property_id, company_id, min_hour, max_hour, created_at);

        if (properties.length) {
            const activePropertiesScheduledExports = await Report.findScheduleExportsByMinPropertyOffset(connection, {
                property_ids: properties.map(p => p.id)
            });

            console.log('Schedule exports: ', activePropertiesScheduledExports);

            let company = new Company({ id: company_id });
            await company.find(connection);

            for (let i = 0; i < activePropertiesScheduledExports.length; i++) {
                const scheduleExport = activePropertiesScheduledExports[i];

                let export_config = await models.Report.findScheduleExportById(connection, {
                    accounting_export_configuration_id: scheduleExport.id,
                    date: date,
                    utc_offset: scheduleExport.min_offset
                });

                console.log('Export Configuration: ', export_config);

                if (export_config) {
                    switch (export_config.frequency) {
                        case 'daily':
                            start_date = null;
                            end_date = moment(date).subtract(1, 'day').format('YYYY-MM-DD');
                            export_range = 'date';
                            break;
                        case 'weekly':
                            start_date = moment(date).subtract(1, 'week').format('YYYY-MM-DD');
                            end_date = moment(date).subtract(1, 'day').format('YYYY-MM-DD');
                            export_range = 'date_range';
                            break;
                        case 'biweekly':
                            start_date = moment(date).subtract(2, 'week').format('YYYY-MM-DD');
                            end_date = moment(date).subtract(1, 'day').format('YYYY-MM-DD');
                            export_range = 'date_range';
                            break;
                        case 'monthly':
                            start_date = moment(date).subtract(1, 'month').format('YYYY-MM-DD');
                            end_date = moment(date).subtract(1, 'day').format('YYYY-MM-DD');
                            export_range = 'date_range';
                            break;
                        case 'quarterly':
                            start_date = moment(date).subtract(1, 'Q').startOf('quarter').format('YYYY-MM-DD');
                            end_date = moment(date).subtract(1, 'Q').endOf('quarter').format('YYYY-MM-DD');
                            export_range = 'date_range';
                            break;
                    }

                    let filename = AccountingUtils.generateFileName({
                        format: export_config.format, 
                        type: export_config.type, 
                        start_date, 
                        end_date
                    });

                    await Queue.add('run_export_flow', {
                        dryrun: dryrun,
                        company_id,
                        owner_id: company.gds_owner_id,
                        cid,
                        date,
                        config_id: export_config.config_id,
                        property_ids: JSON.parse(export_config.property_ids),
                        format: export_config.format,
                        type: export_config.type,
                        export_range: export_range,
                        start_date: start_date,
                        end_date: end_date,
                        frequency: export_config.frequency,
                        generated_by: null,
                        book_id: export_config.book_id,
                        filename,
                        ...(export_config.send_to && {
                            send_to: export_config.send_to
                        }),
                    });
                }
            }
        }

        /*if (properties.length) {
            for (let i = 0; i < properties.length; i++) {
                let export_config = await models.Report.findScheduleExportsByProperty(connection,company_id, properties[i].id,date);
                for(let j=0; j < export_config.length; j++) {
                    switch(export_config[j].frequency){
                        case 'daily':
                            start_date = null;
                            end_date = moment(date).subtract(1,'day').format('YYYY-MM-DD');
                            export_range = 'date';
                        break;
                        case 'weekly':
                            start_date = moment(date).subtract(1,'week').format('YYYY-MM-DD');
                            end_date = moment(date).subtract(1,'day').format('YYYY-MM-DD');
                            export_range = 'date_range';
                        break;
                        case 'biweekly':
                            start_date = moment(date).subtract(2,'week').format('YYYY-MM-DD');
                            end_date = moment(date).subtract(1,'day').format('YYYY-MM-DD');
                            export_range = 'date_range';
                        break;
                        case 'monthly':
                            start_date = moment(date).subtract(1,'month').format('YYYY-MM-DD');
                            end_date = moment(date).subtract(1,'day').format('YYYY-MM-DD');
                            export_range = 'date_range';
                        break;
                        case 'quarterly':
                            start_date = moment(date).subtract(1,'Q').startOf('quarter').format('YYYY-MM-DD');
                            end_date = moment(date).subtract(1,'Q').endOf('quarter').format('YYYY-MM-DD');
                            export_range = 'date_range';
                        break;
                    }

                    let filename = AccountingUtils.generateFileName({
                        format: export_config[j].format, 
                        type: export_config[j].type, 
                        start_date, 
                        end_date
                    });

                    await Queue.add('run_export_flow', {
                        dryrun: dryrun,
                        company_id,
                        cid,
                        date,
                        config_id:  export_config[j].config_id,
                        property_ids: ['41', '44'],
                        property_id: properties[j].id,
                        format: export_config[j].format,
                        type: export_config[j].type,
                        export_range: export_range,
                        start_date: start_date,
                        end_date:  end_date,
                        frequency: export_config[j].frequency,
                        generated_by: null,
                        book_id: export_config[j].book_id,
                        filename,
                        ...(export_config[j].send_to && {
                            send_to: export_config[j].send_to
                          }),
                    });
                }
            }
        }*/
    } catch (err) {

        console.log(err);
        console.log(err.stack);
    } finally {
        await db.closeConnection(connection);
    }

};
//MVP TI-12317 POC START

var runMonthlyTenantPaymnetTransaction = async (cid, data, params) => {

    console.log("MVP TI - 12317 POC Invoked Scheduler.runMonthlyTenantPaymnetTransaction")
 
        try {
            data = data || {};
            params = params || {};
            let date = params.date || moment().format('YYYY-MM-DD');
            let dryrun = params.dryrun || false;
            let property_id = params.property_id || null;
            let company_id = params.company_id || null;

            //Get Master List of Companies
            let companies = await db.getAllCompanies();

            if (companies.length) {
                    await queue.create('runMonthlyTenantPaymnetTransaction', {
                        data: companies,
                        dryrun: dryrun,
                        date: date,
                        admin: data.admin || {}
                    }).save();
            }
        } catch (err) {
            console.log(err);
            console.log(err.stack);
        }

};

var processMonthlyTenantPaymnetTransaction = async (cid, data, params) => {

        var properties_ids = [];
        var data = data;
        console.log("Tenant Paymnet Job - Property Level ");
    try {
        var connection = await db.getConnectionByType('read', cid);

        let properties = await Property.findByCompanyIdtp(connection, data.company_id);
        if (properties.length) {
            for (let i = 0; i < properties.length; i++) {
                console.log("Tenant Paymnet Property : " + properties[i].id + " :: Name : " + properties[i].name);
                await Queue.add('run_tenantPayment_flow', {
                    cid: cid,
                    property: properties[i]
                });
            }
        } else {
            console.log("No Tenant Paymnet Properties found for Company :: :: ::  " + cid);
        }

    } catch (err) {
        console.log(err);
        console.log(err.stack);
    }
    finally {
        await db.closeConnection(connection);
    }
};
//MVP TI-12317 POC END

var runTenantPaymentsPayouts = async (cid, data) => {      
    let connection = null;
    let propay_db_connection = null;
    try {   
        console.log(`->::/modules/scheduler.js - runTenantPaymentsPayouts()::START`);
        connection = await db.getConnectionByType('read', cid);
        propay_db_connection = await db.get_propay_db_connection();        
        data = data || {};
        let date = moment().format('YYYY-MM-DD hh:mm:ss');
        console.log("runTenantPaymentsPayouts : ", date);

        let properties = await Property.findByCompanyIdtp(connection, data.company_id);

        if (properties.length) {
            for (let i = 0; i < properties.length; i++) {
                let compute_required = await models.Payout.getComputePayoutRequiredForProperty(
                        propay_db_connection, cid, properties[i].id, process.env.PROPAY_ACTIVE_ACCOUNT_TABLE);
                console.log(cid, properties[i].id, "compute_required ", compute_required);
                if (compute_required && compute_required.length > 0 && compute_required[0].compute_payout) {
                    await Queue.add('tenant_payments_payouts', {
                        cid,
                        company_id : data.company_id,
                        property_id: properties[i].id,
                        date,
                        send_email : compute_required[0].send_email
                    });
                }
            }
        }
  
        console.log(`->::/modules/scheduler.js - runTenantPaymentsPayouts()::END`);
    } catch(err) {    
        console.log("->::Error in runTenantPaymentsPayouts");
        console.log(err.stack);
    } finally {
        await db.closeConnection(connection);
        await db.close_propay_db_connection(propay_db_connection);
    }
};

var runExecuteScriptsRoutine = async (db_configs, queries, file_name) => {
    try {
        console.log("runExecuteScriptsRoutine");

        for (let i = 0; i < db_configs.length; i++) {
            const db_config = db_configs[i];
            
            for (let j = 0; j < db_config?.schemas.length; j++) {
                const schema = db_config.schemas[j];
                
                let payload = {
                    database: db_config.database,
                    schema,
                    file_name,
                    queries
                };

                let exists = await jobAlreadyInQue('execute_scripts_routine', payload);
                if(exists){
                    console.log(`execute_scripts_routine :: Job with same specifications (i.e., RDS - ${db_config.database} , SCHEMA - ${schema}) already exists in Queue!!`)
                    continue;
                }
                await Queue.add('execute_scripts_routine', payload, { priority: 1 });
            }
        }
    } catch (err) {
        console.log("Error in runExecuteScriptsRoutine", err);
        console.log(err.stack);
    }
};

var jobAlreadyInQue = async (job_name,data) => {

    let jobs = await Queue.getJobs(["active","wait"]);
    jobs = jobs.filter(que_job => que_job.name === job_name);

    let data_keys = Object.keys(data).filter(key => data[key]);
    let present = false;

    for(let job of jobs) {

        let job_keys = Object.keys(job.data).filter(key => job.data[key]);

        if(areEqual(job_keys,data_keys)){
            for(let _key of job_keys){

                if(_key === 'created_at' || _key === 'admin' || _key === 'source' || _key === 'host_machine_name') continue;

                if(job.data[_key].constructor === Object){
                    present = job.data[_key].id === data[_key].id ? true : false
                }
                else{
                    present = job.data[_key] === data[_key] ? true : false;
                }

                if(!present) break;
            }
        }

        if(present) break;
        else continue;
    }

    return present;
};


var applyPromotions = async (cid, promotion_id = '', properties) => {

    try {
        if (properties.length) {
            for (let i = 0; i < properties.length; i++) {
                await Queue.add('run_promotion_routine', {
                    cid: cid,
                    property_id: properties[i],
                    promotion_id: promotion_id
                });
            }
        }

    } catch (err) {
        console.log(err);
        console.log(err.stack);
    }
};

function areEqual(array1, array2) {
    
    if (array1.length === array2.length) {
      return array1.every((element, index) => {
        if (element === array2[index]) {
          return true;
        }
  
        return false;
      });
    }
  
    return false;
};

var trigger_payouts = async () => {
    await queue.create('runTenantPaymentsPayouts', {}).save();
};

/* Currently only for Derrel's */
var runConsolidationInvoiceEmail = async (data) => {
    let company_id;
    if(Settings.is_uat) company_id = 1;
    else if(Settings.is_prod) company_id = 15;
    else if(Settings.is_staging) company_id = 1;

    try {
        let result = await rp({
            headers: {
                "Content-Type": 'application/json'
            },
            uri: Settings.getInvoiceConsolidationUrl(),
            method: 'POST',
            body:{
                companyID: company_id,
                month: parseInt(moment(data.created_at).format('M')), 
                year: parseInt(moment(data.created_at).format('YYYY')), 
                sendEmail: true,
                downloadFile: false,
                isAuto: true
            },
            json: true
        });
        
        if(result?.message === 'success')
            console.log(`Invoice consolidation API scheduled for pacific time ${data.created_at} was a successfully hit at pacific ${moment_tz.tz(moment(), 'America/Los_Angeles').format('YYYY-MM-DD HH:mm:ss')}`)
        else throw result
    } catch (err) {
        let payload = {event_name: ENUMS.LOGGING.INVOICE_CONSOLIDATION, logs: err };
        utils.sendLogs(payload);

        console.log(`Error occurred while sending invoice consolidation email :`, err);
    }
}

module.exports = {
    triggerTriggers: triggerTriggers,
    verifyTriggers: verifyTriggers,
    sendChargesSummary: sendChargesSummary,
    // runReportsRoutine: runReportsRoutine,
    runInvoiceCreateRoutine: runInvoiceCreateRoutine,
    runAdvanceInvoicesExportsRoutine: runAdvanceInvoicesExportsRoutine,
    runAutoReconcileRoutine: runAutoReconcile,
    runProcessAutoPaymentsRoutine: runProcessAutoPaymentsRoutine,
    runRateRaiseRoutine: runRateRaiseRoutine,
    runLeaseStatusUpdate: runLeaseStatusUpdate,
    runPaymentCycleRevertRoutine: runPaymentCycleRevertRoutine,
    runScheduleReport: runScheduleReport,
    trigger_payouts:trigger_payouts,
    runTenantPaymentsPayouts: runTenantPaymentsPayouts,
    runLeaseStatusDiscrepancies: runLeaseStatusDiscrepancies,
    runVerifyAutoChargesRoutine: runVerifyAutoChargesRoutine,
    runErrorStateSummaryRoutine: runErrorStateSummaryRoutine,
    runSevereErrorStateSummaryRoutine: runSevereErrorStateSummaryRoutine,
    runAuctionDayRoutine: runAuctionDayRoutine,
    runTransactionsRoutine: runTransactionsRoutine,
    sendAdvanceRentalEmails: sendAdvanceRentalEmails,
    runCloseOfDayRoutine: runCloseOfDayRoutine,
    runBalanceAdjustmentRoutine,
    runConfigureContactTokenRoutine,
    runAutoExpireLeadsRoutine: runAutoExpireLeadsRoutine,
    runRefreshUnitGroupRoutine: runRefreshUnitGroupRoutine,
    runRevenueRecognitionRoutine: runRevenueRecognitionRoutine,
    runScheduleExportsRoutine: runScheduleExportsRoutine,
    //MVP TI - 12317 POC START
    runMonthlyTenantPaymnetTransaction: runMonthlyTenantPaymnetTransaction,
    //MVP TI - 12317 POC START
    runPopulateExportsRoutine: runPopulateExportsRoutine,
    runGenerateInvoiceAllocation: runGenerateInvoiceAllocation,
    runSettlePaymentsRoutine,
    runRateManagementCronRoutine,
    runEndDelinquencyRoutine,
    runMergeDocumentRoutine,
    runHistoricAccountingExports,
    runConsolidationInvoiceEmail: runConsolidationInvoiceEmail,
    runSendEmailsForInvoices,
    runExecuteScriptsRoutine,
    // sendChargesToTenants: sendChargesToTenants,
    // applyLatePayments: applyLatePayments,
    // sendAutoPaymentSummary: sendAutoPaymentSummary,
    applyPromotions,
    kick: function (connectionPool, queue, kue) {

        setupQueues({}, queue, kue);

        console.log(moment().format('HH:mm:ss'));
        // this.loadTodos(pool);
        setInterval(function () {
            console.log(moment().format('YYYY-MM-DD HH:mm:ss'));
        }, 10000)

    },

    addJobs: function (jobs, fn) {
        var promises = [];

        var total = jobs.length;
        var count = 0;
        jobs.forEach(function (job, i) {
            var job = queue.create(job.category, job.data).save(function (err) {
                if (!err) console.log(job.data);
                count++;
                if (total == count) fn(null);
            });
        });

    },
    addJobsAsync: function (jobs, fn) {
        var promises = [];

        return Promise.mapSeries(jobs, (job, i) => {
            return new Promise((resolve, reject) => {
                return queue.create(job.category, job.data).save(function (err) {
                    if (err) console.log(err);
                    resolve();
                });
            })
        })
    },

    // loadTodos: function(pool) {
    //
    //     var connection = {};
    //     var event = {};
    //     pool.getConnectionAsync().then(function(conn) {
    //         connection = conn;
    //         return models.Event.findOpenTodos(connection).then(todos => {
    //             return Promise.mapSeries(todos, e => {
    //                 event = new Event(e);
    //                 return event.find(connection).then(() => {
    //                     return schedule.scheduleJob(moment(event.start_date).toDate(), function(event) {
    //                         event.ping();
    //                         return true;
    //                     }.bind(null, event));
    //                 })
    //             })
    //
    //         });
    //     }).catch(function(err) {
    //         console.log(err);
    //         console.log(err.stack);
    //     }).finally(() => utils.closeConnection(pool, connection))
    //
    // },
    scheduleEvent() {
        schedule.scheduleJob(s.time, s.fn.bind(null, { pool: pool, queue: queue, event_id: event.id }));
    }
};

function setupQueues(pool, queue, kue) {

    queue.on('job enqueue', function (id, type) {
        console.log('Job %s got queued of type %s', id, type);
    }).on('job complete', function (id, result) {
        kue.Job.get(id, function (err, job) {
            console.log(err);
            if (err) return;
            job.remove(function (err) {
                if (err) throw err;
                console.log('removed completed job #%d', job.id);
            });
        });
    });

    /* FROM KICKER */

    queue.process('runTriggers', async (job, done) => {
        // GET ALL Companies
        let companies = await db.getCompaniesByNamespace();
        for (let i = 0; i < companies.length; i++) {
            await triggerTriggers(companies[i].company_id, { 
                company_id: companies[i].hb_company_id,
                date: moment('YYYY-MM-DD') 
            });
        }
        done();
    });

    queue.process('runTransactionsRoutine', async (job, done) => {

        let companies = await db.getCompaniesByNamespace();
        for(let i = 0; i < companies.length; i++) {

            await runTransactionsRoutine(companies[i].company_id, { company_id: companies[i].hb_company_id, created_at: job.data.created_at });
        }
        done();
    });

    queue.process('runRateManagementCronRoutine', async (job, done) => {
        console.info("\n\n************ Starting Rate management routine ************\n\n")
        const companies = await db.getCompaniesByNamespace();
        for (let i = 0; i < companies.length; i++) {
            const { company_id, hb_company_id } = companies[i] ?? {}
            await runRateManagementCronRoutine({ company_id, hb_company_id })
        }
        console.info("\n\n************ Rate management routine completed ************\n\n")
        done();
    })

    queue.process('runAdvanceRentalRoutine', async (job, done) => {
        let companies = await db.getCompaniesByNamespace();
        for (let i = 0; i < companies.length; i++) {
            await sendAdvanceRentalEmails(companies[i].company_id, { company_id: companies[i].hb_company_id, created_at: job.data.created_at });
        }
        done();
    });


    queue.process('runInvoiceCreateRoutine', async (job, done) => {
        let companies = await db.getCompaniesByNamespace();
        for (let i = 0; i < companies.length; i++) {
            await runInvoiceCreateRoutine(companies[i].company_id, { company_id: companies[i].hb_company_id });
        }
        done();
    });

    queue.process('runProcessAutoPaymentsRoutine', async (job, done) => {
        let companies = await db.getCompaniesByNamespace();
        for (let i = 0; i < companies.length; i++) {
            await runProcessAutoPaymentsRoutine(companies[i].company_id, { company_id: companies[i].hb_company_id });
        }
        done();
    });

    queue.process('runRateRaiseRoutine', async (job, done) => {
        let companies = await db.getCompaniesByNamespace();
        console.log('*********** *********** Starting Rate Raise Routine *********** ***********')
        for (let i = 0; i < companies.length; i++) {
            await runRateRaiseRoutine(companies[i].company_id, { company_id: companies[i].hb_company_id, created_at: job.data.created_at });
        }
        console.log('*********** *********** Completed Rate Raise Routine *********** ***********')
        done();
    });
    
    queue.process('runConfigureContactTokenRoutine', async (job, done) => {
        let companies = await db.getCompaniesByNamespace();
        for (let i = 0; i < companies.length; i++) {
            await runConfigureContactTokenRoutine(companies[i].company_id, { company_id: companies[i].hb_company_id });
        }
        done();
    });

    
    queue.process('runConfigureContactTokenRoutine', async (job, done) => {
        let companies = await db.getCompaniesByNamespace();
        for (let i = 0; i < companies.length; i++) {
            await runConfigureContactTokenRoutine(companies[i].company_id, { company_id: companies[i].hb_company_id });
        }
        done();
    });

    queue.process('runBalanceAdjustmentRoutine', async (job, done) => {
        let companies = await db.getAllCompanies();
        for (let i = 0; i < companies.length; i++) {
            await runBalanceAdjustmentRoutine(companies[i].company_id);
        }
        done();
    });

    queue.process('runAuctionDayRoutine', async (job, done) => {
        let companies = await db.getCompaniesByNamespace();
        for (let i = 0; i < companies.length; i++) {
            await runAuctionDayRoutine(companies[i].company_id, { company_id: companies[i].hb_company_id, created_at: job.data.created_at });
        }
        done();
    });

    queue.process('runCloseOfDayRoutine', async (job, done) => {
        let companies = await db.getCompaniesByNamespace();
        for (let i = 0; i < companies.length; i++) {
            await runCloseOfDayRoutine(companies[i].company_id, { company_id: companies[i].hb_company_id });
        }
        done();
    });

    queue.process('runPropertyProgressRoutine', async (job, done) => {
        
        var connection = await db.getConnectionByType('read', 1);
        
        try{
            let companies = await models.Onboarding.getActivePropertyData(connection);
        

            if(companies && companies.length){
                for (let i = 0; i < companies.length; i++) {

                let res = OnboardingProperty.propertyProgressEmailConfig(companies[i]);
                if(res.sendMail)  await runPropertyProgressRoutine(res.data); 
                        
                }
            }
        }
        catch(err){
            console.log(err);
            console.log(err.stack);
        }
        await db.closeConnection(connection);
        done();
        
    });



    queue.process('runAutoExpireLeadsRoutine', async (job, done) => {
        let companies = await db.getCompaniesByNamespace();
        for (let i = 0; i < companies.length; i++) {
            await runAutoExpireLeadsRoutine(companies[i].company_id, { company_id: companies[i].hb_company_id, created_at: job.data.created_at });
        }
        done();
    });

    queue.process('runScheduleExportsRoutine', async (job, done) => {
        console.log("Im kicked! runScheduleExportsRoutine")
        let companies = await db.getAllCompanies();
        for (let i = 0; i < companies.length; i++) {
            await runScheduleExportsRoutine(companies[i].company_id, { company_id: companies[i].hb_company_id, created_at: job.data.created_at });
        }
        done();
    });

    //added by BCT for schedule report
    queue.process('runScheduleReport', async (job, done) => {
        let companies = await db.getAllCompanies();
        for (let i = 0; i < companies.length; i++) {            
            await runScheduleReport(companies[i].company_id, { company_id: companies[i].hb_company_id });
        }        
        done();
    });

    queue.process('runTenantPaymentsPayouts', async (job, done) => {
        let companies = await db.getAllCompanies();
        for (let i = 0; i < companies.length; i++) {
            console.log("Calling runTenantPaymentsPayouts for cid : ", companies[i].company_id);
            await runTenantPaymentsPayouts(companies[i].company_id, { company_id: companies[i].hb_company_id });
        }
        done();
    });

    queue.process('runHistoricAccountingExports', async (job, done) => {
        let companies = await db.getAllCompanies();
        for (let i = 0; i < companies.length; i++) {            
            await runHistoricAccountingExports(companies[i].company_id, { company_id: companies[i].hb_company_id, created_at: job.data.created_at });
        }        
        done();
    });

    queue.process('runConsolidationInvoiceEmail', async (job, done) => {
        console.log('runConsolidationInvoiceEmail job processed at', job.data.created_at) 
        await runConsolidationInvoiceEmail({created_at: job.data.created_at});
        done();
    });

    queue.process('testKicker', async (job, done) => {
        console.log("Im kicked!")
        done();
    });

    /* END FROM KICKER */


    /* JOBS FROM API SERVER */

    /* This should be deprecated, but its in use by API server for sending Documents */
    queue.process('message_to_user', async (job, done) => {
        var connection = await db.getConnectionByType('write', job.data.cid);
        await MessageRoutines.send_message(job.data, connection);
        await db.closeConnection(connection);
        console.log('Done!');
        done();
        return true;
    });

    /* This is used to send bulk email */
    queue.process('email_to_users', async (job, done) => {

        var connection = await db.getConnectionByType('write', job.data.cid);
        await MessageRoutines.email_to_users(job.data, connection);
        await db.closeConnection(connection);
        done();
    });

    /* This is used to send bulk sms messages */
    queue.process('sms_to_users', async (job, done) => {

        var connection = await db.getConnectionByType('write', job.data.cid);
        await MessageRoutines.sms_to_users(job.data, connection);
        await db.closeConnection(connection);
        console.log('Done!');
        done();
    });

    /* TODO: Sent From lead created event in API server, but isn't this email being sent through GDS? */
    queue.process('external_lead', async (job, done) => {
        var connection = await db.getConnectionByType('write', job.data.cid);
        await MessageRoutines.external_message_notification(job.data, connection);
        await db.closeConnection(connection);
        done();
        return true;

    });

    queue.process('sendAdvanceRentalEmails', async (job, done) => {

        let output = '';
        var data = job.data;
        let leases = [];
        var connection = await db.getConnectionByType('write', job.data.cid);
        try {
            let company = new Company({ id: data.property.company_id });
            await company.find(connection);

            let date = data.date;
            leases = await ChargesSummaryRoutines.findAdvanceRentalLeases(connection, data.property.id, date);
            console.log("ADVANCED_RENTALS_FOUND3:", leases)
            for (let i = 0; i < leases.length; i++) {
                try{
                    let lease = new Lease({ ...leases[i] });
                    await lease.findFullDetails(connection, company.id, [data.property.id]);
                    await lease.Unit.setSpaceMixId(connection);
                    //check if 
                    await lease.Property.getAccessControl(connection);
                    console.log("BEFORE_GETTING_SPACE3: ", lease.Property.Access)
                    let space  = await lease.Property.Access.getSpace(lease.Unit.id);
                    console.log("SPACE_Gate_ACCESS3: ", space)
                    if(space?.status === "VACANT"){
                        await lease.setAccessOnLease(connection);
                        await lease.findConfidenceInterval(connection);
                        const appId = await models.User.findGdsAppId(connection, lease.id)
        
                        var Ids =
                            [{
                                "facility": Hashes.encode(lease.Unit.property_id, connection.cid),
                                "spaces": [Hashes.encode(lease.Unit.id, connection.cid)],
                                "spacetypes": [lease.Unit.space_mix_id],
                                "pmstype": "leasecaptain",
                            }];
        
                            let accessCode = null;
                            let payment_method = null;
                            let tenant = lease.Tenants.find(x => x.primary);
                            let utc_offset = await lease.Property.getUtcOffset(connection);
        
                            if (tenant) {
                                if(!tenant.Contact.Access || !tenant.Contact.Access.pin){
                                    await tenant.Contact.findAccessCredentials(connection,  lease.Property);
                                }
    
                                accessCode = {
                                    type:  lease.Property.Access.access_name,
                                    pin: tenant.Contact.Access && tenant.Contact.Access.pin
                                }
                            }
                            console.log("R:leases/finalize:access_code: ", accessCode);
        
                            if (lease.MoveInInvoice.Payments.length > 0 && lease.MoveInInvoice.Payments[0].PaymentMethod) {
                                payment_method = new PaymentMethod({ id: lease.MoveInInvoice.Payments[0].PaymentMethod.id });
                                await payment_method.find(connection);
                            }
        
                            lease.start_date = moment(lease.start_date).utcOffset(utc_offset, true).toISOString(true);
                            var gds_tenant = await tenantOnBoarding(Hashes.encode(lease.Tenants[0].id,connection.cid), Hashes.encode(lease.Unit.property_id,connection.cid));
                            var mapped_ids = await getGDSMappingIds(Ids);
                            var _rental = await advanceRental(connection, company.id, lease.Tenants[0].Contact, lease, mapped_ids, gds_tenant, payment_method, accessCode, lease.confidence_interval, appId);
                            console.log("Advance Rental Emails =>", _rental);
                    }
                    

                } catch (err) {
                    console.log("Advance Rental =>", err);
                }
            }

            utils.sendLogs({
                event_name: ENUMS.LOGGING.ADVANCED_RENTALS,
                logs: {
                    payload: {
                        cid: data.cid,
                        data
                    },
                }
            });

        } catch (err) {
            console.log("---ERROR----");
            console.log(err);
            console.log(err.stack);
        }

        await db.closeConnection(connection);
        done();

    });

    /* These are in use but need to be updated/verified */



    queue.process('fetch_document', async (job, done) => {
        try {
            var connection = await db.getConnectionByType('write', job.data.cid);
            await DocumentFetcher.fetch(job.data, connection);
            await db.closeConnection(connection);
            done();
        } catch (err) {
            console.error(err);
            console.error(err.stack);
            done();
        }
    });

    queue.process('verify_email_token', async (job, done) => {
        try {
            var connection = await db.getConnectionByType('write', job?.data?.cid);
            let res = await VerifyToken.checkVerifiedTokenStatus(job?.data);
            let status = res?.data?.status;
            let statusOptions = {
                pending: false,
                verified: true,
            }
            let data = {
                email_verified: statusOptions?.[status]
            }
            return models.Contact.save(connection, data, job?.data?.contact_id);
        } catch (err) {
            console.error(err);
            console.error(err.stack);
        } finally {
            await db.closeConnection(connection);
            done();
        }
    });

    queue.process('verify_phone_token', async (job, done) => {
        try {
            var connection = await db.getConnectionByType('write', job?.data?.cid);
            let res = await VerifyToken.checkVerifiedTokenStatus(job?.data);
            let status = res?.data?.status;
            let statusOptions = {
                pending: false,
                verified: true,
            }
            let data = {
                phone_verified: statusOptions?.[status]
            }
            return models.Contact.saveVerificationStatus(connection, data, job?.data?.contact_id);

        } catch (err) {
            console.error(err);
            console.error(err.stack);
        } finally {
            await db.closeConnection(connection);
            done();
        }
    });

    // This was for triggering the notification when an event comes due, but that functionality has been removed.
    // Also remove the event.setTrigger function in the event class;
    // queue.process('new_event', function(job, done) {
    //
    //     var data = job.data;
    //     var connection;
    //     var event;
    //
    //     pool.getConnectionAsync().then(function(conn) {
    //         connection = conn;
    //         event = new Event({ id: data.id });
    //         return event.find(connection);
    //     }).then(() => {
    //         return schedule.scheduleJob(moment(event.start_date).toDate(), function(event) {
    //             event.ping();
    //             return true;
    //         }.bind(null, event));
    //     }).then(() => {
    //         connection.release();
    //         done();
    //     }).catch(function(err) {
    //         console.error(err);
    //         console.error(err.stack);
    //         done();
    //     });
    //
    // });







    /* END JOBS FROM API SERVER */



    /* JOBS FROM WORKER API */

    queue.process('verifyAutoCharges', async (job, done) => {
        let output = '';
        var data = job.data;
        var connection = await db.getConnectionByType('read', job.data.cid);
        try {
            let property = new Property({ id: data.property.id });
            await property.find(connection);
            const currentPropertyDate = await property.getLocalCurrentDate(connection);

            let company = new Company({ id: data.property.company_id });
            await company.find(connection);

            data.company_id = company.id;
            data.property_ids = [property.id];
            data.company = company;
            data.property = property;

            let invoicesData = await ChargesSummaryRoutines.generateInvoices(connection, data);
            let invoices = invoicesData.invoices

            PaymentRoutines.output = "INVOICES TO BE GENERATED\r\n";
            PaymentRoutines.output += "Lease ID,Address,Lease Period,Period Start, Period End, Number of Lines,TotalTax,TotalDiscounts,Balance,Num Existing Payments,Existing Payments total,Payment Applied Status\r\n";


            for (let i = 0; i < invoices.length; i++) {
                let invoice = invoices[i];

                if (!invoice) {
                    console.log("!invoice", JSON.stringify(invoice, null, 2));
                    continue;
                }


                await invoice.getOpenPayments(connection);
                await invoice.findLease(connection);


                PaymentRoutines.output += invoice.Lease.id + ',';
                PaymentRoutines.output += invoice.Lease.Unit.Address.address + " " + invoice.Lease.Unit.number + ',';
                PaymentRoutines.output += invoice.Lease.start_date + " - " + invoice.Lease.end_date + ',';
                PaymentRoutines.output += invoice.period_start + ",";
                PaymentRoutines.output += invoice.period_end + ",";

                // TODO recognize revenue,


                try {
                    // TODO process existing payments,
                    let result = await PaymentRoutines.processExistingPayments(connection, invoice, company, data.dryrun, currentPropertyDate);

                    // PaymentRoutines.output += result + "\r\n\r\n";
                } catch (err) {
                    PaymentRoutines.output += +"\r\n\r\n" + err.toString() + "\r\n\r\n";
                }
                PaymentRoutines.output += "\r\n";

            }

            PaymentRoutines.output += "\r\n";
            PaymentRoutines.output += "AUTOPAYMENT INFO\r\n";
            PaymentRoutines.output += "Date,Company,Property,Num. Autopayments\r\n";

            await PaymentRoutines.processAutoPayments(connection, data, property, company, invoices, data.dryrun);

            if (invoices.length) {
                try {
                    // let filename = '/home/node/hummingbird/output.csv';
                    // let writeStream = fs.createWriteStream(filename);
                    // fs.writeFileSync(filename, PaymentRoutines.output);

                    let attachments = [{
                        content_type: "text/csv",
                        name: data.company.name + "_" + data.property.name + "_auto_payments_" + moment(data.date, 'YYYY-MM-DD').format('MM/DD/YYYY') + '.csv',
                        content: Buffer.from(PaymentRoutines.output).toString('base64')
                    }]
                    await PaymentRoutines.sendResultsEmail(connection, PaymentRoutines.output, data.company, attachments)
                } catch (err) {
                    PaymentRoutines.output += err.toString()
                    console.log("ERROR", err);
                }
            }


        } catch (err) {
            console.log(err);
            console.log(err.stack);
            output += err.toString() + '<br />';
            output += err.stack;
        }

        await db.closeConnection(connection);
        done();

    });

    //MVP TI - 12317 POC START
    queue.process('runMonthlyTenantPaymnetTransaction', async (job, done) => {
        console.log("Im kicked! runMonthlyTenantPaymnetTransaction")
        let companies = await db.getAllCompanies();
        for (let i = 0; i < companies.length; i++) {
            console.log("Company : " + companies[i].company_id + " :: HummingBird Company ID : " + companies[i].hb_company_id);
            await processMonthlyTenantPaymnetTransaction(companies[i].company_id, { company_id: companies[i].hb_company_id });
        }
        done();
    });
    //MVP TI - 12317 POC START

    // queue.process('propertyTriggers', async (job, done) => {

    //     var data = job.data;
    //     console.log('Processing property id ' + data.propertyId);
    //     try {
    //         await TriggerRoutines.processPropertyTrigger(data, pool);
    //         done();
    //     } catch (err) {
    //         console.log(err);
    //         console.log(err.stack);
    //         done();
    //         return true;
    //     }
    // });
    
    queue.process('process_lease_statuses', function (job, done) {
        ProcessLeaseStatuses.update(job.data, pool).then(function (response) {
            console.log('Done!', response);
            done();
            return true;
        }).catch(err => {
            console.log(err);
            console.log(err.stack);
            done();
        })
    });

    queue.process('lease_status_discrepancies', function (job, done) {

        ProcessLeaseStatuses.findDiscrepancies(job.data, pool).then(function (response) {
            console.log('Done!', response);
            done();
            return true;
        }).catch(err => {
            console.log(err);
            console.log(err.stack);
            done();
        })
    });

    queue.process('createErrorStateReports', async (job, done) => {
        var company_ids = [];
        var data = job.data;
        var connection = await db.getConnectionByType('read', job.data.cid);
        try {
            data.properties.forEach((item) => company_ids.push(item.company_id));
            await ErrorStates.sendErrorStateSummary(connection, company_ids, data.date);
        } catch (err) {
            console.log("err", err);
            console.log(err.stack);
        }
        await db.closeConnection(connection);
        done();

    });

    queue.process('createSevereErrorStateReports', async (job, done) => {
        var data = job.data;
        var connection = await db.getConnectionByType('read', job.data.cid);
        try {
            await ErrorStates.sendSevereErrorStateSummary(connection, data.date);
        } catch (err) {
            console.log("err", err);
            console.log(err.stack);
        }
        await db.closeConnection(connection);
        done();
    });

    queue.process('verifyTriggers', async (job, done) => {

        var data = job.data;
        try {
            await TriggerRoutines.verify(data, pool);
            done();
        } catch (err) {
            console.log(err);
            console.log(err.stack);
            done();
        }
    });

    /* END JOBS FROM WORKER API */

    /* x */
    // queue.process('welcomeEmail', function(job, done) {
    //
    //     var data = job.data;
    //     var connection;
    //     var contact, company;
    //     pool.getConnectionAsync().then(function(conn) {
    //         connection = conn;
    //
    //
    //         company = new Company({ id: data.company_id });
    //         return company.find(connection);
    //
    //     }).then(function() {
    //         contact = new Contact({ id: data.id });
    //         return contact.find(connection, company.id)
    //
    //     }).then(function() {
    //
    //         var shipment = {
    //             contact_id: contact.id,
    //             fn: 'setup password',
    //             requested: moment.utc(),
    //             domain: data.domain
    //         };
    //
    //         var cipher = crypto.createCipher(Settings.security.algorithm, Settings.security.key);
    //         var encrypted = cipher.update(JSON.stringify(shipment), 'utf8', 'hex') + cipher.final('hex');
    //
    //         var values = {
    //             email: contact.email,
    //             to: contact.first + ' ' + contact.last
    //         };
    //
    //         if (!contact.user_id) {
    //             values.subject = 'Welcome To Our Online Lease Management System';
    //             values.template = {
    //                 name: 'basic-email',
    //
    //                 from: company.name + " Online Management",
    //                 data: [{
    //                     name: 'logo',
    //                     content: company.getLogoPath()
    //                 },
    //                     {
    //                         name: 'headline',
    //                         content: 'Your account has been set up.'
    //                     },
    //                     {
    //                         name: 'content',
    //                         content: "<p>Welcome! A new account has been set up for you.<br />" +
    //                             "Click the link below to set up your username and password. </p>" +
    //                             '<br /><a style="color: #3dc6f2" href="' + Settings.getBaseUrl(company.subdomain) + '/setup/' + encrypted + '">Click here to set your password</a><br />'
    //                     }
    //                 ]
    //             }
    //         } else if (data.label === 'setup') {
    //             values.subject = 'Welcome To Our Online Lease Management System';
    //             values.template = {
    //                 name: 'basic-email',
    //                 from: company.name + " Online Management",
    //                 data: [{
    //                     name: 'logo',
    //                     content: company.getLogoPath()
    //                 },
    //                     {
    //                         name: 'headline',
    //                         content: 'Your account has been set up.'
    //                     },
    //                     {
    //                         name: 'content',
    //                         content: "<p>Welcome! A new account has been set up for you.<br />" +
    //                             "Please click the link below to set up your password.</p>" +
    //                             '<br /><a style="color: #3dc6f2" href="' + Settings.getBaseUrl(company.subdomain) + '/setup/' + encrypted + '">Click here to set your password</a><br />'
    //                     }
    //                 ]
    //             }
    //         } else if (data.label === 'newLease') {
    //             values.subject = 'You have a new lease!';
    //             values.template = {
    //                 name: 'basic-email',
    //                 from: company.name + " Online Management",
    //                 data: [{
    //                     name: 'logo',
    //                     content: company.getLogoPath()
    //                 },
    //                     {
    //                         name: 'headline',
    //                         content: 'Your have a new lease.'
    //                     },
    //                     {
    //                         name: 'content',
    //                         content: "<p>Welcome! A new account has been set up for you.<br />" +
    //                             "Please click the link below to log in.</p>" +
    //                             '<br /><a style="color: #3dc6f2" href="' + Settings.getBaseUrl(company.subdomain) + '/login">Click here to login</a><br />'
    //                     }
    //                 ]
    //             }
    //         } else if (data.label === 'lead') {
    //             values.subject = 'We have received your inquiry!';
    //             values.template = {
    //                 name: 'basic-email',
    //                 from: company.name + " Online Management",
    //                 data: [{
    //                     name: 'logo',
    //                     content: company.getLogoPath()
    //                 },
    //                     {
    //                         name: 'headline',
    //                         content: 'Thanks for getting in touch'
    //                     },
    //                     {
    //                         name: 'content',
    //                         content: "<p>We have received your inquiry and will reach out via as soon as possible.</p>" +
    //                             '<br /><br />Thanks,<br />company.name'
    //                     }
    //                 ]
    //             }
    //         };
    //
    //
    //         values.company_id = company.id;
    //         values.contact_id = contact.id;
    //
    //         console.log("values", values);
    //
    //         return Mail.sendBasicEmail(connection, values);
    //     }).then(function(result) {
    //         connection.release();
    //         done();
    //     }).catch(function(err) {
    //         console.error(err);
    //         done();
    //     }).finally(() => utils.closeConnection(pool, connection))
    //
    // });

    /* x */
    // queue.process('forgotPassword', function(job, done) {
    //
    //     var data = job.data;
    //
    //     var connection;
    //     var user, company, contact;
    //     pool.getConnectionAsync().then(function(conn) {
    //         connection = conn;
    //
    //         company = new Company({ subdomain: data.domain });
    //         return company.findBySubdomain(connection);
    //
    //     }).then(function(companyRes) {
    //
    //         // console.log(company);
    //         // console.log(data);
    //         // user = new User({id: data.id});
    //         //
    //         // return user.find(connection);
    //
    //         //		}).then(function(userRes) {
    //
    //         contact = new Contact({ id: data.id });
    //         return contact.find(connection, company.id);
    //
    //     }).then(function(contactRes) {
    //
    //
    //         var shipment = {
    //             contact_id: contact.id,
    //             fn: 'reset password',
    //             requested: moment.utc(),
    //             domain: data.domain
    //         };
    //
    //         var cipher = crypto.createCipher(Settings.security.algorithm, Settings.security.key);
    //         var encrypted = cipher.update(JSON.stringify(shipment), 'utf8', 'hex') + cipher.final('hex');
    //         console.log(company.getLogoPath());
    //         var values = {
    //             email: contact.email,
    //             to: contact.first + ' ' + contact.last,
    //             from: company.name + " Online Management",
    //             subject: 'Password Reset Notification',
    //             template: {
    //                 name: 'basic-email',
    //                 data: [{
    //                     name: 'logo',
    //                     content: company.getLogoPath()
    //                 },
    //                     {
    //                         name: 'headline',
    //                         content: 'Reset Your Password'
    //                     },
    //                     {
    //                         name: 'content',
    //                         content: "<p>Somebody requested a password reset.<br />" +
    //                             "Please click the link below to reset your password. If you did not authorize this request, you can disregard this message.</p>" +
    //                             '<br /><a style="color: #3dc6f2" href="' + Settings.getBaseUrl(company.subdomain) + '/reset-password/' + encrypted + '">Click here to reset your password</a><br />'
    //                     }
    //                 ]
    //             },
    //             company_id: company.id,
    //             contact_id: contact.id
    //         };
    //         return Mail.sendBasicEmail(connection, values);
    //
    //     }).then(function(result) {
    //         connection.release();
    //         done();
    //     }).catch(function(err) {
    //         console.error(err);
    //         console.error(err.stack);
    //         done();
    //     }).finally(() => utils.closeConnection(pool, connection))
    //
    // });

    /* x */
    // queue.process('forgotUsername', async(job, done) => {
    //
    //     const connection = await pool.getConnectionAsync();
    //
    //     try {
    //         const data = job.data;
    //         let company = new Company({ subdomain: data.domain });
    //         await company.findBySubdomain(connection);
    //
    //
    //         let emails = data.user_names.map(e => {
    //             return e.email + '<br />';
    //         });
    //
    //
    //
    //         const values = {
    //             email: data.email,
    //             to: "Lease Captain User",
    //             from: company.name + " Online Management",
    //             subject: 'Forgot Username Notification',
    //             template: {
    //                 name: 'basic-email',
    //                 data: [{
    //                     name: 'logo',
    //                     content: company.getLogoPath()
    //                 },
    //                     {
    //                         name: 'headline',
    //                         content: 'Forgot username'
    //                     },
    //                     {
    //                         name: 'content',
    //                         content: "<p>Here is a list of user names we have associated with this email address.<br />" +
    //                             emails +
    //                             '<br /><a style="color: #3dc6f2" href="' + Settings.getBaseUrl(company.subdomain) + '/reset-password/">Click here to reset your password</a><br />'
    //                     }
    //                 ]
    //             },
    //             company_id: company.id
    //         };
    //
    //         await Mail.sendBasicEmail(null, values);
    //
    //     } catch (err) {
    //         console.error(err);
    //         console.error(err.stack);
    //     }
    //     connection.release();
    //     done();
    //
    // });


    /* Needs Admin Notification */
    /* x */
    // queue.process('maintenance', function(job, done) {
    //     MaintenanceRoutines.send(job.data, pool).then(function(response) {
    //         console.log('Done!');
    //         done();
    //     });
    // });


    // queue.process('report_maintenance_summary', function(job, done) {
    //     ReportRoutines.maintenance_summary(job.data, pool).then(function(response) {
    //         console.log('Done!');
    //         done();
    //         return true;
    //     });
    // });

    /* x */
    // queue.process('sendChargesSummary', async(job, done) => {
    //
    //     try {
    //
    //         var data = job.data;
    //
    //         var connection = await pool.getConnectionAsync();
    //
    //         let company = new Company({ id: data.company.id });
    //         await company.find(connection);
    //
    //         let invoices = await ChargesSummaryRoutines.generateInvoices(connection, data, pool);
    //
    //         await ChargesSummaryRoutines.sendSummary(invoices, data.date, company, data.users);
    //
    //     } catch (err) {
    //
    //         console.log(err);
    //
    //     }
    //
    //     await connection.release();
    //     done();
    //
    // });


    // queue.process('sendChargesToTenants', async(job, done) => {
    //
    //     try {
    //
    //         var data = job.data;
    //         var connection = await pool.getConnectionAsync();
    //
    //         let company = new Company({ id: data.company.id });
    //         await company.find(connection);
    //
    //         let invoices = await ChargesSummaryRoutines.generateInvoices(connection, data, pool);
    //
    //         for (let i = 0; i < invoices.length; i++) {
    //             await ChargesSummaryRoutines.sendToTenants(connection, invoices[i], data.date, company, data.admin_id)
    //         }
    //
    //         // Emit or record email interaction
    //
    //     } catch (err) {
    //         console.log(err);
    //     }
    //
    //     await connection.release();
    //     done();
    //
    //
    //     // var data = job.data;
    //     // var invoices = [];
    //     // ChargesSummaryRoutines.getMonthlyCharges(data, pool).then(function(response) {
    //     // 	invoices = response.invoices;
    //     // 	if (!invoices.length) return false;
    //     // 	console.log("ADMINID0", data.admin_id);
    //     // 	return ChargesSummaryRoutines.sendToTenants(pool, response.invoices, response.billdate, response.company, data.admin_id);
    //     // }).then(function(status){
    //     // 	// Temporarily disable
    //     // 	return true;
    //     // 	var connection;
    //
    //     // return pool.getConnectionAsync().then(function(conn) {
    //     // 	connection = conn;
    //     //
    //     //
    //     // 	var n = {
    //     // 		company_id: data.company.id,
    //     // 		lease_id: null,
    //     // 		type_id: 4,
    //     // 		reference_id: null,
    //     // 		created: moment().format('YYYY-MM-DD HH:mm:ss'),
    //     // 		read: 0
    //     // 	};
    //     // var notification = new Notification(n);
    //     // return notification.createMessage(connection, {
    //     // 	invoices: invoices,
    //     // 	date: data.date
    //     // }).then(function () {
    //     // 	return notification.save(connection);
    //     // }).then(function () {
    //     // 	return notification.ping();
    //     // });
    //     // });
    //     // }).then(function(status){
    //     // 	return done();
    //     // }).catch(function(err){
    //     // 	console.log(err);
    //     // 	console.log(err.stack);
    //     // 	done();
    //     // 	return true;
    //     // });
    // });

    /* x */



    // Moved to Routine's files
    /* queue.process('createInvoices', async(job, done) => {

        let output = '';
        var data = job.data;
        let invoices = [];

        try {

            var connection = await pool.getConnectionAsync();

            let property = new Property({ id: data.property.id });
            await property.find(connection);
            const currentPropertyDate = await property.getLocalCurrentDate(connection);

            let company = new Company({ id: data.property.company_id });
            await company.find(connection);
            company.webLogo =  await company.getWebLogURL();

            data.company = company;
            data.property = property;

            invoices = await ChargesSummaryRoutines.generateInvoices(connection, data);

            PaymentRoutines.output = "INVOICES TO BE GENERATED\r\n";
            PaymentRoutines.output += "Lease ID,Address,Lease Period,Period Start, Period End, Number of Lines,TotalTax,TotalDiscounts,Balance,Num Existing Payments,Existing Payments total,Payment Applied Status\r\n";


            console.log("INVOICES LENGTH", invoices.length)


            for (let i = 0; i < invoices.length; i++) {
                let invoice = invoices[i];


                if (!invoice) {
                    console.log("!invoice", JSON.stringify(invoice, null, 2));
                    continue;
                }

                await invoice.getOpenPayments(connection);
                await invoice.findLease(connection);

                PaymentRoutines.output += invoice.Lease.id + ',';
                PaymentRoutines.output += invoice.Lease.Unit.Address.address + " " + invoice.Lease.Unit.number + ',';
                PaymentRoutines.output += invoice.Lease.start_date + " - " + invoice.Lease.end_date + ',';
                PaymentRoutines.output += invoice.period_start + ",";
                PaymentRoutines.output += invoice.period_end + ",";

                console.log("PaymentsToApply", invoice.PaymentsToApply);

                if (!data.dryrun) {
                    try {
                        invoice.id = await ChargesSummaryRoutines.saveInvoice(connection, invoice, company);
                    } catch (err) {
                        console.log("Critical error: ", err);
                        continue;
                    }
                    // send pdf code here
                    // Commenting pdf invoice generation and sending fuctionality until further notice against INC-315
                    /*let url = Settings.get_pdf_generator_app_url() + '/v2/invoice';
                    invoice.property_id = property.id;
                    await invoice.findProperty(connection,company.id);
                    await invoice.findContactByLeaseId(connection,company.id);

                    let _data = {
                        data: invoice,
                        company
                    }

                    var options = {
                        uri: url,
                        json: true,
                        method: 'POST',
                        body: _data
                    };
                    try {

                        var pdf = await rp(options);
                        if(pdf.status) {
                            await ChargesSummaryRoutines.sendInvoiceToTenant({
                                company_id: company.id,
                                invoice_id: invoice.id,
                                file: pdf.data,
                                filename: `Invoice_${invoice.number}`,
                            })
                        }

                    } catch(err){
                        console.error("PDF Error => ",err);
                    }

                }

                // TODO recognize revenue,

                try {
                    // TODO process existing payments,
                    let result = await PaymentRoutines.processExistingPayments(connection, invoice, company, data.dryrun, currentPropertyDate);
                } catch (err) {
                    PaymentRoutines.output += err.toString() + "<br />";
                }
                PaymentRoutines.output += "\r\n";

            }

            eventEmitter.emit('transaction_done', { property_id: property.id });
        } catch (err) {
            console.log("---ERROR----");
            console.log(err);
            console.log(err.stack);
            PaymentRoutines.output += err.toString() + '<br />';
            PaymentRoutines.output += err.stack;
        }

        try {
            if (invoices.length) {
                try {

                    let attachments = [{
                        content_type: "text/csv",
                        name: data.company.name + "_" + data.property.name + "_charges_" + moment(data.date, 'YYYY-MM-DD').format('MM/DD/YYYY') + '.csv',
                        content: Buffer.from(PaymentRoutines.output).toString('base64')
                    }]
                    await PaymentRoutines.sendResultsEmail(connection, PaymentRoutines.output, data.company, attachments)

                } catch (err) {
                    console.log("ERROR", err);
                }
            }
        } catch (err) {
            console.log(err);
            console.log(err.stack);
        }
        connection.release();
        done();

    });

    queue.process('processPayments', async(job, done) => {

        let output = '';
        var data = job.data;
        let invoices = [];
        let payments = [];

        try {

            var connection = await pool.getConnectionAsync();

            let company = new Company({ id: data.property.company_id });
            await company.find(connection);

            let offset = company.Settings.invoiceChargeOffset;
            data.date = moment(data.date, 'YYYY-MM-DD').add(offset, 'day').format('YYYY-MM-DD');

            data.company = company;

            PaymentRoutines.output = "AUTOPAYMENT INFO\r\n";
            PaymentRoutines.output += "Date,Company,Property,Num. Autopayments\r\n";

            try {
                await PaymentRoutines.processAutoPayments(connection, data, company, invoices, data.dryrun);

                eventEmitter.emit('transaction_done', { property_id: data.property_id });
            } catch (err) {
                console.log(err);
            }

            try {
                // let filename = '/home/node/hummingbird/output.csv';
                // let writeStream = fs.createWriteStream(filename);
                // fs.writeFileSync(filename, PaymentRoutines.output);

                let attachments = [{
                    content_type: "text/csv",
                    name: data.company.name + "_" + data.property.name + "_charges_" + moment(data.date, 'YYYY-MM-DD').format('MM/DD/YYYY') + '.csv',
                    content: Buffer.from(PaymentRoutines.output).toString('base64')
                }]
                await PaymentRoutines.sendResultsEmail(connection, PaymentRoutines.output, data.company, attachments)
            } catch (err) {
                console.log("ERROR", err);
            }

            await utils.closeConnection(pool, connection);
            done();
            return;
        } catch (err) {
            console.log(err);
            console.log(err.stack);
            output += err.toString() + '<br />';
            output += err.stack;
        }
        await utils.closeConnection(pool, connection);
        done();
    }); */





    // queue.process('newApplication', function(job, done) {
    //
    //     var data = job.data;
    //     var connection;
    //     var application, company;
    //     pool.getConnectionAsync().then(function(conn) {
    //         connection = conn;
    //         company = new Company({ subdomain: data.domain });
    //         return company.findBySubdomain(connection);
    //
    //     }).then(function() {
    //
    //         application = new Application({ id: data.id });
    //         return application.find(connection, company.id);
    //
    //     }).then(function() {
    //
    //         var address = application.Unit.Address.address;
    //
    //         if (application.Unit.number) {
    //             address += " #" + application.Unit.number;
    //         }
    //         address += ' in ' + application.Unit.Address.city + ', ' + application.Unit.Address.state;
    //
    //
    //         if (data.label == 'tenant') {
    //             var values = {
    //                 email: application.Contact.email,
    //                 to: application.Contact.first + ' ' + application.Contact.last,
    //                 subject: 'Your application has been received',
    //                 from: company.name + " Online Management",
    //                 template: {
    //                     name: 'basic-email',
    //                     data: [{
    //                         name: 'logo',
    //                         content: company.getLogoPath()
    //                     },
    //                         {
    //                             name: 'headline',
    //                             content: 'Application Received.'
    //                         },
    //                         {
    //                             name: 'content',
    //                             content: "<p>Thank you for applying for " + address + ". We have received your application and will be in touch soon with the next steps.<br /><br />Sincerely,<br />" + company.name
    //                         }
    //                     ]
    //                 },
    //                 company_id: company.id,
    //                 contact_id: application.Contact.id
    //             };
    //             return Mail.sendBasicEmail(connection, values);
    //         } else if (data.label == 'admin') {
    //             return Promise.mapSeries(company.Settings.notificationEmails, e => {
    //                 var values = {
    //                     email: e,
    //                     to: company.name + " Administrator",
    //                     subject: 'A new application has been submitted',
    //                     from: company.name + " Online Management",
    //                     template: {
    //                         name: 'basic-email',
    //                         data: [{
    //                             name: 'logo',
    //                             content: company.getLogoPath()
    //                         },
    //                             {
    //                                 name: 'headline',
    //                                 content: 'Application received!'
    //                             },
    //                             {
    //                                 name: 'content',
    //                                 content: '<p>A new application has been submitted for ' + address + '.<br /><br /><a style="color: #3dc6f2" href="http://' + company.subdomain + '.' + Settings.domain + '/applications">Click here to view now</a><br />'
    //                             }
    //                         ]
    //                     },
    //                     company_id: company.id
    //                 };
    //                 return Mail.sendBasicEmail(connection, values);
    //             })
    //         } else {
    //             throw "No label found";
    //         }
    //
    //
    //     }).then(function(result) {
    //         connection.release();
    //         done();
    //     }).catch(function(err) {
    //         console.error(err.stack);
    //         console.error(err);
    //         done();
    //     });
    //
    // });


    // queue.process('external_message', function(job, done) {
    //     MessageRoutines.external_message_notification(job.data, pool).then(function(response) {
    //         console.log('Done!');
    //         done();
    //         return true;
    //     });
    // });



    // queue.process('emailSignature', function(job, done) {
    //     EmailSignatureRoutines.send(job.data, pool).then(function(response) {
    //         console.log('Done!');
    //         done();
    //     });
    // });

    /* Needs Admin Notification */
    /* x */
    /* queue.process('triggerTriggers', function(job, done) {
        var data = job.data;
        TriggerRoutines.process(data, pool).then(function(response) {
            // create job to send out email if its it should be sent out
            console.log('we have finished!');
            done();
            return;
        }).catch(function(err) {
            console.log(err);
            console.log(err.stack);
            done();
            return true;
        });
    }); */



    // queue.process('report_billing_summary', function(job, done) {
    //     ReportRoutines.billing_summary(job.data, pool).then(function(response) {
    //         console.log('Done!');
    //         done();
    //         return true;
    //     });
    // });

    // queue.process('notification', function(job, done) {
    //
    //     NotificationRoutines.notify(job.data, pool).then(function(response) {
    //         console.log('Done!', response);
    //         done();
    //         return true;
    //     }).catch(err => {
    //         console.log(err);
    //         console.log(err.stack);
    //         done();
    //     })
    // });






    // queue.process('update_email', function(job, done) {
    //
    //     var data = job.data;
    //     var connection;
    //     var event;
    //
    //     pool.getConnectionAsync().then(function(conn) {
    //         connection = conn;
    //
    //         return models.Email.getById(connection, data.email_id);
    //
    //     }).then(() => {
    //         // get email info
    //
    //     }).then(() => {
    //         connection.release();
    //         done();
    //     }).catch(function(err) {
    //         console.error(err);
    //         console.error(err.stack);
    //         done();
    //     }).finally(() => utils.closeConnection(pool, connection))
    //
    // });

    /* **************************** */
    /* ********** NEW TEST ******** */
    /* **************************** */



    // queue.process('auto_payment_summary', function(job, done) {
    //     AutoActionReport.createPaymentSummary(job.data, pool).then(function(response) {
    //         done();
    //         return true;
    //     });
    // });




    // queue.process('document', function(job, done){
    //
    // 	var data = job.data;
    // 	var connection;
    //
    // 	console.log('processing document');
    // 	done();
    // 	// pool.getConnectionAsync().then(function(conn) {
    // 	// 	connection = conn;
    // 	//
    // 	// 	return models.Email.getById(connection, data.email_id);
    // 	//
    // 	// }).then(() => {
    // 	// 	// get email info
    // 	//
    // 	// }).then(() => {
    // 	// 	connection.release();
    // 	// 	done();
    // 	// }).catch(function(err){
    // 	// 	console.error(err);d
    // 	// 	console.error(err.stack);
    // 	// 	done();
    // 	// });
    //
    // });

    /* **************************** */
    /* ********** TO TEST ********* */
    /* **************************** */

    // queue.process('report_invoice_detail', function(job, done) {
    //     ReportRoutines.invoice_detail(job.data, pool).then(function(response) {
    //         console.log('Done!');
    //         done();
    //         return true;
    //     });
    // });
    //
    // queue.process('report_charges_summary', function(job, done) {
    //     ReportRoutines.charges_summary(job.data, pool).then(function(response) {
    //         console.log('Done!');
    //         done();
    //         return true;
    //     });
    // });
    //
    // queue.process('quickbooks', function(job, done) {
    //     console.log(job.data);
    //
    //     QuickBooksRoutines.sync(job.data, pool).then(function(response) {
    //         console.log(response);
    //         if (response) {
    //             console.log('Done!');
    //             done();
    //         } else {
    //             console.log('failed');
    //
    //         }
    //     });
    // });



}

const Report = require('../classes/report');
var PaymentMethod = require(__dirname + '/../classes/payment_method');
const ENUMS = require('./enums');
