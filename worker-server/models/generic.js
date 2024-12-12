module.exports = {
    find(connection, payload) {
        const { table_name, conditions = {} } = payload;

		let filters = '1=1';
		Object.keys(conditions).forEach((key) => {
            if(conditions[key]) {
				filters += ` and \`${key}\` in (${connection.escape(conditions[key])})`;
            } else {
				filters += ` and \`${key}\` is ${connection.escape(conditions[key])}`;
            }
		});

		let sql = `select * from ${table_name} where ${filters}`;

		console.log(`${table_name} find query: `, sql);

		return connection.queryAsync(sql);
	}
};
