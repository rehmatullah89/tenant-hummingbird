"use strict";

var models  = require(__dirname + '/../models');
var settings    = require(__dirname + '/../config/settings.js');
var e  = require(__dirname + '/../modules/error_handler.js');
var moment      = require('moment');


class Delinquency {
    constructor(data) {
		data = data || {};
		this.id = data.id || null;
		this.lease_id = data.lease_id || null;
		this.start_date = data.start_date || null;
		this.status = data.status || 1;
		this.end_date = data.end_date || null;
        this.created = data.created || null;
        this.reason = data.reason || null;
        this.description = data.description || null;
        this.Lease = {};
        this.Actions = data.Actions || [];
        this.Timeline = {}; 
        this.Pauses = [];
    }
    
    async find(connection, inlcude_paused){
        
        let data = {};
        if(this.id){
            data = await models.Delinquency.findById(connection, this.id);
        } else if (this.lease_id){
            data = await models.Delinquency.findByLeaseId(connection, this.lease_id, inlcude_paused);
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
        this.reason = data.reason || null;
        this.description = data.description || null;
		this.end_date = data.end_date || 0;
        this.created = data.created || null;
        
    }

    async findLease(connection){
        let lease = new Lease({id: this.lease_id}); 
        await lease.find(connection);
        await lease.findUnit(connection);
        this.Lease = lease;
    }

    appendFutureAction(payload) {
        const  { action_type, action_reference_ids, current_actions, action_template } = payload; 
        const updatedActions = JSON.parse(JSON.stringify(current_actions));

        for (let i = 0; i < action_reference_ids.length; i++) {
            updatedActions.push({
                action: action_type.slug,
                action_name: action_type.name,
                delinquency_action_type_id: action_type.id,  
                reference_id: action_reference_ids[i], 
                ...action_template
            });
        }

        return updatedActions;
    }

    async findFutureTriggers(connection, date) {
        let triggers = await models.Delinquency.findFutureTriggersByDelinquencyId(connection, this.id, date);
        let delinquency_action_types = await models.Delinquency.findDelinencyActionTypes(connection);
        
        let actions = [];
        for(let i = 0; i < triggers.length; i++) {
            let t = triggers[i];
            let action_template = {
                id: null, 
                delinquencies_id: this.id, 
                trigger_id: t.trigger_id,
                past_due_invoice_id: t.invoice_id, 
                invoice_id: null,
                event_id: null,
                upload_id: null,
                interaction_id: null,
                
                execution_date: t.execution_date,
                date: t.trigger_date,
                recurred: 0,
                error: null,
                completed: null,
                created: null,
                deleted: null,
            }
            
            if(t.lease_standing_id){
                let action_type = delinquency_action_types.find(d => d.slug === 'lease_standing');
                actions.push({
                    action: action_type.slug,
                    action_name: action_type.name,
                    delinquency_action_type_id: action_type.id, 
                    ...action_template
                })
            }

            if(t.deny_access){
                let action_type = delinquency_action_types.find(d => d.slug === 'deny_access');
                actions.push({
                    action: action_type.slug,
                    action_name: action_type.name,
                    delinquency_action_type_id: action_type.id, 
                    ...action_template
                })
            }

            if(t.deny_payments){
                let action_type = delinquency_action_types.find(d => d.slug === 'deny_payments');
                actions.push({
                    action: action_type.slug,
                    action_name: action_type.name,
                    delinquency_action_type_id: action_type.id, 
                    ...action_template
                })
            }

            if(t.overlock){
                let action_type = delinquency_action_types.find(d => d.slug === 'overlock');
                actions.push({
                    action: action_type.slug,
                    action_name: action_type.name,
                    delinquency_action_type_id: action_type.id, 
                    ...action_template
                })
            }

            if(t.cancel_insurance){
                let action_type = delinquency_action_types.find(d => d.slug === 'cancel_insurance');
                actions.push({
                    action: action_type.slug,
                    action_name: action_type.name,
                    delinquency_action_type_id: action_type.id, 
                    ...action_template
                })
            }

            if(t.schedule_auction){
                let action_type = delinquency_action_types.find(d => d.slug === 'schedule_auction');
                actions.push({
                    action: action_type.slug,
                    action_name: action_type.name,
                    delinquency_action_type_id: action_type.id, 
                    ...action_template
                })
            }

            if(t.fee_ids) {
                let action_type = delinquency_action_types.find(d => d.slug === 'fee');
                const fee_ids = t.fee_ids.split(',');
                actions = this.appendFutureAction({
                    action_template,
                    action_type,
                    current_actions: actions,
                    action_reference_ids: fee_ids
                });
            }

            if(t.task_ids) {
                let action_type = delinquency_action_types.find(d => d.slug === 'task');
                const task_ids = t.task_ids.split(',');
                actions = this.appendFutureAction({
                    action_template,
                    action_type,
                    current_actions: actions,
                    action_reference_ids: task_ids
                });
            }

            if(t.document_ids) {
                let action_type = delinquency_action_types.find(d => d.slug === 'document');
                const document_attachement_ids = t.document_ids.split(',');
                actions = this.appendFutureAction({
                    action_template,
                    action_type,
                    current_actions: actions,
                    action_reference_ids: document_attachement_ids
                });
            }

            if(t.message_ids) {
                let action_type = delinquency_action_types.find(d => d.slug === 'message');
                const message_attachement_ids = t.message_ids.split(',');
                actions = this.appendFutureAction({
                    action_template,
                    action_type,
                    current_actions: actions,
                    action_reference_ids: message_attachement_ids
                });
            }
        }

        return actions;
    }

    async findActions(connection, date){
        
        let data =                await  models.Delinquency.findActionsByDelinquencyId(connection, this.id, date);
        let futureTriggers =      await  this.findFutureTriggers(connection, date) 
        data = data.concat(futureTriggers); 
        console.log("data", data);
        
        for(let i = 0; i < data.length; i++){
            let a = data[i];
            console.log("findActions a", a); 
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
                            // if(a.reference_id){
                            //     let lease_standing = await models.Setting.getLeaseStandingById(connection, a.reference_id);
                            //     const { name, id } = lease_standing; 
                            //     a.Status = {
                            //         id,
                            //         name 
                            //     }
                            // } else {
                            //     a.Status = {
                            //         id: null,
                            //         name: null 
                            //     }
                            // }
                        break;
                    case "task":
                        // await trigger.findEvents(connection);
                        // let task = new Event({id: a.reference_id}); 
                        // await task.find(connection);
                        // console.log("ThIS ISI THE TASKS", task);
                        // a.Task = trigger.Events.find(e => e.id == a.reference_id); 
                        // break;
                    case "document":
                        await trigger.findAttachments(connection);
                        a.Document = trigger.Attachments.find(e => e.id == a.reference_id);
                        a.DeliveryMethods = await models.Delinquency.findDeliveryMethods(connection, a.id);
                        break; 
                    case "message":
                        await trigger.findMessages(connection);
                        a.Message = trigger.Messages.find(e => e.id == a.reference_id);
                        a.DeliveryMethods = await models.Delinquency.findDeliveryMethods(connection, a.id);
                        break;
                    case "fee":
                        // await trigger.findFees(connection);
                        // a.Fee = trigger.Fees.find(e => e.id == a.reference_id); 
                        // break;
                }
            } catch(err){
                console.log(err);
            }

            this.Actions.push(a);
        
        }



    }

    async findPauses(connection){
        
        let data = await  models.Delinquency.findPausesByDelinquencyId(connection, this.id);
        console.log("findPauses", data); 
        for(let i = 0; i < data.length; i++){
            let p = data[i];
            p.PausedBy = {};
            p.ResumedBy = {};

            p.PausedBy = new Contact({id: p.paused_contact_id})
            await p.PausedBy.find(connection); 
            if(p.resumed_contact_id){
               p.ResumedBy = new Contact({id: p.resumed_contact_id})
               await p.ResumedBy.find(connection); 
            }
            this.Pauses.push(p);
        }
    }

    async pause(connection, reason, contact_id, date){
        
        await models.Delinquency.savePause(connection, {
            delinquencies_id: this.id,
            start: date,
            reason: reason, 
            paused_contact_id: contact_id
          }); 
  
        await models.Delinquency.save(connection, {status: 'paused'}, this.id); 
    
    }
    
    async resume(connection, resumed_by, date){
    
        let pause = await models.Delinquency.getActivePauseByDelinquencyId(connection, this.id); 
         
        if(!pause) e.th(404, "This automation is not paused"); 

        
        let start = moment(pause.start).endOf('day'); 
        let end = moment(date).endOf('day'); 

        let total_days = end.diff(moment(start), 'days');
        
        console.log("total_days", total_days);

        await models.Delinquency.savePause(connection, {
            total_days,  
            resumed_contact_id: resumed_by, 
            end: date, 
            ended_at: moment().format('YYYY-MM-DD HH:mm:ss')
        }, pause.id); 

        await models.Delinquency.save(connection, {status: 'active'}, this.id); 

        await models.Delinquency.updateDelinquencyActionDate(connection, this.id); 

    }

    async complete(connection, date){
        await models.Delinquency.save(connection,{
            status: 'completed',
            end_date: date
          }, this.id);
    }

    async save(connection){
        let data = {
            lease_id: this.lease_id,
            start_date: this.start_date,
            status: this.status,
            end_date: this.end_date,
        }

        this.id = await models.Delinquency.save(connection, data, this.id);
    }

    static async addTimelineActionsForTrigger(connection, trigger_id, property_id, date,  lease_id, all){

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
        if(t.lease_standing_id) actions.push({ action:'lease_standing' });

        if(t.Events.length){
            for(let i = 0; i < t.Events.length; i++){
                actions.push({action: 'task', reference_id: t.Events[i].id, recurring: t.Events[i].recurring});
            }
        }
        
        if(t.Fees.length){
            for(let i = 0; i < t.Fees.length; i++){
                actions.push({action: 'fee', reference_id: t.Fees[i].id, recurring: t.Fees[i].recurring});
            }
        }
        
        if(t.Attachments.length){
            for(let i = 0; i < t.Attachments.length; i++){
                actions.push({action: 'document', reference_id: t.Attachments[i].id, recurring: t.Attachments[i].recurring, delivery_methods: t.Attachments[i].DeliveryMethods});
            }
        }
        
        if(t.Messages.length){
            for(let i = 0; i < t.Messages.length; i++){
                actions.push({action: 'message', reference_id: t.Messages[i].id, recurring: t.Messages[i].recurring, delivery_methods: t.Messages[i].DeliveryMethods});
            }
        }
    

        for(let i = 0; i < actions.length; i++){
            let results = await models.Delinquency.addTimelineAction(connection, actions[i].action, actions[i].reference_id || null,  t.id, t.start, property_id, date, actions[i].recurring, lease_id, all);
            if(actions[i].delivery_methods && actions[i].delivery_methods.length){
                let dm_array = [];

                for(let j = 0; j < actions[i].delivery_methods.length; j++){
                    let dm = actions[i].delivery_methods[j];
                    // If there are delivery methods, we need to insert the entries for each action we added. 
                    // Auto Increment keys are guaranteed to be sequential in InnoDB tables.  so we can get all newly inserted rows by getting the insertId and getting the next rowCount entries
                    for(let k = results.insertId; k < results.insertId + results.affectedRows; k++){
                        dm_array.push([k, dm.message, dm.subject, dm.method ]);
                    }
                }
                if(dm_array.length){
                    await models.Delinquency.addTimelineDeliveryMethods(connection, [ dm_array ]);
                }
            }
        }
    }

    formatTimeline(){
        
        let timeline = {}; 
        this.Actions.sort()
        
        for (let i = 0; i < this.Actions.length; i++){
            let a = this.Actions[i];
        
            timeline["t_" + a.trigger_id] = timeline["t_" + a.trigger_id] || {
                type: 'action', 
                name: a.Trigger.name, 
                description: a.Trigger.description,
                start: a.Trigger.start,
                date: a.date,
                execution_date: a.execution_date,
                Actions: []
            };  
          
            timeline["t_" + a.trigger_id].Actions.push(a);
        }

    
        for (let i = 0; i < this.Pauses.length; i++){
            let p = this.Pauses[i];
            console.log("p", p);  
             
            timeline['p_' + p.id] = timeline['p_' + p.id] || {
                type: 'pause', 
                name: 'Paused Delinquency', 
                description: p.reason,
                start: moment(p.start).diff(moment(this.start_date), 'days'), 
                date: p.start,
                end_date: p.end,
                execution_date: p.start,
                by: p.PausedBy.first + ' ' +  p.PausedBy.last
            };  
            
            console.log("p.end", p.end)
            if(p.end){
                timeline['r_' + p.id] = timeline['r_' + p.id] || {
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

        console.log("timeline", timeline)
        

        this.Timeline =  Object.values(timeline).sort((a, b) => {
            if(a.execution_date > b.execution_date) return 1;
            if(a.execution_date < b.execution_date) return -1;

            // This works becuase the type is alphbetical and happens to be in the order we want to show.. 
            return (a.type > b.type) ? 1 : -1; 


        });

        // this.Timeline = Object.keys(timeline).sort().reduce(
        //     (obj, key) => { 
        //       obj[key] = this.Timeline[key]; 
        //       return obj;
        //     }, 
        //     {}
        //   );

    }

    static async createDelinquencies(connection, property_id, date, lease_id){
		await models.Delinquency.createDelinquencies(connection, property_id, date, lease_id); 
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
			var activeInsuranceService = await Service.getActiveInsuranceService(connection, lease.id);

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
		return statuses;

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
                if(['past_due', 'start_of_lease', 'end_of_lease'].indexOf(this.trigger_reference) >= 0){
                    await event.saveEventObject(connection, lease.id, Enums.TASK_TYPE.LEASE);
                } else if(['lead', 'reservation'].indexOf(this.trigger_reference)){
                    // await event.saveContactEvent(connection, lease.id);
                }
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

            await invoice.makeFromServices(connection, [service], lease, today, today, [], company.id);

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
    
	async generateDocument(connection, lease, action,  company, dryrun, cid){

		if(dryrun) return;
        
		try {
		
            let response = await PandaDocRoutines.create_panda_doc({
                lease_id: lease.id,
                document_id: action.Document.document_id,
                company_id: company.id,
                cid: cid
            });
           
        
            let send_response = await PandaDocRoutines.send_pandadoc({
                lease_id: lease.id,
                upload_id: response.upload_id,
                document_id: action.Document.document_id,
                company_id: company.id,
                cid: cid
            });
           

            action.Document.Upload = await PandaDocRoutines.download_pandadoc({
                upload_id: response.upload_id,
                company: company,
                cid: cid
            });

    
            action.Document.file = new Buffer(action.Document.Upload.document.Body).toString('base64');

            action.Document = Object.assign({}, action.Document,  response);
        
            await models.Delinquency.saveAction(connection, {
                upload_id: response.upload_id, 
                completed: moment().format('YYYY-MM-DD HH:mm:ss')
            }, action.id)

            return action.Document; 
		
		} catch(err) {
            
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
			e.th(err.code, err.msg)
		}



    }
    

    async sendEmail(connection, lease, action, email, api_uri, company, property, dryrun){


        try {
            
            if(!company.gds_owner_id || !property.gds_id) {
                e.th(500, "GDS Configuration not found for company or property")
            };
            email.attachments = email.attachments || []; 
            var responses = []
            
            let email_status = {
                errors: []
            }
            // Loop through tenants and send email.
            for (let i = 0; i < lease.Tenants.length; i++) {
                
                // merge fields
                let message = await this.mergeTokens(connection, email.message, lease, company, property, true); 

                // GET Attachment
                let attachments = [];
                
                if (email.attachments.length && !dryrun) {
                    for (let j = 0; j < email.attachments.length; j++) {
                        if (email.attachments[j].id) {
                            //&& this.Attachments[i].to_email) {
                            attachments.push({
                                content_type: "application/pdf", //this.Attachments[j].Upload.document.ContentType,//response.headers['content-type'],
                                name: email.attachments[j].Upload.name,
                                content: email.attachments[j].file
                            });
                        }
                    
                        // GET DOCUMENT SIGN LINK
                        let signer = email.attachments[j].Upload.signers.find(s => s.tenant_id === lease.Tenants[i].id);
                        if (signer && email.attachments[j].Upload.id) {
                            let sign_link = this.getSignLink(signer, email.attachments[j].Upload.id, company.id, api_uri);
                            message += '<br /><br /><a href="' + sign_link + '">Click here to sign this document</a>';
                        }
                    }

                }

                email_status.attachments = attachments;
                email_status.subject = email.subject;
                email_status.to = lease.Tenants[i].Contact.email;
                email_status.message = message;
                email_status.context = 'automation';
                
                if (!dryrun) {
					let space = 'Tenant';
					if (lease.id) {
						let lease = new Lease({id: lease.id});
						await lease.find(connection);
						if (lease && lease.Unit) {
							space = lease.Unit.number;
						} 
					}
                    let response = await lease.Tenants[i].Contact.sendEmail(connection, property.id, space, email.subject, message, attachments, null, 'automation', company.gds_owner_id, property.gds_id,   email.delivery_method, null, lease.id);
                    email_status.response = response;
                    email_status.errors = email_status.errors.concat(response.errors);  
                    
                    if(lease.Tenants[i].primary || lease.Tenants.length === 1){
                        await models.Delinquency.saveDeliveryMethod(connection, {
                            interaction_id: response && response.interaction_id, 
                            completed: moment().format('YYYY-MM-DD HH:mm:ss'),
                            error: email_status.errors.join(' | '),
                        }, email.delivery_method_id)
                    }
                }
                responses.push(email_status);
            }
        
        } catch(err) {
            console.log("err", err)
            email_status.errors.push(err.msg || err.message); 
            await models.Delinquency.saveDeliveryMethod(connection, {
                completed: moment().format('YYYY-MM-DD HH:mm:ss'),
                error: email_status.errors.join(' | '),
            }, email.delivery_method_id)

            e.th(500, err);
        }
		console.log("EMAIL RESPONSES", responses);
		return responses;
    }
    
    async sendSMS(connection, lease, action, sms, company, property, dryrun){
        let responses = [];
        let sms_status = {
            errors: []
        }
		try {
                if(!company.gds_owner_id || !property.gds_id) {
                    e.th(500, "GDS Configuration not found for company or property")
                };
	

            for (let i = 0; i < lease.Tenants.length; i++) {
                let response = {};
                
                let message = await this.mergeTokens(connection, sms.message, lease, company, property); 
                sms_status.message = message;
                sms_status.context = 'automation';
            
                if(!dryrun){
                    

                    if (sms.attachments.length) {
                        for (let j = 0; j < sms.attachments.length; j++) {
                            if (sms.attachments[j].Upload?.src ) {
                                let shortener = await Utils.shortenUrl(sms.attachments[j].Upload.src);
                                message += `\r\n${shortener.shortUrl}`;
                                // // GET DOCUMENT SIGN LINK
                                // let signer = sms.attachments[j].Upload.signers.find(s => s.tenant_id === lease.Tenants[i].id);
                                // if (signer && sms.attachments[j].Upload.id) {
                                //     let sign_link = this.getSignLink(signer, email.attachments[j].Upload.id, company.id, api_uri);
                                //     message += '<br /><br /><a href="' + sign_link + '">Click here to sign this document</a>';
                                // } else if(sms.attachments[j].Upload.src){
                                //     message += '<br /><br /><a href="' + sign_link + '">Click here to sign this document</a>';
                                // }
                            }
                        }
                    }
 
					let space = 'Tenant';
					if (lease.id) {
						let lease = new Lease({id: lease.id});
						await lease.find(connection);
						if (lease && lease.Unit) {
							space = lease.Unit.number;
						}
					}
					let sendSMSPayload = {
						property_id: property.id, 
						space, 
                        phones: [],
                        message,
                        logged_in_user: null,
                        context: 'automation',
                        owner_id: company.gds_owner_id,
                        property_id: property.gds_id,
                    };
                    response = await lease.Tenants[i].Contact.sendSMS(connection, sendSMSPayload);
                
                    sms_status.errors = sms_status.errors.concat(response.errors);  

                    if(lease.Tenants[i].primary || lease.Tenants.length === 1){
                        await models.Delinquency.saveDeliveryMethod(connection, {
                            interaction_id:  response.interactions?.length && response.interactions[0].id, 
                            completed: moment().format('YYYY-MM-DD HH:mm:ss'),
                            error: sms_status.errors.join(' | '),
                        }, sms.delivery_method_id)
                    }
                }

                sms_status.response = response;
                responses.push(sms_status);
            }
        
		} catch(err) {
            sms_status.errors.push(err.msg || err.message); 
            await models.Delinquency.saveDeliveryMethod(connection, {
                completed: moment().format('YYYY-MM-DD HH:mm:ss'),
                error: sms_status.errors.join(' | '),
            }, sms.delivery_method_id)
            e.th(500, err);
		}

		return responses
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

        
		let existing_overlock = await lease.Unit.getActiveOverlock(connection);
		if(existing_overlock && existing_overlock.status == 1) e.th(409, "Unit is already set to overlock", 'info');

        await property.getAccessControl(connection);
        
        try {
            
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
                return {
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




		


		return;
    }
    

    async saveActionError(connection, action_id, error){
        await models.Delinquency.save(connection, {
            error
        }, action_id)
    }

}


module.exports = Delinquency;
var Trigger      = require('../classes/trigger.js');
var Lease      = require('../classes/lease.js');
var Contact      = require('../classes/contact.js');