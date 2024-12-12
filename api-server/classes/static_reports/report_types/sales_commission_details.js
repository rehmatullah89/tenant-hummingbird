const BaseStaticReport = require(__dirname + '/base_static_report.js');
const Report = require('../../report.js');
const utilsModules = require("../../../modules/utils");
const utils = require("../report_utils/utils");
var moment = require('moment');
var e = require('../../../modules/error_handler.js');

class SalesCommissionDetailsReport extends BaseStaticReport {
  constructor(configuration) {
    const { data, report_name, template, ...restOfConfigurations } = configuration;
    super(data, report_name, template);
    this.config = { ...restOfConfigurations };
  }

  setWorkSheet() {
    this.worksheets.push({
      name: "Summarized View",
      tables: [{
        data: this.data.summarized_view
      }]
    }, {
      name: "Detailed View",
      tables: [{
        data: this.data.detailed_view,
      }]
    });
  }

  async hasPermission(connection, payload) {
    const { locals } = payload.api_info;
    const { active, contact, api } = locals;
    await utilsModules.hasPermission({
      connection,
      company_id: active.id,
      contact_id: contact.id,
      api,
      permissions: ['generate_exports']
    });
    return true;
  }

  validateDate(value) {
    return moment(value, 'YYYY-MM-DD', true).isValid();
  }

  async getData() {
    const { company, connection, date, end_date, properties } = this.config;
    if(!properties?.length) e.th(400, "Please select at least one property");
    if(!date || !this.validateDate(date)) e.th(400, "Please enter a date for this report");
    if(!end_date || !this.validateDate(end_date)) e.th(400, "Please enter an end date for this report.");
    const payload = {
      company_id: company.id,
      property_ids: properties,
      date,
      end_date
    };
    const summarizedData = await Report.findSalesCommission(connection, payload);
    const detailedData = await Report.findSalesCommissionDetails(connection, payload);

    this.data['summarized_view'] = utils.formatData(summarizedData, this.getFields('summarized_view'), { set_header: true, set_total: false, show_empty_message: true });
    this.data['detailed_view'] = utils.formatData(detailedData, this.getFields('detailed_view'), { set_header: true, set_total: false, show_empty_message: true });

    return this.data;
  }
}

module.exports = SalesCommissionDetailsReport
