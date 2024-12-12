module.exports = {
	redis_host: process.env.REDIS_HOST,
	config: {
		env: process.env.NODE_ENV,
	},
	jobDB: {},
	is_prod: process.env.NODE_ENV === 'production',
	is_uat: process.env.NODE_ENV === 'uat',
};
