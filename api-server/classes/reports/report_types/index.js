'use strict';
var normalizedPath = require("path").join(__dirname);

// require("fs").readdirSync(normalizedPath).forEach(file => {
//   console.log(file);
//   module.exports[file.split('.')[0]] = require("./" + file);
// });


//
module.exports = {
  accounts_receivable: require('./accounts_receivable.js'),
  failed_payments: require('./failed_payments.js'),
  insurance: require('./insurance.js'),
  rent_roll: require('./rent_roll.js'),
  merchandise_sales: require('./merchandise_sales.js'),
  overlock: require('./overlock.js'),
  payments: require('./payments.js'),
  invoices_payments: require('./invoices_payments.js'),
  invoices: require('./invoices.js'),
  charges: require('./invoice_lines.js'),
  active_leads: require('./leads.js'),
  active_tenants: require('./tenants.js'),
  walk_through_audit: require('./walk_through.js'),
  sales_tax_payments: require('./sales_tax_payments.js'),
  sales_tax_charges: require('./sales_tax_charges.js'),
  prepaid_rent: require('./prepaid_rent.js'),
  unapplied_payments: require('./unapplied_payments.js'),
  payment_methods: require('./payment_methods.js'),
  move_in: require('./move_in.js'),
  spaces: require('./units.js'),
  rate_change_tenants: require('./rate_change'),
  rate_change_selected_tenants: require('./rate_change_selected_tenants'),
  autopay: require('./autopay.js'),
  auction_list: require('./auction_list.js'),
  delinquency_pauses: require('./delinquency_pauses.js'),
  delinquency: require('./delinquencies.js'),
  delinquency_failed_actions: require('./delinquency_failed_actions.js'),
  // unpaid_charges: require('./unpaid_charges.js'),
  // vacancy_report: require('./vacancy_report.js'),
  tenant_emails: require('./tenant_emails.js'),
  space_details: require('./space_details'), 
  cash_payments: require('./cash_payments.js'),
  credit_card_payments: require('./credit_card_payments.js'),
  ach_payments: require('./ach_payments.js'),
  void_payments: require('./void_payments.js'),
  refunds: require('./refunds.js'),
  insurance_status: require('./insurance_status'),
  discounts_and_promotions: require('./discounts_and_promotions'),
  active_tenant_directory: require('./active_tenant_directory'),
  completed_tasks: require('./completed_tasks'),
  all_tasks: require('./all_tasks'),
  incomplete_tasks: require('./incomplete_tasks'),
  move_out: require('./move_out'),
  move_out_task: require('./move_out_task'),
  tenant_billing: require('./tenant_billing'),
  void_invoices: require('./void_invoices'),
  bad_debt: require('./bad_debt'),
  lead_activity: require('./lead_activity'),
  pending_move_in_activity: require('./pending_move_in_activity'), 
  rentals: require('./rentals'),
  accounting_exports: require('./accounting_exports'),
  coverage_activity: require('./coverage_activity'),
  additional_contacts: require('./additional_contacts'),
  cleaning_deposit_status: require('./cleaning_deposit_status'),
  auction_details: require('./auction_details'),
  property_rate_management: require('./property_rate_management'),
  rent_change_deployment_month: require('./rent_change_deployment_month.js'),
  review_rent_changes: require('./review_rent_changes'),
  tenant_rent_management: require('./tenant_rent_management'),
  space_group_spaces: require('./space_group_spaces'),
  property_rent_management: require('./property_rent_management'),
  inter_property_payment: require('./inter_property_payment'),
  reservations: require('./reserved_leads.js'),
  rent_roll_with_all_spaces: require('./rent_roll_with_all_spaces')
};


