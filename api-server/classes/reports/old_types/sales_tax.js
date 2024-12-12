'use strict';
var BaseReport = require(__dirname + '/base_report.js');
var Promise = require('bluebird');
var models = require(__dirname + '/../../../models');

class SalesTax extends BaseReport{
	constructor(connection, company, filters, format) {

		super(connection, company, filters, format);
		this.config = config;
	}

	generateData(){

		this.setConditions();
		if(this.format === 'web'){
			this.setLimit();
		}
		return models.ReportQueries.salesTax(this.connection, this.conditions, this.searchParams, this.company.id, false).map(row => {
			var pre_tax_discounts = 0;
			var subtotal = Math.round(row.qty * row.cost * 1e2) / 1e2;
			return models.Discount.findByDiscountLineByInvoiceLineId(this.connection, row.id).map(dl => {
				var discount_amt = 0;
				switch(dl.type){
					case 'percent':
						discount_amt = subtotal * dl.value / 1e2;
						break;
					case 'dollar':
						discount_amt = dl.amount;
						break;
				}


				discount_amt = (discount_amt > subtotal) ? subtotal : discount_amt;
				subtotal -= discount_amt;
				if(dl.pretax){
					pre_tax_discounts += discount_amt;
				}
				return true;

			}).then(() => {
				var afterDiscounts = Math.round(subtotal * 1e2) / 1e2;
				return {
					address: row.address,
					date: row.date,
					unit_number: row.unit_number,
					product_name: row.product_name,
					invoice_number: row.invoice_number,
					subtotal: Math.round(row.qty * row.cost * 1e2) / 1e2,
					discounts: ((row.qty * row.cost - afterDiscounts) * 1e2) / 1e2 ,
					taxable_amount: Math.round((row.qty * row.cost - pre_tax_discounts) * 1e2) / 1e2,
					taxrate: row.taxrate,
					total_tax: Math.round((row.qty * row.cost - pre_tax_discounts) * row.taxrate) / 1e2,
				}
			})

		}).then(data => {

			this.data = data;
			this.data.push({
				address:  "TOTAL",
				date: null,
				unit_number: "",
				product_name: "",
				invoice_number: "",
				subtotal: "",
				discounts: "",
				taxable_amount: "",
				taxrate: "",
				total_tax: Math.round(data.reduce((a,b) => a + b.total_tax, 0) * 1e2)/1e2,
			})

			return true;
		})

	}
	generateCount(){
		return models.Invoice.findBilledProductsByCompanyId(this.connection, this.conditions, null, this.company.id, true).then(count => {
			this.result_count = count[0].count;
			return true;

		})
	}
	setConditions(){
		this.conditions.product_id = this.filters.search.product_id  || null;
		this.conditions.property_id = this.filters.search.property_id  ||  null;
	}
}




var config = require(__dirname + '/../report_layouts/sales_tax.js');
module.exports = SalesTax;