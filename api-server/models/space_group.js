var e  = require(__dirname + '/../modules/error_handler.js');
var TotalUnits  = require('./msr/activity/total_units');
var ENUMS = require(__dirname + '/../modules/enums.js');

let SpaceGroup = {
    findByProperty(connection, property_id){
        let sql = `
            SELECT
                ugp.*,
                (SELECT SUM((SELECT COUNT(*) FROM unit_group_units ugu WHERE ugu.unit_groups_id = ug.id))) AS num_spaces,
                (SELECT COUNT(*) FROM unit_groups ug WHERE ug.unit_group_profile_id = ugp.id) AS num_groups
            FROM
                unit_groups ug
            RIGHT JOIN
                unit_group_profiles ugp ON ug.unit_group_profile_id = ugp.id
            WHERE
                ugp.active = 1 AND ugp.property_id = ${connection.escape(property_id)}
            GROUP BY ugp.id
        `
        return connection.queryAsync(sql);

    }, 
    async findProfileByProperty(connection, property_id){
        let sql = `Select id from unit_group_profiles where active = 1 and property_id IN (${connection.escape(property_id)})`;
        return await connection.queryAsync(sql);

    }, 
    async findById(connection, id, property_id){
        let sql = `Select * from unit_group_profiles where id = ${connection.escape(id)}`;
        if (property_id) sql += ` and property_id = ${connection.escape(property_id)}`
        
        let r = await connection.queryAsync(sql);
        return r.length ? r[0] : null ;
    },

    findByPropertyAndId(connection, { id, property_id }) {
        let query = `Select * from unit_group_profiles where active = 1 and property_id = ${connection.escape(
            property_id
        )} and id = ${connection.escape(id)}`;
        return connection
            .queryAsync(query)
            .then((response) => (response.length ? response[0] : null));
    },

    findExisting(connection, name, property_id){
        let sql = `Select * from unit_group_profiles where active = 1 and property_id = ${connection.escape(property_id)} and name = ${connection.escape(name)}`;


        return connection.queryAsync(sql);
    },

    async save(connection, data, space_group_id){
      let sql;

      if(space_group_id){
          sql = "UPDATE unit_group_profiles set ? where id = " + connection.escape(space_group_id);
      } else {
          sql = "INSERT INTO unit_group_profiles set ?";
      }
      console.log( connection.format(sql, data))
      let r = await connection.queryAsync(sql, data)
      return space_group_id ? space_group_id : r.insertId;

    },

    async deleteUnitGroupUnits(connection, space_group_id){
        let findIdSql = `SELECT id FROM unit_groups WHERE unit_group_profile_id = ${connection.escape(space_group_id)}`;
        let deleteUGUSql = `DELETE FROM unit_group_units WHERE unit_groups_id IN (${findIdSql})`;
        await connection.queryAsync(deleteUGUSql);
        let deleteUGSql = `DELETE FROM unit_groups WHERE unit_group_profile_id IN (${space_group_id})`;
        await connection.queryAsync(deleteUGSql);
      },

    async saveAmenities(connection, data, settings_amenity_id){
        let sql;

        if(settings_amenity_id){
            sql = "UPDATE unit_group_profile_settings_amenities set ? where id = " + connection.escape(settings_amenity_id);
        } else {
            sql = "INSERT INTO unit_group_profile_settings_amenities set ?";
        }
        console.log( connection.format(sql, data))
        let r = await connection.queryAsync(sql, data)
        return settings_amenity_id ? settings_amenity_id : r.insertId;
    },
    async saveTiers(connection, data){
        let sql;
        sql = "INSERT INTO unit_group_profile_settings_tiers set ?";
        console.log( connection.format(sql, data))
        let r = await connection.queryAsync(sql, data)
        return r.insertId;
    },

    async getAmenities(connection, settings_id){
        let sql = "SELECT amenity_property_id, unit_group_profile_settings_id, sort FROM unit_group_profile_settings_amenities where unit_group_profile_settings_id = " + connection.escape(settings_id);
        return await connection.queryAsync(sql)
    },

    async findAmenities(connection, unit_group_profile_settings_id){
        let sql = "SELECT * FROM unit_group_profile_settings_amenities where unit_group_profile_settings_id = " + connection.escape(unit_group_profile_settings_id) + ' order by `sort` asc';
        return await connection.queryAsync(sql)
    },

    async findTiers(connection, unit_group_profile_settings_id){
        let sql = "SELECT * FROM unit_group_profile_settings_tiers where unit_group_profile_settings_id = " + connection.escape(unit_group_profile_settings_id) + ' order by `min_sqft` asc';
        return await connection.queryAsync(sql);
    },

    async findSettings(connection, unit_group_profile_id, space_type_id){
        let sql = `Select * from unit_group_profile_settings where unit_group_profile_id = ${connection.escape(unit_group_profile_id)}`;

        if(space_type_id){
            sql += ` amd space_type_id = ${connection.escape(space_type_id)}`;
        }
        console.log("sql", sql)
        let r = await connection.queryAsync(sql);
        return r;
    },

    async saveSettings(connection, data, settings_id){
        let sql;

        if(settings_id){
            sql = "UPDATE unit_group_profile_settings set ? where id = " + connection.escape(settings_id);
        } else {
            sql = "INSERT INTO unit_group_profile_settings set ?";
        }

        let r = await connection.queryAsync(sql, data)
        return settings_id ? settings_id : r.insertId;

    },

      async findSettingsById(connection, settings_id){
        let sql = `Select unit_group_profile_id, space_type, tier_type, tier_default from unit_group_profile_settings where id = ${connection.escape(settings_id)}`;
        return connection.queryAsync(sql).then(a => a.length ? a : null );
    },


    async removeAmenities(connection, settings_id){
        let sql = `DELETE from unit_group_profile_settings_amenities where unit_group_profile_settings_id = ${connection.escape(settings_id)}`;
        console.log(sql);
        let r = await connection.queryAsync(sql)
    },

    async removeTiers(connection, settings_id){
        let sql = `DELETE from unit_group_profile_settings_tiers where unit_group_profile_settings_id = ${connection.escape(settings_id)}`;
        console.log("sql", sql)
        let r = await connection.queryAsync(sql)
      }, 

      async getTiers(connection, settings_id){
        let sql = `SELECT unit_group_profile_settings_id, min_sqft, max_sqft from unit_group_profile_settings_tiers where unit_group_profile_settings_id = ${connection.escape(settings_id)}`;
        return await connection.queryAsync(sql)
      }, 

      async removeTierDefault(connection, space_type, profile_id ){
        let sql = `UPDATE unit_group_profile_settings set tier_default = 0 where space_type = ${connection.escape(space_type)} and unit_group_profile_id in (select id from unit_group_profiles where property_id = (select property_id from unit_group_profiles where id = ${connection.escape(profile_id)} ) )`;
        console.log("sql", sql)
        let r = await connection.queryAsync(sql)
    },

    async findDefaultTiers(connection, property_id, space_type){
        let sql = `select * from unit_group_profile_settings_tiers where
                        unit_group_profile_settings_id = (select id from unit_group_profile_settings where tier_default = 1
                            and space_type =  ${connection.escape(space_type)}
                            and unit_group_profile_id in (select id from unit_group_profiles where property_id = ${connection.escape(property_id)}  ))
                    order by min_sqft asc `;

        return await connection.queryAsync(sql)
    },

    async findBreakdown(connection, space_group_id, space_type){
        let sql = `select COUNT(u.id) as num_spaces,
            ugpst.id as tier,
            concat(IFNULL(ugpst.min_sqft, 0), ' sqft ', IF(ugpst.max_sqft, CONCAT('to ', ugpst.max_sqft, ' sqft '), 'and above ')) as area,
            concat(au_width.value, "' x ", au_length.value, "'") as size,
            ugpst.min_sqft as min_sqft,
            ugpst.max_sqft as max_sqft,
            (select tier_type from unit_group_profile_settings where unit_group_profile_id = ${connection.escape(space_group_id)} and space_type = ${connection.escape(space_type)} and unit_group_profile_id in (select id from unit_group_profiles where property_id = u.property_id) LIMIT 1) as tier_type,
            type,
            (SELECT GROUP_CONCAT(
                    (SELECT IFNULL(
                        (SELECT IF(
                            amp.field_type = 'boolean',
                            (SELECT CONCAT(
                                amenity_name
                            ) from amenity_property ap where ap.id = (select amenity_property_id from amenity_units where unit_id = u.id and amenity_property_id = amp.id )),
                            (select value from amenity_units where unit_id = u.id and amenity_property_id = amp.id )
                        )),
                        CONCAT("No ", amenity_name)
                    ))
                    ORDER BY ugpsa.sort ASC
			            SEPARATOR " > "
                )
                FROM amenity_property amp
                    LEFT JOIN unit_group_profile_settings_amenities ugpsa on ugpsa.amenity_property_id = amp.id
                    LEFT JOIN unit_group_profile_settings ugps on ugps.id = ugpsa.unit_group_profile_settings_id
                WHERE
                    ugps.unit_group_profile_id = ${connection.escape(space_group_id)}
                    and space_type = u.type
                ORDER BY ugpsa.sort ASC
            ) as breakdown
            from units u
            left outer join amenity_units as au_width on u.id = au_width.unit_id and au_width.amenity_id = (select id from amenities where name = 'width' and property_type = u.type)
            left outer join amenity_units as au_height on u.id = au_height.unit_id and au_height.amenity_id = (select id from amenities where name = 'height' and property_type = u.type)
            left outer join amenity_units as au_length on u.id = au_length.unit_id and au_length.amenity_id = (select id from amenities where name = 'length' and property_type = u.type)
            LEFT JOIN unit_group_profile_settings_tiers ugpst on u.property_id =
                (select property_id from unit_group_profiles where unit_group_profiles.id =  ${connection.escape(space_group_id)} and  unit_group_profiles.id =
                    (select unit_group_profile_id from unit_group_profile_settings where unit_group_profile_settings.space_type = u.type and id = ugpst.unit_group_profile_settings_id HAVING (ifnull(au_width.value,0) * ifnull(au_length.value,0)) > ugpst.min_sqft and (ifnull(au_width.value,0) * ifnull(au_length.value,0)) <= ifNULL(ugpst.max_sqft, 99999999)))
            WHERE
                u.property_id = (select property_id from unit_group_profiles where id = ${connection.escape(space_group_id)})
                and u.type = ${connection.escape(space_type)}
                and u.deleted IS NULL
            GROUP BY
                if(tier_type = 'area', tier, size),
                breakdown,
                type
            ORDER BY
                if(tier_type = 'area', min_sqft, CAST((ifnull(au_width.value,0) * ifnull(au_length.value,0)) as decimal(10,2))),
                if(tier_type = 'area', true, CAST(ifnull(au_width.value,0) as decimal(10,2)))
            ;
        `;
            console.log("findBreakdown sql", sql.replace(/(\r\n|\n|\r)/gm, ""))
         return await connection.queryAsync(sql)
    },

    async findOSR(connection, space_group_id, date){
        let far_out_date = '2099-12-31';
        let sql = `
            with cte_units as ( ${TotalUnits.totalUnits(date, `select property_id from unit_group_profiles where id = ${connection.escape(space_group_id)}`)}),
            cte_units_detail as (
                select u.*,
                    l.id as lease_id,
                    s.id as service_id,
                    s.price as service_price,
                    ugps.id as unit_group_profile_settings_id,
                    ugps.tier_type as tier_type,
                    ugpst.id as teir_id,
                    u.units_sqft as total_area,
                    ugpst.min_sqft as min_sqft,
                    ugpst.max_sqft as max_sqft,
                    case ifnull(l.id, -1)
                        when -1 then 
                          IF(
                            (SELECT status
                            FROM unit_status_changes usc
                            WHERE usc.unit_id = u.unit_id AND status IN ('online','offline')  and usc.date <= ${connection.escape(date)}
                            ORDER BY usc.id DESC
                            LIMIT 1) IS NOT NULL,
                              IF ((select status FROM unit_status_changes usc where usc.unit_id = u.unit_id and status in ('online','offline') and usc.date <= ${connection.escape(date)}  order by usc.id desc limit 1)  = 'offline',"offline",'available') 
                          ,
                            case u.status
                              when 1 then 'available'
                              else 'offline'
                            end
                        )
                        else 'occupied'
                    end as unit_status,
                    IFNULL(SUM(IFNULL(disc.amount, 0)), 0) as disc_amount,
                    IFNULL(SUM(IFNULL(promo.amount, 0)), 0) as promo_amount
                from cte_units u
                    LEFT JOIN leases as l on l.unit_id = u.unit_id and l.status = 1
                        and l.start_date <= ${connection.escape(date)} and (l.end_date is null or l.end_date > ${connection.escape(date)})
                    LEFT JOIN services as s on s.lease_id = l.id and s.status = 1 and s.product_id in (select id from products where default_type = 'rent')
                        and s.start_date <= ${connection.escape(date)} and (s.end_date is null or s.end_date >= ${connection.escape(date)})
                    LEFT JOIN unit_group_profile_settings ugps on ugps.unit_group_profile_id = ${connection.escape(space_group_id)} and ugps.space_type = u.type
                    LEFT JOIN unit_group_profile_settings_tiers ugpst on ugpst.unit_group_profile_settings_id = ugps.id and u.units_sqft > ugpst.min_sqft and u.units_sqft <= ifNULL(ugpst.max_sqft, 99999999)
                    LEFT JOIN discount_line_items disc on disc.invoice_line_id in (
                            select id from invoice_lines
                            where invoice_lines.start_date <= ${connection.escape(date)}
                                and invoice_lines.start_date >= date_add(${connection.escape(date)}, interval - DAY(${connection.escape(date)}) + 1 DAY)
                                and invoice_id in (select id from invoices where lease_id in (select id from leases where status = 1 and unit_id = u.unit_id) and invoices.void_date < IFNULL(${connection.escape(date)}, ${connection.escape(far_out_date)}))
                        )
                        and disc.discount_id in (select id from discounts where promotion_id in (select id from promotions where label = 'discount'))
                    LEFT JOIN discount_line_items promo on  promo.invoice_line_id in (
                            select id from invoice_lines
                            where invoice_lines.start_date <= ${connection.escape(date)}
                                and invoice_lines.start_date >= date_add(${connection.escape(date)}, interval - DAY(${connection.escape(date)}) + 1 DAY)
                                and invoice_id in (select id from invoices where lease_id in (select id from leases where status = 1 and unit_id = u.unit_id) and invoices.void_date < IFNULL(${connection.escape(date)}, ${connection.escape(far_out_date)}))
                        )
                        and promo.discount_id in (select id from discounts where promotion_id in (select id from promotions where label = 'promotion'))
                group by u.unit_id
            )
            
            select
                COUNT(u.unit_id) as num_spaces,
                -- Unit Type
                u.type,
                -- Tier id
                u.teir_id as tier,
                -- Get Tier Type
                u.tier_type,
                -- Tier min sqft
                u.min_sqft as min_sqft,
                -- Tier max sqft
                u.max_sqft as max_sqft,
                -- Tier label
                concat(u.min_sqft, ' sqft to ', u.max_sqft, ' sqft') as area,
                -- Unit size for size aggregation
                concat(u.unit_width, '\\\' x ', u.unit_length, '\\\'') as size,
                -- Reservations count
                (
                    select COUNT(id) from reservations r
                    where lease_id in (select id from leases where unit_id = u.unit_id)
                        and ${connection.escape(date)} >= ifnull(r.time, ${connection.escape(far_out_date)})
                ) as reservation_count,
                -- Complimentary count
                SUM(if(u.service_price = 0, 1, 0)) as complimentary_count,
                -- Average length of stay move out  
                sum(
                    (
                        select sum(IFNULL(DATEDIFF(end_date, start_date), 0)) from leases
                        where leases.unit_id = u.unit_id and ${connection.escape(date)} >= end_date
                            and end_date is not null and leases.status = 1
                    )
                ) /
                sum(
                    (
                        select count(id) from leases
                        where leases.unit_id = u.unit_id and ${connection.escape(date)} >= leases.end_date
                            and leases.end_date is not null and leases.status = 1
                    )
                ) as avg_los_mo,
                -- Average length of stay of all leases
                sum(
                    (
                        select sum(IFNULL(DATEDIFF(IFNULL(end_date, ${connection.escape(date)}), start_date), 0)) from leases
                        where leases.unit_id = u.unit_id and (end_date is null or ${connection.escape(date)} >= end_date)
                            and ${connection.escape(date)} >= leases.start_date and leases.status = 1
                    )
                ) /
                sum(
                    (
                        select count(id) from leases
                        where leases.unit_id = u.unit_id and (end_date is null or ${connection.escape(date)} >= end_date)
                            and ${connection.escape(date)} >= leases.start_date and leases.status = 1
                    )
                )
                as avg_length_of_stay,
                -- Lifetime values moved out tenants
                IFNULL(
                    (
                        select SUM(amount) from invoices_payments ip
                        where ip.invoice_id in (
                                select id from invoices
                                where lease_id in (select id from leases where end_date is not null and end_date <= ${connection.escape(date)} and unit_id = u.unit_id)
                                    and ip.date <= ${connection.escape(date)}
                            )
                    ), 0
                ) as lifetime_value,
                -- Life value all tenants
                IFNULL(
                    (
                        SELECT SUM(IFNULL(amount, 0)) from invoices_payments ip
                        where ip.invoice_id in (
                                select id from invoices
                                where lease_id in (select id from leases where unit_id = u.unit_id)
                                    and ip.date <= ${connection.escape(date)} 
                            )
                    ), 0
                ) as lifetime_value_agg,
                -- GROSS Complimentary Revenue
                SUM(IF(u.service_price = 0, 1, 0) * u.units_base_rent) as gross_complimentary,
                -- GROSS Offline revenue
                SUM((case when u.unit_status = 'offline' then 1 else 0 end) * u.units_base_rent) as gross_offline,
                -- Total Discounts
                SUM(u.disc_amount) as disc_amount,
                -- Total Promotions
                SUM(u.promo_amount) as promo_amount,
                -- Tenants Under Sell Rateavg_length_of_stay_mo
                IFNULL(SUM(if(u.unit_status = 'occupied' and IFNULL(u.service_price, 0) <> 0 and u.units_base_rent > IFNULL(u.service_price, 0), 1, 0)), 0) as tenants_under_sell_rate,
                -- Tenants Over Sell Rate
                IFNULL(SUM(if(u.unit_status = 'occupied' and u.units_base_rent < IFNULL(u.service_price, 0), 1, 0)), 0) as tenants_over_sell_rate,
                -- Total Area
                IFNULL(sum(u.total_area), 0) as total_area,
                -- Area Per Space
                IFNULL(sum(u.total_area) / count(*), 0) as area_per_space,
                -- Occupied Units
                IFNULL(sum(case when u.unit_status = 'occupied' then 1 else 0 end), 0) as occupied_units,
                -- Available Units
                IFNULL(sum(case when u.unit_status = 'available' then 1 else 0 end), 0) as available_units,
                -- Offline Units
                IFNULL(sum(case when u.unit_status = 'offline' then 1 else 0 end), 0) as offline_units,
                -- Avg Set Rate
                IFNULL(avg(IFNULL(u.unit_set_rate, 0)), 0) as avg_set_rate,
                -- Avg Sell Rate
                IFNULL(avg(IFNULL(u.units_base_rent, 0)), 0) as avg_sell_rate,
                -- Avg rent
                IFNULL(sum(IFNULL(u.service_price, 0)) / sum(case when u.unit_status = 'occupied' then 1 else 0 end), 0) as avg_rent,
                -- Gross Potential
                IFNULL(sum(u.units_base_rent), 0) as gross_potential,
                -- Gross Occupied
                IFNULL(
                    (
                        sum((case when u.unit_status = 'occupied' then 1 else 0 end) * IFNULL(u.service_price, 0))
                        + sum((case when u.unit_status = 'available' then 1 else 0 end) * u.units_base_rent)
                        + sum((case when u.unit_status = 'offline' then 1 else 0 end) * u.units_base_rent)
                    ), 0
                ) as gross_occupied,
                -- Actual Occupied
                IFNULL(sum((case when u.unit_status = 'occupied' then 1 else 0 end) * IFNULL(u.service_price, 0)), 0) as actual_occupied,       
                -- Income Occupancy
                IFNULL(
                    (
                        sum((case when u.unit_status = 'occupied' then 1 else 0 end) * IFNULL(u.service_price, 0)) /
                        sum((case when u.unit_status = 'occupied' then 1 else 0 end) * u.units_base_rent)
                    ), 0
                ) as income_occupancy_pct,
                -- Space Occupancy
                IFNULL(
                    sum((case when u.unit_status = 'occupied' then 1 else 0 end)) /
                    (
                        sum((case when u.unit_status = 'occupied' then 1 else 0 end))
                        + sum((case when u.unit_status = 'available' then 1 else 0 end)) +
                        sum((case when u.unit_status = 'offline' then 1 else 0 end))
                    ), 0
                ) as space_occupancy_pct,
                -- Area Occupancy - occupied
                IFNULL(
                    sum((case when u.unit_status = 'occupied' then 1 else 0 end) * u.total_area) /
                    (
                        sum((case when u.unit_status = 'occupied' then 1 else 0 end) * u.total_area) 
                        + sum((case when u.unit_status = 'available' then 1 else 0 end) * u.total_area)
                        + sum((case when u.unit_status = 'offline' then 1 else 0 end) * u.total_area)
                    ), 0
                ) as area_occupancy_pct,
                
                -- Area Occupancy - vacant
                IFNULL(
                    sum((case when u.unit_status = 'available' then 1 else 0 end) * u.total_area) /
                    ( 
                        sum((case when u.unit_status = 'occupied' then 1 else 0 end) * u.total_area)
                        + sum((case when u.unit_status = 'available' then 1 else 0 end) * u.total_area)
                        + sum((case when u.unit_status = 'offline' then 1 else 0 end) * u.total_area)
                    ), 0
                ) as area_occupancy_available,
                
                -- Area Occupancy - offline
                IFNULL(
                    sum((case when u.unit_status = 'offline' then 1 else 0 end) * u.total_area) /
                    (
                        sum((case when u.unit_status = 'occupied' then 1 else 0 end) * u.total_area)
                        + sum((case when u.unit_status = 'available' then 1 else 0 end) * u.total_area)
                        + sum((case when u.unit_status = 'offline' then 1 else 0 end) * u.total_area)
                    ), 0
                ) as area_occupancy_offline,
                
                -- Area occupied
                IFNULL(sum((case when u.unit_status = 'occupied' then 1 else 0 end) * u.total_area), 0) as occupied_area,
                -- Area vacant
                IFNULL(sum((case when u.unit_status = 'available' then 1 else 0 end) * u.total_area), 0) as available_area,
                -- Area offline
                IFNULL(sum((case when u.unit_status = 'offline' then 1 else 0 end) * u.total_area), 0) as offline_area,
                
                -- Total historical Tenants MO
                IFNULL(
                    SUM((SELECT COUNT(id) from leases lmo where lmo.unit_id = u.unit_id and ${connection.escape(date)} >= lmo.end_date and lmo.end_date is not null and lmo.status = 1))
                    , 0
                )  as num_leases_mo,
                
                -- number of leases
                IFNULL(
                    SUM(
                        (
                            SELECT IFNULL(COUNT(id), 0) from leases
                            where leases.unit_id = u.unit_id and (end_date is null or ${connection.escape(date)} >= leases.end_date)
                                and ${connection.escape(date)} >= leases.start_date and leases.status = 1
                        )
                    )
                    , 0
                ) as num_leases,
            --  IFNULL(COUNT(l_hist.id), 0) as num_leases_mo,
            --  IFNULL(COUNT(u.lease_id), 0) as num_leases,
                
                -- GROSS Vacant revenue
                IFNULL(sum((case when u.unit_status = 'available' then 1 else 0 end) * u.units_base_rent), 0) as gross_available,
                
                -- Economic Occupancy
                IFNULL(
                    sum((case when u.unit_status = 'occupied' then 1 else 0 end) * IFNULL(u.service_price, 0)) /     
                    (
                        sum((case when u.unit_status = 'occupied' then 1 else 0 end) * u.units_base_rent)
                        + sum((case when u.unit_status = 'available' then 1 else 0 end) * u.units_base_rent) + 
                        sum((case when u.unit_status = 'offline' then 1 else 0 end) * u.units_base_rent)
                    ), 0
                ) as economic_occupancy_pct,
                
                -- List of Amenities concatenated
                (
                    SELECT
                        GROUP_CONCAT(
                            (SELECT IFNULL(
                                (SELECT IF(
                                    amp.field_type = 'boolean',
                                        (SELECT CONCAT(
                                            amenity_name
                                        ) from amenity_property ap where ap.id = (select amenity_property_id from amenity_units where unit_id = u.unit_id and amenity_property_id = amp.id )),
                                        (select value from amenity_units where unit_id = u.unit_id and amenity_property_id = amp.id )
                                    )),
                                    CONCAT("No ", amenity_name)
                            ))
                            ORDER BY ugpsa.sort ASC SEPARATOR " > "
                        )
                    FROM amenity_property amp
                        LEFT JOIN unit_group_profile_settings_amenities ugpsa on ugpsa.amenity_property_id = amp.id
                        LEFT JOIN unit_group_profile_settings ugps on ugps.id = ugpsa.unit_group_profile_settings_id
                    WHERE ugps.unit_group_profile_id = ${connection.escape(space_group_id)}
                        and ugps.space_type = u.type
                    ORDER BY ugpsa.sort ASC
                ) as breakdown
            from cte_units_detail u
                JOIN properties p on p.id = u.property_id
            GROUP BY
                if(tier_type = 'area', tier, size),
                breakdown,
                u.type
            ORDER BY
                if(tier_type = 'area', u.min_sqft, u.total_area),
                if(tier_type = 'area', true, CAST(ifnull(u.unit_width,0) as decimal(10,2)))
        `;

        console.log("OSR query: ", sql);
        return await connection.queryAsync(sql)
    },

    async getOffers(connection, property_id, company_id, hashed_id, amenity, promos) {

        let amenityDetails = ""
        let promotion = ""
        let promotion_filter = ""
        let sql = ""

        let rate_management = `select
                prms.default_unit_group_profile_id
            from
                property_rate_management_settings prms
            where
                prms.property_id =  ${connection.escape(property_id)}`
        
        let rate_management_profile_id = await connection.queryAsync(rate_management).then(res => res?.[0]?.default_unit_group_profile_id ?? null)

        let facility_time = `(SELECT CONVERT_TZ(NOW(), "+00:00", p.utc_offset) FROM properties p WHERE p.id = ${connection.escape(property_id)})`;
       
        // if (!rate_management_profile_id ) e.th(400, "Valuepricing is not enabled for this property")

        if (amenity.length > 0) {
            for (var {id: i, value: v} of amenity) {
                amenityDetails = `AND u.id IN (
                    SELECT
                        distinct u2.id
                    FROM units u2
                    JOIN amenity_property ap2 ON u2.property_id = ap2.property_id
                    JOIN amenities a ON a.id = ap2.amenity_id
                    LEFT OUTER JOIN amenity_units au2 ON au2.unit_id = u2.id AND au2.amenity_id = ${connection.escape(i)} AND au2.amenity_property_id = ap2.id
                    WHERE
                        a.status = 1 AND
                        ap2.property_id = ${connection.escape(property_id)} AND
                        ap2.property_type = u2.type AND
                        ap2.amenity_id = ${connection.escape(i)}
                        AND ap2.deleted_at IS NULL
                        AND lower(IF(ap2.field_type = 'boolean', COALESCE(au2.value, 'No'), au2.value)) = lower(${connection.escape(v)})
                )` + amenityDetails
            }
        }

        if (promos.length > 0 && rate_management_profile_id) {
            for(var i=0; i<promos.length;i++){
                let promo_type = promos?.[i]?.type || "regular"
                promotion = promotion + ` ugu2.unit_id in (
                    select
                        distinct ugu3.unit_id
                        from promotions p
                            join promotion_unit_group pug3 on pug3.promotion_id = p.id
                            join unit_groups ug3 on ug3.unit_group_hashed_id = pug3.unit_group_id
                            join unit_group_units ugu3 on ugu3.unit_groups_id = ug3.id
                    where
                        ugu3.unit_id = u.id and
                        ug2.unit_group_profile_id = ${connection.escape(rate_management_profile_id)}
                        and CASE
                            WHEN
                                p.active_period = 'active' then (p.enable = 1 and p.active = 1)
                            ELSE (p.start_date < CURDATE() and p.end_date >= CURDATE() and p.enable = 1 and p.active = 1)
                        END
                        and p.id = ${connection.escape(promos[i].id)}
                        and pug3.type = ${connection.escape(promo_type)}
                ) and `

                promotion_filter = promotion_filter +` and u.id in (
                    select
                        distinct ugu2.unit_id
                    from promotions p
                    join promotion_unit_group pug on pug.promotion_id = p.id
                    join unit_groups ug2 on ug2.unit_group_hashed_id = pug.unit_group_id
                    join unit_group_units ugu2 on ugu2.unit_groups_id = ug2.id
                    where
                        ugu2.unit_id = u.id and
                        ug2.unit_group_profile_id = ${connection.escape(rate_management_profile_id)}
                        and CASE
                            WHEN
                                p.active_period = 'active' then (p.enable = 1 and p.active = 1)
                            ELSE (p.start_date < CURDATE() and p.end_date >= CURDATE() and p.enable = 1 and p.active = 1)
                        END
                        and p.id =  ${connection.escape(promos[i].id)}
                        and pug.type = ${connection.escape(promo_type)}
                ) `
            }
        } else {
            promotion = `ugu2.unit_id = u.id and `
        }

        sql = `
            SELECT
                u.*, ug.space_type,
                (SELECT COALESCE(upc.price, upc.set_rate) from unit_price_changes upc where upc.unit_id = u.id and DATE(upc.created) <= CURRENT_DATE() order by upc.id DESC limit 1) u_price,
                (
                    select
                        json_arrayagg(
                            json_object(
                                'id', amenity_units_data.amenity_id,
                                'name', amenity_units_data.amenity_name,
                                'value', amenity_units_data.value,
                                'type', amenity_units_data.field_type,
                                'sort_order', amenity_units_data.sort_order,
                                'show_in_website', amenity_units_data.show_in_website
                            )
                        )
                    from
                    (
                        SELECT
                            ap.amenity_id,
                            ap.amenity_name,
                            ap.field_type,
                            IF(ap.field_type = 'boolean', COALESCE(au.value, 'No'), au.value) AS value,
                            pasc.sort_order,
                            COALESCE(pasc.show_in_website, 0) AS show_in_website
                            FROM
                                amenity_property ap
                            JOIN amenities a ON a.id = ap.amenity_id
                            LEFT OUTER JOIN amenity_units au ON au.amenity_property_id = ap.id
                            LEFT OUTER JOIN property_amenity_score_configuration pasc ON pasc.amenity_property_id = ap.id AND lower(pasc.value) = IF(ap.field_type = 'boolean', COALESCE(au.value, 'No'), au.value)
                        WHERE
                            a.status = 1 AND
                            ap.property_id = ${connection.escape(property_id)} AND
                            ap.property_type = u.type AND
                            ap.amenity_category_id <> ${ENUMS.AMENITY_CATEGORY.SPACE_INFORMATION}
                            AND au.unit_id = u.id
                            AND ap.deleted_at IS NULL
                    ) amenity_units_data
                ) AS amenities,
                IF(
                    ${ rate_management_profile_id || 'NULL'},
                    (
                        select
                            json_arrayagg(
                                json_object(
                                    'id', pr.id,
                                    'name', pr.name,
                                    'value', pr.value,
                                    'type', pr.type,
                                    'label', pr.label,
                                    'description', pr.description
                                )
                            )
                        from
                        (
                            select
                                distinct p.id, p.name , p.description, p.label, pug.type, p.value
                            from promotions p
                                join promotion_unit_group pug on pug.promotion_id = p.id
                                join unit_groups ug2 on ug2.unit_group_hashed_id = pug.unit_group_id
                                join unit_group_units ugu2 on ugu2.unit_groups_id = ug2.id
                            where
                                ${promotion}
                                ug2.unit_group_profile_id = ${connection.escape(rate_management_profile_id)}
                                and CASE
                                    WHEN
                                        p.active_period = 'active' then (p.enable = 1 and p.active = 1)
                                    else (p.start_date < CURDATE() and p.end_date >= CURDATE() and p.enable = 1 and p.active = 1)
                                END
                            order by p.id
                        ) pr
                    ),
                    NULL
                ) as promotions
            FROM
                units u
            JOIN
                unit_group_units ugu on ugu.unit_id = u.id
            JOIN
                unit_groups ug on ug.id = ugu.unit_groups_id
            WHERE
                ug.unit_group_hashed_id = ${connection.escape(hashed_id)} and
                u.id not in (
                    SELECT l.unit_id from leases l where l.status = 1 and (
                        l.end_date is null or
                        l.end_date > CURDATE()
                    )
                ) and
                u.id not in (
                    SELECT
                        l.unit_id
                    from
                        leases l
                    where l.status = 0 and l.id in (select res.lease_id from reservations res where res.expires >= ${facility_time})
                ) and
                u.id not in (
                    SELECT l.unit_id from leases l where l.status = 2
                ) and
                u.id not in (
                    SELECT uh.unit_id from unit_holds uh where uh.expires > CURRENT_TIMESTAMP
                ) and u.id not in (
                    select unit_id 
                    from unit_status_changes 
                    where status="deactivated" and id in (
                        select max(usc.id)
                        from unit_status_changes as usc
                        JOIN units up on up.id = usc.unit_id and up.property_id = ${connection.escape(property_id)}
                        where usc.status in ('activated','deactivated')
                        group by usc.unit_id
                    )
                ) and
                u.deleted is null and
                (u.available_date is null or u.available_date <= ${facility_time}) and
                u.status = 1 ${amenityDetails} ${promotion_filter}
            group by u.id
            order by u_price, u.number`;

        //console.log("getOffer sql", sql.replace(/(\r\n|\n|\r)/gm, ""))
        return await connection.queryAsync(sql)
    },
    
    async getValuePriceTier(connection, property_id){
       // sql = `select * FROM property_value_price_tier_configurations WHERE property_id = ${connection.escape(property_id)};`
       sql = `select
                pvptc.*
            from
                property_value_price_tier_configurations pvptc
            join
                property_rate_management_settings prms on prms.property_id = pvptc.property_id
            where
                prms.value_pricing_active = 1 and prms.property_id = ${connection.escape(property_id)}` ;
           /*  if (!valuePriceTier) e.th(400, "value pricing is not enabled for this property")
                else */
            return await connection.queryAsync(sql)
    },

    async findGroupBreakdown(connection, space_group_id, property_id, promotions, unitIds){

        console.log("\nspace_group_id : \n",space_group_id,"\npromotions : \n",promotions)
        
        let amenity_sql = ` and au.unit_id in (select distinct unit_id from unit_group_units ugu2 join unit_groups ug2 on ug2.id = ugu2.unit_groups_id where ug2.id = ug.id) `;

        let amenity_filter_sql = ` `
        let lowest_unit_amenity_filter_sql = ``

        let facility_time = `(SELECT CONVERT_TZ(now(), "+00:00", p.utc_offset) FROM properties p WHERE p.id = ${connection.escape(property_id)})`;

        let subUnits = `
            SELECT
                (
                    SELECT json_arrayagg(l.unit_id) FROM leases l
                    JOIN units up on up.id = l.unit_id and up.property_id = ${connection.escape(property_id)}
                    WHERE l.status = 1 and (l.end_date is null or l.end_date > CURDATE())
                ) AS result0,
                (SELECT json_arrayagg(unit_id) FROM leases WHERE status = 2) as result1,
                (SELECT json_arrayagg(l.unit_id) FROM leases l
                    JOIN units up on up.id = l.unit_id and up.property_id = ${connection.escape(property_id)}
                    WHERE l.status = 0 AND l.id IN (
                        SELECT r.lease_id FROM reservations r WHERE r.expires >= ${facility_time}
                    )
                ) as reservationReponse,
                (
                    SELECT json_arrayagg(unit_id)
                        FROM unit_holds
                        JOIN units up on up.id = unit_holds.unit_id and up.property_id = ${connection.escape(property_id)}
                        WHERE expires > CURRENT_TIMESTAMP
                ) as result3,
                (
                    SELECT json_arrayagg(unit_id)
                    from unit_status_changes
                    where status="deactivated" and id in (
                        select max(usc.id)
                        from unit_status_changes as usc
                        JOIN units up on up.id = usc.unit_id and up.property_id = ${connection.escape(property_id)}
                        where usc.status in ('activated','deactivated')
                        group by usc.unit_id
                    )
                ) as result4,
                (
                    select
                        prms.default_unit_group_profile_id
                    from
                        property_rate_management_settings prms
                    where
                        prms.property_id =  ${connection.escape(property_id)} and
                    prms.active = 1
                ) as rate_management_profile_id;
        `
        let subResult = await connection.queryAsync(subUnits)

        let result0 = subResult[0].result0;
        let result1 = subResult[0].result1;
        let reservationReponse = subResult[0].reservationReponse;
        let result3 = subResult[0].result3;
        let result4 = subResult[0].result4;
        let rate_management_profile_id = subResult[0].rate_management_profile_id;

        let results = {
            res0: result0,
            res1: result1,
            res2: reservationReponse,
            res3: result3,
            res4: result4
        }

        let promo_sql = ` AND ugu2.unit_id IN (SELECT DISTINCT unit_id FROM unit_group_units ugu3 join unit_groups ug3 on ug3.id = ugu3.unit_groups_id WHERE ug3.id = ug.id) AND `;
        let promo_filter_sql = ""
        let lowest_unit_promo_sql = ""

        if (unitIds!= null){
            amenity_sql = amenity_sql + ` AND au.unit_id in ( ${unitIds} ) `
            amenity_filter_sql = ` AND u.id in ( ${unitIds} )`
            lowest_unit_amenity_filter_sql = ` AND u2.id in ( ${unitIds} )`
            promo_sql = ` ${promo_sql} ugu2.unit_id in ( ${unitIds} ) AND `
        }

        if (promotions != null) {
            for(let p = 0; p < promotions.length; p++) {
                let promo_type = promotions?.[p]?.type || "regular"
                promo_sql = ` ${promo_sql} ugu2.unit_id in (
                    SELECT
                        DISTINCT ugu3.unit_id
                    FROM promotions p
                        join promotion_unit_group pug3 on pug3.promotion_id = p.id
                        join unit_groups ug3 on ug3.unit_group_hashed_id = pug3.unit_group_id
                        join unit_group_units ugu3 on ugu3.unit_groups_id = ug3.id
                    WHERE
                        ugu3.unit_id = u.id and
                        ug3.unit_group_profile_id = ${rate_management_profile_id}
                        and CASE
                            WHEN
                                p.active_period = 'active' then (p.enable = 1 and p.active = 1)
                            ELSE (p.start_date < CURDATE() and p.end_date >= CURDATE() and p.enable = 1 and p.active = 1)
                        END
                    and p.id = ${connection.escape(promotions[p].id)}
                    and pug3.type = ${connection.escape(promo_type)}
                ) and `
                lowest_unit_promo_sql = promo_sql.replace(/ and $/, '').trim();
                promo_filter_sql = promo_filter_sql + `and u.id in (
                    select 
                        distinct ugu2.unit_id
                    from promotions p
                        join promotion_unit_group pug on pug.promotion_id = p.id
                        join unit_groups ug2 on ug2.unit_group_hashed_id = pug.unit_group_id
                        join unit_group_units ugu2 on ugu2.unit_groups_id = ug2.id
                        join units u3 on u3.id = ugu2.unit_id
                    where 
                        ${this.appendResultQuery(results, 'ugu2.unit_id')}
                        (u3.available_date is null or u3.available_date <= ${facility_time})
                        AND u3.status = 1
                        AND ugu2.unit_id = u.id 
                        and ug2.unit_group_profile_id = ${rate_management_profile_id}
                        and CASE 
                            WHEN 
                                p.active_period = 'active' then (p.enable = 1 and p.active = 1) 
                            ELSE (p.start_date < CURDATE() and p.end_date >= CURDATE() and p.enable = 1 and p.active = 1) 
                        END
                    and p.id = ${connection.escape(promotions[p].id)}
                    and pug.type = ${connection.escape(promo_type)}
                )`
            }
        }

        let sql =  `SELECT
            ug.unit_group_hashed_id,
            concat(IFNULL(ug.min_sqft, 0), ' sqft ', IF(ug.max_sqft, CONCAT('to ', ug.max_sqft, ' sqft '), 'and above ')) as area,
            concat(ug.width, "' x ", ug.length, "'") as size,
            ug.width,
            ug.length,
            ug.min_sqft,
            ug.max_sqft,
            count(ugu.id) as num_spaces,
            COUNT(
                CASE 
                    WHEN
                        ${this.appendResultQuery(results, 'u.id')}
                        (u.available_date is null or u.available_date <= ${facility_time})
                        AND u.status = 1 
                    THEN u.id 
                END
            ) AS vacant_units_count,
            MIN((SELECT COALESCE(upc.price, upc.set_rate) from unit_price_changes upc where upc.unit_id = u.id and DATE(upc.created) <= CURRENT_DATE() order by upc.id DESC limit 1)) as min_price,
            MAX((SELECT COALESCE(upc.price, upc.set_rate) from unit_price_changes upc where upc.unit_id = u.id and DATE(upc.created) <= CURRENT_DATE() order by upc.id DESC limit 1)) as max_price,
            MIN(
                CASE WHEN
                 ${this.appendResultQuery(results, 'u.id')}
                (u.available_date is null or u.available_date <= ${facility_time})
                AND u.status = 1 THEN (SELECT COALESCE(upc.price, upc.set_rate) from unit_price_changes upc WHERE upc.unit_id = u.id and DATE(upc.created) <= CURRENT_DATE() and upc.end IS NULL order by upc.id DESC limit 1) END
            ) vac_min_price,
            (
                SELECT
                    json_object(
                        'id', lowest.unit_id,
                        'price', lowest.upc_price,
                        'promotions', (
                            SELECT
                                json_arrayagg(
                                    json_object(
                                        'promotion_id', pr.id
                                    )
                                )
                            FROM
                                (
                                    SELECT
                                        distinct p.id
                                    FROM promotions p
                                    JOIN promotion_unit_group pug ON pug.promotion_id = p.id AND pug.type = 'regular'
                                    JOIN unit_groups ug3 ON ug3.unit_group_hashed_id = pug.unit_group_id
                                    JOIN unit_group_units ugu3 ON ugu3.unit_groups_id = ug3.id
                                    JOIN units u3 ON u3.id = ugu3.unit_id AND u3.property_id = ${connection.escape(property_id)}
                                    WHERE
                                        CASE
                                            WHEN p.active_period = 'active' THEN
                                                (p.enable = 1 AND p.active = 1)
                                            ELSE
                                                (p.start_date < CURDATE() AND p.end_date >= CURDATE() AND p.enable = 1 AND p.active = 1)
                                        END
                                        AND ug3.unit_group_profile_id = (
                                            SELECT
                                                prms.default_unit_group_profile_id
                                            FROM
                                                property_rate_management_settings prms
                                            WHERE
                                                prms.property_id = ${connection.escape(property_id)} AND
                                                prms.active = 1
                                        )
                                        AND u3.id = lowest.unit_id
                                    ORDER BY p.id
                                ) pr
                        )
                    )
                FROM (
                    SELECT
                        u2.id AS unit_id,
                        (
                            SELECT COALESCE(upc.price, upc.set_rate)
                            FROM unit_price_changes upc
                            WHERE upc.unit_id = u2.id AND upc.end IS null
                            ORDER BY upc.id DESC
                            LIMIT 1
                        ) AS upc_price
                    FROM units u2
                    JOIN unit_group_units ugu2 on ugu2.unit_id = u2.id
                    JOIN unit_groups ug2 on ug2.id = ugu2.unit_groups_id
                    WHERE
                        ug2.id = ug.id AND
                        (u2.available_date IS NULL OR u2.available_date <= ${facility_time}) AND
                        ${this.appendResultQuery(results, 'u2.id')}
                        u2.status = 1 ${lowest_unit_promo_sql} ${lowest_unit_amenity_filter_sql}
                    ORDER BY upc_price, u2.number
                    LIMIT 1
                ) lowest
            ) AS lowest_unit,
            MAX(
                CASE WHEN
                ${this.appendResultQuery(results, 'u.id')}
                (u.available_date is null or u.available_date <= ${facility_time})
                AND u.status = 1 THEN (SELECT COALESCE(upc.price, upc.set_rate) from unit_price_changes upc where upc.unit_id = u.id and DATE(upc.created) <= CURRENT_DATE() order by upc.id DESC limit 1) END
            ) as vac_max_price,
            ug.label as breakdown,
            ug.space_type as type,
            ug.tier_type,
            ug.amenities as breakdown_amenities,
            (
                select 
                    json_arrayagg(
                        json_object(
                            'id', amenity_units_data.amenity_id,
                            'name', amenity_units_data.amenity_name,
                            'value', amenity_units_data.value_,
                            'type', amenity_units_data.field_type,
                            'sort_order', amenity_units_data.sort_order,
                            'show_in_website', amenity_units_data.show_in_website,
                            'available_units', amenity_units_data.vacant_units_count
                        )
                    )
                from
            (
                select 
                    ap.amenity_id,
                    ap.amenity_name,
                    ap.field_type,
                    IF(ap.field_type = 'boolean', COALESCE(au.value, 'No'), au.value) as value_,
                    COALESCE(pasc.sort_order, 999999) as sort_order,
                    COALESCE(pasc.show_in_website, 0) as show_in_website,
                    count(
                        case when
                            ${this.appendResultQuery(results, 'au.unit_id')}
                            (u2.available_date is null or u2.available_date <= ${facility_time}) AND u2.status = 1
                                then au.unit_id
                        end
                    ) as vacant_units_count
                from
                    amenity_property ap
                JOIN amenities a ON a.id = ap.amenity_id
                LEFT OUTER JOIN amenity_units au on au.amenity_property_id = ap.id
                LEFT OUTER JOIN property_amenity_score_configuration pasc on pasc.amenity_property_id = ap.id and lower(pasc.value) = IF(ap.field_type = 'boolean', COALESCE(au.value, 'No'), au.value)
                LEFT OUTER JOIN units u2 on u2.id = au.unit_id
                where
                    a.status = 1 AND
                    ap.property_id = ${connection.escape(property_id)} AND
                    ap.property_type = u.type AND
                    ap.amenity_category_id <> ${ENUMS.AMENITY_CATEGORY.SPACE_INFORMATION}
                    and ap.deleted_at is null
                    ` + amenity_sql +
                `group by ap.amenity_id, value_
                ORDER BY COALESCE(pasc.sort_order, 999999), ap.amenity_name
                ) amenity_units_data
            ) as amenities,
            (
                select
                    json_arrayagg(
                        json_object(
                            'id', pr.id,
                            'name', pr.name,
                            'value', pr.value,
                            'type', pr.type,
                            'label', pr.label,
                            'description', pr.description
                        )
                    )
                from
                (
                    select 
                        distinct p.id, p.name , p.description, p.label, pug2.type, p.value
                    from promotions p
                        join promotion_unit_group pug2 on pug2.promotion_id = p.id
                        join unit_groups ug2 on ug2.unit_group_hashed_id = pug2.unit_group_id
                        join unit_group_units ugu2 on ugu2.unit_groups_id = ug2.id
                        join units u3 on u3.id = ugu2.unit_id
                    where
                        u3.property_id = ${connection.escape(property_id)} AND
                        ${this.appendResultQuery(results, 'ugu2.unit_id')}
                        (u3.available_date is null or u3.available_date <= ${facility_time})
                        AND u3.status = 1`
                        + promo_sql +`
                        ug2.unit_group_profile_id = (
                            select
                                prms.default_unit_group_profile_id
                            from
                                property_rate_management_settings prms
                            where
                                prms.property_id =  ${connection.escape(property_id)} and
                                prms.active = 1
                        )
                        and CASE
                            WHEN
                                p.active_period = 'active' then (p.enable = 1 and p.active = 1)
                            ELSE (p.start_date < CURDATE() and p.end_date >= CURDATE() and p.enable = 1 and p.active = 1)
                            END
                    group by p.id, pug2.type
                    order by p.id
                ) pr
            ) promotions
            from
                unit_groups ug
            left outer join
                unit_group_units as ugu on ug.id = ugu.unit_groups_id
            left outer join units u on u.id = ugu.unit_id
            where  
                u.deleted is null and
                ug.unit_group_profile_id = ${connection.escape(space_group_id)}` + amenity_filter_sql + promo_filter_sql +`
            group by ug.id;`

        //console.log("findBreakdown sql", sql.replace(/(\r\n|\n|\r)/gm, ""))
    
       return await connection.queryAsync(sql)
    }, 

    appendResultQuery(res, val) {
        let query = ""
        for (let key in res){
            if (res[key]?.length) {
                // query += ` ${val} NOT IN (${res[key].map(x => x.unit_id).join(',')}) AND `
                query += ` ${val} NOT IN (${res[key].join(',')}) AND `
            }
        
        }
        return query
    },

    async refreshUnitGroup(connection, profile_id) {
        console.log("Calling refresh unit group procedure for ", profile_id," in api server");
        let sql = `CALL refresh_unit_group(${profile_id});`
        return await connection.queryAsync(sql);
    },

    async getWebsiteCategoryUnitGroupId(connection, property_id, unit_id) {
        if (!property_id || !unit_id) e.th(400, 'Invalid parameters')

        let sql = `SELECT
                        unit_group_hashed_id
                    FROM
                        unit_group_profiles ugp
                        JOIN unit_groups ug ON ug.unit_group_profile_id = ugp.id
                        JOIN unit_group_units ugu ON ugu.unit_groups_id = ug.id
                    WHERE
                        LOWER(TRIM(ugp.name)) = LOWER(TRIM('Website Category Space Group'))
                        AND ugp.property_id = ${connection.escape(property_id) }
                        AND ugu.unit_id = ${connection.escape(unit_id) };`
        return connection.queryAsync(sql).then(result => {
            return result?.[0]?.unit_group_hashed_id ?? ''
        })
    },
}

module.exports = SpaceGroup;


