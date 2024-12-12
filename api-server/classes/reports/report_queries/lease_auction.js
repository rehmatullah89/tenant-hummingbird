const Sql = require(__dirname + '/../../../modules/sql_snippets.js');
class AuctionQueries {
    constructor(data) {
      this.id = data.id;
      this.lease_id = data.lease_id;
      let bidder_id = ' (select contact_id from lease_auctions where id = ' + this.id + ' ) ';
      let auctioneer_id = ' (select created_by from lease_auctions where id = ' + this.id + ' ) ';
      this.queries = {
        auction_id:                        this.id,
        auction_date:                      ' (select DATE(scheduled_date) from lease_auctions where id = ' + this.id + ' )',
        auction_date_time:                 ' (select DATE_FORMAT(scheduled_date, \'%Y-%m-%dT%H:%i:%s+00:00\') from lease_auctions where id = ' + this.id + ' )',
        auction_notes:                     ' (select notes from lease_auctions where id = ' + this.id + ' )',
        auction_type:                      ' (select CONCAT(UCASE(SUBSTRING(auction_type, 1, 1)), LOWER(SUBSTRING(auction_type, 2))) from lease_auctions where id = ' + this.id + ' )',
        auction_lien_amount:               ` (if((SELECT payment_id FROM lease_auctions WHERE id = ${ this.id }) is not null,(select lien_amount from lease_auctions where id = ${this.id}),${ Sql.lease_balance(this.lease_id)} )) `,
        auction_winning_bid:               ' (select amount from lease_auctions where id = ' + this.id + ' )',
        auction_cleaning_deposit:          ' (select cleaning_deposit from lease_auctions where id = ' + this.id + ' )',
        auction_cleaning_period:           ' (select cleaning_period from lease_auctions where id = ' + this.id + ' )',
        auction_license_number:            ' (select license_number from lease_auctions where id = ' + this.id + ' )',
        auction_tax_exempt:                ` (select (select IF( (select tax_exempt from lease_auctions where id = ${this.id} ) is NULL, '', IF((select tax_exempt from lease_auctions where id = ${this.id} ) = '1', 'Yes', 'No'))))`,

        auction_auctioneer_name :          " (SELECT CONCAT(first, ' ', last ) FROM contacts WHERE id = " + auctioneer_id + ") ",
        auction_auctioneer_email :         " (SELECT email FROM contacts WHERE id = " + auctioneer_id + ") ",
        auction_auctioneer_phone:          " (SELECT phone FROM contact_phones WHERE contact_id = " + auctioneer_id + " and `primary` = 1)",

        auction_bidder_first_name :        " (SELECT first FROM contacts WHERE id = " + bidder_id + ") ",
        auction_bidder_last_name :         " (SELECT last FROM contacts WHERE id = " + bidder_id + ") ",
        auction_bidder_full_name :         " (SELECT CONCAT(first, ' ', last ) FROM contacts WHERE id = " + bidder_id + ") ",
        auction_bidder_email :             " (SELECT email FROM contacts WHERE id = " + bidder_id + ") ",
        auction_bidder_phone:              " (SELECT phone FROM contact_phones WHERE contact_id = " + bidder_id + " and `primary` = 1)",
        auction_bidder_gender :            " (SELECT gender FROM contacts WHERE id = " + bidder_id + ") ",
        auction_bidder_ssn :               " (SELECT ssn FROM contacts WHERE id = " + bidder_id + ") ",
        auction_bidder_dob :               " (SELECT dob FROM contacts WHERE id = " + bidder_id + ") ",
        auction_cleaning_deposit_charged:         `(select ((ifnull(il.cost,0) * ifnull(il.qty,0)) + ifnull(il.total_tax,0)) from invoice_lines il inner join invoices i on i.id = il.invoice_id inner join products p on p.id = il.product_id where i.id = (SELECT bid_invoice_id FROM lease_auctions WHERE id = ${ this.id }) and p.default_type = 'cleaning')`,
        auction_cleaning_deposit_due_date:        `(select i.due from invoices i inner join invoice_lines il on i.id = il.invoice_id inner join products p on p.id = il.product_id where i.id = (SELECT bid_invoice_id FROM lease_auctions WHERE id = ${ this.id }) and p.default_type = 'cleaning')`,
        auction_cleaning_deposit_paid:            `(select Sum(ifnull(ila.amount,0)) from invoice_lines il inner join invoice_lines_allocation ila on il.id = ila.invoice_line_id inner join invoices i on i.id = il.invoice_id inner join products p on p.id = il.product_id where i.id = (SELECT bid_invoice_id FROM lease_auctions WHERE id = ${ this.id }) and p.default_type = 'cleaning')`,
        auction_cleaning_deposit_payment_date:    `(select Date(date) from payments where id = (SELECT payment_id FROM lease_auctions WHERE id = ${ this.id } ))`,
        auction_cleaning_deposit_refund:          `(select amount from refunds where id = (SELECT refund_id FROM lease_auctions WHERE id = ${ this.id } ))`,
        auction_cleaning_deposit_refund_date:     `(select Date(date) from refunds where id = (SELECT refund_id FROM lease_auctions WHERE id = ${ this.id } ))`,

        auction_payment_date:              ` (SELECT p.date FROM lease_auctions la inner join payments p ON la.payment_id = p.id WHERE la.id = ${this.id}) `,
        auction_tax:                       ` (SELECT i.total_tax FROM lease_auctions la inner join invoices i ON la.bid_invoice_id = i.id WHERE la.id = ${this.id}) `,
        auction_buyer_premium_amount:      ` (SELECT laf.amount FROM lease_auction_fees laf inner join lease_auctions la ON laf.lease_auction_id = la.id WHERE la.id = ${this.id}) `,
        auction_moved_out_date:            ` (SELECT moved_out from lease_auctions WHERE id = ${this.id}) `,
        auction_retained_revenue:          ` (SELECT (IF(IFNULL(amount, 0) > IFNULL(lien_amount, 0), IFNULL(amount, 0) - IFNULL(lien_amount, 0), null)) FROM lease_auctions WHERE id = ${this.id}) `,
        auction_remaining_lien_amount:     ` (SELECT (IF(IFNULL(amount, 0) > IFNULL(lien_amount, 0), 0, IFNULL(lien_amount, 0) - IFNULL(amount, 0))) FROM lease_auctions WHERE id = ${this.id}) `,
      }
    }
  }
  
  module.exports = AuctionQueries;
  
  