var moment = require('moment');
const Sql = require(__dirname + '/../modules/sql_snippets.js');

module.exports = {

  // Invoice total - discounts
  accruedRevenueTD: async (connection, date, timeframe, properties) =>  {

    let snippet = " in ( select id from invoices where status = 1 and invoices.date <= " + connection.escape( date);
    switch(timeframe){
      case 'mtd':
        snippet += " AND Month(invoices.date) = Month(" + connection.escape( date) + ")";
        snippet += " AND Year(invoices.date) = Year(" + connection.escape( date) + ") " ;
        break;
      case 'ytd':
        snippet += " AND Year(invoices.date) = Year(" + connection.escape( date) + ") " ;
        break;
      case 'daily':
        snippet += " AND invoices.date = " + connection.escape(date);
        break;
    }
    snippet += ") ";
    snippet += " and lease_id in (select id from leases where unit_id in (select id from units where property_id in ( " + properties.map(p => connection.escape(p)).join(', ') +  " ))) ";


    let sql = " SELECT " +
      " SUM( " +
        " (select IFNULL(SUM(qty * cost),0) from invoice_lines where product_id not in (select id from products where default_type = 'security') and invoice_id = invoices.id) - " +
        " (select IFNULL(SUM(amount),0) from discount_line_items where invoice_line_id in (select id from invoice_lines where invoice_id = invoices.id)) " +
    ") " +
    " as total_revenue from invoices where id " + snippet;



    return connection.queryAsync(sql).then(r => r.length ? r[0].total_revenue: {});

  },

  discountsTD: async (connection, date, timeframe, properties) =>  {

    let snippet = " in ( select id from invoices where invoices.date <= " + connection.escape( date);
    switch(timeframe){
      case 'mtd':
        snippet += " AND Month(invoices.date) = Month(" + connection.escape( date) + ") ";
        snippet += " AND Year(invoices.date) = Year(" + connection.escape( date) + ") " ;
        break;
      case 'ytd':
        snippet += " AND Year(invoices.date) = Year(" + connection.escape( date) + ") " ;
        break;
      case 'daily':
        snippet += " AND invoices.date = " + connection.escape(date);
        break;
    }
    snippet += ") ";
    snippet += " and lease_id in (select id from leases where unit_id in (select id from units where property_id in ( " + properties.map(p => connection.escape(p)).join(', ') +  " ))) ";

    let sql = "Select SUM(IFNULL(total_discounts, 0)) as total_discounts from invoices where id " + snippet;


    console.log("discountsTD",  date, timeframe, sql)

    return connection.queryAsync(sql).then(r => r.length ? r[0].total_discounts: {});

  },

  revenueTD: async (connection, date,  credit_type = 'payment', payment_type = [], timeframe, properties) =>  {
    let sql = "SELECT SUM(amount) as total_paid from payments where status = 1 ";
    sql +=  "and credit_type = " + connection.escape(credit_type) + " and date <= " + connection.escape( date);
    if(payment_type){
      payment_type.map(type => {

        if(type === 'other'){
          sql +=  " and method not in ( 'cash', 'check', 'ach', 'card', 'credit' ) ";
        } else {
          sql +=  " and method = " + connection.escape(type.toLowerCase());
        }
      });
    }

    switch(timeframe) {
      case 'mtd':
        sql += " AND Month(`date`) = Month(" + connection.escape(date) + ") and date <= " + connection.escape(date)
        sql += " AND Year(`date`) =  Year(" + connection.escape(date) + ") and date <= " + connection.escape(date);
        break;
      case 'ytd':
        sql += " AND Year(`date`) =  Year(" + connection.escape(date) + ") and date <= " + connection.escape(date);
        break;
      case 'daily':
        sql += " AND `date` = " + connection.escape(date);
        break;
    }

    sql += " and property_id in ( " + properties.map(p => connection.escape(p)).join(', ') +  " ) ";


    console.log("revenueTD", date,  credit_type, payment_type, timeframe, sql);

    return connection.queryAsync(sql).then(r => r.length ? r[0].total_paid : {});
  },


  reversalsTD: async (connection, date, timeframe, properties) =>  {
    let sql = "SELECT SUM(amount) as total_revesals from refunds where type = 'nsf'";


    switch(timeframe){
      case 'mtd':
        sql += " AND Month(`date`) = Month(" + connection.escape(date) + ") and date <= " + connection.escape( date);
        sql += " AND Year(`date`) =  Year(" + connection.escape(date) + ") and date <= " + connection.escape( date);
        break;
      case 'ytd':
        sql += " AND Year(`date`) =  Year(" + connection.escape(date) + ") and date <= " + connection.escape( date);
        break;
      case 'daily':
        sql += " AND `date` = " + connection.escape( date);
        break;
    }

    sql += " and payment_id in (select id from payments where property_id in ( " + properties.map(p => connection.escape(p)).join(', ') +  " )) ";

    console.log("reversalsTD", date, timeframe, sql);
    return connection.queryAsync(sql).then(r => r.length ? r[0].total_revesals : {});

  },

  feeWaivesTD: async (connection, date,  credit_type = 'payment', payment_type = [], product_type = [], timeframe, properties) =>  {
    let sql = "SELECT SUM(amount) as sum total_revesals from refunds where status = 1 and type = 'nsf'";

  },

  // TODO LIMIT by Properties and limit by day
  moveInsTD: async (connection, date, timeframe, properties) =>  {
    let sql = "SELECT COUNT(id)  as count from leases where status = 1 " ;

    switch(timeframe){
      case 'mtd':
        sql += " AND Month(start_date) = Month(" + connection.escape(date) + ") and start_date <= " + connection.escape(date);
        sql += " AND Year(start_date) = Year(" + connection.escape(date) + ") and start_date <= " + connection.escape(date);
        break;
      case 'ytd':
        sql += " AND Year(start_date) = Year(" + connection.escape(date) + ") and start_date <= " + connection.escape(date);
        break;
      case 'daily':
        sql += " AND start_date = " + connection.escape(date);
        break;
    }

    sql += " and id not in (select to_lease_id from transfers where to_lease_id = leases.id)";
    sql += " and unit_id in (select id from units where property_id in ( " + properties.map(p => connection.escape(p)).join(', ') +  " )) ";

    console.log("moveInsTD", date, timeframe, sql);

    return connection.queryAsync(sql).then(r => r.length ? r[0].count: 0);


  },

  moveOutsTD: async (connection, date, timeframe, properties) =>  {

    let sql = "SELECT COUNT(id) as count from leases where status = 1 " ;

    switch(timeframe){
      case 'mtd':
        sql += " AND Month(end_date) = Month(" + connection.escape(date) + ") and end_date <= " + connection.escape(date);
        sql += " AND Year(end_date) = Year(" + connection.escape(date) + ") and end_date <= " + connection.escape(date);
        break;
      case 'ytd':
        sql += " AND Year(end_date) = Year(" + connection.escape(date) + ") and end_date <= " + connection.escape(date);
        break;
      case 'daily':
        sql += " AND end_date = " + connection.escape(date);
        break;
    }

    sql += " and id not in (select from_lease_id from transfers where from_lease_id = leases.id)";
    sql += " and unit_id in (select id from units where property_id in ( " + properties.map(p => connection.escape(p)).join(', ') +  " )) ";


    console.log("moveOutsTD", date, timeframe, sql);


    return connection.queryAsync(sql).then(r => r.length ? r[0].count : 0);

  },

  transfersTD: async (connection, date, timeframe, properties) =>  {
    
    let sql = "SELECT COUNT(id) as count from transfers where 1 = 1" ;

    switch(timeframe){
      case 'mtd':
        sql += " AND Month(date) = Month(" + connection.escape(date) + ") and date <= " + connection.escape(date);
        sql += " AND Year(date) = Year(" + connection.escape(date) + ") and date <= " + connection.escape(date);
        break;
      case 'ytd':
        sql += " AND Year(date) = Year(" + connection.escape(date) + ") and date <= " + connection.escape(date);
        break;
      case 'daily':
        sql += " AND date = " + connection.escape(date);
        break;
    }

    sql += " and from_lease_id in (select id from leases where unit_id in (select id from units where property_id in ( " + properties.map(p => connection.escape(p)).join(', ') +  " ))) ";


    console.log("transfersTD", date, timeframe, sql);


    return connection.queryAsync(sql).then(r => r.length ? r[0].count : 0);
    
  },

  occupancyVacant: async (connection, date, properties, company_id) =>  {

    let sql = "select count(id) as count, " +
      " (select SUM( " +
        " (select value FROM amenity_units WHERE amenity_property_id = (select distinct ap.id from amenity_property ap join units un on un.property_id=ap.property_id where ap.amenity_name = 'length' and ap.property_type = 'storage' and un.id = units.id) and unit_id = units.id) * " +
        " (select value FROM amenity_units WHERE amenity_property_id = (select distinct ap.id from amenity_property ap join units un on un.property_id=ap.property_id where ap.amenity_name = 'width' and ap.property_type = 'storage' and un.id = units.id) and unit_id = units.id) " +
      " )) as sqft " +
      " from units where status = 1 and ( available_date <= " + connection.escape(date) + " or available_date is null ) and " +
      " id not in (select unit_id from leases where status = 0 and id in (select lease_id from reservations where DATE(created) <= " + connection.escape(date) + " and  DATE(expires) > " + connection.escape(date) + ")) and";

    if(properties.length){
      sql += " property_id in ( " + properties.map(p => connection.escape(p)).join(', ') +  " ) ";
    } else {
      sql += " property_id in ( select id from properties where company_id = " + connection.escape(company_id) + " ) ";
    }

    sql += " and id not in (select unit_id from leases where ( ( status = 1 or status = 2 ) and (end_date is null or end_date  > " + connection.escape(date) +  " ))) ";

    console.log("occupancyVacant", date, sql);

    return connection.queryAsync(sql).then(r => r .length ? r[0] : {});

  },

  occupancyPending: async (connection, date, properties, company_id) =>  {

    let sql = "select count(id) as count, " +
      " (select SUM( " +
        " (select value FROM amenity_units WHERE amenity_property_id = (select distinct ap.id from amenity_property ap join units un on un.property_id=ap.property_id where ap.amenity_name = 'length' and ap.property_type = 'storage' and un.id = units.id) and unit_id = units.id) * " +
        " (select value FROM amenity_units WHERE amenity_property_id = (select distinct ap.id from amenity_property ap join units un on un.property_id=ap.property_id where ap.amenity_name = 'width' and ap.property_type = 'storage' and un.id = units.id) and unit_id = units.id " +
      " )) as sqft " +
      " from units where ";

    if(properties.length){
      sql += " property_id in ( " + properties.map(p => connection.escape(p)).join(', ') +  " ) ";
    } else {
      sql += " property_id in ( select id from properties where company_id = " + connection.escape(company_id) + " ) ";
    }

    sql += " and id in (select unit_id from leases where status = 2  and start_date <=  " + connection.escape(date) + " ) ";



    return connection.queryAsync(sql).then(r => r .length ? r[0] : {});

  },


  occupancyReserved: async (connection, date, properties, company_id) =>  {

    let sql = "select count(id) as count, " +
      " (select SUM( " +
      " (select value FROM amenity_units WHERE amenity_property_id = (select distinct ap.id from amenity_property ap join units un on un.property_id=ap.property_id where ap.amenity_name = 'length' and ap.property_type = 'storage' and un.id = units.id) and unit_id = units.id) * " +
      " (select value FROM amenity_units WHERE amenity_property_id = (select distinct ap.id from amenity_property ap join units un on un.property_id=ap.property_id where ap.amenity_name = 'width' and ap.property_type = 'storage' and un.id = units.id) and unit_id = units.id " +
      " )) as sqft " +
      " from units where ";

    if(properties.length){
        sql += " property_id in ( " + properties.map(p => connection.escape(p)).join(', ') +  " ) ";
      } else {
        sql += " property_id in ( select id from properties where company_id = " + connection.escape(company_id) + " ) ";
      }

      sql += " and id in (select unit_id from leases where id in (select lease_id from reservations where DATE(created) <= " + connection.escape(date) + " and  DATE(expires) > " + connection.escape(date) + ") and (status = 0 or (status = 1 and start_date >  " + connection.escape(date) + "))  ) ";


    console.log("occupancyReserved", date, sql);

    return connection.queryAsync(sql).then(r => r .length ? r[0] : {});

  },

  //TODO Fix This
  occupancyUnrentable: async (connection, date, properties, company_id) =>  {

    let sql = "select count(id) as count, " +
      " (select SUM( " +
      " (select value FROM amenity_units WHERE amenity_property_id = (select distinct ap.id from amenity_property ap join units un on un.property_id=ap.property_id where ap.amenity_name = 'length' and ap.property_type = 'storage' and un.id = units.id) and unit_id = units.id) * " +
      " (select value FROM amenity_units WHERE amenity_property_id = (select distinct ap.id from amenity_property ap join units un on un.property_id=ap.property_id where ap.amenity_name = 'width' and ap.property_type = 'storage' and un.id = units.id) and unit_id = units.id " +
      " )) as sqft " +
      " from units where (status = 0 or available_date > " + connection.escape(date) + ") and ";

      if(properties.length){
        sql += " property_id in ( " + properties.map(p => connection.escape(p)).join(', ') +  " ) ";
      } else {
        sql += " property_id in ( select id from properties where company_id = " + connection.escape(company_id) + " ) ";
      }
      sql += " and id not in (select unit_id from leases where ( (status = 1 or status = 2) and (end_date is null or end_date  > " + connection.escape(date) +  " )) or ( status = 0 and id in (select lease_id from reservations where DATE(created) <= " + connection.escape(date) + " and DATE(expires) > " + connection.escape(date) + "))) ";


      console.log("occupancyUnrentable", date, sql);

      return connection.queryAsync(sql).then(r => r .length ? r[0] : {});

  },

  //TODO Fix This
  occupancyComplimentary: async (connection, date, properties, company_id) =>  {

    let sql = "select count(id) as count, " +
      " (select SUM( " +
      " (select value FROM amenity_units WHERE amenity_property_id = (select distinct ap.id from amenity_property ap join units un on un.property_id=ap.property_id where ap.amenity_name = 'length' and ap.property_type = 'storage' and un.id = units.id) and unit_id = units.id) * " +
      " (select value FROM amenity_units WHERE amenity_property_id = (select distinct ap.id from amenity_property ap join units un on un.property_id=ap.property_id where ap.amenity_name = 'width' and ap.property_type = 'storage' and un.id = units.id) and unit_id = units.id " +
      " )) as sqft " +
      " from units where (status = 0 or available_date > " + connection.escape(date) + ") and ";

    if(properties.length){
      sql += " property_id in ( " + properties.map(p => connection.escape(p)).join(', ') +  " ) ";
    } else {
      sql += " property_id in ( select id from properties where company_id = " + connection.escape(company_id) + " ) ";
    }
    sql += " and id not in (select unit_id from leases where status = 1 or (status = 0 and id in (select lease_id from reservations where DATE(expires) > " + connection.escape(date) + "))) ";

    console.log("occupancyUnrentable", date, sql);
    return connection.queryAsync(sql).then(r => r .length ? r[0] : {});

  },

  reservationsTD: async (connection, date, timeframe, properties) =>  {
    let sql = "SELECT COUNT(id) as count from reservations where 1 = 1  " ;

    switch(timeframe){
      case 'mtd':
        sql += " AND Month(created) = Month(" + connection.escape(date) + ") and DATE(created) <= " + connection.escape( date);
        sql += " AND Year(created) = Year(" + connection.escape(date) + ") and DATE(created) <= " + connection.escape( date);
        break;
      case 'ytd':
        sql += " AND Year(created) = Year(" + connection.escape(date) + ") and DATE(created) <= " + connection.escape( date);
        break;
      case 'daily':
        sql += " AND DATE(created) = " + connection.escape(date);
        break;
    }


    sql += " and lease_id in (select id from leases where unit_id in (select id from units where property_id in ( " + properties.map(p => connection.escape(p)).join(', ') +  " ))) ";

    console.log("reservationsTD", date,timeframe, sql);

    return connection.queryAsync(sql).then(r => r .length ? r[0] : 0);

  },

  leadSourcesTD: async (connection, date, timeframe, properties, sources, company_id) =>  {
    let sql = "select IFNULL(source, 'N/A') as source, count(id) as count from leads where ";

    if(properties.length){
      sql += " property_id in ( " + properties.map(p => connection.escape(p)).join(', ') +  " ) ";
    } else {
      sql += " property_id in ( select id from properties where company_id = " + connection.escape(company_id) + " ) ";
    }

    if(sources){
      sql += " and source in (" + sources.map(p => connection.escape(p)).join(', ') + ')'
    }


    switch(timeframe){
      case 'mtd':
        sql += " AND Month(created) = Month(" + connection.escape(date) + ") and DATE(created) <= " + connection.escape( date);
        sql += " AND Year(created) = Year(" + connection.escape(date) + ") and DATE(created) <= " + connection.escape( date);
        break;
      case 'ytd':
        sql += " AND Year(created) = Year(" + connection.escape(date) + ") and DATE(created) <= " + connection.escape( date);
        break;
      case 'daily':
        sql += " AND DATE(created) = " + connection.escape(date);
        break;
    }
    sql += ' group by source order by count desc limit 5';

    console.log("leadSourcesTD", date, timeframe, sources, sql);

    return connection.queryAsync(sql);
  },

  leadsTD: async (connection, date, timeframe, properties) =>  {

    let sql = "SELECT COUNT(id) as count from leads where status = 1 " ;

    switch(timeframe){
      case 'mtd':
        sql += " AND Month(created) = Month(" + connection.escape(date) + ") and DATE(created) <= " + connection.escape( date);
        sql += " AND Year(created) = Year(" + connection.escape(date) + ") and DATE(created) <= " + connection.escape( date);
        break;
      case 'ytd':
        sql += " AND Year(created) = Year(" + connection.escape(date) + ") and DATE(created) <= " + connection.escape( date);
        break;
      case 'daily':
        sql += " AND DATE(created) = " + connection.escape(date);
        break;
    }

    if(properties.length){
      sql += " and property_id in ( " + properties.map(p => connection.escape(p)).join(', ') +  " ) ";
    } else {
      sql += " and property_id in ( select id from properties where company_id = " + connection.escape(company_id) + " ) ";
    }

    sql += ' group by source';

    console.log("leadsTD", date, timeframe, sql);
    return connection.queryAsync(sql).then(r => r.length ? r[0].count: 0);

  },

  //todo add date checks for when the units came online
  totalSqft(connection, date, properties, company_id){
    var sql = "select SUM( " +
      " (select value FROM amenity_units WHERE amenity_property_id = (select distinct ap.id from amenity_property ap join units un on un.property_id=ap.property_id where ap.amenity_name = 'length' and ap.property_type = 'storage' and un.id = units.id) and unit_id = units.id) * " +
      " (select value FROM amenity_units WHERE amenity_property_id = (select distinct ap.id from amenity_property ap join units un on un.property_id=ap.property_id where ap.amenity_name = 'width' and ap.property_type = 'storage' and un.id = units.id) and unit_id = units.id " +
    " ) as total_sqft " +
    " from units where status = 1 and DATE(created) <= " + connection.escape(date) + " and (deleted is null || DATE(deleted) > " + connection.escape(date) + " ) and ";
    if(properties.length){
      sql += " property_id in ( " + properties.map(p => connection.escape(p)).join(', ') +  " ) ";
    } else {
      sql += " property_id in ( select id from properties where company_id = " + connection.escape(company_id) + " ) ";
    }

    console.log("totalSqft", date, sql);
    return connection.queryAsync(sql).then(r => r.length ? r[0].total_sqft: {});
  },

  rentedSqft(connection, date, properties, company_id){

    var sql = "select SUM( " +
      " (select value FROM amenity_units WHERE amenity_property_id = (select distinct ap.id from amenity_property ap join units un on un.property_id=ap.property_id where ap.amenity_name = 'length' and ap.property_type = 'storage' and un.id = units.id) and unit_id = units.id) * " +
      " (select value FROM amenity_units WHERE amenity_property_id = (select distinct ap.id from amenity_property ap join units un on un.property_id=ap.property_id where ap.amenity_name = 'width' and ap.property_type = 'storage' and un.id = units.id) and unit_id = units.id " +
      " ) as rented_sqft " +
      " from units where DATE(created) <= " + connection.escape(date) + " and (deleted is null || DATE(deleted) > " + connection.escape(date) + " ) and ";

    if(properties.length){
      sql += " property_id in ( " + properties.map(p => connection.escape(p)).join(', ') +  " ) ";
    } else {
      sql += " property_id in ( select id from properties where company_id = " + connection.escape(company_id) + " ) ";
    }

     sql += " and id in (select unit_id from leases where status = 1 and start_date <=  " + connection.escape(date) + " and (end_date is null or end_date >  " + connection.escape(date) + " )) ";
    console.log("rentedSqft", date, sql);
    return connection.queryAsync(sql).then(r => r.length? r[0].rented_sqft: {});
  },

  totalUnits(connection, date, properties, company_id){
    var sql = "select COUNT( id ) as total_units " +
      " from units where DATE(created) <= " + connection.escape(date) + " and (deleted is null || DATE(deleted) > " + connection.escape(date) + " ) and ";

    if(properties.length){
      sql += " property_id in ( " + properties.map(p => connection.escape(p)).join(', ') +  " ) ";
    } else {
      sql += " property_id in ( select id from properties where company_id = " + connection.escape(company_id) + " ) ";
    }

    console.log("totalUnits", date, sql);

    return connection.queryAsync(sql).then(r => r.length ? r[0].total_units: {});
  },

  rentedUnits(connection, date, properties, company_id){

    var sql = "select COUNT( id ) as rented_units from units where ";

    if(properties.length){
      sql += " property_id in ( " + properties.map(p => connection.escape(p)).join(', ') +  " ) ";
    } else {
      sql += " property_id in ( select id from properties where company_id = " + connection.escape(company_id) + " ) ";
    }
    sql += " and id in (select unit_id from leases where status = 1 and start_date <= " + connection.escape(date) + " and  (end_date is null or end_date > " + connection.escape(date) + " )) ";
    console.log("rentedUnits", date, sql);
    return connection.queryAsync(sql).then(r => r.length ? r[0].rented_units : {});
  },

  occupancyBreakdown (connection, date, properties) {
      let sql = "SELECT  " +  Sql.invoice_total(unit_id, date);
      console.log("occupancyBreakdown", sql);
  },

  deliquentTenants(connection, date, start, end, properties, company_id){

    var sql = "SELECT COUNT(*) as count, " +

      "(SELECT SUM(IFNULL(subtotal, 0) + IFNULL(total_tax,0) - IFNULL(total_discounts,0) - IFNULL((SELECT IFNULL(SUM(amount), 0) from invoices_payments where date <= " + connection.escape(date) + " and invoice_id = invoices.id ),0))) AS total_owed " +
      "FROM invoices " +
      "WHERE status = 1 and due <  " + connection.escape(date);

      sql += " and due >= DATE_SUB(" + connection.escape(date) + ", INTERVAL " + connection.escape(start) + " DAY) " +
        " and due <= DATE_SUB(" + connection.escape(date) + ", INTERVAL " + connection.escape(end) + " DAY) ";



    if(properties.length){
      sql +=" AND invoices.lease_id IN (SELECT id FROM leases WHERE status = 1 and unit_id IN (SELECT id FROM units WHERE property_id IN ( " + properties.map(p => connection.escape(p)).join(', ') +  " )))";
    }  else {
      sql +=" AND invoices.lease_id IN (SELECT id FROM leases WHERE status = 1 and unit_id IN (SELECT id FROM units WHERE property_id IN ( SELECT id from properties where company_id = " + connection.escape(company_id) + " )))";
    }
     sql += " and (SELECT (IFNULL(subtotal, 0) + IFNULL(total_tax,0) - IFNULL(total_discounts,0) - IFNULL((SELECT IFNULL(SUM(amount), 0) from invoices_payments where date <= " +  connection.escape(date) + " and invoice_id = invoices.id ),0))) > 0 ";

    console.log("deliquentTenants", date, start, end, sql);
    return connection.queryAsync(sql);
  },

  autoPay(connection, date, properties){

    var sql = "select COUNT( id ) as auto_pay from leases where status = 1 and unit_id in (select id from units where property_id in ( " + properties.map(p => connection.escape(p)).join(', ') +  " )) and start_date <=  " + connection.escape(date) + " and (end_date is null or end_date >  " + connection.escape(date) + " ) and id in (select lease_id from payment_methods where auto_charge = 1)";
    console.log("autoPay", date,  sql);
    return connection.queryAsync(sql).then(r => r.length ? r[0].auto_pay : {});
  },

  insurance(connection, date, properties){
    var sql = "select COUNT( id ) as insurance from leases where status = 1 and unit_id in (select id from units where property_id in ( " + properties.map(p => connection.escape(p)).join(', ') +  " ) and start_date <=   " + connection.escape(date) + " and (end_date is null or end_date >   " + connection.escape(date) + " )) and " +
    " id in (select lease_id from services where status = 1 and start_date <=  " + connection.escape(date) + " and ( end_date >=  " + connection.escape(date) + " || end_date is null ) and product_id in (select id from products where default_type = 'insurance') )"
    console.log("insurance", date,  sql);
    return connection.queryAsync(sql).then(r => r.length ? r[0].insurance : {});
  },

  overlocks(connection, date, properties){
    var sql = "select COUNT( id ) as overlocks from overlocks where unit_id in (select id from units where status = 1 and DAY(created) <= " + connection.escape(date) + " and (deleted is null || DAY(deleted) > " + connection.escape(date) + " ) and  property_id in ( " + properties.map(p => connection.escape(p)).join(', ') +  " )) ";
    console.log("overlocks", date,  sql);
    return connection.queryAsync(sql).then(r => r.length ? r[0].overlocks : {});
  },


  totalPrices(connection, date, properties, company_id){
    var sql = "select SUM( price ) as total_price " +

      " from units where status = 1 and DATE(created) <= " + connection.escape(date) + " and (deleted is null || DATE(deleted) > " + connection.escape(date) + " ) and ";

    if(properties.length){
      sql += " property_id in ( " + properties.map(p => connection.escape(p)).join(', ') +  " ) ";
    } else {
      sql += " property_id in ( select id from properties where company_id = " + connection.escape(company_id) + " ) ";
    }

    console.log("totalPrices", date,  sql);
    return connection.queryAsync(sql).then(r => r.length ? r[0].total_price: {});
  },

  totalRent(connection, date, properties, company_id){
    var sql = "select SUM( rent ) as total_rent " +
      " from leases where status = 1 and start_date <= " + connection.escape(date) + " and (end_date is null || end_date > " + connection.escape(date) + " ) and ";

    if(properties.length){
      sql += " leases.unit_id in (select id from units where property_id in ( " + properties.map(p => connection.escape(p)).join(', ') +  " )) ";
    } else {
      sql += " leases.unit_id in (select id from units where property_id in in ( select id from properties where company_id = " + connection.escape(company_id) + " )) ";
    }
    console.log("totalRent", date,  sql);
    return connection.queryAsync(sql).then(r => r.length ? r[0].total_rent: {});
  },

  calculatePrepaidAmount(connection, date, product_types, properties, company_id){

    let sql = " SELECT *, " +
      " (SELECT SUM(IFNULL(qty * cost, 0)) from invoice_lines where invoice_id = invoices.id and product_id in (select id from products where default_type in ('rent'))) as prepaid_rent, " +
      " (SELECT SUM(IFNULL(qty * cost, 0)) from invoice_lines where invoice_id = invoices.id and product_id in (select id from products where default_type in ('insurance'))) as prepaid_insurance, " +
      " (SELECT SUM(IFNULL(qty * cost, 0)) from invoice_lines where invoice_id = invoices.id and product_id in (select id from products where default_type in ('product'))) as prepaid_services, " +
      " (SELECT SUM(IFNULL(qty * cost, 0)) from invoice_lines where invoice_id = invoices.id and product_id in (select id from products where default_type in ('late'))) as prepaid_fees, " +
      " (SELECT SUM(IFNULL(qty * cost, 0)) from invoice_lines where invoice_id = invoices.id and product_id in (select id from products where default_type in ('utilities'))) as prepaid_utilities, " +
      " (SELECT SUM(IFNULL(qty * cost, 0)) from invoice_lines where invoice_id = invoices.id and product_id in (select id from products where default_type in ('security'))) as prepaid_liabilities " +
    " FROM invoices WHERE 1 = 1 " +
    " and status = 1 " +
    " and date > " + connection.escape(date) +
    " and (SELECT IFNULL(subtotal, 0) + IFNULL(total_tax, 0) - IFNULL(total_discounts, 0) - (SELECT SUM(IFNULL(amount,0)) from invoices_payments ip where ip.invoice_id = invoices.id and date <= " + connection.escape(date) + " )) = 0 ";

    if(properties.length){
      sql += " and lease_id in (select id from leases where unit_id in (select id from units  where property_id in ( " + properties.map(p => connection.escape(p)).join(', ') +  " ))) ";
    } else {
      sql += " and lease_id in (select id from leases where unit_id in (select id from units  where property_id in ( select id from properties where company_id = " + connection.escape(company_id) + " ))) ";
    }

    // let sql = "SELECT IFNULL(SUM(qty * cost), 0) as amount FROM invoice_lines where product_id in (select id from products where default_type in (" + product_types.map(py => connection.escape(py)).join(', ') + ") ) and " +
    //   " invoice_id in (select id from invoices where date > " + connection.escape(date) + " and (IFNULL(subtotal, 0) + IFNULL(total_tax, 0) - IFNULL(total_discounts, 0) - IFNULL(total_payments, 0 )) = 0 ) and  ";

    console.log("calculatePrepaidAmount", date,  sql);
    return connection.queryAsync(sql).then(r => {
      if(!r.length) return {};
      return r.reduce((a,b) => {
        return {
          prepaid_rent: a.prepaid_rent + b.prepaid_rent,
          prepaid_insurance: a.prepaid_insurance + b.prepaid_insurance,
          prepaid_services: a.prepaid_services + b.prepaid_services,
          prepaid_fees: a.prepaid_fees + b.prepaid_fees,
          prepaid_utilities: a.prepaid_utilities + b.prepaid_utilities,
          prepaid_liabilities: a.prepaid_liabilities + b.prepaid_liabilities
        }
      })
    });
  },

  calculatePrepaidUnapplied(connection, date, properties, company_id){
     let sql = " SELECT SUM(amount - (SELECT SUM(IFNULL(amount,0)) from invoices_payments where payment_id = payments.id and date <= " + connection.escape(date) + " )) as unallocated " +
        " FROM payments where amount > (SELECT SUM(IFNULL(amount,0)) from invoices_payments where payment_id = payments.id and date <= " + connection.escape(date) + " )";
      if(properties.length){
        sql += " and property_id in ( " + properties.map(p => connection.escape(p)).join(', ') +  " ) ";
      } else {
        sql += " and property_id in ( select id from properties where company_id = " + connection.escape(company_id) + " )";
      }
    console.log("calculatePrepaidUnapplied", date,  sql);
      return connection.queryAsync(sql).then(r => r.length ? r[0]: {});
  },


  calculatePrepaidPartial(connection, date, properties, company_id){

    let sql = " SELECT (SELECT SUM(IFNULL(qty * cost, 0)) from invoice_lines where invoice_id = invoices.id ) as prepaid_partial " +
      " FROM invoices WHERE 1=1 " +
      " and date > " + connection.escape(date) + " and " +
      " (SELECT IFNULL(subtotal, 0) + IFNULL(total_tax, 0) - IFNULL(total_discounts, 0) - (SELECT SUM(IFNULL(amount,0)) from invoices_payments ip where ip.invoice_id = invoices.id and date <= " + connection.escape(date) + " )) > 0 and " +
      " (SELECT IFNULL(subtotal, 0) + IFNULL(total_tax, 0) - IFNULL(total_discounts, 0) - (SELECT SUM(IFNULL(amount,0)) from invoices_payments ip where ip.invoice_id = invoices.id and date <= " + connection.escape(date) + " )) <  ( IFNULL(subtotal, 0) + IFNULL(total_tax, 0) - IFNULL(total_discounts, 0) ) ";

    if(properties.length){
      sql += " and lease_id in (select id from leases where unit_id in (select id from units  where property_id in ( " + properties.map(p => connection.escape(p)).join(', ') +  " ))) ";
    } else {
      sql += " and lease_id in (select id from leases where unit_id in (select id from units  where property_id in ( select id from properties where company_id = " + connection.escape(company_id) + " ))) ";
    }
      console.log("calculatePrepaidPartial", date,  sql);
      return connection.queryAsync(sql).then(r => r.length ? r[0]: {});
  },

  calculatePrepaidUnits(connection, date, product_types, properties, company_id){

    let sql = "SELECT COUNT(DISTINCT(select unit_id from leases where id = (select lease_id from invoices where id = invoice_lines.invoice_id))) as unit_count FROM invoice_lines where product_id in (select id from products where default_type in (" + product_types.map(py => connection.escape(py)).join(', ') + ") ) and " +
      " invoice_id in (select id from invoices where due > " + connection.escape(date) + " and (IFNULL(subtotal, 0) + IFNULL(total_tax, 0) - IFNULL(total_discounts, 0) - IFNULL(total_payments, 0 )) = 0 ) and  ";

    if(properties.length){
      sql += " invoice_id in (select id from invoices where lease_id in (select id from leases where unit_id in (select id from units  where property_id in ( " + properties.map(p => connection.escape(p)).join(', ') +  " )))) ";
    } else {
      sql += " invoice_id in in (select id from invoices where lease_id in (select id from leases where unit_id in (select id from units  where property_id in ( select id from properties where company_id = " + connection.escape(company_id) + " )))) ";
    }
    console.log("calculatePrepaidUnits", date,  sql);
    return connection.queryAsync(sql).then(r => r.length ? r[0].unit_count: {});
  },

  calculateRetainedRevenueUnits(connection, date, properties, company_id){

    let sql = " SELECT COUNT(DISTINCT( contact_id )) as retained_revenue_units from payments where credit_type = 'payment' and status = 1 and date <= " + connection.escape(date) + " and amt_remaining > 0 and ";

    if(properties.length){
      sql += " property_id in ( " + properties.map(p => connection.escape(p)).join(', ') +  " ) ";
    } else {
      sql += " property_id in ( select id from properties where company_id = " + connection.escape(company_id) + " ) ";
    }

    console.log("calculateRetainedRevenue", date,  sql);
    return connection.queryAsync(sql).then(r => r.length ? r[0].retained_revenue_units: {});

  },

  calculateRetainedRevenue(connection, date, properties, company_id){

    let sql = " SELECT SUM( amt_remaining) as retained_revenue from payments where date <= "  + connection.escape(date) + " and credit_type = 'payment' and status = 1 and ";

    if(properties.length){
      sql += " property_id in ( " + properties.map(p => connection.escape(p)).join(', ') +  " ) ";
    } else {
      sql += " property_id in ( select id from properties where company_id = " + connection.escape(company_id) + " ) ";
    }

    console.log("calculateRetainedRevenue", date,  sql);

    return connection.queryAsync(sql).then(r => r.length ? r[0].retained_revenue: {});

  },


  getSpaceInfo(connection, date, properties, company_id, category_id){

    var sql = "select SUM() (SELECT DISTINCT value FROM amenity_units WHERE amenity_property_id = (select distinct ap.id from amenity_property ap join units un on un.property_id=ap.property_id where ap.amenity_name = 'width' and ap.property_type = 'storage' and un.id = units.id) and unit_id = units.id ) as width, " +
      " (SELECT DISTINCT value FROM  amenity_units WHERE amenity_property_id = (select distinct ap.id from amenity_property ap join units un on un.property_id=ap.property_id where ap.amenity_name = 'length' and ap.property_type = 'storage' and un.id = units.id) and unit_id = units.id) as length "+
      // " (SELECT DISTINCT value FROM  amenity_units WHERE amenity_id = (select id from amenities where name = 'height' and property_type = 'storage') and unit_id = units.id) as height " +
      " from units where property_id in ( select id from properties where company_id = "+connection.escape(company_id)+") ";




    var sql = "select SUM( rent ) as total_rent " +
      " from leases where status = 1 and start_date <= " + connection.escape(date) + " and (end_date is null || end_date > " + connection.escape(date) + " ) and ";

    if(properties.length){
      sql += " leases.unit_id in (select id from units where property_id in ( " + properties.map(p => connection.escape(p)).join(', ') +  " )) ";
    } else {
      sql += " leases.unit_id in (select id from units where property_id in in ( select id from properties where company_id = " + connection.escape(company_id) + " )) ";
    }
    console.log("totalRent", date,  sql);
    return connection.queryAsync(sql).then(r => r.length ? r[0].total_rent: {});
  },

  getOccupancyStatsBySize(connection, category_id, properties, type ){

      var sql = "select " +
        " label," +
        "    (SELECT value FROM amenity_units WHERE amenity_property_id = (select distinct ap.id from amenity_property ap join units un on un.property_id=ap.property_id where ap.amenity_name = 'width' and ap.property_type = 'storage' and un.id = units.id) and unit_id = units.id ) * (SELECT value FROM amenity_units WHERE amenity_property_id = (select distinct ap.id from amenity_property ap join units un on un.property_id=ap.property_id where ap.amenity_name = 'length' and ap.property_type = 'storage' and un.id = units.id) and unit_id = units.id ) as area, " +
        "    COUNT(id) as total_units, " +
        "    (COUNT(id) * (SELECT value FROM amenity_units WHERE amenity_property_id = (select distinct ap.id from amenity_property ap join units un on un.property_id=ap.property_id where ap.amenity_name = 'width' and ap.property_type = 'storage' and un.id = units.id) and unit_id = units.id ) * (SELECT value FROM amenity_units WHERE amenity_property_id = (select distinct ap.id from amenity_property ap join units un on un.property_id=ap.property_id where ap.amenity_name = 'length' and ap.property_type = 'storage' and un.id = units.id) and unit_id = units.id )) as total_area, " +
        "    (SELECT IFNULL(COUNT(id), 0) from leases where (end_date is null or end_date > CURDATE()) and status = 1 and leases.unit_id = units.id) as occupied," +
        "    (SELECT IFNULL(SUM((SELECT upc.set_rate FROM unit_price_changes upc WHERE upc.unit_id = units.id ORDER BY upc.id DESC LIMIT 1)), 0) from units u where u.id = units.id and status = 1 and id not in (select unit_id from leases where (end_date is null or end_date > CURDATE()) ) and status = 1 ) as vacant, " +

        "    (SELECT COUNT(id) from units u where (status = 0 || available_date > CURDATE()  ) and u.id = units.id and u.id not in (select id from leases where status = 1 and (end_date is null or end_date > CURDATE()))) as unrentable, " +
        "    AVG((SELECT upc.set_rate FROM unit_price_changes upc WHERE upc.unit_id = units.id ORDER BY upc.id DESC LIMIT 1)) as avg_rate, " +
        "    SUM((SELECT upc.set_rate FROM unit_price_changes upc WHERE upc.unit_id = units.id ORDER BY upc.id DESC LIMIT 1)) as gross_potential, " +
        "    (SELECT IFNULL(SUM((SELECT upc.set_rate FROM unit_price_changes upc WHERE upc.unit_id = units.id ORDER BY upc.id DESC LIMIT 1)), 0) from units u where u.id = units.id and u.id in (select unit_id from leases where end_date is null or end_date > CURDATE()) and status = 1) as gross_occupied, " +
        "    (SELECT IFNULL(SUM(rent), 0) from leases where (end_date is null or end_date > CURDATE()) and status = 1 and leases.unit_id = units.id) as actual_occupied, " +


        "    ((SELECT IFNULL(SUM(rent), 0) from leases where (end_date is null or end_date > CURDATE()) and status = 1 and leases.unit_id = units.id) / SUM((SELECT upc.set_rate FROM unit_price_changes upc WHERE upc.unit_id = units.id ORDER BY upc.id DESC LIMIT 1))) as  income_occupancy, " +

        "    ( " +
        "    IFNULL( " +
        "      ((SELECT IFNULL(COUNT(id), 0) from leases where (end_date is null or end_date > CURDATE()) and status = 1 and leases.unit_id = units.id) / COUNT(id) ) , " +
        "         0) " +
        "  ) as  space_occupancy,  " +
        "   " +
        "    ( " +
        "    IFNULL(SUM( " +
        "      (SELECT value FROM amenity_units WHERE amenity_property_id = (select distinct ap.id from amenity_property ap join units un on un.property_id=ap.property_id where ap.amenity_name = 'width' and ap.property_type = 'storage' and un.id = units.id) and  unit_id in (select unit_id from leases where (end_date is null or end_date > CURDATE()) and status = 1 and leases.unit_id = units.id )) *  " +
        "      (SELECT value FROM amenity_units WHERE amenity_property_id = (select distinct ap.id from amenity_property ap join units un on un.property_id=ap.property_id where ap.amenity_name = 'length' and ap.property_type = 'storage' and un.id = units.id) and  unit_id in (select unit_id from leases where (end_date is null or end_date > CURDATE()) and status = 1 and leases.unit_id = units.id )) " +
        "    ) /  " +
        "        ( SUM((SELECT value FROM amenity_units WHERE amenity_property_id = (select distinct ap.id from amenity_property ap join units un on un.property_id=ap.property_id where ap.amenity_name = 'width' and ap.property_type = 'storage' and un.id = units.id) and unit_id = units.id ) * (SELECT value FROM amenity_units WHERE amenity_property_id = (select distinct ap.id from amenity_property ap join units un on un.property_id=ap.property_id where ap.amenity_name = 'length' and ap.property_type = 'storage' and un.id = units.id) and unit_id = units.id))),0) " +
        "  ) as  area_occupancy " +
        "     " +
        "from units " +
        " where  " +
        "  category_id = " + category_id +  " and  " +
        "    property_id in (" + properties.map(p => connection.escape(p)).join(', ') + ") and " +
        "    type = " + connection.escape(type) +
        " group by label;";

    return connection.queryAsync(sql)
  },

  getOccupancyStatsForCategory(connection, category_id, properties, type){

    var sql = "select   " +
      "    (IFNULL(SUM((SELECT value FROM amenity_units WHERE amenity_property_id = (select distinct ap.id from amenity_property ap join units un on un.property_id=ap.property_id where ap.amenity_name = 'width' and ap.property_type = 'storage' and un.id = units.id) and  unit_id in (select unit_id from leases where (end_date is null or end_date > CURDATE()) and status = 1 and leases.unit_id = units.id )) * (SELECT value FROM amenity_units WHERE amenity_property_id = (select distinct ap.id from amenity_property ap join units un on un.property_id=ap.property_id where ap.amenity_name = 'length' and ap.property_type = 'storage' and un.id = units.id) and  unit_id in (select unit_id from leases where (end_date is null or end_date > CURDATE()) and status = 1 and leases.unit_id = units.id ))), 0)) as  occupied_area,  " +
      "    (IFNULL(SUM((SELECT value FROM amenity_units WHERE amenity_property_id = (select distinct ap.id from amenity_property ap join units un on un.property_id=ap.property_id where ap.amenity_name = 'width' and ap.property_type = 'storage' and un.id = units.id) and unit_id = units.id and unit_id in (select id from units where status = 1 and id not in (select unit_id from leases where (end_date is null or end_date > CURDATE()) and status = 1 ))) * (SELECT value FROM amenity_units WHERE amenity_property_id = (select distinct ap.id from amenity_property ap join units un on un.property_id=ap.property_id where ap.amenity_name = 'length' and ap.property_type = 'storage' and un.id = units.id) and unit_id = units.id and unit_id in (select id from units where status = 1 and id not in (select unit_id from leases where (end_date is null or end_date > CURDATE()) and status = 1 ))) ), 0) ) as  vacant_area,  " +
      "    ( IFNULL(SUM( (SELECT value FROM amenity_units WHERE amenity_property_id = (select distinct ap.id from amenity_property ap join units un on un.property_id=ap.property_id where ap.amenity_name = 'width' and ap.property_type = 'storage' and un.id = units.id) and unit_id = units.id and unit_id in (select id from units where status = 0 and id not in (select unit_id from leases where (end_date is null or end_date > CURDATE()) and status = 1 ))) * (SELECT value FROM amenity_units WHERE amenity_property_id = (select distinct ap.id from amenity_property ap join units un on un.property_id=ap.property_id where ap.amenity_name = 'length' and ap.property_type = 'storage' and un.id = units.id) and unit_id = units.id and unit_id in (select id from units where status = 0 and id not in (select unit_id from leases where (end_date is null or end_date > CURDATE()) and status = 1 ))) ), 0) ) as  unrentable_area,  " +
      "    IFNULL(SUM( (SELECT value FROM amenity_units WHERE amenity_property_id = (select distinct ap.id from amenity_property ap join units un on un.property_id=ap.property_id where ap.amenity_name = 'width' and ap.property_type = 'storage' and un.id = units.id) and unit_id = units.id ) * (SELECT value FROM amenity_units WHERE amenity_property_id = (select distinct ap.id from amenity_property ap join units un on un.property_id=ap.property_id where ap.amenity_name = 'length' and ap.property_type = 'storage' and un.id = units.id) and unit_id = units.id ) ), 0) as total_area,    " +

      "    ( IFNULL(AVG(  (SELECT value FROM amenity_units WHERE amenity_property_id = (select distinct ap.id from amenity_property ap join units un on un.property_id=ap.property_id where ap.amenity_name = 'width' and ap.property_type = 'storage' and un.id = units.id) and  unit_id in (select unit_id from leases where (end_date is null or end_date > CURDATE()) and status = 1 and leases.unit_id = units.id )) * (SELECT value FROM amenity_units WHERE amenity_property_id = (select distinct ap.id from amenity_property ap join units un on un.property_id=ap.property_id where ap.amenity_name = 'length' and ap.property_type = 'storage' and un.id = units.id) and  unit_id in (select unit_id from leases where (end_date is null or end_date > CURDATE()) and status = 1 and leases.unit_id = units.id )) ), 0) ) as  avg_area_unit_occupied,  " +
      "    ( IFNULL(AVG( (SELECT value FROM amenity_units WHERE amenity_property_id = (select distinct ap.id from amenity_property ap join units un on un.property_id=ap.property_id where ap.amenity_name = 'width' and ap.property_type = 'storage' and un.id = units.id) and unit_id = units.id and unit_id in (select id from units where status = 1 and id not in (select unit_id from leases where (end_date is null or end_date > CURDATE()) and status = 1 ))) * (SELECT value FROM amenity_units WHERE amenity_property_id = (select distinct ap.id from amenity_property ap join units un on un.property_id=ap.property_id where ap.amenity_name = 'length' and ap.property_type = 'storage' and un.id = units.id) and unit_id = units.id and unit_id in (select id from units where status = 1 and id not in (select unit_id from leases where (end_date is null or end_date > CURDATE()) and status = 1 ))) ), 0) ) as  avg_area_unit_vacant,  " +
      "    ( IFNULL(AVG( (SELECT value FROM amenity_units WHERE amenity_property_id = (select distinct ap.id from amenity_property ap join units un on un.property_id=ap.property_id where ap.amenity_name = 'width' and ap.property_type = 'storage' and un.id = units.id) and unit_id = units.id and unit_id in (select id from units where status = 0 and id not in (select unit_id from leases where (end_date is null or end_date > CURDATE()) and status = 1 ))) * (SELECT value FROM amenity_units WHERE amenity_property_id = (select distinct ap.id from amenity_property ap join units un on un.property_id=ap.property_id where ap.amenity_name = 'length' and ap.property_type = 'storage' and un.id = units.id) and unit_id = units.id and unit_id in (select id from units where status = 0 and id not in (select unit_id from leases where (end_date is null or end_date > CURDATE()) and status = 1 ))) ), 0) ) as  avg_area_unit_unrentable,              " +

      "    (SELECT IFNULL(AVG(rent), 0) from leases where (end_date is null or end_date > CURDATE()) and status = 1 and leases.unit_id = units.id) as  avg_rent_unit_occupied,  " +
      "    (SELECT IFNULL(AVG((SELECT upc.set_rate FROM unit_price_changes upc WHERE upc.unit_id = units.id ORDER BY upc.id DESC LIMIT 1)), 0) from units u where status = 1 and u.id = units.id and  id not in ( select unit_id from leases where end_date is null or end_date > CURDATE() and status = 1 )) as avg_price_unit_vacant,  " +
      "    (SELECT IFNULL(AVG((SELECT upc.set_rate FROM unit_price_changes upc WHERE upc.unit_id = units.id ORDER BY upc.id DESC LIMIT 1)), 0) from  units u where status = 0 and u.id = units.id and id not in ( select unit_id from leases where end_date is null or end_date > CURDATE() and status = 1 )) as avg_price_unit_unrentable " +
      "from units  " +
      " where  " +
      "  category_id = " + category_id +  " and  " +
      "    property_id in (" + properties.map(p => connection.escape(p)).join(', ') + ") and " +
      "    type = " + connection.escape(type);


   console.log("sql", sql)

    return connection.queryAsync(sql).then(r => r.length? r[0]: {})
  }




};
