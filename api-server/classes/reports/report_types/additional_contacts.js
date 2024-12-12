'use strict';
var BaseReport = require(__dirname + '/base_report.js');

let lease_id        = " l.id ";
let unit_id         = " l.unit_id ";
let property_id     = " l.property_id ";
let contact_id      = " l.contact_id ";
let add_contact_id  = " l.additional_contact_id "   

class AdditionalContactsReport extends BaseReport{
  constructor(connection, company, filters, format, name, properties = [],report_name) {
    super(connection, company, filters, format, name, properties,report_name);

    let tenant = new reportQueries.Tenant({id: contact_id}, this.report_dates.end);
    let lease = new reportQueries.Lease({id: lease_id}, this.report_dates.end, this.report_dates.start);
    let unit = new reportQueries.Unit({id: unit_id}, this.report_dates.end);
    let property = new reportQueries.Property({id: property_id}, this.report_dates.end);
    let additionalContact = new reportQueries.AdditionalContact({id: add_contact_id}, this.report_dates.end);

    this.sql_fragments = Object.assign({},
      tenant.queries,
      lease.queries,
      unit.queries,
      property.queries,
      additionalContact.queries
    );

    this.config.name = 'Tenants Additional Contacts';
    this.config.filename = 'tenants_additional_contacts';

    console.log(Object.values(Fields.lease));

    this.config.column_structure = [].concat(
      Object.values(Fields.tenant),
      Object.values(Fields.tenant_summary),
      Object.values(Fields.lease),
      Object.values(Fields.lease_summary),
      Object.values(Fields.unit),
      Object.values(Fields.property),
      Object.values(Fields.additional_contact),
    );

    this.config.filters.sort = {
      field: 'unit_number',
      dir: 'ASC'
    };

    this.config.default_columns = [
      'property_name',
      'unit_number',
      'tenant_name',
      'additional_name',
      'additional_address',
      'additional_city',
      'additional_state',
      'additional_country',
      'additional_zip',
      'additional_home_phone',
      'additional_work_phone',
      'additional_cell',
      'additional_fax',
      'additional_other_phone',
      'additional_email'
    ];

    this.sql_tables += `(
        select l.*, u.property_id as property_id, cr.contact_id as contact_id, cr.related_contact_id as additional_contact_id
        from leases l 
          inner join units u on u.id = l.unit_id
          inner join (select * from contact_leases where ${'`primary`'} = 1 group by lease_id) cl on cl.lease_id = l.id
          inner join contact_relationships cr on cr.contact_id = cl.contact_id
        where l.status = 1 and ( l.end_date > CURDATE() or l.end_date is null)
      ) l
    `;
    this.sql_conditions = ' WHERE (select company_id from properties where id = (select property_id from units where id = l.unit_id and number != "POS$")) = ' + this.company.id
    if(properties.length){
      this.sql_conditions += ' and (select property_id from units where id = l.unit_id and number != "POS$") in (' + properties.join(', ') + ")";
    }
    this.property_id = '(select property_id from units where id = l.unit_id and number != "POS$")'
  }

  setFilterConditions(connection, conditions, structure, columns, sql_fragments ){
    if(conditions.report_period){
      this.sql_conditions += this.setTimeframes(conditions.report_period, " l.start_date ");
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
module.exports = AdditionalContactsReport;

