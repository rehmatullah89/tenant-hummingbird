var moment = require("moment");
var Property = require(__dirname + "/../classes/property.js");
const TenantPaymnetsPayoutRoutines = require(__dirname +
    "/../routines/tenant_payments_payouts_routines.js");
var models = require(__dirname + "/../models");

const services = {
    async fetchPayoutDelayDashboardMetricsData(cid, data) {
        try {
            const { connection, filters, admin } = data;
            const { metric, property_id, company_id, start_date, end_date } = filters;
            let response = {};

            let paramsData = {
                cid,
                company_id,
                property_id,
                date: start_date,
                endDate: end_date,
                admin,
            };

            if (metric.toLowerCase() === 'payouts' ) {
               response = await this.fetchPayoutDelayData(connection, paramsData);
            }
            return response;
        } catch (err) {
            console.log(err);
            console.log(err.stack);
            throw err;
        }
    },

    setTimeFrames(filters) {
        if (!filters.timeFrame) return;
        var tf = filters.timeFrame;
        var timeFrame = {
            start: null,
            end: null,
        };
        switch (tf.toLowerCase()) {
            case "today":
                timeFrame.start = moment().startOf("day");
                timeFrame.end = moment().endOf("day");
                break;
            case "yesterday":
                timeFrame.start = moment().subtract(1, "day").startOf("day");
                timeFrame.end = moment().subtract(1, "day").endOf("day");
                break;
            case "last 7 days":
                timeFrame.start = moment().subtract(6, "day").startOf("day");
                timeFrame.end = moment().endOf("day");
                break;
            case "last 30 days":
                timeFrame.start = moment().subtract(29, "day").startOf("day");
                timeFrame.end = moment().endOf("day");
                break;
            case "last 90 days":
                timeFrame.start = moment().subtract(89, "day").startOf("day");
                timeFrame.end = moment().endOf("day");
                break;
            case "month to date":
                timeFrame.start = moment().startOf("month");
                timeFrame.end = moment().endOf("day");
                break;
            case "year to date":
                timeFrame.start = moment().startOf("year");
                timeFrame.end = moment().endOf("day");
                break;
            case "custom range":
                timeFrame.start = filters.start_date
                    ? moment(filters.start_date).startOf("day")
                    : null;
                timeFrame.end = filters.end_date
                    ? moment(filters.end_date).endOf("day")
                    : null;
                break;
            case "all time":
                break;
        }
        return timeFrame;
    },

    async fetchPayoutDelayData(connection, payload) {

        let payout_delay_data = await TenantPaymnetsPayoutRoutines.getDelayedPayout(
            connection,
            payload
        );

        return payout_delay_data;
    },

    async downloadPayoutExcel(data) {
        let static_report = new StaticReport({
            type: "dashboard-invoices-summary",
            format: "xlsx",
            name: "Invoice Summary",
        });

        data = this.translateDataForPayoutExcel(data);

        static_report.setUpReport();
        await static_report.generate(data);
        return static_report.reportClass.path;

    },

    translateDataForPayoutExcel(data) {
        let result = [];

        data.forEach(prop_data => {
            prop_data.invoices_data.invoices.forEach(inv => {
                result.push({
                    company_name: prop_data.company_name, property_name: prop_data.property_name, contact_name: inv.contact_name, lease_id: inv.lease_id,
                    space_number: inv?.Lease?.Unit?.number, date: inv.date, due: inv.due, sub_total: inv.sub_total, tax: inv.total_tax,
                    discounts: inv.total_discounts, balance: inv.balance, payments: inv.total_payments, success: 1
                })
            })
        });

        data.forEach(prop_data => {
            prop_data.invoices_data.failed_invoices.forEach(inv => {
                result.push({
                    company_name: prop_data.company_name, property_name: prop_data.property_name, contact_name: inv.contact_name, lease_id: inv.lease_id,
                    date: inv.date, due: inv.due, sub_total: inv.sub_total, tax: inv.total_tax,
                    discounts: inv.total_discounts, balance: inv.balance, payments: inv.total_payments, success: 0,
                    space_number: inv.unit_number
                })
            })
        });

        return result;
    }

};
module.exports = services;

var StaticReport = require("../classes/static_report");
