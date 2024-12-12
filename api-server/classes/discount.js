"use strict";

var models  = require(__dirname + '/../models');
var settings    = require(__dirname + '/../config/settings.js');
var Promise = require('bluebird');
var QB = require('node-quickbooks');
var validator = require('validator')
var moment      = require('moment');
var e  = require(__dirname + '/../modules/error_handler.js');

class Discount {

    constructor(data){

        data = data || {};
        this.id = data.id || null;
        this.promotion_id = data.promotion_id || null;
        this.coupon_id = data.coupon_id || null;
        this.start = data.start || null;
        this.end = data.end || null;
        this.lease_id = data.lease_id || null;
        this.company_id = data.company_id || null;
        this.value = data.value || null;
        this.type = data.type || null;
        this.pretax = data.pretax || 0;
        this.msg = '';
        this.Promotion = '';
        this.name = '';
        this.round = data.round || null;
    }

    // Apply promotion to next consecutive no_of_days (anniversary manner)
    applyFixedRateConsecutiveMonths(startDate, consecutive_no_of_months) {
        this.end = startDate.clone().add(consecutive_no_of_months, 'months').subtract(1, 'day').format('YYYY-MM-DD');    
        // this.end = startDate.add(consecutive_no_of_days - 1, 'days').format('YYYY-MM-DD');
    }

    shouldMovePromotionToNextBillingDate(promotion, start_date) {
        return promotion.days_threshold && start_date.date() > promotion.days_threshold
    }

    async makeFromPromotion(connection, lease, promotion_start, months_override, promotion_end){
        let promotion = await models.Promotion.getById(connection, this.promotion_id, this.company_id)
        if(!promotion) e.th(404, 'Promotion not found');

        this.value = promotion.value;
        this.type = promotion.type;
        this.pretax = promotion.pretax || 0;
        this.round = promotion.round || null;
        this.name =  promotion.name;

        var  promo_start_date = '';
        

        
        if(promotion_start){
            promo_start_date = lease.getNextBillingDate(promotion_start.clone().subtract(1,'day'));
        } else {
            promo_start_date = moment(lease.start_date, 'YYYY-MM-DD')
        }
        

        var start = {};

        if(!this.promotion_id || !this.company_id) {
            e.th(500,'Must set promotion_id and company_id before making a discount');
        }

        
        if(promotion.offset === 0) {
            start = promo_start_date.clone();
            if(this.shouldMovePromotionToNextBillingDate(promotion, start)) {
                start = lease.getNextBillingDate(moment(lease.start_date));
            }
        } else if(promotion.offset === 1) {
            start = lease.getNextBillingDate(moment(lease.start_date));
        } else {
            start = lease.getNextBillingDate(moment(lease.start_date)).add((promotion.offset - 1 ), 'month');
        }
        /*
            1 month apply discount to current month only.
        */

        // if consecutive_pay is not true then fixRate has same rules as of % and $
        
        promotion.months = months_override || promotion.months;
        console.log("promotion_end", promotion_end)
        if(promotion_end) {
            this.end = promotion_end.format('YYYY-MM-DD');
        } else if(promotion.type == 'fixed' && promotion.consecutive_pay) {
            this.applyFixedRateConsecutiveMonths(start.clone(), promotion.months || 1);
        } else if(promotion.months === 1) {
            this.end = lease.getNextBillingDate(start.clone(), false).subtract(1, 'day').format('YYYY-MM-DD');
        } else if (promotion.months > 1){
            this.end = lease.getNextBillingDate(start.clone(), false).add(promotion.months - 1, 'months').subtract(1, 'day').format('YYYY-MM-DD');
        } else {
            this.end = null;
        }

        this.start = start.format('YYYY-MM-DD');
        return true;

    }

    calculate (amount, bill_date){
        var _this = this;

        var discAmt = 0;

        if(!_this.start || !_this.type || !_this.value ) {
            _this.msg = "Discount not set";
            return false;
        }

        if(!bill_date ) {
            _this.msg = "Bill Date parameter missing";
            return false;
        }

        // see if we should apply discount
        if(moment(bill_date, 'YYYY-MM-DD') >= moment(_this.start) && ( moment(bill_date, 'YYYY-MM-DD') < moment(_this.end)|| !_this.end) ){
            switch(_this.type){
                case 'percent':
                    discAmt = (amount * parseFloat(_this.value / 100));
                    break;
                case 'dollar':
                    discAmt = (amount - parseFloat(_this.value));
                    break;
                case 'fixed':
                    discAmt =  parseFloat(_this.value);
                    break;
            }
        }

        return discAmt;

    }

