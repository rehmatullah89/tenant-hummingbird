var Company = require(__dirname + '/../../classes/company.js');


class OnboardingCompany extends Company {
    constructor(reqBodyData) {
        super(reqBodyData);
        reqBodyData = reqBodyData || {};
        this.status = reqBodyData.status || 'new'
        this.tech_contact_name = reqBodyData.tech_contact_name
        this.tech_contact_email = reqBodyData.tech_contact_email
        this.tech_contact_phone = reqBodyData.tech_contact_phone
        this.tech_contact_id = reqBodyData.tech_contact_id
    }

    validateTechContact() {
        var error = false;

        try{

            if (!this.tech_contact_name) {
                error = new Error('Invalid tech_contact_name');
                error.code = 400;
                throw error;
            }

            if (!this.tech_contact_email || !validation.validateEmail(this.tech_contact_email)) {

                error = new Error('Please enter a valid email');
                error.code = 400;
                throw error;
            }

            if (!this.tech_contact_phone) {
                error = new Error('Please enter a tech_contact_phone number for this company');
                error.code = 400;
                throw error;
            }

        } catch(err){
             throw err;
        }
        return true;
    }

    async createOnboardingCompany(connection) {

        try {
            await this.validate();
            this.validateTechContact();

            let isCompanyExists = await models.Company.findByCompanyName(connection, this.name);
            if (isCompanyExists) e.th(409, 'A company with this name already exists. Please choose a different name.');

            let isSubDomainExists = await models.Company.findBySubdomain(connection, this.subdomain);
            if (isSubDomainExists) e.th(409, 'A company with this sub domain already exists. Please choose a different subdomain.');

            let save = {
                name: this.name,
                firstname: this.firstname,
                lastname: this.lastname,
                email: this.email, 
                phone: this.phone,
                subdomain: this.subdomain,
                logo: 'h6design_logo.png',
                active: '1'
            };

            let company_id = await models.Company.save(connection, save);

            let contactInfo = {
                first: this.firstname,
                last: this.lastname,
                email: this.email,
                Phones: [{
                    type: "cell",
                    phone: this.phone,
                    sms: 0,
                    primary: 1
                }]

            }
            let contact_obj = new OnboardingContact(contactInfo)
            await contact_obj.onboardingContactSave(connection)
            let contact_id = contact_obj.id

            let role = await models.Role.findById(connection, 1)

            let roleInfo = {
                company_id,
                name: role.name,
                description: role.description,
                is_active: role.is_active,
                is_default: role.is_default
            }            
            let onboardingRole = new Role(roleInfo);
            await onboardingRole.save(connection);
            let permissions = await models.Role.findPermissions(connection, role.id);            
            await onboardingRole.updatePermissions(connection, permissions)

            let companyRes = await models.Role.findByCompany(connection, company_id)
            
            for (let i = 0; i < companyRes.length; i++) {
                let RoleID = companyRes[i].id
                await models.Contact.saveContactRole(connection, {
                    company_id,
                    contact_id,
                    role_id: RoleID
                })

                await models.Contact.saveContactRole(connection, {
                    company_id,
                    contact_id : this.tech_contact_id,
                    role_id: RoleID
                })
            }

            await models.Setting.save(connection, { company_id, name: 'authnetLogin', value: '' })
            await models.Setting.save(connection, { company_id, name: 'twilioPhone', value: '' })
            await models.Setting.save(connection, { company_id, name: 'forteLogin', value: '' })
            await models.Setting.save(connection, { company_id, name: 'forteKey', value: '' })
            await models.Setting.save(connection, { company_id, name: 'forteOrganizationId', value: '' })
            await models.Setting.save(connection, { company_id, name: 'forteLocationId', value: '' })
            await models.Setting.save(connection, { company_id, name: 'taxRate', value: '' })
            await models.Setting.save(connection, { company_id, name: 'qbOauthToken', value: '' })
            await models.Setting.save(connection, { company_id, name: 'qbOauthTokenSecret', value: '' })
            await models.Setting.save(connection, { company_id, name: 'qbDepositLiability', value: '' })
            await models.Setting.save(connection, { company_id, name: 'qbIncomeAccount', value: '' })
            await models.Setting.save(connection, { company_id, name: 'qbPrepaymentLiability', value: '' })
            await models.Setting.save(connection, { company_id, name: 'qbTaxCode', value: '' })
            await models.Setting.save(connection, { company_id, name: 'qbTokenRenewal', value: '' })
            await models.Setting.save(connection, { company_id, name: 'qbRealmId', value: '' })
            await models.Setting.save(connection, { company_id, name: 'invoiceChargeOffset', value: '' })
            await models.Setting.save(connection, { company_id, name: 'notificationEmails', value: '' })
            await models.Setting.save(connection, { company_id, name: 'incomingCalls', value: '' })
            await models.Setting.save(connection, { company_id, name: 'twilioRedirect', value: '' })
            await models.Setting.save(connection, { company_id, name: 'twilioSMSRedirect', value: '' })
            await models.Setting.save(connection, { company_id, name: 'transunionUser', value: '' })
            await models.Setting.save(connection, { company_id, name: 'transunionPassword', value: '' })

            await models.Onboarding.save(connection, {
                company_id,
                status: this.status || 'new', 
                tech_contact_name: this.tech_contact_name,
                tech_contact_email: this.tech_contact_email,
                tech_contact_phone: this.tech_contact_phone
            })

            let saveRole = {
                company_id,
                name:'Application: Hummingbird',
                type:'application'
            }            
           let result = await models.Role.save(connection, saveRole)

            let roleId = result.insertId;

            let gds_application_id = process.env.HUMMINGBIRD_APP_ID;

           let user = await models.Onboarding.findUserByGdsApplicationId(connection,gds_application_id);

           if(!(user && user.length && user[0].id)) e.th(404,'No records found!')

           let userId =user[0].id;

           let contact = new Contact({user_id:userId});
           await contact.find(connection);

           let contactId =  contact.id;

           let companyContactRoles = {
			company_id,
			contact_id: contactId,
			role_id: roleId
		};

		await models.Contact.saveContactRole(connection, companyContactRoles);
           

            return company_id;
        }
        catch (err) {
            console.log(err)
            throw err
        }

    }

