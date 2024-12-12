const LeaseStoredContents = {
    /* Call bulkSave function to add new stored content under a lease */
    bulkSave(connection, payload) {
        let { data } = payload;	 
        let sql = `INSERT INTO lease_stored_contents (lease_id, stored_content_id, value, created_by) values ? `;
        
        return connection.queryAsync(sql, [
            data?.map(d => [
                connection.escape(d.lease_id), 
                connection.escape(d.stored_content_id),
                d.value,
                connection.escape(d.created_by)
            ])
        ]);
    },
    /* Call bulkUpdate function to update stored contents under a lease*/
    bulkUpdate(connection, payload) {
        let { data } = payload;

        let sql = `INSERT INTO lease_stored_contents (id, value) VALUES ?
            ON DUPLICATE KEY UPDATE value=VALUES(value)`;
		return connection.queryAsync(sql, [
            data?.map(d => [
                connection.escape(d.id),
                d.value
            ])
        ]);
    },
    /* Update 'deleted_at' column on lease_stored_contents table. */
    bulkRemove(connection, payload) {
        let { data, removed_items } = payload;
        let sql = `UPDATE lease_stored_contents set ? WHERE id IN (${removed_items.map(item => connection.escape(item.id))})`;
        return connection.queryAsync(sql, data);
    },
    /* Get the stored contents that are leased. */
    find(connection, lease_id) {
        let sql = `
            SELECT
                lsc.id,
                sc.id AS stored_content_id,
                sc.name,
                lsc.value
            FROM
                lease_stored_contents lsc
                LEFT JOIN stored_contents sc ON lsc.stored_content_id = sc.id
            WHERE
                sc.active = 1
                AND lsc.lease_id = ${connection.escape(lease_id)}
                AND lsc.deleted_at IS NULL
        `;
        return connection.queryAsync(sql);
    },
    /* Find all the active lease stored contents. */
    findActive(connection, payload) {
        let { lease_id } = payload;
        let sql = `SELECT * FROM lease_stored_contents lsc WHERE lsc.deleted_at IS NULL AND lease_id  = ${connection.escape(lease_id)}`;  
        return connection.queryAsync(sql);
    },
    /* Find all leases that has been used by the stored content. */
    findLeasesByStoredContent(connection, storedContentId) {
        let sql = `SELECT * FROM lease_stored_contents lsc WHERE stored_content_id = ${connection.escape(storedContentId)} and deleted_at IS NULL`;  
        return connection.queryAsync(sql);
    }
}
module.exports = LeaseStoredContents;