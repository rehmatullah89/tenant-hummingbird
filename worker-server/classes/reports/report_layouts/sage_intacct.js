var moment = require('moment');

module.exports = {
	name: 'QuickBook',
	filename:'quickbook_export',
	cols: [
        {
			label: 'Journal',
			key: "journal",
			column_type: 'string'
		},
		{
			label: 'Date',
			key: "export_date",
			column_type: 'string',
		},
		{
			label: 'Description',
			key: "description",
			column_type: 'string'
		},
		{
			label: 'Line no',
			key: "line_no",
			column_type: 'string'
		},
        {
			label: 'Account',
			key: "account_number",
			column_type: 'string'
		},
		{
			label: "Debit",
			key: "debit",
			column_type: 'currency',
		},
        {
			label: "Credit",
			key: "credit",
			column_type: 'currency',
		},
		{
			label: 'Source Entity',
			key: "source_entity",
			column_type: 'string'
		},
	],



}