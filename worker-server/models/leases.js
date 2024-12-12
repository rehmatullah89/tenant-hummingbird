var settings    = require(__dirname + '/../config/settings.js');

var moment = require('moment');
var Promise         = require('bluebird');

var Sql             = require(__dirname + '/../modules/sql_snippets.js');


let Lease = {

    canAccess(connection, lease_id, company_id){

        var sql = "select * from properties where id = (select property_id from units where id = (select unit_id from leases where id = " + connection.escape(lease_id) + "))";

        return connection.queryAsync(sql).then(function(propertyResult){
            if(!propertyResult.length) return false;
            var property = propertyResult[0];
            return property.company_id == company_id;
        })
    },

    getPaidThroughDate(connection, id, date){
        date = date || moment().format('YYYY-MM-DD');
        let sql = "SELECT MAX(end_date) as end_date from invoice_lines where product_id in (select id from products where default_type = 'rent') and invoice_id in (select id from invoices i  where i.status = 1 and lease_id = " + id  + " and ( IFNULL(subtotal,0) + IFNULL(total_tax,0) - IFNULL(total_discounts,0) -  ( SELECT IFNULL(SUM(amount),0) from invoices_payments where invoice_id = i.id and date <= '" + date + "')) = 0 )";

        console.log("sqlsqlsqlsqlsql", sql);
        return connection.queryAsync(sql).then(res => res.length ? res[0] : null);
    },


    findCurrentByUnitId: function(connection, unit_id, date){
        var _this = this;

        var d = date? moment(date, 'YYYY-MM-DD') : moment();


        var unitSql = "Select * from leases where " +
            " unit_id = " + connection.escape(unit_id) + " and " +
            " start_date <= '" + d.format('YYYY-MM-DD') + "' and " +
            " ( end_date >= '" + d.format('YYYY-MM-DD') + "' or end_date is null ) and " +
            " ( status > 0 or ( select id from reservations where reservations.lease_id = leases.id and expires > now() ) is not null ) " +
            " limit 1 ";
 
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
            " month(due) = '" + moment().format('MM') + "' and " +
            " year(due) = '" + moment().format('YYYY') + "' " +
            " order by due desc limit 1";

        return connection.queryAsync(invoiceSql).then(function(res){
            if(res.length) return true;
            return false;
        })
    },

    searchByCompanyId: function(connection, company_id, search, sort, limit, offset, count){

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


        if(search.address || search.rent || search.balance || search.lease_start.date || search.lease_end.date ){
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

        if(search.lease_start.date){
            if(search.lease_start.timeframe == "Before"){
                sql += " and leases.start_date <= "  + connection.escape(moment(search.lease_start.date).format('YYYY-MM-DD'));
            } else if (search.lease_start.timeframe == "After"){
                sql += " and leases.start_date >= "  + connection.escape(moment(search.lease_start.date).format('YYYY-MM-DD'));
            }
        }

        if(search.lease_end.date){
            if(search.lease_end.timeframe == "Before"){
                sql += " and leases.end_date <= "  + connection.escape(moment(search.lease_end.date).format('YYYY-MM-DD'));
            } else if (search.lease_end.timeframe == "After"){
                sql += " and (leases.end_date is null or leases.end_date >= "  + connection.escape(moment(search.lease_end.date).format('YYYY-MM-DD')) + ")";
            }
        }

        if(sort != null && sort.length){
            var field;

            var sortpart = '';
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
            " start_date <= '" + moment().format('YYYY-MM-DD') + " 00:00:00' and " +
            " ( end_date >= '" + moment().format('YYYY-MM-DD') + " 23:59:59' or end_date is null ) ";

        if(searchParams){
            unitSql +=  " limit " + connection.escape(parseInt(searchParams.offset)) + ", " + connection.escape(parseInt(searchParams.limit));

        }

        return connection.queryAsync(unitSql);

    },

    findAllByUnitId:function(connection, unit_id){
        var unitSql = "Select * from leases where unit_id = " + connection.escape(unit_id) + " and end_date >= '" + moment().format('YYYY-MM-DD') + " 00:00:00' ";

        return connection.queryAsync(unitSql);

    },

    findActiveByUnitId:function(connection, unit_id){
        var unitSql = "Select * from leases where unit_id = " + connection.escape(unit_id) + " and ( end_date >= '" + moment().format('YYYY-MM-DD') + " 00:00:00' or end_date is null )";

        return connection.queryAsync(unitSql);

    },

    findById:function(connection, lease_id, contain, models){

        var _this = this;

        var leaseSql = "Select * from leases where id = " + connection.escape(lease_id);

        return connection.queryAsync(leaseSql).then(function(leasesRes){
            if(!leasesRes.length) return null;
	        var lease = leasesRes[0];
            return lease;
           // return _this.getContainFields(connection, lease, contain, models);
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

    findByContactId:function(connection, contact_id, company_id, property_id){
        var leaseUserSql = "Select * from leases where status > 0 and id in (select lease_id from contact_leases where contact_id = " +  connection.escape(contact_id) + ") ";

        if(company_id) {
            leaseUserSql += " and unit_id in (select id from units where property_id in (select id from properties where company_id = "+ connection.escape(company_id) + ")) ";

        }

        if(property_id) {
            leaseUserSql += " and unit_id in (select id from units where property_id = " + connection.escape(property_id) + ") ";
        }
        
        return connection.queryAsync(leaseUserSql);
    },

    save: function(connection, data, lease_id){
        var sql;
        if(lease_id){
            sql = "UPDATE leases set ? where id = " + connection.escape(lease_id);
        } else {
            sql = "INSERT INTO leases set ?";
        }
        console.log(connection.format(sql, data));
        return connection.queryAsync(sql, data);
    },

    findByCompanyId: function(connection, company_id){
        var lease;
        var leaseSql = "SELECT * FROM leases WHERE start_date < now() and end_date >now() and unit_id in " +
            "(select id from units where property_id in " +
            "(select id from properties where company_id = " + connection.escape(company_id) + ")) ";


        return connection.queryAsync(leaseSql);

    },

    findAllByPropertyId: function(connection, property_id){

        var leaseSql = "SELECT * FROM leases WHERE start_date < now() and end_date >now() and unit_id in " +
            "(select id from units where property_id =  " + connection.escape(property_id) + ") ";
        return connection.queryAsync(leaseSql);
    },

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

    findLeasesToInvoiceOnDay: function(connection, property_id, date, billDays){
        var sql = "SELECT * " +
            " FROM leases " +
            " WHERE leases.unit_id in ( select id from units WHERE property_id = " + connection.escape(property_id) + ") " +
            " AND status = 1 " +
            " AND start_date <= '" + date + "' " +
            " AND (end_date is null or end_date >=  '" + date + "') " +
            " AND bill_day in (" + billDays + ") ";

        console.log("sql", sql);

        return connection.queryAsync(sql);

    },

    findLeasesToInvoiceOnSpecifiedDate(connection, data){
        let { property_ids, date, lease_id } = data;
        let sql = `
            SELECT * FROM (
                SELECT p.id as property_id, l.*,
                    (DATE_ADD('${date}', INTERVAL (SELECT invoiceSendDay FROM lease_templates 
                        WHERE id = IFNULL((SELECT lease_template_id FROM properties_lease_templates WHERE property_id = u.property_id and unit_type = u.type and lease_template_id in (select id from lease_templates where status = 1) order by id desc limit 1),
                        (SELECT id FROM lease_templates WHERE status = 1 and is_default = 1 and company_id = p.company_id and unit_type = u.type)))  DAY)
                    ) as cal_date,
                    p.name as property_name,
                    p.on_boarding_date as property_onboarding_date,
                    u.number as unit_number,
                    c.name as company_name,
                    c.id as company_id
                FROM leases l
                    INNER JOIN units u ON u.id = l.unit_id
                    INNER JOIN properties p ON p.id = u.property_id
                    INNER JOIN companies c ON c.id = p.company_id
                WHERE l.status = 1
                    AND (l.auction_status IS NULL OR l.auction_status NOT IN ('auction_payment','move_out'))
                    ${property_ids && property_ids.length ? `AND u.property_id in (${property_ids.map(id => connection.escape(id)).join(',')})` : ''}
            ) filtered_leases
            WHERE filtered_leases.start_date <= filtered_leases.cal_date
                AND (filtered_leases.end_date is null or filtered_leases.end_date >= filtered_leases.cal_date)
                AND ((DAY(filtered_leases.cal_date) = DAY(LAST_DAY(filtered_leases.cal_date)) and DAY(LAST_DAY(filtered_leases.cal_date)) < filtered_leases.bill_day) 
                        OR (filtered_leases.bill_day IN (SELECT DAY(filtered_leases.cal_date)))
                    )
        `;

        if(lease_id){
            sql += ` and id = ${connection.escape(lease_id)}`;
        } 
        
        console.log("findLeasesToInvoiceOnSpecifiedDate: ", sql);
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
            " AND (end_date is null or end_date >=  " +
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
            " and ( end_date >= '" + now.format('YYYY-MM-DD') + " 23:59:59' or end_date is null ) " +
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
            vacantSql += " and id in (select unit_id from leases where status = 1 and start_date <= now() and ( end_date is not null and end_date >= now() and end_date <= " + connection.escape(moment().add(conditions.period, 'months').format('YYYY-MM-DD')) + ")) ";
        } else if(conditions.period == 12) {
            vacantSql += " and id in (select unit_id from leases where status = 1 and start_date <= now() and ( end_date is not null and end_date >= " + connection.escape(moment().add(6, 'months').format('YYYY-MM-DD')) + " and end_date <= " + connection.escape(moment().add(conditions.period, 'months').format('YYYY-MM-DD')) + ")) ";
        } else {
            vacantSql += " and id not in (select unit_id from leases where status = 1 and start_date <= now() and ( end_date is null or end_date >= now())) ";
        }

        vacantSql += " and units.property_id in (select id from properties where company_id = " + connection.escape(company_id) + ")";

        if(params && !count){
            vacantSql += " limit " + connection.escape(params.offset) + ", " + connection.escape(params.limit);
        }

        return connection.queryAsync(vacantSql);

    },
    
    findVacancyBreakdown: function(connection, company_id,property_id){

        var vacantSql =  "select count(DISTINCT(id)) as count from units where 1 = 1 ";

        if(property_id){
            vacantSql += " and units.property_id = " + connection.escape(property_id);
        }

        vacantSql += " and id not in (select unit_id from leases where status = 1 and  start_date <= now() and ( end_date is null or end_date >= now() ) ) and id in (select id from units where property_id in (select id from properties where company_id  = "+connection.escape(company_id) + ")) ";


        var SixMoSql =  "select count(DISTINCT(id)) as count from units where  id not in (select unit_id from leases  where status = 1 and start_date <= now() and ( end_date is not null and  end_date <= '" + moment().add(6, 'months').format('YYYY-MM-DD') + "')) ";

        if(property_id){
            SixMoSql += " and units.property_id = " + connection.escape(property_id);
        }

        SixMoSql += " and id in (select id from units where property_id in (select id from properties where company_id = "+connection.escape(company_id) + "))";



        var OverSixMoSql = "select count(DISTINCT(id)) as count from units where id not in (select unit_id from leases where status = 1 and start_date <= now() and ( end_date is null or end_date >= '" + moment().add(6, 'months').format('YYYY-MM-DD') + "' ) )" ;

        if(property_id){
            OverSixMoSql += " and units.property_id = " + connection.escape(property_id);
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

    findVacancyByCategory: function(connection, company_id, property_id){


        var vacantSql = "SELECT count(*) as count, category_id, (select sort from unit_categories where unit_categories.id = units.category_id) as sort FROM units WHERE 1 = 1";

        if(property_id){
            vacantSql += " and units.property_id = " + connection.escape(property_id);
        }

        vacantSql += " and id not in (select unit_id from leases where status = 1 and start_date <= now() and (end_date is null or end_date >= now()) ) and id in (select id from units where property_id in (select id from properties where company_id  = "+connection.escape(company_id) + " )) GROUP BY category_id, sort ORDER BY sort";

        console.log(vacantSql);

        return connection.queryAsync(vacantSql).mapSeries(r => {
            var totalSql ="SELECT category_id, count(*) as count, (select name from unit_categories where unit_categories.id = units.category_id) as category FROM units WHERE units.category_id = " + connection.escape(r.category_id);

            if(property_id){
                totalSql += " and units.property_id = " + connection.escape(property_id);
            }

            return connection.queryAsync(totalSql).then(r2 => {
                console.log(r2);
                r.category = r2[0].category;
                r.total = r2[0].count;
                console.log(r);
                return r;
            });
        });

    },

    deleteLease: function(connection, lease_id){

        var promises = [];

        promises.push(connection.queryAsync("DELETE FROM tax_line_items where invoice_line_id in (select id from invoice_lines where invoice_id in (select id from invoices where  lease_id = " + connection.escape(lease_id) + ")); "));

        promises.push(connection.queryAsync("DELETE FROM discount_line_items where invoice_line_id in (select id from invoice_lines where invoice_id in (select id from invoices where  lease_id = " + connection.escape(lease_id) + ")); "));

        promises.push(connection.queryAsync("DELETE FROM invoice_lines where invoice_id in (select id from invoices where  lease_id =  " + connection.escape(lease_id) + " )"));
        promises.push(connection.queryAsync("DELETE FROM invoices_payments where invoice_id in (select id from invoices where lease_id = " + connection.escape(lease_id) + ")"));
        promises.push(connection.queryAsync("DELETE FROM invoices where lease_id = " + connection.escape(lease_id)));
        promises.push(connection.queryAsync("DELETE FROM payments where lease_id = " + connection.escape(lease_id)));
        promises.push(connection.queryAsync("DELETE FROM payment_methods where lease_id = " + connection.escape(lease_id)));

        promises.push(connection.queryAsync("DELETE FROM services where lease_id = " + connection.escape(lease_id) ));

        promises.push(connection.queryAsync("DELETE FROM contact_leases where lease_id = " + connection.escape(lease_id)));
        promises.push(connection.queryAsync("DELETE FROM uploads where foreign_id = " + connection.escape(lease_id) + " and model = 'lease'"));


	    promises.push(connection.queryAsync("DELETE FROM uploads where foreign_id in (select id from maintenance where lease_id = " + connection.escape(lease_id) + ") and model = 'maintenance';"));

        promises.push(connection.queryAsync("DELETE FROM submessages where maintenance_id in (select id from maintenance where lease_id = " + connection.escape(lease_id) + ")"));
        promises.push(connection.queryAsync("DELETE FROM maintenance where lease_id = " + connection.escape(lease_id) ));
        //promises.push(connection.queryAsync("DELETE FROM activity where lease_id = " + connection.escape(lease_id)));
        promises.push(connection.queryAsync("DELETE FROM leads where lease_id = " + connection.escape(lease_id)));

        promises.push(connection.queryAsync("DELETE FROM checklist_leases where lease_id = " + connection.escape(lease_id)));

        promises.push(connection.queryAsync("UPDATE leases set status = 0 where id = " + connection.escape(lease_id) ));



        return Promise.mapSeries(promises, function(response){
            return response;
        });

    },
    
    findLeaseConflict(connection, lease){


        // TODO CHECK FOR RESERVED UNITS AND UNIT HOLDS

        var sql = " Select * from leases WHERE unit_id = " + connection.escape(lease.unit_id) + " and " +
            " leases.status =  1 and " +
	        " (leases.start_date <= " + connection.escape(lease.start_date) + " and (leases.end_date is null || leases.end_date >= "+ connection.escape(lease.start_date) + ") || " +
	        " leases.start_date >= " + connection.escape(lease.start_date) + " and (leases.start_date <= "+ connection.escape(lease.end_date) + ")) ";

	    if(lease.id){
		    sql += " and leases.id != "  + connection.escape(lease.id);
	    }

        console.log(sql);

	    return connection.queryAsync(sql, lease);
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
        console.log(sql);

        return connection.queryAsync(sql);
    },

    findAvgsByCategory(){

        var sql = "select count(id) as count, AVG(DATEDIFF(end_date, start_date)) as avgDays, (select category_id from units where units.id = leases.unit_id) as category_id from leases where end_date is not null and unit_id in (select id from units where property_id in (select id from properties where company_id = 3)) group by category_id";


        var sql = "select count(id) as count, AVG(DATEDIFF(now(), start_date)) as avgDays, (select category_id from units where units.id = leases.unit_id) as category_id from leases where end_date is null and unit_id in (select id from units where property_id in (select id from properties where company_id = 3)) group by category_id";



        var sql = " SET SESSION sql_mode = ''";
        var sql = "select count(id) as count, (select SUM(amount) from payments where lease_id = leases.id) as SUM, (select category_id from units where units.id = leases.unit_id) as category_id from leases where unit_id in (select id from units where property_id in (select id from properties where company_id = 3)) group by category_id;";
        var sql = "SET SESSION sql_mode = 'only_full_group_by'";

    },

    findCompanyId(connection, lease_id){
        var sql = "Select company_id from properties where id = (select property_id from units where id = (select unit_id from leases where id = "+ connection.escape(lease_id) +"))";
        
        return connection.queryAsync(sql).then(function(companyRes){
            return companyRes[0] || null;
        });

    },
    
    findMostOverdueInvoicesByCompany(connection, company_id){
        var sql = "select MIN(due) as due, lease_id from invoices where (select company_id from properties where properties.id = (select property_id from units where units.id = (select unit_id from leases where id = invoices.lease_id))) = " + connection.escape(company_id) + " and status > -1 and ( IFNULL(subtotal, 0) + IFNULL(total_tax,0) - IFNULL(total_discounts,0) - IFNULL(total_payments,0) ) > 0 group by lease_id ";
        console.log(sql);
        return connection.queryAsync(sql)
    },


    findMostOverdueInvoicesByProperty(connection, property_id){
        var sql = "select MIN(due) as due, lease_id from invoices where (select property_id from units where units.id = (select unit_id from leases where id = invoices.lease_id)) = " + connection.escape(property_id) + " and status > 0 and ( IFNULL(subtotal, 0) + IFNULL(total_tax,0) - IFNULL(total_discounts,0) - IFNULL(total_payments,0) ) > 0 group by lease_id ";
        console.log(sql);
        return connection.queryAsync(sql)
    },


    removeAutoCharges(connection, lease_id, payment_method_id){

        var sql = "update leases_payment_methods set deleted = NOW() where lease_id = " +  connection.escape(lease_id);
        if(payment_method_id){
            sql += " payment_method_id = " + connection.escape(payment_method_id)
        }
        return connection.queryAsync(sql);

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
        console.log(data);
        let sql = "INSERT INTO lease_standing_events set ? ";

        console.log(connection.format(sql, data));
        return connection.queryAsync(sql, data);
    },

    findByACHToken(connection, ach_token){
        let sql = "SELECT * from leases where achtoken = " + connection.escape(ach_token);
        console.log(sql);
        return connection.queryAsync(sql).then(r => r.length ? r[0] : null );
    },

    getVehicles(connection, lease_id){
        let sql = `SELECT * from vehicles where lease_id = ${connection.escape(lease_id)} and deleted_at is NULL;`;
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

    findAuctionLeases(connection, params = {}){
        
        let sql = `SELECT l.* FROM leases l 
                    INNER JOIN lease_auctions la ON la.lease_id = l.id
                    INNER JOIN units u ON u.id = l.unit_id
                    INNER JOIN properties p ON p.id = u.property_id
                    WHERE l.auction_status is not null AND la.scheduled_date is not null AND la.deleted_at is null`;
        
        if(params.property_id){
            sql += ` AND p.id = ${connection.escape(params.property_id)}`;
        }

        if(params.date){
            sql += ` AND (SELECT DATE(${connection.escape(params.date)})) = DATE(la.scheduled_date)`;
        }

        if(params.status){
            sql += ` AND l.auction_status = ${connection.escape(params.status)}`;
        }

        console.log("sql", sql);
        return connection.queryAsync(sql);
    },

    findAdvanceRentalLeases: function(connection, property_id, date){
        var sql = `SELECT l.* FROM leases l
                    INNER JOIN units u ON l.unit_id = u.id
                    WHERE u.property_id = ${property_id}
                    AND l.start_date =  ${connection.escape(date)}
                    AND (l.end_date IS NULL or end_date >= CURDATE())
                    AND advance_rental = 1
                    AND l.status = 1;`;
        console.log("sql", sql);
        return connection.queryAsync(sql);
    },

    findProperty(connection, lease_id){
        var sql = "Select * from properties where id = (select property_id from units where id = (select unit_id from leases where id = "+ connection.escape(lease_id) +"))";
        return connection.queryAsync(sql).then(res => res ? res[0]: null);

    },

    async removeToOverlockFromSpace(connection,lease_id) {
        let removeToOverlock = `Update leases set to_overlock = 0 where id = ${connection.escape(lease_id)}`;
        await connection.queryAsync(removeToOverlock);
    },

    updateAuctionStatus(connection, status, lease_id){
        if(lease_id){
            sql = "UPDATE leases set auction_status = " + (!status ? status : `"${status}"`) + ` where id = ${connection.escape(lease_id)}`;
        }
        return connection.queryAsync(sql);
    },

    getContacts(connection, payload) {
        const { lease_id, is_primary } = payload; 
        
        let sql = `select * from contact_leases cl where cl.lease_id = ${lease_id}`;
        if(is_primary) {
            sql += ` and cl.primary = 1`;
        }

        return connection.queryAsync(sql);
    },

    getUnpaidInvoicesByLease(connection, lease_id, date = ''){
        date = date ? date : moment().format('YYYY-MM-DD');
        let query = `
            SELECT * 
            FROM invoices 
            WHERE lease_id = ${lease_id} 
                and status > 0
                and due > ${connection.escape(date)}
                and total_payments = 0
                and void_date IS NULL
                and voided_at IS NULL
                and voided_by_contact_id IS NULL;`

        return connection.queryAsync(query).then(invoicesRes => invoicesRes?.length ? invoicesRes : null);
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

        let payment_cycle = await connection.queryAsync(sql);
        return payment_cycle.length ? payment_cycle[0] : null
    }, 
    async savePaymentCycle(connection, data){
 
        var sql = "INSERT INTO leases_payment_cycles set ? ";
        console.log(connection.format(sql, data));
        let result = await  connection.queryAsync(sql, data)
        return result.insertId;
    
    }, 
    getPaymentCyclesForReversion: async (connection, date, property_id, lease_id, params = {}) => {
        let sql = `
            SELECT lpc.*,
                u.number as unit_number,
                concat(c.first, ' ', c.last) as contact_name
            FROM leases_payment_cycles lpc
                JOIN leases l on l.id = lpc.lease_id
                JOIN contact_leases cl on cl.lease_id = lpc.lease_id and cl.primary = 1
                JOIN contacts c on c.id = cl.contact_id
                JOIN units u on u.id = l.unit_id
                JOIN invoices i on i.lease_id = lpc.lease_id
                JOIN invoice_lines il on il.invoice_id = i.id
                JOIN products p on p.id = il.product_id AND p.default_type = 'rent' AND p.category_type = 'rent'
            WHERE lpc.deleted_at is null
                ${lease_id ? `AND lpc.lease_id = ${connection.escape(lease_id)}` : ''}
                AND l.status = 1
                AND (l.end_date IS NULL OR l.end_date > ${connection.escape(date)})
                AND u.property_id = ${connection.escape(property_id)}
                AND lpc.pay_by_date < ${connection.escape(date)}
                AND i.status = 1
                AND i.voided_at IS NULL
                AND (IFNULL(i.subtotal, 0) + IFNULL(i.total_tax,0) - IFNULL(i.total_discounts,0) - IFNULL(i.total_payments,0)) > 0
                AND DATE(i.period_start) >= lpc.start_date
                AND DATE(i.period_end) <= lpc.end_date
            GROUP BY lpc.id
            HAVING lpc.end_date > MIN(i.due)
            ORDER BY lpc.start_date ASC;
        `;

        console.log("getPaymentCyclesForReversion", sql)
        return connection.queryAsync(sql);

    },
    removePaymentCycles: async (connection, lease_id, date) => {
        let sql = `
                UPDATE leases_payment_cycles
                SET deleted_at = NOW() 
                WHERE end_date >= ${connection.escape(date)} 
                    AND lease_id = ${connection.escape(lease_id)} 
                    AND deleted_at IS NULL
             `;

        console.log("removePaymentCycles-sql", sql);
        await connection.queryAsync(sql);
    },
    removePaymentCycleByIds: async (connection, pc_ids = []) => {
        let sql = `
                UPDATE leases_payment_cycles
                SET deleted_at = NOW() 
                WHERE id in (${pc_ids.map(id => connection.escape(id)).join(',')})
             `;

        console.log("removePaymentCycleByIds-sql", sql);
        await connection.queryAsync(sql);
    },

    findPaymentCyclesFromDateByLeaseId: async (connection, lease_id, date) => {
        let sql = `
            Select *
            FROM leases_payment_cycles
            WHERE end_date >= ${connection.escape(date)} 
                AND lease_id = ${connection.escape(lease_id)} 
                AND deleted_at IS NULL
        `;
        console.log("findActivePaymentCyclesByLeaseId-sql", sql);
        let res = await connection.queryAsync(sql);
        return res.length ? res : [];
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

    findUnitLeaseData: function (connection, lease_id) {
        let sql = `
        SELECT 
            l.id,
            l.unit_id,
            l.bill_day,
            u.number,
            concat(c.first, ' ' , c.last) AS tenant_name,
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
    getPaymentCycleRent(connection, payload) {
        const { lease_id, date } = payload;

        let sql = `
            select 
                case when lpc.payment_cycle is null then s.price
                else
                    case
                        when d.type = 'dollar' then if((s.price - d.value) > 0, s.price - d.value, 0) * if(lpc.payment_cycle = 'Quarterly', 3, 12)
                        when d.type = 'percent' then (s.price - (s.price * d.value/100)) * if(lpc.payment_cycle = 'Quarterly', 3, 12)
                        when d.type = 'fixed' then (d.value) * if(lpc.payment_cycle = 'Quarterly', 3, 12)
                    end 
                end as payment_cycle_rent,
                lpc.payment_cycle, s.price, d.value, d.type 
            from leases l 
                left join leases_payment_cycles lpc on lpc.lease_id = l.id and lpc.deleted_at is null and lpc.end_date >= ${date}
                left join discounts d on lpc.discount_id = d.id
                join services s on l.id = s.lease_id and s.status = 1 and s.end_date is null 
                join products p on p.id = s.product_id and p.default_type = 'rent'
            where 
                l.id = ${lease_id};   
        `;

        console.log('Payment Cycle Rent ', sql);

        return connection.queryAsync(sql).then(r => r.length ? r[0] : null);
    },

    getLeaseRentChangeId(connection, lease_id) {
        let sql = `
            SELECT
                lrc.id
            FROM lease_rent_changes lrc
            WHERE
                lrc.lease_id = ${connection.escape(lease_id)} AND
                lrc.effective_date >= CURDATE() AND
                lrc.status = 'approved'
            ORDER BY lrc.effective_date ASC
            LIMIT 1
        `;
        return connection.queryAsync(sql).then(data => data.length ? data[0].id : null)
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

        console.log("getPaymentCycle - sql", sql);
        return connection.queryAsync(sql);
    },

    async getConfidenceInterval(connection, lease_id) {
        let sql = `SELECT confidence_interval from contact_leases cl WHERE cl.lease_id = ${connection.escape(lease_id)};`;
        return connection.queryAsync(sql).then((r) => (r.length ? r[0]?.confidence_interval ?? "" : ""));
    },

    async getRefundDetails(connection, payload) {
        const { refund_id } = payload;
        const sql = `
            select distinct u.number, l.id from units u
            join leases l on u.id = l.unit_id
            join invoices i on l.id = i.lease_id
            join invoices_payments ip on i.id = ip.invoice_id
            join refunds r on r.payment_id = ip.payment_id
            where r.id = ${connection.escape(refund_id)};
        `;
        console.log(`getRefundDetails - sql ${sql}`);
        return connection.queryAsync(sql);
    }
    
};

module.exports = Lease;
