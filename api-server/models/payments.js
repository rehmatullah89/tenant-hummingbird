var settings    = require(__dirname + '/../config/settings.js');

var moment      = require('moment');
var validator = require('validator');
var Setting    = require(__dirname + '/../models/settings.js');
var Lease    = require(__dirname + '/../models/leases.js');
let e  = require(__dirname + '/../modules/error_handler.js');

var Promise = require('bluebird');
var Address = require(__dirname + '/../models/address.js');
var Enums = require(__dirname + '/../modules/enums.js');
var rounding  = require(__dirname + '/../modules/rounding.js');

var Sql = require(__dirname + '/../modules/sql_snippets.js');
/* Authorize.net */

var paymentTransactionFuncs = require(__dirname + '/../modules/authorizenet/PaymentTransactions');
var customerProfileFuncs = require(__dirname + '/../modules/authorizenet/CustomerProfiles');
const clsContext = require('../modules/cls_context');

var createCustomerProfile           = Promise.promisify(customerProfileFuncs.createCustomerProfile);
var createCustomerPaymentProfile    = Promise.promisify(customerProfileFuncs.createCustomerPaymentProfile);
var deleteCustomerPaymentProfile    = Promise.promisify(customerProfileFuncs.deleteCustomerPaymentProfile);
var chargeCustomerProfile           = Promise.promisify(paymentTransactionFuncs.chargeCustomerProfile);

/* Forte */


var forteACHFuncs = require(__dirname + '/../modules/forte');

