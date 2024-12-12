'use strict';
var BaseReport = require(__dirname + '/base_report.js');

class  ReservationReport extends BaseReport{
  constructor(connection, company, filters, format, name, properties = [],report_name) {
    super(connection, company, filters, format, name, properties,report_name);

    this.config.name = 'Reservations';
    this.config.filename =  'active_leads';

    this.config.column_structure = [].concat(
      Object.values(Fields.property),
      Object.values(Fields.unit),
      Object.values(Fields.lead),
      Object.values(Fields.lead_summary),
      Object.values(Fields.reservation),
    );

    this.config.filters.sort = {
      field: 'lead_created',
      dir: 'DESC'
    };

    this.config.filters.search['unit_status'] = ["Reserved"];

    this.config.default_columns = [
      'lead_created',
      'lead_name',
      'reservation_time',
      'reservation_expires',
      'lead_email',
      'lead_phone',
      'reservation_unit_number',
      'lead_source',
      'lead_category',
      'lead_created_by_name',
    ];

  }
}

const Fields = require('../report_fields/index').fields;
module.exports = ReservationReport;