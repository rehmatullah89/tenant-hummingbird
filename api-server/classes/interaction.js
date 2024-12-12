"use strict";

const { object } = require('joi');
var moment = require('moment');
const note = require('../models/note');
const DeliveryMethod = require('./delivery_method');
var models = require('../models');
var Contact = require(__dirname + '/../classes/contact.js');
var Email = require(__dirname + '/../classes/email.js');
var Phone_Call = require(__dirname + '/../classes/phone_call.js');
var Sms = require(__dirname + '/../classes/sms.js');
var Mail = require(__dirname + '/../classes/mail.js');
var Note = require(__dirname + '/../classes/note.js');
var e = require(__dirname + '/../modules/error_handler.js');
var Upload = require(__dirname + '/../classes/upload.js');

class Interaction {

    constructor(data) {
        data = data || {};
        this.id = data.id;
		this.property_id = data.property_id;
		this.property_name = '';
		this.space = data.space;
        this.contact_id = data.contact_id;
        this.contact_type = data.contact_type;
        this.entered_by = data.entered_by;
        this.time = data.time;
        this.content = data.content;
        this.read = data.read;
        // this.email_id = data.email_id;
        this.gds_notification_id = data.gds_notification_id;
        this.document_batches_deliveries_id = data.document_batches_deliveries_id;
        this.created = data.created;
        this.modified = data.modified;
        this.lease_id = data.lease_id;
        this.status_id = data.status_id;
        // this.tenant_answer = data.tenant_answer;
        this.delivery_methods_id = data.delivery_methods_id;
        this.pinned = data.pinned;
        this.context = data.context;
        this.entered_by_api = data.entered_by_api;
        this.primary_contact_id = data.primary_contact_id;
        this.Notes = [];
        this.Contact = {};
        this.Admin = {};
        this.Attachments = [];
        this.Email = {};
        this.Phone = {};
        this.Phone_call = {};
        this.Note = {};
        this.Mail = {};
        this.DeliveryMethod = {};
        this.resolved = data.resolved;
        this.resolved_at = data.resolved_at;
        this.resolved_by = data.resolved_by;
        this.Upload = {};
    }

    async create(connection, property_id, space, recipient_contact_id, entered_by, content, delivery_methods_id, pinned, context, read, api_key_id, document_batches_deliveries_id, primary_contact_id, lease_id, gds_notification_id, status, contact_type) {
        console.log("CREATE PARAMS", recipient_contact_id, entered_by, content, delivery_methods_id, pinned, context, read, api_key_id, document_batches_deliveries_id, primary_contact_id, lease_id, gds_notification_id, status, contact_type)

        // this.tenant_answer = tenant_answer
		this.property_id = property_id;
		this.space = space;		
        this.contact_id = recipient_contact_id;
        this.content = content;
        this.entered_by = entered_by;
        this.delivery_methods_id = delivery_methods_id;
        this.pinned = pinned || false;
        this.context = context;
        this.gds_notification_id = gds_notification_id;
        this.read = !!read;
        this.entered_by_api = api_key_id || null;
        this.document_batches_deliveries_id = document_batches_deliveries_id;
		if (primary_contact_id) {
			this.primary_contact_id = primary_contact_id;
		} else {
			this.primary_contact_id = this.contact_id;
		}
        this.lease_id = lease_id;
        this.status = status;
        this.contact_type = contact_type;

        this.id = await this.save(connection);
        return this;
    }

    async save(connection) {
        var data = {
		    property_id: this.property_id,
		    space: this.space,		
            contact_id: this.contact_id,
            contact_type: this.contact_type,
            content      : this.content,
            entered_by: this.entered_by,
            delivery_methods_id: this.delivery_methods_id,
            pinned: this.pinned,
            gds_notification_id   : this.gds_notification_id,
            context   : this.context,
            read      : this.read,
            document_batches_deliveries_id: this.document_batches_deliveries_id,
            primary_contact_id: this.primary_contact_id,
            lease_id: this.lease_id,
            status: this.status,
            resolved: this.resolved,
            resolved_at: this.resolved_at,
            resolved_by: this.resolved_by,
            created   : this.created || moment.utc().toDate(),
            modified  : this.modified || moment.utc().toDate()
        }

        console.log("interaction data", data)

        return await models.Interaction.save(connection, data, this.id);
    }

