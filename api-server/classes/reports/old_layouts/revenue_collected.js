var moment = require('moment');
var XLSX = require('xlsx');
module.exports = {
	name: 'Revenue Collected',
	filename: 'revenue_collected',
	cols: [
		{
			label: 'Address',
			key: "address",
			column_type: 'string'

		},
		{
			label: 'Revenue',
			key: "revenue",
			column_type: 'string'

		}
	],
}