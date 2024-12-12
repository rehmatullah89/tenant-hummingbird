module.exports = {
  rent_change: {
    change_amt: {
      label: "Change Amount",
      key: "change_amt",
      group: "rent_change",
      column_type: "money",
      input: 'comparison',
      width: 118
    },
    new_rent: {
      label: "New Rent",
      key: "change_new_rent",
      group: "rent_change",
      column_type: "money",
      input: 'comparison',
      width: 118
    },
    change_change_prct: {
      label: "Change %",
      key: "change_change_prct",
      group: "rent_change",
      column_type: "percentage",
      input: 'comparison',
      width: 118
    }
  }
}
