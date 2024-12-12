const mysql = require(`mysql`);
const e = require(__dirname + '/../../modules/error_handler.js');
const TABLE_NAME = "lease_rent_changes";
const TABLE_NAME_HISTORY = "lease_rent_change_history";


module.exports = {
    save: function(connection, data, rent_change_id){
        var sql;
        if(rent_change_id){
            sql = `UPDATE ${TABLE_NAME} set ? where id = ${connection.escape(rent_change_id)}`;
        } else {
            sql = `INSERT INTO ${TABLE_NAME} set ?`;
        }
        return connection.queryAsync(sql, data);
    },

    async saveNotificationDetails(connection, data, fields) {
        let sql = `INSERT INTO lease_rent_change_notifications (${fields.join(', ')}) VALUES ?`;
        return await connection.queryAsync(sql, [data]);
    },

    bulkInsertForSkipRentChanges: function (connection, data, insertFields, returnId = false) {
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

    findById(connection, rentChangeId) {
        let sql = `
            SELECT * FROM ${TABLE_NAME} lrr WHERE lrr.id = ${rentChangeId}
        `
        return connection.queryAsync(sql).then(res => res.length ? res[0]: null);
    },

    findByIds(connection, rentChangeIds) {
        let sql = `
            SELECT * FROM ${TABLE_NAME} lrr WHERE lrr.id IN (?)
        `
        return connection.queryAsync(sql, [rentChangeIds])
    },

    update(connection, data, rent_change_id) {
        let query = `UPDATE ${TABLE_NAME} SET ? WHERE id = ${rent_change_id}`;
        return connection.queryAsync(query, data)
    },

    fetchRentChangesById: function(connection, rent_change_id) {
        let query = `
            SELECT
                lease_id, property_id, rent_plan_id, service_id, status, notification_status,
                change_amt, notification_sent, new_rent_amt, target_date, upload_id,
                affect_timeline, change_type, change_value, effective_date
            FROM
                ${TABLE_NAME}
            WHERE id = ${rent_change_id}
        `
        return connection.queryAsync(query).then((data) => data.length ? data[0] : [])
    },

    findRentChanges(connection, lease_id){
        let query = `
            SELECT 
                id, type, lease_id, rent_plan_id, service_id,
                status, notification_status, change_type, tagged,
                change_value, change_amt, notification_sent, new_rent_amt,
                target_date, effective_date, change_applied, upload_id,
                affect_timeline, last_modified_by, approved_by, approved_at,
                property_id, rent_plan_trigger, status_updated_at
            FROM ${TABLE_NAME} 
            WHERE 
                lease_id = ${lease_id} AND
                effective_date is NOT NULL AND
                effective_date > CURDATE() AND
                deleted_at is NULL
            ORDER BY effective_date DESC`;
        return connection.queryAsync(query).then((data) => data.length ? data: []);
    },

    insertRentChangeEntry: function(connection, data) {
        let sql = `INSERT INTO ${TABLE_NAME} SET ?`
        return connection.queryAsync(sql, data);
    },

    findUnnotifiedCount: function(connection, propertyId, rentChangeIds) {
        if (!rentChangeIds) e.th(400, "rentChangeIds must be provided");
        var sql = `
            SELECT
                COUNT(*) AS count
            FROM
                ${TABLE_NAME} lrr
            JOIN leases l ON l.id = lrr.lease_id
            JOIN units u ON u.id = l.unit_id
            WHERE
                lrr.id in (?) AND
                lrr.deleted_at IS NULL AND
                lrr.status NOT IN ('cancelled', 'skipped') AND
                (lrr.upload_id IS NULL AND lrr.notification_status IS NULL) AND
                u.property_id = ${propertyId}`;
        return connection.queryAsync(sql, [rentChangeIds]);
    },

    async bulkUpdateLeaseRentChanges(connection, updatePayLoad = []) {
		if (updatePayLoad?.length === 0) return;

		let baseQuery = `UPDATE ${TABLE_NAME} SET ? WHERE id = ?`;
		let sql = updatePayLoad.map(payload=> mysql.format(baseQuery, [payload.data, payload.id])).join(`; `);
        return await connection.queryAsync(sql);
	},

    async updateRetryingRentChangesNoticeDetails(connection, rentChangeIds, data = {}) {
        // This function will set the values in :data to all the rent changes mentioned in rentChangeIds
        if (rentChangeIds?.length === 0) return;
        let baseQuery = `UPDATE ${TABLE_NAME} SET ? WHERE id IN (${rentChangeIds})`;
        return await connection.queryAsync(baseQuery, data)
    },

    deleteRentChanges(connection, rent_change_ids){
        let sql = `UPDATE ${TABLE_NAME} set deleted_at = CURDATE() where id IN (${rent_change_ids})`;
        return connection.queryAsync(sql);
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

    bulkUpdate: function (connection, data) {
        let sql = `
            INSERT INTO ${TABLE_NAME} (
                id, type, lease_id, property_id, status, tagged,
                affect_timeline, change_type, change_value, change_amt,
                new_rent_amt, target_date, effective_date, deployment_month,
                approved_at ,approved_by, last_modified_by)
            VALUES ? 
                ON DUPLICATE KEY UPDATE
                type = VALUES(type), lease_id = VALUES(lease_id),
                property_id = VALUES(property_id),
                status = VALUES(status), tagged = VALUES(tagged),
                affect_timeline = VALUES(affect_timeline),
                change_type = VALUES(change_type), change_value = VALUES(change_value),
                change_amt = VALUES(change_amt),
                new_rent_amt = VALUES(new_rent_amt), target_date = VALUES(target_date),
                effective_date = VALUES(effective_date), deployment_month = VALUES(deployment_month),
                approved_at = VALUES(approved_at), approved_by = VALUES(approved_by),
                last_modified_by = VALUES(last_modified_by)`; 
        return connection.queryAsync(sql, [data]);
    },

    bulkInsertHistory: function (connection, data) {
        let sql = `INSERT INTO ${TABLE_NAME_HISTORY}
            (rent_change_id, type, rent_plan_id, status, tagged, affect_timeline,
            change_type, change_value, change_amt, new_rent_amt, target_date, effective_date,
            last_modified_by, approved_by, approved_at, property_id, rent_plan_trigger, status_updated_at, updated_by
            ) VALUES ?`;
        return connection.queryAsync(sql, [data]);
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

    /**
     * This function update the rows in the lease_rent_changes table with the data given as key value pair in the
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

    async insertRentChange(connection, data, fields) {
        let sql = `INSERT INTO ${TABLE_NAME} (${fields.join(`, `)}) VALUES ?`;
        return connection.queryAsync(sql, [[data]]);
    },

    /**
     * This function fetch all automated rent changes of a property with status in ['initaiated', 'approved']
     * @param { SqlConnectionObject } connection 
     * @param { String } propertyId 
     * @returns An array of objects with rent_change_id, lease_id, contact_id
     */
    async findAutomatedRentChangesByPropertyId(connection, propertyId) {
        let sql = `
            SELECT 
                lrr.id, 
                lrr.lease_id,
                cl.contact_id
            FROM ${TABLE_NAME} lrr
            JOIN contact_leases cl ON cl.lease_id = lrr.lease_id AND cl.primary = 1
            WHERE 
                lrr.property_id = ${propertyId} AND 
                lrr.status IN ('initiated','approved') AND
                lrr.type = 'auto'
            GROUP BY lrr.id
            HAVING MIN(cl.contact_id)
        `;
        return await connection.queryAsync(sql);
    },

    async compareDateChanges(connection, data) {
        let values = Object.values(data)
        let sql = `
            SELECT * FROM ${TABLE_NAME}
                WHERE
                    property_id = ? AND
                    lease_id = ? AND
                    new_rent_amt = ? AND
                    effective_date = ?
                    ORDER BY id DESC`;
        return connection.queryAsync(sql, values).then((data) => data.length ? data[0]: []);
    },

    async saveExportRentChangeHistory(connection, data) {
        let sql = `INSERT INTO rent_change_import_export_history SET ?`
        return await connection.queryAsync(sql, data);
    },
}  