
const Propay = {
	getIngestionFlag: function (connection,company_id,property_id,table_name) {
		let sql = `SELECT notification_ingestion FROM tenant.${table_name} 
						WHERE cid = ${company_id} and property_id = ${property_id}`;
		return connection.queryAsync(sql).then(r => r.length? r[0] : null);
	}
}

module.exports = Propay;