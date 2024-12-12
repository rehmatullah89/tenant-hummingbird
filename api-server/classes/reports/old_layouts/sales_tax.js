var moment = require('moment');
var XLSX = require('xlsx');
module.exports = {
	name: 'Sales Tax',
	filename: 'sales_tax',
	cols: [
		{
			label: 'Address',
			key: "address",
			column_type: 'string'

		},
		{
			label: 'Unit Number',
			key: "unit_number",
			column_type: 'string'

		},
		{
			label: 'Date Billed',
			key: "date",
			column_type: 'date',
			format(data){
				return moment(data.date, 'YYYY-MM-DD').toDate()
			}
		},
		{
			label: "Product",
			key: "product_name",
			column_type: 'string'
		},
		{
			label: 'Invoice Number',
			key: "invoice_number",
			column_type: 'string'

		},
		{
			label: 'Subtotal',
			key: "subtotal",
			column_type: 'string'
		},
		{
			label: 'Discounts',
			key: "discounts",
			column_type: 'string'

		},
		{
			label: 'Taxable Amount',
			key: "taxable_amount",
			column_type: 'string'

		},
		{
			label: 'Taxrate',
			key: "taxrate",
			column_type: 'string'
		},
		{
			label: "Total Tax",
			key: "total_tax",
			column_type: 'string'
		}

	],
}