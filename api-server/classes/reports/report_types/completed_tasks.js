'use strict';
var BaseReport = require(__dirname + '/base_report.js');


let todo_id             = " t.id ";
let lease_id            = ` (select eo.object_id from event_objects eo where eo.object_type = 'lease' and eo.event_id = (select event_id from todos where id = ${todo_id}) ) `;
let rate_change_id      = ` (select eo.object_id from event_objects eo where eo.object_type = 'rate_change' and eo.event_id = (select event_id from todos where id = ${todo_id}) ) `;
let contact_id          = ` (select eo.object_id from event_objects eo where eo.object_type = 'contact' and eo.event_id = (select event_id from todos where id = ${todo_id}) ) `;
let event_object_type   = ` (select object_type from event_objects where event_id = (select event_id from todos where id = ${todo_id}))`;
let unit_id             = ` (select l.unit_id from leases l where l.id = ${lease_id}) `;
let property_id         = ` (select IF(('rate_change' in (${event_object_type})) ,(select property_id from rate_changes where id = ${rate_change_id}), 
                                    IF(('lease' in (${event_object_type})) ,(select property_id from units where id = ${unit_id}), null)))`
let tenant_id           = " (select IF(('lease' in  (" + event_object_type + ")) ,(SELECT contact_id FROM contact_leases WHERE lease_id = " + lease_id + " and `primary` = 1), IF(('contact' in (" + event_object_type + ")) , " + contact_id + ", null)))";


class CompletedTasksReport extends BaseReport{
  constructor(connection, company, filters, format, name, properties = [],report_name) {
    super(connection, company, filters, format, name, properties,report_name);


    let todos = new reportQueries.Todos({id: todo_id, property_id});
    let lease = new reportQueries.Lease({id: lease_id},this.report_dates.end, this.report_dates.start);
    let tenant = new reportQueries.Tenant({id: tenant_id},this.report_dates.end);
    let property = new reportQueries.Property({id: property_id},this.report_dates.end);
    let unit = new reportQueries.Unit({id: unit_id},this.report_dates.end);

    this.sql_fragments = Object.assign({},
      todos.queries,
      tenant.queries,
      unit.queries,
      lease.queries,
      property.queries,
    );

    this.config.name = 'Completed Tasks';
    this.config.filename =  'completed_tasks';

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


    this.config.filter_structure = [{
      label: "Report Period",
      key: "report_period",
      input: "timeframe"
    }];

    this.config.filters.sort = {
      field: 'todo_completed_date',
      dir: 'DESC'
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
      'property_name',
      'todo_completed_date',
      'todo_completed_by',
      'unit_number',
      'tenant_name',
      'todo_summary',
      'todo_description'
    ];

    this.sql_tables += ' todos t ';

    let date = this.report_dates.start ? this.report_dates.start : this.report_dates.end
    this.sql_conditions = " where t.completed = 1 and ((completed_at >=  '" + date + "' and completed_at <= '" + this.report_dates.end + "')  or (completed_at is null)) and (select company_id from events where id = (select event_id from todos where id = " + todo_id + ")) =  " + this.company.id 
    if(properties.length){
      this.sql_conditions += ` and IFNULL(${property_id} in ( ${properties.join(', ')} ), true) `;
      this.property_id = property_id;
    }

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

