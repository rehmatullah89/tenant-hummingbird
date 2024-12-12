const BaseStaticReport = require(__dirname + '/base_static_report.js');
var moment = require('moment');
const utils = require("../report_utils/utils");
var e = require('../../../modules/error_handler.js');
var Property  = require('../../../classes/property.js');
const Report = require('../../report.js');
var main_utils = require(__dirname + '/../../../modules/utils.js');
var msrModels = require(__dirname + '/../../../models/msr');
const XLSX = require("xlsx-color");

class ManagementSummaryReport extends BaseStaticReport {
    constructor(configuration) {
        super(configuration.data, configuration.report_name, configuration.template);
        this.date = configuration.date;
        this.end_date = configuration.end_date;
        this.property_id = configuration.property_id;
        this.company = configuration.company;
        this.connection = configuration.connection;
        this.multiple_tables = true;
        this.property = {};
        this.design_type = {
            msr: {multi_tables: true},
            occupancy: {multi_tables: false},
            delinquencies: {multi_tables: false},
            past_due: {multi_tables: false},
            liabilities_detail: {multi_tables: false},
            rent_change: {multi_tables: false},
            rent_not_change: {multi_tables: false},
            coverage: {multi_tables: false},
            autopay: {multi_tables: false},
            overlocked: {multi_tables: false},
            leads: {multi_tables: false},
            payment: {multi_tables: false},
            refund: {multi_tables: false},
            write_off: {multi_tables: false},
            promotion: {multi_tables: false},
            applied_credit: {multi_tables: false},
            move_in: {multi_tables: false},
            move_out: {multi_tables: false},
            transfer: {multi_tables: false},
            reservation: {multi_tables: false},
        }
    }
    async getData() { 
        if(!this.property_id) e.th(400, "Please enter a property id ");
        if(!this.date || !moment(this.date, 'YYYY-MM-DD', true).isValid()) e.th(400, "Please enter a date for this report ");
        
        this.property = new Property({id: this.property_id});
        await this.property.find(this.connection)
        await this.property.getPhones(this.connection);

        let report = new ManagementSummary(this.connection, this.company, this.date, [this.property_id], Enums.REPORTS.MSR_TYPE.CASH);
        let summary_data = await report.generate();

        summary_data.performance_indicators = {
            auto_pay: summary_data.auto_pay,
            insurance: summary_data.insurance, 
            overlock: summary_data.overlock,
            rentUnchanged: summary_data.rentUnchanged
        }
        summary_data.activity = {...summary_data.rental_activity}
        summary_data.leads_summary = {...summary_data.leads_data}

        let fields = this.getFields("msr");
        Object.keys(summary_data).forEach((key, i) => {
                summary_data[key] = this.translateTableData(key, summary_data[key], fields[key])
                this.formatValues(key, summary_data[key]);
        });

        this.data.msr = summary_data;

        // Details

        //Occupancy
        let occupiedList = await msrModels.Occupancy.detailOccupiedList(this.connection,this.company?.id, this.property_id, this.date);
        let vacantList = await msrModels.Occupancy.detailVacantList(this.connection,this.company?.id, this.property_id, this.date);
        this.data.occupancy = {occupied: occupiedList, vacant: vacantList};
        this.data.occupancy = this.translateTableData('occupancy_detail', this.data.occupancy, this.getFields('occupancy'));

        //Delinquency
        let delinquencies = await msrModels.Delinquencies.detailDelinquentLeases(this.connection, this.property_id, this.date);
        this.data.delinquencies = utils.formatData(delinquencies, this.getFields("delinquencies"), {set_header: true, set_total: true});


        //Past Due Invoices
        let past_due_data = await msrModels.Delinquencies.detailDelinquentInvoices(this.connection, this.company?.id, this.property_id, this.date);
        this.data.past_due = utils.formatData(past_due_data, this.getFields("past_due"), { set_header: true, set_total: true });

        //Liabilities
        let rent = await Report.findPrepaidRent(this.connection, this.company?.id, this.property_id, this.date);            
        let fee = await Report.findPrepaidFee(this.connection, this.company?.id, this.property_id, this.date);
        let insurance = await Report.findPrepaidInsuranceProtection(this.connection, this.company?.id, this.property_id, this.date);
        let miscDeposit = await Report.findMiscDeposit(this.connection, this.company?.id, this.property_id, this.date);
        this.data.liabilities_detail = [ ...rent, ...fee, ...insurance, ...miscDeposit ];
        this.data.liabilities_detail = utils.formatData(this.data.liabilities_detail, this.getFields("liabilities_detail"), {set_header: true, set_total: true});

        //Rent Change
        let rentChange_data = await Report.findRentChange(this.connection, this.company?.id, this.property_id, this.date);
        this.data.rent_change = utils.formatData(rentChange_data, this.getFields("rent_change"), { set_header: true, set_total: true });

        //No Rent Change last 12 Months
        let rentNotChange_data = await Report.findRentNotChange(this.connection, this.company?.id, this.property_id, this.date);
        this.data.rent_not_change = utils.formatData(rentNotChange_data, this.getFields("rent_not_change"), { set_header: true, set_total: true });

        //Coverage
        let coverage_data = await Report.findInsuranceEnrolled(this.connection, this.company?.id, [this.property_id], this.date, this.date);
        this.data.coverage = utils.formatData(coverage_data, this.getFields("coverage"), { set_header: true, set_total: true });

        //Autopay Enrolled
        let autopay_data = await Report.findAutopayEnrolled(this.connection, this.company?.id, this.property_id, this.date);
        this.data.autopay = utils.formatData(autopay_data, this.getFields("autopay"), { set_header: true, set_total: true });

        //Overlocked
        let ovelocked_data = await Report.findOvelockedSpaces(this.connection, this.company?.id, this.property_id, this.date);
        this.data.overlocked = utils.formatData(ovelocked_data, this.getFields("overlocked"), { set_header: true, set_total: true });

        //Leads
        let leads_data = await msrModels.Leads.detailFindLeads(this.connection, this.property_id, this.date, this.date);
        this.data.leads = utils.formatData(leads_data, this.getFields("leads"), { set_header: true, set_total: true });

        //Payments
        let payments_data = await msrModels.DepositsRefunds.detailRevenueReceipts(this.connection, this.date, this.property_id);
        this.data.payment = utils.formatData(payments_data, this.getFields("payment"), { set_header: true, set_total: true });

        //Refunds
        let refunds_data = await msrModels.DepositsRefunds.detailReversalsReceipt(this.connection, this.date, this.property_id);
        this.data.refund = utils.formatData(refunds_data, this.getFields("refund"), { set_header: true, set_total: true });

        //WriteOff
        let writeoff_data = await msrModels.Credits.detailedFindWriteOffs(this.connection, this.company.id, [this.property_id], this.date, this.date);
        this.data.write_off = utils.formatData(writeoff_data, this.getFields("write_off"), { set_header: true, set_total: true });

        //Projected Income
        let invoices_data = await await msrModels.ProjectedIncome.detailRevenueByInvoices(this.connection, this.property_id, this.date, this.date);
        this.data.invoices = utils.formatData(invoices_data, this.getFields("invoices"), { set_header: true, set_total: true });

        // Promotions/Discounts
        let promotion_data = await Report.findPromotionsApplied(this.connection, [this.property_id], this.date, this.date);
        this.data.promotion = utils.formatData(promotion_data, this.getFields("promotion"), { set_header: true, set_total: true });

        //Applied Credits
        let credits_data = await msrModels.Credits.detailedFindAppliedCredits(this.connection, this.company.id, [this.property_id], this.date, this.date);
        this.data.applied_credit = utils.formatData(credits_data, this.getFields("applied_credit"), { set_header: true, set_total: true });

        //MoveIn
        let moveIn_data = await Report.findRentalActivityMoveIn(this.connection, this.company.id, this.property_id, this.date, this.date);
        this.data.move_in = utils.formatData(moveIn_data, this.getFields("move_in"), { set_header: true, set_total: true });

        //MoveOut
        let moveOut_data = await Report.findRentalActivityMoveOut(this.connection, this.company.id, this.property_id, this.date, this.date);
        this.data.move_out = utils.formatData(moveOut_data, this.getFields("move_out"), { set_header: true, set_total: true });

        //Transfers
        let transfer_data = await Report.findTransfers(this.connection, this.company.id, this.property_id, this.date, this.date);
        this.data.transfer = utils.formatData(transfer_data, this.getFields("transfer"), {set_header: true, set_total: true});

        //Reservations
        let reservation_data = await msrModels.Activity.detailedReservations(this.connection, [this.property_id], this.date, this.date);
        this.data.reservation = utils.formatData(reservation_data, this.getFields("reservation"), {set_header: true, set_total: true});

        return this.data;
    }

