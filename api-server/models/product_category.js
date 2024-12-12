var Promise         = require('bluebird');
var moment          = require('moment');

var models = {};

module.exports = {


  find(connection, params){
    if(!params.company_id) return false;
    let sql = "Select * from product_categories where company_id = " + connection.escape(params.company_id);
    if(params.search){
      sql += ' and name like ' + connection.escape("%" + params.search + "%");
    }
    return connection.queryAsync(sql);

  },

  findById: function(connection, id, company_id){
    let sql =  "Select * from product_categories where id = " + connection.escape(id);
    if(company_id){
      sql +=  ' and company_id = ' + connection.escape(company_id)
    }
    return connection.queryAsync( sql ).then(res => res.length? res[0]: null)
  },

  findByName: function(connection, name, company_id){
    let sql =  "Select * from product_categories where name = " + connection.escape(name);
    if(company_id){
      sql +=  ' and company_id = ' + connection.escape(company_id)
    }

    return connection.queryAsync( sql );
  },
  save: function(connection, data, id){
    let sql;
    if(id){
      sql = "UPDATE product_categories set ? where id = " + connection.escape(id);
    } else {
      sql = "INSERT into product_categories set ?";
    }
    return connection.queryAsync(sql, data);
  },

  saveProduct(connection, product_id, product_category_id){
    let data = {
      product_id,
      product_category_id
    };

    let sql = "INSERT INTO properties_product_categories SET ? ON DUPLICATE KEY UPDATE id = id ";
    return connection.queryAsync(sql, data);
  },

  deleteProducts(connection, dont_delete ,product_category_id){

    let sql = "DELETE FROM products_product_categories WHERE product_category_id = " + connection.escape(product_category_id) + " and product_id not in (" +  dont_delete.map(d => connection.escape(d)).join(',') + ")";

    return connection.queryAsync(sql);
  },

  deleteProductCategory(connection, product_category_id){
    let sql = "UPDATE product_categories set status = 0  WHERE id = " + connection.escape(product_category_id);
    return connection.queryAsync(sql);
  },

  deleteProductsFromCategory(connection, product_category_id){

    let sql = "DELETE FROM properties_product_categories WHERE product_category_id = " + connection.escape(product_category_id);

    return connection.queryAsync(sql);
  },


  findProducts(connection, group_id ){

    let sql =  "Select * from properties_product_categories where product_category_id = " + connection.escape(group_id);
    return connection.queryAsync(sql);
  }



};


models  = require(__dirname + '/../models');


