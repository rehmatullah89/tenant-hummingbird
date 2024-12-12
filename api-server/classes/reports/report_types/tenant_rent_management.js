'use strict';
var BaseReport = require(__dirname + '/base_report.js');

let lease_id            = " l.id ";
let unit_id             = " l.unit_id ";
let property_id         = " (select property_id from units where id = " + unit_id +  ") ";
let contact_id          = " (SELECT contact_id FROM contact_leases WHERE lease_id = " + lease_id + " and `primary` = 1 ORDER BY contact_id ASC LIMIT 1) ";

class TenantRentManagement extends BaseReport{
  constructor(connection, company, filters, format, name, properties = [],report_name) {
    super(connection, company, filters, format, name, properties,report_name);

    let lease = new reportQueries.Lease({ id: lease_id, property_id },this.report_dates.end, this.report_dates.start);
    let tenant = new reportQueries.Tenant({id: contact_id},this.report_dates.end);
    let tenantRentManagement = new reportQueries.TenantRentManagement({id: lease_id,  tenant_id: contact_id, unit_id: unit_id, company_id: company.id});
    let unit = new reportQueries.Unit({id: unit_id},this.report_dates.end);

    this.sql_fragments = Object.assign({},
      new reportQueries.Tenant({id: contact_id},this.report_dates.end).queries,
      tenant.queries,
      unit.queries,
      lease.queries,
      tenantRentManagement.queries
    );

    this.config.name = 'Tenant Rent Management';
    this.config.filename =  'tenant_rent_management';

    this.config.column_structure = [].concat(
      Object.values(Fields.unit),
      Object.values(Fields.tenant),
      Object.values(Fields.lease),
      Object.values(Fields.lease_summary),
      Object.values(Fields.tenant_rent_management)
    );

    this.config.filters.sort = {
      field: 'unit_number',
      dir: 'ASC'
    };

    this.config.default_columns = [
      'tenant_name',
      'lease_standing',
      'unit_number',
      'unit_type',
      'tenant_space_group',
      'unit_size',
      'unit_set_rate',
      'unit_price',
      'lease_rent',
      'lease_rent_variance_prct',
      'lease_rent_plan_status',
      'tenant_selected_rent_plan',
      'tenant_rent_change_id',
      'lease_id',
      'tenant_rent_plan_id',
      'tenant_length_of_stay',
      'tenant_next_rent_change',
      'tenant_days_left_to_rent_change',
      'tenant_new_rent',
      'tenant_new_rent_variance',
      'tenant_affect_timeline',
      'tenant_auction_status',
      'tenant_scheduled_rent_change',
      'lease_last_rent_change_date',
      'tenant_last_rent_change_days'
    ];

    this.sql_tables += ' leases l ';
    this.sql_conditions = ' WHERE l.status = 1 and ( end_date > CURDATE() or end_date is null) and (select company_id from properties where id = (select property_id from units where id = l.unit_id and number != "POS$")) = ' + this.company.id
    this.property_id = ' (select property_id from units where id = l.unit_id and number != "POS$") '
    if(properties.length){
      this.sql_conditions += ' and (select property_id from units where id = l.unit_id and number != "POS$") in (' + properties.join(', ') + ")";
    }

  }


  setFilterConditions(connection, conditions, structure, columns, sql_fragments ){

    if(conditions.report_period){
      this.sql_conditions += this.setTimeframes(conditions.report_period, " select date from payments where id = ip.payment_id ");
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

  setColumnFiltersQuery(connection, col, fragment){
    if(col.column_type === 'percentage' && col.search.value) {
      col.search.value = col.search.value / 100;
    }
    switch(col.input){
      case 'multi-select':
        if(!col.search || !col.search.length) return;

        if(col.column_type === 'concat'){
          this.sql_conditions += " AND (" + col.search.map(cond => fragment + " LIKE " + connection.escape("%" + cond + "%")).join( ' or ') + ")";
        } else {

          if (col.search.includes("no-status")  ) {
            const filteredSearch = col.search.filter(search => search !== 'no-status');
            if (filteredSearch.length) {
              this.sql_conditions += ` AND (${fragment} IS NULL OR ${fragment} IN (${filteredSearch.map(c => connection.escape(c)).join(',')}))`
            } else {
              this.sql_conditions += ` AND ${fragment} IS NULL`
            }
          } else {
            this.sql_conditions += " AND " + fragment + " IN (" + col.search.map(c => connection.escape(c)).join(',') + ") ";
          }
        }
        break;

      // added by BCT
      case 'multi-select-amenities':
        if(!col.search || !col.search.length) return;

        if(col.column_type === 'concat'){
          if(col.key === 'unit_amenities'){
            // Remove the last closing parenthesis
            const lastIndex = fragment.lastIndexOf(')');
            if (lastIndex !== -1) {
              fragment = fragment.slice(0, lastIndex) + fragment.slice(lastIndex + 1);
            }
          };
          this.sql_conditions += ` and ${fragment} and ( ${col.search.map(cond => ` ( ap.amenity_name = ${connection.escape(cond.key)} AND au.value = ${connection.escape(cond.value)})`).join(' OR ')} )) is not null`;
        } else {
          this.sql_conditions += " and " + fragment + " AND a.amenity_name in (" + col.search.map(c => connection.escape(c.key)).join(',') + ") )";
        }
        break;
      case 'text':  
        if(!col.search || !col.search.length) return;
        this.sql_conditions += " and " + fragment.toLowerCase() + " like " + connection.escape('%' + col.search.toLowerCase() + '%');
        break;
      case 'comparison':
          if(col.aggregate_enable && col.search.operator && col.search.operator.toLowerCase() !== "between" && col.search.value){
            this.sql_having_conditions += " and  " + fragment + "  " + this.comparisons[col.search.operator.toLowerCase()] + " " +  connection.escape(col.search.value);
            return;
          }
          if(!col.search) return;
          if(col.search.operator && col.search.operator.toLowerCase() === "between" && col.search.value && col.search.max){
            this.sql_conditions += " and  " + fragment + " BETWEEN " +  connection.escape(col.search.value) + " AND " + connection.escape(col.search.max);
          } else if(col.search.operator && col.search.operator.toLowerCase() !== "between" && col.search.value){
            this.sql_conditions += " and  " + fragment + "  " + this.comparisons[col.search.operator.toLowerCase()] + " " +  connection.escape(col.search.value);
          }
          break;
      // BCT: Added case 'date'
      case 'date':
      case 'timeframe':

          if(!col.search) return;
          this.sql_conditions += this.setTimeframes(col.search, fragment);
          break;

      // BCT: Modified to '1' and '0' (from 1 and -1.)
      case 'boolean':
        if(typeof col.search === 'undefined') return;
        if(col.search === '1') {
          this.sql_conditions += " and " + fragment + " = 1";
        }
        if(col.search === '0') {
          this.sql_conditions += " and " + fragment + " = 0";
        }
        break;
    }

  }

}

const reportQueries = require(__dirname + '/../report_queries');
const Fields = require('../report_fields/index').fields;
module.exports = TenantRentManagement;




