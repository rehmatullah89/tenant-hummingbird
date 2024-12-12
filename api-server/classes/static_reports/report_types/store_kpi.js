const BaseStaticReport = require(__dirname + '/base_static_report.js');
var moment = require('moment');
var e = require('../../../modules/error_handler.js');
var msrModels = require(__dirname + '/../../../models/msr');
var Property  = require('../../../classes/property.js');
const utils = require("../report_utils/utils");
var main_utils = require(__dirname + '/../../../modules/utils.js');
const XLSX = require("xlsx-color");

class StoreKPIReport extends BaseStaticReport {
    constructor(configuration) {
        super(configuration.data, configuration.report_name, configuration.template);
        this.date = configuration.date;
        this.end_date = configuration.end_date;
        this.company = configuration.company;
        this.connection = configuration.connection;
        this.properties = configuration.properties;
        this.name = "Store KPI";
    }

    async getData() { 
        let data = [];
        if(!this.date || !moment(this.date, 'YYYY-MM-DD', true).isValid()) e.th(400, "Please enter a date for this report ");

        let properties = await Property.findInBulk(this.connection, this.properties);

        // Util Functions
        let reduceCollection = function (arr, key_attr) {
            let reducedCol = arr.reduce((a, n) => {
              return {
                    ...a,
                    [n[key_attr]]: n
                  }
                }, {}
            )
            
            return reducedCol;
        }

        //Total Units
        let total_units = await msrModels.Activity.totalUnitsByProperty(this.connection, this.end_date, this.properties);
        total_units = total_units?.length && reduceCollection(total_units, 'property_id');

        //Occupied
        let occupied_units = await msrModels.Occupancy.summaryOccupiedUnits(this.connection, this.end_date, this.properties);
        occupied_units = occupied_units?.length && reduceCollection(occupied_units, 'property_id');

        //Projected Income
        let projected_income = await msrModels.ProjectedIncome.getProductRevByProperty(this.connection, this.properties, this.date, this.end_date);
        projected_income = projected_income?.length && reduceCollection(projected_income, 'property_id');

        //Deposits & Refunds
        let deposit_refunds = await msrModels.NetRevenue.summaryNetRevenueByMethod(this.connection, this.date, this.end_date, this.properties);
        deposit_refunds = deposit_refunds?.length && reduceCollection(deposit_refunds, 'property_id');

        //Leads
        let leads = await msrModels.Leads.summaryLeadsByProperty(this.connection, this.date, this.end_date, this.properties);
        leads = leads?.length && reduceCollection(leads, 'property_id');

        //Move Ins
        let move_ins = await msrModels.Activity.summaryMoveInsByProperty(this.connection, this.properties, this.date, this.end_date);
        move_ins = move_ins?.length && reduceCollection(move_ins, 'property_id');

        //Move Outs
        let move_outs = await msrModels.Activity.summaryMoveOutsByProperty(this.connection, this.properties, this.date, this.end_date);
        move_outs = move_outs?.length && reduceCollection(move_outs, 'property_id');

        //Deposit & Refunds by Product Type
        let deposit_refunds_prod = await msrModels.DepositsRefunds.summaryProductTypeByProperty(this.connection, this.properties, this.date, this.end_date);
        deposit_refunds_prod = deposit_refunds_prod?.length && reduceCollection(deposit_refunds_prod, 'property_id');

        //Coverage %
        let covered_units = await msrModels.Insurance.summaryInsurance(this.connection, this.end_date, this.properties);
        covered_units = covered_units?.length && reduceCollection(covered_units, 'property_id');

        //AutoPay %
        let auto_pay_units = await msrModels.AutoPay.summaryAutoPay(this.connection, this.end_date, this.properties);
        auto_pay_units = auto_pay_units?.length && reduceCollection(auto_pay_units, 'property_id');

        //No Rent Change >365 days
        let rent_un_changes = await msrModels.RentUnChange.summarizedRentUnchanged(this.connection, this.end_date, this.properties);
        rent_un_changes = rent_un_changes?.length && reduceCollection(rent_un_changes, 'property_id');

        //Delinquency
        let delinquency_amount = await msrModels.Delinquencies.summaryDelinquentAmount(this.connection, this.end_date, this.properties);
        delinquency_amount = delinquency_amount?.length && reduceCollection(delinquency_amount, 'property_id');
        let delinquency_count = await msrModels.Delinquencies.summaryDelinquentCount(this.connection, this.end_date, this.properties);
        delinquency_count = delinquency_count?.length && reduceCollection(delinquency_count, 'property_id');

        //Account Receivable
        let account_receivable = await msrModels.AccountReceivable.getAccountReceivableByProperty(this.connection, this.properties, this.date, this.end_date);
        account_receivable = account_receivable?.length && reduceCollection(account_receivable, 'property_id');

        //Allowances
        let credits_writeoffs = await msrModels.Allowances.summarizedAllowanceByProperty(this.connection, this.properties, this.date, this.end_date);
        credits_writeoffs = credits_writeoffs?.length && reduceCollection(credits_writeoffs, 'property_id');

        //Discounts
        let discounts = await msrModels.Allowances.getDiscountByProperty(this.connection, this.properties, this.date, this.end_date, ['discount']);
        discounts = discounts?.length && reduceCollection(discounts, 'property_id');
        let promotions = await msrModels.Allowances.getDiscountByProperty(this.connection, this.properties, this.date, this.end_date, ['promotion']);
        promotions = promotions?.length && reduceCollection(promotions, 'property_id');

        //Initialize Total Row
        let total_row = {};
        for(const field in this.getFields()) {
            total_row = { ...total_row, [field]: 0 }
        };
        total_row = {
            ...total_row,
            total_units_sqft: 0,
            total_units_baserent: 0,
            occupied_units_sqft: 0,
            occupied_units_rent: 0,
            occupied_units_base_rent: 0,
            coverage_units: 0,
            auto_pay_units: 0
        }
        total_row.property_name = 'Grand Total';

        for(let i = 0; i < properties.length; i++){
            let row = {};
            let property = properties[i];
            row.property_id = property.id;
            row.property_name = property.name;

            //Total Units
            let total_unit_ = total_units[property.id] || {};
            total_row.total_units += row.total_units = parseInt(total_unit_.total_ || 0);
            total_row.total_units_sqft += row.total_units_sqft = parseFloat(total_unit_.total_sqft_ || 0);
            total_row.total_units_baserent += row.total_units_baserent = parseFloat(total_unit_.total_baserent_ || 0);

            //Occupied Units
            let occupied_unit_ = occupied_units[property.id] || {};
            total_row.occupied_units += row.occupied_units = parseInt(occupied_unit_.occupied_ || 0);
            total_row.occupied_units_sqft += row.occupied_units_sqft = parseFloat(occupied_unit_.occupied_sqft_ || 0);
            total_row.occupied_units_rent += row.occupied_units_rent = parseFloat(occupied_unit_.occupied_rent_ || 0),
            total_row.occupied_units_base_rent += row.occupied_units_base_rent = parseFloat(occupied_unit_.occupied_base_rent_ || 0);

            //Deposits & Refunds
            let dep_ref_ = deposit_refunds[property.id] || {};
            total_row.card_ach += row.card_ach = (dep_ref_.pay_card || 0) + (dep_ref_.pay_ach || 0);
            total_row.cash += row.cash = dep_ref_.pay_cash || 0;
            total_row.check += row.check = dep_ref_.pay_check || 0;
            total_row.giftcard += row.giftcard = dep_ref_.pay_giftcard || 0;
            total_row.refund += row.refund = (dep_ref_.refund && Math.abs(dep_ref_.refund)) || 0;

            //Projected Income
            let projected_income_ = projected_income[property.id] || {};
            total_row.proj_rent += row.proj_rent = parseInt(projected_income_.rent_amount || 0);
            total_row.proj_insurance += row.proj_insurance = projected_income_.insurance_amount || 0;
            total_row.proj_fee += row.proj_fee = projected_income_.fee_amount || 0;
            total_row.proj_merchandise += row.proj_merchandise = projected_income_.merchandise_amount || 0;
            total_row.proj_other += row.proj_other = projected_income_.other_amount || 0;
            total_row.proj_total += row.proj_total = row.proj_rent + row.proj_insurance + row.proj_fee + row.proj_merchandise;

            //Leads
            let lead_ = leads[property.id] || {};
            total_row.lead_count += row.lead_count = lead_.lead_count || 0;

            //Move Ins
            let move_in_ = move_ins[property.id] || {};
            total_row.move_in_count += row.move_in_count = move_in_.move_in_count || 0;

            //Move Outs
            let move_out_ = move_outs[property.id] || {};
            total_row.move_out_count += row.move_out_count = move_out_.move_out_count || 0;

            //Coverage $
            let dep_ref_prod_ = deposit_refunds_prod[property.id] || {};
            total_row.coverage_amount += row.coverage_amount = dep_ref_prod_.insurance || 0;

            //Coverage #
            let covered_unit_ = covered_units[property.id] || {};
            total_row.coverage_units += row.coverage_units = parseInt(covered_unit_.insurance_ || 0);

            //AutoPay #
            let auto_pay_unit_ = auto_pay_units[property.id] || {};
            total_row.auto_pay_units += row.auto_pay_units = parseInt(auto_pay_unit_.autopay_ || 0);

            //No Rent Change >365 days
            let rent_un_change_ = rent_un_changes[property.id] || {};
            total_row.rent_un_change_count += row.rent_un_change_count = rent_un_change_.rentunchanged_ || 0;

            //Delinquency
            let delinquency_amount_ = delinquency_amount[property.id] || {};
            total_row.delinquent_30_amount += row.delinquent_30_amount = parseFloat(delinquency_amount_.owed_0_10 || 0) + parseFloat(delinquency_amount_.owed_11_30 || 0);
            total_row.delinquent_60_amount += row.delinquent_60_amount = parseFloat(delinquency_amount_.owed_31_60 || 0);
            total_row.delinquent_90_amount += row.delinquent_90_amount = parseFloat(delinquency_amount_.owed_61_90 || 0);
            total_row.delinquent_gt_90_amount += row.delinquent_gt_90_amount = parseFloat(delinquency_amount_.owed_91_120 || 0) + parseFloat(delinquency_amount_.owed_121_180 || 0) + parseFloat(delinquency_amount_.owed_181_360 || 0) + parseFloat(delinquency_amount_.owed_361 || 0);
            total_row.delinquent_total_amount += row.delinquent_total_amount = row.delinquent_30_amount + row.delinquent_60_amount + row.delinquent_90_amount + row.delinquent_gt_90_amount;

            let delinquency_count_ = delinquency_count[property.id] || {};
            total_row.delinquent_30_count += row.delinquent_30_count = parseInt(delinquency_count_.units_0_10 || 0) + parseInt(delinquency_count_.units_11_30 || 0);
            total_row.delinquent_60_count += row.delinquent_60_count = parseInt(delinquency_count_.units_31_60 || 0);
            total_row.delinquent_90_count += row.delinquent_90_count = parseInt(delinquency_count_.units_61_90 || 0);
            total_row.delinquent_gt_90_count += row.delinquent_gt_90_count = parseInt(delinquency_count_.units_91_120 || 0) + parseInt(delinquency_count_.units_121_180 || 0) + parseInt(delinquency_count_.units_181_360 || 0) + parseInt(delinquency_count_.units_361 || 0);
            total_row.delinquent_total_count += row.delinquent_total_count = row.delinquent_30_count + row.delinquent_60_count + row.delinquent_90_count + row.delinquent_gt_90_count;

            //Discount
            let discount_ = discounts[property.id] || {};
           // total_row.proj_rent += row.proj_rent = projected_income_.rent_amount || 0;
            total_row.non_expiring_discount_count += row.non_expiring_discount_count = discount_.invoices_count || 0;
            total_row.non_expiring_discount_amount += row.non_expiring_discount_amount = discount_.disc_amount || 0;

            let promotion_ = promotions[property.id] || {};
            total_row.expiring_discount_count += row.expiring_discount_count = promotion_.invoices_count || 0;
            total_row.expiring_discount_amount += row.expiring_discount_amount = promotion_.disc_amount || 0;

            //Account Receivable
            let account_receivable_ = account_receivable[property.id] || {};
            total_row.account_receivable += row.account_receivable = account_receivable_.receivable_amount ? Math.abs(account_receivable_.receivable_amount) : 0;

            //Allowances
            let credits_writeoffs_ = credits_writeoffs[property.id] || {};
            total_row.credits += row.credits = credits_writeoffs_.credits ? parseFloat(credits_writeoffs_.credits) : 0;
            total_row.writeoffs += row.writeoffs = credits_writeoffs_.writeoffs ? parseFloat(credits_writeoffs_.writeoffs) : 0;    
            
            this.calculatedFields(row);
            data.push(row);
        }

        this.calculatedFields(total_row);
        data.push(total_row);

        this.data = utils.formatData(data, this.getFields(), { set_header: true, set_total: false });
        return this.data;
    }

