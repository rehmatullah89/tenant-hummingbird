const BaseStaticReport = require(__dirname + '/base_static_report.js');
const utils = require("../report_utils/utils.js");
var e = require('../../../modules/error_handler.js');
const models = require("../../../models/index.js");


class AutoPaymentsReport extends BaseStaticReport {
    constructor(configuration) {
        super(configuration.data, configuration.report_name, configuration.template);
        this.date = configuration.date;
        this.end_date = configuration.end_date;
        this.company_id = configuration.company_id;
        this.connection = configuration.connection;
        this.properties = configuration.properties;
        this.name = "Auto Payments";
    }

    async getData(){
        let payload = {
            property_ids: this.properties.map((p) => p.id),
            date: this.date
        };

        let data = await models.Property.findAutoPaymentMethodsWithInvoicesReports(this.connection, payload);
        this.data = utils.formatData(data, this.getFields(), { set_header: true, set_total: true });
    }
}

module.exports = AutoPaymentsReport