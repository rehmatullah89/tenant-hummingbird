var settings    = require(__dirname + '/../config/settings.js');
var utils    = require(__dirname + '/../modules/utils.js');
var moment = require('moment');
var Sql = require(__dirname + '/../modules/sql_snippets.js');
var e  = require(__dirname + '/../modules/error_handler.js');
const  ENUMS  = require(__dirname + '/../modules/enums.js');

let Invoice = {

    search(connection, conditions = {}, searchParams, company_id, count){
        var sql = '';
        if(count){
            sql = "SELECT count(*) as count ";
        } else {

            sql = "SELECT *, " +

                "(Select address from addresses where id = (select address_id from units where id = (select unit_id from leases where id = invoices.lease_id)) ) as address, " +

                "(Select city from addresses where id = (select address_id from units where id = (select unit_id from leases where id = invoices.lease_id)) ) as city, " +

                "(Select state from addresses where id = (select address_id from units where id = (select unit_id from leases where id = invoices.lease_id)) ) as state, " +

                "(Select zip from addresses where id = (select address_id from units where id = (select unit_id from leases where id = invoices.lease_id)) ) as zip, " +

                "(Select number from units where id = (select unit_id from leases where id = invoices.lease_id)) as unit_number, " +

                "( IFNULL(subtotal, 0) + IFNULL(total_tax,0) - IFNULL(total_discounts,0) - IFNULL(total_payments,0) ) AS balance, " +

                "( IFNULL(subtotal, 0) + IFNULL(total_tax,0) - IFNULL(total_discounts,0) ) AS amount";

        }

        sql += " FROM invoices where 1 = 1 " ;


        sql += " and lease_id in (select id from leases where unit_id in (select id from units where property_id in (select id from properties where company_id = " + connection.escape(company_id) + '))) ';



        if(conditions.lease_id){
            sql += ' and lease_id = ' + connection.escape(conditions.lease_id);
        }

        if(conditions.status && conditions.status.length){

            if(conditions.status.toLowerCase() === 'past due'){
                sql += ' and due < ' + connection.escape(moment().format('YYYY-MM-DD')) + ' HAVING balance > 0 ';
            }
            if(conditions.status.toLowerCase() ===  'paid' ){
                sql += ' HAVING balance = 0 ';

            }
            if(conditions.status.toLowerCase() === 'void'  ){
                sql += ' and status < 0 ';
            }
            if(conditions.status.toLowerCase() === 'open' ){
                sql += ' HAVING balance > 0 ';
            }

            //sql += ' and LOWER(status) in (' + conditions.status.map(s => connection.escape(s)).join(', ') + ')';
        }

        if(searchParams){
            if(searchParams.sort){
                sql += " order by ";
                switch (searchParams.sort){

                    default:
                        sql += searchParams.sort;

                }
                sql += ' ' + searchParams.sortdir;
            }
            sql += " limit ";
            sql += searchParams.offset;
            sql += ", ";
            sql += searchParams.limit;
        }


        return connection.queryAsync(sql);
    },

    saveInvoice: async(connection, data, invoice_id) => {
        let sql;

        if(!invoice_id){
            if((!data.property_id || !data.contact_id) && data.lease_id){
                sql = `select *,
                        (select property_id from units where id = (select unit_id from leases where id = l.id)) as property_id,
                        (select contact_id from contact_leases where lease_id = l.id and \`primary\` = 1) as contact_id
                       from leases l where id = ${connection.escape(data.lease_id)};`
                let result = await connection.queryAsync(sql);
                data.property_id = (result && result.length && result[0].property_id) || null;
                data.contact_id = (result && result.length && result[0].contact_id) || null;
            } 
        }

        var invoiceSql;
        if(invoice_id){
            invoiceSql = "Update invoices set ? where id = " + invoice_id;
        } else {
            invoiceSql = "insert into invoices set ?";
        }

        console.log("Save Invoice SQL : ", invoiceSql);
        return await connection.queryAsync(invoiceSql, data);
    },

    findInvoiceBalanceWhenPaymentLastApplied: async(connection, invoice_id, payment_id) => {
        var sql = `SELECT 
                    (subtotal + total_tax - total_discounts - (select sum(amount) from invoices_payments_breakdown 
                    where 
                        invoice_id = invoices.id 
                        and created <= (select created from invoices_payments_breakdown where payment_id = ${connection.escape(payment_id)} order by created desc limit 1))) as balance 
                    from invoices where id = ${connection.escape(invoice_id)}`;
        return connection.queryAsync(sql).then(invoiceRes => { return invoiceRes.length ? invoiceRes[0].balance : 0 })
    },

    findInvoicesToBeMailed: function(connection, company_id, date){
        var invoiceSql = "Select * from invoices where status > -1 and " +
            "lease_id in (select id from leases where unit_id in (select id from units where property_id in (select id from properties where company_id = " + connection.escape(company_id) + "))) " +
            "and invoices.to_send = 1 " +
            "and (select create_invoice_day from leases where id = invoices.id) = " + moment(date, 'YYYY-MM-DD').format('DD') ;
        return connection.queryAsync(invoiceSql);
    },

    findMonthlyUnpaid:function(connection, company_id, mDate){

        var leasesSql =  "SELECT *, "+
            "(select company_id from properties where id = (select property_id from units where units.id = leases.unit_id )) as company_id, " +
            "(select address from addresses where id = (select address_id from properties where id = (select property_id from units where units.id = leases.unit_id ))) as address, " +
            "(select city from addresses where id = (select address_id from properties where id = (select property_id from units where units.id = leases.unit_id ))) as city, " +
            "(select number from units where units.id = leases.unit_id ) as number, " +
            "( ) as total_owed FROM invoices WHERE status > -1 and MONTH(invoices.due) = " + connection.escape(mDate.format('MM')) + " and YEAR(invoices.due) = " + connection.escape(mDate.format('YYYY')) + " and lease_id = leases.id) as total_owed " +
            " FROM leases " +
            " WHERE unit_id in " +
            "(SELECT id FROM units WHERE property_id IN " +
                "(SELECT id from properties WHERE company_id = " + connection.escape(parseInt(company_id))+ ")" +
            ")" +
            " AND start_date <= '" + moment().format('YYYY-MM-DD') + "' AND " +
            "(end_date > '" +  moment().format('YYYY-MM-DD') + "' OR end_date is null)" +
            " HAVING total_owed != 0 " +
            " ORDER BY total_owed DESC ";


            return connection.queryAsync(leasesSql);



        return connection.queryAsync(invoiceSql);
    },

    saveInvoiceLine: async (connection,  data, id) => {
        var sql;
        if(typeof id != 'undefined' && id){
            sql = "Update invoice_lines set ? where id = " + connection.escape(id);
        } else {
            sql = "Insert into invoice_lines set ? ";
        }

        let response =  await connection.queryAsync(sql, data);

        //TODO: Zeb, Improve this code as, if this is insert case then we must have invoice_id in data. If update case then id should have been passed. In both cases we don't need following code block
       let invoice_line_id = id ? id : response.insertId;
       if(!data.invoice_id){
         let invoiceSql = "select * from invoice_lines where id = " + invoice_line_id;
         var invLines_response = await connection.queryAsync(invoiceSql);
         data.invoice_id = invLines_response[0].invoice_id;
       }
       return response;
    },

    updateInvoiceTotal: async (connection,  invoice_id) => {
        let invoiceSubTotalSql = "SELECT IFNULL(SUM(IFNULL(qty,0)*IFNULL(cost,0)),0) sub_total FROM invoice_lines WHERE invoice_id =" + connection.escape(invoice_id);
        console.log("invoiceSubTotalSql: ", invoiceSubTotalSql);
        let invoiceSubTotalRes = await connection.queryAsync(invoiceSubTotalSql);
        let invoiceSubTotal = invoiceSubTotalRes[0].sub_total;

      let sql = "UPDATE invoices set subtotal = " + invoiceSubTotal + " WHERE invoices.id = " + connection.escape(invoice_id);
      console.log("update invoice sub total sql:", sql);
      return await connection.queryAsync(sql);

    },

    updateInvoiceTotalTax: async (connection,  invoice_id) => {
        let invoiceTotalTaxSql = "SELECT IFNULL(SUM(IFNULL(amount,0)), 0) total_tax FROM tax_line_items WHERE invoice_line_id in (select id from invoice_lines where invoice_id = " + connection.escape(invoice_id) + ")";
        console.log("invoiceTotalTaxSql: ", invoiceTotalTaxSql);
        let invoiceTotalTaxRes = await connection.queryAsync(invoiceTotalTaxSql);
        let invoiceTotalTax = invoiceTotalTaxRes[0].total_tax;
      
         let sql = "UPDATE invoices set total_tax = " + invoiceTotalTax + " WHERE id = " + connection.escape(invoice_id);
        console.log("update invoice total tax sql:", sql);
        return await connection.queryAsync(sql);
    },

    updateInvoiceTotalDiscounts: async (connection,  invoice_id) => {
        let invoiceTotalDiscountSql = "SELECT IFNULL(SUM(IFNULL(amount,0)), 0) total_discount FROM discount_line_items WHERE invoice_line_id in (select id from invoice_lines where invoice_id  = " + connection.escape(invoice_id) + ")";
        console.log("invoiceTotalDiscountSql: ", invoiceTotalDiscountSql);
        let invoiceTotalDiscountRes = await connection.queryAsync(invoiceTotalDiscountSql);
        let invoiceTotalDiscount = invoiceTotalDiscountRes[0].total_discount;

      let sql = "UPDATE invoices set total_discounts = " + invoiceTotalDiscount + " WHERE id = " + connection.escape(invoice_id);
      console.log("Update invoice total discount sql:", sql);
      return await connection.queryAsync(sql);
    },

    deleteInvoiceLines: async(connection, invoice_id) => {
        if(!invoice_id) e.th(500, "invoice id required for deletion");
        let invoiceLineIdsSql = "select group_concat(id) id from invoice_lines where invoice_id = " + connection.escape(invoice_id);
        console.log("invoiceLineIdsSql: ", invoiceLineIdsSql);
        let invoiceLineIdsRes = await connection.queryAsync(invoiceLineIdsSql);

        if(invoiceLineIdsRes.length > 0) {
            var deleteTaxSql = "DELETE from tax_line_items where invoice_line_id in (" + invoiceLineIdsRes[0].id + ")";
            await connection.queryAsync(deleteTaxSql);
            var deleteDiscountSql = "DELETE from discount_line_items where invoice_line_id in (" + invoiceLineIdsRes[0].id + ")";
            await connection.queryAsync(deleteDiscountSql);
            var deleteLineSql = "DELETE from invoice_lines where invoice_id = " + connection.escape(invoice_id);
            await connection.queryAsync(deleteLineSql);
        }

      await Invoice.updateInvoiceTotal(connection, invoice_id);
      await Invoice.updateInvoiceTotalTax(connection, invoice_id);
      await Invoice.updateInvoiceTotalDiscounts(connection, invoice_id);
    },

    findMonthlyInvoices: function(connection,  company_id, momentDate, options ){
        var sql;

        sql = "Select * from invoices  where status > -1 MONTH(date) = " + momentDate.format('MM') + " and YEAR(date) = " + momentDate.format('YYYY') + " and lease_id in (select id from leases where unit_id in (select id from units where property_id in (select id from properties where company_id = " + connection.escape(company_id)  + "))) limit " + connection.escape(parseInt(options.offset)) + ", " + connection.escape(parseInt(options.limit));

        return connection.queryAsync(sql);
    },

    findInvoicesToSend: function(connection){
        var sql;
        sql = "Select * from invoices where status > -1 and to_send = 1";

        return connection.queryAsync(sql);
    },

    findInvoicesToCharge: function(connection){
        var sql;
        sql = "Select * from invoices where status > -1 and to_send = 1";

        return connection.queryAsync(sql);
    },

    getAging(connection, conditions = {}, searchParams, company_id, count){

        var sql = '';
        if(count){
            sql = "SELECT count(*) as count ";
        } else {

            sql = "SELECT *,  ( FNULL(subtotal, 0) + IFNULL(total_tax,0) - IFNULL(total_discounts,0) - IFNULL(total_payments,0) ) as balance, " +

                "(select number from units where units.id = (select unit_id from leases where id = invoices.lease_id)) as unit_number, " +

                "(select id from properties where id = (select property_id from units where id = (select unit_id from leases where id = invoices.lease_id))) as property_id, " +

                "(select address from addresses where id = (select address_id from units where units.id = (select unit_id from leases where id = invoices.lease_id))) as address, " +

                "(select city from addresses where id = (select address_id from units where units.id = (select unit_id from leases where id = invoices.lease_id))) as city, " +

                "(select state from addresses where id = (select address_id from units where units.id = (select unit_id from leases where id = invoices.lease_id))) as state, " +

                "(select zip from addresses where id = (select address_id from units where units.id = (select unit_id from leases where id = invoices.lease_id))) as zip,  " +

                "(select concat(first, ' ' , last) from contacts where id in (select contact_id from contact_leases where lease_id = invoices.lease_id) order by id asc limit 1 ) as tenant_name, " +

                "(select id from contacts where id in (select contact_id from contact_leases where lease_id = invoices.lease_id) order by id asc limit 1 ) as tenant_id "

        }

        sql += " FROM invoices where 1 = 1 and status >= 0 " ;
        sql += " and (select company_id from properties where id = (select property_id from units where units.id = (select unit_id from leases where id = invoices.lease_id))) = " + connection.escape(company_id);


        if(conditions.property_id){
            sql += " and (select property_id from units where id = (select unit_id from leases where id = invoices.lease_id )) in (" + connection.escape(conditions.property_id) + ")";
        }

        if(conditions.start_date){
            sql += " and due >= " + connection.escape(conditions.start_date);
        }

        if(conditions.end_date){
            sql += " and due <= " + connection.escape(conditions.end_date);
        }

        if(!count) {
            sql += " HAVING balance > 0 ";
        }

        if(searchParams){
            if(searchParams.sort){
                sql += " order by ";
                switch (searchParams.sort){
                    default:
                        sql += searchParams.sort;

                }
                sql += ' ' + searchParams.sortdir;
            }
            sql += " limit ";
            sql += searchParams.offset;
            sql += ", ";
            sql += searchParams.limit;
        }

        console.log(sql);
        return connection.queryAsync(sql);



	    //
	    // var sql;
	    // sql = " select *, ";
	    //
	    // sql += " (SELECT SUM((qty*cost) - IFNULL( (select sum(amount) from discount_line_items where invoice_line_id = invoice_lines.id), 0) + (((qty * cost) - IFNULL((SELECT SUM(amount) from discount_line_items WHERE invoice_line_id = invoice_lines.id AND pretax = 1) ,0)) * IFNULL((SELECT SUM(taxrate) FROM tax_line_items WHERE invoice_line_id = invoice_lines.id) /100, 0))) from invoice_lines where invoice_id = invoices.id ) - (SELECT IFNULL(SUM(amount),0) FROM invoices_payments WHERE invoice_id = invoices.id)  as total_owed FROM invoices WHERE status > -1 ";
	    //
	    // if(conditions.property_id){
         //    sql += " and lease_id  in (select id from leases where unit_id in (select id from units where property_id = " + connection.escape(property_id) + "))  ";
	    // }
	    //
	    // sql += " and lease_id  in (select id from leases where unit_id in (select id from units where property_id in (select id from properties where company_id = " + connection.escape(company_id) + " ) ))  ";
	    //
	    //
	    // if(start_days_ago && end_days_ago) {
			// sql += " AND DUE BETWEEN DATE_SUB(CURDATE(), INTERVAL " + connection.escape(start_days_ago) + " DAY) and DATE_SUB(CURDATE(), INTERVAL " + connection.escape(end_days_ago) + " DAY) ";
	    // } else if(!start_days_ago && end_days_ago ){
			// sql += " AND DUE < DATE_SUB(CURDATE(), INTERVAL " + connection.escape(end_days_ago) + " DAY) ";
	    //
	    // } else if(start_days_ago && !end_days_ago ){
			// sql += " AND DUE > DATE_SUB(CURDATE(), INTERVAL " + connection.escape(start_days_ago) + " DAY) ";
	    // }
	    //
	    // sql += " HAVING ROUND(total_owed, 2) > 0  ";
	    //
	    // if(sort != null && sort.length){
         //    var field;
         //    sql += " ORDER BY ";
         //    var sortpart = '';
         //    sort.forEach(s => {
         //        switch(s.field){
         //            case 'balance':
         //                field = 'total_owed';
         //                break;
         //            default:
         //                field = s.field;
         //        }
         //        sortpart += field + " " + s.dir + ',';
         //    });
         //    var sp = sortpart.replace(/,+$/, "").trim();
	    //
         //    sql += sp.length ? sp : " total_owed DESC";
	    //
	    // } else {
         //    sql += " ORDER BY total_owed DESC ";
	    // }
	    //
	    // if(limit != null && offset != null){
	    //     sql += " limit " + connection.escape(offset) + ", " + connection.escape(limit);
	    // }

	    return connection.queryAsync(sql);
    },

    findFirstLeaseInvoice(connection, lease_id){

        var sql = "Select * from invoices where status > -1 and lease_id = " + connection.escape(lease_id) + " order by date asc limit 1";

        return connection.queryAsync(sql).then(function(invoicesResult){
            if(!invoicesResult.length) return null;
            return invoicesResult[0];
        })
    },

    findDueByLease(connection, lease_id){

        var invoiceSql =  "select *, ( IFNULL(subtotal, 0) + IFNULL(total_tax,0) - IFNULL(total_discounts,0) - IFNULL(total_payments,0) ) as total_owed FROM invoices WHERE status > -1 and  lease_id = " + connection.escape(parseInt(lease_id)) + " HAVING total_owed > 0 ORDER BY due ASC; ";

        return connection.queryAsync(invoiceSql);

    },

    findPastDueByLease(connection, lease_id, due_date){

        var due_date = due_date || moment().format('YYYY-MM-DD');

        var invoiceSql =  "select *, ( IFNULL(subtotal, 0) + IFNULL(total_tax,0) - IFNULL(total_discounts,0) - IFNULL(total_payments,0) ) as total_owed FROM invoices WHERE status > 0 and due < '" + due_date + "' and lease_id = " + connection.escape(parseInt(lease_id)) + " HAVING total_owed > 0 ORDER BY due ASC; ";

        console.log("findPastDueByLease - sql: ", invoiceSql);
        return connection.queryAsync(invoiceSql);

    },

    findTotalDueByLease(connection, lease_id, due_date){
        due_date = due_date || moment().format('YYYY-MM-DD');

        let inv_sql = `select *, ( IFNULL(subtotal, 0) + IFNULL(total_tax,0) - IFNULL(total_discounts,0) - IFNULL(total_payments,0) ) as total_owed 
                        FROM invoices 
                        WHERE status > -1 
                            and due <= "${due_date}" 
                            and lease_id = ${connection.escape(parseInt(lease_id))}
                        HAVING total_owed > 0 
                        ORDER BY due ASC; `;

        console.log("findTotalDueByLease - sql: ", inv_sql);

        return connection.queryAsync(inv_sql);

    },

    findUnpaidByLease(connection, lease_id){
        var invoiceSql =  "select *,  ( IFNULL(subtotal, 0) + IFNULL(total_tax,0) - IFNULL(total_discounts,0) - IFNULL(total_payments,0) )  as total_owed FROM invoices WHERE status > -1 and lease_id = " + connection.escape(parseInt(lease_id)) + " HAVING total_owed > 0 ORDER BY due ASC; ";

        return connection.queryAsync(invoiceSql);

    },

    findBilledProductsByCompanyId(connection, conditions = {}, searchParams, company_id, count){

        var sql = '';
        if(count){
            sql = "SELECT count(*) as count ";
        } else {

            sql = "SELECT *,  " +

                "(select concat(first, ' ' , last) from contacts where id = (select contact_id from contact_leases where lease_id in (select lease_id from invoices where invoice_lines.invoice_id = invoices.id) order by id limit 1)) as tenant, " +


                "(select date from invoices where invoice_lines.invoice_id = invoices.id) as invoice_date, " +
                "(select number from invoices where invoice_lines.invoice_id = invoices.id) as invoice_number, " +

                "(select name from products where invoice_lines.product_id = products.id) as name, " +
                "(select description from products where invoice_lines.product_id = products.id) as description, " +

                "(select number from units where units.id = (select unit_id from leases where id = (select lease_id from invoices where id = invoice_lines.invoice_id))) as unit_number, " +

                "(select id from properties where id = (select property_id from units where id = (select unit_id from leases where id = (select lease_id from invoices where id = invoice_lines.invoice_id)))) as property_id, " +

                "(select address from addresses where id = (select address_id from units where units.id = (select unit_id from leases where id = (select lease_id from invoices where id = invoice_lines.invoice_id)))) as address, " +

                "(select city from addresses where id = (select address_id from units where units.id = (select unit_id from leases where id = (select lease_id from invoices where id = invoice_lines.invoice_id)))) as city, " +

                "(select state from addresses where id = (select address_id from units where units.id = (select unit_id from leases where id = (select lease_id from invoices where id = invoice_lines.invoice_id)))) as state, " +

                "(select zip from addresses where id = (select address_id from units where units.id = (select unit_id from leases where id = (select lease_id from invoices where id = invoice_lines.invoice_id)))) as zip "
        }


        sql += " FROM invoice_lines where 1 = 1 " ;


        if(conditions.property_id && conditions.property_id.length){
            sql += " and (select property_id from units where id = (select unit_id from leases where id = (select lease_id from invoices where id = invoice_lines.invoice_id))) in (" + connection.escape(conditions.property_id) + ")";
        }

        if(conditions.product_id && conditions.product_id.length){
            sql += " and product_id in (" + connection.escape(conditions.product_id) + ")";
        }


        // Need Both
        if(conditions.timeframe.start && conditions.timeframe.end){
            sql += " and date BETWEEN " + connection.escape(moment(conditions.timeframe.start).format('YYYY-MM-DD')) + " AND " + connection.escape(moment(conditions.timeframe.end).format('YYYY-MM-DD'));
        }

        sql += " and (select company_id from properties where id = (select property_id from units where units.id = (select unit_id from leases where id = (select lease_id from invoices where id = invoice_lines.invoice_id)))) = " + connection.escape(company_id);

        if(searchParams){
            if(searchParams.sort){
                sql += " order by ";
                switch (searchParams.sort){
                    default:
                        sql += searchParams.sort;

                }
                sql += ' ' + searchParams.sortdir;
            }

            if(searchParams.limit){

                sql += " limit ";
                sql += searchParams.offset;
                sql += ", ";
                sql += searchParams.limit;
            }
        }

        console.log(sql);

        return connection.queryAsync(sql);

    },

    findOverdueForLateFee(connection, company_id){

        var sql = "SELECT *, ( IFNULL(subtotal, 0) + IFNULL(total_tax,0) - IFNULL(total_discounts,0) - IFNULL(total_payments,0) ) AS total_owed FROM invoices WHERE status > 0 and (SELECT late_fee FROM leases WHERE id = invoices.lease_id) IS NOT NULL AND (SELECT late_fee_subsequent FROM leases WHERE id = invoices.lease_id) IS NOT NULL AND MOD(DATEDIFF(CURDATE(), DATE_ADD(due, INTERVAL (SELECT late_fee_days FROM leases WHERE id = invoices.lease_id) DAY)), (SELECT late_fee_subsequent_days FROM leases WHERE id = invoices.lease_id)) = 0 AND invoices.lease_id IN (SELECT id FROM leases WHERE unit_id IN (SELECT id FROM units WHERE property_id IN (SELECT id FROM properties WHERE company_id =  "+ connection.escape(company_id)+"))) HAVING total_owed > 0  ORDER BY invoices.id DESC;";



        return connection.queryAsync(sql);

    },

    findCompanyIdByInvoice(connection, invoice_id){
        let sql = `select company_id from properties where id = (select property_id from invoices where id = ${connection.escape(invoice_id)})`;

        return connection.queryAsync(sql).then(result => {
            if(!result.length) return null;
            return result[0].company_id;
        })

    },

    findPropertyIdByInvoice(connection, invoice_id){
        var sql = `select property_id from invoices where id = ${connection.escape(invoice_id)}`;

        return connection.queryAsync(sql).then(result => {
            if(!result.length) return null;
            return result[0].property_id;
        })

    },

    findPartialMonthPayment(connection, lease_id, date) {
        date = date || moment().format('YYYY-MM-DD');

        var sql = 'select * from invoices where lease_id = ' + connection.escape(lease_id) + ' and status >= 0 and id in (select invoice_id from invoice_lines where end_date > ' + connection.escape(date) + ')';
        return connection.queryAsync(sql).then(r => {
            return r;
        })
    },

    findFutureBilled(connection, lease_id, date, params){

        date = date || moment().format('YYYY-MM-DD');

        var sql = `select * from invoices where lease_id = ${connection.escape(lease_id)}
                    and id in (select invoice_id from invoice_lines where end_date >= ${connection.escape(date)}`;

        
        if(params){
            if(params.move_out){
                sql += ` and (select prorate_out from services where services.id = invoice_lines.service_id  ) = 1`;
            }
        }

        sql += ')';

        if(params){
            if(!params.search_all){
                sql += ' and status >= 0';
            }
        }
        
        return connection.queryAsync(sql).then(r => {
            console.log(r);
            return r;
        })

    },

    findLatestRentInvoice(connection, payload) {
        const { lease_id } = payload;

        let sql = `
            select i.* from invoices i
                join invoice_lines il on i.id = il.invoice_id
                join products p on il.product_id = p.id
            where i.lease_id = ${connection.escape(lease_id)} and p.default_type = 'rent' and i.status != -1
            order by i.period_end desc;
        `;

        return connection.queryAsync(sql).then(r => r.length ? r[0] : null);
    },

    findLastBilled(connection, lease_id, activeInvoice = true) {
        let sql = `Select MAX(end_date) as last_billed from invoice_lines where invoice_id in (select id from invoices where lease_id = ${connection.escape(lease_id)}`;
        
        if(activeInvoice) {
            sql += ` and status = 1`
        }

        sql += ' )';

        return connection.queryAsync(sql).then(r => r ? r[0].last_billed : null);

    },

    findInvoiceByNumber(connection, company_id, number, id){

        var sql = "Select * from invoices where lease_id in (select id from leases where unit_id in (select id from units where property_id in (select id from properties where company_id = " + connection.escape(company_id) + " ))) and number = " + "'" + connection.escape(number) + "'";

        if(id){
            sql += " and id != " + connection.escape(id)
        }

        return connection.queryAsync(sql).then(r => r ? r[0] : null);
    },

    getGLItems(connection, conditions, company_id){


        let sql = "Select *, " +
            "(select property_id from units where id in (select unit_id from leases where id = invoices.lease_id)) as property_id  from invoices where date >= " + connection.escape(conditions.timeframe.start.format('YYYY-MM-DD')) + " and date <= " +  connection.escape(conditions.timeframe.end.format('YYYY-MM-DD'));

        // let sql = "Select *, (select property_id from units where id in (select unit_id from leases where id = i.lease_id)) as property_id  from invoices i LEFT JOIN invoice_lines inline on inline.invoice_id = i.id LEFT JOIN products p on inline.product_id = p.id LEFT JOIN invoices_payments ip on ip.invoice_id = i.id where i.date >= " + connection.escape(conditions.timeframe.start.format('YYYY-MM-DD')) + " and i.date <= " +  connection.escape(conditions.timeframe.end.format('YYYY-MM-DD'));


        console.log("SQL", sql);
        return connection.queryAsync(sql);


    },

    findUnit(connection, invoice_id){
        let sql = `SELECT * from units where id = (select unit_id from leases where id = (select lease_id from invoices where id = ${connection.escape(invoice_id)}))`;
        console.log("SQL", sql);

        return connection.queryAsync(sql).then(r => r ? r[0] : null);
    },

    findInvoiceBreakdown(connection, company_id, property_id, breakdown_id){
        let sql  = `SELECT	ipb.*
                    FROM	invoices_payments_breakdown ipb
                            JOIN invoices i on i.id = ipb.invoice_id
                            JOIN properties pr on i.property_id = pr.id
                    WHERE	pr.company_id = ${connection.escape(company_id)}
                            AND pr.id = ${connection.escape(property_id)}
                            ${breakdown_id ? ` and ipb.id = ${breakdown_id}` : ''}
                            AND (ipb.amount - IFNULL((select sum(amount) from invoice_lines_allocation where invoice_payment_breakdown_id = ipb.id), 0)) <> 0
                    ORDER BY ipb.invoice_id ASC, ipb.id ASC`;
        console.log("SQL Find Invoice Breakdown: ", sql);

        return connection.queryAsync(sql);
    },

    findInvoiceAndBreakdowns(connection, company_id, property_id){
        let sql  = `SELECT  ipb.id, ipb.invoice_id, pr.id, i.subtotal + i.total_tax - i.total_discounts as it, i.total_payments AS ITP, group_concat(ipb.id) as defected_ids, 
                            (select group_concat(id) from invoices_payments_breakdown where id >= min(ipb.id) and invoice_id = ipb.invoice_id group by invoice_id) as breakdown_ids,
                            (select group_concat(refund_id) from invoices_payments_breakdown where id >= min(ipb.id) and invoice_id = ipb.invoice_id group by invoice_id) refund_ids
                    FROM    invoices_payments_breakdown ipb
                            JOIN invoices i on i.id = ipb.invoice_id
                            JOIN properties pr on i.property_id = pr.id
                    WHERE   pr.company_id = ${connection.escape(company_id)}
                            AND pr.id = ${connection.escape(property_id)}
                            AND (ipb.amount - IFNULL((select sum(amount) from invoice_lines_allocation where invoice_payment_breakdown_id = ipb.id), 0)) <> 0
                    group by ipb.invoice_id
                    ORDER BY ipb.invoice_id ASC, ipb.id ASC`;
        console.log("SQL find Invoice And Breakdowns: ", sql);

        return connection.queryAsync(sql);
    },

    findPaidInvoicesByDate(connection, date, lease_id, params = {}) {
        let sql = `select * from invoices where total_payments > 0 and status = 1 and due >= ${connection.escape(date)}and lease_id = ${connection.escape(lease_id)}`;
        if(params && params.sort_by_desc) {
            sql += ' Order by due desc';
        }
        console.log("SQL Adj Invoices:", sql);
        return connection.queryAsync(sql);
    },


    async getInvoiceAdjustmentSetting(connection, invoice_id) {
        let invAdjSettingsSql = `
            select i.id, 
                IFNULL(
                        (select value from settings where property_id = p.id and name = 'invoiceAdjustmentDays'), 
                        (select value from settings where company_id = p.company_id and property_id is null and name = 'invoiceAdjustmentDays')
                ) as invoice_adjustment_days
            from invoices i
            inner join properties p on p.id = i.property_id
            where i.id = ${connection.escape(invoice_id)}`;
        return connection.queryAsync(invAdjSettingsSql).then(res => { return res.length ? res[0] : null });   
    },

    async findAll(connection, params) {
        const { status, defaultType, leaseId } = params;
        if(!leaseId) return null;        

        let sql = `select * from invoices where lease_id = ${connection.escape(leaseId)}`; 
        if(status) {
            sql += ` and status = ${connection.escape(status)}`;
        }   
        if(defaultType) {
            sql += ` and id in (select invoice_id from invoice_lines where product_id in (select id from products where default_type = ${connection.escape(defaultType)}))`;
        }

        return connection.queryAsync(sql); 
    },

    async findReissuedToInvoice(connection, invoice_id) {
        let sql = `select * from invoices where reissued_from = ${connection.escape(invoice_id)}`;
        return connection.queryAsync(sql); 
    },

    async findPastBillingIntervals(connection, lease_id, params){
        let { date, limit } = params;
        let sql = `select distinct(period_start) as start, period_end as end
                    from invoices 
                    where lease_id = ${connection.escape(lease_id)}
                    and id in (select invoice_id from invoice_lines where product_id in (select id from products where default_type = 'rent'))`;

        if(date){
            sql += ` and DATE(period_start) < ${connection.escape(date)} and ${connection.escape(date)} not between DATE(period_start) and DATE(period_end)`;
        }
        sql += ' order by period_start desc';
        
        if(limit){
            sql += ` limit ${connection.escape(limit)}`;
        }
        
        console.log("SQL: ", sql);
                    
        return connection.queryAsync(sql);
    },

    findInvoicePaymentsFromBreakdown(connection, invoice_id){
        let sql = ` SELECT payment_id
                    FROM   invoices_payments_breakdown
                    WHERE  invoice_id = ${invoice_id}
                    GROUP BY payment_id;`
        return connection.queryAsync(sql); 
    },
    async findInvoiceBreakDownById(connection, breakdown_id, refund_id){
        let sql = `select b.payment_id,${refund_id ? '(a.amount * -1)' :'a.amount'} as amount , a.type as line_type, l.product_id, l.total_discounts as discounts, p.default_type, p.category_type, ifnull(prp.income_account_id, p.income_account_id) as income_account_id, p.slug, i.property_id, i.lease_id, u.type as unit_type, a.invoice_payment_id from invoices_payments_breakdown b
        inner join invoice_lines_allocation a on a.invoice_payment_breakdown_id = b.id
        inner join invoices i on i.id = a.invoice_id
        left join leases li on li.id = i.lease_id
        left join units u on u.id = li.unit_id
        left join invoice_lines l on l.id = a.invoice_line_id
        left join products p on p.id = l.product_id
        left join property_products prp on prp.product_id = p.id and prp.property_id = u.property_id
        where  ${refund_id ? `b.refund_id = ${refund_id}` :`b.id = ${breakdown_id}`}`

        console.log('findInvoiceBreakDownById ', sql);

        return connection.queryAsync(sql);
    },
    findUnappliedPayments(connection, lease_id){
        let sql = ` select id from payments 
                    where (amount - (select sum(amount) from invoices_payments where payment_id = payments.id) - (IFNULL((select sum(amount) from refunds where payment_id = payments.id), 0))) > 0 
                        and id in (select payment_id from invoices_payments where invoice_id in 
                            (select id from invoices where lease_id = ${connection.escape(lease_id)})
                        ) and status = 1`;
                        
        return connection.queryAsync(sql);
    },

    findUnit(connection, lease_id){
        let sql = `select * from units where id in (select unit_id from leases where id = ${connection.escape(lease_id)})`;
        return connection.queryAsync(sql).then(res => { return res.length ? res[0] : null });
    },
    
    /**
     * This Method will return Recurring invoice lines
     * @param {Object} connection 
     * @param {Object} searchParams Can contain values like limit, offset or status
     * @param {Array} properties Array of properties 
     * @param {Boolean} count If true, this method will just return the number of records
     */
    findRecurringInvoiceLines(connection, searchParams, properties, count = false) {
        if (!properties?.length) {
            e.th(400, "properties are required")
        }

        let status = {
            "all": "",
            "inactive": " AND l.end_date < CURRENT_DATE()",
            "future": " AND l.start_date > CURRENT_DATE()",
            "active": " AND l.start_date <= CURRENT_DATE() AND (l.end_date >= CURRENT_DATE OR l.end_date IS NULL)"
        }
        let dataQuery = `
            il.id,
            il.invoice_id AS invoice_id,
            l.id AS lease_id,
            u.property_id AS property_id,
            s.service_type AS \`type\`,
            s.price,
            il.cost AS amount,
            l.unit_id AS unit_id,
            il.start_date,
            il.end_date,
            il.total_tax AS tax
        `
        let limitOrderQuery = `
            ORDER BY l.id, l.start_date DESC
            LIMIT ${connection.escape(parseInt(searchParams.offset))} , ${connection.escape(parseInt(searchParams.limit))}
        `
        let sql = `        
            SELECT
                ${ count ? 'COUNT(il.id) AS total_records' : dataQuery }
            FROM leases l 
                INNER JOIN invoices i ON i.lease_id = l.id AND i.status > 0
                INNER JOIN invoice_lines il ON il.invoice_id = i.id 
                INNER JOIN services s ON il.service_id = s.id AND s.recurring = TRUE 
                LEFT OUTER JOIN units u ON l.unit_id = u.id
            WHERE l.status = 1 
                AND l.unit_id IN 
                (
                    SELECT
                        id 
                    FROM units 
                    WHERE property_id IN 
                    (
                        ${properties.map(property => connection.escape(property)).join(', ')}
                    )
                )
                ${ status[searchParams.status] }
            ${ count ? '' : limitOrderQuery };
        `
        return connection.queryAsync(sql).then(res => { return count ? res?.[0]?.total_records ?? 0 : res.length ? res : [] });
    },

    getInvoiceLineAllocationByPaymentAndLease(connection, payment_id, lease_id) {
        if (!payment_id) {
            e.th(400, "payment id is required")
        }

        if (!lease_id) {
            e.th(400, "lease id is required")
        }

        let sql = `
            (
                select
                    distinct ila.id as ila_id,
                    ifnull(ila.amount, 0) as amount,
                    Date(inv.period_start) as start,
                    Date(inv.period_end) as end,
                    CASE
                        WHEN p.default_type = 'security' THEN 'deposit'
                        WHEN p.default_type = 'product' THEN 'other'
                        WHEN p.default_type = 'insurance' THEN 'insurance'
                        WHEN p.default_type = 'late' THEN 'fee'
                        WHEN p.default_type = 'rent' THEN 'rent'
                        ELSE 'other'
                    END as costType,
                    p.name as description,
                    0 as tax,
                    null as pmsRaw
                from invoice_lines_allocation ila
                    join invoices inv ON ila.invoice_id = inv.id
                    join invoices_payments_breakdown ipb ON ila.invoice_payment_breakdown_id = ipb.id
                    join invoice_lines il ON ila.invoice_line_id = il.id
                    join products p ON il.product_id = p.id
                where ipb.payment_id = ${connection.escape(payment_id)}
                    and inv.lease_id = ${connection.escape(lease_id)}
                    and ila.type != 'tax'
            )
            UNION
            (
                select
                    null as ila_id,
                    0 as amount,
                    current_date() as start,
                    curdate() as end,
                    'tax' as costType,
                    'tax' as description,
                    ifnull(SUM(ila.amount), 0) as tax,
                    null as pmsRaw
                from invoice_lines_allocation ila
                    join invoices inv ON ila.invoice_id = inv.id
                    join invoices_payments_breakdown ipb ON ila.invoice_payment_breakdown_id = ipb.id
                    left join invoice_lines il ON ila.invoice_line_id = il.id
                    left join products p ON il.product_id = p.id
                where ipb.payment_id = ${connection.escape(payment_id)}
                    and inv.lease_id = ${connection.escape(lease_id)}
                    and ila.type = 'tax'
            )
        `
        console.log('getInvoiceLineAllocationByPaymentAndLease: ', sql);

        return connection.queryAsync(sql);
    },

    getAllPastDueInvoices(connection, params, getCount) {
        if (!params.property_ids) e.th(400, 'property_ids are required')
        
        let attributes = getCount ? ` COUNT(DISTINCT i.id) AS total_records ` :
            `
            i.id,
            i.lease_id,
            i.property_id,
            i.\`number\`,
            i.\`date\`,
            i.due,
            i.\`type\`,
            i.status,
            DATE_FORMAT(i.period_start, "%Y-%m-%d") AS period_start,
            DATE_FORMAT(i.period_end, "%Y-%m-%d") AS period_end,
            SUM(il.total_discounts) AS discounts,
            ROUND(SUM(il.qty*il.cost) + SUM(il.total_tax), 2) AS total_due,
            SUM(il.total_tax) AS total_tax,
            SUM(il.qty*il.cost) AS sub_total,
            ( SELECT 
                    SUM(ip.amount)
                FROM 
                    invoices_payments ip 
              JOIN payments p ON ip.payment_id = p.id 
              WHERE 
                  p.status = 1 
                  AND ip.invoice_id = i.id 
                  AND ip.amount > 0
            ) AS total_payments,
            COALESCE(i.subtotal, 0) + COALESCE(i.total_tax, 0) - COALESCE(i.total_discounts, 0) - COALESCE(i.total_payments, 0) AS balance,
            IFNULL(
                (
                    SELECT 
                    JSON_ARRAYAGG(
                      JSON_OBJECT(
                        'id', il.id, 
                        'discount_id', il.discount_id,
                        'cost', il.cost, 
                        'amount_paid', IFNULL(( SELECT SUM(ila.amount) FROM invoice_lines_allocation ila WHERE ila.invoice_line_id = il.id), 0),
                        'qty', il.qty,
                        'start_date', il.start_date,
                        'end_date', il.end_date,
                        'Product', (
                            SELECT 
                            JSON_OBJECT(
                                'id', pr.id,
                                'name', pr.name,
                                'default_type', pr.default_type,
                                'price', pr.price
                            ) FROM 
                                products pr
                              WHERE 
                                il.product_id = pr.id
                          )
                        )
                   )
                ), JSON_ARRAY()
            ) AS InvoiceLines,
            IFNULL (
                (
                    SELECT JSON_ARRAYAGG(
                        JSON_OBJECT(
                            'id', dli.id,
                            'discount_id', dli.discount_id,
                            'amount', dli.amount,
                            'pretax', dli.pretax 
                        )
                    )
                    FROM discount_line_items dli WHERE dli.invoice_line_id = il.id
                ), 
                JSON_ARRAY()
            ) AS DiscountLines,
            IFNULL(
                (
                    SELECT JSON_ARRAYAGG(
                        JSON_OBJECT(
                            'id', tli.id,
                            'amount', tli.amount,
                            'taxrate', tli.taxrate 
                        )
                    ) FROM tax_line_items tli WHERE tli.invoice_line_id = il.id
                ), JSON_ARRAY()
            ) AS TaxLines
            `
        let limitOrderQuery = getCount ? ` AND COALESCE(i.subtotal, 0) + COALESCE(i.total_tax, 0) - COALESCE(i.total_discounts, 0) - COALESCE(i.total_payments, 0) > 0 ` : 
            `
                GROUP BY i.id
                HAVING balance > 0
                ORDER BY i.id, i.lease_id DESC
                LIMIT ${connection.escape(parseInt(params.offset))} , ${connection.escape(parseInt(params.limit))}
            `
        let sql = `
                SELECT 
                    ${attributes}
                FROM 
                    invoices i
                    JOIN invoice_lines il on il.invoice_id = i.id
                    JOIN properties p ON p.id = i.property_id
                WHERE i.property_id IN (${params.property_ids})
                    AND i.due < CURRENT_DATE()
                    AND i.voided_at IS NULL
                    AND i.status > 0
                ${limitOrderQuery}
            `
        return connection.queryAsync(sql).then(res => {
            return getCount ? res?.[0]?.total_records ?? 0 : res.length ? res : []
        });
    }, 

    async findInvoicesBetweenDates(connection, lease_id, start_date, end_date){
        let sql = `SELECT * from invoices where lease_id = ${connection.escape(lease_id)} and due >= ${connection.escape(start_date) } and due < ${connection.escape(end_date)} and status = 1;  `; 
        console.log("findInvoicesBetweenDates sql", sql)
        return connection.queryAsync(sql)
    },

    async isInterPropertyInvoiceById(connection, invoice_id){
        let sql = `
                Select 
                    IF(p.default_type = '${ENUMS.PRODUCT_DEFAULT_TYPES.INTER_PROPERTY_ADJUSTMENT}' ,true,false) as is_inter_property
                from invoice_lines il
                left join products p on p.id = il.product_id
                where il.invoice_id = ${connection.escape(invoice_id)}
                group by il.invoice_id;`
        return connection.queryAsync(sql);
    },

    async updateInvoicesContactId(connection, payload){
        let sql = `
            UPDATE 
            invoices 
            set contact_id = ${connection.escape(payload.new_contact_id)}
            WHERE contact_id = ${connection.escape(payload.contact_id)}
                AND lease_id = ${connection.escape(payload.lease_id)}
        `;

        console.log("updateInvoicesContactId SQL:", sql)
        return await connection.queryAsync(sql);
    },

    async findRentInvoicesFromDateOnward(connection, lease_id, date){
        let sql = `
        select  i.*
        from invoices i
            inner join invoice_lines il on il.invoice_id = i.id
            inner join services s on s.id = il.service_id
            inner join products p on p.id = s.product_id and p.default_type = 'rent' and category_type = 'rent'
        where
            i.status = 1 and (i.voided_at is NULL or i.void_date is null)
            ${lease_id ? `and i.lease_id = ${connection.escape(lease_id)}` : ''}
            and ( (date(${connection.escape(date)}) between date(i.period_start) and date(i.period_end) ) or date(i.period_start) >= ${connection.escape(date)} )
        order by due asc;`

        console.log('findRentInvoicesByDate - sql', sql);
        let inv_res = await connection.queryAsync(sql);
        return inv_res;

    },
    async updateInvoicesContactId(connection, payload){
        let sql = `
            UPDATE 
            invoices 
            set contact_id = ${connection.escape(payload.new_contact_id)}
            WHERE contact_id = ${connection.escape(payload.contact_id)}
                AND lease_id = ${connection.escape(payload.lease_id)}
        `;

        console.log("updateInvoicesContactId SQL:", sql)
        return await connection.queryAsync(sql);
    }
};
module.exports = Invoice;
