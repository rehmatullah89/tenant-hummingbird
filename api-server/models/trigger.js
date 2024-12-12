var settings    = require(__dirname + '/../config/settings.js');

module.exports = {

  findByCompanyId: function(connection, company_id, filter = {}){
    var sql = "Select * from triggers where active = 1 and company_id = " + connection.escape(company_id);

    if(filter.trigger_group_id){
      sql += " and trigger_group_id = " + connection.escape(filter.trigger_group_id);
    }
    sql += " order by start asc "
    return connection.queryAsync(sql);
  },

  findByTriggerGroupId: (connection, trigger_group_id) => {
    var sql = "SELECT * FROM triggers where WHERE active = 1 and trigger_group_id = " + connection.escape(trigger_group_id) + " order by start asc ";
    return connection.queryAsync(sql); 
  },

  findById: function(connection, trigger_id, company_id){

    var sql = "Select * from triggers where id = " + connection.escape(trigger_id);
    if(company_id) {
      sql +=  " and company_id = " + connection.escape(company_id);
    }

    return connection.queryAsync(sql).then(function(qryRes){
      return qryRes[0] || null;
    });

  },

  save: function(connection, data, id){
    var sql;
    if(id){
      sql = "UPDATE triggers set ? where id = " + connection.escape(id);
    } else {
      sql = "insert into triggers set ?";
    }
    return connection.queryAsync(sql, data);
  },

  saveFee: function(connection, data, id){
    var sql;
    if(id){
      sql = "UPDATE trigger_fee set ? where id = " + connection.escape(id);
    } else {
      sql = "insert into trigger_fee set ?";
    }

    return connection.queryAsync(sql, data);

  },

  saveEmail: function(connection, data, id){
    var sql;
    if(id){
      sql = "UPDATE trigger_email set ? where id = " + connection.escape(id);
    } else {
      sql = "insert into trigger_email set ?";
    }

    return connection.queryAsync(sql, data);

  },

  saveSMS: function(connection, data, id){
    var sql;
    if(id){
      sql = "UPDATE trigger_sms set ? where id = " + connection.escape(id);
    } else {
      sql = "insert into trigger_sms set ?";
    }

    return connection.queryAsync(sql, data);

  },

  saveAttachment: function(connection, data, id){
    var sql;
    if(id){
      sql = "UPDATE trigger_attachment set ? where id = " + connection.escape(id);
    } else {
      sql = "insert into trigger_attachment set ?";
    }

    return connection.queryAsync(sql, data).then(res => id ? id: res.insertId);

  },

  // Convenience method, save as saveAttachment, as both are stored in the same table. Messages dont have a document_id
  saveMessage: function(connection, data, id){
    var sql;
    if(id){
      sql = "UPDATE trigger_attachment set ? where id = " + connection.escape(id);
    } else {
      sql = "insert into trigger_attachment set ?";
    }

    return connection.queryAsync(sql, data).then(res => id ? id: res.insertId);

  },

  saveDeliveryMethod: function(connection, data, id){
    var sql;
    if(id){
      sql = "UPDATE trigger_delivery_methods set ? where id = " + connection.escape(id);
    } else {
      sql = "insert into trigger_delivery_methods set ?";
    }

    return connection.queryAsync(sql, data).then(res => id ? id: res.insertId);

  },

  saveEvent: function(connection, data, id){
    var sql;
    if(id){
      sql = "UPDATE trigger_events set ? where id = " + connection.escape(id);
    } else {
      sql = "insert into trigger_events set ?";
    }

    return connection.queryAsync(sql, data);

  },

  delete: function(connection, id){
    var sql = "UPDATE triggers set active = 0 where id = " + connection.escape(id);
    return connection.queryAsync(sql);

  },

  deleteFee: function(connection, id){
    var sql = "Update trigger_fee set active = 0 where id = " + connection.escape(id);
    return connection.queryAsync(sql);
  },

  deleteEmail: function(connection, id){
    var sql = "Update trigger_email set active = 0 where id = " + connection.escape(id);
    return connection.queryAsync(sql);
  },

  deleteSMS: function(connection, id){
    var sql = "Update trigger_sms set active = 0 where id = " + connection.escape(id);
    return connection.queryAsync(sql);
  },

  deleteAttachement: function(connection, id){
    var sql = "Update trigger_attachment set active = 0 where document_id is not null and id = " + connection.escape(id);
    return connection.queryAsync(sql);
  },
  // convencience function, similar to deleteAttachment
  deleteMessage: function(connection, id){
    var sql = "Update trigger_attachment set active = 0 where document_id is null and id = " + connection.escape(id);
    return connection.queryAsync(sql);
  },

  deleteEvent: function(connection, id){
    var sql = "Update trigger_events set active = 0 where id = " + connection.escape(id);
    return connection.queryAsync(sql);
  },

  findFeeByTriggerId: function(connection, trigger_id){
    var sql = "SELECT * from trigger_fee where active = 1 and trigger_id = " + connection.escape(trigger_id);
    return connection.queryAsync(sql);
  },
  findEmailByTriggerId: function(connection, trigger_id){
    var sql = "SELECT * from trigger_email where active = 1 and trigger_id = " + connection.escape(trigger_id);
    return connection.queryAsync(sql);
  },
  findSMSByTriggerId: function(connection, trigger_id){
    var sql = "SELECT * from trigger_sms where active = 1 and trigger_id = " + connection.escape(trigger_id);
    return connection.queryAsync(sql);
  },
  findEventByTriggerId: function(connection, trigger_id){
    var sql = "SELECT * from trigger_events where active = 1 and trigger_id = " + connection.escape(trigger_id);
    return connection.queryAsync(sql);
  },

  findAttachmentByTriggerId: function(connection, trigger_id){
    var sql = "SELECT * from trigger_attachment where document_id is not null and active = 1 and trigger_id = " + connection.escape(trigger_id);
    return connection.queryAsync(sql);
  },

  findMessageByTriggerId: function(connection, trigger_id){
    var sql = "SELECT * from trigger_attachment where document_id is null and active = 1 and trigger_id = " + connection.escape(trigger_id);
    return connection.queryAsync(sql);
  },

  findDeliveryMethodsByAttachmentId: function(connection, ta_id){
    var sql = "SELECT * from trigger_delivery_methods where active = 1 and trigger_attachment_id = " + connection.escape(ta_id);
    console.log("findDeliveryMethodsByAttachmentId sql", sql); 
    return connection.queryAsync(sql);
  },


  findOverdue(connection, date, repeat, max_repeat, start, company_id){

    var sql = "SELECT *, (SELECT SUM((qty*cost) - IFNULL((SELECT SUM(amount) FROM discount_line_items WHERE invoice_line_id = invoice_lines.id), 0) + ROUND(((qty * cost) - IFNULL((SELECT SUM(amount) FROM discount_line_items WHERE invoice_line_id = invoice_lines.id AND pretax = 1),0)) * IFNULL( (SELECT SUM(taxrate/100) FROM tax_line_items WHERE invoice_line_id = invoice_lines.id) , 0), 2)) FROM invoice_lines WHERE invoice_id = invoices.id) - (SELECT IFNULL(SUM(amount),0) FROM invoices_payments WHERE invoice_id = invoices.id) AS total_owed FROM invoices WHERE status > -1 and due < CURDATE() ";

    if(repeat){
      sql += " and MOD(DATEDIFF(" + connection.escape(date) + ", DATE_ADD(due, INTERVAL " + connection.escape(start) + " DAY)), " + connection.escape(repeat) + ") = 0 ";
      if(max_repeat){
        var max_days = start + (repeat * (max_repeat-1));
        sql += " and DATEDIFF(" + connection.escape(date) + ", DATE_ADD(due, INTERVAL " + connection.escape(max_days) + " DAY)) <= 0 ";
      }
    } else {
      sql += " and DATEDIFF(" + connection.escape(date) + ", DATE_ADD(due, INTERVAL " + connection.escape(start) + " DAY)) = 0 ";
    }

    sql +=" AND invoices.lease_id IN (SELECT id FROM leases WHERE status = 1 and unit_id IN (SELECT id FROM units WHERE property_id IN (SELECT id FROM properties WHERE company_id =  "+ connection.escape(company_id)+"))) HAVING total_owed > 0  ORDER BY invoices.id DESC";

    return connection.queryAsync(sql);

  },
  
  findFromStart(connection, date, repeat, max_repeat, start, company_id){

    // ToDo limit to leases that have this trigger on them
    // ToDo Account for repeat

    var sql = "SELECT * FROM leases WHERE " + connection.escape(date) + " = DATE_ADD(leases.start_date, INTERVAL " + connection.escape(start) + " DAY) AND (leases.start_date <= "+ connection.escape(date) + " and (end_date > "+ connection.escape(date) + " || leases.end_date is null)) AND leases.id IN (SELECT id FROM leases WHERE status = 1 and unit_id IN (SELECT id FROM units WHERE property_id IN (SELECT id FROM properties WHERE company_id =  "+ connection.escape(company_id)+"))) ORDER BY leases.id DESC;";

    return connection.queryAsync(sql);
  },

  findFromEnd(connection, date, repeat, max_repeat, start, company_id){

    // ToDo limit to leases that have this trigger on them

    var sql = "SELECT * FROM leases WHERE DATE_ADD("+ connection.escape(date) + ", INTERVAL " + connection.escape(start) + " DAY) = leases.end_date AND (leases.start_date <= "+ connection.escape(date) + " and (end_date > "+ connection.escape(date) + " || leases.end_date is null)) AND leases.id IN (SELECT id FROM leases WHERE status = 1 and unit_id IN (SELECT id FROM units WHERE property_id IN (SELECT id FROM properties WHERE company_id = "+ connection.escape(company_id)+"))) ORDER BY id DESC;";
    return connection.queryAsync(sql);
  },

  findBeforeStart(connection, date, repeat, max_repeat, start, company_id){

    // ToDo limit to leases that have this trigger on them11
    var sql = "SELECT * FROM leases WHERE DATE_ADD("+ connection.escape(date) + ", INTERVAL " + connection.escape(start) + " DAY) = leases.start_date AND leases.id IN (SELECT id FROM leases WHERE status = 1 and unit_id IN (SELECT id FROM units WHERE property_id IN (SELECT id FROM properties WHERE company_id = "+ connection.escape(company_id)+"))) ORDER BY id DESC;";
    return connection.queryAsync(sql);
  },

  findLeaseStandings(connection, company_id){
    var sql = "SELECT * FROM lease_standings ORDER BY sort ASC";
    return connection.queryAsync(sql);
  },

  getActionTypes(connection){
    var sql = "SELECT * FROM action_types WHERE active = 1 ORDER BY sort ASC";
    return connection.queryAsync(sql);
  }, 
   
  findByPropertyId(connection, property_id){

    let sql = ` select * from triggers where 
        active = 1 
        and trigger_group_id in (select id from trigger_groups where active = 1)
        and trigger_group_id in (select trigger_group_id from property_trigger_groups where property_id = ${connection.escape(property_id)} and deleted_at is null)`;

      console.log(sql); 
      return connection.queryAsync(sql); 
  }
  
};
