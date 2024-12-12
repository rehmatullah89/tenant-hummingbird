var settings    = require(__dirname + '/../config/settings.js');
var rp = require('request-promise');
var moment      = require('moment');


module.exports = {

    async sendSMS(to_phone, message, from_phone, owner_id, property_id){
       // if(!company.Settings.twilioPhone || typeof to_phone == 'undefined') return Promise.reject();
        var uri = `${settings.get_communication_app_url()}/messages/`;
        var payload = {
            interaction_created:true,
            messages: [{
                "sms":
                {
                    // According to new international sms functional we also need to add country code with phone# like +1,+92
                    // and in our application we are getting phone with country code so here we are adding just +.
                    to:  settings.is_prod || settings.is_uat || settings.is_staging ? '+' + to_phone : '+1' + process.env.DEBUG_SMS_NUMBER || '3234198574',
                    ...(from_phone && ({from: '+1' + from_phone})),
                    body: message,
                    send_in_day_time: false
                }
            }],
            ...(owner_id && { owner_id: owner_id }),
            ...(property_id && {facility_id: property_id})
        }
        try {
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
        } catch (error) {
            return error
        }


    },

    signedLeaseTemaplate(tenantName, unitNumber, propertyName, propertyAddress, propertyPhoneNumber) {
        return `Hey ${tenantName}, 
        
    Thank you for choosing ${propertyName} for your storage needs.
    
    We're pleased to inform you that we've received your signed documents for ${unitNumber}, and it's ready for your move-in. At your convenience,
        
    Should you have any questions, don't hesitate to contact us at ${propertyPhoneNumber}. We're thrilled to have you on board!`
    }
    
}
