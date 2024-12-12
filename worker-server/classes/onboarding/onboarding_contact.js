var Contact = require(__dirname + '/../../classes/contact.js');
class OnboardingContact extends Contact {

    async onboardingContactSave(connection) {
        try {

            if (!connection) e.th(500, "Connection not set");

            this.ssn = this.ssn ? String(this.ssn) : null;

            await this.validate();

            let save = {
                first: this.first,
                last: this.last,
                email: this.email,
            };

            let contactRes = await models.Contact.save(connection, save, this.id);

            if (!this.id) this.id = contactRes.insertId;

            this.Phones = this.Phones || [];

                let p = this.Phones[0];
                if (p.phone) {

                let phoneSave = {
                    contact_id: this.id,
                    type: p.type || 'primary',
                    phone: p.phone.toString().replace(/\D+/g, ''),
                    sms: p.sms || 0,
                    primary: p.primary || 0
                }
                await models.Contact.savePhone(connection, phoneSave, p.id)
            }

        } catch (err) {
            console.log(err)
            throw err
        }

    }

    selectTemplate(reqBody){
    try{
        let type = reqBody.email_type;
        let template = ``;
        if(!type){
            e.th(409, "email_type is not specified");
        }
        
        if(type == 'ri_instance_ready'){
            template = this.templateRIOnInstanceReady(reqBody.ri_name, reqBody.owner_name, reqBody.domain, reqBody.admin_portal_url);
        }
        else if(type == 'owner_launch_cocoon'){
            template = this.templateOwnerOnLaunchCocoon(reqBody.ri_name, reqBody.owner_name,reqBody.domain, reqBody.cocoon_url);
        }
        else if(type == 'ri_launch_cocoon'){
            template = this.templateRIOnLaunchCocoon(reqBody.ri_name, reqBody.domain, reqBody.cocoon_url);
        }
        else if(type == 'owner_begin_merge'){
            template = this.templateOwnerOnBeginMerge(reqBody.ri_name, reqBody.owner_name, reqBody.ri_email , reqBody.ri_phone , reqBody.cocoon_url,reqBody.property_name,reqBody.merge_status);
        }
        else if(type == 'owner_property_progress'){
            template = this.templateOwnerPropertyProgress(reqBody.owner_name,reqBody.cocoonUrl,reqBody.property_name,reqBody.progress_percentage,reqBody.due_date,reqBody.golive_date,reqBody.ri_name,reqBody.ri_email,reqBody.ri_phone,reqBody.afterDueDate,reqBody.company_name );
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

    templateRIOnInstanceReady(RIName, ownerName, domain, adminPortalUrl){
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
                                    src="https://${domain.split('/')[0]}/img/Hummingbird_Logo_Horizontal_Black.png"
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
                                        <h2><b>Company Instance Created </b></h2>
                                    </div>
                                    <div style="margin-bottom: 25px; margin-bottom: 25;"> Hi ${RIName},</div>
                                    <div style="margin-bottom: 25px; margin-bottom: 25;">
                                        <div>The environment for ${ownerName}'s Storage has been created and can be located at
                                        
                                            <a href="https://${domain}" style="color: #00848E; text-decoration: none;"
                                                target="_blank">
                                                ${domain}.
                                            </a>
                                        </div>
                                    </div>
                                    <div style="margin-bottom: 25px; margin-bottom: 25;">
                                        <a href="https://${adminPortalUrl}/login" style="color: #00848E; text-decoration: none;"
                                            target="_blank">Click here</a>
                                        to log in and create the property to allow to owner to begin the Cocoon.
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
                                                    <a href="https://${adminPortalUrl}/login" target="_blank"
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
        </html>`;
    }

    templateOwnerOnLaunchCocoon(RIName, ownerName, domain, cocoonUrl) {
        return `<html>
        <body>
            <table style="border: 1px solid lightgrey;">
                <tr>
                    <td style="height: 715; width: 580; width: 580px; background-color: #fff; font-family: Graphik Web, sans-serif; font-size: 14px;">
                        <table> <tr> <td style="height: 7; height: 7px; width: 580; width: 580px; background-color: #23b3ba;"></td> </tr> </table>
                        <table style="height: 110; width: 580; line-height: 1.3; font-size: 13px; display: table;">
                            <tr>
                                <td style="width: 50; width: 50px;"></td>
                                <td style="width: 400; width: 400px;">
                                    <img width="240" height="80"
                                    src="https://${cocoonUrl.split('/')[0]}/img/Hummingbird_Logo_Horizontal_Black.png"
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
                                    <div style="margin-bottom: 30px;"> <h2><b>Welcome to Cocoon!</b></h2> </div>
                                    <div style="margin-bottom: 25px;"> Hi ${ownerName},</div>
                                    <div style="margin-bottom: 25px;">
                                        <div style="margin-bottom: 25; margin-bottom: 25px;">
                                            Thank you for choosing Tenant Inc. to meet your technology needs. We created your instance of Hummingbird and it is ready for you to set it up according to your bussiness rules and practices. 
                                        </div>
                                        <div style="margin-bottom: 25; margin-bottom: 25px;">
                                            <a href="https://${cocoonUrl}/register" style="color: #00848E; text-decoration: none;" target="_blank"> Click here </a>
                                            to access the registration page. Enter your email address under the email address field and click "Register" to complete registration.
                                        </div>
                                        <div style="margin-bottom: 25; margin-bottom: 25px;">
                                            You will then receive a registration email with a link to set up your username and password. Once your credentials are set up, you will be able to set your configurations in Cocoon, our automated, online property set up tool.
                                        </div>
                                    </div>
                                    <div style="margin-bottom: 25; margin-bottom: 25px;">
                                        The URL for your environment is located at: 
                                            <a href="https://${domain}" style="color: #00848E; text-decoration: none;" target="_blank">${domain}
                                            </a>
                                    </div>
                                    <div style="margin-bottom: 30px;">
                                        <div>Thanks,</div>
                                        <div>${RIName}</div>
                                    </div>
                                    <table style="margin-bottom: 30;">
                                        <tr>
                                            <td style="width: 150; width: 150px;"></td>
                                            <td style="width: 135; width: 135px; font-size: 14px;">
                                                <span
                                                    style="height: 25; height: 25px; width: 135; width: 135px; background-color: #00848E; border: 0; border-radius: 4px; padding:5 10 5 10; padding:5px 10px 5px 10px;">
                                                    <a href="https://${cocoonUrl}/login" target="_blank"
                                                        style="color: white; text-decoration: none; width: 135; width: 135px;">
                                                        Login to Cocoon
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
                            <td style="width: 155; width: 155px;"></td>
                            <td>@2021 Tenant Inc. All Rights Reserved.</td>
                        </table>
                    </td>
                </tr>
            </table>
        </body>
    </html>`;
    }

    templateRIOnLaunchCocoon(RIName, domain, cocoonUrl) {
        return `<html>
        <body>
            <table style="border: 1px solid lightgrey;">
                <tr>
                    <td style="height: 715; width: 580; width: 580px; background-color: #fff; font-family: Graphik Web, sans-serif; font-size: 14px;">
                        <table> <tr> <td style="height: 7; height: 7px; width: 580; width: 580px; background-color: #23b3ba;"></td> </tr> </table>
                        <table style="height: 110; width: 580; line-height: 1.3; font-size: 13px; display: table;">
                            <tr>
                                <td style="width: 50; width: 50px;"></td>
                                <td style="width: 400; width: 400px;">
                                    <img width="240" height="80"
                                    src="https://${cocoonUrl.split('/')[0]}/img/Hummingbird_Logo_Horizontal_Black.png"
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
                                    <div style="margin-bottom: 30px;"> <h2><b>Welcome to Cocoon!</b></h2> </div>
                                    <div style="margin-bottom: 25px;"> Hi ${RIName},</div>
                                    <div style="margin-bottom: 25px;">
                                        <div style="margin-bottom: 25; margin-bottom: 25px;">
                                            <a href="https://${cocoonUrl}/register" style="color: #00848E; text-decoration: none;" target="_blank"> Click here </a>
                                            to access the registration page. Enter your email address under the email address field and click "Register" to complete registration.
                                        </div>
                                        <div style="margin-bottom: 25; margin-bottom: 25px;">
                                            You will then receive a registration email with a link to set up your username and password. Once your credentials are set up, you will be able to set your configurations in Cocoon, our automated, online property set up tool.
                                        </div>
                                        <div style="margin-bottom: 25; margin-bottom: 25px;">
                                            If you have already registered in Hummingbird, kindly use your username and password to log in.
                                        </div>
                                    </div>
                                    <div style="margin-bottom: 25; margin-bottom: 25px;">
                                        The URL for your environment is located at: 
                                            <a href="https://${domain}" style="color: #00848E; text-decoration: none;" target="_blank">${domain}
                                            </a>
                                    </div>
                                    <div style="margin-bottom: 30px;">
                                        <div>Thanks,</div>
                                        <div>Tenant Inc.</div>
                                    </div>
                                    <table style="margin-bottom: 30;">
                                        <tr>
                                            <td style="width: 150; width: 150px;"></td>
                                            <td style="width: 135; width: 135px; font-size: 14px;">
                                                <span
                                                    style="height: 25; height: 25px; width: 135; width: 135px; background-color: #00848E; border: 0; border-radius: 4px; padding:5 10 5 10; padding:5px 10px 5px 10px;">
                                                    <a href="https://${cocoonUrl}/login" target="_blank"
                                                        style="color: white; text-decoration: none; width: 135; width: 135px;">
                                                        Login to Cocoon
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
                            <td style="width: 155; width: 155px;"></td>
                            <td>@2021 Tenant Inc. All Rights Reserved.</td>
                        </table>
                    </td>
                </tr>
            </table>
        </body>
    </html>`;
    }
    templateOwnerOnBeginMerge(RIName,ownerName,RIEmail,RIPhone,cocoonUrl,property_name,merge_status){

        RIPhone = OnboardingContact.formatPhoneNumber(RIPhone);
        let merge_status_trial = (merge_status && merge_status == 'trial');
        let trial_text = merge_status_trial ? 'You have done Trial upload. To merge this data to Hummingbird,' : 'There’s just one last step you need to complete.';

        let trial_upload_text = merge_status_trial ?`
        <div style="margin-bottom: 25; margin-bottom: 25px;">              
        As this was trial upload, after the migration of this data to hummingbird, below options are provided to you-
            <ol>
                <li> If you feel there is any issue with the data, you can ask RI to allow to Reupload and Remerge the data. </li>
                <li> Else you feel there is no issue with the data, you can ask RI to Launch your property. </li>
            </ol>
        </div>`:'';
        
        return `<html>
        <body>
            <table style="border: 1px solid lightgrey;">
                <tr>
                    <td style="height: 715; width: 580; width: 580px; background-color: #fff; font-family: Graphik Web, sans-serif; font-size: 14px;">
                        <table> <tr> <td style="height: 7; height: 7px; width: 580; width: 580px; background-color: #23b3ba;"></td> </tr> </table>
                        <table style="height: 110; width: 580; line-height: 1.3; font-size: 13px; display: table;">
                            <tr>
                                <td style="width: 50; width: 50px;"></td>
                                <td style="width: 400; width: 400px;">
                                    <img width="240" height="80"
                                        src="https://${cocoonUrl.split('/')[0]}/img/Hummingbird_Logo_Horizontal_Black.png"
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
                                    <div style="margin-bottom: 30px;"> <h2><b>Get Ready to Merge to Hummingbird!</b></h2> </div>
                                    <div style="margin-bottom: 25px;"> Hi ${ownerName},</div>
                                    <div style="margin-bottom: 25px;">
                                        <div style="margin-bottom: 25; margin-bottom: 25px;">
                                        Congratulations, your property ${property_name} is nearly ready to go live on Hummingbird! ${trial_text} Login to <a href="https://${cocoonUrl}/login" style="color: #00848E; text-decoration: none;" target="_blank">https://${cocoonUrl}/login</a> link and click on “Merge to Hummingbird” button to begin the migration of your information. 
                                        </div>
                                        ${trial_upload_text}
                                        <div style="margin-bottom: 25; margin-bottom: 25px;">
                                        Please feel free to reach out for the above actions and if you have any questions or concerns.
                                        </div>
                                        <div style="margin-bottom: 25; margin-bottom: 25px;">
                                           My email is: ${RIEmail} <br>
                                           My phone number is: ${RIPhone}
                                        </div>
                                        <div style="margin-bottom: 25; margin-bottom: 25px;">
                                        We hope you had a great experience onboarding with our team and look forward to your journey with Hummingbird and Tenant Inc. 
                                        </div>
                                    </div>
                                   
                                    <div style="margin-bottom: 30px;">
                                        <div>Thanks,</div>
                                        <div>${RIName}</div>
                                    </div>
                                    <table style="margin-bottom: 30;">
                                        <tr>
                                            <td style="width: 150; width: 150px;"></td>
                                            <td style="width: 135; width: 135px; font-size: 14px;">
                                                <span
                                                    style="height: 25; height: 25px; width: 135; width: 135px; background-color: #00848E; border: 0; border-radius: 4px; padding:5 10 5 10; padding:5px 10px 5px 10px;">
                                                    <a href="https://${cocoonUrl}/login" target="_blank"
                                                        style="color: white; text-decoration: none; width: 135; width: 135px;">
                                                        Login to Hummingbird
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
                            <td style="width: 155; width: 155px;"></td>
                            <td>@2021 Tenant Inc. All Rights Reserved.</td>
                        </table>
                    </td>
                </tr>
            </table>
        </body>
    </html>`;
    }

    templateOwnerPropertyProgress(ownerName ,cocoonUrl ,propertyName ,progressPercentage ,dueDate,goliveDate ,RIName,RIEmail,RIPhone,afterDueDate,companyName ){

        RIPhone = OnboardingContact.formatPhoneNumber(RIPhone);

        let progressConditionalContent = progressPercentage > 50 ? `${propertyName} under ${companyName}`
        :`${companyName}`

        //afterDueDate // true then content change
        let  dueDateDependentContent = afterDueDate? 
        `<div style="margin-bottom: 25px;">
        <div style="margin-bottom: 25; margin-bottom: 25px;">
            We’re reaching out because we noticed that your due date is passed for completing the Cocoon onboarding process for ${progressConditionalContent}. 
        </div>
        <div style="margin-bottom: 25; margin-bottom: 25px;">You are currently ${progressPercentage}% complete with the Cocoon onboarding process.${dueDate} was the last day to complete that process.
        </div>
        <div style="margin-bottom: 25; margin-bottom: 25px;">
        If you have any questions or need help completing the process, reach out to your technical lead, ${RIName}. 
        </div>
    </div>`//after due date passed - content yet to be updated
        :`<div style="margin-bottom: 25px;">
            <div style="margin-bottom: 25; margin-bottom: 25px;">
                We’re reaching out because we noticed that you have not completed the Cocoon onboarding process for ${progressConditionalContent}, and your due date is approaching.  
            </div>
            <div style="margin-bottom: 25; margin-bottom: 25px;">You are currently ${progressPercentage}% complete with the Cocoon onboarding process and ${dueDate} is the last day to complete that process. It is very important that you complete the remaining steps by then to ensure that we’re able to meet your scheduled Go Live date of ${goliveDate}. 
            </div>
            <div style="margin-bottom: 25; margin-bottom: 25px;">
            If you have any questions or need help completing the process, reach out to your technical lead, ${RIName}. 
            </div>
        </div>`
 
         return `<html>
         <body>
             <table style="border: 1px solid lightgrey;">
                 <tr>
                     <td style="height: 715; width: 580; width: 580px; background-color: #fff; font-family: Graphik Web, sans-serif; font-size: 14px;">
                         <table> <tr> <td style="height: 7; height: 7px; width: 580; width: 580px; background-color: #23b3ba;"></td> </tr> </table>
                         <table style="height: 110; width: 580; line-height: 1.3; font-size: 13px; display: table;">
                             <tr>
                                 <td style="width: 50; width: 50px;"></td>
                                 <td style="width: 400; width: 400px;">
                                     <img width="240" height="80"
                                     src="https://${cocoonUrl.split('/')[0]}/img/Hummingbird_Logo_Horizontal_Black.png"
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
 
                                     <div style="margin-bottom: 25px;"> Hello ${ownerName},</div>
                                     ${dueDateDependentContent}
                                     <div style="margin-bottom: 30px;">
                                         <div>For your convenience, here is your technical lead’s contact information: </div>
                                         <span>email : ${RIEmail}</span><br/>
                                         <span>phone number :${RIPhone}</span>
                                     </div>
                                     <table style="margin-bottom: 30;">
                                         <tr>
                                             <td style="width: 150; width: 150px;"></td>
                                             <td style="width: 135; width: 135px; font-size: 14px;">
                                                 <span
                                                     style="height: 25; height: 25px; width: 135; width: 135px; background-color: #00848E; border: 0; border-radius: 4px; padding:5 10 5 10; padding:5px 10px 5px 10px;">
                                                     <a href="https://${cocoonUrl}/login" target="_blank"
                                                         style="color: white; text-decoration: none; width: 135; width: 135px;">
                                                         Login to Cocoon
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
                             <td style="width: 155; width: 155px;"></td>
                             <td>@2021 Tenant Inc. All Rights Reserved.</td>
                         </table>
                     </td>
                 </tr>
             </table>
         </body>
     </html>`
    }

    static formatPhoneNumber(phoneNumberString) {

        let lastTenDigits = phoneNumberString.substring(phoneNumberString.length - 10);
        let countryCode = phoneNumberString.substring(0,phoneNumberString.length - 10);
        
        let cleaned = ('' + lastTenDigits).replace(/\D/g, '');
        let match = cleaned.match(/^(\d{3})(\d{3})(\d{4})$/);

        if (match) return '+'+ countryCode +' (' + match[1] + ') ' + match[2] + '-' + match[3];
        
        return '+### (###) ###-####';

    };


    async sendEmail(connection, subject,  message, attachments, company, logged_in_user, context, owner_id, facility_id, onboarding){

		if(!this.email) e.th(409, "This customer does not have a valid email address on file");
		//get logged-in user gds_owner_id, and to_user facility_id, then pass it to sendEmail

		try{
            let to = {
                name: this.first + " " + this.last,
                email: this.email,
            }
            let cc = null;
            let delivery_method = 'standard_email'
			let email = await sendEmail(connection, [to], this.id, null, subject, message, attachments, owner_id, facility_id,cc,delivery_method,onboarding,null,true);
			console.log("email", email);
			let interaction = new Interaction();
			let property = await models.Property.findByGdsID(
			  connection,
			  facility_id
			);
			let property_id = 0;
			if (property) {
			  property_id = property.id;
			}	
			await interaction.create(connection, property_id, 'Tenant', this.id, logged_in_user, moment().format('YYYY-MM-DD HH:mm:ss'), message, 'email', null, email.id, null, null, context);
			return email;
		} catch(err){
			console.log(err);
		}
	}

    async getOnboardingContact(connection){
        var response = await models.Onboarding.getAllContacts(connection);
        return response;
    }

    async assignContactProperties(connection, company_id, property_id){
        let roles = await models.Contact.getUserRoles(connection, this.id, company_id); 
        if(roles.length){      
            let contact_prop = {
                property_id: connection.escape(property_id),
                company_contact_role_id: roles[0].id
            }
            await models.Role.saveProperty(connection, contact_prop);
        }
    }
}
module.exports = OnboardingContact;

var e = require(__dirname + '/../../modules/error_handler.js');
var models = require(__dirname + '/../../models');
var { sendEmail } = require(__dirname + '/../../modules/mail.js');
var Interaction = require(__dirname + '/../../classes/interaction.js');
var moment = require('moment');