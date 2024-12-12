var moment = require('moment');

module.exports = {
	name: 'QuickBook',
	filename:'quickbook_export',
	cols: [
        {
			label: 'Name',
			key: "facility_name",
			column_type: 'string'
		},
        {
			label: 'Account Number',
			key: "account_number",
			column_type: 'number'
		},
		{
			label: "Account Name",
			key: "account_name",
			column_type: 'string'
		},
        {
			label: "Type",
			key: "category",
			column_type: 'string'
		},
		{
			label: "Detail Type",
			key: "account_type",
			column_type: 'string'
		},
		// {
		// 	label: "Account Sub Type",
		// 	key: "sub_account_type",
		// 	column_type: 'string'
		// },
        {
			label: 'Date',
			key: "export_date",
			column_type: 'date2',
			format(data){
				return moment(data.export_date, 'YYYY-MM-DD').toDate()
			}
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
		}
	],



}