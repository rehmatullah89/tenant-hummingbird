var settings    = require(__dirname + '/../config/settings.js');

var moment      = require('moment');
var validator = require('validator');
var Setting    = require(__dirname + '/../models/settings.js');
var Lease    = require(__dirname + '/../models/leases.js');

var Promise = require('bluebird');
var Address = require(__dirname + '/../models/address.js');

const clsContext = require('../modules/cls_context');
var Enums = require(__dirname + '/../modules/enums.js');
var rounding  = require(__dirname + '/../modules/rounding.js');
var Sql = require(__dirname + '/../modules/sql_snippets.js');
/* Authorize.net */

var paymentTransactionFuncs = require(__dirname + '/../modules/authorizenet/PaymentTransactions');
var customerProfileFuncs = require(__dirname + '/../modules/authorizenet/CustomerProfiles');
let mysql = require(`mysql`)

var createCustomerProfile           = Promise.promisify(customerProfileFuncs.createCustomerProfile);
var createCustomerPaymentProfile    = Promise.promisify(customerProfileFuncs.createCustomerPaymentProfile);
var deleteCustomerPaymentProfile    = Promise.promisify(customerProfileFuncs.deleteCustomerPaymentProfile);
var chargeCustomerProfile           = Promise.promisify(paymentTransactionFuncs.chargeCustomerProfile);

/* Forte */


var forteACHFuncs = require(__dirname + '/../modules/forte');

const product_allocation_priority = [
    ...Object.values(Enums.PRODUCT_DEFAULT_TYPES)
]

