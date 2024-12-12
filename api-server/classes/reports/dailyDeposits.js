'use strict';
var moment      = require('moment');
var models      = require(__dirname + '/../../models');

class DailyDeposits {
  constructor(connection, company, date, properties) {
    this.company =  company;
    this.connection =  connection;
    this.properties = properties;
    this.date = date;
  }

  async generate(){
      await this.calculateDailyPaymentDeposits();
      await this.calculateReceipts();
      await this.calculateRefund();
      await this.calculatePaymentsCollected();
      await this.calculatePaymentsReceived();

      return {
        payment_deposits: {
          ...this.payment_deposits
        },
        card_deposits: {
          ...this.card_deposits
        },
        receipts: {
          ...this.receipts
        },
        refund: {
          ...this.refund
        },
        payments_collected: {
          ...this.payments_collected
        },
        payments_received: {
          ...this.payments_received
        }

      }
  }

  async calculateDailyPaymentDeposits(){

    let dailyDeposits = await this.getDepositDetails(this.connection, { date: this.date }, this.properties);
    let cardDeposits = await this.getDepositDetails(this.connection, { date: this.date }, this.properties, true);
    this.payment_deposits = dailyDeposits;
    this.card_deposits = cardDeposits;
  }

  async calculateReceipts(){

    let dailyDeposits = await DepositRefunds.detailRevenueReceipts(this.connection, this.date, this.properties);
    let TotalSpace = dailyDeposits && dailyDeposits.length;
    let TotalAmount = dailyDeposits && dailyDeposits.length && dailyDeposits.reduce((a, p) => a + p.amount, 0);


    this.receipts = {
      receipts_data : [...dailyDeposits], 
      total:{
        spaces : TotalSpace,
        amount : TotalAmount,
      }
    }

  }

  async calculatePaymentsCollected(){

    let payment_collected = await DepositRefunds.paymentCollectedReceipt(this.connection, this.date, this.properties);
    let TotalSpace = payment_collected && payment_collected.length;
    let TotalAmount = payment_collected && payment_collected.length && payment_collected.reduce((a, p) => a + p.amount, 0);
    
    this.payments_collected = {
      payments_collected_data : [...payment_collected], 
      total:{
        spaces : TotalSpace,
        amount : TotalAmount,
      }
    }

  }

  async calculatePaymentsReceived(){
    let payment_received = await DepositRefunds.paymentReceivedReceipt(this.connection, this.date, this.properties);
    let TotalSpace = payment_received && payment_received.length;
    let TotalAmount = payment_received && payment_received.length && payment_received.reduce((a, p) => a + p.amount, 0);


    this.payments_received = {
      payments_received_data : [...payment_received], 
      total:{
        spaces : TotalSpace,
        amount : TotalAmount,
      }
    }
    
  }

  async calculateRefund(){

    let dailyRefunds = await DepositRefunds.detailReversalsReceipt(this.connection, this.date, this.properties);
    let TotalSpace = dailyRefunds && dailyRefunds.length;
    let TotalAmount = dailyRefunds && dailyRefunds.length && dailyRefunds.reduce((a, p) => a + p.amount, 0);

    this.refund = {
      refund_data :[...dailyRefunds], 
      total:{
        spaces : TotalSpace,
        amount : TotalAmount,
      }
    }

  }

