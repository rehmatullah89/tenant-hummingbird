'use strict';
var BaseReport = require(__dirname + '/base_report.js');
var moment = require('moment');

let lead_id             = " l.id ";
let unit_id             = " l.unit_id ";
let property_id         = " l.property_id ";
let category_id         = ' l.category_id ';
let contact_id          = ' l.contact_id ';
let address_id          = " (select address_id from properties where id = " + property_id + ") ";
let touchpoints_id      = " l.touchpoint_id ";

let lease_id            = " l.lease_id ";
let reservation_id      = "(select id from reservations where lease_id = " + lease_id + ") ";

class  LeadActivity extends BaseReport{
    constructor(connection, company, filters, format, name, properties = [],report_name) {
        super(connection, company, filters, format, name, properties,report_name);

        this.sql_fragments = Object.assign({},
            new reportQueries.Lead({
              id: lead_id,
              contact_id,
              category_id,
              property_id,
              unit_id,
              reservation_id,
              touchpoints_id
            }, this.report_dates.end).queries,
            new reportQueries.Unit({id: unit_id},this.report_dates.end).queries,
            new reportQueries.Property({id: property_id},this.report_dates.end).queries,
          );


          this.config.name = 'Lead Activity';
          this.config.filename =  'lead_activity';
      
          this.config.column_structure = [].concat(
            Object.values(Fields.property),
            Object.values(Fields.unit),
            Object.values(Fields.lead),
            Object.values(Fields.lead_summary),
            Object.values(Fields.reservation),
          );

          this.config.filter_structure = [{
            label: "Report Period",
            key: "report_period",
            input: "timeframe"
          }];
      
          this.config.filters.sort = {
            field: 'lead_created',
            dir: 'DESC'
        };
      
          this.config.filters.search['report_period'] = {
            days: 0,
            end_date: "",
            label: "This Month",
            period: "",
            relation: "",
            start_date: "",
          }
      
      
        this.config.default_columns = [
            'lead_property_name',
            'touchpoints_platform_source',
            'lead_created',
            'lead_status',
            'lead_name',
            'lead_phone',
            'lead_email',
            'lead_category',
            'lead_move_in_date',
            'lead_unit_number',
            'reservation_time',
            'reservation_expires',
            'lead_content',
            'lead_created_by_name'
        ];
      
        this.sql_tables += ' leads l ';
        this.sql_conditions = ' WHERE l.contact_id in (select id from contacts where company_id = ' + this.company.id + ' ) ';
        this.sql_conditions += " AND l.status <> '' ";
        if(properties.length){
            this.sql_conditions += ' and l.property_id in (' + properties.join(', ') + ")";
        }

        this.property_id = 'l.property_id'

        console.log('company-id', this.company.id )
      
        }

        setFilterConditions(connection, conditions, structure, columns, sql_fragments ){
          if(conditions.report_period){
            this.sql_conditions += this.setTimeframes(conditions.report_period, " CONVERT_TZ(l.created, '+00:00', (SELECT utc_offset FROM properties WHERE id = " + this.property_id + ")) ");
          }
      
        }
    }
      
    const reportQueries = require(__dirname + '/../report_queries');
    const Fields = require('../report_fields/index').fields;
    module.exports = LeadActivity;