    setWorkSheet() {
        let merged_cells;

        let fields = this.getFields("msr");
        let summary_data = this.data.msr;
        let start_origin = {net_revenue: {r:5, c:0}}
        let overall_styles = [{"font-name": {name: "Arial"}}, {"font-size": {size: 10}}, {"border": {"border_style": { direction: "outside-all", value: {"style": "thin", "color": { "rgb": "000000" }}}}}];

        let origins = utils.calculateOrigins(summary_data, ["net_revenue", "payment_deposits", "revenue", "allowances", "rental_activity", "leads_data", "performance_indicators", "space_metrics"], 1, start_origin['net_revenue']);
        let horizontal_origins = utils.calculateOriginHorizontally(fields, ['net_revenue', 'occupancy', 'activity', 'leads_summary'], 1,  start_origin['net_revenue']);

        let parallel_table_origins = utils.calculateOrigins(summary_data, ['activity', 'occupancy_breakdown', 'deliquencies', 'liabilities', 'rent_change_summary'], 1, horizontal_origins['activity'])

        origins = {...start_origin, ...origins, ...horizontal_origins, ...parallel_table_origins}

        let styles = utils.setUpStyles(summary_data, fields, ['net_revenue', 'payment_deposits', 'revenue', 'allowances', "rental_activity", "leads_data", "performance_indicators", "space_metrics", "occupancy", "activity", "leads_summary", 'occupancy_breakdown', 'deliquencies', 'liabilities', 'rent_change_summary'], ['bold-header', 'bold'], origins, true);
        
        let header_excluded_styles = utils.setUpStyles(summary_data, fields, ['net_revenue', 'payment_deposits', 'revenue', 'allowances', "rental_activity", "leads_data", "performance_indicators", "space_metrics", 'occupancy_breakdown', 'deliquencies', 'liabilities', 'rent_change_summary'], ['alignment'], origins);

        for(let style in header_excluded_styles){
            styles[style] = {...styles[style], ...header_excluded_styles[style]}
        }

        let row_count = summary_data.net_revenue?.length;
        let col_count = Object.keys(fields.net_revenue).length;
        let net_revenue_table_style = utils.applyStyleToWhole(overall_styles, [ {row_count, col_count, origin: origins['net_revenue'] }] );
        
        let position = {r: origins['net_revenue'].r + 1, c: origins['net_revenue'].c}
        let cell_style = [{"bold": {bold: true}}];
        let net_revenue_cell_styles = utils.applyStyleToWhole(cell_style, [{row_count: 0, col_count: 0, origin: position}]);
        if(net_revenue_table_style.bold)
            net_revenue_table_style.bold.push(...net_revenue_cell_styles.bold)
        else    
            net_revenue_table_style = {...net_revenue_table_style, ...net_revenue_cell_styles}


        position = {r: origins['net_revenue'].r + 3, c: origins['net_revenue'].c}
        net_revenue_cell_styles = utils.applyStyleToWhole(cell_style, [{row_count: 0, col_count: 0, origin: position}]);
        net_revenue_table_style.bold.push(...net_revenue_cell_styles.bold)
 
        
        utils.addStylesOfCells(styles, summary_data, fields, ['net_revenue'], "amount", {names: ['Net Revenue']}, { alignment: {direction: 'horizontal', value: 'center'}, color: "D9D9D9"}, origins);

        row_count = summary_data.payment_deposits?.length;
        col_count = Object.keys(fields.payment_deposits).length;
        let payment_deposits_table_style = utils.applyStyleToWhole(overall_styles, [ {row_count, col_count, origin: origins['payment_deposits'] }] );

        utils.addStylesOfCells(styles, summary_data, fields, ['payment_deposits'], "deposit_refunds", {names: ['Deposits and Refunds'], cells: 'all'}, { color: "D9D9D9" }, origins);

        utils.addStylesOfCells(styles, summary_data, fields, ['payment_deposits'], "deposit_refunds", {names: ['Subtotal', 'NSF/Reversals', 'Total']}, { alignment: {direction: 'horizontal', value: 'right'} }, origins);
        utils.addStylesOfCells(styles, summary_data, fields, ['payment_deposits'], "deposit_refunds", {names: ['Subtotal', 'Total'], cells: 'all'}, { bold: true }, origins);

        utils.addStylesOfCells(styles, summary_data, fields, ['payment_deposits'], "deposit_refunds", {names: ['Cash', 'Check', 'Giftcard', 'ACH Debit', 'Debit/Credit Cards']}, { bold: true }, origins);




        merged_cells = utils.columnMerger({row_start:0, row_end: row_count-1, col_start: 0, col_end: 2, origin: origins['payment_deposits']});
        this.merge_columns['msr']['payment_deposits'] = merged_cells;

        row_count = summary_data.revenue?.length;
        col_count = Object.keys(fields.revenue).length;
        let revenue_table_style = utils.applyStyleToWhole(overall_styles, [ {row_count, col_count, origin: origins['revenue'] }] );
        
        utils.addStylesOfCells(styles, summary_data, fields, ['revenue'], "revenue", {names: ['Projected Income'], cells: 'all'}, { color: "D9D9D9" }, origins);
        utils.addStylesOfCells(styles, summary_data, fields, ['revenue'], "revenue", {names: ['Total'], cells: 'all'}, { alignment: {direction: 'horizontal', value: 'right'}, bold: true}, origins);

        merged_cells = utils.columnMerger({row_start:0, row_end: row_count-1, col_start: 0, col_end: 2, origin: origins['revenue']});
        this.merge_columns['msr']['revenue'] = merged_cells;

        row_count = summary_data.allowances?.length;
        col_count = Object.keys(fields.allowances).length;
        let allowances_table_style = utils.applyStyleToWhole(overall_styles, [ {row_count, col_count, origin: origins['allowances'] }] );

        utils.addStylesOfCells(styles, summary_data, fields, ['allowances'], "allowances", {names: ['Allowances'], cells: 'all'}, { color: "D9D9D9" }, origins);

        merged_cells = utils.columnMerger({row_start:0, row_end: row_count-1, col_start: 0, col_end: 2, origin: origins['allowances']});
        this.merge_columns['msr']['allowances'] = merged_cells;

        row_count = summary_data.rental_activity?.length;
        col_count = Object.keys(fields.rental_activity).length;
        let rental_activity_table_style = utils.applyStyleToWhole(overall_styles, [ {row_count, col_count, origin: origins['rental_activity'] }] );

        utils.addStylesOfCells(styles, summary_data, fields, ['rental_activity'], "rental_activity", {names: ['Rental Activity'], cells: 'all'}, { color: "D9D9D9" }, origins);

        merged_cells = utils.columnMerger({row_start:0, row_end: row_count-1, col_start: 0, col_end: 2, origin: origins['rental_activity']});
        this.merge_columns['msr']['rental_activity'] = merged_cells;

        row_count = summary_data.leads_data?.length;
        col_count = Object.keys(fields.leads_data).length;
        let leads_data_table_style = utils.applyStyleToWhole(overall_styles, [ {row_count, col_count, origin: origins['leads_data'] }] );

        utils.addStylesOfCells(styles, summary_data, fields, ['leads_data'], "leads", {names: ['Leads'], cells: 'all'}, { color: "D9D9D9" }, origins);

        merged_cells = utils.columnMerger({row_start:0, row_end: row_count-1, col_start: 0, col_end: 2, origin: origins['leads_data']});
        this.merge_columns['msr']['leads_data'] = merged_cells;

        row_count = summary_data.performance_indicators?.length;
        col_count = Object.keys(fields.performance_indicators).length;
        let performance_indicators_table_style = utils.applyStyleToWhole(overall_styles, [ {row_count, col_count, origin: origins['performance_indicators'] }] );

        utils.addStylesOfCells(styles, summary_data, fields, ['performance_indicators'], "indicators", {names: ['Performance Indicators'], cells: 'all'}, { color: "D9D9D9" }, origins);

        merged_cells = utils.columnMerger({row_start:0, row_end: row_count-1, col_start: 0, col_end: 3, origin: origins['performance_indicators']});
        this.merge_columns['msr']['performance_indicators'] = merged_cells;

        row_count = summary_data.space_metrics?.length;
        col_count = Object.keys(fields.space_metrics).length;
        let space_metrics_table_style = utils.applyStyleToWhole(overall_styles, [ {row_count, col_count, origin: origins['space_metrics'] }] );

        utils.addStylesOfCells(styles, summary_data, fields, ['space_metrics'], "stats", {names: ['Space Statistics'], cells: 'all'}, { color: "D9D9D9" }, origins);

        merged_cells = utils.columnMerger({row_start:0, row_end: row_count-1, col_start: 0, col_end: 2, origin: origins['space_metrics']});
        this.merge_columns['msr']['space_metrics'] = merged_cells;

        row_count = summary_data.occupancy?.length;
        col_count = Object.keys(fields.occupancy).length;
        let occupancy_table_style = utils.applyStyleToWhole(overall_styles, [ {row_count, col_count, origin: origins['occupancy'] }] );

        utils.addStylesOfCells(styles, summary_data, fields, ['occupancy'], "kpi", {names: ['Occupancy'], cells: 'all'}, { alignment: {direction: 'horizontal', value: 'center'}, color: "D9D9D9" }, origins);

        row_count = summary_data.activity?.length;
        col_count = Object.keys(fields.activity).length;
        let activity_table_style = utils.applyStyleToWhole(overall_styles, [ {row_count, col_count, origin: origins['activity'] }] );

        utils.addStylesOfCells(styles, summary_data, fields, ['activity'], "kpi", {names: ['Activity'], cells: 'all'}, { alignment: {direction: 'horizontal', value: 'center'}, color: "D9D9D9" }, origins);

        row_count = summary_data.leads_summary?.length;
        col_count = Object.keys(fields.leads_summary).length;
        let leads_summary_table_style = utils.applyStyleToWhole(overall_styles, [ {row_count, col_count, origin: origins['leads_summary'] }] );

        utils.addStylesOfCells(styles, summary_data, fields, ['leads_summary'], "time_period", {names: ['Leads'], cells: 'all'}, { alignment: {direction: 'horizontal', value: 'center'}, color: "D9D9D9" }, origins);

        row_count = summary_data.occupancy_breakdown?.length;
        col_count = Object.keys(fields.occupancy_breakdown).length;
        let occupancy_breakdown_table_style = utils.applyStyleToWhole(overall_styles, [ {row_count, col_count, origin: origins['occupancy_breakdown'] }] );

        utils.addStylesOfCells(styles, summary_data, fields, ['occupancy_breakdown'], "space_occupancy", {names: ['Space Occupancy'], cells: 'all'}, { color: "D9D9D9" }, origins);
        utils.addStylesOfCells(styles, summary_data, fields, ['occupancy_breakdown'], "space_occupancy", {names: ['Total'], cells: 'all'}, { alignment: {direction: 'horizontal', value: 'right'}, bold: true }, origins);

        merged_cells = utils.columnMerger({row_start:0, row_end: row_count-1, col_start: 0, col_end: 2, origin: origins['occupancy_breakdown']});
        this.merge_columns['msr']['occupancy_breakdown'] = merged_cells;

        row_count = summary_data.deliquencies?.length;
        col_count = Object.keys(fields.deliquencies).length;
        let deliquencies_table_style = utils.applyStyleToWhole(overall_styles, [ {row_count, col_count, origin: origins['deliquencies'] }] );

        utils.addStylesOfCells(styles, summary_data, fields, ['deliquencies'], "days", {names: ['Delinquency by Days'], cells: 'all'}, { color: "D9D9D9" }, origins);
        utils.addStylesOfCells(styles, summary_data, fields, ['deliquencies'], "days", {names: ['Total', 'Greater than 30 Days'], cells: 'all'}, { alignment: {direction: 'horizontal', value: 'right'}, bold: true }, origins);

        merged_cells = utils.columnMerger({row_start:0, row_end: row_count-1, col_start: 0, col_end: 3, origin: origins['deliquencies']});
        this.merge_columns['msr']['deliquencies'] = merged_cells;

        row_count = summary_data.liabilities?.length;
        col_count = Object.keys(fields.liabilities).length;
        let liabilities_table_style = utils.applyStyleToWhole(overall_styles, [ {row_count, col_count, origin: origins['liabilities'] }] );

        utils.addStylesOfCells(styles, summary_data, fields, ['liabilities'], "liabilities", {names: ['Liabilities'], cells: 'all'}, { color: "D9D9D9" }, origins);
        utils.addStylesOfCells(styles, summary_data, fields, ['liabilities'], "liabilities", {names: ['Total'], cells: 'all'}, { alignment: {direction: 'horizontal', value: 'right'}, bold: true }, origins);

        merged_cells = utils.columnMerger({row_start:0, row_end: row_count-1, col_start: 0, col_end: 4, origin: origins['liabilities']});
        this.merge_columns['msr']['liabilities'] = merged_cells;

        row_count = summary_data.rent_change_summary?.length;
        col_count = Object.keys(fields.rent_change_summary).length;
        let rent_change_summary_table_style = utils.applyStyleToWhole(overall_styles, [ {row_count, col_count, origin: origins['rent_change_summary'] }] );

        utils.addStylesOfCells(styles, summary_data, fields, ['rent_change_summary'], "rent_change_summary", {names: ['Rent Change Summary'], cells: 'all'}, { color: "D9D9D9" }, origins);
        utils.addStylesOfCells(styles, summary_data, fields, ['rent_change_summary'], "rent_change_summary", {names: ['Total'], cells: 'all'}, { alignment: {direction: 'horizontal', value: 'right'}, bold: true }, origins);

        merged_cells = utils.columnMerger({row_start:0, row_end: row_count-1, col_start: 0, col_end: 3, origin: origins['rent_change_summary']});
        this.merge_columns['msr']['rent_change_summary'] = merged_cells;

        styles['net_revenue'] = {...styles['net_revenue'], ...net_revenue_table_style};
        styles['payment_deposits'] = {...styles['payment_deposits'], ...payment_deposits_table_style};
        styles['revenue'] = {...styles['revenue'], ...revenue_table_style};
        styles['allowances'] = {...styles['allowances'], ...allowances_table_style};
        styles['rental_activity'] = {...styles['rental_activity'], ...rental_activity_table_style};
        styles['leads_data'] = {...styles['leads_data'], ...leads_data_table_style};
        styles['performance_indicators'] = {...styles['performance_indicators'], ...performance_indicators_table_style};
        styles['space_metrics'] = {...styles['space_metrics'], ...space_metrics_table_style};
        styles['occupancy'] = {...styles['occupancy'], ...occupancy_table_style};
        styles['activity'] = {...styles['activity'], ...activity_table_style};
        styles['leads_summary'] = {...styles['leads_summary'], ...leads_summary_table_style};
        styles['occupancy_breakdown'] = {...styles['occupancy_breakdown'], ...occupancy_breakdown_table_style};
        styles['deliquencies'] = {...styles['deliquencies'], ...deliquencies_table_style};
        styles['liabilities'] = {...styles['liabilities'], ...liabilities_table_style};
        styles['rent_change_summary'] = {...styles['rent_change_summary'], ...rent_change_summary_table_style};

        this.worksheets.push({
            name: "MSR",
            header: this.setSheetHeader(),
            columns_width: this.getSheetWidth("MSR"),
            tables: [
                {
                    data: summary_data['net_revenue'], 
                    origin: origins['net_revenue'],
                    styles: styles['net_revenue'],
                    merge_columns: this.merge_columns['msr']['net_revenue']
                },
                {
                    data: summary_data['payment_deposits'], 
                    origin: origins['payment_deposits'],
                    styles: styles['payment_deposits'],
                    merge_columns: this.merge_columns['msr']['payment_deposits'],
                    formatted_merged_cells: true
                    
                },
                {
                    data: summary_data['revenue'], 
                    origin: origins['revenue'],
                    styles: styles['revenue'],
                    merge_columns: this.merge_columns['msr']['revenue'],
                    formatted_merged_cells: true
                },
                {
                    data: summary_data['allowances'], 
                    origin: origins['allowances'],
                    styles: styles['allowances'],
                    merge_columns: this.merge_columns['msr']['allowances'],
                    formatted_merged_cells: true
                },
                {
                    data: summary_data['rental_activity'], 
                    origin: origins['rental_activity'],
                    styles: styles['rental_activity'],
                    merge_columns: this.merge_columns['msr']['rental_activity'],
                    formatted_merged_cells: true
                },
                {
                    data: summary_data['leads_data'], 
                    origin: origins['leads_data'],
                    styles: styles['leads_data'],
                    merge_columns: this.merge_columns['msr']['leads_data'],
                    formatted_merged_cells: true
                },
                {
                    data: summary_data['performance_indicators'], 
                    origin: origins['performance_indicators'],
                    styles: styles['performance_indicators'],
                    merge_columns: this.merge_columns['msr']['performance_indicators'],
                    formatted_merged_cells: true
                },
                {
                    data: summary_data['space_metrics'], 
                    origin: origins['space_metrics'],
                    styles: styles['space_metrics'],
                    merge_columns: this.merge_columns['msr']['space_metrics'],
                    formatted_merged_cells: true
                },
                {
                    data: summary_data['occupancy'], 
                    origin: origins['occupancy'],
                    styles: styles['occupancy'],
                    merge_columns: this.merge_columns['msr']['occupancy'],
                },
                {
                    data: summary_data['activity'], 
                    origin: origins['activity'],
                    styles: styles['activity'],
                    merge_columns: this.merge_columns['msr']['activity'],
                },
                {
                    data: summary_data['leads_summary'], 
                    origin: origins['leads_summary'],
                    styles: styles['leads_summary'],
                    merge_columns: this.merge_columns['msr']['leads_summary'],
                },
                {
                    data: summary_data['occupancy_breakdown'], 
                    origin: origins['occupancy_breakdown'],
                    styles: styles['occupancy_breakdown'],
                    merge_columns: this.merge_columns['msr']['occupancy_breakdown'],
                    formatted_merged_cells: true
                },
                {
                    data: summary_data['deliquencies'], 
                    origin: origins['deliquencies'],
                    styles: styles['deliquencies'],
                    merge_columns: this.merge_columns['msr']['deliquencies'],
                    formatted_merged_cells: true
                },
                {
                    data: summary_data['liabilities'], 
                    origin: origins['liabilities'],
                    styles: styles['liabilities'],
                    merge_columns: this.merge_columns['msr']['liabilities'],
                    formatted_merged_cells: true
                },
                {
                    data: summary_data['rent_change_summary'], 
                    origin: origins['rent_change_summary'],
                    styles: styles['rent_change_summary'],
                    merge_columns: this.merge_columns['msr']['rent_change_summary'],
                    formatted_merged_cells: true
                }
            ]
        });

        //Detail Reports

        styles = utils.setUpStyles(this.data, this.getFields(), ["occupancy", "delinquencies", "past_due", "liabilities_detail", "rent_change", "rent_not_change", "coverage", "autopay", "overlocked", "leads", "payment", "refund", "write_off", "invoices", "promotion", "applied_credit", "move_in", "move_out", "transfer", "reservation"], ["bold-header"]);
        this.worksheets.push(
            {
                name: "Occupancy",
                tables: [
                    { 
                        data: this.data.occupancy,
                        styles: styles["occupancy"]
                    }
                ]
            },{
                name: "Delinquencies",
                tables: [
                    { 
                        data: this.data.delinquencies,
                        styles: styles["delinquencies"]
                    }
                ]
            },{
                name: "Past Due Invoices",
                tables: [
                    { 
                        data: this.data.past_due,
                        styles: styles["past_due"]
                    }
                ]
            },{
                name: "Liabilities",
                tables: [
                    { 
                        data: this.data.liabilities_detail,
                        styles: styles["liabilities_detail"]
                    }
                ]
            },{
                name: "Rent Change",
                tables: [
                    { 
                        data: this.data.rent_change,
                        styles: styles["rent_change"]
                    }
                ]
            },{
                name: "No Rent Change Last 12 Months",
                tables: [
                    { 
                        data: this.data.rent_not_change,
                        styles: styles["rent_not_change"]
                    }
                ]
            },{
                name: "Coverage",
                tables: [
                    { 
                        data: this.data.coverage,
                        styles: styles["coverage"]
                    }
                ]
            },{
                name: "Autopay Enrolled",
                tables: [
                    { 
                        data: this.data.autopay,
                        styles: styles["autopay"]
                    }
                ]
            },{
                name: "Overlocked Spaces",
                tables: [
                    { 
                        data: this.data.overlocked,
                        styles: styles["overlocked"]
                    }
                ]
            },{
                name: "Leads",
                tables: [
                    { 
                        data: this.data.leads,
                        styles: styles["leads"]
                    }
                ]
            },{
                name: "Payments",
                tables: [
                    { 
                        data: this.data.payment,
                        styles: styles["payment"]
                    }
                ]
            },{
                name: "Refunds",
                tables: [
                    { 
                        data: this.data.refund,
                        styles: styles["refund"]
                    }
                ]
            },{
                name: "Write-Offs",
                tables: [
                    { 
                        data: this.data.write_off,
                        styles: styles["write_off"]
                    }
                ]
            },{
                name: "Invoices",
                tables: [
                    { 
                        data: this.data.invoices,
                        styles: styles["invoices"]
                    }
                ]
            },{
                name: "Promotions-Discounts",
                tables: [
                    { 
                        data: this.data.promotion,
                        styles: styles["promotion"]
                    }
                ]
            },{
                name: "Applied Credit",
                tables: [
                    { 
                        data: this.data.applied_credit,
                        styles: styles["applied_credit"]
                    }
                ]
            },{
                name: "Move-Ins",
                tables: [
                    { 
                        data: this.data.move_in,
                        styles: styles["move_in"]
                    }
                ]
            },{
                name: "Move-Outs",
                tables: [
                    { 
                        data: this.data.move_out,
                        styles: styles["move_out"]
                    }
                ]
            },{
                name: "Transfers",
                tables: [
                    { 
                        data: this.data.transfer,
                        styles: styles["transfer"]
                    }
                ]
            },{
                name: "Reservations",
                tables: [
                    { 
                        data: this.data.reservation,
                        styles: styles["reservation"]
                    }
                ]
            }
        );
    }

