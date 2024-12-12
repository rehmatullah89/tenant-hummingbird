var moment = require('moment');
var XLSX = require('xlsx');

module.exports = {
	name: 'Yardi',
	filename:'yardi_export',
	structure: [
		{
			key: "type",
			sortable: true,
			column_type: 'string'
		},

		{
			key: "transaction_number",
			column_type: 'string'
		},
		{
			key: "person",
			column_type: 'string'
		},
		{
			key: "name",
			column_type: 'string'
		},
		{
			key: "date",
			column_type: 'string'
		},
		{
			key: "post_month",
			column_type: 'string'
		},
		{
			key: "ref",
			column_type: 'string'
		},
		{
			key: "remark",
			column_type: 'string'
		},
		{
			key: "property_code",
			column_type: 'string'
		},
		{
			key: "amount",
			column_type: 'string'
		},
		{
			key: "account",
			column_type: 'string'
		},
		{
			key: "accrual",
			column_type: 'string'
		},
		{
			key: "offset",
			column_type: 'string'
		},
		{
			key: "book_num",
			column_type: 'string'
		},
		{
			key: "desc",
			column_type: 'string'
		},
		{
			key: "flag",
			column_type: 'string'
		},

	],
	filter_structure: [
		{
			label: "Property",
			key: 'property_id',
			type: "multi-select"

		},
    {
      label: "TimeFrame",
      key: 'timeframe',
      type: "timeframe",
    }
	],
	filters: {
		search: {
    },
		columns:[
			'name',
			'address',
			'category_name',
			'number',
			'created',
			'status',
			'email',
			'phone',
			'source',
			'status',
			'opened'
		],
		sort: {
			field: 'created',
			dir: 'DESC'
		},
		limit: 0,
		page:1,
		offset:0

	}




}
