"use strict";
const moment = require("moment");
let e  = require(__dirname + '/../modules/error_handler.js');

class LeaseStoredContents {

    constructor(data) {
        data = data || {};
        this.id = data.id;
        this.lease_id = data.lease_id;
        this.stored_content_id = data.stored_content_id || null;
        this.value = data.value || null;  // field to save custom stored content value 
        this.created_at = data.created_at;
        this.created_by = data.created_by;
        this.deleted_at = data.deleted_at;
        this.deleted_by = data.deleted_by;
    }

    /**
     * Save stored contents user a lease
     * 
     * @param {object} connection - database connection
     * @param {object} payload - request payload
     * 
     * @returns {object}  - details of the inserted rows
     */
    static async bulkSave(connection, payload) {
        try {
            let { stored_contents } = payload;
            let storedContents = await models.StoredContents.findAll(connection, 'active')
            let storedContentIds = storedContents?.map(storedContentDetails => storedContentDetails.id)

            stored_contents?.forEach(storedContentData => {
                if (!storedContentIds.includes(storedContentData.stored_content_id)) {
                    throw 'Cannot find stored content with the given id.';
                }
            })
            return await models.LeaseStoredContents.bulkSave(connection, { data: stored_contents });
        } catch(err) {
            console.log(err, "Error on saving lease stored content")
            e.th(400, err)
        }
    }

    /**
     * Remove stored contents from a lease
     * 
     * @param {object} connection - database connection
     * @param {object} payload - request payload
     * 
     * @returns {object}  - details of the deleted rows
     */
    static async bulkRemove(connection, payload) {
        let { stored_contents, user } = payload;
        let updatedData = {
            deleted_at: moment().format('YYYY-MM-DD hh:mm:ss'),
            deleted_by: user?.id
        }

        return await models.LeaseStoredContents.bulkRemove(connection, { removed_items: stored_contents, data: updatedData });
    }

    /**
     * Used to update stored contents under a lease
     * 
     * @param {object} connection - database connection
     * @param {object} payload - request payload
     * 
     * @returns {object}  - details of the updated rows
     */    
    static async bulkUpdate(connection, payload) {

        let {
            active_stored_contents
        } = payload;
        let previousStoredContents = await LeaseStoredContents.getActive(connection, payload);
        let removedStoredContents = LeaseStoredContents.filterStoredContent(previousStoredContents, active_stored_contents);
        let insertedStoredContents = LeaseStoredContents.filterStoredContent(active_stored_contents, previousStoredContents);
    
        /* Filter stored content if 'value' is updated */
        let updatedStoredContents = active_stored_contents.filter(
            activeContent => previousStoredContents.some(
                previousContent =>
                previousContent.stored_content_id === activeContent.stored_content_id &&
                previousContent.value != activeContent.value // check the value is updated or not by comparing with previously saved stored content 
            )
        );
    
        /* Add new stored contents under a lease */
        if (insertedStoredContents?.length) {
            let storedContents = LeaseStoredContents.transformBulkSave({
                stored_contents: insertedStoredContents,
                ...payload
            });
            await LeaseStoredContents.bulkSave(connection, {
                stored_contents: storedContents
            });
        }
        /* Remove stored contents from a lease */
        if (removedStoredContents?.length) {
            await LeaseStoredContents.bulkRemove(connection, {
                stored_contents: removedStoredContents,
                ...payload
            });
        }
        /* Update 'value' of the leased stored contents */
        if (updatedStoredContents?.length) {
            await LeaseStoredContents.update(connection, {
                stored_contents: updatedStoredContents
            });
        }
    }

    /**
     * Get stored contents in a lease
     * 
     * @param {object} connection - database connection
     * 
     * @returns {Array}  - list of stored content under a lease
     */
    async find(connection) {
        let data = await models.LeaseStoredContents.find(connection, this.lease_id );
        return data;
    }

    /**
     * Filter stored contents by comparing 2 stored content list
     * 
     * @param {Array} listA - Stored content array
     * @param {Array} listB - Stored content array to compare
     * 
     * @returns {Array}  - list of filtered stored contents
     */    
    static filterStoredContent(listA, listB) {
        return listA.filter(p => !listB.some(a => a.stored_content_id === p.stored_content_id));
    }

    /**
     * Get active stored contents in a lease
     * 
     * @param {object} connection - database connection
     * @param {object} payload - request payload
     * 
     * @returns {Array}  - list of stored content under a lease
     */
    static async getActive(connection, payload) {
        let { lease_id } = payload;
        let data = await models.LeaseStoredContents.findActive(connection, { lease_id });
        return data;
    }

    /**
     * Update 'value' of stored contents
     * 
     * @param {object} connection - database connection
     * @param {object} payload - request payload
     * 
     * @returns {object}  - details of the updated rows
     */
    static async update(connection, payload) {
        try {
            let { stored_contents  } = payload;
            return await models.LeaseStoredContents.bulkUpdate(connection, { data: stored_contents });
        } catch (err) {
            e.th(400, "Failed to update lease stored content")
        }
    }

    /**
     * Transforming the payload to be used by the `bulkSave` method.
     * 
     * @param {object} payload - request payload
     * 
     * @returns {Array}  - list of transformed array of stored contents
     */    
    static transformBulkSave(payload) {
        let { lease_id, stored_contents, user } = payload;
        let transformedStoredContents = [];

        stored_contents?.forEach(item => {
            let leaseProtectedPropertyItem = new LeaseStoredContents({ 
                lease_id: lease_id,
                stored_content_id: item?.stored_content_id,
                value: item?.value,
                created_by: user?.id
            });
            transformedStoredContents.push(leaseProtectedPropertyItem);   
        })
        return transformedStoredContents;
    }

}

module.exports = LeaseStoredContents;

const models = require(__dirname + '/../models');