    translateTableData(table_name, data, fields){
        let struct = {}, translated_data = []

        switch (table_name){
            case "net_revenue":
                struct = { 
                            revenue_mtd: {amount: 0, time_period: "Month-to-date"},
                            previous_mtd: {amount: 0, time_period: "same day last month"},
                            revenue_ytd: {amount: 0, time_period: "Year-to-date"},
                            previous_ytd: {amount: 0, time_period: "same day last year"},
                        }  

                for(const key in data){
                    struct[key].amount = data[key]
                }
                translated_data =  Object.values(struct);  
                return utils.formatData(translated_data, fields, { set_header: false, set_total: false });       
            case "payment_deposits":
                for(const key in data){
                    struct.deposit_refunds = key
                    struct.report_date = data[key].daily
                    struct.space_filler1 = '',
                    struct.space_filler2 = '',
                    struct.mtd = data[key].mtd
                    struct.ytd = data[key].ytd

                    translated_data.push({...struct});
                }
                
                return utils.formatData(translated_data, fields, { set_header: true, set_total: false }, this.date);        
            case "revenue":   
//                if("others" in data) delete data["others"];  
                
                for(const key in data){
                    struct.revenue = key
                    struct.report_date = data[key].daily
                    struct.space_filler1 = '',
                    struct.space_filler2 = '',
                    struct.mtd = data[key].mtd
                    struct.ytd = data[key].ytd
                    struct.others = data[key].others

                    translated_data.push({...struct});
                }
                
                /* ordering the data */
                let fee = translated_data[1];
                translated_data[1] = translated_data[2]
                translated_data[2] = fee

                translated_data =  utils.formatData(translated_data, fields, { set_header: true, set_total: false }, this.date); 


                return translated_data;
            case "allowances":
                for(const key in data){
                    struct.allowances = key
                    struct.report_date = data[key].daily
                    struct.space_filler1 = '',
                    struct.space_filler2 = '',
                    struct.mtd = data[key].mtd
                    struct.ytd = data[key].ytd

                    translated_data.push({...struct});
                }

                /* ordering the data */
                let credits = translated_data[1];
                translated_data[1] = translated_data[2]
                translated_data[2] = credits
                
                return utils.formatData(translated_data, fields, { set_header: true, set_total: false }, this.date);
            case 'rental_activity':
                for(const key in data){
                    struct.rental_activity = key
                    struct.report_date = data[key].daily
                    struct.space_filler1 = '',
                    struct.space_filler2 = '',
                    struct.mtd = data[key].mtd
                    struct.ytd = data[key].ytd

                    translated_data.push({...struct});
                }
                
                return utils.formatData(translated_data, fields, { set_header: true, set_total: false }, this.date);
            case 'leads_data':
                if("total" in data) delete data["total"]; 

                for(const key in data){
                    struct.leads = key
                    struct.report_date = data[key].daily
                    struct.space_filler1 = '',
                    struct.space_filler2 = '',
                    struct.mtd = data[key].mtd
                    struct.ytd = data[key].ytd

                    translated_data.push({...struct});
                }     

                /* ordering the data */
                let phone_leads = translated_data.shift(1);
                translated_data.splice(2, 0, phone_leads);

                return utils.formatData(translated_data, fields, { set_header: true, set_total: false }, this.date);
            case 'performance_indicators':
                for(const key in data){
                    struct.indicators = key
                    struct.space_filler1 = '',
                    struct.space_filler2 = '',
                    struct.space_filler3 = '',
                    struct.total_count = data[key].total
                    struct.percent = data[key].percentage

                    translated_data.push({...struct});
                }  

                return utils.formatData(translated_data, fields, { set_header: true, set_total: false });
            case 'space_metrics':
                for(const key in data){
                    struct.stats = key
                    struct.space_filler1 = '',
                    struct.space_filler2 = '',
                    struct.occupied = utils.formatNumber(data[key].occupied, false)
                    struct.vacant = utils.formatNumber(data[key].vacant, false)
                    struct.total = utils.formatNumber(data[key].total, false)

                    translated_data.push({...struct});
                }  

                return utils.formatData(translated_data, fields, { set_header: true, set_total: false });
            case 'occupancy':
                for(const key in data){
                    struct.kpi = key
                    struct.current = data[key].current
                    struct.yoy = data[key].last_year_change

                    translated_data.push({...struct});
                }
                
                return utils.formatData(translated_data, fields, { set_header: true, set_total: false }, this.date);  
            case 'activity':
                for(const key in data){
                    if(!['move_ins', 'move_out'].includes(key)) continue

                    struct.kpi = key
                    struct.mtd = data[key].mtd
                    struct.ytd = data[key].ytd

                    translated_data.push({...struct});
                }
                let mtd_net = translated_data.find(item => item.kpi === 'move_ins').mtd - translated_data.find(item => item.kpi === 'move_out').mtd;
                let ytd_net = translated_data.find(item => item.kpi === 'move_ins').ytd - translated_data.find(item => item.kpi === 'move_out').ytd;
                translated_data.push({kpi: 'net', mtd: mtd_net, ytd: ytd_net})
                
                return utils.formatData(translated_data, fields, { set_header: true, set_total: false });           
            case 'leads_summary':
                let date_struct = {time_period: main_utils.formatDate(this.date), total: '', converted: ''};
                let mtd_struct = {time_period: 'MTD', total: '', converted: ''};
                let ytd_struct = {time_period: 'YTD', total: '', converted: ''};

                for(const key in data){

                    switch(key){
                        case 'total':
                            date_struct.total = data[key].daily;
                            mtd_struct.total = data[key].mtd;
                            ytd_struct.total = data[key].ytd;
                            break;
                        case 'leads_converted':
                            date_struct.converted = data[key].daily;
                            mtd_struct.converted = data[key].mtd;
                            ytd_struct.converted = data[key].ytd;
                            break;
                    }
                }

                translated_data.push({...date_struct});
                translated_data.push({...mtd_struct});
                translated_data.push({...ytd_struct});
                
                return utils.formatData(translated_data, fields, { set_header: true, set_total: false }); 
            case "occupancy_breakdown":
                for(const key in data){
                    struct.space_occupancy = key
                    struct.space_filler1 = ''
                    struct.space_filler2 = ''
                    struct.count = data[key].unit_count
                    struct.space_percent = data[key].unit_percent
                    struct.sqft = data[key].sqft
                    struct.sqft_percent = data[key].sqft_percent

                    translated_data.push({...struct});
                }

                /* ordering the data */

                let reserved =  translated_data[1]
                translated_data[1] = translated_data[2]
                translated_data[2] = reserved

                let occupancy_vacant = translated_data[3];
                translated_data.splice(3, 1);
                translated_data.splice(1, 0, occupancy_vacant);
                
                return utils.formatData(translated_data, fields, { set_header: true, set_total: false }); 
            case "deliquencies":
                for(const key in data){
                    struct.days = key
                    struct.space_filler1 = ''
                    struct.space_filler2 = ''
                    struct.space_filler3 = ''
                    struct.amount = data[key].amount
                    struct.units = data[key].units
                    struct.percent_units = data[key].percent_units

                    translated_data.push({...struct});
                }
                
                return utils.formatData(translated_data, fields, { set_header: true, set_total: false }); 
            case "liabilities":
                for(const key in data){
                    struct.liabilities = key
                    struct.space_filler1 = ''
                    struct.space_filler2 = ''
                    struct.space_filler3 = ''
                    struct.space_filler4 = ''
                    struct.units = data[key].units
                    struct.amount = data[key].amount

                    translated_data.push({...struct});
                }

                /* ordering the data */
                let liable_fee = translated_data[1];
                translated_data[1] = translated_data[2]
                translated_data[2] = liable_fee

                return utils.formatData(translated_data, fields, { set_header: true, set_total: false }); 
            case "rent_change_summary":
                for(const key in data){
                    struct.rent_change_summary = key
                    struct.space_filler1 = ''
                    struct.space_filler2 = ''
                    struct.space_filler3 = ''
                    struct.count = data[key].count
                    struct.prct_variance = data[key].prct_variance
                    struct.variance = data[key].variance

                    translated_data.push({...struct});
                }
                return utils.formatData(translated_data, fields, { set_header: true, set_total: false }); 
            case "occupancy_detail":
                let {occupied, vacant} = data;
                for(const key in occupied){
                    struct.name = occupied[key].name;
                    struct.space_number = occupied[key].space_number;
                    struct.space_status = occupied[key].space_status;
                    struct.space_size = occupied[key].space_size;
                    struct.unit_type = occupied[key].unit_type;
                    struct.occupied_base_rent = occupied[key].occupied_base_rent;
                    struct.occupied_rent = occupied[key].occupied_rent;
                    struct.area = occupied[key].area;
                    struct.occupied_vacant = 'Occupied';
                    translated_data.push({...struct});
                }

                for(const key in vacant){
                    struct.name = '';
                    struct.space_number = vacant[key].space_number;
                    struct.space_status = vacant[key].space_status;
                    struct.space_size = vacant[key].space_size;
                    struct.unit_type = vacant[key].unit_type;
                    struct.occupied_base_rent = vacant[key].occupied_base_rent;
                    struct.occupied_rent = '';
                    struct.area = vacant[key].area;
                    struct.occupied_vacant = 'Vacant';
                    translated_data.push({...struct});
                }

                return utils.formatData(translated_data, fields, { set_header: true, set_total: false });
            default:
                break;
        }
    }

