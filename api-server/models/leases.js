var settings    = require(__dirname + '/../config/settings.js');
const Sql = require(__dirname + '/../modules/sql_snippets.js');
var e  = require(__dirname + '/../modules/error_handler.js');
var moment = require('moment');
var Promise         = require('bluebird');


module.exports = {

    async canAccess(connection, lease_id, company_id, properties){

        var sql = "select * from properties where id = (select property_id from units where id = (select unit_id from leases where id = " + connection.escape(lease_id) + "))";

        let propertyResult = await connection.queryAsync(sql);

        if(!propertyResult.length) return false;
        var property = propertyResult[0];
        if(property.company_id !== company_id) return false;

        if(properties.length && properties.indexOf(property.id) < 0) return false;

        return true;

    }, 

    getPaidThroughDate(connection, id, date) {

        date = date || moment().format('YYYY-MM-DD');
        let sql = "SELECT MAX(end_date) as end_date from invoice_lines where product_id in (select id from products where default_type = 'rent') and invoice_id in (select id from invoices i  where i.status = 1 and lease_id = " + id + " and ( IFNULL(subtotal,0) + IFNULL(total_tax,0) - IFNULL(total_discounts,0) -  ( SELECT IFNULL(SUM(amount),0) from invoices_payments where invoice_id = i.id and date <= '" + date + "')) = 0 )";

        console.log("getPaidThroughDate - sql", sql);
        return connection.queryAsync(sql).then(res => res.length ? res[0] : null);
    },

    findCurrentByUnitId: function(connection, unit_id, date){

        var d = date? moment(date, 'YYYY-MM-DD') : moment();

        console.log("findCurrentByUnitId function");
        var unitSql = "Select * from leases where " +
            " unit_id = " + connection.escape(unit_id) + " and " +
            " ((status = 1 and " +
              " start_date <= '" + d.format('YYYY-MM-DD') + "' and " +
              " ( end_date > '" + d.format('YYYY-MM-DD') + "' or end_date is null ) " +
              ") or  " +
            " ( status = 0 and ( select id from reservations where reservations.lease_id = leases.id and expires > " + " (select CONVERT_TZ(NOW(),'+00:00', utc_offset) from properties where id = ( select property_id from units where id = "+ connection.escape(unit_id) + " ) )) is not null )) " +
            " ";

        console.log("findCurrentByUnitId unitSql", unitSql);

        return connection.queryAsync(unitSql).then(function(leaseRes){
            if(!leaseRes.length) return null;
            var lease = leaseRes[0];
            return lease;
         //   return _this.getContainFields(connection, lease, contain);

        });
    }, 

    findPendingByUnitId: function(connection, unit_id, date){

        var unitSql = "Select * from leases where " +
            " unit_id = " + connection.escape(unit_id) + " and status = 2 limit 1 ";

        return connection.queryAsync(unitSql).then(function(leaseRes){
            return (leaseRes.length) ? leaseRes[0] : null;
        });
    },

    findPending: function(connection, company_id, properties = [], contact_id){

      var unitSql = "Select * from leases where " +
        " unit_id in (select id from units where property_id in (select id from properties where company_id = " + connection.escape(company_id) + ")) and status = 2 ";


      if(properties.length){
        unitSql += " and unit_id in (select id from units where property_id in ( " + properties.map(p => connection.escape(p)).join(', ') +  " ))";
      }

      if(contact_id){
          unitSql += `and id in (select lease_id from contact_leases where contact_id = ${connection.escape(contact_id)})`
      }

      unitSql += " order by created desc";

      console.log('properties', properties);
      console.log(unitSql);

      return connection.queryAsync(unitSql);
    },

    findNextLease: function(connection, unit_id, date){

      var d = date? moment(date, 'YYYY-MM-DD') : moment();

      var unitSql = "Select * from leases where " +
        " unit_id = " + connection.escape(unit_id) + " and " +
        " start_date >= '" + d.format('YYYY-MM-DD') + "' and " +
        " ( status > 0 or ( select id from reservations where reservations.lease_id = leases.id and expires > now() ) is not null ) " +
        "  order by start_date asc limit 1 ";


      return connection.queryAsync(unitSql).then(l => l.length? l[0]: null);
    },

    findByUnitId:function(connection, unit_id){
        var unitSql = "Select * from leases where unit_id = " + connection.escape(unit_id) + " order by id asc ";
        return connection.queryAsync(unitSql).then(function(leasesRes){
	        return leasesRes[0] || null;
        });

    },

    hasBeenBilled:function(connection, lease_id){
        var invoiceSql = "Select * from invoice_lines where invoice_id in (select id from invoices where " +
            " lease_id = " + connection.escape(lease_id) + ") and " +
            " product_id = 1 and " +
            " month(date) = '" + moment().format('MM') + "' and " +
            " year(date) = '" + moment().format('YYYY') + "' " +
            " order by date desc limit 1";

        return connection.queryAsync(invoiceSql).then(function(res){
            if(res.length) return true;
            return false;
        })
    },

    searchByCompanyId: function(connection, company_id, search = {}, sort = {}, limit, offset, count){

        var sql;
        if(count){
            // sql = "SELECT count(*) as count  ";
            sql = 'SELECT *, ';
        } else {
            sql = 'SELECT *, ';

        }

        sql += '(select address from addresses where id = (select address_id from units  where id = leases.unit_id)) as address, ' +
            '(select number from units where id = leases.unit_id) as number, ' +
            '(select city from addresses where id = (select address_id from units  where id = leases.unit_id)) as city, ' +
            '(select state from addresses where id = (select address_id from units  where id = leases.unit_id)) as state, ' +
            '(select zip from addresses where id = (select address_id from units  where id = leases.unit_id)) as zip, ' +
            '(SELECT SUM((qty*cost) - IFNULL((SELECT SUM(amount) FROM discount_line_items WHERE invoice_line_id = invoice_lines.id), 0) + ROUND(((qty * cost) - IFNULL((SELECT SUM(amount) FROM discount_line_items WHERE invoice_line_id = invoice_lines.id AND pretax = 1),0)) * IFNULL( (SELECT SUM(taxrate/100) FROM tax_line_items WHERE invoice_line_id = invoice_lines.id) , 0), 2)) FROM invoice_lines WHERE invoice_id in ( select id from invoices where status > -1 and due < CURDATE() and invoices.lease_id = leases.id)) - (SELECT IFNULL(SUM(amount),0)  FROM invoices_payments WHERE invoice_id in ( select id from invoices where status > -1 and due < CURDATE() and invoices.lease_id = leases.id)) AS balance ';

        sql += ' FROM leases WHERE unit_id in (select id from units where property_id in (select id from properties where company_id = ' + connection.escape(company_id) + ')) ';


        if(search.address || search.rent || search.balance || (search.lease_start && search.lease_start.date) || (search.lease_end && search.lease_end.date) ){
            sql += " HAVING 1 = 1 ";
        }

        if(search.address){
            sql += " and concat(address, ' ', city, ' ', state, ' ', zip) like "  + connection.escape("%" + search.address + "%");
        }


        if(search.rent){
            sql += " and leases.rent like "  + connection.escape("%" + search.rent + "%");
        }

        if(search.balance){
            sql += " and balance like "  + connection.escape("%" + search.balance + "%");
        }

        if(search.lease_start && search.lease_start.date){
            if(search.lease_start.timeframe == "Before"){
                sql += " and leases.start_date <= "  + connection.escape(moment(search.lease_start.date).format('YYYY-MM-DD'));
            } else if (search.lease_start.timeframe == "After"){
                sql += " and leases.start_date >= "  + connection.escape(moment(search.lease_start.date).format('YYYY-MM-DD'));
            }
        }

        if(search.lease_end &&  search.lease_end.date){
            if(search.lease_end.timeframe == "Before"){
                sql += " and leases.end_date <= "  + connection.escape(moment(search.lease_end.date).format('YYYY-MM-DD'));
            } else if (search.lease_end.timeframe == "After"){
                sql += " and (leases.end_date is null or leases.end_date > "  + connection.escape(moment(search.lease_end.date).format('YYYY-MM-DD')) + ")";
            }
        }

        var sortpart = '';
        if(sort != null && sort.length){
            var field;

            sort.forEach(s => {
                if(!s.field.length) return;
                switch(s.field){
                    case 'address':
                        field = 'address';
                        break;
                    case 'lease_start':
                        field = 'leases.start_date';
                        break;
                    case 'lease_end':
                        field = 'leases.end_date';
                        break;
                    case 'balance':
                        field = 'balance';
                        break;
                    case 'rent':
                        field = 'rent';
                        break;
                    default:
                        field = null;
                }

                if(field){
                    sortpart += " " + field + " " + s.dir + ',';
                }
            });

            if(sortpart.length) {
                sql += " ORDER BY ";
                sql += sortpart.replace(/,+$/, "");
            }
        } else {
            sql += " ORDER BY leases.id ASC ";
        }

        if(limit != null && offset != null){
            sql += " limit " + connection.escape(offset) + ", " + connection.escape(limit);
        }

        return connection.queryAsync(sql).then(results => {
            console.log(sql);
            console.log(count);
            console.log(results.length);
            if(count) return results.length;
            return results;

        })


    },

    findCurrentByCompanyId:function(connection, company_id, searchParams){
        var _this = this;
        var unitSql = "Select * from leases where unit_id in (select id from units where property_id in ( select id from properties where company_id = " + connection.escape(company_id) + ")) " + " and " +
            " start_date <= '" + moment().format('YYYY-MM-DD') + "' and " +
            " ( end_date > '" + moment().format('YYYY-MM-DD') + "' or end_date is null ) ";

        if(searchParams){
            unitSql +=  " limit " + connection.escape(parseInt(searchParams.offset)) + ", " + connection.escape(parseInt(searchParams.limit));

        }

        return connection.queryAsync(unitSql);

    },

    findAllByUnitId:function(connection, unit_id){
        var unitSql = "Select * from leases where unit_id = " + connection.escape(unit_id) + " and end_date > '" + moment().format('YYYY-MM-DD') + " 00:00:00' ";

        return connection.queryAsync(unitSql);

    },

    findActiveByUnitId:function(connection, unit_id){
        var unitSql = "Select * from leases where unit_id = " + connection.escape(unit_id) + " and ( end_date > '" + moment().format('YYYY-MM-DD') + " 00:00:00' or end_date is null )";

        return connection.queryAsync(unitSql);

    },

    findById:function(connection, lease_id, contain, models){

        var leaseSql = "Select * from leases where id = " + connection.escape(lease_id);

        return connection.queryAsync(leaseSql).then(function(leasesRes){
            if(!leasesRes.length) return null;
            return leasesRes[0];
        });
    },

    /**
     * Returns all leases in a company
     * @param {Object} connection Connection details
     * @param {String} company_id Company ID
     * @param {Object} searchParams Search parameters
     * @param {Boolean} count To return lease count
     * @returns {Array} Returns array of leases in a particular company
     **/
    findAll: function (connection, company_id, searchParams, count) {

        let status = {
            "all": "",
            "inactive": " AND end_date < CURRENT_DATE()",
            "future": " AND start_date > CURRENT_DATE()",
            "active": " AND start_date <= CURRENT_DATE() AND (end_date >= CURRENT_DATE OR end_date is null)"
        }
        let sql = `SELECT ${count ? "count(*) as count" : "*"} FROM leases WHERE status = 1 AND unit_id IN (SELECT id FROM units WHERE property_id IN `;
        if (searchParams.property_id) {
            sql += `(${connection.escape(searchParams.property_id)}))`
        } else {
            sql += `(SELECT id FROM properties WHERE company_id = ${company_id}))`
        }
        if (searchParams.from_date) {
            let toDate = searchParams.to_date || moment.utc().format('YYYY-MM-DD')
            if (searchParams.status === "future") {
                sql += ` AND ((start_date >= ${connection.escape(searchParams.from_date)} AND start_date <= ${connection.escape(toDate)}) OR start_date > CURRENT_DATE())`
            } else {
                sql += ` AND start_date >= ${connection.escape(searchParams.from_date)} AND start_date <= ${connection.escape(toDate)}`
            }
        }
        sql += `${status[searchParams.status]} ORDER BY start_date desc, id`

        if (searchParams && searchParams.limit) {
            if (!count) {
                sql += ` LIMIT ${connection.escape(parseInt(searchParams.offset))},${connection.escape(parseInt(searchParams.limit))}`;
            }
        }
        return connection.queryAsync(sql).then(function (leasesRes) {
            if (!leasesRes.length) return [];
            return count ? leasesRes?.[0]?.count : leasesRes;

        }).catch(function (err) {
            console.log(err);
            return [];
        });
    },

    findActiveById:function(connection, lease_id){

        var _this = this;

        var leaseSql = "Select * from leases where status > 0 and id = " + connection.escape(lease_id);

        return connection.queryAsync(leaseSql).then(function(leasesRes){
            if(!leasesRes.length) return null;
	        var lease = leasesRes[0];
            return lease;
           // return _this.getContainFields(connection, lease, contain, models);
        });
    },

    findByContactId:function(connection, contact_id, company_id, properties = [], params = {}){

        var leaseUserSql = "Select * from leases where id in (select lease_id from contact_leases where contact_id = " +  connection.escape(contact_id) + ") ";

        if(company_id) {
            leaseUserSql += " and unit_id in (select id from units where property_id in (select id from properties where company_id = "+ connection.escape(company_id) + ")) ";
        }

        if(properties.length) {
            leaseUserSql += " and unit_id in (select id from units where property_id in (" + properties.map(p => connection.escape(p)).join(', ')  + ")) ";
        }

        if(params.lease_id) {
			leaseUserSql += ` and id = ${connection.escape(params.lease_id)}`;
        }

        if(!params.all){
            leaseUserSql += ` and status > 0`;
        }

        console.log('findByContactId sql =>', leaseUserSql);
        return connection.queryAsync(leaseUserSql);
    },

    save: function(connection, data, lease_id){
        var sql;
        console.log("\n\n\n\n\n\n\n\n\n LEASE MODEL : ",data)
        if(lease_id){
            sql = "UPDATE leases set ? where id = " + connection.escape(lease_id);
        } else {
            sql = "INSERT INTO leases set ?";
        }
        return connection.queryAsync(sql, data);
    },

    updateAuctionStatus: function(connection, status, lease_id){
        if(lease_id){
            sql = "UPDATE leases set auction_status = " + (!status ? status : `"${status}"`) + ` where id = ${connection.escape(lease_id)}`
        }
        return connection.queryAsync(sql);
    },

    findByCompanyId: function(connection, company_id){
        var leaseSql = "SELECT * FROM leases WHERE start_date < now() and end_date > now() and unit_id in " +
            "(select id from units where property_id in " +
            "(select id from properties where company_id = " + connection.escape(company_id) + ")) ";


        return connection.queryAsync(leaseSql);

    },


    findAllByCompanyId(connection, company_id){

        var leaseSql = "SELECT *, " +
            "(select property_id from units where id = leases.unit_id) as property_id, " +
            "(select address from addresses where id = (select address_id from properties where id = (select property_id from units where id = leases.unit_id))) as address, " +
            "(select city from addresses where id = (select address_id from properties where id = (select property_id from units where id = leases.unit_id))) as city, " +
            "(select state from addresses where id = (select address_id from properties where id = (select property_id from units where id = leases.unit_id))) as state, " +
            "(select zip from addresses where id = (select address_id from properties where id = (select property_id from units where id = leases.unit_id))) as zip " +
            "FROM leases WHERE unit_id in " +
            "(select id from units where property_id in " +
            "(select id from properties where company_id = " + connection.escape(company_id) + ")) ";

        return connection.queryAsync(leaseSql);
    },

    findAllByPropertyId: function(connection, property_id){

        var leaseSql = "SELECT * FROM leases WHERE start_date < now() and end_date > now() and unit_id in " +
            "(select id from units where property_id =  " + connection.escape(property_id) + ") ";
        return connection.queryAsync(leaseSql);
    },

    // Similar function present in contact_leases model
    AddTenantToLease: function(connection, contact_id, lease_id){

        var data = {
            contact_id: contact_id,
            lease_id: lease_id
        };

        var sql = "INSERT INTO contact_leases set ? ";

        return connection.queryAsync(sql, data).then(res => {
            return res.insertId;
        })

    },

    RemoveTenantFromLease: function(connection, contact_id, lease_id){

        var sql = "DELETE from contact_leases where contact_id = "+connection.escape(contact_id)+" and lease_id =  " + connection.escape(lease_id);

        return connection.queryAsync(sql);

    },

    findLeasesToInvoiceOnDay: function(connection, company_id, date){
        var sql = "SELECT * " +
            " FROM leases " +
            " WHERE leases.unit_id in ( select id from units WHERE property_id in (select id from properties where company_id = " + connection.escape(company_id) + ") ) " +
            " AND status = 1 " +
            " AND start_date <= '" + date + "' " +
            " AND (end_date is null or end_date >  '" + date + "') " +
            " AND bill_day =  DAY('" + date + "') ";

        return connection.queryAsync(sql);

    },

    findLeasesToInvoice: function(connection, company_id, type, currDate){

        var sql = "SELECT *, " +
            " (select value from settings where name = 'invoiceSendDay' and company_id = " +
            " (select company_id from properties where id = " +
            " (select property_id from units where id = leases.unit_id))) as invoiceSendDay " +
            " FROM leases " +
            " WHERE leases.unit_id in ( select id from units WHERE property_id in (select id from properties where company_id = " + connection.escape(company_id) + ") ) " +
            " AND status = 1 " +
            " AND start_date <= " +
            "IF( " +
            " (DAY('" + currDate + "') > leases.bill_day), " +
            " DATE_ADD( CONCAT(YEAR( '" + currDate + "'), '-',  MONTH( '" + currDate + "'),  '-', IF(DAY('" + currDate + "') = DAY(LAST_DAY('" + currDate + "')), DAY('" + currDate + "'), leases.bill_day)) , INTERVAL 1 MONTH ), " +
            " CONCAT(YEAR( '" + currDate + "'), '-',  MONTH( '" + currDate + "'),  '-', IF(DAY('" + currDate + "') = DAY(LAST_DAY('" + currDate + "')), DAY('" + currDate + "'), leases.bill_day))  " +
            " ) " +
            " AND (end_date is null or end_date >  " +
            " IF( " +
            " (DAY('" + currDate + "') > leases.bill_day), " +
            " CONCAT(YEAR( '" + currDate + "'), '-',  MONTH( '" + currDate + "'),  '-',  IF(DAY('" + currDate + "') = DAY(LAST_DAY('" + currDate + "')), DAY('" + currDate + "'), leases.bill_day)), " +
            "DATE_SUB(CONCAT(YEAR( '" + currDate + "'), '-',  MONTH( '" + currDate + "'),  '-', " +
            " IF(DAY('" + currDate + "') = DAY(LAST_DAY('" + currDate + "')), DAY('" + currDate + "'), IF(DAY('" + currDate + "') = DAY(LAST_DAY('" + currDate + "')), DAY('" + currDate + "'), leases.bill_day)) " +
            ") , INTERVAL 1 MONTH) ) )";


        if(type =="sendSummary" || type =="sendToTenants") {
            sql += " HAVING DATE_SUB( " +
                " IF( " +
                " (DAY('" + currDate + "') > leases.bill_day), " +
                " DATE_ADD( CONCAT(YEAR( '" + currDate + "'), '-',  MONTH( '" + currDate + "'),  '-', IF(DAY('" + currDate + "') = DAY(LAST_DAY('" + currDate + "')), DAY('" + currDate + "'), leases.bill_day)) , INTERVAL 1 MONTH ), " +
                " CONCAT(YEAR( '" + currDate + "'), '-',  MONTH( '" + currDate + "'),  '-', IF(DAY('" + currDate + "') = DAY(LAST_DAY('" + currDate + "')), DAY('" + currDate + "'), leases.bill_day)) " +
                " ), " +
                " INTERVAL invoiceSendDay DAY) = ";


            if (type == "sendSummary") {
                sql += " DATE_ADD('" + currDate + "', INTERVAL 1 DAY) ";
            } else {
                sql += " '" + currDate + "' ";
            }

        } else if (type =="createInvoices" ){

            sql += " HAVING IF(" +
                "DAY( '" + currDate + "') = DAY(LAST_DAY('" + currDate + "')), " +
                "leases.bill_day >= DAY('" + currDate + "'), " +
                "leases.bill_day = DAY('" + currDate + "')" +
                ") ";
            /*
             sql += " AND IF(" +
             "DAY(CURDATE()) = DAY(LAST_DAY(CURDATE())), " +
             "leases.bill_day >= DAY(CURDATE()), " +
             "leases.bill_day = DAY(CURDATE())" +
             ") ";
             */
            // sql += " and DAY( DATE_ADD(CURDATE(), interval 1 day )) = leases.bill_day ";

        }


        return connection.queryAsync(sql);

    },

    findLeasesToBill: function(connection, company_id){
        var _this = this;
        var now = moment();
        var endOfMonthSql = '';

        if(now.format('DD') == now.clone().endOf('month').format('DD')){
            endOfMonthSql = ' or  bill_day > ' + now.format('DD')
        }

        var sql = "Select * from leases where " +
            " start_date <= '" + now.format('YYYY-MM-DD') + " 00:00:00' " +
            " and ( end_date > '" + now.format('YYYY-MM-DD') + " 23:59:59' or end_date is null ) " +
            " and ( bill_day = " + now.format('DD') + endOfMonthSql + ' )' +

            ' and (select count(*) from invoices where status > -1 and lease_id = leases.id ' +
            " AND (" +
            "select ROUND(SUM(" +
            "(qty*cost) - " +
            "IFNULL((select sum(amount) from discount_line_items where invoice_line_id = invoice_lines.id), 0) + " +
            "( " +
            "( "+
            "(qty * cost) - " +
            "IFNULL((SELECT SUM(amount) from discount_line_items WHERE invoice_line_id = invoice_lines.id AND pretax = 1),0) " +
            ") * " +
            "IFNULL(" +
            "(SELECT SUM(taxrate) FROM tax_line_items WHERE invoice_line_id = invoice_lines.id) /100" +
            ", 0) " +
            " ) " +
            " ), 2) from invoice_lines where invoice_id = invoices.id " +
            " ) " +
            " > " +
            " ( SELECT ROUND(IFNULL(SUM(amount),0), 2) FROM invoices_payments WHERE invoice_id = invoices.id) " +
            '  ) > 0 ' +
            ' and (select count(*) from payment_methods where lease_id = leases.id and auto_charge = 1 and type != "check"  ) > 0 ' +

            'order by leases.id desc';

        return connection.queryAsync(sql);
    },

    getVacancies(connection, company_id, conditions, params, count = false){
        if(count){
            var vacantSql =  "select count(DISTINCT(id)) as count from units where 1 = 1 ";
        } else {
            var vacantSql =  "select *, " +
                "(select address from addresses where addresses.id = units.address_id) as address, " +
                "(select city from addresses where addresses.id = units.address_id) as city, " +
                "(select state from addresses where addresses.id = units.address_id) as state, " +
                "(select zip from addresses where addresses.id = units.address_id) as zip " +
                " from units where 1 = 1 ";
        }

        if(conditions.property_id){
            vacantSql += " and units.property_id = " + connection.escape(conditions.property_id);
        }

        if(conditions.period == 6){
            vacantSql += " and id in (select unit_id from leases where status = 1 and start_date <= now() and ( end_date is not null and end_date > now() and end_date <= " + connection.escape(moment().add(conditions.period, 'months').format('YYYY-MM-DD')) + ")) ";
        } else if(conditions.period == 12) {
            vacantSql += " and id in (select unit_id from leases where status = 1 and start_date <= now() and ( end_date is not null and end_date > " + connection.escape(moment().add(6, 'months').format('YYYY-MM-DD')) + " and end_date <= " + connection.escape(moment().add(conditions.period, 'months').format('YYYY-MM-DD')) + ")) ";
        } else {
            vacantSql += " and id not in (select unit_id from leases where status = 1 and start_date <= now() and ( end_date is null or end_date > now())) ";
        }

        vacantSql += " and units.property_id in (select id from properties where company_id = " + connection.escape(company_id) + ")";

        if(params && !count){
            vacantSql += " limit " + connection.escape(params.offset) + ", " + connection.escape(params.limit);
        }

        return connection.queryAsync(vacantSql);

    },

    findVacancyBreakdown: function(connection, company_id, properties = []){

        var vacantSql =  "select count(DISTINCT(id)) as count from units where 1 = 1 and status = 1 and (available_date is null || available_date < CURDATE()) ";

        if(properties.length){
            vacantSql += " and units.property_id in  (" + properties.map(p => connection.escape(p)).join(', ') + ")";
        }

        vacantSql += " and id not in (select unit_id from leases where status = 1 and  start_date <= now() and ( end_date is null or end_date > now() ) ) and id in (select id from units where property_id in (select id from properties where company_id  = "+connection.escape(company_id) + ")) ";


        var SixMoSql =  "select count(DISTINCT(id)) as count from units where 1 = 1 and status = 1 and (available_date is null || available_date < CURDATE()) and id not in (select unit_id from leases  where status = 1 and start_date <= now() and ( end_date is not null and  end_date <= '" + moment().add(6, 'months').format('YYYY-MM-DD') + "')) ";

        if(properties.length){
            SixMoSql += " and units.property_id in  (" + properties.map(p => connection.escape(p)).join(', ') + ")";
        }

        SixMoSql += " and id in (select id from units where property_id in (select id from properties where company_id = "+connection.escape(company_id) + "))";



        var OverSixMoSql = "select count(DISTINCT(id)) as count from units where 1 = 1 and status = 1 and (available_date is null || available_date < CURDATE()) and id not in (select unit_id from leases where status = 1 and start_date <= now() and ( end_date is null or end_date > '" + moment().add(6, 'months').format('YYYY-MM-DD') + "' ) )" ;

        if(properties.length){
            OverSixMoSql += " and units.property_id in  (" + properties.map(p => connection.escape(p)).join(', ') + ")";
        }

        OverSixMoSql += " and id in (select id from units where property_id in (select id from properties where company_id  = '"+connection.escape(company_id) + "'))";

        var promises = [];

        promises.push(connection.queryAsync(vacantSql));
        promises.push(connection.queryAsync(SixMoSql));
        promises.push(connection.queryAsync(OverSixMoSql));


        return Promise.all(promises).mapSeries(function(r){
            return r[0].count;
        });

    },

    findVacancyByCategory: function(connection, company_id, properties){


        var vacantSql = "SELECT count(*) as count, category_id, (select sort from unit_categories where unit_categories.id = units.category_id) as sort FROM units WHERE 1 = 1";

      if(properties.length){
            vacantSql += " and units.property_id in (" + properties.map(p => connection.escape(p)).join(', ') + ")";
        }

        vacantSql += " and id not in (select unit_id from leases where status = 1 and start_date <= now() and (end_date is null or end_date > now()) ) and id in (select id from units where property_id in (select id from properties where company_id  = "+connection.escape(company_id) + " )) GROUP BY category_id, sort ORDER BY sort";

        return connection.queryAsync(vacantSql).mapSeries(r => {
            var totalSql ="SELECT category_id, count(*) as count, (select name from unit_categories where unit_categories.id = units.category_id) as category FROM units WHERE units.category_id = " + connection.escape(r.category_id);

            if(properties.length){
                totalSql += " and units.property_id in (" + properties.map(p => connection.escape(p)).join(', ') + ")";
            }

            return connection.queryAsync(totalSql).then(r2 => {
                r.category = r2[0].category;
                r.total = r2[0].count;
                return r;
            });
        });
    },


    /* TODO:  Make a little more nuanced -  only delete lease services, keep reservation, application details */
     deleteLease: async(connection, lease_id, company_id, admin_id) => {

        // await connection.queryAsync("DELETE FROM tax_line_items where invoice_line_id in (select id from invoice_lines where invoice_id in (select id from invoices where  lease_id = " + connection.escape(lease_id) + ")); ");
        // await connection.queryAsync("DELETE FROM discount_line_items where invoice_line_id in (select id from invoice_lines where invoice_id in (select id from invoices where  lease_id = " + connection.escape(lease_id) + ")); ");
        // await connection.queryAsync("DELETE FROM invoice_lines where invoice_id in (select id from invoices where  lease_id =  " + connection.escape(lease_id) + " )");

        // let inv_pays = await connection.queryAsync("SELECT *  FROM invoices_payments where invoice_id in (select id from invoices where lease_id = " + connection.escape(lease_id) + ")");

        // if(inv_pays.length){
        //   await connection.queryAsync("DELETE FROM invoices_payments where id in ( " + inv_pays.map(inv_pay => inv_pay.id ).join(', ') + ")");
        // }
        let facility_time = `(select CONVERT_TZ(now(),"+00:00",utc_offset) from properties where id =(select property_id from units where id = (select unit_id from leases where id = ${connection.escape(lease_id)})))`;

        await connection.queryAsync(`UPDATE invoices set status = -1, voided_at = now(), void_date = DATE(CONVERT_TZ(now() , "+00:00", (select utc_offset from properties where id = property_id))), voided_by_contact_id = ${connection.escape(admin_id)} where lease_id = ${connection.escape(lease_id)}`);
        //await connection.queryAsync("DELETE FROM payments where lease_id = " + connection.escape(lease_id));
        await connection.queryAsync("DELETE FROM leases_payment_methods where lease_id = " + connection.escape(lease_id));

        var serviceSQL = "update services set status = 0";
        if (connection?.meta?.contact_id) {
            serviceSQL += ",modified_by = " + connection.escape(connection.meta.contact_id);
        }
        serviceSQL += " where lease_id = " + connection.escape(lease_id);
        await connection.queryAsync(serviceSQL);
        
        await connection.queryAsync("DELETE FROM contact_leases where lease_id = " + connection.escape(lease_id));
        await connection.queryAsync("DELETE FROM uploads_leases where lease_id = " + connection.escape(lease_id));

        await connection.queryAsync("DELETE FROM submessages where maintenance_id in (select id from maintenance where lease_id = " + connection.escape(lease_id) + ")");
        await connection.queryAsync("DELETE FROM maintenance where lease_id = " + connection.escape(lease_id) );

        await connection.queryAsync("UPDATE leads set lease_id = null, status = 'active' where lease_id = " + connection.escape(lease_id));
        await connection.queryAsync("DELETE FROM checklist_leases where lease_id = " + connection.escape(lease_id));
        await connection.queryAsync("DELETE FROM lease_standing_events where lease_id = " + connection.escape(lease_id) );
        await connection.queryAsync("UPDATE leases set status = 0 where id = " + connection.escape(lease_id) );
        await connection.queryAsync("UPDATE reservations set expires = "+ facility_time +" where lease_id = " + connection.escape(lease_id) );
        await connection.queryAsync(`DELETE from lease_protected_property_items where lease_id = ${connection.escape(lease_id)}`);

        return;

    },

    async findLeaseConflict(connection, lease){

      var sql = " Select * from leases WHERE unit_id = " + connection.escape(lease.unit_id) + " and  ( " +
        " leases.status = 2 or " +
        " (leases.status = 1 and ( leases.end_date is null || leases.end_date > " + connection.escape(lease.start_date) + " )) or " +
        " (leases.status = 0 and id in (select lease_id from reservations where expires >  now() ))) ";

      if(lease.id){
        sql += " and leases.id != "  + connection.escape(lease.id);
      }

      return await connection.queryAsync(sql);

    },

    findLeaseReservation(connection, lease){

        var sql = "Select * from leases WHERE  ( leases.status > 0 ||  ( select id from reservations where reservations.lease_id = leases.id and expires > now() ) is not null ) ";

        if(lease.id){
            sql += " and leases.id != "  + connection.escape(lease.id);
        }
        return connection.queryAsync(sql, lease);
    },

    getTenantOnLease(connection, lease_id, contact_id){
        var sql = "Select * from contact_leases where lease_id = " + connection.escape(lease_id) +" and contact_id = "+ connection.escape(contact_id);


        return connection.queryAsync(sql);
    },

    findLedgerByLeaseId(connection, lease_id){
      var sql =
        "select id, number, `date`, 'Invoice' as description, (IFNULL(subtotal, 0) + IFNULL(total_tax,0) - IFNULL(total_discounts,0)) as charges, null as payments, IF( status <= 0, 0, (IFNULL(subtotal, 0) + IFNULL(total_tax,0) - IFNULL(total_discounts,0) - IFNULL(total_payments,0))) as balance, " +
        " IF( status <= 0, 'Void', IF( IFNULL(subtotal, 0) + IFNULL(total_tax,0) - IFNULL(total_discounts,0) = IFNULL(total_payments,0), 'Paid',  IF(`date` < CURDATE(), 'Past Due', 'Open'))) as status " +
        " from invoices where lease_id = " + connection.escape(lease_id) +
        " UNION " +
        " Select id, number,`date`, credit_type as description,  null as charges, amount as payments, 0 as balance, status_desc as status " +
        " from payments where status = 1 and credit_type in ('payment', 'credit') and id in (SELECT payment_id from invoices_payments where invoice_id in (select id from invoices where lease_id = " + connection.escape(lease_id) + ") ) order by date desc" ;

      return connection.queryAsync(sql)
    },

    findCompanyId(connection, lease_id){
        var sql = "Select company_id from properties where id = (select property_id from units where id = (select unit_id from leases where id = "+ connection.escape(lease_id) +"))";

        return connection.queryAsync(sql).then(function(companyRes){
            return companyRes[0] || null;
        });

    },

    findProperty(connection, lease_id){
        var sql = "Select * from properties where id = (select property_id from units where id = (select unit_id from leases where id = "+ connection.escape(lease_id) +"))";
        return connection.queryAsync(sql).then(res => res ? res[0]: null);

    },

    findMostOverdueInvoicesByCompany(connection, company_id){
        var sql = "select MIN(due) as due, lease_id from invoices where (select company_id from properties where properties.id = (select property_id from units where units.id = (select unit_id from leases where id = invoices.lease_id))) = " + connection.escape(company_id) + " and status > -1 and " + Sql.invoice_balance() + " > 0 group by lease_id ";

        return connection.queryAsync(sql)
    },

    async removeAutoCharges(connection, lease_id, payment_method_id){
        let lease_payment_methods_sql = `SELECT id FROM leases_payment_methods WHERE lease_id = ${connection.escape(lease_id)} AND deleted IS NULL;`;
        if(payment_method_id){
            lease_payment_methods_sql += ` and payment_method_id = ${connection.escape(payment_method_id)}`;
        }
        console.log("removeAutoCharges - lease_payment_methods_sql: ", lease_payment_methods_sql);

        let lpm_res = await connection.queryAsync(lease_payment_methods_sql);
        let lease_payment_method_id = (lpm_res.length > 0 && lpm_res[0].id) || null;

        if(!lease_payment_method_id)
            return null;

        let  delete_lease_payment_method_sql = `
            UPDATE leases_payment_methods 
            SET 
                deleted = NOW()
                ${connection.meta && connection.meta.contact_id ? `, deleted_by = ${connection.escape(connection.meta.contact_id)}` : ''}
            WHERE id = ${connection.escape(lease_payment_method_id)};
        `;
        console.log("removeAutoCharges - delete_lease_payment_method_sql: ", delete_lease_payment_method_sql);

        return await connection.queryAsync(delete_lease_payment_method_sql);
    },


    findAutoCharges(connection, lease_id, payment_method_id){

      var sql = "SELECT * from leases_payment_methods where lease_id = " +  connection.escape(lease_id) ;
      if(payment_method_id){
        sql += " and payment_method_id = " + connection.escape(payment_method_id)
      }

      return connection.queryAsync(sql);

    },

    saveStandingActivity(connection, start_standing_id, end_standing_id, lease_id){
      let data = {
        lease_id,
        start_standing_id,
        end_standing_id,
      }
      let sql = "INSERT INTO lease_standing_events set ? ";

      return connection.queryAsync(sql, data);
    },

    getDefaultStanding(connection, company_id){
      let sql = "Select * from lease_standings where type = 'default' and company_id = " + connection.escape(company_id);
      return connection.queryAsync(sql).then(r => r.length? r[0] : null);
    },

    findPinnedInteractions(connection, lease_id){
        var sql = "select * from interactions where pinned = true and contact_id in (select contact_id from contact_leases where lease_id =" +  connection.escape(lease_id) + ")";

        return connection.queryAsync(sql);

    },

    getLeaseMetrics(connection, lease_id, conditions = {}){
      let { date } = conditions;
      let sql =  "Select " +
                "(" + Sql.lease_lifetime_payments(lease_id) + ") as lifetime_payments, " +
                "(" + Sql.lease_paid_through_date(lease_id) + ") as paid_through_date, " +
                `(SELECT ROUND(IFNULL(SUM(total_payments),0), 2) from invoices where lease_id = ${lease_id} ${(date ? `and DATE(period_start) > '${date}'` : '')}) as prepaid_balance`;

      console.log("getLeaseMetrics - sql", sql);
      return connection.queryAsync(sql).then(r => r.length ? r[0] : null);
    },

    getVehicles(connection, lease_id) {
        const sql = `SELECT * from vehicles where lease_id = ${connection.escape(lease_id)} and deleted_at is NULL`;
        return connection.queryAsync(sql);
    },

    saveVehicle(connection, vehicle_data, vehicle_id) {
        let sql;

        if(vehicle_id){
            sql = "UPDATE vehicles set ? where id = " + connection.escape(vehicle_id);
        } else {
            sql = "INSERT INTO vehicles set ?";
        }

        return connection.queryAsync(sql, vehicle_data);
    },

    async killServicesDiscountsAndCheckList(connection, lease_id) {

        var deleteServicesSql = `DELETE from services where lease_id = ${connection.escape(lease_id)}`;
        await connection.queryAsync(deleteServicesSql);

        var deleteDiscountSql = `DELETE from discounts where lease_id = ${connection.escape(lease_id)}`;
        await connection.queryAsync(deleteDiscountSql);

        var deleteCheckListSql = `DELETE from checklist_leases where lease_id = ${connection.escape(lease_id)}`;
        await connection.queryAsync(deleteCheckListSql);
    },

    async removeToOverlockFromSpace(connection,lease_id) {
        let removeToOverlock = `Update leases set to_overlock = 0 where id = ${connection.escape(lease_id)}`;
        console.log("Remove to-overlock - sql", removeToOverlock);
        await connection.queryAsync(removeToOverlock);
    },

    findLatestRentInvoiceDueDate(connection, payload) {
        const { lease_id } = payload;

        const sql = `
            select max(i.due) as due_date from invoices i
            join invoice_lines il on i.id = il.invoice_id
            join products p on il.product_id = p.id
            where i.lease_id = ${connection.escape(lease_id)} and p.default_type = 'rent' and i.status != -1        
        `;

        return connection.queryAsync(sql).then(r => r.length ? r[0].due_date : null);
    },

    // get all moved out leases within a time period and ignoring transfer from leases
    async findMoveOuts(connection, company_id, searchParams, count) {
      if (!searchParams?.property_id?.length) {
        e.th(400, "property_id is required")
      }
      let sql = `SELECT ${count ? "count(*) AS count" : "l.*"} FROM leases l LEFT JOIN transfers t ON l.id = t.from_lease_id WHERE t.from_lease_id IS NULL AND l.status = 1 AND`
      if (searchParams.from_date) {
        sql += ` (l.end_date >= (${connection.escape(searchParams.from_date)})`
        if (searchParams.to_date) {
            sql += ` AND l.end_date <= (${connection.escape(searchParams.to_date)}))`
        } else if (searchParams.days) {
            sql += ` AND l.end_date <= (${connection.escape(searchParams.from_date)} + INTERVAL ${connection.escape(searchParams.days)} DAY))`
        } else {
            sql += ` AND l.end_date <= (CURRENT_DATE()))`
        }
      } else if (searchParams.days) {
        if (searchParams.to_date) {
            sql += ` (l.end_date >= (${connection.escape(searchParams.to_date)} - INTERVAL ${connection.escape(searchParams.days)} DAY) AND l.end_date <= (${connection.escape(searchParams.to_date)}))`
        } else {
            sql += ` (l.end_date >= (CURRENT_DATE() - INTERVAL ${connection.escape(searchParams.days)} DAY) AND l.end_date <= (CURRENT_DATE()))`
        }
      } else {
        sql += ` (l.end_date = CURRENT_DATE())`
      }

      sql += `AND l.unit_id IN  (SELECT id FROM units WHERE property_id IN (${connection.escape(searchParams.property_id)})) `
      sql += ` ORDER BY l.end_date DESC`
      if (!count && searchParams && searchParams.limit) {
        sql += ` LIMIT ${connection.escape(parseInt(searchParams.offset))},${connection.escape(parseInt(searchParams.limit))}`;
      }
      sql += ';'
      return connection.queryAsync(sql)
    },
    async findConciseMoveOutLeaseInfo(connection, company_id, searchParams) {
        if (!searchParams?.property_id?.length) {
            e.th(400, "property_id is required")
        }
        let sql = `
        SELECT     
            l.id,
            l.unit_id,
            l.start_date,
            l.end_date,
            u.property_id,
            DATE_FORMAT(r.time, "%Y-%m-%d") as reservation_date,
            (
                SELECT
                CASE WHEN EXISTS 
                (
                SELECT id FROM leases_payment_methods WHERE lease_id = l.id AND deleted IS NULL
                )
                THEN TRUE
                ELSE FALSE
            END as bool
            ) as has_autopay,
            (
                SELECT MAX(end_date) 
                from invoice_lines 
                where product_id 
                in (
                    select id 
                    from products 
                    where default_type = 'rent') 
                        and invoice_id in 
                        (
                            select id 
                            from invoices inv4  
                            where inv4.status = 1 
                                and lease_id = l.id 
                                and ( 
                                        IFNULL(subtotal,0) + IFNULL(total_tax,0) - IFNULL(total_discounts,0)
                                        -  
                                        ( 
                                            SELECT IFNULL(SUM(amount),0) 
                                            from invoices_payments_breakdown 
                                            where invoice_id = inv4.id 
                                                and date <= (
                                                    SELECT DATE(CONVERT_TZ(UTC_TIMESTAMP() , "+00:00", IFNULL(prop.utc_offset, "+00:00")))
                                                    )
                                        )
                                    ) = 0 
                        )
            ) as paid_through_date,
            (
                if((
                select
                    count(s1.id)
                from services s1 
                where s1.lease_id = l.id 
                    AND s1.start_date <= CURRENT_DATE() 
                    AND (
                            s1.end_date IS NULL 
                            OR s1.end_date <= CURRENT_DATE()
                        ) 
                    AND s1.product_id in (select id from products WHERE default_type = 'rent')
                    order by s1.id)>=2, 
                    (select
                        s1.start_date 
                    from services s1 
                    where s1.lease_id = l.id 
                    AND s1.start_date <= CURRENT_DATE() 
                    AND (
                            s1.end_date IS NULL 
                            OR s1.end_date <= CURRENT_DATE()
                        ) 
                    AND s1.product_id in (select id from products WHERE default_type = 'rent')
                    order by s1.start_date desc, s1.id desc limit 1)
                    , null)     
            ) as last_rent_raise,
            (
                select
                    s2.start_date
                from services s2
                where l.id = s2.lease_id 
                    AND s2.start_date > CURRENT_DATE()
                    AND s2.product_id in (select id from products WHERE default_type = 'rent')
                    order by s2.id asc limit 1
            ) as future_rent_raise,
            (
                select
                    s3.price 
                from services s3
                where l.id = s3.lease_id 
                    AND s3.start_date > CURRENT_DATE()
                    AND s3.product_id in (select id from products WHERE default_type = 'rent')
                    order by s3.id desc limit 1
            ) as future_rent_raise_amount,
            ifnull(
                    (
                        select s.price from services s where s.status = 1 and s.lease_id=l.id and s.product_id in (select id from products WHERE default_type = 'rent') and s.start_date <= CURRENT_DATE and (s.end_date is null or s.end_date > CURRENT_DATE) order by s.id DESC limit 1
                    ), l.rent
                ) 
            as rent
        FROM
            leases l
            LEFT JOIN transfers t ON l.id = t.from_lease_id 
            JOIN units u ON l.unit_id = u.id
            LEFT JOIN properties prop ON u.property_id = prop.id 
            LEFT JOIN reservations r ON l.id = r.lease_id
        WHERE
            t.from_lease_id IS NULL 
            AND l.status = 1 
            AND`
        if (searchParams.from_date) {
          sql += ` (l.end_date >= (${connection.escape(searchParams.from_date)})`
          if (searchParams.to_date) {
              sql += ` AND l.end_date <= (${connection.escape(searchParams.to_date)}))`
          } else if (searchParams.days) {
              sql += ` AND l.end_date <= (${connection.escape(searchParams.from_date)} + INTERVAL ${connection.escape(searchParams.days)} DAY))`
          } else {
              sql += ` AND l.end_date <= (CURRENT_DATE()))`
          }
        } else if (searchParams.days) {
          if (searchParams.to_date) {
              sql += ` (l.end_date >= (${connection.escape(searchParams.to_date)} - INTERVAL ${connection.escape(searchParams.days)} DAY) AND l.end_date <= (${connection.escape(searchParams.to_date)}))`
          } else {
              sql += ` (l.end_date >= (CURRENT_DATE() - INTERVAL ${connection.escape(searchParams.days)} DAY) AND l.end_date <= (CURRENT_DATE()))`
          }
        } else {
          sql += ` (l.end_date = CURRENT_DATE())`
        }

        sql += `AND l.unit_id IN  (SELECT id FROM units WHERE property_id IN (${connection.escape(searchParams.property_id)})) `
        sql += ` ORDER BY l.end_date DESC`
        if (searchParams && searchParams.limit) {
            sql += ` LIMIT ${connection.escape(parseInt(searchParams.offset))},${connection.escape(parseInt(searchParams.limit))}`;
        }
        sql += ';'
        return connection.queryAsync(sql)
      },

    getSecurityDepositLineForLease(connection, lease_id){
        let sql = `
            select ila.invoice_id, ip.payment_id, ila.invoice_payment_id, ila.invoice_line_id, sum(ila.amount) as amount, ip.amount as ip_amount from invoice_lines_allocation ila
                inner join invoice_lines il on il.id = ila.invoice_line_id
                inner join invoices_payments ip on ip.id = ila.invoice_payment_id
                inner join invoices i on i.id = il.invoice_id
                inner join products pr on pr.id = il.product_id
                inner join payments p on p.id = ip.payment_id
            where i.lease_id = ${connection.escape(lease_id)} 
                and pr.default_type = 'security' 
                and p.credit_type not in ('adjustment')
            group by ila.invoice_payment_id
        `;

        return connection.queryAsync(sql).then(r => r.length ? r : []);
    },

    getAllByPropertyId(connection, searchParams, property_id, count, standing = "all", leaseIds = []) {
        let leaseStanding = {
            "all" : ">= 0",
            "active": "= 1"
        }
        if (!leaseStanding[standing]){standing = "all"}

        let fields = `l.id,
                    l.unit_id,
                    l.start_date,
                    l.end_date,
                    l.bill_day,
                    l.notes,
                    l.status,
                    l.send_invoice,
                    l.security_deposit,
                    l.monthly,
                    l.code,
                    l.decline_insurance,
                    l.moved_out,
                    l.lease_standing_id,
                    l.insurance_exp_month,
                    l.insurance_exp_year,
                    l.auction_status,
                    (
                        SELECT ROUND(IFNULL(sum(inv2.subtotal + inv2.total_tax - inv2.total_discounts - inv2.total_payments), 0), 2)
                        FROM leases l2
                        INNER JOIN invoices inv2 ON l2.id = inv2.lease_id 
                        INNER JOIN units u ON u.id = l2.unit_id
                        INNER JOIN properties p ON p.id = u.property_id
                        WHERE inv2.status > 0 AND l2.id = l.id
                        AND inv2.due <= (SELECT DATE(CONVERT_TZ(UTC_TIMESTAMP() , "+00:00", IFNULL(p.utc_offset, "+00:00"))))
                        AND 
                            (
                                SELECT ROUND(SUM((qty * cost) + total_tax - total_discounts ),2) 
                                FROM invoice_lines 
                                WHERE invoice_id = inv2.id
                            )
                            > 
                            ( 
                                SELECT ROUND(IFNULL(SUM(amount),0), 2) 
                                FROM invoices_payments 
                                WHERE invoice_id = inv2.id
                            )
                        ) AS open_balance,
                        (
                        SELECT ROUND(IFNULL(sum(inv2.subtotal + inv2.total_tax - inv2.total_discounts - inv2.total_payments), 0), 2)
                        FROM leases l2
                        INNER JOIN invoices inv2 ON l2.id = inv2.lease_id 
                        INNER JOIN units u ON u.id = l2.unit_id
                        INNER JOIN properties p ON p.id = u.property_id
                        WHERE inv2.status > 0 AND l2.id = l.id
                        AND inv2.due < (SELECT DATE(CONVERT_TZ(UTC_TIMESTAMP() , "+00:00", IFNULL(p.utc_offset, "+00:00"))))
                        AND 
                            (
                                SELECT ROUND(SUM((qty * cost) + total_tax - total_discounts ),2) 
                                FROM invoice_lines 
                                WHERE invoice_id = inv2.id
                            )
                            > 
                            ( 
                                SELECT ROUND(IFNULL(SUM(amount),0), 2) 
                                FROM invoices_payments 
                                WHERE invoice_id = inv2.id
                            )
                        ) AS balance,
                    l.terms,
                    IFNULL((SELECT IF(status  = 'exempt', CAST(TRUE AS JSON), CAST(FALSE AS JSON)) FROM lease_rent_plan_settings lrps WHERE lrps.lease_id = l.id AND lrps.end_date IS NULL), CAST(FALSE AS JSON)) AS 'exempted',
                    IFNULL((
                            SELECT s.price
                            FROM services s
                            WHERE s.status = 1
                                AND s.lease_id = l.id
                                AND s.product_id IN (
                                    SELECT id
                                    FROM products
                                    WHERE default_type = 'rent'
                                    )
                                AND s.start_date <= CURRENT_DATE()
                                AND (
                                    s.end_date IS NULL
                                    OR s.end_date > CURRENT_DATE()
                                    )
                            ORDER BY s.id DESC LIMIT 1
                            ), l.rent) AS rent,
                    (
                        SELECT MAX(end_date)
                        FROM invoice_lines
                        WHERE product_id IN (
                                SELECT id
                                FROM products
                                WHERE default_type = 'rent'
                                )
                            AND invoice_id IN (
                                SELECT id
                                FROM invoices inv4
                                WHERE inv4.STATUS = 1
                                    AND lease_id = l.id
                                    AND (
                                        IFNULL(subtotal, 0) + IFNULL(total_tax, 0) - IFNULL(total_discounts, 0) - (
                                            SELECT IFNULL(SUM(amount), 0)
                                            FROM invoices_payments_breakdown
                                            WHERE invoice_id = inv4.id
                                                AND DATE <= (
                                                    SELECT DATE (CONVERT_TZ(UTC_TIMESTAMP(), "+00:00", IFNULL(p.utc_offset, "+00:00")))
                                                    )
                                            )
                                        ) = 0
                                )
                        ) AS rent_paid_through,
                    IFNULL((
                            SELECT JSON_OBJECT('id', id, 'name', name, 'sort', sort, 'type', type, 'status', status, 'color', color, 'overlock', overlock, 'deny_access', deny_access)
                            FROM lease_standings
                            WHERE id = l.lease_standing_id
                            ), JSON_OBJECT('name', 'Current')) AS 'Standing',
                    JSON_OBJECT('id', u.id, 'property_id', u.property_id, 'label', u.label, 'number', u.number, 'type', u.type, 'price', (
                            SELECT IFNULL((
                                        SELECT upc.price
                                        FROM unit_price_changes upc
                                        WHERE upc.unit_id = u.id
                                            AND DATE (upc.created) <= CURRENT_DATE()
                                        ORDER BY upc.id DESC limit 1
                                        ), IFNULL((
                                            SELECT upcs.set_rate
                                            FROM unit_price_changes upcs
                                            WHERE upcs.unit_id = u.id
                                                AND DATE (upcs.created) <= CURRENT_DATE()
                                            ORDER BY upcs.id DESC limit 1
                                            ), u.price))
                            )) AS 'Unit',
                    JSON_OBJECT('lifetime_payments', (
                            SELECT IFNULL(SUM(amount), 0)
                            FROM invoices_payments
                            WHERE invoice_id IN (
                                    SELECT id
                                    FROM invoices
                                    WHERE lease_id = l.id
                                    )
                                AND payment_id IN (
                                    SELECT id
                                    FROM payments p
                                    WHERE p.STATUS = 1
                                        AND p.credit_type = 'payment'
                                    )
                            ), 'paid_through_date', (
                            SELECT MAX(end_date)
                            FROM invoice_lines
                            WHERE product_id IN (
                                    SELECT id
                                    FROM products
                                    WHERE default_type = 'rent'
                                    )
                                AND invoice_id IN (
                                    SELECT id
                                    FROM invoices inv4
                                    WHERE inv4.STATUS = 1
                                        AND lease_id = l.id
                                        AND (
                                            IFNULL(subtotal, 0) + IFNULL(total_tax, 0) - IFNULL(total_discounts, 0) - (
                                                SELECT IFNULL(SUM(amount), 0)
                                                FROM invoices_payments_breakdown
                                                WHERE invoice_id = inv4.id
                                                    AND DATE <= (
                                                        SELECT DATE (CONVERT_TZ(UTC_TIMESTAMP(), "+00:00", IFNULL(p.utc_offset, "+00:00")))
                                                        )
                                                )
                                            ) = 0
                                    )
                            ), 'prepaid_balance', (
                            SELECT ROUND(IFNULL(SUM(total_payments), 0), 2)
                            FROM invoices
                            WHERE lease_id = l.id
                                AND STATUS = 1
                                AND DATE (period_start) > (
                                    SELECT DATE (CONVERT_TZ(UTC_TIMESTAMP(), "+00:00", IFNULL(p.utc_offset, "+00:00")))
                                    )
                            ), 'has_autopay', (
                            SELECT CASE 
                                    WHEN EXISTS (
                                            SELECT id
                                            FROM leases_payment_methods
                                            WHERE lease_id = l.id
                                                AND deleted IS NULL
                                            )
                                        THEN CAST(TRUE AS JSON)
                                    ELSE CAST(FALSE AS JSON)
                                    END AS bool
                            )) AS 'Metrics' `

        if (standing === "active") {
            let createdBy = `IFNULL((SELECT Json_object( 'id', c.id, 'salutation', c.salutation, 'first', c.first, 'middle', c.middle, 'last', c.last, 'suffix', c.suffix, 'email', c.email, 'company', c.company, 'dob', c.dob, 'ssn', c.ssn, 'gender', c.gender, 'driver_license', c.driver_license, 'active_military', c.active_military, 'military_branch', c.military_branch, 'source', c.source, 'status', c.status ) from contacts c WHERE c.id = l.created_by ), JSON_OBJECT() ) AS CreatedBy`

            let totalRentRaise = `(SELECT COUNT(id) FROM lease_rent_changes lrc WHERE lrc.lease_id = l.id AND lrc.effective_date <= CURRENT_DATE() AND lrc.status = 'deployed' AND lrc.service_id IS NOT NULL) AS total_rent_raises`

            let moveInRent = `(SELECT price FROM services s WHERE s.lease_id = l.id AND s.status = 1 AND product_id IN (SELECT id FROM products WHERE default_type='rent') ORDER BY start_date ASC LIMIT 1) AS move_in_rent`

            let lastRentRaise = ` (IF(( SELECT count(s1.id) FROM services s1 WHERE s1.lease_id = l.id AND s1.start_date <= CURRENT_DATE() AND ( s1.end_date IS NULL OR s1.end_date <= CURRENT_DATE() ) AND s1.product_id in (select id FROM products WHERE default_type = 'rent') ORDER BY s1.id)>=2, (SELECT s1.start_date FROM services s1 WHERE s1.lease_id = l.id AND s1.start_date <= CURRENT_DATE() AND ( s1.end_date IS NULL OR s1.end_date <= CURRENT_DATE() ) AND s1.product_id IN (select id FROM products WHERE default_type = 'rent') ORDER BY s1.start_date desc, s1.id desc limit 1) , null) ) AS last_rent_raise`

            let reservationDate = `(SELECT DATE_FORMAT(time, '%Y-%m-%d') FROM reservations r WHERE r.lease_id = l.id ORDER BY created desc limit 1) AS reservation_date`

            let futureRentRaise = `(SELECT DATE(lrc.effective_date) FROM lease_rent_changes lrc WHERE
                    lrc.lease_id = l.id AND lrc.deleted_at IS NULL AND lrc.status NOT IN ('cancelled', 'skipped') AND lrc.effective_date > CURRENT_DATE() ORDER BY effective_date ASC LIMIT 1) AS future_rent_raise`
            let futureRentRaiseAmount = `(SELECT lrc.new_rent_amt FROM lease_rent_changes lrc WHERE
                    lrc.lease_id = l.id AND lrc.deleted_at IS NULL AND lrc.status NOT IN ('cancelled', 'skipped') AND lrc.effective_date > CURRENT_DATE() ORDER BY effective_date ASC LIMIT 1) AS  future_rent_raise_amount`

            let lastPaymentDate = `( SELECT DATE_FORMAT(p.date, '%Y-%m-%d') FROM payments p WHERE p.id IN ( SELECT payment_id FROM invoices_payments ip WHERE ip.amount > 0 AND ip.invoice_id IN ( SELECT id FROM invoices i WHERE i.lease_id = l.id AND i.voided_at IS NULL ) ) AND p.status = 1 ORDER BY p.created DESC, p.id DESC LIMIT 1 ) AS last_payment_date`

            let documentPending = `( SELECT CASE WHEN EXISTS ( SELECT 1 FROM uploads_signers us WHERE us.upload_id IN ( SELECT ul.upload_id FROM uploads_leases ul WHERE ul.lease_id = l.id ) AND us.signed IS NULL ) THEN CAST(TRUE AS JSON) ELSE CAST(FALSE AS JSON) END ) AS documents_pending`

            let payment_cycle = `(SELECT l.payment_cycle) AS payment_cycle`
            fields += `,${payment_cycle} ,${createdBy}, ${totalRentRaise}, ${moveInRent}, ${lastRentRaise}, ${reservationDate}, ${futureRentRaise}, ${futureRentRaiseAmount}, ${lastPaymentDate}, ${documentPending}`
        }
        let sql = `SELECT ${count ? "COUNT(*) AS count" : fields} FROM leases l JOIN units u ON l.unit_id = u.id AND l.status ${leaseStanding[standing]} JOIN properties p ON p.id = u.property_id AND p.id IN ( ${connection.escape(property_id)})`
        if (leaseIds?.length) {
            sql += ` AND l.id IN ( ${connection.escape(leaseIds)})`
        }
        sql += ' ORDER BY l.start_date DESC, l.id'

        if (searchParams?.limit && !count) {
            sql += ` LIMIT ${connection.escape(parseInt(searchParams.offset))},${connection.escape(parseInt(searchParams.limit))}`;
        }

        sql += ';'
        return connection.queryAsync(sql)

    },

    getContacts(connection, payload) {
        const { lease_id, is_primary } = payload; 
        
        let sql = `select * from contact_leases cl where cl.lease_id = ${lease_id}`;
        if(is_primary) {
            sql += ` and cl.primary = 1`;
        }

        return connection.queryAsync(sql);
    },
    
    /**
     * It returns rent change details for a give lease
     * @param connection - the connection to the database
     * @param type {String} - if future then rent change details for future returned else current rent change is returned
     * @returns Rent change details
     */
    getRentRaiseDetails(connection, lease_id, type){
        let sql = `
            SELECT
                lrc.lease_id,
                DATE(lrc.effective_date) AS rent_raise_date,
                lrc.new_rent_amt AS rent_change_amount
            FROM lease_rent_changes lrc
            WHERE
                lrc.lease_id = ${connection.escape(lease_id)} AND
                lrc.deleted_at IS NULL AND
                lrc.status NOT IN ('cancelled', 'skipped')
        `

        if (type === "future") {
            sql += ` AND lrc.effective_date > CURRENT_DATE() ORDER BY lrc.effective_date ASC LIMIT 1`
        } else {
            sql += ` AND lrc.effective_date <= CURRENT_DATE() ORDER BY lrc.effective_date DESC LIMIT 1`
        }
        return connection.queryAsync(sql)
    },

    /**
     * It returns the first rent for a given lease
     * @param connection - the connection to the database
     * @param lease_id - the id of the lease
     * @returns The first rent price for the lease.
     */
    getMoveInRent(connection, lease_id) {
        let sql = `SELECT price FROM services WHERE lease_id = ${lease_id} AND status = 1 AND product_id IN (SELECT id FROM products WHERE default_type='rent') ORDER BY start_date ASC LIMIT 1;`;
        return connection.queryAsync(sql);
    },

    /**
     * It returns the last two rent services for a given lease_id
     */
     getPastRentRaise(connection, lease_id) {
        let sql = `SELECT id,  start_date, price, end_date FROM services WHERE status = 1 and lease_id = ${lease_id} AND product_id IN (SELECT id FROM products WHERE default_type = 'rent') AND start_date <= CURRENT_DATE() AND (end_date IS NULL OR end_date <= CURRENT_DATE()) ORDER BY start_date DESC, id DESC limit 2;`
        return connection.queryAsync(sql);
    },
    findConciseLeaseInfo(connection, company_id, searchParams) {
        let status = {
            "all": "",
            "inactive": " AND end_date < CURRENT_DATE()",
            "future": " AND start_date > CURRENT_DATE()",
            "active": " AND start_date <= CURRENT_DATE() AND (end_date >= CURRENT_DATE OR end_date is null)"
        }
        let sql =  `
            SELECT     
            l.id,
            l.unit_id,
            l.start_date,
            l.end_date,
            IFNULL(
                (SELECT IF(lrps.status  = 'exempt', CAST(TRUE AS JSON), CAST(FALSE AS JSON)) FROM lease_rent_plan_settings lrps WHERE lrps.lease_id = l.id AND lrps.end_date IS NULL),
                CAST(FALSE AS JSON)
            ) AS 'exempted',
            u.property_id,
            DATE_FORMAT(r.time, "%Y-%m-%d") as reservation_date,
            (
                SELECT
                CASE WHEN EXISTS 
                (
                SELECT id FROM leases_payment_methods WHERE lease_id = l.id AND deleted IS NULL
                )
                THEN TRUE
                ELSE FALSE
              END as bool
          ) as has_autopay,
            (
                SELECT MAX(end_date) 
                from invoice_lines 
                where product_id 
                in (
                    select id 
                    from products 
                    where default_type = 'rent') 
                        and invoice_id in 
                        (
                            select id 
                            from invoices inv4  
                            where inv4.status = 1 
                                and lease_id = l.id 
                                and ( 
                                        IFNULL(subtotal,0) + IFNULL(total_tax,0) - IFNULL(total_discounts,0)
                                        -  
                                        ( 
                                            SELECT IFNULL(SUM(amount),0) 
                                            from invoices_payments_breakdown 
                                            where invoice_id = inv4.id 
                                                and date <= (
                                                    SELECT DATE(CONVERT_TZ(UTC_TIMESTAMP() , "+00:00", IFNULL(prop.utc_offset, "+00:00")))
                                                    )
                                        )
                                    ) = 0 
                        )
            ) as paid_through_date,
            (
                if((
                select
                    count(s1.id)
                from services s1 
                where s1.lease_id = l.id 
                    AND s1.start_date <= CURRENT_DATE() 
                    AND (
                            s1.end_date IS NULL 
                            OR s1.end_date <= CURRENT_DATE()
                        ) 
                    AND s1.product_id in (select id from products WHERE default_type = 'rent')
                    order by s1.id)>=2, 
                    (select
                        s1.start_date 
                    from services s1 
                    where s1.lease_id = l.id 
                    AND s1.start_date <= CURRENT_DATE() 
                    AND (
                            s1.end_date IS NULL 
                            OR s1.end_date <= CURRENT_DATE()
                        ) 
                    AND s1.product_id in (select id from products WHERE default_type = 'rent')
                    order by s1.start_date desc, s1.id desc limit 1)
                    , null)     
            ) as last_rent_raise,
            (
                SELECT
                    DATE(lrc.effective_date)
                FROM lease_rent_changes lrc
                WHERE
                    lrc.lease_id = l.id AND
                    lrc.deleted_at IS NULL AND
                    lrc.status NOT IN ('cancelled', 'skipped') AND
                    lrc.effective_date > CURRENT_DATE()
                ORDER BY effective_date ASC
                LIMIT 1
            ) AS future_rent_raise,
            (
                SELECT
                    lrc.new_rent_amt
                FROM lease_rent_changes lrc
                WHERE
                    lrc.lease_id = l.id AND
                    lrc.deleted_at IS NULL AND
                    lrc.status NOT IN ('cancelled', 'skipped') AND
                    lrc.effective_date > CURRENT_DATE()
                ORDER BY effective_date ASC
                LIMIT 1
            ) AS future_rent_raise_amount,
            ifnull(
                    (
                        select s.price from services s where s.status = 1 and s.lease_id=l.id and s.product_id in (select id from products WHERE default_type = 'rent') and s.start_date <= CURRENT_DATE and (s.end_date is null or s.end_date > CURRENT_DATE) order by s.id DESC limit 1
                    ), l.rent
                ) 
            as rent
        FROM
            leases l
            JOIN units u ON l.unit_id = u.id
            LEFT JOIN properties prop ON u.property_id = prop.id 
            LEFT JOIN reservations r ON l.id = r.lease_id
        WHERE
            l.status = 1
            AND l.unit_id IN  (SELECT id FROM units WHERE property_id IN
        `
        if (searchParams.property_id) {
            sql += `(${connection.escape(searchParams.property_id)}))`
        } else {
            sql += `(SELECT id FROM properties WHERE company_id = ${company_id}))`
        }
        if (searchParams.from_date) {
            let toDate = searchParams.to_date || moment.utc().format('YYYY-MM-DD')
            if (searchParams.status === "future") {
                sql += ` AND ((start_date >= ${connection.escape(searchParams.from_date)} AND start_date <= ${connection.escape(toDate)}) OR start_date > CURRENT_DATE())`
            } else {
                sql += ` AND start_date >= ${connection.escape(searchParams.from_date)} AND start_date <= ${connection.escape(toDate)}`
            }
        }
        sql += `${status[searchParams.status]} ORDER BY start_date desc, id`

        if (searchParams && searchParams.limit) {
            sql += ` LIMIT ${connection.escape(parseInt(searchParams.offset))},${connection.escape(parseInt(searchParams.limit))}`;
        }
        return connection.queryAsync(sql).then(function (leasesRes) {
            if (!leasesRes.length) return [];
            return leasesRes;

        }).catch(function (err) {
            console.log(err);
            return [];
        });
    },

    getFutureUnpaidInvoicesByLease(connection, lease_id, date = ''){
        date = date ? date : moment().format('YYYY-MM-DD');
        let query = `
            SELECT * 
            FROM invoices 
            WHERE lease_id = ${connection.escape(lease_id)}
                and status > 0
                and due > ${connection.escape(date)}
                and total_payments = 0
                and void_date IS NULL
                and voided_at IS NULL
                and voided_by_contact_id IS NULL;`

        console.log('getFutureUnpaidInvoicesByLease - sql', query);

        return connection.queryAsync(query).then(invoicesRes => invoicesRes?.length ? invoicesRes : []);
    },

    getStoredContents(connection, lease_id){
        let query = `
            SELECT
                lsc.id,
                sc.name,
                lsc.value
            FROM
                lease_stored_contents AS lsc
                INNER JOIN stored_contents AS sc ON lsc.stored_content_id = sc.id
            WHERE
                lsc.lease_id = ${connection.escape(lease_id)}
                AND lsc.deleted_at IS NULL
            ORDER BY
                sc.name ASC;`;
        
        return connection.queryAsync(query).then(r => r.length ? r : []);
    },

    saveValuePrice: async function(connection, data,){
        let sql; 
        sql = "Select * from lease_value_pricing where lease_id = " + connection.escape(data.lease_id);
        let leaseValuePrice = await connection.queryAsync(sql).then(lease_id => lease_id.length > 0 ? true : false);

        if (!leaseValuePrice){
            sql = "INSERT INTO lease_value_pricing set ?";
            console.log("saveValuePrice sql", sql.replace(/(\r\n|\n|\r)/gm, ""))
            return await connection.queryAsync(sql, data);
        }
    },
    
    findInvoicesByLeasesId: async function(connection, lease_id){
        let sql = `Select * from invoices where lease_id = ${lease_id} and status = 1;`;
        return connection.queryAsync(sql)
    },
    getPaymentCycle(connection, payload) {
        const { lease_id, date } = payload

        let sql = `
            select * from leases_payment_cycles lpc
            where 
                lpc.lease_id = ${lease_id}
                and (${connection.escape(date)} between lpc.start_date and lpc.end_date)
                and lpc.deleted_at is null;        
        `;

        return connection.queryAsync(sql);
    },
    getActivePaymentCycle: async (connection, date, lease_id) => {
        

        // GET the payment cycle associated with the most recent invoice.  Also must be after the date passed in. 
        let sql = `SELECT * from leases_payment_cycles where
            end_date >= (select MAX(due) from invoices where lease_id = ${connection.escape(lease_id)}) and 
            end_date > ${connection.escape(date)} and 
            start_date <= (select MAX(due) from invoices where lease_id = ${connection.escape(lease_id)}) and 
            deleted_at is null and 
            lease_id = ${connection.escape(lease_id)} 
            order by start_date DESC limit 1`;

        console.log('getActivePaymentCycle - sql', sql);
    
        let payment_cycle = await connection.queryAsync(sql);
        return payment_cycle.length ? payment_cycle[0] : null
    }, 
    getActivePaymentCyclesFromDateOnward: async (connection, date, lease_id) => {

        // GET the payment cycle associated with the lease
        let sql = `
            SELECT * 
            from leases_payment_cycles 
            where
                ( (date(${connection.escape(date)}) between date(start_date) and date(end_date) ) or date(start_date) >= ${connection.escape(date)} ) 
                and deleted_at is null and lease_id = ${connection.escape(lease_id)} 
            order by start_date ASC`;
    
        console.log('getActivePaymentCyclesFromDateOnward - sql', sql);
        let payment_cycles = await connection.queryAsync(sql);
        return payment_cycles?.length ? payment_cycles : null;
    }, 
    async savePaymentCycle(connection, data){

        var sql = "INSERT INTO leases_payment_cycles set ? ";

        let result = await  connection.queryAsync(sql, data)
        return result.insertId;
    
    }, 
    
    getPaymentCyclesForReversion: async (connection, date, property_id, lease_id) =>{
        let sql = `SELECT * 
            FROM leases_payment_cycles 
            WHERE 1 = 1 AND `;

        if(lease_id){
            sql += `  lease_id = ${connection.escape(lease_id)} AND ` 

        } 

        sql += ` pay_by_date < ${connection.escape(date)} AND 
                 end_date > ( SELECT MIN(due) from invoices WHERE 
                    leases_payment_cycles.lease_id = invoices.lease_id AND
                    IFNULL(subtotal, 0) + IFNULL(total_tax,0) - IFNULL(total_discounts,0) - IFNULL(total_payments,0)  AND 
                    id in (select invoice_id from invoice_lines where product_id in (select id from products where default_type = 'rent')) 
                    )
            GROUP BY lease_id
            ORDER BY start_date ASC`;
            console.log("getPaymentCyclesForReversion", sql)
            return connection.queryAsync(sql);

    }, 

    removePaymentCycle: async (connection, date, lease_id, delete_discount)=> {
        let discount_results;
        if(delete_discount){
            let discount_sql = `SELECT * from discounts where id in (select discount_id from leases_payment_cycles where end_date >= ${connection.escape(date)} and lease_id = ${connection.escape(lease_id)} )`;

            discount_results = await connection.queryAsync(discount_sql);
            
        }

        let sql = ` UPDATE leases_payment_cycles set deleted_at = NOW() `;
        if(delete_discount){
            sql += `, discount_id = null `
        }
        sql += ` where end_date >= ${connection.escape(date)} and lease_id = ${connection.escape(lease_id)} and deleted_at IS NULL`;

        console.log("removePaymentCycle-sql", sql);
        await connection.queryAsync(sql);


        if(delete_discount && discount_results.length){
            let discount_sql = `DELETE from discounts where id in (${discount_results.map(d => connection.escape(d.id)) })`; 
            await connection.queryAsync(discount_sql);
        }

        

    }, 

    
    
    findMoveInData: async (connection, lease_id)=> {
        let sql = `
            SELECT 
                JSON_OBJECT(
                    'value_tier', pvptc.label,
                    'sell_rate', lvp.sell_rate,
                    'set_rate', lvp.set_rate,
                    'offer_rent', l.rent,
                    'offer_sell_variance', (l.rent - lvp.sell_rate),
                    'offer_sell_variance_percent', (ROUND(((l.rent - lvp.sell_rate)*100 / lvp.sell_rate), 2)),
                    'offer_set_variance', (l.rent - lvp.set_rate),
                    'offer_set_variance_percent', (ROUND(((l.rent - lvp.set_rate)*100 / lvp.set_rate), 2))
                ) as move_in_data
            FROM lease_value_pricing lvp 
            JOIN leases l ON l.id = lvp.lease_id 
            JOIN units u ON u.id = l.unit_id 
            JOIN property_value_price_tier_configurations pvptc ON pvptc.property_id = u.property_id AND pvptc.tier_type = lvp.tier_type 
            WHERE lvp.lease_id = ${connection.escape(lease_id)}
        `; 
        let result = await connection.queryAsync(sql);

        return (result.length && result?.[0]?.move_in_data) || null;
    },

    findUnitLeaseData: function (connection, lease_id) {
        let sql = `
        SELECT 
            l.id,
            l.unit_id,
            l.bill_day,
            u.number,
            TRIM(CONCAT_WS(' ', NULLIF(TRIM(COALESCE(c.first, '')), ''), NULLIF(TRIM(COALESCE(c.middle, '')), ''), NULLIF(TRIM(COALESCE(c.last, '')), '') )) AS tenant_name,
            cl.contact_id AS contact_id,
            IF(lrps.status = 'exempt', true, false) AS exempted,
            (
                SELECT MAX(il.end_date)
                FROM invoices i
                JOIN invoice_lines il ON i.id = il.invoice_id
                WHERE
                    il.product_id IN (
                        SELECT id
                        FROM products p
                        WHERE p.default_type = 'rent'
                    ) AND
                    i.lease_id = l.id AND
                    (
                        IFNULL(i.subtotal, 0) +
                        IFNULL(i.total_tax, 0) -
                        IFNULL(i.total_discounts, 0) -
                        (
                            SELECT IFNULL(SUM(amount), 0)
                            from invoices_payments ip
                            where
                            ip.invoice_id = i.id
                        )
                    ) = 0
            ) AS prepay_paid_upto,
            l.auction_status
        FROM leases l
        JOIN contact_leases cl ON l.id = cl.lease_id
        JOIN contacts c ON cl.contact_id = c.id
        JOIN units u ON u.id = l.unit_id
        LEFT JOIN lease_rent_plan_settings lrps ON l.id = lrps.lease_id AND lrps.end_date IS NULL
        WHERE l.id = ${connection.escape(lease_id)}
        `;
        return connection.queryAsync(sql).then(function (leasesRes) {
            if (!leasesRes.length) return null;
            return leasesRes[0];
        });
    },

    checkExemptStatusForLease: (connection, lease_id)=> {
        let sql = `
            SELECT EXISTS(
                SELECT id
                FROM lease_rent_plan_settings
                WHERE end_date IS NULL AND status = 'exempt' 
                AND lease_id = ${connection.escape(lease_id)}
            ) AS exempt
        `;
        return connection.queryAsync(sql).then((res) => (res?.length ? !!res[0]?.exempt : false));
    },

    removeDiscountAndPaymentCycle: async (connection, date, lease_id, discount_ids_to_delete = [])=> {
        let base_sql = ` UPDATE leases_payment_cycles set deleted_at = NOW() `;
        let last_sql = ` end_date >= ${connection.escape(date)} and lease_id = ${connection.escape(lease_id)} and deleted_at is null`;
        let delete_discounts_and_pc_sql = null, delete_pc_sql = null;
        if (discount_ids_to_delete.length > 0) {
            let mid_sql1 = `, discount_id = null where discount_id in (${discount_ids_to_delete.map(d_id => connection.escape(d_id)).join(', ')}) and`;
            delete_discounts_and_pc_sql = `${base_sql} ${mid_sql1} ${last_sql}`;
            console.log('removeDiscountAndPaymentCycle SQL-1', delete_discounts_and_pc_sql);

            let mid_sql2 = ` where discount_id not in (${discount_ids_to_delete.map(d_id => connection.escape(d_id)).join(', ')}) and`;
            delete_pc_sql = `${base_sql} ${mid_sql2} ${last_sql}`;
            console.log('removeDiscountAndPaymentCycle SQL-2', delete_pc_sql);
        } else {
            delete_pc_sql = `${base_sql} where ${last_sql}`;
            console.log('removeDiscountAndPaymentCycle SQL-2', delete_pc_sql);
        }

        if (delete_discounts_and_pc_sql)
            await connection.queryAsync(delete_discounts_and_pc_sql);

        if (delete_pc_sql)
            await connection.queryAsync(delete_pc_sql);
    },

};

