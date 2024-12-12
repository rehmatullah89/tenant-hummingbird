"use strict";

var models  = require(__dirname + '/../models');
var settings    = require(__dirname + '/../config/settings.js');
var e  = require(__dirname + '/../modules/error_handler.js');
var Enums = require(__dirname + '/../modules/enums.js');
var moment = require('moment');
var Tokens = require(__dirname + '/../modules/tokens');
var Utils = require(__dirname + '/../modules/utils');

class Delinquency {

    constructor(data) {
		data = data || {};
		this.id = data.id || null;
		this.lease_id = data.lease_id || null;
		this.start_date = data.start_date || null;
		this.status = data.status || null;
		this.end_date = data.end_date || 0;
        this.created = data.created || null;
        this.Lease = {};
        this.Actions = data.Actions || [];
        this.Pauses = [];
        this.Timeline = {}; 
    }
    
    async find(connection, params = {}){
        let data = {}; 

        if(this.id){
            data = await models.Delinquency.findById(connection, this.id);
        } else if (this.lease_id){
            data = await models.Delinquency.findByLeaseId(connection, this.lease_id, params);
        } else {
            e.th(500, 'No Id is set');
        }
        
        if(!data){
            e.th(404, "No active Delinquency.");
        }

        this.id = data.id || null;
		this.lease_id = data.lease_id || null;
		this.start_date = data.start_date || null;
		this.status = data.status || null;
		this.end_date = data.end_date || 0;
        this.created = data.created || null;
        
    }

    async findLease(connection){
        let lease = new Lease({id: this.lease_id}); 
        await lease.find(connection);
        await lease.findUnit(connection);
        this.Lease = lease;
    }

    static async findLeasesWithOpenDelinquencyActions(connection, property_id){
        return await models.Delinquency.findLeasesWithOpenDelinquencyActions(connection, property_id);
    
    }

    static async findLeasesWithDelinquencyActionsOnDate(connection, property_id, date){
        return await models.Delinquency.findLeasesWithDelinquencyActionsOnDate(connection, property_id, date);
    
    }

    static async findDelinquenciesToExecuteAtProperty(connection, property_id, date){
        return await models.Delinquency.findDelinquenciesToExecuteAtProperty(connection, property_id, date);
    }

    async findActions(connection, date){
        
        let data = await  models.Delinquency.findActionsByDelinquencyId(connection, this.id, date);
        

        for(let i = 0; i < data.length; i++){
            let a = data[i];
            try{
                let trigger = new Trigger({id: a.trigger_id });
                await trigger.find(connection);
                a.Trigger = {
                    name: trigger.name,
                    description: trigger.description,
                    start: trigger.start, 
                    apply_to_all: trigger.apply_to_all
                }
                switch(a.action){
                     
                    case "deny_payments":
                    case "cancel_insurance":
                    
                    case "deny_access":
                    case "overlock":
                    case "schedule_auction":
                        break; 
                    case "lease_standing":
                        let lease_standing = await models.Setting.getLeaseStandingById(connection, trigger.lease_standing_id);
                        const { name, id } = lease_standing; 
                        a.Status = {
                            id,
                            name 
                        }
                        break;
                    case "task":
                        await trigger.findEvents(connection);
                        a.Task = trigger.Events.find(e => e.id == a.reference_id); 
                        break;
                    case "document":
                        await trigger.findAttachments(connection);
                        a.Document = trigger.Attachments.find(e => e.id == a.reference_id);
                        
                        if(!a.Document) e.th(404, 'Document Not Found');
                        a.DeliveryMethods = await models.Delinquency.findDeliveryMethods(connection, a.id);
                        console.log("a.DeliveryMethods", a.DeliveryMethods)
                        break;
                    case "message":
                        await trigger.findMessages(connection);
                        a.Message = trigger.Messages.find(e => e.id == a.reference_id);
                        a.DeliveryMethods = await models.Delinquency.findDeliveryMethods(connection, a.id);
                        console.log("message a.DeliveryMethods", a.DeliveryMethods);
                        break;
                    // case "email":
                    //     await trigger.findEmails(connection);
                    //     a.Email = trigger.Emails.find(e => e.id == a.reference_id); 
                    //     break;
                    // case "sms":
                    //     await trigger.findSMSs(connection);
                    //     a.Sms = trigger.SMSs.find(e => e.id == a.reference_id); 
                    //     break;
                    case "fee":
                        await trigger.findFees(connection);
                        a.Fee = trigger.Fees.find(e => e.id == a.reference_id); 
                        break;
                }
            } catch(err){
                console.log(err);
                await models.Delinquency.saveAction(connection, {
                    completed: moment().format('YYYY-MM-DD HH:mm:ss'),
                    error: err.msg || err.message,
                }, a.id)
                continue; 
            }

            this.Actions.push(a);
        
        }



    }


