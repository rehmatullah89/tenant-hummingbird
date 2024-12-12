
module.exports = {    
    deactivateSheduleReport: function (connection, share_report_id) {
      var sql = `Update schedule_report_master set ? where id = ${share_report_id}`;
      return connection.queryAsync(sql, {active: 0});
    },

    getMasterData: function (connection, share_report_id) {
        var sql = `select * from schedule_report_master where id = ${share_report_id}`;
        return connection.queryAsync(sql);
    },

    getMasterDataByComapnyId: function (connection, company_id) {
      let sql = `SELECT * FROM schedule_report_master where active=1 and company_id=${company_id}`;
      return connection.queryAsync(sql);
    },

    getDetailDataByScheduleReportId: function(connection, schedule_report_id) {

      var sql = `select src.* , sr.contact_id ,sr.company_id , sr.description ,sr.sort ,sr.filters as r_filters ,sr.path , sr.template ,sr.template_type ,sr.is_default ,sr.type as r_type,sr.report_category ,sr.download_xls ,sr.download_pdf ,sr.multiple_properties ,sr.end_date ,sr.collection_id as r_collection_id ,sr.is_banker ,sr.is_investor from schedule_report_configuration src
      left join saved_reports sr on src.report_id = sr.id
      where schedule_report_id = ${schedule_report_id} and active = 1;`;
      return connection.queryAsync(sql);
    },

    deleteDetailData: function(connection,share_report_id) {
      var sql = `delete from schedule_report_configuration where schedule_report_id = ${share_report_id}`;
      return connection.queryAsync(sql);
    },

    deleteMasterData: function(connection,share_report_id) {
      var sql = `delete from schedule_report_master where id = ${share_report_id}`;
      return connection.queryAsync(sql);
    },

    addMasterData: function (connection, data) {
      let sql = "INSERT INTO schedule_report_master set ?";
      return connection.queryAsync(sql, data);
    },

    addDetailData: function (connection, data) {      
      let sql = `INSERT INTO schedule_report_configuration(schedule_report_id, collection_id, report_id, 
        report_title, report_type, type, format, property_id, filters, for_day, static_dynamic, 
        unit_group_profile_id, file_type, profile) values ?`;

      return connection.queryAsync(sql, [data]);
    },

    updateMasterData: function(connection, data, share_report_id) {
      let sql = `UPDATE schedule_report_master set ? where id=${share_report_id}`
      return connection.queryAsync(sql, data);
    },

    deactivateSheduleReportDetailData: function (connection, share_report_id) {
      let sql = `UPDATE schedule_report_configuration set active=0 where schedule_report_id=${share_report_id}`;
      return connection.queryAsync(sql);
    },

    updateScheduleReportDetailData: function(connection, data, share_report_id, report_name) {
      var sql = `UPDATE schedule_report_configuration set ? where schedule_report_id=${share_report_id}
                and report_title ='${report_name.trim()}'`;      
      return connection.queryAsync(sql, data);
    },
    getCoWorkerDetails: function(connection, co_workers) {
      var sql = `select c.id contact_id, c.first, c.last, c.email, c.status
        from contacts c
        join companies_contact_roles ccr
          ON c.id = ccr.contact_id
        where c.status = 'active'
        and ccr.status = 1
        and c.id in (${co_workers.join(",")})
      `;
      console.log("co_workers: ", sql);
      return connection.queryAsync(sql);
    }
}
