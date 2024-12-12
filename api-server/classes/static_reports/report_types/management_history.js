'use strict'

var BaseStaticReport = require(__dirname + '/base_static_report.js');
var moment = require('moment');
var utils = require("../report_utils/utils");
var e = require('../../../modules/error_handler.js');
var Property  = require('../../../classes/property.js');
var Report = require('../../report.js');
var main_utils = require(__dirname + '/../../../modules/utils.js');
var msrModels = require(__dirname + '/../../../models/msr');
var XLSX = require("xlsx-color");
var ManagementHistory = require(__dirname + '/../../reports/managementHistory.js');

class ManagementHistoryReport extends BaseStaticReport {
  constructor(configuration) {
    super(configuration.data, configuration.report_name, configuration.template);
    this.start_date = configuration.date;
    this.end_date = configuration.end_date;
    this.property_id = configuration.property_id;
    this.company = configuration.company;
    this.connection = configuration.connection;
    this.multiple_tables = true;
    this.month_range = [];
    this.Property = {};
    this.data = {};
  }

  async getData() { 
    if(!this.property_id) e.th(400, "Please enter a property id ");
    if(!this.start_date || !moment(this.start_date, 'YYYY-MM-DD', true).isValid()) e.th(400, "Please enter a date for this report ");
    
    this.Property = new Property({id: this.property_id});
    await this.Property.find(this.connection)
    await this.Property.getPhones(this.connection);

    let payload = {company: this.company, start_date: this.start_date, properties: [this.property_id]}
    let report = new ManagementHistory(this.connection, payload);
    this.month_range = report.getRange('month', 13);
    this.data.columns = [{metric: 'Metric', ...this.month_range}];
    await report.generate();
   
  
    // Payments
    this.data.deposits = [
      report.deposits.cash, 
      report.deposits.check, 
      report.deposits.gift_card,
      report.deposits.ach, 
      report.deposits.card,
      report.deposits.subtotal,
      report.deposits.reversals.reversals,
      report.deposits.reversals.nsf,
      report.deposits.reversals.chargebacks,
      report.deposits.reversals.ach,
      report.deposits.reversals.subtotal,
      report.deposits.total
    ];
    this.data.deposits = this.addSuperHeader(this.data.deposits, 'Payments');

    // Deposits by Product
    this.data.revenue_by_products = [
      report.revenue_by_products.rent, 
      report.revenue_by_products.coverage, 
      report.revenue_by_products.fee, 
      report.revenue_by_products.merchandise,
      report.revenue_by_products.deposits,
      report.revenue_by_products.auction,
      report.revenue_by_products.tax,
      report.revenue_by_products.total
    ];
    this.data.revenue_by_products = this.addSuperHeader(this.data.revenue_by_products, 'Deposits by Product');


    //Invoices/Accrual Income
    this.data.revenue = [
      report.revenue.rent, 
      report.revenue.coverage, 
      report.revenue.fee, 
      report.revenue.merchandise,
      report.revenue.deposits,
      report.revenue.auction,
      report.revenue.tax,
      report.revenue.total
    ];
    this.data.revenue = this.addSuperHeader(this.data.revenue, 'Invoices/Accrual Income');

    //Allowances
    this.data.allowances = [
      report.discounts.discount, 
      report.write_offs.write_offs,
      report.disc_wrt_total.total
    ];
    this.data.allowances = this.addSuperHeader(this.data.allowances, 'Allowances');

    //Credits and Adjustments
    this.data.credits_and_adjustments = [
      report.credits_and_adjustments.credits, 
      report.credits_and_adjustments.transfer,
      report.credits_and_adjustments.auction,
      report.credits_and_adjustments.move_out,
      report.credits_and_adjustments.security_deposit,
      report.credits_and_adjustments.cleaning_deposit,
      report.credits_and_adjustments.total
    ];
    this.data.credits_and_adjustments = this.addSuperHeader(this.data.credits_and_adjustments, 'Credits and Adjustments');

    //Pre-paid Liabilities
    this.data.prepaid_liabilities = [
      report.prepaid_liabilities.rent, 
      report.prepaid_liabilities.coverage,
      report.prepaid_liabilities.fee,
      report.prepaid_liabilities.merchandise,
      report.prepaid_liabilities.deposits,
      report.prepaid_liabilities.tax,
      report.prepaid_liabilities.total
    ];
    this.data.prepaid_liabilities = this.addSuperHeader(this.data.prepaid_liabilities, 'Pre-paid Liabilities');

    //Liability Recognition
    this.data.liability_recognition = [
      report.liability_recognition.rent, 
      report.liability_recognition.coverage,
      report.liability_recognition.fee,
      report.liability_recognition.merchandise,
      report.liability_recognition.deposits,
      report.liability_recognition.tax,
      report.liability_recognition.total
    ];
    this.data.liability_recognition = this.addSuperHeader(this.data.liability_recognition, 'Liability Recognition');

    //Accounts Receivable
    this.data.account_receivable = [
      report.account_receivable.rent, 
      report.account_receivable.coverage,
      report.account_receivable.fee,
      report.account_receivable.merchandise,
      report.account_receivable.deposits,
      report.account_receivable.auction,
      report.account_receivable.tax,
      report.account_receivable.total
    ];
    this.data.account_receivable = this.addSuperHeader(this.data.account_receivable, 'Accounts Receivable');

    //Rental Activity
    this.data.rental_activity = [
      report.rental_activity.move_ins,
      report.rental_activity.move_outs,
      report.rental_activity.net_rental_activity,
      report.rental_activity.transfers,
      report.rental_activity.reservations
    ]
    this.data.rental_activity = this.addSuperHeader(this.data.rental_activity, 'Rental Activity');

    this.data.lead_activity = [
      report.lead_activity.web_leads,
      report.lead_activity.walk_in_leads,
      report.lead_activity.phone_leads,
      report.lead_activity.other_leads,
      report.lead_activity.total_leads,
      report.lead_activity.leads_converted
    ]
    this.data.lead_activity = this.addSuperHeader(this.data.lead_activity, 'Lead Activity');

    this.data.performance_indicators = [
      report.autopay_enrollment.count,
      report.insurance_enrollment.count,
      report.overlocked_spaces.count,
      report.rent_unchanged.count
    ];
    this.data.performance_indicators = this.addSuperHeader(this.data.performance_indicators, 'Performance Indicators');

    //Occupancy by count
    this.data.occupancy_by_count = [
      report.occupancy_by_count.occupied_count,
      report.occupancy_by_count.vacant_count,
      report.occupancy_by_count.complimentary_count,
      report.occupancy_by_count.reserved_count,
      report.occupancy_by_count.total_count
    ]
    this.data.occupancy_by_count = this.addSuperHeader(this.data.occupancy_by_count, 'Occupancy by Count');

    //Occupancy by Percentage(%)
    this.data.occupancy_by_percentage = [
      report.occupancy_by_percentage.occupied,
      report.occupancy_by_percentage.vacant,
      report.occupancy_by_percentage.complimentary,
      report.occupancy_by_percentage.reserved,
      report.occupancy_by_percentage.total
    ]
    this.data.occupancy_by_percentage = this.addSuperHeader(this.data.occupancy_by_percentage, 'Occupancy by Percentage(%)');

    //Occupancy by SQ FT
    this.data.occupancy_by_sqft = [
      report.occupancy_by_sqft.occupied_sqft,
      report.occupancy_by_sqft.vacant_sqft,
      report.occupancy_by_sqft.complimentary_sqft,
      report.occupancy_by_sqft.reserved_sqft,
      report.occupancy_by_sqft.total_sqft
    ]
    this.data.occupancy_by_sqft = this.addSuperHeader(this.data.occupancy_by_sqft, 'Occupancy by SQ FT');

    //Occupancy by SQ FT Percentage(%)
    this.data.occupancy_by_sqft_percentage = [
      report.occupancy_by_sqft_percentage.occupied_sqft_percent,
      report.occupancy_by_sqft_percentage.vacant_sqft_percent,
      report.occupancy_by_sqft_percentage.complimentary_sqft_percent,
      report.occupancy_by_sqft_percentage.reserved_sqft_percent,
      report.occupancy_by_sqft_percentage.total_sqft_percent
    ]
    this.data.occupancy_by_sqft_percentage = this.addSuperHeader(this.data.occupancy_by_sqft_percentage, 'Occupancy by SQ FT Percentage(%)');

    this.data.delinquency_by_amount = [
      report.delinquency_by_amount.delinquent_amount_10,
      report.delinquency_by_amount.delinquent_amount_30,
      report.delinquency_by_amount.delinquent_amount_60,
      report.delinquency_by_amount.delinquent_amount_90,
      report.delinquency_by_amount.delinquent_amount_120,
      report.delinquency_by_amount.delinquent_amount_180,
      report.delinquency_by_amount.delinquent_amount_360,
      report.delinquency_by_amount.delinquent_amount_gtr_360,
      report.delinquency_by_amount.total,
      report.delinquency_by_amount.total_gtr_30,
    ]
    this.data.delinquency_by_amount = this.addSuperHeader(this.data.delinquency_by_amount, 'Delinquency by Days ($)');

    this.data.delinquency_by_count = [
      report.delinquency_by_count.delinquent_count_10,
      report.delinquency_by_count.delinquent_count_30,
      report.delinquency_by_count.delinquent_count_60,
      report.delinquency_by_count.delinquent_count_90,
      report.delinquency_by_count.delinquent_count_120,
      report.delinquency_by_count.delinquent_count_180,
      report.delinquency_by_count.delinquent_count_360,
      report.delinquency_by_count.delinquent_count_gtr_360,
      report.delinquency_by_count.total,
      report.delinquency_by_count.total_gtr_30,
    ]
    this.data.delinquency_by_count = this.addSuperHeader(this.data.delinquency_by_count, 'Delinquency by Days (Number of Leases)');

    this.data.delinquency_by_percentage = [
      report.delinquency_by_percentage.delinquent_percentage_10,
      report.delinquency_by_percentage.delinquent_percentage_30,
      report.delinquency_by_percentage.delinquent_percentage_60,
      report.delinquency_by_percentage.delinquent_percentage_90,
      report.delinquency_by_percentage.delinquent_percentage_120,
      report.delinquency_by_percentage.delinquent_percentage_180,
      report.delinquency_by_percentage.delinquent_percentage_360,
      report.delinquency_by_percentage.delinquent_percentage_gtr_360,
      report.delinquency_by_percentage.total,
      report.delinquency_by_percentage.total_gtr_30,
    ]
    this.data.delinquency_by_percentage = this.addSuperHeader(this.data.delinquency_by_percentage, 'Delinquency by Days (% Occupancy)');

    this.data.rent_change_count = [
      report.rent_change_count.less_than_six_months,
      report.rent_change_count.six_to_twelve_months,
      report.rent_change_count.twelve_to_eighteen_months,
      report.rent_change_count.eighteen_to_twenty_four_months,
      report.rent_change_count.gtr_than_twenty_four_months,
      report.rent_change_count.total,
    ]
    this.data.rent_change_count = this.addSuperHeader(this.data.rent_change_count, 'Rent Change Number of Leases');

    this.data.rent_change_variance = [
      report.rent_change_variance.less_than_six_months,
      report.rent_change_variance.six_to_twelve_months,
      report.rent_change_variance.twelve_to_eighteen_months,
      report.rent_change_variance.eighteen_to_twenty_four_months,
      report.rent_change_variance.gtr_than_twenty_four_months,
      report.rent_change_variance.total,
    ]
    this.data.rent_change_variance = this.addSuperHeader(this.data.rent_change_variance, 'Rent Change $ Variance');

    this.data.rent_change_variance_percentage = [
      report.rent_change_variance_percentage.less_than_six_months,
      report.rent_change_variance_percentage.six_to_twelve_months,
      report.rent_change_variance_percentage.twelve_to_eighteen_months,
      report.rent_change_variance_percentage.eighteen_to_twenty_four_months,
      report.rent_change_variance_percentage.gtr_than_twenty_four_months,
      report.rent_change_variance_percentage.total,
    ]
    this.data.rent_change_variance_percentage = this.addSuperHeader(this.data.rent_change_variance_percentage, 'Rent Change % Variance');
  }

  


