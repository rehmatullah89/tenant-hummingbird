var Promise = require('bluebird');
module.exports = {
    lockTableRows(connection, payload) {
        const { ids, table_name } = payload;
        if(ids && ids.length){
            const sql = `
                update ${table_name} t set t.id = t.id where t.id in (
                    ${ids.map(id => connection.escape(id)).join(',')}
                )
            `;

            console.log('Locking query: ', sql);

            return connection.queryAsync(sql); 
        } else {
            console.log('No lease id in Locking query');
            return Promise.resolve();
        }
    },

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
