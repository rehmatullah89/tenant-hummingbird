const bullmq  = require('bullmq');
const IORedis = require('ioredis');
const redis_connection = new IORedis({host: process.env.REDIS_HOST});
const { performance } = require('perf_hooks');
const PdfQueue = new bullmq.Queue('pdf', { connection: redis_connection } );
const Queue = new bullmq.Queue('hummingbirdQueue', { connection: redis_connection } );
const os = require('os');

const { Workflow } = require(__dirname + '/../modules/workflow_manager.js');

var PandaDocRoutines = require(__dirname + '/../routines/panda_doc_routines.js');
var ChargesSummaryRoutines  = require(__dirname + '/../routines/charges_summary_routines.js');
const { RefreshUnitProfilesRoutine, PropertyRateManagementRoutine } = require(__dirname + '/../routines/property_rate_management');
var workflows = require(__dirname + '/../workflows');

var db = require(__dirname + '/../modules/db_handler.js');
var Upload = require(__dirname + '/../classes/upload.js');
var Lease = require(__dirname + '/../classes/lease.js');
var Company = require(__dirname + '/../classes/company.js');
var Contact = require(__dirname + '/../classes/contact.js');
var Unit = require(__dirname + '/../classes/unit.js');
var Property = require(__dirname + '/../classes/property.js'); 


var {sendGenericEmail, PendingMoveIn } = require(__dirname + '/../modules/mail.js');
var {sendSmsForPendingTemplate, sendSMS } = require(__dirname + '/../modules/sms.js');
class WorkerManager {
    constructor(WorkflowManager){
        this.Worker = {};
        this.WorkflowManager = WorkflowManager;

        let funcs = {};
        for (const [key, wfs] of Object.entries(workflows)) {
            for (const [key, wf] of Object.entries(wfs)) {
                funcs[key] = wf;
            }
        }

        this.delegate = {
            workflow,
            test_job,
            error_test,
            completed_test,
            generate_pdf,
            generatePandaDoc,
            create_panda_doc,
            send_document_email,
            generateAndEmailPandaDoc,
            send_pandadoc,
            panda_doc_error,
            panda_doc_success,
            download_signed_pandadoc,
            sendInvoiceToTenant,
            trigger_unit_group_profile_refresh,
            refresh_unit_group,
            rate_change_cron,
            ...funcs
        }
    }
    async initWorker() {
        this.Worker = new bullmq.Worker('hummingbirdQueue', async job => {
            await this.delegate[job.name](job, this.WorkflowManager);
        }, { 
            connection: redis_connection,
            removeOnComplete: {  age: 60 * 60 * 24 * 2 },
            removeOnFail: { count: 1000 },
            maxStalledCount: 0,
            //concurrency: 50
        });

        this.Worker.on('active', (job) => {
            let machine_name = os.hostname() || null;
            if(machine_name){
                job.data.host_machine_name = machine_name;
                job.update(job.data);
            }
            console.log(`Worker Message: ${job.id} is active.`);
        });

        this.Worker.on('wait', (job) => {
            console.log(`Worker Message: ${job.id} is wait.`);
        });


        this.Worker.on('waiting-children', (job) => {
            console.log(`Worker Message: ${job.id} is waiting-children.`);
        });

        this.Worker.on('added', (job) => {
            console.log(`Worker Message: ${job.id} is added.`);
        });
        
        this.Worker.on('error', (job) => {
            console.log(`Worker Message: ${job.id} is errored.`);
        });

        this.Worker.on('delayed', (job) => {
            console.log(`Worker Message: ${job.id} is delayed.`);
        });

        this.Worker.on('stalled', (job) => {
            console.log(`Worker Message: ${job.id} is stalled.`);
        });
        
        this.Worker.on('completed', (job) => {
            console.log(`Worker Message: ${job.id} has completed.`);
        });

        this.Worker.on('failed', (job, err) => {
            console.log(`Worker Message: ${job.id} has failed with ${err.message}!`);
        });
    }
};




const test_job = async(job, wm) => {
    console.log("This is a test job");
    await setTimeout(async () => {
        job.data.added = "This is now added";
        await wm.continueWorkflow(job,  job.data);
    }, job.data.delay);
};

