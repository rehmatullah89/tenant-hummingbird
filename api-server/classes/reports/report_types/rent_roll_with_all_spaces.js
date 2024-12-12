'use strict';
var BaseReport = require(__dirname + '/base_report.js');
var moment = require('moment');

let lease_id            = " l.id ";
let unit_id             = " u.id ";
let property_id         = " u.property_id ";
let contact_id          = " (SELECT contact_id FROM contact_leases WHERE lease_id = " + lease_id + " and `primary` = 1) ";
let category_id         = ' u.category_id ';
let tenant_id           = ' (SELECT contact_id from contact_leases where lease_id = ' + lease_id + ' and `primary` = 1) ';



class RentRollWithAllSpacesReport extends BaseReport{
  constructor(connection, company, filters, format, name, properties = [],report_name) {
    super(connection, company, filters, format, name, properties,report_name);
    
    this.sql_fragments = Object.assign({},
      new reportQueries.Tenant({id: tenant_id}).queries,
      new reportQueries.Unit({id: unit_id}, this.report_dates.end).queries,
      new reportQueries.Lease({id: lease_id}, this.report_dates.end, this.report_dates.start).queries,
      new reportQueries.Property({id: property_id}, this.report_dates.end).queries,
      new reportQueries.Tenant({id: contact_id}, this.report_dates.end).queries,
      new reportQueries.UnitCategory({id: category_id}, this.report_dates.end).queries,
    );

    this.config.column_structure = [].concat(
      Object.values(Fields.property),
      Object.values(Fields.unit),
      Object.values(Fields.tenant),
      Object.values(Fields.tenant_summary),
      Object.values(Fields.lease),
      Object.values(Fields.lease_summary),
    );

    this.config.filter_structure = [{
      label: "Report Date",
      key: "report_date",
      input: "date"

    }];
    
    this.config.default_columns = [
      'unit_number',
      'unit_size',
      'unit_category',
      'unit_status',
      'tenant_name',
      'lease_start_date', 
      "lease_end_date",    
      'unit_price',
      'lease_rent',
      'lease_bill_day',
      'lease_next_billing_date',
      'lease_paid_through_date',
      'lease_balance',
      'lease_prepay_balance',
      'lease_rented_days'
    ];

    this.config.filters.search['report_date'] = moment().format('YYYY-MM-DD');

    this.config.name = 'Rent Roll with All Spaces';
    this.config.filename =  'rent_roll_with_all_spaces';
    this.config.key =  'rent_roll_with_all_spaces';
    
    this.config.filters.sort = {
      field: 'unit_number',
      dir: 'ASC'
    };
    
    this.base_table = 'u'
    this.tables = {
      units: 'u',
      leases: 'l'
    }
  
    this.sql_tables += `
      units u left join leases l on l.unit_id = u.id 
    `
    this.sql_conditions = "where u.deleted is null ";
    if(properties.length){
      this.sql_conditions += ' and u.property_id in (' + properties.join(', ') + ")";
    } else {
      this.sql_conditions += ' and (select company_id from properties where id = u.property_id) = ' + this.company.id;
    }
    
    this.property_id = 'u.property_id';
  
  }

  setFilterConditions(connection, conditions, structure, columns, sql_fragments ){
    
    if(conditions.report_date){
      this.sql_tables+=`  and l.id = (select max(id) from leases l2 where l2.unit_id = u.id and l2.status = 1 AND (l2.start_date <= '${conditions.report_date}' ) 
                              AND (l2.end_date is null OR ( DATE(l2.end_date) >= '${conditions.report_date}' )))`;
      this.sql_conditions += ` and ifnull((select status from unit_status_changes where unit_id = u.id and date <= '${conditions.report_date}' and status in ('activated','deactivated') order by id desc limit 1),'null') <> 'deactivated' `;
                            
    }

  }

}



const reportQueries = require(__dirname + '/../report_queries');
const Fields = require('../report_fields/index').fields;
module.exports = RentRollWithAllSpacesReport;
