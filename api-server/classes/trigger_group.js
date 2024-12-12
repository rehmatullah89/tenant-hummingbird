var models = require(__dirname + '/../models');
var Property  = require(__dirname + '/../classes/property.js');
var e = require(__dirname + '/../modules/error_handler.js');

class TriggerGroup {
    constructor(data) {
        data = data || {};
        this.id = data.id || null;
        this.company_id = data.company_id;
        this.name = data.name;
        this.description = data.description;
        this.propertyTriggerGroups = data.propertyTriggerGroups || [];
        this.Properties = data.Properties || [];
    }

    async validate() {
        if (!this.name) e.th(400, 'Invalid group name');
        return Promise.resolve();
    }

    async save(connection) {

        await this.validate();

        var triggerGroup = await models.TriggerGroup.findByName(connection, this.name, this.company_id);
        if(triggerGroup && triggerGroup.id && triggerGroup.id != this.id) e.th(409, 'A process with this name already exists.');
        let save = {
          company_id: this.company_id,
          name: this.name,
          description: this.description
        };

        let result = await models.TriggerGroup.save(connection, save, this.id);
        if (result.insertId) this.id = result.insertId;

    }

    async find(connection) {

        if (!this.id) e.th(500, 'No Id is set');

        let data = await models.TriggerGroup.findById(connection, this.id);

        if (!data) {
            e.th(404, "Trigger group not found");
        }

        this.id = data.id || null;
        this.company_id = data.company_id;
        this.name = data.name || null;
        this.description = data.description || null;
        this.triggers_count = data.triggers_count || 0;
        this.duration = data.duration || 0;
    }

    async delete(connection, contact_id) {
        let tgProperties = await models.TriggerGroup.findProperties(connection, this.id);
        let tgPropertiesIds = tgProperties.map(m => m.id);
        if(tgPropertiesIds && tgPropertiesIds.length > 0) await this.removeProperties(connection, tgPropertiesIds, contact_id);

        return await models.TriggerGroup.delete(connection, this.id);
    }

    async addProperties(connection, propertiesToAdd, contact_id ){
        return await models.TriggerGroup.addProperties(connection, propertiesToAdd, this.id, contact_id);
    }

    async removeProperties(connection, propertyTriggerGroupIds, contact_id){
        if(!contact_id) contact_id = null;

        let data = {propertyTriggerGroupIds, contact_id}
        return await models.TriggerGroup.removeProperties(connection, data);
    }

    async findProperties(connection){
        if(!this.id) e.th(404, "Trigger group id not set.");
        let propertyTriggerGroups = await models.TriggerGroup.findProperties(connection, this.id);
        this.Properties = propertyTriggerGroups.map(val => {
            return {id: val.property_id};
        });
    }

    async updateProperties(connection, properties, contact_id, removeProperties = []){

        let property_ids = properties.map(m => m.id);
        let removeProperty_ids = removeProperties.map(m => m.id);

        if(property_ids.length) await this.removeFromOtherGroups(connection, property_ids, contact_id);

        let tgProperties = await models.TriggerGroup.findProperties(connection, this.id);
        let tgPropertiesIds = tgProperties.map(m => m.property_id);

        let propertiesToSave = property_ids.filter(f => !tgPropertiesIds.includes(f));
        if(propertiesToSave && propertiesToSave.length > 0) await this.addProperties(connection, propertiesToSave,contact_id);

        let propertyTriggerGroupIdsToDelete = tgProperties.filter(f => removeProperty_ids.includes(f.property_id)).map(m => m.id);
        if(propertyTriggerGroupIdsToDelete && propertyTriggerGroupIdsToDelete.length > 0) await this.removeProperties(connection, propertyTriggerGroupIdsToDelete, contact_id);
    }

    async removeFromOtherGroups(connection, property_ids, contact_id){
        let other_groups = await models.TriggerGroup.findByPropertyIds(connection, property_ids, [this.id]);
        let other_groups_ids = other_groups.map(og => og.id);
        
        if(other_groups_ids.length) await this.removeProperties(connection, other_groups_ids, contact_id);
    }

    async verifyAccess(company_id){
      if(!company_id || this.company_id != company_id) e.th(403, "You are not permitted to view this resource");
    }

    async verifyPropertyIds(companyId, property_ids, connection){
        for (const property_id of property_ids) {
            let property = new Property({ id: property_id  });
            await property.find(connection);
            await property.verifyAccess({company_id: companyId});
        }
    }

    update(data) {
        this.name = data.name;
        this.description = data.description;
    }

    static async findByCompanyId(connection, company_id){
      return await models.TriggerGroup.findByCompanyId(connection, company_id);
    }

    async setDuplicateName(connection){
        var conString = ' - Copy ';
        var dupGroups = await models.TriggerGroup.findWithDuplicateNames(connection, this.name, this.company_id);
        if(dupGroups && dupGroups.length > 0){
            let dupSeq = dupGroups.map(dp => {
                let regexp = dp.name.match(/\(([^)]*)\)/);
                if(regexp && regexp.length > 1){
                    if(!Number.isNaN(parseInt(regexp[1]))){
                        return parseInt(regexp[1]);
                    }
                }
            }).filter(x => x);

            var max = dupSeq && dupSeq.length > 0 ? Math.max(...dupSeq) : 0;
            conString += `(${max + 1})`;
        }

        this.name += conString;
    }

    resetIds(){
        this.id = null;
    }

    async areAttachementsAccessibleAtProperties(connection, payload) {
        const { company, api_info } = payload;

        if(!this.id || !this.Properties || !company || !api_info) { 
            e.th(500, 'id, company, api_info and properties are required to check access for attachements');
        }

        if(!this.Properties.length) return true;

        const triggerGroupAttachements = await models.TriggerGroup.findAttachements(connection, this.id);
        if(this.triggerGroupAttachements?.length == 0) return true;

        let properties = await Property.findInBulk(connection, this.Properties);
        properties = await Property.findGDSIds(connection, properties);
        const propertyGdsIds = properties.map(p => {
            return p.gds_id;
        });
        
        const searchParams = {
			type : ['delinquency'],
            property_gds_ids: propertyGdsIds,
            count: 200
        };

		const availableAttachementTemplates = await DocumentManager.getDocuments(connection, company, searchParams, { api_info: api_info });
        const hasAccess = triggerGroupAttachements.every(tga => availableAttachementTemplates.some(at => at.id == tga.document_id));
        if(hasAccess) return true;

        return false;
    }
}

module.exports = TriggerGroup;

const DocumentManager = require('./document_manager');