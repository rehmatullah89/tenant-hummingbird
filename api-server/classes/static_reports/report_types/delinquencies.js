const BaseStaticReport =  require(__dirname + '/base_static_report.js');
const Report = require('../../report.js');
const utils = require("../report_utils/utils");
var moment= require('moment');
var e = require('../../../modules/error_handler.js');

class DelinquenciesReport extends BaseStaticReport{
    constructor(configuration){
        super(configuration.data, configuration.report_name, configuration.template);
        this.date = configuration.date;
        this.property_id = configuration.property_id;
        this.company = configuration.company;
        this.connection = configuration.connection;
    }
    async getData(){
        if(!this.property_id) e.th(400, "Please enter a property id ");
        if(!this.date || !moment(this.date, 'YYYY-MM-DD', true).isValid()) e.th(400, "Please enter a date for this report ");
        let data = await Report.findDelinquencies(this.connection, this.company.id, this.property_id, this.date);
        // "this.data" is a property in Parent Class
        this.data = utils.formatData(data, this.getFields(), { set_header: true, set_total: true });
        return this.data;
    }
}

module.exports = DelinquenciesReport