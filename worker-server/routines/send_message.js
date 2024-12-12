var moment      = require('moment');
var jade = require('jade');
var fs = require('fs');
var settings = require(__dirname + '/../config/settings.js');

var Hash = require(__dirname + '/../modules/hashes.js');
var Hashes = Hash.init();

var Upload = {};
setTimeout(() => Upload = require(__dirname + '/../classes/upload.js'), 10);
var Company   = require(__dirname + '/../classes/company.js');
var DeliveryMethod = require(__dirname + '/../classes/delivery_method.js');
var Sms = require(__dirname + '/../classes/sms.js');
var Lead   = require(__dirname + '/../classes/lead.js');
var Lease   = require(__dirname + '/../classes/lease.js');
var User   = require(__dirname + '/../classes/user.js');
var Contact   = require(__dirname + '/../classes/contact.js');
var Activity   = require(__dirname + '/../classes/activity.js');

var Interaction = require(__dirname + '/../classes/interaction.js');
/*
var User   = require(__dirname + '/../models/user.js');
var Tenant   = require(__dirname + '/../models/tenant.js');
var Admin   = require(__dirname + '/../models/admin.js');
var Message   = require(__dirname + '/../models/messages.js');
var Settings   = require(__dirname + '/../models/settings.js');
*/
var models   = require(__dirname + '/../models/index.js');
var Promise = require('bluebird');
var Mail = require(__dirname + '/../modules/mail.js');
var validator = require('validator');
var Notification      = require(__dirname + '/../classes/notification.js');
var Delinquency 	= require(__dirname + '/../classes/delinquency.js');
var twilioClient = require('twilio')(settings.twilio.accountSid, settings.twilio.authToken);
var db = require(__dirname + '/../modules/db_handler.js');

var { getGDSPropertyMappingId } = require('../modules/messagebus_subscriptions');

var rp = require('request-promise');

var pool;