    // async addTimelineAction(connection, action, reference_id = null, trigger_id, trigger_start, property_id){
	// 	let actions = await models.Delinquency.addTimelineAction(connection, action, reference_id, trigger_id, trigger_start, property_id); 
	// 	return actions; 
    // }
    

    static async addTimelineActionsForTrigger(connection, trigger_id, property_id, date, lease_id, run_actions,action_source){

        let t = new Trigger({id: trigger_id});
        await t.find(connection); 
        await t.findFees(connection);
        await t.findAttachments(connection);
        await t.findMessages(connection);
        await t.findEvents(connection);
        
        let actions = []
        if(t.overlock) actions.push({ action: 'overlock' });
        if(t.deny_access) actions.push({ action:'deny_access' });
        if(t.deny_payments) actions.push({ action:'deny_payments' });
        if(t.cancel_insurance) actions.push({ action:'cancel_insurance' });
        if(t.schedule_auction) actions.push({ action:'schedule_auction' });
        if(t.lease_standing_id) {
            let lease_standing = await models.Setting.getLeaseStandingById(connection, t.lease_standing_id);
            actions.push({ action:'lease_standing', reference_id: t.lease_standing_id, description: lease_standing.name }); 
        }
        
        if(t.Events.length){
            for(let i = 0; i < t.Events.length; i++){
                actions.push({action: 'task', reference_id: t.Events[i].id, recurring: t.Events[i].recurring,  description: t.Events[i].EventType.name });
            }
        }
        
        if(t.Fees.length){
            for(let i = 0; i < t.Fees.length; i++){
                actions.push({action: 'fee', reference_id: t.Fees[i].id, recurring: t.Fees[i].recurring, description: t.Fees[i].Product.name});
            }
        }
          
        if(t.Attachments.length){ 
     
            for(let i = 0; i < t.Attachments.length; i++){
                actions.push({action: 'document', reference_id: t.Attachments[i].id, recurring: t.Attachments[i].recurring, delivery_methods: t.Attachments[i].DeliveryMethods, description: t.Attachments[i].document_name, include_alternate: t.Attachments[i].include_alternate, include_lien: t.Attachments[i].include_lien  });
            }
        }
        
        if(t.Messages.length){
        
            for(let i = 0; i < t.Messages.length; i++){
                actions.push({action: 'message', reference_id: t.Messages[i].id, recurring: t.Messages[i].recurring, delivery_methods: t.Messages[i].DeliveryMethods, include_alternate: t.Messages[i].include_alternate, include_lien: t.Messages[i].include_lien });
            }
            
        }
    

        for(let i = 0; i < actions.length; i++){
            let recurring_results = {};

            let results = await models.Delinquency.addTimelineAction(connection, actions[i].action, actions[i].description, actions[i].reference_id || null,  t.id, t.start, property_id, date, lease_id, run_actions, action_source);
            
            if(actions[i].recurring){
                recurring_results = await models.Delinquency.addRecurringTimelineAction(connection, actions[i].action, actions[i].description, actions[i].reference_id || null,  t.id, t.start, property_id, date, lease_id, run_actions, action_source);
            }
            
            if(actions[i].delivery_methods && actions[i].delivery_methods.length){
                let dm_array = [];

                for(let j = 0; j < actions[i].delivery_methods.length; j++){
                    let dm = actions[i].delivery_methods[j];
                    console.log("--- dm", dm)
                    // If there are delivery methods, we need to insert the entries for each action we added. 
                    // Auto Increment keys are guaranteed to be sequential in InnoDB tables.  so we can get all newly inserted rows by getting the insertId and getting the next rowCount entries
                    for(let k = results.insertId; k < results.insertId + results.rowCount; k++){
                        dm_array.push([k, dm.message, dm.subject, dm.delivery_methods_id, 'primary' ]);
                        /* On physical mail merge fields like address and "to" name need to be different because the mail is actually sent to a different location.  With emails the content  in the document and email is the same, its just cc'd to additional email addresses. */ 
                        if(dm.delivery_type === 'mail' || dm.delivery_type === 'sms'){
                            if(actions[i].include_alternate){
                                dm_array.push([k, dm.message, dm.subject, dm.delivery_methods_id, 'alternate' ]);
                            }
                            if(actions[i].include_lien){
                                dm_array.push([k, dm.message, dm.subject, dm.delivery_methods_id, 'lien' ]);
                            }
                        } 
                    }
                    if(recurring_results.insertId){
                        for(let k = recurring_results.insertId; k < recurring_results.insertId + recurring_results.rowCount; k++){
                            dm_array.push([k, dm.message, dm.subject, dm.delivery_methods_id, 'primary' ]);
                            /* On physical mail merge fields like address and "to" name need to be different because the mail is actually sent to a different location.  With emails the content  in the document and email is the same, its just cc'd to additional email addresses. */
                            
                            if(dm.delivery_type === 'mail' || dm.delivery_type === 'sms'){
                                if(actions[i].include_alternate){ 
                                    dm_array.push([k, dm.message, dm.subject, dm.delivery_methods_id, 'alternate' ]);
                                }
                                if(actions[i].include_lien){
                                    dm_array.push([k, dm.message, dm.subject, dm.delivery_methods_id, 'lien' ]);
                                }
                            }
                        }
                    }
                }
                if(dm_array.length){
                    await models.Delinquency.addTimelineDeliveryMethods(connection, [ dm_array ]);
                }
            }
        }
    }

