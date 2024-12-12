'use strict';
var BaseReport = require(__dirname + '/base_report.js');



let id                  = " rcl.id ";
let lease_id            = " rcl.lease_id ";
let rate_change_id      = " rcl.rate_change_id ";
let unit_id             =  " (select unit_id from leases where id = " + lease_id + ")";
let property_id         = " (select property_id from rate_changes where id = " + rate_change_id +  ") ";
let contact_id          = " (SELECT MIN(contact_id) FROM contact_leases WHERE lease_id = " + lease_id + " ) ";
let address_id          = " (select address_id from properties where id = " + property_id + ") ";
let category_id         = ' (SELECT category_id from units where id = ' + unit_id + ') ';
// TODO this should be set as "primary tenant"
let tenant_id           = ' (SELECT MIN(contact_id) from contact_leases where lease_id = ' + lease_id + ') '; 
let lead_id             = ' (SELECT id from leads where contact_id = ' + contact_id + ' and lease_id = ' + lease_id + ' ) ';
let touchpoints_id      = ' (SELECT touchpoint_id from leads where contact_id = ' + contact_id + ') ';
let last_payment_id     = " (select payment_id from invoices_payments where invoice_id in (select id from invoices where lease_id = " + lease_id + ") HAVING(MAX(created))) )";
let reservation_id      = "(select id from reservations where lease_id = " + lease_id + ") ";

class RateChangeSelectedTenantsReport extends BaseReport{
  constructor(connection, company, filters, format, name, properties = [],report_name) {
    super(connection, company, filters, format, name, properties,report_name);


    let lease = new reportQueries.Lease({id: lease_id},this.report_dates.end, this.report_dates.start);
    let tenant = new reportQueries.Tenant({id: contact_id},this.report_dates.end);
    let rent_change = new reportQueries.RentChange({id: id, lease_id: lease_id}, this.report_dates.end);

    let lead = new reportQueries.Lead({
      id: lead_id,
      contact_id,
      category_id,
      property_id,
      unit_id,
      reservation_id,
      touchpoints_id


    },this.report_dates.end);
    let property = new reportQueries.Property({id: property_id},this.report_dates.end);
    let unit = new reportQueries.Unit({id: unit_id},this.report_dates.end);
    let category = new reportQueries.UnitCategory({id: category_id},this.report_dates.end);
    let property_address = new reportQueries.PropertyAddress({id: address_id},this.report_dates.end);

    this.sql_fragments = Object.assign({},
      new reportQueries.Tenant({id: tenant_id},this.report_dates.end).queries,
      // new reportQueries.Lead({id: tenant_id}).queries,
      lead.queries,
      rent_change.queries,
      tenant.queries,
      unit.queries,
      lease.queries,
      property.queries,
      category.queries,
      // property_address.queries,
    );



    this.config.name = 'Rent Changes';
    this.config.filename =  'rent_changes';

    // Overwrite name for rent to Old Rent

 // Overwrite name for rent to Old Rent
 var fields = JSON.parse(JSON.stringify(Fields));
 fields.lease.lease_rent.label = 'Old Rent';

 this.config.column_structure = [].concat(
   Object.values(fields.property),
   Object.values(fields.lead),
   Object.values(fields.unit),
   Object.values(fields.rent_change),
   Object.values(fields.tenant),
   Object.values(fields.tenant_summary),
   Object.values(fields.lease),
   Object.values(fields.lease_summary),
 );




    // this.config.filter_structure = [{
    //   label: "Report Period",
    //   key: "report_period",
    //   input: "timeframe"
    // }];

    this.config.filters.sort = {
      field: 'unit_number',
      dir: 'ASC'
    };

    this.config.default_columns = [
      'tenant_name',
      'lease_days_since_rent_change',
      'unit_price',
      'lease_rent',
      'change_new_rent',
      'change_amt',
      'change_change_prct',
      'lease_lifetime_payments',
      'unit_number',
      'unit_size',
    ];

    this.sql_tables += ' rent_change_leases rcl ';
    this.sql_conditions = ' WHERE rcl.deleted_at is null  and rate_change_id in (select id from rate_changes where property_id in (select id from properties where company_id = ' + this.company.id + ' )) ';
    if(properties.length){
      this.sql_conditions += ' and (select property_id from rate_changes where id = rcl.rate_change_id ) in (' + properties.join(', ') + ")";
    }
    this.property_id = '(select property_id from rate_changes where id = rcl.rate_change_id )'

  }


  setFilterConditions(connection, conditions, structure, columns, sql_fragments ){

    if(conditions.rate_change_id){
      this.sql_conditions += ` and rcl.rate_change_id = ${conditions.rate_change_id}`;
    }

    if(conditions.property_id){
      this.sql_conditions += ` and (${property_id}= ${conditions.property_id})`;
    }
  }

  setAdditionalConditions(connection, conditions, structure, columns, sql_fragments){
    for(let c in conditions){
      if(c === 'name' && conditions[c].trim().length){
        this.sql_conditions += ' and ( ' + sql_fragments['tenant_first'] + ' = ' + connection.escape(conditions[c]) +  ' or ' +
          sql_fragments['tenant_last'] + ' = ' + connection.escape(conditions[c]) + ') ';
      }
    }
  }

}

const reportQueries = require(__dirname + '/../report_queries');
const Fields = require('../report_fields/index').fields;
module.exports = RateChangeSelectedTenantsReport;

