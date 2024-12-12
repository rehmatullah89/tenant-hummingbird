const PropertyRevenueManagement = require(`./generic_queries/property_revenue_management`);

class PropertyRateManagement extends PropertyRevenueManagement {
  
  constructor(data) {
    super(data);

    let
      { default_unit_group_profile_id, ug_id } = data,

      company_default_plan_id = `(
        SELECT crms.default_rate_management_plan 
        FROM company_rate_management_settings crms 
        WHERE crms.company_id = ${ data.company_id || '' }
      )`,
      
      rate_management_plan_id = `(
        SELECT (IFNUll(psgtrmp.rate_management_plan_id, ${company_default_plan_id})) 
        FROM unit_groups AS ug 
        LEFT OUTER JOIN property_space_group_tier_rate_management_plans psgtrmp ON psgtrmp.tier_id = ug.unit_group_hashed_id 
        WHERE ug.unit_group_profile_id = ${default_unit_group_profile_id} and ug.id = ${ug_id}
      )`;

    this.queries = {

      ...this.queries,

      spacegroup_rate_plan_id: rate_management_plan_id,

      spacegroup_rate_plan_change_type: `(
        SELECT rmp.price_delta_type 
        FROM rate_management_plans rmp 
        WHERE rmp.id = ${rate_management_plan_id}
      )`,

      spacegroup_rate_plan_name: `(
        SELECT rmp.name 
        FROM rate_management_plans rmp 
        WHERE rmp.id = ${rate_management_plan_id}
      )`,

      spacegroup_rate_management_active: `(
        SELECT
          CASE
            WHEN psgtrmp.rate_management_plan_id and psgtrmp.active = 1 THEN 1
            WHEN psgtrmp.rate_management_plan_id and psgtrmp.active = 0 THEN 0
            WHEN ${company_default_plan_id} THEN 1
            ELSE 0
          END
        FROM  unit_groups AS ug
        LEFT OUTER JOIN property_space_group_tier_rate_management_plans psgtrmp ON psgtrmp.tier_id = ug.unit_group_hashed_id
        WHERE ug.unit_group_profile_id = ${default_unit_group_profile_id} and ug.id = ${ug_id} GROUP BY ug.id)`,
        
        spacegroup_default_promotion: `(
          SELECT p.name 
          FROM unit_groups AS ug
          JOIN promotion_unit_group AS pug ON ug.unit_group_hashed_id = pug.unit_group_id
          JOIN promotions AS p ON pug.promotion_id = p.id
          WHERE 
            ug.unit_group_profile_id = ${default_unit_group_profile_id} AND 
            ug.id = ${ug_id} and pug.type = 'regular' GROUP BY ug.id
        )`
    }
  }

}

module.exports = PropertyRateManagement;