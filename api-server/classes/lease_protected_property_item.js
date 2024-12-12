"use strict";
const moment = require("moment");

class LeaseProtectedPropertyItem {

	constructor(data) {
		data = data || {};
		this.id = data.id;
		this.lease_id = data.lease_id;
        this.protected_property_item_id = data.protected_property_item_id || null;
        this.created_at = data.created_at;
        this.created_by = data.created_by;
        this.deleted_at = data.deleted_at;
        this.deleted_by = data.deleted_by;
	}

    static async getAll(connection, payload) {
        const { lease_id } = payload;
        const data = await models.LeaseProtectedPropertyItem.findAll(connection, { lease_id });
        return data;
    }

    static async getActive(connection, payload) {
        const { lease_id } = payload;
        const data = await models.LeaseProtectedPropertyItem.findActive(connection, { lease_id });
        return data;
    }

    static async bulkSave(connection, payload) {
        const { protected_property_items  } = payload;
        return await models.LeaseProtectedPropertyItem.bulkSave(connection, { data: protected_property_items });
    }

    static async bulkRemove(connection, payload) {
        const { protected_property_items, user } = payload;
        const updatedData = {
            deleted_at: moment().format('YYYY-MM-DD hh:mm:ss'),
            deleted_by: user?.id
        }

        return await models.LeaseProtectedPropertyItem.bulkRemove(connection, { removed_items: protected_property_items, data: updatedData });
    }

    static transformBulkSave(payload) {
        const { lease_id, protected_property_items, user } = payload;
        const protectedPropertyItems = [];

        for(let i = 0; i < protected_property_items.length; i++) {
            const leaseProtectedPropertyItem = new LeaseProtectedPropertyItem({ 
                lease_id: lease_id,
                protected_property_item_id: protected_property_items[i].protected_property_item_id,
                created_by: user?.id
            });
            
            protectedPropertyItems.push(leaseProtectedPropertyItem);
        }

        return protectedPropertyItems;
    }

    static async bulkUpdate(connection, payload) {
        const { active_protected_items } = payload;
        
        const previousProtectedItems = await LeaseProtectedPropertyItem.getActive(connection, payload);
        const removedProtectedItems = previousProtectedItems.filter(p => !active_protected_items.some(a => a.protected_property_item_id === p.protected_property_item_id));
        const insertedProtectedItems = active_protected_items.filter(a => !previousProtectedItems.some(p => p.protected_property_item_id === a.protected_property_item_id));

        if(insertedProtectedItems?.length) {
            const protectedPropertyItems = LeaseProtectedPropertyItem.transformBulkSave({ protected_property_items: insertedProtectedItems, ...payload });
            await LeaseProtectedPropertyItem.bulkSave(connection, { protected_property_items: protectedPropertyItems });
        }

        if(removedProtectedItems?.length) {
            await LeaseProtectedPropertyItem.bulkRemove(connection, { protected_property_items: removedProtectedItems, ...payload });
        }
    }
}

module.exports = LeaseProtectedPropertyItem;

const models = require(__dirname + '/../models');