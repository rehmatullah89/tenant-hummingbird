var AccountingRoutines = {
	async exportRoutine(data) {
		try {
			var connection = await db.getConnectionByType('write', data.cid);

			if(!data.to_date && data.property_id) {
				const property = new Property({ id: data.property_id });
				let date = await property.getLocalCurrentDate(connection);
				data.to_date = date;
			}

			// Void Invoice is dependent on invoice generation
			await this.generateInvoiceExports(connection, data);
			await this.generateVoidExports(connection, data);
			// await this.generateAllowanceExports(connection, data);	
			// await this.generatePaymentsExports(connection, data);	
			// await this.generateRevenueRecognitionExports(connection, data);
			// await this.generateRefundExports(connection, data);
			
			const exportPromises = [];
			// exportPromises.push(this.generateInvoiceExports(connection, data));
			// exportPromises.push(this.generateVoidExports(connection, data));
			exportPromises.push(this.generateAllowanceExports(connection, data));	
			exportPromises.push(this.generatePaymentsExports(connection, data));	
			exportPromises.push(this.generateRevenueRecognitionExports(connection, data));
			exportPromises.push(this.generateRefundExports(connection, data));
			exportPromises.push(this.generateInterPropertyPaymentExports(connection, data));
			
			await Promise.all(exportPromises);	
		} catch (err) {
			console.log('Export Routine Error: ', err);
		} finally {
			await db.closeConnection(connection);
		}
	},

	async generateInvoiceExports(connection, data) {
		const invoices = await Accounting.generateInvoicesExports(connection, data);
		for (let i = 0; i < invoices.length; i++) {
			let payload = {
				event_id: ENUMS.ACCOUNTING.EVENTS.GENERATING_INVOICE,
				invoice_id: invoices[i].id,
				property_id: invoices[i].property_id,
				date: invoices[i].due,
				cid: data.cid,
				export_type: 'GENERATE_INVOICE',
				job_data: data,
				source: data.source,
				event_name: ENUMS.LOGGING.ACCOUNTING_RESILIENCY
			};

			await AccountingEvent.generateAccountingExport(connection, payload);			
		}
	},

	async generateVoidExports(connection, data){
		const invoices = await Accounting.generateVoidInvoicesExports(connection, data);

		for (let i = 0; i < invoices.length; i++) {
			payload = {
				event_id: ENUMS.ACCOUNTING.EVENTS.VOIDING_INVOICE,
				invoice_id: invoices[i].id,
				property_id: invoices[i].property_id,
				date: invoices[i].void_date,
				cid: data.cid,
				export_type: 'VOID_INVOICE',
				job_data: data,
				source: data.source,
				event_name: ENUMS.LOGGING.ACCOUNTING_RESILIENCY
			}

			await AccountingEvent.generateAccountingExport(connection, payload);
		}
	},

	async generateAllowanceExports(connection, data) {
		const payments = await Accounting.generateAllowanceExports(connection, data);
		
		for(let i = 0; i < payments.length; i++) {
			let payload = {
				event_id: ENUMS.ACCOUNTING.EVENTS.ALLOWANCE, 
				payment_id: payments[i].id, 
				property_id: payments[i].property_id,
				date: payments[i].date,
				cid: data.cid,
				export_type: 'GENERATE_ALLOWANCE',
				job_data: data,
				source: data.source,
				event_name: ENUMS.LOGGING.ACCOUNTING_RESILIENCY
			};

			await AccountingEvent.generateAccountingExport(connection, payload);
		}
	},

	async generatePaymentsExports(connection, data) {
		const payments = await Accounting.generatePaymentsExports(connection, data);

		for(let i = 0; i < payments.length; i++) {
			let payload = {
				invoicesPaymentsBreakdownId: payments[i].id, 
				invoiceId: payments[i].invoice_id, 
				paymentId: payments[i].payment_id, 
				propertyId: payments[i].property_id,
				date: payments[i].date,
				cid: data.cid,
				export_type: 'GENERATE_PAYMENTS',
				job_data: data,
				source: data.source,
				event_name: ENUMS.LOGGING.ACCOUNTING_RESILIENCY
			};

			await PaymentEvent.generateAccountingExport(connection, payload);
		}
	},

	async generateRevenueRecognitionExports(connection, data) {
		const invoices = await Accounting.generateRevenueRecognitionExports(connection, data);

		for(let i = 0; i < invoices.length; i++) {
			let payload = {
				event_id: ENUMS.ACCOUNTING.EVENTS.REVENUE_RECOGNITION, 
				invoice_id: invoices[i].id, 
				property_id: invoices[i].property_id,
				advance_payment: invoices[i].advance_payment,
				date: invoices[i].due,
				cid: data.cid,
				export_type: 'GENERATE_REVENUE_RECOGNITION',
				job_data: data,
				source: data.source,
				event_name: ENUMS.LOGGING.ACCOUNTING_RESILIENCY
			};
			
			await AccountingEvent.generateAccountingExport(connection, payload);
		}
	},

	async generateRefundExports(connection, data) {
		const refunds = await Accounting.generateRefundsExports(connection, data);
		
		for(let i = 0; i < refunds.length; i++) {
			let payload = {
				event_id: ENUMS.ACCOUNTING.EVENTS.REFUNDS,
				refund_id: refunds[i].id, 
				property_id: refunds[i].property_id,
				date: refunds[i].refund_date,
				cid: data.cid,
				export_type: 'GENERATE_REFUND',
				job_data: data,
				source: data.source,
				event_name: ENUMS.LOGGING.ACCOUNTING_RESILIENCY
			};

			await AccountingEvent.generateAccountingExport(connection, payload);
		}
	},

	async generateInterPropertyPaymentExports(connection, data) {
		const interPropertyPayments = await Accounting.generateInterPropertyPaymentExportsExports(connection, data);
		
		for(let i = 0; i < interPropertyPayments.length; i++) {
			let payload = {
				event_id: ENUMS.ACCOUNTING.EVENTS.INTER_PROPERTY_PAYMENT,
				payment_id: interPropertyPayments[i].id,
				source_payment_id: interPropertyPayments[i].source_payment_id,
				property_id: interPropertyPayments[i].property_id,
				date: interPropertyPayments[i].date,
				cid: data.cid,
				export_type: 'GENERATE_INTER_PROPERTY_PAYMENT',
				job_data: data,
				source: data.source,
				event_name: ENUMS.LOGGING.ACCOUNTING_RESILIENCY
			};

			await AccountingEvent.generateAccountingExport(connection, payload);
		}
	}
}

module.exports = {
	exportRoutine: async (data) => {
		return await AccountingRoutines.exportRoutine(data);
	},
	generatePaymentsExports: async (connection, data) => {
		return await AccountingRoutines.generatePaymentsExports(connection, data);
	},
	generateRevenueRecognitionExports: async (connection, data) => {
		return await AccountingRoutines.generateRevenueRecognitionExports(connection, data);
	},
	generateRefundExports: async (connection, data) => {
		return await AccountingRoutines.generateRefundExports(connection, data);
	},
};

var db = require(__dirname + '/../modules/db_handler.js');
const ENUMS = require(__dirname + '/../modules/enums.js');
const Accounting = require(__dirname + '/../classes/accounting.js');
const AccountingEvent = require(__dirname + '/../events/accounting.js');
const PaymentEvent = require('../events/payment');
const Property = require(__dirname + '/../classes/property.js');