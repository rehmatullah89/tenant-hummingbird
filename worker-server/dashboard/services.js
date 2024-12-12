var moment = require("moment");
var Property = require(__dirname + "/../classes/property.js");
var e = require("../modules/error_handler");

const services = {

  setTimeFrames(filters) {
    if (!filters.timeFrame) return;
    var tf = filters.timeFrame;
    var timeFrame = {
      start: null,
      end: null,
    };
    switch (tf.toLowerCase()) {
      case "today":
        timeFrame.start = moment().startOf("day");
        timeFrame.end = moment().endOf("day");
        break;
      case "yesterday":
        timeFrame.start = moment().subtract(1, "day").startOf("day");
        timeFrame.end = moment().subtract(1, "day").endOf("day");
        break;
      case "last 7 days":
        timeFrame.start = moment().subtract(6, "day").startOf("day");
        timeFrame.end = moment().endOf("day");
        break;
      case "last 30 days":
        timeFrame.start = moment().subtract(29, "day").startOf("day");
        timeFrame.end = moment().endOf("day");
        break;
      case "last 90 days":
        timeFrame.start = moment().subtract(89, "day").startOf("day");
        timeFrame.end = moment().endOf("day");
        break;
      case "month to date":
        timeFrame.start = moment().startOf("month");
        timeFrame.end = moment().endOf("day");
        break;
      case "year to date":
        timeFrame.start = moment().startOf("year");
        timeFrame.end = moment().endOf("day");
        break;
      case "custom range":
        timeFrame.start = filters.start_date
          ? moment(filters.start_date).startOf("day")
          : null;
        timeFrame.end = filters.end_date
          ? moment(filters.end_date).endOf("day")
          : null;
        break;
      case "all time":
        break;
    }
    return timeFrame;
  },

  async downloadInExcel(connection, params) {
    let timeFrame = this.setTimeFrames(params);  
    const { metric, property_id, company_id } = params;
    let properties  = await Property.fetchProperties(connection, {company_id, id: property_id});
    if(!properties || !properties.length) e.th(500, "Selected Property(es) aren't on-boarded");
    let static_report = new StaticReport({
      connection,
      date: timeFrame.start.format('YYYY-MM-DD'),
      company_id,
      properties,
      type: metric,
    });
			
    static_report.setUpReport();
    await static_report.generate();
    return static_report.reportClass.path;
  }

};
module.exports = services;

var StaticReport = require("../classes/static_report");
