"use strict";

var models  = require(__dirname + '/../models');
var moment  = require('moment');
var settings    = require(__dirname + '/../config/settings.js');

var Promise = require('bluebird');
var QB = require('node-quickbooks');
var validator = require('validator');


// class DiscountLines {
//
//     constructor(InvoiceLine, discounts){
//         var _this = this;
//         this.discounts = discounts || [];
//         this.InvoiceLine = InvoiceLine || {};
//         this.discountLines = [];
//         this.msg = '';
//         return this;
//     }
//
//     make(){
//         var _this = this;
//
//
//         if(!_this.InvoiceLine.Product){
//             _this.msg = "Product not set";
//             return false;
//         }
//         // if no discounts means nothing to do
//         if(!_this.discounts.length) return true;
//         // if product is not taxable, there is nothing to do
//         if(!_this.InvoiceLine.Product.company_id) {
//             _this.msg = "Company Id not set";
//             return false;
//         }
//
//         var lineTotal = _this.InvoiceLine.cost * _this.InvoiceLine.qty;
//
//         _this.discounts.forEach(function(discount){
//             if(_this.InvoiceLine.Product.default_type == 'rent'){  // Todo  Allow to specify products to apply this to.
//
//
//                 var discountAmount = discount.calculate(lineTotal, billday);
//                 lineTotal = lineTotal - discountAmount || 0;
//
//                 if(discountAmount > 0){
//                     _this.discountLines.push(new DiscountLine({
//                         invoice_line_id: _this.InvoiceLine.id,
//                         discount_id: discount.id,
//                         amount: discountAmount,
//                         pretax: discount.pretax,
//                         Promotion: discount.Promotion
//                     }));
//                 }
//             }
//         });
//         return _this.discountLines;
//     };
//
// }






class DiscountLine {

    constructor(data){


        var _this = this;

        this.id = data.id || null;
        this.invoice_line_id = data.invoice_line_id || null;
        this.discount_id = data.discount_id || null;
        this.amount = (Math.round(data.amount * 1e2) / 1e2) || null;
        this.pretax = (Math.round(data.pretax * 1e2) / 1e2) || 0;
        this.Promotion = data.Promotion || {};

        this.msg = '';

        return this;
    }

    validate(){
        var _this = this;
        var error = false;

        return Promise.resolve().then(() => {
            if(!_this.invoice_line_id) error =  "Missing invoice line id";
            if(!_this.discount_id) error = "Missing Discount Id";
            // if(!_this.amount) error = "Missing amount";
            if(error) {
                var e = new Error(error);
                e.code = 400;
                throw e
            }
            return true;
        });
    }

    save(connection){
        var _this = this;
        return Promise.resolve()
            .then(() => _this.validate())
            .then(() => {

                var toSave = {
                    invoice_line_id: _this.invoice_line_id,
                    discount_id: _this.discount_id,
                    amount: (Math.round(_this.amount * 1e2)/ 1e2),
                    pretax: (Math.round(_this.pretax * 1e2)/ 1e2)
                };
                
                return models.Discount.saveDiscountLine(connection, toSave, _this.id ).then(function(result){
                    if(result.insertId) _this.id = result.insertId;
                    return true;
                })
            })
    }
}
module.exports = DiscountLine;