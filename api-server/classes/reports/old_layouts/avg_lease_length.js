var moment = require('moment');
var XLSX = require('xlsx');
module.exports = {
	name: 'Invoice History',
	filename:'invoice_history',
	cols: [
		{
			label: 'Address',
			key: "address",
			column_type: 'string'
		},
		{
			label: 'Number of Leases',
			key: "num_leases",
			column_type: 'number'
		},

		{
			label: "Avg Months",
			key: "avg_months",
			column_type: 'string'
		},

		{
			label: "Standard Deviation",
			key: "std_deviation",
			column_type: 'number'
		},


	],



}