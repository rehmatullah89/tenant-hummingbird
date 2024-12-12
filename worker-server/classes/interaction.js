"use strict";

var moment  = require('moment');
var models  = require(__dirname + '/../models');
var Contact = require(__dirname + '/../classes/contact.js');
var e  = require(__dirname + '/../modules/error_handler.js');

class Interaction {

    constructor(data){
        data = data || {};
        this.id = data.id;
		this.property_id = data.property_id;
		this.space = data.space;		
        this.contact_id = data.contact_id;
        this.contact_type = data.contact_type;
        this.entered_by = data.entered_by;
        this.content = data.content;
        this.method = data.method;
        this.read = data.read;
        // this.email_id = data.email_id;
        this.gds_notification_id = data.gds_notification_id;
        this.document_batches_deliveries_id = data.document_batches_deliveries_id;
        this.created = data.created;
        this.description = data.description;
        this.modified = data.modified;
        this.lease_id = data.lease_id;
        this.status_id = data.status_id;
       // this.tenant_answer = data.tenant_answer;
        this.delivery_methods_id = data.delivery_methods_id;
        this.pinned = data.pinned;
        this.context = data.context;
        this.entered_by_api = data.entered_by_api;
        this.primary_contact_id = data.primary_contact_id;
        this.Contact = {};
        this.Admin = {};
        this.Attachments = [];
    }

    async create(connection, property_id, space, recipient_contact_id, entered_by, content, delivery_methods_id, pinned, context, read, api_key_id, document_batches_deliveries_id, primary_contact_id, lease_id, gds_notification_id, status, contact_type, description){
        // console.log("CREATE PARAMS", recipient_contact_id, entered_by, content, delivery_methods_id, pinned, context, read, api_key_id, document_batches_deliveries_id, primary_contact_id, lease_id, gds_notification_id, status, contact_type)
       
       // this.tenant_answer = tenant_answer
	   	this.property_id = property_id;
		this.space = space;	
        this.contact_id = recipient_contact_id;
        this.contact_type = contact_type;
        this.content = content;
        this.entered_by = entered_by;
        this.delivery_methods_id = delivery_methods_id;
        this.pinned = pinned || false;
        this.context = context;
        this.gds_notification_id = gds_notification_id;
        this.description = description;
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
            description   : this.description,
            read      : this.read,
            document_batches_deliveries_id: this.document_batches_deliveries_id,
            primary_contact_id: this.primary_contact_id,
            lease_id: this.lease_id,
            status: this.status,
            created   : this.created || moment.utc().toDate(),
            modified  : this.modified || moment.utc().toDate()
        }

        console.log("interaction data", data)

        return await models.Interaction.save(connection, data, this.id);
    }

    async saveAttachments(connection, attachments) {
        for (let i = 0; i < attachments.length; i++){
            let attachment = {
                interaction_id: this.id, 
                upload_id: attachments[i].upload_id
            }
            attachment.id = await models.Attachment.save(connection, attachment);
            this.Attachments.push(attachment)
        }
    }

    static async saveBulkDeliveryBatches(connection, document_batches_deliveries_id, interaction_ids){
        await models.Interaction.saveBulkDeliveryBatches(connection, document_batches_deliveries_id, interaction_ids); 
    }
  
    async findAttachments(connection) {
        let attachments =  await models.Attachment.findById(connection, this.id);
        this.Attachments = attachments
     }
  
	async findSpaceByLeaseID(connection, lease_id) {
		if (lease_id) {
		   let result = await models.Unit.findSpaceNumberByLeaseId(connection, lease_id);		   
		   console.log("Space Info:", result);
		   return result;
		}
		return 'Tenant';
	}
		
    verifyId(){
        if (!this.id) e.th(500, 'No interaction id is set');
        return true;
    }

    async find(connection) {
        this.verifyId();
        let interaction =  await models.Interaction.findById(connection, this.id);
        this.assembleInteraction(interaction);
      }
    
      assembleInteraction(interaction) {
    
        this.id = interaction.id;
		this.property_id = interaction.property_id;
        this.space = interaction.space;		
        this.contact_id = interaction.contact_id;
        this.contact_type = interaction.contact_type;
        this.entered_by = interaction.entered_by;
        this.description = interaction.description;
        this.time = interaction.time;
        this.content = interaction.content;
        this.method = interaction.method;
        this.email_id = interaction.email_id;
        this.context = interaction.context;
        this.message_id = interaction.message_id;
        this.created = interaction.created;
        this.modified = interaction.modified;
        this.pinned = interaction.pinned;
        this.tenant_answer = interaction.tenant_answer;
        this.phone_call_id = interaction.phone_call_id;
        this.entered_by_api = interaction.entered_by_api;
        this.document_batches_deliveries = interaction.document_batches_deliveries;
        this.primary_contact_id = interaction.primary_contact_id;
        this.lease_id = interaction.lease_id;
        this.status_type_id = interaction.status_type_id;
        this.status = interaction.status;
        
      }
    

    findContact(connection, company_id){
        if(!this.contact_id) return null;
        this.verifyId();

        this.Contact = new Contact({id: this.contact_id});
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
      
    findAdmin(connection, company_id){
        if(!this.entered_by) return null;
        this.verifyId();

        this.Admin = new Contact({id: this.entered_by});
        return this.Admin.find(connection, company_id);

    }

    async findEmail(connection){
        if(!this.email_id) return;
        this.Email = await models.Email.findById(connection, this.email_id)
    }

    async assemble(connection, company_id){
        this.verifyId();
        await this.findContact(connection, company_id);
        await this.findAdmin(connection, company_id);
        await this.findEmail(connection, company_id);

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
            entered_by: this.entered_by,
            delivery_methods_id: this.delivery_methods_id,
            description: this.description,
            pinned: this.pinned || 0,
            gds_notification_id: this.gds_notification_id,
            context: this.context,
            read: this.read,
            document_batches_deliveries_id: this.document_batches_deliveries_id,
            primary_contact_id: this.primary_contact_id,
            lease_id: this.lease_id,
            status: this.status,
            created: this.created || moment.utc().toDate(),
            modified: this.modified || moment.utc().toDate()
        }
    }
}

module.exports = Interaction;
