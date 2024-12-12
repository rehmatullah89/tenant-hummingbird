const moment = require('moment');

const document = {
    makeInvoiceLineTable(payload) {
        const { invoices } = payload;
        let response = {}, contents = [], totalDiscounts = 0, totalSubTotal = 0, totalApplied = 0, totalTax = 0, total = 0;

        for (let i = 0; i < invoices.length; i++) {
            totalApplied += invoices[i].total_payments;
            totalSubTotal += invoices[i].sub_total;
            totalDiscounts += invoices[i].total_discounts;
            totalTax += invoices[i].total_tax;

            for (let j = 0; j < invoices[i].InvoiceLines?.length; j++) {                
                let line = invoices[i].InvoiceLines[j];
                contents.push({
                    item: line.Product.name,
                    // Some templates are inconsistent after panadocs migration, so keeping multiple duedate keys
                    dueDate: line.start_date ? moment(line.start_date).format('MM/DD/YYYY'): '',
                    duedate: line.start_date ? moment(line.start_date).format('MM/DD/YYYY'): '',
                    amount: utils.formatMoney(Math.round((line.subtotal - line.totalDiscounts) * 1e2) / 1e2),
                    description: line.Product.description,
                    qty: line.qty
                });
            }
        }

        total = Math.round((totalSubTotal + totalTax - totalDiscounts - totalApplied) * 1e2) / 1e2;

        response.contents = contents;
    
        response.tax = utils.formatMoney(totalTax);
        response.subtotal = utils.formatMoney(Math.round((totalSubTotal - totalDiscounts) * 1e2) / 1e2);
        response.applied = utils.formatMoney(totalApplied);
        response.appliedpay = utils.formatMoney(totalApplied);
        response.discount = utils.formatMoney(totalDiscounts);
        response.total = utils.formatMoney(total);

        return response;
    },

    async openInvoices(connection, payload) {
        const { lease, required_data_properties } = payload;

        lease.PastDue = [];
        await lease.getOpenInvoices(connection);
        const invoices = [...lease.PastDue];
        
        // If required: we can filter and send only the columns coming from tokens by using required_data_properties
        let table = document.makeInvoiceLineTable({ invoices });
        return table;
    },

    async futureInvoices(connection, payload) {
        const { lease, company } = payload;

        lease.FutureCharges = [];
        await lease.getFutureDelinquency(connection, company.id);
        const invoices = [...lease.FutureCharges];

        let table = document.makeInvoiceLineTable({ invoices });
        return table;
    },

    // For testing
    async allInvoices(connection, payload) { 
        const { lease } = payload;

        lease.Invoices = [];
        await lease.findInvoices(connection);
        const invoices = [...lease.Invoices];

        let table = document.makeInvoiceLineTable({ invoices });
        return table;
    },

    async makeTables(connection, payload) {
        const { tables, lease, company } = payload;
        const { TOKEN_TABLES } = ENUMS;

        let tableFunctions = {
            [TOKEN_TABLES.OPEN_INVOICES]: document.openInvoices,
            [TOKEN_TABLES.FUTURE_CHARGES_WITH_FEE]: document.futureInvoices,
            test: document.allInvoices
        };

        console.log('Tables data: ', JSON.stringify(tables, null, 2));

        const tableTokenValues = {};
        for (let i = 0; i < tables.length; i++) {
            const tableName = tables[i].name;
            if(!tableFunctions[tableName]) {
                console.log(`Missing table function ${tableName}`);
                continue;
            }

            tableTokenValues[tableName] = await tableFunctions[tableName](connection, { lease, required_data_properties: tables[i].row_tokens, company });
        }

        return tableTokenValues;
    }
}

module.exports = document;

const ENUMS = require('./enums');
const utils = require('./utils');
