const mysql = require('mysql')

const { generateUpdateQueryPatch, generateInsertQueryPatch } = require("../../modules/utils.js")
const TABLE_NAME = "property_rent_management_settings"

module.exports = {
	getConfiguration: function (connection, property_id, clause = "property_id") {
		let query = `
			SELECT
				active, approval_type, round_to,
				notification_period, notification_document_id,
				advance_rent_change_queue_months,
				min_rent_change_interval, rent_cap, rent_engine, 
				enable_automatic_rent_change, automation_enabled_by_admin
			FROM ${TABLE_NAME}
			WHERE ${clause} = ?
		`
		return connection.queryAsync(query, [property_id]).then(rc => rc.length ? rc[0] : null);
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
	 * @param {SQLConnectionObject} connectio	n SQL connection instance
	 * @param {Array} data list of values to be inserted
	 * @returns resulatant object
	 */
	saveConfiguration(connection, data) {
		let queryEssentials = generateInsertQueryPatch(data, Object.keys(data))
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

	/**
	 *
	 * @param {SQLConnectionObject} connection SQL connection instance
	 * @param {Number} companyId Company id to compare with
	 * @param {Array} rentPlanIds Collection of rent plan id's
	 * @returns a boolean showing a set of rent plans are valid or not
	 */
	isValidRentPlans(connection, companyId, rentPlanIds) {
		rentPlanIds = Array.isArray(rentPlanIds) ? rentPlanIds : [rentPlanIds]
		if (rentPlanIds.length === 0) return false
		let sql = `
					SELECT EXISTS (
						SELECT NULL
						FROM rent_management_plans rmp
						WHERE
							rmp.id IN ? AND
							rmp.company_id = ? AND
							rmp.deleted_at IS NULL
					) as valid_rent_plans
				`
		return connection.queryAsync(sql, [Array(rentPlanIds), companyId]).then((result) => !!result[0]?.valid_rent_plans)
	},
	/**
	 *
	 * @param {SQLConnectionObject} connection SQL connection instance
	 * @param {Number} propertyId Property id of that leases
	 * @param {Array} leases Collection of lease id's
	 * @returns provided leases with their status in hand
	 */
	retrieveLeaseConfiguration(connection, propertyId, leases, status=null) {
		let sql = `
			SELECT
				l.id as lease_id,
				lrps.rent_plan_id,
				u.property_id,
				lrps.created_contact_id,
				lrps.status,
				lrps.start_date,
				lrps.end_date,
				lrps.created_at,
				lrps.modified_at,
				cl.contact_id AS tenant,
				( IF(STRCMP('${status}','exempt') = 0,
					(
						SELECT 
							JSON_ARRAYAGG(
								JSON_OBJECT(
									'rent_change_id',lrr.id,
									'lease_id',lrr.lease_id,
									'contact_id',cl.contact_id,
									'deployment_month',lrr.deployment_month
								)
							)
						FROM
								lease_rent_changes lrr
						WHERE 
								lrr.effective_date > CURDATE()
								AND lrr.status IN ('initiated', 'approved')
								AND lrr.lease_id = l.id),
						NULL
					)
				) AS rent_changes_to_cancel,
				lrps.id as settings_id
			FROM
				leases l
			JOIN units u ON
				u.id = l.unit_id
			LEFT JOIN lease_rent_plan_settings lrps on
				lrps.lease_id = l.id AND lrps.end_date IS NULL
			LEFT JOIN contact_leases cl ON
					cl.lease_id = l.id AND cl.primary = 1
			WHERE u.property_id = ? AND l.id IN ? AND (l.auction_status IS NULL OR l.auction_status NOT IN ('auction_payment','move_out'))
			GROUP BY l.id
			HAVING MIN(cl.contact_id);
		`
		
		return connection.queryAsync(sql, [propertyId, Array(leases)])
	},

	/**
	 *
	 * @param {SQLConnectionObject} connection SQL connection instance
	 * @param {Number} propertyId Property id of that leases
	 * @param {Array} leases Collection of lease id's
	 * @returns provided leases with their status in hand
	 */
	
	retrieveLeaseToPlanConfiguration(connection, propertyId, leases, status = null) {
		let sql = `
			SELECT lrps.*,
				cl.contact_id AS tenant,
				(
					IF(
						STRCMP('${status}', 'exempt') = 0,
						(
							SELECT JSON_ARRAYAGG(
									JSON_OBJECT(
										'rent_change_id',
										lrr.id,
										'lease_id',
										lrr.lease_id,
										'contact_id',
										cl.contact_id
									)
								)
							FROM lease_rent_changes lrr
							WHERE lrr.effective_date > CURDATE()
								AND lrr.status IN ('initiated', 'approved')
								AND lrr.lease_id = lrps.lease_id
						),
						NULL
					)
				) AS rent_changes_to_cancel
			FROM lease_rent_plan_settings lrps
				LEFT JOIN contact_leases cl ON cl.lease_id = lrps.lease_id AND cl.primary = 1
			WHERE lrps.property_id = ?
				AND lrps.end_date IS NULL
				AND lrps.lease_id IN ?
			GROUP BY lrps.lease_id
			HAVING MIN(cl.contact_id);
			`
		return connection.queryAsync(sql, [propertyId, Array(leases)])
	},

	bulkUpdateLeaseToPlanConfig(connection, data) {
		if(data.length === 0) return

		let baseQuery = `UPDATE lease_rent_plan_settings SET ? WHERE id = ?`

		let sql = data.map(config => mysql.format(baseQuery, [config.data, config.id])).join(';')
		
		return connection.queryAsync(sql)
	},

	bulkInsertLeaseToPlanConfig(connection, data) {
		if(data.length === 0) return

		let queryEssentials = generateInsertQueryPatch(data, [
			'lease_id',
			'rent_plan_id',
			'property_id',
			'created_contact_id',
			'status',
			'start_date'
		])

		let query = `INSERT INTO lease_rent_plan_settings(${queryEssentials.fields}) VALUES ${queryEssentials.escape_sequence}`

        return connection.queryAsync(query, [queryEssentials.values])
	},

	findRentPlanByLeaseId(connection, leaseId) {
		let sql = `SELECT * FROM lease_rent_plan_settings lrps WHERE lease_id = ${leaseId} AND status <> 'inactive' AND end_date IS NULL`;
		return connection.queryAsync(sql).then(data => data.length ? data[0] : false)
	},

	findPlanByRentChangeId(connection, rent_change_id) {
		let sql = `SELECT rmp.name, rmp.id FROM rent_management_plans rmp
			JOIN lease_rent_changes lrr ON lrr.rent_plan_id = rmp.id
			WHERE lrr.id = ${rent_change_id};`
		return connection.queryAsync(sql).then(data => data.length ? data[0] : null)
	},

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
		return connection.queryAsync(sql).then(data => data.length ? data[0] : false);
	},

	async fetchCustomVarianceSettings(connection, propertyId) {
		let sql = `
			SELECT
				prms.enable_custom_variance,
				prms.custom_variance_date
			FROM property_rent_management_settings prms
			WHERE property_id = ?
		`
		let result = await connection.queryAsync(sql, [propertyId])
		return result[0]
	}
};
