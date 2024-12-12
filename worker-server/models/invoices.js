var settings    = require(__dirname + '/../config/settings.js');
var utils    = require(__dirname + '/../modules/utils.js');
var moment = require('moment');
var Sql = require(__dirname + '/../modules/sql_snippets.js');
var Enums = require(__dirname + '/../modules/enums.js');

let Invoice = {

    // Not used currently in application, need testing before any usage
    search(connection, conditions = {}, searchParams, company_id, properties, count){
        var sql = '';
        if(count){
            sql = "SELECT count(*) as count ";
        } else {

            sql = "SELECT *, " +
    
            "(Select contact_id from contact_leases where lease_id = ( select id from leases where id = invoices.lease_id) ) as contact_invoice_id, " +

                "(Select address from addresses where id = (select address_id from units where id = (select unit_id from leases where id = invoices.lease_id)) ) as address, " +

                "(Select city from addresses where id = (select address_id from units where id = (select unit_id from leases where id = invoices.lease_id)) ) as city, " +

                "(Select state from addresses where id = (select address_id from units where id = (select unit_id from leases where id = invoices.lease_id)) ) as state, " +

                "(Select zip from addresses where id = (select address_id from units where id = (select unit_id from leases where id = invoices.lease_id)) ) as zip, " +

                "(Select number from units where id = (select unit_id from leases where id = invoices.lease_id)) as unit_number, " +

                "( IFNULL(subtotal, 0) + IFNULL(total_tax,0) - IFNULL(total_discounts,0) - IFNULL(total_payments,0) ) AS balance, " +

                "( IFNULL(subtotal, 0) + IFNULL(total_tax,0) - IFNULL(total_discounts,0) ) AS amount";

        }

        sql += " FROM invoices where 1 = 1 " ;


        // sql += " and lease_id in (select id from leases where unit_id in (select id from units where property_id in (select id from properties where company_id = " + connection.escape(company_id) + '))) ';

        sql += " and lease_id in (select id from leases where unit_id in (select id from units where property_id in (" + properties.map(p => connection.escape(p.id)).join(', ') + '))) ';


        if(conditions.lease_id){
            sql += ' and lease_id = ' + connection.escape(conditions.lease_id);
        }

        if(conditions.status){

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

    saveInvoice: async function(connection, data, invoice_id){
        let sql;

        if(!invoice_id){
            if((!data.property_id || !data.contact_id) && data.lease_id){
                sql = `SELECT
                            u.property_id,
                            cl.*
                        FROM leases l
                        INNER JOIN units u on l.unit_id = u.id
                        LEFT JOIN contact_leases cl on l.id = cl.lease_id
                        WHERE l.id = ${connection.escape(data.lease_id)};`
                console.log("Save Invoice SQL :", sql);
               
                let result = await connection.queryAsync(sql);
                console.log("Save Invoice Result :", JSON.stringify(result));
            
                if(result && result.length){
                    let contact_lease = result.find(x => x.primary = 1);
                    console.log("Save Invoice Contact Lease :", contact_lease);

                    data.property_id = (contact_lease && contact_lease.property_id) || null;
                    data.contact_id = (contact_lease && contact_lease.contact_id) || null;
                    console.log("Save Invoice Data :", data);
                }
            } 
        }

        var invoiceSql;
        if(invoice_id){
            invoiceSql = "Update invoices set ? where id = " + invoice_id;
        } else {
            invoiceSql = "insert into invoices set ?";
        }

        console.log("Invoice SQL : ", invoiceSql);
        return connection.queryAsync(invoiceSql, data);
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
            "( IFNULL(subtotal, 0) + IFNULL(total_tax,0) - IFNULL(total_discounts,0) - IFNULL(total_payments,0) ) as total_owed FROM invoices WHERE status > -1 and MONTH(invoices.due) = " + connection.escape(mDate.format('MM')) + " and YEAR(invoices.due) = " + connection.escape(mDate.format('YYYY')) + " and lease_id = leases.id) as total_owed " +
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
        let invoice_line_id = id ? id : response.insertId;
        if(!data.invoice_id){
            let invoiceSql = "select * from invoice_lines where id = " + invoice_line_id;
            var invLines_response = await connection.queryAsync(invoiceSql);
            data.invoice_id = invLines_response[0].invoice_id;
        }

        await Invoice.updateInvoiceTotal(connection, data.invoice_id, invLines_response);
        await Invoice.updateInvoiceTotalTax(connection, data.invoice_id, invLines_response);
        await Invoice.updateInvoiceTotalDiscounts(connection, data.invoice_id, invLines_response);
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

        let invoiceLineIdsSql = "select group_concat(id) id from invoice_lines where invoice_id = " + connection.escape(invoice_id);
        console.log("invoiceLineIdsSql: ", invoiceLineIdsSql);
        let invoiceLineIdsRes = await connection.queryAsync(invoiceLineIdsSql);
        if(invoiceLineIdsRes.length > 0) {
            var deleteTaxSql = "DELETE from tax_line_items where invoice_line_id in (" + invoiceLineIdsRes[0].id + ")";
            await connection.queryAsync(deleteTaxSql);
            var deleteDiscountSql = "DELETE from discount_line_items where invoice_line_id in (" + invoiceLineIdsRes[0].id + ")";
            await connection.queryAsync(deleteDiscountSql);
        }

        var deleteLineSql = "DELETE from invoice_lines where invoice_id = " + connection.escape(invoice_id);
        await connection.queryAsync(deleteLineSql);

        await Invoice.updateInvoiceTotal(connection, invoice_id);
        await Invoice.updateInvoiceTotalTax(connection, invoice_id);
        await Invoice.updateInvoiceTotalDiscounts(connection, invoice_id);

    },


    findMonthlyInvoices: function(connection,  company_id, momentDate, options ){
        var sql;
        sql = "Select * from invoices  where status > -1 and MONTH(due) = " + momentDate.format('MM') + " and YEAR(due) = " + momentDate.format('YYYY') + " and lease_id in (select id from leases where unit_id in (select id from units where property_id in (select id from properties where company_id = " + connection.escape(company_id)  + "))) limit " + connection.escape(parseInt(options.offset)) + ", " + connection.escape(parseInt(options.limit));


        return connection.queryAsync(sql);
    },

    findInvoicesToSend: function(connection){
        var sql;
        sql = "Select * from invoices where status > -1 and to_send = 1";

        return connection.queryAsync(sql);
    },

    findInvoicesByLeaseId: function(connection, lease_id, date, type){

        var sql = "Select * from invoices where status = 1 and  lease_id = " + connection.escape(lease_id) +" and due = " + connection.escape(date) + " and type = " + connection.escape(type) ;
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

            sql = "SELECT *,  ( IFNULL(subtotal, 0) + IFNULL(total_tax,0) - IFNULL(total_discounts,0) - IFNULL(total_payments,0) ) as balance, " +

                "(select number from units where units.id = (select unit_id from leases where id = invoices.lease_id)) as unit_number, " +

                "(select id from properties where id = (select property_id from units where id = (select unit_id from leases where id = invoices.lease_id))) as property_id, " +

                "(select address from addresses where id = (select address_id from units where units.id = (select unit_id from leases where id = invoices.lease_id))) as address, " +

                "(select city from addresses where id = (select address_id from units where units.id = (select unit_id from leases where id = invoices.lease_id))) as city, " +

                "(select state from addresses where id = (select address_id from units where units.id = (select unit_id from leases where id = invoices.lease_id))) as state, " +

                "(select zip from addresses where id = (select address_id from units where units.id = (select unit_id from leases where id = invoices.lease_id))) as zip "
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

    findAllInvoicesOfLease(connection,lease_id){
        var sql = "Select * from invoices where lease_id = " + connection.escape(lease_id);
        
        return connection.queryAsync(sql).then(function(invoices){
            if(!invoices.length) return null;
            return invoices;
        })
    },

    findDueByLease(connection, lease_ids){

        var invoiceSql =  `select *, ( IFNULL(subtotal, 0) + IFNULL(total_tax,0) - IFNULL(total_discounts,0) - IFNULL(total_payments,0) ) as total_owed FROM invoices WHERE status = 1 and  lease_id in (${lease_ids.map(lid => connection.escape(lid)).join(', ')}) HAVING total_owed > 0 ORDER BY due ASC `;
        console.log('Get Due Invoices by Lease ID:', invoiceSql);
        return connection.queryAsync(invoiceSql);

    },

    findOpenByLease(connection, lease_id, due_date){

        var due_date = due_date || moment().format('YYYY-MM-DD');
        var invoiceSql =  "select *, ( IFNULL(subtotal, 0) + IFNULL(total_tax,0) - IFNULL(total_discounts,0) - IFNULL(total_payments,0) ) as total_owed FROM invoices WHERE status > -1 and due <= '" + due_date + "' and lease_id = " + connection.escape(parseInt(lease_id)) + " HAVING total_owed > 0 ORDER BY due ASC; ";
        return connection.queryAsync(invoiceSql);

    },

    findPastDueByLease(connection, lease_id, due_date){

        var due_date = due_date || moment().format('YYYY-MM-DD');


        var invoiceSql =  "select *, ( IFNULL(subtotal, 0) + IFNULL(total_tax,0) - IFNULL(total_discounts,0) - IFNULL(total_payments,0) ) as total_owed FROM invoices WHERE status > -1 and due < '" + due_date + "' and lease_id = " + connection.escape(parseInt(lease_id)) + " HAVING total_owed > 0 ORDER BY due ASC; ";
        
        // var invoiceSql =  "select *, " +
        //     "( " +
        //         "SELECT SUM( " +
        //             "(qty*cost) - " +
        //             " IFNULL((select sum(amount) from discount_line_items where invoice_line_id = invoice_lines.id), 0) + " +
        //                 " ROUND( " +
        //                     "( " +
        //                         "(qty * cost) - " +
        //                         "IFNULL( " +
        //                             "(SELECT SUM(amount) from discount_line_items WHERE invoice_line_id = invoice_lines.id AND pretax = 1) " +
        //                         ",0) " +
        //                     " ) * " +
        //                     "IFNULL( " +
        //                         "(SELECT SUM(taxrate) FROM tax_line_items WHERE invoice_line_id = invoice_lines.id) /100 " +
        //                     ", 0) " +
        //             ", 2) " +
        //         ") from invoice_lines where invoice_id = invoices.id " +
        //     ") - " +
        //     "(SELECT IFNULL(SUM(amount),0) FROM invoices_payments WHERE invoice_id = invoices.id)  as total_owed FROM invoices WHERE status > -1 and due < '" + due_date + "' and lease_id = " + connection.escape(parseInt(lease_id)) + " HAVING total_owed > 0 ORDER BY due ASC; ";

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


                "(select due from invoices where invoice_lines.invoice_id = invoices.id) as invoice_date, " +
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

        var sql = "SELECT *, ( IFNULL(subtotal, 0) + IFNULL(total_tax,0) - IFNULL(total_discounts,0) - IFNULL(total_payments,0) ) AS total_owed FROM invoices WHERE status > -1 and (SELECT late_fee FROM leases WHERE id = invoices.lease_id) IS NOT NULL AND (SELECT late_fee_subsequent FROM leases WHERE id = invoices.lease_id) IS NOT NULL AND MOD(DATEDIFF(CURDATE(), DATE_ADD(due, INTERVAL (SELECT late_fee_days FROM leases WHERE id = invoices.lease_id) DAY)), (SELECT late_fee_subsequent_days FROM leases WHERE id = invoices.lease_id)) = 0 AND invoices.lease_id IN (SELECT id FROM leases WHERE unit_id IN (SELECT id FROM units WHERE property_id IN (SELECT id FROM properties WHERE company_id =  "+ connection.escape(company_id)+"))) HAVING total_owed > 0  ORDER BY invoices.id DESC;";



        return connection.queryAsync(sql);

    },

    findCompanyIdByInvoice(connection, invoice_id){
        var sql = "select company_id from properties where id = (select property_id from units where id = (select unit_id from leases where id = (select lease_id from invoices where id = "+connection.escape(invoice_id)+")))";

        return connection.queryAsync(sql).then(result => {
            if(!result.length) return null;
            return result[0].company_id;
        })

    },

    findFutureBilled(connection, lease_id, date){

        date = date || moment().format('YYYY-MM-DD');

        var sql = 'select * from invoices where lease_id = ' + connection.escape(lease_id) + ' and status >= 0 and id in (select invoice_id from invoice_lines where end_date > ' + connection.escape(date) + ' and (select prorate from services where services.id = invoice_lines.service_id  ) = 1)';

        console.log(sql);

        return connection.queryAsync(sql).then(r => {
            console.log(r);
            return r;
        })

    },

    findLastBilled(connection, lease_id, params = {}){
        let { rent = false, activeInvoice = false } = params;
        var sql = `Select MAX(end_date) as last_billed from invoice_lines where invoice_id in (select id from invoices where lease_id = ${connection.escape(lease_id)} ${activeInvoice ? 'and status = 1' : ''}  )`;

        if(rent){
            sql += " AND product_id in (select id from products where default_type = 'rent') "
        }

        console.log("findLastBilled--sql", sql);

        return connection.queryAsync(sql).then(r => r ? r[0].last_billed : null);
    },

    findInvoiceByNumber(connection, company_id, number, id){

        var sql = "Select * from invoices where lease_id in (select id from leases where unit_id in (select id from units where property_id in (select id from properties where company_id = " + connection.escape(company_id) + " ))) and number = " + "'" + connection.escape(number) + "'";
        if(id){
            sql += " and id != " + connection.escape(id)
        }
        console.log("sql", sql)
        return connection.queryAsync(sql).then(r => r ? r[0] : null);
    },

    findAutoByDate(connection, date, company_id, lease_id){
       var sql = "Select * from invoices where type = 'auto' and date = " + connection.escape(date);

       if(lease_id){
           sql += " and lease_id = " + connection.escape(lease_id);
       } else {
           sql += " and lease_id in (select id from leases where unit_id in (select id from units where property_id in (select id from properties where company_id = " + connection.escape(company_id) + ")))";
       }
        console.log(sql);
       return connection.queryAsync(sql).then(r =>  r ? r[0]: null);
   },

   findUnit(connection, invoice_id){
        let sql = `SELECT * from units where id = (select unit_id from leases where id = (select lease_id from invoices where id = ${connection.escape(invoice_id)}))`;
        console.log("SQL", sql);
        return connection.queryAsync(sql).then(r => r ? r[0] : null);
    },

    payment_amt_remaining_summary(connection){
       var sql = `select
            *
        from
            payments
        where
            amt_remaining < 0`;
       return connection.queryAsync(sql);
    },

    amt_not_equal_to_refund_sub_applied(connection){
        var sql = `select
            *,
            amount,
            (
            SELECT
                IFNULL(SUM(amount),
                0)
            from
                refunds
            where
                payment_id = payment_id = payments.id) as refunds,
            (
            select
                IFNULL(SUM(amount),
                0)
            from
                invoices_payments
            where
                payment_id = payments.id) as amt_applied,
            amount - (
            SELECT
                IFNULL(SUM(amount),
                0)
            from
                refunds
            where
                payment_id = payment_id = payments.id) - (
            select
                IFNULL(SUM(amount),
                0)
            from
                invoices_payments
            where
                payment_id = payments.id) as actual_amt_remaining
        FROM
            payments
        WHERE
            amount - (
            select
                IFNULL(SUM(amount),
                0)
            from
                invoices_payments
            where
                payment_id = payments.id) - (
            SELECT
                IFNULL(SUM(amount),
                0)
            from
                refunds
            where
                payment_id = payment_id = payments.id) != amt_remaining`

        return connection.queryAsync(sql);
    },
    
    amt_applied_not_equal_total_payments(connection){
        var sql = `select
            i.*,
            (
            SELECT
                IFNULL(SUM(amount),
                0)
            from
                invoices_payments
            where
                payment_id = ip.payment_id
                and date <= CURDATE()) as amt_applied
        from
            invoices i
        inner join invoices_payments ip on
            ip.invoice_id = i.id
        where
            i.status = 1
        group by
            i.id
        having
            amt_applied <> total_payments
        limit 4000`

        return connection.queryAsync(sql);
    },

    invoice_date_different_from_period_start(connection, company_ids){
        var sql = `select
            *
        from
            invoices
        where
            due != DATE(period_start)
            and lease_id in (
            select
                id
            from
                leases
            where
                unit_id in (
                select
                    id
                from
                    units
                where
                    property_id in (
                    select
                        id
                    from
                        properties
                    where
                        company_id in (${company_ids.map(c => connection.escape(c)).join(', ')}))))
                    order by id asc`
        return connection.queryAsync(sql);
    },

    invoice_period_more_than_one_month(connection, company_ids){
        var sql = `select
            *
        from
            invoices
        where
            DATEDIFF(DATE(period_end),
            DATE(period_start)) > 31
            and lease_id in (
            select
                id
            from
                leases
            where
                unit_id in (
                select
                    id
                from
                    units
                where
                    property_id in (
                    select
                        id
                    from
                        properties
                    where
                        company_id in (${company_ids.map(c => connection.escape(c)).join(', ')}))))
                    and DATE(created_at) >= '2020-01-01'
            order by id asc`;

        return connection.queryAsync(sql);
    },

    invoices_missing_inovice_lines(connection){
        var sql = `SELECT 
            *
        FROM
            invoices
        WHERE
            NOT EXISTS( SELECT 
                    id
                FROM
                    invoice_lines
                WHERE
                    invoice_id = invoices.id)`;

        return connection.queryAsync(sql);
    },

    invoices_total_wrong_calculation(connection){
        var sql = `select
            *,
            (
            select
                SUM(cost * qty)
            from
                invoice_lines
            where
                invoice_id = invoices.id) as actual_subtotal
        from
            invoices
        where
            (
            select
                SUM(cost * qty)
            from
                invoice_lines
            where
                invoice_id = invoices.id) != subtotal`;

        return connection.queryAsync(sql);
    },

    active_payment_on_void_invoices(connection, date){
        var sql = `select
            *,
            (
            select
                status
            from
                invoices
            where
                id = invoice_id) as invoice_status
        from
            invoices_payments
        where
            invoice_id in (
            select
                id
            from
                invoices
            where
                status < 1)
            and payment_id in (
            select
                id
            from
                payments
            where
                status = 1)`;
        if(date) sql += " and date >= " + connection.escape(date);
        sql += " order by id desc";

        return connection.queryAsync(sql);
    },

    active_invoices_on_void_payment(connection){
        var sql = `select
            *,
            (
            select
                status
            from
                invoices
            where
                id = invoice_id) as invoice_status
        from
            invoices_payments
        where
            invoice_id in (
            select
                id
            from
                invoices
            where
                status = 1)
            and payment_id in (
            select
                id
            from
                payments
            where
                status = 0)
        order by
            id desc`;

        return connection.queryAsync(sql);
    },

    applied_plus_refund_greater_payment_amount(connection){
        var sql = `SELECT 
            *,
            (SELECT 
                    SUM(amount)
                FROM
                    invoices_payments
                WHERE
                    payment_id = payments.id) AS allocated,
            (SELECT 
                    SUM(amount)
                FROM
                    refunds
                WHERE
                    payment_id = payment_id = payments.id) AS refunded
        FROM
            payments
        HAVING allocated + refunded > amount`;

        return connection.queryAsync(sql);
    },

    amt_applied_greater_than_actual_total(connection){
        var sql = `SELECT 
            i.*,
            (IFNULL(SUM(amount), 0)) AS amt_applied,
            (SELECT 
                    IFNULL(SUM(subtotal), 0) + IFNULL(SUM(total_tax), 0) - IFNULL(SUM(total_discounts), 0)
                FROM
                    invoices
                WHERE
                    lease_id = (SELECT 
                            lease_id
                        FROM
                            invoices
                        WHERE
                            id = ip.invoice_id)) AS actual_amount
        FROM
            invoices_payments ip
                INNER JOIN
            invoices i ON i.id = ip.invoice_id
        GROUP BY i.lease_id
        HAVING amt_applied > actual_amount
        ORDER BY ip.id DESC`;

        return connection.queryAsync(sql);
    },

    tax_applied_not_equal__actual_total_tax(connection){
        var sql = `select
            *,
            (
            select
                IFNULL(SUM(amount),
                0)
            from
                tax_line_items
            where
                invoice_line_id in (
                select
                    id
                from
                    invoice_lines
                where
                    invoice_id = invoices.id)) as actual_tax
        from
            invoices
        where
            total_tax != (
            select
                ROUND(IFNULL(SUM(amount), 0), 2)
            from
                tax_line_items
            where
                invoice_line_id in (
                select
                    id
                from
                    invoice_lines
                where
                    invoice_id = invoices.id))`;

        return connection.queryAsync(sql);
    },


    active_leases_bill_today_invoice_not_generated(connection){
        var sql = `Select
            *
        from
            leases
        where
            start_date <= CURDATE()
            and status = 1
            and (end_date IS NULL
            OR end_date > CURDATE())
            and bill_day = DAY(CURDATE())
            and (
            select
                count(*)
            from
                invoices
            where
                status > -1
                and lease_id = leases.id) = 0`;

        return connection.queryAsync(sql);
    },
    
    active_leases_not_charge_bill_today_auto_pay_active(connection){
        var sql = `Select
            *
        from
            leases
        where
            start_date <= CURDATE()
            and status = 1
            and (end_date IS NULL
            OR end_date > CURDATE())
            and bill_day = DAY(CURDATE())
            and ( (
            select
                count(*)
            from
                invoices_payments
            where
                invoice_id in (
                select
                    id
                from
                    invoices
                where
                    status > -1
                    and lease_id = leases.id) > 0 ) > 0 )
            and (
            select
                count(*)
            from
                payment_methods
            where
                lease_id = leases.id
                and auto_charge = 1
                and type = 'card' ) > 0`;

        return connection.queryAsync(sql);
    },

    invoices_total_payment_not_updated(connection){

        var sql = `SELECT
            i.lease_id,
            i.id,
            i.number,
            (
            select
                SUM(amount)
            from
                invoices_payments
            where
                invoice_id = i.id) - i.total_payments as difference
        from
            invoices i
        where
            i.total_payments != (
            select
                SUM(amount)
            from
                invoices_payments
            where
                invoice_id = i.id)
            and i.status > -1
        HAVING
            difference > 0`;

        return connection.queryAsync(sql);
    },

    invoice_lines_with_cost_null(connection){

        var sql = `select
            *,
            (
            select
                company_id
            from
                properties
            where
                id = (
                select
                    property_id
                from
                    units
                where
                    id = (
                    select
                        unit_id
                    from
                        leases
                    where
                        id = (
                        select
                            lease_id
                        from
                            invoices
                        where
                            id = invoice_lines.invoice_id)))) as company_id
        from
            invoice_lines
        where
            cost is null`;

        return connection.queryAsync(sql);
    },

    invoices_total_discount_sum(connection){

        var sql = `select
            *,
            (
            select
                SUM(amount)
            from
                discount_line_items
            where
                discount_line_items.invoice_line_id in (
                select
                    id
                from
                    invoice_lines
                where
                    invoice_id = invoices.id)) as discounts
        from
            invoices
        where
            id > 0
            and total_discounts != (
            select
                SUM(amount)
            from
                discount_line_items
            where
                discount_line_items.invoice_line_id in (
                select
                    id
                from
                    invoice_lines
                where
                    invoice_id = invoices.id))`;

        return connection.queryAsync(sql);
    },

    invoice_lines_total_discount_sum(connection){

        var sql = `select
            *,
            (
            select
                SUM(amount)
            from
                discount_line_items
            where
                discount_line_items.invoice_line_id = invoice_lines.id) as discounts
        from
            invoice_lines
        where
            total_discounts != (
            select
                SUM(amount)
            from
                discount_line_items
            where
                discount_line_items.invoice_line_id = invoice_lines.id)`;

        return connection.queryAsync(sql);
    },

    invoice_lines_total_discount_greater_than_amount(connection){

        var sql = `select
            *,
            (
            select
                IFNULL(SUM(amount),
                0)
            from
                discount_line_items
            where
                discount_line_items.invoice_line_id = invoice_lines.id) as discounts,
            (
            select
                status
            from
                invoices
            where
                invoice_lines.invoice_id = invoices.id) as invoice_status,
            (
            select
                total_discounts
            from
                invoices
            where
                invoice_lines.invoice_id = invoices.id) as invoice_total_discounts,
            (
            select
                company_id
            from
                properties
            where
                id = (
                select
                    property_id
                from
                    units
                where
                    id = (
                    select
                        unit_id
                    from
                        leases
                    where
                        id = (
                        select
                            lease_id
                        from
                            invoices
                        where
                            id = invoice_lines.invoice_id )))) as company_id
        from
            invoice_lines
        where
            total_discounts > qty * cost`;

        return connection.queryAsync(sql);
    },

    findPaidInvoicesByDate(connection, date, lease_id, params = {}) {
        let sql = `select * from invoices where total_payments > 0 and status = 1 and date >= ${connection.escape(date)}and lease_id = ${connection.escape(lease_id)}`;
        if(params && params.sort_by_desc) {
            sql += ' Order by id desc';
        }
        console.log("SQL Adj Invoices:", sql);
        return connection.queryAsync(sql);
    },

    findInvoicePaymentsFromBreakdown(connection, invoice_id){
        let sql = ` SELECT payment_id
                    FROM   invoices_payments_breakdown
                    WHERE  invoice_id = ${invoice_id}
                    GROUP BY payment_id;`
        return connection.queryAsync(sql); 
    },
    
    findInvoiceLinesAllocationByInvoiceId(connection, invoiceId) {
        let sql = `select invoice_line_id, type as line_type, sum(amount) as amount from invoice_lines_allocation where invoice_id = ${invoiceId} group by invoice_line_id, type`;
        return connection.queryAsync(sql);
    },

    async findAdvancePaidInvoices(connection, date, propertyId) {
        const sql = `
            select 
                sum(ip.amount) as advance_payment, i.* from invoices i
                join invoices_payments ip on i.id = ip.invoice_id
                join payments p on ip.payment_id = p.id
            where
                p.method not in ('loss')
                and i.property_id = ${connection.escape(propertyId)} and least(i.period_start, i.due) = ${connection.escape(date)} and i.status != -1
            group by 
                i.id
            having 
                advance_payment > 0;        
        `;

        console.log('Invoices - Advanced Paid Invoices: ', sql);
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

    findPropertyIdByInvoice(connection, invoice_id){
        var sql = "select property_id from units where id = (select unit_id from leases where id = (select lease_id from invoices where id = " + connection.escape(invoice_id) + "))";

        return connection.queryAsync(sql).then(result => {
            if(!result.length) return null;
            return result[0].property_id;
        })

    },
    
    async advancePaidInvoices(connection, payload) {
        const { company_id, property_id, from_date, to_date, invoice_id, should_exclude_loss_payments = true } = payload;

        let sql = `
            select i.*, sum(ipb.amount) as advance_payment 
            from invoices i 
                join invoices_payments_breakdown ipb on ipb.invoice_id = i.id and (i.due > ipb.date)
                join payments p on ipb.payment_id = p.id
                join properties pr on pr.id = i.property_id
            where i.lease_id is not null
        `;

        if(should_exclude_loss_payments) {
            sql += ` and p.method not in ('loss')`;
        }

        if(property_id) {
            sql +=  ` and i.property_id = ${connection.escape(property_id)}`;
        } else if (company_id){
            sql +=  ` and pr.company_id = ${connection.escape(company_id)}`;
        }

        if(from_date){
            sql +=  ` and i.due >= ${connection.escape(from_date)}`;
        }

        if(to_date){
            sql +=  ` and i.due <= ${connection.escape(to_date)}`;
        }
        
        if(invoice_id){
            sql +=  ` and i.id = ${connection.escape(invoice_id)}`;
        }
        
        sql += ` and NOT EXISTS(
                    select id from gl_exports ge where i.id = ge.object_id and (select gl_event_id from gl_event_company where id = ge.gl_event_company_id) in (${Enums.ACCOUNTING.EVENTS.REVENUE_RECOGNITION})
                )`;
        
        sql += ` group by i.id having sum(ipb.amount) order by i.id desc`;

        console.log('Advanced Paid Invoices ', sql);

        return connection.queryAsync(sql);
    },

    getAllInvoices(connection, payload) {
        const { company_id, property_id, from_date, to_date } = payload;

        let sql = `
            select i.* from invoices i
                inner join properties p on p.id = i.property_id
            where 1=1
        `;

        if(property_id) {
            sql +=  ` and i.property_id = ${connection.escape(property_id)}`;
        } else if (company_id){
            sql +=  ` and p.company_id = ${connection.escape(company_id)}`;
        }

        if(from_date){
            sql +=  ` and i.due >= ${connection.escape(from_date)}`;
        }

        if(to_date){
            sql +=  ` and i.due <= ${connection.escape(to_date)}`;
        }

        sql += ` and (i.void_date is null or i.void_date >= i.due)
            and NOT EXISTS(
                select id from gl_exports ge where i.id = ge.object_id and (select gl_event_id from gl_event_company where id = ge.gl_event_company_id) in (${Enums.ACCOUNTING.EVENTS.GENERATING_INVOICE})
            )`;
        
        console.log('Get all invoices: ', sql);
        
        return connection.queryAsync(sql);
    },

    getAllVoidInvoicesToGenerateEvent(connection, payload) {
        const { company_id, property_id, from_date, to_date } = payload;

        let sql = `
            select i.* from invoices i
                inner join properties p on p.id = i.property_id
            where 1=1
        `;

        if(property_id) {
            sql +=  ` and i.property_id = ${connection.escape(property_id)}`;
        } else if (company_id){
            sql +=  ` and p.company_id = ${connection.escape(company_id)}`;
        }

        if(from_date){
            sql +=  ` and i.void_date >= ${connection.escape(from_date)}`;
        }

        if(to_date){
            sql +=  ` and i.void_date <= ${connection.escape(to_date)}`;
        }

        sql += ` and i.void_date >= i.due and NOT EXISTS(
                    select id from gl_exports ge where i.id = ge.object_id and (select gl_event_id from gl_event_company where id = ge.gl_event_company_id) in (${Enums.ACCOUNTING.EVENTS.VOIDING_INVOICE})
                )`;
        
        console.log('Get all void invoices: ', sql);
        
        return connection.queryAsync(sql);
    },

    findInvoiceLinesAllocationByInvoiceId(connection, invoiceId, date) {
        let sql = `select invoice_line_id, type as line_type, sum(amount) as amount from invoice_lines_allocation where 
            invoice_id = ${invoiceId}`; 
            
        if(date) {
            sql += ` date < ${date}`;
        }    

        sql += ` group by invoice_line_id, type`;
        
        return connection.queryAsync(sql);
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
    
    findUnit(connection, lease_id){
        let sql = `select * from units where id in (select unit_id from leases where id = ${connection.escape(lease_id)})`;
        return connection.queryAsync(sql).then(res => { return res.length ? res[0] : null });
    },

    async findActiveRentInvoices(connection, params) {
        let {start, end, lease_id, status} =  params;
        let sql = `select * from invoices 
                    where period_start = ${connection.escape(start)} 
                    and period_end = ${connection.escape(end)} 
                    and lease_id = ${connection.escape(lease_id)} 
                    and status = ${connection.escape(status)}
                    and id in (select invoice_id from invoice_lines where product_id in (select id from products where default_type = 'rent'))`;
        return connection.queryAsync(sql); 
    },

    findInvoiceAndBreakdowns(connection, company_id, params){
        let { property_id, invoice_id } = params;
        let sql  = `SELECT  ipb.id, ipb.invoice_id, pr.id as property_id,
                            i.subtotal + i.total_tax - i.total_discounts as invoice_payable,
                            IFNULL((select sum((qty * cost) + total_tax - total_discounts) from invoice_lines where invoice_id = ipb.invoice_id), 0) as invoice_lines_payable,
                            i.total_payments AS invoice_total_payment,
                            IFNULL((select sum(amount) from invoices_payments_breakdown where invoice_id = ipb.invoice_id), 0) as invoice_breakdown_amount,
                            IFNULL((select sum(amount) from invoice_lines_allocation where invoice_id = ipb.invoice_id), 0) as invoice_allocation_amount,
                            group_concat(ipb.id) as defected_ids, 
                            (select group_concat(id) from invoices_payments_breakdown where id >= min(ipb.id) and invoice_id = ipb.invoice_id group by invoice_id) as breakdown_ids,
                            (select group_concat(refund_id) from invoices_payments_breakdown where id >= min(ipb.id) and invoice_id = ipb.invoice_id group by invoice_id) refund_ids
                    FROM    invoices_payments_breakdown ipb
                            JOIN invoices i on i.id = ipb.invoice_id
                            JOIN properties pr on i.property_id = pr.id
                    WHERE   pr.company_id = ${connection.escape(company_id)}
                            AND (ipb.amount - IFNULL((select sum(amount) from invoice_lines_allocation where invoice_payment_breakdown_id = ipb.id), 0)) <> 0
                            ${property_id ? `AND pr.id = ${connection.escape(property_id)}` : ''}
                            ${invoice_id ? `AND ipb.invoice_id = ${connection.escape(invoice_id)}` : ''}
                    group by ipb.invoice_id
                    ORDER BY ipb.invoice_id ASC, ipb.id ASC`;
        console.log("SQL find Invoice And Breakdowns: ", sql);

        return connection.queryAsync(sql);
    },

    findOldestOpenInvoice(connection, params){
        let { property_id, lease_id } = params;
        let sql = ` SELECT
                        i.lease_id,
                        MIN(i.due) AS due
                    FROM invoices i
                    INNER JOIN leases l ON i.lease_id = l.id
                    WHERE  l.status = 1
                    AND    l.start_date <= curdate()
                    AND    (l.end_date IS NULL OR l.end_date >= curdate())
                    AND    i.status = 1
                    AND    (IFNULL(i.subtotal, 0) + IFNULL(i.total_tax,0) - IFNULL(i.total_discounts,0)  - (SELECT IFNULL(SUM(IFNULL(amount,0)),0) FROM invoices_payments ip WHERE ip.invoice_id = i.id) ) > 0
                    AND 	i.property_id = ${connection.escape(property_id)}
                    ${lease_id ? `AND i.lease_id = ${connection.escape(lease_id)}` : ''}
                    GROUP BY i.lease_id`;
        console.log("SQL findOldestOpenInvoice: ", sql);
        return connection.queryAsync(sql);
    },

    findAllInvoicesByDate(connection, date, lease_id) {
        let sql = ` select
                        i.id,
                        i.lease_id,
                        i.due,
                        i.status,
                        (IFNULL(i.subtotal, 0) + IFNULL(i.total_tax,0) - IFNULL(i.total_discounts,0)) as billing_amount,
                        (SELECT IFNULL(SUM(IFNULL(amount,0)),0) FROM invoices_payments ip WHERE ip.invoice_id = i.id) as payment_amount,
                        (IFNULL(i.subtotal, 0) + IFNULL(i.total_tax,0) - IFNULL(i.total_discounts,0) - (SELECT IFNULL(SUM(IFNULL(amount,0)),0) FROM invoices_payments ip WHERE ip.invoice_id = i.id) ) as balance
                    from invoices i
                    where lease_id = ${connection.escape(lease_id)}
                    and due >= ${connection.escape(date)} 
                    and status in (-1,1)
                    order by due asc;`;
        console.log("SQL findAllInvoicesByDate Invoices:", sql);
        return connection.queryAsync(sql);
    },

    deleteInvoiceLineAllocation(connection, allocation_ids=[]){
        let sql = `Delete from invoice_lines_allocation where id in (${allocation_ids.join(',')});`
        return connection.queryAsync(sql);
    },

    deleteInvoicePaymentBreakDowns(connection, breakdown_ids=[]){
        let sql = `Delete from invoices_payments_breakdown where id in (${breakdown_ids.join(',')});`
        return connection.queryAsync(sql);
    },

    UpdateInvoicePaymentBreakDowns(connection, update_ipb_data){
        let sql = `Update invoices_payments_breakdown set ? where id in (${update_ipb_data.map(x=>x.id).join(',')});`
        return connection.queryAsync(sql,update_ipb_data);
    },

    async UpdateInvoicePayments(connection, invoice_payments_id){
        let ipb_sql = `select count(*) as break_down_length from invoices_payments_breakdown where invoice_payment_id = ${invoice_payments_id}`;
        let breakdownCount = await connection.queryAsync(ipb_sql);
        let sql='';

        if(breakdownCount && breakdownCount.length && breakdownCount[0].break_down_length > 0){
            sql = `Update invoices_payments
            set amount = ifnull((select sum(amount) from invoices_payments_breakdown where invoice_payment_id = ${invoice_payments_id}),0)
            where id = ${invoice_payments_id}`;
        } else {
            sql = `Delete from invoices_payments where id = ${invoice_payments_id}`;
        }
        
        return connection.queryAsync(sql);
    },

    findInvoiceLineAllocationByInvoiceId(connection, invoice_id){
        let sql = `Select id,invoice_payment_id From invoice_lines_allocation where invoice_id = ${connection.escape(invoice_id)};`
        return connection.queryAsync(sql);
    },

    async fetchFutureInvoicesByDateAndLeaseId(connection, leaseId, date, status) {
        const statusFlag = { all: '(1, -1)', active: '(1)', void: '(-1)'}[status];

        const sql = `
            SELECT
                i.*,
                (
                    IFNULL(i.subtotal, 0) +
                    IFNULL(i.total_tax, 0) -
                    IFNULL(i.total_discounts, 0)
                ) AS total_amount,
                (
                    SELECT IFNULL(SUM(amount), 0)
                    FROM invoices_payments ip
                    WHERE ip.invoice_id = i.id
                ) AS total_payments,
                (
                    SELECT MAX(date)
                    FROM invoices_payments ip
                    WHERE ip.invoice_id = i.id
                ) as last_paid_on,
                (
                    SELECT JSON_ARRAYAGG(JSON_OBJECT(
                        'invoice_line_id', ill.id,
                        'product_id', ill.product_id,
                        'service_id', ill.service_id,
                        'start_date', ill.start_date,
                        'end_date', ill.end_date,
                        'cost', ill.cost
                    ))
                    FROM invoice_lines ill
                    WHERE ill.invoice_id = i.id
                ) as invoice_lines
            FROM invoices i
            JOIN
                invoice_lines il ON
                    i.id = il.invoice_id AND
                    il.product_id IN (
                        SELECT id
                        FROM products p
                        WHERE p.default_type = 'rent'
                    )
            WHERE
                i.lease_id = ? AND
                i.due >= ? AND
                i.status IN ${ statusFlag }
            GROUP BY i.id
            ORDER BY i.due ASC
        `;
        return await connection.queryAsync(sql, [leaseId, date]);
    },

    async fetchInvoiceLineInfo(connection, invoiceId, invoiceLineId, sign) {
        let sql = `
            SELECT
                *,
                (SELECT default_type FROM products WHERE il.product_id = id) AS \`type\`,
                (
                    IF (
                        (${ sign } > 0),
                        (
                            IFNULL(il.qty * il.cost, 0) -
                            (il.total_discounts) -
                            (SELECT IFNULL(sum(amount), 0) FROM invoice_lines_allocation WHERE il.id = invoice_line_id AND \`type\` = 'line')
                        ),
                        (SELECT IFNULL(sum(amount), 0) FROM invoice_lines_allocation WHERE il.id = invoice_line_id AND \`type\` = 'line')
                    )
                ) AS line_amount,
                (
                    IF (
                        (${ sign } > 0),
                        (
                            (il.total_tax) -
                            (SELECT IFNULL(sum(amount), 0) FROM invoice_lines_allocation WHERE il.id = invoice_line_id AND \`type\` = 'tax')
                        ),
                        (SELECT IFNULL(sum(amount), 0) FROM invoice_lines_allocation WHERE il.id = invoice_line_id AND \`type\` = 'tax')
                    )
                ) AS tax_amount
            FROM invoice_lines il
            WHERE il.invoice_id = ${ invoiceId }
        `;

        if (invoiceLineId) sql += ` AND il.id = ${ invoiceLineId }`;

        return await connection.queryAsync(sql);
    },

    async findUnappliedPayments(connection, leaseId) {
        const sql = `
            SELECT id
            FROM payments
            WHERE
                (
                    amount -
                    (SELECT SUM(amount) FROM invoices_payments WHERE payment_id = payments.id) -
                    (IFNULL((SELECT SUM(amount) FROM refunds WHERE payment_id = payments.id), 0))
                ) > 0 AND
                id IN (
                    SELECT payment_id
                    FROM invoices_payments
                    WHERE invoice_id IN (
                        SELECT  id
                        FROM invoices
                        WHERE lease_id = ${ leaseId }
                    )
                ) AND
                status = 1
        `;

        return await connection.queryAsync(sql)
    },

    async isInterPropertyInvoiceById(connection, invoice_id) {
        let sql = `
                Select 
                    IF(p.default_type = '${ENUMS.PRODUCT_DEFAULT_TYPES.INTER_PROPERTY_ADJUSTMENT}' ,true,false) as is_inter_property
                from invoice_lines il
                left join products p on p.id = il.product_id
                where il.invoice_id = ${connection.escape(invoice_id)}
                group by il.invoice_id;`
        return connection.queryAsync(sql);
    },

    async getUnPaidUnEmailedAutoInvoices(connection, payload){
        const { company_id, property_id = null, created_date_start, created_date_end, due_date_start, due_date_end } = payload;
        let sql = `select cc.id as company_id, cc.name as company_name, cc.subdomain as company_subdomain, i.id as property_id, p.name as property_name, concat(c.first,' ', c.last) as tenant_name, i.id as invoice_id, i.contact_id, i.lease_id, i.number, i.date, i.due, i.created_at, i.status, i.type, i.period_start, i.period_end, i.subtotal, i.total_discounts, i.total_tax, i.total_payments, l.send_invoice
                    from invoices i 
                    inner join properties p on i.property_id = p.id
                    inner join companies cc on cc.id = p.company_id
                    inner join contacts c on c.id = i.contact_id
                    inner join leases l on i.lease_id = l.id and l.status = 1 and l.end_date is null and l.send_invoice = 1
                    inner join units u on u.id = l.unit_id
                    inner join invoice_lines il on i.id = il.invoice_id
                    inner join products pp on il.product_id = pp.id and pp.default_type in ('rent','insurance')
                   where i.status = 1 and i.type = 'auto'
                   and cc.id = ${connection.escape(company_id)}
                   ${property_id ? ` and p.id = ${connection.escape(property_id)} ` : ''} 
                   and date(i.created_at) between ${connection.escape(created_date_start)} and ${connection.escape(created_date_end)}  and i.due between ${connection.escape(due_date_start)} and ${connection.escape(due_date_end)} and (i.subtotal + i.total_tax - i.total_discounts) > i.total_payments
                   group by i.id
                   order by cc.id,p.id,i.lease_id`;

        console.log("getUnPaidUnEmailedAutoInvoices sql =>",sql);
        return connection.queryAsync(sql);
    },

    async findInvoicesBetweenDates(connection, lease_id, start_date, end_date) {
        let sql = `SELECT * from invoices where lease_id = ${connection.escape(lease_id)} and due >= ${connection.escape(start_date)} and due < ${connection.escape(end_date)} and status = 1;  `;
        console.log("findInvoicesBetweenDates sql", sql);
        return connection.queryAsync(sql);
    },

    async findMissingInvoicesForDateRange(connection, payload){
        const { company_id = null, property_id = null, start_date, end_date } = payload;
        connection.queryAsync(`SET @@cte_max_recursion_depth = 2000;`);
        let sql = `
        WITH RECURSIVE date_range AS (
            SELECT ${connection.escape(start_date)} AS date
            UNION ALL
            SELECT DATE_ADD(date, INTERVAL 1 DAY)
            FROM date_range
            WHERE DATE_ADD(date, INTERVAL 1 DAY) <= ${connection.escape(end_date)}
        ), cte_leases as (
            SELECT
                c.id AS company_id,
                c.name AS company_name,
                c.subdomain AS company_subdomain,
                p.id AS property_id,
                p.name AS property_name,
                concat(cc.first,' ',cc.last) as tenant_name,
                p.on_boarding_date AS property_onboarding_date,
                p.utc_offset as property_utc_offset,
                u.id AS unit_id,
                u.number AS unit_number,
                u.type AS unit_type,
                l.id AS lease_id,
                l.start_date as lease_start_date,
                l.end_date as lease_end_date,
                l.bill_day,
                (
                    SELECT invoiceSendDay FROM lease_templates
                    WHERE id = IFNULL(
                        (SELECT lease_template_id FROM properties_lease_templates WHERE property_id = u.property_id AND unit_type = u.type AND lease_template_id IN (SELECT id FROM lease_templates WHERE status = 1) ORDER BY id DESC LIMIT 1),
                        (SELECT id FROM lease_templates WHERE status = 1 AND is_default = 1 AND company_id = p.company_id AND unit_type = u.type)
                    )
                ) AS invoice_days
            FROM leases l
                INNER JOIN units u ON u.id = l.unit_id
                INNER JOIN contact_leases cll on cll.lease_id = l.id
                INNER JOIN contacts cc on cc.id = cll.contact_id
                INNER JOIN properties p ON p.id = u.property_id
                INNER JOIN companies c ON c.id = p.company_id
            WHERE l.status = 1
                AND (l.auction_status IS NULL OR l.auction_status NOT IN ('auction_payment','move_out'))
                AND l.start_date <= ${connection.escape(end_date)}
                AND (l.end_date IS NULL)
                ${company_id ? ` AND c.id = ${connection.escape(company_id)} ` : ''}
                ${property_id ? ` AND u.property_id = ${connection.escape(property_id)} ` : ''}
                AND p.on_boarding_date is not null
                AND p.on_boarding_date != '0000-00-00'
                AND u.number not in ('POS$', 'POS$  ')
                AND l.start_date != '0000-00-00'
                AND p.utc_offset is not null 


        )
        SELECT
            d.date as invoice_start_date,
            group_concat(DISTINCT i.id) as invoice_id,
            DATE_SUB(d.date, INTERVAL cl.invoice_days DAY) as generation_date,
            cl.*
        FROM
            date_range d
            INNER JOIN cte_leases cl ON cl.lease_start_date <= d.date AND cl.lease_end_date is null
            INNER JOIN services s ON cl.lease_id = s.lease_id AND s.status = 1 and s.recurring = 1 and (s.end_date is null or s.end_date >= d.date) and s.product_id in (select id from products where company_id = cl.company_id and default_type = 'rent')
            LEFT JOIN invoices i on i.lease_id = cl.lease_id and DATE(i.period_start) <= d.date and DATE(i.period_end) >= d.date
            LEFT join invoice_lines il on il.invoice_id = i.id
            LEFT join products p on p.id = il.product_id and p.default_type = 'rent'
        WHERE  ((DAY(d.date) = DAY(LAST_DAY(d.date)) AND DAY(LAST_DAY(d.date)) < cl.bill_day) OR (cl.bill_day IN (SELECT DAY(d.date))))
        GROUP BY invoice_start_date, cl.lease_id
        HAVING invoice_id is null and generation_date > cl.property_onboarding_date
        ORDER BY cl.company_id, cl.property_id;`;
        console.log("MissingInvoicesQuery ==>",sql);
        let result = connection.queryAsync(sql); 
        connection.queryAsync(`SET @@cte_max_recursion_depth = 1000;`);
        return result;
    },

    async findMissingDiscountsForDateRange(connection, payload){
        const { company_id = null, property_id = null, start_date, end_date, invoice_type = 'auto'} = payload;
        let sql = `
        select cc.id as company_id, cc.name as company_name, cc.subdomain as company_subdomain, p.id as property_id, p.name as property_name, concat(c.first,' ',c.last) as tenant_name, u.number as space_number, i.id as invoice_id, i.number invoice_number, i.type as invoice_type, i.period_start , i.period_end , i.due , i.total_discounts, i.subtotal , i.created_at ,d.id as missing_discount_id, d.promotion_id, d.lease_id, d.value, d.type as discount_type, d.start as discount_start, d.end as discount_end, d.pretax, d.coupon_id
        from discounts d
            inner join invoices i on i.lease_id = d.lease_id
            inner join invoice_lines il on i.id = il.invoice_id
            inner join products p on p.id = il.product_id and p.default_type = 'rent'
            inner Join properties pp on pp.id = i.property_id
            inner join companies cc on cc.id = pp.company_id
            inner join contacts c on c.id = i.contact_id
            inner join leases l on l.id = i.lease_id
            inner join units u on u.id = l.unit_id
        where
            date(i.period_start) >= d.start and date(i.period_start) <= ifnull(d.end, ${connection.escape(end_date)})  
            and i.due BETWEEN ${connection.escape(start_date)} AND ${connection.escape(end_date)}
            and i.total_discounts <= 0 and i.status = 1 and i.subtotal > 0 and i.type in (${connection.escape(invoice_type)})
            and pp.on_boarding_date is not null 
            ${company_id ? `and cc.id = ${connection.escape(company_id)}` : ''}
            ${property_id ? `and pp.id = ${connection.escape(property_id)}` : ''}
            and d.value > 0 
            and i.number not like '%-%' and i.number not like '%:%' and i.is_migrated = 0
            group by i.id
            order by i.property_id, i.lease_id;`;
            console.log("MissingDiscountsQuery ==>",sql);
            return connection.queryAsync(sql);
    },

    async findDuplicateInvoicesForBillingPeriod(connection, payload){
        const { company_id = null, property_id = null, start_date, end_date } = payload;
        let sql = `
        with dup_inv as (
            select i.lease_id, i.period_start, i.period_end, i.type, i.property_id, i.due, i.date, i.created_at from invoices i
                inner join leases l on i.lease_id = l.id
                where i.status = 1 and l.status = 1 and l.end_date is null
                and i.id in (select invoice_id from invoice_lines
                    where cost > 0
                    and product_id in (select id from products
                    where default_type in ('rent')))
                and i.property_id in (select id from properties where on_boarding_date is not null ${company_id ? ` and company_id = ${connection.escape(company_id)} ${property_id ? ` and id = ${connection.escape(property_id)} ` : ''}` : ''})
                and i.due BETWEEN ${connection.escape(start_date)} AND ${connection.escape(end_date)}
                and i.number not like '%-%'
                and i.number not like '%:%'
                and i.is_migrated = 0
            group by i.lease_id, i.period_start, i.period_end
            having count(i.id) > 1
            )
        select cc.id as company_id, cc.name as company_name, cc.subdomain as company_subdomain, p.id as property_id, p.name as property_name, concat(c.first,' ', c.last) as tenant_name, i.id as invoice_id, i.contact_id, i.lease_id, i.number, i.date, i.due, i.created_at, i.status, i.type, i.period_start, i.period_end, i.subtotal, i.total_discounts, i.total_tax, i.total_payments from invoices i 
        inner join dup_inv dp on i.lease_id = dp.lease_id and i.period_start = dp.period_start and i.period_end = dp.period_end
        inner join contacts c on c.id = i.contact_id
        inner join properties p on p.id = i.property_id
        inner join companies cc on cc.id = p.company_id
        where i.status = 1
        order by i.property_id, i.lease_id;`;
        console.log("DuplicateInvoicesQuery ==>",sql);
        return connection.queryAsync(sql);
    },

    async findInvoicesWithDuplicateLines(connection, payload){
        const { company_id = null, property_id = null, start_date, end_date } = payload;
        let sql = `
        with dup_lines as (
            select il.invoice_id, il.service_id, il.cost, il.date, il.start_date, il.end_date 
            from invoice_lines il
            inner join invoices i on i.id = il.invoice_id
            inner join products p on il.product_id = p.id
            inner join properties pp on pp.id = i.property_id 
            where p.default_type in ('rent','insurance')
            and pp.on_boarding_date is not null
            ${company_id ? `and pp.company_id = ${connection.escape(company_id)}` : ''}
            ${property_id ? `and pp.id = ${connection.escape(property_id)}` : ''}
            and i.due between ${connection.escape(start_date)} and ${connection.escape(end_date)}
            and i.status = 1 and i.number not like '%-%' and i.number not like '%:%' and i.is_migrated = 0
            group by il.invoice_id, il.product_id having count(il.product_id) > 1
        )
        
        select cc.id as company_id, cc.name as company_name, cc.subdomain as company_subdomain, p.id as property_id, p.name as property_name, concat(c.first,' ', c.last) as tenant_name, i.id as invoice_id, i.contact_id, i.lease_id, i.number, i.date, i.due, i.created_at, i.status, i.type, i.period_start, i.period_end, i.subtotal, i.total_discounts, i.total_tax, i.total_payments, dl.service_id, dl.cost, dl.date, dl.start_date, dl.end_date 
        from invoices i
        inner join dup_lines dl on i.id = dl.invoice_id
        inner join contacts c on c.id = i.contact_id
        inner join properties p on p.id = i.property_id
        inner join companies cc on cc.id = p.company_id
        group by i.id
        order by i.property_id, i.lease_id;`;
        console.log("DuplicateInvoiceLinesQuery ==>",sql);
        return connection.queryAsync(sql);
    },

    async findInvoiceWithMissingTax(connection, payload){
        const { company_id = null, property_id = null, start_date, end_date } = payload;
        let sql = `
        select cc.id as company_id, cc.name as company_name, cc.subdomain as company_subdomain, p.id as property_id, p.name as property_name, concat(c.first,' ',c.last) as tenant_name, u.number as space_number, u.type as space_type, i.id as invoice_id, il.id as invoice_line_id, l.id as lease_id, ((il.qty * il.cost) - il.total_discounts) as invoice_line_amount, il.total_tax as invoice_line_tax, i.number as inv_number, i.created_at, i.due as inv_due_date, (i.subtotal + i.total_tax - i.total_discounts) as inv_amount, i.total_payments as inv_payments_applied
        from invoice_lines il
        inner join invoices i on i.id = il.invoice_id
        inner join leases l on l.id = i.lease_id
        inner join contacts c on c.id = i.contact_id
        inner join properties p on p.id = i.property_id
        inner join companies cc on cc.id = p.company_id
        inner join units u on u.id = l.unit_id
        inner join services s on s.id = il.service_id
        where il.product_id in (select id
        from products where default_type in ('rent') and name in ('Rent'))
        and il.total_tax = '0.00'
        and il.cost - il.total_discounts > 0
        and i.status = 1
        and i.due between ${connection.escape(start_date)} and ${connection.escape(end_date)}
        and i.is_migrated = 0
        and i.number not like '%-%'
        and i.number not like '%:%'
        ${company_id ? ` and cc.id = ${connection.escape(company_id)}` : ''}
        ${property_id ? ` and p.id = ${connection.escape(property_id)}` : ''}
        and i.lease_id in (select id from leases
        where status = 1 and end_date is null and unit_id in (select id from units
        where type in ('storage')
        and property_id in (select property_id
        from property_tax_profile
        where property_id in (select id from properties where on_boarding_date is not null 
        ${company_id ? ` and company_id = ${connection.escape(company_id)} ${property_id ? ` and id = ${connection.escape(property_id)} ` : ''}` : ''}
        )
        and tax_rate > 0
        and type in ('storage'))))
        and s.taxable = 1
        UNION 
        select cc.id as company_id, cc.name as company_name, cc.subdomain as company_subdomain, p.id as property_id, p.name as property_name, concat(c.first,' ',c.last) as tenant_name, u.number as space_number, u.type as space_type, i.id as invoice_id, il.id as invoice_line_id, l.id as lease_id, ((il.qty * il.cost) - il.total_discounts) as invoice_line_amount, il.total_tax as invoice_line_tax, i.number as inv_number, i.created_at, i.due as inv_due_date, (i.subtotal + i.total_tax - i.total_discounts) as inv_amount, i.total_payments as inv_payments_applied
        from invoice_lines il
        inner join invoices i on i.id = il.invoice_id
        inner join leases l on l.id = i.lease_id
        inner join contacts c on c.id = i.contact_id
        inner join properties p on p.id = i.property_id
        inner join companies cc on cc.id = p.company_id
        inner join units u on u.id = l.unit_id
        inner join services s on s.id = il.service_id
        where il.product_id in (select id
        from products where default_type in ('rent') and name in ('Rent'))
        and il.total_tax = '0.00'
        and il.cost - il.total_discounts > 0
        and i.status = 1
        and i.due between ${connection.escape(start_date)} and ${connection.escape(end_date)}
        and i.is_migrated = 0
        and i.number not like '%-%'
        and i.number not like '%:%'
        ${company_id ? ` and cc.id = ${connection.escape(company_id)}` : ''}
        ${property_id ? ` and p.id = ${connection.escape(property_id)}` : ''}
        and i.lease_id in (select id from leases
        where status = 1 and end_date is null and unit_id in (select id from units
        where type in ('parking')
        and property_id in (select property_id
        from property_tax_profile
        where property_id in (select id from properties where on_boarding_date is not null 
        ${company_id ? ` and company_id = ${connection.escape(company_id)} ${property_id ? ` and id = ${connection.escape(property_id)} ` : ''}` : ''}
        )
        and tax_rate > 0
        and type in ('parking'))))
        and s.taxable = 1
        order by property_id,lease_id;`;
        console.log("MissingTaxInvoicesQuery ==>",sql);
        return connection.queryAsync(sql);
    },

    async voidedAndNonActiveInvoicePresent(connection, payload){
        const { company_id = null, property_id = null, period_start_date } = payload;
        let sql = `
        select cc.id as company_id, cc.name as company_name, cc.subdomain as company_subdomain, pp.id as property_id, pp.name as property_name, concat(c.first,' ', c.last) as tenant_name, i.id as invoice_id, i.contact_id, i.lease_id, i.number, i.date, i.due, i.created_at, i.status, i.type, i.period_start, i.period_end, i.subtotal, i.total_discounts, i.total_tax, i.total_payments 
        from invoices i
        inner join invoice_lines il on i.id = il.invoice_id
        inner join leases l on l.id = i.lease_id
        inner join products p on il.product_id = p.id
        inner join properties pp on pp.id = i.property_id
        inner join companies cc on cc.id = pp.company_id
        inner join contacts c on c.id = i.contact_id
        where date(i.period_start) = ${connection.escape(period_start_date)}
        and i.status = -1
        ${company_id ? ` and cc.id = ${connection.escape(company_id)}` : ''}
        ${property_id ? ` and pp.id = ${connection.escape(property_id)}` : ''}
        and l.status = 1 and l.end_date is null
        and p.status = 1 and p.default_type = 'rent'
        and i.lease_id not in (
        select ii.lease_id from invoices ii
        inner join invoice_lines ill on ii.id = ill.invoice_id
        inner join leases ll on ll.id = ii.lease_id
        inner join products po on ill.product_id = po.id
        inner join properties ppp on ppp.id = ii.property_id
        inner join companies ccc on ccc.id = ppp.company_id
        where date(ii.period_start) = ${connection.escape(period_start_date)}
        and ii.status = 1
        ${company_id ? ` and ccc.id = ${connection.escape(company_id)}` : ''}
        ${property_id ? ` and ppp.id = ${connection.escape(property_id)}` : ''}
        and ll.status = 1 and ll.end_date is null
        and po.status = 1 and po.default_type = 'rent'
        ) group by i.lease_id
        order by i.property_id, i.lease_id;`;
        console.log("voidedAndNonActiveInvoiceQuery ==>",sql);
        return connection.queryAsync(sql);
    },

    async autoPayExpectedLeasesAndInvoices(connection, payload){
        const { company_id = null, property_id = null, date } = payload;
        let sql = `
        WITH autopay_leases as (
        select cc.id as company_id, cc.name as company_name, cc.subdomain as company_subdomain, p.id as property_id, p.name as property_name, concat(c.first,' ', c.last) as tenant_name, i.lease_id as lease_id, JSON_ARRAYAGG(JSON_OBJECT('invoice_id', i.id)) as invoice_ids, lpc.payment_cycle, sum((i.subtotal + i.total_tax) - (i.total_discounts + i.total_payments)) as balance, lt.auto_pay_max_times, lt.id as lease_template_id,
        CASE
            WHEN l.bill_day > DAY(LAST_DAY(${connection.escape(date)})) THEN
                CASE
                    WHEN l.bill_day > DAY(${connection.escape(date)}) AND DAY(${connection.escape(date)}) < DAY(LAST_DAY(${connection.escape(date)}))
                        THEN DATE_ADD(DATE_FORMAT(DATE_SUB(${connection.escape(date)}, INTERVAL 1 MONTH), CONCAT('%Y-%m-', IF(l.bill_day > DAY(LAST_DAY(DATE_SUB(${connection.escape(date)}, INTERVAL 1 MONTH))), DAY(LAST_DAY(DATE_SUB(${connection.escape(date)}, INTERVAL 1 MONTH))), l.bill_day))), INTERVAL l.auto_pay_after_billing_date DAY)
                    ELSE
                    DATE_ADD(DATE_FORMAT(${connection.escape(date)}, concat('%Y-%m-' , DAY(LAST_DAY(${connection.escape(date)})))), INTERVAL l.auto_pay_after_billing_date DAY)
                END    
            ELSE
                CASE
                    WHEN l.bill_day > DAY(${connection.escape(date)})
                        THEN DATE_ADD(DATE_FORMAT(DATE_SUB(${connection.escape(date)}, INTERVAL 1 MONTH), CONCAT('%Y-%m-', IF(l.bill_day > DAY(LAST_DAY(DATE_SUB(${connection.escape(date)}, INTERVAL 1 MONTH))), DAY(LAST_DAY(DATE_SUB(${connection.escape(date)}, INTERVAL 1 MONTH))), l.bill_day))), INTERVAL l.auto_pay_after_billing_date DAY)
                    ELSE
                        DATE_ADD(DATE_FORMAT(${connection.escape(date)}, concat('%Y-%m-' , l.bill_day)), INTERVAL l.auto_pay_after_billing_date DAY)
                END
        END as autopay_start_date 
        from invoices i
        inner join properties p on i.property_id = p.id
        inner join companies cc on cc.id = p.company_id
        inner join contacts c on c.id = i.contact_id
        inner join leases l on l.id = i.lease_id 
        inner join units u on u.id = l.unit_id
        inner join leases_payment_methods lpm on lpm.lease_id = i.lease_id
        left join leases_payment_cycles lpc on lpc.lease_id = i.lease_id and lpc.deleted_at is null and lpc.start_date <= '${date}' and lpc.end_date > '${date}'
        LEFT JOIN lease_templates lt on lt.id = IFNULL((SELECT lease_template_id FROM properties_lease_templates
            WHERE property_id = u.property_id
                AND unit_type = u.type
                AND lease_template_id IN (SELECT id	FROM lease_templates WHERE status = 1)
            ORDER BY id DESC LIMIT 1
          ), 
          (SELECT id FROM lease_templates 
            WHERE status = 1 AND is_default = 1
                AND company_id = p.company_id
                AND unit_type = u.type
          )
         )
        where i.status = 1 and i.due <= ifnull(lpc.end_date, ${connection.escape(date)})
        and l.status = 1 and l.end_date is null
        ${company_id ? ` and cc.id = ${connection.escape(company_id)}` : ''}
        ${property_id ? ` and p.id = ${connection.escape(property_id)}` : ''}
        and lpm.deleted is null
        group by i.lease_id
        having sum((i.subtotal + i.total_tax) - (i.total_discounts + i.total_payments)) > 0
        )
        select apl.* 
        from autopay_leases apl
        inner join leases l on l.id = apl.lease_id
        where ${connection.escape(date)} BETWEEN apl.autopay_start_date AND DATE_ADD(
            apl.autopay_start_date, INTERVAL (apl.auto_pay_max_times - 1) DAY);`;

        console.log("autoPayExpectedLeasesAndInvoicesQuery ==>",sql);
        return connection.queryAsync(sql);
    },

    async extraInvoicesPaid(connection, payload){
        const { company_id = null, property_id = null, date } = payload;
        let sql = `
        select cc.id as company_id, cc.name as company_name, cc.subdomain as company_subdomain, pp.id as property_id, pp.name as property_name, concat(c.first,' ', c.last) as tenant_name, i.id as invoice_id, i.contact_id, i.lease_id, i.number, i.date, i.due, i.created_at, i.status, i.type, i.period_start, i.period_end, i.subtotal, i.total_discounts, i.total_tax, i.total_payments, lpc.payment_cycle 
        from invoices_payments ip
        inner join payments p on p.id = ip.payment_id
        inner join invoices i on i.id = ip.invoice_id
        inner join contacts c on c.id = i.contact_id
        inner join properties pp on pp.id = i.property_id
        inner join companies cc on cc.id = pp.company_id
        left join leases_payment_cycles lpc on lpc.lease_id = i.lease_id and lpc.deleted_at is null and start_date <= ${connection.escape(date)} and end_date > ${connection.escape(date)}
        where date(p.date) = ${connection.escape(date)} and p.source = 'auto' and i.due > ifnull(lpc.end_date, ${connection.escape(date)}) and ip.amount > 0
        ${company_id ? `and cc.id = ${connection.escape(company_id)}` : ''}
        ${property_id ? `and pp.id = ${connection.escape(property_id)}` : ''};`;

        console.log("extraInvoicesPaidQuery ==>",sql);
        return connection.queryAsync(sql);
    },

    async multipleActiveServicesForLeases(connection, payload){
        const { company_id = null, property_id = null, date } = payload;
        let sql = `
        with cte as (
            SELECT cc.id as company_id, cc.name as company_name, cc.subdomain as company_subdomain, p.id as property_id, p.name as property_name, concat(c.first,' ', c.last) as tenant_name, s.lease_id as lease_id, s.product_id as duplicate_product_id, pp.name as product_name, pp.default_type as product_default_type
            FROM services s
            inner join leases l on l.id = s.lease_id
            inner join units u on u.id = l.unit_id
            inner join contact_leases cl on cl.lease_id = l.id
            inner join contacts c on c.id = cl.contact_id
            inner join properties p on p.id = u.property_id
            inner join companies cc on cc.id = p.company_id
            inner join products pp on pp.id = s.product_id
            WHERE l.status = 1 and l.end_date is null
            ${company_id ? `and cc.id = ${connection.escape(company_id)}` : ''}
            ${property_id ? `and p.id = ${connection.escape(property_id)}` : ''}
            and s.status = 1 and s.recurring = 1 and (s.start_date <= ${connection.escape(date)} AND (s.end_date >= ${connection.escape(date)} OR s.end_date IS NULL))
               OR (s.start_date <= ${connection.escape(date)} AND s.end_date >= ${connection.escape(date)})
                GROUP BY s.lease_id, s.product_id
                HAVING COUNT(*) > 1
            )
            select cte.*, s.start_date as service_start_date, s.end_date as service_end_date, s.name as service_name, s.recurring, s.status as service_status, s.service_type, s.created, s.created_by from cte
            inner join services s on s.lease_id = cte.lease_id
            where s.product_id = cte.duplicate_product_id
            and s.status = 1 and s.recurring = 1 and (s.start_date <= ${connection.escape(date)} AND (s.end_date >= ${connection.escape(date)} OR s.end_date IS NULL))
            OR (s.start_date <= ${connection.escape(date)} AND s.end_date >= ${connection.escape(date)})
            order by cte.company_id, cte.property_id, cte.lease_id;`;
            
        console.log("multipleActiveServicesForLeasesQuery ==>",sql);
        return connection.queryAsync(sql);
    },

};

module.exports = Invoice;

const  ENUMS  = require(__dirname + '/../modules/enums.js');