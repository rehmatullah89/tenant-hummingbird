
module.exports =  {

  payments(company_id, property_ids, start_date, end_date) {

    let sql = `SELECT
                  pr.name As property_name,
                  concat(co.first, ' ', co.last) AS tenant_name,
                  GROUP_CONCAT(DISTINCT un.number SEPARATOR ', ') AS unit_number,
                  'Taking Payment' AS activity_name,
                  (CONVERT_TZ(p.created , "+00:00", ifnull(pr.utc_offset, "+00:00"))) AS date_time,
                  u.email AS user_name,
                  CASE
                  WHEN p.is_migrated = 1 THEN 'Migrated Payment'
                      WHEN p.accepted_by IS NOT NULL THEN CONCAT(c.first, ' ', c.last)
                      WHEN p.source = 'auto' THEN 'AutoPay'
                      WHEN p.source IN ('oftw', 'ofcoop', 'ofti') THEN 'Website Payment'
                      WHEN p.source = 'xps' THEN 'XPS'
                      ELSE 'Not Available'
                  END AS name,
                  c.employee_id
                FROM payments p
                  LEFT JOIN contacts c ON p.accepted_by = c.id
                  LEFT JOIN users u ON c.user_id = u.id
                  INNER JOIN properties pr ON pr.id = p.property_id
                  INNER JOIN contacts co ON co.id = p.contact_id
                  LEFT JOIN invoices_payments ip ON ip.payment_id = p.id
                  LEFT JOIN invoices invs ON invs.id = ip.invoice_id
                  LEFT JOIN leases ls ON ls.id = invs.lease_id
                  LEFT JOIN units un ON un.id = ls.unit_id
                WHERE pr.company_id = ${company_id}
                  AND p.property_id in (${property_ids})
                  AND date(CONVERT_TZ(p.created , "+00:00", ifnull(pr.utc_offset, "+00:00"))) between ${start_date} and 
                  ${end_date} 
                  GROUP BY p.id`

    return sql;
  },

  refund(company_id, property_ids, start_date, end_date) {
    let sql = `SELECT
                  pr.name As property_name,
                  concat(co.first, ' ', co.last) AS tenant_name,
                  GROUP_CONCAT(DISTINCT un.number SEPARATOR ', ') AS unit_number,
                  'Refunding Payments' AS activity_name,
                  r.date AS date_time,
                  u.email AS user_name,
                  CASE
                      WHEN r.created_by IS NOT NULL THEN CONCAT(c.first, ' ', c.last)
                      ELSE 'Not Available'
                  END AS name,
                  c.employee_id
                FROM refunds r
                  LEFT JOIN contacts c ON r.created_by = c.id
                  LEFT JOIN users u ON c.user_id = u.id
                  INNER JOIN payments p ON p.id = r.payment_id
                  INNER JOIN properties pr ON pr.id = p.property_id
                  INNER JOIN contacts co ON co.id = p.contact_id
                  LEFT JOIN invoices_payments ip ON ip.payment_id = p.id
                  LEFT JOIN invoices invs ON invs.id = ip.invoice_id
                  LEFT JOIN leases ls ON ls.id = invs.lease_id
                  LEFT JOIN units un ON un.id = ls.unit_id
                WHERE pr.company_id = ${company_id}
                  AND p.property_id in (${property_ids})
                  AND date(r.date) between ${start_date} and 
                  ${end_date}
                  GROUP BY r.id`;
                  
    return sql;
  },

  moveIn(company_id, property_ids, start_date, end_date) {
    let sql = `SELECT
                  pr.name As property_name,
                  concat(co.first, ' ', co.last) AS tenant_name,
                  un.number AS unit_number,
                  'Move In' AS activity_name,
                  (CONVERT_TZ(l.created , "+00:00", ifnull(pr.utc_offset, "+00:00"))) AS date_time,
                  u.email AS user_name,
                  CASE
                      WHEN l.created_by IS NOT NULL THEN CONCAT(c.first, ' ', c.last)
                      ELSE 'Not Available'
                  END AS name,
                  c.employee_id
                FROM leases l
                  LEFT JOIN contacts c ON l.created_by = c.id
                  LEFT JOIN users u ON c.user_id = u.id
                  INNER JOIN units un ON un.id = l.unit_id
                  INNER JOIN properties pr ON pr.id = un.property_id
                  INNER JOIN contact_leases cl ON cl.lease_id = l.id
                  INNER JOIN contacts co ON co.id = cl.contact_id
                WHERE l.status = 1
                  AND pr.company_id = ${company_id}
                  AND un.property_id in (${property_ids})
                  AND date(CONVERT_TZ(l.created , "+00:00", ifnull(pr.utc_offset, "+00:00"))) between ${start_date} and 
                  ${end_date} `;
    return sql;
  },

  voidInvoices(company_id, property_ids, start_date, end_date) {
    let sql = `SELECT
                  pr.name As property_name,
                  concat(co.first, ' ', co.last) AS tenant_name,
                  un.number AS unit_number,
                  'Voiding Invoices' AS activity_name,
                  (CONVERT_TZ(i.voided_at , "+00:00", ifnull(pr.utc_offset, "+00:00"))) AS date_time,
                  u.email AS user_name,
                  CASE
                      WHEN i.voided_by_contact_id IS NOT NULL THEN CONCAT(c.first, ' ', c.last)
                      ELSE 'Not Available'
                  END AS name,
                  c.employee_id
                FROM invoices i
                  LEFT JOIN contacts c ON c.id = i.voided_by_contact_id
                  LEFT JOIN users u ON c.user_id = u.id
                  INNER JOIN properties pr ON pr.id = i.property_id
                  INNER JOIN leases l ON l.id = i.lease_id
                  INNER JOIN contacts co ON co.id = i.contact_id
                  INNER JOIN units un ON un.id = l.unit_id
                WHERE pr.company_id = ${company_id}
                  AND i.property_id in (${property_ids})
                  AND date(CONVERT_TZ(i.voided_at , "+00:00", ifnull(pr.utc_offset, "+00:00"))) between ${start_date} and 
                  ${end_date}`;
    return sql;
  },

  delinquencyPauses(company_id, property_ids, start_date, end_date) {
    let sql = `SELECT
                  pr.name As property_name,
                  concat(co.first, ' ', co.last) AS tenant_name,
                  un.number AS unit_number,
                  'Delinquency Paused' AS activity_name,
                  (CONVERT_TZ(dp.created_at , "+00:00", ifnull(pr.utc_offset, "+00:00"))) AS date_time, 
                  u.email AS user_name,
                  CASE
                      WHEN dp.paused_contact_id IS NOT NULL THEN CONCAT(c.first, ' ', c.last)
                      ELSE 'Not Available'
                  END AS name,
                  c.employee_id
                FROM delinquencies_pauses dp
                  LEFT JOIN contacts c ON c.id = dp.paused_contact_id
                  LEFT JOIN users u ON c.user_id = u.id
                  INNER JOIN delinquencies d ON d.id = dp.delinquencies_id
                  INNER JOIN leases l ON l.id = d.lease_id
                  INNER JOIN units un ON un.id = l.unit_id
                  INNER JOIN properties pr ON pr.id = un.property_id
                  INNER JOIN contact_leases cl ON cl.lease_id = l.id
                  INNER JOIN contacts co ON co.id = cl.contact_id
                WHERE pr.company_id = ${company_id}
                  AND pr.id in (${property_ids})
                  AND date(CONVERT_TZ(dp.created_at , "+00:00", ifnull(pr.utc_offset, "+00:00"))) between ${start_date} and 
                  ${end_date}`
    return sql;
  },

  delinquencyResume(company_id, property_ids, start_date, end_date) {
    let sql = `SELECT
                  pr.name As property_name,
                  concat(co.first, ' ', co.last) AS tenant_name,
                  un.number AS unit_number,
                  'Delinquency Resumed' AS activity_name,
                  (CONVERT_TZ(dr.ended_at , "+00:00", ifnull(pr.utc_offset, "+00:00"))) AS date_time, 
                  u.email AS user_name,
                  CASE
                      WHEN dr.resumed_contact_id IS NOT NULL THEN CONCAT(c.first, ' ', c.last)
                      ELSE 'Not Available'
                  END AS name,
                  c.employee_id
                FROM delinquencies_pauses dr
                  LEFT JOIN contacts c ON c.id = dr.resumed_contact_id
                  LEFT JOIN users u ON c.user_id = u.id
                  INNER JOIN delinquencies d ON d.id = dr.delinquencies_id
                  INNER JOIN leases l ON l.id = d.lease_id
                  INNER JOIN units un ON un.id = l.unit_id
                  INNER JOIN properties pr ON pr.id = un.property_id
                  INNER JOIN contact_leases cl ON cl.lease_id = l.id
                  INNER JOIN contacts co ON co.id = cl.contact_id
                WHERE
                  ((dr.resumed_contact_id is not null) OR (dr.ended_at is not null))
                  AND pr.company_id = ${company_id}
                  AND pr.id in (${property_ids})
                  AND date(CONVERT_TZ(dr.ended_at , "+00:00", ifnull(pr.utc_offset, "+00:00"))) between ${start_date} and 
                  ${end_date}`;
    return sql;
  },

  taskCreated(company_id, property_ids, start_date, end_date) {
    let sql = `(with cte_tasks as (
                SELECT
                  pr.name As property_name,
                  concat(co.first, ' ', co.last) AS tenant_name,
                  un.number AS unit_number,
                    (CONVERT_TZ(e.created_at , "+00:00", ifnull(pr.utc_offset, "+00:00"))) AS date_time, 
                    t.created_by as admin_id
                FROM todos t
                  INNER JOIN events e on e.id = t.event_id
                  INNER JOIN event_objects eo on eo.event_id = t.event_id
                  INNER JOIN leases l on l.id = eo.object_id
                  INNER JOIN units un on un.id = l.unit_id
                  INNER JOIN properties pr on pr.id = un.property_id
                  INNER JOIN contact_leases cl ON cl.lease_id = l.id
                  INNER JOIN contacts co ON co.id = cl.contact_id
                WHERE eo.object_type = 'lease'
                  AND pr.company_id = ${company_id}
                  AND pr.id in (${property_ids})
                  AND date(CONVERT_TZ(e.created_at , "+00:00", ifnull(pr.utc_offset, "+00:00"))) between ${start_date} and 
                  ${end_date}
                
                UNION
                
                SELECT
                    pr.name As property_name,
                    NULL AS tenant_name,
                    NULL AS unit_number,
                    (CONVERT_TZ(e.created_at , "+00:00", ifnull(pr.utc_offset, "+00:00"))) AS date_time, 
                    t.created_by as admin_id
                FROM todos t
                  INNER JOIN events e on e.id = t.event_id
                  INNER JOIN event_objects eo on eo.event_id = t.event_id
                  INNER JOIN rate_changes rc on rc.id = eo.object_id
                  INNER JOIN properties pr on pr.id = rc.property_id
                WHERE eo.object_type = 'rate_change'
                  AND pr.company_id =  ${company_id}
                  AND pr.id in (${property_ids})
                  AND date(CONVERT_TZ(e.created_at , "+00:00", ifnull(pr.utc_offset, "+00:00"))) between ${start_date} and 
                  ${end_date}
                
                UNION
                
                SELECT
                    pr.name As property_name,
                    NULL AS tenant_name,
                    NULL AS unit_number,
                    (CONVERT_TZ(e.created_at , "+00:00", ifnull(pr.utc_offset, "+00:00"))) AS date_time, 
                    t.created_by as admin_id
                FROM todos t
                  INNER JOIN events e on e.id = t.event_id
                  INNER JOIN event_objects eo on eo.event_id = t.event_id
                  INNER JOIN leads l on l.contact_id = eo.object_id
                  INNER JOIN properties pr on pr.id = l.property_id
                WHERE eo.object_type = 'contact'
                  AND pr.company_id = ${company_id}
                  AND pr.id in (${property_ids})
                  AND date(CONVERT_TZ(e.created_at , "+00:00", ifnull(pr.utc_offset, "+00:00"))) between ${start_date} and 
                  ${end_date}
                ) 
                SELECT t.property_name,t.tenant_name, t.unit_number,'Task Created' AS activity_name, t.date_time, u.email AS user_name,
                  CASE
                        WHEN t.admin_id IS NOT NULL THEN CONCAT(c.first, ' ', c.last)
                        ELSE 'Not Available'
                    END AS name,
                    c.employee_id
                FROM cte_tasks t
                LEFT JOIN contacts c on c.id = t.admin_id
                LEFT JOIN users u on u.id = c.user_id)`;

    return sql;
  },

  taskCompleted(company_id, property_ids, start_date, end_date) {
    let sql = `(with cte_tasks as (
                  SELECT
                     pr.name As property_name,
                     NULL AS tenant_name,
                     un.number AS unit_number,
                      (CONVERT_TZ(tc.completed_at , "+00:00", ifnull(pr.utc_offset, "+00:00"))) AS date_time, 
                      tc.completed_by as admin_id
                  FROM todos tc
                    INNER JOIN event_objects eo on eo.event_id = tc.event_id
                    INNER JOIN leases l on l.id = eo.object_id
                    INNER JOIN units un on un.id = l.unit_id
                    INNER JOIN properties pr on pr.id = un.property_id
                  WHERE tc.completed = 1
                    AND eo.object_type = 'lease'
                    AND pr.company_id = ${company_id}
                    AND pr.id in (${property_ids})
                    AND date(CONVERT_TZ(tc.completed_at , "+00:00", ifnull(pr.utc_offset, "+00:00"))) between ${start_date} and 
                    ${end_date}
                  
                  UNION
                  
                  SELECT
                    pr.name As property_name,
                    NULL AS tenant_name,
                    NULL AS unit_number,
                      (CONVERT_TZ(tc.completed_at , "+00:00", ifnull(pr.utc_offset, "+00:00"))) AS date_time, 
                      tc.completed_by as admin_id
                  FROM todos tc
                    INNER JOIN event_objects eo on eo.event_id = tc.event_id
                    INNER JOIN rate_changes rc on rc.id = eo.object_id
                    INNER JOIN properties pr on pr.id = rc.property_id
                  WHERE tc.completed = 1
                    AND eo.object_type = 'rate_change'
                    AND pr.company_id = ${company_id}
                    AND pr.id in (${property_ids})
                    AND date(CONVERT_TZ(tc.completed_at , "+00:00", ifnull(pr.utc_offset, "+00:00"))) between ${start_date} and 
                    ${end_date}
                  
                  UNION
                  
                  SELECT
                    pr.name As property_name,
                    NULL AS tenant_name,
                    NULL AS unit_number,
                      (CONVERT_TZ(tc.completed_at , "+00:00", ifnull(pr.utc_offset, "+00:00"))) AS date_time, 
                    tc.completed_by as admin_id
                  FROM todos tc
                    INNER JOIN event_objects eo on eo.event_id = tc.event_id
                    INNER JOIN leads l on l.contact_id = eo.object_id
                    INNER JOIN properties pr on pr.id = l.property_id
                  WHERE tc.completed = 1
                    AND eo.object_type = 'contact'
                    AND pr.company_id = ${company_id}
                    AND pr.id in (${property_ids})
                    AND date(CONVERT_TZ(tc.completed_at , "+00:00", ifnull(pr.utc_offset, "+00:00"))) between ${start_date} and 
                    ${end_date}
                  
                  ) 
                  SELECT t.property_name,t.tenant_name, t.unit_number,'Task Completed' AS activity_name, t.date_time, u.email AS user_name,
                    CASE
                        WHEN t.admin_id IS NOT NULL THEN CONCAT(c.first, ' ', c.last)
                        ELSE 'Not Available'
                    END AS name,
                    c.employee_id
                  FROM cte_tasks t
                  LEFT JOIN contacts c on c.id = t.admin_id
                  LEFT JOIN users u on u.id = c.user_id)`
    return sql;
  },

  autoPayEnrollment(company_id, property_ids, start_date, end_date) {
    let sql = `SELECT
                  pr.name As property_name,
                  concat(co.first, ' ', co.last) AS tenant_name,
                  un.number AS unit_number,
                  'Autopay Enrollment' AS activity_name,
                  (CONVERT_TZ(lpm.created_at , "+00:00", ifnull(pr.utc_offset, "+00:00"))) AS date_time,
                  u.email AS user_name,
                  CASE
                      WHEN lpm.created_by IS NOT NULL THEN CONCAT(c.first, ' ', c.last)
                      ELSE 'Not Available'
                  END AS name,
                  c.employee_id
                FROM leases_payment_methods lpm
                  INNER JOIN leases l on l.id = lpm.lease_id
                  INNER JOIN units un on un.id = l.unit_id
                  INNER JOIN properties pr ON pr.id = un.property_id
                  LEFT JOIN contacts c ON c.id = lpm.created_by
                  LEFT JOIN users u ON c.user_id = u.id
                  INNER JOIN contact_leases cl ON cl.lease_id = l.id
                  INNER JOIN contacts co ON co.id = cl.contact_id
                WHERE pr.company_id = ${company_id}
                  AND un.property_id in (${property_ids})
                  AND date(CONVERT_TZ(lpm.created_at , "+00:00", ifnull(pr.utc_offset, "+00:00"))) between ${start_date} and 
                  ${end_date}`;
    return sql;
  },

  autoPayRemoval(company_id, property_ids, start_date, end_date) { 
    let sql = `SELECT
                  pr.name As property_name,
                  concat(co.first, ' ', co.last) AS tenant_name,
                  un.number AS unit_number,
                    'Autopay Removal' AS activity_name,
                    (CONVERT_TZ(lpm.deleted , "+00:00", ifnull(pr.utc_offset, "+00:00"))) AS date_time, 
                    u.email AS user_name,
                    CASE
                        WHEN lpm.deleted_by IS NOT NULL THEN CONCAT(c.first, ' ', c.last)
                        ELSE 'Not Available'
                    END AS name,
                    c.employee_id
                FROM leases_payment_methods lpm
                  INNER JOIN leases l on l.id = lpm.lease_id
                  INNER JOIN units un on un.id = l.unit_id
                  INNER JOIN properties pr ON pr.id = un.property_id
                  LEFT JOIN contacts c ON c.id = lpm.deleted_by
                  LEFT JOIN users u ON c.user_id = u.id
                  INNER JOIN contact_leases cl ON cl.lease_id = l.id
                  INNER JOIN contacts co ON co.id = cl.contact_id
                WHERE	pr.company_id = ${company_id}
                  AND un.property_id in (${property_ids})
                  AND date(CONVERT_TZ(lpm.deleted , "+00:00", ifnull(pr.utc_offset, "+00:00"))) between ${start_date} and 
                  ${end_date}`;
    return sql;
  },

  fetchAll(connection, company_id, property_ids, start_date, end_date) {
    let activities = [  this.refund, 
                        this.moveIn, 
                        this.voidInvoices, 
                        this.delinquencyPauses,
                        this.delinquencyResume,
                        this.taskCreated,
                        this.taskCompleted,
                        this.autoPayEnrollment,
                        this.autoPayRemoval
                      ];

    property_ids =  property_ids.map(p => connection.escape(p)).join(',');
    start_date = connection.escape(start_date);
    end_date = connection.escape(end_date);

    let sql = `SELECT * FROM (  
              `;

    sql += this.payments(company_id, property_ids, start_date, end_date);
    
    activities.forEach(item => {
      sql += `
        UNION

        ${item(company_id, property_ids, start_date, end_date)}

      `
    });

    sql += `) AS activity_data
            ORDER BY activity_name, date_time DESC;`

    return connection.queryAsync(sql);
  }

};

