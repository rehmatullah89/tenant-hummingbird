const BaseStaticReport =  require(__dirname + '/base_static_report.js');
const Report = require('../../report.js');
const utilsModules = require("../../../modules/utils");
const utils = require("../report_utils/utils");
var moment = require('moment');
var e  = require('../../../modules/error_handler.js');

class SalesCommissionReport extends BaseStaticReport{
    constructor(configuration){
        super(configuration.data, configuration.report_name, configuration.template);
        this.date = configuration.date;
        this.end_date = configuration.end_date;
        this.properties = configuration.properties;
        this.company = configuration.company;
        this.connection = configuration.connection;
        this.name = "Sales Commission Report";
    }

    setWorkSheet() {
        this.worksheets.push({
          name: this.name,
          tables: [
              { 
                data: this.data
              }
          ]
        });
    }

    async hasPermission(connection, payload) {
      const { api_info } = payload;

			await utilsModules.hasPermission({ 
        connection, 
        company_id: api_info.locals.active.id,
        contact_id: api_info.locals.contact.id, 
        api: api_info.locals.api, 
        permissions: ['generate_exports'] 
      });

      return true;
    }

    async getData() {
        if(!this.properties?.length) e.th(400, "Please select at least one property");
        if(!this.date || !moment(this.date, 'YYYY-MM-DD', true).isValid()) e.th(400, "Please enter a date for this report ");
        if(!this.end_date || !moment(this.end_date, 'YYYY-MM-DD', true).isValid()) e.th(400, "Please enter a end date for this report ");
        let data = await Report.findSalesCommission(this.connection, {
          company_id: this.company.id,
          property_ids: this.properties,
          date: this.date,
          end_date: this.end_date   
        });
        this.data = utils.formatData(data, this.getFields(), { set_header: false, set_total: false, show_empty_message: true });
        return this.data;
    }
}

module.exports = SalesCommissionReport