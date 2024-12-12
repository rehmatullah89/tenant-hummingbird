
const applicationFields = require('./applications');
const auctionFields = require('./lease_auction');
const delinquencyFields = require('./delinquencies');
const delinquencyPauseFields = require('./delinquencies_pauses');
const delinquencyActionFields = require('./delinquencies_actions');
const invoiceFields = require('./invoice');
const invoiceLineFields = require('./invoice_lines');
const invoicesPaymentsFields = require('./invoices_payments');
const leadFields = require('./lead');
const leaseFields = require('./lease');
const maintenanceFields = require('./maintenance');
const paymentFields = require('./payments');
const paymentMethodFields = require('./payment_methods');
const productFields = require('./products');
const propertyFields = require('./property');
const rentChangeFields = require('./rent_change');
const reservationFields = require('./reservations');
const servicesFields = require('./services');
// const summaryFields = require('./summary');
const unitFields = require('./unit');
const tenantFields = require('./tenant');
const taskFields = require('./tasks');
const triggerFields = require('./triggers');
const refundFields = require('./refunds');
const todoFields = require('./todos');
const commonFields = require('./common');
const promotionFields = require('./promotion');
const invoiceLineAllocationFields = require('./invoice_lines_allocation');
const accountExportFields =  require('./accounting_exports');
const rentChangeDeploymentMonth = require('./rent_change_deployment_month');
const reviewRentChanges = require('./review_rent_changes');
const tenantRentManagement = require('./tenant_rent_management');
const RevenueManagementFields = require('./property_revenue_management');
const additionalContactsFields =  require('./additional_contact');

module.exports = {
  fields: {
    ...applicationFields,
    ...auctionFields, 
    ...delinquencyFields,
    ...delinquencyActionFields,
    ...delinquencyPauseFields,
    ...invoiceFields,
    ...invoiceLineFields,
    ...invoicesPaymentsFields,
    ...leadFields,
    ...leaseFields,
    ...maintenanceFields,
    ...paymentFields,
    ...paymentMethodFields,
    ...productFields,
    ...propertyFields,
    ...rentChangeFields,
    ...reservationFields,
    ...servicesFields,
    // ...summaryFields,
    ...unitFields,
    ...tenantFields,
    ...taskFields,
    ...triggerFields,
    ...refundFields,
    ...todoFields,
    ...commonFields,
    ...promotionFields,
    ...invoiceLineAllocationFields,
    ...accountExportFields,
    ...rentChangeDeploymentMonth,
    ...reviewRentChanges,
    ...tenantRentManagement,
    ...RevenueManagementFields,
    ...additionalContactsFields
  },
  load: (namespaced_obj, incl, excl) =>{
    let arr =[];
    const fields = Object.keys(namespaced_obj);
    for (const field of fields) {
      if(incl && incl.indexOf(field) < 0){
        continue;
      }
      if(excl && excl.indexOf(field) >= 0){
        continue;
      }

      arr.push(namespaced_obj[field]);
    }
    return arr;
  }
};
