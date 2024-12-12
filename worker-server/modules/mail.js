var settings    = require(__dirname + '/../config/settings.js');

var mandrill = require('mandrill-api/mandrill');
var mandrill_client = new mandrill.Mandrill(settings.mandrill_api_key);
var rp = require('request-promise');
var Promise = require('bluebird');
var moment = require('moment');
var Email = require(__dirname + '/../classes/email.js');
var DeliveryMethod = require(__dirname + '/../classes/delivery_method.js');
var Activity = require(__dirname + '/../classes/activity.js');
var Interaction = require(__dirname + '/../classes/interaction.js');
var models  = require(__dirname + '/../models');
var Upload = {};
const { v4: uuidv4 } = require('uuid');
setTimeout(() => Upload = require(__dirname + '/../classes/upload.js'), 10);
const Utils = require(__dirname + '/../modules/utils');


function send_mail (message, owner_id, facility_id) {
    var uri = `${settings.get_communication_app_url()}/messages/`;
    let content_type = 'application/vnd+gds.mail'; 
    if(!message.to.length){
        return Promise.reject("Please provide recepient name and email");
    }
	let int_create_status = false;
	if (message && message.int_created && message.int_created === true) {
		int_create_status = true;
	}
    let post_data = {
        method: 'POST',
        uri,
        body:{
            interaction_created:int_create_status,
            messages: [message],
            owner_id,
            facility_id
        },
        headers: {
            'Content-Type': content_type,
            'X-storageapi-key': process.env.GDS_API_KEY,
            'X-storageapi-date': Date.now()
        },
        gzip: true,
        json: true
    }
    
    console.log("post_data", JSON.stringify(post_data, null, 4));

    return rp(post_data);

}

function send_email(message){
    var uri = `${settings.get_communication_app_url()}/messages/`;
    let content_type = 'application/vnd+gds.email'; 
    //TODO: needs to add track_click, track_open, attachment and sensativew flags, Blocked for these changes from GDS Communication app.
    // var template_data = message.message;
    //TODO: Overwriting this for now as the sender email should be registered with communication app...
    // message.from_email = process.env.COMMUNICATION_APP_SENDER_EMAIL || 'account@tenantinc.com';
    // if(typeof message.to_email === 'string')  message.to_email = [message.to_email];
    // if(typeof message.to === 'string') message.to = [message.to];

    if(!message.to.length){
        return Promise.reject("Please provide recepient name and email");
    }
    let to_arr = [];
    // for(let i = 0; i < message.to_email.length; i++){
    //     let recepient = { email: message.to_email[i], name: message.to[i]}
    //     to_arr.push(recepient)
    // }

    let debug_arr = [];
    //debug_arr.push({email: 'notanemail', name: 'John'});
    debug_arr.push({email: process.env.DEBUG_EMAIL_ADDRESS, name: process.env.DEBUG_EMAIL_ADDRESS_NAME});
    
    let to = settings.is_prod || settings.is_uat || settings.is_staging ? (Array.isArray(message.to)? message.to : [{email: message.to_email, name: message.to }]) : debug_arr;
    let cc = [];
    if(message.cc){
       cc = settings.is_prod || settings.is_uat || settings.is_staging  ? message.cc : debug_arr;
        // cc = message.cc;
    }    
    
    var email_message = {
        ...(message.from_email && {
            from: {
                email: message.from_email,
                name: message.from_name || ""
            }}),
        //to: settings.is_prod || settings.is_uat || settings.is_staging ? to_arr : debug_arr, 
        attachments: message.attachments
    };
  
    switch(message.delivery_method){
        case 'registered_email':
        case 'certified_mail':          
            email_message.registered_email = true;
        case 'standard_email':
            email_message.html_body = message.message;
            email_message.text_body = message.message;
            email_message.subject = message.subject;
            email_message.cc = cc.map(t => {
                return {
                    name: t.name,
                    email: t.email
                }
            });
            email_message.to = to.map(t => {
                return {
                    name: t.name,
                    email: t.email
                }
            });
            content_type = 'application/vnd+gds.email';
            break;
    }

    console.log("URI IS -----", uri);
    
	let int_create_status = false;
	if (message && message.int_created && message.int_created === true) {
		int_create_status = true;
	}
    let post_data = {
        method: 'POST',
        uri,
        body:{
            interaction_created:int_create_status,
            messages: [email_message],
            ...(message.owner_id && { owner_id: message.owner_id }),
            ...(message.facility_id && { facility_id: message.facility_id })
        },
        headers: {
            'Content-Type': content_type,
            'X-storageapi-key': process.env.GDS_API_KEY,
            'X-storageapi-date': Date.now()
        },
        gzip: true,
        json: true
    }
    console.log("post_data", JSON.stringify(post_data, null, 4));
    return rp(post_data);
}

