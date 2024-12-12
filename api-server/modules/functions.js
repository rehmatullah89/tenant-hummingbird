var moment  = require('moment');
var Invoice = require(__dirname + '/../classes/invoice.js');


module.exports = {


	async generateInvoice(connection, lease, company_id, services, billed_months, save, created_by, apikey_id) {

		let datetime = await lease.getCurrentLocalPropertyDate(connection,'YYYY-MM-DD')
		var invoice = new Invoice({
			lease_id: lease.id,
			user_id: null,
			date: moment(datetime).format('YYYY-MM-DD'),
			due: moment(datetime).format('YYYY-MM-DD'),
			company_id: company_id,
			created_by,
			apikey_id
		});

		invoice.Lease = lease;
		invoice.company_id = company_id;
		var invoicePeriod = {}

		return lease.getLastBillingDate(connection)
			.then(async lastBillingDate => {
				var lastBilled = lastBillingDate ? moment(lastBillingDate, 'YYYY-MM-DD HH:mm:ss').startOf('day') : null;

				// Find Invoice start and end dates.
				invoicePeriod = await lease.getCurrentInvoicePeriod(connection, lastBilled, billed_months);
				// For a given invoice period, find:
				// invoice.period_start = billing_period_start.format('YYYY-MM-DD');
				// invoice.period_end = billing_period_end.format('YYYY-MM-DD');

				return invoice.makeFromServices(
					connection,         // connection
					services,   // services
					lease,              // services
					invoicePeriod.start,
					invoicePeriod.end,
					lease.Discounts, // discounts,
					company_id
				)
			}).then(() => {
				if(!invoice.InvoiceLines.length || !save) return true;
				return invoice.save(connection);
			})
			.then(() => invoice.total())
			.then(() => invoice );
	}
}