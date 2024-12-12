class TodosQueries {
    constructor(data){
        this.id = data.id;
        this.property_id = data.property_id;

        this.queries = {
            todo_id:                this.id,
            todo_created_by:      `(SELECT IFNULL((SELECT CONCAT(first, ' ', last ) FROM contacts where id = (SELECT created_by from todos where id = ${this.id})), (SELECT name from api_keys where id = (SELECT apikey_id from todos where id = ${this.id}))))`,
            todo_created_at:        `(DATE(DATE_FORMAT(CONVERT_TZ((SELECT created_at from events where id = (select event_id from todos where id = ${this.id} )) , "+00:00", (SELECT utc_offset FROM properties WHERE id =  
                (SELECT 
                    IF(
                        ('rate_change' in (SELECT object_type FROM event_objects WHERE event_id = (SELECT event_id FROM todos WHERE id =   ${this.id}  ))), 
                        (SELECT property_id FROM rate_changes WHERE id = (SELECT eo.object_id FROM event_objects eo WHERE eo.object_type = 'rate_change' AND eo.event_id = (SELECT event_id FROM todos WHERE id =   ${this.id}  ) ) ), 
            
                    IF(
                        ('lease' in (SELECT object_type FROM event_objects WHERE event_id = (SELECT event_id FROM todos WHERE id =   ${this.id}  ))),
                        (SELECT property_id FROM units WHERE id = (SELECT l.unit_id FROM leases l WHERE l.id = (SELECT eo.object_id FROM event_objects eo WHERE eo.object_type = 'lease' AND eo.event_id = (SELECT event_id FROM todos WHERE id =   ${this.id}  ) ) ) ),
                        
                        IF(
                            ('contact' in (SELECT object_type FROM event_objects WHERE event_id = (SELECT event_id FROM todos WHERE id =   ${this.id}  ))),
                            (SELECT property_id FROM leads WHERE id = (SELECT eo.object_id FROM event_objects eo WHERE eo.object_type = 'contact' AND eo.event_id = (SELECT event_id FROM todos WHERE id =   ${this.id}  ) ) ),
                            null
                        )
                    )
                )
            ))) ,"%Y-%m-%d %H:%i:%s")))`,
            todo_completed_date:    `(SELECT completed_at from todos where id = ${this.id})`,
            todo_completed_by:      `(SELECT IFNULL((SELECT CONCAT(first, ' ', last ) FROM contacts where id = (SELECT completed_by from todos where id = ${this.id})), (SELECT name from api_keys where id = (SELECT apikey_id from todos where id = ${this.id}))))`,
            todo_created_by:        `(SELECT IFNULL((SELECT CONCAT(first, ' ', last ) FROM contacts where id = (SELECT created_by from todos where id = ${this.id})), (SELECT name from api_keys where id = (SELECT apikey_id from todos where id = ${this.id}))))`,
            todo_summary:           `(SELECT details from todos where id = ${this.id})`,
            todo_description:       `(SELECT et.text from event_types et where et.id = (select e.event_type_id from events e where e.id = (select event_id from todos where id = ${this.id})))`,
            todo_original_date:     `(SELECT original_date from todos where id = ${this.id})`,
            todo_original_date_for_sched_move_out:     `(SELECT original_date from todos where id = ${this.id})`,
            todo_original_time:     `(SELECT TIME(CONVERT_TZ(original_date , "+00:00", IFNULL((select utc_offset from properties where id = ${this.property_id}), "+00:00"))) from todos where id = ${this.id})`,
        }

    }
}

module.exports = TodosQueries;