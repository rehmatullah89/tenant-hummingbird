"use strict";
let e  = require(__dirname + '/../modules/error_handler.js');
class StoredContents {
    
    constructor(data) {
        data = data || {};
        this.id = data.id;
        this.name = data.name;
        this.note = data.note;
        this.active = data.active ?? 1;
        this.created_at = data.created_at;
        return this;
    }
    
    /**
     * Creating a new stored content.
     * 
     * @param {object} connection - database connection
     * @param {object} body - detailed of the stored content
     * 
     * @returns {string}  - insert id of the newly created stored content
    */       
   async create(connection) {
        let data = {
            name: this.name,
            note: this.note,
            active: this.active
        }
       let result = await models.StoredContents.create(connection, data);
       this.id = result.insertId;
       return result?.insertId;
    }
    
    /**
     * Delete stored content
     * 
     * @param {object} connection - database connection
     * @param {object} id - id of the stored content
     * 
     * @returns {object}  - details of the deleted row
     */  
    async delete(connection) {
        let leaseStoredContentDetails = await models.LeaseStoredContents.findLeasesByStoredContent(connection, this.id);
        if (leaseStoredContentDetails.length) {
            e.th(409, "Failed to delete stored content. The stored content is currently configured to a lease.");
        }
        return await models.StoredContents.delete(connection, this.id);
    }

    /**
     * A method that returns a single stored content by id.
     * 
     * @param {object} connection - database connection
     * @param {string} id - id of the stored content
     * 
     * @returns {object}  - return fetched stored content
     */   
    async findById(connection, id) {
        let result = await models.StoredContents.findById(connection, id);
        this.id = id;
        return result;
    }

    /**
     * Get all stored contents
     * 
     * @param {object} connection - database connection
     * 
     * @returns {Array}  - list of stored contents
     */    
    static async getAll(connection, status="active") {
        let data = await models.StoredContents.findAll(connection, status);
        return data;
    }

    /**
     * Update stored content
     * 
     * @param {object} connection - database connection
     * @param {object} body - detailed of the stored content
     * @param {object} id - id of the stored content 
     * 
     * @returns {object}  - details of the updated row
     */  
    async update(connection) {
        try {
            let data = {
                name: this.name,
                note: this.note,
                active: this.active
            }
            return await models.StoredContents.update(connection, data, this.id);
        } catch(err) {
            e.th(400, "Failed to update stored content");
        }
    }
}

module.exports = StoredContents;
const models = require(__dirname + '/../models');