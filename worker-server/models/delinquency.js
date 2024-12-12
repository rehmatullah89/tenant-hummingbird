var settings = require(__dirname + '/../config/settings.js');
var moment = require('moment');
const ENUMS = require('../modules/enums');

module.exports = {

    findById(connection, id) {
        let sql = `select * from delinquencies where id = ${connection.escape(id)};`;
        console.log(sql);
        return connection.queryAsync(sql).then(r => r.length ? r[0] : null);
    },

    findByLeaseId(connection, lease_id, params = {}) {
        let { delinquency_statuses = [ENUMS.DELINQUENCY_STATUS.ACTIVE] } = params;

        let sql = `select * from delinquencies where lease_id = ${connection.escape(lease_id)} and 
                status in (${delinquency_statuses.map(ds => connection.escape(ds)).join(',')}) 
                and end_date is null;`;

        return connection.queryAsync(sql).then(r => r.length ? r[0] : null);

    },

    findActionsByDelinquencyId(connection, delinquency_id, date) {
        let sql = `select *, (select slug from delinquency_action_types where id = delinquencies_actions.delinquency_action_type_id) as action, (select name from delinquency_action_types where id = delinquencies_actions.delinquency_action_type_id) as action_name from delinquencies_actions where delinquencies_id = ${connection.escape(delinquency_id)} and deleted is null `;
        if (date) {
            sql += ` and execution_date = ${connection.escape(date)}`;
        } else {
            sql += ` and execution_date < CURDATE() `;
        }


        sql += ` order by execution_date asc `;

        console.log("findActionsByDelinquencyId sql", sql);
        return connection.queryAsync(sql);
    },

    findDelinquenciesToExecuteAtProperty(connection, property_id, date) {
        let sql = `select * from delinquencies where 
            lease_id in (select id from leases where unit_id in (select id from units where property_id = ${connection.escape(property_id)}))
            and id in (select delinquencies_id from delinquencies_actions where execution_date = ${connection.escape(date)}`;
        return connection.queryAsync(sql);
    },


    findLeasesWithOpenDelinquencyActions(connection, property_id, date) {
        let sql = `select lease_id from delinquencies where 
            status = 'active'
            and lease_id in (select id from leases where unit_id in (select id from units where property_id = ${connection.escape(property_id)}))
            and id in (select delinquencies_id from delinquencies_actions where deleted is null and completed is null )
            group by lease_id `;


        return connection.queryAsync(sql);
    },

    findLeasesWithDelinquencyActionsOnDate(connection, property_id, date) {
        let sql = `select lease_id from delinquencies where 
            status = 'active'
            and lease_id in (select id from leases where status = 1 and (end_date is null or end_date > ${connection.escape(date)}) and unit_id in (select id from units where property_id = ${connection.escape(property_id)}))
            and id in (select delinquencies_id from delinquencies_actions where deleted is null and completed is null and execution_date = ${connection.escape(date)} )
            group by lease_id `;

        console.log("findLeasesWithDelinquencyActionsOnDate sql", sql.replace(/(\r\n|\n|\r)/gm, ""))
        return connection.queryAsync(sql);
    },

    getDelinquentLeasesByContactId(connection, contact_id, properties = []) {
        let sql = `select * from delinquencies where 
        lease_id in (select lease_id from contact_leases where contact_id = ${connection.escape(contact_id)})`;

        if (properties.length) {
            sql += ` and lease_id in (select id from leases where unit_id in (select id from units where property_id in  ${properties.map(p => connection.escape(p)).join(', ')} ))`;
        }


        return connection.queryAsync(sql);

    },
    findActionsByTriggerId(connection, trigger_id) {
        let sql = `select *, (select slug from delinquency_action_types where id = delinquencies_actions.delinquency_action_type_id) as action, (select name from delinquency_action_types where id = delinquencies_actions.delinquency_action_type_id) as action_name from delinquencies_actions where trigger_id = ${connection.escape(trigger_id)} and deleted is null`;

        return connection.queryAsync(sql);
    },

    findDeliveryMethods(connection, delinquencies_actions_id) {
        let sql = `select *, ddm.id as id from delinquencies_delivery_methods ddm LEFT JOIN delivery_methods dm on ddm.delivery_methods_id = dm.id  where delinquencies_actions_id = ${connection.escape(delinquencies_actions_id)} and active = 1`;
        console.log("sql", sql)
        return connection.queryAsync(sql);
    },

    removeActionsByTriggerId(connection, trigger_id) {
        let sql = `update delinquencies_actions set deleted = NOW() where trigger_id = ${connection.escape(trigger_id)} and completed is null and deleted is null`;
        return connection.queryAsync(sql);
    },

    removeDeliveryMethodsByTriggerId(connection, trigger_id) {
        let sql = `update delinquencies_delivery_methods set active = 0  where delinquencies_actions_id in (select id from delinquencies_actions where trigger_id = ${connection.escape(trigger_id)} )`;
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

    saveDeliveryMethod(connection, data, delinquencies_delivery_methods_id) {
        let sql = '';
        if (delinquencies_delivery_methods_id) {
            sql = `UPDATE delinquencies_delivery_methods set ? where id =  ${connection.escape(delinquencies_delivery_methods_id)}`;
        } else {
            sql = `INSERT INTO delinquencies_delivery_methods set ? `;
        }

        return connection.queryAsync(sql, data);
    },


    updateLeaseStandings(connection, property_id) {

        let sql = `update leases set lease_standing_id = (select lease_standing_id from triggers where id = 
            (select trigger_id from delinquencies_actions where 
                delinquency_action_type_id = (select id from delinquency_action_types where slug = 'lease_standing' )
                and DATE_ADD(delinquencies_actions.execution_date, INTERVAL (select IFNULL(SUM(total_days),0)  from delinquencies_pauses where delinquencies_id = delinquencies_actions.delinquencies_id) DAY) <= CURDATE() 
                and ( 
                    (select MIN(start) from delinquencies_pauses where delinquencies_id = delinquencies_actions.delinquencies_id) is null 
                    or (select MIN(start) from delinquencies_pauses where delinquencies_id = delinquencies_actions.delinquencies_id) < execution_date
                )
                order by execution_date DESC limit 1
            )
        ) where 
            (end_date is null or end_date  > CURDATE()) and status = 1
            and unit_id in (select id from units where property_id = ${connection.escape(property_id)})
            and id in (select lease_id from delinquencies where status in ('active', 'paused')) `;

        return connection.queryAsync(sql);

    }, 

    async addTimelineAction(connection, action, description, reference_id, trigger_id, trigger_start, property_id, date, lease_id, run_actions, action_source){
        curdate = date ? date : moment().format('YYYY-MM-DD');  
        let actions_to_not_process = ['message', 'document', 'fee', 'task'];
        let sql = `
            SELECT 
                delinquencies.id,
                null as past_due_invoice_id,
                (select id from delinquency_action_types where slug = ${connection.escape(action)}) as delinquency_action_type_id,
                ${connection.escape(description)} as description,
                ${connection.escape(reference_id)} as reference_id, 
                ${connection.escape(trigger_id)} as trigger_id, 
                DATE_ADD(delinquencies.start_date, INTERVAL (select IFNULL(SUM(total_days), 0) + ${connection.escape(trigger_start)} from delinquencies_pauses where delinquencies_id =  delinquencies.id ) DAY) as execution_date,
                DATE_ADD(delinquencies.start_date, INTERVAL ${connection.escape(trigger_start)} DAY) as date,
                0 as recurred,
                ${lease_id || date || (run_actions && actions_to_not_process.indexOf(action) < 0) ? 'null' : 'CURDATE()'} as completed,
                ${connection.escape(action_source)} as source
                FROM delinquencies WHERE 1 = 1 `;

            sql += ` and delinquencies.lease_id in (select id from leases where unit_id in (select id from units where property_id =  ${connection.escape(property_id)} )) `
            
            if(lease_id){
                sql += ` and delinquencies.lease_id = ${connection.escape(lease_id)} `;
            }

            sql += ` and delinquencies.status in ('active', 'paused') `;  
    
            // sql += ` and DATE_ADD( delinquencies.start_date, INTERVAL ${connection.escape(trigger_start)} DAY) = ${ connection.escape(curdate) } `;  
 
            sql +=  ` and delinquencies.id not in ( select delinquencies_id from delinquencies_actions where trigger_id = ${connection.escape(trigger_id)}`;

            // Actions which can be added multiple times (eg: fees, documents) have reference id in them
            if(reference_id) { 
                sql += ` and reference_id = ${connection.escape(reference_id)}`;
            }            

            sql += ` and delinquency_action_type_id = (select id from delinquency_action_types where slug = ${connection.escape(action)}) `
            sql += ` and deleted is null `;
            sql += ` and date = DATE_ADD( delinquencies.start_date, INTERVAL ${connection.escape(trigger_start)} DAY) ) `;
            

        
            let comparison = date ? '=' : "<="; // if this is run on a date, the trigger start plus due should be current date. If not, run for all invoices in the past as well. 
            sql += ` and DATE_ADD( delinquencies.start_date, INTERVAL ${connection.escape(trigger_start)} DAY) ${ comparison }  ${ connection.escape(curdate) } `;

            console.log("addTimelineAction get sql", sql.replace(/(\r\n|\n|\r)/gm, ""))

            let result = await connection.queryAsync(sql);

            if(result?.length > 0) {
                return await this.saveTimelineAction(connection, result);
            }
        
            return {
                insertId: null,
                rowCount: 0
            }    
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

    async addRecurringTimelineAction(connection, action, description, reference_id, trigger_id, trigger_start, property_id, date, lease_id, run_actions, action_source){
        curdate = date ? date : moment().format('YYYY-MM-DD');  
        let actions_to_not_process = ['message', 'document', 'fee', 'task'];
        let sql = `
            SELECT (select id from delinquencies where lease_id = invoices.lease_id and status in ('active', 'paused') )  as delinquencies_id,
            id as past_due_invoice_id,
            (select id from delinquency_action_types where slug = ${connection.escape(action)}) as delinquency_action_type_id,
            ${connection.escape(description)} as description,
            ${connection.escape(reference_id)} as reference_id,
            ${connection.escape(trigger_id)} as trigger_id,
            DATE_ADD(invoices.due, INTERVAL (select IFNULL(SUM(total_days), 0) + ${connection.escape(trigger_start)} from delinquencies_pauses where delinquencies_id =  (select id from delinquencies where lease_id = invoices.lease_id and status = 'active' and end_date is null) ) DAY) as execution_date,
            DATE_ADD(invoices.due, INTERVAL ${connection.escape(trigger_start)} DAY) as date,
            (select if ( (select start_date from delinquencies where lease_id = invoices.lease_id and status in ('active', 'paused')) = invoices.due, 0, 1 )) as recurred,
            ${lease_id || date || (run_actions && actions_to_not_process.indexOf(action) < 0) ? 'null' : 'CURDATE()'} as completed,
            ${connection.escape(action_source)} as source
            FROM invoices WHERE 1 = 1 `;

            sql += ` and lease_id in (select id from leases where unit_id in (select id from units where property_id =  ${connection.escape(property_id)} )) `
            
            if(lease_id){
                sql += ` and lease_id = ${connection.escape(lease_id)} `;
            }

            sql += ` and lease_id in ( select lease_id from delinquencies where status in ('active', 'paused') `;  
            
            // at this point, it doesnt matter if the invoice is past due or not, if the delinquency process still open, it should trigger the actions to run, unless it is a recurring action, then the invoice should be past due. 
        //     if(!recurring){ 
        //         // if this action isnt recurring, then we should only find the first invoices that are past due.  Here, the due date will be equal to the delinquency start date. 
        //         sql += ` and delinquencies.start_date = invoices.due `
        //     } else {
        //     // only find invoices that are currently past due, and only find rent invoices. 
        // }
            sql += ` and invoices.subtotal + invoices.total_tax - invoices.total_discounts > invoices.total_payments `; 
            
            sql += ` and invoices.id in (select invoice_id from invoice_lines where invoice_lines.cost > 0 and invoice_lines.product_id in (select id from products where products.default_type = 'rent' and products.category_type = 'rent')) `;
            sql += ` and invoices.status = 1 and invoices.void_date is null and invoices.voided_at is null and invoices.voided_by_contact_id is null `;
        
            sql += ` and DATE_ADD( delinquencies.start_date, INTERVAL ${connection.escape(trigger_start)} DAY) <= ${ connection.escape(curdate) } `;  
            
            sql +=  `and id not in ( select delinquencies_id from delinquencies_actions where trigger_id = ${connection.escape(trigger_id)}`;

            // Actions which can be added multiple times (eg: fees, documents) have reference id in them
            if(reference_id) {
                sql += ` and reference_id = ${connection.escape(reference_id)}`;
            }            

            sql += ` and delinquency_action_type_id = (select id from delinquency_action_types where slug = ${connection.escape(action)}) and deleted is null and date = DATE_ADD( invoices.due, INTERVAL ${connection.escape(trigger_start)} DAY) ) `;
            sql += `) `; 

        
            let comparison = date ? '=' : "<="; // if this is run on a date, the trigger start plus due should be current date. If not, run for all invoices in the past as well. 
            sql += `and DATE_ADD( due, INTERVAL ${connection.escape(trigger_start)} DAY) ${ comparison }  ${ connection.escape(curdate) } `;

            console.log("add RecurringTimelineAction get sql", sql.replace(/(\r\n|\n|\r)/gm, ""))

            let result = await connection.queryAsync(sql);
        
            if (result?.length > 0) {
                return await this.saveTimelineAction(connection, result);
            }

            return {
                insertId: null,
                rowCount: 0
            }  

    },

    async saveTimelineAction(connection, data){
        const keys = Object.keys(data[0]);
        const values = data.map(d => keys.map(key => d[key]));

        let timelineActionInsertSql = `insert into delinquencies_actions (delinquencies_id, past_due_invoice_id, delinquency_action_type_id, description, reference_id, trigger_id, execution_date, date, recurred, completed, source) values ?`;
        let res = await connection.queryAsync(timelineActionInsertSql, [values]);
        return {
            insertId: res.insertId,
            rowCount: res.affectedRows
        }
    },
      
      addTimelineDeliveryMethods(connection, data){
        
        let sql = `INSERT INTO delinquencies_delivery_methods  (delinquencies_actions_id, message, subject, delivery_methods_id, recipient_type ) VALUES ? `;
        console.log("format", connection.format(sql, data)); 
        return connection.queryAsync(sql, data);

      },
      


    // addTimelineAction(connection, action, reference_id, trigger_id, trigger_start, property_id, date, recurring, reload){

    //     let qry_date = date ? connection.escape(date) : 'CURDATE()'; 

    //     let sql = ` insert into delinquencies_actions (delinquencies_id, invoice_id, action, reference_id, trigger_id, execution_date, date)
    //           SELECT id, ${connection.escape(action)}, id, ${connection.escape(reference_id)}, ${connection.escape(trigger_id)}, DATE_ADD(${qry_date}, INTERVAL ${connection.escape(trigger_start)} DAY), DATE_ADD(${qry_date}, INTERVAL ${connection.escape(trigger_start)} DAY) from delinquencies WHERE  
    //             (status = 'active' or status = 'paused' ) `;

    //         if(!recurring){
    //             // We are adding only for all newly created processes
    //             sql += ` and start_date = DATE_SUB(${qry_date}, INTERVAL 1 DAY) `; 
    //         } 

    //         // dont add triggers that have already been added
    //         sql += ` and id not in (select delinquencies_id from delinquencies_actions  where trigger_id = ${connection.escape(trigger_id)} and action = ${connection.escape(action)} and deleted is null and date = DATE_ADD(${qry_date}, INTERVAL ${connection.escape(trigger_start)} DAY) )`; 

    //         if(property_id){
    //             sql +=  ` and lease_id in (select id from leases where unit_id in (select id from units where property_id =  ${connection.escape(property_id)} ))`; 
    //         }

    //         sql +=  ` and lease_id in ( select lease_id from invoices where 1 = 1 `;
    //         if(reload){
    //             sql +=  ` and due <= DATE_SUB(${qry_date}, INTERVAL 1 DAY) `;
    //         } else {
    //             sql +=  `and due = DATE_SUB(${qry_date}, INTERVAL 1 DAY) `;
            
    //         }
    //         sql += `and id in (select invoice_id from invoice_lines where product_id in (select id from products where default_type = 'rent'))
    //             and subtotal + total_tax - total_discounts > total_payments 
    //         )`;

    //         console.log(sql); 
            
    //         return connection.queryAsync(sql); 
    //   },

    getNewDelinquenciesByPropertyId(connection, property_id, date) {

        let sql = ` select * from delinquencies where 
		  start_date = DATE_SUB(${connection.escape(date)}, INTERVAL 1 DAY) 
			and status = "active"
			and lease_id in (select id from leases where unit_id in (select id from units where property_id = ${connection.escape(property_id)} ));`;

        return connection.queryAsync(sql);
    },

    createDelinquencies(connection, data) {

        if(!data?.length) return; 

        let sql = `INSERT INTO delinquencies (lease_id, start_date, invoice_id, source) VALUES ?`

        console.log("createDelinquencies sql", connection.format(sql).replace(/(\r\n|\n|\r)/gm, ""))
        return connection.queryAsync(sql, [data]);

    },

    fetchDelinquentLeases(connection, property_id, date, lease_id) {
        let curdate = date ? date : moment().format('YYYY-MM-DD');

        let sql = `
            SELECT lease_id, due, invoice_id
            FROM (
                SELECT i.lease_id, i.due, i.id as invoice_id, row_number() over(partition by lease_id order by due) as row_num
                FROM invoices i
                JOIN leases l ON i.lease_id = l.id
                JOIN invoice_lines il ON il.invoice_id = i.id
                JOIN products p ON p.id = il.product_id
            WHERE 
                i.status = 1
                ${ lease_id ? ' and i.lease_id =' + connection.escape(lease_id) : ''}
                and l.status = 1 and (l.end_date is NULL or l.end_date >= ${connection.escape(curdate)} )
                and i.lease_id not in (select lease_id from delinquencies where status in ( 'active', 'paused' ) )
                and property_id = ${connection.escape(property_id)}
                and il.cost > 0
                and p.default_type = 'rent' and p.category_type = 'rent'
                ${date ? 'and i.due = DATE_SUB(' + connection.escape(date) +', INTERVAL 1 DAY)' : 'and i.due < ' + connection.escape(curdate)}
                and i.subtotal + i.total_tax - i.total_discounts > i.total_payments
            ) invoice_cte
            WHERE invoice_cte.row_num = 1`;

        console.log("delinquentLeases sql", sql.replace(/(\r\n|\n|\r)/gm, ""));
        return connection.queryAsync(sql);
    },

    save(connection, data, delinquencies_id) {
        var sql;
        if (delinquencies_id) {
            sql = "UPDATE delinquencies set ? where id = " + connection.escape(delinquencies_id);
        } else {
            sql = "insert into delinquencies set ? ";
        }

        console.log("save sql", connection.format(sql, data))
        return connection.queryAsync(sql, data).then(r => delinquencies_id ? delinquencies_id : r.insertId);
    },

    getActiveDelinquenciesWithNoPastDueBalance(connection, payload) {
        const { date = null, property_id, lease_id } = payload;

        let sql = `
            select l.id as lease_id, sum(i.subtotal + i.total_tax - i.total_discounts) as inv_amounts, sum(i.total_payments) as paid_amounts, d.id as delinquency_id, d.status, d.start_date 
            from invoices i
                join leases l on i.lease_id = l.id
                join properties p on i.property_id = p.id
                join delinquencies d on d.lease_id = l.id
            where 
                1=1`

        if (lease_id) {
            sql += ` and i.lease_id = ${lease_id}`
        } else if (property_id) {
            sql += ` and i.property_id = ${property_id}`
        }

        sql += ` and l.end_date is null and
                d.status in ('active', 'paused') and
                i.due <= ifnull(${connection.escape(date)}, date(date_add(now(), interval p.utc_offset hour))) and l.status = 1 and l.end_date is null and i.void_date is null
            group by i.lease_id
            having paid_amounts >= inv_amounts;
        `;

        console.log('Active delinquencies with no past due balance: ', sql);

        return connection.queryAsync(sql);
    },

    getDelinquentDocumentsByPropertyId(connection, property_id, date) {
        let sql = `
            SELECT 
                d.id as delinquencies_id,
                d.start_date,
                d.end_date,
                d.lease_id,
                d.status as delinquencies_status,
                da.id as delinquencies_action_id,
                da.upload_id,
                up.filename,
                up.destination,
                up.destination_file_path
            FROM delinquencies d
            INNER JOIN delinquencies_actions da on d.id = da.delinquencies_id
            INNER JOIN leases l on d.lease_id = l.id
            INNER JOIN units u on l.unit_id = u.id and u.property_id = ${connection.escape(property_id)}
            INNER JOIN uploads up on da.upload_id = up.id
            WHERE l.status = 1
            AND l.start_date <= ${connection.escape(date)}
            AND (l.end_date is null or l.end_date >= ${connection.escape(date)})
            AND da.execution_date = ${connection.escape(date)}
            AND da.delinquency_action_type_id = (SELECT id FROM delinquency_action_types WHERE slug = 'document')
            AND (d.end_date IS NULL OR ${connection.escape(date)} between d.start_date and d.end_date);`
        console.log('getDelinquentDocumentsByPropertyId sql => ', sql)
        return connection.queryAsync(sql);
    },

    //   addRecurringTimelineAction(connection, action, reference_id, trigger_id, trigger_start, property_id, date){
    //     let sql = ` insert into delinquencies_actions (delinquencies_id, action, reference_id, trigger_id, execution_date, date)
    //           SELECT id, ${connection.escape(action)}, ${connection.escape(reference_id)}, ${connection.escape(trigger_id)}, DATE_ADD(start_date, INTERVAL ${connection.escape(trigger_start)} DAY), DATE_ADD(start_date, INTERVAL ${connection.escape(trigger_start)} DAY) from delinquencies WHERE active = 1 `;

    //         if(date){
    //             // We are adding for all newly created processes
    //             sql += ` and start_date = DATE_SUB(${connection.escape(date)}, INTERVAL 1 DAY) `; 
    //         } else {
    //             // We are loading process for all current deliquent process that havent been added yet. For example, when updating 
    //         }
    //         sql += ` and id not in (select delinquencies_id from delinquencies_actions  where trigger_id = ${connection.escape(trigger_id)} and action = ${connection.escape(action)} and deleted is null )`; 

    //         if(property_id){
    //             ` and lease_id in (select id from leases where unit_id in (select id from units where property_id =  ${connection.escape(property_id)} ))`; 
    //         }

    //         console.log("date", date); 
    //         console.log("sql", sql); 

    //         return connection.queryAsync(sql); 
    //   }
}