function send_generic_email(message){
    var uri = `${settings.get_communication_app_url()}/messages/`;

    if(!message.to_email){
        return Promise.reject("To email not specified.");
    }

    //TODO: needs to add track_click, track_open, attachment and sensativew flags, Blocked for these changes from GDS Communication app.
    var template_data = message.message;
    //TODO: Overwriting this for now as the sender email should be registered with communication app...
    // message.from_email = process.env.COMMUNICATION_APP_SENDER_EMAIL || 'account@tenantinc.com';
    var email_message = {
        ...(message.from_email && {
            from: {
            email: message.from_email,
            name: message.from_name || ""
        }}),        
        to: [{ email: settings.is_prod || settings.is_uat || settings.is_staging ? message.to_email: process.env.DEBUG_EMAIL_ADDRESS || 'jeff@tenantinc.com', name: message.to }],
        // to: [{ email: settings.is_prod ? message.email : process.env.DEBUG_EMAIL_ADDRESS, name: message.name }],
        // ...(message.cc && {cc: message.cc.map(m => { return {email: m.email, name: m.name}; })}),
        // ...(message.bcc && {bcc: message.bcc.map(m => { return {email: m.email, name: m.name}; })}),
        subject: message.subject,
        ...(message.mjml_body && {mjml_part: message.mjml_body}),
        // ...(message && { html_body: message && message.message || null}),
        //html_body: message.message,
        ...(message.message && {text_body: message.message}),
        // ...(message.text_body && {text_body: message.text_body}),
        // reply_to: {
        //     email: message.from_email,
        //     name: message.from_name
        // },
        attachments: message.attachments
    };

    var email_payload = {
        messages: [email_message],
        ...(!message.from_email && message.owner_id && { owner_id: message.owner_id }),
        ...(!message.from_email && message.facility_id && { facility_id: message.facility_id })
    }
    console.log("email_payload", JSON.stringify(email_payload, null, 4));

    return rp({
        method: 'POST',
        uri,
        body:{
            interaction_created:false,
            messages: [email_message],
            ...(!message.from_email && message.owner_id && { owner_id: message.owner_id }),
            ...(!message.from_email && message.facility_id && { facility_id: message.facility_id }),
            ...(message.generic_html_message && {variables: {
                template: {
                    body: message.generic_html_message,
                    template_name: "generic_email"
                }
            }}),
        },
        headers: {
            'Content-Type': 'application/vnd+gds.email',
            'X-storageapi-key': process.env.GDS_API_KEY,
            'X-storageapi-date': Date.now()
        },
        gzip: true,
        json: true
    });
}

