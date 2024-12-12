const TABLE_NAME = 'promotion_unit_group'

module.exports = {
    /**
     * Pull promotions under a company merged with default promotions
     *
     * @param {*} connection connection iterator object
     * @param {*} company_id company id
     */

    get(connection, { companyId, spaceGroupHash } = {}) {
        let sql = `
            SELECT 
                p.*, 
                r.rounding_type as rounding, 
                (
                    SELECT 
                        JSON_ARRAYAGG(type) 
                    FROM 
                        ${TABLE_NAME} pug 
                    WHERE 
                        pug.promotion_id = p.id
                        AND pug.unit_group_id = ?
                ) as website_promotion_type 
            FROM 
                ${TABLE_NAME} pug 
                RIGHT JOIN promotions p ON pug.promotion_id = p.id 
                LEFT JOIN rounding r ON p.id = r.object_id 
                AND r.status = 1 
            WHERE 
                p.active = 1 
                AND p.company_id = ?
                AND pug.unit_group_id = ?
            GROUP BY 
                pug.promotion_id;
      `
        return connection.queryAsync(sql, [spaceGroupHash, companyId, spaceGroupHash])
    },

    delete(connection, condition) {
      let sql = `DELETE FROM ${TABLE_NAME} pug WHERE ?`

      return connection.queryAsync(sql, condition)
    },

    save(connection, data) {
        /**
         * Delete all the entries and insert
         * TODO: Need to find another method
         */
        let fields = ['promotion_id', 'unit_group_id', 'type']
        let sql = `INSERT INTO ${TABLE_NAME} (${fields.join(',')}) VALUES ?`

        return connection.queryAsync(sql, [data])
    },

    /**
     * Check if the hash belongs to the same requesting property
     *
     * @param {*} connection connection iterator object
     * @param {*} propertyId property id to check the hash against
     * @param {*} hash space group id hash
     */
    validateHash(connection, { propertyId, spaceGroupHash } = {}) {
        let unit_group_profile = `(SELECT unit_group_profile_id  FROM unit_groups ug WHERE ug.unit_group_hashed_id = '${spaceGroupHash}')`
        let hashes_property = `(SELECT property_id FROM unit_group_profiles ugp WHERE ugp.id = ${unit_group_profile}) `

        let sql = `SELECT ${hashes_property} = ${propertyId}`

        return connection.queryAsync(sql).then((res) => res?.[0])
    },

    checkExistance(connection, data = {}, entry) {
        const { companyId } = data ?? {}

        const snippet = {
            promotion: {
                query: `SELECT * FROM promotions p WHERE p.active = 1 AND p.company_id = ? AND p.id IN ?`,
                data: [companyId, [data.promotions ?? []]]
            },
            default: `SELECT * FROM ${TABLE_NAME} pug WHERE pug.`
        }[entry]

        let query = `SELECT EXISTS(${snippet.query}) AS exist`

        return connection.queryAsync(query, snippet.data).then((res) => (res?.length ? !!res[0]?.exist : false))
    }
}
