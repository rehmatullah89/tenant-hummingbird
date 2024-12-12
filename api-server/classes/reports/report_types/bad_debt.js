'use strict';
var BaseReport = require(__dirname + '/base_report.js');


let invoice_line_allocation_id  = " ila.id ";
let invoice_id                  = " ila.invoice_id ";
let lease_id                    = " l.id ";
let auction_id                  = ` (SELECT id from lease_auctions where lease_id = ${lease_id} and deleted_at is null having MAX(id))`;
let unit_id                     = " u.id ";
let property_id                 = " i.property_id ";
let tenant_id                   = " i.contact_id ";



class  InvoiceLinesReport extends BaseReport{
  constructor(connection, company, filters, format, name, properties = []) {
    super(connection, company, filters, format, name, properties);


    this.sql_fragments = Object.assign({},
      new reportQueries.InvoiceLinesAllocation({ id: invoice_line_allocation_id},this.report_dates.end).queries,
      new reportQueries.Invoice({ id: invoice_id}, this.report_dates.end).queries,
      new reportQueries.Lease({ id: lease_id}, this.report_dates.end, this.report_dates.start).queries,
      new reportQueries.Unit({id: unit_id}, this.report_dates.end).queries,
      new reportQueries.Property({id: property_id}, this.report_dates.end).queries,
      new reportQueries.Tenant({id: tenant_id}, this.report_dates.end).queries,
      new reportQueries.Auction({id: auction_id}).queries,
    );


    this.config.name = 'Bad Debt';
    this.config.filename =  'invoice_lines_allocation';

    this.config.column_structure = [].concat(
      Object.values(Fields.invoice_lines_allocation),
      Object.values(Fields.invoice),
      Object.values(Fields.invoice_summary),
      Object.values(Fields.lease),
      Object.values(Fields.lease_summary),
      Object.values(Fields.property),
      Object.values(Fields.unit),
      Object.values(Fields.tenant),
      Object.values(Fields.tenant_summary),
      Object.values(Fields.auction),
      Object.values(Fields.auction_bidder_info),
      Object.values(Fields.auction_auctioneer_info),
    );

    this.config.filter_structure = [{
      label: "Report Period",
      key: "report_period",
      input: "timeframe"
    }];

    this.config.filters.sort = {
      field: 'invoice_line_allocation_date',
      dir: 'DESC'
    };

    this.config.filters.search['report_period'] = {
      days: 0,
      end_date: "",
      label: "This Month",
      period: "",
      relation: "",
      start_date: "",
    };

    this.config.default_columns = [
      'property_name',
      'unit_number',
      'tenant_name',
      'invoice_line_allocation_date',
      'invoice_line_allocation_type',
      'invoice_line_allocation_product',
      //'invoice_line_allocation_GL_code'
      'invoice_line_allocation_amount',
      'invoice_number',
      'invoice_date',
      'lease_end_date',
      'auction_date',
      'payment_accepted_by'
    ];

    this.base_table = 'ila'
    this.tables = {
      invoice_lines_allocation: 'ila',
      invoices_payments_breakdown: 'ipb',
      invoices: 'i',
      leases: 'l',
      units: 'u',
      payments: 'p'
    }

    this.sql_tables += `
      invoice_lines_allocation ila
        inner join invoices_payments_breakdown ipb on ipb.id = ila.invoice_payment_breakdown_id
        inner join invoices i on i.id = ipb.invoice_id
        inner join leases l on l.id = i.lease_id
        inner join units u on u.id = l.unit_id
        inner join payments p on p.id = ipb.payment_id
    `
    this.sql_conditions = ` where p.credit_type = 'loss' and i.status = 1`

    if(properties.length){
      this.sql_conditions += ' and i.property_id in (' + properties.join(', ') + ")";
    }
    else {
      this.sql_conditions += ' and (select company_id from properties where id = i.property_id) = ' + this.company.id;
    }

    this.property_id = 'i.property_id';

  }

  setFilterConditions(connection, conditions, structure, columns, sql_fragments ){
    if(conditions.report_period){
      this.sql_conditions += this.setTimeframes(conditions.report_period, " ila.date ");
    }

  }
}

const reportQueries = require(__dirname + '/../report_queries');
const Fields = require('../report_fields/index').fields;
module.exports = InvoiceLinesReport;
