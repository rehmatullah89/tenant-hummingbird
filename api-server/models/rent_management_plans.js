const { response } = require("express");

const e  = require(__dirname + '/../modules/error_handler.js');
const TABLE_NAME = `rent_management_plans`;

module.exports = {

    getRentPlans(connection, id, clause = "id") {
        let query = `
        SELECT
            json_arrayagg(
                json_object(
                    'id', rmp.id,
                    'name', rmp.name,
                    'description', rmp.description,
                    'settings', rmp.settings,
                    'tags', rmp.tags,
                    'maximum_raise', rmp.maximum_raise,
                    'minimum_raise', rmp.minimum_raise,
                    'rent_cap', rmp.rent_cap,
                    'prepay_rent_raise', IF(rmp.prepay_rent_raise, CAST(TRUE AS JSON), CAST(FALSE AS JSON)),
                    'created_by', rmp.contact_id,
                    'verified', IF(verified, CAST(TRUE AS JSON), CAST(FALSE AS JSON)),
                    'active', IF(rmp.active, CAST(TRUE AS JSON), CAST(FALSE AS JSON))
                )
            ) as rent_plans
        FROM
            ${TABLE_NAME} rmp
        WHERE
            rmp.deleted_at IS NULL AND
            rmp.${clause} = ?;
        `

        return connection.queryAsync(query, [id]).then((resp) => {
            return resp?.length ? (resp[0]?.rent_plans ?? null) : null
        })
    },

    save: function (connection, data, data_exists) {
        let sql;
        if (data_exists) {
            sql = `UPDATE ${TABLE_NAME} set ? where id = ${connection.escape(data['id'])}`;
        } else {
            sql = `INSERT INTO ${TABLE_NAME} set ?`;
        }
        return connection.queryAsync(sql, data);
    },

    checkRentPlanExistence: function (connection, id, company_id) {
        if (!id) e.th(400, "id required");
        const sql = `
            SELECT
                EXISTS (
                    SELECT NULL
                    FROM  ${TABLE_NAME}
                    WHERE
                        id = ${connection.escape(id)} AND
                        company_id = ${connection.escape(company_id)}
                        AND deleted_at IS NULL
                    ) AS exist`;

        return connection.queryAsync(sql).then(res => res?.length ?  !!res[0]?.exist : false)
    },
    
    checkRentPlanStatus: async function(connection, rentPlanId, companyId) {
        let sql = `
            SELECT
                CASE
                    WHEN EXISTS (
                        SELECT NULL
                        FROM rent_management_plans rmp
                        JOIN lease_rent_plan_settings lrps
                            ON
                                rmp.id = lrps.rent_plan_id AND
                                rmp.deleted_at IS NULL AND
                                lrps.status = 'active'AND
                                lrps.end_date IS NULL
                        WHERE
                            rmp.id = ${connection.escape(rentPlanId)} AND
                            rmp.company_id = ${connection.escape(companyId)}
                    ) THEN 'lease'
                    WHEN EXISTS (
                        SELECT NULL
                        FROM rent_management_plans rmp
                        JOIN space_group_rent_plan_defaults sgrpd
                            ON
                                rmp.id = sgrpd.rent_management_plan_id  AND
                                rmp.deleted_at IS NULL
                        WHERE
                            rmp.id = ${connection.escape(rentPlanId)} AND
                            rmp.company_id = ${connection.escape(companyId)}
                    ) THEN 'space group'
                    WHEN EXISTS (
                        SELECT NULL
                        FROM rent_management_plans rmp
                        JOIN space_type_rent_plan_defaults strpd
                            ON
                                rmp.id = strpd.rent_management_plan_id AND
                                rmp.deleted_at IS NULL
                        WHERE
                            rmp.id = ${connection.escape(rentPlanId)} AND
                            rmp.company_id = ${connection.escape(companyId)}
                    ) THEN 'space type'
                    WHEN EXISTS (
                        SELECT NULL
                        FROM rent_management_plans rmp
                        WHERE
                            rmp.id = ${connection.escape(rentPlanId)} AND
                            rmp.company_id = ${connection.escape(companyId)} AND
                            deleted_at IS NULL
                    ) THEN 'rent_plan_exists'
                END as rent_plan_status

        `
		return connection.queryAsync(sql).then(result=> result[0]?.rent_plan_status);
    },

    delete: function (connection, id) {
        const sql = `
            UPDATE rent_management_plans
            SET deleted_at = NOW()
            WHERE id = ${connection.escape(id)}
        `;
        return connection.queryAsync(sql);
    },

    checkForDuplicateRentPlan: async function (connection, companyId, rentPlanName, rentPlanId) {
        let query = `
            SELECT EXISTS (
                SELECT *
                FROM ${TABLE_NAME}
                WHERE
                    company_id = ${connection.escape(companyId)} AND
                    name = ${connection.escape(rentPlanName)} AND
                    deleted_at IS NULL
        `

        if (rentPlanId) query += ` AND id <> ${connection.escape(rentPlanId)}`;

        query += `) as exist` ;
        
        let result =  await connection.queryAsync(query);
        return !!result[0]?.exist;
    }
};