    formatTimeline(){
        
        this.Actions.sort()

        for (let i = 0; i < this.Actions.length; i++){
            let a = this.Actions[i];
            
            this.Timeline[a.execution_date] = this.Timeline[a.execution_date] || {
                type: 'action', 
                name: a.Trigger.name, 
                description: a.Trigger.description,
                start: a.Trigger.start,
                date: a.date,
                execution_date: a.execution_date,
                Actions: []
            };  
            this.Timeline[a.execution_date].Actions.push(a);
        }

        for (let i = 0; i < this.Pauses.length; i++){
            let p = this.Pauses[i];
             
            this.Timeline[p.start] = this.Timeline[p.start] || {
                type: 'pause', 
                name: 'Paused Delinquency', 
                description: p.reason,
                start: moment(p.start).diff(moment(this.start_date), 'days'), 
                date: p.start,
                end_date: p.end,
                execution_date: p.start,
                by: p.PausedBy.first + ' ' +  p.PausedBy.last
            };  
            
            
            if(p.end){
                this.Timeline[p.end] = this.Timeline[p.end] || {
                    type: 'resume', 
                    name: 'Resumed Delinquency', 
                    description: "This delinquency process has been resumed",
                    start: moment(p.end).diff(moment(this.start_date), 'days'), 
                    date: p.end,
                    execution_date: p.end,
                    by: p.ResumedBy.first + ' ' +  p.ResumedBy.last
                }
            }

        
        }
        this.Timeline = Object.keys(this.Timeline).sort().reduce(
            (obj, key) => { 
              obj[key] = this.Timeline[key]; 
              return obj;
            }, 
            {}
          );

    }

    static async createDelinquencies(connection, property_id, date, lease_id, action_source){
        let delinquent_leases = await models.Delinquency.fetchDelinquentLeases(connection, property_id, date, lease_id);     
        delinquent_leases = delinquent_leases.map(dl => [dl.lease_id, dl.due, dl.invoice_id, action_source]);
        await models.Delinquency.createDelinquencies(connection, delinquent_leases); 
	}
    
	static async getNewDelinquenciesByPropertyId(connection, property_id, date){
		let delinquencies = await models.Delinquency.getNewDelinquenciesByPropertyId(connection, property_id, date); 
		return delinquencies; 
	}
    
    static async findActionsByTriggerId (connection, trigger_id){
        let d = await models.Delinquency.findActionsByTriggerId(connection, trigger_id); 
        return d; 
    }
    
    static async removeActionsByTriggerId (connection, trigger_id){
        let d = await models.Delinquency.removeActionsByTriggerId(connection, trigger_id); 
        await models.Delinquency.removeDeliveryMethodsByTriggerId(connection, trigger_id); 
        return d; 
    }



    /* Actions to affect lease */
    async denyPayments(connection, lease, action, dryrun){

        try {
            console.log("lease", lease)
            console.log("lease", lease.deny_payments)
            if(lease.deny_payments){
                e.th(409, "Lease is already set to deny payments", 'info')
            }
			if(dryrun) return;
            await lease.denyPayments(connection);

            await models.Delinquency.saveAction(connection, {
                completed: moment().format('YYYY-MM-DD HH:mm:ss')
            }, action.id)
		
		} catch(err) {
            console.log("err", err)
            await models.Delinquency.saveAction(connection, {
                completed: moment().format('YYYY-MM-DD HH:mm:ss'),
                error: err.msg || err.message,
            }, action.id)

			e.th(500, err);
		}
		return true;
    }

