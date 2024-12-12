'use strict';
var BaseReport = require(__dirname + '/base_report.js');



let lease_id            = " l.id ";
let unit_id             =  " l.unit_id ";
let property_id         = " (select property_id from units where id = " + unit_id +  ") ";
let contact_id          = " (SELECT MIN(contact_id) FROM contact_leases WHERE lease_id = " + lease_id + " ) ";
let address_id          = " (select address_id from properties where id = " + property_id + ") ";
let category_id         = ' (SELECT category_id from units where id = ' + unit_id + ') ';
// TODO this should be set as "primary tenant"
let tenant_id           = ' (SELECT MIN(contact_id) from contact_leases where lease_id = ' + lease_id + ') ';
let lead_id             = ' (SELECT id from leads where contact_id = ' + contact_id + ' and lease_id = ' + lease_id + ') '; 
let touchpoints_id      = ' (SELECT touchpoint_id from leads where contact_id = ' + contact_id + ') ';
let last_payment_id     = " (select payment_id from invoices_payments where invoice_id in (select id from invoices where lease_id = " + lease_id + ") HAVING(MAX(created))) )";
let reservation_id      = "(select id from reservations where lease_id = " + lease_id + ") ";

class RateChangeReport extends BaseReport{
  constructor(connection, company, filters, format, name, properties = [],report_name) {
    super(connection, company, filters, format, name, properties,report_name);


    let lease = new reportQueries.Lease({id: lease_id},this.report_dates.end, this.report_dates.start);
    let tenant = new reportQueries.Tenant({id: contact_id},this.report_dates.end);

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
      tenant.queries,
      unit.queries,
      lease.queries,
      property.queries,
      category.queries,
      // property_address.queries,
    );



    this.config.name = 'Active Tenants';
    this.config.filename =  'active_tenants';

    this.config.column_structure = [].concat(
      Object.values(Fields.property),
      Object.values(Fields.lead),
      Object.values(Fields.unit),
      Object.values(Fields.tenant),
      Object.values(Fields.tenant_summary),
      Object.values(Fields.lease),
      Object.values(Fields.lease_summary),
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
      'lease_rent_variance_prct',
      'lease_lifetime_payments',
      'unit_number',
      'unit_size',
    ];

    this.sql_tables += ' leases l ';
    this.sql_conditions = ' WHERE l.status = 1 and start_date <= CURDATE() and ( end_date > CURDATE() or end_date is null) and (select company_id from properties where id = (select property_id from units where id = l.unit_id )) = ' + this.company.id
    if(properties.length){
      this.sql_conditions += ' and (select property_id from units where id = l.unit_id ) in (' + properties.join(', ') + ")";
    }
    this.property_id = '(select property_id from units where id = l.unit_id )';

  }


  setFilterConditions(connection, conditions, structure, columns, sql_fragments ){

    if(conditions.report_period){
      this.sql_conditions += this.setTimeframes(conditions.report_period, " select date from payments where id = ip.payment_id ");
    }

    if(conditions.rate_change_id){
      this.sql_conditions += ` and l.id in (select lease_id from rent_change_leases where deleted_at is null and rate_change_id = ${conditions.rate_change_id})`;
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
module.exports = RateChangeReport;

