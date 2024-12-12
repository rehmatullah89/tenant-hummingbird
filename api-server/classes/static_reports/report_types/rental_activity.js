const BaseStaticReport =  require(__dirname + '/base_static_report.js');
const Report = require('../../report.js');
const utils = require("../report_utils/utils");
var moment = require('moment');
var e = require('../../../modules/error_handler.js');

class RentalActivityReport extends BaseStaticReport{
    constructor(configuration){
        super(configuration.data, configuration.report_name, configuration.template);
        this.date = configuration.date;
        this.end_date = configuration.end_date;
        this.property_id = configuration.property_id;
        this.company = configuration.company;
        this.connection = configuration.connection;
    }
    async getData(){
        if(!this.property_id) e.th(400, "Please enter a property id ");
        if(!this.date || !moment(this.date, 'YYYY-MM-DD', true).isValid()) e.th(400, "Please enter a date for this report ");
        if(!this.end_date || !moment(this.end_date, 'YYYY-MM-DD', true).isValid()) e.th(400, "Please enter a end date for this report ");

        let moveIn = await Report.findRentalActivityMoveIn(this.connection, this.company.id, this.property_id, this.date, this.end_date);
        let moveOut = await Report.findRentalActivityMoveOut(this.connection, this.company.id, this.property_id, this.date, this.end_date);

        let fields = this.getFields();
        this.data.move_in = utils.formatData(moveIn, fields.move_in, { set_header: true, set_total: true });
        this.data.move_out = utils.formatData(moveOut, fields.move_out, { set_header: true, set_total: true });

        return this.data;
    }

    setWorkSheet(){
        let styles = utils.setUpStyles(this.data, this.getFields(), ["move_in", "move_out"], ["bold-header"]);
        this.worksheets.push({
            name: "Move In",
            tables: [
                { 
                    data: this.data.move_in,
                    styles: styles["move_in"]
                }
            ]
        });

        this.worksheets.push({
            name: "Move Out",
            tables: [
                { 
                    data: this.data.move_out,
                    styles: styles["move_out"]
                }
            ]
        });
    }
}

module.exports = RentalActivityReport