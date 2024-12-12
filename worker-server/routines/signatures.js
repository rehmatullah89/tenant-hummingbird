var moment      = require('moment');
var jade = require('jade');
var fs = require('fs');

var Settings = require(__dirname + '/../config/settings.js');


var Hashes = require(__dirname + '/../modules/hashes.js').init();

var models      = require(__dirname + '/../models');

var Signer      = require(__dirname + '/../classes/signer.js');
var Upload      = require(__dirname + '/../classes/upload.js');
var Company      = require(__dirname + '/../classes/company.js');
var Contact      = require(__dirname + '/../classes/contact.js');

var validator = require('validator');

var Promise = require('bluebird');
var Mail = require(__dirname + '/../modules/mail.js');
var SMS = require(__dirname + '/../modules/sms.js');

var Signatures = {
	connection: {},
	send: async(data, pool) => {


		let encrypted =  data.encrypted;

		const connection = await 	pool.getConnectionAsync()
		try {
			let company = new Company({ id: data.company_id });
			await company.find(connection);

			let upload = new Upload({
				id: data.upload_id
			});
			await upload.find(connection);

			let signer = await upload.findSigner(connection, company.id, data.signer_id);

			signer.Contact = new Contact({id: signer.contact_id});
			await signer.Contact.find(connection, company.id);

			if(signer.upload_id !== upload.id) e.th(403, "Access to this document is denied.");

			let email = data.email_address || signer.email;
			if(email){
				let values = {
					email: data.email_address || signer.email,
					to: signer.name,
					owner_id: company.gds_owner_id,
					from: company.name + ' Documents',
					subject: 'A document needs your signature.',
					template: {
						name: 'basic-email',
						data: [
							{
								name: 'logo',
								content: company.getLogoPath()
							},
							{
								name: 'headline',
								content: 'Sign Document'
							},
							{
								name: 'content',
								content: '<p>"' + upload.name + '" requires your signature.<br />' +
								"Please click the link below and follow the instructions to digitally sign the document.</p>" +
								'<br /><a style="color: #3dc6f2" href="' + process.env.WEB_PROTOCOL + '://' + company.subdomain + '.' + process.env.DOMAIN + '/sign-documents/' + encrypted + '">Click here to sign your document.</a><br />'
							}]
					},
					company_id: company.id,
					contact_id: signer.id
				};
				let email_result = await Mail.sendBasicEmail(connection, values);

			}

			let phone = data.sms_number;

			if(!phone && signer.Contact.Phones.length) {
				let contact_phone = signer.Contact.Phones.find(p => p.sms);
				if(contact_phone){
					phone = contact_phone.number;
				}
			}

			if(phone){
				let sms =  "A document called " + upload.name + " requires your signature. Please click the link below\r\n\r\n" +
					Settings.getBaseUrl(company.subdomain) + '/sign-documents/' + encrypted;
				let sms_result = await SMS.sendSms(phone, company, sms);
				console.log(sms_result);
			}


			await connection.release();
			return ;
		} catch(err) {
			console.log(err);
			console.log(err.stack);
			connection.release();
			return {
				status: false,
				msg: err
			};
		};

	}
}



module.exports = {
	send: function(data, pool){
		return Signatures.send(data, pool);
	}
};