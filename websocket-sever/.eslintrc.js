module.exports = {
	extends: [
		'eslint-config-airbnb-base',
		'prettier',
		'plugin:node/recommended',
		'plugin:import/recommended',
		'plugin:promise/recommended',
	],
	plugins: ['prettier', 'import', 'node', 'promise'],
	rules: {
		'no-console': 0,
		'prettier/prettier': [
			'error',
			{
				endOfLine: 'auto',
			},
		],
		'promise/prefer-await-to-then': 'error',
	},
};
