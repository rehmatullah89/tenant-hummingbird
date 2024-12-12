const Sql = require(__dirname + '/../../../modules/sql_snippets.js');
var ENUMS = require(__dirname + '/../../../modules/enums.js');
class unitQueries {
  constructor(data, date) {
    this.id = data.id;
    let lease_id = "(SELECT id from leases where unit_id = " + this.id + " and start_date <= " + date + " and (end_date is null or end_date  > " + date + ") and status = 1)";

    let area_sql = " ((SELECT value from amenity_units where amenity_property_id = (select distinct ap.id from amenity_property ap join units un on un.property_id=ap.property_id where ap.amenity_name = 'width' and ap.property_type = un.type and un.id = " + this.id+ ") and unit_id = " + this.id+ ") * " +
    " (SELECT value from amenity_units where amenity_property_id = (select distinct ap.id from amenity_property ap join units un on un.property_id=ap.property_id where ap.amenity_name = 'length' and ap.property_type = un.type and un.id = " + this.id+ ") and unit_id = " + this.id+ "))";

    let lease_count = "(select count(id) from leases where unit_id = " + this.id + " and status = 1 )";
    let old_lease_count = "(select count(id) from leases where unit_id = " + this.id + " and status = 1 and end_date < " + date + " )";
    let length_of_stay = "(select SUM(SELECT DATEDIFF(IFNULL(end_date," + date + "), start_date) from leases where unit_id = " + this.id + " and status = 1 ))";
    let old_length_of_stay = "(select SUM(SELECT DATEDIFF(end_date, start_date) from leases where unit_id = " + this.id + " and status = 1 and end_date < " + date + " ))";
    let unit_price = `(SELECT IFNULL( (SELECT price from unit_price_changes where DATE(created) <= '${date}' and unit_id = ${this.id} order by id desc limit 1),(SELECT upc.set_rate from unit_price_changes upc where DATE(upc.created) <= CURRENT_DATE() and upc.unit_id = ${this.id} order by upc.id DESC limit 1 )) as price )`;
    let lease_rent = " (SELECT SUM(IFNULL(price,0)) FROM services where product_id in (select id from products where default_type = 'rent') and lease_id = " + lease_id + " and start_date <= " + date + " and (end_date is null or end_date > " + date + ") ) ";
    let set_rate = `(SELECT upc.set_rate FROM unit_price_changes upc WHERE DATE(upc.created) <= CURRENT_DATE() AND upc.unit_id = ${this.id} ORDER BY upc.id DESC LIMIT 1 )`;
    let parking_space_length = `(
      SELECT IFNULL((SELECT value 
        FROM amenity_units au 
        WHERE 
          amenity_property_id IN (
            SELECT DISTINCT(ap.id)
            FROM amenity_property ap 
            JOIN units un ON un.property_id = ap.property_id 
            WHERE 
              ap.amenity_name = 'length' AND 
              ap.property_type ='parking' AND
              un.id = ${this.id}
          ) AND
          au.unit_id = ${this.id}),0)        
    )`;
    let sell_set_variance = `(SELECT (${unit_price} - ${set_rate}))`;

    let sell_rate_by_sqft = `( SELECT ROUND((${unit_price} / ${area_sql}), 2) )`;
    let sell_rate_by_ft = `( SELECT ROUND((${unit_price} / ${parking_space_length}), 2) )`;

    let set_rate_by_ft = `( SELECT ROUND((${set_rate} / ${parking_space_length}), 2) )`;
    let set_rate_by_sqft = `( SELECT ROUND((${set_rate} / ${area_sql}), 2) )`;

    this.queries = {
      unit_id:                this.id,
      unit_number:            '(SELECT number from units where id = ' + this.id + ')',
      unit_number_no:         `(SELECT unit_number_no from units where id = ${this.id} )`,
      unit_number_str:        `(SELECT unit_number_str from units where id = ${this.id} )`,
      unit_floor:             '(SELECT floor from units where id = ' + this.id + ')',
      unit_type:              '(SELECT type from units where id = ' + this.id + ')',
      unit_size:              '(SELECT label from units where id = ' + this.id + ')',
      unit_description:       '(SELECT description from units where id = ' + this.id + ')',
      unit_available_date:    '(SELECT available_date from units where id = ' + this.id + ')',
      unit_walk_through_sort: '(SELECT walk_through_sort from units where id = ' + this.id + ')',
      unit_status:             Sql.unit_status(this.id),

      unit_set_rate:          set_rate,
      unit_price:             unit_price,
      unit_sqft:              area_sql,

      // updated by BCT
      unit_amenities:         `(

        select TRIM(BOTH ',' FROM REPLACE(GROUP_CONCAT(distinct IF(amu.value = "Yes", ap.amenity_name, if(ap.field_type = 'boolean' and amu.value is null, '', amu.value)) ORDER BY ap.sort_order asc), ',,', ','))
        from amenity_property ap
          left join (select * from amenity_units where unit_id = ${this.id}) as amu on amu.amenity_property_id = ap.id
        where ap.deleted_at is null
          AND ap.amenity_category_id != 11
          AND ap.property_id = (select property_id from units WHERE id = ${this.id})
      )`,
      unit_featured:          '(SELECT featured from units where id = ' + this.id + ')',
      unit_category:          "(SELECT name from unit_categories where id = (select category_id from units where id = " + this.id + "))",
      unit_category_id:       "(select category_id from units where id = " + this.id + ")",
      unit_promotions:        `(select GROUP_CONCAT(name) from promotions where active = 1 and enable = 1 and (active_period = 'active' or (active_period = 'date_range' and '${date}' between start_date and end_date) or (active_period = 'end_on' and end_date >= '${date}') ) and label = 'promotion' and id in ( select promotion_id from  promotion_units where unit_id = ${this.id}))`,
      unit_discounts:         "(select GROUP_CONCAT(name) from promotions where active = 1 and enable = 1 and label = 'discount' and id in ( select promotion_id from  promotion_units where unit_id = " + this.id + "))",
      unit_space_mix:         `(SELECT concat( (SELECT value FROM amenity_units WHERE amenity_property_id = (SELECT id FROM amenity_property WHERE amenity_name = 'width' AND property_type = 'storage' and property_id = units.property_id) AND unit_id =  ${this.id}),' x ', (SELECT value FROM amenity_units WHERE amenity_property_id = (SELECT id FROM amenity_property WHERE amenity_name = 'length' AND property_type = 'storage' and property_id = units.property_id) AND unit_id =  ${this.id}),' x ', (SELECT value
                               FROM amenity_units WHERE amenity_property_id = (SELECT id FROM amenity_property WHERE amenity_name = 'height' AND property_type = 'storage' and property_id = units.property_id) AND unit_id =  ${this.id}),' - ', (SELECT name FROM unit_categories WHERE id = units.category_id) ) as space_mix FROM units where id = ${this.id})`,

      unit_overlocked:        Sql.unit_overlocked_status(this.id, date),
      unit_rent_variance:     " (SELECT " + unit_price +  " - " + lease_rent + " ) ", // TODO fix this
      unit_days_vacant:       ` (SELECT  IFNULL(DATEDIFF('${date}' , (select MAX(end_date) from leases WHERE end_date < '${date}' and  status = 1 and unit_id = ${this.id} and unit_id not in ( select unit_id from leases where status = 1 and end_date is null or end_date  > '${date}'))),0) ) `,
      unit_price_by_sqft:     " (SELECT  " + unit_price + " / " + area_sql + " where  unit_id = " + this.id + ")",


      unit_avg_length_of_stay_current: " (SELECT " + length_of_stay + "/" + lease_count +  ") ",
      unit_avg_length_of_stay_not_current: " (SELECT " + old_length_of_stay + "/" + old_lease_count + ") ",

      unit_sell_set_variance: sell_set_variance,
      unit_sell_set_variance_percent: `(SELECT IFNULL((SELECT ${sell_set_variance} / IFNULL(${set_rate}, 1)), 0)) `,

      unit_sell_rate_per_sqft: sell_rate_by_sqft,
      unit_sell_rate_per_sqft_annualized: `(ROUND((${sell_rate_by_sqft} * 12), 2))`,

      unit_sell_rate_per_ft: sell_rate_by_ft,
      unit_sell_rate_per_ft_annualized: `(ROUND((${sell_rate_by_ft} * 12), 2))`,
  
      unit_set_rate_per_sqft: set_rate_by_sqft,
      unit_set_rate_per_sqft_annualized: `(ROUND((${set_rate_by_sqft} * 12), 2))`,

      unit_set_rate_per_ft: set_rate_by_ft,
      unit_set_rate_per_ft_annualized: `(ROUND((${set_rate_by_ft} * 12), 2))`,


    }
  }
}

module.exports = unitQueries;

