var settings = require(__dirname + '/../config/settings.js');

module.exports = {

    findById(connection, id) {
        let sql = `select * from delinquencies where id = ${connection.escape(id)} `;
        console.log(sql);
        return connection.queryAsync(sql).then(r => r.length ? r[0] : null);
    },

    findByLeaseId(connection, lease_id, include_paused) {
        let sql = `select * from delinquencies where lease_id = ${connection.escape(lease_id)}  and end_date is null`;

        if (include_paused) {
            sql += ` and (status = 'active' or status = 'paused')`;
        } else {
            sql += ` and status = 'active'`;
        }


        console.log("findByLeaseId", sql);
        return connection.queryAsync(sql).then(r => r.length ? r[0] : null);

    },

    findActionsByDelinquencyId(connection, delinquency_id, date) {
        let sql = `select *, (select slug from delinquency_action_types where id = delinquencies_actions.delinquency_action_type_id) as action, (select name from delinquency_action_types where id = delinquencies_actions.delinquency_action_type_id) as action_name from delinquencies_actions where delinquencies_id = ${connection.escape(delinquency_id)} and deleted is null order by execution_date asc `;
        if (date) {
            sql += ` and execution_date = ${connection.escape(date)}`;
        }
        console.log("findActionsByDelinquencyId", sql)
        return connection.queryAsync(sql);
    },

    findFutureTriggersByDelinquencyId(connection, delinquency_id, date) {

        let sql = `select *, t.id as trigger_id, i.id as invoice_id,
            DATE_ADD(i.due,  INTERVAL (select (IFNULL(SUM(total_days), 0) + t.start) from delinquencies_pauses where delinquencies_id =  ${connection.escape(delinquency_id)}) DAY) as execution_date,
            DATE_ADD(i.due,  INTERVAL t.start DAY) as trigger_date,
            (select group_concat(id) from trigger_fee tf where active = 1 and tf.trigger_id = t.id) as fee_ids,
            (select group_concat(id) from trigger_events te where active = 1 and te.trigger_id = t.id) as task_ids,
            (select group_concat(id) from trigger_attachment ta where active = 1 and ta.trigger_id = t.id and document_id is not null) as document_ids,
            (select group_concat(id) from trigger_attachment ta where active = 1 and ta.trigger_id = t.id and document_id is null) as message_ids
            from invoices i LEFT JOIN triggers t on i.property_id in (select property_id from property_trigger_groups ptg where ptg.trigger_group_id = t.trigger_group_id and ptg.trigger_group_id in (select id from trigger_groups where active = 1 ) and ptg.deleted_at is null )
            where 1=1 
                and t.active = 1
                and i.status = 1
                and lease_id = (select lease_id from delinquencies where id = ${connection.escape(delinquency_id)}) 
                
                and i.id in (select invoice_id from invoice_lines where product_id in (select id from products where default_type = 'rent'))
                and (i.due = (select start_date from delinquencies where id = ${connection.escape(delinquency_id)}) or t.apply_to_all = 1)
                and t.id not in (select trigger_id from delinquencies_actions where delinquencies_id = ${connection.escape(delinquency_id)})`;

        if (date) {
            sql += ` and execution_date = ${connection.escape(date)}`;
        }
        console.log("findFutureTriggersByDelinquencyId", sql.replace(/[\r\n]+/g, " "))
        return connection.queryAsync(sql);
    },
    findPausesByDelinquencyId(connection, delinquency_id, date) {
        let sql = `select * from delinquencies_pauses where delinquencies_id = ${connection.escape(delinquency_id)} order by start asc `;

        return connection.queryAsync(sql);
    },
    getActivePauseByDelinquencyId(connection, delinquency_id) {
        let sql = `select * from delinquencies_pauses where delinquencies_id = ${connection.escape(delinquency_id)} and end is null `;

        return connection.queryAsync(sql).then(r => r.length ? r[0] : null);
    },
    findDelinquenciesToExecuteAtProperty(connection, property_id, date) {
        let sql = `select * from delinquencies where 
            lease_id in (select id from leases where unit_id in (select id from units where property_id = ${connection.escape(property_id)}))
            and id in (select delinquencies_id from delinquencies_actions where execution_date = ${connection.escape(date)}`;
        return connection.queryAsync(sql);
    },

    findLeasesWithDelinquencyActionsOnDate(connection, property_id, date) {
        let sql = `select lease_id from delinquencies where 
            status = 'active'
            and lease_id in (select id from leases where unit_id in (select id from units where property_id = ${connection.escape(property_id)}))
            and id in (select delinquencies_id from delinquencies_actions where deleted is null and completed is null and execution_date = ${connection.escape(date)} )
            group by lease_id `;

        return connection.queryAsync(sql);
    },


    getDelinquentLeasesByContactId(connection, contact_id, properties = []) {
        let sql = `select * from delinquencies where 
        ( status = 'active' or status = 'paused' ) and 
        lease_id in (select lease_id from contact_leases where contact_id = ${connection.escape(contact_id)})`;

        if (properties.length) {
            sql += ` and lease_id in (select id from leases where unit_id in (select id from units where property_id in  (${properties.map(p => connection.escape(p)).join(', ')} )))`;
        }
        console.log("ssssql", sql);

        return connection.queryAsync(sql);

    },

    findActionsByTriggerId(connection, trigger_id) {
        let sql = `select (select slug from delinquency_action_types where id = delinquencies_actions.delinquency_action_type_id) as action, (select name from delinquency_action_types where id = delinquencies_actions.delinquency_action_type_id) as action_name  from delinquencies_actions where trigger_id = ${connection.escape(trigger_id)} and deleted is null`;

        return connection.queryAsync(sql);
    },


    findDeliveryMethods(connection, delinquencies_actions_id) {
        let sql = `select *, 
            ddm.id as id, 
            (select CONCAT(first, ' ' , last) from contacts where id = (select contact_id from interactions where id = ddm.interaction_id)) as sent_to
            from delinquencies_delivery_methods ddm LEFT JOIN delivery_methods dm on ddm.delivery_methods_id = dm.id  where delinquencies_actions_id =  ${connection.escape(delinquencies_actions_id)} and active = 1`;
        console.log("findDeliveryMethods sql ", sql);
        return connection.queryAsync(sql);
    },

    removeActionsByTriggerId(connection, trigger_id) {
        let sql = `update delinquencies_actions set deleted = NOW() where trigger_id = ${connection.escape(trigger_id)} and completed is null and deleted is null and  DATE_ADD( (select start_date from delinquencies where id = delinquencies_actions.delinquencies_id ), INTERVAL (select start from triggers where id = ${connection.escape(trigger_id)}) DAY) > CURDATE()`;
        return connection.queryAsync(sql);
    },

    savePause(connection, data, pause_id) {
        let sql = '';
        if (pause_id) {
            sql = `UPDATE delinquencies_pauses set ? where id =  ${connection.escape(pause_id)}`;
        } else {
            sql = `INSERT INTO delinquencies_pauses set ? `;
        }

        return connection.queryAsync(sql, data);
    },

    saveAction(connection, data, action_id) {
        let sql = '';
        if (action_id) {
            sql = `UPDATE delinquencies_actions set ? where id =  ${connection.escape(action_id)}`;
        } else {
            sql = `INSERT INTO delinquencies_actions set ? `;
        }
        return connection.queryAsync(sql, data);
    },

    updateDelinquencyActionDate(connection, delinquencies_id) {
        let sql = `UPDATE delinquencies_actions set execution_date = DATE_ADD(date, INTERVAL (select SUM(total_days) from delinquencies_pauses where delinquencies_id =  ${connection.escape(delinquencies_id)} ) DAY)
            where completed is null and deleted is null and delinquencies_id =  ${connection.escape(delinquencies_id)}
        `;
        console.log("updateDelinquencyActionDate sql", sql)
        return connection.queryAsync(sql);
    },

    swapInvoiceIds(connection, old_invoice_id, new_invoice_id) {
        let sql = `update delinquency_actions set past_due_invoice_id = ${connection.escape(new_invoice_id)} where past_due_invoice_id = ${connection.escape(old_invoice_id)}`;
        console.log("swapInvoiceIds sql", sql)
        return connection.queryAsync(sql);
    },
    save(connection, data, delinquencies_id) {
        var sql;
        if (delinquencies_id) {
            sql = "UPDATE delinquencies set ? where id = " + connection.escape(delinquencies_id);
        } else {
            sql = "insert into delinquencies set ? ";
        }

        console.log("Delinquency save sql", connection.format(sql, data))
        return connection.queryAsync(sql, data).then(r => delinquencies_id ? delinquencies_id : r.insertId);
    },

    /******         
        What this does:

        Adds all actions of a type to all delinquencies that meet the criteria

        - When lease_id is passed in, add actions today and earlier.  All should be run.  e.g when voiding a payment that should return the tenant to the delinquency process. 
        - When date is passed in, add actions for the date only.  e.g. when running daily cron jobs
        - When no date or lease_id, add actions for today and earlier. Subset should be run only. e.g. during migrations

        - Never add actions that have already been added
        (Now multiple actions can be added in same delinquency stage - see INC-1350)
   
    *******/

    async addTimelineAction(connection, action, description, reference_id, trigger_id, trigger_start, property_id, date, recurring, lease_id, run_actions) {
        curdate = date ? date : moment().format('YYYY-MM-DD');
        let actions_to_not_process = ['message', 'document', 'fee', 'task'];
        let sql = ` insert into delinquencies_actions (delinquencies_id, past_due_invoice_id, delinquency_action_type_id, description, reference_id, trigger_id, execution_date, date, recurred, completed)

            SELECT (select id from delinquencies where lease_id = invoices.lease_id and status in ('active', 'paused') ),
            id,
            (select id from delinquency_action_types where slug = ${connection.escape(action)}),
            ${connection.escape(description)},
            ${connection.escape(reference_id)},
            ${connection.escape(trigger_id)}, 
            DATE_ADD(invoices.due, INTERVAL (select IFNULL(SUM(total_days), 0) + ${connection.escape(trigger_start)} from delinquencies_pauses where delinquencies_id =  (select id from delinquencies where lease_id = invoices.lease_id and status = 'active' and end_date is null) ) DAY),
            DATE_ADD(invoices.due, INTERVAL ${connection.escape(trigger_start)} DAY),
            (select if ( (select start_date from delinquencies where lease_id = invoices.lease_id and status in ('active', 'paused')) = invoices.due, 0, 1 )),
            ${lease_id || date || (run_actions && actions_to_not_process.indexOf(action) < 0) ? 'null' : 'CURDATE()'}
            FROM invoices WHERE 1 = 1 `;

        sql += ` and lease_id in (select id from leases where unit_id in (select id from units where property_id =  ${connection.escape(property_id)} )) `

        if (lease_id) {
            sql += ` and lease_id = ${connection.escape(lease_id)}`;
        }



        sql += `and lease_id in ( select lease_id from delinquencies where status in ('active', 'paused') `;

        // at this point, it doesnt matter if the invoice is past due or not, if the delinquency process still open, it should trigger the actions to run, unless it is a recurring action, then the invoice should be past due. 
        if (!recurring) {
            // if this action isnt recurring, then we should only find the first invoices that are past due.  Here, the due date will be equal to the delinquency start date. 
            sql += `and start_date = invoices.due `
        } else {
            // only find invoices that are currently past due, and only find rent invoices. 
            sql += ` and subtotal + total_tax - total_discounts > total_payments and invoices.id in (select invoice_id from invoice_lines where product_id in (select id from products where default_type = 'rent')) `;
        }

        sql += `and status = 1 and void_date is null and voided_at is null and voided_by_contact_id is null `;




        sql += `and DATE_ADD( start_date, INTERVAL ${connection.escape(trigger_start)} DAY) <= ${connection.escape(curdate)} `;

        sql += `and id not in ( select delinquencies_id from delinquencies_actions where trigger_id = ${connection.escape(trigger_id)}`;

        // Actions which can be added multiple times (eg: fees, documents) have reference id in them
        if (reference_id) {
            sql += ` and reference_id = ${connection.escape(reference_id)}`;
        }

        sql += ` and delinquency_action_type_id = (select id from delinquency_action_types where slug = ${connection.escape(action)}) and deleted is null and date = DATE_ADD( invoices.due, INTERVAL ${connection.escape(trigger_start)} DAY) ) `;
        sql += `) `;


        let comparison = date ? '=' : "<="; // if this is run on a date, the trigger start plus due should be current date. If not, run for all invoices in the past as well. 
        sql += `and DATE_ADD( due, INTERVAL ${connection.escape(trigger_start)} DAY) ${comparison}  ${connection.escape(curdate)} `;

        console.log("addTimelineAction sql", sql.replace(/(\r\n|\n|\r)/gm, ""))

        let res = await connection.queryAsync(sql);

        return {
            insertId: res.insertId,
            rowCount: res.affectedRows
        }
    },

    findDelinencyActionTypes(connection) {
        let sql = `Select * from delinquency_action_types`;
        return connection.queryAsync(sql);
    },

    addTimelineDeliveryMethods(connection, data) {
        let sql = `INSERT INTO delinquencies_delivery_methods  (delinquencies_actions_id, message, subject, method ) VALUES ? `;
        return connection.queryAsync(sql, data);

    },


    getNewDelinquenciesByPropertyId(connection, property_id, date) {

        let sql = ` select * from delinquencies where 
		  start_date = DATE_SUB(${connection.escape(date)}, INTERVAL 1 DAY) 
			and status = "active"
			and lease_id in (select id from leases where unit_id in (select id from units where property_id = ${connection.escape(property_id)} ));`;

        return connection.queryAsync(sql);
    },
    createDelinquencies(connection, property_id, date, lease_id) {

        curdate = date ? date : moment().format('YYYY-MM-DD');

        let sql = `INSERT INTO delinquencies (lease_id, start_date)
		  SELECT lease_id, due
		  FROM invoices WHERE 1 = 1
            and status = 1 `;

        if (lease_id) {
            sql += `and lease_id = ${connection.escape(lease_id)} `
        }

        sql += `and lease_id in (select id from leases where status = 1 and (end_date is null or end_date >= ${connection.escape(curdate)} ))
			and lease_id not in (select lease_id from delinquencies where status <> 'completed')
            and property_id = ${connection.escape(property_id)}
            and id in (select invoice_id from invoice_lines where product_id in (select id from products where default_type = 'rent')) `;

        if (date) {
            sql += ` and due = DATE_SUB(${connection.escape(date)}, INTERVAL 1 DAY) `;
        } else {
            sql += ` and due < ${connection.escape(curdate)} `;
        }

        sql += ` and subtotal + total_tax - total_discounts > total_payments
                GROUP BY lease_id
                HAVING min(due);`;

        console.log("createDelinquencies sql", sql.replace(/(\r\n|\n|\r)/gm, ""))

        return connection.queryAsync(sql);

    },
}