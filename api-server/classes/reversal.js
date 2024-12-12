"use strict";

class Reversal {
    constructor(data = {}) {
        this.assemble(data);
    }

    assemble(data) {
        this.id = data.id || null;
        this.type = data.type || null;
        this.product_id = data.product_id || null;
        this.document_id = data.document_id || null;
        this.property_id = data.property_id || null;
        this.company_id = data.company_id || null;
        if(data.ReversalDelivery) {
            const {
                active = 0,
                created_by,
                message,
                modified_by,
                subject,
            } = data.ReversalDelivery;
            this.ReversalDelivery = {
                active,
                created_by,
                message,
                modified_by,
                subject,
            };
        }
    }

    async getCompanySettings(connection, company) {
		let results =  await models.Reversal.getCompanySettings(connection, company.id);
        return this.getReversalObject(results)
    }

    async findPropertySettings(connection, params) {
		if(params.property_id) {
			let result = await models.Reversal.getPropertySettings(connection, {company_id: params.company_id, property_id: params.property_id});
			if(result && result.length) return this.getReversalObject(result);
		}

		let results =   await models.Reversal.getSettings(connection, { company_id: params.company_id });
        return this.getReversalObject(results)
	}

    getReversalObject(raw_result){
        return raw_result.reduce((obj, item) => {
            return {
              ...obj,
              [item['type']]: item,
            };
          }, {});
    }

    async saveSettings(connection, data) {
        if(data) this.assembleData(data);
        
        const saveData = {
            type: this.type,
            product_id: this.product_id,
            document_id: this.document_id,
            property_id: this.property_id,
            company_id: this.company_id
        };

        let setting;
			if(!this.property_id) {
				setting = await models.Reversal.getSettings(connection, saveData);
			} else {
				setting = await models.Reversal.getPropertySettings(connection,  saveData );
			}

			const setting_exists = setting && setting.length === 1 && setting[0].id ? true : false;
			const reversal = await models.Reversal.saveSettings(connection, saveData, setting_exists);

        if(setting_exists && !this.property_id) {
            const reversal_id = setting[0].id;
            const reversal_delivery = await Reversal.findBulkReversalDeliveries(connection, { reversal_ids: [reversal_id] });
            await this.saveReversalDelivery(connection, { reversal_id, reversal_delivery });
        }

        // const result = await models.Reversal.fin
		// const reversal = await models.Reversal.saveSettings(connection, saveData, this.id);
        //    this.id = reversal.insertId;
    }

    static async findBulkReversalDeliveries(connection, payload) {
        return models.Reversal.findBulkReversalDeliveries(connection, payload);
    }

    async saveReversalDelivery(connection, payload) {
        const { reversal_id, reversal_delivery } = payload;
        const { active, created_by, modified_by, message, subject } = this.ReversalDelivery;
        const data = {
            ...(reversal_delivery.length ? { reversalDelivery_id: reversal_delivery[0].id } : { created_by }),
            active,
            modified_by,
            message,
            subject,
            reversal_id,
        };
        if(active || data.reversalDelivery_id) {
            await models.Reversal.saveReversalDelivery(connection, data);
        }
    }

    async bulkSaveSettings(connection, params) {
        let { data, company, contact_id, property_id } = params;
        let updatedIds = [];
        let keys = Object.keys(data);

        for(let i = 0; i < keys.length; i++) {
            data[keys[i]].type = keys[i];
            data[keys[i]] = {
                ...data[keys[i]],
                ReversalDelivery :{
                    ...data[keys[i]].email,
                    created_by: contact_id,
                    modified_by: contact_id,
                },
            };
            let reversal = new Reversal({ ...data[keys[i]], company_id: company.id, property_id });
            await reversal.saveSettings(connection);
            updatedIds.push({ id: reversal.id });
        }

        return updatedIds;
    }

    async findSetting(connection) {
        let setting;

		setting = await models.Reversal.getSettings(connection, { 
            company_id: this.company_id, 
            property_id: this.property_id,
            type: this.type
        });

        if(!setting?.length) {
            setting = await models.Reversal.getSettings(connection, { 
                company_id: this.company_id, 
                type: this.type
            }); 
        }

        if(!setting?.length) {
            e.th(500, `Setting Not found against ${this.type}`);
        }

        this.assemble(setting[0]);
        return setting[0];
    }

    async findDeliveryAndTransformReversalSettings(connection, payload) {
        const { ReversalSettings } = payload;
        if(ReversalSettings) {
            const reversals = Object.keys(ReversalSettings);
            let reversalIds = [];
            for(const rev of reversals) {
                reversalIds.push(ReversalSettings[rev].id);
            }
            const reversalDeliveries = await Reversal.findBulkReversalDeliveries(connection, { reversal_ids: reversalIds });
            for(const rev of reversals) {
                const reversalDelivery = reversalDeliveries.find(item => item.reversal_id === ReversalSettings[rev].id);
                ReversalSettings[rev].email = {};
                if(reversalDelivery) {
                    const { active, message, subject } = reversalDelivery;
                    ReversalSettings[rev].email = {
                        active,
                        message,
                        subject,
                    };
                }
            }
        }
    }
}

module.exports = Reversal;

var models  = require(__dirname + '/../models');
var e  = require(__dirname + '/../modules/error_handler.js');