const EVENTS = require('./events_enums');
const ACCOUNTING = require('../classes/accounting/utils/enums.js');
const LOGGING = require('./logging_enums');
const TENANT_PAYMENTS = require('./tenant_payments_enums');

const SETTINGS = require('./enums/settings');

const ADJUSTMENT_SUB_METHOD_DATA = Object.freeze({
    AUCTION: 'auction',
    CLEANING_DEPOSIT: 'cleaning_deposit',
    SECURITY_DEPOSIT: 'security_deposit',
    TRANSFER: 'transfer',
    MOVE_OUT: 'move_out',
    RETAINED_REVENUE: 'retained_revenue',
    INTER_PROPERTY_PAYMENT: 'inter_property_payment'
});

module.exports = {
    EVENT_TYPES: {
        LEAD: {
            NEW_WEB_RESERVATION: 'new_web_reservation',
            RESERVATION_FOLLOW_UP: 'reservation_follow_up',
            NEW_WEB_LEAD: 'new_web_lead',
            WALKIN_LEAD_RESERVATION: 'walkin_lead_reservation',
            RESERVATION_CANCELLED: 'reservation_cancelled',
            LEAD_REDIRED: 'lead_redired',
            NEW_RESERVATION: 'new_reservation',
            NEW_LEAD: 'new_lead',
            LEAD_FOLLOW_UP: 'lead_follow_up'
        },
        DELINQUECY: {
            COLLECTION_CALLS: 'collection_calls',
            OVERLOCK_SPACE: 'overlock_space',
            LOCK_REMOVAL: 'lock_removal',
            GATE_ACCESS_SUSPEND: 'gate_access_suspend',
            GATE_ACCESS_ENABLED: 'gate_access_enabled',
            FEE_ADDED: 'fee_added',
            LIEN_NOTICES: 'lien_notices',
            LOCK_CUT: 'lock_cut',
            SPACE_INVENTORY: 'space_inventory',
            AUCTION_NOTICE_ADVERTISEMENT: 'auction_notice_advertisement',
            SCHEDULE_AUCTION: 'schedule_auction',
            CUT_LOCK_SCHEDULE_AUCTION: 'cut_lock_schedule_auction',
            AUCTION_DAY: 'auction_day',
            AUCTION_PAYMENT: 'auction_payment'
        },
        TENANT: {
            MOVE_IN: 'move_in',
            MOVE_OUT: 'move_out',
            SPACE_TRANSFER: 'space_transfer',
            MOVE_IN_CANCELLED: 'move_in_cancelled',
            MOVE_OUT_CANCELLED: 'move_out_cancelled',
            TRANSFER_CANCELLED: 'transfer_cancelled',
            ACCESS_DENIED: 'access_denied',
            ACCESS_GRANTED: 'access_granted',
            CHANGE_OF_STATUS: 'change_of_status',
            GATE_CODE_ISSUE: 'gate_code_issue',
            INSURANCE_EXPIRED: 'insurance_expired',
            VEHICLE_REGISTRATION_EXPIRED: 'vehicle_registration_expired',
            ONLINE_ACCOUNT_CREATED: 'online_account_created',
            LEFT_A_REVIEW: 'left_a_review'
        },
        MAINTENANCE_SPACE_PREP: {
            MANAGER_PROPERTY_TOUR: 'manager_property_tour',
            CLEAN_PREPARE_SPACE: 'clean_&_prepare_space',
            MAINTENANCE_TICKET: 'maintenance_ticket',
        },
        MERCHANDISE: {
            RETAIL_LOW_INVENTORY: 'retail_low_inventory'
        },
        BILLING: {
            TENANT_REFUND: 'tenant_refund',
            TENANT_PAYMENT: 'tenant_payment',
            TENANT_CHARGEBACK: 'tenant_chargeback',
            CREDIT_CARD_EXPIRATION: 'credit_card_expiration',
            FAILED_CREDIT_CARD: 'failed_credit_card',
            FEES_WAIVED: 'fees_waived',
            CREDIT_ISSUED: 'credit_issued',
            VOIDS_ISSUED: 'voids_issued',
            NON_SUFFICIENT_FUNDS: 'non_sufficient_funds'
        },
        AUTOMATED_COMMUNICATION: {
            AUTHORIZE_TO_HOLD_KEYS: 'authorize_to_hold_keys',
            AUTOPAY_ENROLLMENT: 'autopay_enrollment',
            AUTOPAY_FAIL: 'autopay_fail',
            CREDIT_CARD_EXPIRATION: 'credit_card_expiration',
            CHANGE_OF_ACCESS_CODE: 'change_of_access_code',
            CHANGE_OF_ADDRESS_NOTICE: 'change_of_address_notice',
            CONFIRMATION_OF_ENTRY_ACCESS: 'confirmation_of_entry_access',
            DAMAGE_CLAIM_FORM: 'damage_claim_form',
            FACILITY_HOLIDAY_HOURS_NOTIFICATION: 'facility_holiday_hours_notification',
            FACILITY_MAINTENANCE_NOTICE: 'facility_maintenance_notice',
            GATE_ACCESS_SUSPENDED: 'gate_access_suspended',
            INSURANCE_CANCELLED: 'insurance_cancelled',
            INSURANCE_CHANGE: 'insurance_change',
            INSURANCE_DECLINE: 'insurance_decline',
            INSURANCE_ENROLLMENT: 'insurance_enrollment',
            INSURANCE_EXPIRATION_NOTICE: 'insurance_expiration_notice',
            INTENT_TO_VACATE: 'intent_to_vacate',
            INVOICE: 'invoice',
            LATE_FEE_CHARGED: 'late_fee_charged',
            RENTAL_LEASE: 'rental_lease_',
            LIEN_NOTICE: 'lien_notice',
            LOCK_CUT_INVENTORY: 'lock_cut_inventory',
            MAINTENANCE_REQUESTED: 'maintenance_requested',
            MOVE_OUT_CONFIRMATION: 'move_out_confirmation',
            NON_SUFFICIENT_FUNDS_LETTER: 'non_sufficient_funds_letter',
            RATE_CHANGE_NOTIFICATION: 'rate_change_notification',
            RECEIPT: 'receipt',
            REFUND: 'refund',
            SIGNATURE_NEEDED: 'signature_needed',
            VEHICLE_REGISTRATION_EXPIRATION_NOTICE: 'vehicle_registration_expiration_notice',
            WELCOME_LETTER: 'welcome_letter'
        },
        RATE_CHANGE:{
            REVIEW_RATE_CHANGE: 'review_rate_change_notification',
            APPROVE_RATE_CHANGE: 'approve_rate_change',
            GENERATED_RATE_CHANGE_DOCUMENTS: 'generated_rate_change_documents'
        },
        AUCTION:{
            CUT_LOCK_SCHEDULE_AUCTION: 'cut_lock_schedule_auction',
            AUCTION_DAY: 'auction_day',
            AUCTION_PAYMENT: 'auction_payment'
        }
    },
    TASK_TYPE: {
        LEASE: 'lease',
        CONTACT: 'contact',
        RATE_CHANGE: 'rate_change'
    },
    EVENT_TYPES_COLLECTION: {
            RESERVATION: ['new_web_reservation', 'reservation_follow_up', 'walkin_lead_reservation', 'new_reservation'],
            LEAD: ['new_web_lead', 'lead_follow_up', 'new_lead'],
            MOVE_OUT: ['move_out', 'clean_&_prepare_space'],
            COLLECTION_CALL: ['collection_calls'],
            OVERLOCK_SPACE: ['overlock_space'],
            LOCK_REMOVAL: ['lock_removal'],
            RATE_CHANGE: ['review_rate_change_notification', 'approve_rate_change', 'generated_rate_change_documents'],
            AUCTION: ['auction_notice_advertisement', 'schedule_auction', 'cut_lock_schedule_auction', 'auction_day', 'auction_payment'],
    },
    LEASE_TYPE: {
        MONTH_TO_MONTH: 'Month to Month',
        FIXED_LENGTH: 'Fixed Length'
    },
    SPACE_TYPES: {
        RESIDENTIAL: 'residential',
        STORAGE: 'storage',
        PARKING: 'parking'
    },
    PRODUCT_DEFAULT_TYPES: {
        RENT: 'rent',
        MERCHANDISE: 'product',
        FEE: 'late',
        INSURANCE: 'insurance',
        AUCTION: 'auction',
        SECURITY_DEPOSIT: 'security',
        CLEANING_DEPOSIT: 'cleaning',
        INTER_PROPERTY_ADJUSTMENT: 'inter_property_adjustment'
    },
    PRODUCT_TYPES: {
        RENT: 'rent',
        MERCHANDISE: 'merchandise',
        FEE: 'fee',
        INSURANCE: 'insurance',
        AUCTION: 'auction',
        DEPOSIT: 'deposit'
    },
    VEHICLE_TYPES: {
        CAR: 'car', 
        MOTOR_CYCLE: 'motorcycle', 
        BOAT: 'boat', 
        COMMERCIAL_VEHICLE: 'commercial_vehicle',
        TRAILER: 'trailer', 
        OTHER: 'other'
    },
    LEASE_AUCTION_STATUS: {
        SCHEDULE: 'schedule',
        SCHEDULED: 'scheduled',
        AUCTION_DAY: 'auction_day',
        AUCTION_PAYMENT: 'auction_payment',
        MOVE_OUT: 'move_out',
        COMPLETE: 'complete'
    },
    LEASE_STATUS: {
        CURRENT: 0,
        BALANCEDUE: 5,
        DELINQUENT: 15,
        ACTIVELIEN: 20
    },
    SPACETYPE: {
        STORAGE: 1,
        RESIDENTIAL: 2,
        PARKING: 3
    },
    CATEGORY_TYPE:{
        MOVEIN: `('movein', 'service')`,
        MOVEOUT: `('moveout', 'service')`,
        DELINQUENCY: `('delinquency', 'service')`,
        SERVICE: `('service')`,
        TRANSFER: `('service', 'transfer')`,
        MOVEINONLY: `('movein')`,
        TRANSFERONLY: `('transfer')`,
        ADJUSTMENT: `('adjustment')`,
        RENT: `('rent')`,
    },
    BILLING_PERIODS_TYPES: {
        CURRENT : "current",
        NEXT : "next"
    },
    ROUND: {
        UP_HALF: 'up_half',
        UP_FULL: 'up_full',
        DOWN_HALF: 'down_half',
        DOWN_FULL: 'down_full',
        NEAREST_HALF: 'nearest_half',
        NEAREST_FULL: 'nearest_full'
    },
    ACCOUNTING_TYPE:{
        CASH_BOOK: '0',
        ACCRUAL_BOOK: '1',
        DOUBLE_BOOK: '2'
    },
    ACCOUNTING_DESCRIPTION: {
        '0': 'cash book',
        '1': 'accrual book',
        '2': 'double book'
    },
    ACCOUNT_SUBTYPE: {
        PREPAID: "23",
        ALLOWANCE: "37",
    },
    BOOK_TYPES:{
        CASH: "0",
        ACCRUAL: "1",
    },
    AMENITY_CATEGORY:{
        SPACE_INFORMATION: 11
    },
    EVENTS: EVENTS,
    ACCOUNTING: ACCOUNTING,
    LOGGING: LOGGING,
    PRICING_TABLE: {
        OPEN_INVOICES: 'PricingTable1',
        FUTURE_CHARGES_WITH_FEE: 'PricingTable2'
    },
    TOKEN_TABLES: {
        OPEN_INVOICES: 'pt1',
        FUTURE_CHARGES_WITH_FEE: 'pt2'
    },
    DOCUMENT_TYPES: {
        SIGNED: 'signed',
        UN_SIGNED: 'un-signed'
    },
    SIGNED_DOCUMENT_TYPES: [
        { name: 'Lease', value: 'lease' },   
        { name: 'Military', value: 'military' },  
        { name: 'Coverage', value: 'enroll-coverage' },   
        { name: 'Coverage Declined', value: 'deny-coverage' },   
        { name: 'Vehicle', value: 'vehicle' }, 
        { name: 'Autopay', value: 'autopay' },
        { name: 'Other', value: 'other' }
    ],
    UPLOAD_DESTINATIONS: {
        DOCUMENT_MANAGER: 'document_manager'
    },
    ADJUSTMENT_SUB_METHOD: ADJUSTMENT_SUB_METHOD_DATA,
    NON_CREDIT_ADJUSTMENT_SUB_METHODS: {
        INTER_PROPERTY_PAYMENT: ADJUSTMENT_SUB_METHOD_DATA.INTER_PROPERTY_PAYMENT
    },
    PAYMENT_CREDIT_TYPE: {
        PAYMENT: 'payment',
        CREDIT: 'credit',
        LOSS: 'loss',
        ADJUSTMENT: 'adjustment'
    },
    TENANT_PAYMENTS: TENANT_PAYMENTS,
    SETTINGS: SETTINGS,
    TIME_SPAN: {
        FUTURE : 'future',
        PAST: 'past',
        PRESENT: 'present'
    },
    DELINQUENCY_STATUS: {
        ACTIVE: 'active',
        PAUSED: 'paused',
        CANCELLED: 'cancelled',
        COMPLETED:'completed'
    },
    LEASE_STANDING: {
        CURRENT: 'Current',
        LEASE_CLOSED: 'Lease Closed',
        BALANCE_DUE: 'Balance Due',
        AUCTION: 'Auction'
    },
    GATE_ACCESS: {
        CONTACT_STATUS: {
            SUSPENDED: 'suspended',
            ACTIVE: 'active'
        },
        VENDORS: {
            NOKE: 'noke'
        }
    },
    MERGE_DOCUMENT_TYPES: {
        DELINQUENCY: 'delinquency',
        RATE_MANAGEMENT: 'rate_management',
        RENT_MANAGEMENT: 'rent_management'
    },
    AUCTION_PRODUCTS: {
        BUYER_PREMIUM_FEE: 'buyer_premium_fee',
        REMAINING_BID: 'remaining_bid',
        RETAINED_REVENUE: 'retained_revenue'
    },
    DELINQUENCY_SOURCE: {
        ROUTINE: 'auto',
        ADMIN_MIGRATION: 'migration',
        ADMIN_DATE: 'admin',
        ADMIN_LEASE: 'admin',
        MANUAL: 'manual'
    },
    PAYMENT_ERROR: {
        GATEWAY_ERROR: 'Gateway Response: ',
        ISSUER_ERROR: 'Issuer Rejection: ',
    },
    PAYMENT_METHODS: {
        CASH: 'cash',
        CHECK: 'check',
        CARD: 'card',
        ACH: 'ach',
        CREDIT: 'credit',
        PAYPAL: 'paypal',
        AMAZON: 'amazon',
        APPLE: 'apple',
        GOOGLE: 'google',
        LOSS: 'loss',
        ADJUSTMENT: 'adjustment',
        GIFTCARD: 'giftcard'
    },
    PAYMENT_CYCLES: {
        MONTHLY: 'Monthly',
        QUARTERLY: 'Quarterly',
        ANNUAL: 'Annual'
    },
}