    validate(){
        try {

            if (!this.promotion_id) {
                throw 'Promotion id missing';
            }

            if (!this.start || !validator.isDate(this.start + '')) {
                throw 'Start must be a date';
            }

            if (this.end && !validator.isDate(this.end + '')) {
                throw 'End must be a date or empty';
            }

            if (!this.lease_id) {
                throw 'Lease id is missing';
            }

            // if (this.value != 0 && !this.value || !validator.isDecimal(this.value + '')) {
            //     throw 'Discount value is missing';
            // }

            if (this.type !== 'dollar' && this.type !== 'percent'  && this.type !== 'fixed') {
                throw 'Promotion type is missing or incorrect';
            }

        } catch(err){
          this.msg = err.toString();
          return false;
        }
        return true;
    }

    save(connection){
        var _this = this;

        return Promise.resolve().then(function() {

            if(!_this.validate()){
                var error = new Error(_this.msg);
                error.code = 400;
                throw error;
            }

            var save = {
                promotion_id: _this.promotion_id,
                coupon_id: _this.coupon_id,
                start: _this.start,
                end: _this.end,
                lease_id: _this.lease_id,
                value: _this.value,
                type: _this.type,
                pretax: _this.pretax,
            };
            return models.Promotion.saveDiscount(connection, save, _this.id).then(function(result){

                if(result.insertId) _this.id = result.insertId;

                return _this;
            })
        })
    }

    async find(connection){

      if(!this.id) e.th(500, "No id is set");

      let data = await models.Promotion.getDiscountById(connection, this.id);

      if(!data) e.th(404, 'Discount not found');

      this.promotion_id = data.promotion_id;
      this.coupon_id = data.coupon_id;
      this.start = moment(data.start).format('YYYY-MM-DD');
      this.end = data.end ? moment(data.end).format('YYYY-MM-DD'): null;
      this.lease_id = data.lease_id;
      this.value = data.value;
      this.type = data.type;
      this.pretax = data.pretax;

      await this.findPromotion(connection);
      this.round = this.Promotion?.round;
    }

    async delete(connection) {
        if(!this.id) e.th(500, 'Discount id not set');
        await models.Discount.delete(connection, this.id);
    }

    async findPromotion(connection){
        this.Promotion = await models.Promotion.getById(connection, this.promotion_id)
    }

    static async findIfFixedAnniversaryPromotion(connection, discounts) {
        const fixedRentMonthDiscount = discounts.find(discount => discount.type == 'fixed');
        let isAnniversaryMannerDiscount = false;
        if(fixedRentMonthDiscount) {
            let promotion = await models.Promotion.getById(connection, fixedRentMonthDiscount.promotion_id);
            if(promotion.consecutive_pay) {
                isAnniversaryMannerDiscount = true;
            }
        }
        
        return isAnniversaryMannerDiscount;
    }

    static async findActiveOnLease(connection, lease_id, due){
        let discount_list = await models.Promotion.findActiveDiscounts(connection, lease_id, due);
        let discounts = [];
        for(let i = 0; i < discount_list.length; i++ ){
            let discount = new Discount(discount_list[i]);
            await discount.find(connection);
            discounts.push(discount);
        }

        return discounts;
    }

    values(){

        var data =  {
            id:             this.id,
            promotion_id:   this.promotion_id,
            coupon_id:      this.coupon_id,
            lease_id:       this.lease_id,
            start:          this.start,
            end:            this.end,
            value:          this.value,
            type:           this.type,
            pretax:         this.pretax,
            round:          this.round
        };
        data.Promotion = this.Promotion;
        return data;
    }

    static roundDiscountAmount(amountToDiscount, discountAmount, round) {

        const discountedAmount = amountToDiscount - discountAmount;
        if(discountedAmount === 0) {
            return discountAmount;
        } 
        let roundedAmount =  RoundOff.convert({ value: discountedAmount, type: round });
        return amountToDiscount - roundedAmount;
    }
}

module.exports = Discount;

var RoundOff = require(__dirname + '/../modules/rounding.js');