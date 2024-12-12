var settings    = require(__dirname + '/../config/settings.js');

module.exports = {

	saveSigner: function(connection, data, id){
		var sql;
		if(id){
			sql = "UPDATE signers set ? where id = " + connection.escape(id);
		} else {
			sql = "insert into signers set ?";
		}
		return connection.queryAsync(sql, data).then(result => {
			return id ? id : result.insertId;
		})
	},
	saveStatus: function(connection, data){
		var sql = "insert into signing_status set ? ";
		return connection.queryAsync(sql, data).then(result => {
			return result.insertId;
		})
	},
	saveAction: function(connection, data, activity_id){

		var sql;
		if(activity_id){
			sql = "UPDATE signing_activity set ? where id = " + connection.escape(activity_id);
		} else {
			sql = "insert into signing_activity set ?";
		}

		return connection.queryAsync(sql, data).then(result => {
			return (activity_id)? activity_id: result.insertId;
		})
	},
	findSignerById: function(connection, signer_id){
		var sql = "Select * from signers where id = "+ connection.escape(signer_id);
		
		return connection.queryAsync(sql).then(signers => {
			return signers.length? signers[0]: null;
		});
	},
	findByUploadId: function(connection, upload_id){

		var sql = "Select * from signers where upload_id = "+ connection.escape(upload_id);

		return connection.queryAsync(sql);

	},
	findStatusBySignerId: function(connection, signer_id){
		var sql = "Select * from signing_status where signer_id = "+ connection.escape(signer_id) + ' order by id desc';
		return connection.queryAsync(sql)
	},
	findActivityBySignerId: function(connection, signer_id){
		var sql = "Select * from signing_activity where signer_id = " + connection.escape(signer_id);
		return connection.queryAsync(sql);
	}

};