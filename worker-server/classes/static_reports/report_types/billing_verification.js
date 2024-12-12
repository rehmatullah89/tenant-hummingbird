const BaseStaticReport = require(__dirname + '/base_static_report.js');
const utils = require("../report_utils/utils.js");
var e = require('../../../modules/error_handler.js');
const models = require("../../../models/index.js");


class BillingVerification extends BaseStaticReport {
    constructor(configuration) {
        super(configuration.data, configuration.report_name, configuration.template);
        this.date = configuration.date;
        this.end_date = configuration.end_date;
        this.company_id = configuration.company_id;
        this.connection = configuration.connection;
        this.property_id = configuration.property_id;
        this.name = 'Billing Verification';
        this.template = configuration.template;
    }

    async getData(){
        let data = [];
        let payload = {};

        if(this.template == 'missing_invoices'){
            payload = {
                company_id: this.company_id,
                property_id: this.property_id,
                start_date: this.date,
                end_date: this.end_date || this.date
            };
            data = await models.Invoice.findMissingInvoicesForDateRange(this.connection, payload);
        }else if (this.template == 'missing_discounts'){
            payload = {
                company_id: this.company_id,
                property_id: this.property_id,
                start_date: this.date,
                end_date: this.end_date || this.date
            };
            data = await models.Invoice.findMissingDiscountsForDateRange(this.connection, payload);
        }else if (this.template == 'duplicate_invoices'){
            payload = {
                company_id: this.company_id,
                property_id: this.property_id,
                start_date: this.date,
                end_date: this.end_date || this.date
            };
            data = await models.Invoice.findDuplicateInvoicesForBillingPeriod(this.connection, payload);
        }else if (this.template == 'duplicate_invoicelines'){
            payload = {
                company_id: this.company_id,
                property_id: this.property_id,
                start_date: this.date,
                end_date: this.end_date || this.date
            };
            data = await models.Invoice.findInvoicesWithDuplicateLines(this.connection, payload);
        }else if (this.template == 'missing_tax'){
            payload = {
                company_id: this.company_id,
                property_id: this.property_id,
                start_date: this.date,
                end_date: this.end_date || this.date
            };
            data = await models.Invoice.findInvoiceWithMissingTax(this.connection, payload);
        }else if (this.template == 'voided_and_nonactive_invoice'){
            payload = {
                company_id: this.company_id,
                property_id: this.property_id,
                period_start_date: this.date,
            };
            data = await models.Invoice.voidedAndNonActiveInvoicePresent(this.connection, payload);
        }else if (this.template == 'autopay_leases'){
            payload = {
                company_id: this.company_id,
                property_id: this.property_id,
                date: this.date,
            };
            data = await models.Invoice.autoPayExpectedLeasesAndInvoices(this.connection, payload);
        }else if (this.template == 'extra_payments'){
            payload = {
                company_id: this.company_id,
                property_id: this.property_id,
                date: this.date,
            };
            data = await models.Invoice.extraInvoicesPaid(this.connection, payload);
        }else if (this.template == 'multiple_services'){
            payload = {
                company_id: this.company_id,
                property_id: this.property_id,
                date: this.date,
            };
            data = await models.Invoice.multipleActiveServicesForLeases(this.connection, payload);
        }else{
            e.th(500, "Unknown template...");
        }
        
        this.data = utils.formatData(data, this.getFields(), { set_header: true, set_total: true });
    }
}

module.exports = BillingVerification