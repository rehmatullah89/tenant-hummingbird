module.exports = {
  "store-kpi": {
    property_name: {
      label: 'Property',
      dataType: 'string'
    },
    card_ach: {
      label: 'Card/ACH',
      dataType: 'money'
    },
    cash: {
      label: 'Cash',
      dataType: 'money'
    },
    check: {
      label: 'Check',
      dataType: 'money'
    },
    giftcard: {
      label: 'Gift Card',
      dataType: 'money'
    },
    refund: {
      label: 'Refunds',
      dataType: 'money'
    },
    total_units: {
      label: 'Total Spaces',
      dataType: 'integer'
    },
    proj_rent: {
      label: 'Rent Invoiced',
      dataType: 'money'
    },
    proj_total: {
      label: 'Total Invoices',
      dataType: 'money'
    },
    occupied_units: {
      label: 'Occupied Spaces',
      dataType: 'integer'
    },
    occupied_units_pct: {
      label: 'Space Occ. %',
      dataType: 'percentage'
    },
    occupied_adj_units_pct: {
      label: 'Adjusted Space Occ. %',
      dataType: 'percentage'
    },
    occupied_units_sqft_pct: {
      label: 'SQFT Occ. %',
      dataType: 'percentage'
    },
    occupied_econ_pct: {
      label: 'Economic Occ. %',
      dataType: 'percentage'
    },
    lead_count: {
      label: 'Leads',
      dataType: 'integer'
    },
    move_in_count: {
      label: 'Move Ins',
      dataType: 'integer'
    },
    move_out_count: {
      label: 'Move Outs',
      dataType: 'integer'
    },
    variance_amount: {
      label: 'Variance (Sell Rate/Rent) $',
      dataType: 'money'
    },
    variance_pct: {
      label: 'Variance (Sell Rate/Rent) %',
      dataType: 'percentage'
    },
    coverage_amount: {
      label: 'Coverage $',
      dataType: 'money'
    },
    coverage_pct: {
      label: 'Coverage %',
      dataType: 'percentage'
    },
    auto_pay_pct: {
      label: 'Autopay %',
      dataType: 'percentage'
    },
    rent_un_change_count: {
      label: 'No Rent Change >365 days',
      dataType: 'integer'
    },
    delinquent_30_count: {
      label: 'Leases',
      dataType: 'integer',
      super_header: "Delinquent (<=30 days)"
    },
    delinquent_30_amount: {
      label: '$',
      dataType: 'money',
      super_header: "Delinquent (<=30 days)"
    },
    delinquent_60_count: {
      label: 'Leases',
      dataType: 'integer',
      super_header: "Delinquent (31-60 days)"
    },
    delinquent_60_amount: {
      label: '$',
      dataType: 'money',
      super_header: "Delinquent (31-60 days)"
    },
    delinquent_90_count: {
      label: 'Leases',
      dataType: 'integer',
      super_header: "Delinquent (61-90 days)"
    },
    delinquent_90_amount: {
      label: '$',
      dataType: 'money',
      super_header: "Delinquent (61-90 days)"
    },
    delinquent_gt_90_count: {
      label: 'Leases',
      dataType: 'integer',
      super_header: "Delinquent (>90 days)"
    },
    delinquent_gt_90_amount: {
      label: '$',
      dataType: 'money',
      super_header: "Delinquent (>90 days)"
    },
    delinquent_total_count: {
      label: 'Leases',
      dataType: 'integer',
      super_header: "Total Delinquent"
    },
    delinquent_total_amount: {
      label: '$',
      dataType: 'money',
      super_header: "Total Delinquent"
    },
    account_receivable: {
      label: 'AR',
      dataType: 'money',
    },
    expiring_discount_count: {
      label: 'Expiring Discounts #',
      dataType: 'integer',
    },
    expiring_discount_amount: {
      label: 'Expiring Discounts $',
      dataType: 'money',
    },
    non_expiring_discount_count: {
      label: 'Non-Expiring Discounts #',
      dataType: 'integer',
    },
    non_expiring_discount_amount: {
      label: 'Non-Expiring Discounts $',
      dataType: 'money',
    },
    credits: {
      label: 'Allowances',
      dataType: 'money'
    },
    writeoffs: {
      label: 'Write Offs',
      dataType: 'money'
    },
  }
}  