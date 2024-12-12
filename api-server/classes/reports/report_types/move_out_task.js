'use strict';
var BaseReport = require(__dirname + '/base_report.js');


let todo_id             = " t.id ";
let lease_id            = ` (select eo.object_id from event_objects eo where (eo.object_type = 'lease' or eo.object_type = 'rate_change') and eo.event_id = (select event_id from todos where id = ${todo_id}) ) `;
let unit_id             = ` (select l.unit_id from leases l where l.id = ${lease_id}) `;
let property_id         = " (select property_id from units where id = " + unit_id +  ") ";
let contact_id          = " (SELECT contact_id FROM contact_leases WHERE lease_id = " + lease_id + " and `primary` = 1) ";


class CompletedTasksReport extends BaseReport{
  constructor(connection, company, filters, format, name, properties = [],report_name) {
    super(connection, company, filters, format, name, properties,report_name);


    let todos = new reportQueries.Todos({id: todo_id, property_id});
    let lease = new reportQueries.Lease({id: lease_id},this.report_dates.end, this.report_dates.start);
    let tenant = new reportQueries.Tenant({id: contact_id},this.report_dates.end);
    let property = new reportQueries.Property({id: property_id},this.report_dates.end);
    let unit = new reportQueries.Unit({id: unit_id},this.report_dates.end);

    this.sql_fragments = Object.assign({},
      todos.queries,
      tenant.queries,
      unit.queries,
      lease.queries,
      property.queries,
    );



    this.config.name = 'Scheduled Move-out with Reason';
    this.config.filename =  'move_out_task';

    console.log(Object.values(Fields.lease));


    this.config.column_structure = [].concat(
      Object.values(Fields.todos),
      Object.values(Fields.property),
      Object.values(Fields.unit),
      Object.values(Fields.tenant),
      Object.values(Fields.tenant_summary),
      Object.values(Fields.lease),
      Object.values(Fields.lease_summary),
    );

    // Removing for INC-4187 as we don't need timeframe options for Scheduled Move-Out report

    // this.config.filter_structure = [{
    //   label: "Report Period",
    //   key: "report_period",
    //   input: "timeframe"
    // }];

    this.config.filters.sort = {
      field: 'todo_original_date',
      dir: 'ASC'
    };

    this.config.filters.search['report_period'] = {
      days: 0,
      end_date: "",
      label: "This Month",
      period: "",
      relation: "",
      start_date: "",
    };

    this.config.default_columns = [
      'todo_original_date',
      'todo_original_time',
      'unit_number',
      'unit_size',
      'unit_category',
      'tenant_name',
      'lease_start_date',
      'lease_paid_through_date',
      'lease_rented_days',
      'lease_lifetime_payments',
      'lease_balance',
      'todo_summary',
    ];

    this.sql_tables += ' todos t ';
    this.sql_conditions = ` where t.original_date >= now() and t.event_id in (select id from events where event_type_id = (select id from event_types where slug = 'move_out'))`;
    this.sql_conditions += ` and (select company_id from events where id = t.event_id) = ${this.company.id} `;
    if(properties.length){
      this.sql_conditions += ` and IFNULL(${property_id} in ( ${properties.join(', ')} ), true) `;
    }
    this.property_id = property_id;

  }

  // and completed_at >= ${this.report_dates.start} and completed_at <= ${this.report_dates.end}

  setFilterConditions(connection, conditions, structure, columns, sql_fragments ){

  }

  setAdditionalConditions(connection, conditions, structure, columns, sql_fragments){
    for(let c in conditions){
      if(c === 'name' && conditions[c].trim().length){
        this.sql_conditions += ' and ( ' + sql_fragments['tenant_first'] + ' = ' + connection.escape(conditions[c]) +  ' or ' +
          sql_fragments['tenant_last'] + ' = ' + connection.escape(conditions[c]) + ') ';
      }
    }
  }

}

const reportQueries = require(__dirname + '/../report_queries');
const Fields = require('../report_fields/index').fields;
module.exports = CompletedTasksReport;