    calculatedFields(row){
        //Occupied Percentage
        row.occupied_units_pct = row.total_units ? Math.round(row.occupied_units / row.total_units * 1e4)/1e2 : 0;
        row.occupied_units_sqft_pct = row.total_units_sqft ? Math.round(row.occupied_units_sqft / row.total_units_sqft * 1e4)/1e2 : 0;
        row.occupied_adj_units_pct = row.total_units ? Math.round((row.occupied_units - row.delinquent_total_count + row.delinquent_30_count) / row.total_units * 1e4)/1e2 : 0;
        row.occupied_econ_pct = row.total_units_baserent ? Math.round(row.occupied_units_rent / row.total_units_baserent * 1e4)/1e2 : 0;

        row.variance_amount = parseFloat(row.occupied_units_rent - row.occupied_units_base_rent);
        row.variance_pct = row.occupied_units_rent ? Math.round((row.variance_amount / row.occupied_units_rent) * 1e4)/1e2 : 0;

        row.coverage_pct = row.occupied_units ? Math.round(row.coverage_units / row.occupied_units * 1e4)/1e2 : 0;
        row.auto_pay_pct = row.occupied_units ? Math.round(row.auto_pay_units / row.occupied_units * 1e4)/1e2 : 0;  
    }

    setWorkSheet() {
        let table_origin = { r:3, c:0 };

        //Border styling
        let row_count = this.data?.length;
        let col_count = Object.keys(this.getFields()).length;
        let styling = [ { border: { border_style: { direction: "outside-all", value: { style: "thin", color: { rgb: "000000" } } } } } ];
        let border_style = utils.applyStyleToWhole(styling, [{ row_count: 0, col_count: 9, origin: { r:3, c:22 } }, { row_count, col_count, origin: { r:4, c:0 } }] );

        //Header Styling
        let header_style = utils.getStyleRange(this.data, this.getFields(), "bold-header", table_origin);
        let footer_style = utils.getStyleRange(this.data, this.getFields(), "bold-header", { r:(3 + this.data.length - 1), c:0 }, true);

        this.worksheets.push({
            name: this.name,
            header: this.setSheetHeader(),
            columns_width: this.getSheetWidth(),
            tables: [
                { 
                    data: this.data,
                    origin: table_origin,
                    merge_columns: this.merge_columns[this.template],
                    styles: {
                        "bold-header": header_style.concat(footer_style),
                        ...border_style
                    }
                }
            ]
        });
    }