    async cancelInsurance(connection, lease, action, date, dryrun){
		
		try {
			var activeInsuranceService = await Service.getActiveRecurringInsuranceService(connection, lease.id);

			if(!activeInsuranceService) {
				e.th(404, "No active insurance found", 'info')
			};

			if(activeInsuranceService.last_billed && activeInsuranceService.last_billed > date){
				date = activeInsuranceService.last_billed;
			}

			if(!dryrun){
                await activeInsuranceService.endCurrentService(connection, date);
                
                await models.Delinquency.saveAction(connection, {
                    completed: moment().format('YYYY-MM-DD HH:mm:ss')
                }, action.id)

			}
		} catch(err) {
            console.log("err", err);

            await models.Delinquency.saveAction(connection, {
                completed: moment().format('YYYY-MM-DD HH:mm:ss'),
                error: err.msg || err.message,
            }, action.id)

			if(err.code) throw err;
			e.th(500, err);
		}
		return activeInsuranceService;
    }
    
    async scheduleAuction(connection, lease, action, company, date,  dryrun){
		
        try {
           
            if(lease.auction_status != null) e.th(409, "Auction is already scheduled for this lease", 'info')

            if(!dryrun){
                await models.Lease.save(connection, {auction_status: Enums.LEASE_AUCTION_STATUS.SCHEDULE}, lease.id)
            }
        
			let event_types = await models.Event.findEventTypes(connection);
			let type = event_types.find(e => e.slug === Enums.EVENT_TYPES.DELINQUECY.CUT_LOCK_SCHEDULE_AUCTION);

			let datetime = date ? moment(date, 'YYYY-MM-DD'): moment();

			let event = new Event({
				company_id: company.id,
				created_by: null,
				start_date: datetime.startOf('day').utc().format('YYYY-MM-DD HH:mm:ss'),
				title: type.name,
				details: "This event was autogenerated from a trigger.",
				duration: 0,
				is_all_day: 0,
				upload_id: null,
				event_type_id: type.id,
				type: type.name,
				group_id: 'TGR_' + this.id,
				end_date: null
			});

			if(!dryrun){
				await event.save(connection);
				await event.saveEventObject(connection, lease.id, Enums.TASK_TYPE.LEASE);
			}

			let todo = new Todo({
				original_date: datetime.endOf('day').utc().format('YYYY-MM-DD HH:mm:ss'),
				created_by: null,
				object_id: lease.id,
				event_id: event.id,
				details: e.details,
				snoozed_count: 0,
				completed: 0,
				contact_id: null
			});
			if(!dryrun) {
                await todo.save(connection);
                
                await models.Delinquency.saveAction(connection, {
                    completed: moment().format('YYYY-MM-DD HH:mm:ss'),
                    event_id: event.id
                }, action.id)
			}

			return{
				event: event,
				todo: todo
			}

		} catch(err) {
            
            await models.Delinquency.saveAction(connection, {
                completed: moment().format('YYYY-MM-DD HH:mm:ss'),
                error: err.msg || err.message,
            }, action.id)

			if(err.code) throw err;
			e.th(500, err);
		}
    }
    
    async updateLeaseStanding(connection, lease, action, date, dryrun){
		try {
            console.log(")))) updateLeaseStanding", action, date, dryrun);
            if (lease.lease_standing_id === action.Status.id) {
                e.th(409, `Failed update lease status. Lease already has status: ${action.Status.name}`, 'info')
            };
			if(!dryrun){
                await lease.saveStanding(connection, action.Status.id, date);
                
                await models.Delinquency.saveAction(connection, {
                    completed: moment().format('YYYY-MM-DD HH:mm:ss')
                }, action.id)
                
			}
		} catch(err){
			 await models.Delinquency.saveAction(connection, {
                completed: moment().format('YYYY-MM-DD HH:mm:ss'),
                error: err.msg || err.message,
            }, action.id)
			if(err.code) throw err;
			e.th(500, err)
		}

    }
    
