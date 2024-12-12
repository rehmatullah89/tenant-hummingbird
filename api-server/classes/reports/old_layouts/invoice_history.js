var moment = require('moment');
var XLSX = require('xlsx');
module.exports = {
	name: 'Invoice History',
	filename:'invoice_history',
	structure: [
		{
			label: "Invoice Number",
			key: "number",
			sortable:true,
			width: 150,
			column_type: 'string',

		},
		{
			label: "Unit",
			key: "address",
			sortable:true,
			width: 150,
			column_type: 'string'
		},
		{
			label: "Due Date",
			key: "due",
			sortable:true,
			width: 150,
			column_type: 'date',
		},
		{
			label: "Total",
			key: "amount",
			sortable:true,
			column_type: 'currency',
			total: true,
		},{
			label: "Balance",
			key: "balance",
			sortable:true,
			column_type: 'currency',
			total: true,
		},
		{
			label: "Status",
			key: "status",
			sortable:false
		}
	],
	filter_structure: [
		{
			label: "Status",
			key: 'status',
			type: "radio",
			options: ["All", "Paid", "Open", "Past Due", "Void"]
		}
	],
	filters: {
		search: {},
		columns:[
			'number',
			'address',
			'due',
			'amount',
			'balance',
			'status',
		],
		sort: {
			field: 'number',
			dir: 'DESC'
		},
		limit: 0,
		page:1,
		offset:0

	}



}