const BaseStaticReport = require(__dirname + '/base_static_report.js');
const Report = require('../../report.js');
const utils = require("../report_utils/utils.js");
var moment = require('moment');
var e = require('../../../modules/error_handler.js');
const ChargesSummaryRoutines = require("../../../routines/charges_summary_routines.js")

class InvoiceGenerationReport extends BaseStaticReport {
    constructor(configuration) {
        super(configuration.data, configuration.report_name, configuration.template);
        this.date = configuration.date;
        this.end_date = configuration.end_date;
        this.company_id = configuration.company_id;
        this.connection = configuration.connection;
        this.properties = configuration.properties;
        this.name = "Invoice Generation";
    }

    async getData(){
        let payload = {
            cid: this.connection.cid,
            company_id: this.company_id,
            property_ids: this.properties.map((p) => p.id),
            property: {id: this.properties[0].id},
            date: this.date,
            dryrun: true
        };
        let invoices_data = await ChargesSummaryRoutines.generateInvoices(this.connection, payload);

        if(!invoices_data.generated_invoices.length && !invoices_data.failed_invoices.length)
            return [];

        let fields = this.getFields();
        this.data.success = utils.formatData(invoices_data.generated_invoices, fields.success, { set_header: true, set_total: true });
        this.data.failure = utils.formatData(invoices_data.failed_invoices, fields.failure, { set_header: true, set_total: true });
    }

    setWorkSheet(){
        let styles = utils.setUpStyles(this.data, this.getFields(), ["success", "failure"], ["bold-header"]);
        this.worksheets.push({
            name: "Invoices Generated",
            tables: [
                { 
                    data: this.data.success,
                    styles: styles["success"]
                }
            ]
        });

        this.worksheets.push({
            name: "Invoices Failed",
            tables: [
                { 
                    data: this.data.failure,
                    styles: styles["failure"]
                }
            ]
        });
    }
}

module.exports = InvoiceGenerationReport