const managementSummary =  require('./management_summary.js');
const storeKPI =  require('./store_kpi.js');
const managementHistory =  require('./management_history.js'); 

module.exports = {
  fields: {
    "account-receivable-aging": {
      unit_number: {
        label: "Space#",
        dataType: "string",
      },
      name: {
        label: "Tenant",
        dataType: "string",
      },
      paid_through_date: {
        label: "PTD",
        dataType: "date",
      },
      rent: {
        label: "Tenant Rent",
        dataType: "integer",
      },
      balance_10: {
        label: "0-10",
        dataType: "integer",
      },
      balance_30: {
        label: "11-30",
        dataType: "integer",
      },
      balance_60: {
        label: "31-60",
        dataType: "integer",
      },
      balance_90: {
        label: "61-90",
        dataType: "integer",
      },
      balance_120: {
        label: "91-120",
        dataType: "integer",
      },
      balance_180: {
        label: "121-180",
        dataType: "integer",
      },
      balance_360: {
        label: "181-360",
        dataType: "integer",
      },
      balance_360plus: {
        label: ">360+",
        dataType: "integer",
      },
      balance_total: {
        label: "Total",
        dataType: "integer",
      },
      move_out_date: {
        label: "Move Out Date",
        dataType: "date",
      },
    },
    "delinquencies": {
      unit_number: {
        label: "Space#",
        dataType: "string",
      },
      name: {
        label: "Tenant",
        dataType: "string",
      },
      paid_through_date: {
        label: "PTD",
        dataType: "date",
      },
      rent: {
        label: "Tenant Rent",
        dataType: "integer",
      },
      balance_10: {
        label: "0-10",
        dataType: "integer",
      },
      balance_30: {
        label: "11-30",
        dataType: "integer",
      },
      balance_60: {
        label: "31-60",
        dataType: "integer",
      },
      balance_90: {
        label: "61-90",
        dataType: "integer",
      },
      balance_120: {
        label: "91-120",
        dataType: "integer",
      },
      balance_180: {
        label: "121-180",
        dataType: "integer",
      },
      balance_360: {
        label: "181-360",
        dataType: "integer",
      },
      balance_360plus: {
        label: ">360+",
        dataType: "integer",
      },
      balance_total: {
        label: "Total",
        dataType: "integer",
      },
      move_out_date: {
        label: "Move Out Date",
        dataType: "date",
      },
    },
    "gate-access": {
      unit_number: {
        label: "Space#",
        dataType: "string",
      },
      // contact_id: {
      //   label: "Contact Id",
      //   dataType: "string",
      // },
      name: {
        label: "Tenant",
        dataType: "string",
      },
      status: {
        label: "Status",
        dataType: "string",
      },
      pin: {
        label: "Gate Code",
        dataType: "number",
      },
      days_late: {
        label: "Days Late",
        dataType: "integer",
      },
      balance: {
        label: "Balance",
        dataType: "integer",
      },
      last_updated: {
        label: "Last Updated",
        dataType: "datetime",
      },

    },
    "transfer": {
      tenant_name: {
        label: "Tenant Name",
        dataType: "string",
      },
      transfer_date: {
        label: "Date",
        dataType: "date",
        super_header: "Transfer Out",
      },
      out_unit_number: {
        label: "Space#",
        dataType: "string",
        super_header: "Transfer Out",
      },
      out_unit_size: {
        label: "Size",
        dataType: "string",
        super_header: "Transfer Out",
      },
      out_unit_category: {
        label: "Category",
        dataType: "string",
        super_header: "Transfer Out",
      },
      out_rent: {
        label: "Rent",
        dataType: "integer",
        super_header: "Transfer Out",
      },
      out_balance: {
        label: "Balance",
        dataType: "integer",
        super_header: "Transfer Out",
      },
      in_unit_number: {
        label: "Space#",
        dataType: "string",
        super_header: "Transfer In",
      },
      in_unit_size: {
        label: "Size",
        dataType: "string",
        super_header: "Transfer In",
      },
      in_unit_category: {
        label: "Category",
        dataType: "string",
        super_header: "Transfer In",
      },
      in_rent: {
        label: "Rent",
        dataType: "integer",
        super_header: "Transfer In",
      },
      in_balance: {
        label: "Balance",
        dataType: "integer",
        super_header: "Transfer In",
      },
      transfer_balance: {
        label: "Transfer Balance",
        dataType: "integer",
        super_header: "Details",
      },
      out_total_days: {
        label: "Days In Space",
        dataType: "integer",
        super_header: "Details",
      },
      user_name: {
        label: "Employee",
        dataType: "string",
        super_header: "Details",
      },
      // notes: {
      //   label: "Notes",
      //   dataType: "string",
      //   super_header: "Details",
      // },
      reason: {
        label: "Reason",
        dataType: "string",
        super_header: "Details",
      }
    },
    "rental-activity": {
      move_in: {
        move_in_date: {
          label: "Date",
          dataType: "date",
        },
        unit_number: {
          label: "Space #",
          dataType: "string",
        },
        name: {
          label: "Tenant",
          dataType: "string",
        },
        company_name: {
          label: "Company Name",
          dataType: "string",
        },
        unit_size: {
          label: "Size",
          dataType: "string",
        },
        category_name: {
          label: "Category",
          dataType: "string",
        },
        unit_area: {
          label: "Area",
          dataType: "integer",
        },
        space_rate: {
          label: "Space Rate",
          dataType: "integer",
        },
        insurance_premium: {
          label: "Insurance Premium",
          dataType: "integer",
        },
        promotion_amount: {
          label: "Promotion Amount",
          dataType: "integer",
        },
        promotion_names: {
          label: "Promotion Name",
          dataType: "string",
        },
        rent: {
          label: "Rent Rate",
          dataType: "integer",
        },
        variance: {
          label: "Variance",
          dataType: "integer",
        },
        days_vacant: {
          label: "Days Vacant",
          dataType: "integer",
        }
      },
      move_out: {
        move_out_date: {
          label: "Date",
          dataType: "date",
        },
        unit_number: {
          label: "Space #",
          dataType: "string",
        },
        name: {
          label: "Tenant",
          dataType: "string",
        },
        company_name: {
          label: "Company Name",
          dataType: "string",
        },
        unit_size: {
          label: "Size",
          dataType: "string",
        },
        category_name: {
          label: "Category",
          dataType: "string",
        },
        unit_area: {
          label: "Area",
          dataType: "integer",
        },
        space_rate: {
          label: "Space Rate",
          dataType: "integer",
        },
        insurance_premium: {
          label: "Insurance Premium",
          dataType: "integer",
        },
        rent: {
          label: "Rent Rate",
          dataType: "integer",
        },
        variance: {
          label: "Variance",
          dataType: "integer",
        },
        days_in_space: {
          label: "Days In Space",
          dataType: "integer",
        },
        auction: {
          label: "Auction",
          dataType: "string",
        }
      }
    },
    "space-activity": {
      activity_date: {
        label: "Activity Date",
        dataType: "date",
      },
      activity: {
        label: "Activity",
        dataType: "string",
      },
      space_number: {
        label: "Space Number",
        dataType: "string",
      },
      tenant_name: {
        label: "Tenant Name",
        dataType: "string",
      },
      move_in_date: {
        label: "Move In Date",
        dataType: "date",
      },
      move_out_date: {
        label: "Move Out Date",
        dataType: "date",
      },
      space_price: {
        label: "Space Price",
        dataType: "integer",
      },
      tenant_rent: {
        label: "Tenant Rent",
        dataType: "integer",
      },
      promotion_names: {
        label: "Promotion Name",
        dataType: "string",
      },
      discount_names: {
        label: "Discount Name",
        dataType: "string",
      },
      last_rent_change: {
        label: "Last Rent Change",
        dataType: "date",
      },
      days_rented: {
        label: "Days Rented",
        dataType: "integer",
      },
      //lease_modified: '2021-10-25 10:04:07',
    },
    "payments-by-product-type": {
      date: {
        label: "Date",
        dataType: "date",
      },
      payment: {
        label: "Payment",
        dataType: "integer",
      },
      refund: {
        label: "Refund",
        dataType: "integer",
      },
      rent: {
        label: "Rent",
        dataType: "integer",
      },
      fees: {
        label: "Fees",
        dataType: "integer",
      },
      insurance: {
        label: "Protect/Insurance",
        dataType: "integer",
      },
      merchandise: {
        label: "Merchandise",
        dataType: "integer",
      },
      tax: {
        label: "Tax",
        dataType: "integer",
      },
      auction: {
        label: "Auction",
        dataType: "integer",
      },
      others: {
        label: "Others",
        dataType: "integer",
      },
      deposits: {
        label: "Deposits",
        dataType: "integer",
      },
      totals: {
        label: "Totals",
        dataType: "integer"
      },
    },
    "cash-audit": {
      date: {
        label: "Date",
        dataType: "date",
      },
      cash_payment: {
        label: "Cash",
        dataType: "integer",
        super_header: "Payments",
      },
      check_payment: {
        label: "Check",
        dataType: "integer",
        super_header: "Payments",
      },
      giftcard_payment: {
        label: "Gift Card",
        dataType: "integer",
        super_header: "Payments",
      },
      ach_payment: {
        label: "ACH",
        dataType: "integer",
        super_header: "Payments",
      },
      card_payment: {
        label: "C.C./Debit",
        dataType: "integer",
        super_header: "Payments",
      },
      payment: {
        label: "Payments",
        dataType: "integer",
        super_header: "Payments",
      },
      pastdue_rent: {
        label: "Past Due Rent",
        dataType: "integer",
        super_header: "Product Types",
      },
      current_rent: {
        label: "Current Rent",
        dataType: "integer",
        super_header: "Product Types",
      },
      prepaid_rent: {
        label: "Prepaid Rent",
        dataType: "integer",
        super_header: "Product Types",
      },
      admin_fee: {
        label: "Admin Fee",
        dataType: "integer",
        super_header: "Product Types",
      },
      late_fee: {
        label: "Late Fees",
        dataType: "integer",
        super_header: "Product Types",
      },
      other_fee: {
        label: "Other Fees",
        dataType: "integer",
        super_header: "Product Types",
      },
      insurance: {
        label: "Protect/Insurance",
        dataType: "integer",
        super_header: "Product Types",
      },
      merchandise: {
        label: "Merchandise",
        dataType: "integer",
        super_header: "Product Types",
      },
      tax: {
        label: "Tax",
        dataType: "integer",
        super_header: "Product Types",
      },
      auction: {
        label: "Auction",
        dataType: "integer",
        super_header: "Product Types",
      },
      deposits: {
        label: "Deposits",
        dataType: "integer",
        super_header: "Product Types",
      },
      others: {
        label: "Others",
        dataType: "integer",
        super_header: "Product Types",
      },
      totals: {
        label: "Total",
        dataType: "integer",
        super_header: "Product Types",
      },
      refund: {
        label: "Voids/Refund",
        dataType: "integer",
      },
      nsf_refund: {
        label: "NSF Reversals",
        dataType: "integer",
      },
    },
    "applied-credits": {
      name: {
        label: 'Tenant Name',
        dataType: 'string'
      },
      invoice_date: {
        label: 'Date',
        dataType: 'date'
      },
      space_number: {
        label: 'Space #',
        dataType: 'string'
      },
      invoice_number: {
        label: 'Invoice Number',
        dataType: 'string'
      },
      amount: {
        label: 'Amount',
        dataType: 'integer'
      },
      notes: {
        label: 'Notes',
        dataType: 'string'
      }
    },
    "write-offs": {
      name: {
        label: 'Tenant Name',
        dataType: 'string'
      },
      invoice_date: {
        label: 'Date',
        dataType: 'date'
      },
      space_number: {
        label: 'Space #',
        dataType: 'string'
      },
      invoice_number: {
        label: 'Invoice Number',
        dataType: 'string'
      },
      amount: {
        label: 'Amount',
        dataType: 'integer'
      }
    },
    "daily-deposits": {
      payment_deposits: {
        summary: {
          label: "Summary",
          dataType: "string",
        },
        cash: {
          label: "Cash",
          dataType: "integer",
          color: "efefef"
        },
        check: {
          label: "Check",
          dataType: "integer",
          color: "efefef"
        },
        giftcard: {
          label: "Gift Card",
          dataType: "integer",
          color: "efefef"
        },
        physical: {
          label: "Physical Total",
          dataType: "integer",
          color: "efefef"
        },
        ach: {
          label: "ACH",
          dataType: "integer"
        },
        card: {
          label: "Card",
          dataType: "integer"
        },
        electronic: {
          label: "Electronic Total",
          dataType: "integer"
        },
        total: {
          label: " Grand Total",
          dataType: "integer",
        }
      },
      card_deposits: {
        summary: {
          label: "Summary",
          dataType: "string",
        },
        visa: {
          label: "Visa",
          dataType: "integer",
          color: "efefef"
        },
        mastercard: {
          label: "Mastercard",
          dataType: "integer",
          color: "efefef"
        },
        discover: {
          label: "Discover",
          dataType: "integer",
          color: "efefef"
        },
        amex: {
          label: "AMEX",
          dataType: "integer",
          color: "efefef"
        },
        total: {
          label: "Total",
          dataType: "integer",
        },

      },
      receipts: {
        tenant: {
          label: "Tenant",
          dataType: "string",
        },
        space_nos: {
          label: "Space #",
          dataType: "string"
        },
        amount: {
          label: "Amount",
          dataType: "integer"
        },
        payment_method: {
          label: "Payment Method",
          dataType: "string"
        },
        payment_details: {
          label: "Payment Details",
          dataType: "string"
        }
      },
      refund: {
        tenant: {
          label: "Tenant",
          dataType: "string"
        },
        // space_no: {
        //     label: "Tenant",
        //     dataType: "string"
        // },
        amount: {
          label: "Amount",
          dataType: "integer"
        },
        payment_method: {
          label: "Payment Method",
          dataType: "string"
        },
        payment_details: {
          label: "Payment Details",
          dataType: "string"
        }
      },
      payments_collected: {
        tenant: {
          label: "Tenant",
          dataType: "string",
        },
        space_nos: {
          label: "Space #",
          dataType: "string"
        },
        amount: {
          label: "Amount",
          dataType: "integer"
        },
        payment_method: {
          label: "Payment Method",
          dataType: "string"
        },
        payment_details: {
          label: "Payment Details",
          dataType: "string"
        },
        property_applied: {
          label: "Property Applied",
          dataType: "string"
        }
      },
      payments_received: {
        tenant: {
          label: "Tenant",
          dataType: "string",
        },
        space_nos: {
          label: "Space #",
          dataType: "string"
        },
        amount: {
          label: "Amount",
          dataType: "integer"
        },
        payment_method: {
          label: "Payment Method",
          dataType: "string"
        },
        payment_details: {
          label: "Payment Details",
          dataType: "string"
        },
        property_collected: {
          label: "Property Collected",
          dataType: "string"
        }
      }
    },
    "financial-summary": {
      gl_code: {
        label: 'GL Account',
        dataType: 'string'
      },
      product_name: {
        label: 'Product',
        dataType: 'string'
      },
      discount: {
        label: 'Discount',
        dataType: 'integer',
        super_header: "Charges"
      },
      charge: {
        label: 'Charge',
        dataType: 'integer',
        super_header: "Charges"
      },
      tax_charge: {
        label: 'Tax',
        dataType: 'integer',
        super_header: "Charges"
      },
      total_charge: {
        label: 'Total',
        dataType: 'integer',
        super_header: "Charges"
      },
      payment: {
        label: 'Payment',
        dataType: 'integer',
        super_header: "Payments"
      },
      payment_tax: {
        label: 'Tax',
        dataType: 'integer',
        super_header: "Payments"
      },
      total_payment: {
        label: 'Total',
        dataType: 'integer',
        super_header: "Payments"
      },
      credit: {
        label: 'Credit',
        dataType: 'integer',
        super_header: "Credits"
      },
      credit_tax: {
        label: 'Tax',
        dataType: 'integer',
        super_header: "Credits"
      },
      total_credit: {
        label: 'Total',
        dataType: 'integer',
        super_header: "Credits"
      },
    },
    "payment-processing": {
      transactiondateproperty: {
        label: 'Transaction Date (Property)',
        dataType: 'datetimeiso'
      },
      transactiondateutc: {
        label: 'Transaction Date (UTC)',
        dataType: 'datetimeiso'
      },
      transactiondatepsp: {
        label: 'Transaction Date (PSP)',
        dataType: 'datetimeiso'
      },
      hummingbirdtransactionid: {
        label: 'Hummingbird Transaction ID',
        dataType: 'string'
      },
      psptransactionid: {
        label: 'PSP Transaction ID',
        dataType: 'string'
      },
      psp: {
        label: 'PSP',
        dataType: 'string'
      },
      amount: {
        label: 'Amount',
        dataType: 'float'
      },
      currency: {
        label: 'Currency',
        dataType: 'string'
      },
      transactiontype: {
        label: 'Transaction Type',
        dataType: 'string'
      },
      paymentmethod: {
        label: 'Payment Method',
        dataType: 'string'
      },
      paymentsource: {
        label: 'Payment Origin',
        dataType: 'string'
      },
      tenantID: {
        label: 'Tenant ID',
        dataType: 'string'
      },
      tenantName: {
        label: 'Tenant Name',
        dataType: 'string'
      },
      relatedtransactionid: {
        label: 'Related Transaction ID',
        dataType: 'string'
      },
      payoutID: {
        label: 'Payout Transaction ID (HB)',
        dataType: 'string'
      },
      payoutidpsp: {
        label: 'Payout Transaction ID (PSP)',
        dataType: 'string'
      },
      payoutinitiatedatepsp: {
        label: 'Payout Initiated Date',
        dataType: 'datetimeiso'
      },
      payoutamount: {
        label: 'Payout Amount',
        dataType: 'float'
      }
    },
    "raw": {
      AccountNum: {
        label: 'Account Number',
        dataType: 'string'
      },
      MerchantTransactionDate: {
        label: 'Merchant Transaction Date',
        dataType: 'datetimeiso'
      },
      MerchantSettleDate: {
        label: 'Merchant Settle Date',
        dataType: 'datetimeiso'
      },
      SettleDate: {
        label: 'Settle Date',
        dataType: 'datetimeiso'
      },
      AttNum: {
        label: 'AttNum',
        dataType: 'string'
      },
      TransDescription: {
        label: 'Transaction Description',
        dataType: 'string'
      },
      TransactionDetailAccount: {
        label: 'Transaction Detail Account',
        dataType: 'string'
      },
      TransactionDetailType: {
        label: 'Transaction Detail Type',
        dataType: 'string'
      },
      AuthAmount: {
        label: 'Auth Amount',
        dataType: 'float'
      },
      GrossAmount: {
        label: 'Gross Amount',
        dataType: 'float'
      },
      NetAmount: {
        label: 'Net Amount',
        dataType: 'float'
      },
      ResponseCode: {
        label: 'Response Code',
        dataType: 'string'
      },
      ResponseCodeDescription: {
        label: 'Response Code Description',
        dataType: 'string'
      },
      ExpDate: {
        label: 'Exp Date',
        dataType: 'string'
      },
      TransactionInfoId: {
        label: 'Transaction Info Id',
        dataType: 'string'
      },
      SweepId: {
        label: 'SweepId',
        dataType: 'string'
      },
      BatchId: {
        label: 'Batch Id',
        dataType: 'string'
      },
      CardPresent: {
        label: 'Card Present',
        dataType: 'string'
      },
      HasCVV2: {
        label: 'HasCVV2',
        dataType: 'string'
      },
      BankName: {
        label: 'Bank Name',
        dataType: 'string'
      },
      BankAddress1: {
        label: 'Bank Address',
        dataType: 'string'
      },
      CardNumber: {
        label: 'Card Number',
        dataType: 'string'
      },
      Currency: {
        label: 'currency',
        dataType: 'string'
      },
      ParentTransactionInfoId: {
        label: 'Parent Transaction Info Id',
        dataType: 'string'
      },
      TraceNumber: {
        label: 'Trace Number',
        dataType: 'string'
      },
      CardPresentType: {
        label: 'Card Present Type',
        dataType: 'string'
      },
      ReconcilingDescription: {
        label: 'Reconciliation',
        dataType: 'string'        
      }
    },
    "payouts": {
      payout_date: {
        label: 'Payout Initiate Date',
        dataType: 'datetimeiso'
      },
      payout_id: {
        label: 'Payout Transaction ID (HB)',
        dataType: 'string'
      },
      payout_id_psp: {
        label: 'Payout TransactionID (PSP)',
        dataType: 'string'
      },
      bank_routing_number: {
        label: 'Bank Routing Number',
        dataType: 'string'
      },
      bank_acc_tail: {
        label: 'Bank Account Tail',
        dataType: 'string'
      },
      payout_amount: {
        label: 'Payout Amount',
        dataType: 'integer'
      },
      currency: {
        label: 'Currency',
        dataType: 'string'
      }
    },
    "coverage-details": {
      property_name: {
        label: 'Property Name',
        dataType: 'string'
      },
      space_number: {
        label: 'Space Number',
        dataType: 'string'
      },
      tenant_first_name: {
        label: 'First Name',
        dataType: 'string'
      },
      tenant_last_name: {
        label: 'Last Name',
        dataType: 'string'
      },
      tenant_address_1: {
        label: 'Address',
        dataType: 'string'
      },
      tenant_address_2: {
        label: 'Address 2',
        dataType: 'string'
      },
      tenant_city: {
        label: 'City',
        dataType: 'string'
      },
      tenant_state: {
        label: 'State',
        dataType: 'string'
      },
      tenant_country: {
        label: 'Country',
        dataType: 'string'
      },
      tenant_zip: {
        label: 'Zip',
        dataType: 'string'
      },
      tenant_email: {
        label: 'Email',
        dataType: 'string'
      },
      tenant_phone: {
        label: 'Phone',
        dataType: 'string'
      },
      move_in_date: {
        label: 'Tenant Move In Date',
        dataType: 'date'
      },
      insurance_start_date: {
        label: 'Insurance Start Date',
        dataType: 'date'
      },
      insurance_end_date: {
        label: 'Insurance End Date',
        dataType: 'date'
      }
      ,
      invoice_period_start: {
        label: 'Invoice Start Date',
        dataType: 'date'
      },
      invoice_period_end: {
        label: 'Invoice End Date',
        dataType: 'date'
      },
      transaction_date: {
        label: 'Transaction Date',
        dataType: 'date'
      },
      insurance_refunded_amount: {
        label: 'Insurance Refunded Amount',
        dataType: 'integer'
      },
      insurance_credited_amount: {
        label: 'Insurance Credited Amount',
        dataType: 'integer'
      },
      insurance_paid_amount: {
        label: 'Insurance Paid Amount',
        dataType: 'integer'
      },
      balance_due: {
        label: 'Insurance Balance Due',
        dataType: 'integer'
      },
      insurance_name: {
        label: 'Insurance Name',
        dataType: 'string'
      },
      insurance_permium: {
        label: 'Insurance Permium',
        dataType: 'integer'
      },
      insurance_coverage: {
        label: 'Insurance Coverage ',
        dataType: 'integer'
      },
      is_cancelled_coverage: {
        label: 'Cancelled Coverage',
        dataType: 'string'
      }, 
      is_new_coverage: {
        label: 'New Coverage',
        dataType: "string"
      },
      is_paid: {
        label: 'Is paid',
        dataType: 'string'
      }
    },
    "sales_commission": {
      user_employee_id: {
        label: 'Employee ID',
        dataType: 'string'
      },
      employee: {
        label: 'Employee',
        dataType: 'string'
      },
      product_code: {
        label: 'Product code',
        dataType: 'string'
      },
      blank_column_1: {
        label: 'Blank Column',
        dataType: 'string'
      },
      commission_amount: {
        label: 'Commission amount',
        dataType: 'integer'
      },
      blank_column_2: {
        label: 'Blank Column',
        dataType: 'string'
      },
      blank_column_3: {
        label: 'Blank Column',
        dataType: 'string'
      },
      property_number: {
        label: 'Property number',
        dataType: 'string'
      }
    },
    "sales_commission_details": {
      summarized_view: {
        user_employee_id: {
          label: 'User Employee ID',
          dataType: 'string'
        },
        user_name: {
          label: 'User Name',
          dataType: 'string'
        },
        user_role: {
          label: 'User Role',
          dataType: 'string'
        },   
        product_code: {
          label: 'Product code',
          dataType: 'string'
        },
        property_number: {
          label: 'Property number',
          dataType: 'string'
        },
        commission_amount: {
          label: 'Commission amount',
          dataType: 'integer'
        },
      },
      detailed_view: {
        property_number: {
          label: 'Property Number',
          dataType: 'string'
        },
        unit_number: {
          label: 'Space #',
          dataType: 'string'
        },
        user_name: {
          label: 'User Name',
          dataType: 'string'
        },
        user_role: {
          label: 'User Role',
          dataType: 'string'
        },
        user_employee_id: {
          label: 'User Employee ID',
          dataType: 'string'
        },
        product_name: {
          label: 'Product Name',
          dataType: 'string'
        },
        product_description: {
          label: 'Product Description',
          dataType: 'string'
        },
        tenant_name: {
          label: 'Tenant Name',
          dataType: 'string'
        },
        invoice_number: {
          label: 'Invoice Number',
          dataType: 'string'
        },
        invoice_date: {
          label: 'Invoice Date',
          dataType: 'date'
        },
        invoice_line_quantity: {
          label: 'Quantity',
          dataType: 'integer'
        },
        invoice_line_cost: {
          label: 'Cost',
          dataType: 'integer'
        },
        sales_tax: {
          label: 'Sales Tax',
          dataType: 'integer'
        },
        line_total: {
          label: 'Line Total',
          dataType: 'integer'
        },
        invoice_total: {
          label: 'Invoice Total',
          dataType: 'integer'
        },
        amount_paid: {
          label: 'Amount Paid',
          dataType: 'integer'
        },
        commission_amount: {
          label: 'Commission Subtotal',
          dataType: 'integer'
        },
      }
    },
    "manager-activity": {
      activity_name: {
        label: "Activity / Action Name",
        dataType: "string",
      },
      date_time: {
        label: "Date and Time Stamp",
        dataType: "datetime",
      },
      user_name: {
        label: "User Name",
        dataType: "string",
      },
      name: {
        label: "Name",
        dataType: "string",
      },
      employee_id: {
        label: "Employee ID",
        dataType: "string",
      },
      property_name: {
        label: "Property Name",
        dataType: "string",
      },
      tenant_name: {
        label: "Tenant Name",
        dataType: "string",
      },
      unit_number: {
        label: "Space Number",
        dataType: "string",
      }
    },
    ...managementSummary,
    ...storeKPI,
    ...managementHistory,

  },

  sheets_width: {
    "management-summary": {
      "MSR": [
        {width: 43.56},
        {width: 15.56},
        {width: 3.33},
        {width: 11.56},
        {width: 11.56},
        {width: 7.56},
        {width: 4.67},
        {width: 23.33},
        {width: 3.89},
        {width: 3.56},
        {width: 18.22},
        {width: 12.11},
        {width: 9.33},
        {width: 11.7}
      ]                                             
    },
    "store-kpi": [
        {width: 35},
        {width: 13.5},
        {width: 13.5},
        {width: 13.5},
        {width: 13.5},
        {width: 12},
        {width: 14},
        {width: 14},
        {width: 15},
        {width: 12},
        {width: 20},
        {width: 12},
        {width: 15},
        {width: 9},
        {width: 10},
        {width: 10},
        {width: 24},
        {width: 24},
        {width: 11},
        {width: 11},
        {width: 10},
        {width: 23.5},
        {width: 11},
        {width: 12},
        {width: 11},
        {width: 12},
        {width: 11},
        {width: 12},
        {width: 11},
        {width: 12},
        {width: 11},
        {width: 12},
        {width: 12},
        {width: 18},
        {width: 18},
        {width: 21.5},
        {width: 21.5},
        {width: 12},
        {width: 12},
    ],
    "management-history": [
      {width: 22.11}
    ]
  }
}