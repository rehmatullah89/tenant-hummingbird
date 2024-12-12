module.exports = {
  productservice:{
    product_name: {
      label: "Product Name",
      key: "product_name",
      group: "services",
      column_type: "string"
    },
    product: {
      label: "Product",
      key: "product_id",
      group: "services",
      column_type: "string"
    },
  },
  services_summary: {
    insurance_premium: {
      label: "Insurance Premium",
      key: "active_insurance_premium",
      group: "services",
      column_type: "money",
      input: "comparison"
    },
    insurance_created_date: {
      label: "Insurance Created Date",
      key: "active_insurance_created_date",
      group: "services",
      column_type: "date",
      input: 'timeframe'
    },
    insurance_start_date: {
      label: "Insurance Effective Date",
      key: "active_insurance_start_date",
      group: "services",
      column_type: "date",
      input: 'timeframe'
    },
    insurance_coverage: {
      label: "Insurance Coverage",
      key: "active_insurance_coverage",
      group: "services",
      column_type: "money",
      input: "comparison"
    },
    services_rent: {
      label: "Total Rent Sales",
      key: "services_rent_sales",
      group: "services",
      column_type: "money",
      input: "comparison"
    },
    services_fees: {
      label: "Total Fees Sales",
      key: "services_fees_sales",
      group: "services",
      column_type: "money",
      input: 'comparison'
    },
    services_utilities: {
      label: "Total Utilities Sales",
      key: "services_utilities_sales",
      group: "services",
      column_type: "money",
      input: "comparison"
    },
    services_products: {
      label: "Total Products Sales",
      key: "services_products_sales",
      group: "services",
      column_type: "money",
      input: "comparison"
    },
    services_recurring: {
      label: "Total Recurring Sales",
      key: "services_recurring_sales",
      group: "services",
      column_type: "money",
      input: "comparison"
    },
    services_last_rent_change_amt: {
      label: "Last Rent Change Amt",
      key: "services_last_rent_change_amt",
      group: "services",
      column_type: "money",
      input: "comparison"
    },
    services_last_rent_change_date: {
      label: "Last Rent Change Date",
      key: "services_last_rent_change_date",
      group: "services",
      column_type: "date",
      input: 'timeframe'
    },
    services_total_rent_change: {
      label: "Total Rent Change",
      key: "services_total_rent_change",
      group: "services",
      column_type:"money",
      input: "comparison"
    },

    services_days_since_rent_change: {
      label: "Days Since Rent Change",
      key: "services_days_since_rent_change",
      group: "services",
      column_type: "number",
      input: "comparison"
    },

    services_uncollected_rent: {
      label: "Uncollected Rent",
      key: "services_uncollected_rent",
      group: "services",
      column_type: "number",
      input: "comparison"
    }
  }
}
