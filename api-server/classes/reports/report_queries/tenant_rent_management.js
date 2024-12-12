class TenantRentManagementQueries {
  constructor(data) {
    this.leaseId = data.id;
    this.unitId = `( SELECT unit_id FROM leases WHERE id = ${this.leaseId})`
    this.currentRent = `(
      SELECT s.price
      FROM services s 
      JOIN products p ON 
          s.product_id = p.id AND
          p.default_type = 'rent'
      WHERE
          s.lease_id = ${this.leaseId} AND
          s.status = 1 AND
          s.start_date <= CURDATE() AND 
          (
            s.end_date IS NULL OR
            s.end_date >= CURDATE() 	
          )
      ORDER BY start_date DESC 
      LIMIT 1
    )`
    this.newRent = `(
      SELECT new_rent_amt
      FROM lease_rent_changes lrr 
      WHERE
        lrr.lease_id = ${this.leaseId} AND
        (
          lrr.status = 'initiated' OR 
          lrr.status = 'approved'
        ) AND 
        lrr.effective_date > CURDATE() AND 
        lrr.deleted_at IS NULL 
      ORDER BY lrr.effective_date
      ASC LIMIT 1
    )`
    this.queries = {
      tenant_selected_rent_plan:  `(
        SELECT IFNULL(
          (SELECT rmp.name
          FROM rent_management_plans rmp
          JOIN lease_rent_plan_settings lrps ON rmp.id = lrps.rent_plan_id
          WHERE
            lrps.lease_id = ${this.leaseId} AND
            (
              lrps.status = 'active' OR
              lrps.status = 'exempt'
            ) AND
            lrps.end_date IS NULL AND
            rmp.deleted_at IS NULL), '-'
        )
      )`,
      tenant_rent_plan_id:  `(
        SELECT
          lrps.rent_plan_id
        FROM
          lease_rent_plan_settings lrps
        JOIN rent_management_plans rmp on
          rmp.id = lrps.rent_plan_id
        WHERE
          lrps.lease_id = ${this.leaseId}
          AND (lrps.status IN ('active', 'exempt'))
          AND lrps.end_date IS NULL
          AND rmp.deleted_at IS NULL)`,

      tenant_rent_change_id:  `(SELECT lrr.id FROM lease_rent_changes lrr WHERE lrr.lease_id = ${this.leaseId} AND lrr.status IN ('initiated','approved') 
        AND lrr.effective_date > CURDATE() AND lrr.deleted_at IS NULL ORDER BY lrr.effective_date ASC LIMIT 1)`,
      
      tenant_scheduled_rent_change: `(
        SELECT lrr.effective_date
        FROM lease_rent_changes lrr 
        WHERE 
          lrr.effective_date > CURDATE() AND
          lrr.lease_id = ${this.leaseId} AND
          (
            lrr.status = 'initiated' OR 
            lrr.status = 'approved'
          ) AND lrr.\`type\` = 'auto'
        ORDER BY lrr.effective_date 
        ASC LIMIT 1
      )`,

      tenant_last_rent_change_date: `(
        SELECT DATE_FORMAT(lrr.effective_date, "%m/%d/%Y") 
        FROM lease_rent_changes lrr
        WHERE 
          lrr.effective_date <= CURDATE() AND
          lrr.lease_id = ${this.leaseId} AND
          lrr.status = 'deployed'
        ORDER BY lrr.effective_date 
        DESC LIMIT 1
      )`,

      tenant_last_rent_change_days: `(
        SELECT DATEDIFF(CURDATE(), s.start_date)
        FROM services s
        WHERE
          product_id IN (
            SELECT id
            FROM products
            WHERE default_type = 'rent'
          ) and
          start_date <= CURDATE()  AND
          (
            end_date IS NULL OR
            end_date >= CURDATE()
          ) AND
          lease_id = ${this.leaseId} AND
          status = 1
        ORDER BY s.start_date DESC LIMIT 1
      )`,

      tenant_next_rent_change: `(
        SELECT lrr.effective_date 
        FROM lease_rent_changes lrr 
        WHERE
          lrr.lease_id = ${this.leaseId} AND
          lrr.effective_date > CURDATE() AND
          (
            lrr.status = 'initiated' OR 
            lrr.status = 'approved'
          )
        ORDER BY lrr.effective_date
        ASC LIMIT 1
      )`,

      tenant_length_of_stay: `(
        SELECT DATEDIFF(CURDATE(), leases.start_date)
        FROM leases
        WHERE leases.id = ${this.leaseId}
      )`,

      tenant_new_rent: this.newRent,

      tenant_new_rent_variance: `(
        ${this.newRent} - ${this.currentRent}
      )`,

      tenant_rate_plan: `(
        SELECT IFNULL(
          (
            SELECT rmp.name 
            FROM unit_group_units ugu
            JOIN unit_groups ug ON ugu.unit_groups_id = ug.id
            JOIN property_space_group_tier_rate_management_plans psgtrmp ON psgtrmp.tier_id = ug.unit_group_hashed_id
            JOIN rate_management_plans rmp ON rmp.id = psgtrmp.rate_management_plan_id
            WHERE 
              ugu.unit_id = ${this.unitId} AND 
              ug.unit_group_profile_id = (
                SELECT prms.default_unit_group_profile_id 
                FROM property_rate_management_settings prms 
                WHERE property_id = (SELECT property_id FROM units WHERE units.id = ${this.unitId})
              )
          ), 
          (
            SELECT rmp.name 
            FROM company_rate_management_settings crms 
            JOIN rate_management_plans rmp ON rmp.id = crms.default_rate_management_plan
            WHERE crms.company_id = ${ data.company_id || '' }
          )
        )

      )`,

      tenant_active_promotions: `(
        SELECT p.name 
        FROM unit_groups AS ug
        JOIN unit_group_units ugu ON ugu.unit_groups_id = ug.id
        JOIN promotion_unit_group AS pug ON ug.unit_group_hashed_id = pug.unit_group_id
        JOIN promotions AS p ON pug.promotion_id = p.id
        WHERE 
          ug.unit_group_profile_id = ( 
            SELECT prms.default_unit_group_profile_id 
                FROM property_rate_management_settings prms 
                WHERE property_id = (SELECT property_id FROM units WHERE units.id = ${this.unitId})
          ) AND  
            ugu.unit_id = ${this.unitId} AND
            p.start_date <= CURDATE() AND
            p.end_date >= CURDATE() AND
            p.active = 1

      )`,

      tenant_space_group: `(
        SELECT ug.label 
        FROM unit_groups ug 
        JOIN unit_group_units ugu ON ugu.unit_groups_id = ug.id
        WHERE ug.unit_group_profile_id = (
          SELECT prms.default_unit_group_profile_id 
                FROM property_rate_management_settings prms 
                WHERE property_id = (SELECT property_id FROM units WHERE units.id = ${this.unitId})
        ) AND 
        ugu.unit_id = ${this.unitId}
      )`,

      tenant_days_left_to_rent_change: `(
        SELECT DATEDIFF(lrr.effective_date, CURDATE())
        FROM lease_rent_changes lrr
        WHERE
          lrr.lease_id = ${this.leaseId} AND
          lrr.effective_date > CURDATE() AND
          (
            lrr.status = 'initiated' OR
            lrr.status = 'approved'
          )
        ORDER BY lrr.effective_date
        ASC LIMIT 1
      )`,
      
      tenant_affect_timeline: `(SELECT lrr.affect_timeline FROM lease_rent_changes lrr WHERE lrr.lease_id = ${this.leaseId} AND lrr.status IN ('initiated','approved') 
      AND lrr.effective_date > CURDATE() AND lrr.deleted_at IS NULL ORDER BY lrr.effective_date ASC LIMIT 1)`,

      tenant_auction_status: `(SELECT l.auction_status)`
    }
  }
}

module.exports = TenantRentManagementQueries;


