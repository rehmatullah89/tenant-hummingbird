var moment = require('moment');
var XLSX = require('xlsx');
module.exports = {
	name: 'Invoice History',
	filename:'invoice_history',
	cols: [
		{
			label: 'Date Billed',
			key: "invoice_date",
			column_type: 'date',
			format(data){
				return moment(data.invoice_date, 'YYYY-MM-DD').toDate()
			}
		},
		{
			label: 'Invoice Number',
			key: "invoice_number",
			column_type: 'number'
		},
		{
			label: "Address",
			key: "address",
			column_type: 'string'
		},
		{
			label: "Product",
			key: "name",
			column_type: 'string'
		},
		{
			label: "Cost",
			key: "cost",
			column_type: 'currency',
			// format(data){
			// 	return XLSX.SSF.format('$0.00', data.cost)
			// }
		}
	],



}