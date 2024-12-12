const SETTINGS = Object.freeze({
    ACCOUNTING: {
        recordCashBookData: {
            options: {
                both_books: 'both_books',
                cash_book_only: 'cash_book_only'
            },
            default: 'cash_book_only',
        },
        yardiExportRefColumn: {
            options: {
                transaction: 'transaction',
                management_software: 'management_software'
            },
            default: 'management_software'
        },
        yardiExportTransactionNoFormat: {
            options: {
                unique_each_transaction: 'unique_each_transaction', 
                new_sequence_new_export: 'new_sequence_new_export'
            },
            default: 'unique_each_transaction'
        },
        toggleAccounting: {
            name: 'toggleAccounting'
        },
        yardiFinancialJournalDisplayType: {
            default: 'standard JE display type'
        }
    },
    BILLING:{
        allowInterPropertyPayments: {
            name: 'allowInterPropertyPayments'
        }
    }
    
});

module.exports = SETTINGS;