function log(request, response, error, event, trace_id){
    let { attachments, ...ep} = request;
    if(attachments){
        ep.attachments = attachments.map(a => {
            a.content = '-';
            return a;
        })
    }

    // log request
    let logs = {
        request: ep,
        response: response || {}
    } 
    console.log("response", response); 
    if(error){
        console.log("error", error)
        console.log("logs", logs)
        logs.response.error = error
    }
    Utils.sendLogsToGDS('HB_WORKER_SERVER', logs, null, error ? 'error' : 'info', uuidv4(), trace_id, {event_name: event } )

}
//TODO: See the the better solution for generating email body, earlier it was using mandrill templating system.
module.exports = {

    async sendEmail(connection, to, contact_id, from, subject, message, attachments, owner_id, property_id, cc = [], delivery_method = 'standard_email', onboarding, trace_id, int_created){
        let error = null;
        let email_result = null;
        var email_response = {}
		let int_create_status = false;
		if (int_created && int_created === true) {
			int_create_status = true;
		}
        var email_payload = {
            to: to,
            //to: 'notanemail',
            int_created: int_create_status,
            track_opens: true,
            track_clicks: true,
            sensitive: true,
            subject: subject,
            message: message,
            ...(onboarding && { from_email: null }),
            cc,
            delivery_method: delivery_method ,
            from_name:  from,
            attachments: attachments || [],
            ...(owner_id && { owner_id: owner_id  }),
            ...(property_id && {facility_id: property_id})
        };
        console.log("email_payload", email_payload)
        try {
            email_result = await send_email(email_payload);
            email_response = email_result.applicationData[process.env.COMMUNICATION_APP_KEY][0][0];
            
        } catch(err){ 
            
            console.log("process.env.COMMUNICATION_APP_KEY", process.env.COMMUNICATION_APP_KEY)
            console.log("err", err)
            if(Array.isArray(err.error.applicationData[process.env.COMMUNICATION_APP_KEY][0])){
                error = err.error.applicationData[process.env.COMMUNICATION_APP_KEY][0][0];
            } else {
                error = err.error.applicationData[process.env.COMMUNICATION_APP_KEY][0];
            }
        }
    
        log(email_payload, email_response, error, 'SendEmail', trace_id)
        console.log("sendEmail email_response", email_response, error);

        return email_response.error || email_response;
   
    },


    async sendMail(connection, to, contact_id, attachments, owner_id, property_id, delivery_method, trace_id, int_created){
        let error = null;
        let mail_result = null;
        let mail_response = {};
		let int_create_status = false;
		if (int_created && int_created === true) {
			int_create_status = true;
		}
        var mail_payload = {
            to: to,
			int_created: int_create_status,
            postal_mail: true,
            postal_mail_tracking: delivery_method, 
            from: {}, 
            attachments: attachments,
           
        };
        try {
            mail_result = await send_mail(mail_payload, owner_id, property_id);
            mail_response = mail_result.applicationData[process.env.COMMUNICATION_APP_KEY][0][0];
            console.log("mail_response", mail_response)

        } catch(err){
            if(Array.isArray(err.error.applicationData[process.env.COMMUNICATION_APP_KEY][0])){
                error = err.error.applicationData[process.env.COMMUNICATION_APP_KEY][0][0];
            } else {
                error = err.error.applicationData[process.env.COMMUNICATION_APP_KEY][0];
            }
        }

        log(mail_payload, mail_response, error, 'SendMail', trace_id);
        
        return mail_response.error || mail_response;

    }, 
    sendReport(details){
        var email_payload = {
            email: details.email,
            to: details.to,
            track_opens: true,
            track_clicks: true,
            sensitive: true,
            subject: details.subject,
            from_email: null,
            from_name: details.from,
            attachments: details.attachments,
            template: details.template,
            owner_id: details.owner_id,
            facility_id: details.facility_id
        };

        return send_email(email_payload);
    },
    sendBasicEmail: async function(connection, details, content, delivery_method = 'standard_email', upload_id){
        // TODO additional Validation?
        if(!details.email) return Promise.reject();
        var email = {};
        var email_payload = {
			int_created: true,
            to_email: details.email,
            to: details.to,
            track_opens: true,
            track_clicks: true,
            sensitive: true,
            message: content,
            subject: details.subject,
            from_email: null,
            from_name: details.from,
            attachments: details.attachments || [],
            delivery_method: delivery_method,
            template: details.template,
            ...(details.owner_id && { owner_id: details.owner_id }),
            ...(details.facility_id && {facility_id: details.facility_id})

        };

        try {
           // var email_result = await send_email(connection, details.to, details.email, null,  "account@tenantinc.com", details.subject, content, details.attachments || []);
            var email_result = await send_email(email_payload);
            console.log("email_result", email_result)
            var email_response = email_result.applicationData[process.env.COMMUNICATION_APP_KEY][0][0];
            console.log(email_response);
            if(!connection) return;
            var subject = details.template.data.filter(c => c.name == 'headline');
            var content = details.template.data.filter(c => c.name == 'content');

            let deliveryMethod = new DeliveryMethod({});
            await deliveryMethod.findByGdsKey(connection, delivery_method);

            let interaction = new Interaction();
            let pinned = 0;
            let read = 1;
			let property = await models.Property.findByGdsID(
			  connection,
			  details.facility_id
			);
			let property_id = 0;
			if (property) {
			  property_id = property.id;
			}	
			
            await interaction.create(connection, property_id, 'Tenant', details.contact_id, details.admin_id, content[0].content, deliveryMethod.id, pinned, null, read, null, null, null, null, null, null, null )

            email = new Email({
                contact_id: details.contact_id,
                interaction_id: interaction.id,
                to: details.to,
                email_address: details.email,
                subject: subject[0].content,
                from_email: email_payload.from_email,
                from_name: email_payload.from_name,
                message: content[0].content
            });


            await email.save(connection);
            let Activity = require(__dirname + '/../classes/activity.js');
            var activity = new Activity();
            await activity.create(connection, details.company_id, details.admin_id || null, 16, 23,  details.contact_id, email.id);
            if (details.attachments.length && upload_id) {
                var upload = new Upload({id: upload_id});
                await upload.find(connection)
                upload.saveUploadInteraction(connection, interaction.id)
            }
            return email.setEmailContentTimer();
        } catch (err) {
            console.log(err);
            return this.sendErrorEmail(err, details, email_payload);
        }
    },
    sendMessage: async function(details){
        var email_payload = {
            email: details.email,
            to: details.to,
            track_opens: true,
            track_clicks: true,
            sensitive: true,
            subject: details.subject,
            from_email: null,
            from_name: details.from,
            template: details.template,
            owner_id: details.owner_id,
            facility_id: details.facility_id

        };
        try {
            await send_email(email_payload);
        } catch (err) {
            return this.sendErrorEmail(err, details, email_payload);
        }
    },

    sendErrorEmail: async function(err, details, email_payload){
        var email_payload = {
            to: 'Jeff Ryan',
            to_email: 'zrehman@ssidecisions.com',
            track_opens: true,
            track_clicks: true,
            sensitive: true,
            subject: "ERROR MESSAGE",
            message: JSON.stringify(err),
            from_email: null,
            from_name: "TEST",
            // attachments: attachments || [],
            // ...(owner_id && { owner_id: owner_id }),
            // ...(property_id && {facility_id: property_id})
        };

        console.log("email_payload", email_payload)
        var email_result = await send_email(email_payload);
    },
    sendInvoice: async function(connection, details){

        var email = {};
        var email_payload = {
            email: details.email,
            to: details.to,
            track_opens: true,
            track_clicks: true,
            sensitive: false,
            subject: details.subject,
            from_email: null,
            from_name:  details.from,
            template: details.template,
            owner_id: details.owner_id,
            facility_id: details.facility_id
        };

        try {
            var email_result = await send_email(email_payload);
            if (!connection || !details.contact_id) return; //  Dont save admin emails like summary report
            var email_response = email_result.applicationData[process.env.COMMUNICATION_APP_KEY][0][0];
            var subject = details.subject;
            var content = details.template.data.filter(c => c.name === 'content');
            email = new Email({
                contact_id: details.contact_id,
                to: details.to,
                email_address: details.email,
                subject: subject,
                from_email: email_payload.from_email,
                from_name: email_payload.from_name,
                message: null,
                // refid: email_result.result._id,
                // reject_reason: email_result.result.reject_reason,
                // status: email_result.result.status
                refid: email_response.MessageID,
                reject_reason: null,
                status: null
            });

            await email.save(connection);
            var activity = new Activity();
            await activity.create(connection, details.company_id, details.admin_id || null, 16, 23, details.contact_id, email.id);
            return email.setEmailContentTimer();
        } catch (err) {
            return this.sendErrorEmail(err, details, email_payload)
        }
    },
    sendMaintenanceRequest: async function(connection, details){
        var email = {};
        var email_payload = {
            email: details.email,
            to: details.to,
            track_opens: true,
            track_clicks: true,
            sensitive: false,
            subject: details.subject,
            from_email: null,
            from_name:  details.from,
            template: details.template,
            owner_id: details.owner_id,
            facility_id: details.facility_id
        };

        try {
            var email_result = send_email(email_payload);
            if (!connection || !details.contact_id) return; //  Dont save admin emails like summary report
            var email_response = email_result.applicationData[process.env.COMMUNICATION_APP_KEY][0][0];
            var subject = details.subject;
            var content = details.template.data.filter(c => c.name === 'content');
            email = new Email({
                contact_id: details.contact_id,
                to: details.to,
                email_address: details.email,
                subject: subject,
                from_email: email_payload.from_email,
                from_name: email_payload.from_name,
                message: null,
                // refid: email_result.result._id,
                // reject_reason: email_result.result.reject_reason,
                // status: email_result.result.status
                refid: email_response.MessageID,
                reject_reason: null,
                status: null
            });
            await email.save(connection);

            var activity = new Activity();
            await activity.create(connection, details.company_id, details.admin_id || null, 16, 23, details.contact_id, email.id);
            return email.setEmailContentTimer()
        } catch (err) {
            return this.sendErrorEmail(err, details, email_payload);
        }
    },
    sendErrorState: async function (output, attachments){

        var email = {
            email:  settings.get_configured_reporting_emails(),
			to:     settings.get_configured_reporting_email_names(),
			subject: 'Error State Summary',
			from: "Tenant Center",
			template: {
				name: 'basic-email',
				data: [
					{
						name: 'logo',
						//content: company.getLogoPath()
					},
					{
						name: 'headline',
						content: 'Payment Breakdown'
					},
					{
						name: 'content',
						content: output
					}]
			},
			//company_id: company.id,
			contact_id: 1010,
			attachments: attachments
		};

        try {
            await this.sendBasicEmail(null, email, output);
        } catch (err) {
            console.log(err);
            return err;
        }

    },
    sendInvoiceToGds: async function(body){
        var uri = `${settings.get_communication_app_url()}/messages/`;
        let response = await rp({
            method: 'POST',
            uri,
            body,
            headers: {
                'Content-Type': 'application/vnd+gds.email',
                'X-storageapi-key': process.env.GDS_API_KEY,
                'X-storageapi-date': Date.now()
            },
            gzip: true,
            json: true
        });
        return response;
    },

    sendGenericEmail: async function(connection, to, to_email, contact_id, from, subject, generic_html_message, owner_id, property_id) {
        let email = {};
        let email_payload = {
            to: to,
            to_email: to_email,
            track_opens: true,
            track_clicks: true,
            sensitive: true,
            subject: subject,
            generic_html_message: generic_html_message
            
            
            
            ,
            from_name: from,
            ...(owner_id && { owner_id: owner_id }),
            ...(property_id && {facility_id: property_id})


        }

        try {
            let email_result = await send_generic_email(email_payload);
            
            console.log(email_result)
            if (!connection || !contact_id) return;
            let email_response = email_result.applicationData[process.env.COMMUNICATION_APP_KEY][0][0];
            
            email = new Email({
                contact_id: contact_id,
                to: to,
                email_address: to_email,
                subject: subject,
                from_email: null,
                from_name: email_payload.from_name,
                message: null,
                // refid: email_result.result._id,
                // reject_reason: email_result.result.reject_reason,
                // status: email_result.result.status
                refid: email_response.MessageID,
                reject_reason: null,
                status: null
            });

            await email.save(connection);
            var activity = new Activity();
            await activity.create(connection, details.company_id, details.admin_id || null, 16, 23, details.contact_id, email.id);
            return email.setEmailContentTimer();

        } catch (err) {
            console.log(err);
        }
    },

    PendingMoveIn(tenantName, propertyName, unitNumber, unitPrice, documentLink, latestPayment, paymentConfirmationId) {
        return `<html>
            <body>
                <p>Hey ${tenantName},</p>
                <br />
                <p>Thank you for choosing ${propertyName} for your self-storage needs.

                Here are the details about your storage space</p>

                <ul>
                    <li>Space no. ${unitNumber}</li>
                    <li> Monthly Rate: $${unitPrice}</li>
                </ul>

                <p>We received your recent payment of $${latestPayment}. Your payment confirmation number is ${paymentConfirmationId}.</p>

                <p>Before we can complete your move-in process, there are a few documents you need to sign.</p>

                <p>You can find those documents here: <a href="${documentLink}">${documentLink}</a>  </p>

                <p>Once you sign the documents, we'll be able to send you a gate code so you can start moving your belongings into your storage space. </p>
            </body>
        </html>`.replace( /[\r\n]+/gm, "" );

    }

    // getOwnerPropertyInfo: async function(connection, contact, company){
    //     try {
    //             if(contact.Leases.length === 0) await contact.getLeases(connection);

    //             var property_id = contact.Leases.length > 0? contact.Leases[0].Unit.property_id: lead.property_id;
    //             // TODO: Validate this from alokans, why the id is not translated.
    //             var mapped_property_id = await getGDSPropertyMappingId(property_id);
    //             return {owner_id: company.gds_owner_id, property_id: mapped_property_id};
    //     } catch (err) {
    //         console.log(err.message);
    //         console.log(err);
    //     }
    // }
};