    async createTask(connection, lease, action, company, date, dryrun){


		let responses = [] 
		try {
            let event_status = {
                errors: []
            }
            
            let taskCount = await models.Todo.findOpenDuplicateTasksCount(connection, lease.id, action.Task.event_type_id);
            
            if(taskCount) {
                e.th(409, action.Task.EventType.name + " is already present on this lease");
            }

            let datetime = date ? moment(date, 'YYYY-MM-DD'): moment();

            let event = new Event({
                company_id: company.id,
                created_by: null,
                start_date: datetime.startOf('day').utc().format('YYYY-MM-DD HH:mm:ss'),
                title: action.Task.EventType.name,
                details: "This event was autogenerated from a trigger.",
                duration: 0,
                is_all_day: 0,
                upload_id: null,
                event_type_id:  action.Task.event_type_id,
                type: action.Task.EventType.name,
                group_id: 'TGR_' + action.trigger_id
            });

            if(action.Task.EventType.expires_days){
                event.end_date = datetime.clone().endOf('day').utc().add(action.Task.EventType.expires_days - 1, 'days').format('YYYY-MM-DD HH:mm:ss')
            }

            if(!dryrun){
                await event.save(connection);
                // Save lease event or contact event depending on what the trigger is
                // past due, lease start, lease end trigger - should be a lease event.
                await event.saveEventObject(connection, lease.id, Enums.TASK_TYPE.LEASE);
    
            }

            if(action.Task.todo) {
                let todo = new Todo({
                    original_date: datetime.endOf('day').utc().format('YYYY-MM-DD HH:mm:ss'),
                    created_by: null,
                    object_id: lease.id,
                    event_id: event.id,
                    details: action.Task.details,
                    snoozed_count: 0,
                    completed: 0
                });
                // If this is assigned to someone
                if (action.Task.contact_id && action.Task.contact_id > 0) {
                    let contact = new Contact({id: action.Task.contact_id});
                    await contact.find(connection);
                    await contact.getRole(connection);
                    // THIS is only for tenants...
                    // await contact.verifyAccess(company.id);
                    todo.contact_id = contact.id;
                    event_status.contact = contact.first + " " + contact.last;
                } else {
                    todo.contact_id = null
                }
                if(!dryrun){
                    await todo.save(connection);
                    
                    await models.Delinquency.saveAction(connection, {
                        completed: moment().format('YYYY-MM-DD HH:mm:ss'),
                        event_id: event.id,
                    }, action.id)
                }
                event_status.event = event;
                event_status.todo = todo;
                responses.push(event_status);
            }
			
		} catch(err){
            await models.Delinquency.saveAction(connection, {
                completed: moment().format('YYYY-MM-DD HH:mm:ss'),
                error: err.msg || err.message,
            }, action.id)
			e.th(500, err)
		}
		return responses
    }
    

    async applyLateFees(connection, lease, action, company, property, date, dryrun){
       
       
        try {
            let fee = action.Fee;

            let product = new Product(fee.Product);

            let productDetails =  await lease.getProductDetails(connection, product, property);
            
            if(!productDetails) e.th(404, "No product details found");

            let service = new Service({
                lease_id: lease.id,
                product_id: fee.product_id,
                price: productDetails.price,
                start_date: date,
                end_date: date,
                name: fee.Product.name,
                qty: 1,
                taxable: productDetails.taxable || 0,
                recurring: 0,
                prorate: 0
            });

            service.Product = product;
            await service.Product.find(connection);
            service.Product.price = productDetails.price;
            service.Product.taxable = productDetails.taxable;

            let datetime = await lease.getCurrentLocalPropertyDate(connection, 'YYYY-MM-DD')
            let today = moment().startOf('day');
            const invoicePeriodStartDate = date ? moment(date).startOf('day').clone() : today;
            let invoice = new Invoice({
                lease_id: lease.id,
                user_id: null,
                date: date,
                due: date,
                company_id: company.id,
                type: "auto",
                status: 1
            });
            invoice.Lease = lease;
            invoice.Company = company;

            await invoice.makeFromServices(connection, [service], lease, invoicePeriodStartDate, invoicePeriodStartDate, [], company.id);

            if(!dryrun) {
                await invoice.save(connection);
                
                await models.Delinquency.saveAction(connection, {
                    invoice_id: invoice.id, 
                    completed: moment().format('YYYY-MM-DD HH:mm:ss')
                }, action.id)
            }
            return invoice;

        } catch(err){
            
            console.log("err", err); 

            await models.Delinquency.saveAction(connection, {
                completed: moment().format('YYYY-MM-DD HH:mm:ss'),
                error: err.msg || err.message,
            }, action.id)

            if(err.code === 404){
                await models.Trigger.saveFee(connection, {
                    error: err.msg || err.message,
                }, action.reference_id);

                // TODO add to alerts as well.
            }

            throw err
        }
		

    }
    
