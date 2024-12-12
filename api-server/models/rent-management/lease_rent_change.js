const mysql = require(`mysql`);
const e = require(__dirname + '/../../modules/error_handler.js');
const TABLE_NAME = "lease_rent_changes";
const TABLE_NAME_HISTORY = "lease_rent_change_history";

module.exports = {

    fetchConsolidatedRentChangeData: async function(connection, rentChangeIds) {
        const sql = `
            SELECT
                lrr.id AS 'rent_change_id',
                lrr.effective_date AS 'effective_date',
                lrr.status AS 'rent_change_status',
                lrr.\`type\` AS 'type',
                lrr.lease_id AS 'lease_id',
                lrr.property_id AS 'property_id',
                lrr.rent_plan_id AS 'rent_plan_id',
                lrr.rent_plan_trigger AS 'rent_plan_trigger',
                lrr.affect_timeline AS 'affect_timeline',
                lrr.change_type AS 'change_type',
                lrr.change_value AS 'change_value',
                lrr.change_amt AS 'change_amt',
                lrr.new_rent_amt AS 'new_rent_amt',
                lrr.target_date AS 'target_date',
                lrr.created_by AS 'created_by',
                lrr.tagged AS 'tagged',
                lrr.notification_status AS notification_status,
                lrr.resolved AS resolved,
                prms.min_rent_change_interval AS 'min_rent_change_interval',
                prms.notification_period AS notification_period,
                l.bill_day AS bill_day,
                cl.contact_id AS 'contact_id',
                (
                    SELECT JSON_ARRAYAGG(JSON_OBJECT('status', status, 'effective_date', effective_date))
                    FROM lease_rent_changes
                    WHERE
                        effective_date > lrr.effective_date AND
                        status IN ('approved', 'initiated', 'deployed') AND
                        lease_id = lrr.lease_id AND deleted_at IS NULL
                ) AS 'future_rent_changes',
                l.auction_status,
                (
                    SELECT JSON_OBJECT(
                        'id', i.id,
                        'status', i.status,
                        'resolved', i.resolved
                    )
                    FROM interactions i
                    JOIN lease_rent_change_notifications lrcn ON lrcn.interaction_id = i.id
                    WHERE lrcn.lease_rent_change_id = lrr.id
                    ORDER BY lrcn.id DESC
                    LIMIT 1
                ) AS interaction
            FROM lease_rent_changes lrr
            JOIN leases l ON l.id = lrr.lease_id
            JOIN contact_leases cl ON cl.lease_id = lrr.lease_id AND cl.primary = 1
            JOIN property_rent_management_settings prms ON prms.property_id = lrr.property_id
            WHERE lrr.id IN (?)
            GROUP BY lrr.id
            HAVING MIN(cl.contact_id)
        `; // HAVING statement was added to handle the condition were one lease have multiple primary contacts
        return await connection.queryAsync(sql, [rentChangeIds]).then(res => res || []);
    },

    update: async function(connection, data, rentChangeIds) {

        if (Array.isArray(rentChangeIds)) rentChangeIds = rentChangeIds.join(`, `);

        let query = `UPDATE ${TABLE_NAME} SET ? WHERE id IN (${rentChangeIds})`
        await connection.queryAsync(query, data);
    },

    fetchRentChangesById: function(connection, rent_change_id) {
        let query = `SELECT
            type, lease_id, rent_plan_id,
            service_id, status, notification_status,
            affect_timeline, change_type, change_value, change_amt,
            notification_sent, new_rent_amt, target_date,
            effective_date, upload_id, interaction_id
            FROM ${TABLE_NAME}
            WHERE id = ${rent_change_id}`
        return connection.queryAsync(query).then((data) => data.length ? data[0] : [])
    },

    insertRentChangeEntry: function(connection, data){
        let sql = `INSERT INTO ${TABLE_NAME} SET ?`
        return connection.queryAsync(sql, data);
    },

    bulkInsert: function (connection, data, insertFields, returnId = false) {
        if (!insertFields) {
            insertFields = [
                `type`,
                `lease_id`,
                `property_id`,
                `rent_plan_id`,
                `service_id`,
                `status`,
                `tagged`,
                `affect_timeline`,
                `notification_status`,
                `change_type`,
                `change_value`,
                `change_amt`,
                `notification_sent`,
                `new_rent_amt`,
                `target_date`,
                `effective_date`,
                `deployment_month`,
                `approved_at`,
                `created_by`,
                `approved_by`,
                `last_modified_by`
            ];
        }

        let sql = `INSERT INTO ${TABLE_NAME} (${insertFields.join(`, `)}) VALUES ?`;
        if (returnId) {
            let promises = data.map((row) => {
                return new Promise((resolve, reject) => {
                    connection.query(sql, [[row]], (error, results) => {
                        if (error) {
                            reject(error);
                        } else {
                            resolve(results.insertId);
                        }
                    });
                });
            });
            return Promise.all(promises);
        } else {
            return connection.queryAsync(sql, [data]);
        }
    },

    insert: function (connection, data, insertFields) {
        if (!insertFields) {
            insertFields = [
                    `type`,
                    `lease_id`,
                    `property_id`,
                    `rent_plan_id`,
                    `service_id`,
                    `status`,
                    `tagged`,
                    `affect_timeline`,
                    `notification_status`,
                    `change_type`,
                    `change_value`,
                    `change_amt`,
                    `notification_sent`,
                    `new_rent_amt`,
                    `target_date`,
                    `effective_date`,
                    `deployment_month`,
                    `approved_at`,
                    `created_by`,
                    `approved_by`,
                    `last_modified_by`
                ];
        }
        let sql = `INSERT INTO ${TABLE_NAME} (${insertFields.join(`, `)}) VALUES ?`;
        return connection.queryAsync(sql, [[data]]);
    },

    bulkInsertHistory: function (connection, data) {
        let sql = `INSERT INTO ${TABLE_NAME_HISTORY} (rent_change_id, type, rent_plan_id, status, tagged, affect_timeline,
        change_type, change_value, change_amt, new_rent_amt, target_date, effective_date, last_modified_by, approved_by, approved_at, property_id, rent_plan_trigger, status_updated_at, updated_by) VALUES ?`;
        return connection.queryAsync(sql, [data]);
    },

    bulkUpdate: function (connection, data) {
        let sql = `INSERT INTO ${TABLE_NAME} (id, type, lease_id, property_id, status, tagged, affect_timeline, change_type, change_value, change_amt, new_rent_amt, target_date, effective_date, deployment_month, 
        approved_at ,approved_by,last_modified_by) VALUES ? 
        ON DUPLICATE KEY UPDATE type = VALUES(type), lease_id = VALUES(lease_id), property_id = VALUES(property_id), status = VALUES(status), tagged = VALUES(tagged), affect_timeline = VALUES(affect_timeline),
        change_type = VALUES(change_type), change_value = VALUES(change_value), change_amt = VALUES(change_amt), new_rent_amt = VALUES(new_rent_amt), target_date = VALUES(target_date),effective_date = VALUES(effective_date), 
        deployment_month = VALUES(deployment_month), approved_at = VALUES(approved_at), approved_by = VALUES(approved_by), last_modified_by = VALUES(last_modified_by)`; 
        return connection.queryAsync(sql, [data]);
    },


    findRentChangeById(connection, rent_change_id){
        let query = `SELECT id, type, lease_id, rent_plan_id, service_id, status, notification_status, change_type, 
        change_value, change_amt, notification_sent, new_rent_amt, target_date, effective_date, change_applied, upload_id, affect_timeline,
        last_modified_by, approved_by, approved_at, property_id, rent_plan_trigger, status_updated_at
        FROM ${TABLE_NAME} WHERE status NOT IN ('skipped','cancelled','deployed') AND id = ${rent_change_id} AND effective_date is NOT NULL AND effective_date > CURDATE() 
        AND deleted_at is NULL
        ORDER BY effective_date DESC`;
        return connection.queryAsync(query).then((data) => data.length ? data[0]: null);
    },
    
    findRentChanges(connection, lease_id){
        let query = `SELECT id, type, lease_id, rent_plan_id, service_id, status, notification_status, change_type, tagged,
        change_value, change_amt, notification_sent, new_rent_amt, target_date, effective_date, change_applied, upload_id, affect_timeline,
        last_modified_by, approved_by, approved_at, property_id, rent_plan_trigger, status_updated_at
        FROM ${TABLE_NAME} WHERE lease_id = ${lease_id} AND effective_date is NOT NULL AND effective_date > CURDATE()
        AND deleted_at is NULL
        ORDER BY effective_date DESC`;
        return connection.queryAsync(query).then((data) => data.length ? data: []);
    },

    deleteRentChanges(connection, rent_change_ids){
        let sql = `UPDATE ${TABLE_NAME} set deleted_at = CURDATE() where id IN (${rent_change_ids})`;
        return connection.queryAsync(sql);
    },
    
    getPendingRentChangeId: function(connection, lease_id) {
        let sql = `SELECT id FROM ${TABLE_NAME} WHERE lease_id =${lease_id} AND status IN ('initiated', 'approved') AND effective_date > CURDATE() AND deleted_at IS NULL ORDER BY effective_date ASC LIMIT 1`;
        return connection.queryAsync(sql).then((data) => data.length ? data[0].id : null);
    },

    async getNextRentChangeByLeaseId(connection, lease_id, property_id) {
        // let sql = `SELECT lrr.status, lrr.id, lrr.lease_id, lrr.new_rent_amt, lrr.change_amt, lrr.target_date, lrr.service_id,prms.notification_period FROM lease_rent_changes lrr
        //     JOIN leases ls ON ls.id = ${lease_id}
        //     JOIN lease_rent_plan_settings  lrps ON lrr.lease_id = lrps.lease_id
        //     JOIN property_rent_management_settings prms ON prms.property_id = lrps.property_id
        //     WHERE ls.status = 1 AND lrps.end_date IS NULL AND lrps.status = 'active' AND lrr.lease_id = ls.id AND lrr.status not in ('skipped', 'cancelled') AND lrr.deleted_at IS NULL AND lrr.target_date > CURDATE();`
        let sql = `SELECT lrr.status, lrr.id, lrr.lease_id, lrr.rent_plan_id, lrr.new_rent_amt, 
            lrr.change_amt, lrr.effective_date, lrr.service_id, lrr.notification_sent, lrr.notification_status, prms.notification_period, lrr.affect_timeline
            FROM lease_rent_changes lrr 
            LEFT JOIN property_rent_management_settings prms ON prms.property_id = ${property_id}
            WHERE lrr.lease_id = ${lease_id}
            AND ( lrr.status = 'initiated' OR lrr.status = 'approved')
            AND lrr.effective_date > CURDATE() 
            ORDER BY lrr.effective_date
            ASC LIMIT 1`;
        return connection.queryAsync(sql).then(data => data.length ? data[0] : null);
    },

    async getLastRentChangeByLeaseId(connection, lease_id) {
        let sql = `
        SELECT
            lrc.id,
            lrc.change_amt,
            lrc.new_rent_amt ,
            (lrc.new_rent_amt - lrc.change_amt) AS old_rent,
            lrc.effective_date,
            ((lrc.change_amt / (lrc.new_rent_amt - lrc.change_amt)) * 100) AS change_percentage
        FROM lease_rent_changes lrc
        WHERE
            lrc.lease_id = ${ lease_id } AND
            lrc.status = 'deployed' AND
            lrc.effective_date < CURRENT_DATE()
        ORDER BY lrc.id
        DESC LIMIT 1
        `
        return connection.queryAsync(sql).then(data => data.length ? data[0] : false);
    },

    async checkRentChangeWithinInterval(connection, lease_id, targetDate, interval) {
        let sql = `SELECT exists (SELECT * FROM lease_rent_changes 
            WHERE lease_id = ${lease_id} AND effective_date >= '${targetDate}'
            AND effective_date <= '${targetDate}' + INTERVAL ${interval} MONTH) as exist;`
            return connection.queryAsync(sql).then((res) => (res?.length ? !!res[0]?.exist : false))
    },

    /**
     * Updates the lease rent changes table one by one to return insertIDs to insert into other relation tables
     * @param {*} connection SQL connection object
     * @param {*} updatePayLoad Array of payload object to upload lease rent changes
     * @returns An array of insert reults. This is used when the insertID is needed to update other tables
     */
	async bulkUpdateLeaseRentChanges(connection, updatePayLoad = []) {
		if (updatePayLoad?.length === 0) return;

		let baseQuery = `UPDATE lease_rent_changes SET ? WHERE id = ?`;
		let sql = updatePayLoad.map(payload=> mysql.format(baseQuery, [payload.data, payload.id])).join(`; `);
        return await connection.queryAsync(sql);
	},

    async bulkStatusUpdate(connection, status, rentChangeIds = [], approvedBy) {
        sql = `UPDATE ${TABLE_NAME} SET status = '${status}', approved_by = ${approvedBy}, last_modified_by = ${ approvedBy }, approved_at = NOW(), status_updated_at = NOW() WHERE id IN (?)`;
        return await connection.queryAsync(sql, [rentChangeIds]);
    },

    async insertNotes(connection, notesPayLoad) {
        let sql, sqlArray = [];

        notesPayLoad.forEach((note)=> {
            let
                notesTableBaseQuery = `INSERT INTO notes (content, contact_id, last_modified_by, context, pinned) VALUES (?) `,
                notesTableData = [
                    note.content,
                    note.contact_id,
                    note.last_modified_by,
                    note.context,
                    note.pinned
                ],
                noteInsertQuery = mysql.format(notesTableBaseQuery, [notesTableData])
            ;
            sqlArray.push(noteInsertQuery);
        });
        sql = sqlArray.join(`;\n`);

        return await connection.queryAsync(sql);
    },

    async insertNotesRelation(connection, relationPayload) {
        let sql = `INSERT INTO lease_rent_change_notes (notes_id, lease_id, rent_change_id, type, creation_type) VALUES ?`
        return await connection.queryAsync(sql, [relationPayload]);
    },

    async getScheduledRentChanges(connection, propertyId, effectiveDate, deploymentMonth, rentChangeIds, date) {
		/*
			effectiveDate: current date + notification_period
			deploymentMonth: Deployment month, in the format 'Jan 2023'
            rentChangeIds: IDs of lease_rent_changes table
			date: Date of approving (This will be current date)
		*/
		let sql = `
			SELECT
			  lrr.id as rent_change_id,
              l.auction_status
			FROM lease_rent_changes lrr
			JOIN leases l ON l.id = lrr.lease_id
			JOIN units u ON u.id = l.unit_id
			WHERE
				u.property_id = ${propertyId}
				AND lrr.status NOT IN ('cancelled', 'skipped', 'approved')
				AND lrr.status <> 'deployed'
				AND lrr.service_id IS NULL
				AND (l.end_date IS NULL OR l.end_date >= '${date}')
		`;
        if (deploymentMonth) {
            /*
                If the request was for approving all the rent changes, then
                all the rent changes in the selected month which has more than notification days pending should only be approved
            */
            sql += ` AND DATE_FORMAT(lrr.effective_date, "%b %Y") = '${deploymentMonth}'
                AND lrr.effective_date >= '${effectiveDate}'
            `
        } else {
            sql += ` AND lrr.effective_date >= '${effectiveDate}'`
        }
        if (rentChangeIds && rentChangeIds.length) {
            console.log("rentChangeIds: ", rentChangeIds)
            sql += ` AND lrr.id IN (${rentChangeIds})`
            console.log("\nQuery for getScheduledRentChangesByDeploymentMonth: ", sql);
            return await connection.queryAsync(sql)
        }
        console.log("\nQuery for getScheduledRentChangesByDeploymentMonth: ", sql);
		return await connection.queryAsync(sql)
	},

    fetchNotesByRentChangeId(connection, rentChangeId) {
        let sql = `
            SELECT
                JSON_OBJECT(
                    'first', c.first,
                    'last', c.last
                ) as created_by,
                n.created as created_at,
                n.content as content,
                n.id as id
            FROM notes n
            JOIN lease_rent_change_notes lrcn ON n.id = lrcn.notes_id
            LEFT JOIN contacts c ON c.id = last_modified_by
            WHERE lrcn.rent_change_id = ${rentChangeId};
        `;

        return connection.queryAsync(sql).then((res)=> res || null);
    },

    getInvalidLeaseIdsByLeaseIds(connection, leasesIds, propertyId) {
        let sql = `
            SELECT 
                l.id
            FROM leases l
            JOIN units u ON l.unit_id = u.id
            WHERE l.id IN (?) AND ( u.property_id != ${propertyId} OR 
            (u.property_id = ${propertyId} AND
            (l.end_date is NOT NULL AND l.end_date < CURDATE()))
            )
        `;
        return connection.queryAsync(sql,[leasesIds]).then(rows => rows.map(row => row.id));
    },
    
    getInvalidLeaseIdsByRentChangeIds(connection, rentChangeIds, propertyId) {
        let sql = `
            SELECT 
                lrr.lease_id
            FROM lease_rent_changes lrr
            JOIN leases l ON l.id = lrr.lease_id
            JOIN units u ON l.unit_id = u.id
            WHERE lrr.id IN (?) AND ( lrr.property_id != ${propertyId} OR 
            (lrr.property_id = ${propertyId} AND lrr.deleted_at is NULL AND
            (l.end_date is NOT NULL AND l.end_date < CURDATE()))
            )
        `;
        return connection.queryAsync(sql,[rentChangeIds]).then(rows => rows.map(row => row.lease_id));
    },

    fetchContactByRentChangeId(connection, rentChangeId) {
        let sql = `
            SELECT c.id, c.first, c.last
            FROM contacts c
            JOIN contact_leases cl ON cl.contact_id = c.id AND cl.primary = 1
            JOIN lease_rent_changes lrr ON lrr.lease_id = cl.lease_id
            WHERE lrr.id = ${rentChangeId}
            HAVING MIN(cl.contact_id);
        `;
        return connection.queryAsync(sql).then((res)=> res[0] || null);
    },

    fetchRentChangeDeploymentMonth(connection, propertyId) {
        let sql = `
            SELECT DISTINCT(deployment_month) AS deployment_month 
            FROM lease_rent_changes lrr
            WHERE property_id = ${propertyId}
            ORDER BY effective_date DESC
        `;
        return connection.queryAsync(sql).then((res) => res.length ? res : null);
    },

    getInvalidLeaseIds(connection, propertyId, leaseIds) {
        let sql = `
            SELECT
                l.id AS lease_id
            FROM leases l
            JOIN units u ON u.id = l.unit_id
            WHERE
                l.id IN (?) AND
                (
                    u.property_id <> ${propertyId} OR
                    (
                        u.property_id = ${propertyId} AND
                        (l.end_date IS NOT NULL AND l.end_date < CURDATE()))
                );
        `
        return connection.queryAsync(sql, [leaseIds]).then(rows => rows.map(row => row.lease_id));
    },

    getExemptedLeaseIds(connection, propertyId, leaseIds) {
        let sql = `
            SELECT
                lrps.lease_id
            FROM lease_rent_plan_settings lrps
            WHERE
                lrps.lease_id IN (?) AND
                lrps.property_id = ${propertyId} AND
                lrps.status = 'exempt' AND
                lrps.end_date IS NULL
        `;
        return connection.queryAsync(sql, [leaseIds]).then(rows => rows.map(row => row.lease_id));
    },

    async findRentChangesByPropertyId(connection, propertyId) {
        let sql = `
            SELECT 
                lrr.id as rent_change_id, 
                lrr.lease_id,
                cl.contact_id
            FROM lease_rent_changes lrr
            JOIN contact_leases cl ON cl.lease_id = lrr.lease_id AND cl.primary = 1
            WHERE lrr.property_id = ${propertyId} AND lrr.status IN ('initiated','approved')
            GROUP BY lrr.id
            HAVING MIN(cl.contact_id)
        `;
        return await connection.queryAsync(sql);
    },

    /**
     * This functions update the rows in the lease_rent_changes table with the data given as key value pair in the
     * data object. Rows to update are targeted by the sql string - condition.
     * @param { SqlConnectionObject} connection
     * @param { Object } data Data object with the content to be updated to the rows in lease_rent_changes table
     * @param { String } condition SQL string snippet that is to be appended after the where condition in the sql to update the data
     */
    async bulkUpdateLeaseRentChange(connection, data = {}, condition = ``) {
        let sql = `
            UPDATE lease_rent_changes
            SET ?
            WHERE ${condition}
        `;

        await connection.queryAsync(sql, data);
    },

    async getNoticeStatusByRentChangeId(connection, rentChangeId) {
        let sql = `
            SELECT 
                u.name,
                u.id,
                COALESCE (
                    IF(
                        (lrr.resolved = 1 OR i.resolved = 1),
                        'resolved',
                        NULL
                    ),
                    i.status,
                    CASE
                        WHEN lrr.notification_status = 'error' THEN 'error'
                        WHEN u.generation_status IS NOT NULL THEN u.generation_status
                        WHEN lrr.status = 'initiated' THEN 'pending'
                        WHEN (lrr.status = 'approved' AND lrr.upload_id IS NULL AND
                            DATE_SUB(
                            lrr.effective_date,
                            INTERVAL IFNULL(prms.notification_period, 30) DAY
                            ) >= CURDATE()) THEN 'pending' ELSE 'error'
                        END,
                        'error'
                ) AS notice_status
            FROM lease_rent_changes lrr
            LEFT JOIN uploads u ON u.id = lrr.upload_id
            LEFT JOIN lease_rent_change_notifications lrcn ON lrcn.lease_rent_change_id = lrr.id AND lrcn.id = (
                SELECT MAX(lrcn2.id)
                FROM lease_rent_change_notifications lrcn2
                WHERE lrcn2.lease_rent_change_id = lrr.id
            )
            LEFT JOIN interactions i ON i.id = lrcn.interaction_id
            LEFT JOIN property_rent_management_settings prms ON prms.property_id = lrr.property_id
            WHERE lrr.id = ${rentChangeId}
            LIMIT 1`;
        return await connection.queryAsync(sql).then(res => res.length ? res[0] : null);
    },

    async saveExportRentChangeHistory(connection, data) {
        let sql = `INSERT INTO rent_change_import_export_history SET ?`
        return await connection.queryAsync(sql, data);
    },

    getRentChangeExportImportHistory(connection, property_id, deployment_month) {
        let sql = `
            SELECT
                r1.deployment_month, r1.action, CONCAT(c.first, ' ', c.last) AS action_by,
                r1.created_at AS action_at
            FROM rent_change_import_export_history r1
            JOIN contacts c on r1.created_by = c.id
            WHERE 
                r1.property_id = ${property_id}
                AND r1.action IN ('download', 'upload')
                ${deployment_month ?
                    `AND r1.deployment_month = '${deployment_month}'` : ''
                }
                AND (r1.action, r1.created_at) IN (
                    SELECT
                        r2.action, MAX(r2.created_at)
                    FROM rent_change_import_export_history r2
                    WHERE
                        r2.property_id = ${property_id}
                        AND r2.action IN ('download', 'upload')
                        ${deployment_month ?
                            `AND r2.deployment_month = '${deployment_month}'` : ''
                        }
                    GROUP BY r2.action, r2.deployment_month
                )
            ORDER BY r1.created_at DESC;
        `
        return connection.queryAsync(sql);
    }
      

};