    static async findAll(connection) { 
        try {
           
            let arrOfIds = await models.Onboarding.findCompanyIds(connection)
            if (arrOfIds && arrOfIds.length) {
                return await models.Onboarding.findAll(connection)
            }
            else{
                e.th(404,'No records found')
            }
        }
        catch (err) {
            throw err
        }

    }

    async save(connection) {
        try {
            await this.validate();
            this.validateTechContact();
            let company = await models.Company.findBySubdomain(connection, this.subdomain)
            let company_id;
            if (company) {
                company_id = company.id;                
            }

            let onboarding_company = await models.Onboarding.findByCompanyId(connection, company_id)
            if(!(onboarding_company && onboarding_company.length))
            e.th(404,'No company found')

            if(company.name != this.name){
                let isCompanyExists = await models.Company.findByCompanyName(connection, this.name);
                if (isCompanyExists) e.th(409, 'A company with this name already exists. Please choose a different name.');
            }     

            var save_companies = {
                name: this.name,
                firstname: this.firstname,
                lastname: this.lastname,
                email: this.email,
                phone: this.phone,
                subdomain: this.subdomain
            }
        
            await models.Company.save(connection, save_companies, company_id);

            let companies_contact = await models.Onboarding.findContactsByCompanyId(connection, company_id)

            if(!(companies_contact && companies_contact.length && companies_contact[0].contact_id))
            e.th(404, 'No contacts found.');


            let phone = await models.Contact.findPhones(connection, companies_contact[0].contact_id)
            if(!(phone && phone.length))
            e.th(404,'No phone records found.')

            let contactInfo = {
                id: companies_contact[0].contact_id,
                first: this.firstname,
                last: this.lastname,  
                email: this.email,
                Phones: [{ 
                    ...((phone[0].id) && {id: phone[0].id}),
                    type: "cell",
                    phone: this.phone,
                    sms: 0,
                    primary: 1
                }]

            }

            let contact_obj = new OnboardingContact(contactInfo) 
            await contact_obj.onboardingContactSave(connection)

            //Added this to update the Contact ID for RI contact roles table mapping
            let roles = await models.Role.findByCompany(connection, company_id)

            if(!(roles && roles.length && roles[0].id))                      
            e.th(404,'No roles found');

            let roleId = roles[0].id
            let tech_contact = await models.Onboarding.getAllContacts(connection, onboarding_company[0].tech_contact_email) 

            if(!(tech_contact && tech_contact.length && tech_contact[0].contact_id))
            e.th(404,'No tech contact found');

            let contactRole =  await models.Role.findByContact(connection, company_id, tech_contact[0].contact_id, roleId) 
            if(contactRole && contactRole.length && contactRole[0].id){
                await models.Contact.saveContactRole(connection, {
                    company_id,
                    contact_id : this.tech_contact_id,
                    role_id: roleId
                }, contactRole[0].id)
            }
                            
            var save_mapping = {
                company_id: company_id,
                tech_contact_name: this.tech_contact_name,
                tech_contact_email: this.tech_contact_email,
                tech_contact_phone: this.tech_contact_phone
            };
            await models.Onboarding.save(connection, save_mapping, onboarding_company[0].id);

    
        }
        catch (err) {
            console.log(err)
            throw err
        }
    }

