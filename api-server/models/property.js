var Promise = require('bluebird');
var moment = require('moment');
var Sql = require(__dirname + '/../modules/sql_snippets.js');

var models = {};

module.exports = {

    findAllActive(connection, property_id, company_id) {
        var sql = "Select * from properties where 1 = 1 ";
        if (property_id) {
            sql += " and id = " + connection.escape(property_id);
        }
        if (company_id) {
            sql += " and company_id = " + connection.escape(company_id);
        }

        sql += " order by id asc ";
        return connection.queryAsync(sql);
    },
    listByCompanyId(connection, company_id, restricted = []) {
        var sql = `SELECT p.id, p.number, a.address, a.city, a.state, a.zip, a.district, a.region
                    FROM
                        properties p
                        JOIN addresses a ON p.address_id = a.id
                    WHERE p.company_id = ` + company_id;
        if (restricted.length) {
            sql += ' AND p.id in (' + restricted.map(r => connection.escape(r)).join(',') + ')';
        }
        return connection.queryAsync(sql);
    },

    searchByAddress: function (connection, search, company_id, contain, restricted) {

        // Todo - Make pagination
        var _this = this;
        var sql = "Select * from properties where company_id = " + company_id;

        if (search.length) {
            sql += ' and address_id in (select id from addresses where ( select concat(LOWER(address), " ",  LOWER(city), " ", LOWER(state), " ", LOWER(zip) )  like ' + connection.escape('%' + search + '%') + ' )) ';
        }


        return connection.queryAsync(sql);

    },

    getUnitCount: function (connection, property_id) {
        var sql = "select count(id) as count from units  where deleted is null AND property_id = " + connection.escape(property_id);
        return connection.queryAsync(sql);
    },

    getLeaseCount: function (connection, property_id) {
        var sql = "select count(id) as count from leases as lease_count where unit_id in (select id from units where units.property_id = " + connection.escape(property_id) + ") and ( end_date > '" + moment().format('YYYY-MM-DD') + "' or end_date is null ) and status = 1 ";
        return connection.queryAsync(sql);
    },

    getAllLeases: function (connection, property_id) {
        var sql = "select l.id, l.unit_id, l.start_date, l.end_date, l.status, l.lease_standing_id, cl.contact_id from leases l left join contact_leases cl on cl.lease_id = l.id where l.unit_id in (select id from units where units.property_id = " + connection.escape(property_id) + ") and l.status = 1 ";
        return connection.queryAsync(sql);
    },

    findAutoPaymentMethods: function (connection, property_id, date) {
        var sql = "select DISTINCT(payment_method_id) as payment_method_id, " +
            "(select contact_id from payment_methods where id = leases_payment_methods.payment_method_id) as contact_id " +
            " from leases_payment_methods where " +
            " deleted is null and " +
            " lease_id in (select id from leases where " +
            " unit_id in (select id from units where units.property_id = " + connection.escape(property_id) + ") " +
            " and start_date <= " + connection.escape(date) + " " +
            " and ( end_date >= " + connection.escape(date) + " or end_date is null ) " +
            " and status = 1 " +
            " AND bill_day =  DAY(" + connection.escape(date) + ") " +
            " ) ";

        console.log("sql", sql);
        return connection.queryAsync(sql);
    },
    searchByCoords: function (connection, lat, lng, company_id, restricted) {
        var _this = this;
        var sql = 'SELECT id, ' +
            '( select id from properties where address_id = addresses.id) as property_id, ' +
            '( select description from properties where address_id = addresses.id) as description, ' +
            '( select company_id from properties where address_id = addresses.id) as company_id, ' +
            '( select name from properties where address_id = addresses.id) as name, ' +
            '( select phone from properties where address_id = addresses.id) as phone, ' +
            '( select email from properties where address_id = addresses.id) as email, ' +
            '( 3959 * acos( cos( radians(' + connection.escape(lat) + ') ) * cos( radians( lat ) ) * cos( radians( lng ) - radians(' + connection.escape(lng) + ') ) + sin( radians(' + connection.escape(lat) + ') ) * sin( radians( lat ) ) ) ) AS distance ' +
            'FROM addresses where ( select company_id from properties where address_id = addresses.id ) = ' + connection.escape(company_id) +
            ' HAVING distance < 100 ' +
            'ORDER BY distance ' +
            'LIMIT 0 , 20';

        var properties = {};


        return connection.queryAsync(sql).then(function (addresses) {

            return Promise.map(addresses, function (address) {
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

    findByIds(connection, properties) {
        const sql = `select * from properties where id in ( ${properties.map(p => connection.escape(p.id || p)).join(',')} )`;
        return connection.queryAsync(sql);
    },

    findByGdsIds(connection, propertyGdsIds) {
        if (!propertyGdsIds?.length) return [];
        const sql = `select * from properties where gds_id in ( ${propertyGdsIds.map(gds_id => connection.escape(gds_id)).join(',')} )`;
        return connection.queryAsync(sql);
    },

    findById: function (connection, id, company_id, contain) {
        var _this = this;
        console.log('Property findById id: ' + id);
        var propertySql = "Select * from properties where id = " + connection.escape(id);

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


    findNonHbPropertyById: function (connection, id, company_id, contain) {
        var _this = this;
        var propertySql = "Select * from non_hummingbird_properties where id = " + connection.escape(id);

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


    findNonHbPropertyByName: function (connection, name, company_id, restricted) {
        var propertySql = "Select * from non_hummingbird_properties where LOWER(name) = " + connection.escape(name.toLowerCase());

        if (company_id) {
            propertySql += ' and company_id = ' + connection.escape(company_id)
        }

        return connection.queryAsync(propertySql).then(r => r.length ? r[0] : null);
    },

    findByName: function (connection, name, company_id, restricted) {
        var propertySql = "Select * from properties where LOWER(name) = " + connection.escape(name.toLowerCase());

        if (company_id) {
            propertySql += ' and company_id = ' + connection.escape(company_id)
        }

        return connection.queryAsync(propertySql).then(r => r.length ? r[0] : null);
    },

    searchByCompanyID(connection, company_id, params, restricted) {
        var propertySql = "Select * from properties where company_id = " + connection.escape(company_id);
        var { id, name, number, address_id } = params;

        var filterSql = [];
        name && filterSql.push('LOWER(name) = ' + connection.escape(name.toLowerCase()));
        number && filterSql.push('number = ' + connection.escape(number));
        address_id && filterSql.push('address_id = ' + connection.escape(address_id));
        if (filterSql) {
            propertySql += ' and (' + filterSql.join(' or ') + ')'
        }

        if (id) {
            propertySql += ' and id != ' + connection.escape(id);
        }

        propertySql += ' limit 1';

        return connection.queryAsync(propertySql).then(r => r.length ? r[0] : null);
    },

    searchNonHbPropertyByCompanyID(connection, company_id, params, restricted) {
        var propertySql = "Select * from non_hummingbird_properties where company_id = " + connection.escape(company_id);
        var { id, name, number, address_id } = params;

        var filterSql = [];
        name && filterSql.push('LOWER(name) = ' + connection.escape(name.toLowerCase()));
        number && filterSql.push('number = ' + connection.escape(number));
        address_id && filterSql.push('address_id = ' + connection.escape(address_id));
        if (filterSql) {
            propertySql += ' and (' + filterSql.join(' or ') + ')'
        }

        if (id) {
            propertySql += ' and id != ' + connection.escape(id);
        }

        propertySql += ' limit 1';

        return connection.queryAsync(propertySql).then(r => r.length ? r[0] : null);
    },

    findPhones: function (connection, property_id) {
        var propertySql = "Select * from property_phones where property_id = " + connection.escape(property_id) + ' and status = 1 order by sort asc ';
        return connection.queryAsync(propertySql)
    },

    savePhone: function (connection, data, phone_id) {
        var sql;

        if (phone_id) {
            sql = "UPDATE property_phones set ? where id = " + connection.escape(phone_id);
        } else {
            sql = "INSERT into property_phones set ?";
        }


        return connection.queryAsync(sql, data).then(r => phone_id ? phone_id : r.insertId);
    },

    removePhones: function (connection, property_id, phone_string) {
        return Promise.resolve().then(() => {
            if (!phone_string || !phone_string.length) phone_string = 0;
            var phonesSql = "delete from property_phones where id not in (" + phone_string + ") and property_id = " + connection.escape(property_id);
            return connection.queryAsync(phonesSql);
        })

    },

    deletePhone: function (connection, property_id, phone_id) {
        return Promise.resolve().then(() => {
            var phonesSql = "update property_phones set status = 0 where id = " + connection.escape(phone_id) + "  and property_id = " + connection.escape(property_id);
            return connection.queryAsync(phonesSql);
        })
    },

    findEmails: function (connection, property_id) {
        var propertySql = "Select * from property_emails where property_id = " + connection.escape(property_id) + ' and status = 1 order by sort asc ';
        return connection.queryAsync(propertySql)
    },

    saveEmail: function (connection, data, email_id) {
        var sql;

        if (email_id) {
            sql = "UPDATE property_emails set ? where id = " + connection.escape(email_id);
        } else {
            sql = "INSERT into property_emails set ?";
        }

        return connection.queryAsync(sql, data).then(r => email_id ? email_id : r.insertId);
    },

    removeEmails: function (connection, property_id, email_string) {

        return Promise.resolve().then(() => {

            if (!email_string || !email_string.length) email_string = 0;
            var phonesSql = "delete from property_emails where id not in (" + email_string + ") and property_id = " + connection.escape(property_id);

            return connection.queryAsync(phonesSql);
        })

    },

    deleteEmail: function (connection, property_id, email_id) {
        return Promise.resolve().then(() => {
            var phonesSql = "update property_emails set status = 0 where id = " + connection.escape(email_id) + "  and property_id = " + connection.escape(property_id);
            return connection.queryAsync(phonesSql);
        })
    },

    findAggregatedByCompanyId: function (connection, company_id, searchParams = {}, base_properties = [], restricted = [], count) {

        var sql = `SELECT 
            p.*, 
            a.address, a.address2, a.city, a.state, a.zip, a.neighborhood, a.country, a.lat, a.lng, a.formatted_address, a.region, a.district,
            (select count(id) as count from units  where deleted is null AND property_id = p.id ) as unit_count,
            (select count(id) as count from leases where unit_id in (select id from units where units.property_id = p.id) and ( end_date > DATE(NOW()) or end_date is null ) and status = 1) as lease_count,
            IFNULL((select active from closing_days where property_id = p.id and date = DATE(NOW())), 0) as is_day_closed
        FROM properties p
        LEFT JOIN 
            addresses a on (a.id = p.address_id) 
        WHERE 
            p.company_id = ` + company_id;
        if (restricted.length && !searchParams.all) {
            sql += ' AND p.id in (' + restricted.map(r => connection.escape(r)).join(',') + ')';

        } else if (base_properties.length) {
            sql += ' AND p.id in (' + base_properties.map(r => connection.escape(r)).join(',') + ')';
        }

        if (searchParams.search && searchParams.search.length) {
            sql += ' and (address_id in (select id from addresses where ( select concat(LOWER(address), " ",  LOWER(city), " ", LOWER(state), " ", LOWER(zip) )  like ' + connection.escape('%' + searchParams.search.toLowerCase() + '%') + ' ))  or LOWER(name) like  ' + connection.escape('%' + searchParams.search.toLowerCase() + '%') + ') ';
        }

        // if (searchParams.limit && !count) {
        //     sql += ' LIMIT ' + searchParams.offset + ', ' + searchParams.limit;
        // }

        return connection.queryAsync(sql)
        // if (count) {
        //     return connection.queryAsync(sql).then(r => r[0]?.total_count ? r[0].total_count : 0);
        // } else
    },

    findByCompanyId: function (connection, company_id, searchParams = {}, base_properties = [], restricted = [], count) {

        var sql = `SELECT ${count ? "COUNT(id) AS total_count" : "*"} FROM properties WHERE company_id = ` + company_id;
        if (restricted.length && !searchParams.all) {
            sql += ' AND id in (' + restricted.map(r => connection.escape(r)).join(',') + ')';

        } else if (base_properties.length) {
            sql += ' AND id in (' + base_properties.map(r => connection.escape(r)).join(',') + ')';
        }

        if (searchParams.search && searchParams.search.length) {
            sql += ' and (address_id in (select id from addresses where ( select concat(LOWER(address), " ",  LOWER(city), " ", LOWER(state), " ", LOWER(zip) )  like ' + connection.escape('%' + searchParams.search.toLowerCase() + '%') + ' ))  or LOWER(name) like  ' + connection.escape('%' + searchParams.search.toLowerCase() + '%') + ') ';
        }

        if (searchParams.limit && !count) {
            sql += ' LIMIT ' + searchParams.offset + ', ' + searchParams.limit;
        }

        console.log("findByCompanyId sql", sql);
        if (count) {
            return connection.queryAsync(sql).then(r => r[0]?.total_count ? r[0].total_count : 0);
        } else
            return connection.queryAsync(sql)
    },



    findNonHbPropertyByCompanyId: function(connection, company_id, searchParams = {}, base_properties = [], properties = [], count){
        let sql = ""
        if(count) {
            sql = "SELECT COUNT(*) as count ";
        } else sql = "SELECT * ";

        sql += "FROM non_hummingbird_properties WHERE company_id = " + company_id;
        if(searchParams.all) {
            
          sql +=  properties.length ? ' AND id IN (' + properties.map(r => connection.escape(r)).join(',') + ')' : '';

        } else if (base_properties.length) {

          sql += ' AND id IN (' + base_properties.map(r => connection.escape(r)).join(',') + ')';
        }

        if(searchParams.search && searchParams.search.length){
            sql += ' AND (address_id IN (SELECT id FROM addresses WHERE ( SELECT concat(LOWER(address), " ",  LOWER(city), " ", LOWER(state), " ", LOWER(zip) )  LIKE ' + connection.escape('%' + searchParams.search.toLowerCase() + '%') + ' ))  OR LOWER(name) LIKE  ' + connection.escape('%' + searchParams.search.toLowerCase() + '%') + ') ';
        }
        
        if(searchParams.limit && !count){
            sql += ' LIMIT ' + searchParams.offset + ', ' + searchParams.limit;
        }

        console.log("findByCompanyId sql", sql);
        return connection.queryAsync(sql);

    },


    findConnections(connection, property_id, type) {
        var connectionSql = "Select * from connections where property_id = " + connection.escape(property_id);
        if (type) {
            connectionSql += ' and type = ' + connection.escape(type);
        }

        return connection.queryAsync(connectionSql)
    },

    async findConnectionById(connection, connection_id) {

        var connectionSql = "Select * from connections where id = " + connection.escape(connection_id);
        console.log("connectionSql", connectionSql)
        let r = await connection.queryAsync(connectionSql);
        console.log("r", r);
        return r.length ? r[0] : null;


    },

    saveConnection: function (connection, data, connection_id) {

        let sql;
        if (connection_id) {
            sql = "UPDATE connections set ? where id = " + connection.escape(connection_id);
        } else {
            sql = "insert into connections set ?";
        }

        console.log('saveConnection - sql: ', sql)        
        return connection.queryAsync(sql, data);
    },

    savePreviousConnection: function (connection, data) {

        let sql = "insert into deleted_connections set ?";
        console.log('savePreviousConnection - sql: ', sql)
        return connection.queryAsync(sql, data);
    },

    deleteConnection: function (connection, connection_id, property_id) {

        if (!connection_id || !property_id) return false;
        var sql = "delete from connections where id = " + connection.escape(connection_id) + ' and property_id = ' + + connection.escape(property_id);
        return connection.queryAsync(sql);

    },

    deleteAutopays(connection, property_id, type) {
        var sql = `UPDATE leases_payment_methods set deleted = now() where payment_method_id in (select id from payment_methods where property_id  = ${connection.escape(property_id)} and type = ${connection.escape(type)})`;
        return connection.queryAsync(sql);
    },

    deleteAllPaymentMethods(connection, property_id, type) {
        var sql = `UPDATE payment_methods set active = 0 where property_id  = ${connection.escape(property_id)} and type = ${connection.escape(type)}`;
        return connection.queryAsync(sql);
    },

    findConnectionDevices: function (connection, connection_id) {

        var sql = "Select * from connection_devices where active = 1 and connection_id = " + connection.escape(connection_id);

        return connection.queryAsync(sql);
    },

    async findConnectionDeviceById(connection, device_id) {

        var sql = "Select * from connection_devices where active = 1 and id = " + connection.escape(device_id);

        let r = await connection.queryAsync(sql);

        return r.length ? r[0] : null;
    },

    saveConnectionDevice: function (connection, data, device_id) {
        var sql;

        if (device_id) {
            sql = "UPDATE connection_devices set ? where id = " + connection.escape(device_id);
        } else {
            sql = "INSERT into connection_devices set ?";
        }


        return connection.queryAsync(sql, data);
    },

    removeConnectionDevices: function (connection, connection_id, device_string) {

        return Promise.resolve().then(() => {

            var sql = "DELETE from connection_devices where ";

            if (device_string && device_string.length) {

                sql += " id not in (" + device_string + ") and ";
            }

            sql += " connection_id = " + connection.escape(connection_id);

            return connection.queryAsync(sql);
        })
    },

    save: function (connection, data, property_id) {
        var sql;
        if (property_id) {
            sql = "UPDATE properties set ? where id = " + connection.escape(property_id);
        } else {
            sql = "insert into properties set ?";
        }


        return connection.queryAsync(sql, data).then(r => {
            return property_id ? property_id : r.insertId;;
        });
    },

    saveNonHbProperty: function (connection, data, property_id) {
        var sql;
        if (property_id) {
            sql = "UPDATE non_hummingbird_properties set ? where id = " + connection.escape(property_id);
        } else {
            sql = "insert into non_hummingbird_properties set ?";
        }


        return connection.queryAsync(sql, data).then(r => {
            return property_id ? property_id : r.insertId;;
        });
    },


    findInsurances: function (connection, company_id, property_id, filters) {

        let sql = `Select * from insurance WHERE product_id in (select id from products where status = 1) 
            and product_id in (select product_id from property_products where property_id = ${connection.escape(property_id)}) 
            and company_id = ${connection.escape(company_id)}`

        if (filters) {
            if (filters.unit_type) {
                sql += ` and unit_type = ${connection.escape(filters.unit_type)}`;
            }

            if (filters.insurance_id) {
                sql += ` and id = ${connection.escape(filters.insurance_id)}`;
            }
        }

        return connection.queryAsync(sql);
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

        productSql += " order by name asc"
        return connection.queryAsync(productSql);
    },

    findProductOverride(connection, property_id, product_id) {

        var productSql = "Select * from  property_products where product_id = " + connection.escape(product_id) + " and property_id = " + connection.escape(property_id);
        return connection.queryAsync(productSql).then(result => result.length ? result[0] : null);

    },

    saveProductOverride(connection, data, override_id) {
        var sql;
        if (override_id) {
            sql = "UPDATE property_products set ? where id = " + connection.escape(override_id);
        } else {
            sql = "insert into property_products set ?";
        }
        return connection.queryAsync(sql, data);
    },

    savePromotionProperties(connection, data) {
        var sql = "insert into promotion_properties set ?";
        return connection.queryAsync(sql, data);
    },

    deletePomotionProperty(connection, data, promotion_id) {
        var sql = `delete from promotion_properties where property_id in (${data}) and promotion_id = ${promotion_id}`;
        return connection.queryAsync(sql);
    },

    deleteProductOverride(connection, override_id, product_id, property_id) {
        var productSql;
        if (override_id) {
            productSql = `DELETE FROM property_products where id = ${connection.escape(override_id)}`;
        } else {
            productSql = `DELETE FROM property_products where property_id = ${connection.escape(property_id)} and product_id = ${connection.escape(product_id)}`;
        }

        return connection.queryAsync(productSql);
    },

    getProductDetails(connection, property_id, product_id, rent) {
        let sql = " select id, property_id,product_id, price,taxable,inventory," +
            " IFNULL( " +
            " (select price from product_rules where property_product_id = property_products.id and rent_threshold > " + connection.escape(rent) + " HAVING min(rent_threshold)), " +
            " (select price from product_rules where property_product_id = property_products.id and rent_threshold = (SELECT MAX(rent_threshold) FROM product_rules WHERE property_product_id = property_products.id)) " +
            " ) as override_price " +
            " from property_products where property_id = " + connection.escape(property_id) + " and product_id = " + connection.escape(product_id) + "; ";

        return connection.queryAsync(sql).then(r => r.length ? r[0] : null);
    },
    findByLeaseId: function (connection, lease_id) {
        var _this = this;
        var sql = "Select * from properties where id = (select property_id from units where id = ( select unit_id from leases where id  = " + connection.escape(lease_id) + " ))";

        return connection.queryAsync(sql).then(function (propertyRes) {
            if (!propertyRes) return false;
            return propertyRes[0];
        });
    },

    findByUnitId: function (connection, unit_id) {
        var sql = "Select * from properties where id = (select property_id from units where id = " + connection.escape(unit_id) + " )";

        return connection.queryAsync(sql).then(function (propertyRes) {
            if (!propertyRes) return false;
            return propertyRes[0];
        });
    },

    findApplicationConfig(connection, property_id) {
        var settingsSql = "Select * from application_config where property_id = " + connection.escape(property_id);

        return connection.queryAsync(settingsSql);
    },

    saveApplicationConfig(connection, data, field_id) {
        var sql;
        if (field_id) {
            sql = "UPDATE application_config set ? where id = " + connection.escape(field_id);
        } else {
            sql = "insert into application_config set ?";
        }

        return connection.queryAsync(sql, data);
    },

    deleteApplicationConfig(connection, property_id) {
        var settingsSql = "delete from application_config where property_id = " + connection.escape(property_id);

        return connection.queryAsync(settingsSql);
    },

    listProperties(connection, company_id, restricted) {
        var sql = "Select *, " +
            "(select address from addresses where id  = properties.address_id) as address, " +
            "(select city from addresses where id  = properties.address_id) as city, " +
            "(select state from addresses where id  = properties.address_id) as state, " +
            "(select zip from addresses where id  = properties.address_id) as zip " +
            " from properties where company_id = " + connection.escape(company_id) + " order by properties.name asc, address asc;";
        return connection.queryAsync(sql);
    },

    findByType(connection, company_id, type, restricted) {
        var sql;
        switch (type) {
            case 'neighborhood':
                sql = "Select distinct(neighborhood) as location from addresses where addresses.id in (select address_id from properties where company_id = " + connection.escape(company_id) + ") ";
                break;
            case 'city':
                sql = "Select distinct(city) as location from addresses where addresses.id in (select address_id from properties where company_id = " + connection.escape(company_id) + ") ";
                break;
            case 'state':
                sql = "Select distinct(state) as location from addresses where addresses.id in (select address_id from properties where company_id = " + connection.escape(company_id) + ") ";
                break;
            case 'zip':
                sql = "Select distinct(zip) as location from addresses where addresses.id in (select address_id from properties where company_id = " + connection.escape(company_id) + ") ";
                break;
        }

        if (restricted.length) {
            sql += " and addresses.id in (select address_id  from properties where id in ( " + restricted.join(', ') + " )) "
        }

        sql += " order by location asc; ";

        console.log('sql', sql);
        return connection.queryAsync(sql).map(function (result) {
            return result.location;
        })


    },

    findTemplates(connection, property_id, type) {

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

    saveTemplate(connection, data, template_id) {
        var _this = this;

        var sql;
        if (template_id) {
            sql = "UPDATE properties_lease_templates set ? where id = " + connection.escape(template_id);
        } else {
            sql = "insert into properties_lease_templates set ?";
        }
        return connection.queryAsync(sql, data);
    },

    findTemplateById(connection, template_id) {

        var sql = "Select * from properties_lease_templates where id = " + connection.escape(template_id);
        return connection.queryAsync(sql).then(c => c.length ? c[0] : null);

    },

    deleteTemplate(connection, template_id) {
        var sql = "DELETE from properties_lease_templates where id = " + connection.escape(template_id);
        return connection.queryAsync(sql);
    },


    findTriggers: (connection, property_id) => {
        var sql = 'SELECT * FROM triggers where trigger_group_id in (select trigger_group_id from property_trigger_groups where active = 1 and property_id = ' + connection.escape(property_id) + ' and deleted_at is null )';

        console.log("sql", sql);
        return connection.queryAsync(sql);
    },

    findByGdsID: function (connection, gds_id) {
        var sql = "SELECT * FROM properties where gds_id =" + connection.escape(gds_id);
        return connection.queryAsync(sql).then(c => c.length ? c[0] : null);;
    },
    findByNonHbPropertyByGdsID: function (connection, gds_id) {
        var sql = "SELECT * FROM non_hummingbird_properties where gds_id =" + connection.escape(gds_id);
        return connection.queryAsync(sql).then(c => c.length ? c[0] : null);;
    },

    saveMapAsset(connection, data, asset_id) {
        var sql;
        if (asset_id) {
            sql = "UPDATE facility_map_assets set ? where id = " + connection.escape(asset_id);
        } else {
            sql = "insert into facility_map_assets set ?";
        }
        return connection.queryAsync(sql, data).then(r => {
            return asset_id ? asset_id : r.insertId
        })

    },
    findMapAssets(connection, property_id) {
        var sql = "select * from facility_map_assets where property_id = " + connection.escape(property_id);
        return connection.queryAsync(sql);
    },

    findUnitTypes(connection, property_id) {
        let sql = `select distinct(type) from units where property_id = ${property_id}`;
        return connection.queryAsync(sql);
    },

    // Property Tax Rates
    saveTaxRate(connection, data, tax_rate_id) {
        let sql;

        if (tax_rate_id) {
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

        if (tax_rate_id) {
            sql += ` AND id = ${connection.escape(tax_rate_id)}`;
        } else {
            if (property_id && type) {
                sql += ` AND property_id = ${connection.escape(property_id)} AND type = ${connection.escape(type)}`;
            }
        }
        console.log("findTaxRateSql", sql);
        return connection.queryAsync(sql).then(tr => tr.length ? tr[0] : null);
    },

    deleteTaxRateByProfileId(connection, tax_profile_id) {
        let sql = `delete from property_tax_profile where tax_profile_id = ${tax_profile_id}`;
        return connection.queryAsync(sql);
    },

    async findIfDayClosed(connection, property_id, date) {
        const sql = `select * from closing_days where property_id = ${property_id} and date = '${date}'`;
        const result = await connection.queryAsync(sql);
        const activeCloseOfDay = result.find(r => r.active == 1);
        return activeCloseOfDay ? true : false;
    },

    //Added by BCT
    async getPropertyList(connection, props) {
        var sql = `select p.id, p.company_id, p.number, p.name, p.address_id, a.address, a.city, a.state, a.zip, a.country
                   from properties p left join addresses a on p.address_id = a.id 
                   where p.id in (${props.join(",")}) order by p.name`;

        console.log(sql, 'getPropertyList');
        return connection.queryAsync(sql);
    },

    async getUnitGroupPromos(connection, data, count) {
        let sql = `SELECT ${count ? "DISTINCT COUNT(p.id) OVER() AS total_records" : "p.*, JSON_ARRAYAGG((ugu.unit_id)) as units"}
                    FROM
                        unit_groups ug
                        JOIN unit_group_units ugu ON ug.id = ugu.unit_groups_id
                        JOIN units u ON ugu.unit_id = u.id
                        JOIN promotion_units pu ON pu.unit_id = u.id
                        JOIN promotions p ON pu.promotion_id = p.id
                    WHERE
                        u.deleted IS NULL
                        AND p.active = 1
                        AND p.enable = 1
                        AND u.id NOT IN (${Sql.get_deactivated_spaces()})
                        AND ug.unit_group_hashed_id = '${data.unit_group_id}'
                        AND u.property_id = ${data.property_id}`
        if (data.label) {
            sql += ` AND p.label = '${data.label}'`
        }
        sql += ` GROUP BY p.name`;
        if (count) {
            return connection.queryAsync(sql).then(tr => tr.length ? tr[0].total_records : 0);
        } else {
            sql += ` LIMIT ${connection.escape(parseInt(data.offset))},${connection.escape(parseInt(data.limit))}`;
            return connection.queryAsync(sql).then(ugp => ugp.length ? ugp : []);
        }
    },

    async getUnitsRateChanges(connection, property_id, search_params) {
        let filterQuery = ''

        filterQuery += search_params.from_date ? ` AND DATE_FORMAT(upc.start, "%Y-%m-%d") >= '${search_params.from_date}' ` : ''
        filterQuery += search_params.to_date ? ` AND (DATE_FORMAT(upc.start, "%Y-%m-%d") <= '${search_params.to_date}')  ` : ''

        let sql = `SELECT
                        u.id,
                        JSON_ARRAYAGG(
                            JSON_OBJECT(
                                'price', upc.price,
                                'start_date', DATE_FORMAT(upc.start, "%d-%m-%Y"),
                                'end_date', DATE_FORMAT(upc.end, "%d-%m-%Y")
                            )
                        ) AS rate_changes
                    FROM
                        units u
                        JOIN unit_price_changes upc ON u.id = upc.unit_id
                    WHERE
                        u.deleted IS NULL 
                        AND u.id NOT IN (${Sql.get_deactivated_spaces()}) 
                        AND u.property_id = ${property_id} 
                        ${filterQuery}
                        GROUP BY u.id
                        LIMIT ${connection.escape(parseInt(search_params.offset))} , ${connection.escape(parseInt(search_params.limit))}`;
        return connection.queryAsync(sql, property_id).then(urc => urc.length ? urc : []);
    },

    async getUnitsRateChangesCount(connection, property_id, search_params) {
        let filterQuery = ''

        if (search_params.from_date) {
            filterQuery += ` WHERE DATE_FORMAT(upc.start, "%Y-%m-%d") >= '${search_params.from_date}' `
            filterQuery += search_params.to_date ? ` AND (DATE_FORMAT(upc.start, "%Y-%m-%d") <= '${search_params.to_date}') ` : ''
        } else {
            filterQuery += search_params.to_date ? ` WHERE DATE_FORMAT(upc.start, "%Y-%m-%d") <= '${search_params.to_date}' ` : ''
        }

        let sql = `
            SELECT 
                COUNT(id) AS count
            FROM   
                units u
            WHERE  
                u.id IN
                    (
                        SELECT 
                            unit_id
                        FROM   
                            unit_price_changes upc 
                        ${filterQuery}
                    )
                AND u.deleted IS NULL
                AND u.id NOT IN (${Sql.get_deactivated_spaces()})
                AND u.property_id = ${property_id}
        `;
        return connection.queryAsync(sql, property_id).then(count => count.length ? count[0].count : 0);
    },
    /**
     * Method to get property Id(s) for a given lease Id(s)
     * @param {*} connection 
     * @param {Array} lease_ids Array of lease Ids
     * @returns {Array} Array containing propery Ids
     */
    findPropertiesByLeaseIds: function (connection, lease_ids) {
        let sql = `
            SELECT 
                * 
            FROM 
                properties 
            WHERE 
                id IN (
                        SELECT
                            property_id 
                        FROM 
                            units
                        WHERE 
                            id IN ( 
                                    SELECT 
                                        unit_id
                                    FROM 
                                        leases 
                                    WHERE 
                                        id IN (${lease_ids})
                            )
                );`;
        return connection.queryAsync(sql).then(function (propertyRes) {
            return propertyRes?.length ? propertyRes : []
        });
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
    
    findPropertyBySubdomain(connection, subdomain) {
        let sql = `SELECT * FROM properties WHERE company_id IN (SELECT id FROM companies WHERE subdomain = ${connection.escape(subdomain)})`;
        return connection.queryAsync(sql).then(properties => properties.length ? properties : []);
    },
    getGroupingProfile(connection, propertyId, groupingProfileName) {
        let sql = `
            SELECT 
                id 
            FROM 
                unit_group_profiles ugp 
            WHERE 
                lower(ugp.name) = ${connection.escape(groupingProfileName.toLowerCase())} AND ugp.property_id = ${connection.escape(propertyId)} AND active = 1 order by id desc limit 1;`
        return connection.queryAsync(sql).then(function (res) {
            return res;
        });
    },

    getUnitGroupById(connection, unitGroupId) {
        let sql = `
            SELECT
                unit_group_hashed_id
            FROM
                unit_groups ug
            WHERE
                ug.unit_group_hashed_id = ${connection.escape(unitGroupId)};`
        return connection.queryAsync(sql).then(function (res) {
            return res?.length ? res : []
        });
    },

    hasPermissions(connection, payload){
        let {contact_id, permissions = [], id} = payload;

        let sql =  `WITH permitted_perms as (
                        select p.label from companies_contact_roles ccr
                            inner join contact_roles_properties crp on crp.company_contact_role_id = ccr.id and ccr.contact_id = ${connection.escape(contact_id)} and crp.property_id = ${connection.escape(id)}
                            inner join roles_permissions rp on rp.role_id = ccr.role_id
                            inner join permissions p on p.id = rp.permission_id and p.label in (${permissions.map(permission => connection.escape(permission)).join(',')})
                    ),
                    permissions AS (
                        SELECT ${connection.escape(permissions[0])}  as label`

                        if(permissions.length>1){

                            for(let i=1; i<permissions.length; i++){
                                sql += ` UNION SELECT ${connection.escape(permissions[i])} as label`
                            }
                            
                        }

        sql += `) SELECT * from permissions where label not in (select label from permitted_perms);`

        console.log('hasPropertyPermissions query: ', sql );
        return connection.queryAsync(sql);
    },

    hasPermissionToAll(connection, payload){
        let {contact_id, permission, properties = []} = payload;

        let sql =  `WITH permitted_props as (
                        select crp.property_id from companies_contact_roles ccr
                            inner join contact_roles_properties crp on crp.company_contact_role_id = ccr.id and ccr.contact_id = ${connection.escape(contact_id)}
                            inner join roles_permissions rp on rp.role_id = ccr.role_id
                            inner join permissions p on p.id = rp.permission_id and p.label = ${connection.escape(permission)}
                    ),
                    given_props as (
                        select ${connection.escape(properties[0])} as prop_id`  
                        
                        if(properties.length>1){

                            for(let i=1; i<properties.length; i++){
                                sql += ` UNION SELECT ${connection.escape(properties[i])} as prop_id`
                            }
                            
                        }

        sql += `)   SELECT gp.prop_id, p.name from given_props gp
                        left join properties p on p.id = gp.prop_id
                    WHERE gp.prop_id not in (select property_id from permitted_props)`;

        console.log('hasPermissionToAll query: ', sql );
        return connection.queryAsync(sql);
    },
    
    findPropertyTimeZone(connection, country, zip) {
        // Some zip has more specific location info, hence extract only the first portion of zip
      let sql = '';
      let formatted_zip = zip.split(/-|\s+/)[0];
      if (country)
          sql = `SELECT time_zone FROM geolocation WHERE country = ${connection.escape(country)} 
                    AND postal_code = ${connection.escape(formatted_zip)}`;
        else
          sql = `SELECT time_zone FROM geolocation WHERE
                      postal_code = ${connection.escape(formatted_zip)}`;
        console.log("findPropertyTimeZone",sql);
        return connection.queryAsync(sql).then(r => r.length ? r[0].time_zone : null);
    },

    interPropModeVerification(connection, payload) {
        let {company_id, id, contact_id, permissions = []} = payload;

        let sql = `WITH access_verification as (
                    select (
                    select crp.property_id
                    from companies_contact_roles ccr
                    inner join contact_roles_properties crp on crp.company_contact_role_id = ccr.id and ccr.contact_id = ${connection.escape(contact_id)} and crp.property_id = ${connection.escape(id)}) as prop_access,
                    
                    (with permitted_perms as (
                        select p.label
                        from permissions p
                            inner join roles_permissions rp on rp.permission_id = p.id
                            inner join roles r on r.id = rp.role_id
                        where r.name = '${ENUMS.ROLES.INTER_PROPERTY_OPERATIONS}' and r.company_id = ${connection.escape(company_id)}
                    ),
                    permissions AS (
                        SELECT ${connection.escape(permissions[0])}  as label`

                                if(permissions.length>1){

                                    for(let i=1; i<permissions.length; i++){
                                        sql += ` UNION SELECT ${connection.escape(permissions[i])} as label`
                                    }
                                    
                                }

            sql += `) SELECT group_concat(label) from permissions where label not in (select label from permitted_perms)) 
                    ungranted_perms)
                        
                    SELECT
                        CASE WHEN prop_access is null then '${permissions.join(',')}'
                            WHEN prop_access is not null and ungranted_perms is not null then ungranted_perms
                            else null
                            end as ungranted_perms
                    from access_verification`

        console.log(`interPropModeVerification: ${sql}`);
        return connection.queryAsync(sql).then(r => r.length ? r[0].ungranted_perms : null);
    }

};

models = require(__dirname + '/../models');
const  ENUMS  = require(__dirname + '/../modules/enums.js');