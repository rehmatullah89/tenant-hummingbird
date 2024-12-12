var PropertyProgressRoutines = {
  
    async propertyProgressRoutine(data) { 
        
        try {

            var connection = await db.getConnectionByType('write', 1);

            let contact = await models.Contact.findAdminByEmail(connection,data.email,data.company_id);

            let company = new Company({id: data.company_id});
            await company.find(connection);

            if(!(contact && contact.id)){
                e.th(400, "No records for this email");
            }

            let contact_id =  contact.id;

            let owner_contact = new OnboardingContact({ id: contact_id });
	    	await owner_contact.find(connection);

            let cocoonUrl = data.subdomain + '.' + settings.config.domain;

            let template = owner_contact.selectTemplate({email_type:'owner_property_progress' ,cocoonUrl, ...data })

		    let gds_owner_id = company.gds_owner_id;
		    let property_id = null;
            
            let subject = data.progress_percentage > 50 ? `Onboarding progress for Property - ${data.property_name} on Cocoon`
            :`Onboarding progress for Company - ${data.company_name} on Cocoon`;

            if(data.afterDueDate){
                subject = data.progress_percentage > 50 ? `Due date passed to complete onboarding for Property - ${data.property_name} on Cocoon`
            :`Due date passed to complete onboarding for Company - ${data.company_name} on Cocoon`;
            }

            await owner_contact.sendEmail(connection, subject, template, null, company, null , null, gds_owner_id, property_id, true);

        } catch (err) {
            console.log('Property Progress Routine error ', err);
            console.log(err.stack);
        }

        await utils.closeConnection(pool, connection);    
    },
};

module.exports = {
    propertyProgressRoutine: async (data) => {
        return await PropertyProgressRoutines.propertyProgressRoutine(data);
    },
};

var pool    = require(__dirname + "/../modules/db.js");
var utils   = require(__dirname + "/../modules/utils.js");
var db      = require(__dirname + '/../modules/db_handler.js');
var models  = require(__dirname + '/../models/index.js');
var settings = require(__dirname + '/../config/settings.js');
var OnboardingContact    = require(__dirname + "/../classes/onboarding/onboarding_contact.js");
var Company = require(__dirname + '/../classes/company.js');