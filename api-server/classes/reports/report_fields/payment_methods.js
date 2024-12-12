const { width } = require("pdfkit/js/page");

module.exports = {
  payment_method: {

    method_name: {
      label: "Pay Method Name",
      key: "method_name",
      group: "payment method",
      column_type: "string",
      width: 154

    },
    method_name_on_card: {
      label: "Name On Card",
      key: "method_name_on_card",
      group: "payment method",
      column_type: "string",
      width: 200
    },
    method_address: {
      label: "Payment Method Address",
      key: "method_address",
      group: "payment method",
      column_type: "string",
      width: 198
    },
    method_type: {
      label: "Method Type",
      key: "method_type",
      group: "payment method",
      column_type: "string",
      input: 'multi-select',
      options: ['Cash', 'Check', 'GiftCard', 'Card', 'ACH', 'PayPal', 'Google Payments', 'Apple Pay']
    },

    method_exp: {
      label: "Method Exp",
      key: "method_exp",
      group: "payment method",
      column_type: "date",
      format: "MM/YY",
      input: 'timeframe'
    },
    method_last_4: {
      label: "Last 4",
      key: "method_last_4",
      group: "payment method",
      column_type: "string",
      width: 90,
    },
    method_card_type: {
      label: "Type Details",
      key: "method_card_type",
      group: "payment method",
      column_type: "string"
    },
    method_acct_num: {
      label: "Acct Num",
      key: "method_acct_num",
      group: "payment method",
      column_type: "string"
    },
    method_routing_num: {
      label: "Routing Num",
      key: "method_routing_num",
      group: "payment method",
      column_type: "string"
    },

     method_is_autopay: {
       label: "Payment Method Autopay",
       key: "method_is_autopay",
       group: "payment method",
       column_type: "boolean",
       input: 'boolean',
       width: 200
     },
    // method_autopay_rent: {
    //   label: "Autopay Rent Amt.",
    //   key: "method_autopay_rent",
    //   group: "payment method",
    //
    // },
    // method_autopay_other: {
    //   label: "Autopay Other",
    //   key: "method_autopay_other",
    //   group: "payment method",
    //   column_type: "percentage"
    // },
  },
  payment_method_summary:{

    method_last_declined:{
      label: "Last Declined",
      key: "method_last_declined",
      group: "payment method",
      column_type: "date",
      input: 'timeframe'
    },
    method_times_declined:{
      label: "Times Declined",
      key: "method_times_declined",
      group: "payment method",
      column_type: "number",
      input: 'comparison'
    },
    method_last_declined_reason:{
      label: "Last Declined Reason",
      key: "method_last_declined_reason",
      group: "payment method"
    },
    method_total_payments:{
      label: "Total Payments",
      key: "method_total_payments",
      group: "payment method",
      column_type: "money",
      input: 'comparison'
    },
    method_last_billed:{
      label: "Last Billed",
      key: "method_last_billed",
      group: "payment method",
      column_type: "date",
      input: 'timeframe'
    },
    method_times_billed:{
      label: "Times Billed",
      key: "method_times_billed",
      group: "payment method",
      column_type: "number",
      input: 'comparison'
    },
    method_autopay_count:{
      label: "Times Autopaid",
      key: "method_autopay_count",
      group: "payment method",
      column_type: "number",
      input: 'comparison'
    },
    method_total_auto_pay:{
      label: "Total Autopaid",
      key: "method_total_auto_pay",
      group: "payment method",
      column_type: "money",
      input: 'comparison'
    }
  }
};
