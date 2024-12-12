module.exports = {
    getUnitGroups(connection, property_id, profile_id = null, unit_id = null) {

        const integrations = `('prorize', 'veritec', 'price_monster')`
        
        let other_conditions = ''

        let lease_check_date = `cast('2099-12-31' as datetime)`

        if(profile_id) {
            other_conditions += ` AND ugp.id = ${connection.escape(profile_id)} `
        }

        if(unit_id) {
            other_conditions += ` AND u.id = ${connection.escape(unit_id)} `
        }

        let sql = `
            SELECT ug.id, ugp.property_id, ug.unit_group_hashed_id, (sum(Q_OSR_OAO(l.id,u.status,1)) / COUNT(ugu.id)) as occupancy,
            CASE
                WHEN rmp.id IS NULL THEN (SELECT rmpn.settings as settings FROM company_rate_management_settings crms JOIN rate_management_plans rmpn on rmpn.id =  crms.default_rate_management_plan WHERE crms.company_id = p.company_id)
                ELSE rmp.settings
            END AS settings,
            CASE
                WHEN rmp.id IS NULL THEN  (SELECT rmpn.price_delta_type as price_delta_type FROM company_rate_management_settings crms JOIN rate_management_plans rmpn on rmpn.id =  crms.default_rate_management_plan WHERE crms.company_id = p.company_id)
                ELSE rmp.price_delta_type
            END AS price_delta_type,
            (SELECT 
                COALESCE(
                    rmp.round_to,
                    (CASE WHEN rmp.id is NULL THEN
                    (SELECT rmp2.round_to FROM rate_management_plans rmp2 JOIN company_rate_management_settings crms2 ON crms2.default_rate_management_plan = rmp2.id WHERE rmp2.company_id = p.company_id) ELSE NULL 
                    END),
                    (SELECT prms.round_to FROM property_rate_management_settings prms WHERE prms.property_id = p.id),
                    (SELECT crms.round_to FROM company_rate_management_settings crms WHERE crms.company_id = p.company_id)
                )
            ) AS round_to,
            rmp.id as rate_man_id
            FROM property_rate_management_settings prms
            JOIN unit_group_profiles ugp on prms.property_id = ugp.property_id and ugp.id = prms.default_unit_group_profile_id
            JOIN properties p on p.id = ugp.property_id and p.id = ${connection.escape(property_id)}
            JOIN unit_groups ug on ug.unit_group_profile_id = ugp.id
            LEFT JOIN unit_group_units ugu ON ug.id = ugu.unit_groups_id
            LEFT JOIN units u ON u.id = ugu.unit_id
            LEFT JOIN leases as l on u.id = l.unit_id and CURDATE() >= ifnull(l.start_date,${lease_check_date}) and CURDATE() < ifnull(l.end_date,${lease_check_date}) and l.status = 1
            LEFT JOIN property_space_group_tier_rate_management_plans pst on pst.tier_id = ug.unit_group_hashed_id
            LEFT JOIN rate_management_plans rmp on rmp.id = pst.rate_management_plan_id
            WHERE prms.active = 1 AND IFNULL(pst.active, 1) AND prms.rate_engine NOT IN ${integrations} ${other_conditions} AND u.deleted IS NULL
            GROUP BY ug.id
        `
        return connection.queryAsync(sql).then((q) => (q.length ? q : []))
    },

    getUnitsPrice(connection, space_group_id) {
        let sql = `SELECT
            u.id,
            (SELECT upc.set_rate FROM unit_price_changes upc WHERE upc.unit_id = u.id ORDER BY upc.start desc limit 1) AS price,
            (SELECT upc.price FROM unit_price_changes upc WHERE upc.unit_id = u.id ORDER BY upc.start desc limit 1) AS sell_rate,
            (SELECT upc.id FROM unit_price_changes upc WHERE upc.unit_id = u.id ORDER BY upc.start desc limit 1) AS upcm_id
            FROM
            unit_groups ug
            JOIN unit_group_units ugu on ugu.unit_groups_id = ug.id
            JOIN units u on u.id = ugu.unit_id
            WHERE u.deleted IS NULL
            AND ug.unit_group_hashed_id = ${connection.escape(space_group_id)}`
        return connection.queryAsync(sql).then((q) => (q.length ? q : []))
    },

    insertUnitPriceChanges(connection, data) {
        console.log("Cron Rate - Data to insert: ", data)
        let sql = "INSERT INTO unit_price_changes (`unit_id`,`price`,`change`,`start`, `set_rate`) VALUES ?"
        return connection.queryAsync(sql, [data])
    },

    updateUnitPriceChanges(connection, data) {
        console.log("Cron Rate - Data to update: ", data)
        let sql = `INSERT INTO unit_price_changes (id,end) VALUES ? ON DUPLICATE KEY UPDATE end=VALUES(end);`
        return connection.queryAsync(sql, [data])
    },

    getActiveProperties(connection, company_id) {
        let sql = `
            SELECT prms.property_id
            FROM property_rate_management_settings prms
            JOIN properties p on p.id = prms.property_id and p.company_id = ${connection.escape(company_id)}
            WHERE prms.active = 1`
        return connection.queryAsync(sql).then((q) => (q.length ? q : []))
    },

    saveLog(connection, data) {
        console.log("Log Cron: ", data)
        let sql = "INSERT INTO property_based_revenue_management_history (`property_id`,`date`,`status`) VALUES ?"
        return connection.queryAsync(sql, [data])
    },

    isCronDoneBefore(connection, property_id) {
        let sql = `SELECT
            count(id) as cron_status
            FROM
            property_based_revenue_management_history rh
            WHERE rh.property_id = ${connection.escape(property_id)} AND rh.date = DATE(NOW());`
        return connection.queryAsync(sql).then((q) => (q.length ? q[0].cron_status : false))
    },

    refreshUnitGroup(connection, profile_id) {
        console.log("Calling refresh unit group procedure for ", profile_id);
        let sql = `CALL refresh_unit_group(${profile_id});`
        return connection.queryAsync(sql).then(res => res.length ? res[0] : null)
    },

    findProfileByProperty(connection, property_id){
        let sql = `Select id from unit_group_profiles where active = 1 and property_id IN (${connection.escape(property_id)})`
        return connection.queryAsync(sql);
    },
    
    findProfileByAmenity(connection, amenity_property_id){
        let sql = `Select
        ugs.unit_group_profile_id as id
        from
            unit_group_profile_settings_amenities uga
        join unit_group_profile_settings ugs on
            uga.unit_group_profile_settings_id = ugs.id
        where
        uga.amenity_property_id IN (${connection.escape(amenity_property_id)})`;
        return connection.queryAsync(sql);
    },
}