  setWorkSheet() {
    let styles = []
    let fields = this.getFields();
    let origin = {metrics: {r:3, c:0}, deposits: {r:4, c:0}};
    let tables = [  'deposits', 
                    'revenue_by_products',
                    'revenue',
                    'allowances',
                    'credits_and_adjustments',
                    'prepaid_liabilities',
                    'liability_recognition',
                    'account_receivable',
                    'rental_activity',
                    'lead_activity',
                    'occupancy_by_count',
                    'occupancy_by_percentage',
                    'occupancy_by_sqft',
                    'occupancy_by_sqft_percentage',
                    'performance_indicators',
                    'delinquency_by_amount',
                    'delinquency_by_count',
                    'delinquency_by_percentage',
                    'rent_change_count',
                    'rent_change_variance',
                    'rent_change_variance_percentage'
                  ]
    let relative_origins = utils.calculateOrigins(this.data, tables, 1, origin['deposits']);
    let overall_styles = [{"font-name": {name: "Arial"}}, {"bold": {bold: true}}, {"font-size": {size: 10}}, {"border": {"border_style": { direction: "outside-all", value: {"style": "thin", "color": { "rgb": "000000" }}}}}];

    let cell_styles = [{"font-name": {name: "Arial"}}, {"font-size": {size: 10}}, {"bold": {bold: true}}];
    styles['metrics'] = utils.applyStyleToWhole(cell_styles, [{row_count: 0, col_count: 14, origin: origin['metrics']}]);

    //Payment styling
    //header
    cell_styles = [{"color": {color: "D9EAD3"}}, {"bold-header": {bold: true}}]
    let table_header_style = utils.applyStyleToWhole(cell_styles, [{row_count: 0, col_count: 0, origin: origin['deposits']}]);

    //table styling
    let row_count = this.data.deposits.length;
    let position = {r: origin['deposits'].r + 1, c: origin['deposits'].c}
    styles['deposits'] = utils.applyStyleToWhole(overall_styles, [{row_count, col_count: 0, origin: position}]);
    
    position.r -= 1;
    let cell_alignment = utils.setupStyleObjectOfCell(this.data['deposits'], fields, "metric", { name: 'Subtotal' , cells: "one"}, { ["alignment"] : {direction: 'horizontal', value: 'right'}}, position)
    styles['deposits'] = {...styles['deposits'], ...table_header_style, alignment: cell_alignment}

    position.r += 5;
    cell_alignment = utils.setupStyleObjectOfCell(this.data['deposits'], fields, "metric", { name: 'Subtotal' , cells: "one"}, { ["alignment"] : {direction: 'horizontal', value: 'right'}}, position)
    styles['deposits']['alignment'].push(cell_alignment[0]);

    position.r -= 5;
    cell_alignment = utils.setupStyleObjectOfCell(this.data['deposits'], fields, "metric", { name: 'Total' , cells: "one"}, { ["alignment"] : {direction: 'horizontal', value: 'right'}}, position)
    styles['deposits']['alignment'].push(cell_alignment[0]);

    // Styling for rest of the tables
    for(let i=1; i<tables.length; i++) {
      let table = tables[i];

      table_header_style = utils.applyStyleToWhole(cell_styles, [{row_count: 0, col_count: 0, origin: relative_origins[table]}]);

      row_count = this.data[table].length;
      position = {r: relative_origins[table].r + 1, c: relative_origins[table].c}
      styles[table] = utils.applyStyleToWhole(overall_styles, [{row_count, col_count: 0, origin: position}]);
      
      position.r -= 1;
      cell_alignment = utils.setupStyleObjectOfCell(this.data[table], fields, "metric", { name: 'Total' , cells: "one"}, { ["alignment"] : {direction: 'horizontal', value: 'right'}}, position) || []
      styles[table] = {...styles[table], ...table_header_style, alignment: cell_alignment}  
    }

    //occupancy_by_count
    position = {r: relative_origins['occupancy_by_count'].r + 1, c: relative_origins['occupancy_by_count'].c}
    position.r -= 1;
    cell_alignment = utils.setupStyleObjectOfCell(this.data['occupancy_by_count'], fields, "metric", { name: 'Total Count' , cells: "one"}, { ["alignment"] : {direction: 'horizontal', value: 'right'}}, position)
    styles['occupancy_by_count']['alignment'].push(cell_alignment[0]);
    
    //occupancy_by_percentage
    position = {r: relative_origins['occupancy_by_percentage'].r + 1, c: relative_origins['occupancy_by_percentage'].c}
    position.r -= 1;
    cell_alignment = utils.setupStyleObjectOfCell(this.data['occupancy_by_percentage'], fields, "metric", { name: 'Total %' , cells: "one"}, { ["alignment"] : {direction: 'horizontal', value: 'right'}}, position)
    styles['occupancy_by_percentage']['alignment'].push(cell_alignment[0]);

     //occupancy_by_sqft
     position = {r: relative_origins['occupancy_by_sqft'].r + 1, c: relative_origins['occupancy_by_sqft'].c}
     position.r -= 1;
     cell_alignment = utils.setupStyleObjectOfCell(this.data['occupancy_by_sqft'], fields, "metric", { name: 'Total SQ FT' , cells: "one"}, { ["alignment"] : {direction: 'horizontal', value: 'right'}}, position)
     styles['occupancy_by_sqft']['alignment'].push(cell_alignment[0]);

     //occupancy_by_sqft_percentage
     position = {r: relative_origins['occupancy_by_sqft_percentage'].r + 1, c: relative_origins['occupancy_by_sqft_percentage'].c}
     position.r -= 1;
     cell_alignment = utils.setupStyleObjectOfCell(this.data['occupancy_by_sqft_percentage'], fields, "metric", { name: 'Total %SQ FT' , cells: "one"}, { ["alignment"] : {direction: 'horizontal', value: 'right'}}, position)
     styles['occupancy_by_sqft_percentage']['alignment'].push(cell_alignment[0]);

     //lead_activity
     position = {r: relative_origins['lead_activity'].r + 1, c: relative_origins['lead_activity'].c}
     position.r -= 1;
     cell_alignment = utils.setupStyleObjectOfCell(this.data['lead_activity'], fields, "metric", { name: 'Total Leads' , cells: "one"}, { ["alignment"] : {direction: 'horizontal', value: 'right'}}, position)
     styles['lead_activity']['alignment'].push(cell_alignment[0]);

     position = {r: relative_origins['lead_activity'].r + 1, c: relative_origins['lead_activity'].c}
     position.r -= 1;
     cell_alignment = utils.setupStyleObjectOfCell(this.data['lead_activity'], fields, "metric", { name: 'Leads Converted' , cells: "one"}, { ["alignment"] : {direction: 'horizontal', value: 'right'}}, position)
     styles['lead_activity']['alignment'].push(cell_alignment[0]);

    //delinquency
     position = {r: relative_origins['delinquency_by_amount'].r + 1, c: relative_origins['delinquency_by_amount'].c}
     position.r -= 1;
     cell_alignment = utils.setupStyleObjectOfCell(this.data['delinquency_by_amount'], fields, "metric", { name: 'Greater than 30 Days' , cells: "one"}, { ["alignment"] : {direction: 'horizontal', value: 'right'}}, position)
     styles['delinquency_by_amount']['alignment'].push(cell_alignment[0]);

     position = {r: relative_origins['delinquency_by_count'].r + 1, c: relative_origins['delinquency_by_count'].c}
     position.r -= 1;
     cell_alignment = utils.setupStyleObjectOfCell(this.data['delinquency_by_count'], fields, "metric", { name: 'Greater than 30 Days' , cells: "one"}, { ["alignment"] : {direction: 'horizontal', value: 'right'}}, position)
     styles['delinquency_by_count']['alignment'].push(cell_alignment[0]);

     position = {r: relative_origins['delinquency_by_percentage'].r + 1, c: relative_origins['delinquency_by_percentage'].c}
     position.r -= 1;
     cell_alignment = utils.setupStyleObjectOfCell(this.data['delinquency_by_percentage'], fields, "metric", { name: 'Greater than 30 Days' , cells: "one"}, { ["alignment"] : {direction: 'horizontal', value: 'right'}}, position)
     styles['delinquency_by_percentage']['alignment'].push(cell_alignment[0]);

    this.worksheets.push({
      name: 'MHR',
      header: this.setSheetHeader(),
      columns_width: this.getSheetWidth(),

      tables: [
          {
            data: this.data.columns, 
            origin: origin['metrics'],
            styles: styles['metrics']
          },
          {
            data: this.data.deposits,
            origin: origin['deposits'],
            styles: styles['deposits']
          }
      ]
    });

    for(let i=1; i<tables.length; i++){
      let table = tables[i];
      this.worksheets[0].tables.push({
            data: this.data[table],
            origin: relative_origins[table],
            styles: styles[table]
      })
    }
  }

