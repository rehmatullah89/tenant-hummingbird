var settings    = require(__dirname + '/../config/settings.js');

module.exports = {

	search: function(connection, conditions = {}, searchParams, company_id, count){
		var sql = '';
		if(count){
			sql = "SELECT count(*) as count ";
		} else {
			sql = "SELECT *,  " +
				"(select name from products where id = insurance.product_id) as name, " +
				"(select description from products where id = insurance.product_id) as description, " +
				"(select name from vendors where id = (select vendor_id from products where products.id = insurance.product_id)) as vendor ";
		}

		sql += " FROM insurance where 1 = 1 and (select status from products where id = insurance.product_id) = 1 " ;
		sql += " and (select company_id from products where id = insurance.product_id) = " + connection.escape(company_id);

		if(conditions.name && conditions.name.length){
			sql += " and (select name from products where id = insurance.product_id) like  " + connection.escape("%" + conditions.name + "%");
		}

		if(searchParams) {
			if (searchParams.sort) {
				sql += " order by ";
				switch (searchParams.sort) {
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


	findByCompanyId: function(connection, company_id ){

		var productSql = "Select * from insurance WHERE product_id in (select id from products where status = 1) and company_id = " + connection.escape(company_id);
		return connection.queryAsync(productSql);

	},

	findById: function(connection, product_id, company_id){

		var productSql = "Select * from insurance where id = " + connection.escape(product_id);

		if(company_id) {
			productSql +=  " and company_id = " + connection.escape(company_id);
		}


		return connection.queryAsync(productSql).then(function(productRes){
			return productRes[0] || null;
		});

	}, 

	findByProductId: function(connection, product_id){
		var productSql = "Select * from insurance where product_id = " + connection.escape(product_id);
		return connection.queryAsync(productSql).then(function(productRes){
			return productRes[0] || null;
		});
	},



	save: function(connection, data, insurance_id){
		var sql;
		if(insurance_id){
			sql = "UPDATE insurance set ? where id = " + connection.escape(insurance_id);
		} else {
			sql = "INSERT into insurance set ?";
		}

		return connection.queryAsync(sql, data);

	},

	delete: function(connection, insurance_id){

		var sql = "UPDATE products set status = 0 where id = (select product_id from insurance where id = " + connection.escape(insurance_id) + ")";

		return connection.queryAsync(sql);

	},

};