
module.exports = {
    "invoice-generation": require("./invoice_generation"),
    "auto-payments": require("./auto_payments"),
    "lease_rent_changes": require('./lease_rent_changes'),
    "missing_invoices": require('./billing_verification'),
    "missing_discounts": require('./billing_verification'),
    "missing_tax": require('./billing_verification'),
    "duplicate_invoices": require('./billing_verification'),
    "duplicate_invoicelines": require('./billing_verification'),
    "voided_and_nonactive_invoice": require('./billing_verification'),
    "multiple_services": require('./billing_verification'),
    "autopay_leases": require('./billing_verification'),
    "extra_payments": require('./billing_verification')
}
