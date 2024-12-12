module.exports = {
    EVENTS:{
        GENERATING_INVOICE: 1,
        VOIDING_INVOICE: 2,
        POSTING_PAYMENT: 3,
        REVENUE_RECOGNITION: 4,
        REFUNDS: 5,
        WRITE_OFF: 6,
        ALLOWANCE: 7,
        PAYMENT_WITH_CREDITS: 8,
        POSTING_EXCESS_PAYMENT: 9,
        POSTING_EXCESS_CREDIT_PAYMENT: 10,
        INTER_PROPERTY_PAYMENT: 11
    },
    TRANNUM_ORDER: {
        DEFAULT: 1,
        REFUNDS: 2
    },
    TAX_TYPE:{
        PRODUCT: 'merchandise',
        LATE: 'fee',
        INSURANCE: 'insurance',
        AUCTION: 'auction',
        SECURITY: 'deposit',
        CLEANING: 'deposit'
    },
    GL_SUBTYPES:{
        DEFAULT_CARD_PAYMENT: 72
    },
    OBJECT_IDS: {
        INVOICE: 'invoice_id',
        PAYMENT: 'payment_id',
        REFUND: 'refund_id',
        INVOICE_PAYMENT_BREAKDOWN: 'invoice_payment_breakdown_id'
    },
    GL_SUB_TYPES: {
        STORAGE_RENT: 'storage_rent',
        PARKING_RENT: 'parking_rent',
        CLEANING_DEPOSIT: 'cleaning_deposit',
        SECURITY: 'security',
        INTER_PROPERTY_ADJUSTMENT: 'inter_property_adjustment',

        RETAINED_REVENUE: 'retained_revenue',       
        BUYER_PREMIUM_FEE: 'buyer_premium_fee',     

        ACH_CHECKING: 'ach_checking',
        ACH_SAVINGS: 'ach_savings',
        CARD_AMEX: 'card_amex',
        CARD_VISA: 'card_visa',
        CARD_MASTERCARD: 'card_mastercard',
        CARD_DISCOVER: 'card_discover',
        CASH: 'cash',
        CHECK: 'check',
        CREDIT: 'credit',
        GIFTCARD: 'giftcard',
        INTER_PROPERTY_PAYMENT: 'inter_property_payment',
        
        CONCESSIONS: 'concessions',
        SALES_TAX: 'sales_tax'
    },
    NOTES: {
        INVERTED_INTER_PROPERTY_INVOICE: 'inverted_inter_property_invoice'
    }
}
