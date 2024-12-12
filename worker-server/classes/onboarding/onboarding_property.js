var Property = require(__dirname + '/../../classes/property.js');
class OnboardingProperty extends Property {

    constructor(data) {
        super(data);
        this.Address = data.Address||null,
        this.due_date = data.due_date||null,
        this.golive_date = data.golive_date||null,
        this.property_status_id = data.property_status_id || null,
        this.utc_offset = data.utc_offset || null;
        this.timezone_abrv = data.timezone_abrv || null;
    }

    async saveProperty(connection){
        try{
            await OnboardingProperty.formalValidate(connection,this.company_id)
           
            let address = new Address(this.Address);
            await address.findOrSave(connection);
            this.address_id = address.id;

            await OnboardingProperty.verifyUniqueProperty(connection,this.company_id, this)
            await this.save(connection)

            let data={
                property_id:this.id,
                golive_date:this.golive_date,
                due_date:this.due_date,
                property_status:'new',
                utc_offset: this.utc_offset,
                timezone_abrv: this.timezone_abrv
            }
            this.property_status_id =  await OnboardingProperty.savePropertyStatus(connection,data) 
        }catch(err){
            console.log(err)
            throw err
        }

    }

    static async savePropertyStatus (connection,data,id){
       return await models.Onboarding.savePropertyStatus(connection,data,id)
    }

    static async verifyUniqueProperty(connection,cid,propertyInstance){
        try{
		let property = await models.Onboarding.searchByCompanyID(connection, cid, propertyInstance);
		if(property && property.id !== propertyInstance.id) {
			e.th(409, "There is already a property with this property ID, name or address.");
		}
		return true;        
    }catch(err){
        throw err
        }
	}
   
    static async searchByPropertyID(connection,pid){
        return  await models.Onboarding.searchByPropertyID(connection,pid);
    }

    static async formalValidate(connection,cid,pid){
    try{
        let companyArr =await models.Onboarding.findByCompanyId(connection,cid)
        let companyObj =await models.Company.findById(connection,cid)

        if(!(companyArr.length>0 && companyObj)){
            e.th(409, "Company is not onboarded !");
        }

        if(pid){

            let propertyArr =await models.Onboarding.searchByPropertyID(connection,pid)
            let propertyObj =await models.Property.findById(connection,pid)

            if(!(propertyArr.length>0 && propertyObj)){
                e.th(409, "Property is not onboarded !");
            }

        }
    }catch(err){

        throw err
    }

    }

    static async findAll(connection,cid) {  
        try {
            
            let res = await models.Onboarding.findOnboardingProperties(connection,cid)

            let fullRes =  await Promise.all(res.map(async (property)=>{
                property.Address = await models.Address.findById(connection,property.address_id)

                if(property.Address){
                    property.Address.id = Hashes.encode(property.Address.id)
                }

                let phones =  await models.Property.findPhones(connection,property.property_id)
                    property.Phones = phones.map(phone => {
                    phone.id = Hashes.encode(phone.id);
                    phone.property_id = Hashes.encode(phone.property_id);
                    phone.phone = phone.phone.toString();
                    phone.type = Utils.capitalizeAll(phone.type);
                    return phone;
                })
                let emails = await models.Property.findEmails(connection,property.property_id);
                    property.Emails = emails.map(email => {
                    email.id = Hashes.encode(email.id);
                    email.property_id = Hashes.encode(email.property_id);
                    email.type = Utils.capitalizeAll(email.type);
                    return email;
                })
                property.property_id = Hashes.encode(property.property_id);
                property.address_id = Hashes.encode(property.address_id);

                return property ;          

            }))
            
            return fullRes;
        }
        catch (err) {
           
            throw err
        }

    }

    static propertyProgressEmailConfig (companyData)
    {
        let data = {
            company_id: companyData.company_id ,
            company_name: companyData.company_name,
            subdomain: companyData.subdomain,
            email: companyData.email,
            owner_name: companyData.firstname +' '+ companyData.lastname,
            property_name: companyData.name,
            progress_percentage : companyData.property_percentage,
            due_date : companyData.due_date,
            golive_date : companyData.golive_date,
            launch_date : companyData.launch_date,
            utc_offset : companyData.utc_offset || '+00:00',
            ri_name : companyData.tech_contact_name,
            ri_email : companyData.tech_contact_email,
            ri_phone : companyData.tech_contact_phone
        }
        let due_date = moment(companyData.due_date).format("YYYY-MM-DD");
        let four_days_before_due_date = moment(due_date, 'YYYY-MM-DD').subtract(4, 'days').format("YYYY-MM-DD");
        let todays_date = moment().utcOffset(data.utc_offset).format('YYYY-MM-DD'); // client's today's date

        let diffrence = moment(todays_date).diff(companyData.launch_date,'days'); //diffrence of client's today's date from launch date

        let afterDueDate = moment(todays_date).isAfter(due_date)   
        data.afterDueDate = afterDueDate;

        return {data,sendMail: !(moment(todays_date).isBefore(four_days_before_due_date)) || (diffrence > 0 && diffrence %3 === 0) };
    
    }
    async updateProperty(connection, data, property_id){
        return await models.Property.save(connection, data, property_id)
    }

    static async reuploadRemerge (connection,company_id,property_status_id,company_subdomain,company_name,property_name) {

        await models.Onboarding.deleteMenuItems(connection,company_id,['property'],'SpaceMixTenants');

        if(company_name && property_name)
        await models.Onboarding.removeTempRecords(connection,{company_name,property_name});

        let property_menu_items = await models.Onboarding.getAllMenuiItems(connection,company_id,'property');

        let property_menu_items_count = property_menu_items.length;

        let property_percentage = 50 +  Math.round((property_menu_items_count  / (property_menu_items_count +1)) * 50);

		await OnboardingProperty.savePropertyStatus(connection,{property_percentage},property_status_id)
		//let properties = await Property.findByCompanyId(connection,company_id)

		/*if(properties && properties.length == 1) //reverts the company status to 'active' from launched ,supposedly no need for this currently
			{
				let company = new OnboardingCompany({subdomain:company_subdomain,status:'active'});
				await company.updateStatus(connection)
			}*/
    }
    
    static async deleteMenuItems (connection,company_id,screen_types,screen_name){
         await models.Onboarding.deleteMenuItems(connection,company_id,screen_types,screen_name);
    }

}
module.exports = OnboardingProperty;
var Address = require(__dirname + '/../../classes/address.js');
var OnboardingCompany = require(__dirname + '/../../classes/onboarding/onboarding_company.js');
var e = require(__dirname + '/../../modules/error_handler.js');
var models = require(__dirname + '/../../models');
var Utils = require(__dirname + '/../../modules/utils.js');
var Hash = require(__dirname + '/../../modules/hashes.js');
var Hashes = Hash.init();
var moment = require('moment');