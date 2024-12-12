var settings    = require(__dirname + '/../config/settings.js');
var moment = require('moment');
var units =  require(__dirname + '/units.js');
var Hash = require(__dirname + '/../modules/hashes.js');
var Hashes = Hash.init();

module.exports = {

    findByCompanyId: function(connection, company_id, params = {}){
        let { type } = params;
        var promotionSql =  `
            select * from promotions
            where company_id = ${connection.escape(company_id)}
                and active = 1
                ${ type ? `and label = ${connection.escape(type)}` : '' }
            order by sort ASC
        `;
        console.log("Promotion -> findByCompanyId: ", promotionSql);
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
        var promotionSql =  "Select * from promotions where name = " + connection.escape(name) + " and company_id = " + connection.escape(company_id) + " and active = 1 ";

        if(promo_id){
            promotionSql += " and id != " + connection.escape(promo_id);
        }

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

    delete: function(connection, promotion_id, company_id){

        var sql = "UPDATE promotions set active = 0 where company_id = " + connection.escape(company_id) + " and id = " + connection.escape(promotion_id);

        return connection.queryAsync(sql);
    },
    

    getById: function(connection, promotion_id, company_id){

        var promotionSql =  "Select p.*, r.rounding_type as round from promotions p left join rounding r on p.id = r.object_id and r.status  = 1 where p.id = "+ connection.escape(promotion_id);

        if(company_id){
            promotionSql += " and company_id = " + connection.escape(company_id);
        }

        return connection.queryAsync(promotionSql)
            .then(function(promotionRes) {

                if(!promotionRes.length) return false;
                return promotionRes[0];
            });
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

    findActiveDiscounts: function(connection, lease_id, period_start, period_end){

        var discountSql =  `Select *, IF( 
            (SELECT id from leases_payment_cycles where discount_id = discounts.id and start_date <= ${connection.escape(period_start)} and end_date >= ${connection.escape(period_start)} limit 1), 
            '01_payment_cycle',
            IF(discounts.end, '02_promotion', '03_discount')
        ) as category  from discounts where lease_id = ${connection.escape(lease_id)}
            and start <= ${connection.escape(period_start)} and ( end is null or end >= ${connection.escape(period_start)}) order by category,id asc`;
        console.log("discountSql", discountSql)
        return connection.queryAsync(discountSql);
    },
    
    findAllDiscounts: function(connection,lease_id, date){

        var discountSql =  "Select * from discounts where lease_id = " + connection.escape(lease_id) + " and start <= "+ connection.escape(date) + " and ( end >= "+ connection.escape(date) + " or end is null )";
        
        return connection.queryAsync(discountSql)
            .then(function(discountRes) {
                return discountRes;
            });
    },
    
    getDiscountIdsByLeaseId: function(connection, lease_id){
        let discountSql =  "Select * from discounts where lease_id = "+ connection.escape(lease_id);
        return connection.queryAsync(discountSql)
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

    findRulesByPromotionId(connection, promotion_id) {
        var sql =  "Select * from promotion_rules where promotion_id = " + connection.escape(promotion_id);
        return connection.queryAsync(sql)
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

    findPromotionPropertiesByProperty(connection, propertyId, promotionId = ''){
        let sql = `
            select pp.promotion_id
            from promotion_properties pp
                join promotions p on p.id = pp.promotion_id
            where pp.property_id = ${connection.escape(propertyId)} and p.active = 1
        `;
        if(promotionId){
            sql += ` and p.id = ${connection.escape(promotionId)}`;
        }
        return connection.queryAsync(sql);
    },

};