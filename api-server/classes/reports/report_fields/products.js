module.exports = {
  product: {
    product_name: {
      label: "Product Name",
      key: "product_name",
      group: "products",
      column_type: "string"
    },
    product_description: {
      label: "Description",
      key: "product_description",
      group: "products",
      column_type: "string"
    },
    product_price: {
      label: "Price",
      key: "product_price",
      group: "products",
      column_type: "money",
      input: 'comparison'
    },
    product_type: {
      label: "Product Type",
      key: "product_type",
      group: "products",
      column_type: "string",
      input: 'multi-select',
      options: ['Product', 'Fee', 'Insurance', 'Rent', 'Utilities']
    },
    product_taxable: {
      label: "Product Taxable",
      key: "product_taxable",
      group: "products",
      column_type: "string",
      input: 'boolean'
    },


  },
  product_summary:{
    product_last_billed: {
      label: "Product Last Billed",
      key: "product_last_billed",
      group: "products",
      column_type: "date",
      input: 'timeframe'
    },
    product_total_billed: {
      label: "Product Total Billed",
      key: "product_total_billed",
      group: "products",
      column_type: "money",
      input: 'comparison'
    },
    product_inventory: {
      label: "Product Inventory",
      key: "product_inventory",
      group: "products",
      column_type: "number",
      input: 'comparison'
    },
  }
};