    async update(data){
       this.data = data;
    }

    async saveAttachments(connection, attachments) {
        for (let i = 0; i < attachments.length; i++) {
            let attachment = {
                interaction_id: this.id,
                upload_id: attachments[i].upload_id
            }
            attachment.id = await models.Attachment.save(connection, attachment);
            this.Attachments.push(attachment)
        }
    }

    async saveStatusHistory(connection, status) {

        if (!this.id) {
            throw new Error('interaction_id not found!')
        }

        let _status_history = { status, interaction_id: this.id }
        let result = await models.InteractionStatusHistory.save(connection, _status_history);
        return result;
    }

    static async saveBulkDeliveryBatches(connection, document_batches_deliveries_id, interaction_ids) {
        await models.Interaction.saveBulkDeliveryBatches(connection, document_batches_deliveries_id, interaction_ids);
    }

    async findAttachments(connection) {
        let attachments = await models.Attachment.findById(connection, this.id);
        this.Attachments = attachments
    }
	
	async findSpaceByLeaseID(connection, lease_id) {
		if (lease_id) {
		   let response = await models.units.findSpaceNumberByLeaseId(connection, lease_id);
		   console.log("Space Info:", response[0].number)
		   return response[0].number;
		}
		return "Tenant";
	}
	
    verifyId() {
        if (!this.id) e.th(500, 'No interaction id is set');
        return true;
    }

    async find(connection) {
        this.verifyId();
        let interaction = await models.Interaction.findById(connection, this.id);
        this.assembleInteraction(interaction);
    }
    
    async findInteractionMethod(connection) {
        if (!this.delivery_methods_id) {
            // throw new Error('Delivery Id found!')
            return
        }
        let delivery_method = new DeliveryMethod({id: this.delivery_methods_id});
        await delivery_method.find(connection);
        
        this.DeliveryMethod = delivery_method
        switch(delivery_method.delivery_type) {
            case 'email':
                let email = new Email({interaction_id: this.id});
                console.log("THIS>id", this.id)
                await email.findByInteractionId(connection);
                this.Email = email;
                console.log("EMAIL", this.Email)
                break;

            case 'phone_call':
                let phone = new Phone_Call({});
                this.Phone = await phone.findByInteractionId(connection, this.id);
				let property = await models.Property.findByGdsID(connection, this.Phone.facility_id) || {};
				this.property_name = property?.name;
                break;
            case 'sms':
                let sms = new Sms({});
                this.Sms = sms.findByInteractionId(connection, this.id);
                break;
            case 'mail':
                let mail = new Mail({interaction_id: this.id});
                await mail.findByInteractionId(connection);
                this.Mail = mail;
                break;
            default:
                return;
        }
    }

    async findNotes(connection) {
        let notes =  await models.Interaction.findNotes(connection, this.id);

        for (let noteNum = 0; noteNum < notes.length; noteNum++) {
            let note = new Note({id: notes[noteNum].id})
            await note.find(connection);
            await note.findLastModifiedBy(connection);
            notes[noteNum] = note
        }

        this.Notes = notes
    }

    async findEnteredBy(connection, company_id) {

        if (this.entered_by) {
            this.EnteredBy = new Contact({ id: this.entered_by });
            await this.EnteredBy.find(connection, company_id);
            await this.EnteredBy.getRole(connection, company_id);
        }
        else if (this.entered_by_api) {
            //let api = await models.Api.findKeyById(connection,this.entered_by_api)
            //this.EnteredBy = {name : api.name}

            //I have commented the above code as per dicussion, In case we wanted to set Entered by object in future, we can uncomment it.
            //for now i am just logging in console that interaction was added by API

            console.log("This interaction was added by API: ", this.entered_by_api);
            return;
        }
        else {
            return;
        }

    }

    async findByGDSNotificationId(connection, notification_id) {
        let interaction = await models.Interaction.findByGDSNotificationId(connection, notification_id);
        if (!interaction) e.th(404, `No notification with GDS Notification id ${notification_id}`);
        this.assembleInteraction(interaction);
    }