  setSheetHeader() {

    let header = "Management History Report";
    let report_date = main_utils.formatDate(this.start_date);
    let company_name = `${this.company?.name}`
    let property_name = `${this.Property?.number} - ${this.Property?.name}`;

    let workSheet = null;
    workSheet = XLSX.utils.json_to_sheet([{report_name: header}], { skipHeader: true });
    XLSX.utils.sheet_add_json(workSheet, [{report_date}], {origin: {r: 1, c: 1}, skipHeader: true});
    
    XLSX.utils.sheet_add_json(workSheet, [{prop_name: company_name}], {origin: {r: 0, c: 3}, skipHeader: true});
    XLSX.utils.sheet_add_json(workSheet, [{prop_name: property_name}], {origin: {r: 1, c: 3}, skipHeader: true});

    let styles = {
                  'font-size': [ {range: {s: {r:0, c:0}, e: {r:1, c:3}}, size: 10} ],
                  'font-name': [ {range: {s: {r:0, c:0}, e: {r:1, c:3}}, name: 'Arial'} ],  
                }
    this.renderStyles(workSheet, styles);

    workSheet['!merges'] = [      {s:{c:0, r:0}, e: {c:1, r:0}},
                                  {s:{c:3, r:0}, e: {c:4, r:0}},
                                  {s:{c:3, r:1}, e: {c:4, r:1}}
                           ];
    return workSheet;
  }

  populateFields() {
    let fields = this.getFields();

    for(let col in fields) {
      if(col === 'metric') continue
      fields[col].label = this.month_range[col]
    }

    return fields;
  }

  addSuperHeader(data, header) {
    if(!this.data) return;

    let fields = JSON.parse(JSON.stringify(this.getFields()));
    fields.metric.super_header= header;
    let super_header = utils.formatSuperHeader(fields);
    if(!super_header) return

    return [super_header.data, ...data];
  }
}
module.exports = ManagementHistoryReport;
