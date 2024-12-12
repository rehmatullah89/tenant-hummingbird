const moment = require('moment');
const mysql = require(`mysql`)

module.exports = {
  
  /*
    function will output rent enabled properties during its midnight time.
  */
  findRentManagementEnabledProperties(connection, company_id, property_id, min_hour = null, max_hour = null) {
    let sql = `
        SELECT
            p.id,
            p.id AS property_id,
            p.name AS property_name,
            p.company_id,
            p.gds_id,
            p.utc_offset,
            prms.approval_type,
            prms.notification_period,
            prms.notification_document_id,
            prms.min_rent_change_interval,
            IFNULL(
                prms.round_to,
                crms.round_to
            ) AS round_to,
            IFNULL(prms.advance_rent_change_queue_months, 3) AS advance_rent_change_queue_months,
            IF(
                prmdm.id,
                JSON_ARRAYAGG(
                    JSON_OBJECT(
                        'subject', prmdm.subject,
                        'message', prmdm.message,
                        'delivery_method_id', prmdm.delivery_method_id,
                        'delivery_method', dm.gds_key
                    )
                ),
                '[]'
            ) AS notification_methods,
            IFNULL(
                (
                    SELECT
                        lt.invoiceSendDay
                    FROM
                        properties_lease_templates plt
                    JOIN lease_templates lt ON plt.lease_template_id = lt.id
                    WHERE
                        plt.property_id = p.id AND
                        lt.status = 1 AND
                        lt.unit_type = 'parking'
                ),
                (
                    select
                        lt.invoiceSendDay
                    from
                        lease_templates lt
                    WHERE
                        lt.company_id = p.company_id AND
                        lt.status = 1 AND
                        lt.is_default = 1 AND
                        lt.unit_type = 'parking'
                )
            ) as parkingInvoiceSendDay,
            IFNULL(
                (
                    SELECT
                        lt.invoiceSendDay
                    FROM
                        properties_lease_templates plt
                    JOIN lease_templates lt ON plt.lease_template_id = lt.id
                    WHERE
                        plt.property_id = p.id AND
                        lt.status = 1 AND
                        lt.unit_type = 'storage'
                ),
                (
                    select
                        lt.invoiceSendDay
                    from
                        lease_templates lt
                    WHERE
                        lt.company_id = p.company_id AND
                        lt.status = 1 AND
                        lt.is_default = 1 AND
                        lt.unit_type = 'storage'
                )
            ) as storageInvoiceSendDay
        FROM property_rent_management_settings prms
        JOIN properties p ON p.id = prms.property_id
        LEFT OUTER JOIN company_rent_management_settings crms ON crms.company_id = p.company_id
        LEFT OUTER JOIN property_rent_management_delivery_methods prmdm ON prmdm.property_id = prms.property_id AND prmdm.active = 1
        LEFT OUTER JOIN delivery_methods dm ON dm.id = prmdm.delivery_method_id
        WHERE
            prms.active = 1 AND
            p.company_id = ${connection.escape(company_id)}
    `
    if(min_hour !== null && max_hour !== null) {
        sql += ` AND (SELECT HOUR(CONVERT_TZ(UTC_TIMESTAMP() , "+00:00", p.utc_offset))) >= ${connection.escape(min_hour)} AND (SELECT HOUR(CONVERT_TZ(UTC_TIMESTAMP() , "+00:00", p.utc_offset))) < ${connection.escape(max_hour)} `;
    }
    if (property_id) {
      sql += ` AND p.id = ${connection.escape(property_id)}`
    }
    sql += ` GROUP BY p.id`
    return connection.queryAsync(sql);
  },

  findConsolidatedLeaseRentPlanData(connection, propertyId, date) {

    const sql = `
        SELECT
            lrps.lease_id AS 'lease_id',
            l.unit_id AS 'unit_id',
            l.start_date AS 'move_in_date',
            JSON_OBJECT(
                'id', rmp.id,
                'minimum_raise', rmp.minimum_raise,
                'maximum_raise', rmp.maximum_raise,
                'rent_cap', IFNULL(rmp.rent_cap, prms.rent_cap),
                'settings', rmp.settings,
                'prepay_rent_raise', rmp.prepay_rent_raise
            ) AS 'rent_plan',
            (
                SELECT lrr.effective_date
                FROM lease_rent_changes lrr
                WHERE
                    lrr.lease_id = lrps.lease_id AND
                    lrr.status = 'deployed' AND
                    lrr.affect_timeline = 1
                ORDER BY lrr.effective_date
                DESC LIMIT 1
            ) AS 'last_rent_change_date',
            (
                SELECT lrr.effective_date
                FROM lease_rent_changes lrr
                WHERE
                    lrr.lease_id = lrps.lease_id AND
                    lrr.status = 'cancelled' AND
                    lrr.affect_timeline = 1
                ORDER BY lrr.effective_date
                DESC LIMIT 1
            ) AS 'last_cancelled_rent_change_date',
            (
                SELECT s.price
                FROM services s
                JOIN products p ON
                    s.product_id = p.id AND
                    p.default_type = 'rent'
                WHERE
                    s.lease_id = lrps.lease_id AND
                    s.status = 1 AND
                    s.start_date < ${connection.escape(date)} AND
                    (
                        s.end_date IS NULL OR
                        s.end_date >= ${connection.escape(date)}
                    )
                ORDER BY start_date DESC
                LIMIT 1
            ) AS 'current_rent',
            (
                SELECT JSON_OBJECT(
                    'set_rate', upc.set_rate,
                    'sell_rate', upc.price
                )
                FROM unit_price_changes upc
                WHERE upc.unit_id = l.unit_id
                ORDER BY upc.id DESC
                LIMIT 1
            ) AS 'price',
            (
                SELECT MAX(il.end_date)
                FROM invoices i
                JOIN invoice_lines il ON i.id = il.invoice_id
                WHERE
                    il.product_id IN (
                        SELECT id
                        FROM products p
                        WHERE p.default_type = 'rent'
                    ) AND
                    i.lease_id = lrps.lease_id AND
                    (
                        IFNULL(i.subtotal, 0) +
                        IFNULL(i.total_tax, 0) -
                        IFNULL(i.total_discounts, 0) -
                        (
                            SELECT IFNULL(SUM(amount), 0)
                            from invoices_payments ip
                            where
                            ip.invoice_id = i.id
                        )
                    ) = 0
            ) AS 'paid_upto',
            l.bill_day AS 'bill_day'
        FROM lease_rent_plan_settings lrps
        JOIN leases l ON lrps.lease_id = l.id
        JOIN rent_management_plans rmp ON lrps.rent_plan_id = rmp.id
        JOIN property_rent_management_settings prms ON prms.property_id = lrps.property_id
        WHERE
            (
                SELECT lrr.effective_date
                FROM lease_rent_changes lrr
                WHERE
                (
                    lrr.status = 'initiated' OR
                    lrr.status = 'approved'
                ) AND
                lrr.lease_id = lrps.lease_id
                LIMIT 1
            ) IS NULL AND
            lrps.end_date IS NULL AND
            lrps.status = 'active' AND
            lrps.property_id = ${connection.escape(propertyId)} AND
            (
                l.end_date IS NULL OR
                l.end_date > ${connection.escape(date)}
            ) AND
            l.status = 1 AND
            prms.rent_engine = 'hummingbird' AND
            prms.enable_automatic_rent_change = 1 AND
            (l.auction_status IS NULL OR l.auction_status NOT IN ('auction_payment','move_out'))
    `;

    console.log(`findConsolidatedLeaseRentPlanData Query: `, sql);
    return connection.queryAsync(sql).then(res => res.map(r => ({
        ...r,
        price: JSON.parse(r.price),
        rent_plan: JSON.parse(r.rent_plan)
      }))
    );

  },

  getLeaseRentChangesByEffectiveDate(connection, propertyId, effectiveDate, retryDate, date) {
    // This function will list all the rent changes that needs to be approved and notification needs to be send on :date. The effective date that is to be considered should be provided in :effectiveDate parameter and the effective date of the retrying rent changes should be provided in :retryDate parameter.
    let sql = `
        SELECT
            lrr.*,
            l.bill_day,
            cl.contact_id,
            (
                SELECT JSON_OBJECT('id', inner_lrr.id, 'date', inner_lrr.effective_date, 'type', inner_lrr.type, 'status', inner_lrr.status)
                FROM lease_rent_changes inner_lrr
                WHERE
                    inner_lrr.effective_date > lrr.effective_date AND
                    inner_lrr.status IN ('approved', 'initiated','deployed') AND
                    inner_lrr.lease_id = lrr.lease_id
                ORDER BY
                    inner_lrr.effective_date ASC
                LIMIT 1
            ) AS next_rent_change_data,
            (
                SELECT i.id
                FROM interactions i
                JOIN lease_rent_change_notifications lrcn ON i.id = lrcn.interaction_id
                WHERE
                    lrcn.lease_rent_change_id = lrr.id AND
                    i.resolved = 0
                ORDER BY lrcn.id DESC limit 1
            ) previous_interaction_id
        FROM lease_rent_changes lrr
        JOIN leases l ON l.id = lrr.lease_id
        JOIN contact_leases cl ON cl.lease_id = l.id AND cl.primary = 1
        WHERE
            lrr.property_id = ${propertyId}
            AND lrr.status NOT IN ('cancelled', 'skipped', 'deployed')
            AND lrr.service_id IS NULL
            AND (l.end_date IS NULL OR l.end_date >= '${date}')
            AND lrr.deleted_at IS NULL
            AND (l.auction_status IS NULL OR l.auction_status NOT IN ('auction_payment','move_out'))
            AND (
                (
                    lrr.notification_status IS NULL AND
                    lrr.effective_date = '${effectiveDate}'
                ) OR (
                    lrr.effective_date = '${retryDate}' AND
                    (
                        (lrr.notification_status IS null and lrr.upload_id is null) OR
                        (lrr.notification_status = 'error')
                    ) AND
                    IFNULL(
                        (
                            SELECT i.resolved
                            FROM lease_rent_change_notifications lrcn
                            LEFT OUTER JOIN interactions i ON i.id = lrcn.interaction_id
                            WHERE lrcn.lease_rent_change_id = lrr.id
                            ORDER BY lrcn.id DESC
                            LIMIT 1
                        ),
                        0
                    ) = 0
                    AND lrr.resolved = 0
                )
            )
        GROUP BY lrr.id
        HAVING MIN(cl.contact_id)
        ORDER BY lrr.effective_date ASC
    `;
    console.log("\nQuery for getLeaseRentChangesByEffectiveDate: ", sql)
    let result = connection.queryAsync(sql);
    return result
  },

  /**
   * Rent changes are deployed 2 days before the invoice generation day. Rent changes that failed
   * to deploy 2 days before invoice generation day are retried 1 day before invoice generation day.
   * The function returns those rent changes whose effective dates are on (invoice day + 2) or
   * (invoice day + 1) days from the given date.
   */
  async getDeployingRentChanges(connection, propertyId, date, invoiceDays) {
    let
        storageEffectiveDate = ( date ? moment(date) : moment() ).add((invoiceDays.storage + 2), 'days').format('YYYY-MM-DD'),
        parkingEffectiveDate = ( date ? moment(date) : moment() ).add((invoiceDays.parking + 2), 'days').format('YYYY-MM-DD');

    let
        storageEffectiveDateToRetryDeployment = moment(storageEffectiveDate).subtract(1, `day`).format('YYYY-MM-DD'),
        parkingEffectiveDateToRetryDeployment = moment(parkingEffectiveDate).subtract(1, `day`).format('YYYY-MM-DD');

    let sql = `
        SELECT
            lrr.*,
            l.bill_day,
            cl.contact_id,
            (
                SELECT JSON_OBJECT('id', inner_lrr.id, 'date', inner_lrr.effective_date, 'type', inner_lrr.type, 'status', inner_lrr.status)
                FROM lease_rent_changes inner_lrr
                WHERE
                    inner_lrr.effective_date > lrr.effective_date AND
                    inner_lrr.status IN ('approved', 'initiated','deployed') AND
                    inner_lrr.lease_id = lrr.lease_id AND
                    inner_lrr.deleted_at IS NULL
                ORDER BY
                    inner_lrr.effective_date ASC
                LIMIT 1
            ) AS next_rent_change_data,
            (
                SELECT rmp.prepay_rent_raise
                FROM rent_management_plans rmp
                WHERE rmp.id = lrr.rent_plan_id
            ) AS prepay_rent_raise,
            (
                    IFNULL(
                        lrr.notification_sent,
                        DATE_SUB(
                            lrr.effective_date,
                            INTERVAL IFNULL((
                                SELECT prms.notification_period
                                FROM property_rent_management_settings prms
                                WHERE prms.property_id = lrr.property_id
                            ), 30) DAY
                        )
                    )
            ) AS notified_on,
            (
                SELECT JSON_OBJECT(
                    'id', i.id,
                    'status', i.status,
                    'resolved', i.resolved
                )
                FROM interactions i
                JOIN lease_rent_change_notifications lrcn ON lrcn.interaction_id = i.id
                WHERE lrcn.lease_rent_change_id = lrr.id
                ORDER BY lrcn.id DESC
                LIMIT 1
            ) AS interaction,
            up.generation_status
        FROM lease_rent_changes lrr
        JOIN leases l ON l.id = lrr.lease_id
        JOIN contact_leases cl ON cl.lease_id = lrr.lease_id AND cl.primary = 1
        JOIN units u ON u.id = l.unit_id
        LEFT JOIN uploads up ON up.id = lrr.upload_id
        WHERE
            u.property_id = ${ connection.escape(propertyId) }
            AND lrr.status = 'approved'
            AND lrr.service_id IS NULL
            AND (l.end_date IS NULL OR l.end_date >= ${ connection.escape(date) })
            AND lrr.deleted_at IS NULL
            AND
                CASE
                    WHEN u.type = 'parking' THEN ( lrr.effective_date IN ('${ parkingEffectiveDateToRetryDeployment }', '${ parkingEffectiveDate }'))
                    ELSE (lrr.effective_date IN('${ storageEffectiveDateToRetryDeployment }', '${ storageEffectiveDate }'))
                END
            AND (l.auction_status IS NULL OR l.auction_status NOT IN ('auction_payment','move_out'))
        GROUP BY lrr.id
        HAVING MIN(cl.contact_id)
    `
    console.log("SQL for getDeployingRentChanges: ", sql)
    return connection.queryAsync(sql);

  },

  bulkInsert(connection, fieldsToInsert, insertDataArray) {
    if (!fieldsToInsert) fieldsToInsert = [
      `type`,
      `lease_id`,
      `rent_plan_id`,
      `affect_timeline`,
      `change_type`,
      `change_value`,
      `change_amt`,
      `new_rent_amt`,
      `target_date`,
      `effective_date`
    ];

    const sql = ` INSERT INTO lease_rent_changes (${fieldsToInsert.join(`,`)})  VALUES ? `;

    return connection.queryAsync(sql, [insertDataArray]);
  },

  /**
   * This functions update the rows in the lease_rent_changes table with the data given as key value pair in the
   * data object. Rows to update are targeted by the sql string - conditions.
   * @param { SqlConnectionObject} connection
   * @param { Object } data Data object with the content to be updated to the rows in lease_rent_changes table
   * @param { String } condition SQL string snippet that is to be appended after the where condition in the sql to update the data
   */
  async bulkUpdateLeaseRentChange(connection, data = {}, condition = ``) {
    let sql = `
        UPDATE lease_rent_changes
        SET ? WHERE ${condition}
    `;
    await connection.queryAsync(sql, data);
  },

  cancelMovedOutLeaseAndAuctionedRentChanges(connection, propertyId, date, cancelledBy) {
    let sql = `
        UPDATE
            lease_rent_changes lrr
        JOIN leases l ON
            l.id = lrr.lease_id
        SET
            lrr.status = 'cancelled',
            lrr.cancelled_by = ${cancelledBy},
            lrr.last_modified_by = ${ cancelledBy },
            lrr.status_updated_at = NOW()
        WHERE
            lrr.property_id = ${propertyId} AND 
            lrr.status NOT IN ('cancelled', 'skipped', 'deployed') AND 
            (
                (
                    lrr.service_id IS NULL AND 
                    (l.end_date IS NOT NULL AND l.end_date <= ${connection.escape(date)})
                ) OR 
                (
                    l.auction_status IN ('auction_payment', 'move_out')
                )
            )
        `;
    return connection.queryAsync(sql);
  },

  getMovedOutLeaseRentChanges(connection, propertyId, date) {
    let sql = `
        SELECT
            lrr.id,
            l.id as lease_id,
            cl.contact_id,
            l.auction_status
        FROM lease_rent_changes lrr
        JOIN leases l on l.id = lrr.lease_id
        JOIN contact_leases cl ON cl.lease_id = l.id AND cl.primary = 1
        WHERE
            lrr.property_id = ${propertyId} AND
            lrr.status NOT IN ('cancelled', 'skipped', 'deployed') AND
            (
                (
                    lrr.service_id IS NULL AND 
                    (l.end_date IS NOT NULL AND l.end_date <= ${connection.escape(date)})
                ) OR 
                (
                    l.auction_status IN ('auction_payment', 'move_out')
                )
            )
        GROUP BY lrr.id
        HAVING MIN(cl.contact_id)
    `;
    return connection.queryAsync(sql);
  },

  async isActiveDeliveryMethodExist(connection, propertyId) {
    let sql = `
        SELECT EXISTS(
        SELECT * 
        FROM property_rent_management_delivery_methods prmdm 
        WHERE prmdm.property_id = ${propertyId} AND active = 1) AS exist
    `;
    return connection.queryAsync(sql).then((res) => (res?.length ? !!res[0]?.exist : false));
  },

  async fetchRentChangeDocumentsByCreationDate(connection, propertyId, date) {
    const sql = `
        SELECT
            TRIM(
                CONCAT_WS(
                    ' ',
                    NULLIF(TRIM(COALESCE(c.first, '')), ''),
                    NULLIF(TRIM(COALESCE(c.middle, '')), ''),
                    NULLIF(TRIM(COALESCE(c.last, '')), '')
                )
            ) AS rent_change_tenant_name,
            lrc.id AS rent_change_id,
            lrc.lease_id,
            lrc.type AS rent_change_type,
            lrc.approved_at AS rent_change_approved_at,
            u.id as upload_id,
            u.filename,
            u.destination,
            u.destination_file_path
        FROM lease_rent_changes lrc
        JOIN uploads u ON u.id = lrc.upload_id
        JOIN contact_leases cl ON cl.lease_id = lrc.lease_id AND cl.primary = 1
        JOIN contacts c ON c.id = cl.contact_id
        JOIN property_rent_management_settings prms ON prms.property_id = lrc.property_id
        WHERE
            lrc.property_id = ${connection.escape(propertyId)} AND
            DATE(u.upload_date) = ${connection.escape(date)}
    `;
    return await connection.queryAsync(sql);
  },

  async fetchInitiatedRentChangesByEffectiveDates(connection, propertyId, datesArray) {
    const sql = `
        SELECT
            lrc.id,
            lrc.lease_id,
            lrc.effective_date
        FROM lease_rent_changes lrc
        WHERE
            lrc.status = 'initiated' AND
            lrc.deleted_at IS NULL AND
            DATE(effective_date) IN (?) AND
            lrc.property_id = ?
    `;

    return await connection.queryAsync(sql, [datesArray, propertyId]);
  },

  async fetchDeploymentFailedRentChanges(connection, propertyId, dates = []) {
    if (dates.length == 0) return;

    const sql = `
        SELECT
            lrc.id,
            lrc.lease_id,
            lrc.effective_date,
            lrc.status
        FROM lease_rent_changes lrc
        JOIN leases l ON l.id = lrc.lease_id
        JOIN units u ON u.id = l.unit_id
        WHERE
            lrc.property_id = ? AND
            lrc.status IN ('initiated', 'approved') AND
            lrc.deleted_at IS NULL AND
            CASE
                WHEN u.type = 'parking' THEN lrc.effective_date <= ?
                ELSE lrc.effective_date <= ?
            END
    `;

    return await connection.queryAsync(sql, [propertyId, ...dates]);
  },

  async fetchNotificationFailedRentChanges(connection, propertyId, notificationDay) {
    const sql = `
        SELECT
            lrc.id,
            lrc.lease_id,
            lrc.effective_date,
            lrc.status
        FROM lease_rent_changes lrc
        LEFT JOIN uploads u ON u.id = lrc.upload_id
        LEFT JOIN lease_rent_change_notifications lrcn ON lrcn.lease_rent_change_id = lrc.id AND lrcn.id = (
            SELECT MAX(lrcn2.id)
            FROM lease_rent_change_notifications lrcn2
            WHERE lrcn2.lease_rent_change_id = lrc.id
        )
        LEFT JOIN interactions i ON i.id = lrcn.interaction_id
        WHERE
            lrc.property_id = ? AND
            lrc.status IN ('initiated', 'approved') AND
            lrc.deleted_at IS NULL AND
            lrc.resolved = 0 AND
            IFNULL(i.resolved, 0) = 0 AND
            (
                lrc.notification_status = 'error' OR
                lrc.upload_id IS NULL OR
                i.status = 'error'
            ) AND
            lrc.effective_date < ?
    `
    return await connection.queryAsync(sql, [propertyId, notificationDay]);
  },

  async fetchContactsWithRentManagementAlertPermission(connection, data = {}) {
    const sql = `
        SELECT
            c.id,
            CONCAT(c.\`first\`, ' ', c.\`last\`) AS name,
            c.email
        FROM companies_contact_roles ccr
        JOIN contacts c ON c.id = ccr.contact_id
        WHERE
            ccr.role_id IN (
                SELECT role_id
                FROM roles_permissions rp
                WHERE permission_id IN (
                    SELECT id
                    FROM permissions p
                    WHERE label = ?
                )
            ) AND
            ccr.id IN (
                SELECT crp.company_contact_role_id
                FROM contact_roles_properties crp
                WHERE property_id = ?
            ) AND
            ccr.company_id = ? AND
            ccr.status = 1
    `

    return await connection.queryAsync(sql, [data.label, data.propertyId, data.companyId]);
  }

}