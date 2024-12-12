
'use-strict';
const BaseReport = require(__dirname + '/base_report.js');
const reportQueries = require(__dirname + '/../report_queries');
const Fields = require('../report_fields/index').fields;
const invoiceLineId = ' il.id ';
const invoiceId = ' il.invoice_id ';
const lease_id = ` i.lease_id `;
const tenantId = ` i.contact_id `;
const unitId = ` l.unit_id `;
const propertyId = ` i.property_id `;
class CoverageActivityReport extends BaseReport
{
    constructor(connection, company, filters, format, name, properties = [])
    {
        super(connection, company, filters, format, name, properties);
        this.sql_fragments = Object.assign(
            {},
            new reportQueries.InvoiceLines(
            {
                id: invoiceLineId
            }, this.report_dates.end)
            .queries,
            new reportQueries.Invoice(
            {
                id: invoiceId
            }, this.report_dates.end)
            .queries,
            new reportQueries.Lease(
            {
                id: lease_id
            }, this.report_dates.end, this.report_dates.start)
            .queries,
            new reportQueries.Unit(
            {
                id: unitId
            }, this.report_dates.end)
            .queries,
            new reportQueries.Property(
            {
                id: propertyId
            }, this.report_dates.end)
            .queries,
            new reportQueries.Tenant(
            {
                id: tenantId
            }, this.report_dates.end)
            .queries
        );
        this.config.name = 'Coverage Activity';
        this.config.fileName = 'coverage_activity';
        this.config.column_structure = [].concat(
            Object.values(Fields.invoice_lines),
            Object.values(Fields.invoice_line_summary),
            Object.values(Fields.invoice),
            Object.values(Fields.invoice_summary),
            Object.values(Fields.lease),
            Object.values(Fields.lease_summary),
            Object.values(Fields.property),
            Object.values(Fields.unit),
            Object.values(Fields.tenant),
            Object.values(Fields.tenant_summary)
        );
        this.config.filter_structure = [
        {
            label: "Report Period",
            key: "report_period",
            input: "timeframe"
        }];
        this.config.filters.search['report_period'] = {
            days: 0,
            end_date: "",
            label: "This Month",
            period: "",
            relation: "",
            start_date: "",
        }
        this.config.filters.sort = {
            field: '( select lease_id from invoices where id = il.invoice_id )',
            dir: 'DESC'
        };
        this.config.default_columns = [
            'property_name',
            'tenant_name',
            'unit_number',
            'invoice_line_product',
            'invoice_line_insurance_coverage',
            'invoice_line_insurance_premium',
            'invoice_line_is_cancelled_coverage',
            'invoice_line_is_new_coverage',
            'invoice_line_is_paid',
            'invoice_line_amount_applied',
            'invoice_line_credit_amount',
            'invoice_line_refund_amount',
            'invoice_line_due_amount',
            'invoice_line_paid_in_full_date',
            'invoice_line_start_date',
            'invoice_line_end_date',
            'invoice_line_service_period_start',
            'invoice_line_service_period_end'
        ]

        this.base_table = 'il'
        this.tables = {
            invoice_lines: 'il',
            invoices: 'i',
            products: 'p',
            leases: 'l',
            services: 's'
        }

        this.sql_tables += `
            invoice_lines il
                inner join products p on il.product_id = p.id
                inner join services s on il.service_id = s.id
                inner join invoices i on il.invoice_id = i.id
                left join leases l on i.lease_id = l.id
        `;
        this.sql_conditions = ` WHERE p.default_type = "insurance" and s.status = true and i.status = 1`;
       
        if (properties.length) {
            this.sql_conditions += ' and i.property_id in (' + properties.join(', ') + ")";
        }
        this.property_id = 'i.property_id';
    }
    setFilterConditions(connection, conditions, structure, columns, sql_fragments)
    {
        if (conditions.report_period)
        {
            this.sql_conditions += this.setTimeframes(conditions.report_period,
                " (il.start_date) ");
        }
    }
};
module.exports = CoverageActivityReport;