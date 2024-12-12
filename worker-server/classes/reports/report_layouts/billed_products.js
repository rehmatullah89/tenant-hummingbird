var moment = require('moment');
var XLSX = require('xlsx');
module.exports = {
	name: 'Billed Products',
	filename: 'billed_products',
	cols: [
		{
			label: "Product",
			key: "name",
			column_type: 'string'
		},
		{
			label: 'Tenant',
			key: "tenant",
			column_type: 'string'

		},
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
			label: "Unit Number",
			key: "unit_number",
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