const BaseStaticReport = require(__dirname + '/base_static_report.js');
var DailyDeposits = require('../../reports/dailyDeposits.js');
const utils = require("../report_utils/utils");
var moment = require('moment');
var e = require('../../../modules/error_handler.js');

class DailyDepositsReport extends BaseStaticReport {
    constructor(configuration) {
        super(configuration.data, configuration.report_name, configuration.template);
        this.date = configuration.date;
        this.property_id = configuration.property_id;
        this.company = configuration.company;
        this.connection = configuration.connection;
    }
    async getData() {
        if (!this.property_id) e.th(400, "Please enter a property id ")
        if (!this.date || !moment(this.date, 'YYYY-MM-DD', true).isValid()) e.th(400, "Please enter a property id ");
        let report = new DailyDeposits(this.connection, this.company, this.date, [this.property_id]);
        this.data = await report.generate();
        this.changeFormateOfData();
        let fields = this.getFields();
        Object.keys(this.data).forEach((key, i) => {
            let set_header = true;
            let set_total = false;
            if (i > 1 && i < 6)
                set_total = true;
            this.data[key] = utils.formatData(this.data[key], fields[key], { set_header, set_total });
        });
        //console.log(this.data);
        return this.data;
    }
    setWorkSheet() {
        let origins = utils.calculateOrigins(this.data, ["payment_deposits", "card_deposits"], 4);
        
        // let style = utils.getStyleRange(this.data["payment_deposits"], this.getFields("payment_deposits"),"bold-header");

        let styles = utils.setUpStyles(this.data, this.getFields(), ["payment_deposits", "card_deposits"], ["bold-header", "color","alignment"], origins);
        console.log(styles);
        
        // "addStylesOfCells()" IS DOING THE SAME AS THE FOLLOWING FOUR LINES ARE DOING:
        //let bold_pd_total = utils.setupStyleObjectOfCell(this.data.payment_deposits, this.getFields("payment_deposits"), "summary",{ name: "Total" });
        //let align_pd_total = utils.setupStyleObjectOfCell(this.data.payment_deposits, this.getFields("payment_deposits"),"summary", { name: "Total" }, { alignment: 'right' });
        //styles["payment_deposits"]["bold-header"].push(...bold_pd_total);
        //styles["payment_deposits"].alignment = align_pd_total;

        utils.addStylesOfCells(styles, this.data, this.getFields(), ["payment_deposits", "card_deposits"], "summary", {names: ["Total", "Subtotal"]}, { bold: true, alignment: {direction: 'horizontal', value:'right'}}, origins);

        //console.log(styles);

        this.worksheets.push({
            name: "Summary",
            tables: [
                { 
                    data: this.data.payment_deposits,
                    styles: styles["payment_deposits"],
                },
                { 
                    data: this.data.card_deposits,
                    origin: origins["card_deposits"],
                    styles: styles["card_deposits"],
                }
            ]
        });
        styles = utils.setUpStyles(this.data, this.getFields(), ["receipts", "refund", "payments_collected", "payments_received"], ["bold-header"]); 
        this.worksheets.push({
            name: "Receipts",
            tables: [
                {
                    data: this.data.receipts,
                    styles: styles["receipts"]
                }
            ]
        });

        this.worksheets.push({
            name: "Reversals",
            tables: [
                {
                    data: this.data.refund,
                    styles: styles["refund"]
                }
            ]
        });

        this.worksheets.push({
            name: "Payments Collected",
            tables: [
                {
                    data: this.data.payments_collected,
                    styles: styles["payments_collected"]
                }
            ]
        });

        this.worksheets.push({
            name: "Payments Received",
            tables: [
                {
                    data: this.data.payments_received,
                    styles: styles["payments_collected"]
                }
            ]
        });
    }

    changeFormateOfData() {
        let config_summary_col = {
            rent: "Rent",
            insurance: "Protection / Insurance",
            merchandise: "Merchandise",
            auction: "Auction",
            deposits: "Deposits",
            fees: "Fees",
            inter_property_payments: "Inter-Property Payments",
            tax: "Tax",
            others: "Others",
            sub_total: "Subtotal",
            refund: "Refunds / NSF Reversals",
            totals: "Total",
            // fees_details: { },
        };
        let { payment_deposits, card_deposits, receipts, refund, payments_collected, payments_received} = this.data;

        payment_deposits = this.getFormattedData(payment_deposits, config_summary_col);
        card_deposits = this.getFormattedData(card_deposits, config_summary_col);

        this.adjustPositionOfFeeDetails(payment_deposits);
        this.adjustPositionOfFeeDetails(card_deposits);

        this.addLeadingSpacesInFees(payment_deposits);
        this.addLeadingSpacesInFees(card_deposits);
        refund = [
            ...refund["refund_data"]
        ];
        receipts = [
            ...receipts["receipts_data"]
        ];
        payments_collected = [
            ...payments_collected["payments_collected_data"]
        ];
        payments_received = [
            ...payments_received["payments_received_data"]
        ]
        this.data = {
            payment_deposits,
            card_deposits,
            refund,
            receipts,
            payments_collected,
            payments_received
        }
    }

    getFormattedData(report_data, config_summary_col){
        let result = [];

        // "paymentMethods" are cash, check, ach, card etc.
        // "paymentType" are rent, insurance, auction, fees, tax, fee_details etc.
        for (let paymentMethod in report_data) {
            if (paymentMethod === "date") continue;
            Object.keys(report_data[paymentMethod]).forEach((paymentType, i) => {
                if(paymentType === "fees_details"){
                    let fee_details = report_data[paymentMethod][paymentType];
                    for(let fee of fee_details){
                        if (result.map(m => m.summary).includes(fee.name)) {
                            let obj = result.find(m => m.summary === fee.name);
                            obj[paymentMethod] = fee.value;
                        } else {
                            let obj = {};
                            obj.summary = fee.name;
                            obj[paymentMethod] = fee.value;
                            result.push(obj);
                        }
                    }
                }else{
                    if (result.map(m => m.summary).includes(config_summary_col[paymentType])) {
                        let obj = result.find(m => m.summary === config_summary_col[paymentType]);
                        obj[paymentMethod] = report_data[paymentMethod][paymentType];
                    } else {
                        let obj = {};
                        obj.summary = config_summary_col[paymentType];
                        obj[paymentMethod] = report_data[paymentMethod][paymentType];
                        result.push(obj);
                    }
                }
            });
        }
        return result;
    }

    adjustPositionOfFeeDetails(data) {
        let length = data.length;
        let index_of_fee = utils.getIndex(data, "Fees", "summary");
        let index_of_total = utils.getIndex(data, "Total", "summary");
        if (index_of_total < length - 1)
            // moving items, after "Fees" and before "Total", to the end of array.
            data.splice(length - 1, 0, ...data.splice(index_of_fee + 1, index_of_total - index_of_fee));
    }

    addLeadingSpacesInFees(data){
        let index_of_fee = utils.getIndex(data, "Fees", "summary");
        let index_of_tax = utils.getIndex(data, "Tax", "summary");
        if(index_of_fee + 2 !== index_of_tax){
            for(let i = index_of_fee + 1; i < index_of_tax; i++){
                data[i].summary = `   ${data[i].summary}`;
            }
        }
    }

}

module.exports = DailyDepositsReport