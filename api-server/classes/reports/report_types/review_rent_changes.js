const BaseReport = require(__dirname + '/base_report.js');
const Fields = require("../report_fields/index").fields;
const reportQueries = require(__dirname + "/../report_queries");
const LeaseRentChangeModel = require("../../../models/rent-management/lease_rent_change.js")

const rentChangeId = `lrrm.id`;
const leaseId = `lrrm.lease_id`;
const unitId = `um.id`;
const tenantId = `( SELECT contact_id FROM contact_leases cl WHERE cl.lease_id = ${leaseId} AND cl.primary = 1 )`;
const propertyId = `lrrm.property_id`;
const notificationPeriod = `prms.notification_period`

class ReviewRentChangesReport extends BaseReport{
  constructor(connection, company, filters, format, name, properties = [],report_name) {
    super(connection, company, filters, format, name, properties,report_name);

    this.data = [];

    this.config = {
      name: 'Review Rent Changes',
      filename: 'review_rent_changes',
      column_structure: []
        .concat(Object.values(Fields.review_rent_changes))
        .concat(Object.values(Fields.tenant_rent_management))
        .concat(Object.values(Fields.tenant_summary))
        .concat(Object.values(Fields.lease))
        .concat(Object.values(Fields.tenant))
        .concat(Object.values(Fields.unit))
        .concat(Fields.lease_summary.lease_last_rent_change_date)
      ,
      filter_structure: [],
      filters: {
        search: {
            search: ""
        },
        columns: [],
        sort: {
          field: "rentchange_tagged",
          dir: "DESC"
        },
        pivot_mode: {
            type: "",
            column: {},
            row: {},
            pivot_field: {},
            agg_method: ""
        },
        groups: [],
        limit: 0,
        page: 1,
        offset: 0
      },
      default_columns: [
        `rentchange_property_id`,
        `tenant_rent_plan_id`,
        `lease_id`,
        `rentchange_property_name`,
        `rentchange_tagged`,
        `rentchange_tenant_name`,
        `rentchange_unit_number`,
        `rentchange_notification_date`,
        `rentchange_notification_status`,
        `unit_price`,
        `rentchange_rent_variance`,
        `rentchange_rent_variance_percent`,
        `rentchange_rent_variance_combined`,
        `rentchange_old_rent`,
        `rentchange_new_rent`,
        `rentchange_recent_note`,
        `rentchange_effective_date`,
        `rentchange_status`,
        `rentchange_status_modification_date`,
        `rentchange_notification_sent`,
        `rentchange_type`,
        `tenant_selected_rent_plan`,
        `lease_rent_plan_status`,
        `lease_months_of_stay`,
        `tenant_last_rent_change_days`,
        'tenant_days_left_to_rent_change',
        `rentchange_affect_timeline`,
        `rentchange_created_by`,
        `rentchange_last_updated_by`,
        `rentchange_auction_status`,
        `rentchange_current_rent_variance`,
        `rentchange_new_rent_variance`,
        `lease_last_rent_change_date`,
        `unit_size`,
        `unit_type`,
        `tenant_space_count`
      ]
    }

    let
      reviewRentChanges =  new reportQueries.ReviewRentChanges({ id: rentChangeId, leaseId, unitId, tenantId, propertyId, notificationPeriod }, this.report_dates.end),
      lease = new reportQueries.Lease({ id: leaseId, property_id: propertyId },this.report_dates.end, this.report_dates.start),
      tenantRentManagement = new reportQueries.TenantRentManagement({id: leaseId}),
      tenant = new reportQueries.Tenant({ id: tenantId },this.report_dates.end),
      unit = new reportQueries.Unit({ id: unitId },this.report_dates.end)
    ;


    this.sql_fragments = Object.assign({},
      reviewRentChanges.queries,
      tenantRentManagement.queries,
      lease.queries,
      tenant.queries,
      unit.queries
    );

    this.sql_tables += `
      lease_rent_changes lrrm
      JOIN leases lm ON lrrm.lease_id = lm.id
      JOIN units um ON lm.unit_id = um.id
      LEFT JOIN property_rent_management_settings prms ON prms.property_id = lrrm.property_id
    `;

    this.sql_conditions = ` WHERE lrrm.deleted_at IS NULL AND DATE_FORMAT(lrrm.effective_date,"%b %Y") = '${filters?.search?.rent_change_deployment_month}'`;
    this.property_id = ' (select property_id from units where id = um.id and number != "POS$") '

    if (properties?.length) this.sql_conditions += ` AND lrrm.property_id in (${properties.join(`, `)})`

  }

  setParams(filters) {
    if(filters.pivot_mode && filters.pivot_mode.type) return;
    if(filters.sort) {
      this.searchParams.sort =  filters.sort.field;
      this.searchParams.sortdir =  filters.sort.sort || 'ASC';
      if(filters.sort && filters.sort.field && filters.columns.find(c => c.key === filters.sort.field)){
        this.sql_params += ` order by  ${filters.sort.field} ${filters.sort.dir || filters.sort.sort}`;
        if(filters.sort.field === 'rentchange_tagged') this.sql_params += ` , rentchange_unit_number ASC`;
      }
    }
    if (filters.limit) {
      this.sql_params += " limit ";
      this.sql_params += filters.offset;
      this.sql_params += ", ";
      this.sql_params += filters.limit;
    }
  }

  async count(connection, columns, conditions, groups, filter_structure){
    let query = "SELECT count(lrrm.id) as count " + this.sql_tables + this.sql_conditions + this.group_sql;
    console.log("query", query)
    let count = await connection.queryAsync(query);
    return count[0].count;
  }

  async search(connection, columns, conditions, params, groups, filter_structure, sql_fragments){
    //trim sql_columns here, so that setSearch Can be freely overwritten
    this.sql_columns = this.sql_columns.trim().slice(0, -1);
    if(this.sql_having_conditions){
      this.sql_having_conditions= ' HAVING 1 ' + this.sql_having_conditions;
    }
    let query = this.sql_columns + this.sql_tables + this.sql_conditions + this.group_sql + this.sql_having_conditions +  this.sql_params;
    console.log("QQQQQABC", query);

    if (this.format === "xlsx" && this.config?.custom_config) {
      let data = {
        deployment_month: this.filters.search["rent_change_deployment_month"],
        property_id: this.properties[0],
        action: "download",
        created_by: this.config.custom_config.user_id,
      }
      await LeaseRentChangeModel.saveExportRentChangeHistory(connection, data)
    }

    return await connection.queryAsync(query);

  }

}

module.exports = ReviewRentChangesReport;