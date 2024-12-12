'use strict';

module.exports = {
    AccountReceivable: require('./account_receivable.js'),
    Activity: require('./activity'),
    Allowances: require('./allowances'),
    AutoPay: require('./performance_indicators/autopay.js'),
    Credits: require('./allowances/credits_and_writeoff.js'),
    CreditsAndAdjustments: require('./adjustments.js'),
    Delinquencies: require('./delinquencies.js'),
    DepositBalance: require('./deposit_balance.js'),
    DepositsRefunds: require('./deposits_refunds.js'),
    Insurance: require('./performance_indicators/insurance.js'),
    Leads: require('./leads.js'),
    Liability: require('./liabilities.js'),
    LiabilityRecognition: require('./liability_recognition.js'),
    NetRevenue: require('./net_revenue.js'),
    Occupancy: require('./occupancy.js'),
    Overlock: require('./performance_indicators/overlock.js'),
    PrepaidLiabilities: require('./prepaid_liabilities.js'),
    ProjectedIncome: require('./projected_income.js'),    
    RentChange: require('./rent_change.js'),
    RentUnChange: require('./performance_indicators/rent_unchanged.js'),
};
