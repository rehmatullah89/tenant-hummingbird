var Promise         = require('bluebird');
var moment          = require('moment');

var models = {};

module.exports = {


  find(connection, params){
    if(!params.company_id) return false;
    let sql = "Select * from property_groups where company_id = " + connection.escape(params.company_id);
    if(params.search){
      sql += ' and name like ' + connection.escape("%" + params.search + "%");
    }
    return connection.queryAsync(sql);

  },

  findById: function(connection, id, company_id, contain){
    let sql =  "Select * from property_groups where id = " + connection.escape(id);
    if(company_id){
      sql +=  ' and company_id = ' + connection.escape(company_id)
    }
    return connection.queryAsync( sql ).then(res => res.length? res[0]: null)
  },

  findByName: function(connection, name, company_id){


    let sql =  "Select * from property_groups where name = " + connection.escape(name);
    if(company_id){
      sql +=  ' and company_id = ' + connection.escape(company_id)
    }

    return connection.queryAsync( sql );
  },
  save: function(connection, data, id){
    let sql;
    if(id){
      sql = "UPDATE property_groups set ? where id = " + connection.escape(id);
    } else {
      sql = "INSERT into property_groups set ?";
    }
    return connection.queryAsync(sql, data);
  },

  saveProperty(connection, property_id, property_group_id){
    let data = {
      property_id,
      property_group_id
    };

    let sql = "INSERT INTO properties_property_groups SET ? ON DUPLICATE KEY UPDATE id = id ";
    return connection.queryAsync(sql, data);
  },

  deleteProperties(connection, dont_delete ,property_group_id){

    let sql = "DELETE FROM properties_property_groups WHERE property_group_id = " + connection.escape(property_group_id) + " and property_id not in (" +  dont_delete.map(d => connection.escape(d)).join(',') + ")";

    return connection.queryAsync(sql);
  },

  deletePropertyGroup(connection, property_group_id){
    let sql = "UPDATE property_groups set status = 0 WHERE id = " + connection.escape(property_group_id);

    // let sql = "UPDATE property_groups WHERE id = " + connection.escape(property_group_id);

    return connection.queryAsync(sql);
  },

  deletePropertiesFromGroup(connection, property_group_id){

    let sql = "DELETE FROM properties_property_groups WHERE property_group_id = " + connection.escape(property_group_id);

    return connection.queryAsync(sql);
  },


  findProperties(connection, group_id ){

    let sql =  "Select * from properties_property_groups where property_group_id = " + connection.escape(group_id);
    return connection.queryAsync(sql);
  }



};


models  = require(__dirname + '/../models');


