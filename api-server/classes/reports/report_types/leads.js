'use strict';
var BaseReport = require(__dirname + '/base_report.js');


let lead_id             = " l.id ";
let unit_id             =  " l.unit_id ";
let property_id         = " l.property_id ";
let category_id         = ' l.category_id ';
let contact_id          = ' l.contact_id '; 
let address_id          = " (select address_id from properties where id = " + property_id + ") ";
let touchpoints_id      = " l.touchpoint_id ";
let lease_id            = " l.lease_id ";
let reservation_id      = "(select id from reservations where lease_id = " + lease_id + ") ";


class  ActiveLeadsReport extends BaseReport{
  constructor(connection, company, filters, format, name, properties = [],report_name) {
    super(connection, company, filters, format, name, properties,report_name);

    this.sql_fragments = Object.assign({},
      new reportQueries.Lead({
        id: lead_id,
        contact_id,
        category_id,
        property_id,
        unit_id,
        reservation_id,
        touchpoints_id
      }, this.report_dates.end).queries,
      new reportQueries.Unit({id: unit_id},this.report_dates.end).queries,
      new reportQueries.Property({id: property_id},this.report_dates.end).queries,
    );


    this.config.name = 'Active Leads';
    this.config.filename =  'active_leads';

    this.config.column_structure = [].concat(
      Object.values(Fields.property),
      Object.values(Fields.unit),
      Object.values(Fields.lead),
      Object.values(Fields.lead_summary),
      Object.values(Fields.reservation),
    );

    this.config.filters.sort = {
      field: 'lead_created',
      dir: 'DESC'
    };


    this.config.default_columns = [
      'lead_created',
      'lead_name',
      'reservation_time',
      'reservation_expires',
      'lead_email',
      'lead_phone',
      'lead_source',
      'lead_category',
      'lead_created_by_name',
      'lead_type'
    ];

    this.sql_tables += ' leads l ';
    this.sql_conditions = ' WHERE l.status = "active" and (select company_id from contacts where id = l.contact_id ) = ' + this.company.id;
    if(properties.length){
      this.sql_conditions += ' and property_id in (' + properties.join(', ') + ")";
    }
    this.property_id = 'property_id'

  }
}


const reportQueries = require(__dirname + '/../report_queries');
const Fields = require('../report_fields/index').fields;
module.exports = ActiveLeadsReport;