  async getDepositDetails(connection, params, properties, cardOnly = false){

    let { date } = params;
    let physicalMethods = [ 'cash', 'check', 'giftcard'];
    let cardMethods = [ 'visa', 'mastercard', 'amex', 'discover' ];
    let electronicMethod = [ 'ach', ...( !cardOnly ? ['card'] : cardMethods) ];
    let allMethods = cardOnly ? [...cardMethods] : [...physicalMethods, ...electronicMethod];

    if(!date) date = moment().format('YYYY-MM-DD');

    let result = await DepositRefunds.detailDeposits(connection, {date}, properties, cardOnly);
    let detail = {}, physicalTotal = {}, electronicTotal = {}, total = {};
    detail.date = date;

    let feesList = result.filter(r => r.fee_name).map(a => a.fee_name).filter((item, i, ar) => ar.indexOf(item) === i);

    for(let i = 0; i < allMethods.length; i++){
      let method = allMethods[i];
      let methodDetails = result.filter(x => x.date == date && x.method == method );

      detail[method] = {};

      let methodDetail = methodDetails.find(x => !x.fee_name);
      detail[method] = {
        rent: methodDetail ? methodDetail.rent : 0,
        insurance: methodDetail ? methodDetail.insurance : 0,
        merchandise: methodDetail ? methodDetail.merchandise : 0,
        auction: methodDetail ? methodDetail.auction : 0,
        deposits: methodDetail ? methodDetail.deposits : 0,
        fees: methodDetail ? methodDetail.fees : 0,
        inter_property_payments: methodDetail ? methodDetail.inter_property_payments : 0,
        tax: methodDetail ? methodDetail.tax : 0,
        others: methodDetail ? methodDetail.others : 0,
        sub_total: methodDetail ? methodDetail.sub_total : 0,
        refund: methodDetail ? methodDetail.refund : 0,
        totals: methodDetail ? methodDetail.totals : 0,
      }

      let feeDetails = methodDetails.filter(x => x.fee_name);

      if(feesList && feesList.length){
        let fees_details = [];
        for (const fee_name of feesList) {
          let fee_value = feeDetails.find(fd => fd.fee_name == fee_name);
          let fee = {
            name: fee_name,
            value: fee_value ? fee_value.fees : 0,
            tax: fee_value ? fee_value.tax : 0,
          }
          fees_details.push(fee);
          
          if(fee_value){
            detail[method].fees = Math.round( ( detail[method].fees + fee_value.fees ) *1e2) /1e2;
            detail[method].sub_total = Math.round( ( detail[method].sub_total + fee_value.sub_total ) *1e2) /1e2;
            detail[method].totals = Math.round( ( detail[method].totals + fee_value.totals ) *1e2) /1e2;
            detail[method].refund = Math.round( ( detail[method].refund + fee_value.refund ) *1e2) /1e2;
            detail[method].tax = rounding.round(detail[method].tax + fee_value.tax);
          }
        }

        detail[method].fees_details = fees_details;
      }

      function addTotalFee(total, fee){
        if(!total["fees_details"]) total["fees_details"] = [];
    
        let feeExist = total["fees_details"].find(x => x.name == fee.name);
        if(feeExist){
          total["fees_details"].find(x => x.name == fee.name).value = Math.round( ( total["fees_details"].find(x => x.name == fee.name).value + fee.value ) *1e2) /1e2;
        } else {
          total["fees_details"].push({...fee});
        }
      }

      for (let [key, value] of Object.entries(detail[method])) {

        if(key == 'fees_details'){
          for (const fee of value){
            if(physicalMethods.indexOf(method) > -1 ){
              addTotalFee(physicalTotal, fee);
            } else {
              addTotalFee(electronicTotal, fee);
            }
            addTotalFee(total, fee);
          }
        } else {
          if(physicalMethods.indexOf(method) > -1 ){
            physicalTotal[key] = !physicalTotal[key] ? value : Math.round( ( physicalTotal[key] + value ) *1e2) /1e2;
          } else {
            electronicTotal[key] = !electronicTotal[key] ? value : Math.round( ( electronicTotal[key] + value ) *1e2) /1e2;
          }
          total[key] = !total[key] ? value : Math.round( ( total[key] + value ) *1e2) /1e2;
        }
      }
      
    }

    if(!cardOnly){
      detail.physical = physicalTotal;
      detail.electronic = electronicTotal;
    }
    
    detail.total = total;
    
    return detail;
  }

  wrapText(value, limit, seprator = ' ') {
    let words = value.split(seprator);
    let subRows = [];
    let str = ''
    if (words[0].length) {
      str = words[0];
      if (str.length > limit){
        subRows = this.splitText(words[0],limit);
      } else {
        subRows.push(words[0]);
      }
    }

    for (var i = 1; i < words.length; i++) {
      if (words[i].length + subRows[subRows.length - 1].length < limit) {
        subRows[subRows.length - 1] = `${subRows[subRows.length - 1]}${seprator}${words[i]}`;
      } else {
        str = words[i];
        if (str.length > limit){
          subRows.concat(this.splitText(words[i],limit));
        } else {
          subRows.push(words[i]);
        }
      }
    }
    return subRows;
  }
}

module.exports = DailyDeposits;

var DepositRefunds = require(__dirname + '/../../models/msr/deposits_refunds.js');
const rounding = require('../../modules/rounding');