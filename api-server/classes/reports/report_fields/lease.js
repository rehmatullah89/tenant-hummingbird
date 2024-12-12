module.exports = {
  lease: {
    lease_id: {
      label: "Lease Id",
      key: "lease_id",
      hide: true
    },
    lease_is_autopay: {
      label: "Is AutoPay",
      key: "lease_is_autopay",
      group: "lease",
      options: ['Yes', 'No'],
      input: 'multi-select'
    },

    lease_document_status: {
      label: "Document Status",
      key: "lease_document_status",
      options: ['Complete', 'Incomplete'],
      input: 'multi-select',
      group: "lease",
      width: 200
    },

    lease_created_by: {
      label: "Created By Id",
      key: "lease_created_by",
      group: "lease",
      input: 'multi-select',
      width: 120
    },
    lease_created_by_name: {
      label: "Created By",
      key: "lease_created_by_name",
      group: "lease",
      input: 'multi-select',
      width: 120
    },
    lease_start_date: {
      label: "Move In",
      key: "lease_start_date",
      group: "lease",
      column_type: "date",
      input: 'timeframe',
      width: 120
    },
    lease_end_date: {
      label: "Move Out",
      key: "lease_end_date",
      group: "lease",
      column_type: "date",
      input: 'timeframe',
      width: 120
    },
    lease_next_payment_cycle: {
      label: "Next Payment Cycle",
      key: "lease_next_payment_cycle",
      group: "lease",
      input: 'multi-select',
      options: ['Monthly', 'Quarterly', 'Annual'],
      width: 170
    },
    lease_payment_cycle: {
      label: "Payment Cycle",
      key: "lease_payment_cycle",
      group: "lease",
      input: 'multi-select',
      options: ['Monthly', 'Quarterly', 'Annual'],
      width: 170
    },
    lease_payment_cycle_bill: {
      label: "Payment Cycle Bill Total",
      key: "lease_payment_cycle_bill",
      group: "lease",
      column_type: "money",
      input: 'comparison',
      width: 170
    },
    lease_created: {
      label: "Lease Created",
      key: "lease_created",
      group: "lease",
      column_type: "date",
      input: 'timeframe',
      width: 170
    },
    lease_move_out_refund: {
      label: "Move Out Refund",
      key: "lease_move_out_refund",
      group: "lease",
      column_type: "money",
      input: 'comparison',
      width: 150
    },
    lease_move_out_credit: {
      label: "Move Out Credit",
      key: "lease_move_out_credit",
      group: "lease",
      column_type: "money",
      input: 'comparison',
      width: 150
    },
    lease_move_out_notes: {
      label: "Move Out Notes",
      key: "lease_move_out_notes",
      group: "lease",
      column_type: "string",
      width: 150
    },
    lease_writeoffs: {
      label: "Write Offs",
      key: "lease_writeoffs",
      group: "lease",
      column_type: "money",
      input: 'comparison',
      width: 132
    },
    lease_rent: {
      label: "Current Rent",
      key: "lease_rent",
      group: "lease",
      column_type: "money",
      input: 'comparison',
      width: 118
    },
    lease_old_rent: {
      label: "Old Rent",
      key: "lease_old_rent",
      group: "lease",
      column_type: "money",
      input: 'comparison',
      width: 118
    },
    lease_rent_change: {
      label: "Change amount",
      key: "lease_rent_change",
      group: "lease",
      column_type: "money",
      input: 'comparison',
      width: 118
    },
    lease_standing: {
      label: "Tenant Status",
      key: "lease_standing",
      group: "lease",
      column_type: "status",
      input: "multi-select",
      width: 142
    },
    lease_auction_status: {
      label: "Auction Status",
      key: "lease_auction_status",
      group: "lease",
      column_type: "status",
      input: "multi-select",
      options: ['To Schedule', 'Scheduled', 'Auction Day', 'Auction Payment', 'To Move Out', 'Complete'],
      width: 170
    },
    lease_send_invoice: {
      label: "Send Invoices",
      key: "lease_send_invoice",
      group: "lease",
      column_type: "boolean",
      input: 'boolean',
      width: 131
    },

    // lease_sched_move_out: {
    //   label: "Sched. Move Out",
    //   key: "lease_sched_move_out",
    //   group: "lease",
    //   column_type: "date",
    //   input: 'timeframe',
    //   width: 150
    // },

    lease_security_deposit: {
      label: "Security Deposit",
      key: "lease_security_deposit",
      group: "lease",
      column_type: "money",
      input: 'comparison'
    },
    lease_bill_day: {
      label: "Bill Day",
      key: "lease_bill_day",
      group: "lease",
      input: 'comparison',
      width: 94
    },
    lease_monthly: {
      label: "Month to Month",
      key: "lease_monthly",
      group: "lease",
      column_type: "boolean",
      input: "boolean",
      width: 142
    },
    lease_decline_insurance: {
      label: "Declined Insurance",
      key: "lease_decline_insurance",
      group: "lease",
      column_type: "boolean",
      input: 'boolean',
      width: 162
    },
    lease_insurance_expiration: {
      label: "Insurance Expiration",
      key: "lease_insurance_expiration",
      group: "lease",
      column_type: "string",
      input: 'boolean',
      width: 168
    },
    lease_rented_days: {
      label: "Days Rented",
      key: "lease_rented_days",
      group: "lease",
      column_type: "number",
      input: 'comparison',
      width: 122
    },

    lease_rented_months: {
      label: "Months Rented",
      key: "lease_rented_months",
      group: "lease",
      column_type: "number",
      input: 'comparison',
      width: 137
    },

    lease_days_to_convert: {
      label: "Days To Convert",
      key: "lease_days_to_convert",
      group: "lease",
      column_type: "number",
      input: 'comparison',
      width: 143
    },



    lease_discount: {
      label: "Discount",
      key: "lease_discount",
      group: "lease",
      input: 'text',
      width: 155
    },

    lease_sign_up_promo: {
      label: "Sign Up Promotion",
      key: "lease_sign_up_promo",
      group: "lease",
      input: 'text',
      width: 158
    },

    lease_promotions: {
      label: "Promotion Name",
      key: "lease_promotions",
      group: "lease",
      column_type: "concat",
      width: 150
    },

    lease_promotions_amount: {
      label: "Promotion Amount",
      key: "lease_promotions_amount",
      group: "lease",
      column_type: "money",
      width: 200
    },


    lease_days_late: {
      label: "Days Late",
      key: "lease_days_late",
      group: "lease",
      column_type: "number",
      input: 'comparison',
      width: 107
    },

    lease_offer_rate_at_move_in: {
      label: `Offer Rate at Move-in`,
      key: `lease_offer_rate_at_move_in`,
      header_tool_tip: `Offer Rate at Move-in`,
      column_type: `money`,
      group: `lease`,
      input: `comparison`,
      width: 120
    },

    lease_sell_rate_at_move_in: {
      label: `Sell Rate at Move-in`,
      header_tool_tip: `Sell Rate at Move-in`,
      key: `lease_sell_rate_at_move_in`,
      column_type: `money`,
      input: `comparison`,
      group: `lease`,
      width: 120
    },

    lease_set_rate_at_move_in: {
      label: `Set Rate at Move-in`,
      key: `lease_set_rate_at_move_in`,
      header_tool_tip: `Set Rate at Move-in`,
      column_type: `money`,
      group: `lease`,
      input: `comparison`,
      width: 120
    },

    lease_offer_sell_variance_at_move_in: {
      label: `Variance at Move-in $ (Offer/Sell Rate at Move-in)`,
      key: `lease_offer_sell_variance_at_move_in`,
      header_tooltip: `Variance in Dollar at Move-in (Offer/Sell Rate at Move-in)`,
      column_type: `money`,
      group: `lease`,
      input: `comparison`,
      width: 170
    },

    lease_offer_sell_variance_percent_at_move_in: {
      label: `Variance at Move-in % (Offer/Sell Rate at Move-in)`,
      key: `lease_offer_sell_variance_percent_at_move_in`,
      header_tool_tip: `Variance Percentage at Move-in (Offer/Sell Rate at Move-in)`,
      input: `comparison`,
      column_type: `percentage`,
      group: `lease`,
      width: 170
    },

    lease_offer_set_variance_at_move_in: {
      label: `Variance at Move-in $ (Offer/Set Rate at Move-in)`,
      key: `lease_offer_set_variance_at_move_in`,
      header_tooltip: `Variance in Dollar at Move-in (Offer/Set Rate at Move-in)`,
      column_type: `money`,
      input: `comparison`,
      group: `lease`,
      width: 170
    },

    lease_offer_set_variance_percent_at_move_in: {
      label: `Variance at Move-in % (Offer/Set Rate at Move-in)`,
      key: `lease_offer_set_variance_percent_at_move_in`,
      header_tool_tip: `Variance Percentage at Move-in (Offer/Set Rate at Move-in)`,
      input: `comparison`,
      column_type: `percentage`,
      group: `lease`,
      width: 170
    },

    lease_sell_set_variance_at_move_in: {
      label: `Variance at Move-in $ (Sell Rate at Move-in/Set Rate at Move-in)`,
      key: `lease_sell_set_variance_at_move_in`,
      header_tool_tip: `Variance in Dollar at Move-in (Sell Rate at Move-in/Set Rate at Move-in)`,
      column_type: `money`,
      input: `comparison`,
      group: `lease`,
      width: 190
    },

    lease_sell_set_variance_percent_at_move_in: {
      label: `Variance at Move-in % (Sell Rate at Move-in/Set Rate at Move-in)`,
      key: `lease_sell_set_variance_percent_at_move_in`,
      header_tool_tip: `Variance Percentage at Move-in (Sell Rate at Move-in/Set Rate at Move-in)`,
      column_type: `percentage`,
      input: `comparison`,
      group: `lease`,
      width: 190
    },

    lease_rent_offer_variance: {
      label: `Variance $ (Rent/Offer)`,
      key: `lease_rent_offer_variance`,
      header_tool_tip: `Variance in Dollar (Rent/Offer)`,
      column_type: `money`,
      input: `comparison`,
      group: `lease`,
      width: 120
    },

    lease_rent_offer_variance_percent: {
      label: `Variance % (Rent/Offer)`,
      key: `lease_rent_offer_variance_percent`,
      header_tool_tip: `Variance Percentage (Rent/Offer)`,
      column_type: `percentage`,
      input: `comparison`,
      group: `lease`,
      width: 120
    },

    lease_rent_per_sqft: {
      label: "Rent/sqft",
      key: "lease_rent_per_sqft",
      group: "lease",
      column_type: "money",
      input: 'comparison',
      width: 120
    },

    lease_rent_per_sqft_annualized: {
      label: `Rent/sqft annualized`,
      key: `lease_rent_per_sqft_annualized`,
      header_tool_tip: `Rent/sqft annualized (value x 12)`,
      column_type: `money`,
      input: `comparison`,
      group: `lease`,
      width: 120
    },

    lease_rent_by_ft: {
      label: `Rent/ft`,
      key: `lease_rent_by_ft`,
      header_tool_tip: `Rent/ft`,
      column_type: `money`,
      input: `comparison`,
      group: `lease`,
      width: 120
    },


    lease_rent_by_ft_annualized: {
      label: `Rent/ft annualized`,
      key: `lease_rent_by_ft_annualized`,
      header_tool_tip: `Rent/ft annualized (value x 12)`,
      column_type: `money`,
      input: `comparison`,
      group: `lease`,
      width: 120
    },


    lease_rent_sell_variance: {
      label: `Variance $ (Rent/Sell)`,
      key: `lease_rent_sell_variance`,
      header_tool_tip: `Variance in Dollar (Rent/Sell)`,
      column_type: `money`,
      input: `comparison`,
      group: `lease`,
      width: 120
    },

    // lease_rent_sell_variance_percent: {
    //   label: `Variance % (Rent/Sell)`,
    //   key: `lease_rent_sell_variance_percent`,
    //   header_tool_tip: `Variance Percentage (Rent/Sell)`,
    //   column_type: `percentage`,
    //   input: `comparison`,
    //   group: `lease`,
    //   width: 120
    // },

    lease_rent_set_variance: {
      label: `Variance $ (Rent/Set)`,
      key: `lease_rent_set_variance`,
      header_tool_tip: `Variance in Dollar (Rent/Set)`,
      column_type: `money`,
      input: `comparison`,
      group: `lease`,
      width: 120
    },

    lease_rent_set_variance_percent: {
      label: `Variance % (Rent/Set)`,
      key: `lease_rent_set_variance_percent`,
      header_tool_tip: `Variance Percentage (Rent/Set)`,
      column_type: `percentage`,
      input: `comparison`,
      group: `lease`,
      width: 120
    },

    lease_days_of_stay: {
      label: `Length of Stay (days)`,
      key: `lease_days_of_stay`,
      header_tool_tip: `Length of Stay (days)`,
      column_type: `number`,
      input: `comparison`,
      group: `lease`,
      width: 113
    },

    lease_months_of_stay: {
      label: `Length of Stay (months)`,
      key: `lease_months_of_stay`,
      header_tool_tip: `Length of Stay (months)`,
      column_type: `number`,
      input: `comparison`,
      group: `lease`,
      width: 130
    },

    lease_years_of_stay: {
      label: `Length of Stay (years)`,
      key: `lease_years_of_stay`,
      header_tool_tip: `Length of Stay (years)`,
      column_type: `number`,
      input: `comparison`,
      group: `lease`,
      width: 118
    },

    lease_rent_plan_status: {
      label: "Rent Management Status",
      key: "lease_rent_plan_status",
      group: "lease",
      width: 160,
      column_type: "status",
      input: "multi-select"
    },

  },
  lease_summary: {
    lease_last_payment: {
      label: "Last Payment Amount",
      key: "lease_last_payment",
      group: "lease",
      column_type: "money",
      input: 'comparison',
      width: 176
    },
    lease_uncollected_rent: {
      label: "Uncollected Rent",
      key: "lease_uncollected_rent",
      group: "lease",
      column_type: "money",
      input: 'comparison',
      width: 173
    },

    lease_delinquency_notes: {
      label: "Delinquency Notes",
      key: "lease_delinquency_notes",
      group: "lease",
      column_type: "string",
      input: 'text',
      width: 220
    },

    lease_last_payment_date: {
      label: "Last Payment Date",
      key: "lease_last_payment_date",
      group: "lease",
      column_type: "date",
      input: 'timeframe',
      width: 157
    },
    lease_last_payment_source: {
      label: "Last Payment Source",
      key: "lease_last_payment_source",
      group: "lease",
      input: 'multi-select',
      options: ['telephone/moto', 'ecommerce', 'in-store' ],
      width: 171
    },

    lease_balance: {
      label: "Total Past Due",
      key: "lease_balance",
      group: "lease",
      column_type: "money",
      input: 'comparison',
      width: 132
    },
    lease_prepay_balance: {
      label: "Lease Prepay Balance",
      key: "lease_prepay_balance",
      group: "lease",
      column_type: "money",
      input: 'comparison',
      width: 138
    },

    lease_beginning_balance: {
      label: "Beginning Balance",
      key: "lease_beginning_balance",
      group: "lease",
      column_type: "money",
      input: 'comparison',
      width: 157
    },
    lease_ending_balance: {
      label: "Ending Balance",
      key: "lease_ending_balance",
      group: "lease",
      column_type: "money",
      input: 'comparison',
      width: 139
    },

    lease_lifetime_billed: {
      label: "Lifetime Billed",
      key: "lease_lifetime_billed",
      group: "lease",
      column_type: "money",
      input: 'comparison',
      width: 132
    },
    lease_lifetime_payments: {
      label: "Lifetime Payments",
      key: "lease_lifetime_payments",
      group: "lease",
      column_type: "money",
      input: 'comparison',
      width: 156
    },

    lease_next_billing_date: {
      label: "Next Billing Date",
      key: "lease_next_billing_date",
      group: "lease",
      column_type: "date",
      input: 'timeframe',
      width: 156
    },
    lease_paid_through_date: {
      label: "Paid Through Date",
      key: "lease_paid_through_date",
      group: "lease",
      column_type: "date",
      input: 'timeframe',
      width: 156
    },

    lease_insurance_start_date: {
      label: "Effective date",
      key: "lease_insurance_start_date",
      group: "lease",
      column_type: "date",
      input: 'timeframe',
      width: 156
    },

    lease_insurance_added_date: {
      label: "Added on",
      key: "lease_insurance_added_date",
      group: "lease",
      column_type: "date",
      input: 'timeframe',
      width: 156
    },

    lease_last_rent_change_date: {
      label: "Last Rent Change",
      key: "lease_last_rent_change_date",
      group: "lease",
      column_type: "date",
      input: 'timeframe',
      width: 152
    },

    // lease_move_ins: {
    //   label: "Move ins",
    //   key: "lease_move_ins",
    //   group: "lease",
    //   column_type: "number",
    //   input: 'comparison'
    // },
    // lease_move_outs: {
    //   label: "Move outs",
    //   key: "lease_move_outs",
    //   group: "lease",
    //   column_type: "number",
    //   input: 'comparison'
    // },
    //
    // lease_transfers: {
    //   label: "Transfers",
    //   key: "transfers",
    //   group: "lease",
    //   column_type: "number",
    //   input: 'comparison'
    // },

    // lease_last_rent_change_amt: {
    //   label: "Last Rent Change Amt",
    //   key: "lease_last_rent_change_amt",
    //   group: "lease",
    //   column_type: "money",
    //   input: 'comparison'
    // },
    lease_days_since_rent_change: {
      label: "Days Since Rent Change",
      key: "lease_days_since_rent_change",
      group: "lease",
      column_type: "number",
      input: 'comparison',
      width: 190

    },
    lease_total_rent_change: {
      label: "Total Rent Change",
      key: "lease_total_rent_change",
      group: "lease",
      column_type: "money",
      input: 'comparison',
      width: 171
    },

    lease_bad_debt_writeoffs: {
      label: "Bad Debt",
      key: "lease_bad_debt_writeoffs",
      group: "lease",
      column_type: "money",
      input: 'comparison',
      width: 103
    },
    lease_refunds: {
      label: "Refunds Given",
      key: "lease_refunds",
      group: "lease",
      column_type: "money",
      input: 'comparison',
      width: 134
    },

    lease_active_insurance_name: {
      label: "Insurance",
      key: "lease_active_insurance_name",
      group: "lease",
      column_type: "string",
      width: 158
    },

    lease_insurance_status: {
      label: "Status",
      key: "lease_insurance_status",
      group: "lease",
      column_type: "string",
      width: 158
    },

    lease_active_insurance_coverage: {
      label: "Insurance Coverage",
      key: "lease_active_insurance_coverage",
      group: "lease",
      column_type: "money",
      input: 'comparison',
      width: 165
    },

    lease_active_insurance_premium: {
      label: "Premium",
      key: "lease_active_insurance_premium",
      group: "lease",
      column_type: "money",
      input: 'comparison',
      width: 165
    },

    lease_total_past_due: {
      label: "Total Past Due",
      key: "lease_total_past_due",
      group: "lease",
      column_type: "money",
      input: 'comparison',
      width: 130
    },

    lease_rent_past_due: {
      label: "Rent Past Due",
      key: "lease_rent_past_due",
      group: "lease",
      column_type: "money",
      input: 'comparison',
      width: 130
    },

    lease_fees_past_due: {
      label: "Fees Past Due",
      key: "lease_fees_past_due",
      group: "lease",
      column_type: "money",
      input: 'comparison',
      width: 131
    },

    lease_other_past_due: {
      label: "Other Past Due",
      key: "lease_other_past_due",
      group: "lease",
      column_type: "money",
      input: 'comparison',
      width: 137
    },

    lease_tax_past_due: {
      label: "Tax Past Due",
      key: "lease_tax_past_due",
      group: "lease",
      column_type: "money",
      input: 'comparison',
      width: 135
    },

    lease_past_due_paid: {
      label: "Past Due Paid",
      key: "lease_past_due_paid",
      group: "lease",
      column_type: "money",
      input: 'comparison',
      width: 130
    },

    lease_active_recurring_fees: {
      label: "Active Recurring Fees",
      key: "lease_active_recurring_fees",
      group: "lease",
      column_type: "money",
      input: 'comparison',
      width: 175
    },

    lease_rent_variance: {
      label: "Lease Variance",
      key: "lease_rent_variance",
      group: "lease",
      column_type: "money",
      input: 'comparison',
      width: 137
    },

    lease_rent_variance_prct: {
      label: "Variance % (Rent/Sell)",
      key: "lease_rent_variance_prct",
      header_tool_tip: `Variance Percentage (Rent/Sell)`,
      group: "lease",
      column_type: "percentage",
      input: 'comparison',
      width: 130
    },

    lease_billing_type:{
      label: "Billing type",
      key: "lease_billing_type",
      group: "lease",
      column_type: "string",
      width: 130
    },

    lease_next_invoice_total: {
      label: "Next Invoice Total",
      key: "lease_next_invoice_total",
      group: "lease",
      column_type: "money",
      input: 'comparison',
      width: 176
    },

    lease_days_late_rent: {
      label: "Days Late - Rent",
      key: "lease_days_late_rent",
      group: "lease",
      width: 176,
      column_type: "number",
    },

    lease_tier_type: {
      label: "Value Tier",
      key: "lease_tier_type",
      group: "lease",
      width: 176,
      column_type: "string"
    },
    
    lease_coverage_due: {
      label: "Coverage Past Due",
      key: "lease_coverage_due",
      group: "lease",
      column_type: "money",
      input: 'comparison',
      width: 130
    }
  }
}
