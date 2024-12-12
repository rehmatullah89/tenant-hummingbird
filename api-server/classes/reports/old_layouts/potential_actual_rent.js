var moment = require('moment');
var XLSX = require('xlsx');
module.exports = {
	name: 'Revenue Collected By Payment Type',
	filename: 'revenue_collected_by_payment_type',
	cols: [
		{
			label: 'Address',
			key: "address",
			column_type: 'string'

		},
		{
			label: 'Actual Rent',
			key: "actual_rent",
			column_type: 'string'

		},
		{
			label: 'Potential Rent',
			key: "potential_rent",
			column_type: 'string'

		}

	],
}