var product_allocation_priority = [
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

        sql += " FROM payments where 1 = 1 and status = 1 and method not in ('credit', 'loss') " ;
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

        if(conditions.timeframe.start && conditions.timeframe.end){
            sql += " and date BETWEEN " + connection.escape(moment(conditions.timeframe.start).format('YYYY-MM-DD')) + " AND " + connection.escape(moment(conditions.timeframe.end).format('YYYY-MM-DD'));
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

    findPaymentMethodById: function(connection, method_id){
        var paymentMethodsSql = 'Select * from payment_methods where id = ' + connection.escape(method_id);
        return connection.queryAsync(paymentMethodsSql).then(paymentMethodsRes => {
            return paymentMethodsRes.length ? paymentMethodsRes[0]: false;
        });
    },

    findAccountNumber: function(connection, property_id){
        var paymentMethodsSql = 'Select account_number from tenant_payments_applications where property_id = ' + connection.escape(property_id);
        return connection.queryAsync(paymentMethodsSql).then(paymentMethodsRes => {
            return paymentMethodsRes.length ? paymentMethodsRes[0]: false;
        });
    },

    findzipcode: function(connection,payment_id){
        var paymentMethodsSql = 'select zip from payment_methods as pm join addresses as a on pm.address_id = a.id join payments as p on p.payment_methods_id=pm.id where p.id = ' + connection.escape(payment_id);
        return connection.queryAsync(paymentMethodsSql)
    },


    findACHPaymentMethodLastFour: function(connection, lease_id, last_four){
      var paymentMethodsSql = 'Select * from payment_methods where lease_id = ' + connection.escape(lease_id) + ' and active = 1 and  card_end = ' + connection.escape(last_four) + " and type = 'ach'";

    return connection.queryAsync(paymentMethodsSql).then(r => {
      if(r.length > 1) {
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

    saveInterPropertyPayment: function(connection, payload) {
        const { data } = payload;
		const { id } = data;

		let sql;
		if (id) {
			sql = `UPDATE inter_property_payments set ? where id = ${connection.escape(id)}`;
		} else {
			sql = `INSERT into inter_property_payments set ?`;
		}

		return connection.queryAsync(sql, data);
    },

    saveAutoPayment: function(connection, data, auto_payment_id){
      var sql;
      if (auto_payment_id) {
        sql = "UPDATE leases_payment_methods set ? where id = " + connection.escape(auto_payment_id);
      } else {
        sql = "insert into leases_payment_methods set ?";
      }
      
      if(connection.meta && connection.meta.contact_id) {
          data.created_by =  connection.meta.contact_id;   
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
        return connection.queryAsync(sql, data).then(r => payment_method_id ?  payment_method_id : r.insertId);
    },

    resetAutoChargeStatus(connection, lease_id, payment_method_id){

        var data = {
            auto_charge: 0,
            rent: null,
            utilities: null
        }

        var sql = "UPDATE payment_methods set ? where lease_id = " + connection.escape(lease_id);

        if(payment_method_id){
            sql += ' and id != ' + connection.escape(payment_method_id);
        }


        return connection.queryAsync(sql, data);

    },

    save: async (connection, data, payment_id) => {
        var sql;
        if (payment_id) {
            sql = "UPDATE payments set ? where id = " + connection.escape(payment_id);
        } else {
            sql = "insert into payments set ?";
        }


        console.log("Save Payment (Sql+data): ", sql, data);

        let response = await connection.queryAsync(sql, data);

        // if payment_id wasn't included, get it here
        let id = payment_id ? payment_id : response.insertId;
        var sql = "select * from invoices_payments where payment_id = " + connection.escape(id);
        let inv_response = await connection.queryAsync(sql);

        for(let i = 0; i < inv_response.length; i++ ){
            // Use invoice id to update payment total on invoice
            await Payment.updateInvoicePaymentTotal(connection, inv_response[i].invoice_id);
        }

        return response;
    },

    clearAutoCharge: function(connection, lease_id, except_id){

        var sql = "update payment_methods set auto_charge = 0 where lease_id = " + connection.escape(lease_id) + " and id != " + connection.escape(except_id);
        return connection.queryAsync(sql);

    },

    applyPayment: async (connection, data, invoices_payment_id, params = {}) => {
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
        console.log(connection.format(sql, data))
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
       if(diff) return await Payment.updateInvoicePaymentBreakDown(connection, diff, id, params);

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

    updateInvoicePaymentBreakDown: async (connection, amount_diff, invoices_payment_id, params = {}) => {

        let { generate_accounting_exports = true, applied_line } = params;
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
                date: invoice_payment.curr_date,
                effective_date: invoice_payment.effective_date,
                applied_line: applied_line ? JSON.stringify(applied_line): null
            }

            let ipbSql = "insert into invoices_payments_breakdown set ?";
            let response = await connection.queryAsync(ipbSql, data);

            if(response) {
                await Payment.updateInvoiceLineAllocation(connection, response.insertId, params);
                if(generate_accounting_exports){
                    clsContext.push(Enums.EVENTS.PAYMENT_PROCESSED, {
                        invoicesPaymentsBreakdownId: response.insertId,
                        invoiceId: data.invoice_id,
                        paymentId: data.payment_id,
                        propertyId: invoice_payment.property_id
                    });
                }
            }
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

    // TODO this logic handles calculated total applied to invoice lines. Hopefully this will be handled by the accounting application.
    // updateInvoiceLinesPaymentTotal: async (connection, invoice_id) => {
    //
    //   let invoice_payments_total = "SELECT * FROM invoices WHERE id =  " + connection.escape(invoice_id) + " )";
    //   let response = await connection.queryAsync(invoice_payments_total);
    //
    //   let invoice = response[0];
    //   let invoice_balance = Math.round( (invoice.subtotal + invoice.total_tax - invoice.total_discounts - invoice.total_payments) * 1e2 / 1e2 );
    //   // No balance, all invoice_lines have fully been applied
    //   if(invoice_balance === 0 ) {
    //     let invoice_line_update_sql = "UPDATE invoice_lines set applied = (qty * cost) WHERE invoice_id =  " + connection.escape(invoice_id);
    //     return await connection.queryAsync(invoice_line_update_sql);
    //   } else {
    //     let invoice_line_update_sql = "select SUM((cost * qty) + total_tax - total_discounts ) as line_total from invoice_lines WHERE invoice_id =  " + connection.escape(invoice_id);
    //     let applied_payments = "select SUM(amount  from invoice_lines WHERE invoice_id =  " + connection.escape(invoice_id);
    //     return await connection.queryAsync(invoice_line_update_sql);
    //   }
    //
    //   await connection.queryAsync(invoice_payments_total);
    // },


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
      if(diff) return await Payment.updateInvoicePaymentBreakDown(connection, diff, apply_id, params);

    },

    unapplyByPaymentId: async(connection, payment_id) => {
        var sql;

        sql = "select * from invoices_payments where payment_id = " + connection.escape(payment_id);
        let inv_response = await connection.queryAsync(sql);

        if(inv_response && inv_response.length){

            let invoice_ids = [...new Set(inv_response.map(ip => ip.invoice_id))];
            let inv_payment_ids = inv_response.map(ir => ir.id);

            sql = `Delete from invoice_lines_allocation where invoice_payment_id in (${inv_payment_ids.map(i => connection.escape(i)).join(', ')})`;
            console.log("DELETE invoice_lines_allocation", sql)
            await connection.queryAsync(sql);
            
            sql = `Delete from invoices_payments_breakdown where invoice_payment_id in (${inv_payment_ids.map(i => connection.escape(i)).join(', ')})`;
            console.log("DELETE invoices_payments_breakdown", sql)
            await connection.queryAsync(sql);
    
            sql = `Delete from invoices_payments where id in (${inv_payment_ids.map(i => connection.escape(i)).join(', ')})`;
            console.log("DELETE invoices_payments", sql)
            await connection.queryAsync(sql);
    
            for (let i = 0; i < invoice_ids.length; i++) {
                await Payment.updateInvoicePaymentTotal(connection, invoice_ids[i]);
            }
        }
    },

    findPaymentApplications: function(connection, payment_id, params= {}){
        let { unit_info, property_info } = params;
        var sql = "select * from invoices_payments where payment_id = " + connection.escape(payment_id);

        return connection.queryAsync(sql).each(function(appliedPayment){
            var invoiceSql = `
                            SELECT 
                                *
                                ${unit_info ? `,(select JSON_OBJECT('number', number, 'unit_type', type) from units where id = (select unit_id from leases where id = invoices.lease_id)) as unit_info`:''}
                                ${property_info ? `,(select JSON_OBJECT('number', p.number, 'city', (SELECT a.city FROM addresses a where a.id = p.address_id)) from properties p where p.id = invoices.property_id ) as property_info`:''}
                            FROM invoices
                            WHERE status > -1 
                            AND id = ${connection.escape(appliedPayment.invoice_id)};`

            
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

    findPriorPaymentsOnInvoice: function(connection, invoice_id, payment_id){
        var sql = `select * from invoices_payments where invoice_id = ${connection.escape(invoice_id)} 
                    and payment_id=${connection.escape(payment_id)}`
        return connection.queryAsync(sql).then(r => r.length? r[0] : null);
    },

    findPaymentById: function(connection, payment_id){
        let sql = ` SELECT 
                        p.*,
                        if(la.payment_id is null,false,true) as is_auction_payment,
                        if((select group_concat(auction_status) from leases where id in (select lease_id from invoices where id in (select invoice_id from invoices_payments where payment_id = p.id))) is null,0,1) as is_auctioned_lease_payment
                    FROM payments p
                    LEFT JOIN lease_auctions la on p.id = la.payment_id
                    WHERE p.id = ${connection.escape(payment_id)}`;
        return connection.queryAsync(sql).then(r => r.length? r[0] : null);
    },

    findCompanyFromPaymentId: function(connection, payment_id){
        var sql = "Select company_id from properties where id = (select property_id from units where id = (select unit_id from leases where id = (select lease_id from payments where id = " + connection.escape(payment_id) + ')))';
        return connection.queryAsync(sql).then(r => r.length? r[0] : null);
    },

    findPropertyFromPaymentId: function(connection, payment_id){
        var sql = "Select * from properties where id = (select property_id from payments where id = " + connection.escape(payment_id) + ')';
        return connection.queryAsync(sql).then(r => r.length? r[0] : null);
    },

    findPaymentByTransactionId: function(connection, payment_id){

        var sql = "Select * from payments where transaction_id = " + connection.escape(payment_id);

        return connection.queryAsync(sql).then(function(paymentRes){
            if(!paymentRes.length) return false;
            return paymentRes[0];
        });

    },

    findPaymentByPropertyIdAndAuthCode: function(connection, property_id, auth_code){
        var sql = "Select * from payments where property_id = " + connection.escape(property_id) + " and auth_code = " + connection.escape(auth_code);
        console.log(property_id, " findPaymentByPropertyIdAndAuthCode : ", sql);
        return connection.queryAsync(sql).then(r => r.length? r[0] : null);
    },

    findPaymentByPropertyIdAndTransactionId: function(connection, property_id, transaction_id){
        var sql = `SELECT * FROM payments where property_id = ${connection.escape(property_id)} 
                        AND transaction_id = ${connection.escape(transaction_id)}`;
        console.log(property_id, " findPaymentByPropertyIdAndTransactionId : ", sql);                        
        return connection.queryAsync(sql).then(r => r.length? r[0] : null);
    },

    findPaymentsByInvoiceId: function(connection, invoice_id){
        var sql = `Select ip.* from invoices_payments ip 
                    left join payments p on ip.payment_id = p.id 
                    where p.status = 1 and ip.invoice_id = ${connection.escape(invoice_id)}  and ip.amount > 0`;

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

    findPaymentOpenPaymentsByLeaseId: function(connection, lease_id){

        var sql = "Select *," +
          " ((select IFNULL(sum(amount),0) from invoices_payments where payment_id = payments.id) + (select IFNULL(sum(amount),0) from refunds where refunds.payment_id = payments.id)) as amount_used " +
          " from payments where status = 1 and credit_type in ('payment', 'credit') and contact_id in (select contact_id from contact_leases where lease_id = " + connection.escape(lease_id) + ") and " +
          " ((select IFNULL(sum(amount),0) from invoices_payments where payment_id = payments.id) + (select IFNULL(sum(amount),0) from refunds where refunds.payment_id = payments.id)) " +
          " < payments.amount order by payments.date desc ";

        console.log("findPaymentOpenPaymentsByLeaseId - sql", sql);

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

      console.log("findOpenPaymentsByContactId", sql);
      return connection.queryAsync(sql);
    },

    findOpenCreditsByLeaseId: function(connection, lease_id){
  
        var sql = `select * from 
                        ( select p.*,
                            ((select IFNULL(sum(amount),0) from invoices_payments where payment_id = p.id) + (select IFNULL(sum(r.amount),0) from refunds r where r.payment_id = p.id and type ='credit') ) as amount_used
                            from payments p
                            where p.lease_id = ${connection.escape(lease_id)} and credit_type = 'credit'
                        ) cr
                    where cr.status = 1 and cr.amount_used < cr.amount`;
  
  
        sql += " order by cr.created asc ";
  
        console.log("findOpenCreditsByLeaseId", sql);
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
        console.log(sql);
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

    deletePayment:function(connection, payment_id, status_desc){
        status_desc = status_desc  || "Deleted";

        var sql = "update payments set status = 0, status_desc = " + connection.escape(status_desc)  + " where id = " + connection.escape(payment_id);

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

        return connection.queryAsync(sql).then(r => {
            return r;
        })
    },

    async saveRefund(connection, data, refund_id, invoice_payment_breakdown_ids = []){
        var sql;
        if (refund_id) {
            sql = "UPDATE refunds set ? where id = " + connection.escape(refund_id);
        } else {
            sql = "insert into refunds set ?";
        }
        let response = await connection.queryAsync(sql, data);
        refund_id  = refund_id || response.insertId; 
        await Payment.updateRefundIdInvoicePaymentBreakDown(connection, refund_id, invoice_payment_breakdown_ids);
        if(!data.refund_to){
            await Payment.updateRefundContactId(connection, refund_id);
        }
        return response;
    },

    async saveChargeback(connection,data){
        var sql = "INSERT INTO refunds set ?";
        console.log(" saveChargeback : ", sql);
        let response = await connection.queryAsync(sql,data);
        return response;
    },
    async getRefundByDetails(connection, data){
        let sql = `SELECT * FROM refunds WHERE payment_id = ${data.payment_id} and amount = "${data.amount}" and type = "${data.type}" and reason = "${data.reason}"`;
        console.log(sql);
        return await connection.queryAsync(sql, data);
    },
    updateRefundContactId(connection, refund_id){
        let sql = `update refunds r
                    inner join payments p on r.payment_id = p.id
                    set refund_to= p.contact_id
                    where r.id=${refund_id};`
        return connection.queryAsync(sql);
    },

    updateRefundIdInvoicePaymentBreakDown(connection, refund_id, invoice_payment_breakdown_ids){
        if(refund_id && invoice_payment_breakdown_ids && invoice_payment_breakdown_ids.length) {
            let updatePaymentBreakDownSql = `update invoices_payments_breakdown 
                                                set refund_id = ${refund_id}
                                                where id in (${invoice_payment_breakdown_ids.map(i => connection.escape(i)).join(', ')})`
            
            return connection.queryAsync(updatePaymentBreakDownSql);
        }
    },

    findRefunds(connection, payment_id){
        var sql = "SELECT r.*, u.src as upload_src from refunds r left join uploads u on u.id = r.upload_id where r.payment_id = " + connection.escape(payment_id);
        return connection.queryAsync(sql);
    },

    getRefundById(connection, payment_id, refund_id){
      var sql = "SELECT * from refunds where id = " + connection.escape(refund_id) + " and payment_id = " + connection.escape(payment_id);
      return connection.queryAsync(sql).then(r => r.length? r[0] : null);
    },

    getRefund(connection, refund_id) {
      var sql = `SELECT * from refunds where id =  ${connection.escape(refund_id)}`;
      return connection.queryAsync(sql).then(r => r.length? r[0] : null);
    },

    findByTransactionId(connection, transaction_id){

        var sql = "Select * from payments where transaction_id = " + connection.escape(transaction_id);
        return connection.queryAsync(sql).then(r => r.length? r[0] : null);
    },

    deleteRefund(connection,refund_id) {
        var sql = "DELETE from refunds where id = " + connection.escape(refund_id);
        return connection.queryAsync(sql);
    },

    findRefundByTransactionId(connection,transaction_id) {
        var sql = "Select * from refunds where transaction_id = " + connection.escape(transaction_id);
        return connection.queryAsync(sql).then(r => r.length? r[0] : null);
    },

    getGLItems(connection, conditions, company_id){

        let sql = "Select *, " +
            "(select property_id from units where id in (select unit_id from leases where id = payments.lease_id)) as property_id  from payments where date >= " + connection.escape(conditions.timeframe.start.format('YYYY-MM-DD')) + " and date <= " +  connection.escape(conditions.timeframe.end.format('YYYY-MM-DD'));

        return connection.queryAsync(sql);


    },
    removeAutopayment(connection, payment_method_id){
        let sql = `update leases_payment_methods lpm 
            set deleted = NOW()
        where lpm.payment_method_id = ${connection.escape(payment_method_id)} and deleted is null;`;
        return connection.queryAsync(sql);
    },

    findAccountBalanceWhenPaymentLastApplied: async(connection, payment_id, contact_id, property_id) => {

        if(!contact_id || !property_id){
            let paymentSql = `select * from payments where id = ${connection.escape(payment_id)}`;
            var payment_response = await connection.queryAsync(paymentSql);

            if(payment_response && payment_response.length){
                contact_id = payment_response[0].contact_id;
                property_id = payment_response[0].property_id;
            }
        }

        let paymentDateSql = `select max(created) as payment_date from invoices_payments_breakdown where payment_id = ${connection.escape(payment_id)};`;
        let payment_date_response = await connection.queryAsync(paymentDateSql);
        let payment_date = payment_date_response && payment_date_response.length ? payment_date_response[0].payment_date: moment().format('YYYY-MM-DD');

        let sql = `select   (select SUM(subtotal + total_tax - total_discounts) from invoices
                                where contact_id = ${connection.escape(contact_id)} and property_id = ${connection.escape(property_id)} 
                                and created_at <= ${connection.escape(payment_date)}
                                and due <= DATE(${connection.escape(payment_date)})
                                and status = 1) -
                            (select SUM(amount) from invoices_payments_breakdown 
                                where payment_id in (select id from payments where contact_id = ${connection.escape(contact_id)} and property_id = ${connection.escape(property_id)} ) 
                                and invoice_id in (select id from invoices
                                    where contact_id = ${connection.escape(contact_id)} and property_id = ${connection.escape(property_id)} 
                                    and created_at <= ${connection.escape(payment_date)}
                                    and due <= DATE(${connection.escape(payment_date)})
                                    and status = 1
                                ) 
                            ) as account_balance;`

        console.log("Account Balance SQL", sql);
        return connection.queryAsync(sql).then(invoiceRes => { return invoiceRes.length ? invoiceRes[0].account_balance : 0 })
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

    getInvoiceLinesFromPayment(connection, payment_id){
        let sql = `select *, il.id lines_id, ila.amount line_amount from invoice_lines_allocation ila
        inner join invoice_lines il on ila.invoice_line_id = il.id
        inner join products p on p.id = il.product_id
        inner join invoices_payments ip on ila.invoice_payment_id = ip.id
        where ip.payment_id = ${connection.escape(payment_id)};`;
        return connection.queryAsync(sql);
    },

    getInvoicePaymentBreakdowns(connection, params){
        let { ids = [], payment_id } = params;
        if(ids.length === 0 && !payment_id)
            return [];

        let sql = `SELECT * FROM invoices_payments_breakdown where 1 = 1`;

        if(ids.length){
            sql += ` and id in (${ids.map(id => connection.escape(id)).join(', ')})`;
        } else if (payment_id) {
            sql += ` and payment_id = ${connection.escape(payment_id)}`;
        }
        console.log("getInvoicePaymentBreakdowns - sql", sql);
        return connection.queryAsync(sql);
    },

    getPaymentOfBreakdown(connection, breakdown_id){
        let sql = `select * from payments where id in (SELECT payment_id FROM invoices_payments_breakdown where id = ${connection.escape(breakdown_id)})`;
        return connection.queryAsync(sql).then(r => r.length? r[0] : null);
    },

    getLeaseIdFromPaymentsBreakdown(connection, invoice_payment_breakdown_ids = []) {
        let sql = `SELECT DISTINCT lease_id AS lease_id FROM invoices i 
                    INNER JOIN invoices_payments_breakdown ipb ON ipb.invoice_id = i.id
                    AND ipb.id IN (${invoice_payment_breakdown_ids.map(i => connection.escape(i)).join(', ')})`
        
        return connection.queryAsync(sql);//.then(data => data?.length ? data[0] : null);
    },

    async getPaymentReversalSetting(connection, payload) {
        const { payment_id } = payload;
        let PaymentRevSettingsSql = `
            select p.id, 
                IFNULL(
                        (select value from settings where property_id = prop.id and name = 'reversalThreshold'), 
                        (select value from settings where company_id = prop.company_id and property_id is null and name = 'reversalThreshold')
                ) as payment_reversal_days
            from payments p
            inner join properties prop on prop.id = p.property_id
            where p.id = ${connection.escape(payment_id)}`;
        console.log("PaymentRevSettingsSql:",PaymentRevSettingsSql);
        return connection.queryAsync(PaymentRevSettingsSql).then(res => res.length ? res[0] : null );   
    },

    clearPreviousAllocations( connection, invoice_id, breakdownIds, refundIds){
        let sql = `
            delete from invoice_lines_allocation
            where id > 0 and invoice_payment_breakdown_id in (${breakdownIds});

            delete from gl_exports where id > 0 and id in (

                select * from (
                    select id from gl_exports
                    where object_id in (${breakdownIds}) and 
                    ((select gl_event_id from gl_event_company where id = gl_event_company_id) in (${Enums.ACCOUNTING.EVENTS.POSTING_PAYMENT}, ${Enums.ACCOUNTING.EVENTS.WRITE_OFF}, ${Enums.ACCOUNTING.EVENTS.PAYMENT_WITH_CREDITS}, ${Enums.ACCOUNTING.EVENTS.POSTING_EXCESS_PAYMENT}))
                  union all
                    select id from gl_exports
                    where object_id in (${invoice_id}) and 
                    ((select gl_event_id from gl_event_company where id = gl_event_company_id) in (${Enums.ACCOUNTING.EVENTS.REVENUE_RECOGNITION}))
                  union all
                    select id from gl_exports
                    where object_id in (${refundIds}) and 
                    ((select gl_event_id from gl_event_company where id = gl_event_company_id) in (${Enums.ACCOUNTING.EVENTS.REFUNDS}))
                ) as g_exports

            )`;

        console.log('Cleared Allocations ' , sql);

        return connection.queryAsync(sql);
    },

    updateAddressIdOfPaymentMethod(connection, payment_method_id, address_id){
        let sql = `UPDATE payment_methods SET address_id = ${address_id} WHERE id = ${payment_method_id};` ;

        console.log('updateAddressIdOfPaymentMethod - sql' , sql);

        return connection.queryAsync(sql);
    },

    getCleaningDepositInvoiceLineAllocation(connection, payment_application_id){
        let sql = `SELECT 
                        ila.* 
                    FROM invoice_lines_allocation ila
                    INNER JOIN invoice_lines il on il.id = ila.invoice_line_id
                    INNER JOIN products pr on pr.id = il.product_id
                    WHERE ila.invoice_payment_id = ${connection.escape(payment_application_id)} 
                    AND pr.default_type = 'cleaning';`;
        return connection.queryAsync(sql);
    },

    getLastPaymentByLease(connection, lease_id) {
        if (!lease_id) e.th(400, "lease_id is required")
        let sql = `
            SELECT
                p.*
            FROM
                payments p
                INNER JOIN invoices i ON i.lease_id = ${connection.escape(lease_id)}
                INNER JOIN invoices_payments ip ON ip.invoice_id = i.id
            WHERE
                p.id = ip.payment_id
                AND i.voided_at IS NULL
                AND p.status = 1
            ORDER BY
                id desc
            LIMIT 1;
        `
        return connection.queryAsync(sql).then(res => res.length ? res[0] : null)
    },
    
    findPaymentInterPropertyAdjustmentById: function(connection, payment_id, is_adjustment_payment){
        let sql = ` SELECT
                        * 
                    FROM inter_property_payments 
                    WHERE source_payment_id = `;
        if(is_adjustment_payment) {
            sql += `(SELECT source_payment_id FROM inter_property_payments WHERE payment_id = ${connection.escape(payment_id)})`
        } else {
            sql += `${connection.escape(payment_id)}`
        }
        return connection.queryAsync(sql);
    },

    getPaymentAppliedOnMultipleLease(connection, contact_id, lease_id) {
        if (!contact_id) e.th(400, "contact_id is required")
        let sql = `
            SELECT
                p.id as payment_id,
                COUNT(DISTINCT i.lease_id) as lease_count 
            FROM
                payments p
            INNER JOIN invoices_payments_breakdown ipb 
                ON
                ipb.payment_id = p.id
            INNER JOIN invoices i 
                ON
                i.id = ipb.invoice_id
            WHERE
                i.contact_id = ${connection.escape(contact_id)}
        `
        if (lease_id){
            sql += `
                AND p.id IN (
                    SELECT
                        p2.id
                    FROM
                        payments p2
                    INNER JOIN invoices_payments_breakdown ipb2 on
                        ipb2.payment_id = p2.id
                    INNER JOIN invoices i2 ON
                        i2.id = ipb2.invoice_id
                    WHERE
                        i2.lease_id IN (${connection.escape(lease_id)})
                )
            `
        }

        sql += `
            GROUP BY
                p.id
            HAVING lease_count > 1
            ORDER BY COUNT(DISTINCT i.lease_id) DESC
            LIMIT 1;
        `
        console.log("getPaymentAppliedOnMultipleLease :", sql)
        return connection.queryAsync(sql)//.then(res => res.length ? res[0] : null)
    },

    async getAllPaymentMethods(connection, contact_id){
        var sql = "Select * from payment_methods where contact_id = " +  connection.escape(contact_id);
        console.log("getAllPaymentMethods SQL:", sql);
        return connection.queryAsync( sql )
    },

    async duplicatePaymentMethod(connection, payload){
        let columns_to_copy_sql = Sql.getColumnNames('payment_methods', ['contact_id', 'address_id']);
        let columns_to_copy = await connection.queryAsync(columns_to_copy_sql);
        columns_to_copy = columns_to_copy.map(i => i.COLUMN_NAME).join(', ');
        console.log("duplicatePaymentMethod columns_to_copy :", columns_to_copy);

        let sql = `
            INSERT INTO payment_methods (${columns_to_copy}, contact_id, address_id)
            SELECT ${columns_to_copy}, ${connection.escape(payload.new_contact_id)}, ${connection.escape(payload.new_address_id)}
            FROM payment_methods
            WHERE id = ${connection.escape(payload.payment_method_id)}
        `

        console.log("duplicatePaymentMethod SQL:", sql)
        return await connection.queryAsync(sql).then(r => r.insertId);
    },

    async updatePaymentsContactId(connection, payload){
        let sql = `
            UPDATE 
            payments AS p
            INNER JOIN invoices_payments_breakdown AS ipb
                ON ipb.payment_id = p.id
            INNER JOIN invoices as inv
                ON ipb.invoice_id = inv.id 
            SET p.contact_id = ${connection.escape(payload.new_contact_id)},
                p.payment_methods_id = ${payload.new_payment_methods_id && payload.payment_method_id ? connection.escape(payload.new_payment_methods_id) : 'NULL'}
            WHERE p.contact_id = ${connection.escape(payload.contact_id)}
                AND inv.lease_id = ${connection.escape(payload.lease_id)}
        `;

        if(payload.new_payment_methods_id && payload.payment_method_id){
            sql+= ` AND p.payment_methods_id = ${connection.escape(payload.payment_method_id)}`
        } else {
            sql += `AND p.payment_methods_id IS NULL`
        }

        console.log("updatePaymentsContactId SQL:", sql)
        return await connection.queryAsync(sql);
    },

    updateLeasePaymentMethod: function(connection, payload){
        var sql =`
            UPDATE leases_payment_methods 
            SET payment_method_id = ${connection.escape(payload.new_payment_methods_id)}
            WHERE payment_method_id = ${connection.escape(payload.payment_method_id)}
                AND lease_id = ${connection.escape(payload.lease_id)};`
       
        console.log("updateLeasePaymentMethod SQL:", sql)
        return connection.queryAsync(sql);
      },
    getByIds(connection, ids) {
        if (!Array.isArray(ids) || !ids.length) return [];
        const query = `SELECT * FROM payments WHERE id IN (${connection.escape(ids)})`;
        return connection.queryAsync(query);
      },
    
      getPaymentMethodsByIds(connection, paymentMethodIds) {
        if (!Array.isArray(paymentMethodIds) || !paymentMethodIds.length) return [];
        const query = `SELECT * FROM payment_methods WHERE id IN (${connection.escape(paymentMethodIds)})`;
        return connection.queryAsync(query);
    },

    getPaymentsByInvoiceIds(connection, invoiceIds) {
        if (!Array.isArray(invoiceIds) || !invoiceIds.length) return [];
        const query = `SELECT 
                            ip.*
                        FROM 
                            invoices_payments ip
                        WHERE 
                            ip.invoice_id IN (${connection.escape(invoiceIds)})
                            AND ip.amount > 0
                            AND (SELECT status FROM payments WHERE id = ip.payment_id) = 1
                        `
        return connection.queryAsync(query);
    },

    getLastAutopayActivity (connection, lease_id) {        
        const sql = `
            SELECT 
                lpm.*,
                IF(lpm.created_at IS NOT NULL, CONVERT_TZ(lpm.created_at, "+00:00", IFNULL(p.utc_offset, "+00:00")), NULL) AS created_at,
                IF(lpm.deleted IS NOT NULL, CONVERT_TZ(lpm.deleted, "+00:00", IFNULL(p.utc_offset, "+00:00")), NULL) AS deleted
            FROM leases_payment_methods lpm
                INNER JOIN payment_methods pm ON pm.id = lpm.payment_method_id
                INNER JOIN properties p ON p.id = pm.property_id
            WHERE lpm.lease_id = ${connection.escape(lease_id)}
            ORDER BY lpm.id DESC
            LIMIT 1
        `;
        return connection.queryAsync(sql).then(r => r.length? r[0] : null);
    },

};

module.exports = Payment;