    formatValues(table_name, data){
        switch(table_name){
            case 'payment_deposits':
                data.forEach(row => {
                    switch(row.deposit_refunds){
                        case 'ach':
                            row.deposit_refunds = 'ACH Debit'
                            break;
                        case 'card':
                            row.deposit_refunds = 'Debit/Credit Cards'
                            break;
                        case 'reversals':
                            row.deposit_refunds = 'NSF/Reversals'
                            break;                        
                        default:
                            row.deposit_refunds = row.deposit_refunds.charAt(0).toUpperCase() + row.deposit_refunds.slice(1);
                            break;
                    }
                    
                })
                break;
            case 'revenue':
                data.forEach(row => {
                    switch(row.revenue){
                        case 'insurance':
                            row.revenue = 'Insurance/Protection';
                            break;
                        default:
                            row.revenue = row.revenue.charAt(0).toUpperCase() + row.revenue.slice(1);
                            break;
                    }
                })
                break;
            case 'allowances':
                data.forEach(row => {
                    switch(row.allowances){
                        case 'discounts':
                            row.allowances = 'Discounts/Promotions';
                            break;
                        case 'write_offs':
                            row.allowances = 'Write Offs';
                            break;
                        case 'credits':
                            row.allowances = 'Applied Credits';
                            break;
                    }
                })
                break;
            case 'rental_activity':
                data.forEach(row => {
                    switch(row.rental_activity){
                        case 'move_ins':
                            row.rental_activity = 'Move-Ins';
                            break;
                        case 'move_out':
                            row.rental_activity = 'Move-Outs';
                            break;
                        default:
                            row.rental_activity = row.rental_activity.charAt(0).toUpperCase() + row.rental_activity.slice(1);
                            break;
                    }
                })
                break;
            case 'leads_data':
                data.forEach(row => {
                    switch(row.leads){
                        case 'phone_leads':
                            row.leads = 'Phone Leads';
                            break;
                        case 'web_leads':
                            row.leads = 'Web Leads';
                            break;
                        case 'walk_in_leads':
                            row.leads = 'Walk-in Leads';
                            break;
                        case 'other_leads':
                            row.leads = 'Other Leads';
                            break;
                        case 'leads_converted':
                            row.leads = 'Leads Converted';
                            break;
                    }
                })
                break;
            case 'performance_indicators':
                data.forEach(row => {
                    switch(row.indicators){
                        case 'auto_pay':
                            row.indicators = 'Autopay Enrollment';
                            break;
                        case 'insurance':
                            row.indicators = 'Insurance/Protection Enrollment';
                            break;
                        case 'overlock':
                            row.indicators = 'Overlocked Spaces';
                            break;
                        case 'rentUnchanged':
                            row.indicators = 'No Rent Change in Last 12 Months';
                            break;
                    }
                })
                break;
            case 'space_metrics':
                data.forEach(row => {
                    switch(row.stats){
                        case 'average_area_space':
                            row.stats = 'Average SQ FT/Space';
                            break;
                        case 'average_rent_space':
                            row.stats = 'Average Rent/Space ($)';
                            break;
                        case 'average_rent_area':
                            row.stats = 'Average Rent/SQ FT($)';
                            break;
                    }
                })
                break;
            case 'occupancy':
                data.forEach(row => {
                    switch(row.kpi){
                        case 'sqft':
                            row.kpi = 'SQ FT';
                            break;
                        case 'units':
                            row.kpi = 'Spaces';
                            break;
                        case 'econ':
                            row.kpi = 'ECON';
                            break;
                    }
                });
                break;
            case 'activity':
                data.forEach(row => {
                    switch(row.kpi){
                        case 'move_ins':
                            row.kpi = 'Move-Ins';
                            break;
                        case 'move_out':
                            row.kpi = 'Move-Outs';
                            break;
                        default:
                            row.kpi = row.kpi.charAt(0).toUpperCase() + row.kpi.slice(1);
                            break; 
                    }
                })
                break;
            case 'occupancy_breakdown':
                data.forEach(row => {
                    switch(row.space_occupancy){
                        case 'complimentary':
                            row.space_occupancy = 'Complimentary (not in total)'
                            break;
                        case 'reserved':
                            row.space_occupancy = 'Reserved (not in total)'
                            break
                        default:
                            row.space_occupancy = row.space_occupancy.charAt(0).toUpperCase() + row.space_occupancy.slice(1);
                            break;
                    }
                })
                break;
            case 'deliquencies':
                data.forEach(row => {
                    switch(row.days){
                        case 'deliquent_10':
                            row.days = '0-10'
                            break;
                        case 'deliquent_30':
                            row.days = '11-30'
                            break;
                        case 'deliquent_60':
                            row.days = '31-60'
                            break;
                        case 'deliquent_90':
                            row.days = '61-90'
                            break;
                        case 'deliquent_120':
                            row.days = '91-120'
                            break;
                        case 'deliquent_180':
                            row.days = '121-180'
                            break;
                        case 'deliquent_360':
                            row.days = '181-360'
                            break;
                        case 'deliquent_gt_360':
                            row.days = '361+'
                            break;
                        case 'total':
                            row.days = 'Total'
                            break;
                        case 'deliquent_gt_30':
                            row.days = 'Greater than 30 Days'
                            break;
                    }
                })
                break;
            case 'liabilities':
                data.forEach(row => {
                    switch(row.liabilities){
                        case 'prepaid_rent':
                            row.liabilities = 'Prepaid Rent'
                            break;
                        case 'prepaid_services':
                            row.liabilities = 'Prepaid Fee'
                            break;
                        case 'prepaid_insurance':
                            row.liabilities = 'Prepaid Insurance/Protection'
                            break;
                        case 'miscellaneous_deposits':
                            row.liabilities = 'Miscellaneous Deposits'
                            break;
                        case 'total':
                            row.liabilities = 'Total'
                            break;
                    }
                })
                break;
            case 'rent_change_summary':
                data.forEach(row => {
                    switch(row.rent_change_summary){
                        case 'six_month':
                            row.rent_change_summary = 'Less than 6 Months'
                            break;
                        case 'six_to_twelve_month':
                            row.rent_change_summary = '6-12 Months'
                            break;
                        case 'twelve_to_eighteen_month':
                            row.rent_change_summary = '12-18 Months'
                            break;
                        case 'eighteen_to_twenty_four_month':
                            row.rent_change_summary = '18-24 Months'
                            break;
                        case 'twenty_four_month':
                            row.rent_change_summary = 'Greater than 24 Months'
                            break;
                        case 'total':
                            row.rent_change_summary = 'Total'
                            break;
                    }
                })
            break;
            default:
                break;
        }
    }

