'use strict';
var BaseReport = require(__dirname + '/base_report.js');


let lease_id              = " l.id ";
let auction_id            = ` (SELECT id from lease_auctions where lease_id = ${lease_id} and deleted_at is null having MAX(id))`;
let unit_id               = " l.unit_id ";
let category_id           = ' (SELECT category_id from units where id = ' + unit_id + ') ';
let tenant_id             = ' (SELECT contact_id from contact_leases where lease_id = ' + lease_id + ' and `primary` = 1) ';
let property_id           = " (select property_id from units where id = " + unit_id +  ") ";
let address_id            = " (select address_id from properties where id = " + property_id + ") ";




class  AuctionList extends BaseReport{
  constructor(connection, company, filters, format, name, properties = [],report_name) {
    super(connection, company, filters, format, name, properties,report_name);

    
    let tenant = new reportQueries.Tenant({id: tenant_id},this.report_dates.end);
    let lease = new reportQueries.Lease({id: lease_id},this.report_dates.end, this.report_dates.start);
    let property = new reportQueries.Property({id: property_id},this.report_dates.end);
    let unit = new reportQueries.Unit({id: unit_id},this.report_dates.end);
    let category = new reportQueries.UnitCategory({id: category_id},this.report_dates.end);
    let property_address = new reportQueries.PropertyAddress({id: address_id},this.report_dates.end);
    let lease_auction = new reportQueries.Auction({id: auction_id, lease_id});

    this.sql_fragments = Object.assign({},
      lease.queries,
      tenant.queries,
      // contact.queries,
      unit.queries,
      category.queries,
      // payment.queries,
      // paymentMethod.queries,
      
      //invoice.queries,
      property.queries,
      property_address.queries,
      lease_auction.queries,
    );

    this.config.name = 'Auction Schedule';
    this.config.filename =  'auction_list';
    this.config.column_structure = [].concat(
      Object.values(Fields.auction),
      Object.values(Fields.auction_bidder_info),
      Object.values(Fields.auction_auctioneer_info),
      Object.values(Fields.property),
      Object.values(Fields.unit),
      Object.values(Fields.tenant),
      Object.values(Fields.tenant_summary),
      Object.values(Fields.lease),
      Object.values(Fields.lease_summary),
      
      //Object.values(Fields.invoice),
      //Object.values(Fields.invoice_summary),
      //Object.values(Fields.property_address),
    );

    this.config.filter_structure = [];

    this.config.filters.sort = {
      field: 'id * 1 asc',
      dir: 'ASC'
    };

    this.config.default_columns = [
      'property_name',
      'unit_number',
      'tenant_name',
      'auction_date',
      'lease_auction_status',
      'auction_type',
      'auction_lien_amount',
      'auction_winning_bid',
      'auction_bidder_full_name',
      'auction_tax',
      'auction_tax_exempt',
      'cleaning_deposit',
      'auction_payment_date',
      'auction_buyer_premium_amount',

    ]

    this.sql_tables += ' leases l ';
    this.sql_conditions = ' WHERE l.auction_status is not null and ( end_date > CURRENT_DATE() or end_date is null ) and l.status = 1 and (select company_id from properties where id = (select property_id from units where id = l.unit_id and number != "POS$")) = ' + this.company.id;
    if(properties.length){
      this.sql_conditions += ' and (select property_id from units where id = l.unit_id and number != "POS$") in (' + properties.join(', ') + ")";
    }
    this.property_id = '(select property_id from units where id = l.unit_id and number != "POS$")'
  }

  setFilterConditions(connection, conditions, structure, columns, sql_fragments ){
    if(conditions.report_period){
      this.sql_conditions += this.setTimeframes(conditions.report_period, " (select DATE(scheduled_date) from lease_auctions where deleted_at is null and lease_id = l.id) ");
    }

  }
}

const reportQueries = require(__dirname + '/../report_queries');
const Fields = require('../report_fields/index').fields;
module.exports = AuctionList;
