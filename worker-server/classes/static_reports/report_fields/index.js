const leaseRentChangeFields = require('./lease_rent_changes');
const billingVerificationFields = require('./billing_verification');

// supported dataTypes -- string, date, number, money, datetime
module.exports = {
  fields: {
    "invoice-generation": {
      success:{
        company_id: {
          label: "Company ID",
          dataType: "string",
        },
        company_name: {
          label: "Company Name",
          dataType: "string",
        },
        property_id: {
          label: "Property ID",
          dataType: "string",
        },
        property_name: {
          label: "Property Name",
          dataType: "string",
        },
        contact_id: {
          label: "Contact ID",
          dataType: "string",
        },
        contact_name: {
          label: "Contact Name",
          dataType: "string",
        },
        lease_id: {
          label: "Lease Id",
          dataType: "string",
        },
        bill_day: {
          label: "Bill Day",
          dataType: "string",
        },
        space_number:{
          label: "Space Number",
          dataType: "string",
        },
        date: {
          label: "Date",
          dataType: "date",
        },
        due: {
          label: "Due",
          dataType: "date",
        },
        period_start: {
          label: "Start",
          dataType: "date",
        },
        period_end: {
          label: "End",
          dataType: "date",
        },
        sub_total: {
          label: "Subtotal",
          dataType: "money",
        },
        tax: {
          label: "Tax",
          dataType: "money",
        },
        discounts: {
          label: "Discounts",
          dataType: "money",
        },
        balance: {
          label: "Balance",
          dataType: "money",
        }
      },
      failure:{
        company_id: {
          label: "Company ID",
          dataType: "string",
        },
        company_name: {
          label: "Company Name",
          dataType: "string",
        },
        property_id: {
          label: "Property ID",
          dataType: "string",
        },
        property_name: {
          label: "Property Name",
          dataType: "string",
        },
        contact_id: {
          label: "Contact ID",
          dataType: "string",
        },
        contact_name: {
          label: "Contact Name",
          dataType: "string",
        },
        lease_id: {
          label: "Lease Id",
          dataType: "string",
        },
        bill_day: {
          label: "Bill Day",
          dataType: "string",
        },
        space_number:{
          label: "Space Number",
          dataType: "string",
        },
        message:{
          label: "Message",
          dataType: "string",
        }
      }
    },
    "auto-payments": {
      payment_method_id: {
        label: "Payment Method ID",
        dataType: "string",
      },
      company_id: {
        label: "Company ID",
        dataType: "string",
      },
      company_name: {
        label: "Company Name",
        dataType: "string",
      },
      property_id: {
        label: "Property ID",
        dataType: "string",
      },
      property_name: {
        label: "Property Name",
        dataType: "string",
      },
      contact_id: {
        label: "Contact ID",
        dataType: "string",
      },
      contact_name: {
        label: "Contact Name",
        dataType: "string",
      },
      lease_id: {
        label: "Lease Id",
        dataType: "string",
      },
      unit_number:{
        label: "Space Number",
        dataType: "string",
      },
      invoice_id: {
        label: "Invoice ID",
        dataType: "string",
      },
      inv_number: {
        label: "Invoice Number",
        dataType: "string",
      },
      inv_due: {
        label: "Invoice Due",
        dataType: "date",
      },
      payment_ids: {
        label: "Payment IDs",
        dataType: "string",
      },
      payments_status_desc: {
        label: "Payment Status Desc.",
        dataType: "string",
      },
      company_url: {
        label: "URL",
        dataType: "string",
      } 
    },
    ...leaseRentChangeFields,
    ...billingVerificationFields
  },
}