    setSheetHeader() {

        let header = "Management Summary Report";
        let report_date = main_utils.formatDate(this.date);
        let property_name = `${this.property?.number} - ${this.property?.name}`;
        let property_address = `${this.property?.Address?.address}, ${this.property?.Address?.city} ${this.property?.Address?.state} ${this.property?.Address?.zip}`;
        let property_phone = main_utils.formatPhone(this.property?.Phones[0]?.phone);
    
        let workSheet = null;
        workSheet = XLSX.utils.json_to_sheet([{report_name: header}], { skipHeader: true });
        XLSX.utils.sheet_add_json(workSheet, [{report_date}], {origin: {r: 2, c: 0}, skipHeader: true});
        
        XLSX.utils.sheet_add_json(workSheet, [{prop_name: property_name}], {origin: {r: 0, c: 10}, skipHeader: true});
        XLSX.utils.sheet_add_json(workSheet, [{prop_address: property_address}], {origin: {r: 1, c: 10}, skipHeader: true});
        XLSX.utils.sheet_add_json(workSheet, [{prop_phone: property_phone}], {origin: {r: 2, c: 10}, skipHeader: true});
    
        let styles = {'bold-header': [ {range: {s: {r:0, c:0}, e: {r:0, c:0}}},
                                       {range: {s: {r:0, c:10}, e: {r:0, c:10}}}
                                     ],
                      'alignment': [ {range: {s: {r:0, c:0}, e: {r:0, c:0}}, alignment: {direction: 'vertical', value:'center'}},
                                     {range: {s: {r:0, c:10}, e: {r:0, c:10}}, alignment: {direction: 'horizontal', value:'right'}},
                                     {range: {s: {r:1, c:10}, e: {r:1, c:10}}, alignment: {direction: 'horizontal', value:'right'}},
                                     {range: {s: {r:2, c:10}, e: {r:2, c:10}}, alignment: {direction: 'horizontal', value:'right'}},
                                   ],
                      'font-size': [ {range: {s: {r:0, c:0}, e: {r:0, c:0}}, size: 18},
                                     {range: {s: {r:2, c:0}, e: {r:2, c:0}}, size: 10},
                                     {range: {s: {r:1, c:10}, e: {r:1, c:10}}, size: 10},
                                     {range: {s: {r:2, c:10}, e: {r:2, c:10}}, size: 10}
                                   ],
                      'font-name': [ {range: {s: {r:0, c:0}, e: {r:0, c:0}}, name: 'Arial'},
                                     {range: {s: {r:2, c:0}, e: {r:2, c:0}}, name: 'Arial'},
                                     {range: {s: {r:0, c:10}, e: {r:0, c:10}}, name: 'Arial'},
                                     {range: {s: {r:1, c:10}, e: {r:1, c:10}}, name: 'Arial'},
                                     {range: {s: {r:2, c:10}, e: {r:2, c:10}}, name: 'Arial'},
                                   ],  
                    }
        this.renderStyles(workSheet, styles);
    
        workSheet['!merges'] = [  {s:{c:0, r:0}, e: {c:4, r:1}}, 
                                  {s:{c:10, r:0}, e: {c:13, r:0}},
                                  {s:{c:10, r:1}, e: {c:13, r:1}},
                                  {s:{c:10, r:2}, e: {c:13, r:2}}
                               ];
        return workSheet;
    }
}

module.exports = ManagementSummaryReport

var ManagementSummary = require(__dirname + '/../../reports/managementSummary.js');
var Enums = require(__dirname + '/../../../modules/enums.js');