    assembleInteraction(interaction) {

        this.id = interaction.id;
        this.property_id = interaction.property_id;
        this.space = interaction.space;		
        this.contact_id = interaction.contact_id;
        this.contact_type = interaction.contact_type;
        this.entered_by = interaction.entered_by;
        this.time = interaction.time;
        this.content = interaction.content;
        this.email_id = interaction.email_id;
        this.context = interaction.context;
        this.message_id = interaction.message_id;
        this.created = interaction.created;
        this.modified = interaction.modified;
        this.pinned = interaction.pinned;
        this.gds_notification_id = interaction.gds_notification_id;
        this.tenant_answer = interaction.tenant_answer;
        this.phone_call_id = interaction.phone_call_id;
        this.entered_by_api = interaction.entered_by_api;
        this.primary_contact_id = interaction.primary_contact_id;
        this.lease_id = interaction.lease_id;
        this.status = interaction.status;
        this.read = interaction.read;        
        this.document_batches_deliveries_id = interaction.document_batches_deliveries_id;
        this.delivery_methods_id  = interaction.delivery_methods_id;
        this.resolved = interaction.resolved;
        this.resolved_at = interaction.resolved_at;
        this.resolved_by = interaction.resolved_by;

    }


    findContact(connection, company_id) {
        if (!this.contact_id) return null;
        this.verifyId();

        this.Contact = new Contact({ id: this.contact_id });
        return this.Contact.find(connection, company_id);

    }

    async findEnteredBy(connection, company_id){

        if(this.entered_by){
          this.EnteredBy = new Contact({id: this.entered_by});
          await this.EnteredBy.find(connection, company_id);
          await this.EnteredBy.getRole(connection, company_id);
        }
        else if(this.entered_by_api){
          //let api = await models.Api.findKeyById(connection,this.entered_by_api)
          //this.EnteredBy = {name : api.name}
  
          //I have commented the above code as per dicussion, In case we wanted to set Entered by object in future, we can uncomment it.
          //for now i am just logging in console that interaction was added by API
          
          console.log("This interaction was added by API: ", this.entered_by_api);
          return;
        }
        else {
          return;
        }
  
      }

    findAdmin(connection, company_id) {
        if (!this.entered_by) return null;
        this.verifyId();

        this.Admin = new Contact({ id: this.entered_by });
        return this.Admin.find(connection, company_id);

    }

    async findEmail(connection) {
        this.Email = await models.Email.findById(connection, this.interaction_id)
    }

    async findPhoneCall(connection) {
        this.PhoneCall = await models.Phone_Call.findById(connection, this.interaction_id)
    }

    async assemble(connection, company_id) {
        this.verifyId();
        await this.findContact(connection, company_id);
        await this.findAdmin(connection, company_id);
        await this.findEmail(connection, company_id);
    }

    async findUploadsInteractions(connection) {

      if(!this.id) return;
      let upload = await models.Interaction.findUploadInteraction(connection, this.id);

      if (upload) {
        upload = new Upload({id: upload.upload_id})
        await upload.find(connection)
        this.Upload = upload
      }
     
    }

    static async interactorDetails(connection, contact_id){
        if(!contact_id) e.th("Contact ID must not be empty");
  
        let interactor = await models.Interaction.getInteractorDetails(connection, contact_id);
        interactor.contact_id = contact_id;
        return interactor;
      }

    set data(data) {
        let _interaction = this.data;
        for (let [key, val] of Object.entries(data)) {
            if (Object.keys(_interaction).includes(key)) {
                this[key] = val;
            }
        }
    }

    get data() {
        return {
            property_id: this.property_id,
			space: this.space,
			contact_id: this.contact_id,
            time: this.time || moment.utc().format('YYYY-MM-DD HH:mm:ss'),
            content: this.content,
            contact_type: this.contact_type,
            email_id: this.email_id,
            tenant_answer: this.tenant_answer,
            entered_by: this.entered_by,
            delivery_methods_id: this.delivery_methods_id,
            pinned: this.pinned || 0,
            gds_notification_id: this.gds_notification_id,
            context: this.context,
            read: this.read,
            document_batches_deliveries_id: this.document_batches_deliveries_id,
            primary_contact_id: this.primary_contact_id,
            lease_id: this.lease_id,
            status: this.status,
            created: this.created || moment.utc().toDate(),
            modified: this.modified || moment.utc().toDate(),
            resolved: this.resolved,
            resolved_at: this.resolved_at,
            resolved_by: this.resolved_by
        }
    }
}

module.exports = Interaction;
