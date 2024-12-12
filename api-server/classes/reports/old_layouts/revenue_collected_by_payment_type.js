var moment = require('moment');
var XLSX = require('xlsx');
module.exports = {
	name: 'Revenue Collected By Payment Type',
	filename: 'revenue_collected_by_payment_type',
	cols: [
		{
			label: 'Payment Type',
			key: "payment_type",
			column_type: 'string'

		},
		{
			label: 'Payment Method',
			key: "payment_method",
			column_type: 'string'

		},
		{
			label: 'Revenue',
			key: "revenue",
			column_type: 'string'

		}
	],
}