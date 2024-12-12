var Promise         = require('bluebird');
var moment          = require('moment');

var models = {};

module.exports = {

    findAllActive(connection, property_id, company_id, min_hour = null, max_hour = null, created_at = null){
        var sql = "Select * from properties where 1 = 1 ";
        if(property_id){
            sql += " and id = " + connection.escape(property_id);
        }
        if(company_id){
            sql += " and company_id = " + connection.escape(company_id);
        }

        if(min_hour !== null && max_hour !== null){
            sql += ` and (SELECT HOUR(CONVERT_TZ(${created_at ? "'" + created_at + "'" : "UTC_TIMESTAMP()"}, "+00:00", properties.utc_offset))) >= ${connection.escape(min_hour)} and (SELECT HOUR(CONVERT_TZ(${created_at ? "'" + created_at + "'" : "UTC_TIMESTAMP()"} , "+00:00", properties.utc_offset))) < ${connection.escape(max_hour)}`;
        }

        sql += " order by id asc ";
        console.log("sql", sql);
        return connection.queryAsync(sql);
    },

    listByCompanyId(connection, company_id){
        var sql = "Select id, " +
            " (Select address from addresses where id = properties.address_id ) as address, " +
            " (Select city from addresses where id = properties.address_id ) as city, " +
            " (Select state from addresses where id = properties.address_id ) as state, " +
            " (Select zip from addresses where id = properties.address_id ) as zip " +
            " from properties where company_id = " + company_id;

        return connection.queryAsync(sql);

    },
    
    searchByAddress: function(connection, search, company_id, contain){

        // Todo - Make pagination
        var _this = this;
        var sql = "Select * from properties where company_id = " + company_id;

        if(search.length){
            sql += ' and address_id in (select id from addresses where ( select concat(LOWER(address), " ",  LOWER(city), " ", LOWER(state), " ", LOWER(zip) )  like ' + connection.escape('%' + search + '%') + ' )) ';
        }


        return connection.queryAsync(sql);

    },

    getUnitCount: function(connection, property_id){
        var sql = "select count(id) as count from units  where property_id = " + connection.escape(property_id);
        return connection.queryAsync(sql);
    },

    getLeaseCount: function(connection, property_id){
        var sql = "select count(id) as count from leases as lease_count where unit_id in (select id from units where units.property_id = " + connection.escape(property_id) + ") and start_date <= '" + moment().format('YYYY-MM-DD') +"' and ( end_date >= '" + moment().format('YYYY-MM-DD') + "' or end_date is null ) and status = 1 ";
        return connection.queryAsync(sql);
    },

    findAutoPaymentMethods: function(connection, property_id, date){
        var sql = `
                select 
                    DISTINCT(payment_method_id) as payment_method_id, 
                    (select 
                        contact_id 
                        from payment_methods 
                        where id = leases_payment_methods.payment_method_id
                    ) as contact_id 
				from leases_payment_methods 
                where deleted is null 
                and lease_id in (
                                    select 
                                        id 
                                    from leases
                                    where unit_id in (select id from units where units.property_id =  ${connection.escape(property_id)}) 
                                    and start_date <=  ${connection.escape(date)} 
                                    and ( end_date >=  ${connection.escape(date)} or end_date is null ) 
                                    and status = 1
                                );`;
        console.log("sql", sql);
        return connection.queryAsync(sql);
    },

    findAutoPaymentMethodsWithInvoices: function(connection, property_id, date){
        /* explanation of cases in autopay query :
        CASE 1 :  WHEN l.bill_day > DAY(LAST_DAY(${connection.escape(date)}))
        -> means lease bill day is not present in the month
        in which we are trying to run the autopayment, in this case we should use treat the LAST DAY of month as bill day of lease
        and perform calculations. In this case, there is one more case:
        CASE 1a: l.bill_day > DAY(${connection.escape(date)}) AND DAY(${connection.escape(date)}) < DAY(LAST_DAY(${connection.escape(date)}))
        -> means that the autopayment date for the last month of a lease comprises of days in next month as well so we should be formulating
        the start date from last month rather than current month.

        Case 2: when the bill day is present in current month (the date when we are running the autopayment)
        -> In this case we should be simply calculating the start date by adding the value of setting auto_pay_after_billing_date
        to current month's bill date.
        Case 2a: WHEN l.bill_day > DAY(${connection.escape(date)})
        -> it means that even though bill day exists in current month/ period but the autopay has started from last month
        like it is the autopayment range from last month which contains days in next month, so we calculate the start date
        from last month.
         */

        var sql = `
        WITH payment_method_leases as (
            SELECT 
                lpm.payment_method_id as payment_method_id,
                pm.contact_id as contact_id,
                l.id as lease_id,
                l.bill_day, 
                l.auto_pay_after_billing_date,
                (select payment_cycle from leases_payment_cycles where lease_id = l.id and deleted_at is null and start_date <= ${connection.escape(date)} and end_date > ${connection.escape(date)} order by id desc limit 1) as payment_cycle,
                (select end_date from leases_payment_cycles where lease_id = l.id and deleted_at is null and start_date <= ${connection.escape(date)} and end_date > ${connection.escape(date)} order by id desc limit 1) as payment_cycle_end_date,
                u.type as unit_type, 
                u.property_id as property_id, 
                l.start_date as lease_start_date,
                l.end_date as lease_end_date,
                p.company_id as company_id,
                lt.id as lease_template_id,
                lt.auto_pay_max_times,
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
                END as start_date
            FROM leases_payment_methods lpm
                INNER JOIN payment_methods pm on pm.id = lpm.payment_method_id
                INNER JOIN leases l on l.id = lpm.lease_id
                INNER JOIN units u on u.id = l.unit_id
                INNER JOIN properties p on p.id = u.property_id
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
            WHERE lpm.deleted is null
                AND u.property_id = ${connection.escape(property_id)}
                AND l.start_date <= ${connection.escape(date)} 
                AND (l.end_date >= ${connection.escape(date)} or l.end_date is null) 
                AND l.status = 1
        )
        
        SELECT 
            pml.payment_method_id,
            pml.contact_id,
            JSON_ARRAYAGG(JSON_OBJECT('id', inv.id ,'lease_id', pml.lease_id)) as invoice_ids,
            pml.lease_id,
            pml.start_date,
            DATE_ADD(
                pml.start_date, INTERVAL (pml.auto_pay_max_times - 1) DAY
            )  as end_date, 
            IFNULL(ltpc.period,0)
            
        FROM payment_method_leases pml
            INNER JOIN invoices inv on inv.lease_id = pml.lease_id
             LEFT JOIN lease_template_payment_cycles ltpc on  ltpc.label = pml.payment_cycle and  ltpc.template_id = pml.lease_template_id and ltpc.deleted_at is null

        WHERE inv.status = 1
        AND inv.due <= IFNULL(pml.payment_cycle_end_date, ${connection.escape(date)})
        AND ((inv.subtotal + inv.total_tax - inv.total_discounts - inv.total_payments) > 0)
        AND ${connection.escape(date)} BETWEEN start_date AND DATE_ADD(
            pml.start_date, INTERVAL (pml.auto_pay_max_times - 1) DAY
        )
        GROUP BY pml.payment_method_id;`

        console.log("findAutoPaymentMethodsWithInvoices sql=>", sql);
        return connection.queryAsync(sql);
    },

    findAutoPaymentMethodsWithInvoicesReports: function(connection, params){
        let { property_ids, date } = params;
        var sql = `
        WITH payment_method_leases as (
            SELECT 
                lpm.payment_method_id as payment_method_id,
                pm.contact_id as contact_id,
                l.id as lease_id,
                l.bill_day, 
                l.auto_pay_after_billing_date,
                (select payment_cycle from leases_payment_cycles where lease_id = l.id and deleted_at is null and start_date <= ${connection.escape(date)} and end_date > ${connection.escape(date)} order by id desc limit 1) as payment_cycle,
                (select end_date from leases_payment_cycles where lease_id = l.id and deleted_at is null and start_date <= ${connection.escape(date)} and end_date > ${connection.escape(date)} order by id desc limit 1) as payment_cycle_end_date,
                u.type as unit_type, 
                u.property_id as property_id,
                p.name as property_name,
                u.number as unit_number,
                l.start_date as lease_start_date,
                l.end_date as lease_end_date,
                p.company_id as company_id,
                lt.id as lease_template_id,
                lt.auto_pay_max_times,
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
                END as start_date
            FROM leases_payment_methods lpm
                INNER JOIN payment_methods pm on pm.id = lpm.payment_method_id
                INNER JOIN leases l on l.id = lpm.lease_id
                INNER JOIN units u on u.id = l.unit_id
                INNER JOIN properties p on p.id = u.property_id
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
            WHERE lpm.deleted is null
                ${property_ids && property_ids.length ? `AND u.property_id in (${property_ids.map(id => connection.escape(id)).join(',')})` : ''}
                AND l.start_date <= ${connection.escape(date)} 
                AND (l.end_date >= ${connection.escape(date)} or l.end_date is null) 
                AND l.status = 1
        )
        
        SELECT 
            pml.payment_method_id,
            pml.contact_id,
            pml.property_id,
            pml.lease_id,
            pml.start_date,
            DATE_ADD(
                pml.start_date, INTERVAL (pml.auto_pay_max_times - 1) DAY
            )  as end_date, 
            IFNULL(ltpc.period,0) as cycle_period,
            pml.unit_number,
            pml.property_name,
            com.name as company_name,
            com.id as company_id,
            inv.id as invoice_id,
            inv.number as inv_number,
            inv.due as inv_due,
            concat(c.first, ' ', c.last) as contact_name,
            concat("https://",com.subdomain,".tenantinc.com/") as company_url,
            group_concat(p.id) as payment_ids,
            group_concat(p.status_desc) as payments_status_desc
            
        FROM payment_method_leases pml
            INNER JOIN invoices inv on inv.lease_id = pml.lease_id
            LEFT JOIN lease_template_payment_cycles ltpc on  ltpc.label = pml.payment_cycle and  template_id = pml.lease_template_id and ltpc.deleted_at is null
            inner join companies com on com.id = pml.company_id
            inner join contacts c on c.id = pml.contact_id
            left join invoices_payments ip on ip.invoice_id = inv.id and ip.date = ${connection.escape(date)}
            left join payments p on p.id = ip.payment_id
        
        WHERE inv.status = 1
            AND inv.due <= IFNULL(pml.payment_cycle_end_date, ${connection.escape(date)})
            AND ((inv.subtotal + inv.total_tax - inv.total_discounts - inv.total_payments) > 0)
            AND ${connection.escape(date)} BETWEEN start_date AND DATE_ADD(
                pml.start_date, INTERVAL (pml.auto_pay_max_times - 1) DAY
            )
        group by inv.id;`;

            console.log("findAutoPaymentMethodsWithInvoicesReports sql=>", sql);
        return connection.queryAsync(sql);
    },

    searchByCoords:function(connection, lat, lng, company_id){
        var _this = this;
        var sql = 'SELECT id, ' +
            '( select id from properties where address_id = addresses.id) as property_id, ' +
            '( select description from properties where address_id = addresses.id) as description, ' +
            '( select company_id from properties where address_id = addresses.id) as company_id, ' +
            '( select name from properties where address_id = addresses.id) as name, ' +
            '( select phone from properties where address_id = addresses.id) as phone, ' +
            '( select email from properties where address_id = addresses.id) as email, ' +
            '( 3959 * acos( cos( radians('+connection.escape(lat) +') ) * cos( radians( lat ) ) * cos( radians( lng ) - radians('+connection.escape(lng) +') ) + sin( radians('+connection.escape(lat) +') ) * sin( radians( lat ) ) ) ) AS distance ' +
            'FROM addresses where ( select company_id from properties where address_id = addresses.id ) = ' + connection.escape(company_id) +
            ' HAVING distance < 100 ' +
            'ORDER BY distance ' +
            'LIMIT 0 , 20';

        var properties = {};


        return connection.queryAsync( sql ).then(function(addresses){

            return Promise.map(addresses, function(address){
                var distance = address.distance;
                var property = {
                    id: address.property_id,
                    address_id: address.id,
                    company_id: address.company_id,
                    name: address.name,
                    description: address.description,
                    phone: address.phone,
                    email: address.email
                };
                return {
                    distance: distance,
                    property: property
                };
                /*
                return _this.getContainFields(connection, property).then(function(property){
                    return {
                        distance: distance,
                        property: property
                    }
                });
                */

            });



        })
    },
    findByGdsIds: function(connection, propertyGdsIds) {
        if (!propertyGdsIds?.length) return [];
        const sql = `select * from properties where gds_id in ( ${propertyGdsIds.map(gds_id => connection.escape(gds_id)).join(',')} )`;
        return connection.queryAsync(sql);
    },
    findByGdsID: function (connection, gds_id) {
        var sql = "SELECT * FROM properties where gds_id =" + connection.escape(gds_id);
        return connection.queryAsync(sql).then(c => c.length ? c[0] : null);;
    },	
    findById: function(connection, id, company_id, contain){
        var _this = this;
        var propertySql =  "Select * from properties where id = " + connection.escape(id);

        if(company_id){
            propertySql +=  ' and company_id = ' + connection.escape(company_id)
        }
        return connection.queryAsync( propertySql ).then(function(propertyRes){
            return propertyRes.length? propertyRes[0]: null;

            /*
            if(!propertyRes.length) return false;
            return _this.getContainFields(connection, propertyRes[0], contain);
            */
        })

    },
    //MVP TI - 12317 POC START
    checkIfPropertyUsesTenantPayment: function (connection, id, company_id, contain) {
        var _this = this;
        var connectionsSQL = "SELECT property_id FROM connections where name = 'tenant_payments'"
        var propertySql = "Select * from properties where id = " + connection.escape(id) + "and id in (" + connectionsSQL +")" ;

        if (company_id) {
            propertySql += ' and company_id = ' + connection.escape(company_id)
        }

        return connection.queryAsync(propertySql).then(function (propertyRes) {
            
            return propertyRes.length ? propertyRes[0] : null;

            /*
            if(!propertyRes.length) return false;
            return _this.getContainFields(connection, propertyRes[0], contain);
            */
        })

    },

    //MVP TI - 12317 POC END

    findPhones: function(connection, property_id){
        var propertySql =  "Select * from property_phones where property_id = " + connection.escape(property_id) + ' and status = 1 order by sort asc ';
        return connection.queryAsync( propertySql )
    },

    savePhone: function(connection, data, phone_id){
        var sql;

        if(phone_id){
            sql = "UPDATE property_phones set ? where id = " + connection.escape(phone_id);
        } else {
            sql = "INSERT into property_phones set ?";
        }


        return connection.queryAsync(sql, data).then(r => phone_id ? phone_id : r.insertId);
    },

    removePhones: function(connection, property_id, phone_string){
        return Promise.resolve().then(() => {
            if(!phone_string || !phone_string.length) phone_string = 0;
            var phonesSql = "delete from property_phones where id not in (" + phone_string + ") and property_id = " +  connection.escape(property_id);
            return connection.queryAsync(phonesSql);
        })

    },

    deletePhone: function(connection, property_id, phone_id){
        return Promise.resolve().then(() => {
            var phonesSql = "update property_phones set status = 0 where id = " + connection.escape(phone_id) + "  and property_id = " +  connection.escape(property_id);
            return connection.queryAsync(phonesSql);
        })
    },

    findEmails: function(connection, property_id){
        var propertySql =  "Select * from property_emails where property_id = " + connection.escape(property_id) + ' and status = 1 order by sort asc ';
        return connection.queryAsync( propertySql )
    },

    saveEmail: function(connection, data, email_id){
        var sql;

        if(email_id){
            sql = "UPDATE property_emails set ? where id = " + connection.escape(email_id);
        } else {
            sql = "INSERT into property_emails set ?";
        }
        
        return connection.queryAsync(sql, data).then(r => email_id ? email_id : r.insertId);
    },

    removeEmails: function(connection, property_id, email_string){

        return Promise.resolve().then(() => {

            if(!email_string || !email_string.length) email_string = 0;
            var phonesSql = "delete from property_emails where id not in (" + email_string + ") and property_id = " +  connection.escape(property_id);

            return connection.queryAsync(phonesSql);
        })

    },

    deleteEmail: function(connection, property_id, email_id){
        return Promise.resolve().then(() => {
            var phonesSql = "update property_emails set status = 0 where id = " + connection.escape(email_id) + "  and property_id = " +  connection.escape(property_id);
            return connection.queryAsync(phonesSql);
        })

    },

    findByCompanyId: function(connection, company_id, searchParams){
        var sql = "Select * from properties where company_id = " + company_id;

        if(searchParams){
            if(searchParams.search && searchParams.search.length){
                sql += ' and (address_id in (select id from addresses where ( select concat(LOWER(address), " ",  LOWER(city), " ", LOWER(state), " ", LOWER(zip) )  like ' + connection.escape('%' + searchParams.search.toLowerCase() + '%') + ' ))  or LOWER(name) like  ' + connection.escape('%' + searchParams.search.toLowerCase() + '%') + ') ';
            }
            if(searchParams.sort){
                sql += ' ORDER BY name ASC';
            }
            if(searchParams.limit){
                sql += ' LIMIT ' + searchParams.offset + ', ' + searchParams.limit;
            }
        }

        return connection.queryAsync( sql );

    },
    //MVP TI - 12317 POC START
    findByCompanyIdTP: function (connection, company_id, searchParams) {
        var paymnetType = "tenant_payments"
        var sql = "Select * from properties where company_id = " + company_id + " and id IN (select property_id from hummingbird.connections where name = 'tenant_payments')";

        if (searchParams) {
            if (searchParams.search && searchParams.search.length) {
                sql += ' and (address_id in (select id from addresses where ( select concat(LOWER(address), " ",  LOWER(city), " ", LOWER(state), " ", LOWER(zip) )  like ' + connection.escape('%' + searchParams.search.toLowerCase() + '%') + ' ))  or LOWER(name) like  ' + connection.escape('%' + searchParams.search.toLowerCase() + '%') + ') ';
            }
            if (searchParams.sort) {
                sql += ' ORDER BY name ASC';
            }
            if (searchParams.limit) {
                sql += ' LIMIT ' + searchParams.offset + ', ' + searchParams.limit;
            }
        }

        return connection.queryAsync(sql);

    },
    //MVP TI - 12317 POC END

    findConnections(connection, property_id, type){
        var connectionSql =  "Select * from connections where property_id = " + connection.escape(property_id);
        if(type){
            connectionSql += ' and type = ' + connection.escape(type);
        }

        return connection.queryAsync( connectionSql )
    },

    findConnectionById(connection, connection_id){
        var _this = this;
        var connectionSql =  "Select * from connections where id = " + connection.escape(connection_id);

        return connection.queryAsync( connectionSql ).then(function(connRes){
            if(!connRes) return false;
            return connRes[0];
        });

    },

    saveConnection: function(connection, data, connection_id){
        var _this = this;

        var sql;
        if(connection_id){
            sql = "UPDATE connections set ? where id = " + connection.escape(connection_id);
        } else {
            sql = "insert into connections set ?";
        }
        return connection.queryAsync(sql, data);
    },

    deleteConnection: function(connection, connection_id,  property_id){

        if(!connection_id || !property_id ) return false;

        var sql = "delete from connections where id = " + connection.escape(connection_id) + ' and property_id = ' + + connection.escape(property_id) ;
        return connection.queryAsync(sql);

    },

    save: function(connection, data, property_id){
        var sql;
        if(property_id){
            sql = "UPDATE properties set ? where id = " + connection.escape(property_id);
        } else {
            sql = "insert into properties set ?";
        }


        return connection.queryAsync(sql, data).then(r=>{
            return property_id ? property_id: r.insertId;;
        });
    },

    findProducts(connection, property_id, company_id, product_id, search, type, category_type) {

        var productSql = "Select *, " +
            "(select price from property_products where products.id = property_products.product_id and property_id = " + property_id + " ) as property_price, " +
            "(select prorate from property_products where products.id = property_products.product_id and property_id = " + property_id + " ) as property_prorate, " +
            "(select prorate_out from property_products where products.id = property_products.product_id and property_id = " + property_id + " ) as property_prorate_out, " +
            "(select recurring from property_products where products.id = property_products.product_id and property_id = " + property_id + " ) as property_recurring, " +
            "(select taxable from property_products where products.id = property_products.product_id and property_id = " + property_id + " ) as property_taxable, " +
            "(select inventory from property_products where products.id = property_products.product_id and property_id = " + property_id + " ) as property_inventory, " +
            "(select amount_type from property_products where products.id = property_products.product_id and property_id = " + property_id + " ) as property_amount_type, " +
            "(select income_account_id from property_products where products.id = property_products.product_id and property_id = " + property_id + " ) as income_account_id " +
            "from  products where status = 1  and company_id = " + company_id +
            " and id in (select product_id from property_products where property_id = " + property_id + ")";

        if (search) {
            productSql += ' and name like ' + connection.escape("%" + search + "%");
        }

        if (type) {
            productSql += ' and default_type = ' + connection.escape(type);
        } else {
            productSql += " and default_type in ('product', 'late') ";
        }

        if (product_id) {
            productSql += " and id = " + connection.escape(product_id);
        }

        if (category_type) {
            productSql += " and category_type in " + category_type;
        }

        return connection.queryAsync(productSql);
    },

    findProductOverride(connection, property_id, product_id){

        var productSql = "Select * from  property_products where product_id = " + connection.escape(product_id) + " and property_id = " + connection.escape(property_id);
        return connection.queryAsync(productSql).then(result => result.length ? result[0]: null );

    },

    saveProductOverride(connection, data, override_id){
        var sql;
        if(override_id){
            sql = "UPDATE property_products set ? where id = " + connection.escape(override_id);
        } else {
            sql = "insert into property_products set ?";
        }
        return connection.queryAsync(sql, data);
    },

    deleteProductOverride(connection, override_id){
        var productSql = "DELETE FROM property_products where id =  " + connection.escape(override_id);
        return connection.queryAsync(productSql);
    },

    getProductDetails(connection, property_id, product_id, rent){
        let sql = " select id, property_id,product_id, price,taxable,inventory," +
            " IFNULL( " +
                " (select price from property_product_rules where property_product_id = property_products.id and rent_threshold > " + connection.escape(rent) + " HAVING min(rent_threshold)), " +
                " (select price from property_product_rules where property_product_id = property_products.id and rent_threshold = (SELECT MAX(rent_threshold) FROM property_product_rules WHERE property_product_id = property_products.id)) " +
            " ) as override_price " +
        " from property_products where property_id = " + connection.escape(property_id) + " and product_id = " + connection.escape(product_id) + "; ";
        return connection.queryAsync(sql).then(r => r.length ? r[0]: null);
    },

    findByLeaseId:function(connection, lease_id){
        var _this = this;
        var sql = "Select * from properties where id = (select property_id from units where id = ( select unit_id from leases where id  = " + connection.escape(lease_id) + " ))";

        return connection.queryAsync( sql ).then(function(propertyRes){
            if(!propertyRes) return false;
            return propertyRes[0];
        });
    },

    findByUnitId:function(connection, unit_id){
        var sql = "Select * from properties where id = (select property_id from units where id = " + connection.escape(unit_id) + " )";

        return connection.queryAsync( sql ).then(function(propertyRes){
            if(!propertyRes) return false;
            return propertyRes[0];
        });
    },
    
    findApplicationConfig(connection, property_id){
        var settingsSql = "Select * from application_config where property_id = " + connection.escape(property_id);

        return connection.queryAsync( settingsSql );
    },

    saveApplicationConfig(connection, data, field_id){
        var sql;
        if(field_id){
            sql = "UPDATE application_config set ? where id = " + connection.escape(field_id);
        } else {
            sql = "insert into application_config set ?";
        }

        return connection.queryAsync(sql, data);
    },

    deleteApplicationConfig(connection, property_id){
        var settingsSql = "delete from application_config where property_id = " + connection.escape(property_id);

        return connection.queryAsync( settingsSql );
    },

    listProperties(connection, company_id){
        var sql = "Select *, " +
            "(select address from addresses where id  = properties.address_id) as address, " +
            "(select city from addresses where id  = properties.address_id) as city, " +
            "(select state from addresses where id  = properties.address_id) as state, " +
            "(select zip from addresses where id  = properties.address_id) as zip " +
            " from properties where company_id = "+ connection.escape(company_id) + " order by properties.name asc, address asc;";
        return connection.queryAsync(sql);
    },

    findByType(connection, company_id, type){
        var sql;
        switch(type){
            case 'neighborhood':
                sql = "Select distinct(neighborhood) as location from addresses where addresses.id in (select address_id from properties where company_id = "+ connection.escape(company_id) + ") order by location asc;";
                break;
            case 'city':
                sql = "Select distinct(city) as location from addresses where addresses.id in (select address_id from properties where company_id = "+ connection.escape(company_id) + ") order by location asc;";
                break;
            case 'state':
                sql = "Select distinct(state) as location from addresses where addresses.id in (select address_id from properties where company_id = "+ connection.escape(company_id) + ") order by location asc;";
                break;
            case 'zip':
                sql = "Select distinct(zip) as location from addresses where addresses.id in (select address_id from properties where company_id = "+ connection.escape(company_id) + ") order by location asc;";
                break;
        }
        return connection.queryAsync(sql).map(function(result){
            return result.location;
        })


    },

    findTemplates(connection, property_id, type){
         var settingsSql = `SELECT * FROM properties_lease_templates 
                            WHERE id IN (SELECT MAX(id) FROM properties_lease_templates 
                            WHERE property_id = ${connection.escape(property_id)}
                            and lease_template_id in (select id from lease_templates where status = 1)
                            GROUP BY unit_type
                        )`;

        if (type) {
            settingsSql += " and unit_type = " + connection.escape(type);
        }

        return connection.queryAsync(settingsSql);

    },

    saveTemplate(connection, data, template_id){
        var _this = this;

        var sql;
        if(template_id){
            sql = "UPDATE properties_lease_templates set ? where id = " + connection.escape(template_id);
        } else {
            sql = "insert into properties_lease_templates set ?";
        }
        return connection.queryAsync(sql, data);
    },

    findTemplateById(connection, template_id){

        var sql = "Select * from properties_lease_templates where id = " + connection.escape(template_id);
        return connection.queryAsync(sql).then(c => c.length? c[0] : null);

    },

    deleteTemplate(connection, template_id){
        var sql = "DELETE from properties_lease_templates where id = " + connection.escape(template_id);
        return connection.queryAsync(sql);
    },


    findTriggers: (connection, property_id) => {
        var sql = 'SELECT * FROM triggers where trigger_group_id in (select trigger_group_id from property_trigger_groups where active = 1 and deleted_at is null and property_id = ' + connection.escape(property_id) + ' ) order by start asc';

        return connection.queryAsync(sql);
    },

    resetPendingLeaseStatuses: (connection, property_id) => {
        var sql = 'Update leases set lease_standing_id = (select id from lease_standings where LOWER(name) = "pending" )  where status = 2 unit_id in (select id from units where property_id = ' + connection.escape(property_id) + ')';
        return connection.queryAsync(sql);
    },

    resetOpenLeaseStatuses: (connection, property_id) => {
        var sql = 'Update leases set lease_standing_id = (select id from lease_standings where LOWER(name) = "current" ) where status = 1 and start_date <= CURDATE() and (end_date is null or end_date > CURDATE()) and unit_id in (select id from units where property_id = ' + connection.escape(property_id) + ')';
        return connection.queryAsync(sql);
    },

    resetClosedLeaseStatuses: (connection, property_id) => {
        var sql = 'Update leases set lease_standing_id = (select id from lease_standings where LOWER(name) = "lease closed" ) where status = 1 and end_date <= CURDATE() and unit_id in (select id from units where property_id = ' + connection.escape(property_id) + ')';
        return connection.queryAsync(sql);
    },


    getPendingLeaseErrors: (connection, property_id) => {
        var sql = 'SELECT * from leases where status = 2 and lease_standing_id != (select id from lease_standings where LOWER(name) = "pending" ) and unit_id in (select id from units where property_id = ' + connection.escape(property_id) + ')';
        console.log("getPendingLeaseErrors", sql);
        return connection.queryAsync(sql);
    },

    getOpenLeaseErrors: (connection, property_id, excluded = []) => {

        let excluded_query = '';
        if(excluded && excluded.length){
            excluded_query += ' and id not in (' + excluded.join(', ') + ')';
        }
        var sql = 'SELECT * from leases where status = 1 and lease_standing_id != (select id from lease_standings where LOWER(name) = "current" ) and start_date <= CURDATE() and (end_date is null or end_date > CURDATE())' +  excluded_query + 'and unit_id in (select id from units where property_id = ' + connection.escape(property_id) + ')';
        console.log("getOpenLeaseErrors", sql)
        return connection.queryAsync(sql);
    },

    getClosedLeaseErrors: (connection, property_id) => {
        var sql = 'SELECT * from leases where  lease_standing_id != (select id from lease_standings where LOWER(name) = "lease closed" ) and status = 1 and end_date <= CURDATE() and unit_id in (select id from units where property_id = ' + connection.escape(property_id) + ')';
        console.log("getClosedLeaseErrors", sql)
        return connection.queryAsync(sql);
    },
    
    // Property Tax Rates
    saveTaxRate(connection, data, tax_rate_id){
        let sql;

        if(tax_rate_id){
            sql = "UPDATE property_tax_profile set ? where id = " + connection.escape(tax_rate_id);
        } else {
            sql = "INSERT INTO property_tax_profile set ?";
        }
        return connection.queryAsync(sql, data);
    },

    findTaxRates(connection, property_id) {
        let sql = `SELECT ptp.*, tp.gl_code FROM property_tax_profile ptp 
                    INNER JOIN tax_profile tp ON tp.id = ptp.tax_profile_id
                    where property_id = ${connection.escape(property_id)}`;
        return connection.queryAsync(sql);
    },

    findTaxRate(connection, tax_rate_id, property_id, type) {
        let sql = `SELECT ptp.*, tp.gl_code FROM property_tax_profile ptp 
                    INNER JOIN tax_profile tp ON tp.id = ptp.tax_profile_id
                    WHERE 1 = 1`;

        if(tax_rate_id){
            sql += ` AND id = ${connection.escape(tax_rate_id)}`;
        } else {
            if(property_id && type){
                sql += ` AND property_id = ${connection.escape(property_id)} AND type = ${connection.escape(type)}`;
            }
        }

        return connection.queryAsync(sql).then(tr => tr.length? tr[0] : null);
    },

    async findIfDayClosed(connection, property_id, date) {
        const sql = `select * from closing_days where property_id = ${property_id} and date = '${date}'`;
        const result = await connection.queryAsync(sql);
        const activeCloseOfDay = result.find(r => r.active == 1);
        return activeCloseOfDay ? true : false;        
    },

    findByIdsInBulk(connection, properties) {
        const sql = `select * from properties where id in ( ${properties.map(p => connection.escape(p.id || p)).join(',')} )`;
        return connection.queryAsync(sql);
    },

    findPhonesInBulk: function(connection, property_ids = []){
        var propertySql =  `Select * from property_phones where property_id in (${property_ids.map(p_id => connection.escape(p_id)).join()}) and status = 1 order by sort asc`;
        return connection.queryAsync( propertySql )
    },

    async findAllLeasesWithRentPlan(connection, property_id) {
        let sql = `
            SELECT lease_id, rent_plan_id
            FROM lease_rent_plan_settings lrps 
            WHERE 
                lrps.end_date IS NULL AND
                lrps.status = 'active' AND
                lrps.property_id = ${property_id}        
        `
        return connection.queryAsync(sql);
    },

    async findMoveInDate(connection, lease_id) {
        let sql = `        
            SELECT start_date AS move_in_date
            FROM leases l 
            WHERE l.id = ${lease_id}	
        `
        let result = await connection.queryAsync(sql);
        return result[0]?.move_in_date
    },

    async getDeliveryDetails(connection, property_id) {
        let sql = `
            SELECT * 
            FROM property_rent_management_delivery_methods prmdm 
            WHERE prmdm.property_id = ${property_id}
        `;
        return connection.queryAsync(sql).then(l => l.length ? l : []);
    },
    
    fetchProperties(connection, payload){
        let {company_id, id} = payload;

        let sql = `Select * 
                    from properties p
                    where DAYNAME(p.on_boarding_date) IS NOT NULL`
        
        if(company_id)
            sql += ` and p.company_id = ${company_id}`  
        if(id)
            sql += ` and id = ${id}`

        return connection.queryAsync(sql);

    },

    fetchPropertiesFromLeaseIds(connection, payload){
        let {lease_ids} = payload;

        let sql = `select p.id, p.name, c.name as company_name, l.id as lease_id, concat(ifnull(con.first,''), ' ', ifnull(con.last,'')) as contact_name 
                    from leases l
                        left join units u on u.id = l.unit_id
                        left join properties p on p.id = u.property_id
                        left join companies c on c.id = p.company_id
                        left join contact_leases cl on cl.lease_id = l.id
                        left join contacts con on con.id = cl.contact_id
                    where l.id in (${lease_ids.map(l_id => connection.escape(l_id)).join(',')})`;
        
        console.log('fetchPropertiesFromLeaseIds', sql);
        return connection.queryAsync( sql );
    },

    async removePropertyAccountingTemplate(connection, payload){
        const { property_id, admin_id, deleted_at } = payload;
        let sql = `UPDATE property_accounting_template 
                   SET deleted_at = '${deleted_at}', deleted_by = ${admin_id}, modified_by = ${admin_id}
                   WHERE property_id = ${property_id} AND deleted_at IS NULL;`;
        console.log("removePropertyAccountingTemplate : ",sql);
        return connection.queryAsync(sql)
    },

    async savePropertyAccountingTemplate(connection, payload){
        let sql = `INSERT INTO property_accounting_template SET ? ;`;
        console.log('savePropertyAccountingTemplate : ', connection.format(sql, payload));

        return connection.queryAsync(sql, payload);
    },

    async propertiesWithoutTriggers(connection, company_id, property_id){
        let sql = `Select 
        c.id as company_id,
        c.name as company_name,
        p.id as property_id,
        p.name as property_name,
        p.number as property_number 
        from properties p
        LEFT JOIN property_trigger_groups ptg ON p.id = ptg.property_id and ptg.deleted_at is null
        LEFT JOIN companies c ON p.company_id = c.id
        where ptg.property_id IS NULL 
        ${company_id ? `and c.id = ${connection.escape(company_id)} `: ` `} 
        ${property_id ? ` and p.id = ${connection.escape(property_id)} ` : ` `} 
        group by p.id;`;

        return connection.queryAsync(sql);
    },

    async propertiesInConnections(connection,c_id,p_id){
        let sql = `SELECT 
                    c.id as company_id,
                    c.name as company_name,
                    p.id as property_id,
                    p.name as property_name,
                    p.number as property_number 
                    FROM properties p 
                    LEFT JOIN connections con ON p.id = con.property_id
                    INNER JOIN companies c ON p.company_id = c.id
                    WHERE con.property_id IS NULL `;
        if(p_id){
            sql += ` AND p.id = ${connection.escape(p_id)}`
        }
        if(c_id){
            sql += ` AND c.id = ${connection.escape(c_id)}`
        }
        sql +=' ;'
        return connection.queryAsync(sql);
    },

    async findPropertiesTaxProfiles(connection,c_id,p_id) {
        let sql = `SELECT 
                        c.id as company_id,
                        c.name as company_name,
                        p.id as property_id,
                        p.name as property_name,
                        p.number as property_number,
                        ptp.type as profile_tax_type
                    FROM properties p 
                    INNER JOIN companies c ON p.company_id = c.id
                    LEFT JOIN property_tax_profile ptp ON p.id = ptp.property_id
                    WHERE ptp.property_id IS NOT NULL `
                    if(c_id){
                       sql += ` AND c.id = ${connection.escape(c_id)}`;
                    }
                    if(p_id){
                        sql += ` AND p.id = ${connection.escape(p_id)}`;
                     }

                    sql += ` ;`;

        return connection.queryAsync(sql);
    },

    async findPropertiesByCompanyAndBulkIds(connection,company_id,property_ids) {
        let sql = `SELECT 
                    c.id as company_id,
                    c.name as company_name,
                    p.id as property_id,
                    p.name as property_name,
                    p.number as property_number
                    FROM properties p
                    LEFT JOIN companies c ON p.company_id = c.id
                    where c.id = ${connection.escape(company_id)} 
                    ${property_ids.length ? `and p.id in (${property_ids.map(id => connection.escape(id)).join(',')})` : ` `};`

                    return connection.queryAsync(sql);
    }


};


models  = require(__dirname + '/../models');


