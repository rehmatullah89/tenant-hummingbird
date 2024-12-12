var settings    = require(__dirname + '/../config/settings.js');

module.exports = {

    getProductByNameOrSave: function(connection, data, company_id){
        var productSql =  "Select id from products where lower(name) = " + connection.escape(data.name.toLowerCase()) + ' and company_id = ' + connection.escape(company_id);
        var product_id = false;

        return connection.queryAsync(productSql)
            .then(function(productRes) {
                if(productRes.length){
                    product_id = productRes[0].id;
                    return false;
                } else {
                    var product = {
                        name: data.name,
                        company_id: company_id,
                        status: 1,
                        price: data.amount || null
                    };
                    var productInsertSql = "Insert into products set ? ";
                    return connection.queryAsync(productInsertSql, product);
                }
            }).then(function(productInsertRes){

                if(productInsertRes){
                    product_id = productInsertRes.insertId;
                }
                return product_id;
            }).catch(function(err){
                console.error(err);
                return false;
            });
    },

    findUtilitiesByCompanyId: function(connection, company_id){
        var productSql = "Select distinct(name), id from products where id in (select product_id from bills where property_id in ( select id from properties where company_id = '" + company_id + "'))";

        return connection.queryAsync(productSql).each(function(product){
            product.id =  product.id;
            return product;
        });

    },

    findByCompanyId: function(connection, company_id, type){

        var productSql = "Select * from products where type = 'product' and status = 1 and company_id = " + connection.escape(company_id);

        if(type){
            productSql += " and default_type = " + connection.escape(type);
        } 


        return connection.queryAsync(productSql);

    },

    findById: function(connection, product_id, company_id, property_id){

        var productSql = "Select * ";


        if(property_id){
          productSql += ", (select price from property_products where property_products.product_id = products.id and property_id = " + connection.escape(property_id) + " ) as property_price, " +
            " (select taxable from property_products where property_products.product_id = products.id and property_id = " + connection.escape(property_id) + ") as property_taxable, " +
            ` (select income_account_id from property_products where property_products.product_id = products.id and property_id = ${connection.escape(property_id)}) as property_income_account_id`
        }

        productSql += " from products where id = " + connection.escape(product_id);

        if(company_id) {
            productSql +=  " and company_id = " + connection.escape(company_id);
        }

        console.log("product: findById - ", productSql);

        return connection.queryAsync(productSql).then(productRes => {
          if(!productRes.length) return null;
          let product = productRes[0];
          product.price = product.property_price || product.price;
          product.taxable = product.property_taxable || product.taxable;
          return product;
        });

    },

    findByIds: function (connection, product_ids, company_id, property_id) {

        var productSql = "Select * ";


        if (property_id) {
            productSql += ", (select price from property_products where property_products.product_id = products.id and property_id = " + connection.escape(property_id) + " ) as property_price, " +
                " (select taxable from property_products where property_products.product_id = products.id and property_id = " + connection.escape(property_id) + ") as property_taxable ";
        }

        productSql += " from products where id in (" + product_ids.map(pid => connection.escape(pid)).join(', ') + ") ";

        if (company_id) {
            productSql += " and company_id = " + connection.escape(company_id);
        }

        console.log("product: findByIds - ", productSql);

        return connection.queryAsync(productSql).then(productRes => productRes.length > 0 && productRes);

    },

    findRentProduct: function(connection, company_id){

        var productSql = "Select * from products where default_type = 'rent' and company_id = " + connection.escape(company_id);

        return connection.queryAsync(productSql).then(function(productRes){
            return productRes[0] || null;
        });

    },

    findDefaultProduct: function(connection, company_id, type){

        var productSql = "Select * from products where default_type = "+ connection.escape(type) +" and company_id = " + connection.escape(company_id);
        return connection.queryAsync(productSql).then(function(productRes){
            if(!productRes.length) return false;
            return productRes[0];

        });

    },

    findSecurityDepositProduct: function(connection, company_id){

        var productSql = "Select * from products where default_type = 'security' and company_id = " + connection.escape(company_id);

        return connection.queryAsync(productSql).then(function(productRes){
            return productRes[0] || null;
        });

    },

    searchByCompanyId: function(connection, conditions, company_id){
        var productSql = '';

        conditions.types = conditions.types || ['product'];

        productSql = "Select * ";
        if(conditions.property_id){
            productSql += ", (select price from property_products where property_products.product_id = products.id) as property_price, " +
                " (select taxable from property_products where property_products.product_id = products.id) as property_taxable ";
        }


        productSql += " from products where 1 = 1 " ;

        if(conditions.search){
            productSql += " and lower(name) like " + connection.escape("%" + conditions.search.toLowerCase()+"%")
        }

        if(conditions.types){

            var types = conditions.types.reduce((a, t) => a + connection.escape(t) + ',', '');

            productSql += " and default_type in (" +  types.substring(0, types.length - 1) + ") ";
        }

        productSql += " and company_id = '" + company_id + "' and status = 1 ";

        productSql += " order by name asc";
        
        return connection.queryAsync(productSql).map(p => {
            if(p.property_price){
                p.price = p.property_price;
                p.taxable = p.property_taxable;
            }
            return p;

        })
    },

    save: function(connection, data, id){
        var sql;
        if(id){
            sql = "UPDATE products set ? where id = " + connection.escape(id);
        } else {
            sql = "insert into products set ?";
        }

       

        return connection.queryAsync(sql, data);

    },

    delete: function(connection, id){

        var sql = "UPDATE products set status = 0 where id = " + connection.escape(id);

        return connection.queryAsync(sql);

    },

    findByName(connection, name, company_id){
        var productSql = "Select * from products where status = 1 and name = " + connection.escape(name) + " and company_id = " + connection.escape(company_id);
        return connection.queryAsync(productSql).then(function(productRes){
            return productRes[0] || null;
        });
    }
};