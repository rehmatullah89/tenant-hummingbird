var moment = require("moment");
var Property = require(__dirname + "/../classes/property.js");
var e = require("../modules/error_handler");

const services = {

  async downloadInExcel(connection, params) {
    const { metric, property_id, company_id, input_date, end_date = null } = params;
    let static_report = new StaticReport({
      connection,
      date: input_date,
      end_date,
      company_id,
      property_id,
      type: metric,
    });
			
    static_report.setUpReport();
    await static_report.generate();
    return static_report.reportClass.path;
  }

};
module.exports = services;

var StaticReport = require("../classes/static_report");
