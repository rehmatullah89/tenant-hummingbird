var moment = require('moment');
var XLSX = require('xlsx');

module.exports = {
	name: 'Reservations',
	filename:'reservations',
	structure: [
		{
			label: "Created",
			key: "created",
			sortable:true,
			width: 150,
			showSmall: true,
			column_type: 'string'
		},

		{
			label: "Address",
			key: "address",
			sortable:true,
			column_type: 'string'
		},
		{
			label: "Reserved By",
			key: "name",
			sortable:true,
			column_type: 'string'
		},
		{
			label: "Expires",
			key: "expires",
			sortable:true,
			showSmall: true,
			column_type: 'string'
		},
		{
			label: "",
			key: "actions"
		},
	],
	filter_structure: [
		{
			label: "Search For Name, Email, or phone",
			key: 'search',
			type: "input"
		},
		{
			label: "Property",
			key: 'property_id',
			type: "multi-select"

		},
		{
			label: "Category",
			key: "category_id",
			type: "multi-select",
		},

	],
	filters:{
		search:{},
		columns:[
			'created',
			'address',
			'name',
			'expires',
			'actions'
		],
		sort: {
			field: 'created',
			dir: 'DESC'
		},
		page: 1,
		limit:0,
		offset:0
	}
}