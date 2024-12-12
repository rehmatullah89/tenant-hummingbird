module.exports = {
  refund: {

    refund_date: {
      label: "Refund Date",
      key: "refund_date",
      group: "refunds",
      column_type: "date",
      input: 'timeframe',
      width: 130
    },

    refund_amount: {
      label: "Refund Amount",
      key: "refund_amount",
      group: "refunds",
      column_type: "money",
      input: 'comparison',
      width: 149
    },

    refund_ref_num: {
      label: "Refund Ref Number",
      key: "refund_ref_num",
      group: "refunds",
      column_type: "string",
      width: 145
    },

    refund_trans_id: {
      label: "Refund Transaction Id",
      key: "refund_trans_id",
      group: "refunds",
      column_type: "string",
      width: 185
    },
    refund_to: {
      label: "Refund To",
      key: "refund_to",
      group: "refunds",
      column_type: "string",
      width: 150
    },
    refund_type: {
      label: "Refund Type",
      key: "refund_type",
      group: "refunds",
      column_type: "string",
      width: 150
    },


  },
  
}
