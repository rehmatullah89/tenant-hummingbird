var moment = require('moment');

module.exports = {
	name: 'QuickBook_IIF',
	filename:'quickbook_iif_export',
	cols: [
		{
			key: "trans",
			column_type: 'string'
		},
		{
			key: "trans_id",
			column_type: 'string'
		},
		{
			key: "tran_type",
			column_type: 'string'
		},
		{
			key: "date",
			column_type: 'date2',
			format(data){
				let d = moment(data.date, 'YYYY-MM-DD');
				return d.isValid() ? d.toDate(): data.date
			}
		},
		{
			key: "facility_name",
			column_type: 'string'
		},
		{
			key: "account_number",
			column_type: 'string'
		},
		{
			key: "amount",
			column_type: 'currency',
			column_format: '0.00'
		},
		{
			key: "account_name",
			column_type: 'string'
		}
	]
}