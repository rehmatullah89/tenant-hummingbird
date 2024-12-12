const SpaceReport = require('./units.js')
const Fields = require('../report_fields/index').fields;

class SpaceGroupSpaces extends SpaceReport {
    constructor(connection, company, filters, format, name, properties = [], report_name) {
        super(connection, company, filters, format, name, properties, report_name)

        // Override some properties
        this.config.name = 'space_group_spaces'
        this.config.filename = 'space_group_spaces'
        this.config.total_count = true,
        this.config.column_structure.push(
            ...Object.values(Fields.lease)
        )
        this.config.default_columns = [
            'unit_number',
            'unit_size',
            'unit_type',
            'unit_set_rate',
            'unit_price',
            'unit_status',
            'unit_days_vacant',
            'unit_amenities',
            'unit_floor',
            'lease_rented_days',
            'lease_rented_months'
        ]
        this.config.filters.sort = {
            field: 'unit_status',
            dir: 'ASC'
        }
    }

    async generateTotalCount(){
        let query = "SELECT count(id) as count " + this.sql_tables + this.sql_conditions + this.group_sql + getSpaceGroupPreferences(this.filters?.search ?? {});
        let count = await this.connection.queryAsync(query);
        this.total_count =  count[0].count;
    }

    setFilterConditions(connection, conditions, structure, columns, sql_fragments ) {
        if(conditions && conditions.unit_id) {
          this.sql_conditions += ` and ${sql_fragments['unit_id']} = ${conditions.unit_id}`;
        }
        this.sql_conditions += getSpaceGroupPreferences(conditions ?? {})
    }
}

// ********** In house utility methods **********

/**
 * @description Get space group preferences query if spacegroup id exists in request
 * @param {Object} searchParams
 * @returns {String} query to be appended
 */
function getSpaceGroupPreferences(searchParams) {
    let { space_group_id } = searchParams ?? {}

    if (!space_group_id) return ''

    let query = ` AND u.id IN (SELECT unit_id FROM unit_group_units ugu WHERE ugu.unit_groups_id = ${space_group_id})`

    return query
}
// ********** ************************* **********

module.exports = SpaceGroupSpaces
