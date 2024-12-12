const approval_deadline_display_days = 50;
const { get_current_rent_of_lease } = require("../../../modules/sql_snippets");
class RentChangeDeploymentMonthQueries {
  constructor(data = {}) {
    this.property_id = data.property_id;
    this.deployment_month = data.deployment_month;
    this.first_notification_day = data.first_notification_day;
    this.ninety_days_after_effective_date = data.ninety_days_after_effective_date;
    this.total_rent_changes = data.total_rent_changes;
    this.date = data.custom_date ? `'${data.custom_date}'` : `CURDATE()`;
    this.oldRentDate =  `DATE_SUB(lrr.effective_date, INTERVAL 1 DAY)`;
    this.first_approval_deadline_date = `( 
        SELECT  DATE_SUB(
            lrr.effective_date,
            INTERVAL IFNULL(lrrm.notification_period, 30) DAY
        ) as first_approval_deadline_date
        FROM lease_rent_changes lrr
        WHERE lrr.deployment_month = ${ this.deployment_month }
            AND lrr.property_id = ${ this.property_id }
            AND lrr.status = 'initiated'
            AND DATE_SUB(
                lrr.effective_date,
                INTERVAL IFNULL(lrrm.notification_period, 30) DAY
            ) > CURDATE()
        ORDER BY lrr.effective_date ASC
        LIMIT 1 
    )`;

    let count_of_skipped_rent_changes = `(
        SELECT COUNT(lrr.id)
        FROM lease_rent_changes lrr
        WHERE
            lrr.deleted_at IS NULL AND
            lrr.status = 'skipped' AND
            lrr.deployment_month = ${ this.deployment_month } AND
            lrr.property_id = ${ this.property_id }
    )`;

    let count_of_cancelled_rent_changes = `(
        SELECT COUNT(lrr.id)
        FROM lease_rent_changes lrr
        WHERE
            lrr.deleted_at IS NULL AND
            lrr.status = 'cancelled' AND
            lrr.deployment_month = ${ this.deployment_month } AND
            lrr.property_id = ${ this.property_id }
    )`;

    let count_of_initiated_rent_changes = `(
        SELECT COUNT(lrr.id)
        FROM lease_rent_changes lrr
        WHERE
            lrr.deleted_at IS NULL AND
            lrr.status = 'initiated' AND
            lrr.deployment_month = ${ this.deployment_month } AND
            lrr.property_id = ${ this.property_id }
    )`;

    let count_of_manually_approved_rent_changes = `(
        SELECT COUNT(lrr.id)
        FROM lease_rent_changes lrr
        WHERE
            lrr.deleted_at IS NULL AND
            (
                lrr.status = 'approved' AND
                lrr.approved_by IS NOT NULL
            ) AND
            lrr.deployment_month = ${ this.deployment_month } AND
            lrr.property_id = ${ this.property_id }
    )`;

    let count_of_auto_approved_rent_changes = `(
        SELECT COUNT(lrr.id)
        FROM lease_rent_changes lrr
        WHERE
            lrr.deleted_at IS NULL AND
            (
                lrr.status = 'approved' AND
                lrr.approved_by IS NULL
            ) AND
            lrr.deployment_month = ${ this.deployment_month } AND
            lrr.property_id = ${ this.property_id }
    )`;

    let count_of_deployed_skipped_and_cancelled_rent_changes = `(
        SELECT COUNT(lrr.id)
        FROM lease_rent_changes lrr
        WHERE
            lrr.deleted_at IS NULL AND
            lrr.status IN ('deployed', 'skipped', 'cancelled') AND
            lrr.deployment_month = ${ this.deployment_month } AND
            lrr.property_id = ${ this.property_id }
    )`;

    let move_out_in_90_days = `(
        SELECT COUNT(DISTINCT lrr.lease_id)
        FROM lease_rent_changes lrr
        JOIN leases l ON l.id = lrr.lease_id
        WHERE
            lrr.property_id = ${ this.property_id } AND
            lrr.deployment_month = ${ this.deployment_month } AND
            lrr.status = 'deployed' AND
            lrr.deleted_at IS NULL AND
            l.end_date > ${ this.first_notification_day } AND
            l.end_date <= (
                CASE
                    WHEN CURDATE() <= lrrm.ninety_days_after_effective_date
                        THEN CURDATE()
                    ELSE lrrm.ninety_days_after_effective_date
                END
            )
    )`;

    let occupied_spaces_in_property = `(
        IFNULL(
            (
                SELECT COUNT(l.id)
                FROM units u
                JOIN leases l ON l.unit_id = u.id AND l.status = 1
                WHERE
                    (
                        u.deleted >= ${ this.first_notification_day } OR
                        u.deleted IS NULL
                    ) AND
                    u.property_id = ${ this.property_id } AND
                    l.start_date <= ${ this.first_notification_day } AND
                    (
                        l.end_date > ${ this.first_notification_day } OR
                        l.end_date IS NULL
                    )
            ),
            0
        )
    )`;

    let total_spaces_in_property = `(
        SELECT COUNT(u.id)
        FROM units u
        WHERE
            (
                u.deleted >= ${ this.first_notification_day } OR
                u.deleted IS NULL
            ) AND
            u.property_id = ${ this.property_id }
    )`;

    let store_occupancy = `${ occupied_spaces_in_property } / ${ total_spaces_in_property }`;

    this.queries = {
      
      rent_id: `('')`,
      
      rent_change_deployment_month: `(
          ${ this.deployment_month }
      )`,
      
      rent_change_total_rent_changes: `(
          ${ this.total_rent_changes }
      )` ,

      rent_change_manual_rent_changes: `(
          SELECT COUNT(id)
          FROM lease_rent_changes lrr
          WHERE
              lrr.deleted_at IS NULL AND
              lrr.type = 'manual' AND
              lrr.deployment_month = ${ this.deployment_month } AND
              lrr.property_id = ${ this.property_id }
      )`,

        rent_change_system_rent_changes: `(
            SELECT COUNT(id)
            FROM lease_rent_changes lrr
            WHERE
                lrr.deleted_at IS NULL AND
                lrr.type <> 'manual' AND
                lrr.deployment_month = ${ this.deployment_month } AND
                lrr.property_id = ${ this.property_id }
        )`,

        rent_change_over_under_sell_rate: `(
            SELECT IFNULL (
                (
                    CONCAT(
                        CAST(SUM(
                            CASE
                                WHEN unit_lrr.new_rent_amt >= unit_lrr.sell_rate THEN 1
                                ELSE 0
                            END
                        ) AS CHAR),
                    '/',
                        CAST(SUM(
                            CASE
                                WHEN unit_lrr.new_rent_amt < unit_lrr.sell_rate THEN 1
                                ELSE 0
                            END
                        ) AS CHAR)
                    )
                ),
                'N/A'
            )
            FROM (
                SELECT
                    lrr.lease_id,
                    l.unit_id,
                    lrr.new_rent_amt,
                    (
                        SELECT IFNULL(upc.price, upc.set_rate)
                        FROM unit_price_changes upc
                        WHERE
                            upc.unit_id = l.unit_id AND
                            DATE(upc.created) <= CURDATE()
                        ORDER BY upc.id DESC
                        LIMIT 1
                    ) AS sell_rate
                FROM lease_rent_changes lrr
                JOIN leases l ON l.id = lrr.lease_id
                WHERE
                    lrr.status NOT IN ('skipped', 'cancelled')
                    AND lrr.deployment_month = ${ this.deployment_month }
                    AND lrr.property_id = ${ this.property_id }
            ) AS unit_lrr
        )`,

        rent_change_variance_rent_sell: `(
            SELECT
                COALESCE(
                    ( (SUM(unit_lrr.new_rent_amt) - SUM(unit_lrr.sell_rate)) / SUM(unit_lrr.sell_rate) ), 
                    0
                )            
            FROM (
                SELECT
                    lrr.lease_id,
                    l.unit_id,
                    lrr.new_rent_amt,
                    (
                        SELECT IFNULL(upc.price, upc.set_rate)
                        FROM unit_price_changes upc
                        WHERE
                            upc.unit_id = l.unit_id AND
                            DATE(upc.created) <= CURDATE()
                        ORDER BY upc.id DESC
                        LIMIT 1
                    ) AS sell_rate
                FROM lease_rent_changes lrr
                JOIN leases l ON l.id = lrr.lease_id
                WHERE
                    lrr.status NOT IN ('skipped', 'cancelled')
                    AND lrr.deployment_month = ${ this.deployment_month }
                    AND lrr.property_id = ${ this.property_id }
            ) AS unit_lrr
        )`,

        rent_change_total_rent_increase: `(
            SELECT 
            IFNULL(SUM(lrr.new_rent_amt) - SUM((${get_current_rent_of_lease(`lrr.lease_id`, this.oldRentDate)})),0)
            FROM lease_rent_changes lrr
            WHERE
                lrr.status NOT IN ('skipped', 'cancelled') AND
                lrr.deployment_month = ${ this.deployment_month } AND
                lrr.property_id = ${ this.property_id }
        )`,

        rent_change_approval_deadline_left: `(
            CASE
                WHEN (
                    DATEDIFF(${ this.first_approval_deadline_date }, ${ this.date }) < ${ approval_deadline_display_days } AND
                    DATEDIFF(${ this.first_approval_deadline_date }, ${ this.date }) > 0 AND
                    ${ count_of_initiated_rent_changes } > 0
                    ) THEN DATEDIFF(${ this.first_approval_deadline_date }, ${ this.date })
                ELSE NULL
            END
        )`,

        rent_change_approval_deadline_date: `(
            CASE
                WHEN (
                    ${ this.first_approval_deadline_date } IS NOT NULL AND
                    ${ count_of_initiated_rent_changes } > 0
                ) THEN ${ this.first_approval_deadline_date }
                ELSE 'N/A'
            END
        )`,

        rent_change_approval_status:`(
            CASE
                WHEN ${ count_of_skipped_rent_changes } = ${ this.total_rent_changes } THEN 'Skipped'
                WHEN ${ count_of_cancelled_rent_changes } = ${ this.total_rent_changes } THEN 'Cancelled'
                WHEN (
                    (${ count_of_skipped_rent_changes }) +
                    (${ count_of_cancelled_rent_changes })
                ) = ${ this.total_rent_changes } THEN 'Cancelled'
                WHEN ${ count_of_initiated_rent_changes } > 0 THEN 'To Approve'
                WHEN ${ count_of_manually_approved_rent_changes } > 0 THEN 'Approved'
                WHEN ${ count_of_auto_approved_rent_changes } > 0 THEN 'Auto Approved'
                WHEN ${ count_of_deployed_skipped_and_cancelled_rent_changes } = ${ this.total_rent_changes } THEN 'Deployed'
                ELSE 'N/A'
            END
        )`,

        rent_change_store_occupancy: `(
            CASE
                WHEN (
                    ${ this.first_notification_day } IS NULL OR
                    ${ this.date } < ${ this.first_notification_day }
                ) THEN
                    'N/A'
                ELSE
                    ${ store_occupancy }
            END
        )`,

        rent_change_move_out_in_90_days: `(
            CASE
                WHEN (
                    ${ this.first_notification_day } IS NULL OR
                    ${ this.date } < ${ this.first_notification_day }
                ) THEN
                    'N/A'
                ELSE
                    ${ move_out_in_90_days }
            END
        )`,

        rent_change_deployed_rent_changes: `(
            SELECT COUNT(lrr.id)
            FROM lease_rent_changes lrr
            WHERE
                lrr.deleted_at IS NULL AND
                lrr.status = 'deployed' AND
                lrr.deployment_month = ${ this.deployment_month } AND
                lrr.property_id = ${ this.property_id }
        )`,

        rent_change_approved_rent_changes: `(
            SELECT COUNT(lrr.id)
            FROM lease_rent_changes lrr
            WHERE
                lrr.deleted_at IS NULL AND
                lrr.status = 'approved' AND
                lrr.deployment_month = ${ this.deployment_month } AND
                lrr.property_id = ${ this.property_id }
        )`,

        rent_change_scheduled_rent_changes: count_of_initiated_rent_changes,

        rent_change_cancelled_rent_changes: count_of_cancelled_rent_changes,

        rent_change_skipped_rent_changes: count_of_skipped_rent_changes,  

    }
  }
}

module.exports = RentChangeDeploymentMonthQueries;