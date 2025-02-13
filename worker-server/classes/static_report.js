
var reportTypes = require(__dirname + '/static_reports/report_types');
var e = require(__dirname + '/../modules/error_handler.js');
class StaticReport {
    constructor(data) {
        this.date = data.date;
        this.end_date = data.end_date || null,
        this.timeZone = data.timeZone;
        this.report_name = data.name;
        this.format = data.format;
        this.template = data.type;
        this.property_id = data.property_id;
        this.connection = data.connection;
        this.company_id = data.company_id;
        this.properties = data.properties;
        this.reportClass = {};
    }

    setUpReport() {
        if (!this.template || !reportTypes[this.template]) {
            e.th(500, 'Invalid report type');
        }
        this.reportClass = new reportTypes[this.template]({
            data: {},
            report_name: this.report_name,
            template: this.template,
            date: this.date,
            end_date: this.end_date,
            property_id: this.property_id,
            company_id: this.company_id,
            connection: this.connection,
            timeZone: this.timeZone,
            properties: this.properties
        })
    }
    async generate(data = null) {
        await this.reportClass.getData(data);
        this.reportClass.setSuperHeader();
        this.reportClass.setWorkSheet();
        return this.reportClass.generateExcel().then(() => {
            return true;
        });
    }
}

module.exports = StaticReport;