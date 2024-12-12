const BaseReport = require(__dirname + "/base_report");
const reportQueries = require(__dirname + "/../report_queries");
const Fields = require("../report_fields/index").fields
const ug_id = " ugm.id ";

class PropertyRentManagement extends BaseReport {

    constructor(connection, company, filters, format, name, properties = [], report_name) {
        super(connection, company, filters, format, name, properties, report_name);

        this.data = []
        this.config = {
            name: "Property Rent Management",
            filename: "property_rent_management",
            column_structure: []
                .concat(Object.values(Fields.revenue_management))
                .concat(Object.values(Fields.property_rent_management)),
            filter_structure: [],
            filters: {
                search: {
                    search: ""
                },
                columns: [],
                sort: {
                    field: "spacegroup_spacetype",
                    dir: "ASC"
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
                "spacegroup_id",
                "spacegroup_spacetype",
                "spacegroup_amenities",
                "spacegroup_size",
                "spacegroup_category",
                "spacegroup_id_hash",
                "spacegroup_spaces",
                "spacegroup_spaces_vacant",
                "spacegroup_avg_days_vacant",
                "spacegroup_occupied_spaces",
                "spacegroup_occupancy",
                "spacegroup_avg_rent_per_space",
                "spacegroup_avg_rent_per_sqft",
                "spacegroup_avg_set_rate",
                "spacegroup_avg_set_rate_per_sqft",
                "spacegroup_avg_sell_rate",
                "spacegroup_avg_sell_rate_per_sqft",
                "spacegroup_variance_percentage",
                "spacegroup_variance_amount",
                "spacegroup_current_income",
                "spacegroup_potential_income",
                "spacegroup_gross_potential_revenue",
                "spacegroup_economic_occupancy",
                "spacegroup_rent_increase_plans",
            ]
        }

        let default_space_group_profile_id = `(SELECT default_unit_group_profile_id FROM property_rate_management_settings prms WHERE prms.property_id IN (${properties.join(',')}))`;

        this.sql_tables += "unit_groups ugm";
        this.sql_conditions = ` WHERE ugm.unit_group_profile_id IN ${default_space_group_profile_id}`;
        this.group_sql =  'GROUP BY CONCAT(UCASE(LEFT(ugm.space_type, 1)), SUBSTRING(ugm.space_type, 2)),ugm.id'
        this.sql_fragments = Object.assign({}, 
            new reportQueries.PropertyRentManagement({ 
                ids: properties, 
                company_id: company.id, 
                default_unit_group_profile_id: default_space_group_profile_id, 
                ug_id: ug_id 
            }).queries
        );

    }

    setParams(filters) {

        if(filters.pivot_mode && filters.pivot_mode.type) return;
    
        if(filters.sort) {
          this.searchParams.sort =  filters.sort.field;
          this.searchParams.sortdir =  filters.sort.sort || 'ASC';
          if(filters.sort && filters.sort.field && filters.columns.find(c => c.key === filters.sort.field) ){
            this.sql_params += " order by ";
            switch (filters.sort.field) {
              case 'unit_number':
                this.sql_params += ` unit_number_str ${filters.sort.dir || filters.sort.sort}, unit_number_no ${filters.sort.dir || filters.sort.sort}`;
                break;
              case 'spacegroup_size':
                this.sql_params += ` 	
                CONCAT(UCASE(LEFT(ugm.space_type, 1)), SUBSTRING(ugm.space_type, 2)),
                (CASE 
                  WHEN ugm.tier_type = 'size' THEN CAST(ugm.width AS DECIMAL(10,2)) * CAST(ugm.length AS DECIMAL(10,2))
                  WHEN ugm.tier_type = 'area' THEN CAST(ugm.min_sqft AS DECIMAL(10,2)) + CAST(IFNULL(ugm.max_sqft,99999) AS DECIMAL(10,2))
                END) ${filters.sort.dir || filters.sort.sort}`;
                break;
              default:
                this.sql_params += filters.sort.field;
                this.sql_params += ` ${filters.sort.dir || filters.sort.sort}`;
            }
    
            // this.sql_params += ',id ASC'
          }
        }
    
        if (filters.limit) {
          this.sql_params += " limit ";
          this.sql_params += filters.offset;
          this.sql_params += ", ";
          this.sql_params += filters.limit;
        }
    }

    async count(connection, columns, conditions, groups, filter_structure) {
        let query = `SELECT count(${ug_id}) as count ` + this.sql_tables + this.sql_conditions + this.group_sql+ this.sql_having_conditions;
        let count = await connection.queryAsync(query);
        return count?.length ?? 0;
    }


}

module.exports = PropertyRentManagement;