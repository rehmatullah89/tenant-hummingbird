
var moment      = require('moment');

var jade = require('jade');
var fs = require('fs');


var pool;
var settings = require(__dirname + '/../config/settings.js');

var Hash = require(__dirname + '/../modules/hashes.js');
var Hashes = Hash.init();


var models      = require(__dirname + '/../models/index.js');
var Company   = require(__dirname + '/../classes/company.js');
var Activity   = require(__dirname + '/../classes/activity.js');
var MaintenanceRequest   = require(__dirname + '/../classes/maintenance_request.js');



var Promise = require('bluebird');
var Notification      = require(__dirname + '/../classes/notification.js');
var Mail = require(__dirname + '/../modules/mail.js');

var twilioClient = require('twilio')(settings.twilio.accountSid, settings.twilio.authToken);

var MaintenanceObj = {
    connection: {},
    message: {},
    submessage: {},
    request_type: {},
    company: {},
    maintenance_id: '',
    messageThread: [],
    data: {},
    emails: [],
    confirmationEmail: '',
    maintenanceEmail: '',
    async log(string){
        return await fs.appendFile('/home/app/hummingbird/tsys_runs/tsys_runs.txt', string + '\r\n');
    },
    send: async(data, pool) => {

        let connection = await pool.getConnectionAsync();
        try{

            let company = new Company({ subdomain: data.domain });
            await company.findBySubdomain(connection);

            let submessage = await models.Maintenance.findSubmessageById(connection, null, data.id);
            if(!submessage) throw "Message not found";

            let maintenanceRequest = new MaintenanceRequest({id: submessage.maintenance_id});

            await maintenanceRequest.find(connection, company.id);
            await maintenanceRequest.getLease(connection, company.id);
            await maintenanceRequest.getThread(connection, company.id);

            if(!maintenanceRequest.Thread.length) throw "No message found";
            let activeMessage = maintenanceRequest.Thread[0];

            let maintenanceEmailHtml = await new Promise(function(resolve, reject) {
                //Without new Promise, this throwing will throw an actual exception
                // Create maintenance request message,  goes to admin or tenant receiving update
                jade.renderFile(__dirname + '/../views/messages.jade', {
                    maintenanceRequest: maintenanceRequest,
                    moment: moment,
                    Hashes: Hashes,
                    company:company,
                    settings: settings
                }, function(err, html){
                    if(err) reject(err);
                    return resolve(html);
                });
            });

            console.log("maintenanceEmailHtml", maintenanceEmailHtml);

            let confirmationEmailHtml = await new Promise(function(resolve, reject) {
                //Without new Promise, this throwing will throw an actual exception
                // Create confirmation message, goes to person sending request
                jade.renderFile(__dirname + '/../views/confirm_message.jade', {
                    maintenanceRequest: maintenanceRequest,
                    moment: moment,
                    Hashes: Hashes,
                    settings: settings
                }, function(err, html){
                    if(err) reject(err);
                    return resolve(html);
                });
            });

            if(activeMessage.Contact.role == 'tenant'){ // This is a tenant making the request
                console.log("Sending message to admin");
                // send message to admin
                if(maintenanceRequest.RequestType.email && maintenanceRequest.RequestType.email.length){
                    for(let i = 0; i < maintenanceRequest.RequestType.email.length; i++ ){
                        let email = MaintenanceObj.makeAdminMaintenanceEmail(maintenanceRequest.RequestType.email[i], maintenanceRequest, maintenanceEmailHtml, company);
                        await Mail.sendMaintenanceRequest(connection, email);
                    }
                }

                if(maintenanceRequest.RequestType.text && maintenanceRequest.RequestType.text.length){
                    for(let i = 0; i < maintenanceRequest.RequestType.text.length; i++ ){
                        await MaintenanceObj.sendSms(maintenanceRequest.RequestType.text[i],  maintenanceRequest, data.domain, company);
                    }
                }
                // Send Confirmation to tenant
                let tenantConfirmationEmail = MaintenanceObj.makeTenantConfirmationEmail(maintenanceRequest, confirmationEmailHtml, activeMessage.Contact, company);
                await  Mail.sendBasicEmail(connection, tenantConfirmationEmail);


            } else if(activeMessage.Contact.role == 'admin') {

                if(maintenanceRequest.Thread.length == 1){
                    // admin filled out this request, let the tenants know.

                    for(let i = 0; i < maintenanceRequest.Lease.Tenants.length; i++ ){
                        let email = MaintenanceObj.makeTenantMaintenanceEmail(maintenanceRequest, maintenanceEmailHtml, maintenanceRequest.Lease.Tenants[i].Contact, company);
                        await Mail.sendMaintenanceRequest(connection, email);
                    }
                    // send confirmation to admin

                    if(maintenanceRequest.RequestType.email && maintenanceRequest.RequestType.email.length){
                        for(let i = 0; i < maintenanceRequest.RequestType.email.length; i++ ){
                            let email = MaintenanceObj.makeAdminMaintenanceEmail(maintenanceRequest.RequestType.email[i], maintenanceRequest, maintenanceEmailHtml, company);
                            await Mail.sendMaintenanceRequest(connection, email);
                        }
                    }

                } else {

                    if(activeMessage.SendTo.email && activeMessage.SendTo.email.length){
                        for(let i = 0; i < activeMessage.SendTo.email.length; i++ ){
                            let email = MaintenanceObj.makeTenantMaintenanceEmail(maintenanceRequest, maintenanceEmailHtml, activeMessage.SendTo.email[i], company);
                            await Mail.sendMaintenanceRequest(connection, email);
                        }
                    }

                    if(activeMessage.SendTo.text && activeMessage.SendTo.text.length){
                        for(let i = 0; i < activeMessage.SendTo.text.length; i++ ){
                            if(!activeMessage.SendTo.text[i].Phones.length || !activeMessage.SendTo.text[i].Phones[0].phone ) continue;
                            await MaintenanceObj.sendSMS(activeMessage.SendTo.text[i].Phone[0].phone, maintenanceRequest, data.domain, company);
                        }
                    }
                }

            } else {
                throw "Role not found";
            }

        } catch(err) {
            // Notify devs.. 
            console.log(err);
            console.log(err.stack);
        }

        connection.release();
        return true;

    },
    sendSMS: function(phone, maintenanceRequest, domain, company){
        var msg = '';

        var status = (maintenanceRequest.status == 'open')? maintenanceRequest.severity : maintenanceRequest.status;
        msg += '[' + status + "]\n";
        msg += '' + maintenanceRequest.Lease.Unit.Address.address + ' ' + maintenanceRequest.Lease.Unit.number + ' ' +  maintenanceRequest.Lease.Unit.Address.city + ' ' +  maintenanceRequest.Lease.Unit.Address.state + ' ' +  maintenanceRequest.Lease.Unit.Address.zip + "\n\n";

        msg += maintenanceRequest.Thread[0].content;

        msg += "\n\nTo respond to this message visit: " + settings.config.protocol + "://" + domain + "." + settings.config.domain + '/maintenance/' + maintenanceRequest.id;


        return new Promise(function (resolve, reject) {
            if(!company.Settings.twilioPhone) return resolve();

            if(typeof phone == 'undefined') return resolve();
            twilioClient.sendMessage({
                to:  settings.is_prod ? '+1' + phone : '+13234198574', // Any number Twilio can deliver to
                from: company.Settings.twilioPhone, // A number you bought from Twilio and can use for outbound communication
                body: msg
            }, function(err, responseData) { //this function is executed when a response is received from Twilio
                
                if(err) return reject();
                // http://www.twilio.com/docs/api/rest/sending-sms#example-1
                console.log(responseData.from); // outputs "+14506667788"
                console.log(responseData.body); // outputs "word to your mother."
                return resolve();

            });
        });
    },
    makeAdminMaintenanceEmail:function(emailAddress, maintenanceRequest, maintenanceEmailHtml, company){
        var _this = this;
        var preview = '';

        var status = (maintenanceRequest.status == 'open')? maintenanceRequest.severity : maintenanceRequest.status;
        preview += '[' + status + '] ';
        preview += 'Address: ' + maintenanceRequest.Lease.Unit.Address.address + ' ' + maintenanceRequest.Lease.Unit.number + ' ' +  maintenanceRequest.Lease.Unit.Address.city + ' ' +  maintenanceRequest.Lease.Unit.Address.state + ' ' +  maintenanceRequest.Lease.Unit.Address.zip ;
        preview += ' Message: ' + maintenanceRequest.Thread[0].content;

        var email = {
            email: emailAddress,
            to: company.name + " Administrator",
            subject: 'Maintenance Request #' + Hashes.encode(maintenanceRequest.id),
            from:    company.name + " Maintenance Requests",
            template: {
                name: 'maintenance-request',
                data: [
                    {
                        name: 'logo',
                        content: company.getLogoPath()
                    },
                    {
                        name: 'headline',
                        content: 'Reply to a maintenance request'
                    },
                    {
                        name: 'preview',
                        content: preview
                    },
                    {
                        name: 'content',
                        content: maintenanceEmailHtml
                    }]
            }
        };
        return email;
    },
    makeTenantConfirmationEmail: function(maintenanceRequest, content, tenant, company){
        var _this = this;

        var email = {
            email:  tenant.email,
            to:     tenant.first + ' ' + tenant.last,
            from:    company.name + " Maintenance Requests",
            subject: 'Maintenance Request #' + Hashes.encode(maintenanceRequest.id),
            template: {
                name: 'basic-email',
                data: [
                    {
                        name: 'logo',
                        content: company.getLogoPath()
                    },
                    {
                        name: 'headline',
                        content: 'Maintenance request update'
                    },
                    {
                        name: 'content',
                        content: "This is a confirmation that we have received your maintenance request. Someone will be in contact with you as soon as possible."
                    }]
            },
            company_id: company.id,
            contact_id: tenant.id
        };

        return email;


    },
    makeTenantMaintenanceEmail: function(maintenanceRequest, content, tenant, company) {
        var email = {
            email: tenant.email,
            to: tenant.first + ' ' + tenant.last,
            subject: 'Maintenance Request #' + Hashes.encode(maintenanceRequest.id),
            from: company.name + " Maintenance Requests",
            template: {
                name: 'maintenance-request',
                data: [
                    {
                        name: 'logo',
                        content: company.getLogoPath()
                    },
                    {
                        name: 'headline',
                        content: 'Maintenance Request #' + Hashes.encode(maintenanceRequest.id)
                    },
                    {
                        name: 'preview',
                        content: maintenanceRequest.Thread[0].content
                    },
                    {
                        name: 'content',
                        content: content
                    }]
            },
            admin_id: maintenanceRequest.Thread[0].contact_id,
            company_id: company.id,
            contact_id: tenant.id
        };
        return email;
    }
};

module.exports = {
    send: function(data, pool){
        return MaintenanceObj.send(data, pool);
    }


};