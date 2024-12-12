'use strict';
var BaseReport = require(__dirname + '/base_report.js');
var moment = require('moment');

let lease_id            = ' ls.id ';
let unit_id             = " ls.unit_id "; 
let promotion_id        = " ls.promotion_id ";
let discount_id         = " ls.discount_id ";
let contact_id          = " (SELECT contact_id FROM contact_leases WHERE lease_id = " + lease_id + " and `primary` = 1)";
let property_id         = " (select property_id from units where id = " + unit_id +  ") ";
 
//Lead
let lead_id             = ' (SELECT id from leads where contact_id = ' + contact_id + ' and lease_id = ' + lease_id + ' ) ';
let touchpoints_id      = ' (SELECT touchpoint_id from leads where contact_id = ' + contact_id + ') ';
let category_id         = ' (SELECT category_id from units where id = ' + unit_id + ') ';

class  PendingMoveIns extends BaseReport{
    constructor(connection, company, filters, format, name, properties = [],report_name) {
        super(connection, company, filters, format, name, properties,report_name);

        this.sql_fragments = Object.assign({},
            new reportQueries.Lead({id: lead_id, contact_id, lead_id, promotion_id, unit_id, category_id, touchpoints_id},this.report_dates.end).queries,
            new reportQueries.Lease({id: lease_id, unit_id, promotion_id, discount_id}, this.report_dates.end, this.report_dates.start).queries,
            new reportQueries.Contact({id: contact_id},this.report_dates.end).queries,
            new reportQueries.Unit({id: unit_id},this.report_dates.end).queries,
            new reportQueries.Property({id: property_id},this.report_dates.end).queries,
          );


          this.config.name = 'Pending Move-In Activity';
          this.config.filename =  'pending_move_in_activity';

          Fields.lease.lease_created.label = "Pending Move In Created";
      
          this.config.column_structure = [].concat( 
            Object.values(Fields.lease),
            Object.values(Fields.lease_summary),
            Object.values(Fields.lead),
            Object.values(Fields.lead_summary),
            Object.values(Fields.unit),
            Object.values(Fields.unit_summary),
            Object.values(Fields.property),
            Object.values(Fields.payment_method)
          );
      
        this.config.filters.sort = {
            field: 'lease_start_date',
            dir: 'DESC'
        };

        console.log('filtersss',filters)
      
      
        this.config.default_columns = [
            'property_name',
            'lease_created',
            'lease_document_status',
            'unit_number',
            'lead_name',
            'lead_email',
            'lead_phone',
            'unit_size',
            'unit_category',
            'unit_price',
            'lease_start_date',
            'lease_active_insurance_coverage',
            'lease_promotions_amount',
            'lease_promotions',
            'lease_is_autopay',
            'lease_created_by_name',
        ];
        
        this.sql_tables += ' leases ls ';
        this.sql_conditions = ' WHERE status = 2 and unit_id in ( SELECT id FROM units WHERE property_id in (' + properties.join(', ') + ') )';
        /*if(properties.length){
            Select * from leases where " + " unit_id in (select id from units where property_id in (select id from properties where company_id = " + connection.escape(company_id) + ")) and status = 2 
            this.sql_conditions += ' and ld.property_id in (' + properties.join(', ') + ")";
            console.log('property-id', this.property_id)
        }*/
      
        }
    }
      
    const reportQueries = require(__dirname + '/../report_queries');
    const Fields = require('../report_fields/index').fields;
    module.exports = PendingMoveIns;