var MessageObj = {
	
    send_message: function(data, connection){
        var _this = this;

        var company = {};
        var contact = {};
	    var activity = {};

		company = new Company({id: data.company_id});
		company.find(connection)
		.then(function(companyRes) {

	        contact = new Contact({id: data.contact_id});
	        return contact.find(connection, company.id);

        }).then(function(userRes){
			if(!userRes) throw "User not found";


	        if(!data.send_email) return;

	        var email =  {
		        email: contact.email,
				owner_id: company.gds_owner_id,
		        to: contact.first + ' ' + contact.last,
		        subject: "New Message received from " + company.name,
		        from: company.name + ' Message Center',
		        template: {
			        name: 'basic-email',
			        data: [
				        {
					        name: 'logo',
					        content: company.getLogoPath()
				        },
				        {
					        name: 'headline',
					        content: data.subject
				        },{
					        name: 'content',
					        content: data.message
				        }
			        ]
		        },
		        company_id: company.id,
		        contact_id: contact.id,
		        admin_id: data.admin_id
	        };

	        if(data.attachments){
	        	email.attachments = data.attachments;
			}

	        return Mail.sendBasicEmail(connection, email);

        }).then((r) => {
	        if(!data.sms || !company.Settings.twilioPhone ) return;

	        return Promise.mapSeries(data.sms, sms_id => {
	            return models.Contact.findPhoneById(connection, sms_id).then(phone => {
	                return _this.sendSms(phone.phone, company.Settings.twilioPhone, data.message, company);
	            }).then(async () => {

					let interaction = new Interaction();
					if(contact.Leases.length === 0) contact.getLeases(connection);
					var p_id = contact.Leases.length > 0? contact.Leases[0].Unit.property_id: lead.property_id;

					
					let space = await interaction.findSpaceByLeaseID(connection, data.lease_id);
					return interaction.create(connection, p_id, space, contact.id, data.admin_id, moment().format('YYYY-MM-DD HH:mm:ss'), data.message, 'sms', null, null, null, null, null, null, null);


				})
	        })

        }).then(() =>{

	        setTimeout(() => {
				var n = new Notification({company_id: company.id});
		        n.ping('message_sent_to_contact');
	        }, 1000);

			return true;

        }).catch(function(err){
            console.log(err);
	        try{
                console.log(err.stack);
	        } catch(err) {
		        console.log(err);

	        }
            return false;
        });
    },

    sendSms: function(phone, twilioPhone, message, company){

        return new Promise(function (resolve, reject) {
	        if(!company.Settings.twilioPhone) return reject();

	        if(typeof phone == 'undefined') return reject();

            twilioClient.sendMessage({
                to: settings.is_prod ? '+1' + phone : '+13234198574', // Any number Twilio can deliver to
                from: twilioPhone, // A number you bought from Twilio and can use for outbound communication
                body: message
            }, function(err, responseData) { //this function is executed when a response is received from Twilio
                console.log(err);
                console.log("responseData", responseData);
                if(err) return reject();

                if (!err) { // "err" is an error received during the request, if any
                    // "responseData" is a JavaScript object containing data received from Twilio.
                    // A sample response from sending an SMS message is here (click "JSON" to see how the data appears in JavaScript):
                    // http://www.twilio.com/docs/api/rest/sending-sms#example-1
                    console.log(responseData.from); // outputs "+14506667788"
                    console.log(responseData.body); // outputs "word to your mother."
                    return resolve();
                }
            });
        });
	},
	
	async sendSMS(to_phone, company, message, from_phone, owner_id, property_id, media_url, int_created){

		var uri = `${settings.get_communication_app_url()}/messages/`;
		let int_create_status = false;
		if (int_created && int_created === true) {
			int_create_status = true;
		}

		 var payload = {
			interaction_created:int_create_status,
			 messages: [{
				 "sms":
				 {
					 to:  settings.is_prod || settings.is_uat || settings.is_staging ? '+1' + to_phone : '+1' + process.env.DEBUG_SMS_NUMBER || '3234198574',
					 ...(from_phone && ({from: '+1' + from_phone})),
					 body: message
				 }
			 }],
			 ...(owner_id && { owner_id: owner_id }),
			 ...(property_id && {facility_id: property_id})
		 }
		 let response = await rp({
			 method: 'POST',
			 uri,
			 body: payload,
			 headers: {
				 'Content-Type': 'application/vnd+gds.sms',
				 'X-storageapi-key': process.env.GDS_API_KEY,
				 'X-storageapi-date': Date.now()
			 },
			 gzip: true,
			 json: true
		 });
 
		 return response;
 
	},

	external_message_notification: function(data, connection){

		var company = {};
		var sendTo = [];
		var lead = {};
		var user = {};
		var company_id = '';

		company = new Company({subdomain: data.domain});
		return company.findBySubdomain(connection)
		.then(function(companyRes) {
			lead = new Lead({id: data.lead_id});

			return lead.find(connection, company.id);


		}).then(function(leadRes) {

			//** Temp disable **/
			return true;
			var notification = {};
			var n = {
				company_id: company.id,
				lease_id: null,
				type_id: 5, // event type,
				reference_id:  lead.id,
				created: moment().format('YYYY-MM-DD HH:mm:ss'),
				message: "You have a new lead!",
				read: 0
			}

			notification = new Notification(n);

			return notification.createMessage(connection).then(function () {
				return notification.save(connection);
			}).then(function () {
				notification.ping();
			});

		}).then(function(messageRes) {

			var content = '<table align="left" width="100%" border="0" cellspacing="0">';
			content += "<tr><td>From:</td><td>" + lead.Contact.first + " " + lead.Contact.last + "</td></tr>" +
				"<tr><td>Email:</td><td>" + lead.Contact.email + "</td></tr>" +
				// "<tr><td>Phone:</td><td>" + message.phone + "</td></tr>" +
				"<tr><td>Source:</td><td>" + lead.source + "</td></tr>" +
				"<tr><td>Message:</td><td>" + lead.content + "</td></tr>" +
				"<tr><td>&nbsp;</td><td>&nbsp;</td></tr>" +
				"<tr><td>Additional Details:</td><td>&nbsp;</td></tr>";

			if(lead.property_id){
				content += "<tr><td>Property:</td><td>" + lead.Property.name;

				if(lead.Property.Address){
					content +=  "<br />" + lead.Property.Address.address;
				}
				content +=  "</td></tr>";

			}

			if(lead.unit_id){
				content += "<tr><td>Unit:</td><td>#" + lead.Unit.number +  "</td></tr>";
			}

			if(lead.category_id){
				content += "<tr><td>Category:</td><td>" + lead.Category.name +  "</td></tr>";
			}

			for (var extra in lead.extras) {
				if (lead.extras.hasOwnProperty(extra)) {
					content += "<tr><td>" + extra + ":</td><td>" + lead.extras[extra] +  "</td></tr>";
				}
			}

			content += "</table>";

			return Promise.mapSeries(company.Settings.notificationEmails, n => {


				var link = settings.getBaseUrl(company.subdomain ) + '/messages/' + Hashes.encode(lead.id);
				var email = {
					to: company.name + " Administrator",
					email: n,
					subject: 'New Message from ' + lead.source,
					from: company.name + " Messages",
					template: {
						name: 'basic-email',
						data: [
							{
								name: 'logo',
								content: company.getLogoPath()
							},
							{
								name: 'headline',
								content: 'You have a new message!'
							},
							{
								name: 'content',
								content: 'You have received a new message.<br /><br />' + content + '<br /><br /><br /><a style="color: #0288d1;"  href="' + link + '">Click here to view it.<a/>'
							}
						]
					},
					company_id: company.id,
					contact_id: lead.Contact.id
				};

				return Mail.sendBasicEmail(connection, email);

			});

		}).then(function(messageRes) {

			// Send confirmation email

			var email = {
				email:  lead.Contact.email,
				to:     lead.Contact.first + " " + lead.Contact.last,
				from:    company.name + " Message Center",
				subject: 'We have received your message',
				template: {
					name: 'basic-email',
					data: [
						{
							name: 'logo',
							content: company.getLogoPath()
						},
						{
							name: 'headline',
							content: 'Thanks for getting in touch'
						},
						{
							name: 'content',
							content: "This is a confirmation that we have received your message. Someone will be in contact with you as soon as possible."
						}]
				},
				company_id: company.id,
				contact_id: lead.Contact.id
			};
			
			return Mail.sendBasicEmail(connection, email);


		}).catch(function(err){
			console.log(err);
			console.log(err.stack);
			return false;
		});

	},

	email_to_users: async (data, connection) => {

    	try{
			let company = new Company({id: data.company_id});
			await company.find(connection);

			let contact = new Contact({id: data.contact_id});
			await contact.find(connection, company.id);

			if(contact.email){
				let lead = new Lead({ contact_id: data.contact_id });

				try{
					await lead.find(connection, company.id);
				} catch(err) {
					// no lead found
				}
				if(contact.Leases.length === 0) await contact.getLeases(connection);
				var p_id = contact.Leases.length > 0? contact.Leases[0].Unit.property_id: lead.property_id;
				var mapped_property_id = await getGDSPropertyMappingId(connection, p_id);
				let owner_id = company.gds_owner_id;
				let property_id = mapped_property_id;

				if (contact.Leases.length) {
					let lease = new Lease({id: data.lease_id});
					await lease.find(connection);

					let delinquency = new Delinquency()
					data.message = await delinquency.mergeTokens(connection, data.message, lease, company.id, p_id);
				}
				
				let email = {
					email: contact.email,
					to: contact.first + ' ' + contact.last,
					subject: data.subject, //"New Message received from " + company.name,
					from: company.name + ' Message Center',
					template: {
						name: 'basic-email',
						data: [
							{
								name: 'logo',
								content: company.getLogoPath()
							},
							{
								name: 'headline',
								content: data.subject
							},{
								name: 'content',
								content: data.message
							}
						]
					},
					company_id: company.id,
					contact_id: contact.id,
					admin_id: data.admin_id,
					...(owner_id && { owner_id: owner_id }),
					...(property_id && {facility_id: property_id}),
				};
				if(data.attachments){
					email.attachments = data.attachments;
				}

				let upload_id = data.upload ? data.upload.id : null
				let response = await Mail.sendBasicEmail(connection, email, data.message,data.delivery_method, upload_id);
				// When I sent to GDS, I need to save interaction
				
			}

		} catch(err) {
    		// Send Email error to the front end.
    		console.log(err);

		}

		return true;

	},

	async sms_to_users(data, connection){
		try{
			let company = new Company({id: data.company_id});
			await company.find(connection);

			let contact = new Contact({id: data.contact_id});
			await contact.find(connection, company.id);

			if(data.phone) {
			
				let lead = new Lead({ contact_id: data.contact_id });

				try{
					await lead.find(connection, company.id);
				} catch(err) {
					// no lead found
				}

				if(contact.Leases.length === 0) await contact.getLeases(connection);
				var p_id = contact.Leases.length > 0? contact.Leases[0].Unit.property_id: lead.property_id;
				var mapped_property_id = await getGDSPropertyMappingId(connection, p_id);
				let owner_id = company.gds_owner_id;
				let property_id = mapped_property_id;

				if (contact.Leases.length) {
					let lease = new Lease({id: data.lease_id});
					await lease.find(connection);

					let delinquency = new Delinquency()
					data.message = await delinquency.mergeTokens(connection, data.message, lease, company.id, p_id);
				}

				await this.sendSMS(data.phone, company, data.message, null, owner_id, property_id, null, true)

				let deliveryMethod = new DeliveryMethod();
            	await deliveryMethod.findByGdsKey(connection, 'standard_sms');

				let interaction = new Interaction();
				let pinned = 0;
            	let read = 1;
				let space = await interaction.findSpaceByLeaseID(connection, data.lease_id);
				return interaction.create(connection, p_id, space, contact.id, data.admin_id, data.message, deliveryMethod.id, pinned, null, read, null, null, null, null, null, null, null);

				let sms = new Sms({
					interaction_id: interaction.id,
					phone: data.phone,
					message: data.message
				});

				await sms.save(connection);

			}
		} catch(err) {
			// Send Email error to the front end.
			console.log(err);
		}
		return true;

	}


};

module.exports = {
    send_message: function(data, pool){
        return MessageObj.send_message(data, pool)
    },

    external_message_notification: function(data, pool){
        return MessageObj.external_message_notification(data, pool)
    },
	email_to_users: function(data, pool){
        return MessageObj.email_to_users(data, pool)
    },
	sms_to_users: function(data, pool){
        return MessageObj.sms_to_users(data, pool)
    },
};