	async generateDocument(connection, lease, recipient_type, action, company, dryrun, cid){

		if(dryrun) return;
        
        let upload = {};
		try {
            

            let DocumentManagerRoutine = require('../routines/document_manager');
            const Upload = require('../classes/upload.js');
        

        
            let { document, recipient } = await DocumentManagerRoutine.generateDocument({
                recipient_type: recipient_type, 
                lease_id: lease.id,
                recipient: recipient_type, 
                document_id: action.Document.document_id,
                company_id: company.id,
                cid: cid
            });

            // Sends the document to the frontend...  
            await DocumentManagerRoutine.sendDocument({
                lease_id: lease.id,
                upload_id: document.upload_id,
                document_id: action.Document.document_id,
                company_id: company.id,
                cid: cid
            });

            const upload = new Upload({ id: document.upload_id });
            await upload.find(connection);
            
			upload.setBucketNameByDocumentType(Enums.DOCUMENT_TYPES.UN_SIGNED);
            await upload.download();
            action.Document.Upload = upload;

            action.Document.Recipient = recipient;
            action.Document.file = new Buffer(action.Document.Upload.document.Body).toString('base64');

            action.Document = Object.assign({}, action.Document,  document);
            
            await models.Delinquency.saveAction(connection, {
                upload_id: document.upload_id, 
                completed: moment().format('YYYY-MM-DD HH:mm:ss')
            }, action.id)
            
            return action.Document; 
		
		} catch(err) {
            console.log("error creating document", err); 
            if(upload.id){
                upload.generation_status = 'error';
                await upload.save(connection); 
            }

            await models.Delinquency.saveAction(connection, {
                completed: moment().format('YYYY-MM-DD HH:mm:ss'),
                error: err.msg || err.message,
            }, action.id)
            
            if(err.code === 404){
                await models.Trigger.saveAttachment(connection, {
                    error: err.msg || err.message,
                }, action.reference_id);

                // TODO add to alerts as well.
            }
			throw err
		}



    }
    

    async sendEmail(connection, lease, cc, documents, company, property, delivery_method, dryrun){

        let email_status = {}
        let attachments = [];
        try {
           
            if(!company.gds_owner_id || !property.gds_id) {
                e.th(500, "GDS Configuration not found for company or property")
            };

            let tenant = lease.Tenants.find(t => t.contact_id == lease.primary_contact_id);
            let contact = tenant.Contact;
            let message = await this.mergeTokens(connection, delivery_method.message, lease, company, property, true); 
            
            if (documents.length) {
                for (let i = 0; i < documents.length; i++) {
                    attachments = [{
                        upload_id: documents[i].upload_id,
                        content_type: "application/pdf",
                        name: documents[i].document_name,
                        content: documents[i].file
                    }];
                }
            }
            
            if (!dryrun) {
                let dm = {
                    id: delivery_method.delivery_methods_id,
                    gds_key: delivery_method.gds_key,
                }
                // console.log('sendEmail attachments', attachments); 
                // console.log('delivery_method', delivery_method); 
                let response = await contact.sendEmail(connection, delivery_method.subject, message, attachments, null, 'automation', company.gds_owner_id, property.gds_id, dm, lease.primary_contact_id, lease.id, null,  delivery_method.recipient_type, null, cc);
                email_status = response;
                // mail_status.error = response.error;  
                
                await models.Delinquency.saveDeliveryMethod(connection, {
                    interaction_id: response && response.interaction_id, 
                    completed: moment().format('YYYY-MM-DD HH:mm:ss'),
                    error: email_status.status == 'error' ? email_status.message : '',
                }, delivery_method.id)
            }

        } catch(err) {
            console.log("sendMail err saveDeliveryMethod", err)
            email_status.message = err.msg || err.message; 
            await models.Delinquency.saveDeliveryMethod(connection, {
                completed: moment().format('YYYY-MM-DD HH:mm:ss'),
                error: email_status.message,
            }, delivery_method.id)

            e.th(500, err);
        }
		
		return email_status;

    }