    setSheetHeader() {

        let header = "Portfolio KPI Report";
        let report_dates = `${main_utils.formatDate(this.date)} - ${main_utils.formatDate(this.end_date)}`;
        let company_name = `${this.company?.name}`;
    
        let workSheet = null;
        workSheet = XLSX.utils.json_to_sheet([{report_name: header}], { skipHeader: true });
        XLSX.utils.sheet_add_json(workSheet, [{report_dates}], {origin: {r: 2, c: 0}, skipHeader: true});   
        XLSX.utils.sheet_add_json(workSheet, [{company_name}], {origin: {r: 0, c: 3}, skipHeader: true});
    
        let styles = {'bold-header': [ {range: {s: {r:0, c:0}, e: {r:0, c:0}}},
                                       {range: {s: {r:0, c:3}, e: {r:0, c:3}}}
                                     ],
                      'alignment': [ {range: {s: {r:0, c:0}, e: {r:0, c:0}}, alignment: {direction: 'vertical', value:'center'}},
                                     {range: {s: {r:0, c:3}, e: {r:0, c:3}}, alignment: {direction: 'horizontal', value:'right'}}
                                   ],
                      'font-size': [ {range: {s: {r:0, c:0}, e: {r:0, c:0}}, size: 18},
                                     {range: {s: {r:2, c:0}, e: {r:2, c:0}}, size: 10}
                                   ],
                      'font-name': [ {range: {s: {r:0, c:0}, e: {r:0, c:0}}, name: 'Arial'},
                                     {range: {s: {r:2, c:0}, e: {r:2, c:0}}, name: 'Arial'},
                                     {range: {s: {r:0, c:3}, e: {r:0, c:3}}, name: 'Arial'}
                                   ],  
                    }
        this.renderStyles(workSheet, styles);
    
        workSheet['!merges'] = [  {s: {r:0, c:0}, e: {r:1, c:0}},
                                  {s: {r:0, c:3}, e: {r:0, c:5}}
                               ];
        return workSheet;
    }
}

module.exports = StoreKPIReport