const workflow = async(job, wm) => {
    console.log("Processing workflow", job.data);
    await wm.processWorkflow(job);
};


const error_test = async( job) => {
    console.log("An Error Occurred");
};


const completed_test = async(job) => {

    console.log("We Completed a test!");
};



const generate_pdf = async(job) => {
    await PdfQueue.add('generatePdf', job.data);
}

/* TODO Where is this called from ? */
const sendInvoiceToTenant = async (job) => {
    await ChargesSummaryRoutines.sendInvoiceToTenant(job.data)
}


/* kicks off the process to create, send, and upload panda doc to S3. */
const generatePandaDoc = async(job, wm) => {
    let wf = new Workflow('generate_panda_doc', 'panda_doc_success', 'panda_doc_error');

    wf.addDependency('create_panda_doc', {
        priority: job.data.priority,
        cid: job.data.cid,
        lease_id: job.data.lease_id,
        document_id: job.data.document_id,
        checklist_id: job.data.checklist_id,
        company_id: job.data.company_id,
        contact_id: job.data.contact_id,
        uploaded_by: job.data.uploaded_by,
        socket_details: job.data.socket_details
    });

    wf.addDependency('send_pandadoc', {
        priority: job.data.priority
    });

    await wm.addWorkflow(wf);

}

const generateAndEmailPandaDoc = async(job, wm) => {
    let wf = new Workflow('generate_and_email_pandadoc');
    for (let document = 0; document < job.data.checklist_documents.length; document++) {
        let checklist_document = job.data.checklist_documents[document];

        wf.addDependency('create_panda_doc', {
            priority: job.data.priority,
            cid: job.data.cid,
            lease_id: job.data.lease_id,
            document_id: checklist_document.document_id,
            checklist_id: checklist_document.lease_id,
            company_id: job.data.company_id,
            contact_id: job.data.contact_id,
            uploaded_by: job.data.uploaded_by,
            socket_details: job.data.socket_details
        });
    
        wf.addDependency('send_pandadoc', {
            priority: job.data.priority
        });

    }

     //todo xps
     wf.addDependency('send_document_email', {
        property_id: job.data.property_id,
        priority: job.data.priority,
        cid: job.data.cid,
        socket_details: job.data.socket_details,
        contact_id: job.data.contact_id,
        unit_id: job.data.unit_id,
        lease_id: job.data.lease_id,
        company_id: job.data.company_id,
        appId: job.data.appId || ""
    });
    

    await wm.addWorkflow(wf);
}

const send_document_email = async(job, wm) => {
    try {
        var connection = await db.getConnectionByType('read', job.data.cid);

        let company = new Company({ id: job.data.company_id })
        await company.find(connection)

        let lease = new Lease({ id: job.data.lease_id})
        await lease.find(connection);
        await lease.getTenants(connection);
        await lease.findPaymentMethods(connection, null, null, company.id);
        await lease.findPaymentsByContactId(connection, lease.Tenants[0].contact_id, null);
        
        let contact = new Contact({ id: job.data.contact_id });
        await contact.find(connection);

        let property = new Property({ id: job.data.property_id});
        property.find(connection);

        let unit = new Unit({ id: job.data.unit_id});
        unit.find(connection);

        await lease.getUploads(connection, job.data.company_id);
        let params = {
            property_id: job.data.property_id,
            remote: true,
            unit_id: unit.id,
            appId: job.data.appId || ""
        }
        let link = await Upload.sendEmailForSignature(connection, contact, lease.Uploads, company, false, params);

        let name = `${contact.first} ${contact.last}`;
        let subject = `Before Your Move-In, Just a Few More Steps`;
        
        if (!(contact.email == null)) {
            let payment = lease.Payments[0]
            let html_template = PendingMoveIn(name, property.name, unit.number, lease.rent, link.shortUrl, payment.amount, payment.transaction_id);
            await sendGenericEmail(connection, name, contact.email, contact.id, null, subject, html_template, company.gds_owner_id, property.gds_id);
        }
        

        
        await contact.getPhones(connection);
        if (contact.Phones.length) {
            let smsTemplate = sendSmsForPendingTemplate(property.name, link.shortUrl);
            let contactPhone = contact.Phones[0].phone;
        
            await sendSMS(contactPhone, company, smsTemplate, undefined, company.gds_owner_id, property.gds_id);
        }
        

        await wm.continueWorkflow(job,  job.data);

        
    } catch (err) {
        console.log(err);
        if(err.code && err.code === 409){
            data.retries = data.retries || 0;
            data.retries++;
            data.delay = 1500 * data.retries ;
            console.log("data.retries", data.retries);
            if(data.retries === 5){
                job.data.msg = err.toString();
                await wm.error(job, wm);
                return;
            }
            await wm.inject('send_document_email', data, job);
        }
    }
}

