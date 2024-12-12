var moment = require('moment');

module.exports = {
	name: 'Transaction Details',
	filename:'Transaction Details',
	cols: [
		{
			label: 'Property Number',
			key: "property_number",
			column_type: 'string'
		},
        {
			label: 'Property Name',
			key: "property_name",
			column_type: 'string'
		},
        {
			label: 'Transaction Number',
			key: "transaction_number",
			column_type: 'string'
		},
        {
			label: 'Event',
			key: "event_name",
			column_type: 'string'
		},
		{
			label: 'Tenant Name',
			key: "tenant_name",
			column_type: 'string'
		},
		{
			label: 'Space Number',
			key: "space_number",
			column_type: 'string'
		},
        {
			label: 'Date',
			key: "export_date",
			column_type: 'date2',
			format(data){
				return moment(data.export_date, 'YYYY-MM-DD').toDate()
			}
		},
		{
			label: 'Credit/Debit Type',
			key: "credit_debit_type",
			column_type: 'string'
		},
		{
			label: 'GL Code',
			key: "gl_code",
			column_type: 'string'
		},
		{
			label: 'GL Name',
			key: "gl_name",
			column_type: 'string'
		},
		{
			label: "Amount",
			key: "amount",
			column_type: 'currency'
		},
        {
			label: "Category",
			key: "category",
			column_type: 'string'
		},
		{
			label: "Type",
			key: "account_type",
			column_type: 'string'
		},
		{
			label: "Subtype",
			key: "account_subtype",
			column_type: 'string'
		},
		{
			label: "Book Type",
			key: "book_type",
			column_type: 'string'
		},
		{
			label: "Invoice Number",
			key: "invoice_number",
			column_type: 'string'
		},		{
			label: "Invoice Due Date",
			key: "invoice_due_date",
			column_type: 'string'
		},
		{
			label: "Comments",
			key: "comments",
			column_type: 'string'
		}
	]
}