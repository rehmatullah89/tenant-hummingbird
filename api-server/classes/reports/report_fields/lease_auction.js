module.exports = {
    auction: {
        auction_date: {
            label: "Auction Date",
            key: "auction_date",
            group: "auction",
            column_type: "date",
            input: "timeframe",
            width: 150
        },
        auction_date_time: {
          label: "Auction Date and Time",
          key: "auction_date_time",
          group: "auction",
          column_type: "date",
          input: "timeframe",
          width: 200
        },
        auction_notes: {
            label: "Auction Notes",
            key: "auction_notes",
            group: "auction",
            column_type: "string",
            width: 150
        },
        auction_type: {
            label: "Auction Type",
            key: "auction_type",
            group: "auction",
            input: 'multi-select',
            options: ['Online', 'Hollar'],
            width: 130
        },
        auction_lien_amount: {
            label: "Lien Amount",
            key: "auction_lien_amount",
            group: "auction",
            column_type: "money",
            width: 125
        },
        auction_winning_bid: {
            label: "Winning Bid",
            key: "auction_winning_bid",
            group: "auction",
            column_type: "money",
            width: 120
        },
        auction_cleaning_deposit: {
            label: "Cleaning Deposit",
            key: "auction_cleaning_deposit",
            group: "auction",
            column_type: "money",
            width: 120
        },
        auction_cleaning_period: {
            label: "Cleaning Period",
            key: "auction_cleaning_period",
            group: "auction",
            input: "comparison",
            width: 188
        },
        auction_license_number: {
            label: "License Number",
            key: "auction_license_number",
            group: "auction",
            column_type: "string",
            input: 'text',
            width: 150
        },
        auction_tax_exempt: {
            label: "Tax Exempt",
            key: "auction_tax_exempt",
            group: "auction",
            input: "multi-select",
            options: ['Yes', 'No'],
            width: 140
        },
        auction_cleaning_deposit_charged: {
            label: "Cleaning Deposit Charged",
            key: "auction_cleaning_deposit_charged",
            group: "auction",
            column_type: "money",
            width: 220
        },
        auction_cleaning_deposit_due_date: {
            label: "Cleaning Deposit Due Date",
            key: "auction_cleaning_deposit_due_date",
            group: "auction",
            column_type: "date",
            input: "timeframe",
            width: 220
        },
        auction_cleaning_deposit_paid: {
            label: "Cleaning Deposit Paid",
            key: "auction_cleaning_deposit_paid",
            group: "auction",
            column_type: "money",
            width: 200
        },
        auction_cleaning_deposit_payment_date: {
            label: "Cleaning Deposit Payment Date",
            key: "auction_cleaning_deposit_payment_date",
            group: "auction",
            column_type: "date",
            input: "timeframe",
            width: 250
        },
        auction_cleaning_deposit_refund: {
            label: "Cleaning Deposit Refund",
            key: "auction_cleaning_deposit_refund",
            group: "auction",
            column_type: "money",
            width: 200
        },
        auction_cleaning_deposit_refund_date: {
            label: "Cleaning Deposit Refund Date",
            key: "auction_cleaning_deposit_refund_date",
            group: "auction",
            column_type: "date",
            input: "timeframe",
            width: 240
        },
        auction_payment_date: {
            label: "Payment Date",
            key: "auction_payment_date",
            group: "auction",
            column_type: "date",
            input: "timeframe",
            width: 150
        },
        auction_tax: {
            label: "Auction Tax",
            key: "auction_tax",
            group: "auction",
            column_type: "money",
            width: 120
        },
        auction_buyer_premium_amount: {
            label: "Buyer Premium Amount",
            key: "auction_buyer_premium_amount",
            group: "auction",
            column_type: "money",
            width: 120
        },

        auction_moved_out_date: {
            label: "Moved Out Date",
            key: "auction_moved_out_date",
            group: "auction",
            column_type: "date",
            input: "timeframe",
            width: 150
        },
        auction_retained_revenue: {
            label: "Retained Revenue",
            key: "auction_retained_revenue",
            group: "auction",
            column_type: "money",
            width: 120
        },
        auction_remaining_lien_amount: {
            label: "Remaining Lien Amount",
            key: "auction_remaining_lien_amount",
            group: "auction",
            column_type: "money",
            width: 120
        },
    },
    auction_bidder_info: {
        auction_bidder_first_name: {
            label: "Bidder First Name",
            key: "auction_bidder_first_name",
            group: "auction",
            column_type: "string",
            input: 'text',
            width: 140
        },
        auction_bidder_last_name: {
            label: "Bidder Last Name",
            key: "auction_bidder_last_name",
            group: "auction",
            column_type: "string",
            input: 'text',
            width: 140
        },
        auction_bidder_full_name: {
            label: "Bidder Name",
            key: "auction_bidder_full_name",
            group: "auction",
            column_type: "string",
            width: 140
        },
        auction_bidder_email: {
            label: "Bidder Email",
            key: "auction_bidder_email",
            group: "auction",
            column_type: "string",
            input: 'text',
            width: 175
        },
        auction_bidder_phone: {
            label: "Bidder Phone",
            key: "auction_bidder_phone",
            group: "auction",
            column_type: "phone",
            width: 138
        },
        // auction_bidder_gender: {
        //     label: "Bidder Gender",
        //     key: "auction_bidder_gender",
        //     group: "auction",
        //     options: ['Male', 'Female', ' - '],
        //     width: 122
        // },
        // auction_bidder_ssn: {
        //     label: "Bidder SSN",
        //     key: "auction_bidder_ssn",
        //     group: "auction",
        //     column_type: "string",
        //     input: 'text',
        //     width: 117
        // },
        // auction_bidder_dob: {
        //     label: "Bidder DOB",
        //     key: "auction_bidder_dob",
        //     group: "auction",
        //     column_type: "date",
        //     width: 150
        // }

    },
    auction_auctioneer_info: {
        auction_auctioneer_name: {
            label: "Auctioneer",
            key: "auction_auctioneer_name",
            group: "auction",
            column_type: "string",
            width: 120
        },
        auction_auctioneer_email: {
            label: "Auctioneer Email",
            key: "auction_auctioneer_email",
            group: "auction",
            column_type: "string",
            input: 'text',
            width: 160
        },
        auction_auctioneer_phone: {
            label: "Auctioneer Phone",
            key: "auction_auctioneer_phone",
            group: "auction",
            column_type: "phone",
            width: 155
        },
    }
}
