'use strict';
var BaseReport = require(__dirname + '/base_report.js');

class RentChangeDeploymentMonth extends BaseReport {
  constructor(connection, company, filters, format, name, properties = [],report_name) {

    super(connection, company, filters, format, name, properties,report_name);

    this.config.name = 'Past Rent Changes';
    this.config.filename =  'rent_change_deployment_month';

    this.config.column_structure = [].concat(
      Object.values(Fields.rent_change_deployment_month),
    );

    this.config.default_columns = [
      'rent_change_deployment_month',
      'rent_change_total_rent_changes',
      'rent_change_system_rent_changes',
      'rent_change_manual_rent_changes',
      'rent_change_store_occupancy',
      'rent_change_over_under_sell_rate',
      'rent_change_variance_rent_sell',
      'rent_change_approval_deadline_left',
      'rent_change_approval_status',
      'rent_change_store_occupancy',
      'rent_change_move_out_in_90_days',
      'rent_change_deployed_rent_changes',
      'rent_change_approved_rent_changes',
      'rent_change_scheduled_rent_changes',
      'rent_change_cancelled_rent_changes',
      'rent_change_skipped_rent_changes',
      'rent_change_total_rent_increase',
      'rent_change_approval_deadline_date'
    ];

    let properties_condition = properties?.length ? ` lrr.property_id IN (${properties.join(',')}) AND` : ``;

    this.sql_tables += `
        (
            SELECT
                unfiltered_lrr.deployment_month,
                unfiltered_lrr.property_id,
                unfiltered_lrr.total_rent_changes,
                unfiltered_lrr.first_effective_date,
                prms.notification_period,
                DATE_SUB(
                    filtered_lrr.first_applicable_effective_date,
                    INTERVAL IFNULL(prms.notification_period, 30) DAY
                ) AS first_notification_day,
                DATE_ADD(
                    filtered_lrr.last_applicable_effective_date,
                    INTERVAL 90 day
                ) AS ninety_days_after_effective_date
            FROM (
                SELECT
                    lrr.deployment_month,
                    lrr.property_id,
                    COUNT(lrr.id) AS total_rent_changes,
                    MIN(lrr.effective_date) AS first_effective_date
                FROM lease_rent_changes lrr
                WHERE
                    deleted_at IS NULL AND
                    ${ properties_condition }
                    effective_date IS NOT NULL
                GROUP BY lrr.deployment_month, lrr.property_id
            ) unfiltered_lrr
            LEFT JOIN (
                SELECT
                    lrr.deployment_month,
                    lrr.property_id,
                    MIN(lrr.effective_date) AS first_applicable_effective_date,
                    MAX(lrr.effective_date) AS last_applicable_effective_date
                FROM lease_rent_changes lrr
                WHERE
                    deleted_at IS NULL AND
                    effective_date IS NOT NULL AND
                    ${ properties_condition }
                    lrr.status NOT IN ('cancelled', 'skipped')
                GROUP BY lrr.deployment_month, lrr.property_id
            ) filtered_lrr ON
                filtered_lrr.deployment_month =  unfiltered_lrr.deployment_month AND
                filtered_lrr.property_id =  unfiltered_lrr.property_id
            LEFT JOIN
                property_rent_management_settings prms
                ON prms.property_id = unfiltered_lrr.property_id
        ) AS lrrm
    `;
    
    this.sql_conditions += ` WHERE 1 = 1`;

    this.sql_fragments = Object.assign({},
      new reportQueries.RentChangeDeploymentMonth({
        property_id: `lrrm.property_id`,
        deployment_month: `lrrm.deployment_month`,
        first_notification_day: `lrrm.first_notification_day`,
        ninety_days_after_effective_date: `lrrm.ninety_days_after_effective_date`,
        total_rent_changes: `lrrm.total_rent_changes`,
        custom_date: filters?.search?.custom_date
      }).queries
    );
  }

  async count(connection, columns, conditions, groups, filter_structure) {
    let query = `SELECT COUNT(lrrm.deployment_month) AS count ` + this.sql_tables + this.sql_conditions + this.group_sql+ this.sql_having_conditions;
    let count = await connection.queryAsync(query);
    return count[0]?.count ?? 0;
  }
  
  setParams(filters) {
    if(filters.pivot_mode && filters.pivot_mode.type) return;

    if(filters.sort) {
      this.searchParams.sort =  filters.sort.field;
      this.searchParams.sortdir =  filters.sort.sort || 'ASC';
      if(filters.sort && filters.sort.field && filters.columns.find(c => c.key === filters.sort.field) ){
        this.sql_params += " ORDER BY ";
        switch (filters.sort.field) {
          case 'rent_change_deployment_month':
            this.sql_params += ` lrrm.first_effective_date ${filters.sort.dir || filters.sort.sort} `;
            break;
          case 'rent_change_move_out_in_90_days':
            this.sql_params += `
              IF (
                rent_change_move_out_in_90_days = 'N/A',
                99999,
                CAST(rent_change_move_out_in_90_days AS DECIMAL)
              ) ${filters.sort.dir || filters.sort.sort}
            `
            break;
          case `rent_change_variance_rent_sell`:
            this.sql_params += `
                rent_change_variance_rent_sell IS NULL, rent_change_variance_rent_sell
              ${filters.sort.dir || filters.sort.sort}`
            break;
          default:
            this.sql_params += filters.sort.field;
            this.sql_params += ` ${filters.sort.dir || filters.sort.sort}`;
        }
      } else {
        this.sql_params += ` ORDER BY lrrm.first_effective_date DESC `;
      }
    }

    if (filters.limit) {
      this.sql_params += " LIMIT ";
      this.sql_params += filters.offset;
      this.sql_params += ", ";
      this.sql_params += filters.limit;
    }
  }

}

const reportQueries = require(__dirname + '/../report_queries');
const Fields = require('../report_fields/index').fields;
module.exports = RentChangeDeploymentMonth;