const create_panda_doc = async(job, wm) => {

    try{

        let data = await PandaDocRoutines.create_panda_doc(job.data);
        await wm.continueWorkflow(job,  data);

    } catch(err){
        job.data.msg = err.toString();
        console.log("STEP 1 error function", job.data);
        await wm.error(job);
    }

}

const trigger_unit_group_profile_refresh = async (job, wm) => {
    try {
        await RefreshUnitProfilesRoutine(job?.data ?? {})

        await wm.continueWorkflow(job,  job.data);
    } catch (error) {
        console.log('\n\n Error on refreshing unit group profiles \n\n', error)
    }
}

const refresh_unit_group = async (job, wm) => {
        let { procedure_conditions, cid: company_id, runCron = false } = job.data ?? {}

        let wf = new Workflow('refresh_unit_group_workflow');

        wf.addDependency('trigger_unit_group_profile_refresh', { company_id, procedure_conditions })

        if (runCron == true) {
            wf.addDependency('rate_management_cron_routine', { ...procedure_conditions, company_id, priority: 1 })
        }

        await wm.addWorkflow(wf);
}

const rate_change_cron = async (job) => {
    try {
        await PropertyRateManagementRoutine({
            company_id: job.data.cid, 
            hb_company_id: null, 
            property_id: job.data.cron_conditions.property_id,
            profile_id: job.data.cron_conditions.profile_id, 
            unit_id: null
        });
        console.log("rate_change_cron completed");

    } catch (error) {
        console.log('\n\n Error on rate change cron job \n\n', error)
    }
}


const send_pandadoc = async(job, wm) => {

    const { previous, workflow, ...d} = job.data;

    let data = Object.assign(job.data.previous, d);

    //if(!data.requires_sign) await wm.continueWorkflow(job, data);

    try {
        data = await PandaDocRoutines.send_pandadoc(data);
        await wm.continueWorkflow(job,  data);
    } catch(err){
        if(err.code && err.code === 409){
            data.retries = data.retries || 0;
            data.retries++;
            data.delay = 1500 * data.retries ;
            console.log("data.retries", data.retries);
            if(data.retries === 5){
                job.data.msg = err.toString();
                await wm.error(job, wm);
                return;
            }
            await wm.inject('send_pandadoc', data, job);
        }
    }

}

const download_signed_pandadoc = async(job, wm) => {

    try {
        await PandaDocRoutines.download_signed_pandadoc(job.data);
    } catch(err){
        console.log("download_signed_pandadoc err", err);
        if(err.code && err.code === 409){
            job.data.retries++;
            job.data.delay = 1500 * job.data.retries ;
            if(job.data.retries.retries === 5){
                // TODO handle error here
                return;
            }
            await Queue.add('download_signed_pandadoc', job.data);
        }
    }

}


const save_file = async(job, wm) => {
    await setTimeout(async () => {
        job.data.added = "This is now added";
        await wm.continueWorkflow(job,  job.data);
    }, 1000);
}

const panda_doc_error = async(job, wm) => {
    console.log("panda_doc_error error", job.data);
    await PandaDocRoutines.panda_doc_error(job.data);
}

const panda_doc_success = async(job, wm) => {
    console.log("panda_doc_success data", job.data);
    await PandaDocRoutines.panda_doc_success(job.data);
}



module.exports = WorkerManager;
