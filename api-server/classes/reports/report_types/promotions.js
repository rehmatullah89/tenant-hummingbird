'use strict';
var BaseReport = require(__dirname + '/base_report.js');

class PromotionsReport extends BaseReport{
  constructor(connection, company, filters, format, name, properties = []) {
    super(connection, company, filters, format, name, properties);

    this.sql_fragments = sql_fragments;
    this.config =  JSON.parse(JSON.stringify(config));
    this.sql_tables += ' promotions ';
    this.sql_conditions = ' WHERE status = 1 and (select company_id from properties where id = (select property_id from units where id = (select unit_id from leases where id = payments.lease_id ))) = ' + this.company.id

    if(properties.length){
    //  this.sql_conditions += ' and (select property_id from units where id = (select unit_id from leases where id = payments.lease_id ) in (' + properties.join(', ') + ")";
    }




  }
}

const sql_fragments = require(__dirname + '/../report_queries/promotions.js');
const config = require(__dirname + '/../report_layouts/promotions.js');
module.exports = PromotionsReport;
