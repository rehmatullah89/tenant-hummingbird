var settings    = require(__dirname + '/../config/settings.js');
var units =  require(__dirname + '/units.js');
var Hash = require(__dirname + '/../modules/hashes.js');
var Hashes = Hash.init();

var moment = require('moment');
module.exports = {

    findByCompanyId: function(connection, company_id, filter){

        var promotionSql =  "Select * from promotions where company_id = " + connection.escape(company_id) + " and active = 1";

        if(filter){
            if (filter.label){
                promotionSql += " and label = " + connection.escape(filter.label);
            }
            if (filter.property_id) {
                promotionSql += ` and id in (select promotion_id from promotion_properties where property_id in (${connection.escape(filter.property_id)}))`
            }
        }
        promotionSql += " order by sort ASC";
        console.log("Promotions for company query: ", promotionSql);
        return connection.queryAsync(promotionSql);

    },

    findById: function(connection, promotion_id){
        var promotionSql =  "Select p.*, r.rounding_type as round from promotions p left join rounding r on p.id = r.object_id and status = 1 where active = 1 and p.id = "+ connection.escape(promotion_id);

        console.log(promotionSql);
        return connection.queryAsync(promotionSql).then(promotionRes => promotionRes.length? promotionRes[0]:null);
        // return connection.queryAsync("Select * from promotions").then(promotionRes => {
        //
        //     console.log("promotionRes", promotionRes);
        //
        //
        // });
    },

    validateDuplicatesByName: function(connection, name, company_id, promo_id){
        var promotionSql =  "Select * from promotions where name = " + connection.escape(name) + " and company_id = " + connection.escape(company_id) + " and active = 1";



        if(promo_id){
            promotionSql += " and id != " + connection.escape(promo_id);
        }

        console.log(promotionSql);
        return connection.queryAsync(promotionSql);
    },

    save: function(connection, data, promotion_id){
        var sql;
        if(promotion_id){
            sql = "UPDATE promotions set ? where id = " + connection.escape(promotion_id);
        } else {
            sql = "insert into promotions set ?";
        }
        return connection.queryAsync(sql, data)
    },

    saveCoupon: function(connection, data, coupon_id){
        var sql;
        if(coupon_id){
            sql = "UPDATE coupons set ? where id = " + connection.escape(coupon_id);
        } else {
            sql = "insert into coupons set ?";
        }
        return connection.queryAsync(sql, data)
    },

    delete: function(connection, promotion_id){

        var sql = "UPDATE promotions set active = 0 where id = " + connection.escape(promotion_id);
        return connection.queryAsync(sql);
    },

    getById: function(connection, promotion_id, company_id){

        var promotionSql =  "Select p.*, r.rounding_type as round from promotions p left join rounding r on p.id = r.object_id and r.status  = 1 where p.id = "+ connection.escape(promotion_id);

        if(company_id){
            promotionSql += " and company_id = " + connection.escape(company_id);
        }

        return connection.queryAsync(promotionSql).then(promotionRes => promotionRes.length? promotionRes[0]:null);
    },

    getByIds: function(connection, promotion_ids){
        if (!promotion_ids.length) return [];
        const promotionSql =  `SELECT p.*, r.rounding_type AS round FROM promotions p LEFT JOIN rounding r ON p.id = r.object_id AND r.status  = 1 WHERE p.id in (${connection.escape(promotion_ids)}) `;
        return connection.queryAsync(promotionSql);
    },

    getDiscountById: function(connection, discount_id){
        var discountSql =  "Select * from discounts where id = "+ connection.escape(discount_id);


        return connection.queryAsync(discountSql)
            .then(function(discountRes) {
                if(!discountRes.length) return false;
                return discountRes[0];
            });
    },

    getDiscountByLeaseId: function(connection, lease_id){
        var discountSql =  "Select * from discounts where lease_id = "+ connection.escape(lease_id);
        return connection.queryAsync(discountSql)
    },
    
    getDiscountIdsByLeaseId: function(connection, lease_id){
        var discountSql =  "Select * from discounts where lease_id = "+ connection.escape(lease_id);
        return connection.queryAsync(discountSql)
    },

    getDiscountsByLeaseIds: function(connection, lease_ids){
        if (!lease_ids.length) return [];
        const sql =  `SELECT * FROM discounts WHERE lease_id IN (${connection.escape(lease_ids)})`;
        return connection.queryAsync(sql)
    },

    findActiveDiscounts: function(connection, lease_id, period_start, period_end){

        var discountSql =  `Select d.*, IF( 
            (SELECT id from leases_payment_cycles where discount_id = d.id and start_date <= ${connection.escape(period_start)} and end_date >= ${connection.escape(period_start)} limit 1), 
            '01_payment_cycle',
            IF(d.end, '02_promotion', '03_discount')
        ) as category  from discounts d join leases_payment_cycles lpc on d.id = lpc.discount_id
        where d.lease_id = ${connection.escape(lease_id)} and lpc.deleted_at is null
            and d.start <= ${connection.escape(period_start)} and ( d.end is null or d.end >= ${connection.escape(period_start)}) order by category,d.id asc`;
        console.log("discountSql", discountSql)
        return connection.queryAsync(discountSql);
    },

    findAllDiscounts: function(connection,lease_id, date){

        var discountSql =  "Select * from discounts where lease_id = " + connection.escape(lease_id) ;
        if(date){
            discountSql += " and start <= "+ connection.escape(date) + " and ( end >= "+ connection.escape(date) + " or end is null )";
        }

        return connection.queryAsync(discountSql)
            .then(function(discountRes) {
                return discountRes;
            });
    },
    removeDiscountFromLease(connection, lease_id, promotion_id){
        var sql = `DELETE from discounts where lease_id = ${connection.escape(lease_id)} and  promotion_id = ${connection.escape(promotion_id)}`;
        return connection.queryAsync(sql);
    },
    removePromotionPromoTypes(connection, promotion_id,  promotion_types_to_keep ){
        var sql = "DELETE from promotion_promotion_types where promotion_id = " +  connection.escape(promotion_id);


        if(promotion_types_to_keep.length){
            sql += " and promotion_type_id not in (" + promotion_types_to_keep.join(',') + ")";
        }

        return connection.queryAsync(sql);
    },

    removePromotionRules(connection, promotion_id,  promotion_rules_to_keep ){

        var sql = "DELETE from promotion_rules where promotion_id = " +  connection.escape(promotion_id);

        if(promotion_rules_to_keep.length){
            sql += " and id not in (" + promotion_rules_to_keep.join(',') + ")";
        }

        return connection.queryAsync(sql);
    },

    savePromotionPromoType(connection, data, id ){

        var sql;
        if(id){
            sql = "UPDATE promotion_promotion_types set ? where id = " + connection.escape(id);
        } else {
            sql = "insert into promotion_promotion_types set ?";
        }

        return connection.queryAsync(sql, data);

    },

    savePromotionRule(connection, data, id ){

        var sql;
        if(id){
            sql = "UPDATE promotion_rules set ? where id = " + connection.escape(id);
        } else {
            sql = "insert into promotion_rules set ?";
        }

        return connection.queryAsync(sql, data);

    },

    findCouponUses(connection, coupon_id){
        var sql =  "Select * from discounts where coupon_id = " + connection.escape(coupon_id);
        console.log(sql);
        return connection.queryAsync(sql);
    },

    findCouponByCode(connection, code, company_id){
        var sql =  "Select *, (select count(id) from discounts where coupon_id = coupons.id) as uses from coupons where code = " + connection.escape(code) + " and promotion_id in ( select id from promotions where company_id = " + connection.escape(company_id) + ")";
        return connection.queryAsync(sql).then(res =>  {
            return res.length? res[0]: null;
        })
    },

    findCouponsByPromotionId(connection, promotion_id, search){
        var sql =  "Select *, (select count(id) from discounts where coupon_id = coupons.id) as uses from coupons where promotion_id = " + connection.escape(promotion_id);

        if(search){
            sql += ' and (code like '  + connection.escape('%'+ promotion_id+'%') + ' or description like '  + connection.escape('%'+ promotion_id+'%') + ' ) '
        }


        return connection.queryAsync(sql);
    },

    findCouponById(connection, coupon_id){

        var sql =  "Select * from coupons where id = " + connection.escape(coupon_id);

        return connection.queryAsync(sql).then(res =>  {
            return res.length? res[0]: null;
        });
    },

    getPromoTypeById(connection, type_id){
        var sql =  "Select * from promotion_types where id = " + connection.escape(type_id);
        return connection.queryAsync(sql).then(res =>  {
            return res.length? res[0]: null;
        });
    },

    findTypesByCompanyId(connection, company_id) {
        var sql =  "Select * from promotion_types where company_id = " + connection.escape(company_id);
        return connection.queryAsync(sql)

    },

    findTypesByPromotionId(connection, promotion_id) {
        var sql =  "Select * from promotion_promotion_types where promotion_id = " + connection.escape(promotion_id);
        return connection.queryAsync(sql)

    },

    findRulesByPromotionId(connection, promotion_id) {
        var sql =  "Select * from promotion_rules where promotion_id = " + connection.escape(promotion_id);
        return connection.queryAsync(sql)
    },

    saveDiscount:function(connection, data, id){
        var sql;
        if(id){
            sql = "UPDATE discounts set ? where id = " + connection.escape(id);
        } else {
            sql = "insert into discounts set ?";
        }
        return connection.queryAsync(sql, data);
    },


    getPromotionUnits(connection, promotion_id, unit_id, promotion_label){

        var sql = `select pu.*, pr.utc_offset from promotion_units pu
        inner join promotions p on pu.promotion_id = p.id
        inner join units u on u.id = pu.unit_id
        inner join properties pr on u.property_id = pr.id
        where p.active = 1 `

        sql += ` and p.enable = 1 and 
        (p.active_period = 'active' or (p.active_period = 'date_range' and (SELECT DATE(CONVERT_TZ(UTC_TIMESTAMP() , "+00:00", IFNULL(pr.utc_offset, "+00:00")))) between start_date and end_date) or (active_period = 'end_on' and end_date >= (SELECT DATE(CONVERT_TZ(UTC_TIMESTAMP() , "+00:00", IFNULL(pr.utc_offset, "+00:00"))))) ) `;

        if(promotion_label) {
           sql += ` and p.label = ${connection.escape(promotion_label)} `
        }

        if(promotion_id){
            sql += " and pu.promotion_id = " + connection.escape(promotion_id)
        }

        if(unit_id){
            sql += " and pu.unit_id = " + connection.escape(unit_id)
        }

        return connection.queryAsync(sql)
    },

    findPropertiesByPromotion(connection, id){
        var sql = "Select * from promotion_properties where promotion_id = " + connection.escape(id);
        return connection.queryAsync(sql);
    },

    updateEnable(connection, enable, id){
        var sql = "update promotions set enable = " + enable + " where id = " + connection.escape(id);
        return connection.queryAsync(sql);
    },

    findPropertiesNameByPromotion(connection, id, properties = []){
        var sql = ` Select p.id, p.name, p.number  from promotion_properties pp
        inner join properties p on p.id = pp.property_id
        where pp.promotion_id = ${connection.escape(id)}`;

        if(properties.length) {
            sql += ` and p.id in ( ${properties.map(p => connection.escape(p)).join(', ')} )`;
        }

        return connection.queryAsync(sql);
    },

    validatePromotionOnUnit(connection, promotion_id, unit_id){
      var sql = "Select count(id) as unit_count, " +
        "(select count(id) from promotion_units pu where pu.promotion_id = promotion_units.promotion_id and unit_id = " +  connection.escape(unit_id) + ") as has_promo from promotion_units where promotion_id = " + connection.escape(promotion_id);
      console.log("sql-----------------------", sql);
      return connection.queryAsync(sql).then(s => s.length?s[0]:null)
    },

    async getAffectedUnits(connection, rules, promotion_id, company_id, unit_ids){
        var sql = "Select *," +
            "(SELECT id from promotion_units where promotion_id = " + connection.escape(promotion_id) + " and unit_id = units.id order by id desc limit 1) as promotion_units_id, " +
            "(SELECT discount from promotion_units where promotion_id = " + connection.escape(promotion_id) + " and unit_id = units.id order by id desc limit 1) as promotion_units_discount " +
            " from units where property_id in (select id from properties where company_id = " + connection.escape(company_id) + ') ' +
            ' and ( property_id in (select property_id from promotion_properties where promotion_id = ' + connection.escape(promotion_id) + "))";

            if(unit_ids && unit_ids.length){
                sql += `and units.id IN ( ${unit_ids.map(u => connection.escape(u)).join(', ')} )`
            }
        

        if(rules && rules.unit && rules.unit.category && rules.unit.category.length){
            sql += ' and (';
            for (let i = 0; i < rules.unit.category.length; i++){
                
                let category_sql = ' ( category_id ' + rules.unit.category[i].comparison + ' ' + connection.escape(rules.unit.category[i].value[1]);

                if(rules.unit.category[i].value.length === 5) {

                    let property_type = rules.unit.category[i].value[0];
                    let type = property_type === '1' ? 'storage': property_type === '2' ? 'residential':property_type === '3' ? 'parking': 'storage';
                    let all_units = await units.getUnitsInSpaceMix(connection,company_id,[],type,rules.unit.category[i].value[1],rules.unit.category[i].value[2],rules.unit.category[i].value[3],rules.unit.category[i].value[4]);
                    if(all_units && all_units.length) {
                        category_sql += ` AND id in (${ all_units.map( u=> connection.escape(u.id)).join(', ')}))`
                    } else {
                        continue;
                    }
                
                } else {
                    category_sql += ' )';
                }
                sql += category_sql;
                if(i < rules.unit.category.length - 1){
                    sql += ' or ';
                }
            }
            sql += ' )';
        }

        if(rules && rules.unit && rules.unit.floor && rules.unit.floor.length){
            console.log("rules.unit.floor", rules.unit.floor);
            sql += ' and (';
            for (let i = 0; i < rules.unit.floor.length; i++){
                sql += ' floor ' + rules.unit.floor[i].comparison + ' ' + connection.escape(rules.unit.floor[i].value);
                if(i < rules.unit.floor.length - 1){
                    sql += ' or ';
                }
            }
            sql += ' )';
        }

        if(rules && rules.unit && rules.unit.size && rules.unit.size.length){
            console.log("rules.unit.size", rules.unit.size);
            sql += ' and (';
            for (let i = 0; i < rules.unit.size.length; i++){
                sql += ' label ' + rules.unit.size[i].comparison + ' ' + connection.escape(rules.unit.size[i].value);
                if(i < rules.unit.size.length - 1){
                    sql += ' or ';
                }
            }
            sql += ' )';
        }

        if(rules && rules.unit && rules.unit.unit_category && rules.unit.unit_category.length){
            console.log("rules.unit.unit_category", rules.unit.unit_category);
            sql += ' and (';
            for (let i = 0; i < rules.unit.unit_category.length; i++){
                
                sql += ' category_id ' + rules.unit.unit_category[i].comparison + ' ' + connection.escape(Hashes.decode(rules.unit.unit_category[i].value)[0]);
                if(i < rules.unit.unit_category.length - 1){
                    sql += ' or ';
                }
            }
            sql += ' )';
                
        }


        if(rules && rules.unit && rules.unit.price && rules.unit.price.length){

            sql += ' and (';
            for (let i = 0; i < rules.unit.price.length; i++){
                sql += ` (select price ${rules.unit.price[i].comparison} ${connection.escape(rules.unit.price[i].value)} from unit_price_changes where unit_id = units.id order by id desc limit 1)`
                // sql += ' price ' + rules.unit.price[i].comparison + ' ' + connection.escape(rules.unit.price[i].value);
                if(i < rules.unit.price.length - 1){
                    sql += ' or ';
                }
            }
            sql += ' )';
        }

        console.log('Promotion affected units ', sql);

        return connection.queryAsync(sql);

    },

    deletePromoUnits(connection, promo_id, units_to_save){

        var sql = "DELETE from promotion_units where promotion_id = " + connection.escape(promo_id);

        if(units_to_save.length){
            sql += " and unit_id not in (" + units_to_save.join(', ') + ")";
        }



        return connection.queryAsync(sql);
    },

    removePromotionUnits(connection, promo_id, units_to_save){
        var sql = "DELETE from promotion_units where promotion_id = " + connection.escape(promo_id);
        if(units_to_save.length){
            sql += " and unit_id in (" + units_to_save.join(', ') + ")";
        }
        console.log("sql" , sql);
        return connection.queryAsync(sql);
    },


    savePromoUnit(connection, data, id){

        var sql;
        if(id){
            sql = "UPDATE promotion_units set ? where id = " + connection.escape(id);
        } else {
            sql = "insert into promotion_units set ?";
        }
        console.log("sql", connection.format(sql, data));

        return connection.queryAsync(sql, data);
    },

    saveBulkPromotionUnits(connection, data){
        if(data && data.length){
            var sql = "insert into promotion_units (promotion_id, unit_id, discount) values ?";
            return connection.queryAsync(sql, [data]);
        }
    },

    
    findPromotionPropertiesByProperty(connection, propertyId){
        let sql = `
            select pp.promotion_id
            from promotion_properties pp
                join promotions p on p.id = pp.promotion_id
            where pp.property_id = ${connection.escape(propertyId)} and p.active = 1
        `;        
        return connection.queryAsync(sql);
    },

    /**
     * This function returns a list of promotions sold for a given company
      */
    findPromotionsSold(connection, company_id, query, count) {
        let sql = `SELECT `
        if (count) {
            sql += `count(*) AS count `
        } else {
            sql += `u.id AS unit_id,
            u.number AS unit_number,
            pro.id AS id,
            pro.name AS promotion_name,
            pro.label AS label,
            pro.months AS periods_applied,
            pro.offset AS start_month,
            i.id AS invoice_id,
            i.DATE AS date,
            i.number AS invoice_number,
            i.total_discounts AS amount,
            l.id AS lease_id,
            c.id AS contact_id,
            concat(c.first, ' ', c.last) AS name,
            p.id AS property_id,
            ds.id AS discount_id,
            ds.start AS start_date,
            ds.end AS end_date,
            ds.type AS type `
        }
        sql += `FROM units u 
        JOIN
           leases l ON u.id = l.unit_id 
        JOIN
           invoices i ON l.id = i.lease_id 
        JOIN
           invoice_lines il ON i.id = il.invoice_id 
        JOIN
           discount_line_items dli ON il.id = dli.invoice_line_id 
        JOIN
           discounts ds ON dli.discount_id = ds.id 
        JOIN
           promotions pro ON ds.promotion_id = pro.id 
        JOIN
           properties p ON p.id = i.property_id 
        JOIN
           contact_leases cl ON l.id = cl.lease_id 
        JOIN
           contacts c 
           ON cl. contact_id = c.id 
        WHERE p.company_id = ${company_id} 
           `

        if (query.from_date) {
            let toDate = query.to_date || moment.utc().format('YYYY-MM-DD');
            sql += `AND i.date BETWEEN ${connection.escape(query.from_date)} AND ${connection.escape(toDate)} AND (i.void_date >= ${connection.escape(toDate)} OR i.void_date IS Null)  `
        } else {
            sql += `AND i.date = CURRENT_DATE()  AND (i.void_date >= CURRENT_DATE() OR i.void_date IS Null)  `

        }
        if (query.property_id) {
            sql += `AND i.property_id in (${query.property_id}) `
        }
        if (!count && query.limit) {
            sql += ` LIMIT ${connection.escape(parseInt(query.offset))},${connection.escape(parseInt(query.limit))}`
        }
        sql += `;`
        return connection.queryAsync(sql);
    }


};
