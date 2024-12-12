var settings    = require(__dirname + '/../config/settings.js');
var Sql = require(__dirname + '/../modules/sql_snippets.js');
const msrModels = require(__dirname + '/msr');
var moment = require('moment');

const Report = {

    findAutoByCompanyId:function(connection, company_id){
        var sql = "Select *, (select name from reports where id = report_id) as report_name from scheduled_reports where company_id  = " +  connection.escape(company_id);

        return connection.queryAsync(sql);
    },
    findById:function(connection, id, company_id){
        var sql = "Select * from scheduled_reports where id  = " +  connection.escape(id) + " and company_id  = " +  connection.escape(company_id);

        return connection.queryAsync(sql).then(function(reportRes){
            return reportRes[0] || null;
        });
    },
    save: function(connection, data, id){
        var sql;
        if(id){
            sql = "UPDATE saved_reports set ? where id = " + connection.escape(id);
        } else {
            sql = "insert into saved_reports set ?";
        }
        return connection.queryAsync(sql, data);

    },
    findSaved(connection, contact_id, company_id, template){
      var sql;
      sql = "SELECT * From saved_reports where contact_id  = " +  connection.escape(contact_id) + " and company_id  = " +  connection.escape(company_id);

      if(template){

      sql +=  " and template = " + connection.escape(template);
      }
      return connection.queryAsync(sql);
    },
    findSavedById(connection, report_id, company_id){
      var sql;
      sql = "SELECT * From saved_reports where id  = " +  connection.escape(report_id);
      return connection.queryAsync(sql).then(r => r.length? r[0]: null);
    },
    deleteSaved: function(connection, id, company_id){
      var sql = "DELETE FROM saved_reports where id  = " +  connection.escape(id) + " and company_id  = " +  connection.escape(company_id);
      console.log(sql);
      return connection.queryAsync(sql);
    },

    saveScheduledReport: function(connection, data, id){
      var sql;
      if(id){
        sql = "UPDATE scheduled_reports set ? where id = " + connection.escape(id);
      } else {
        sql = "insert into scheduled_reports set ?";
      }
      return connection.queryAsync(sql, data);

    },

    delete: function(connection, id, company_id){
        var sql;
        sql = "delete from scheduled_reports where id  = " +  connection.escape(id) + " and company_id  = " +  connection.escape(company_id);
        return connection.queryAsync(sql);

    },

    removeDefault: function(connection, contact_id, template){

      let sql = `Update saved_reports set is_default = 0 where contact_id = ${connection.escape(contact_id)} and template = ${connection.escape(template)}`
      return connection.queryAsync(sql);

    },


    findScheduledReports:function(connection){
        var now = moment();
        var day = now.format('D');
        var dayofWeek = now.format('dddd');
        var endOfMonthSql = '';

        if(day == now.clone().endOf('month').format('D')){
            endOfMonthSql = " or (time_period = 'monthly' and send_day > '" +  day + "' )  ";
        }

        var sql = "Select * from scheduled_reports where time_period = 'daily' or " +
            " (time_period = 'weekly' and send_day = '" + dayofWeek + "')  or " +
            " (time_period = 'monthly' and send_day = '" +  day + "' )  " + endOfMonthSql;

        return connection.queryAsync(sql);

    },
    findScheduledReportById:function(connection, id){

        var sql = "Select * from scheduled_reports where  id = " + connection.escape(id);
        return connection.queryAsync(sql).then(function(reportRes){
            return reportRes[0] || null;
        });

    },
    findCannedById: function(connection, report_id){
    var sql = "SELECT * from saved_reports where type = 'canned' and id = " + connection.escape(report_id);
    return connection.queryAsync(sql).then((reports) => {
      return reports && reports.length? reports[0]: null;
    });
  },

    findCanned: function(connection){
      var sql = "SELECT * from saved_reports where type = 'canned'";

      return connection.queryAsync(sql);
    },

    findApplication(connection, company_id, template){
      var sql = "SELECT * from saved_reports where type = 'application' and company_id = " + connection.escape(company_id);
      
      if(template){
        sql +=  " and template = " + connection.escape(template);
      }

      return connection.queryAsync(sql);
    }, 

    findBilledProducts(connection, period, products){

        var product_array = products.map(p => { return p.id });

        var sql = "SELECT *, " +
            "(select address from addresses where id in (select address_id from units where id in (select unit_id from leases where id in (select lease_id from invoices where id = invoice_lines.invoice_id)))) as address,  " +
            "(select city from addresses where id in (select address_id from units where id in (select unit_id from leases where id in (select lease_id from invoices where id = invoice_lines.invoice_id)))) as city,  " +
            " (select state from addresses where id in (select address_id from units where id in (select unit_id from leases where id in (select lease_id from invoices where id = invoice_lines.invoice_id)))) as state,  " +
            " (select zip from addresses where id in (select address_id from units where id in (select unit_id from leases where id in (select lease_id from invoices where id = invoice_lines.invoice_id)))) as zip,  " +
            " (select number from units where id in (select unit_id from leases where id in (select lease_id from invoices where id = invoice_lines.invoice_id))) as number, " +
            " (select name from products where id = invoice_lines.product_id) as product_name, " +
            " (select SUM(amount) from invoices_payments where invoice_id = invoice_lines.invoice_id ) as payment_amount " +
            " from invoice_lines where product_id in (" + product_array.join(', ') + ") and date <= " + connection.escape(period.end) + " and date >= " + connection.escape(period.start);



        return connection.queryAsync(sql);
    },

    // calculateOverdue(invoice){
    //   var due = moment(invoice.due).startOf('day');
    //   return moment().diff(due, 'days');
    // },

    findPastDueAging(connection, company_id, property_id, date) {
      date =  moment(date).format('YYYY-MM-DD')
      sql = `select u.number as unit_number, concat(c.first,' ',c.last) as name, ${Sql.lease_paid_through_date('l.id', date)} as paid_through_date, l.end_date as move_out_date,
            ( select price from services s where product_id in (select id from products where default_type = 'rent') and lease_id = l.id and start_date <= ${connection.escape(date)} Having MAX(start_date)) as rent,
            (${Report.lease_balance_overdue('l.id', date, {lower: 0, upper: 10})}) as balance_10,
            (${Report.lease_balance_overdue('l.id', date, {lower: 11, upper: 30})}) as balance_30,
            (${Report.lease_balance_overdue('l.id', date, {lower: 31, upper: 60})}) as balance_60,
            (${Report.lease_balance_overdue('l.id', date, {lower: 61, upper: 90})}) as balance_90,
            (${Report.lease_balance_overdue('l.id', date, {lower: 91, upper: 120})}) as balance_120,
            (${Report.lease_balance_overdue('l.id', date, {lower: 121, upper: 180})}) as balance_180,
            (${Report.lease_balance_overdue('l.id', date, {lower: 181, upper: 360})}) as balance_360,
            (${Report.lease_balance_overdue('l.id', date, {lower: 361})}) as balance_360plus,
            (${Report.lease_balance_overdue('l.id', date, {lower: 0})}) as balance_total
            from  leases as l
            inner join units u on l.unit_id = u.id
            inner join properties p on u.property_id = p.id
            inner join contact_leases cl on cl.lease_id = l.id
            inner join contacts c on c.id = cl.contact_id
            where p.company_id = ${connection.escape(company_id)}
            and   u.property_id = ${connection.escape(property_id)}
            and   l.status = 1
            and   cl.primary = 1
            having balance_total > 0`;
      console.log('Past Due Aging query:', sql);

      return connection.queryAsync(sql);
    },

    findSpaceActivities(connection, company_id, property_id, start_date, end_date) {

      start_date =  moment(start_date).format('YYYY-MM-DD');
      end_date =  moment(end_date).format('YYYY-MM-DD');

      let sql = `select * from (
                  (select l.modified as lease_modified, l.id as lease_id, t.id as transfer_id,
                    l.start_date as activity_date,
                    IF(t.id is not null, "Transfer-In", "Move-In") as activity,
                    u.number as space_number,
                    concat(c.first,' ',c.last) as tenant_name,
                    l.start_date as move_in_date,
                    l.end_date as move_out_date,
                    IFNULL((SELECT price from unit_price_changes where DATE(created) <= l.start_date and unit_id = u.id order by id desc limit 1), (SELECT upc.set_rate FROM unit_price_changes upc WHERE upc.unit_id = u.id ORDER BY upc.id DESC LIMIT 1)) as space_price,
                    (SELECT IFNULL(SUM(price),0) FROM services where product_id in (select id from products where default_type = 'rent') and lease_id = l.id and start_date <= IFNULL(l.end_date, DATE(CONVERT_TZ(NOW() , "+00:00", p.utc_offset))) and (end_date is null or end_date >= IFNULL(l.end_date, DATE(CONVERT_TZ(NOW() , "+00:00", p.utc_offset)))) and status = 1) as tenant_rent,
                    (SELECT group_concat(name SEPARATOR ', ') from promotions where label = 'promotion' and id in ( select promotion_id from discounts where lease_id = l.id)) as promotion_names,
                    (SELECT group_concat(name SEPARATOR ', ') from promotions where label = 'discount' and id in ( select promotion_id from discounts where lease_id = l.id)) as discount_names,
                    (select MAX(start_date) from services where status = 1 and product_id in (select id from products where default_type = 'rent') and start_date <= IFNULL(l.end_date, DATE(CONVERT_TZ(NOW() , "+00:00", p.utc_offset))) and lease_id = l.id) as last_rent_change,
                    (DATEDIFF(IFNULL(l.end_date, DATE(CONVERT_TZ(NOW() , "+00:00", p.utc_offset))), l.start_date) + 1) as days_rented
                  from leases as l
                  inner join units u on u.id = l.unit_id
                  inner join properties p on p.id = u.property_id
                  inner join contact_leases cl on cl.lease_id = l.id
                  inner join contacts c on c.id = cl.contact_id
                    left join transfers t on t.to_lease_id = l.id
                  where
                    l.start_date >= ${connection.escape(start_date)}
                    and l.start_date <= ${connection.escape(end_date)}
                    and p.id in (${connection.escape(property_id)})
                    and p.company_id = ${connection.escape(company_id)}
                    and cl.primary = 1
                  )
                  union all
                  (select l.modified as lease_modified, l.id as lease_id, t.id as transfer_id,
                    l.end_date as activity_date,
                    IF(t.id is not null, "Transfer-Out", "Move-Out") as activity,
                    u.number as space_number,
                    concat(c.first,' ',c.last) as tenant_name,
                    l.start_date as move_in_date,
                    l.end_date as move_out_date,
                    IFNULL((SELECT price from unit_price_changes where DATE(created) <= l.start_date and unit_id = u.id order by id desc limit 1), (SELECT upc.set_rate FROM unit_price_changes upc WHERE upc.unit_id = u.id ORDER BY upc.id DESC LIMIT 1)) as space_price,
                    (SELECT IFNULL(SUM(price),0) FROM services where product_id in (select id from products where default_type = 'rent') and lease_id = l.id and start_date <= IFNULL(l.end_date, DATE(CONVERT_TZ(NOW() , "+00:00", p.utc_offset))) and (end_date is null or end_date >= IFNULL(l.end_date, DATE(CONVERT_TZ(NOW() , "+00:00", p.utc_offset)))) and status = 1) as tenant_rent,
                    (SELECT group_concat(name SEPARATOR ', ') from promotions where label = 'promotion' and id in ( select promotion_id from discounts where lease_id = l.id)) as promotion_names,
                    (SELECT group_concat(name SEPARATOR ', ') from promotions where label = 'discount' and id in ( select promotion_id from discounts where lease_id = l.id)) as discount_names,
                    (select MAX(start_date) from services where status = 1 and product_id in (select id from products where default_type = 'rent') and start_date <= IFNULL(l.end_date, DATE(CONVERT_TZ(NOW() , "+00:00", p.utc_offset))) and lease_id = l.id) as last_rent_change,
                    (DATEDIFF(IFNULL(l.end_date, DATE(CONVERT_TZ(NOW() , "+00:00", p.utc_offset))), l.start_date) + 1) as days_rented
                  from leases as l
                  inner join units u on u.id = l.unit_id
                  inner join properties p on p.id = u.property_id
                  inner join contact_leases cl on cl.lease_id = l.id
                  inner join contacts c on c.id = cl.contact_id
                    left join transfers t on t.from_lease_id = l.id
                  where
                    l.end_date >= ${connection.escape(start_date)}
                    and l.end_date <= ${connection.escape(end_date)}
                    and p.id in (${connection.escape(property_id)})
                    and p.company_id = ${connection.escape(company_id)}
                    and cl.primary = 1
                  )
                ) as activity
                order by activity.activity_date desc, activity.lease_modified desc, activity.activity <> 'Transfer-Out', activity.activity <> 'Move-Out'`;

      console.log('Space Activities Report query:', sql);
      return connection.queryAsync(sql);
    },

    // Excluded transfer insurances
    findSalesCommission(connection, payload = {}) {
      let sql = `
          with cte_sales_commission as ( ${this.getSalesCommissionData(connection, payload)} )

          select sc.user_employee_id, employee, user_role, user_name, 'MRBNS' as product_code, property_number,
          ROUND(sum(merchandiseSaleCommission * sc.invoice_line_paid_amount), 2) as commission_amount
          from cte_sales_commission sc
          where product_default_type = 'product'
          group by sc.user_id, property_number
          union
          select sc.user_employee_id, employee, user_role, user_name, 'SPBNS' as product_code, property_number,
          (count(distinct sc.service_lease_id) * protectionPlanSaleCommission) as commission_amount
          from cte_sales_commission sc
          where product_default_type = 'insurance'
          group by sc.user_id, property_number;
      `;

      console.log('Sales commission ', sql);

      return connection.queryAsync(sql);
    },

    findSalesCommissionDetails(connection, payload = {}) {
      const sql = `
          with cte_sales_commission as ( ${this.getSalesCommissionData(connection, payload)} )

          select user_employee_id, user_name, user_role, invoice_date, invoice_number,
          unit_number, tenant_name, invoice_line_quantity, invoice_line_cost, sales_tax,
          line_total, invoice_total, product_name, product_description, property_number,
          invoice_line_paid_amount as amount_paid,
          CASE
            WHEN product_default_type = 'product' THEN ROUND(merchandiseSaleCommission * invoice_line_paid_amount, 2)
            ELSE protectionPlanSaleCommission
          END AS commission_amount
          from cte_sales_commission;
      `;

      console.log('Sales commission details', sql);

      return connection.queryAsync(sql);
    },

    getSalesCommissionData(connection, payload = {}) {
      const { company_id, property_ids, date, end_date } = payload;

      const sql = `
        select cu.employee_id as user_employee_id, 'E' as employee,
        CONCAT(cu.first, ' ', cu.last) as user_name,
        (Select r.name from roles r
          join companies_contact_roles ccr on r.id = ccr.role_id
          where ccr.contact_id = cu.id
          order by r.id
          limit 1) as user_role,
        inv.date as invoice_date,
        inv.number as invoice_number,
        un.number as unit_number,
        (Select CONCAT(con.first, ' ', con.last) from contacts con where con.id = inv.contact_id) as tenant_name,
        il.qty as invoice_line_quantity,
        il.cost as invoice_line_cost,
        il.total_tax as sales_tax,
        ((il.qty * il.cost) + il.total_tax - il.total_discounts) as line_total,
        (Select SUM((il2.qty * il2.cost) + il2.total_tax - il2.total_discounts) from invoice_lines il2 where inv.id = il2.invoice_id) as invoice_total,
        s.id as service_id,
        s.lease_id as service_lease_id,
        pr.default_type as product_default_type,
        pr.name as product_name,
        pr.description as product_description,
        prp.number as property_number,
        sum(ila.amount) as invoice_line_paid_amount,
        prp.id as property_id,
        u.id as user_id,
        (select s.value/100 from settings s where s.name = 'merchandiseSaleCommission' and s.company_id = ${connection.escape(company_id)}) as merchandiseSaleCommission,
        (select s.value from settings s where s.name = 'protectionPlanSaleCommission' and s.company_id = ${connection.escape(company_id)}) as protectionPlanSaleCommission
        from invoice_lines_allocation ila
          join invoice_lines il on ila.invoice_line_id = il.id
          left join services s on il.service_id = s.id
          join invoices inv on inv.id = il.invoice_id
          left join leases l on l.id = inv.lease_id
          left join units un on un.id = l.unit_id
          join products pr on pr.id = il.product_id and ((pr.default_type = 'product' and pr.commission = 1) or pr.default_type = 'insurance')
          join invoices_payments_breakdown ipb on ila.invoice_payment_breakdown_id = ipb.id
          join payments p on ipb.payment_id = p.id
          join contacts cu on cu.id = p.accepted_by
          join users u on cu.user_id = u.id
          join properties prp on prp.id = p.property_id
        where
          1=1
          and prp.company_id = ${connection.escape(company_id)}
          and prp.id in (${property_ids.map(p => connection.escape(p)).join(', ')})
          and p.method != 'credit'
          and ila.type = 'line'
          and (pr.default_type != 'insurance' or (
            (il.start_date = (select min(il1.start_date) from invoice_lines il1 where il1.service_id = il.service_id))
            and not exists (
              select t.id from transfers t
              join services s2 on s2.lease_id = t.from_lease_id
              join products p2 on s2.product_id = p2.id and p2.default_type = 'insurance'
              where t.to_lease_id = s.lease_id and s2.end_date is null
            )
          ))
          and ila.date between ${connection.escape(date)} and ${connection.escape(end_date)}
        group by
          ila.invoice_line_id
        having
          invoice_line_paid_amount > 0
      `;
      return sql;
    },

    findWriteOffs(connection, company_id, property_id, date, end_date) {
      date =  moment(date).format('YYYY-MM-DD');
      end_date =  moment(end_date).format('YYYY-MM-DD');

      let sql = `select concat(c.first,' ',c.last) as 'name', ipb.date as 'invoice_date', u.number as 'space_number', i.number as 'invoice_number', ipb.amount as 'amount'
      from invoices_payments_breakdown ipb 
      join payments py on py.id = ipb.payment_id
            join invoices i on i.id = ipb.invoice_id
            join contacts c on c.id = i.contact_id
            join leases l on l.id = i.lease_id
            join units u on u.id = l.unit_id
            where py.status = 1
            and ipb.date >=  ${connection.escape(date)} 
            and ipb.date <=  ${connection.escape(end_date)}
            and py.method in ('loss') 
            and py.property_id in (${connection.escape(property_id)})
            order by ipb.date;`;
      console.log('new findWriteOffs query:', sql);

      return connection.queryAsync(sql);
    },

    findAppliedCredits(connection, company_id, property_id, date, end_date) {
      date =  moment(date).format('YYYY-MM-DD');
      end_date =  moment(end_date).format('YYYY-MM-DD');

      let sql = `select concat(c.first,' ',c.last) as 'name', ipb.date as 'invoice_date', u.number as 'space_number', i.number as 'invoice_number', ipb.amount as 'amount',py.notes
      from invoices_payments_breakdown ipb 
      join payments py on py.id = ipb.payment_id
            join invoices i on i.id = ipb.invoice_id
            join contacts c on c.id = i.contact_id
            join leases l on l.id = i.lease_id
            join units u on u.id = l.unit_id
            where py.status = 1
            and ipb.date >=  ${connection.escape(date)} 
            and ipb.date <=  ${connection.escape(end_date)}
            and py.method in ('credit') 
            and py.property_id in (${connection.escape(property_id)})
            and (py.sub_method not in ('auction' , 'deposit') or py.sub_method is null)
            order by ipb.date;`;
      console.log('new findAppliedCredits query:', sql);

      return connection.queryAsync(sql);
    },

    findPrepaidRent(connection, company_id, property_id, date) {
      date =  moment(date).format('YYYY-MM-DD');
      //end_date =  moment(end_date).format('YYYY-MM-DD');

      sql = `select concat(c.first,' ',c.last) as "name", u.number as "unit_number", Date(ipb.date) as "payment_date", i.date as "invoice_date", i.number as "invoice_number", ifnull(sum(ila.amount), 0) as "amount"
      , Date(i.period_end) as "paid_date", p.name as "product_name", p.type as "product_type"
      from invoices i
      join leases l on l.id = i.lease_id
      join units u on u.id = l.unit_id
      join properties pr on u.property_id = pr.id
      join invoice_lines il on il.invoice_id = i.id
      join invoice_lines_allocation ila on ila.invoice_line_id = il.id
      join invoices_payments_breakdown ipb on ipb.id = ila.invoice_payment_breakdown_id
      join payments pm on pm.id = ipb.payment_id
      join products p on p.id = il.product_id
      join contacts c on c.id = i.contact_id
      where u.property_id in (${connection.escape(property_id)})
      and p.default_type in ('rent')
      and ila.date<= ${connection.escape(date)} 
      and (l.end_date is null or l.end_date > ${connection.escape(date)} )
      and ila.type <> 'tax'
      and ((pm.credit_type not in ('credit', 'loss') and p.default_type not in ('rent', 'insurance', 'late', 'product')) or (p.default_type in ('rent', 'insurance', 'late', 'product')))
      and (i.voided_at is null or date(i.voided_at ) > ${connection.escape(date)} )
      and ((i.due > ${connection.escape(date)} and p.default_type in ('rent', 'insurance', 'late', 'product')) or ((DATE(CONVERT_TZ(i.created_at , "+00:00", pr.utc_offset))) <= ${connection.escape(date)}  and p.default_type not in ('rent', 'insurance', 'late', 'product')))
      group by u.property_id, i.lease_id
      having sum(ifnull(ila.amount, 0)) > 0;`
      console.log('new findPrepaidRent query:', sql);

      return connection.queryAsync(sql);
    },

    findPrepaidFee(connection, company_id, property_id, date) {
      date =  moment(date).format('YYYY-MM-DD');
      //end_date =  moment(end_date).format('YYYY-MM-DD');

      sql = `select concat(c.first,' ',c.last) as "name", u.number as "unit_number", Date(ipb.date) as "payment_date", i.date as "invoice_date", i.number as "invoice_number", ifnull(sum(ila.amount), 0) as "amount"
      , Date(i.period_end) as "paid_date", p.name as "product_name", p.type as "product_type"
      from invoices i
      join leases l on l.id = i.lease_id
      join units u on u.id = l.unit_id
      join properties pr on u.property_id = pr.id
      join invoice_lines il on il.invoice_id = i.id
      join invoice_lines_allocation ila on ila.invoice_line_id = il.id
      join invoices_payments_breakdown ipb on ipb.id = ila.invoice_payment_breakdown_id
      join payments pm on pm.id = ipb.payment_id
      join products p on p.id = il.product_id
      join contacts c on c.id = i.contact_id
      where u.property_id in (${connection.escape(property_id)})
      and p.default_type in ('late')
      and ila.date<= ${connection.escape(date)} 
      and (l.end_date is null or l.end_date > ${connection.escape(date)} )
      and ila.type <> 'tax'
      and ((pm.credit_type not in ('credit', 'loss') and p.default_type not in ('rent', 'insurance', 'late', 'product')) or (p.default_type in ('rent', 'insurance', 'late', 'product')))
      and (i.voided_at is null or date(i.voided_at ) > ${connection.escape(date)} )
      and ((i.due > ${connection.escape(date)} and p.default_type in ('rent', 'insurance', 'late', 'product')) or ((DATE(CONVERT_TZ(i.created_at , "+00:00", pr.utc_offset))) <= ${connection.escape(date)}  and p.default_type not in ('rent', 'insurance', 'late', 'product')))
      group by u.property_id, i.lease_id
      having sum(ifnull(ila.amount, 0)) > 0
      ;`;
      console.log('new findPrepaidFee query:', sql);

      return connection.queryAsync(sql);
    },

    findPrepaidMerchandise(connection, company_id, property_id, date) {
      date =  moment(date).format('YYYY-MM-DD');
      //end_date =  moment(end_date).format('YYYY-MM-DD');

      sql = `select concat(c.first,' ',c.last) as "name", u.number as "unit_number", Date(ipb.date) as "payment_date", i.date as "invoice_date", i.number as "invoice_number", ifnull(sum(ila.amount), 0) as "amount"
      , Date(i.period_end) as "paid_date", p.name as "product_name", p.type as "product_type"
      from invoices i
      join leases l on l.id = i.lease_id
      join units u on u.id = l.unit_id
      join properties pr on u.property_id = pr.id
      join invoice_lines il on il.invoice_id = i.id
      join invoice_lines_allocation ila on ila.invoice_line_id = il.id
      join invoices_payments_breakdown ipb on ipb.id = ila.invoice_payment_breakdown_id
      join payments pm on pm.id = ipb.payment_id
      join products p on p.id = il.product_id
      join contacts c on c.id = i.contact_id
      where u.property_id in (${connection.escape(property_id)})
      and p.default_type in ('product')
      and ila.date<= ${connection.escape(date)} 
      and (l.end_date is null or l.end_date > ${connection.escape(date)} )
      and ila.type <> 'tax'
      and ((pm.credit_type not in ('credit', 'loss') and p.default_type not in ('rent', 'insurance', 'late', 'product')) or (p.default_type in ('rent', 'insurance', 'late', 'product')))
      and (i.voided_at is null or date(i.voided_at ) > ${connection.escape(date)} )
      and ((i.due > ${connection.escape(date)} and p.default_type in ('rent', 'insurance', 'late', 'product')) or ((DATE(CONVERT_TZ(i.created_at , "+00:00", pr.utc_offset))) <= ${connection.escape(date)}  and p.default_type not in ('rent', 'insurance', 'late', 'product')))
      group by u.property_id, i.lease_id
      having sum(ifnull(ila.amount, 0)) > 0
      ;`;
      console.log('new findPrepaidMerchandise query:', sql);

      return connection.queryAsync(sql);
    },

    findPrepaidInsuranceProtection(connection, company_id, property_id, date) {
      date =  moment(date).format('YYYY-MM-DD');
      //end_date =  moment(end_date).format('YYYY-MM-DD');

      sql = `select concat(c.first,' ',c.last) as "name", u.number as "unit_number", Date(ipb.date) as "payment_date", i.date as "invoice_date", i.number as "invoice_number", ifnull(sum(ila.amount), 0) as "amount"
      , Date(i.period_end) as "paid_date", p.name as "product_name", p.type as "product_type"
      from invoices i
      join leases l on l.id = i.lease_id
      join units u on u.id = l.unit_id
      join properties pr on u.property_id = pr.id
      join invoice_lines il on il.invoice_id = i.id
      join invoice_lines_allocation ila on ila.invoice_line_id = il.id
      join invoices_payments_breakdown ipb on ipb.id = ila.invoice_payment_breakdown_id
      join payments pm on pm.id = ipb.payment_id
      join products p on p.id = il.product_id
      join contacts c on c.id = i.contact_id
      where u.property_id in (${connection.escape(property_id)})
      and p.default_type in ('insurance')
      and ila.date<= ${connection.escape(date)} 
      and (l.end_date is null or l.end_date > ${connection.escape(date)} )
      and ila.type <> 'tax'
      and ((pm.credit_type not in ('credit', 'loss') and p.default_type not in ('rent', 'insurance', 'late', 'product')) or (p.default_type in ('rent', 'insurance', 'late', 'product')))
      and (i.voided_at is null or date(i.voided_at ) > ${connection.escape(date)} )
      and ((i.due > ${connection.escape(date)} and p.default_type in ('rent', 'insurance', 'late', 'product')) or ((DATE(CONVERT_TZ(i.created_at , "+00:00", pr.utc_offset))) <= ${connection.escape(date)}  and p.default_type not in ('rent', 'insurance', 'late', 'product')))
      group by u.property_id, i.lease_id
      having sum(ifnull(ila.amount, 0)) > 0
      ;`;
      console.log('new findPrepaidInsuranceProtection query:', sql);

      return connection.queryAsync(sql);
    },

    findMiscDeposit(connection, company_id, property_id, date) {
      date =  moment(date).format('YYYY-MM-DD');
      //end_date =  moment(end_date).format('YYYY-MM-DD');

      sql = `select concat(c.first,' ',c.last) as "name", u.number as "unit_number", Date(ipb.date) as "payment_date", i.date as "invoice_date", i.number as "invoice_number", ifnull(sum(ila.amount), 0) as "amount"
      , Date(i.period_end) as "paid_date", p.name as "product_name", p.type as "product_type"
      from invoices i
      join leases l on l.id = i.lease_id
      join units u on u.id = l.unit_id
      join properties pr on u.property_id = pr.id
      join invoice_lines il on il.invoice_id = i.id
      join invoice_lines_allocation ila on ila.invoice_line_id = il.id
      join invoices_payments_breakdown ipb on ipb.id = ila.invoice_payment_breakdown_id
      join payments pm on pm.id = ipb.payment_id
      join products p on p.id = il.product_id
      join contacts c on c.id = i.contact_id
      where u.property_id in (${connection.escape(property_id)})
      and p.default_type not in ('late', 'product', 'insurance', 'rent')
      and ila.date<= ${connection.escape(date)} 
      and (l.end_date is null or l.end_date > ${connection.escape(date)} )
      and ila.type <> 'tax'
      and ((pm.credit_type not in ('credit', 'loss') and p.default_type not in ('rent', 'insurance', 'late', 'product')) or (p.default_type in ('rent', 'insurance', 'late', 'product')))
      and (i.voided_at is null or date(i.voided_at ) > ${connection.escape(date)} )
      and ((i.due > ${connection.escape(date)} and p.default_type in ('rent', 'insurance', 'late', 'product')) or ((DATE(CONVERT_TZ(i.created_at , "+00:00", pr.utc_offset))) <= ${connection.escape(date)}  and p.default_type not in ('rent', 'insurance', 'late', 'product')))
      group by u.property_id, i.lease_id
      having sum(ifnull(ila.amount, 0)) > 0
      ;`;
      console.log('new findMiscDeposit query:', sql);

      return connection.queryAsync(sql);
    },

    findProducts(connection, company_id, property_id, date, end_date) {
      date =  moment(date).format('YYYY-MM-DD');
      end_date =  moment(end_date).format('YYYY-MM-DD');

      let sql = `select ga.code as "gl_code", p.name as "product_name"
      from products p 
      join invoice_lines il on il.product_id = p.id
      join invoices i on i.id = il.invoice_id
      left join gl_accounts ga on ga.id = p.income_account_id
      where i.property_id in (${connection.escape(property_id)}) and i.status = 1
      and il.date between ${connection.escape(date)} and ${connection.escape(end_date)}
      ;`;
      console.log('new findProducts query:', sql);

      return connection.queryAsync(sql);
    },

    findDiscounts(connection, company_id, property_id, date, end_date) {
      date =  moment(date).format('YYYY-MM-DD');
      end_date =  moment(end_date).format('YYYY-MM-DD');

      let sql = `select sum(il.total_discounts) as "total_discount"
      from invoices i 
      join invoice_lines il on il.invoice_id = i.id
      where i.property_id in (${connection.escape(property_id)})
      and i.status = 1
      and i.period_start between ${connection.escape(date)} and ${connection.escape(end_date)}
      group by il.invoice_id
      ;`;
      console.log('new findDiscounts query:', sql);

      return connection.queryAsync(sql);
    },

    findCharges(connection, company_id, property_id, date, end_date) {
      date =  moment(date).format('YYYY-MM-DD');
      end_date =  moment(end_date).format('YYYY-MM-DD');

      let sql = `select sum(il.qty * il.cost) as "charge", sum(il.total_tax) as "charge_tax", sum(il.qty * il.cost) + sum(il.total_tax) as "charge_total"
      from invoices i 
      join invoice_lines il on il.invoice_id = i.id
      where i.property_id in (${connection.escape(property_id)})
      and i.status = 1
      and i.period_start between ${connection.escape(date)} and ${connection.escape(end_date)}
      group by il.invoice_id
      ;`;
      console.log('new findCharges query:', sql);

      return connection.queryAsync(sql);
    },

    findPaymentsReceipts(connection, company_id, property_id, date, end_date) {
      date =  moment(date).format('YYYY-MM-DD');
      end_date =  moment(end_date).format('YYYY-MM-DD');

      let sql = `select sum((il.qty * il.cost) - il.total_discounts) as "payment", sum(il.total_tax) as "payment_tax", sum((il.qty * il.cost) - il.total_discounts) + sum(il.total_tax) as "payment_total"
      from invoices_payments_breakdown ipb
      join payments py on py.id = ipb.payment_id
      join invoices i on i.id = ipb.invoice_id
      join invoice_lines il on il.invoice_id = ipb.invoice_id
      join invoice_lines_allocation ila on ila.invoice_payment_breakdown_id = ipb.id
                      and ila.invoice_id = il.invoice_id
                      and ila.invoice_line_id = il.id
      where py.property_id in (${connection.escape(property_id)}) and py.status = 1
      and i.status = 1
      and py.method not in ('credit', 'loss')
      and date(py.date) between ${connection.escape(date)} and ${connection.escape(end_date)}
      group by i.id
      ;`;
      console.log('new findPaymentsReceipts query:', sql);

      return connection.queryAsync(sql);
    },

    findCreditsIssued(connection, company_id, property_id, date, end_date) {
      date =  moment(date).format('YYYY-MM-DD');
      end_date =  moment(end_date).format('YYYY-MM-DD');

      let sql = `select sum((il.qty * il.cost) - il.total_discounts) as "credit", sum(il.total_tax) as "credit_tax", sum((il.qty * il.cost) - il.total_discounts) + sum(il.total_tax) as "credit_total"
      from invoices_payments_breakdown ipb
      join payments py on py.id = ipb.payment_id
      join invoices i on i.id = ipb.invoice_id
      join invoice_lines il on il.invoice_id = ipb.invoice_id
      join invoice_lines_allocation ila on ila.invoice_payment_breakdown_id = ipb.id
                      and ila.invoice_id = il.invoice_id
                      and ila.invoice_line_id = il.id
      where py.property_id in (${connection.escape(property_id)}) and py.status = 1
      and i.status = 1
      and py.method in ('credit')
      and date(py.date) between ${connection.escape(date)} and ${connection.escape(end_date)}
      group by i.id
      ;`;
      console.log('new findCreditsIssued query:', sql);

      return connection.queryAsync(sql);
    },
    getFSRData(connection,properties,start_date,end_date){
      
      let sql = `

      with default_gl_codes as (
        select gds.key,ga.code as default_gl_code 
        from property_accounting_template pat 
        join gl_template_default_accounts gtd on pat.accounting_template_id = gtd.accounting_template_id
        join gl_default_subtypes gds on gds.id = gtd.gl_default_subtype_id
        join gl_accounts ga on ga.id = gtd.gl_account_id
        where pat.deleted_by is NULL and pat.property_id IN ( ${properties.map(p => connection.escape(p)).join(', ')} )
      ),
      cte_charges as (
        ${msrModels.ProjectedIncome.getCharges(connection,properties,start_date,end_date)}
      ),
      cte_payments as (
        ${msrModels.DepositsRefunds.getPayments(connection,properties,start_date,end_date)}
      ),
      cte_credits as (
        ${msrModels.Credits.getProductCredits(connection,properties,start_date,end_date)}
      ),
      result as (
        select
          products.product_id,
          coalesce(c.product_name, p.product_name, cr.product_name) as product_name,
          coalesce(c.product_type, p.product_type, cr.product_type) as product_type,
          coalesce(c.income_account_id, p.income_account_id, cr.income_account_id) as income_account_id,
          coalesce(c.product_slug, p.product_slug, cr.product_slug) as product_slug,
          coalesce(c.discount, 0) as discount,
          coalesce(c.charge, 0) as charge,
          coalesce(c.tax_charge, 0) as tax_charge,
          coalesce(c.total_charge, 0) as total_charge,
          coalesce(p.payment, 0) as payment,
          coalesce(p.payment_tax, 0) as payment_tax,
          coalesce(p.total_payment, 0) as total_payment,
          coalesce(cr.credit, 0) as credit,
          coalesce(cr.credit_tax, 0) as credit_tax,
          coalesce(cr.total_credit, 0) as total_credit
          from
              (
                  select product_id from cte_charges
                  union
                  select product_id from cte_payments
                  union
                  select product_id from cte_credits
              ) as products
          left join cte_charges c on products.product_id = c.product_id
          left join cte_payments p on products.product_id = p.product_id
          left join cte_credits cr on products.product_id = cr.product_id
      )

      select ifnull(dgc.default_gl_code,ga.code) as gl_code,product_name,discount,charge,tax_charge,total_charge,payment,payment_tax,total_payment,credit,credit_tax,total_credit 
      from result res 
      left join default_gl_codes dgc on dgc.key = res.product_slug 
      left join gl_accounts ga on ga.id = res.income_account_id
      order by case product_type
          when 'Storage Rent' then 1
          when 'Parking Rent' then 2
          when 'Residential Rent' then 3
          when 'Commercial Rent' then 4
          when 'Coverage' then 5
          when 'Fees' then 6
          when 'Merchandise' then 7
          else 8
          end
          
      ;`;
      console.log('getFSRData query:', sql);

      return connection.queryAsync(sql);
    },
    findStorageRent(connection, company_id, property_id, date, end_date) {
      date =  moment(date).format('YYYY-MM-DD');
      end_date =  moment(end_date).format('YYYY-MM-DD');

      let sql = `select gl_code, concat("Storage ", product_name) as "product_name", discount, sum(charge) as "charge", sum(tax_charge) as "tax_charge", sum(total_charge) as "total_charge", sum(payment) as "payment", sum(payment_tax) as "payment_tax", 
      sum(total_payment) as "total_payment", sum(credit) as "credit", sum(credit_tax) as "credit_tax", sum(total_credit) as "total_credit"
      from (select ifnull(ga.code, '') as "gl_code", p.name as "product_name", sum(il.total_discounts) as "discount", 
      sum(il.qty * il.cost) as "charge", sum(il.total_tax) as "tax_charge", sum(il.qty * il.cost) + sum(il.total_tax) - sum(il.total_discounts) as "total_charge",
      IF(ila.type = "line" and py.method not in ('credit', 'loss'), sum(ila.amount) , 0) as "payment",
      IF(ila.type = "tax" and py.method not in ('credit', 'loss'), sum(ila.amount) , 0) as "payment_tax",
      IF(py.method not in ('credit', 'loss'), sum(ila.amount) , 0) as "total_payment",
      IF(ila.type = "line" and py.method in ('credit'), sum(ila.amount) , 0) as "credit",
      IF(ila.type = "tax" and py.method in ('credit'), sum(ila.amount) , 0) as "credit_tax",
      IF(py.method in ('credit'), sum(ila.amount) , 0) as "total_credit"
      from invoices i
      join invoice_lines il on il.invoice_id = i.id
      join invoices_payments_breakdown ipb on ipb.invoice_id = i.id
      join invoice_lines_allocation ila on ila.invoice_payment_breakdown_id = ipb.id and ila.invoice_id = i.id and ila.invoice_line_id = il.id
      join payments py on py.id = ipb.payment_id
      join products p on p.id = il.product_id
      join leases l on l.id = i.lease_id
      join units u on u.id = l.unit_id
      left join gl_accounts ga on ga.id = p.income_account_id and ga.account_subtype_id in (13)
      where i.property_id in (${connection.escape(property_id)}) 
      and i.status = 1 
      and i.period_start between ${connection.escape(date)} and ${connection.escape(end_date)}
      and u.type in ('storage')
      and p.name in ('Rent')
      group by il.product_id, py.method) as summary
      group by product_name
      ;`;
      console.log('new findStorageRent query:', sql);

      return connection.queryAsync(sql);
    },

    findParkingeRent(connection, company_id, property_id, date, end_date) {
      date =  moment(date).format('YYYY-MM-DD');
      end_date =  moment(end_date).format('YYYY-MM-DD');

      let sql = `select gl_code, concat("Parking ", product_name) as "product_name", discount, sum(charge) as "charge", sum(tax_charge) as "tax_charge", sum(total_charge) as "total_charge", sum(payment) as "payment", sum(payment_tax) as "payment_tax", 
      sum(total_payment) as "total_payment", sum(credit) as "credit", sum(credit_tax) as "credit_tax", sum(total_credit) as "total_credit"
      from (select ifnull(ga.code, '') as "gl_code", p.name as "product_name", sum(il.total_discounts) as "discount", 
      sum(il.qty * il.cost) as "charge", sum(il.total_tax) as "tax_charge", sum(il.qty * il.cost) + sum(il.total_tax) - sum(il.total_discounts) as "total_charge",
      IF(ila.type = "line" and py.method not in ('credit', 'loss'), sum(ila.amount) , 0) as "payment",
      IF(ila.type = "tax" and py.method not in ('credit', 'loss'), sum(ila.amount) , 0) as "payment_tax",
      IF(py.method not in ('credit', 'loss'), sum(ila.amount) , 0) as "total_payment",
      IF(ila.type = "line" and py.method in ('credit'), sum(ila.amount) , 0) as "credit",
      IF(ila.type = "tax" and py.method in ('credit'), sum(ila.amount) , 0) as "credit_tax",
      IF(py.method in ('credit'), sum(ila.amount) , 0) as "total_credit"
      from invoices i
      join invoice_lines il on il.invoice_id = i.id
      join invoices_payments_breakdown ipb on ipb.invoice_id = i.id
      join invoice_lines_allocation ila on ila.invoice_payment_breakdown_id = ipb.id and ila.invoice_id = i.id and ila.invoice_line_id = il.id
      join payments py on py.id = ipb.payment_id
      join products p on p.id = il.product_id
      join leases l on l.id = i.lease_id
      join units u on u.id = l.unit_id
      left join gl_accounts ga on ga.id = p.income_account_id and ga.account_subtype_id in (13)
      where i.property_id in (${connection.escape(property_id)}) 
      and i.status = 1 
      and i.period_start between ${connection.escape(date)} and ${connection.escape(end_date)}
      and u.type in ('parking')
      and p.name in ('Rent')
      group by il.product_id, py.method) as summary
      group by product_name
      ;`;
      console.log('new findParkingeRent query:', sql);

      return connection.queryAsync(sql);
    },

    findOtherProduct(connection, company_id, property_id, date, end_date) {
      date =  moment(date).format('YYYY-MM-DD');
      end_date =  moment(end_date).format('YYYY-MM-DD');

      let sql = `select gl_code, product_name, discount, sum(charge) as "charge", sum(tax_charge) as "tax_charge", sum(total_charge) as "total_charge", sum(payment) as "payment", sum(payment_tax) as "payment_tax", 
      sum(total_payment) as "total_payment", sum(credit) as "credit", sum(credit_tax) as "credit_tax", sum(total_credit) as "total_credit"
      from (select ifnull(ga.code, '') as "gl_code", p.name as "product_name", sum(il.total_discounts) as "discount", 
      sum(il.qty * il.cost) as "charge", sum(il.total_tax) as "tax_charge", sum(il.qty * il.cost) + sum(il.total_tax) - sum(il.total_discounts) as "total_charge",
      IF(ila.type = "line" and py.method not in ('credit', 'loss'), sum(ila.amount) , 0) as "payment",
      IF(ila.type = "tax" and py.method not in ('credit', 'loss'), sum(ila.amount) , 0) as "payment_tax",
      IF(py.method not in ('credit', 'loss'), sum(ila.amount) , 0) as "total_payment",
      IF(ila.type = "line" and py.method in ('credit'), sum(ila.amount) , 0) as "credit",
      IF(ila.type = "tax" and py.method in ('credit'), sum(ila.amount) , 0) as "credit_tax",
      IF(py.method in ('credit'), sum(ila.amount) , 0) as "total_credit"
      from invoices i
      join invoice_lines il on il.invoice_id = i.id
      join invoices_payments_breakdown ipb on ipb.invoice_id = i.id
      join invoice_lines_allocation ila on ila.invoice_payment_breakdown_id = ipb.id and ila.invoice_id = i.id and ila.invoice_line_id = il.id
      join payments py on py.id = ipb.payment_id
      join products p on p.id = il.product_id
      join leases l on l.id = i.lease_id
      join units u on u.id = l.unit_id
      left join gl_accounts ga on ga.id = p.income_account_id and ga.account_subtype_id in (13)
      where i.property_id in (${connection.escape(property_id)}) 
      and i.status = 1 
      and i.period_start between ${connection.escape(date)} and ${connection.escape(end_date)}
      and p.name not in ('Rent' , 'Auction Payment')
      group by il.product_id, py.method) as summary
      group by product_name
      ;`;
      console.log('new findOtherProduct query:', sql);

      return connection.queryAsync(sql);
    },


    // overwritten below
    // lease_balance_overdue(lease_id, date, limit = {}){
    //   let sql = ` select IFNULL(SUM( IFNULL(subtotal, 0) + IFNULL(total_tax,0) - IFNULL(total_discounts,0) - ( select IFNULL(SUM(amount),0) from invoices_payments where invoice_id = i.id)),0) 
    //                 from invoices i where i.status = 1 and i.lease_id = ${lease_id}`;
    //   if(limit.upper){
    //     sql += ` and i.date >= DATE_SUB('${date}', INTERVAL ${limit.upper} DAY)`
    //   }

    //   sql += ` and ${limit.lower ? `i.date <= DATE_SUB('${date}', INTERVAL ${limit.lower} DAY)` : `i.date < '${date}'`}`;

    //   return connection.queryAsync(sql);
    // },

    findAutoPayTenants(connection, company_id, property_id, date){
      let sql;
      date =  moment(date).format('YYYY-MM-DD 00:00:00')
      sql = `select u.number as unit_number, lpm.rent,lpm.other, pm.card_type, pm.card_end, concat(pm.first,' ',pm.last) as name,pm.exp_warning as expiration_date,l.bill_day
            from  leases_payment_methods as lpm
            inner join payment_methods pm on lpm.payment_method_id = pm.id
            inner join contacts c on pm.contact_id = c.id
            inner join leases l on lpm.lease_id = l.id
            inner join units u on l.unit_id = u.id
            join properties pr on u.property_id = pr.id
            where c.company_id = ${connection.escape(company_id)}
            and   u.property_id = ${connection.escape(property_id)}
            and   DATE(lpm.created_at) <= ${connection.escape(date)}
            and   (lpm.deleted is null or DATE(lpm.deleted) > ${connection.escape(date)})
            and   l.start_date <= ${connection.escape(date)} 
            and   (l.end_date is null or l.end_date > ${connection.escape(date)})`

      return connection.queryAsync(sql);
    },

    findGateAccessTenants(connection, company_id, property_id, date){
      let sql;
      date =  moment(date).format('YYYY-MM-DD 00:00:00')
      sql = `select u.number as unit_number, c.id as contact_id, concat(c.first,' ',c.last) as name,
            ( select IFNULL(SUM( IFNULL(subtotal, 0) + IFNULL(total_tax,0) - IFNULL(total_discounts,0) - ( select IFNULL(SUM(amount),0) from invoices_payments where invoice_id = i.id and date <= ${connection.escape(date)})),0) from invoices i where i.status = 1 and i.lease_id = l.id and i.due < ${connection.escape(date)}) as balance,
            ( select DATEDIFF(${connection.escape(date)}, ( select MIN(DUE) from invoices where due <= ${connection.escape(date)} and status = 1 and lease_id = l.id and (subtotal + total_tax) > (total_discounts + ( select IFNULL(SUM(amount),0) from invoices_payments where invoice_id = invoices.id and date <= ${connection.escape(date)})) )) from leases where id = l.id) as days_late
            from  leases as l
            inner join units u on l.unit_id = u.id
            inner join properties p on u.property_id = p.id
            inner join contact_leases cl on cl.lease_id = l.id
            inner join contacts c on c.id = cl.contact_id
            where p.company_id = ${connection.escape(company_id)}
            and   u.property_id = ${connection.escape(property_id)}
            and   l.start_date <= ${connection.escape(date)}
            and   l.status = 1
            and   cl.primary = 1
            and   (l.end_date is null or l.end_date > ${connection.escape(date)})`;
      console.log('Gate Access query:', sql);

      return connection.queryAsync(sql);
    },

    findReportRequestById: function(connection, id){
      var sql = "SELECT * FROM report_requests where id  = " +  connection.escape(id)
      return connection.queryAsync(sql).then(r => r.length ? r[0]: null);
    },
    saveReportRequest: function(connection, data) {
      var sql = "insert into report_requests set ?";
      return connection.queryAsync(sql, data);
    },
    deleteReportRequest: function(connection, id){
      var sql = "DELETE FROM report_requests where id  = " +  connection.escape(id)
      return connection.queryAsync(sql);
    },
    lease_balance_overdue(lease_id, date, limit = {}){
      let sql = ` select IFNULL(SUM( IFNULL(subtotal, 0) + IFNULL(total_tax,0) - IFNULL(total_discounts,0) - ( select IFNULL(SUM(amount),0) from invoices_payments_breakdown where invoice_id = i.id and date <= '${date}' )),0) 
               from invoices i where 
                    (i.void_date is null or i.void_date > '${date}')
                    and i.lease_id = ${lease_id}`;
                    // (i.status = 1 or i.voided_at is not null) and (i.voided_at is null or DATE(i.voided_at) > ${date})  and 
      if(limit.upper){
        sql += ` and i.due >= DATE_SUB('${date}', INTERVAL ${limit.upper} DAY)`
      }

      sql += ` and ${limit.lower ? `i.due <= DATE_SUB('${date}', INTERVAL ${limit.lower} DAY)` : `i.due <${limit.lower === 0 ? '=':''} '${date}'`}`;

      return sql;
    },

   getAllCollections(connection, company_id , contact_id){

    let sql = `SELECT * FROM collections where
     (company_id is NULL and contact_id is NULL) or 
     (company_id = ${connection.escape(company_id)} and contact_id = ${connection.escape(contact_id)})
     `;

    console.log("getAllCollections SQL", sql);

    return connection.queryAsync(sql);

  },
   getMappedReports(connection, company_id , contact_id){ //get all relevant reports that are mapped to a collection

    let sql = `
      select * from (
        (
          SELECT r.id, r.contact_id, r.company_id, r.name, r.description, r.sort, r.filters, r.path, r.template, r.template_type, r.is_default, r.type, r.report_category, r.download_xls, r.end_date, r.collection_id, r.is_banker, r.is_investor, r.multiple_properties, r.download_pdf,
            (case (select 1 where srp.id is not null) when 1 then 1 else 0 end) as pinned,
            0 as is_custom,
                  co.name as original_collection_name,
                  co.id as original_collection_id 
          FROM saved_reports r
            left join (  select * from saved_reports_pinned where contact_id = ${connection.escape(contact_id)} and company_id = ${connection.escape(company_id)}) srp on srp.report_id = r.id 
            left join collections co on r.collection_id = co.id
          where
          (
            (r.company_id is NULL and r.contact_id is NULL) or
            (r.company_id = ${connection.escape(company_id)} and r.type = 'application') or
            (r.type = 'canned') or
            (r.company_id = ${connection.escape(company_id)} and r.contact_id = ${connection.escape(contact_id)})
          )
          and r.collection_id is not null
        )
        UNION ALL
        (
          SELECT r.id, r.contact_id, r.company_id, r.name, r.description, r.sort, r.filters, r.path, r.template, r.template_type, r.is_default, r.type, r.report_category, r.download_xls, r.end_date, sra.collection_id, r.is_banker, r.is_investor, r.multiple_properties, r.download_pdf,
            (case (select 1 where srp.id is not null) when 1 then 1 else 0 end) as pinned,
            (case (select 1 where r.id  in ( select id FROM saved_reports where contact_id  =  ${connection.escape(contact_id)} and company_id  = ${connection.escape(company_id)} and (type <> 'application' or type is null)) ) when 1 then 1 else 0 end) as is_custom,
            (
              CASE
              WHEN (r.collection_id is null and r.type = 'application') THEN "Application Reports"
              WHEN (r.collection_id is not null) THEN (select name from collections where id = r.collection_id)
              ELSE 'Custom Reports'
              END
            ) as original_collection_name , 
            (select id from collections where name = original_collection_name  ) as original_collection_id
          FROM saved_reports_addons sra
            left join saved_reports r  on r.id = sra.report_id
            left join (  select * from saved_reports_pinned where contact_id = ${connection.escape(contact_id)}  and company_id  = ${connection.escape(company_id)} )srp on srp.report_id = r.id 
            left join collections co on r.collection_id = co.id
          where
          (
            (r.company_id is NULL and r.contact_id is NULL) or
            (r.company_id = ${connection.escape(company_id)} and r.type = 'application') or
            (r.type = 'canned') or
            (r.company_id = ${connection.escape(company_id)} and r.contact_id = ${connection.escape(contact_id)})
          ) 
          and sra.active = 1
          and sra.company_id = ${connection.escape(company_id)}
        )
      )T
      order by name asc
    `;

    console.log("getMappedReports SQL", sql);

    return connection.queryAsync(sql);
  },

  async findPinnedReports(connection ,contact_id ,company_id){
    
    //segregation of reports bsaed on below categories
    let sql1 = `SELECT r.* , (case (select 1 where srp.id is not null) when 1 then 1 else 0 end) as pinned ,
    (case (select 1 where r.id  in ( select id FROM saved_reports where contact_id  =  ${connection.escape(contact_id)} and company_id  = ${connection.escape(company_id)} and (type <> 'application' or type is null)) ) when 1 then 1 else 0 end) as is_custom,
    (CASE
      WHEN (r.collection_id is null and r.type = 'application') THEN "Application Reports"
      WHEN (r.collection_id is not null) THEN (select name from collections where id = r.collection_id)
      ELSE 'Custom Reports'
      END) as original_collection_name , (select id from collections where name = original_collection_name  ) as original_collection_id
    FROM saved_reports r
    left join (  select * from saved_reports_pinned s where s.contact_id = ${connection.escape(contact_id)} and s.company_id  = ${connection.escape(company_id)}) srp on srp.report_id = r.id 
    left join collections co on r.collection_id = co.id
	  where srp.id is not null
    and (r.report_category <> 'static' or r.report_category is null)
    `;
    let non_static = await connection.queryAsync(sql1)

    let sql2 = `SELECT r.* , (case (select 1 where srp.id is not null) when 1 then 1 else 0 end) as pinned  ,'""' as property_id ,
    0 as is_custom
    , co.id as original_collection_id 
    , co.name as original_collection_name
    FROM saved_reports r
    left join (  select * from saved_reports_pinned s where s.contact_id = ${connection.escape(contact_id)} and s.company_id  = ${connection.escape(company_id)}) srp on srp.report_id = r.id 
    left join collections co on r.collection_id = co.id
	  where srp.id is not null
    and r.report_category = 'static'
    and r.name <> 'Occupancy Statistics Report'
    `;
    let static = await connection.queryAsync(sql2)

    let sql3 = `SELECT r.* , (case (select 1 where srp.id is not null) when 1 then 1 else 0 end) as pinned  ,'""' as property_id , '""' as unit_group_profile_id ,
    0 as is_custom
    , co.id as original_collection_id 
    , co.name as original_collection_name
    FROM saved_reports r
    left join (  select * from saved_reports_pinned s where s.contact_id = ${connection.escape(contact_id)} and s.company_id  = ${connection.escape(company_id)}) srp on srp.report_id = r.id 
    left join collections co on r.collection_id = co.id
	  where srp.id is not null
    and r.report_category = 'static'
    and r.name = 'Occupancy Statistics Report'
    `;

    let osr = await connection.queryAsync(sql3);
    if(osr.length)osr[0].space_groups = [];

    console.log("findPinnedReports SQL", sql1,sql2,sql3);

    return [...non_static ,...static ,...osr]; // concat all reports with their pinned info

  },

  findSavedWithPinnedInfo(connection, contact_id, company_id, template){
    var sql;
    sql = `SELECT r.* , (case (select 1 where srp.id is not null) when 1 then 1 else 0 end) as pinned ,
    (case (select 1 where r.id  in ( select id FROM saved_reports where contact_id  =  ${connection.escape(contact_id)} and company_id  = ${connection.escape(company_id)} and (type <> 'application' or type is null)) ) when 1 then 1 else 0 end) as is_custom,
    (CASE
      WHEN (r.collection_id is null and r.type = 'application') THEN "Application Reports"
      WHEN (r.collection_id is not null) THEN (select name from collections where id = r.collection_id)
      ELSE 'Custom Reports'
      END) as original_collection_name ,(select id from collections where name = original_collection_name  ) as original_collection_id
    FROM saved_reports r
    left join (  select * from saved_reports_pinned s where s.contact_id = ${connection.escape(contact_id)} and s.company_id  = ${connection.escape(company_id)} ) srp on srp.report_id = r.id 
    left join collections co on r.collection_id = co.id
    where r.contact_id  =  ${connection.escape(contact_id)} and r.company_id  =  ${connection.escape(company_id)}
    order by r.name asc`;

    if(template){

    sql +=  " and template = " + connection.escape(template);
    }
    return connection.queryAsync(sql);

  },

  findApplicationWithPinnedInfo(connection, contact_id, company_id, template){
    var sql = `SELECT r.* , (case (select 1 where srp.id is not null) when 1 then 1 else 0 end) as pinned ,
    0 as is_custom,
    'Application Reports' as original_collection_name , (select id from collections where name = original_collection_name  ) as original_collection_id
    FROM saved_reports r
    left join (  select * from saved_reports_pinned s where s.contact_id = ${connection.escape(contact_id)} and s.company_id  = ${connection.escape(company_id)}) srp on srp.report_id = r.id 
    where r.type = 'application' and r.company_id = ${connection.escape(company_id)}
    order by r.name asc `;
    
    if(template){
      sql +=  " and template = " + connection.escape(template);
    }

    return connection.queryAsync(sql);

  }, 

  saveReportsPinned(connection,report_id,contact_id,company_id){ 
    var sql =     ` INSERT INTO saved_reports_pinned  (report_id,contact_id,company_id)
                    select ${connection.escape(report_id)},${connection.escape(contact_id)},${connection.escape(company_id)}
                    where NOT EXISTS(
                      SELECT 1 from saved_reports_pinned srp
                      where srp.report_id = ${connection.escape(report_id)} and
                      srp.contact_id = ${connection.escape(contact_id)} and
                      srp.company_id = ${connection.escape(company_id)}
  )`;

    return connection.queryAsync(sql);
  },

  deleteReportsPinned(connection,report_id,contact_id,company_id){
    var sql = `DELETE FROM saved_reports_pinned WHERE report_id = ${connection.escape(report_id)} and contact_id = ${connection.escape(contact_id)} and company_id = ${connection.escape(company_id)};`;
    
    return connection.queryAsync(sql);
  },

  getAllReports(connection,contact_id,company_id ,keyword){ 
    var sql = `
    select * from 
    (
    select id, name , collection_id from saved_reports r where
    (r.company_id is NULL and r.contact_id is NULL) or
    (r.type = 'canned')
    union 
    select id, name , (select id from collections where name ="Application Reports") from saved_reports r
    where
         (r.company_id = ${connection.escape(company_id)} and r.type = 'application')
    union     
    select id ,name , (select id from collections where name ="Custom Reports") from saved_reports r
    where
         (r.company_id = ${connection.escape(company_id)} and r.contact_id = ${connection.escape(contact_id)})
         )t
         where t.collection_id is not null
         and name LIKE '%${keyword}%'
         order by t.name asc
         `;

    return connection.queryAsync(sql);
  },
  addDefaultReports(connection, company_id , contact_id){
    var sql = `INSERT INTO saved_reports_addons (collection_id, report_id, company_id,is_default)
    select T.* from 
    (
      select (select id from collections where name = 'Bankers Box') as collection_id ,sr.id ,${connection.escape(company_id)} as company_id, 1 as is_default from saved_reports sr where is_banker = 1 
      union all
      select (select id from collections where name = 'Investor Reports') as collection_id ,sr.id ,${connection.escape(company_id)} as company_id, 1 as is_default from saved_reports sr where is_investor = 1
          )T
    where NOT EXISTS(
        SELECT 1 from saved_reports_addons sra
        where sra.collection_id = T.collection_id and
        sra.report_id = T.id and 
        sra.company_id = T.company_id and
        sra.is_default = T.is_default
        );`;

    return connection.queryAsync(sql);

  },

  async removeAddedReports(connection, report_id , collection_id,company_id){

    var sql = `DELETE FROM saved_reports_addons WHERE report_id = ${connection.escape(report_id)} and company_id = ${connection.escape(company_id)} and collection_id = ${connection.escape(collection_id)} and is_default = 0` ;
    await connection.queryAsync(sql);

      var sql2 =  `UPDATE saved_reports_addons SET active = 0 WHERE report_id = ${connection.escape(report_id)} and collection_id = ${connection.escape(collection_id)} and company_id = ${connection.escape(company_id)} `;

    return connection.queryAsync(sql2);
  },

  removeScheduledReports(connection, report_id , contact_id ,company_id , collection_id , collection_type){ 
    
    let includes = '';
    if(collection_type === "banker_box") {
      includes = 'includes_banker'
      }
      else if (collection_type === "investor_reports") {
        includes = 'includes_investor'
      }
      var sql = `update schedule_report_configuration SET active = 0 where report_id = ${connection.escape(report_id)} 
      and schedule_report_id in (select id from schedule_report_master where ${includes} = 1 and company_id = ${connection.escape(company_id)} )`;
    return connection.queryAsync(sql);
  },

  deleteSavedAddons(connection,report_id,company_id)
  { 
    var sql = `DELETE FROM saved_reports_addons WHERE report_id = ${connection.escape(report_id)} and company_id = ${connection.escape(company_id)}`

    return connection.queryAsync(sql);
  },

  deleteFromSchedule(connection,report_id,company_id)
  { 
    var sql = `DELETE FROM schedule_report_configuration WHERE report_id = ${connection.escape(report_id)}`;

    return connection.queryAsync(sql);
  },

  getPaymentsDataFromHB(connection, property_id, date, end_date, time_zone)
  {
    var sql = 
    `SELECT transactiondateproperty, transactiondateutc, hummingbirdtransactionid,
          psptransactionid, psp, amount, currency, transactiontype,
          paymentmethod, tenantID, tenantName, relatedtransactionid, payoutid, paymentsource FROM 
          (SELECT 
            CONVERT_TZ(pay.created,'UTC',${connection.escape(time_zone)}) as transactiondateproperty, 
            pay.created as transactiondateutc,
            pay.id as hummingbirdtransactionid, pay.transaction_id as psptransactionid,
            pay.payment_gateway as psp, pay.amount as amount, 'USD' as currency, 
            pay.method as paymentmethod, pay.contact_id as tenantID,
            (SELECT CASE WHEN status = 1 THEN 'charge'
                        WHEN status = -1 THEN 'void'
                        END) as transactionType,
            (SELECT CONCAT_WS(" ", contacts.first, contacts.last)
              FROM contacts WHERE pay.contact_id = id
            ) as tenantName, null as relatedtransactionid, pay.payout_id as payoutid, pay.payment_source as paymentsource
            FROM payments as pay where pay.property_id = ${connection.escape(property_id)} 
            and pay.date >= ${connection.escape(date)} and pay.date <= ${connection.escape(end_date)}
            and pay.transaction_id is not null and pay.transaction_id > ''
            and pay.status in (1, -1)
          ) as payments_data
    UNION ALL
    SELECT transactiondateproperty, transactiondateutc, hummingbirdtransactionid,
      psptransactionid, psp, amount, currency, transactiontype,
      paymentmethod, tenantID, tenantName, relatedtransactionid, payoutid, paymentsource FROM 
      (SELECT pay.payment_gateway as psp, 'USD' as currency,
        pay.method as paymentmethod, pay.contact_id as tenantID,
        (SELECT CONCAT_WS(" ", contacts.first, contacts.last)
          FROM contacts WHERE pay.contact_id = id
        ) as tenantName, pay.id as relatedtransactionid,
        CONVERT_TZ(refunds.date,'UTC',${connection.escape(time_zone)}) as transactiondateproperty, 
        refunds.date as transactiondateutc,
        refunds.id as hummingbirdtransactionid, refunds.transaction_id as psptransactionid,
        (SELECT CASE WHEN refunds.type = 'ach' THEN 'reversal'
                     ELSE refunds.type
                     END) as transactionType,
        (-1 * refunds.amount) as amount,
        refunds.payout_id as payoutid, pay.payment_source as paymentsource
        FROM payments as pay
        INNER JOIN 
        refunds
        ON pay.id = refunds.payment_id 
        and pay.property_id = ${connection.escape(property_id)}  
        and pay.transaction_id is not null and pay.transaction_id > ''
        and refunds.effective_date >= ${connection.escape(date)} and refunds.effective_date <= ${connection.escape(end_date)}
        and refunds.type IN ('ach', 'chargeback', 'refund')
      ) as refunds_data
      ORDER BY transactiondateproperty`;

    return connection.queryAsync(sql);
  },

  getTransactionDataFromPropay(connection, account_number, date)
  {
    var previous_date = moment(date).subtract(1, 'days').format('YYYY-MM-DD');
    var sql = 
    `SELECT transactiondatepsp, psptransactionid, attnum, payoutinitiatedatepsp,
      payoutidpsp, payoutamount FROM
      (SELECT CTD.GatewayTransactionId as psptransactionid,
        CTD.AttNum as attnum,
        CTD.TransactionDate as transactiondatepsp,
        payout.TransactionDate as payoutinitiatedatepsp,
        payout.TransactionInfoId as payoutidpsp,
        -payout.NetAmount as payoutamount
        FROM (SELECT * from tenant.ComprehensiveTransactionDetail
			        WHERE AccountNum = ${connection.escape(account_number)}) as CTD
      LEFT JOIN
      (SELECT NetAmount, TransactionDate, TransactionInfoId,SweepId 
        FROM tenant.ComprehensiveTransactionDetail WHERE 
        TransDescription IN ('-CK', '+CK')
        AND AccountNum = ${connection.escape(account_number)}) as payout
      ON CTD.SweepId = payout.SweepId
      WHERE CTD.SweepId is NOT null
      and CTD.SweepId != 0 
      and CTD.TransactionDate >= ${connection.escape(previous_date)}
      ) as result`;

    return connection.queryAsync(sql);
  },
  
  getrawFromPropay(connection, account_number, date, end_date)
  {
    var sql = 
    `SELECT CTD.AccountNum as AccountNum,
    CTD.MerchantTransactionDate as MerchantTransactionDate,
    CTD.MerchantSettleDate as MerchantSettleDate,
    CTD.SettleDate as SettleDate,
    CTD.AttNum as AttNum,
    CTD.TransDescription as TransDescription,
    CTD.TransactionDetailAccount as TransactionDetailAccount,
    CTD.TransactionDetailType as TransactionDetailType,
    CTD.AuthAmount as AuthAmount,
    CTD.GrossAmount as GrossAmount,
    CTD.NetAmount as NetAmount,
    CTD.ResponseCode as ResponseCode,
    CTD.ResponseCodeDescription as ResponseCodeDescription,
    CTD.ExpDate as ExpDate,
    CTD.TransactionInfoId as TransactionInfoId,
    CTD.SweepId as SweepId,
    CTD.BatchId as BatchId,
    CTD.CardPresent as CardPresent,
    CTD.HasCVV2 as HasCVV2,
    CTD.BankName as BankName,
    CTD.BankAddress1 as BankAddress1,
    CTD.CardNumber as CardNumber,
    "USD" as Currency,
    CTD.ParentTransactionInfoId as ParentTransactionInfoId,
    CTD.TraceNumber as TraceNumber,
    CTD.CardPresentType as CardPresentType,
    CTD.ReconcilingDescription as ReconcilingDescription
    FROM tenant.ComprehensiveTransactionDetail as CTD
      WHERE CTD.AccountNum = ${connection.escape(account_number)}
      and CTD.MerchantTransactionDate >= ${connection.escape(date)} and CTD.MerchantTransactionDate <= ${connection.escape(end_date)}`;
      console.log(sql)

    return connection.queryAsync(sql);
  },

  getPayouts(connection, property_id, date, end_date) {
    var sql = 
    `SELECT date as payout_date,
    id as payout_id, transaction_id as payout_id_psp,
      (SELECT bank_routing_num FROM tenant_payments_applications 
        WHERE property_id = ${connection.escape(property_id)}) as bank_routing_number, 
      (SELECT RIGHT(bank_account_num, 4) FROM tenant_payments_applications 
        WHERE property_id = ${connection.escape(property_id)}) as bank_acc_tail, 
    amount as payout_amount, 'USD' as currency 
    FROM 
    (SELECT TIMESTAMP(CONVERT_TZ(payouts.payout_date, "+00:00", 
      (IFNULL((SELECT utc_offset FROM properties
                WHERE id = ${connection.escape(property_id)}), "+00:00")))) as date,
      id, transaction_id, amount, property_id, status FROM payouts) as payouts_table 
    WHERE property_id = ${connection.escape(property_id)} and status = '0' and
    date >= ${connection.escape(date)} and date <= ${connection.escape(end_date)}`;

    return connection.queryAsync(sql);
  },
  
  coverageDetails(connection, property_ids, company_id, start_date, end_date) {
    
    let sql = `SELECT
                p2.name AS property_name,
                u.number AS space_number,
                c.first AS tenant_first_name,
                c.last AS tenant_last_name,
                a.address AS tenant_address_1,
                a.address2 AS tenant_address_2,
                a.city AS tenant_city,
                a.state AS tenant_state,
                a.country AS tenant_country,
                a.zip AS tenant_zip,
                c.email AS tenant_email,
                (
                SELECT
                  phone
                FROM
                  contact_phones cp
                WHERE
                  cp.contact_id = c.id
                  AND cp.primary = 1
                ORDER BY
                  id DESC
                LIMIT 1) AS tenant_phone,
                s.start_date AS insurance_start_date,
                s.end_date AS insurance_end_date,
                i.period_start AS invoice_period_start,
                i.period_end AS invoice_period_end,
                (
                SELECT
                  IF(refund_id,
                  ila.amount,
                  0)
                FROM
                  invoices_payments_breakdown ipb2
                WHERE
                  ipb2.id = ila.invoice_payment_breakdown_id) AS insurance_refunded_amount,
                (IFNULL((SELECT IF (amount > 0 , ila.amount, 0) FROM payments p3 WHERE p3.id = (SELECT ip.payment_id FROM invoices_payments ip WHERE ip.id = ila.invoice_payment_id) AND p3.credit_type = 'credit' ), 0)) AS insurance_credited_amount,
                CASE
                  WHEN (
                  SELECT
                    refund_id
                  FROM
                    invoices_payments_breakdown ipb2
                  WHERE
                    ipb2.id = ila.invoice_payment_breakdown_id ) IS NOT NULL THEN 0
                  WHEN (
                  SELECT
                    credit_type
                  FROM
                    payments
                  WHERE
                    id = (
                    SELECT
                      payment_id
                    FROM
                      invoices_payments ip2
                    WHERE
                      id = ila.invoice_payment_id ) ) = 'credit' THEN 0
                  ELSE ila.amount
                END AS insurance_paid_amount,
                p.name AS insurance_name,
                i2.premium_value AS insurance_permium,
                i2.coverage AS insurance_coverage,
                (il.qty * il.cost + il.total_tax - (
                SELECT
                  SUM(amount)
                FROM
                  invoice_lines_allocation ila2
                WHERE
                  ila2.invoice_line_id IN (il.id) ) ) AS balance_due,
                DATE(ila.created) AS transaction_date,
                DATE(l.start_date) AS move_in_date,
                IF(s.end_date = il.end_date,
                TRUE,
                FALSE) AS is_cancelled_coverage,
                (
                SELECT
                  (IF((
                  SELECT
                    COUNT(*)
                  FROM
                    invoice_lines
                  WHERE
                    service_id = il.service_id
                    AND start_date < il.start_date) > 0 ,
                  FALSE,
                  TRUE))) AS is_new_coverage,
                (
                SELECT
                  (IF((
                  SELECT
                    SUM(amount)
                  FROM
                    invoice_lines_allocation ila3
                  WHERE
                    ila3.invoice_line_id IN (il.id) )> 0, TRUE,
                  FALSE)) ) AS is_paid,
                cl.id AS tenant_id,
                p2.id AS property_id,
                u.id AS space_id,
                il.invoice_id AS invoice_id,
                l.id AS lease_id
              FROM
                invoice_lines_allocation ila
              INNER JOIN invoice_lines il ON
                il.id = ila.invoice_line_id AND ila.created BETWEEN ${connection.escape(moment(start_date).startOf('day').format('YYYY-MM-DD HH:mm:ss'))} AND ${connection.escape(moment(end_date).endOf('day').format('YYYY-MM-DD HH:mm:ss'))}
              INNER JOIN products p ON
                il.product_id = p.id AND p.default_type = 'insurance'
              INNER JOIN services s ON
                il.service_id = s.id AND s.status = 1
              INNER JOIN invoices i ON
                il.invoice_id = i.id AND i.status = 1
              INNER JOIN leases l ON
                l.id = i.lease_id
              INNER JOIN contact_leases cl ON
                l.id = cl.lease_id
              INNER JOIN contacts c ON
                cl.contact_id = c.id
              INNER JOIN units u ON
                l.unit_id = u.id
              INNER JOIN properties p2 ON
                u.property_id = p2.id AND p2.id IN ( ${connection.escape(property_ids)} ) AND p2.company_id = ${connection.escape(company_id)}
              INNER JOIN insurance i2 ON
                i2.product_id = p.id
              LEFT JOIN contact_locations cl2 ON
                cl2.contact_id = c.id
              LEFT JOIN addresses a ON
                cl2.address_id = a.id
              WHERE
                cl2.primary = 1
              ORDER BY
                ila.id DESC;
    
    `
    return connection.queryAsync(sql);
  }
};

module.exports = Report;

var DepositRefunds = require(__dirname + '/msr/deposits_refunds.js');
