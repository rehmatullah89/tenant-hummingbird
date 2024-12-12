var moment      = require('moment');
var Company      = require(__dirname + '/../classes/company.js');
var Promise = require('bluebird');
var Mail = require(__dirname + '/../modules/mail.js');
const Socket = require(__dirname + '/../classes/sockets.js');


var SendAccountingExportRoutine = {

	async sendReportToRecipients(data) {

		try {

			let exportNow = data.socket;
			let file_name = `${data.filename}.${data.previous.document.extension}`;

            if(exportNow) {
                let socket = new Socket({
                    company_id: data.company_id,
                    contact_id: data.contact_id,
                });
          
                await socket.createEvent("pdf_generated", {
                    data: data.previous.document.file,
                    filename: file_name,
                    id: exportNow.id,
                    type: exportNow.type,
                    content_type: data.previous.document.content_type,
                    success: true
                });
            }

			if(!data.previous.document) return;
			
			let attachment = Buffer.from(data.previous.document.file.data).toString("base64");
			
			if(!data.send_to) return;
			let recipient_list = JSON.parse(data.send_to);

			return Promise.mapSeries(recipient_list, t => {
				var content = '<h5>Find report in attachment</h5>'
				var email = {
					owner_id: data.owner_id,
					email:  t.email,
					to:     `${t.first || ''} ${t.last || ''}`,
					subject: `Report Generated for ${ data.previous.data_range_string}`,
					from: data.previous.company.name,
					template: {
						name: 'basic-email',
						data: [
							{
								name: 'headline',
								content: 'Report Generated'
							},
							{
								name: 'content',
								content: content
							}]
					},
					company_id:  data.company_id,
					attachments: [
						{
							content_type: data.previous.document.content_type,
                            name: file_name,
							content: attachment
						}
					]
				};
				return Mail.sendBasicEmail(null, email, content);
			});


		} catch(err){
			console.log('Error in sendReportToRecipients');
			console.log("---ERROR----");
			console.log(err);
		}
	}
}


module.exports = SendAccountingExportRoutine;
