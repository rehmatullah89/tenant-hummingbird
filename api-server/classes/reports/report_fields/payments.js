module.exports = {
  payment: {
    payment_date: {
      label: "Payment Date",
      key: "payment_date",
      group: "payments",
      column_type: "date",
      input: 'timeframe',
      width: 130
    },

    payment_ref_name: {
      label: "Reference Name",
      key: "payment_ref_name",
      group: "payments",
      column_type: "string",
      width: 145
    },

    payment_method: {
      label: "Payment Method",
      key: "payment_method",
      group: "payments",
      column_type: "string",
      width: 150
    },

    payment_unit_numbers: {
      label: "Space Numbers",
      key: "payment_unit_numbers",
      column_type: "concat",
      group: "payments",
      width: 150
    },

    payment_trans_id: {
      label: "Payment Transaction Id",
      key: "payment_trans_id",
      group: "payments",
      column_type: "string",
      width: 185
    },

    payment_number: {
      label: "Payment Ref No.",
      key: "payment_number",
      group: "payments",
      column_type: "string",
      width: 145
    },
    payment_created: {
      label: "Payment Created",
      key: "payment_created",
      group: "payments",
      column_type: "date",
      input: 'timeframe',
      width: 150
    },
    payment_status: {
      label: "Payment Status",
      key: "payment_status",
      group: "payments",
      column_type: "status",
      input: 'multi-select',
      width: 140,
      options: ["Successful", "Failed"]
    },

    payment_status_desc: {
      label: "Payment Status Description",
      key: "payment_status_desc",
      group: "payments",
      column_type: "string",
      width: 250
    },

    payment_auth_code: {
      label: "Payment Auth Code",
      key: "payment_auth_code",
      group: "payments",
      column_type: "string",
      width: 100
    },

    payment_credit_type: {
      label: "Credit Type",
      key: "payment_credit_type",
      group: "payments",
      column_type: "string",
      input: 'multi-select',
      width: 200,
      options: ['Credit', 'Payment' ]
    },

    payment_notes: {
      label: "Payment Notes",
      key: "payment_notes",
      group: "payments",
      column_type: "string",
      input: 'text',
      width: 200
    },

    payment_amount: {
      label: "Payment Amount",
      key: "payment_amount",
      group: "payments",
      column_type: "money",
      input: 'comparison',
      width: 149
    },

    payment_source: {
      label: "Payment Source",
      key: "payment_source",
      group: "payments",
      input: 'multi-select',
      column_type: "string",
      options: ['telephone/moto', 'ecommerce', 'in-store' ],
      width: 144
    },

    payment_accepted_by: {
      label: "Payment Accepted By Id",
      key: "payment_accepted_by",
      group: "payments",
      input: 'multi-select',
      width: 176
    },
    payment_accepted_by_name: {
      label: "Payment Accepted By",
      key: "payment_accepted_by_name",
      group: "payments",
      column_type: "string",
      width: 176
    },

    payment_payment_source: {
      label: "Payment Origin",
      key: "payment_payment_source",
      group: "payments",
      column_type: "string",
      width: 144
    }


  },
  payment_summary: {
    payment_amt_applied: {
      label: "Payment Applied",
      key: "payment_amt_applied",
      group: "payments",
      column_type: "money",
      input: 'comparison',
      width: 148
    },
    payment_refunds: {
      label: "Refunds Given",
      key: "payment_refunds",
      group: "payments",
      column_type: "money",
      input: 'comparison',
      width: 140
    },
    payment_amt_remaining: {
      label: "Payment Remaining",
      key: "payment_amt_remaining",
      group: "payments",
      column_type: "money",
      input: 'comparison',
      width: 164
    },
    payment_amount_tendered: {
      label: "Payment Amount Tendered",
      key: "payment_amount_tendered",
      group: "payments",
      column_type: "money",
      input: 'comparison',
      width: 149
    },
    payment_change_due: {
      label: "Payment Change Due",
      key: "payment_change_due",
      group: "payments",
      column_type: "money",
      input: 'comparison',
      width: 149
    },  
    payment_rent_paid: {
      label: "Paid Rent",
      key: "payment_rent_paid",
      group: "payments",
      column_type: "money",
      input: 'comparison',
      width: 148
    },
    payment_deposit_paid: {
      label: "Paid Deposit",
      key: "payment_deposit_paid",
      group: "payments",
      column_type: "money",
      input: 'comparison',
      width: 148
    },
    payment_merchandise_paid: {
      label: "Paid Merchandise",
      key: "payment_merchandise_paid",
      group: "payments",
      column_type: "money",
      input: 'comparison',
      width: 148
    },
    payment_coverage_paid: {
      label: "Paid Coverage",
      key: "payment_coverage_paid",
      group: "payments",
      column_type: "money",
      input: 'comparison',
      width: 148
    },
    payment_fees_paid: {
      label: "Paid Fees",
      key: "payment_fees_paid",
      group: "payments",
      column_type: "money",
      input: 'comparison',
      width: 148
    },
    payment_auction_paid: {
      label: "Auction Payment",
      key: "payment_auction_paid",
      group: "payments",
      column_type: "money",
      input: 'comparison',
      width: 148
    },
    payment_tax_paid: {
      label: "Paid Tax",
      key: "payment_tax_paid",
      group: "payments",
      column_type: "money",
      input: 'comparison',
      width: 148
    },
    payment_net: {
      label: "Net Payments",
      key: "payment_net",
      group: "payments",
      column_type: "money",
      input: 'comparison',
      width: 148
    },
    payment_source_property_name: {
      label: "Source Property Name",
      key: "payment_source_property_name",
      group: "payments",
      column_type: "string",
      width: 170
    },
    payment_target_property_name: {
      label: "Target Property Name",
      key: "payment_target_property_name",
      group: "payments",
      column_type: "string",
      width: 170
    },
  }
}
