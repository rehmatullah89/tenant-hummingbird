var settings    = require(__dirname + '/../config/settings.js');

var moment = require('moment');

var Promise     = require('bluebird');
const Sql = require(__dirname + '/../modules/sql_snippets.js');

var models = {};

module.exports = {

  findPhoneEventByCallId: function(connection, call_id){
    var sql = 'Select * from phone_calls where call_id = ' + connection.escape(call_id);

    console.log("sql", sql);
    return connection.queryAsync(sql).then(Res => {
        return Res.length ? Res[0]: false;
    });
  },
  findPhoneEventByConferenceName: function(connection, conference_name){
    var sql = `Select * from phone_calls where conference_name = "${conference_name}"`;
    console.log("sql", sql);
    return connection.queryAsync(sql).then(Res => {
      return Res.length ? Res[0]: false;
    });
  },
  findPhoneCallById: function(connection, call_id){
    var Sql = 'Select * from phone_calls where id = ' + connection.escape(call_id);
    return connection.queryAsync(Sql).then(Res => Res.length ?  Res[0]: false);
  },
  savePhoneEvent:function(connection, data){
    var sql;

    if(data.id){
        sql = "UPDATE phone_calls set ? where id = " + connection.escape(data.id);
    } else {
        sql = ` INSERT into phone_calls set ?  ON DUPLICATE KEY UPDATE status = VALUES(status), time_stamp = VALUES(time_stamp), recording_url = VALUES(recording_url), notes = VALUES(notes), duration = VALUES(duration), source_tag = VALUES(source_tag) `;
    }

    console.log('sql : savePhoneEvent ', connection.format(sql, data));
    return connection.queryAsync(sql, data).then(r => data.id ?  data.id : r.insertId);
  },

  updatePhoneCallHoldStatus:function(connection, hold, data){
    var sql;
    if(hold.hold_id != null){
        sql = "UPDATE hold set ? where id = " + connection.escape(hold.hold_id);
    } else {
        sql = "insert into hold set ?";
    }
    console.log('sql',sql);
    return connection.queryAsync(sql, data).then(r => data.id ?  data.id : r.insertId);
  },

  findPhoneCallHoldRecord: function(connection, phone_call){
    var sql;
    sql = "Select max(id) as hold_id from hold where end_time is null and phone_call_id = "+phone_call.id;
    console.log('sql',sql);
    return connection.queryAsync(sql).then(Res => Res.length ?  Res[0]: false);
  },

  findById: function(connection, id) {
    let sql = `SELECT * from phone_calls where id = ${connection.escape(id)}`;
    return connection.queryAsync(Sql).then(Res => Res.length ?  Res[0]: false);
  },
  findByInteractionId: function(connection, interaction_id) {
    let sql = `SELECT * from phone_calls where interaction_id = ${connection.escape(interaction_id)}`;
    return connection.queryAsync(sql).then(Res => Res.length ?  Res[0]: false);
  }
};

models  = require(__dirname + '/../models');
