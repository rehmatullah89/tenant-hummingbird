var settings    = require(__dirname + '/../config/settings.js');

var moment = require('moment');


const DiscountLine = module.exports = {

    saveDiscountLine: async (connection, data,  discount_line_id) => {
        var sql;
        if (discount_line_id) {
          sql = "UPDATE discount_line_items set ? where id = " + connection.escape(discount_line_id);
        } else {
          sql = "insert into discount_line_items set ?";
        }

        let response = await  connection.queryAsync(sql, data);


      let id = discount_line_id ? discount_line_id : response.insertId;

      if(!data.invoice_line_id){
        let dscLineSql = "select * from discount_line_items where id = " + id;
        let disc_response = await connection.queryAsync(dscLineSql);
        data.invoice_line_id = disc_response[0].invoice_line_id;
      }
      await DiscountLine.updateInvoiceLineDiscountTotal(connection, data.invoice_line_id);

      return response;

    },

    updateInvoiceLineDiscountTotal: async (connection, invoice_line_id) => {

      let sql = "SELECT SUM(IFNULL(amount,0)) as discount_total FROM discount_line_items WHERE invoice_line_id = "  + connection.escape(invoice_line_id);

      let response = await connection.queryAsync(sql);

      await Invoice.saveInvoiceLine(connection, {
        total_discounts: response[0].discount_total
      }, invoice_line_id)


      // let sql = "UPDATE invoice_lines set total_discount = (SELECT SUM(amount) FROM discount_line_items WHERE invoice_line_id = invoice_lines.id) where invoice_lines.id = "  + connection.escape(invoice_line_id);
      // return await connection.queryAsync(sql);
    },

    findByDiscountLineByInvoiceLineId:function(connection, invoice_line_id){

        var sql = "Select * from discount_line_items where invoice_line_id = " + connection.escape(invoice_line_id);

        return connection.queryAsync(sql);
    },

    getDiscountLineItems:function(connection, discount_id){

      var sql = "select * from discount_line_items where discount_id = " + connection.escape(discount_id);

      return connection.queryAsync(sql);
    },

    async findIfActivePromotionStarted(connection, lease_id, date) {
      let sql = `select * from discounts where lease_id = ${connection.escape(lease_id)} and end > ${connection.escape(date)}`;
      let response = await connection.queryAsync(sql);
      return response.length > 0 ? true : false;
    },

    async findIfActivePromotionEnding(connection, lease_id, date) {
      let sql = `select * from discounts where lease_id = ${connection.escape(lease_id)} and end = ${connection.escape(date)}`;
      let response = await connection.queryAsync(sql);
      return response.length > 0 ? true : false;
    },

    async delete(connection, discountID) {
      let sql = `Delete from discounts where id = ${connection.escape(discountID)}`;
      return connection.queryAsync(sql);
    }, 

    async findFixRateConsecutivePayPromotion(connection, payload) {
      const { lease_id, date } = payload;
      
      let sql = `
        select * from discounts d
        join promotions p on d.promotion_id = p.id 
        where d.lease_id = ${connection.escape(lease_id)} and d.type = 'fixed' and d.end > ${connection.escape(date)} and p.consecutive_pay = 1;
      `;

      return connection.queryAsync(sql);
    },

    async findDiscountLinesByInvoiceIds(connection, invoice_line_ids) {
      let sql = `
      SELECT 
        dli.id, dli.invoice_line_id, p.id AS promotion_id, p.description, p.label, dli.amount 
      FROM 
        discount_line_items dli 
        INNER JOIN discounts d ON dli.discount_id = d.id
        INNER JOIN promotions p ON d.promotion_id = p.id
      WHERE dli.invoice_line_id IN (${invoice_line_ids});
      `;
      return connection.queryAsync(sql).then(res => { return res.length ? res : [] });
    },

    async deleteLeasesFromDiscountsByIds(connection, discount_ids = []) {
        if (discount_ids.length == 0) return null;
        let sql = `Update discounts set lease_id = NULL, value = 0 where id in(${discount_ids.map(d_id => connection.escape(d_id)).join(', ')});`;
        console.log("deleteLeasesFromDiscountsByIds-sql ", sql);
        return connection.queryAsync(sql);
    },
};


module.exports = DiscountLine;
const Invoice = require(__dirname + '/./invoices.js');

