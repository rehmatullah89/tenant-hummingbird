module.exports = {
  invoice_lines_allocation: {
    invoice_line_allocation_amount: {
      label: "Allocation Amount",
      key: "invoice_line_allocation_amount",
      group: "invoice_allocation",
      column_type: "money",
      input: "comparison",
      width: 149
    },
    invoice_line_allocation_date: {
      label: "Allocation Date",
      key: "invoice_line_allocation_date",
      group: "invoice_allocation",
      column_type: "date",
      input: "timeframe",
      width: 150
    },
    invoice_line_allocation_type: {
      label: "Alloc. Product Type",
      key: "invoice_line_allocation_type",
      group: "invoice_allocation",
      column_type: "string",
      input: 'multi-select',
      options: ['Rent', 'Security', 'Fee', 'Insurance', 'Merchandise', 'Cleaning', 'Auction', 'Tax'],
      width: 200
    },
    invoice_line_allocation_product: {
      label: "Alloc. Product Name",
      key: "invoice_line_allocation_product",
      group: "invoice_allocation",
      column_type: "string",
      width: 154
    },
    invoice_line_allocation_product_description: {
      label: "Alloc. Product Desc",
      key: "invoice_line_allocation_product_description",
      group: "invoice_allocation",
      column_type: "string",
      width: 200
    },
    invoice_line_allocation_sales_tax_paid: {
      label: "Tax Amount Paid",
      key: "invoice_line_allocation_sales_tax_paid",
      group: "invoice_allocation",
      column_type: "money",
      width: 150
    },
    
  }
}
