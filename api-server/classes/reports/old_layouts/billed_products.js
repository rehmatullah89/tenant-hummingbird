var moment = require('moment');
var XLSX = require('xlsx');
module.exports = {
	name: 'Billed Products',
	filename: 'billed_products',
	structure: [
		{
			label: "Product",
			key: "name",
			sortable: true,
			column_type: 'string'
		},
		{
			label: 'Tenant',
			key: "tenant",
			sortable: true,
			column_type: 'string'

		},
		{
			label: 'Date Billed',
			key: "invoice_date",
			sortable: true,
			column_type: 'date',
			format(data){
				return moment(data.invoice_date, 'YYYY-MM-DD').toDate()
			}
		},
		{
			label: 'Invoice Number',
			key: "invoice_number",
			sortable: true,
			column_type: 'number'
		},
		{
			label: "Address",
			key: "address",
			sortable: true,
			column_type: 'string'
		},

		{
			label: "Unit Number",
			key: "unit_number",
			sortable: true,
			column_type: 'string'
		},

		{
			label: "Cost",
			key: "cost",
			sortable: true,
			column_type: 'currency',
			total: true,
			// format(data){
			//  	return XLSX.SSF.format('$0.00', data.cost)
			//  }
		}
	],
	filter_structure: [
		{
			label: "Property",
			key: 'property_id',
			type: "multi-select"
		},
		{
			label: "Product",
			key: 'product_id',
			type: "multi-select"
		},

		{
			label: "TimeFrame",
			key: 'timeframe',
			type: "timeframe",
		}

	],
	filters: {
		search: {},
		columns:[
			'name',
			'tenant',
			'invoice_date',
			'invoice_number',
			'address',
			'unit_number',
			'cost'
		],
		sort: {
			field: 'invoice_date',
			dir: 'ASC'
		},
		limit: 0,
		page:1,
		offset:0

	}



}