const Payment = {


    search(connection, conditions = {}, searchParams, company_id, count){
        var sql = '';
        if(count){
            sql = "SELECT count(*) as count ";
        } else {
            sql = "SELECT *, (select amount - (SELECT IFNULL(SUM(amount),0) FROM invoices_payments WHERE payment_id = payments.id ) - (SELECT IFNULL(SUM(amount),0) FROM refunds WHERE payment_id = payments.id )) as balance,  (select card_end from payment_methods where payment_methods.id = payments.payment_methods_id) as card_end, (select card_type from payment_methods where payment_methods.id = payments.payment_methods_id) as card_type, (select name_on_card from payment_methods where payment_methods.id = payments.payment_methods_id) as name_on_card, (select concat(first, ' ' , last) from payment_methods where payment_methods.id = payments.payment_methods_id) as name, (select number from units where id = (select unit_id from leases where id = payments.lease_id )) as unit_number, (select address from addresses where id = (select id from units  where id = (select unit_id from leases where id = payments.lease_id ))) as address  ";
        }

        sql += " FROM payments where 1 = 1 and status = 1 and method in ('cash','check','card','ach','giftcard') " ;
        sql += " and lease_id in (select id from leases where unit_id in (select id from units where property_id in (select id from properties where company_id = " + connection.escape(company_id) + '))) ';

        if(conditions.ref_name && conditions.ref_name.length){
            sql += ' and ( LOWER(ref_name) like ' + connection.escape("%"+conditions.ref_name+"%")  +
                ' or (select LOWER(name_on_card) from payment_methods where payment_methods.id = payments.payment_methods_id) like ' + connection.escape("%"+conditions.ref_name+"%") +
                " or (select LOWER(concat(first, ' ' , last)) from payment_methods where payment_methods.id = payments.payment_methods_id) like " + connection.escape("%"+conditions.ref_name+"%") + ") ";
        }

        if(conditions.type && conditions.type.length){
            sql += ' and LOWER(type) in (' + conditions.type.map(t => connection.escape(t)).join(', ') + ') ';
        }

        if(conditions.method && conditions.method.length){
            sql += ' and LOWER(method) in (' + conditions.method.map(m => connection.escape(m)).join(', ') + ') ';
        }

        if(conditions.lease_id){
            sql += ' and lease_id = ' + connection.escape(conditions.lease_id);
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

    findRevenueByMonth(connection, company_id, property_id){

        var paymentsSql = "Select sum(amount) as total, " +
            "MONTH(date) as month from payments " +
            "where 1 = 1 ";


            if(property_id){
                paymentsSql += " and lease_id in (select id from leases where unit_id in (select id from units where property_id = " + connection.escape(property_id) +" )) ";
            }

            paymentsSql +=  " and lease_id in " +
            "       (select id from leases where unit_id in " +
            "           (select id from units where property_id in " +
            "               (select id from properties where company_id = " + connection.escape(company_id)+") " +
            "           )" +
            "       )" +

            " and date >= '" + moment().subtract('1', 'YEAR').format('YYYY')  + "-" + moment().add(1, 'month').format('MM') + "-01 00:00:00' " +
            "group by MONTH(date)";


        return connection.queryAsync(paymentsSql);

    },

    findPaymentMethodById: function(connection, method_id){
        var paymentMethodsSql = 'Select * from payment_methods where id = ' + connection.escape(method_id);

        

        return connection.queryAsync(paymentMethodsSql).then(function(paymentMethodsRes){
            if(!paymentMethodsRes.length) return false;
            return paymentMethodsRes[0];
        });
    },

    findAccountNumber: function(connection, property_id){
        var paymentMethodsSql = 'Select account_number from tenant_payments_applications where property_id = ' + connection.escape(property_id);
        return connection.queryAsync(paymentMethodsSql).then(paymentMethodsRes => {
            return paymentMethodsRes.length ? paymentMethodsRes[0]: false;
        });
    },

    findzipcode: function(connection,payment_id){
        var paymentMethodsSql = 'select zip from payment_methods as pm join addresses as a on pm.address_id = a.id join payments as p on p.payment_methods_id=pm.id where p.id =' + connection.escape(payment_id);
        return connection.queryAsync(paymentMethodsSql)
    },

    findPaymentsByContactId: function(connection, contact_id, conditions, options){
        var sql = "Select * from payments where contact_id = " + connection.escape(contact_id) ;
        if(conditions && conditions.applied){
            sql += ' and applied = ' + conditions.applied;
        }
        sql += " order by date desc ";

        if(options){
            if(typeof options.limit !='undefined' && typeof options.offset !='undefined' ){
                sql += " limit " + connection.escape(parseInt(options.offset)) + ", " + connection.escape(parseInt(options.limit));
            }
        }

        return connection.queryAsync(sql);
    },

    //MVP TI - 12317 POC START
        findPropertyTransactionFee: function(connection, property_id) {

            var sql = "SELECT ach_transaction_fee, ach_return_fee, cc_transaction_fee_pct, cc_chargeback_fee, account_number,achTotal, achsum,ccTotal,ccsum, totalachrefund, totalccrefund, city FROM (SELECT count(*) as achTotal, sum(amount) as achsum FROM payments where property_id = " + connection.escape(property_id) + " and status = 1 and payment_method_type_id in (SELECT id FROM payment_method_type where LOWER(payment_method_type)='ach') and YEAR(date) = YEAR(CURRENT_DATE - INTERVAL 1 MONTH) AND MONTH(date) = MONTH(CURRENT_DATE - INTERVAL 1 MONTH) ) as x1 INNER JOIN (SELECT count(*) ccTotal, sum(amount) as ccsum FROM payments where property_id =  " + connection.escape(property_id) + " and status = 1 and payment_method_type_id in (SELECT id FROM payment_method_type where LOWER(payment_method_type)='card')and YEAR(date) = YEAR(CURRENT_DATE - INTERVAL 1 MONTH) AND MONTH(date) = MONTH(CURRENT_DATE - INTERVAL 1 MONTH) ) as x2 INNER Join (SELECT ach_transaction_fee, ach_return_fee, cc_transaction_fee_pct, cc_chargeback_fee, account_number FROM tenant_payments_applications where property_id =  " + connection.escape(property_id) + " ) as x3 INNER JOIN (SELECT count(*) as totalachrefund FROM refunds where payment_id in (select id from payments where property_id = " + connection.escape(property_id) + ") AND lower(type) = 'ach' AND YEAR(date) = YEAR(CURRENT_DATE - INTERVAL 1 MONTH) AND MONTH(date) = MONTH(CURRENT_DATE - INTERVAL 1 MONTH)) as x4 INNER JOIN (SELECT count(*) as totalccrefund FROM refunds where payment_id in (select id from payments where property_id =  " + connection.escape(property_id) + " ) AND lower(type) = 'chargeback' AND YEAR(date) = YEAR(CURRENT_DATE - INTERVAL 1 MONTH) AND MONTH(date) = MONTH(CURRENT_DATE - INTERVAL 1 MONTH)) as x5 Inner Join (SELECT city FROM addresses where id = (select address_id from properties where id = " + connection.escape(property_id) + ")) as x6"
        return connection.queryAsync(sql);
    },

    findACHReversalCount: function (connection, property_id) {
        var sql = "SELECT count(*) as total FROM refunds where lower(type) = 'ach' and payment_id in (select id from payments where property_id = " + connection.escape(property_id) +") AND YEAR(date) = YEAR(CURRENT_DATE - INTERVAL 1 MONTH) AND MONTH(date) = MONTH(CURRENT_DATE - INTERVAL 1 MONTH)";
        return connection.queryAsync(sql);
    },
    findCCChargebackCount: function (connection, property_id) {
        var sql = "SELECT count(*) as total FROM refunds where lower(type) = 'chargeback' and payment_id in (select id from payments where property_id = " + connection.escape(property_id) +") AND YEAR(date) = YEAR(CURRENT_DATE - INTERVAL 1 MONTH) AND MONTH(date) = MONTH(CURRENT_DATE - INTERVAL 1 MONTH)";
        return connection.queryAsync(sql);
    },
    //MVP TI - 12317 POC END
    

    findACHPaymentMethodLastFour: function(connection, lease_id, last_four){
        var paymentMethodsSql = 'Select * from payment_methods where lease_id = ' + connection.escape(lease_id) + ' and active = 1 and  card_end = ' + connection.escape(last_four) + " and type = 'ach'";

        console.log("paymentMethodsSql", paymentMethodsSql);

        return connection.queryAsync(paymentMethodsSql).then(r => {
            if(r.length > 1) {
                console.log(r);
                throw "too many payment methods!"
            }
            return r ? r[0]: null
        });
    },

    findPaymentMethodsByLeaseId: function(connection, lease_id, only_auto_charge, including_one_time){

        var paymentMethodsSql = 'Select * from leases_payment_methods where lease_id = ' + connection.escape(lease_id) + ' and deleted is null ';

        paymentMethodsSql +=  ' order by `id` DESC';
        return connection.queryAsync(paymentMethodsSql);

    },
    findPaymentMethodsByContactId: async function(connection, contact_id, only_auto_charge, including_one_time){

        var paymentMethodsSql = 'Select * from payment_methods where contact_id = ' + connection.escape(contact_id) + ' and active = 1 ';

        paymentMethodsSql +=  ' order by `id` DESC';
        return connection.queryAsync(paymentMethodsSql);
    },

    saveAutoPayment: function(connection, data, auto_payment_id){
        var sql;
        if (auto_payment_id) {
            sql = "UPDATE leases_payment_methods set ? where id = " + connection.escape(auto_payment_id);
        } else {
            sql = "insert into leases_payment_methods set ?";
        }

        return connection.queryAsync(sql, data).then(r => auto_payment_id ?  auto_payment_id : r.insertId);
    },

    findLastPaymentNumber: function(connection, company_id){
        var lastPaymentNumberSql = 'Select number from payments where payment_methods_id =  ' +
            '(select id from payment_methods where lease_id in (select id from leases where unit_id in (select id from units where property_id in (select id from properties where company_id = ' + company_id + ' )))) order by number DESC limit 1';
        return false;

    },

    savePaymentMethod:function(connection, data, payment_method_id){
        var sql;

        if(payment_method_id){
            sql = "UPDATE payment_methods set ? where id = " + connection.escape(payment_method_id);
        } else {
            sql = "insert into payment_methods set ?";
        }

        return connection.queryAsync(sql, data).then(function(response){
            if(payment_method_id) return payment_method_id;
            return response.insertId;
        })
    }, 
    findDeviseIdByPropertyId: function (connection, property_id){
        var sql;
        sql = "SELECT value FROM connections WHERE type = 'card' and property_id= " + connection.escape(property_id);
        //sql = "SELECT value FROM connections WHERE property_id=" + 99;
        return connection.queryAsync(sql);
    },
    getDeviseIdFromPayments: function (connection, transaction_id, property_id){
        var sql;
        sql = "SELECT device_id FROM payments WHERE transaction_id ="+ connection.escape(transaction_id) +"and property_id= " + connection.escape(property_id);
        return connection.queryAsync(sql);
    },
    findDeviseIdFromConnectionDevices: function (connection, property_id, device_id){
        var sql;
        sql = "SELECT cd.identifier FROM connection_devices AS cd JOIN connections AS c ON cd.connection_id = c.id WHERE c.type = 'card' and c.property_id = " + connection.escape(property_id) +" and cd.id = "+connection.escape(device_id) ;
        return connection.queryAsync(sql);
    },
    
    updatePropyRefundsTable: function (connection, company_id, property_id, property_name, transaction_id, amount, reason, refund_transactionId){
        var sql;
        var date = moment().utc().format('YYYY-MM-DD HH:mm:ss')
        sql = "INSERT INTO "+ process.env.ADMIN_PORTAL_REFUND_TOOL_TABLE + "   (company_id, property_id, property_name, parent_transaction_id , amount, reason, refund_transaction_id,refund_date ) VALUES (" + connection.escape(company_id) + "," + connection.escape(property_id) + "," + connection.escape(property_name) + "," + connection.escape(transaction_id) + "," + connection.escape(amount) + "," + connection.escape(reason) + "," + connection.escape(refund_transactionId) + ","+connection.escape(date)+")";
        return connection.queryAsync(sql);
    },
    getPropertyName: function (connection, property_id){
        var sql;
        sql = "SELECT name FROM properties where id =" + connection.escape(property_id);
        
        return connection.queryAsync(sql);
    },

    checkTenantPaymentDetails: function (connection, property_id, year, month) {
        var sql;
        if (property_id) {
            sql = "select id from tenant_payments_statement where property_id = " + connection.escape(property_id) + " and year = " + connection.escape(year) + " and month = " + connection.escape(month); 
        }
        return connection.queryAsync(sql);
    },

    saveTenantPaymentDetails: function (connection, data, tenant_paymnet_id) {
        var sql;
        if (tenant_paymnet_id)
        {
            sql = "UPDATE tenant_payments_statement set ? where id = " + connection.escape(tenant_paymnet_id);
        } else {  
            sql = "insert into tenant_payments_statement set ?";
        }  
        return connection.queryAsync(sql, data);
    },

    resetAutoChargeStatus(connection, lease_id, payment_id){

        var data = {
            auto_charge: 0,
            rent: null,
            utilities: null
        }

        var sql = "UPDATE payment_methods set ? where lease_id = " + connection.escape(lease_id);

        if(payment_id){
            sql += ' and id != ' + connection.escape(payment_id);
        }


        return connection.queryAsync(sql, data);

    },

    save: function(connection, data, payment_id) {
        var sql;
        if (payment_id) {
            sql = "UPDATE payments set ? where id = " + connection.escape(payment_id);
        } else {
            sql = "insert into payments set ?";
        }

        console.log("Save Payment (Sql+data): ", sql, data);

        return connection.queryAsync(sql, data);
    },

    clearAutoCharge: function(connection, lease_id, except_id){

        var sql = "update payment_methods set auto_charge = 0 where lease_id = " + connection.escape(lease_id) + " and id != " + connection.escape(except_id);
        return connection.queryAsync(sql);

    },

    applyPayment: async (connection, data, invoices_payment_id) => {
        let prevAmount = 0;
        var sql;
        if (invoices_payment_id) {
            sql = "UPDATE invoices_payments set ? where id = " + connection.escape(invoices_payment_id);
        } else {
            sql = "insert into invoices_payments set ?";
        }

        if (invoices_payment_id){
            let invoicePaymentSql = `select * from invoices_payments where id = ${connection.escape(invoices_payment_id)}`;
            let inv_pay_response = await connection.queryAsync(invoicePaymentSql);
            if(inv_pay_response && inv_pay_response.length){
                prevAmount = inv_pay_response[0].amount;
            }
        }

        let response = await connection.queryAsync(sql, data);


        // if invoice_id wasn't included, get it here
        let id = invoices_payment_id ? invoices_payment_id : response.insertId;
        if(!data.invoice_id){
          let invoiceSql = "select * from invoices_payments where id = " + connection.escape(id);
          let inv_response = await connection.queryAsync(invoiceSql);
          data.invoice_id = inv_response[0].invoice_id;
          data.amount = inv_response[0].amount;
        }


        // Use invoice id to update payment total on invoice
        await Payment.updateInvoicePaymentTotal(connection, data.invoice_id);
       // await Payment.updateInvoiceLinesPaymentTotal(connection, data.invoice_id);

       let diff = (data.amount - prevAmount);
       if(diff) return await Payment.updateInvoicePaymentBreakDown(connection, diff, id, { payment_date: data.date});

    },

    // updateInvoicePaymentTotal: async (connection, invoice_id) => {

    //   let invoice_payments_total = `UPDATE invoices set total_payments = 
    //                                 (SELECT SUM(IFNULL(ip.amount,0)) FROM invoices_payments ip left join payments p on ip.payment_id = p.id 
    //                                 where p.status = 1 and ip.invoice_id = invoices.id ) 
    //                                 WHERE id = ${connection.escape(invoice_id)}`;

    //   await connection.queryAsync(invoice_payments_total);
    // },

    updateInvoicePaymentBreakDown: async (connection, amount_diff, invoices_payment_id, params) => {

        let paid_amount = Math.round(amount_diff  * 1e2) / 1e2;

        // Getting invoice_payment
        let invoice_payment;

        let invoicePaymentSql = `select ip.id, ip.invoice_id, ip.payment_id, pr.id as property_id, pr.utc_offset, DATE(CONVERT_TZ(UTC_TIMESTAMP() , "+00:00", IFNULL(pr.utc_offset,"+00:00"))) as curr_date,
                                    if(cd.id is null, (SELECT curr_date), DATE_ADD((SELECT curr_date), INTERVAL 1 DAY)) as effective_date 
                                    from invoices_payments ip
                                        inner join payments p on p.id = ip.payment_id
                                        inner join properties pr on pr.id = p.property_id
                                        left join closing_days cd on cd.property_id = p.property_id and cd.date = Date(CONVERT_TZ(UTC_TIMESTAMP(), "+00:00", IFNULL(pr.utc_offset,"+00:00")))
                                                and cd.active = 1
                                    where ip.id = ${connection.escape(invoices_payment_id)}`;

        let inv_pay_response = await connection.queryAsync(invoicePaymentSql);
        if(inv_pay_response && inv_pay_response.length){
            invoice_payment = inv_pay_response[0];
        }

        if(invoice_payment){
            // Inserting into invoices_payments_breakdown
            let data = {
                invoice_id: invoice_payment.invoice_id,
                payment_id: invoice_payment.payment_id,
                invoice_payment_id: invoice_payment.id,
                amount: paid_amount,
                date: params && params.payment_date ? params.payment_date: invoice_payment.curr_date,
                effective_date: params && params.payment_date ? params.payment_date: invoice_payment.effective_date
            }

            let ipbSql = "insert into invoices_payments_breakdown set ?";
            let response = await connection.queryAsync(ipbSql, data);

            /*if(response){
                //await Payment.updateInvoiceLineAllocation(connection, response.insertId);
                clsContext.push(Enums.EVENTS.PAYMENT_PROCESSED, {
                    invoicesPaymentsBreakdownId: response.insertId, 
                    invoiceId: data.invoice_id, 
                    paymentId: data.payment_id, 
                    propertyId: invoice_payment.property_id 
                });
            }*/

            return response.insertId;
        }
    },

    updateInvoiceLineAllocation: async (connection, invoice_payment_breakdown_id, params = {}) => {

        let inv_allocations = [];

        // Getting invoice_payment_breakdown
        let ipbSql = `select * from invoices_payments_breakdown where id = ${connection.escape(invoice_payment_breakdown_id)}`;
        let inv_pay_bd_response = await connection.queryAsync(ipbSql);
        let invoice_payment_breakdown = inv_pay_bd_response && inv_pay_bd_response.length && inv_pay_bd_response[0];

        if(invoice_payment_breakdown){
            if(!invoice_payment_breakdown.amount) return;
            let paid_amount = Math.abs(invoice_payment_breakdown.amount);
            let sign = invoice_payment_breakdown.amount < 0 ? -1 : 1;

            let { applied_line } = invoice_payment_breakdown;
            if(applied_line) applied_line = JSON.parse(applied_line);
            
            let product_payment_order = product_allocation_priority;
            let product_level_tax = false;

            let paymentSettingsSql = `
                select ipb.id,
                    (IFNULL((select value from settings where property_id = p.id and name = 'paymentOrder'), (select value from settings where company_id = p.company_id and property_id is null and name = 'paymentOrder'))) as payment_order,
                    (IFNULL((select value from settings where property_id = p.id and name = 'productLevelTax'), (select value from settings where company_id = p.company_id and property_id is null and name = 'productLevelTax'))) as product_level_tax
                from invoices_payments_breakdown ipb
                    inner join invoices i on i.id = ipb.invoice_id
                    inner join properties p on p.id = i.property_id
                where ipb.id = ${connection.escape(invoice_payment_breakdown.id)}
            `;
            let payment_settings = await connection.queryAsync(paymentSettingsSql);
            let paymentSetting = payment_settings && payment_settings.length && payment_settings[0];

            if(payment_settings){
                product_level_tax = paymentSetting.product_level_tax ? JSON.parse(paymentSetting.product_level_tax) : false;

                if(paymentSetting.payment_order){
                    var mod_order = paymentSetting.payment_order.replace('fees', 'late').replace('merchandise', 'product').replace('deposit', 'security,cleaning');
                    product_payment_order = mod_order.split(',');
                }
            }

            let product_payment_alloc;
            if(product_level_tax){
                product_payment_alloc = product_payment_order.reduce((obj, item) => { return [...obj, {product_type: item, type: applied_line ? applied_line.type : 'both'}] }, []);
            } else {
                if(applied_line && applied_line.type !== 'both'){
                    product_payment_alloc = product_payment_order.reduce((obj, item) => { return [...obj, {product_type: item, type: applied_line.type }] }, []);
                } else {
                    let pr_line = product_payment_order.reduce((obj, item) => { return [...obj, {product_type: item, type: 'line'}] }, []);
                    let pr_tax = product_payment_order.reduce((obj, item) => { return [...obj, {product_type: item, type: 'tax'}] }, []);
                    product_payment_alloc = pr_line.concat(pr_tax);
                }
            }

            let invoiceLinesSql = `
                select *, 
                    (select default_type from products where il.product_id = id) as type,
                    (IFNULL(il.qty * il.cost, 0) + (il.total_tax) - (il.total_discounts)) as total_amount,
                    ${
                        sign > 0 ?
                        `(IFNULL(il.qty * il.cost, 0) - (il.total_discounts) - (select IFNULL(sum(amount), 0) from invoice_lines_allocation where il.id = invoice_line_id and type = 'line') ) as line_amount,
                         ((il.total_tax) - (select IFNULL(sum(amount), 0) from invoice_lines_allocation where il.id = invoice_line_id and type = 'tax') ) as tax_amount
                        ` :
                        `(select IFNULL(sum(amount), 0) from invoice_lines_allocation where il.id = invoice_line_id and type = 'line') as line_amount,
                         (select IFNULL(sum(amount), 0) from invoice_lines_allocation where il.id = invoice_line_id and type = 'tax') as tax_amount
                        `
                    }  
                from invoice_lines il where invoice_id = ${connection.escape(invoice_payment_breakdown.invoice_id)}
            `;

            if(applied_line?.invoice_line_id){
                invoiceLinesSql += ` and id = ${connection.escape(applied_line.invoice_line_id)}`;
            }
            let invoice_lines = await connection.queryAsync(invoiceLinesSql);

            if(invoice_lines && invoice_lines.length){

                let priority_arr = sign < 0 ? [...product_payment_alloc].reverse() : product_payment_alloc;

                for (const priority_product of priority_arr) {
                    let lines = invoice_lines.filter(il => il.type === priority_product.product_type);
                    if(lines && lines.length){
                        for (var j = 0; j < lines.length; j++) {
                            let line = lines[j];
                            let inv_alloc = [
                                invoice_payment_breakdown.invoice_id,
                                invoice_payment_breakdown.invoice_payment_id,
                                line.id,
                                invoice_payment_breakdown.id,
                                invoice_payment_breakdown.date,
                                invoice_payment_breakdown.effective_date,
                            ];

                            let totalAlloc = priority_product.type == 'line' ? line.line_amount : (priority_product.type == 'tax' ? line.tax_amount : line.line_amount + line.tax_amount);
                            if(!totalAlloc) continue;

                            let minAmt = Math.min(paid_amount, totalAlloc);
                            paid_amount -= minAmt;

                            let amtAlloc = 0 , taxAlloc = 0;
                            if(priority_product.type == 'both'){
                                if(minAmt == totalAlloc){
                                    amtAlloc = line.line_amount;
                                    taxAlloc = line.tax_amount;
                                } else {
                                    amtAlloc = rounding.round(((minAmt / totalAlloc) * line.line_amount));
                                    taxAlloc = rounding.round(minAmt - amtAlloc);
                                }
                            } else {
                                priority_product.type == 'line' ? amtAlloc = minAmt : taxAlloc = minAmt
                            }

                            let inv_lines_alloc = [];
                            if(amtAlloc){
                                let inv_line = [...inv_alloc];
                                inv_line.push('line', sign * amtAlloc);
                                inv_lines_alloc.push(inv_line);
                            }

                            if(taxAlloc){
                                let inv_line = [...inv_alloc];
                                inv_line.push('tax', sign * taxAlloc);
                                inv_lines_alloc.push(inv_line);
                            }

                            inv_allocations = inv_allocations.concat(inv_lines_alloc)
                            if(!paid_amount) break;                            
                        }
                    }
                    if(!paid_amount) break;
                }
            }

            if(inv_allocations.length){
                let sql = 'INSERT INTO invoice_lines_allocation (invoice_id, invoice_payment_id, invoice_line_id, invoice_payment_breakdown_id, date, effective_date, type, amount) VALUES ?';
                await connection.queryAsync(sql, [inv_allocations]);
            }
        }
    },

    updateInvoicePaymentTotal: async (connection, invoice_id) => {

        let invoice_total_amount_sql = `
        SELECT IFNULL(SUM(IFNULL(ip.amount,0)), 0) as amount
        FROM invoices_payments ip 
          LEFT JOIN payments p ON ip.payment_id = p.id 
        where p.status = 1 and ip.invoice_id = ${connection.escape(invoice_id)};`;

        console.log("updateInvoicePaymentTotal - invoice_total_amount_sql: ", invoice_total_amount_sql);

        let invoice_total = await connection.queryAsync(invoice_total_amount_sql);
        let invoice_amount = (invoice_total.length > 0 && invoice_total[0].amount) || 0;

        let update_invoice_total_sql = `UPDATE invoices set total_payments = ${connection.escape(invoice_amount)} WHERE id = ${connection.escape(invoice_id)};`;
        console.log("updateInvoicePaymentTotal - update_invoice_total_sql: ", update_invoice_total_sql);

        return await connection.queryAsync(update_invoice_total_sql);
    },


    unapplyPayment: async (connection, apply_id, new_amount, params = {}) => {

        let date = moment().format('YYYY-MM-DD');
        // get invoice reference before deleting
        let invoicePaymentSql = "select * from invoices_payments where id = " + connection.escape(apply_id);
        let inv_response = await connection.queryAsync(invoicePaymentSql);
        let invoice_id = inv_response[0].invoice_id;
        var sql = `UPDATE invoices_payments
                  SET amount = ${new_amount || 0}, date = ${connection.escape(date)}  where id = ${connection.escape(apply_id)}`;
  
      //   if(new_amount && new_amount > 0) {
      //     sql =  `UPDATE invoices_payments
      //             SET amount = ${new_amount}  where id = ${connection.escape(apply_id)}`;
      //   } else {
      //     sql = "Delete from invoices_payments where id = " + connection.escape(apply_id);
      //   }
  
        await  connection.queryAsync(sql);
  
        // update invoice payment Totals
        await Payment.updateInvoicePaymentTotal(connection, invoice_id);      // call it seprately
  
        let diff = ((new_amount || 0) - inv_response[0].amount);
        if(diff) return await Payment.updateInvoicePaymentBreakDown(connection, diff, apply_id);
  
      },

    findPaymentApplications: function(connection, payment_id){

        var sql = "select * from invoices_payments where payment_id = " + connection.escape(payment_id);
        var data = [];
        return connection.queryAsync(sql).each(function(appliedPayment){
            var invoiceSql = "Select * from invoices where status > -1 and id = " + connection.escape(appliedPayment.invoice_id)
            return connection.queryAsync(invoiceSql).then(function(invoiceRes){
                if(invoiceRes.length){
                    appliedPayment.Invoice = invoiceRes[0];
                }
                return appliedPayment;
            })
        });
    },

    findPaymentApplicationById: function(connection, invoices_payment_id){
        var sql = "select * from invoices_payments where id = " + connection.escape(invoices_payment_id);

        return connection.queryAsync(sql).then(r => r.length? r[0] : null);
    },

    findPaymentByCompanyId: function(connection, company_id, creditType){

        // var sql = " Select GROUP_CONCAT(p.id SEPARATOR',') as payment_ids, c.id as contact_id, c.company_id as company_id, CONCAT(c.`first`, ' ' ,c.middle, ' ' ,c.`last`) as Name, sum(p.amount) as total_amount, sum(p.amount - (( " + 
        // "select IFNULL(sum(amount), 0) from invoices_payments where payment_id = p.id) + ( select IFNULL(sum(amount), 0) from refunds where refunds.payment_id = p.id))) as remaining_amount " + 
        // "from payments p inner join contacts c on c.id = p.contact_id and c.company_id = "+  connection.escape(company_id) +" where p.status = 1 and contact_id = c.id and (p.credit_type = 'credit' or (p.credit_type = 'payment' and p.id in (SELECT payment_id from invoices_payments ip))) " +
	    // "and (( select IFNULL(sum(amount), 0) from invoices_payments where payment_id = p.id) + ( select IFNULL(sum(amount), 0) from refunds " +
	    // "where refunds.payment_id = p.id))  < p.amount and p.amount - (( select IFNULL(sum(amount), 0) from invoices_payments where payment_id = p.id) + ( select IFNULL(sum(amount), 0) from refunds where refunds.payment_id = p.id)) > 0 " +
        // "GROUP BY c.id " + 
        // "order by remaining_amount desc ";

        //Include Migrated payments
        var sql = ` Select GROUP_CONCAT(p.id SEPARATOR',') as payment_ids, c.id as contact_id, c.company_id as company_id, CONCAT(c.first, ' ' ,c.middle, ' ' ,c.last) as Name, sum(p.amount) as total_amount, sum(p.amount - (( 
        select IFNULL(sum(amount), 0) from invoices_payments where payment_id = p.id) + ( select IFNULL(sum(amount), 0) from refunds where refunds.payment_id = p.id))) as remaining_amount  
        from payments p inner join contacts c on c.id = p.contact_id and c.company_id = ${connection.escape(company_id)}
        where p.status = 1 
        and contact_id = c.id 
        and p.credit_type in ( ${creditType ? creditType.map(c => connection.escape(c.toLowerCase())).join(', '): "'payment','credit'" }) 
	    and (( select IFNULL(sum(amount), 0) from invoices_payments where payment_id = p.id) + ( select IFNULL(sum(amount), 0) from refunds 
	    where refunds.payment_id = p.id))  < p.amount and p.amount - (( select IFNULL(sum(amount), 0) from invoices_payments where payment_id = p.id) + ( select IFNULL(sum(amount), 0) from refunds where refunds.payment_id = p.id)) > 0 
        GROUP BY c.id 
        order by remaining_amount desc `;
        console.log(`Payments Query: ${sql}`);

        return connection.queryAsync(sql).then(r => r.length? r : null);
    },

    findPaymentByContactId: function(connection, contact_id, creditType){

        // var sql = " Select GROUP_CONCAT(p.id SEPARATOR',') as payment_ids, c.id as contact_id, c.company_id as company_id, CONCAT(c.`first`, ' ' ,c.middle, ' ' ,c.`last`) as Name, sum(p.amount) as total_amount, sum(p.amount - (( " + 
        // "select IFNULL(sum(amount), 0) from invoices_payments where payment_id = p.id) + ( select IFNULL(sum(amount), 0) from refunds where refunds.payment_id = p.id))) as remaining_amount " + 
        // "from payments p inner join contacts c on c.id = p.contact_id and p.contact_id = "+  connection.escape(contact_id) +" where p.status = 1 and contact_id = c.id and (p.credit_type = 'credit' or (p.credit_type = 'payment' and p.id in (SELECT payment_id from invoices_payments ip))) " +
	    // "and (( select IFNULL(sum(amount), 0) from invoices_payments where payment_id = p.id) + ( select IFNULL(sum(amount), 0) from refunds " +
	    // "where refunds.payment_id = p.id))  < p.amount and p.amount - (( select IFNULL(sum(amount), 0) from invoices_payments where payment_id = p.id) + ( select IFNULL(sum(amount), 0) from refunds where refunds.payment_id = p.id)) > 0 " +
        // "GROUP BY c.id " + 
        // "order by remaining_amount desc ";

        
        //Include Migrated payments
        var sql = ` Select GROUP_CONCAT(p.id SEPARATOR',') as payment_ids, c.id as contact_id, c.company_id as company_id, CONCAT(c.first, ' ' ,c.middle, ' ' ,c.last) as Name, sum(p.amount) as total_amount, sum(p.amount - (( 
        select IFNULL(sum(amount), 0) from invoices_payments where payment_id = p.id) + ( select IFNULL(sum(amount), 0) from refunds where refunds.payment_id = p.id))) as remaining_amount 
        from payments p inner join contacts c on c.id = p.contact_id and p.contact_id = ${connection.escape(contact_id)}
        where p.status = 1 
        and contact_id = c.id 
        and p.credit_type in ( ${creditType ? creditType.map(c => connection.escape(c.toLowerCase())).join(', '): "'payment','credit'" })  
	    and (( select IFNULL(sum(amount), 0) from invoices_payments where payment_id = p.id) + ( select IFNULL(sum(amount), 0) from refunds
        where refunds.payment_id = p.id))  < p.amount and p.amount - (( select IFNULL(sum(amount), 0) from invoices_payments where payment_id = p.id) + ( select IFNULL(sum(amount), 0) from refunds where refunds.payment_id = p.id)) > 0
        GROUP BY c.id 
        order by remaining_amount desc `;
        console.log(`Payments Query: ${sql}`);


        return connection.queryAsync(sql).then(r => r.length? r : null);
    },

    findPaymentById: function(connection, payment_id){
        var sql = "Select * from payments where id = " + connection.escape(payment_id);
        return connection.queryAsync(sql).then(r => r.length? r[0] : null);
    },

    findCompanyFromPaymentId: function(connection, payment_id){
        var sql = "Select company_id from properties where id = (select property_id from units where id = (select unit_id from leases where id = (select lease_id from payments where id = " + connection.escape(payment_id) + ')))';
        return connection.queryAsync(sql).then(r => r.length? r[0] : null);
    },

    findPaymentByTransactionId: function(connection, payment_id){

        var sql = "Select * from payments where transaction_id = " + connection.escape(payment_id);

        return connection.queryAsync(sql).then(function(paymentRes){
            if(!paymentRes.length) return false;
            return paymentRes[0];
        });

    },

    findPaymentsByInvoiceId: function(connection, invoice_id){
        var sql = "Select * from invoices_payments where invoice_id = " + connection.escape(invoice_id);

        return connection.queryAsync(sql).each(function(invPay){
            var applied = {};
            applied = invPay;
            applied.Payment = {};
            applied.PaymentMethod = {};
            var paymentSql = "Select * from payments where id = " + applied.payment_id;

            return connection.queryAsync(paymentSql).then(function(paymentRes){
                console.log(paymentRes);
                if(paymentRes.length){
                    applied.Payment = paymentRes[0];
                    var paymentMethodSql = "Select * from payment_methods where id = " + applied.Payment.payment_methods_id;
                    return connection.queryAsync(paymentMethodSql);
                } else {
                    return false;
                }
            }).then(function(paymentMethodRes){
                if(paymentMethodRes){
                    applied.PaymentMethod = paymentMethodRes[0];
                }
                return applied;
            }).catch(function(err){
                console.log(err);
                console.log(err.stack);
                return false;
            })
        })
    },

    findAutoPayByPaymentId(connection, payment_method_id, date){
        var sql = "Select * from leases_payment_methods " +
            " where deleted is null and payment_method_id =  " + connection.escape(payment_method_id) +
            " and lease_id in (select id from leases where status = 1 and start_date <= CURDATE() and (end_date is null or end_date > CURDATE()))";

        console.log(sql);


        return connection.queryAsync(sql);
    },

    findPaymentOpenPaymentsByLeaseId: function(connection, lease_id){

        var sql = "Select *," +
            " ((select IFNULL(sum(amount),0) from invoices_payments where payment_id = payments.id) + (select IFNULL(sum(amount),0) from refunds where refunds.payment_id = payments.id)) as amount_used " +
            " from payments where status = 1 and credit_type in ('payment', 'credit') and contact_id in (select contact_id from contact_leases where lease_id = " + connection.escape(lease_id) + ") and " +
            " ((select IFNULL(sum(amount),0) from invoices_payments where payment_id = payments.id) + (select IFNULL(sum(amount),0) from refunds where refunds.payment_id = payments.id)) " +
            " < payments.amount order by payments.date desc ";

        return connection.queryAsync(sql);

    },

    findPaymentsByLeaseId: function(connection, lease_id, conditions, options){
        var sql = "Select * from payments where lease_id = " + connection.escape(lease_id) ;

        if(conditions && conditions.applied){
            sql += ' and applied = ' + conditions.applied;
        }
        sql += " order by date desc ";

        if(options){
            if(typeof options.limit !='undefined' && typeof options.offset !='undefined' ){
                sql += " limit " + connection.escape(parseInt(options.offset)) + ", " + connection.escape(parseInt(options.limit));
            }
        }

        return connection.queryAsync(sql);

    },

    findPaymentsByLeaseIdCount: function(connection, lease_id, conditions, options){
        var sql = "Select count(*) from payments where lease_id = " + connection.escape(lease_id) ;

        if(conditions && conditions.applied){
            sql += ' and applied = ' + conditions.applied;
        }
        sql += " order by date desc ";

        if(options){
            if(typeof options.limit !='undefined' && typeof options.offset !='undefined' ){
                sql += " limit " + connection.escape(parseInt(options.offset)) + ", " + connection.escape(parseInt(options.limit));
            }
        }
        return connection.queryAsync(sql);
    },
    
    getCardType: function(number){
        // visa
        var re = new RegExp("^4");
        if (number.match(re) != null)
            return "Visa";

        // Mastercard
        re = new RegExp("^5[1-5]");
        if (number.match(re) != null)
            return "Mastercard";

        // AMEX
        re = new RegExp("^3[47]");
        if (number.match(re) != null)
            return "AMEX";

        // Discover
        re = new RegExp("^(6011|622(12[6-9]|1[3-9][0-9]|[2-8][0-9]{2}|9[0-1][0-9]|92[0-5]|64[4-9])|65)");
        if (number.match(re) != null)
            return "Discover";

        // Diners
        re = new RegExp("^36");
        if (number.match(re) != null)
            return "Diners";

        // Diners - Carte Blanche
        re = new RegExp("^30[0-5]");
        if (number.match(re) != null)
            return "Diners - Carte Blanche";

        // JCB
        re = new RegExp("^35(2[89]|[3-8][0-9])");
        if (number.match(re) != null)
            return "JCB";
    },

    deletePayment:function(connection, payment_id){
        var sql = "update payments set status = 0 where id = " + connection.escape(payment_id);
        return connection.queryAsync(sql);
    },

    deletePaymentMethod:function(connection, payment_id){

        var sql = "Update payment_methods set active = 0 where id = " + connection.escape(payment_id);

        return connection.queryAsync(sql);
    },

    deleteCreditCard: function(connection, payment_method, company_id){

        var _this = this;
        var authKey, authLogin;
        var lease = {};


        var token = '';
        var auth = {};
        return Promise.resolve().then(function(){
            return Lease.findById(connection, payment_method.lease_id);
        }).then(function(leaseRes){
            lease = leaseRes;

            // get company Authorize.net details
            var promises = [
                Setting.findCompanySetting(connection, 'authnetLogin', company_id),
                Setting.findCompanySetting(connection, 'authnetKey', company_id)
            ];
            return Promise.all(promises);

        }).spread(function(login, key){
            if(!login.value || !key.value )  throw "This account is not set up to accept credit cards at this time.";
            auth = {
                login: login.value,
                key: key.value
            };
            console.log(lease);

            return deleteCustomerPaymentProfile(auth, lease.token, payment_method.token);

        }).then(function(response){
            console.log(payment_method);
            console.log(payment_method.id);
            return _this.deletePaymentMethod(connection, payment_method.id);
        }).catch(function(err){
            console.log(err);
            console.log(err.stack);
            throw err.toString();
        })
    },

    deleteACH: function(connection, payment_method, company_id){

        var _this = this;
        var forteKey, forteLogin, forteOrg, forteLoc;
        var lease = {};


        var token = '';
        var forte = {};
        return Promise.resolve().then(function(){
            return Lease.findById(connection, payment_method.lease_id);
        }).then(function(leaseRes){
            lease = leaseRes;

            // get company Authorize.net details
            var promises = [
                Setting.findCompanySetting(connection, 'forteLogin', company_id),
                Setting.findCompanySetting(connection, 'forteKey', company_id),
                Setting.findCompanySetting(connection, 'forteOrganizationId', company_id),
                Setting.findCompanySetting(connection, 'forteLocationId', company_id),
            ];

            return Promise.all(promises);

        }).spread(function(login, key, org, loc){

            if(!login.value || !key.value || !org.value || !loc.value)  throw "ACH is not properly set up on this account.";

            forteKey = key.value;
            forteLogin = login.value;
            forteOrg = org.value;
            forteLoc = loc.value;

            forte = {
                login: login.value,
                key: key.value,
                org: org.value,
                loc: loc.value
            };

            return forteACHFuncs.deleteCustomerPaymentProfile(forte, lease.achtoken, payment_method.token);

        }).then(function(response){

            return _this.deletePaymentMethod(connection, payment_method.id);

        }).catch(function(err){
            console.log(err);
            console.log(err.stack);
            throw err.toString();
        })
    },

    findPaymentsByCompanyId(connection, company_id, search, sort, offset, limit, count){

        var sql;
        if(count){
            sql = " select count(*) as count, SUM(amount) as total from payments ";
        } else {
            sql = " select *, concat( (select address from addresses where id = (select address_id from properties where id = (select property_id from units where id = (select unit_id from leases where id = payments.lease_id)))), ' #', (select number from units where id = (select unit_id from leases where id = payments.lease_id)) ) as address from payments ";
        }




        sql += " WHERE payments.lease_id in (select id from leases where unit_id in (select id from units where property_id in ( select id from properties where company_id = " + connection.escape(company_id) + "))) ";

        console.log(search);

        if(search.ref_name){
            sql += " and ref_name like " + connection.escape("%" + search.ref_name + "%");
        }

        if(search.address){
            sql += " and concat( (select address from addresses where id = (select address_id from properties where id = (select property_id from units where id = (select unit_id from leases where id = payments.lease_id)))), ' #', (select number from units where id = (select unit_id from leases where id = payments.lease_id)) ) like " + connection.escape("%" + search.address + "%");
        }

        if(search.amount){
            sql += " and amount like " + connection.escape("%" + search.amount + "%");
        }

        if(search.type.length){
            sql += " and LOWER(type) in (" + search.type.map(t => { return connection.escape(t.toLowerCase())  }).join(',') + ")";
        }

        if(search.method.length){
            sql += " and LOWER(method) in (" + search.method.map(t => { return connection.escape(t.toLowerCase())  }).join(',') + ")";
        }

        if(search.transaction_id){
            sql += " and payments.transaction_id like " + connection.escape("%" + search.transaction_id + "%");
        }

        if(search.timeframe){
            if(search.timeframe.start && search.timeframe.end) {
                sql += " AND payments.date BETWEEN DATE_SUB(CURDATE(), INTERVAL " + connection.escape(search.timeframe.start) + " DAY) and DATE_SUB(CURDATE(), INTERVAL " + connection.escape(search.timeframe.end) + " DAY) ";

            } else if(!search.timeframe.start && search.timeframe.end ){
                sql += " AND payments.date < DATE_SUB(CURDATE(), INTERVAL " + connection.escape(search.timeframe.end) + " DAY) ";

            } else if(search.timeframe.start && !search.timeframe.end ){
                sql += " AND payments.date > DATE_SUB(CURDATE(), INTERVAL " + connection.escape(search.timeframe.start) + " DAY) ";
            }

        }

        if(sort != null && sort.length){
            var field;

            var sortpart = '';
            sort.forEach(s => {
                if(!s.field.length) return;
                switch (s.field){
                    case 'ref_name':
                        field = 'ref_name';
                        break;
                    case 'address':
                        field = 'address';
                        break;
                    case 'date':
                        field = 'date';
                        break;
                    case 'number':
                        field = 'number';
                        break;
                    case 'amount':
                        field = 'amount';
                        break;
                    case 'payment_type':
                        field = 'type';
                        break;
                    case 'method':
                        field = 'method';
                        break;
                    case 'transaction_id':
                        field = 'transaction_id';
                        break;
                    case 'card_end':
                        field = 'card_end';
                        break;
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
            sql += " ORDER BY id ASC ";
        }

        if(limit != null && offset != null){
            sql += " limit " + connection.escape(offset) + ", " + connection.escape(limit);
        }
        console.log(connection.format(sql));
        return connection.queryAsync(sql).then(r => {
            return r;
        })
    },

    saveRefund(connection, data, refund_id){
        var sql;
        if (refund_id) {
            sql = "UPDATE refunds set ? where id = " + connection.escape(refund_id);
        } else {
            sql = "insert into refunds set ?";
        }
        return connection.queryAsync(sql, data);
    },
        
    saveContactTokenPaymentMehtod(connection, data){
        let sql = "insert into contact_payment_methods set ?";
        return connection.queryAsync(sql, data);
    },

    
    saveContactTokenPaymentMehtod(connection, data){
        let sql = "insert into contact_payment_methods set ?";
        return connection.queryAsync(sql, data);
    },

    findIsExistContactTokenPaymentMehtod(connection, data){
        let sql = `select * from contact_payment_methods where contact_token_id = ${connection.escape(data.contact_token_id)} and payment_method_id = ${connection.escape(data.payment_method_id)}`;
        return connection.queryAsync(sql).then(r => {
            return r && r.length > 0?  true : false; 
        });
    },

    findRefunds(connection, payment_id){
        var sql = "SELECT * from refunds where payment_id = " + connection.escape(payment_id);
        return connection.queryAsync(sql);
    },
    findOpenPaymentsByLeasesId: function(connection, lease_id, property_id, params = {}){

        let { types, sort_by_created, is_transfer} = params;
        let sql = '';
        if(is_transfer){
            sql = `SELECT
                    payments.*,
                    ((select IFNULL(sum(amount),0) from invoices_payments where payment_id = payments.id) + (select IFNULL(sum(amount),0) from refunds where refunds.payment_id = payments.id)) as amount_used
                FROM payments 
                INNER JOIN payment_leases pl on pl.payment_id = payments.id and pl.lease_id = ${lease_id}
                WHERE payments.status = 1 
                AND payments.property_id = ${connection.escape(property_id)}
                AND ((select IFNULL(sum(amount),0) from invoices_payments where payment_id = payments.id) + (select IFNULL(sum(amount),0) from refunds where refunds.payment_id = payments.id)) < payments.amount
                AND payments.credit_type in(${ types.map(t => connection.escape(t)).join(', ') })`;
        } else {
            sql = `SELECT
                    payments.*,
                    (select IFNULL(sum(amount),0) from invoices_payments where payment_id = payments.id and invoice_id in (select id from invoices where lease_id = pl.lease_id )) as amount_used,
                    (pl.amount - (select IFNULL(sum(amount),0) from invoices_payments where payment_id = payments.id and invoice_id in (select id from invoices where lease_id = pl.lease_id )))  as amt_remaining
                FROM payments 
                INNER JOIN payment_leases pl on pl.payment_id = payments.id and pl.lease_id = ${lease_id}
                WHERE payments.status = 1 
                AND payments.property_id = ${connection.escape(property_id)}
                AND (pl.amount - (select IFNULL(sum(amount),0) from invoices_payments where payment_id = payments.id and invoice_id in (select id from invoices where lease_id = pl.lease_id ))) > 0
                AND payments.credit_type in(${ types.map(t => connection.escape(t)).join(', ') })`;
        }
 
        if(sort_by_created){
          sql += " order by payments.created asc ";
        } else {
          sql += " order by payments.date desc ";
        }
  
        console.log("findOpenPaymentsByLeasesId", sql);
        return connection.queryAsync(sql);
    },

    findOpenPaymentsByContactId: function(connection, contact_id, property_id, params = {}){

        var { types, sort_by_created} = params
  
        var sql = "Select *," +
          " ((select IFNULL(sum(amount),0) from invoices_payments where payment_id = payments.id) + (select IFNULL(sum(amount),0) from refunds where refunds.payment_id = payments.id)) as amount_used " +
          " from payments where status = 1 and property_id = " + connection.escape(property_id) + " and contact_id = " + connection.escape(contact_id) + " and " +
          " ((select IFNULL(sum(amount),0) from invoices_payments where payment_id = payments.id) + (select IFNULL(sum(amount),0) from refunds where refunds.payment_id = payments.id)) " +
          " < payments.amount";
  
        if(types && types.length){
          sql += ' and credit_type in (' +  types.map(t => connection.escape(t)).join(', ') +  ')';
        }
  
        if(sort_by_created){
          sql += " order by payments.created asc ";
        } else {
          sql += " order by payments.date desc ";
        }
  
        console.log(sql);
        return connection.queryAsync(sql);
    },
    findActiveLeasesByPaymentId: function(connection,payment_id){
 
        var sql = `SELECT 
                        DISTINCT(l.id)
                    FROM payment_leases pl
                    INNER JOIN leases l ON pl.lease_id = l.id
                    WHERE pl.payment_id = ${payment_id}
                    AND (l.end_date IS NULL OR l.end_date > CURDATE())`
  
        console.log("findActiveLeasesByPaymentId", sql);
        return connection.queryAsync(sql);
    },

    findOpenPayments: function(connection, contact_id, property_id, params = {}) {
        var { types, sort_by_created } = params;
  
        var sql = "Select *," +
          " ((select IFNULL(sum(amount),0) from invoices_payments where payment_id = payments.id) + (select IFNULL(sum(amount),0) from refunds where refunds.payment_id = payments.id)) as amount_used " +
          " from payments where status = 1 and property_id = " + connection.escape(property_id);
          
          if(contact_id) {
            sql += " and contact_id = " + connection.escape(contact_id); 
          }

          sql += " and " +
          " ((select IFNULL(sum(amount),0) from invoices_payments where payment_id = payments.id) + (select IFNULL(sum(amount),0) from refunds where refunds.payment_id = payments.id)) " +
          " < payments.amount";
  
        if(types && types.length){
          sql += ' and credit_type in (' +  types.map(t => connection.escape(t)).join(', ') +  ')';
        }
  
        if(sort_by_created){
          sql += " order by payments.created asc ";
        } else {
          sql += " order by payments.date desc ";
        }
  
        return connection.queryAsync(sql);
    },
    
    getInvoiceLinesFromPayment(connection, payment_id){
        let sql = `select *, il.id lines_id, ila.amount line_amount from invoice_lines_allocation ila
        inner join invoice_lines il on ila.invoice_line_id = il.id
        inner join products p on p.id = il.product_id
        inner join invoices_payments ip on ila.invoice_payment_id = ip.id
        where ip.payment_id = ${connection.escape(payment_id)};`;
        return connection.queryAsync(sql);
    },

    getPaymentMethodTypeId : async (connection,type,sub_type) => {
        var sql = 'select id from payment_method_type where payment_method_type = ' + connection.escape(type);
        if(sub_type){
            sql += ' and sub_type = ' + connection.escape(sub_type);
        }
        return connection.queryAsync(sql).then(r => {
            return r && r.length > 0?  r[0].id : null; 
        });
    },
    
    findPaymentMethodByToken: async (connection, token ) => {
        var sql = 'select * from payment_methods where token = ' + connection.escape(token);
        return connection.queryAsync(sql).then(r => {
            return r && r.length > 0?  r[0] : null; 
        });
    },

    findPaymentMethodByToken: async (connection, token ) => {
        var sql = 'select * from payment_methods where token = ' + connection.escape(token);
        return connection.queryAsync(sql).then(r => {
            return r && r.length > 0?  r[0] : null; 
        });
    },

    findPriorPaymentsOnInvoice: function(connection, invoice_id, payment_id){
        var sql = `select * from invoices_payments where invoice_id = ${connection.escape(invoice_id)} 
                    and payment_id=${connection.escape(payment_id)}`
        return connection.queryAsync(sql).then(r => r.length? r[0] : null);
    },

    getRefund(connection, refund_id) {
        var sql = `SELECT * from refunds where id = ${connection.escape(refund_id)}`;
        return connection.queryAsync(sql).then(r => r.length? r[0] : null);
    },

    getAllCreditPayments(connection, payload) {
        const { method, company_id, property_id, from_date, to_date } = payload;
        
        let sql = `
            select p.*
            from payments p
                inner join properties pr on pr.id = p.property_id
            where p.credit_type in ( '${Enums.PAYMENT_CREDIT_TYPE.CREDIT}', '${Enums.PAYMENT_CREDIT_TYPE.ADJUSTMENT}' )
            and ifnull(p.sub_method, 1) not in ( '${Enums.NON_CREDIT_ADJUSTMENT_SUB_METHODS.INTER_PROPERTY_PAYMENT}' ) 
        `;

        if(property_id) {
            sql +=  ` and p.property_id = ${connection.escape(property_id)}`;
        } else if (company_id){
            sql +=  ` and pr.company_id = ${connection.escape(company_id)}`;
        }

        if(method) {
            sql += ` and p.method = ${connection.escape(method)}`;  
        }

        if(from_date){
            sql +=  ` and p.date >= ${connection.escape(from_date)}`;
        }

        if(to_date){
            sql +=  ` and p.date <= ${connection.escape(to_date)}`;
        }

        sql += ` and NOT EXISTS(
                    select id from gl_exports ge where p.id = ge.object_id and (select gl_event_id from gl_event_company where id = ge.gl_event_company_id) in (${Enums.ACCOUNTING.EVENTS.ALLOWANCE})
                )`;

        console.log('Get All Payments  ', sql);
        return connection.queryAsync(sql);
    },

    getAllInterPropertyPayments(connection, payload) {
        const { method, company_id, property_id, from_date, to_date } = payload;
        
        let sql = `
            select p.*, ipp.source_payment_id
            from payments p
                join inter_property_payments ipp on ipp.payment_id = p.id
                join properties pr on pr.id = p.property_id
            where p.credit_type in ( '${Enums.PAYMENT_CREDIT_TYPE.ADJUSTMENT}' )
            and p.sub_method in ( '${Enums.NON_CREDIT_ADJUSTMENT_SUB_METHODS.INTER_PROPERTY_PAYMENT}' ) 
        `;

        if(property_id) {
            sql +=  ` and p.property_id = ${connection.escape(property_id)}`;
        } else if (company_id){
            sql +=  ` and pr.company_id = ${connection.escape(company_id)}`;
        }

        if(method) {
            sql += ` and p.method = ${connection.escape(method)}`;  
        }

        if(from_date){
            sql +=  ` and p.date >= ${connection.escape(from_date)}`;
        }

        if(to_date){
            sql +=  ` and p.date <= ${connection.escape(to_date)}`;
        }

        sql += ` and NOT EXISTS(
                    select id from gl_exports ge where p.id = ge.object_id and (select gl_event_id from gl_event_company where id = ge.gl_event_company_id) in (${Enums.ACCOUNTING.EVENTS.INTER_PROPERTY_PAYMENT})
                )`;

        console.log('Get all inter property payments ', sql);
        return connection.queryAsync(sql);
    },

    async getAllPaymentsBreakdown(connection, payload) {
        const { company_id, property_id, from_date, to_date, breakdown_ids } = payload;

        let sql = `
            select ipb.*, i.property_id 
            from invoices_payments_breakdown ipb 
                inner join invoices i on ipb.invoice_id = i.id
                inner join properties p on p.id = i.property_id
            where ipb.refund_id is null
        `;
        
        if(property_id) {
            sql +=  ` and i.property_id = ${connection.escape(property_id)}`;
        } else if (company_id){
            sql +=  ` and p.company_id = ${connection.escape(company_id)}`;
        }

        if(from_date){
            sql +=  ` and ipb.date >= ${connection.escape(from_date)}`;
        }

        if(to_date){
            sql +=  ` and ipb.date <= ${connection.escape(to_date)}`;
        }

        if(breakdown_ids && breakdown_ids){
            sql +=  ` and ipb.id in (${breakdown_ids.join(', ')})`;
        }

        sql += ` and NOT EXISTS(
                    select id from gl_exports ge where ipb.id = ge.object_id and (select gl_event_id from gl_event_company where id = ge.gl_event_company_id) 
                    in (${Enums.ACCOUNTING.EVENTS.POSTING_PAYMENT}, ${Enums.ACCOUNTING.EVENTS.WRITE_OFF}, ${Enums.ACCOUNTING.EVENTS.PAYMENT_WITH_CREDITS}, ${Enums.ACCOUNTING.EVENTS.POSTING_EXCESS_PAYMENT}, ${Enums.ACCOUNTING.EVENTS.POSTING_EXCESS_CREDIT_PAYMENT})
                )`;
        
        console.log('Get All Breakdowns:  ', sql);
        
        return connection.queryAsync(sql);
    },

    getAllRefunds(connection, payload) {
        const { company_id, property_id, from_date, to_date, refund_ids } = payload;

        let sql = `
            select r.*, p.property_id, 
                r.date AS refund_date 
            from refunds r 
                join payments p on r.payment_id = p.id 
                join properties pr on pr.id = p.property_id
            where exists (select 1 from invoices_payments_breakdown where refund_id = r.id)
        `;

        if(property_id) {
            sql +=  ` and p.property_id = ${connection.escape(property_id)}`;
        } else if (company_id){
            sql +=  ` and pr.company_id = ${connection.escape(company_id)}`;
        }

        if(from_date){
            sql +=  ` and DATE(r.date) >= ${connection.escape(from_date)}`;
        }

        if(to_date){
            sql +=  ` and DATE(r.date) <= ${connection.escape(to_date)}`;
        }

        if(refund_ids && refund_ids){
            sql +=  ` and r.id in (${refund_ids.join(', ')})`;
        }

        sql += ` and NOT EXISTS(
                    select id from gl_exports ge where r.id = ge.object_id and (select gl_event_id from gl_event_company where id = ge.gl_event_company_id) in (${Enums.ACCOUNTING.EVENTS.REFUNDS})
                )`;

        console.log('Get all refunds: ', sql);

        return connection.queryAsync(sql);
    },

    getAllBreakdownsById: function(connection, payment_id){
        var paymentMethodsSql = 'select * from invoices_payments_breakdown where payment_id = ' + connection.escape(payment_id);
        return connection.queryAsync(paymentMethodsSql);
    },

    getInvoicePaymentBreakdownById(connection, ids = []) {
        if(!ids.length) return 
        let sql = `SELECT * FROM invoices_payments_breakdown where id in (${ids.map(id => connection.escape(id)).join()})`;
        return connection.queryAsync(sql);
    },

    getPaymentOfBreakdown(connection, breakdown_id){
        let sql = `select * from payments where id in (SELECT payment_id FROM invoices_payments_breakdown where id = ${connection.escape(breakdown_id)})`;
        return connection.queryAsync(sql).then(r => r.length? r[0] : null);
    },

    async clearPreviousAllocationsExports( connection, invoice_id, breakdownIds, refundIds){

        if(breakdownIds && breakdownIds.length){
            let sql = ` Delete from invoice_lines_allocation
                        where id > 0 and invoice_payment_breakdown_id in (${breakdownIds});`;
            await connection.queryAsync(sql);
            console.log('Cleared Allocations ' , sql);
        }

        return Payment.clearAccountingExports(connection,invoice_id,breakdownIds,refundIds) 
    },

    clearAccountingExports(connection, invoice_id, breakdownIds=[], refundIds=[]){
        let sql = `
            delete from gl_exports where id > 0 and id in (
                select * from (
                ${breakdownIds?.length ? `
                    select id from gl_exports
                    where object_id in (${breakdownIds}) and 
                    ((select gl_event_id from gl_event_company where id = gl_event_company_id) in (${Enums.ACCOUNTING.EVENTS.POSTING_PAYMENT}, ${Enums.ACCOUNTING.EVENTS.WRITE_OFF}, ${Enums.ACCOUNTING.EVENTS.PAYMENT_WITH_CREDITS}, ${Enums.ACCOUNTING.EVENTS.POSTING_EXCESS_PAYMENT}, ${Enums.ACCOUNTING.EVENTS.POSTING_EXCESS_CREDIT_PAYMENT}))
                `: ''}
                ${breakdownIds?.length && invoice_id ? 'union all':'' }
                ${invoice_id ? `select id from gl_exports
                    where object_id in (${invoice_id}) and 
                    ((select gl_event_id from gl_event_company where id = gl_event_company_id) in (${Enums.ACCOUNTING.EVENTS.REVENUE_RECOGNITION}))
                  `:''}
                ${invoice_id && refundIds?.length ? 'union all':'' }
                ${refundIds?.length ? `select id from gl_exports
                    where object_id in (${refundIds}) and 
                    ((select gl_event_id from gl_event_company where id = gl_event_company_id) in (${Enums.ACCOUNTING.EVENTS.REFUNDS}))
                    `:''}
                ) as g_exports
            )`;

        console.log('Cleared Exports ' , sql);

        return connection.queryAsync(sql);
    },

    getOpenPayments(connection, params){
        console.log("YOYO", params);
        let { company_id, property_id, contact_id, active_lease = false, affected_lease = false, details = false } = params;

        let sql = `
            with open_payments as (
                select 
                    c.company_id,
                    p.contact_id,
                    p.date,
                    p.lease_id as lease_id,
                    concat(c.first, ' ', c.last) as name,
                    p.property_id,
                    pr.name as property_name,
                    p.id as payment_id,
                    p.credit_type,
                    p.amount as amount,
                    sum(ifnull(r.amount,0)) as refund,
                    sum(ifnull(ip.amount,0)) as applied
                from payments p
                    inner join contacts c on c.id = p.contact_id
                    inner join properties pr on pr.id = p.property_id
                    LEFT JOIN (
                        SELECT payment_id, SUM(amount) AS amount
                        FROM invoices_payments
                        GROUP BY payment_id
                    ) ip ON ip.payment_id = p.id
                    LEFT JOIN (
                        SELECT payment_id, SUM(amount) AS amount
                        FROM refunds
                        GROUP BY payment_id
                    ) r ON r.payment_id = p.id
                where p.credit_type not in ('loss')
                    and p.status = 1
                    ${ company_id ? `and c.company_id = ${connection.escape(company_id)}` : '' }
                    ${ property_id ? `and p.property_id = ${connection.escape(property_id)}` : '' }
                    ${ contact_id ? `and p.contact_id = ${connection.escape(contact_id)}` : '' }
                group by p.id
                having amount - refund - applied > 0
            )
            select op.*, 
                (op.amount - op.refund - op.applied) as remaining,
                count(cl.id) as active_leases,
                group_concat(cl.lease_id) as active_lease_ids,
                group_concat(
                    CASE 
                        WHEN op.lease_id IS NOT NULL THEN
                            CASE 
                                WHEN op.lease_id = cl.lease_id THEN op.lease_id
                            END
                        ELSE cl.lease_id
                    END
                ) AS affected_lease_ids,
                IFNULL(
                    (
                        SELECT 
                            JSON_ARRAYAGG(
                                JSON_OBJECT(
                                    'date', ipb_agg.date,
                                    'capacity', ABS(ipb_agg.capacity)
                                )
                            )
                        FROM (
                            SELECT
                                ipb.date,
                                (
                                    IFNULL(SUM(case WHEN ipb.refund_id is null THEN ipb.amount END), 0) -
                                    CASE
                                        WHEN ipb.date = op.date THEN (op.amount - IFNULL(SUM(case WHEN ipb.refund_id is not null THEN ipb.amount END), 0))
                                        ELSE 0
                                    END
                                ) AS capacity
                                
                            FROM (
                                select p.id as id, p.id as payment_id, 0 as amount, DATE(p.date) as date, null as refund_id
                                from payments p
                                union all
                                (
                                    select ipb.id as id, ipb.payment_id as payment_id, ipb.amount as amount, ipb.date as date, ipb.refund_id as refund_id
                                    from invoices_payments_breakdown ipb
                                    order by ipb.date, ipb.id
                                )
                            ) ipb
                            WHERE ipb.payment_id = op.payment_id
                            GROUP BY ipb.date
                        ) ipb_agg
                    ),
                    JSON_ARRAY()
                ) as date_wise_capacity
                ${!details ? '' :
                    `,IFNULL(
                        (
                            SELECT 
                                JSON_ARRAYAGG(
                                    JSON_OBJECT(
                                        'date', ipb_agg.date,
                                        'amount', ipb_agg.total_amount,
                                        'refund', ipb_agg.total_refund
                                    )
                                )
                            FROM (
                                SELECT
                                    ipb.payment_id as payment_id, ipb.amount as amount, ipb.date as date, ipb.refund_id as refund_id,
                                    IFNULL(SUM(case WHEN ipb.refund_id is null THEN ipb.amount END), 0) AS total_amount,
                                    IFNULL(SUM(case WHEN ipb.refund_id is not null THEN ipb.amount END), 0) AS total_refund
                                from invoices_payments_breakdown ipb
                                WHERE ipb.payment_id = op.payment_id
                                GROUP BY ipb.date
                            ) ipb_agg
                        ),
                        JSON_ARRAY()
                    ) as date_wise_breakdown,
                    (
                        SELECT 
                            JSON_OBJECT(
                                'id', p.id,
                                'payment_methods_id', p.payment_methods_id,
                                'lease_id', p.lease_id,
                                'contact_id', p.contact_id,
                                'property_id', p.property_id,
                                'amount', p.amount,
                                'amount_tendered', p.amount_tendered,
                                'transaction_id', p.transaction_id,
                                'date', p.date,
                                'ref_name', p.ref_name,
                                'source', p.source,
                                'method', p.method,
                                'sub_method', p.sub_method,
                                'created', p.created,
                                'credit_type', p.credit_type,
                                'status', p.status,
                                'status_desc', p.status_desc,
                                'payment_gateway', p.payment_gateway,
                                'is_migrated', p.is_migrated,
                                'payout_id', p.payout_id,
                                'payment_source', p.payment_source
                            )
                        FROM payments p
                        where p.id = op.payment_id
                    ) as payment_details`
                 }
            from open_payments op
                left join (
                    select cl.*, u.property_id from contact_leases cl
                        inner join leases l on l.id = cl.lease_id
                        inner join units u on u.id = l.unit_id
                        inner join properties p on p.id = u.property_id
                    where l.status = 1
                        and l.start_date < DATE(CONVERT_TZ(now() , "+00:00", p.utc_offset))
                        and (l.end_date > DATE(CONVERT_TZ(now() , "+00:00", p.utc_offset)) or l.end_date is null)
                ) cl on cl.contact_id = op.contact_id and cl.property_id = op.property_id
            group by op.payment_id, op.contact_id, op.property_id
            ${ active_lease || affected_lease ?
                `having ${affected_lease ? `affected_lease_ids is not NULL`: `active_leases > 0`}` : ''
            }
            order by active_leases desc, op.contact_id, op.property_id, op.payment_id
        `

        console.log('Get Open Payments: ' , sql);

        return connection.queryAsync(sql);
    },

    async getRemainingAmount(connection,payment_id){
        let sql = `SELECT 
                        (p.amount 
                            - (SELECT IFNULL(SUM(IFNULL(ip.amount,0)),0) FROM invoices_payments ip WHERE ip.payment_id = p.id)
                            - (SELECT IFNULL(SUM(IFNULL(r.amount,0)),0) FROM refunds r WHERE r.payment_id = p.id)
                        ) as remaining_amount
                    FROM payments p
                    WHERE p.id = ${payment_id}
                    and p.status = 1;`;
        let res = await connection.queryAsync(sql);
        if(res && res.length){
            return res[0].remaining_amount;
        } else {
            return 0;
        }
    },

    getAllBreakdowns: function(connection, payment_id, invoice_id){
        var paymentMethodsSql = `select * from invoices_payments_breakdown where payment_id = ${connection.escape(payment_id)} and invoice_id = ${connection.escape(invoice_id)};`;
        return connection.queryAsync(paymentMethodsSql);
    },

    updateAddressIdOfPaymentMethod(connection, payment_method_id, address_id){
        let sql = `UPDATE payment_methods SET address_id = ${address_id} WHERE id = ${payment_method_id};` ;

        console.log('updateAddressIdOfPaymentMethod - sql' , sql);

        return connection.queryAsync(sql);
    },

    async fetchInvoicePaymentsById(connection, invoicesPaymentsId) {
        const sql = `SELECT * FROM invoices_payments WHERE id = ?`;
        const result = await connection.queryAsync(sql, [invoicesPaymentsId]);
        return result[0];
    },

    async fetchInvoicePaymentInfo(connection, invoicesPaymentsId) {
        const sql = `
            SELECT
                ip.id,
                ip.invoice_id,
                ip.payment_id,
                pr.id AS property_id,
                pr.utc_offset,
                DATE(
                    CONVERT_TZ(
                        UTC_TIMESTAMP(),
                        "+00:00",
                        IFNULL(pr.utc_offset,"+00:00")
                    )
                ) AS curr_date,
                IF(
                    cd.id IS NULL,
                    (SELECT curr_date),
                    DATE_ADD(
                        (SELECT curr_date),
                        INTERVAL 1 DAY
                    )
                ) AS effective_date
            FROM invoices_payments ip
            JOIN payments p ON p.id = ip.payment_id
            JOIN properties pr ON pr.id = p.property_id
            LEFT JOIN closing_days cd ON
                cd.property_id = p.property_id AND
                cd.date = Date(CONVERT_TZ(UTC_TIMESTAMP(), "+00:00", IFNULL(pr.utc_offset, "+00:00"))) AND
                cd.active = 1
            WHERE ip.id = ?
        `;
        const result = await connection.queryAsync(sql, [invoicesPaymentsId]);
        return result[0];
    },

    async fetchInvoicePaymentBreakDownById(connection, invoicePaymentBreakDownId) {
        const sql = `SELECT * FROM invoices_payments_breakdown WHERE id = ?`;
        const result = await connection.queryAsync(sql, [invoicePaymentBreakDownId]);
        return result[0];
    },

    async fetchPaymentSettingsByInvoicePaymentBreakDownId(connection, invoicePaymentBreakDownId) {
        const sql = `
            SELECT
                ipb.id,
                (
                    IFNULL(
                        (SELECT value FROM settings WHERE property_id = p.id AND name = 'paymentOrder'),
                        (SELECT value FROM settings WHERE company_id = p.company_id AND property_id IS NULL AND name = 'paymentOrder'))
                    ) AS payment_order,
                (
                    IFNULL(
                        (SELECT value FROM settings WHERE property_id = p.id AND name = 'productLevelTax'),
                        (SELECT value FROM settings WHERE company_id = p.company_id AND property_id IS NULL AND name = 'productLevelTax'))
                    ) AS product_level_tax
            FROM invoices_payments_breakdown ipb
            JOIN invoices i ON i.id = ipb.invoice_id
            JOIN properties p ON p.id = i.property_id
            WHERE ipb.id = ?
        `;
        const result = await connection.queryAsync(sql, [invoicePaymentBreakDownId]);
        return result[0];

    },

    async updateInvoicesPayments(connection, invoicesPaymentsId, data = { }) {
        const sql = `UPDATE invoices_payments SET ? WHERE id = ?`;
        return await connection.queryAsync(sql, [data, invoicesPaymentsId]);
    },

    async updateTotalPaymentInInvoices(connection, invoiceId) {
        const sql = `
            UPDATE invoices
            SET total_payments = (
                SELECT IFNULL(SUM(IFNULL(ip.amount,0)),0)
                FROM invoices_payments ip
                LEFT JOIN payments p ON ip.payment_id = p.id
                WHERE
                    p.status = 1 AND
                    ip.invoice_id = invoices.id
            )
            WHERE id = ?
        `;
        return await connection.queryAsync(sql, invoiceId);
    },

    async insertIntoInvoicePaymentBreakDown(connection, insertPayload = { }) {
        let sql = `INSERT INTO invoices_payments_breakdown SET ?`
        return await connection.queryAsync(sql, [insertPayload])
    },

    async insertIntoInvoiceLinesAllocation(connection, insertPayload = [], insertFields = []) {
        if (!insertPayload.length) return;
        if (!insertFields.length)
            insertFields = [
                `invoice_id`,
                `invoice_payment_id`,
                `invoice_line_id`,
                `invoice_payment_breakdown_id`,
                `date`,
                `effective_date`,
                `type`,
                `amount`
            ];
        const sql = `INSERT INTO invoice_lines_allocation (${insertFields.join(`,`)}) VALUES ?`;
        return await connection.queryAsync(sql, [insertPayload]);
    },

    async findBulkReversalDeliveries(connection, payload) {
		const { company_id } = payload;
		let { reversal_ids, reversal_types } = payload;
		let sql;
		if(reversal_ids) {
			reversal_ids = reversal_ids.map(id => connection.escape(id)).join(', ');
			sql = `
				select * from reversal_delivery_methods
				where reversal_id in (${reversal_ids})
			`;
		} else {
			reversal_types = reversal_types.map(type => connection.escape(type)).join(', ');
			sql = `
				select rdm.* from reversal_delivery_methods rdm
				join reversals r on rdm.reversal_id = r.id
				where r.type in (${reversal_types})
				and r.company_id = ${connection.escape(company_id)}
			`;
		}
		console.log('findBulkReversalDeliveries sql ', sql);
		return connection.queryAsync(sql);
	},

    async saveRefundDelivery(connection, data) {
        const sql = `INSERT INTO refund_delivery_methods SET ?`;
        return connection.queryAsync(sql, data);
    }

};

module.exports = Payment;