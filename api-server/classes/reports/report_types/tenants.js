'use strict';
var BaseReport = require(__dirname + '/base_report.js');



let lease_id            = " l.id ";
let unit_id             = " u.id ";
let property_id         = " u.property_id ";
let contact_id          = " (SELECT contact_id FROM contact_leases WHERE lease_id = " + lease_id + " and `primary` = 1) ";
let address_id          = " (select address_id from properties where id = " + property_id + ") ";
let category_id         = ' u.category_id ';
// TODO this should be set as "primary tenant"
let tenant_id           = ' (SELECT contact_id from contact_leases where lease_id = ' + lease_id + ' and `primary` = 1) '; 
let lead_id             = ' (SELECT id from leads where contact_id = ' + contact_id + ' and lease_id = ' + lease_id + ' order by id desc limit 1) ';
let touchpoints_id      = ' (SELECT touchpoint_id from leads where contact_id = ' + contact_id + ' and lease_id = ' + lease_id + ' order by id desc limit 1) ';
let last_payment_id     = " (select payment_id from invoices_payments where invoice_id in (select id from invoices where lease_id = " + lease_id + ") HAVING(MAX(created))) )";
let reservation_id      = "(select id from reservations where lease_id = " + lease_id + ") ";

class TenantsReport extends BaseReport{
  constructor(connection, company, filters, format, name, properties = [],report_name) {
    super(connection, company, filters, format, name, properties,report_name);

    let lease = new reportQueries.Lease({ id: lease_id, property_id },this.report_dates.end, this.report_dates.start);
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
      Object.values(Fields.lead_summary),
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
      'unit_number',
      'tenant_name',
      'tenant_phone',
      'lease_start_date',
      'lease_rent',
      'unit_size',
      'unit_category',
      'unit_price',
      'lease_standing',
      'lease_balance',
      "lease_created_by",
      "lease_rent_plan_status"
    ];

    this.base_table = 'l';
    this.tables = {
      leases: 'l',
      units: 'u'
    };

    this.sql_tables += `
      leases l
        inner join units u on u.id = l.unit_id
    `;

    this.sql_conditions = `
      WHERE l.status = 1
        and ( l.end_date > CURDATE() or l.end_date is null)
        AND u.number != "POS$"
    `;

    if(properties.length){
      this.sql_conditions += ` and u.property_id in (${properties.join(', ')})`;
    } else {
      this.sql_conditions += ` and (select company_id from properties where id = u.property_id) = ${this.company.id}`;
    }

    this.property_id = 'u.property_id';
  }


  setFilterConditions(connection, conditions, structure, columns, sql_fragments ){

    if(conditions.report_period){
      this.sql_conditions += this.setTimeframes(conditions.report_period, " select date from payments where id = ip.payment_id ");
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
module.exports = TenantsReport;

