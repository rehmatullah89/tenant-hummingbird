const Sql = require(__dirname + '/../../../modules/sql_snippets.js');

class LeaseQueries {
  constructor(data, date, start_date) {
    this.id = data.id;
    this.property_id = data.property_id
    this.unit_id =  " (SELECT unit_id from leases where id = " + data.id + ") ";
    this.lease_standing_id =  " (SELECT lease_standing_id FROM leases WHERE id = " + data.id + " ) "; // TODO Make Current
    this.discount_id =  " ( select promotion_id from discounts d inner join promotions p on d.promotion_id = p.id where p.label = 'discount' and d.lease_id = "+ this.id +" order by d.id desc limit 1 ) ";
    this.promotion_id =  "( select promotion_id from discounts d inner join promotions p on d.promotion_id = p.id where p.label = 'promotion' and d.lease_id = "+ this.id +" order by d.id asc limit 1 ) ";
    this.area_sql = " ((SELECT value from amenity_units where amenity_property_id = (select distinct ap.id from amenity_property ap join units un on un.property_id=ap.property_id where ap.amenity_name = 'width' and ap.property_type = un.type and un.id = " + this.unit_id+ ") and unit_id = " + this.unit_id+ ") * " +
    " (SELECT value from amenity_units where amenity_property_id = (select distinct ap.id from amenity_property ap join units un on un.property_id=ap.property_id where ap.amenity_name = 'length' and ap.property_type = un.type and un.id = " + this.unit_id+ ") and unit_id = " + this.unit_id+ "))";
    this.lease_rent = " (SELECT IFNULL(SUM(price),0) FROM services where product_id in (select id from products where default_type = 'rent') and lease_id = " + this.id + " and start_date <= '" + date + "' and (end_date is null or end_date >= '" + date + "') and status = 1 ) "
    this.total_payments = "( SELECT IFNULL(SUM(amount),0) from invoices_payments where invoice_id = invoices.id and date <= '" + date + "')";
    this.unit_price = "(SELECT IFNULL( (SELECT price from unit_price_changes where DATE(created) <= '" + date + "' and unit_id = " + this.unit_id + ' order by id desc limit 1),(SELECT upc.set_rate from unit_price_changes upc where DATE(upc.created) <= CURRENT_DATE() and upc.unit_id = ' + this.unit_id + ' order by upc.id DESC limit 1)))';
    this.lease_old_rent =  " (IFNULL((select sum(price) from services where end_date = date_sub((SELECT start_date FROM services where product_id in (select id from products where default_type = 'rent') and lease_id = " + this.id + " and start_date <= '" + date + "' and (end_date is null or end_date >= '" + date + "') and status = 1) , interval 1 day) and lease_id = " + this.id + " and product_id in (select id from products where default_type = 'rent')), " + this.lease_rent + ")) ",
    this.move_out_refunds = `(SELECT IFNULL(SUM(amount), 0) from refunds where DATE(CONVERT_TZ(date , "+00:00", (select utc_offset from properties where id = (select property_id from payments where id = payment_id)))) = (select end_date from leases where id = ${this.id}) and payment_id in (select payment_id from invoices_payments where invoice_id in (select id from invoices where lease_id = ${this.id})))`;
    this.move_out_credits = `(SELECT IFNULL(SUM(amount), 0) from payments where credit_type = 'credit' and DATE(date) = (select end_date from leases where id = ${this.id}) and id in (select payment_id from invoices_payments where invoice_id in (select id from invoices where lease_id = ${this.id})))`;
  
    this.parking_space_length = `(
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
              un.id = ${this.unit_id}
          ) AND
          au.unit_id = ${this.unit_id}),0)        
    )`;

    this.set_rate = `(
      SELECT 
        IFNULL((
          SELECT upc.set_rate
          FROM unit_price_changes upc
          WHERE 
            DATE(upc.created) <= CURRENT_DATE() AND 
            upc.unit_id = ${this.unit_id}
          ORDER BY upc.id DESC
          LIMIT 1),0)
    )`;
    this.sell_rate_at_move_in = `( SELECT lvp.sell_rate FROM lease_value_pricing lvp WHERE lvp.lease_id = ${this.id} )`;
    this.set_rate_at_move_in = `( SELECT lvp.set_rate FROM lease_value_pricing lvp WHERE lvp.lease_id = ${this.id} )`;
    this.offer_rate_at_move_in = `( SELECT le.rent FROM leases le WHERE le.id = ${this.id} )`;

    this.rent_sell_variance = `(SELECT ${this.lease_rent} - ${this.unit_price})` // " (select " + this.lease_rent +  " - " + this.unit_price + " ) ",
    this.rent_set_variance = `(SELECT (${this.lease_rent} - ${this.set_rate}))`
    this.offer_sell_variance_at_move_in = `(SELECT (${this.offer_rate_at_move_in} - ${this.sell_rate_at_move_in} ))`;
    this.offer_set_variance_at_move_in = `(SELECT (${this.offer_rate_at_move_in} - ${this.set_rate_at_move_in} ))`;
    this.sell_set_variance_at_move_in = `(SELECT (${this.sell_rate_at_move_in} - ${this.set_rate_at_move_in} ))`;
    this.rent_offer_variance = `(SELECT (${this.lease_rent} - ${this.offer_rate_at_move_in}))`;

    this.rent_by_sqft  = `( SELECT ROUND((${this.lease_rent} / ${this.area_sql}), 2) )`  //= " ( " + this.lease_rent + " / " + this.area_sql +  ") "
    this.rent_by_ft = `( SELECT ROUND((${this.lease_rent} / ${this.parking_space_length}), 2) )`;

    this.active_lease_condition = `(le.status = 1 AND (le.end_date IS NULL OR le.end_date >= CURDATE()))`;
    this.closed_lease_condition = `(le.status = 1 AND le.end_date < CURDATE())`;

    this.days_of_stay = `(
      SELECT 
        CASE
          WHEN ${this.active_lease_condition} THEN DATEDIFF(CURDATE(), le.start_date)  
          WHEN ${this.closed_lease_condition} THEN DATEDIFF(le.end_date, le.start_date) 
        END
      FROM leases le
      WHERE le.id = ${this.id}
    )`;

    this.months_of_stay = `(
      SELECT
        CASE
          WHEN ${this.active_lease_condition} THEN ${Sql.getFractionalDateDifference(`le.start_date`, `CURDATE()`, `MONTH`)}
          WHEN ${this.closed_lease_condition} THEN ${Sql.getFractionalDateDifference(`le.start_date`, `le.end_date`, `MONTH`)}
        END
      FROM leases le
      WHERE le.id = ${this.id}
    )`;
    this.amount_paid = "SELECT SUM(ila.amount) FROM invoice_lines_allocation ila WHERE ila.type = 'line' AND ila.invoice_line_id = il.id";
    this.discount_amount = "SELECT SUM(dli.amount) FROM discount_line_items dli WHERE dli.invoice_line_id = il.id";
    this.due_amount = `(il.qty * il.cost) - IFNULL((${this.discount_amount}), 0) - IFNULL((${this.amount_paid}), 0)`;
    this.due_invoices = `SELECT id FROM invoices i WHERE i.status = 1 AND i.lease_id = ${this.id} AND i.due < "${date}" AND i.voided_at IS NULL AND (i.subtotal + i.total_tax-i.total_discounts-i.total_payments) > 0`;

    this.queries = {

      lease_id :                  this.id,
      lease_start_date:           " (SELECT start_date FROM leases WHERE id = " + this.id + ") ",
      lease_end_date:             " (SELECT end_date FROM leases WHERE id = " + this.id + ") ",
      lease_rent:                 this.lease_rent,
      lease_old_rent:             this.lease_old_rent,
      lease_rent_change:          ` (SELECT ${this.lease_rent} - ${this.lease_old_rent})`,
      lease_standing_id:          this.lease_standing_id,
      lease_standing:             " (SELECT name FROM lease_standings WHERE id = " + this.lease_standing_id + ") ", // TODO Make Current
      lease_send_invoice:         " (SELECT send_invoice FROM leases WHERE id = " + this.id + ") ",
      lease_security_deposit:     " (SELECT IFNULL(SUM(price),0) FROM services where product_id in (select id from products where default_type = 'security') and lease_id = " + this.id + " ) ",
      lease_bill_day:             " (SELECT bill_day FROM leases WHERE id = " + this.id + ") ",
      lease_monthly:              " (SELECT monthly FROM leases WHERE id = " + this.id + ") ",
      lease_next_payment_cycle:   " (SELECT IFNULL(CONCAT(UPPER(SUBSTRING(payment_cycle,1,1)),LOWER(SUBSTRING(payment_cycle,2))), 'Monthly') FROM leases WHERE id = " + this.id + ") ",
      lease_payment_cycle:        " (SELECT IFNULL(CONCAT(UPPER(SUBSTRING(payment_cycle,1,1)),LOWER(SUBSTRING(payment_cycle,2))), 'Monthly') FROM leases_payment_cycles WHERE lease_id = " + this.id + " and  (deleted_at is null or deleted_at >= '" + date + "') and start_date <= '" + date + "' and end_date >= '" + date + "' order by id desc limit 1) ",
      lease_payment_cycle_bill:   " (SELECT IFNULL(rent * periods, " + this.lease_rent + ") FROM leases_payment_cycles WHERE lease_id = " + this.id + " and (deleted_at is null or deleted_at >= '" + date + "') and start_date <= '" + date + "' and end_date >= '" + date + "' order by id desc limit 1) ",
      lease_decline_insurance:    " (SELECT decline_insurance FROM leases WHERE id = " + this.id + ") ",
      lease_insurance_expiration: " (SELECT CONCAT(insurance_exp_month, '/',insurance_exp_year) FROM leases WHERE id = " + this.id + ") ",
      lease_sched_move_out:       " (SELECT scheduled_moveout FROM leases WHERE id = " + this.id + " ) ",
      lease_auction_status:       Sql.lease_auction_status(this.id),
      
      lease_sell_rate_at_move_in: this.sell_rate_at_move_in,
      lease_set_rate_at_move_in: this.set_rate_at_move_in,
      lease_offer_rate_at_move_in: this.offer_rate_at_move_in,

      lease_rent_set_variance: this.rent_set_variance,
      lease_rent_set_variance_percent: `(SELECT IFNULL((SELECT ${this.rent_set_variance} / IFNULL(${this.set_rate}, 1)), 0)) `,
      lease_rent_sell_variance: this.rent_sell_variance,
      lease_rent_sell_variance_percent: `(SELECT IFNULL((SELECT ${this.rent_sell_variance} / IFNULL(${this.unit_price}, 1)), 0)) `,

      lease_offer_sell_variance_at_move_in: this.offer_sell_variance_at_move_in,
      lease_offer_sell_variance_percent_at_move_in: `(SELECT IFNULL((SELECT ${this.offer_sell_variance_at_move_in} / IFNULL(${this.sell_rate_at_move_in}, 1)), 0)) `,
      lease_offer_set_variance_at_move_in: this.offer_set_variance_at_move_in,
      lease_offer_set_variance_percent_at_move_in: `(SELECT IFNULL((SELECT ${this.offer_set_variance_at_move_in} / IFNULL(${this.set_rate_at_move_in}, 1)), 0)) `,
      lease_sell_set_variance_at_move_in : this.sell_set_variance_at_move_in,
      lease_sell_set_variance_percent_at_move_in: `(SELECT IFNULL((SELECT ${this.sell_set_variance_at_move_in} / IFNULL(${this.set_rate_at_move_in}, 1)), 0)) `,
      lease_rent_offer_variance: this.rent_offer_variance, 
      lease_rent_offer_variance_percent: `(SELECT IFNULL((SELECT ${this.rent_offer_variance} / IFNULL(${this.offer_rate_at_move_in}, 1)), 0)) `,

      lease_rent_per_sqft:                 this.rent_by_sqft,
      lease_rent_per_sqft_annualized:      `(ROUND((${this.rent_by_sqft} * 12), 2))`,

      lease_rent_by_ft:                   this.rent_by_ft,
      lease_rent_by_ft_annualized:         `(ROUND((${this.rent_by_ft} * 12), 2))`,

      lease_days_of_stay:                 this.days_of_stay,
      lease_months_of_stay:               this.months_of_stay,
      lease_years_of_stay:                `( SELECT ROUND((${this.days_of_stay} / 365), 2) )`,
      
      lease_created_by_name:        " (SELECT CONCAT(first, ' ' , last) FROM contacts WHERE id = (select created_by from leases where id = " + this.id + ")) ",
      lease_created_by:            " (SELECT created_by FROM leases WHERE id = " + this.id + " ) ",

      lease_created:              " (SELECT created FROM leases WHERE id = " + this.id + ") ",

      lease_rented_months:        " (SELECT PERIOD_DIFF(DATE_FORMAT('" + date + "', '%Y%m' ), DATE_FORMAT(start_date, '%Y%m' ) ) from leases where id = " + this.id + ") ",
      lease_rented_days:          " (SELECT DATEDIFF('" + date + "', start_date) from leases where id = " + this.id + ") ",
      lease_days_to_convert:      " (SELECT DATEDIFF(start_date, (SELECT created from leads where contact_id = (select contact_id from contact_leases where lease_id = " + this.id + " having MIN(contact_id) ) limit 1)) from leases where id = " + this.id + ") ",

      lease_discount:             " (SELECT name FROM promotions WHERE id = " + this.discount_id + ") ",
      lease_sign_up_promo:        " (SELECT name FROM promotions WHERE id = " + this.promotion_id + ") ",

      lease_promotions:           " ( select GROUP_CONCAT(name) from promotions where active = 1 and enable = 1 and active_period = 'active' and id in (select promotion_id from discounts where id in ( select discount_id from discount_line_items where invoice_line_id in ( select min(id) from invoice_lines where invoice_id in ( select id from invoices where lease_id = " + this.id + " ) ) ) ) ) ",
      lease_promotions_amount:    " ( SELECT IFNULL(SUM(amount), 0) FROM discount_line_items where invoice_line_id in (select min(id) from invoice_lines where invoice_id in (SELECT id FROM invoices where lease_id= " + this.id + ")) ) ",

      lease_days_late:            " (SELECT DATEDIFF('" + date + "', (SELECT MIN(DUE) from invoices where due <= '" + date + "' and status = 1 and lease_id = " + this.id + " and (subtotal + total_tax) > (total_discounts + " + this.total_payments + ") )) from leases where id = " + this.id + ") ",

      lease_move_out_refund:      this.move_out_refunds,
      lease_move_out_credit:      `(${this.move_out_credits} - ${this.move_out_refunds})`,
      lease_writeoffs:            ` (SELECT IFNULL(SUM(amount), 0) from payments where status = 1 and credit_type = 'loss' and id in (select payment_id from invoices_payments where invoice_id in (select id from invoices where status = 1 and lease_id = ${this.id} ))) `,
      lease_move_out_notes:       ` (SELECT GROUP_CONCAT(content SEPARATOR ', ') from interactions where context = 'moveout' and ref_object_type = 'lease' and ref_object_id = ${this.id}) `,
      lease_billing_type:         `("Monthly")`,
      
      lease_document_status:       `(select case when MIN(completed)>0 then 'Complete' else 'Incomplete' end from checklist_leases where document_id is not null and lease_id = ${this.id} )`,
      lease_is_autopay:            `(SELECT case when COUNT(*)>0 then 'Yes' else 'No' end FROM leases_payment_methods WHERE lease_id = ${this.id}  and deleted is null order by id desc )`,

      // TODO Can Optimize - As of last date
      lease_last_payment:         " (SELECT IFNULL(SUM(amount), 0) FROM payments WHERE date <= '" + date + "' and status = 1 and lease_id = " + this.id + " and date = (select MAX(date) from payments where  payments.lease_id = " + this.id + " )) ",
      lease_last_payment_date:    ` (SELECT date FROM payments WHERE id = ( SELECT payment_id FROM invoices_payments WHERE amount != 0 AND invoice_id IN (SELECT id FROM invoices WHERE lease_id = ${this.id}) GROUP BY payment_id ORDER BY payment_id DESC LIMIT 1 ))`,
      lease_last_payment_source:  ` (SELECT source FROM payments WHERE status = 1 and id = (select payment_id from invoices_payments_breakdown where invoice_id in (select id from invoices where lease_id = ${this.id}) and date <= '${date}' order by id desc limit 1))`,

      lease_balance:               "(SELECT  IFNULL(SUM( IFNULL(subtotal, 0) + IFNULL(total_tax,0) - IFNULL(total_discounts,0) - ( SELECT IFNULL(SUM(amount),0) from invoices_payments where invoice_id = i.id and date <=  '" + date + "')),0) from invoices i where i.status = 1 and i.lease_id = " + this.id + " and i.due < '" + date + "'  ) ",
      lease_beginning_balance:     "(SELECT  IFNULL(SUM( IFNULL(subtotal, 0) + IFNULL(total_tax,0) - IFNULL(total_discounts,0) - ( SELECT IFNULL(SUM(amount),0) from invoices_payments where invoice_id = i.id and date <=  '" + start_date + "')),0) from invoices i where i.status = 1 and i.lease_id = " + this.id + " and i.due <= '" + start_date + "'  ) ",
      lease_ending_balance:        "(SELECT  IFNULL(SUM( IFNULL(subtotal, 0) + IFNULL(total_tax,0) - IFNULL(total_discounts,0) - ( SELECT IFNULL(SUM(amount),0) from invoices_payments where invoice_id = i.id and date <=  '" + date + "')),0) from invoices i where i.status = 1 and i.lease_id = " + this.id + " and i.due <= '" + date + "'  ) ",
      lease_lifetime_billed:       "(SELECT SUM(IFNULL(subtotal, 0) + IFNULL(total_tax,0) - IFNULL(total_discounts,0)) from invoices i where i.status = 1 and i.lease_id = " + this.id + " and i.due <= '" + date + "' )",
      lease_lifetime_payments:     "(SELECT IFNULL(SUM(amount),0) FROM invoices_payments where payment_id in (select id from payments where status = 1) and date <= '" + date + "' and  invoice_id in (select id from invoices i where i.status = 1 and i.lease_id = " + this.id + " )) ",

      lease_next_billing_date:      Sql.lease_next_billing_date("(SELECT bill_day FROM leases WHERE id = " + this.id + ")", date, this.id), // TODO Make Current
      lease_paid_through_date:      Sql.lease_paid_through_date(this.id, date), // TODO Make Current

      lease_last_rent_change_date:        " (select MAX(start_date) from services where status = 1 and product_id in (select id from products where default_type = 'rent') and start_date <= '" + date + "' and lease_id = " + this.id + ") ",

      lease_days_since_rent_change:       " (select DATEDIFF('" + date + "', MAX(start_date)) from services where status = 1 and product_id in (select id from products where default_type = 'rent') and start_date <= '" + date + "' and lease_id = " + this.id + " ) ",
      lease_total_rent_change:            "(select IFNULL((SELECT price from services where lease_id = "+ this.id +" and	id in (select max(id) from services where lease_id ="+ this.id +" and product_id in ( select id from products where default_type = 'rent') and start_date <=  '" + date + "')) - (SELECT price from services where lease_id = "+ this.id +" and id in ( select min(id) from services where lease_id = "+ this.id +" and product_id in (select id from products where default_type = 'rent') and start_date <=  '" + date + "')),''))",
      lease_bad_debt_writeoffs:           " (select  SUM(amount) from payments where date <= '" + date + "' and status = 1 and credit_type = 'loss' and id in (select payment_id from invoices_payments where invoice_id in (select id from invoices where status = 1 and lease_id = " + this.id + " ))) ",
      lease_uncollected_rent:             " (select  IFNULL(SUM(cost * qty), 0) from invoice_lines where product_id in (select id from products where default_type = 'rent') and invoice_id in (select id from invoices where status = 1 and (IFNULL(subtotal, 0) + IFNULL(total_tax,0) - IFNULL(total_discounts,0) -  " + this.total_payments + "  ) > 0  and lease_id = " + this.id + " and due <= '" + date + "' )) ", // TODO factor in payments
      lease_delinquency_notes:            " (SELECT content FROM interactions WHERE DATE(created) <= '" + date + "' and contact_id in (select contact_id from contact_leases where lease_id =  " + this.id + ") and context = 'delinquencyCenter' HAVING (MAX(created))) ",
      lease_refunds:                      " (select  IFNULL(SUM(amount), 0) from refunds where payment_id in (select id from payments where date <= '" + date + "' and status = 1 and credit_type = 'payment' and id in (select payment_id from invoices_payments where invoice_id in (select id from invoices where status = 1 and lease_id = " + this.id + " )))) ",
      lease_active_insurance_name:        " (select  name from products where default_type = 'insurance' and id = (select product_id from services where status = 1 and start_date <= '" + date + "' and (end_date is null or end_date >= '" + date + "' ) and lease_id = " + this.id + " order by id desc limit 1 ))",
      lease_active_insurance_coverage:    " (select  IFNULL(coverage,0) from insurance where product_id = (select product_id from services where status = 1 and start_date <= '" + date + "' and (end_date is null or end_date >= '" + date + "') and service_type = 'insurance' and lease_id = " + this.id + " HAVING MAX(id)))",
      lease_active_insurance_premium:     " (select  IFNULL(premium_value,0) from insurance where product_id = (select product_id from services where status = 1 and start_date <= '" + date + "' and (end_date is null or end_date >= '" + date + "') and service_type = 'insurance' and lease_id = " + this.id + " HAVING MAX(id)))",
      lease_insurance_start_date:         " (select start_date from services where status = 1 and start_date <= '" + date + "' and (end_date is null or end_date >= '" + date + "') and service_type = 'insurance' and lease_id = " + this.id + " HAVING MAX(id))",
      lease_insurance_status:             " (SELECT IF((select product_id from services where status = 1 and start_date <= '" + date + "' and (end_date is null or end_date >= '" + date + "') and service_type = 'insurance' and lease_id = " + this.id + " HAVING MAX(id)) is not null , 'Insured', 'None'))",
      lease_insurance_added_date:         " (Select s.created from services s where s.status = 1 and s.start_date <= '" + date + "' and (s.end_date is null or s.end_date >= '" + date + "') and s.service_type = 'insurance' and s.lease_id = " + this.id + " HAVING MAX(s.id))",
      lease_total_past_due:               " (select  IFNULL(SUM(qty * cost),0) from invoice_lines where invoice_id in (select id from invoices where due <= '" + date + "' and lease_id = " +  this.id + " and status = 1 and (IFNULL(subtotal, 0) + IFNULL(total_tax,0) - IFNULL(total_discounts,0) - " + this.total_payments + ") > 0 ))",

      lease_past_due_paid:                " (select IFNULL( SUM(amount) , 0) from invoices_payments where date <= '" + date + "' and invoice_id in ( select id from invoices where lease_id = " +  this.id + " and status = 1 and ( IFNULL(subtotal, 0) + IFNULL(total_tax,0) - IFNULL(total_discounts,0) - " + this.total_payments + " ) > 0 ))",
      lease_prepay_balance:               " (select IFNULL( SUM(amount) , 0) from invoices_payments where date <= '" + date + "' and invoice_id in ( select id from invoices where lease_id = " +  this.id + " and status = 1 and due > '" + date + "' ))",

      lease_active_recurring_fees:        "(select SUM(price) from services where recurring = 1 and status = 1 and product_id in (select id from products where default_type = 'late') and start_date <= '" + date + "' and (end_date is null or end_date >= '" + date + "')  and lease_id = " + this.id + ") ",
      lease_rent_variance:                " (select " + this.lease_rent +  " - " + this.unit_price + " ) ",
      lease_rent_variance_prct:           " (select ((" + this.lease_rent +  " - " + this.unit_price + ") / " + this.unit_price + ") )",
      lease_next_invoice_total:           Sql.lease_next_invoice_total(this.id, Sql.lease_next_billing_date("(SELECT bill_day FROM leases WHERE id = services.lease_id)", date, "services.lease_id")),

      lease_days_late_rent:                     " (select datediff(now(), IFNULL(due, now())) FROM invoices WHERE status > 0 and due < now() and lease_id = " + this.id + " and ( IFNULL(subtotal, 0) + IFNULL(total_tax,0) - IFNULL(total_discounts,0) - IFNULL(total_payments,0) ) > 0 ORDER BY due ASC limit 1)",
      lease_tier_type:                    `(SELECT IFNULL((SELECT label FROM property_value_price_tier_configurations pvptc WHERE pvptc.tier_type = (SELECT lvp.tier_type FROM lease_value_pricing lvp WHERE lvp.lease_id = ${this.id}) AND pvptc.property_id = ${this.property_id}), ''))`,
      lease_rent_plan_status:             `( 
        SELECT IF(
            (rmp.id AND prms.rent_engine AND prms.automation_enabled_by_admin ) OR lrps.status = 'exempt',
            lrps.status,
            NULL
        )
        FROM lease_rent_plan_settings lrps
        LEFT JOIN rent_management_plans rmp ON rmp.id = lrps.rent_plan_id AND rmp.deleted_at is NULL
        LEFT JOIN property_rent_management_settings prms ON prms.property_id =  lrps.property_id AND prms.rent_engine = 'hummingbird' AND prms.active = 1 
        WHERE lrps.lease_id = ${this.id}
            AND lrps.end_date IS NULL
            AND lrps.status <> 'cancelled'  
      )`,
      
      lease_rent_past_due:  `(SELECT IFNULL(SUM(${this.due_amount}), 0) FROM invoice_lines il WHERE il.invoice_id IN (${this.due_invoices}) AND il.product_id IN ( SELECT id FROM products WHERE default_type = 'rent'))`,
      lease_fees_past_due:  `(SELECT IFNULL(SUM(${this.due_amount}), 0) FROM invoice_lines il WHERE il.invoice_id IN (${this.due_invoices}) AND il.product_id IN ( SELECT id FROM products WHERE default_type = 'late'))`,
      lease_other_past_due: ` (SELECT IFNULL(SUM(${this.due_amount}), 0) FROM invoice_lines il WHERE il.invoice_id IN (${this.due_invoices}) AND il.product_id IN ( SELECT id FROM products WHERE default_type not in ('late', 'rent')))`,
      lease_coverage_due:   ` (SELECT IFNULL(SUM(${this.due_amount}), 0) FROM invoice_lines il WHERE il.invoice_id IN (${this.due_invoices}) AND il.product_id IN ( SELECT id FROM products WHERE default_type = 'insurance'))`,
      lease_tax_past_due:   ` (SELECT IFNULL(SUM(IFNULL(i.total_tax, 0) - IFNULL(( SELECT SUM(amount) FROM invoice_lines_allocation ila WHERE ila.invoice_id = i.id AND ila.type = 'tax'), 0)), 0) FROM invoices i WHERE i.status = 1 AND i.lease_id = ${this.id} AND i.due < "${date}" AND i.voided_at IS NULL AND((i.subtotal + i.total_tax-i.total_discounts-i.total_payments) > 0))`,

      lease_tier_type:                    ` (SELECT IFNULL((SELECT label FROM property_value_price_tier_configurations pvptc WHERE pvptc.tier_type = (SELECT lvp.tier_type FROM lease_value_pricing lvp WHERE lvp.lease_id = ${this.id}) AND pvptc.property_id = ${this.property_id}), ''))`
    }
  }
}

module.exports = LeaseQueries;

