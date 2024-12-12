var Contact = require(__dirname + '/../../classes/contact.js');

class OnboardingContact extends Contact {

    selectTemplate(reqBody){
        try{
            let type = reqBody.email_type;
            let template = ``;

            if(!type){
                e.th(409, "email_type is not specified");
            }

            if(type == 'ri_settings_complete'){
                template = this.templateRIOnSettingsComplete(reqBody.ri_name, reqBody.property_number, reqBody.property_name,reqBody.property_address,reqBody.owner_name,reqBody.golive_date,reqBody.cocoon_url,reqBody.admin_portal_url,reqBody.merge_status);
            }
            else if(type == 'ri_delinquency_confirmation'||type == 'ri_document_library_confirmation' || type == 'ri_lease_configuration_confirmation'){
                template = this.templateRIOnConfirmation(reqBody.ri_name ,reqBody.owner_name ,reqBody.company_name , reqBody.owner_email , reqBody.stage_name , reqBody.property_name ,reqBody.cocoon_url );
            }
            else{
                e.th(409, "enter a valid email_type");
            }
    
                return template;
        }catch(err){
            console.log(err);
            throw err;
        }
        }

        templateRIOnSettingsComplete(ri_name,property_number,property_name,property_address,owner_name,golive_date,cocoon_url,admin_portal_url,merge_status){
            let trial_text = (merge_status && merge_status == 'trial')? 'with Trial Upload of space and Tenant details ' : '';

            return `<html>
            <body>
                <table style="border: 1px solid lightgrey;">
                    <tr>
                        <td style="height: 715; width: 580; width: 580px; background-color: #fff; font-family: Graphik Web, sans-serif; font-size: 14px;">
                            <table> <tr> <td style="height: 7; width: 580; width: 580px; background-color: #23b3ba;"></td> </tr> </table>
                            <table style="height: 110; width: 580; line-height: 1.3; font-size: 13px; display: table;">
                                <tr>
                                <td style="width: 50; width: 50px;"></td>
                                    <td style="width: 400; width: 400px;">
                                        <img width="240" height="80"
                                            src='https://${cocoon_url.split('/')[0]}/img/Hummingbird_Logo_Horizontal_Black.png'
                                            alt="logo">
                                    </td>
                                    <td style="width: 220; width: 220px;">
                                        <div><b>Tenant Inc.</b></div>
                                        <div>49260 Campus Dr. Suite B</div>
                                        <div>Newport Beach, CA 92660</div>
                                        <div>(949) 894-4500</div>
                                    </td>
                                </tr>
                            </table>
                            <table> <tr> <td style="height: 1; width: 580; height: 1px; width: 580px; background-color: lightgrey;"></td> </tr> </table>
                            <table>
                                <tr> <td style="height: 20;"></td> </tr>
                                <tr>
                                    <td style="height: 500; padding-left: 30; padding-left: 30px; margin: 40; line-height: 2;">
                                        <div style="margin-bottom: 30px;">
                                            <h2><b>All settings have been completed! </b></h2>
                                        </div>
                                        <div style="margin-bottom: 25px; margin-bottom: 25;"> Hi ${ri_name},</div>
                                        <div style="margin-bottom: 25px; margin-bottom: 25;">
                                            <div>
                                            ${property_number} ${property_name} at ${property_address} owned by ${owner_name} has completed the Cocoon onboarding process ${trial_text}and is awaiting your review.
                                            </div>
                                        </div>
                                        <div style="margin-bottom: 25px; margin-bottom: 25;">
                                   The Go Live date for this property is ${golive_date}.
                                        </div>
                                                        <div style="margin-bottom: 25px; margin-bottom: 25;">
                                 Review the information at <a href="https://${cocoon_url}" target="_blank"
                                 style="color: rgb(0, 132, 142); text-decoration: none; width: 135"> ${cocoon_url}</a>, then activate the "Merge to Hummingbird" button from Admin Portal <a href="https://${admin_portal_url}/login" target="_blank"
                                 style="color: rgb(0, 132, 142); text-decoration: none; width: 135"> ${admin_portal_url}/login</a>
                                        </div>
                                        <div style="margin-bottom: 30px;  margin-bottom: 30;">
                                            <div>Thanks,</div>
                                            <div>Hummingbird Team</div>
                                        </div>
                                        <table style="margin-bottom: 30;">
                                            <tr>
                                                <td style="width: 150; width: 150px;"></td>
                                                <td style="width: 160; width: 160px; font-size: 14px;">
                                                    <span
                                                        style="height: 25; width: 135; width: 135px; background-color: #00848E; border: 0; border-radius: 4px; padding:5 10 5 10; padding:5px 10px 5px 10px;">
                                                        <a href="https://${admin_portal_url}/login" target="_blank"
                                                            style="color: white; text-decoration: none; width: 135">
                                                            Login to Admin Portal
                                                        </a>
                                                    </span>
                                                </td>
                                                <td style="width: 190; width: 190px;"></td>
                                            </tr>
                                        </table>
                                    </td>
                                </tr>
                            </table>
                            <table style="width: 580; height: 65; width: 580px; height: 65px; background-color: black; color: white;">
                                <td style="width: 50; width: 50px;"></td>
                                <td>Questions or Concerns? Email support@tenantinc.com</td>
                            </table>
                            <table style="height: 30; padding-top: 10px; color: #438388; font-size: 13px;">
                                <td style="width: 155;  width: 155px;"></td>
                                <td>@2021 Tenant Inc. All Rights Reserved.</td>
                            </table>
                        </td>
                    </tr>
                </table>
            </body>
            </html>`
        }
        templateRIOnConfirmation(ri_name ,owner_name ,company_name , owner_email , stage_name , property_name ,cocoon_url ){
            return `<html>
            <body>
                <table style="border: 1px solid lightgrey;">
                    <tr>
                        <td style="height: 715; width: 580; width: 580px; background-color: #fff; font-family: Graphik Web, sans-serif; font-size: 14px;">
                            <table> <tr> <td style="height: 7; width: 580; width: 580px; background-color: #23b3ba;"></td> </tr> </table>
                            <table style="height: 110; width: 580; line-height: 1.3; font-size: 13px; display: table;">
                                <tr>
                                    <td style="width: 50; width: 50px;"></td>
                                        <td style="width: 400; width: 400px;">
                                        <img width="240" height="80"
                                        src='https://${cocoon_url.split('/')[0]}/img/Hummingbird_Logo_Horizontal_Black.png'
                                        alt="logo">
                                    </td>
                                    <td style="width: 220; width: 220px;">
                                        <div><b>Tenant Inc.</b></div>
                                        <div>49260 Campus Dr. Suite B</div>
                                        <div>Newport Beach, CA 92660</div>
                                        <div>(949) 894-4500</div>
                                    </td>
                                </tr>
                            </table>
                            <table> <tr> <td style="height: 1; width: 580; height: 1px; width: 580px; background-color: lightgrey;"></td> </tr> </table>
                            <table>
                                <tr> <td style="height: 20;"></td> </tr>
                                <tr>
                                    <td style="height: 500; padding-left: 30; padding-left: 30px; margin: 40; line-height: 2;">
                                        <div style="margin-bottom: 25px; margin-bottom: 25;"> Hi ${ri_name},</div>
                                        <div style="margin-bottom: 25px; margin-bottom: 25;">
                                            <div>
                                            This is to notify that the ${owner_name} of company ${company_name} (${owner_email}) has completed the ${stage_name} for ${property_name}. You can now review these settings on <a href="https://${cocoon_url}" target="_blank"
                                            style="color: rgb(0, 132, 142); text-decoration: none; width: 135"> ${cocoon_url}</a>. 
                                            </div>
                                        </div>
                                        <div style="margin-bottom: 30px;  margin-bottom: 30;">
                                            <div>Thank You,</div>
                                            <div>Tenant Inc Onboarding</div>
                                        </div>
                                        
                                    </td>
                                </tr>
                            </table>
                            <table style="width: 580; height: 65; width: 580px; height: 65px; background-color: black; color: white;">
                                <td style="width: 50; width: 50px;"></td>
                                <td>Questions or Concerns? Email support@tenantinc.com</td>
                            </table>
                            <table style="height: 30; padding-top: 10px; color: #438388; font-size: 13px;">
                                <td style="width: 155;  width: 155px;"></td>
                                <td>@2021 Tenant Inc. All Rights Reserved.</td>
                            </table>
                        </td>
                    </tr>
                </table>
            </body>
            </html>`
        }
        static async getAllContacts(connection , contact_email){

            return await models.Onboarding.getAllContacts(connection, contact_email);
            
        }

}

module.exports = OnboardingContact;

var e  = require(__dirname + '/../../modules/error_handler.js');
var models  = require(__dirname + '/../../models');
