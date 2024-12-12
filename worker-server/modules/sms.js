var settings    = require(__dirname + '/../config/settings.js');
var rp = require('request-promise');
var moment      = require('moment');
const Utils = require(__dirname + '/../modules/utils');
const { v4: uuidv4 } = require('uuid');
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


module.exports = {
    async sendSMS(to_phone, message, from_phone, owner_id, property_id, media_url, int_created){
       
        let error = null;

        let sms_result = null;
        var sms_response = {}
        let int_create_status = false;
		if (int_created && int_created === true) {
			int_create_status = true;
		}

        try { 
            var uri = `${settings.get_communication_app_url()}/messages/`;
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
            let sms_result = await rp({
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
            console.log("sms_result", sms_result)
            var sms_response = sms_result.applicationData[process.env.COMMUNICATION_APP_KEY][0][0];

        } catch(err){
            
            if(Array.isArray(err.error.applicationData[process.env.COMMUNICATION_APP_KEY][0])){
                error = err.error.applicationData[process.env.COMMUNICATION_APP_KEY][0][0];
            } else {
                error = err.error.applicationData[process.env.COMMUNICATION_APP_KEY][0];
            }
            
        }

        log(payload, sms_response, error, 'SendSMS');

        return sms_response.error || sms_response;


    },

    sendSmsForPendingTemplate(property_name, document_link) {
        return `Thank you for choosing ${property_name} for your storage needs. Before we can complete your move-in, we have a few documents for you to sign. You can find those documents here: ${document_link}`
    }
}
