var settings    = require(__dirname + '/../config/settings.js');

var mandrill = require('mandrill-api/mandrill');
var mandrill_client = new mandrill.Mandrill(settings.mandrill_api_key);
var rp = require('request-promise');
var Promise = require('bluebird');
var moment = require('moment');
const { Property } = require('../models');
var Email = require(__dirname + '/../classes/email.js');
var DeliveryMethod = require(__dirname + '/../classes/delivery_method.js');
var e = require(__dirname + '/error_handler.js');


function send_email(message){
    var uri = `${settings.get_communication_app_url()}/messages/`;

    if(!message.to_email){
        return Promise.reject("To email not specified.");
    }

    //TODO: needs to add track_click, track_open, attachment and sensativew flags, Blocked for these changes from GDS Communication app.
    var template_data = message.message;
    //TODO: Overwriting this for now as the sender email should be registered with communication app...
    //message.from_email = process.env.COMMUNICATION_APP_SENDER_EMAIL || 'account@tenantinc.com';
    var email_message = {
        ...(message.from_email && {
            from: {
            email: message.from_email,
            name: message.from_name || ""
        }}),        
        to: [{ email: settings.is_prod || settings.is_uat || settings.is_staging ? message.to_email: process.env.DEBUG_EMAIL_ADDRESS || 'jeff@tenantinc.com', name: message.to }],
        cc: message.cc && message.cc.map(m => { return {email: settings.is_prod || settings.is_uat || settings.is_staging ? m.email: process.env.DEBUG_EMAIL_ADDRESS || 'jeff@tenantinc.com', name: m.name}; }),
        // to: [{ email: settings.is_prod ? message.email : process.env.DEBUG_EMAIL_ADDRESS, name: message.name }],
        // ...(message.cc && {cc: message.cc.map(m => { return {email: m.email, name: m.name}; })}),
        // ...(message.bcc && {bcc: message.bcc.map(m => { return {email: m.email, name: m.name}; })}),
        subject: message.subject,
        ...(message.mjml_body && {mjml_part: message.mjml_body}),
        // ...(message && { html_body: message && message.message || null}),
        html_body: message.message,
        text_body: message.message, 
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

    return rp({
        method: 'POST',
        uri,
        body:{
           interaction_created:true,
           messages: [email_message],
            ...(message.owner_id && { owner_id: message.owner_id }),
            ...(message.facility_id && { facility_id: message.facility_id }),
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

    return rp({
        method: 'POST',
        uri,
        body:{
            interaction_created:true,
            messages: [email_message],
            ...(message.owner_id && { owner_id: message.owner_id }),
            ...(message.facility_id && { facility_id: message.facility_id }),
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

//TODO: See the the better solution for generating email body, earlier it was using mandrill templating system.
module.exports = {


    async sendEmail(connection, to, to_email, contact_id,  from, subject, message, attachments, owner_id, facility_id, fromEmail, delivery_method){
      var email_payload = {
        to: to,
        to_email: to_email,
        track_opens: true,
        track_clicks: true,
        sensitive: true,
        subject: subject,
        message: message,
        ...(fromEmail && {from_email: fromEmail}),
        from_name: from,
        attachments: attachments || [],
        ...(owner_id && { owner_id: owner_id }),
        ...(facility_id && {facility_id: facility_id})
      };
      try {
          var email_result = await send_email(email_payload);
          var email_response = email_result.applicationData[process.env.COMMUNICATION_APP_KEY][0][0];
          console.log("EMAIL RESPONSE", JSON.stringify(email_response, null, 2));

      } catch(err){
        console.log("ERR", err)
          //let response = err.response.body.applicationData[process.env.COMMUNICATION_APP_KEY][0][0];
          e.th(err.code, err.message);
      }
    


      if(!connection) return;

      
      
      return email_response;
      // let interaction = new Interaction();
      // await interaction.create(connection, details.contact_id, details.admin_id, moment().format('YYYY-MM-DD HH:mm:ss'), content[0].content, 'email', email.id);



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
    sendBasicEmail: async function(connection, details){

        // TODO additional Validation?
        if(!details.email) return Promise.reject();
        var email = {};
        var email_payload = {
            email: details.email,
            to: details.to,
            track_opens: true,
            track_clicks: true,
            sensitive: true,
            subject: details.subject,
            from_email: null,
            from_name: details.from,
            attachments: details.attachments || [],
            template: details.template,
            owner_id: details.owner_id,
            facility_id: details.facility_id

        };

        try {
            var email_result = await send_email(email_payload);
            var email_response = email_result.applicationData[process.env.COMMUNICATION_APP_KEY][0][0];
            if(!connection) return;
            var subject = details.template.data.filter(c => c.name == 'headline');
            var content = details.template.data.filter(c => c.name == 'content');

            let deliveryMethod = new DeliveryMethod()
            await deliveryMethod.findByGdsKey(connection, 'standard_email')

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

            await interaction.create(connection, property_id, 'Tenant', details.contact_id, details.admin_id, content[0].content, deliveryMethod.id, pinned, null, read, null, null, details.contact_id, null, null, null, null )

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
            var activity = new Activity();
            await activity.create(connection, details.company_id, details.admin_id || null, 16, 23,  details.contact_id, email.id);
            return email.setEmailContentTimer();
        } catch (err) {
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
            
            // let subject = subject
            email = new Email({
                contact_id: contact_id,
                to: to,
                email_address: to_email,
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
            console.log(err);
        }
    },
    PendingMoveInTemplate(tenant_name, property_name, unit_number, unit_price, document_link) {
        return `<html>
            <body>
                <p>Hey ${tenant_name},</p>
                <br />
                <p>Thank you for choosing ${property_name} for your self storage needs.</p>
                <br />
                <p>You selected space ${unit_number} and will pay $${unit_price} a month.</p>
                <br />
                <p>Before we can complete your move-in process, there are a few documents you need to sign.</p>
                <br />
                <p>You can find those documents here: <a href="${document_link}">${document_link}</a>  </p>
                <br />
                <p>Once you sign the documents, we'll be able to send you a gate code so you can start moving your belongings into your storage space. </p>
            </body>
        </html>`.replace( /[\r\n]+/gm, "" );
    },
    leaseSigningConfirmationTemplate(tenant_name, property_name, unit_number, facility_address, property_phone_number) {
        let templateText = `<html>
        <body>
            <p>Hey ${tenant_name},</p>
            <br />
            
            <p>Thank you for choosing ${property_name} for your storage needs.</p>
            
            <p>We're pleased to inform you that we've received your signed documents for ${unit_number}, and it's ready for your move-in. At your convenience, please reach out to us so we can confirm your identity and provide you with the gate code for property access.</p>`
        if (property_phone_number != null) templateText+=(`<p>Should you have any questions, don't hesitate to contact us at ${property_phone_number}. We're thrilled to have you on board!</p>`)
        templateText+=("</body></html>")
        return templateText.replace( /[\r\n]+/gm, "" );
    },
    updatePayoutBankAccountTemplate(property_name){
        let templateText = `<html>
        <body>
            <p>We have successfully processed your request to update your property - ${property_name}'s bank account information in our system.
               The proceeds of the payment processing will be deposited to the updated bank record here on.</p>
            <p>If this was not an authorized change, please contact customer care immediately.</p>
        </body></html>`
        return templateText.replace( /[\r\n]+/gm, "" );
    },
    async sendUpdateBankEmail(connection, property_id, gds_owner_id, recipient_emails, htmlTemplate) {

      console.log(property_id, "sendUpdateBankEmail to : ", recipient_emails);

      if (recipient_emails == null || recipient_emails.length == 0) {
          return false;
      }
      let recipient_emails_dict = [];
      for(let i = 0; i<recipient_emails.length; i++){
          recipient_emails_dict.push({email: recipient_emails[i]});
      }

      var email_payload = {
        interaction_created:true,
        messages: [
          {
            from: {
              email: "account@tenantinc.com",
              name: 'Tenant Payments'
            },
            to: recipient_emails_dict,
            subject: "Payout Bank Account Information Change "
          }
        ],
        owner_id: gds_owner_id,
        variables: {
          template: {
            body: htmlTemplate,
            template_name: 'tenant_payment_account_update',
            date: moment().format('M/D/Y'),
            title: 'Payout Bank Account Information Changes',
          }
        }
      };
      let uri = `${settings.get_communication_app_url()}/messages/`;
      let post_data = {
        method: 'POST',
        uri,
        body: email_payload,
        headers: {
          'Content-Type': 'application/vnd+gds.email',
          'X-storageapi-key': process.env.GDS_API_KEY,
          'X-storageapi-date': Date.now()
        },
        gzip: true,
        json: true
      }
      await rp(post_data);
      return true;
    },

    async chargeBackNotificationEmailTemplate (connection, payment, prop, contact, addresses, notificationDetails, item) { 
        if(item.subdomain!=null){
            var url="https://"+item.subdomain+".tenantinc.com"
        }else{
            var url="-"
        }
        let templateText = `<html>
        <body>
            <p><i>Hello Team, </i></p>
            <p></p> 
    
            <p><i>We've recently been notified that a chargeback has been issued against your ProPay Account ${prop} - <a href=${url} style="color: blue !important; text-decoration: underline;">${item.name}</a> - 
            ${addresses}</i></p>
            <p></p>
    
            <p><strong>Here are the details of the chargeback: </strong></p>
            <p></p>
    
            <ul>
                <li>Chargeback Issued Date:<span style="color:red;"> ${notificationDetails.date} </span></li>
            
                <li>Chargeback Amount:<span style="color:red;"> $${notificationDetails.amount}</span></li>
            
                <li>Tenant Name: <span style="color:red;"> ${contact.first} ${contact.middle} ${contact.last}</span></li>
            
                <li>CC Last 4 Digits: <span style="color:red;"> ${notificationDetails.cclast4}</span></li>       
            
                <li> Payment Transaction ID:<span style="color:red;"> ${payment.transaction_id}</span></li>  
            
                <li> Payment Date:<span style="color:red;"> ${payment.date} </span></li>          
            
                <li> Payment Amount:<span style="color:red;"> $${parseFloat(payment.amount).toFixed(2)}</span> </li>    
            
                <li>  Reason:<span style="color:red;"> ${notificationDetails.reason}</span></li> 

                <li> Payment Processor Account Number:<span style="color:red;"> ${notificationDetails.account_number}</span></li>
            </ul>  
            <p>If this was not an authorized change, please contact customer care immediately.</p>
            <p></p>
    
            <p><strong>Here are your options:  </strong></p>
        <p></p>
        <ol>
            <li>Reach out to the cardholder directly to resolve the dispute.</li>  
            <li>Send a response to  <a href="mailto:chargebackhelp@propay.com" style="color: blue !important; text-decoration: underline;">chargebackhelp@propay.com</a> with documents 
                that reference your ProPay account email address within <strong>10 calendar days</strong> of the 
                Chargeback Issue Date to dispute the chargeback.</li> 
        </ol>
    
        <p><strong>What documentation to provide: </strong></p>
        <p></p>
    
        <ul>
            <li> Any invoices, contracts, sales slips, card imprints, or anything bearing the signature of your customer </li>
            <li>Terms and Conditions, if applicable.</li>
            <li> Proof of delivery. Signed proof of delivery is always best.</li>
            <li> Any correspondence from the cardholder regarding the sale of products and/or services.</li>
            <li> A brief letter from you outlining the circumstances surrounding the transaction. </li> 
        </ul>
    
        <p><strong> Here's what you need to know:</strong></p>
        <p></p>
    
        <ol>
            <li> What are possible outcomes after documentation is submitted to the bank?
            <ul style="list-style:disc;">
                <li> If a full refund was issued prior to the chargeback, 
                the fee associated with your chargeback will be refunded. As this fee is assessed by the credit card brand, ProPay cannot issue refunds under any other circumstances. </li>
                <li> If you win your chargeback, the charged amount, minus the fee, will be credited back to your account. </li>
                <li> If you lose your chargeback, the case is officially closed by the credit card brand and you must seek other recourse. ProPay cannot provide counsel as to how to do this. </li>
            </ul>
            </li>
            <li> It can take approximately 60 days from the date the documentation is submitted to the credit card company to hear back from them regarding 
                the chargeback representment. Results are rarely provided to ProPay earlier than 60 days. </li>
            <li>  Chargeback Team's Email: <a href="mailto:chargebackhelp@propay.com" style="color: blue !important; text-decoration: underline; ">chargebackhelp@propay.com</a>
            | Standard Response Time: 1-3 business days. </li>
            <li> To learn more about ProPay Chargebacks, please visit <a href="mailto:support@tenantinc.com" style="color: blue !important; text-decoration: underline;">ProPay Chargebacks FAQ</a>. </li>
        </ol>
        <p></p>
    
        <p> Should you have additional questions or concerns regarding this notice, 
            please be writing to <a href="mailto:support@tenantinc.com" style="color: blue !important; text-decoration: underline;">support@tenantinc.com</a>. 
            Thank you for your attention to this matter. </p>
        <p></p>
    
        </body></html>`
        return templateText.replace(/[\r\n]+/gm, "");
    },

    async sendChargeBackNotificationEmail(gds_owner_id, property, email_details, recipient_emails, htmlTemplate) {
        if (recipient_emails == null || recipient_emails.length==0) {
            return false;
        }
        let recipient_emails_dict = [];
        for(let i = 0; i<recipient_emails.length; i++){
            recipient_emails_dict.push({email: recipient_emails[i]});
        }
        var email_payload = {
            interaction_created:true,
            messages: [
                { 
                    from: {
                        email: email_details.from_email,
                        name: 'Tenant Payments'
                    },
                    to: recipient_emails_dict, 
                    bcc: [{email: email_details.bcc_email}],
                    subject: email_details.subject+": "+ property
                }
            ],
            owner_id: gds_owner_id,
            variables: { 
                template: {
                    body: htmlTemplate,
                    template_name: 'tenant_payment_account_update',
                    date: moment().format('M/D/Y'),
                    title: email_details.title,
                }
            }
        };
        let uri = `${settings.get_communication_app_url()}/messages/`;
        let post_data = {
            method: 'POST',
            uri,
            body: email_payload,
            headers: {
                'Content-Type': 'application/vnd+gds.email',
                'X-storageapi-key': process.env.GDS_API_KEY,
                'X-storageapi-date': Date.now()
            },
            gzip: true,
            json: true
        }
        await rp(post_data);
        return true;
    },

    async achreversalNotificationEmailTemplate (connection, payment, prop, contact, addresses, notificationDetails, item) { 
        if(item.subdomain!=null){
            var url="https://"+item.subdomain+".tenantinc.com"
         }else{
            var url="-"
         }
        let templateText = `<html>
        <body>
            <p><i>Hello Team, </i></p>
            <p></p> 
    
            <p><i>This is to notify you that there has been an ACH Return for a previously collected ACH charge. ${prop} - <a href=${url} style="color: blue !important; text-decoration: underline;">${item.name}</a> -
            ${addresses}</i></p>
            <p></p>
            <p>An ACH Return occurs when the receiving bank rejects the transaction or the receiving bank account holder disputes the transaction. The amount of the ACH transaction has been debited from your ProPay account.</p>
    
            <p><strong>Here are the details of the ACH Return:  </strong></p>
            <p></p>
    
            <ul>
                <li> ACH Return Issued Date:<span style="color:red;"> ${notificationDetails.date} </span></li>
            
                <li> ACH Return Amount:<span style="color:red;"> $${notificationDetails.amount}</span></li>
            
                <li> Tenant Name: <span style="color:red;"> ${contact.first} ${contact.middle} ${contact.last}</span></li>     
            
                <li> Payment Transaction ID:<span style="color:red;"> ${payment.transaction_id}</span></li>  
            
                <li> Payment Date:<span style="color:red;"> ${payment.date} </span></li>          
            
                <li> Payment Amount:<span style="color:red;"> $${parseFloat(payment.amount).toFixed(2)}</span> </li>    
            
                <li> Reason for Return: <span style="color:red;"> ${notificationDetails.reason}</span></li> 

                <li> Payment Processor Account Number:<span style="color:red;"> ${notificationDetails.account_number}</span></li>
            </ul>  
            <p></p>
    
            <p><strong>Here are some suggestions that may help to prevent future ACH Returns: </strong></p>
        <p></p>
        <ul>
            <li>Insufficient Funds:  The bank account must have sufficient funds to debit the account</li>  
            <li>Correct Bank Account Number:  The receiving bank will return an ACH transaction for an unknown or  
            incorrect bank account number</li> 
            <li>Customer Advises not Authorized/Stop Payment:  You will want to communicate with your customer what will appear on their bank account statement. 
            You will also want to ensure all services/products are rendered in a timely manner.</li>
        </ul>
    
        <p> Should you have additional questions or concerns regarding this notice, 
            please be writing to <a href="mailto:support@tenantinc.com" style="color: blue !important; text-decoration: underline;">support@tenantinc.com</a>. 
            Thank you for your attention to this matter. </p>
        <p></p>
    
        </body></html>`
        return templateText.replace(/[\r\n]+/gm, "");
    },

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
