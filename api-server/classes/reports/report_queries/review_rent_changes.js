const { get_current_rent_of_lease } = require("../../../modules/sql_snippets");
class ReviewRentChangesQueries {
  constructor(data, date) {    
    this.id = data.id;
    this.leaseId = data.leaseId;
    this.unitId = data.unitId;
    this.tenantId = data.tenantId;
    this.propertyId = data.propertyId;
    this.notificationPeriod = data.notificationPeriod
    this.oldRentDate =  `DATE_SUB(lrrm.effective_date, INTERVAL 1 DAY)`;

    this.varianceDate = `(
      SELECT
        CASE
          WHEN (
            lm.start_date <  prms.custom_variance_date AND
            prms.enable_custom_variance = 1
          ) THEN prms.custom_variance_date
          ELSE lm.start_date
        END
    )`;

    this.newRent = `(
      SELECT lrr.new_rent_amt
      FROM lease_rent_changes lrr
      WHERE lrr.id = ${this.id}
    )`;

    this.currentRent =  `(${get_current_rent_of_lease(this.leaseId, `'${date}'`)})`;
    this.oldRent =  `(${get_current_rent_of_lease(this.leaseId, this.oldRentDate)})`;
    this.customDateRent = ` (${get_current_rent_of_lease(this.leaseId, this.varianceDate)}) `;

    this.rentVariance = `(${this.newRent} - ${this.oldRent})`;
    this.currentRentVariance = `(${this.currentRent} - ${this.customDateRent})`;
    this.newRentVariance = `(${this.newRent} - ${this.customDateRent})`;
    this.rentVariancePercent = `(IFNULL((SELECT ${this.rentVariance} / IFNULL(${this.oldRent}, 1)), 0)) `

    this.queries = {

      rentchange_id: this.id,

      rentchange_current_rent: this.currentRent,

      rentchange_new_rent: this.newRent,

      rentchange_rent_variance: this.rentVariance,

      rentchange_rent_variance_percent: this.rentVariancePercent,

      rentchange_property_id: this.propertyId,

      rentchange_tagged: `(
        SELECT tagged
        FROM lease_rent_changes lrr
        WHERE lrr.id = ${this.id}
      )`,

      rentchange_status: `(
        SELECT
          CASE
            WHEN lrr.status = 'initiated' THEN 'Scheduled'
            WHEN lrr.status = 'approved' THEN 'Approved'
            WHEN lrr.status = 'skipped' THEN 'Skipped'
            WHEN lrr.status = 'cancelled' THEN 'Cancelled'
            WHEN lrr.status = 'deployed' THEN 'Deployed'
          END
        FROM lease_rent_changes lrr
        WHERE lrr.id = ${this.id}
      )`,

      rentchange_notification_status: `(
        SELECT
            COALESCE (
                IF(
                    (lrr.resolved = 1 OR i.resolved = 1),
                    'resolved',
                    NULL
                ),
                i.status,
                CASE
                    WHEN lrr.notification_status = 'error' THEN 'error'
                    WHEN u.generation_status IS NOT NULL THEN u.generation_status
                    WHEN lrr.status = 'initiated' THEN 'pending'
                    WHEN (
                      lrr.status = 'approved' AND
                      lrr.upload_id IS NULL AND
                      DATE_SUB(
                        lrr.effective_date,
                        INTERVAL IFNULL(${ this.notificationPeriod}, 30) DAY
                      ) >= CURDATE()) THEN 'pending'
                    ELSE 'error'
                END,
                'error'
            ) AS notice_status
        FROM lease_rent_changes lrr
        LEFT JOIN uploads u ON u.id = lrr.upload_id
        LEFT JOIN lease_rent_change_notifications lrcn ON lrcn.lease_rent_change_id = lrr.id AND lrcn.id = (
            SELECT MAX(lrcn2.id)
            FROM lease_rent_change_notifications lrcn2
            WHERE lrcn2.lease_rent_change_id = lrr.id
        )
        LEFT JOIN interactions i ON i.id = lrcn.interaction_id
        WHERE lrr.id = ${ this.id }
      )`,

      rentchange_effective_date: `(
        SELECT DATE_FORMAT(lrr.effective_date, '%Y-%m-%d')
        FROM lease_rent_changes lrr
        WHERE lrr.id = ${this.id}
      )`,

      rentchange_notification_date: `(
        SELECT DATE_FORMAT(DATE_SUB(
              lrr.effective_date,
              INTERVAL IFNULL(${ this.notificationPeriod }, 30) DAY
          ),
          '%Y-%m-%d'
        )
        FROM lease_rent_changes lrr
        WHERE lrr.id = ${this.id}
      )`,

      rentchange_notification_sent: `(
        SELECT DATE_FORMAT(lrr.notification_sent, '%Y-%m-%d')
        FROM lease_rent_changes lrr
        WHERE lrr.id = ${this.id} AND lrr.upload_id IS NOT NULL
      )`,

      rentchange_unit_number: `(
        SELECT number
        FROM units
        WHERE id = ${this.unitId}
      )`,

      rentchange_status_modification_date: `(
        SELECT IFNULL((DATE_FORMAT(lrr.status_updated_at, '%Y-%m-%d')), (DATE_FORMAT(lrr.created_at, '%Y-%m-%d')))
        FROM lease_rent_changes lrr
        WHERE lrr.id = ${this.id}
      )`,

      rentchange_current_rent_variance: this.currentRentVariance,

      rentchange_new_rent_variance: this.newRentVariance,

      rentchange_current_rent_variance_percent: `(IFNULL((SELECT ${this.currentRentVariance} / IFNULL(${this.customDateRent}, 1)), 0)) `,

      rentchange_new_rent_variance_percent: `( IFNULL((SELECT ${this.newRentVariance} / IFNULL(${this.customDateRent}, 1)), 0)) `,

      rentchange_rent_variance_combined: `( SELECT CONCAT ( ${this.rentVariance}, '/',  ${this.rentVariancePercent} ))`,

      rentchange_recent_note: `(
        IFNULL ((
          SELECT content
          FROM lease_rent_change_notes lrcn
          JOIN notes n ON n.id = lrcn.notes_id
          WHERE lrcn.rent_change_id = ${this.id}
          ORDER BY n.created DESC LIMIT 1
        ), '')
      )`,

      rentchange_tenant_name: `(
        SELECT 
          TRIM(CONCAT_WS(' ', NULLIF(TRIM(COALESCE(first, '')), ''), NULLIF(TRIM(COALESCE(middle, '')), ''), NULLIF(TRIM(COALESCE(last, '')), '') )) 
        FROM contacts 
        WHERE id = ${this.tenantId}) `,

      rentchange_property_name: `(
        SELECT name AS property_name 
        FROM properties
        WHERE id=${this.propertyId}
      )`,

      rentchange_type: `(
        SELECT CASE WHEN lrr.type = 'auto' THEN 'Automated' 
        WHEN lrr.type = 'price_monster' THEN 'Price Monster'
        ELSE CONCAT(UPPER(SUBSTRING(lrr.\`type\`, 1, 1)), LOWER(SUBSTRING(lrr.\`type\`, 2))) END
        FROM lease_rent_changes lrr
        WHERE lrr.id = ${this.id}
      )`,

      rentchange_affect_timeline: `(SELECT lrr.affect_timeline FROM lease_rent_changes lrr WHERE lrr.id = ${this.id})`,

      rentchange_old_rent: this.oldRent,

      rentchange_last_updated_by: `(
        SELECT
          TRIM(CONCAT_WS(' ', NULLIF(TRIM(COALESCE(first, '')), ''), NULLIF(TRIM(COALESCE(middle, '')), ''), NULLIF(TRIM(COALESCE(last, '')), '') )) 
        FROM lease_rent_changes lrr
        JOIN contacts  c ON c.id = lrr.last_modified_by
        WHERE lrr.id = ${this.id}
      )`,

      rentchange_auction_status: `(SELECT lm.auction_status)`,

      rentchange_created_by: `(
        SELECT
          TRIM(CONCAT_WS(' ', NULLIF(TRIM(COALESCE(first, '')), ''), NULLIF(TRIM(COALESCE(middle, '')), ''), NULLIF(TRIM(COALESCE(last, '')), '') )) 
        FROM contacts c
        WHERE c.id = (
          SELECT lrc.created_by
          FROM lease_rent_changes lrc
          WHERE lrc.id = ${ this.id }
        )
      )`,

      rentchange_approved_by: `(
        SELECT
          TRIM(CONCAT_WS(' ', NULLIF(TRIM(COALESCE(first, '')), ''), NULLIF(TRIM(COALESCE(middle, '')), ''), NULLIF(TRIM(COALESCE(last, '')), '') ))
        FROM contacts c
        WHERE c.id = (
          SELECT lrc.approved_by
          FROM lease_rent_changes lrc
          WHERE lrc.id = ${ this.id }
        )
      )`,

      rentchange_skipped_or_cancelled_by: `(
        SELECT
          TRIM(CONCAT_WS(' ', NULLIF(TRIM(COALESCE(first, '')), ''), NULLIF(TRIM(COALESCE(middle, '')), ''), NULLIF(TRIM(COALESCE(last, '')), '') ))
        FROM contacts c
        WHERE c.id = (
          SELECT
          CASE
            WHEN lrc.status = 'cancelled' THEN
              (SELECT lrc.cancelled_by FROM lease_rent_changes lrc WHERE lrc.id = ${ this.id })
            WHEN lrc.status = 'skipped' THEN
              (SELECT lrc.skipped_by FROM lease_rent_changes lrc WHERE lrc.id = ${ this.id })
            ELSE
              NULL
          END
          FROM lease_rent_changes lrc
          WHERE lrc.id = ${ this.id }
        )
      )`
    }
  }
}

module.exports = ReviewRentChangesQueries;
