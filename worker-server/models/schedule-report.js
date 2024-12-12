
module.exports = {
    getDetailData:  function (connection, schedule_report_id) {
        const sql = `
            select src.*, sr.multiple_properties
            from schedule_report_configuration src
                inner join saved_reports sr on sr.id = src.report_id
            where schedule_report_id = ${schedule_report_id}
                and active = 1
        `;
        return connection.queryAsync(sql);
    },

    getMasterData: function (connection, company_id, frequency, schedule_report_master_id) {        
        let sql = `SELECT * FROM schedule_report_master where active=1 and company_id=${company_id} and frequency='${frequency}' and properties!='[]'`;

        if(schedule_report_master_id) {
            sql = `${sql} and id=${schedule_report_master_id}`;
        }     
        console.log("->::Schedule_report_master sql: ", sql);  
        return connection.queryAsync(sql);
    },

    getFacilityDetail: function (connection, propertyList) {
        const sql = `select MIN(utc_offset) min_offset, CONVERT_TZ(UTC_TIMESTAMP() , "+00:00", MIN(utc_offset)) as facility_date  
                    from properties where id in (${propertyList});`;
        return connection.queryAsync(sql);
    },
    getCoWorkerDetails: function(connection, co_workers) {
        const sql = `select c.id contact_id, c.first, c.last, c.email, c.status
            from contacts c
            join companies_contact_roles ccr
            ON c.id = ccr.contact_id
            where c.status = 'active'
            and ccr.status = 1
            and c.id in (${co_workers.join(",")})`;
        console.log("->::co_workers sql: ", sql);
        return connection.queryAsync(sql);
      }
}