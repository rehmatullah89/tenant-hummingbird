var moment = require('moment');

var models  = require(__dirname + '/../models');

var e  = require(__dirname + '/../modules/error_handler.js');
var ConvertArrayToCSV = require(__dirname + '/../modules/convert_array_to_csv.js');
var Mail = require(__dirname + '/../modules/mail.js');

module.exports = {
    async sendErrorStateSummary(connection, company_ids, date){
		var payment_amt_remaining_summary = [];
		var amt_not_equal_to_refund_sub_applied = [];
		var amt_applied_not_equal_total_payments = []
		var invoice_date_different_from_period_start = [];
		var invoices_missing_inovice_lines = [];
		var invoices_total_wrong_calculation = [];
		var active_leases_with_no_inovice = [];
		var active_leases_auto_pay_not_charged = [];
		var invoices_total_payment_not_updated = [];
		var invoice_period_more_than_one_month = [];
		var active_invoices_on_void_payment = [];
		var promises = [];
		try{
			payment_amt_remaining_summary = await models.Invoice.payment_amt_remaining_summary(connection);
			amt_not_equal_to_refund_sub_applied = await models.Invoice.amt_not_equal_to_refund_sub_applied(connection);
			amt_applied_not_equal_total_payments = await models.Invoice.amt_applied_not_equal_total_payments(connection);
			invoice_date_different_from_period_start = await models.Invoice.invoice_date_different_from_period_start(connection, company_ids);
			invoices_missing_inovice_lines = await models.Invoice.invoices_missing_inovice_lines(connection);
			invoices_total_wrong_calculation = await models.Invoice.invoices_total_wrong_calculation(connection);
			active_leases_with_no_inovice = await models.Invoice.active_leases_bill_today_invoice_not_generated(connection);
			active_leases_auto_pay_not_charged = await models.Invoice.active_leases_not_charge_bill_today_auto_pay_active(connection);
			invoices_total_payment_not_updated = await models.Invoice.invoices_total_payment_not_updated(connection);
			invoice_period_more_than_one_month = await models.Invoice.invoice_period_more_than_one_month(connection, company_ids);
			active_invoices_on_void_payment = await models.Invoice.active_invoices_on_void_payment(connection);

			let payment_amt_remaining_csv = payment_amt_remaining_summary.length > 0 ? ConvertArrayToCSV({data : payment_amt_remaining_summary}) : "no record found";
			let refund_sub_applied_csv = amt_not_equal_to_refund_sub_applied.length > 0 ? ConvertArrayToCSV({data : amt_not_equal_to_refund_sub_applied}) : "no record found";
			let total_payment_applied_csv = amt_applied_not_equal_total_payments.length  > 0? ConvertArrayToCSV({data : amt_applied_not_equal_total_payments}) : "no record found";
			let invoice_period_start_diff_csv = invoice_date_different_from_period_start.length  > 0? ConvertArrayToCSV({data : invoice_date_different_from_period_start}) : "no record found";
			let missing_invoice_lines_csv = invoices_missing_inovice_lines.length > 0 ? ConvertArrayToCSV({data : invoices_missing_inovice_lines}) : "no record found";
			let invoice_total_csv = invoices_total_wrong_calculation.length > 0 ? ConvertArrayToCSV({data : invoices_total_wrong_calculation}) : "no record found";
			let lease_with_no_invoice_csv = active_leases_with_no_inovice.length > 0 ? ConvertArrayToCSV({data : active_leases_with_no_inovice}) : "no record found";
			let failed_autopay_csv = active_leases_auto_pay_not_charged.length > 0 ? ConvertArrayToCSV({data : active_leases_auto_pay_not_charged}) : "no record found";
			let total_pymt_update_csv = invoices_total_payment_not_updated.length > 0 ? ConvertArrayToCSV({data : invoices_total_payment_not_updated}) : "no record found";
			let irregular_invoice_period_csv = invoice_period_more_than_one_month.length >0 ? ConvertArrayToCSV({data : invoice_period_more_than_one_month}) : "no record found";
			let active_void_pymts_csv = active_invoices_on_void_payment.length >0 ? ConvertArrayToCSV({data : active_invoices_on_void_payment}) : "no record found";

			let attachments = [
				{
					content_type: "text/csv",
					name: 'Payment Amt Remaining summary less than 0' +' - ' + moment().format('MM/DD/YYYY') + '.csv',
					content: Buffer.from(payment_amt_remaining_csv).toString('base64')
				},
				{
					content_type: "text/csv",
					name: 'AMT refunds subtract Amt Applied not equal to Amt Remaining ' +' - ' + moment().format('MM/DD/YYYY') + '.csv',
					content: Buffer.from(refund_sub_applied_csv).toString('base64')
				},
				{
					content_type: "text/csv",
					name: 'AMT applied not equal to total payments ' +' - ' + moment().format('MM/DD/YYYY') + '.csv',
					content: Buffer.from(total_payment_applied_csv).toString('base64')
				},
				{
					content_type: "text/csv",
					name: 'Invoice date is different from period start ' +' - ' + moment().format('MM/DD/YYYY') + '.csv',
					content: Buffer.from(invoice_period_start_diff_csv).toString('base64')
				},
				{
					content_type: "text/csv",
					name: 'invoice with missing lines ' +' - ' + moment().format('MM/DD/YYYY') + '.csv',
					content: Buffer.from(missing_invoice_lines_csv).toString('base64')
				},
				{
					content_type: "text/csv",
					name: 'invoice totals not calculated correctly ' +' - ' + moment().format('MM/DD/YYYY') + '.csv',
					content: Buffer.from(invoice_total_csv).toString('base64')
				},
				{
					content_type: "text/csv",
					name: 'active leases with no inovices genereated for today bill ' +' - ' + moment().format('MM/DD/YYYY') + '.csv',
					content: Buffer.from(lease_with_no_invoice_csv).toString('base64')
				},
				{
					content_type: "text/csv",
					name: 'active leases with autopay active but not charged ' +' - ' + moment().format('MM/DD/YYYY') + '.csv',
					content: Buffer.from(failed_autopay_csv).toString('base64')
				},
				{
					content_type: "text/csv",
					name: 'invoices_total_payment_not_updated ' +' - ' + moment().format('MM/DD/YYYY') + '.csv',
					content: Buffer.from(total_pymt_update_csv).toString('base64')
				},
				{
					content_type: "text/csv",
					name: 'invoice_period_more_than_one_month ' +' - ' + moment().format('MM/DD/YYYY') + '.csv',
					content: Buffer.from(irregular_invoice_period_csv).toString('base64')
				},
				{
					content_type: "text/csv",
					name: 'active_invoices_on_void_payment ' +' - ' + moment().format('MM/DD/YYYY') + '.csv',
					content: Buffer.from(active_void_pymts_csv).toString('base64')
				}
			];
			attachments.forEach(function (template) {
				promises.push(Mail.sendErrorState('This is the error states " ' + template.name +'  " reports', [template]));
			});
			Promise.all(promises).then(()=>{
				return 'email sent';
			})
			.catch((err)=>{
				return err;
			});
		} catch(err) {
			console.log("err", err);
			console.log(err.stack);
			throw err;
		}
	},
	async sendSevereErrorStateSummary(connection, date){
		var active_payment_on_void_invoices = [];
		var applied_plus_refund_greater_payment_amount = []
		var amt_applied_greater_than_actual_total = [];
		var tax_applied_not_equal__actual_total_tax = [];
		var invoice_lines_with_cost_null = [];
		var invoices_total_discount_sum = [];
		var invoice_lines_total_discount_sum = [];
		var invoice_lines_total_discount_greater_than_amount = [];
		var promises = [];
		try{
			active_payment_on_void_invoices = await models.Invoice.active_payment_on_void_invoices(connection, date);
			applied_plus_refund_greater_payment_amount = await models.Invoice.applied_plus_refund_greater_payment_amount(connection);
			amt_applied_greater_than_actual_total = await models.Invoice.amt_applied_greater_than_actual_total(connection);
			tax_applied_not_equal__actual_total_tax = await models.Invoice.tax_applied_not_equal__actual_total_tax(connection);
			invoice_lines_with_cost_null = await models.Invoice.invoice_lines_with_cost_null(connection);
			invoices_total_discount_sum = await models.Invoice.invoices_total_discount_sum(connection);
			invoice_lines_total_discount_sum = await models.Invoice.invoice_lines_total_discount_sum(connection);
			invoice_lines_total_discount_greater_than_amount = await models.Invoice.invoice_lines_total_discount_greater_than_amount(connection);

			let void_inovice_active_pymts_csv = active_payment_on_void_invoices.length > 0 ? ConvertArrayToCSV({data : active_payment_on_void_invoices}) : "no record found";
			let paid_lessthan_actual_amt_csv = applied_plus_refund_greater_payment_amount.length  > 0? ConvertArrayToCSV({data : applied_plus_refund_greater_payment_amount}) : "no record found";
			let more_amt_applied_than_actual_csv = amt_applied_greater_than_actual_total.length  > 0? ConvertArrayToCSV({data : amt_applied_greater_than_actual_total}) : "no record found";
			let more_tax_applied_than_actual_csv = tax_applied_not_equal__actual_total_tax.length  > 0? ConvertArrayToCSV({data : tax_applied_not_equal__actual_total_tax}) : "no record found";
			let null_cost_invoices_csv = invoice_lines_with_cost_null.length  > 0? ConvertArrayToCSV({data : invoice_lines_with_cost_null}) : "no record found";
			let total_discount_csv = invoices_total_discount_sum.length  > 0? ConvertArrayToCSV({data : invoices_total_discount_sum}) : "no record found";
			let invoic_lines_discount_csv = invoice_lines_total_discount_sum.length  > 0? ConvertArrayToCSV({data : invoice_lines_total_discount_sum}) : "no record found";
			let more_than_actual_discount_csv = invoice_lines_total_discount_greater_than_amount.length  > 0? ConvertArrayToCSV({data : invoice_lines_total_discount_greater_than_amount}) : "no record found";

			let attachments = [
				{
					content_type: "text/csv",
					name: 'Active payment applied to voided invoice' +' - ' + moment().format('MM/DD/YYYY') + '.csv',
					content: Buffer.from(void_inovice_active_pymts_csv).toString('base64')
				},
				{
					content_type: "text/csv",
					name: 'applied_plus_refund_greater_payment_amount' +' - ' + moment().format('MM/DD/YYYY') + '.csv',
					content: Buffer.from(paid_lessthan_actual_amt_csv).toString('base64')
				},
				{
					content_type: "text/csv",
					name: 'AMT amount applied greater than actual_total on invoices ' +' - ' + moment().format('MM/DD/YYYY') + '.csv',
					content: Buffer.from(more_amt_applied_than_actual_csv).toString('base64')
				},
				{
					content_type: "text/csv",
					name: 'TAX applied is not equal actual_total tax ' +' - ' + moment().format('MM/DD/YYYY') + '.csv',
					content: Buffer.from(more_tax_applied_than_actual_csv).toString('base64')
				},
				{
					content_type: "text/csv",
					name: 'invoice_lines_with_cost_null ' +' - ' + moment().format('MM/DD/YYYY') + '.csv',
					content: Buffer.from(null_cost_invoices_csv).toString('base64')
				},
				{
					content_type: "text/csv",
					name: 'invoices_total_discount_sum ' +' - ' + moment().format('MM/DD/YYYY') + '.csv',
					content: Buffer.from(total_discount_csv).toString('base64')
				},
				{
					content_type: "text/csv",
					name: 'invoice_lines_total_discount_sum ' +' - ' + moment().format('MM/DD/YYYY') + '.csv',
					content: Buffer.from(invoic_lines_discount_csv).toString('base64')
				},
				{
					content_type: "text/csv",
					name: 'invoice_lines_total_discount_greater_than_amount ' +' - ' + moment().format('MM/DD/YYYY') + '.csv',
					content: Buffer.from(more_than_actual_discount_csv).toString('base64')
				}
			];

			attachments.forEach(function (template) {
				promises.push(Mail.sendErrorState('This is the severe error states " ' + template.name +'  " reports', [template]));
			});

			Promise.all(promises).then(()=>{
				return 'email sent';
			}).catch((err)=>{
				return err;
			});

		} catch(err) {
			console.log("err", err);
			console.log(err.stack);
			throw err;
		}
	}
}