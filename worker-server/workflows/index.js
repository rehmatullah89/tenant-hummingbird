'use strict';

module.exports = {
  rate_change: require('./rate_change.js'),
  auction: require('./auction.js'),
  auto_reconcile: require('./auto_reconcile.js'),
  concurrency_test: require('./concurrency_test.js'),
  transaction: require('./transaction.js'),
  invoice: require('./invoice.js'),
  payment: require('./payment.js'),
  trigger: require('./trigger.js'),
  close_of_day: require('./close_of_day.js'),
  spaces: require('./space-management/spaces.js'),
  accounting_exports: require('./accounting_exports.js'),
  generate_export_document: require('./generate_export_document.js'),
  send_export_document: require('./send_export_document.js'),
  leads: require('./lead.js'),
  accounting: require('./accounting.js'),
  property_progress: require('./property_progress.js'),
  space_amenities: require('./space-management/space_amenities.js'),
  property_amenities: require('./space-management/property_amenities.js'),
  rate_management: require('./rate-management/space_score.js'),
  document: require('./document.js'),
  share_reports: require('./share_reports.js'),
  send_reports: require('./send_reports.js'),
  generate_reports: require('./generate_reports.js'),
  tenant_payment_statement: require('./tenant_payment_statement.js'),
  tenant_payments: require('./tenant_payments.js'),
  payment_cycle: require('./payment_cycle.js'),
  rate_management_cron_routine: require('./property_rate_management.js'),
  tenant_payments_payouts: require('./tenant_payments_payouts.js'),
  promotion: require('./promotion.js'),
  rent_management: require('./rent_management.js'),
  upload_rent_changes: require('./rent-management/upload_rent_change.js'),
  execute_scripts: require('./execute_scripts.js'),
  reversal: require('./reversal.js'),
};