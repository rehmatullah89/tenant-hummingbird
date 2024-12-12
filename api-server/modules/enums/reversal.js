const REVERSAL = Object.freeze({
  card:{
    chargeback: {
      permission_label: 'card_chargeback_reversal',
      threshold: 365
    },
    offline: {
      permission_label: 'card_offline_reversal',
      threshold: 365
    },
    refund: {
      permission_label: 'card_refund_permission',
      threshold: 365
    },
  },
  ach:{
    ach: {
      permission_label: 'ach_reversal',
      threshold: 365
    },
    refund: {
      permission_label: 'ach_refund',
      threshold: 365
    }
  },
  check:{
    nsf: {
      permission_label: 'check_reversal',
      threshold: 365
    },
    void: {
      permission_label: 'check_void_reversal',
      threshold: 1
    },
    refund: {
      permission_label: 'check_refund_reversal',
      threshold: 365
    },
  },
  cash:{
    void: {
      permission_label: 'cash_void_reversal',
      threshold: 1
    },
    refund: {
      permission_label: 'cash_refund_reversal',
      threshold: 365
    }
  },
  giftcard:{
    void: {
      permission_label: 'giftcard_void_reversal',
      threshold: 1
    },
    refund: {
      permission_label: 'giftcard_refund_reversal',
      threshold: 365
    }
  },
  credit:{
    credit: {
      permission_label: 'credit_reversal',
      threshold: 365
    }
  }
})

module.exports = REVERSAL;