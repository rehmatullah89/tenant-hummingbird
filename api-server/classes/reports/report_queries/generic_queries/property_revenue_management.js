class PropertyRevenueManagement {
    constructor(data) {

        let { 
            ids: property_ids = [], 
            company_id = '', 
            default_unit_group_profile_id, 
            ug_id 
        } = data;

        let lease_check_date = `cast('2099-12-31' as datetime)`

        let vacant_spaces = `(
            SELECT count(u.id)
            FROM unit_groups AS ug
            JOIN unit_group_units AS ugu ON ug.id = ugu.unit_groups_id
            JOIN units u ON u.id = ugu.unit_id
            WHERE 
                ug.unit_group_profile_id = ${default_unit_group_profile_id}AND ug.id = ${ug_id} AND u.deleted IS NULL AND u.id NOT IN (
                    SELECT l.unit_id FROM leases l WHERE l.status = 0 AND l.id IN (
                        SELECT r.lease_id FROM reservations r WHERE r.expires >= CURRENT_TIMESTAMP
                    )
                )
                AND u.id not in (SELECT l.unit_id FROM leases l where l.status = 1 and (l.end_date is null or l.end_date > CURDATE()))
                AND u.id NOT IN (
                    SELECT unit_id FROM leases WHERE status = 2
                ) AND u.id NOT IN (
                    SELECT unit_id FROM overlocks WHERE status = 1
                ) AND u.id NOT IN (
                    SELECT unit_id FROM unit_holds WHERE expires > CURRENT_TIMESTAMP
                ) AND u.id NOT IN (
                    select unit_id from unit_status_changes where status="deactivated" and id in (
                        select max(usc.id) from unit_status_changes as usc where usc.status in ('activated','deactivated') group by usc.unit_id
                    )
                )
                AND (u.available_date is null or u.available_date <= CURDATE())
                AND u.status = 1
            )`

        let occupied_spaces = `
            (SELECT IFNULL((SELECT sum(Q_OSR_OAO(l.id,u.status,1))
            FROM unit_groups AS ug
            JOIN unit_group_units AS ugu ON ug.id = ugu.unit_groups_id
            JOIN units u ON u.id = ugu.unit_id
            LEFT JOIN leases as l on u.id = l.unit_id and CURDATE() >= ifnull(l.start_date,${lease_check_date}) and CURDATE() < ifnull(l.end_date,${lease_check_date}) and l.status = 1
            WHERE ug.unit_group_profile_id = ${default_unit_group_profile_id} AND ug.id = ${ug_id} AND u.deleted IS NULL GROUP BY ug.id), 0))`

        let total_spaces = `(SELECT COALESCE(( SELECT (COUNT(ugu.id)) FROM unit_groups AS ug JOIN unit_group_units AS ugu ON ug.id = ugu.unit_groups_id
            JOIN  units AS u ON u.id = ugu.unit_id and u.deleted IS NULL
            WHERE ug.unit_group_profile_id = ${default_unit_group_profile_id} and ug.id = ${ug_id} GROUP BY ug.id),0))`

        let occupancy = `(SELECT COALESCE((SELECT ${occupied_spaces}/(COUNT(ugu.id)) FROM unit_groups AS ug
            JOIN unit_group_units AS ugu ON ug.id = ugu.unit_groups_id
            JOIN  units AS u ON u.id = ugu.unit_id and u.deleted IS NULL
            WHERE ug.unit_group_profile_id = ${default_unit_group_profile_id} and ug.id = ${ug_id} GROUP BY ug.id),0))`

        let gross_potential_revenue = `(SELECT  COALESCE((
            SELECT (SUM(IFNULL((SELECT upc.price FROM unit_price_changes upc WHERE upc.unit_id = u.id ORDER BY upc.id DESC LIMIT 1), 0)) / COUNT(ugu.id)) * COUNT(ugu.id)
            FROM unit_groups AS ug
            JOIN
            unit_group_units AS ugu ON ug.id = ugu.unit_groups_id
            JOIN
            units u ON u.id = ugu.unit_id
            WHERE ug.unit_group_profile_id = ${default_unit_group_profile_id} and u.deleted IS NULL
            and ug.id = ${ug_id} GROUP BY ug.id),0))`

        let total_rent_occupied = `
            (SELECT COALESCE(( SELECT
            SUM(IFNULL(s.price, 0))
            FROM unit_groups AS ug
            JOIN
            unit_group_units AS ugu ON ug.id = ugu.unit_groups_id
            JOIN
            units u ON u.id = ugu.unit_id
            LEFT OUTER JOIN
            leases as l on u.id = l.unit_id and CURDATE() >= ifnull(l.start_date,${lease_check_date}) and CURDATE() < ifnull(l.end_date,${lease_check_date}) and l.status = 1
            LEFT OUTER JOIN services as s on l.id = s.lease_id and s.product_id in (select id from products where default_type = 'rent' and status = 1)
            and s.status = 1 and CURDATE() >= ifnull(s.start_date,${lease_check_date}) and CURDATE() < ifnull(s.end_date,${lease_check_date})
            WHERE ug.unit_group_profile_id = ${default_unit_group_profile_id} and ug.id = ${ug_id} AND u.deleted is NULL AND Q_OSR_OAO(l.id,u.status,1) = 1
            GROUP BY ug.id),0))`

        let total_sell_rate_available = `(SELECT COALESCE((
            SELECT
            SUM(IFNULL((SELECT upc.price FROM unit_price_changes upc WHERE upc.unit_id = u.id ORDER BY upc.id DESC LIMIT 1), 0))
            FROM unit_groups AS ug
            JOIN
            unit_group_units AS ugu ON ug.id = ugu.unit_groups_id
            JOIN
            units u ON u.id = ugu.unit_id
            LEFT OUTER JOIN leases as l on u.id = l.unit_id and CURDATE() >= ifnull(l.start_date,${lease_check_date}) and CURDATE() < ifnull(l.end_date,${lease_check_date}) and l.status = 1
            WHERE ug.unit_group_profile_id = ${default_unit_group_profile_id} and ug.id = ${ug_id}
            AND u.deleted is NULL AND u.id NOT IN (
                SELECT l.unit_id FROM leases l WHERE l.status = 0 AND l.id IN (
                    SELECT r.lease_id FROM reservations r WHERE r.expires >= CURRENT_TIMESTAMP
                )
            )
            AND u.id not in (SELECT l.unit_id FROM leases l where l.status = 1 and (l.end_date is null or l.end_date > CURDATE()))
            AND u.id NOT IN (
                SELECT unit_id FROM leases WHERE status = 2
            ) AND u.id NOT IN (
                SELECT unit_id FROM overlocks WHERE status = 1
            ) AND u.id NOT IN (
                SELECT unit_id FROM unit_holds WHERE expires > CURRENT_TIMESTAMP
            ) AND u.id NOT IN (
                select unit_id from unit_status_changes where status="deactivated" and id in (
                    select max(usc.id) from unit_status_changes as usc where usc.status in ('activated','deactivated') group by usc.unit_id
                )
            )
            AND (u.available_date is null or u.available_date <= CURDATE())
            AND u.status = 1
            GROUP BY ug.id),0))`

        let potential_income = `(SELECT COALESCE(${total_rent_occupied} + ${total_sell_rate_available}, 0))`

        let average_sell_rate_space = `(SELECT COALESCE((
            SELECT
            SUM(IFNULL((SELECT upc.price FROM unit_price_changes upc WHERE upc.unit_id = u.id ORDER BY upc.id DESC LIMIT 1), 0)) / COUNT(ugu.id)
            FROM unit_groups AS ug
            JOIN
            unit_group_units AS ugu ON ug.id = ugu.unit_groups_id
            JOIN
            units u ON u.id = ugu.unit_id
            WHERE ug.unit_group_profile_id = ${default_unit_group_profile_id} and ug.id = ${ug_id}
            AND u.deleted IS NULL
            GROUP BY ug.id),0))`

        let average_rent_space =  `(SELECT COALESCE((SELECT AVG(ifnull(s.price,0))
            FROM unit_groups AS ug
            JOIN
            unit_group_units AS ugu ON ug.id = ugu.unit_groups_id
            JOIN
            units u ON u.id = ugu.unit_id
            JOIN leases as l on u.id = l.unit_id and CURDATE() >= ifnull(l.start_date,${lease_check_date}) and CURDATE() < ifnull(l.end_date,${lease_check_date}) and l.status = 1
            JOIN services as s on l.id = s.lease_id and s.product_id in (select id from products where default_type = 'rent' and status = 1)
            and s.status = 1 and CURDATE() >= ifnull(s.start_date,${lease_check_date}) and CURDATE() < ifnull(s.end_date,${lease_check_date})
            WHERE ug.unit_group_profile_id = ${default_unit_group_profile_id} and ug.id = ${ug_id} and Q_OSR_OAO(l.id,u.status,1) = 1 GROUP BY ug.id),0))`

        let variance = `(SELECT COALESCE(${average_rent_space} - ${average_sell_rate_space}, 0))`

        let variance_percent = `(SELECT TRUNCATE(COALESCE((SELECT (${variance})/(${average_sell_rate_space})),0), 5))`

        let spacegroup_economic_occupancy = `(SELECT COALESCE((SELECT (${total_rent_occupied})/(${gross_potential_revenue})),0))`

        /**
         * Key based queries
         */
        this.queries = {
            
            spacegroup_id: `(SELECT ug.id FROM unit_groups AS ug WHERE ug.unit_group_profile_id = ${default_unit_group_profile_id} and ug.id = ${ug_id} GROUP BY ug.id)`,

            spacegroup_size: `(SELECT
                CASE WHEN ug.tier_type = 'size' THEN CONCAT(ug.width, "' x ", ug.length, "'")
                WHEN ug.tier_type = 'area' THEN IFNULL(CONCAT(ug.min_sqft, "-", ug.max_sqft, " sqft"),CONCAT(ug.min_sqft,"+ sqft"))
                ELSE NULL
                END
                FROM unit_groups AS ug WHERE ug.unit_group_profile_id = ${default_unit_group_profile_id} and ug.id = ${ug_id} GROUP BY ug.id)`,

            spacegroup_category: `(SELECT ug.space_type FROM unit_groups AS ug WHERE ug.unit_group_profile_id = ${default_unit_group_profile_id} and ug.id = ${ug_id} GROUP BY ug.id)`,

            spacegroup_id_hash: `(SELECT ug.unit_group_hashed_id FROM unit_groups AS ug WHERE ug.unit_group_profile_id = ${default_unit_group_profile_id} and ug.id = ${ug_id} GROUP BY ug.id)`,
            
            spacegroup_amenities: `(SELECT ug.label FROM unit_groups AS ug WHERE ug.unit_group_profile_id = ${default_unit_group_profile_id} and ug.id = ${ug_id} GROUP BY ug.id)`,

            // Exposed keys
            spacegroup_spacetype: `(SELECT CONCAT(UCASE(LEFT(ug.space_type, 1)), SUBSTRING(ug.space_type, 2))
                FROM unit_groups AS ug WHERE ug.unit_group_profile_id = ${default_unit_group_profile_id} and ug.id = ${ug_id} GROUP BY ug.id)`,

            spacegroup_spaces: total_spaces,

            spacegroup_spaces_vacant: vacant_spaces,

            spacegroup_occupied_spaces: occupied_spaces,

            spacegroup_occupancy: occupancy,

            spacegroup_avg_days_vacant: `(SELECT COALESCE((SELECT IFNULL(ROUND(IFNULL((
                SELECT SUM(IFNULL(DATEDIFF(CURDATE(), (SELECT MAX(l1.end_date) FROM leases l1 WHERE l1.end_date < CURDATE() AND l1.status = 1
                AND l1.unit_id = u.id AND l1.unit_id NOT IN (SELECT l2.unit_id FROM leases l2 WHERE l2.status = 1
                AND l2.end_date IS NULL OR l2.end_date  > CURDATE()))),0))) / ${vacant_spaces}, 0)),0)
                FROM unit_groups AS ug
                JOIN
                unit_group_units AS ugu ON ug.id = ugu.unit_groups_id
                JOIN
                units u ON u.id = ugu.unit_id
                LEFT OUTER JOIN leases as l on u.id = l.unit_id and CURDATE() >= ifnull(l.start_date,${lease_check_date}) and CURDATE() < ifnull(l.end_date,${lease_check_date}) and l.status = 1
                WHERE ug.unit_group_profile_id = ${default_unit_group_profile_id} and ug.id = ${ug_id} and u.deleted IS NULL
                AND u.id NOT IN (
                    SELECT l.unit_id FROM leases l WHERE l.status = 0 AND l.id IN (
                        SELECT r.lease_id FROM reservations r WHERE r.expires >= CURRENT_TIMESTAMP
                    )
                )
                AND u.id not in (SELECT l.unit_id FROM leases l where l.status = 1 and (l.end_date is null or l.end_date > CURDATE()))
                AND u.id NOT IN (
                    SELECT unit_id FROM leases WHERE status = 2
                ) AND u.id NOT IN (
                    SELECT unit_id FROM overlocks WHERE status = 1
                ) AND u.id NOT IN (
                    SELECT unit_id FROM unit_holds WHERE expires > CURRENT_TIMESTAMP
                ) AND u.id NOT IN (
                    select unit_id from unit_status_changes where status="deactivated" and id in (
                        select max(usc.id) from unit_status_changes as usc where usc.status in ('activated','deactivated') group by usc.unit_id
                    )
                )
                AND (u.available_date is null or u.available_date <= CURDATE())
                AND u.status = 1
                GROUP BY ug.id),0))`,

            spacegroup_avg_rent_per_space: average_rent_space,

            spacegroup_avg_rent_per_sqft: `(SELECT COALESCE((SELECT
                IFNULL((SUM(IFNULL(s.price, 0)) / SUM(
                    CASE
                        WHEN l.id
                        THEN CAST(
                            (
                            SELECT (
                                IFNULL((SELECT value FROM amenity_units WHERE amenity_property_id = (SELECT DISTINCT ap.id FROM amenity_property ap WHERE ap.property_id = un.property_id AND ap.amenity_name = 'width' AND ap.property_type = un.type) AND unit_id = un.id), 0)
                                *
                                IFNULL((SELECT value FROM amenity_units WHERE amenity_property_id = (SELECT DISTINCT ap.id FROM amenity_property ap WHERE ap.property_id = un.property_id AND ap.amenity_name = 'length' AND ap.property_type = un.type) AND unit_id = un.id), 0)
                            )
                            FROM units un WHERE un.id = u.id
                            )
                        AS DECIMAL(10,2))
                    END
                )), 0)
                FROM unit_groups AS ug
                JOIN
                unit_group_units AS ugu ON ug.id = ugu.unit_groups_id
                JOIN
                units u ON u.id = ugu.unit_id
                JOIN
                leases as l on u.id = l.unit_id and CURDATE() >= ifnull(l.start_date,${lease_check_date}) and CURDATE() < ifnull(l.end_date,${lease_check_date}) and l.status = 1
                JOIN services as s on l.id = s.lease_id and s.product_id in (select id from products where default_type = 'rent' and status = 1)
                and s.status = 1 and CURDATE() >= ifnull(s.start_date,${lease_check_date}) and CURDATE() < ifnull(s.end_date,${lease_check_date})
                WHERE ug.unit_group_profile_id = ${default_unit_group_profile_id}
                AND u.deleted IS NULL AND Q_OSR_OAO(l.id,u.status,1) = 1
                and ug.id = ${ug_id} GROUP BY ug.id),0))`,

            spacegroup_avg_sell_rate: average_sell_rate_space,

            spacegroup_avg_sell_rate_per_sqft: `
                (SELECT COALESCE((
                SELECT
                SUM(IFNULL((SELECT upc.price FROM unit_price_changes upc WHERE upc.unit_id = u.id ORDER BY upc.id DESC LIMIT 1), 0)) / SUM(
                    CAST(
                        (
                        SELECT (
                            IFNULL((SELECT value FROM amenity_units WHERE amenity_property_id = (SELECT distinct ap.id FROM amenity_property ap WHERE ap.property_id = un.property_id AND ap.amenity_name = 'width' AND ap.property_type = un.type) AND unit_id = un.id), 0)
                            *
                            ifnull((SELECT value from amenity_units where amenity_property_id = (SELECT distinct ap.id FROM amenity_property ap where ap.property_id = un.property_id AND ap.amenity_name = 'length' AND ap.property_type = un.type) AND unit_id = un.id), 0)
                        )
                        FROM units un WHERE un.id = u.id
                        )
                    AS DECIMAL(10,2)
                    )
                )
                FROM unit_groups AS ug
                JOIN
                unit_group_units AS ugu ON ug.id = ugu.unit_groups_id
                JOIN
                units u ON u.id = ugu.unit_id
                WHERE ug.unit_group_profile_id = ${default_unit_group_profile_id} and ug.id = ${ug_id} AND u.deleted IS NULL GROUP BY ug.id),0))`,

            spacegroup_avg_set_rate: `
                (SELECT COALESCE((
                SELECT SUM(
                (SELECT IFNULL(upc.set_rate,0) FROM unit_price_changes upc WHERE upc.unit_id = u.id ORDER BY upc.created DESC LIMIT 1)) / COUNT(ugu.id)
                FROM unit_groups AS ug
                JOIN
                unit_group_units AS ugu ON ug.id = ugu.unit_groups_id
                JOIN
                units u ON u.id = ugu.unit_id
                WHERE ug.unit_group_profile_id = ${default_unit_group_profile_id} and ug.id = ${ug_id} AND u.deleted IS NULL GROUP BY ug.id),0))`,

            spacegroup_avg_set_rate_per_sqft: `
                (SELECT COALESCE((
                    SELECT SUM(
                    (SELECT IFNULL(upc.set_rate,0) FROM unit_price_changes upc WHERE upc.unit_id = u.id ORDER BY upc.created DESC LIMIT 1)) / SUM(
                    CAST(
                        (
                            SELECT (
                            IFNULL((SELECT value from amenity_units where amenity_property_id = (SELECT DISTINCT ap.id FROM amenity_property ap WHERE ap.property_id = un.property_id AND ap.amenity_name = 'width' AND ap.property_type = un.type) AND unit_id = un.id), 0)
                            *
                            IFNULL((SELECT value from amenity_units where amenity_property_id = (SELECT DISTINCT ap.id FROM amenity_property ap WHERE ap.property_id = un.property_id AND ap.amenity_name = 'length' AND ap.property_type = un.type) AND unit_id = un.id), 0)
                            )
                            FROM units un WHERE un.id = u.id
                        )
                        AS DECIMAL(10,2)
                    )
                    )
                FROM unit_groups AS ug
                JOIN
                unit_group_units AS ugu ON ug.id = ugu.unit_groups_id
                JOIN
                units u ON u.id = ugu.unit_id
                WHERE ug.unit_group_profile_id = ${default_unit_group_profile_id} and ug.id = ${ug_id} AND u.deleted IS NULL GROUP BY ug.id),0))`,

            spacegroup_current_income: total_rent_occupied,

            spacegroup_economic_occupancy: spacegroup_economic_occupancy,

            spacegroup_gross_potential_revenue: gross_potential_revenue,

            spacegroup_potential_income: potential_income,
            
            spacegroup_variance_amount: variance,

            spacegroup_variance_percentage: variance_percent,

        }
    }
}

module.exports = PropertyRevenueManagement;

