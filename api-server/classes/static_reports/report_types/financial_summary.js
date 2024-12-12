const BaseStaticReport = require(__dirname + '/base_static_report.js');
const Report = require('../../report.js');
var moment = require('moment');
// var utils = require(__dirname + '/../../../modules/utils.js');
const utils = require("../report_utils/utils");
var e = require('../../../modules/error_handler.js');
class FinancialSummaryReport extends BaseStaticReport {
    constructor(configuration) {
        super(configuration.data, configuration.report_name, configuration.template);
        this.date = configuration.date;
        this.end_date = configuration.end_date;
        this.property_id = configuration.property_id;
        this.company = configuration.company;
        this.connection = configuration.connection;
    }
    async getData() {
        if (!this.property_id) e.th(400, "Please enter a property id ");
        if (!this.date || !moment(this.date, 'YYYY-MM-DD', true).isValid()) e.th(400, "Please enter a date for this report ");
        if (!this.end_date || !moment(this.end_date, 'YYYY-MM-DD', true).isValid()) e.th(400, "Please enter a end date for this report ");

        // let storageRent = await Report.findStorageRent(this.connection, this.company.id, this.property_id, this.date, this.end_date);
        // let parkingRent = await Report.findParkingRent(this.connection, this.company.id, this.property_id, this.date, this.end_date);
        // let otherProduct = await Report.findOtherProduct(this.connection, this.company.id, this.property_id, this.date, this.end_date);

        // let data = storageRent.concat(parkingRent).concat(otherProduct);
        let data = await Report.getFSRData(this.connection,this.property_id, this.date, this.end_date);
        this.data = utils.formatData(data, this.getFields(), { set_header: true, set_total: true });

        return this.data;
    }
}

module.exports = FinancialSummaryReport