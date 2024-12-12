var moment = require('moment');
var e  = require(__dirname + '/../modules/error_handler.js');

class Task {
    constructor(data) {
        data = data || {};
        this.company_id = data.company_id;
        this.created_by = data.created_by;
        //! NOTE: This must be a valid event_type enum defined in /modules/enums
        this.event_type = data.event_type;
        this.event_title = data.event_title;
        this.event_details = data.event_details;
        this.event_duration = data.event_duration;
        this.is_all_day_event = data.is_all_day_event;
        this.group_id = data.group_id;
        this.details = data.details;
        this.snoozed_count = data.snoozed_count;
        this.completed = data.completed;
        this.object_id = data.object_id;
        //!Task type is going to be set from enum TASK_TYPE
        this.task_type = data.task_type;
    }

    async save(connection, company_id, date) {
        let datetime = date ? moment(date, 'YYYY-MM-DD') : moment();
        
        var event = this.createEvent(datetime);
        await event.findEventType(connection, this.event_type);
        await event.setEventEndDate(connection, {lease_id: this.object_id, contact_id: this.created_by});

        if(!event.event_type) e.th(404, "Event type not found");
        await event.save(connection);
        
        if (this.task_type) {
            await event.saveEventObject(connection, this.object_id, this.task_type);
        } 
        
        var todo = await this.createTodo(connection, event.id, company_id, datetime);
        await todo.save(connection);

        return todo.id;
    }

    createEvent(datetime) {        
        return new Event({
            company_id: this.company_id,
            created_by: this.created_by,
            start_date: datetime.startOf('day').utc().format('YYYY-MM-DD HH:mm:ss'),
            title: this.event_type.name,
            details: this.event_details,
            duration: this.event_duration,
            is_all_day: this.is_all_day_event,
            type: 'todo',
            group_id: this.group_id
        });
    }

    async createTodo(connection, event_id, company_id, datetime) {
        var todo = new Todo({
            original_date: datetime.endOf('day').utc().format('YYYY-MM-DD HH:mm:ss'),
            created_by: this.created_by,
            object_id: this.lease_id || this._contact_id,
            event_id: event_id,
            details: this.details,
            snoozed_count: this.snoozed_count,
            completed: this.completed
        });
        if (this.contact_id && this.contact_id > 0) {
            let contact = new Contact({ id: this.contact_id });
            await contact.find(connection);
            await contact.verifyAccess(company_id);
            todo.contact_id = contact.id;
        } else {
            todo.contact_id = null
        }
        return todo;
    }
}

module.exports = Task;

var Event = require('../classes/event.js');
var Todo = require('../classes/todo.js');
var Contact = require('../classes/contact.js');
var ActivityObject = require('../classes/activity_object.js');
var { TASK_TYPE } = require('../modules/enums');