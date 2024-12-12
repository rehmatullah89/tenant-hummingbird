var settings        = require(__dirname + '/../config/settings.js');
var moment          = require('moment');
var Unit            = require(__dirname + '/../models/units.js');
var App             = require(__dirname + '/../models/app.js');
var Invoice         = require(__dirname + '/../models/invoices.js');
var Promise         = require('bluebird');
var Sql             = require(__dirname + '/../modules/sql_snippets.js');

module.exports = {

    splitTypes: {
        'units':    'Split evenly amongst units',
        'tenants':  'Divide by number of tenants',
        'sqft':     'Divide by square footage'
    },

    getCurrentLeaseBalance: function(connection, Promise, lease_id){
          var invoices = [];
          var payments = 0;
          var invoice_lines = 0;
          var invoiceSql =  "Select id, paid, lease_id from invoices where paid = 0 and lease_id = " + lease_id ;

         return connection.queryAsync( invoiceSql)
         .then(function(invoiceRes) {
             invoices =  invoiceRes;
             var invoice_ids = invoices.map(function (i) { return i.id; });
            if(invoice_ids.length){
                var paymentsSql = "Select sum(amount) as payments from invoices_payments where invoice_id in (" + invoice_ids.join(',') + ")";
                return connection.queryAsync(paymentsSql);
            }
             return false;

         }).then(function(paymentsRes){
             if(paymentsRes && paymentsRes.length){
                 payments = paymentsRes[0].payments;
             }

             var invoice_ids = invoices.map(function (i) { return i.id; });
             if(invoice_ids.length) {
                 var invoiceLinesSql = "Select sum(cost) as line from invoice_lines where invoice_id in (" + invoice_ids.join(',') + ")";
                 return connection.queryAsync(invoiceLinesSql);
             }
             return false;

         }).then(function(invoiceLinesRes){

             if(invoiceLinesRes && invoiceLinesRes.length){
                invoice_lines = invoiceLinesRes[0].line;
             }

             return {
                payments: payments,
                invoices: invoice_lines,
                total:  (invoice_lines - payments).toFixed(2)
             };

         }).catch(function(err){
             console.error(err);
             console.error(err.stack);
             return false;
         })

    },

    getCurrentCharges: function(connection, lease_id){
         var sql = "Select *, (select name from products where products.id = product_id ) as product_name from invoice_lines where invoice_id is null and lease_id = " + connection.escape(lease_id);

        return connection.queryAsync(sql);
    },

    getMonthlyAutoChargeInvoice: function(connection, lease_id){
        var sql = "select * from invoices where " +
            "type = 'auto' and " +
            "lease_id = " + connection.escape(lease_id) + " and " +
            " due > '" + moment().format('YYYY-MM-DD 00:00:00') + "' and " +
            " paid = 0";
        return connection.queryAsync(sql);
    },

    getCurrentUserBalance: function(){

    },

    findRecurringByPropertyId: function(connection, property_id){

        var billingSql = "Select * " +
          "from bills where deleted = 0 and property_id = " + property_id;
        return connection.queryAsync(billingSql).map(function(billingRes) {

            var ProductSql = "Select * from products where id = " + billingRes.product_id;
            return connection.queryAsync(ProductSql)
                .then(function(productRes){
                    var product = productRes[0];
                    billingRes.Product = product;
                    var ProductSql = "Select * from vendors where id = " + billingRes.vendor_id;
                    return connection.queryAsync(ProductSql);
                }).then(function(vendor){
                    billingRes.Vendor = vendor[0] || {};
                    return billingRes;
                })
        })
    },

    findById: function(connection, id){
        var billSql = "Select * from bills where deleted = 0 and id = " + id + ' limit 1';

        return connection.queryAsync(billSql).then(billRes => billRes.length? billRes[0]:null );
    },

    save: function(connection, form, id){
        var addBillSql;
        if(id){
            addBillSql = "Update bills set ? where id = " + id;
        } else {
            addBillSql = "insert into bills set ?";
        }
        return connection.queryAsync(addBillSql, form);
    },

    deleteInvoiceLine:function(connection, invoiceline_id){

        var sql = "SELECT * from invoice_lines where id = " + connection.escape(invoiceline_id);

        return connection.queryAsync(sql).then(function(invLineRes){

            if(!invLineRes.length) throw "Line item not found.";

            var invoiceLineItem = invLineRes[0];

            if(invoiceLineItem.invoice_id) throw "This line item has already been processed. You cannot delete this item";

            var deleteSql = "DELETE from invoice_lines where id = " + connection.escape(invoiceline_id);
            return connection.queryAsync(deleteSql);

        });

    },

    deleteInvoiceTaxLines:function(connection, invoice_id){
        return connection.queryAsync(deleteSql);
    },

    delete: function(connection,  id){
        var billingSql = "update bills set deleted = 1 where id = " + connection.escape(id);
        return connection.queryAsync(billingSql);
    },

    findInvoicesByLease: function(connection, lease_id, conditions, options){

        var currentInvoicesSql = "Select *, " +
            "(select sum(cost) from invoice_lines where invoice_id = invoices.id and type = 'charge') as amount, " +
            "(select sum(amount) from tax_line_items where invoice_line_id in ( select id from invoice_lines where invoice_id = invoices.id )) as taxsum, " +
            "(select sum(cost) from invoice_lines where invoice_id = invoices.id and type = 'discount') as discounts, " +
            "(select sum(amount) from invoices_payments where invoice_id = invoices.id) as total_paid " +
            " from invoices where lease_id = " + connection.escape(lease_id);

            if(conditions && conditions.paid){
                currentInvoicesSql += ' and paid = ' + conditions.paid;
            }
            
            currentInvoicesSql += ` order by due ${(options && options.sort_order) ? 'asc' : ' desc'}`;

            if(options){
                if(typeof options.limit !='undefined' && typeof options.offset !='undefined' ){
                    currentInvoicesSql += " limit " + connection.escape(parseInt(options.offset)) + ", " + connection.escape(parseInt(options.limit));
                }
            }

            console.log("findInvoicesByLease SQL : ", currentInvoicesSql);

        return connection.queryAsync( currentInvoicesSql );
    },

    findInvoicesByLeaseCount: function(connection, lease_id){
        var currentInvoiceCountSql = "Select count(*) as count from invoices where lease_id = '" + lease_id + "'";
        return connection.queryAsync( currentInvoiceCountSql ).then(function(response){
            return response[0].count;
        });

    },

    findOpenInvoicesByLease: function(connection, lease_id, conditions, options){

        // var currentInvoicesSql = 'Select * from invoices  where status > 0 and lease_id = ' + connection.escape(lease_id) +
        //     " AND (" + Sql.invoice_total() + " > " +  Sql.invoice_payment_total() + ") order by date desc ";


        var currentInvoicesSql = `Select * from invoices where status > 0 and lease_id = ${connection.escape(lease_id)} 
        AND ( 
            SELECT ROUND(SUM((qty * cost) + total_tax - total_discounts ),2) from invoice_lines where invoice_id = invoices.id 
        ) > ( SELECT ROUND(IFNULL(SUM(amount),0), 2) FROM invoices_payments WHERE invoice_id = invoices.id) `;

        if(conditions && conditions.source && conditions.source === 'move_out'){
            currentInvoicesSql += ` and due <= CURDATE() `
        }

        currentInvoicesSql += ` order by due asc `;

        if(options){
            if(typeof options.limit !='undefined' && typeof options.offset !='undefined' ){
                currentInvoicesSql += " limit " + connection.escape(parseInt(options.offset)) + ", " + connection.escape(parseInt(options.limit));
            }
        }

        console.log("findOpenInvoicesByLease :", currentInvoicesSql);
        return connection.queryAsync( currentInvoicesSql );
    },

    findAllOpenInvoicesByLeaseIds: function (connection, lease_ids) {
        if (!Array.isArray(lease_ids) || !lease_ids.length) return [];

        let totalPaymentQuery = `SELECT
                                    ROUND(IFNULL(SUM(ip.amount), 0), 2)
                                FROM
                                    invoices_payments ip
                                JOIN
                                    payments p ON p.id = ip.payment_id
                                WHERE
                                    p.status = 1
                                    AND ip.invoice_id = i.id
                                    AND ip.amount > 0`
       
        let openInvoices = `SELECT
                                i.id,
                                i.lease_id,
                                i.number,
                                i.date,
                                i.due,
                                i.subtotal,
                                i.total_tax,
                                i.total_discounts,
                                (${totalPaymentQuery}) as total_payments
                            FROM
                                invoices i
                            WHERE
                                i.status > 0 
                                AND i.lease_id IN ( ${connection.escape(lease_ids)} )
                                AND (
                                    SELECT
                                        ROUND(SUM((qty * cost) + total_tax - total_discounts ), 2) 
                                    FROM
                                        invoice_lines 
                                    WHERE
                                        invoice_id = i.id 
                                )
                                >
                                ( 
                                    ${totalPaymentQuery}
                                ) 
                            ORDER BY
                                due ASC, id ASC`;
        return connection.queryAsync(openInvoices);
    },

    findMonthlyPropertyBills: function(connection, property_id, month, bill_id){
        var propBillsSql = "Select *, " +
            "(select id from bills_properties " +
            " where status = 1 and bill_id = bills.id and MONTH(date) = '" + moment(month).format('MM') + "' " +
            " and YEAR(date) = '" + moment(month).format('YYYY') + "' ) as pbill_id, " +
            "(select custom from bills_properties " +
            " where status = 1 and bill_id = bills.id and MONTH(date) = '" + moment(month).format('MM') + "' " +
            " and YEAR(date) = '" + moment(month).format('YYYY') + "' ) as custom, " +
            "(select billed_for from bills_properties " +
            " where status = 1 and bill_id = bills.id and MONTH(date) = '" + moment(month).format('MM') + "' " +
            " and YEAR(date) = '" + moment(month).format('YYYY') + "' ) as billed_for, " +
            "(select amount from bills_properties " +
                " where status = 1 and bill_id = bills.id and MONTH(date) = '" + moment(month).format('MM') + "' " +
                " and YEAR(date) = '" + moment(month).format('YYYY') + "' ) as current_amount, " +
            "(select name from products where id = bills.product_id ) as name " +
            "from bills where deleted = 0 and property_id = " + property_id;

        return connection.queryAsync(propBillsSql);
    },

    searchForPropertyBill: function(connection, bill_id, property_id, date ){
        var billSql = 'Select * from bills_properties where status = 1 and ' +
            ' bill_id  = ' + connection.escape(bill_id) + ' and ' +
            ' month(date)  = ' + date.format('M') + ' and ' +
            ' year(date)  = ' + date.format('Y') + ' and ' +
            ' property_id = ' + connection.escape(property_id);

        return connection.queryAsync( billSql );
    },

    findPropertyBillById: function(connection, pbill_id){
        var billSql = 'Select * from bills_properties where status = 1 and id = ' + connection.escape(pbill_id);
        return connection.queryAsync( billSql ).then(r => r.length ? r[0]: null);
    },

    deletePropertyBillLines:function(connection, pbill_id){

        var sql = "Select * from invoice_lines where property_bill_id = " + connection.escape(pbill_id) + " and invoice_id is not null";


        return connection.queryAsync(sql).then(function(invoiceLinesRes){
            if(invoiceLinesRes.length) throw "This bill has been applied to invoices already.  You cannot edit this bill without deleteing the invoice.";

            var deleteSql = "DELETE from invoice_lines where property_bill_id = " + connection.escape(pbill_id);

            return connection.queryAsync(deleteSql);
        });
    },

    savePropertyBill: function(connection, data, id){
        var _this = this;
        var sql;
        if(typeof id != 'undefined' && id){
            sql = "Update bills_properties set ? where id = " + connection.escape(id);
        } else {
            sql = "Insert into bills_properties set ? ";
        }

        return connection.queryAsync(sql, data).then(function(result) {
            data.id = (id) ? id : result.insertId;
            return data;
        })


            //
        //
        //     var property_id = data.property_id;
        //
        //     var lease_count = 0;
        //     var sum_sqft = 0;
        //     var sum_tenants = 0;
        //     var units = [];
        //     var pb = {};
        //
        //     return _this.findById(connection, data.bill_id).then(function (billRes) {
        //
        //         pb = billRes;
        //
        //         var searchParams = {
        //             conditions: {
        //                 property_id: property_id
        //             }
        //         };
        //         return Unit.find(connection, searchParams, {'Lease':{}}).each(function (unit) {
        //             sum_sqft += parseInt(unit.sqft) || 0;
        //             if (unit.Lease) {
        //                 lease_count++;
        //                 return App.find(connection, 'leases_tenants', {conditions: { lease_id: unit.Lease.id } } )
        //                     .then(function (tenantsRes) {
        //                         sum_tenants += tenantsRes.length;
        //                         unit.Lease.Tenants = tenantsRes;
        //                         return unit;
        //                     })
        //             }
        //             return unit;
        //         });
        //     }).then(function (unitsRes) {
        //         units = unitsRes;
        //
        //         return Promise.map(units, function (unit) {
        //
        //             if (unit.Lease) {
        //
        //                 var invoiceLine = {
        //                     qty: 1,
        //                     product_id: pb.product_id,
        //                     property_bill_id: property_bill_id,
        //                     lease_id: unit.Lease.id,
        //                     date: data.date
        //                 };
        //
        //                 if (data.custom) {
        //                     try {
        //                         var custom = JSON.parse(data.custom);
        //                         invoiceLine.cost = custom[unit.id];
        //                     } catch (err) {
        //                         console.log(err);
        //                     }
        //                 }
        //
        //                 if (!invoiceLine.cost) {
        //                     switch (pb.splittype) {
        //                         case 'units':
        //                             invoiceLine.cost = (parseFloat(data.amount) / units.length).toFixed(2);
        //                             break;
        //                         case 'leases':
        //                             invoiceLine.cost = (parseFloat(data.amount) / lease_count).toFixed(2);
        //                             break;
        //                         case 'tenants':
        //                             if (unit.Lease && unit.Lease.Tenants) {
        //                                 invoiceLine.cost = (  ( parseFloat(data.amount) / sum_tenants ) * unit.Lease.Tenants.length  ).toFixed(2);
        //                             } else {
        //                                 invoiceLine.cost = 0;
        //                             }
        //                             break;
        //                         case 'sqft':
        //                             invoiceLine.cost = ( (parseFloat(data.amount) / sum_sqft) * unit.sqft ).toFixed(2);
        //                             break;
        //                     }
        //                 }
        //
        //                 if (invoiceLine.cost > 0) {
        //                     return Invoice.saveInvoiceLine(connection, invoiceLine);
        //                 }
        //                 return false;
        //             }
        //             return false;
        //         });
        //     });
        //
        // });
    },

    findInvoiceById: function(connection, invoice_id){
        var invoice;
        var sql  = "Select * from invoices where id = " + connection.escape(invoice_id);
        return connection.queryAsync(sql)
        .then(function(invoiceRes) {
            return invoiceRes[0];
        });
    },

    markPropertyBillsProcessed:function(connection, propertyBills){

        if(propertyBills.length){
            var sql = "update bills_properties set billed_for = 1 where id in ( " +propertyBills.join(', ') + " ) ";


            return connection.queryAsync(sql);
        }
        return true;

    },

    findInvoicesByDay: function(connection, company_id){
        var _this = this;

    },

    findInvoicesByWeek: function(connection, company_id){
        var _this = this;

    },

    findInvoicesByPeriod: function(connection, company_id, start, end){
        var _this = this;
        var invoice;

        var periodEnd = moment(end, "MM/DD/YYYY");
        var periodStart = moment(start, "MM/DD/YYYY");

        var sql  = "Select * from invoices where " +
            " (select company_id from properties where id = " +
            "   ( select property_id from units where id = " +
            "       ( select unit_id from leases where id = invoices.lease_id ))) = " + connection.escape(company_id)  +
            " and date <= " + connection.escape(periodEnd.format('YYYY-MM-DD')) + " and date > " + connection.escape(periodStart.format('YYYY-MM-DD')) + " order by number asc";

        return connection.queryAsync(sql).each(function(invoice) {
            return _this.getInvoiceDetails(connection, invoice);
        })
    },

    getInvoiceDetails: function(connection, invoice){

        var invoiceLineSql = "Select *, " +
            " (select name from products where id = invoice_lines.product_id ) as product_name," +
            " (select name from promotions where id = ( SELECT promotion_id from discounts where id = invoice_lines.discount_id)) as discount_name from invoice_lines where invoice_id = " + connection.escape(invoice.id);
        return connection.queryAsync(invoiceLineSql).then(function(invoiceLineRes) {
            invoice.invoiceLines = invoiceLineRes;
            if (invoice.lease_id) {
                return Lease.findById(connection, invoice.lease_id, ['Unit', 'Tenant'])
            }

            return false;
        }).then(function(leaseRes) {

            invoice.Lease = leaseRes;
            invoice.Unit = leaseRes.Unit;
            return invoice;
        });
    },

    findInvoiceLinesByInvoiceId :function(connection, invoice_id){
        var invoiceLineSql = "Select * from invoice_lines where invoice_id = " + connection.escape(invoice_id) + " order by id asc ";
        return connection.queryAsync(invoiceLineSql);
    },

    findInvoiceLinesById :function(connection, invoice_Line_id){
        var invoiceLineSql = "Select * from invoice_lines where id = " + connection.escape(invoice_Line_id);
        return connection.queryAsync(invoiceLineSql).then(lines => {
            if(!lines.length) return null;
            return lines[0];
        });
    },

    deletePropertyBill: function(connection, pbillId){

        var sql = "update bills_properties set status = 0 where id = " + connection.escape(pbillId);

        return connection.queryAsync(sql);

    },

    findMaxInvoiceNumber: function(connection, company_id){
        var sql = "Select MAX(number * 1) as max from invoices where lease_id in (select id from leases where unit_id in (select id from units where property_id in (select id from properties where company_id = " + connection.escape(company_id) + ")))";

        return connection.queryAsync(sql)
            .then(invoiceRes => {
                if(invoiceRes.length){
                    return parseInt(invoiceRes[0].max);
                } else {
                    return 0;
                }
            })
    },
    async assignCompanyNewInvoiceNumber(connection, company_id) {
        let sql = `INSERT INTO company_invoice_number (company_id, invoice_number) VALUES (${connection.escape(company_id)}, 1) 
                    ON DUPLICATE KEY UPDATE    
                    invoice_number = invoice_number +1;`
        let result = await connection.queryAsync(sql);

        sql = `select invoice_number from company_invoice_number where company_id = ${company_id}`

        return await connection.queryAsync(sql).then(r => r.length ? r[0].invoice_number : []);

    },

    hasProcessedMonthlyItem:function(connection, lease_id, product, momentDate){

        var sql = "Select * from invoice_lines where invoice_id in " +
            "(select id from invoices where status > -1 and lease_id in " +
            "(select id from leases where id  = " + connection.escape(lease_id) + ") " +
            ") " +
            "AND product_id = " + connection.escape(product.id) + " and " +
            "(select MONTH(due) from invoices where id = invoice_lines.invoice_id) = '"+ momentDate.format('MM') + "' and " +
            "(select YEAR(due) from invoices where id = invoice_lines.invoice_id)  = '"+ momentDate.format('YYYY') + "'";

        return connection.queryAsync(sql);
    },

    findRentPaidThrough: function(connection, company_id, lease_id){

        var sql = "Select MAX(end_date) as rent_paid_through from invoice_lines where invoice_id in (select id from invoices where lease_id = " + connection.escape(lease_id) + " and " + Sql.invoice_total() + " >= " +  Sql.invoice_payment_total()  + ") and product_id = (select id from products where company_id = " + connection.escape(company_id) + " and lower(default_type) = 'rent') ";

        return connection.queryAsync(sql).then(r => {
            return {
                rent_paid_through: r[0].rent_paid_through || null
            }
        });

    },

    findCurrentBalance(connection, params){
        let {contact_id, lease_id, company_id, properties} = params;
        var sql = `
            select ROUND(IFNULL(sum(subtotal + total_tax - total_discounts - total_payments), 0), 2) as balance
            from invoices inv
            inner join leases l on l.id = inv.lease_id
            inner join contact_leases cl on cl.lease_id = l.id
            inner join units u on u.id = l.unit_id
            inner join properties p on p.id = u.property_id
            where inv.status > 0
            and l.status > 0
            and date < (SELECT DATE(CONVERT_TZ(UTC_TIMESTAMP() , "+00:00", IFNULL(p.utc_offset, "+00:00"))))
            and due <= (SELECT DATE(CONVERT_TZ(UTC_TIMESTAMP() , "+00:00", IFNULL(p.utc_offset, "+00:00"))))
        `;

        if(contact_id){
            sql += ` and cl.contact_id = ${connection.escape(contact_id)}`;
        }

        if(lease_id){
            sql += ` and l.id = (${connection.escape(lease_id)})`;
        }

        if(company_id){
            sql += ` and p.company_id = ${connection.escape(company_id)}`;
        }

        if(properties && properties.length){
            sql += ` and p.id in (${properties.map(p => connection.escape(p)).join(', ')})`;
        }

        return connection.queryAsync(sql).then(r => r.length ? r[0]: null);
    },

    findBalance(connection, payload) {
        let { lease_id, contact_id, date = null, property_ids, property_id } = payload;
        property_ids = property_ids || (property_id ? [property_id] : null); 

        let sql = `
        with cte_balance as (
            select 
                SUM((il.qty * il.cost) + il.total_tax - il.total_discounts) as total_invoice_amount,
                ifnull((select sum(amount) from invoices_payments_breakdown ipb where ipb.invoice_id = i.id) , 0) as payment_applied
            from invoice_lines il 
                join invoices i on il.invoice_id = i.id
                join leases l on l.id = i.lease_id
                join properties p on i.property_id = p.id                  
            where 
                1=1
                ${contact_id ? ` and i.contact_id = ${connection.escape(contact_id)}` : ''}        
                and i.void_date is null
                and i.due < ifnull(${connection.escape(date)}, (SELECT DATE(CONVERT_TZ(UTC_TIMESTAMP() , "+00:00", IFNULL(p.utc_offset, "+00:00")))))
                group by il.invoice_id
            )
            select 
                Round(SUM(cte_bal.total_invoice_amount - cte_bal.payment_applied),2) as balance
                from cte_balance cte_bal
        `;


        console.log('Billing balance Query: ', sql);

        return connection.queryAsync(sql).then(r => r.length ? r[0] : null);
    }
};
