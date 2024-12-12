'use strict';
var BaseReport = require(__dirname + '/base_report.js');
var Promise = require('bluebird');
var models = require(__dirname + '/../../../models');
var Invoice = require(__dirname + '/../../invoice.js');
var Accounting = require(__dirname + '/../../accounting.js');
var Payment = require(__dirname + '/../../payment.js');
var moment = require('moment');
const util = require('util');

class Yardi extends BaseReport{
	constructor(connection, company, filters, format) {

		super(connection, company, filters, format);
		this.config = config;
	}

	async generateData(){

		this.conditions = {
			timeframe: {
				start: moment('2019-10-01'),
				end:  moment('2019-10-04')
			}
		}

		let invoice_list = await models.Invoice.getGLItems(this.connection, this.conditions,  this.company.id);
		let payment_list = await models.Payment.getGLItems(this.connection, this.conditions,  this.company.id);

		// NEED TO GET PAYMENTS APPLIED ON THIS DAY BUT NOT MADE OR INVOICED




		let rental_income = {};
		let sales_tax = {};
		let concessions = {};
		let prepaid_rent = {};
		let bank_deposit = {};
		let merchant_deposit = {};
		let tax = [];
		let trannum = 1;


		let accounts_receivable = '******** AR ********';

		// INVOICE
		let sales_tax_code = '******** Sales Tax ********';
		let concesions_code = '******** Concessions ********';

		// Payments
		let refunds_code = '******** Refunds ********';
		let to_be_refunded_code = '******** To Be Refunded ********';
		let merchant_deposit_code = '******** MD ********';
		let bank_code = '******** Bank ********';
		let prepaid_rent_code = '******** Prepaid Rent ********';
		let petty_cash_code = '******** Petty Cash ********';

		let nsf_code = '******** NSF ********';
		let allowance_code = '******** Allowance ********';

		let data = {};


		// sales tax payable    - Sales Tax Collected
		// Prepaid Rent         - Payment not applied to an invoice
		// Allowance            - Payment applied to Invoice on later date
		// Rental Income        - Payment Applied to Invoice
		// Bank Deposit         - Payment Cash or Check
		// Merchant Deposit     - Payment with a Credit Card
		// Late Fees


		// ACCRUAL Invoice Owed

		// REMARK               // DESC
		// Rental Income        Product Name                        - Invoice Line Item
		// Refund Transaction   Refunds                             - Late Fee
		// NSF                  - Returned Check


		// Accrual Payment Received
		// Bank Deposit         - Payment Cash or Check
		// Merchant Deposit     - Payment with a Credit Card


		for(let i = 0; i < invoice_list.length; i++){

			let property_id = invoice_list[i].property_id;

			// rental_income[property_id] = rental_income[property_id] || {};
			// sales_tax[property_id] = sales_tax[property_id] || 0;
			// concessions[property_id] = concessions[property_id] || 0;

			let invoice = new Invoice({id: invoice_list[i].id});
			await invoice.find(this.connection);
			invoice.total();


			data[invoice.date] = data[invoice.date] || {};
			data[invoice.date][property_id] = data[invoice.date][property_id] || {};



			for(let j = 0; j < invoice.InvoiceLines.length; j++){

				let invoice_line = invoice.InvoiceLines[j];
				data[invoice.date][property_id]['Rental Income'] = data[invoice.date][property_id]['Rental Income'] || {};
				data[invoice.date][property_id]['Rental Income'][invoice_line.Product.name] = data[invoice.date][property_id]['Rental Income'][invoice_line.Product.name] || {
					amount: 0,
					account:  '*** ' + invoice_line.Product.name + ' CODE *** '
				};

				data[invoice.date][property_id]['Rental Income'][invoice_line.Product.name].amount -=  invoice_line.cost;


			}

			if(invoice.total_tax){

				data[invoice.date][property_id]['Rental Income']["Sales Tax Payable"] = data[invoice.date][property_id]['Rental Income']["Sales Tax Payable"] || {
					account: sales_tax_code,
					amount: 0
				};

				data[invoice.date][property_id]['Rental Income']["Sales Tax Payable"].amount -= invoice.total_tax;

			}

			if(invoice.discounts){
				data[invoice.date][property_id]['Rental Income']["Concessions"] = data[invoice.date][property_id]['Rental Income']["Concessions"] || {
					amount: 0,
					account: concesions_code,
				};
				data[invoice.date][property_id]['Rental Income']["Concessions"].amount += invoice.discounts;
			}

		};


		let payments = {};


		for(let i = 0; i < payment_list.length; i++){
			let property_id = payment_list[i].property_id;
			let payment = new Payment({id: payment_list[i].id});
			await payment.find(this.connection);
			await payment.getPaymentApplications(this.connection);
			let date = moment(payment.date).format('YYYY-MM-DD');


			data[date] = data[date] || {};
			data[date][property_id] = data[date][property_id] || {};


			let applied = payment.AppliedPayments.reduce((a,b) => a + b.amount, 0);

			switch(payment.PaymentMethod.type.toLowerCase()){
				case 'check':
				case 'cash':

					data[date][property_id]['Bank Deposit'] = data[date][property_id]['Bank Deposit'] || {};
					if(applied != payment.amount){
						let prepaid = payment.amount - applied;
						data[date][property_id]['Bank Deposit']['Prepaid Rent'] = data[date][property_id]['Bank Deposit']['Prepaid Rent'] || {
							account: bank_code,
							amount : 0
						};
						data[date][property_id]['Bank Deposit']['Prepaid Rent'].amount += prepaid;

					}

					data[date][property_id]['Bank Deposit']['Bank Deposit'] = data[date][property_id]['Bank Deposit']['Bank Deposit'] || {
						account: bank_code,
						amount : 0
					};
					data[date][property_id]['Bank Deposit']['Bank Deposit'].amount += applied;

					break;
				case 'ach':
				case 'card':

					data[date][property_id]['Merchant Deposit'] = data[date][property_id]['Merchant Deposit'] || {};

					if(applied != payment.amount){
						let prepaid = payment.amount - applied;
						data[date][property_id]['Merchant Deposit']['Prepaid Rent'] = data[date][property_id]['Bank Deposit']['Prepaid Rent'] || {
							account: bank_code,
							amount : 0
						};
						data[date][property_id]['Merchant Deposit']['Prepaid Rent'].amount += prepaid;

					}

					data[date][property_id]['Merchant Deposit']['Merchant Deposit'] = data[date][property_id]['Merchant Deposit'][payment.PaymentMethod.type] || {
						account: bank_code,
						amount : 0
					};
					data[date][property_id]['Merchant Deposit']['Merchant Deposit'].amount += applied;

					break;
			}


		};

		let transaction_number = 1;
		let ledger = [];
		for(let date in data){
			for(let property_code in data[date]){
				for(let remark in data[date][property_code]){
					let transaction_total = 0;
					for(let desc in data[date][property_code][remark]){
						transaction_total += data[date][property_code][remark][desc].amount;

						ledger.push(this.generateLedgerRow(transaction_number, date, remark, property_code,  Math.round(data[date][property_code][remark][desc].amount * 1e2) / 1e2 ,  data[date][property_code][remark][desc].account, 1, desc ));
					}
					ledger.push(this.generateLedgerRow(transaction_number, date, remark, property_code,   (-1 * transaction_total), accounts_receivable , 1, "Accounts Receiveable" ));
					transaction_number++;
				}

			}
		}


		this.data = ledger;
		return;

		// console.log("rental_income", util.inspect(rental_income, false, null, true /* enable colors */))
		// console.log("sales_tax", util.inspect(sales_tax, false, null, true /* enable colors */))
		// console.log("concessions", util.inspect(concessions, false, null, true /* enable colors */))
		// console.log("payments", util.inspect(payments, false, null, true /* enable colors */))



		for(let property_id in rental_income){
			let transaction_total = 0;
			let date = '';

			for(let product_id in rental_income[property_id] ) {

				let first_product = rental_income[property_id][product_id][0];

				date = first_product.date;

				let total = rental_income[property_id][product_id].reduce( (a, b) => a + b.amount, 0);
				transaction_total += total;
				ledger.push(this.generateLedgerRow(transaction_number, date, first_product.remark, property_id, '-' + total, first_product.account, 1, first_product.desc ));

			}

			if(sales_tax[property_id]){
				transaction_total += sales_tax[property_id];
				ledger.push(this.generateLedgerRow(transaction_number, date, "Rental Income", property_id,  '-' + sales_tax[property_id], sales_tax_code, 1, "Sales Tax Payable" ));
			}

			// AR

			ledger.push(this.generateLedgerRow(transaction_number, date, "Rental Income", property_id,  transaction_total, accounts_receivable, 1, "Accounts Receivable" ));
			transaction_number++;


		}


		for(let property_id in payments){
			let transaction_total = 0;
			let date = '';

			for(let type in payments[property_id] ) {
				let p = payments[property_id][type];
				let first_payment = p[0];
				date = first_payment.date;



				let total = p.reduce( (a, b) => a + b.amount, 0);
				transaction_total += total;

				ledger.push(this.generateLedgerRow(transaction_number, first_payment.date, type, property_id, total, first_payment.account, 1, first_payment.desc ));
			}

			// AR

			ledger.push(this.generateLedgerRow(transaction_number, date, "*********", property_id, '-' + transaction_total, accounts_receivable, 1, "Accounts Receivable" ));
			transaction_number++;


		}

		this.data = ledger;

		// console.log("tax", tax);

	}

	generateLedgerRow(transaction_number, date, remark, property_code, amount, account, book_num, desc ){
		console.log("amount", amount)
		console.log("account", account)
		console.log("date", date)
		console.log("remark", remark)
		console.log("desc", desc)
		return {
			type: 'J',
			transaction_number: transaction_number,
			person: '',
			name: '',
			date: moment(date, 'YYYY-MM-DD').format('MM/DD/YYYY'),
			post_month: moment(date, 'YYYY-MM-DD').format('MM/YYYY'),
			ref: 'HB',
			remark: remark,
			property_code: property_code,
			amount: amount.toFixed(2),
			account: account,
			accrual: '',
			offset: '',
			book_num: book_num,  // Accrual or Cash,
			desc: desc,
			flag: "0"
		}

	}

	generateCount(){
		return models.ContactLeases.search(this.connection, this.conditions, null, this.company.id, false).then(count => {
			this.result_count = count[0].count;
			return true;

		})
	}

}




var config = require(__dirname + '/../report_layouts/yardi.js');
module.exports = Yardi;