    async sendSMS(connection, lease, action_message, documents, company, property, delivery_method, dryrun){
        // let responses = [];
        let sms_status = {}
        try { 
            if(!company.gds_owner_id || !property.gds_id) {
                e.th(500, "GDS Configuration not found for company or property")
            };
            let tenant = lease.Tenants.find(t => t.contact_id == lease.primary_contact_id);
            let contact = tenant.Contact;
            
            let recipient = null;
            switch(delivery_method.recipient_type){
                case 'primary': 
                    recipient = contact;
                    break;
                case 'alternate': 
                    await contact.getRelationships(connection);
                    
                    let alternate = contact.Relationships.find(r => r.is_alternate);
                    console.log("alternate alternate", alternate)
                    if(alternate){
                        recipient = alternate.Contact;
                    } else {
						sms_status.status = 'error';
						sms_status.message = " Alternate contact not found. ";
                    }
                    break;
                case 'lien': 
                    await contact.getRelationships(connection);
                    let lien = contact.Relationships.find(r => r.is_lien_holder);
                    console.log("lien lkien", lien)
                    if(lien){
                        recipient = lien.Contact;
                    } else {
						sms_status.status = 'error';
						sms_status.message = " Lien holder not found. ";
                    }
                    break;
            }
            
            let message = await this.mergeTokens(connection, delivery_method.message, lease, company, property); 
            

            // sms_status.message = message;
            sms_status.context = 'automation';

            if (documents.length) {
                for (let i = 0; i < documents.length; i++) {
                    if (documents[i].Upload?.src ) {
                        let shortener = await Utils.shortenUrl(attachments[i].Upload.src);
                        message += `\r\n${shortener.shortUrl}`;
                    }
                }
            }

            console.log("sms_status", sms_status)
           
            if(!dryrun){ 
                let dm = {
                    id: delivery_method.delivery_methods_id,
                    gds_key: delivery_method.gds_key,
                }
                if(!sms_status.status != 'error' && recipient){
                    
                    let response = await recipient.sendSMS(connection, [],  message, [], null, 'automation', company.gds_owner_id, property.gds_id, dm, lease.primary_contact_id, lease.id, delivery_method.recipient_type);
                    sms_status = response;
                }
                
                await models.Delinquency.saveDeliveryMethod(connection, {
                    interaction_id:  sms_status && sms_status.interaction_id, 
                    completed: moment().format('YYYY-MM-DD HH:mm:ss'),
                    error:  sms_status.status == 'error' ? sms_status.message : '',
                },  delivery_method.id)

            }
        
        } catch(err) {
            console.log("err", err); 
            sms_status.message = err.msg || err.message; 
            await models.Delinquency.saveDeliveryMethod(connection, {
                completed: moment().format('YYYY-MM-DD HH:mm:ss'),
                error: sms_status.message,
            }, delivery_method.id)
            // e.th(500, err);
        }
        return sms_status;
        // return responses
    }

    async sendMail(connection, lease, action, document, company, property, delivery_method,  dryrun){

        let mail_status = {}

        try {
         
            if(!company.gds_owner_id || !property.gds_id) {
                e.th(500, "GDS Configuration not found for company or property")
            };
           
            let attachments = [{
                upload_id: document.upload_id,
                content_type: "application/pdf",
                name: document.document_name,
                content: document.file
            }];
            console.log('attachments', attachments, document); 
            let dm = {
                id: delivery_method.delivery_methods_id,
                gds_key: delivery_method.gds_key,
            }

            if (!dryrun) {
                
                let response = await document.Recipient.sendMail(connection, attachments, 'automation', company.gds_owner_id, property.gds_id, dm, null, lease.primary_contact_id, lease.id, null, delivery_method.recipient_type);
                mail_status = response;
                
                
                await models.Delinquency.saveDeliveryMethod(connection, {
                    interaction_id: response && response.interaction_id, 
                    completed: moment().format('YYYY-MM-DD HH:mm:ss'),
                    error:  mail_status.message,
                }, delivery_method.id)
            }

        } catch(err) {
            console.log("sendMail err saveDeliveryMethod", err);
            mail_status.message = err.msg || err.message; 
             
            await models.Delinquency.saveDeliveryMethod(connection, {
                completed: moment().format('YYYY-MM-DD HH:mm:ss'),
                error: mail_status.message, 
            }, delivery_method.id)

            e.th(500, err);
        }
        
        return mail_status;
    }


    async mergeTokens(connection, message, lease, company, property, is_html){
        // document.Details.tokens
       if(!message) return '';
        try{

            let found_tokens = [];
            for (let s in Tokens){
                if(typeof Tokens[s] === 'function') continue; 
                let section = Tokens[s]; 
                const regex = /[A-Z]/g;
                for(let i = 0; i < section.length; i++){
                    if(message.indexOf(`[${section[i]}]`) < 0 ) continue; 
                    found_tokens.push({
                        name: section[i]
                    })
                }
            }
            
            let document = {
                Details: {
                    tokens: found_tokens
                } 
            }
            
            await lease.findFull(connection, company, [property], document )
            let merged_tokens = await PandaDocs.mergeTokens(connection, lease, document.Details)
            merged_tokens = merged_tokens || [];  
            for(let i = 0; i < merged_tokens.length; i++){
                var re = new RegExp(`\\[${merged_tokens[i].name}\\]`, 'g');
                message = message.replace(re, merged_tokens[i].value)
            }
            if(is_html){
                message = message.replace(/\n/g,'<br />');
            }
            return message;
            
        } catch(err){
            throw err; 
        }

        // extract tokens, 
        // find full, 
        // str replace tokens
    }


