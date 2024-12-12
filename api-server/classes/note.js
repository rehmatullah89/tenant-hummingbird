const models = require('../models');
const _ = require('lodash');
var Contact = require(__dirname + '/../classes/contact.js');

class Note {
    constructor(data) {
        this.note = data;
        this.interaction_id;
        this.content;
        this.last_modified_by; 
        this.created_at;
        this.last_modified;
        this.pinned = data.pinned;
        this.context = data.context;
        this.contact_id = data.contact_id;
    }

    async addNote(connection, data ) {
        let { content, context, context_id, user_id,notes_category } = data;
        let result;

        result = await models.Notes.add(connection, data);

        switch (context) {
            case 'interaction':
                result = await models.Notes.add(connection, { content, context: 'interaction_id', context_id, last_modified_by: user_id,notes_category });
                break;
            case 'contact':
                result = await models.Notes.add(connection, { content, context: 'contact_id', context_id, last_modified_by: user_id,notes_category });
            default:
                throw new Error(`context not implemented! ${context}`);
        }


        return result;
    }
    async findByInteractionId(connection, interaction_id) {
        let notes = await models.Notes.findNotesByInteraction(connection, interaction_id);
        return notes;
    }

    async find(connection) {
        let note = await models.Notes.findById(connection, this.id);
        this.note = note;
    }

    async save(connection) {
        let save = {
            content: this.content,
            interaction_id: this.interaction_id,
            contact_id: this.contact_id,
            pinned: this.pinned || 0,
            context: this.context,
            last_modified_by: this.last_modified_by
        }
        this.id = await models.Notes.save(connection, save, this.id);
    }

    async update(data) {
        if(typeof data.content !== 'undefined') this.content = data.content || '';
        if(typeof data.interaction_id !== 'undefined') this.interaction_id = data.interaction_id || '';
        if(typeof data.last_modified_by !== 'undefined') this.last_modified_by = data.last_modified_by || '';
        if(typeof data.pinned !== 'undefined') this.pinned = data.pinned || '';
        if(typeof data.context !== 'undefined') this.context = data.context || '';
        if(typeof data.contact_id !== 'undefined') this.contact_id = data.contact_id || '';
    }


    async findLastModifiedBy(connection) {
        if (this.last_modified_by) {
            this.last_modified_by = new Contact({ id: this.last_modified_by });
            await this.last_modified_by.find(connection, this.last_modified_by.company_id);
            await this.last_modified_by.getRole(connection, this.last_modified_by.company_id);
        }
    }

    static async getNotes(filter, { connection }) {

        let { context, context_id } = filter;
        // change the control logic here to add more getnote modes
        let result;

        switch (context) {
            case 'interaction':
                result = await models.Notes.get(connection, { context: 'interaction_id', context_id });
                break;
            case 'contact':
                result = await models.Notes.get(connection, { context: 'contact_id', context_id });
            default:
                throw new Error(`context not implemented! ${context}`);
        }

        return result;
    }
    static async getNotesCatagories(connection) {
        let notes_catagories = await models.Notes.getNotesCatagories(connection);
        return notes_catagories;
    }

    get note() {

        return {
            id: this.id,
            content: this.content,
            interaction_id: this.interaction_id,
            contact_id: this.contact_id,
            pinned: this.pinned,
            context: this.context,
            last_modified_by: this.last_modified_by,
            created: this.created
        }
    }

    set note(data) {

        let hasVal = !!(!_.isEmpty(data) || data)
        if (hasVal) {
            this.id = data.id || this.id;
            this.content = data.content || this.content;
            this.interaction_id = data.interaction_id || this.interaction_id;
            this.last_modified_by = data.last_modified_by || this.last_modified_by;
            this.created = data.created || this.created;
            this.pinned = data.pinned || 0;
            this.context = data.context || this.context;
            this.contact_id = data.contact_id
        }
    }
}

module.exports = Note;