    async updateStatus(connection) {
        try {
            let company = await models.Company.findBySubdomain(connection, this.subdomain)
            let company_id;
            if (company) {
                company_id = company.id;
            }
            let onboarding_company = await models.Onboarding.findByCompanyId(connection, company_id)

            if (onboarding_company && onboarding_company.length && onboarding_company[0].id ) {
                let new_status = {
                    status: this.status
                }
                await models.Onboarding.save(connection, new_status, onboarding_company[0].id);
            }
            else {
                e.th(409, 'No company found');
            }
        }
        catch (err) {
            console.log(err)
            throw err
        }

    }

    async generateGDSOwnerId (companyId , ownerName){ //hashed dynamo company id
      try {
        var response = await request({
          headers: {
            'X-storageapi-key': process.env.GDS_API_KEY,
            'X-storageapi-date': moment().unix(),
          },
          uri:  `${settings.get_gds_url()}owners`,
          body:{
            name : ownerName,
              pmsConfig: {
                  type: "leasecaptain",
                  version: 2,
                  config: {
                      companyId: companyId,
                      endpoint: `${settings.getBaseUrl('api')}/v1`
                  }
              }
          },
          method: 'POST',
          json: true
        }); 
  
      } catch(err) {
        console.log(err)
        throw err;
      }

     if(!(response.data && response.data.owner)) e.th(400, 'No appropriate response from gds api');

      return response.data.owner;
    }

   static async generateGDSFacilityId (connection,locationID,companyId,GDSOwnerID){

           try {
             var response = await request({
               headers: {
                 'X-storageapi-key': process.env.GDS_API_KEY,
                 'X-storageapi-date': moment().unix(),
               },
               uri: `${settings.get_gds_url()}owners/${GDSOwnerID}/facilities`,
               body:{
                pmsId: {
                    locationID: Hashes.encode(locationID,Hashes.decode(companyId)[0])
                },
                pmsConfig: {
                    type: "leasecaptain",
                    version: 2,
                    cacheRefreshInterval: 0,
                    config: {
                        companyId: companyId,
                        endpoint: `${settings.getBaseUrl('api')}/v1`
                    },
                    ianaTimeZone: "America/Los_Angeles"
                }
            },
               method: 'POST',
               json: true
             }); 
       
           } catch(err) {
            console.log(err)
            e.th(400, "Property is created but facility GDS API failed. Please generate and update the GDS facility id manually.")
           }

           if(!(response && response.data)) e.th(400, 'No appropriate response from gds api');
           return response.data;
         }

        async updateCompany (connection,save,company_id){
            await models.Company.save(connection, save, company_id);
        }
    }

module.exports = OnboardingCompany;
var Role = require(__dirname + '/../../classes/role.js');
var Contact = require(__dirname + '/../../classes/contact.js');
var OnboardingContact = require(__dirname + '/../../classes/onboarding/onboarding_contact.js');
var e = require(__dirname + '/../../modules/error_handler.js');
var models = require(__dirname + '/../../models');
var validation = require(__dirname + '/../../modules/validation.js');
var request = require("request-promise");
var moment  = require('moment');
var Hash = require(__dirname + '/../../modules/hashes.js');
var settings = require(__dirname + '/../../config/settings.js');
var Hashes = Hash.init();