    async updateGateAccess(connection, lease, action, company, date, property, dryrun){

		try {
			if(!dryrun){
				console.log("Suspending tenants");
                await lease.suspendTenants(connection, company, property);
                
                await models.Delinquency.saveAction(connection, {
                    completed: moment().format('YYYY-MM-DD HH:mm:ss')
                }, action.id)
			}
		} catch(err){
            await models.Delinquency.saveAction(connection, {
                completed: moment().format('YYYY-MM-DD HH:mm:ss'),
                error: err.msg || err.message,
            }, action.id)
			e.th(500, err.message)
        }

		let response = {
			tenants: lease.Tenants.map(t => {
				return {
					name: t.Contact.first + " " + t.Contact.last,
				}
			}),
			unit: lease.Unit.number
		}

		return response;


    }
    
    async overlockUnit(connection, lease, action, company, date, property, dryrun){
        var res = {}
        try {
        
            let existing_overlock = await lease.Unit.getActiveOverlock(connection);
            if(existing_overlock && existing_overlock.status == 1) e.th(409, "Unit is already set to overlock", 'info');

            await property.getAccessControl(connection);
            
            
            if (!dryrun) {
                await models.Lease.save(connection, {to_overlock: 1}, lease.id)
            }

            if(property.Access.access_name.toLowerCase() === 'noke'){
                if (!dryrun) {
                    // get unit
                    let unit = new Unit({id: lease.unit_id });
                    unit.property_id = property.id; 
                    // unit Overlock
                    unit.Property = property;
                    await unit.setOverlock(connection);

                }
            } else {
                

                let event_types = await models.Event.findEventTypes(connection);
    
                let type = event_types.find(e => e.slug === 'overlock_space');
    
                let datetime = date ? moment(date, 'YYYY-MM-DD') : moment();
    
                var event = new Event({
                    company_id: company.id,
                    created_by: null,
                    start_date: datetime.startOf('day').utc().format('YYYY-MM-DD HH:mm:ss'),
                    title: type.name,
                    details: "This event was autogenerated from a trigger.",
                    duration: 0,
                    is_all_day: 0,
                    upload_id: null,
                    event_type_id: type.id,
                    type: type.name,
                    group_id: 'TGR_' + this.id,
                    end_date: null
                });

                if (!dryrun) {
                    await event.save(connection);
                    await event.saveEventObject(connection, lease.id, Enums.TASK_TYPE.LEASE);
                }
                let todo = new Todo({
                    original_date: datetime.endOf('day').utc().format('YYYY-MM-DD HH:mm:ss'),
                    created_by: null,
                    object_id: lease.id,
                    event_id: event.id,
                    details: e.details,
                    snoozed_count: 0,
                    completed: 0,
                    contact_id: null
                });
                if (!dryrun) {
                    await todo.save(connection); 
                }
                res = {
                    event: event,
                    todo: todo
                }
    
            }
        } catch(err) {
            
            await models.Delinquency.saveAction(connection, {
                completed: moment().format('YYYY-MM-DD HH:mm:ss'),
                error: err.error && err.error.msg || err.msg || err.message,
            }, action.id)
            e.th(500, err);
        }


        if (!dryrun) {
            await models.Delinquency.saveAction(connection, {
                completed: moment().format('YYYY-MM-DD HH:mm:ss'),
                event_id: event ? event.id : null,
            }, action.id)
        }
        return res;

    }
    

    async saveActionError(connection, action_id, error){
        await models.Delinquency.save(connection, {
            error
        }, action_id)
    }

    async complete(connection, date){
        await models.Delinquency.save(connection,{
            status: 'completed',
            end_date: date
          }, this.id);
    }

    static async getActiveDelinquenciesWithNoPastDueBalance(connection, payload = {}) {
        return await models.Delinquency.getActiveDelinquenciesWithNoPastDueBalance(connection, { ...payload });
    }
}


module.exports = Delinquency;

var Trigger      = require('../classes/trigger.js');
var Lease      = require('../classes/lease.js');
var Contact      = require('../classes/contact.js');
var Event      = require('../classes/event.js');
var Todo      = require('../classes/todo.js');
var Product      = require('../classes/product.js');
var Service      = require('../classes/service.js');
var Invoice      = require('../classes/invoice.js');
var Unit      = require('../classes/unit.js');
var Upload     = require('../classes/upload.js');
var PandaDocs     = require('../modules/pandadocs.js');

