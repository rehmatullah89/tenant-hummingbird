const TABLE_NAME = "property_rent_management_settings"
const { generateUpdateQueryPatch, generateInsertQueryPatch } = require("../../modules/utils.js")

module.exports = {
    /**
     *
     * @param {SQLConnectionObject} connection SQL connection instance
     * @param {String} id paramater to select value
     * @param {String} clause under what clause the values should be fetched
     * @returns resulatant object
     */
    getConfiguration(connection, id, clause = "property_id") {
        let query = `SELECT * FROM ${TABLE_NAME} WHERE ${clause} = ?`

        return connection.queryAsync(query, [id]).then((res) => (res.length ? res[0] : null))
    },

    checkExistance(connection, property_id) {
		let query = `
			SELECT exists(
				select * 
				FROM property_rent_management_settings prms 
				WHERE prms.property_id = ${property_id}
			) as exist;`
		return connection.queryAsync(query).then(res=> !!res[0]?.exist)

	},

    /**
     *
     * @param {SQLConnectionObject} connection SQL connection instance
     * @param {Array} data list of values to be inserted
     * @returns resulatant object
     */
     saveConfiguration(connection, data) {
        let queryEssentials = generateInsertQueryPatch(data, [
            "property_id",
            "rent_engine",
            "enable_automatic_rent_change",
            "automation_enabled_by_admin"
        ])
        let query = `INSERT INTO ${TABLE_NAME}(${queryEssentials.fields}) VALUES ${queryEssentials.escape_sequence}`

        return connection.queryAsync(query, queryEssentials.values)
    },
    /**
     *
     * @param {SQLConnectionObject} connection SQL connection instance
     * @param {*} clause under which condition record should update
     * @param {*} data key value pairs on basis of { field: value }
     * @returns resulatant object
     */
    updateConfiguration(connection, clause, data) {
        let builder = generateUpdateQueryPatch(data)
        
        if (!(builder && clause)) return
        let query = `UPDATE ${TABLE_NAME} SET ${builder} WHERE ${clause}`
        return connection.queryAsync(query, Object.values(data))
    },




    getInvalidLeaseIdsByLeaseIds(connection, leasesIds, propertyId) {
        let sql = `SELECT 
            l.id,
            CASE
                WHEN u.property_id != ${propertyId} THEN 'Invalid'
                WHEN l.end_date IS NOT NULL AND l.end_date <= CURDATE() THEN 'Moved out'
            END AS lease_status
        FROM leases l
        JOIN units u ON l.unit_id = u.id
        WHERE 
            l.id IN (?) AND 
            (
                (u.property_id != ${propertyId}) OR 
                (
                    u.property_id = ${propertyId} AND
                    (l.end_date is NOT NULL AND l.end_date <= CURDATE())
                )
            );`
        return connection.queryAsync(sql, [leasesIds]);
        
    },

    /*
	function will output rent enabled properties during its midnight time.
  	*/
  	findRentManagementEnabledProperties(connection, company_id, property_id, bypass = null) {
		let sql = `
			SELECT
				p.id,
				p.id AS property_id,
				p.name AS property_name,
				p.company_id,
				p.gds_id,
				p.utc_offset,
				prms.approval_type,
				prms.notification_period,
				prms.notification_document_id,
				prms.min_rent_change_interval,
				IFNULL(
					prms.round_to,
					crms.round_to
				) AS round_to,
				IFNULL(prms.advance_rent_change_queue_months, 3) AS advance_rent_change_queue_months,
				IF(
					prmdm.id,
					JSON_ARRAYAGG(
						JSON_OBJECT(
							'subject', prmdm.subject,
							'message', prmdm.message,
							'delivery_method_id', prmdm.delivery_method_id,
							'delivery_method', dm.gds_key
						)
					),
					'[]'
				) AS notification_methods,
				IFNULL(
					(
						SELECT
							lt.invoiceSendDay
						FROM
							properties_lease_templates plt
						JOIN lease_templates lt ON plt.lease_template_id = lt.id
						WHERE
							plt.property_id = p.id AND
							lt.status = 1 AND
							lt.unit_type = 'parking'
					),
					(
						select
							lt.invoiceSendDay
						from
							lease_templates lt
						WHERE
							lt.company_id = p.company_id AND
							lt.status = 1 AND
							lt.is_default = 1 AND
							lt.unit_type = 'parking'
					)
				) as parkingInvoiceSendDay,
				IFNULL(
					(
						SELECT
							lt.invoiceSendDay
						FROM
							properties_lease_templates plt
						JOIN lease_templates lt ON plt.lease_template_id = lt.id
						WHERE
							plt.property_id = p.id AND
							lt.status = 1 AND
							lt.unit_type = 'storage'
					),
					(
						select
							lt.invoiceSendDay
						from
							lease_templates lt
						WHERE
							lt.company_id = p.company_id AND
							lt.status = 1 AND
							lt.is_default = 1 AND
							lt.unit_type = 'storage'
					)
				) as storageInvoiceSendDay
			FROM property_rent_management_settings prms
			JOIN properties p ON p.id = prms.property_id
			LEFT OUTER JOIN company_rent_management_settings crms ON crms.company_id = p.company_id
			LEFT OUTER JOIN property_rent_management_delivery_methods prmdm ON prmdm.property_id = prms.property_id AND prmdm.active = 1
			LEFT OUTER JOIN delivery_methods dm ON dm.id = prmdm.delivery_method_id
			WHERE
				prms.active = 1 AND
				p.company_id = ${connection.escape(company_id)}
		`
		if(!bypass) {
		sql += ' AND (SELECT HOUR(CONVERT_TZ(UTC_TIMESTAMP() , "+00:00", p.utc_offset))) >= 0 AND (SELECT HOUR(CONVERT_TZ(UTC_TIMESTAMP() , "+00:00", p.utc_offset))) < 1 '
		}
		if (property_id) {
		sql += ` AND p.id = ${connection.escape(property_id)}`
		}
		sql += ` GROUP BY p.id`
		
		return connection.queryAsync(sql);
  	},
}