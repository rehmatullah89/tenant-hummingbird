'use strict';
var BaseReport = require(__dirname + '/base_report.js');

let invoice_id            = " inv.id ";
let lease_id              = " inv.lease_id ";
let unit_id               = " (select unit_id from leases where id = " + lease_id  + ") ";
let tenant_id             = ' inv.contact_id ';

class  DiscountsAndPromotions extends BaseReport{
  constructor(connection, company, filters, format, name, properties = [],report_name) {
    super(connection, company, filters, format, name, properties,report_name);


    let tenant = new reportQueries.Tenant({id: tenant_id},this.report_dates.end);
    let lease = new reportQueries.Lease({id: lease_id},this.report_dates.end, this.report_dates.start);
    let invoice = new reportQueries.Invoice({id: invoice_id},this.report_dates.end);
    let unit = new reportQueries.Unit({id: unit_id},this.report_dates.end);

    this.sql_fragments = Object.assign({},
      tenant.queries,
      unit.queries,
      lease.queries,
      invoice.queries,
    );

    this.config.name = 'Discounts and Promotions';
    this.config.filename =  'discounts_and_promotions';
    this.config.column_structure = [].concat(
      Object.values(Fields.unit),
      Object.values(Fields.tenant),
      Object.values(Fields.tenant_summary),
      Object.values(Fields.lease),
      Object.values(Fields.lease_summary),
      Object.values(Fields.invoice),
      Object.values(Fields.invoice_summary),
    );

    this.config.filter_structure = [{
      label: "Report Period",
      key: "report_period",
      input: "timeframe"
    }];

    this.config.filters.sort = {
      field: 'invoice_date',
      dir: 'DESC'
    };

    this.config.filters.search['report_period'] = {
      days: 0,
      end_date: "",
      label: "This Month",
      period: "",
      relation: "",
      start_date: "",
    }


    this.config.default_columns = [
      'invoice_date',
      'tenant_name',
      'unit_number',
      'unit_size',
      'lease_rent',
      'invoice_total_rent',
      'invoice_discounts',
      'invoice_discounts_names',
      'invoice_discounts_descriptions'     
    ];


    this.sql_tables += ' invoices inv ';
    this.sql_conditions = ' WHERE (inv.status = 1 or inv.voided_at is not null) and (inv.total_discounts != 0) and (inv.voided_at is null or DATE(inv.voided_at) > ' + connection.escape(this.report_dates.end) + ') and ' +
      ' (select company_id from properties where id = inv.property_id ) = ' + this.company.id;
    if(properties.length){
      this.sql_conditions += ' and inv.property_id in (' + properties.join(', ') + ")";
    }
    this.property_id = 'inv.property_id'

  }

  setFilterConditions(connection, conditions, structure, columns, sql_fragments ){
    if(conditions.report_period){
      this.sql_conditions += this.setTimeframes(conditions.report_period, " inv.due ");
    }

  }
}

const reportQueries = require(__dirname + '/../report_queries');
const Fields = require('../report_fields/index').fields;
module.exports = DiscountsAndPromotions;
