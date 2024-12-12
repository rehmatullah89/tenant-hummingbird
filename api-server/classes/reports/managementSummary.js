'use strict';
var moment      = require('moment');
var models      = require(__dirname + '/../../models');
var Enums       = require(__dirname + '/../../modules/enums.js');
const msrModels = require(__dirname + '/../../models/msr');
const rounding  = require(__dirname + '/../../modules/rounding.js');

class ManagementSummary {

  constructor(connection, company, date, properties, type) {
    this.company =  company;
    this.connection =  connection;
    this.properties = properties;
    this.date = date;
    this.type = type ||  Enums.REPORTS.MSR_TYPE.CASH;
    this.revenue_mtd = {};
    this.previous_mtd = {};

    this.revenue_ytd = {};
    this.previous_ytd = {};
    this.deliquencies = {};
    this.rental_activity = {};
    this.leads = {};
    this.occupancy = {};
    this.rented_units = '';
    this.rented_sqft = '';
    this.total_units = '';
    this.total_sqft = '';
    this.auto_pay = {};
    this.insurance = {};
    this.overlocks = {};
    this.lead_sources = {};
    this.liabilities = {};
    this.liability_recognition = {};
    this.account_receivable = {};
    this.deposit_balance = {};

    this.deposits = {};
    this.revenue = {};
    this.refunds = {};
    this.occupancy_breakdown = {};
    this.discounts = {};
    this.credits = {};
    this.writeOffs = {};
    this.moveIns = {};
    this.moveOuts = {};
    this.reservedUnits = {};
    this.occupiedUnitsExcludingComplimentary = {};
    this.compilmentaryUnits = {};
    this.totalUnits = {};
    this.unRentableUnits = {};
    this.reservedUnits2 = {};
    this.delinquentTenants = {};
    this.autoPay = {};
    this.insurance = {};
    this.rentChange = {};
    this.delinquentTenantsLedger = {};
    this.delinquentTenantsLedger2 = {};
    this.currentMonthRevenue = {};
    this.lastMonthRevenue = {};
    this.currentYearRevenue = {};
    this.lastYearRevenue = {};
    this.baseRates = {};
    this.spaeMetrics = {};
    this.prepaid_liabilities = {};
    this.credits_and_adjustments = {};
    this.revenue_by_products = {};
  }

  async generate() {
    await this.getUnits();
    await this.getDeposits();
    await this.getAllownces();

    await this.getTransfers();
    await this.getMoveIns();
    await this.getMoveOuts();
    await this.getReservedUnits();
    await this.getRentChange();

    await this.getLeads();
    await this.getOccupancyBreakdown();
    await this.getSpaceMetrices();
    await this.getAutoPay();
    await this.getInsurance();
    await this.getOverlock();
    await this.getUnchangedRent();
    await this.getDelinquentTenantsLedger();

    await this.getOccupancyDetails();
    // await this.getBaseRates();

    let res_details;

    if(this.type === Enums.REPORTS.MSR_TYPE.ACCRUAL){
      await this.getAccNetIncome();
      await this.getLiabilityRecognition();
      await this.getCreditsAndAdjustments();
      await this.getRevenueByProductType();
      await this.getPrepaidLiabilities();
      await this.getAccountReceivable();
      await this.getDepositBalance();
      await this.getProductRevenuesAccrual();

      res_details = {
        liability_recognition: this.liability_recognition,
        revenue_by_products: this.revenue_by_products,
        prepaid_liabilities: this.prepaid_liabilities,
        credits_and_adjustments: this.credits_and_adjustments,
        account_receivable: this.account_receivable,
        deposit_balance: this.deposit_balance,
        
      }
    } else {
      await this.getRevenues();
      await this.getLiabilities();
      await this.getProductRevenues();

      res_details = {
        liabilities: this.liabilities,
      }   
    }

    let response = {
      totalUnits: this.totalUnits,
      payment_deposits: this.deposits,
      allowances: {
        discounts: this.discounts,
        credits: this.credits,
        write_offs: this.write_offs
      },
      rental_activity: {
        move_ins: this.moveIns,
        move_out: this.moveOuts,
        transfers: this.transfers,
        reservations: this.reservations
      },
      deliquencies: this.deliquencies,
      net_revenue: {
        revenue_mtd: this.currentMonthRevenue,
        previous_mtd: this.lastMonthRevenue,
        revenue_ytd: this.currentYearRevenue,
        previous_ytd: this.lastYearRevenue
      },
      auto_pay: this.autoPay,
      insurance: this.insurance,
      overlock: this.overlock,
      rentUnchanged: this.rentUnchanged,
      occupancy_breakdown: this.occupancy_breakdown,
      occupancy: this.occupancy,
      leads_data: this.leads,
      rent_change_summary: this.rentChange,
      space_metrics: this.space_metrics,
      reservations: this.reservations,
      revenue: this.revenue,
      ...res_details
    };

    return response;
  }

  async getUnits(){
    let unitDetailRes = await msrModels.Activity.totalUnitsByProperty(this.connection, this.date, this.properties);
    let unitDetail = unitDetailRes?.length && unitDetailRes[0];

    this.totalUnits = {
      count: unitDetail.total_ ? parseInt(unitDetail.total_) : 0,
      sqft: unitDetail.total_sqft_ ? parseFloat(unitDetail.total_sqft_) : 0,
      base_rent: unitDetail.total_baserent_ ? parseFloat(unitDetail.total_baserent_) : 0
    }
  }

  async getRefunds() {
    const monthStartDate = this.getFirstDayOfMonth(this.date);
    const yearStartDate = this.getFirstDayOfYear(this.date);

    const refunds = await msrModels.DepositsRefunds.summaryRefunds(this.connection, this.date, this.properties, monthStartDate, yearStartDate);
    return refunds;
  }

  async getDeposits() {
    const monthStartDate = this.getFirstDayOfMonth(this.date);
    const yearStartDate = this.getFirstDayOfYear(this.date);

    const deposits = await msrModels.DepositsRefunds.summaryDeposits(this.connection, this.date, this.properties, monthStartDate, yearStartDate);
    const dateInfo = deposits.find(deposit => deposit.payment_date != null) || {};
    const monthInfo = deposits.find(deposit => deposit.payment_month != null && deposit.payment_date == null) || {};
    const yearInfo = deposits.find(deposit => deposit.payment_year != null && deposit.payment_month == null) || {};

    const refunds = await this.getRefunds(this.connection, this.date, this.properties, monthStartDate, yearStartDate);
    const refundsDateInfo = refunds.find(refund => refund.refund_date != null) || {};
    const refundsMonthInfo = refunds.find(refund => refund.refund_month != null && refund.refund_date == null) || {};
    const refundsYearInfo = refunds.find(refund => refund.refund_year != null && refund.refund_month == null) || {};

    this.deposits = {
      cash: {
        daily: dateInfo.cash_ ? parseFloat(dateInfo.cash_) : 0,
        mtd: monthInfo.cash_ ? parseFloat(monthInfo.cash_) : 0,
        ytd: yearInfo.cash_ ? parseFloat(yearInfo.cash_) : 0
      },
      check: {
        daily: dateInfo.check_ ? parseFloat(dateInfo.check_) : 0,
        mtd: monthInfo.check_ ? parseFloat(monthInfo.check_) : 0,
        ytd: yearInfo.check_ ? parseFloat(yearInfo.check_) : 0
      },
      ach: {
        daily: dateInfo.ach_ ? parseFloat(dateInfo.ach_) : 0,
        mtd: monthInfo.ach_ ? parseFloat(monthInfo.ach_) : 0,
        ytd: yearInfo.ach_ ? parseFloat(yearInfo.ach_) : 0
      },
      card: {
        daily: dateInfo.card_ ? parseFloat(dateInfo.card_) : 0,
        mtd: monthInfo.card_ ? parseFloat(monthInfo.card_) : 0,
        ytd: yearInfo.card_ ? parseFloat(yearInfo.card_) : 0
      },
      giftcard: {
        daily: dateInfo.giftcard_ ? parseFloat(dateInfo.giftcard_) : 0,
        mtd: monthInfo.giftcard_ ? parseFloat(monthInfo.giftcard_) : 0,
        ytd: yearInfo.giftcard_ ? parseFloat(yearInfo.giftcard_) : 0
      }
    }

    let subtotal = {
      daily: 0,
      mtd: 0,
      ytd: 0
    };

    for (let [key, value] of Object.entries(this.deposits)) {
      subtotal.daily += this.deposits[key].daily;
      subtotal.mtd += this.deposits[key].mtd;
      subtotal.ytd += this.deposits[key].ytd;
    }

    this.deposits.subtotal = subtotal;

    this.deposits.reversals = {
      daily: refundsDateInfo.refund_ ? (parseFloat(refundsDateInfo.refund_) * -1) : 0,
      mtd: refundsMonthInfo.refund_ ? (parseFloat(refundsMonthInfo.refund_) * -1) : 0,
      ytd: refundsYearInfo.refund_ ? (parseFloat(refundsYearInfo.refund_) * -1) : 0
    };

    this.deposits.total = {
      daily: this.deposits.subtotal.daily + this.deposits.reversals.daily,
      mtd: this.deposits.subtotal.mtd + this.deposits.reversals.mtd,
      ytd: this.deposits.subtotal.ytd + this.deposits.reversals.ytd
    };
  }

  async getCreditsAndAdjustments(){
    const monthStartDate = this.getFirstDayOfMonth(this.date);
    const yearStartDate = this.getFirstDayOfYear(this.date);

    const credits_and_adjustments = await msrModels.CreditsAndAdjustments.summaryAdjustmentsAndCredits(this.connection, this.date, this.properties, monthStartDate, yearStartDate);
   
    const dateInfo = credits_and_adjustments.filter(adj => adj.adjustment_date != null) || [];
    const monthInfo = credits_and_adjustments.filter(adj => adj.adjustment_month != null && adj.adjustment_date == null) || [];
    const yearInfo = credits_and_adjustments.filter(adj => adj.adjustment_year != null && adj.adjustment_month == null) || [];
    
    this.credits_and_adjustments = {
      credits: {
        daily: dateInfo.find(adj => adj.adjustment_credit === 'credit')?.amount,
        mtd:  monthInfo.find(adj => adj.adjustment_credit === 'credit')?.amount,
        ytd:  yearInfo.find(adj => adj.adjustment_credit === 'credit')?.amount,
      },
      transfers: {
        daily: dateInfo.find(adj => adj.adjustment_credit === 'transfer')?.amount,
        mtd:  monthInfo.find(adj => adj.adjustment_credit === 'transfer')?.amount,
        ytd:  yearInfo.find(adj => adj.adjustment_credit === 'transfer')?.amount,
      },
      auctions: {
        daily: dateInfo.find(adj => adj.adjustment_credit === 'auction')?.amount,
        mtd:  monthInfo.find(adj => adj.adjustment_credit === 'auction')?.amount,
        ytd:  yearInfo.find(adj => adj.adjustment_credit === 'auction')?.amount,
      },
      move_out: {
        daily: dateInfo.find(adj => adj.adjustment_credit === 'move_out')?.amount,
        mtd:  monthInfo.find(adj => adj.adjustment_credit === 'move_out')?.amount,
        ytd:  yearInfo.find(adj => adj.adjustment_credit === 'move_out')?.amount,
      },
      security: {
        daily: dateInfo.find(adj => adj.adjustment_credit === 'security_deposit')?.amount,
        mtd:  monthInfo.find(adj => adj.adjustment_credit === 'security_deposit')?.amount,
        ytd:  yearInfo.find(adj => adj.adjustment_credit === 'security_deposit')?.amount,
      },
      cleaning: {
        daily: dateInfo.find(adj => adj.adjustment_credit === 'cleaning_deposit')?.amount,
        mtd:  monthInfo.find(adj => adj.adjustment_credit === 'cleaning_deposit')?.amount,
        ytd:  yearInfo.find(adj => adj.adjustment_credit === 'cleaning_deposit')?.amount,
      }

    }

    for(let key in this.credits_and_adjustments){
      if(!this.credits_and_adjustments[key].daily) this.credits_and_adjustments[key].daily = 0
      if(!this.credits_and_adjustments[key].mtd) this.credits_and_adjustments[key].mtd = 0
      if(!this.credits_and_adjustments[key].ytd) this.credits_and_adjustments[key].ytd = 0
    }

    let total = {
      daily: 0,
      mtd: 0,
      ytd: 0
    };

    for (let [key, value] of Object.entries(this.credits_and_adjustments)) {
      total.daily = rounding.round(total.daily + this.credits_and_adjustments[key].daily);
      total.mtd = rounding.round(total.mtd + this.credits_and_adjustments[key].mtd);
      total.ytd = rounding.round(total.ytd + this.credits_and_adjustments[key].ytd);
    }

    this.credits_and_adjustments.total = total;
    return this.credits_and_adjustments;
  }

  async getDiscounts() {
    const monthStartDate = this.getFirstDayOfMonth(this.date);
    const yearStartDate = this.getFirstDayOfYear(this.date);

    const discounts = await msrModels.Allowances.summarizedDiscounts(this.connection, this.date, this.properties, monthStartDate, yearStartDate);

    const dateInfo = discounts.find(discount => discount.invoice_due_date != null) || {};
    const monthInfo = discounts.find(discount => discount.invoice_month != null && discount.invoice_due_date == null) || {};
    const yearInfo = discounts.find(discount => discount.invoice_due_date == null && discount.invoice_month == null) || {};

    this.discounts = {
      daily: dateInfo.discounts_ ? parseFloat(dateInfo.discounts_) : 0,
      mtd: monthInfo.discounts_ ? parseFloat(monthInfo.discounts_) : 0,
      ytd: yearInfo.discounts_ ? parseFloat(yearInfo.discounts_) : 0,
    };
  }

  async getCreditsWithWriteOffs() {
    const monthStartDate = this.getFirstDayOfMonth(this.date);
    const yearStartDate = this.getFirstDayOfYear(this.date);

    const creditsWithWriteOffs = await msrModels.Allowances.summarizedCreditsWithWriteOffs(this.connection, this.date, this.properties, monthStartDate, yearStartDate);

    const dateInfo = creditsWithWriteOffs.find(cr => cr.credit_date != null) || {};
    const monthInfo = creditsWithWriteOffs.find(cr => cr.credit_month != null && cr.credit_date == null) || {};
    const yearInfo = creditsWithWriteOffs.find(cr => cr.credit_date == null && cr.credit_month == null) || {};

    this.credits = {
      daily: dateInfo.credit_ ? parseFloat(dateInfo.credit_) : 0,
      mtd: monthInfo.credit_ ? parseFloat(monthInfo.credit_) : 0,
      ytd: yearInfo.credit_ ? parseFloat(yearInfo.credit_) : 0
    }

    this.write_offs = {
      daily: dateInfo.writeoffs_ ? parseFloat(dateInfo.writeoffs_) : 0,
      mtd: monthInfo.writeoffs_ ? parseFloat(monthInfo.writeoffs_) : 0,
      ytd: yearInfo.writeoffs_ ? parseFloat(yearInfo.writeoffs_) : 0,
    }
  }

  async getMoveIns() {
    const monthStartDate = this.getFirstDayOfMonth(this.date);
    const yearStartDate = this.getFirstDayOfYear(this.date);

    const moveIns = await msrModels.Activity.summaryMoveIns(this.connection, this.date, this.properties, monthStartDate, yearStartDate);

    const dateInfo = moveIns.find(m => m.start_date != null) || {};
    const monthInfo = moveIns.find(m => m.movein_month != null && m.start_date == null) || {};
    const yearInfo = moveIns.find(m => m.movein_year != null && m.movein_month == null) || {};

    this.moveIns = {
      daily: (dateInfo.movins_ ? parseInt(dateInfo.movins_)  : 0),// - (this.transfers.daily),
      mtd: (monthInfo.movins_ ? parseInt(monthInfo.movins_) : 0),// - (this.transfers.mtd),
      ytd: (yearInfo.movins_ ? parseInt(yearInfo.movins_) : 0),// - (this.transfers.ytd),
    }
  }

  async getMoveOuts() {
    const monthStartDate = this.getFirstDayOfMonth(this.date);
    const yearStartDate = this.getFirstDayOfYear(this.date);

    let moveOuts = await msrModels.Activity.summaryMoveOuts(this.connection, this.date, this.properties, monthStartDate, yearStartDate);

    const dateInfo = moveOuts.find(m => m.end_date != null) || {};
    const monthInfo = moveOuts.find(m => m.moveout_month != null && m.end_date == null) || {};
    const yearInfo = moveOuts.find(m => m.moveout_year != null && m.moveout_month == null) || {};

    this.moveOuts = {
      daily: (dateInfo.moveouts_ ? parseInt(dateInfo.moveouts_) : 0),// - (this.transfers.daily),
      mtd: (monthInfo.moveouts_ ? parseInt(monthInfo.moveouts_) : 0),// - (this.transfers.mtd),
      ytd: (yearInfo.moveouts_ ? parseInt(yearInfo.moveouts_) : 0)// - (this.transfers.ytd),
    }
  }

  async getTransfers() {
    const monthStartDate = this.getFirstDayOfMonth(this.date);
    const yearStartDate = this.getFirstDayOfYear(this.date);

    const transfers = await msrModels.Activity.summaryTransfers(this.connection, this.date, this.properties, monthStartDate, yearStartDate);

    const dateInfo = transfers.find(m => m.transfer_date != null) || {};
    const monthInfo = transfers.find(m => m.transfer_month != null && m.transfer_date == null) || {};
    const yearInfo = transfers.find(m => m.transfer_year != null && m.transfer_month == null) || {};

    this.transfers = {
      daily: dateInfo.day_transfers ? parseInt(dateInfo.day_transfers) : 0,
      mtd: monthInfo.day_transfers ? parseInt(monthInfo.day_transfers) : 0,
      ytd: yearInfo.day_transfers ? parseInt(yearInfo.day_transfers) : 0,
    }
  }

  async getReservedUnits() {
    const monthStartDate = this.getFirstDayOfMonth(this.date);
    const yearStartDate = this.getFirstDayOfYear(this.date);

    const reservedUnits = await msrModels.Activity.summaryReservedUnits(this.connection, this.date, this.properties, monthStartDate, yearStartDate);

    const dateInfo = reservedUnits.find(ru => ru.reservation_date != null) || {};
    const monthInfo = reservedUnits.find(ru => ru.reservation_month != null && ru.reservation_date == null) || {};
    const yearInfo = reservedUnits.find(ru => ru.reservation_year != null && ru.reservation_month == null) || {};

    this.reservations = {
      daily: dateInfo.reservations_ ? parseInt(dateInfo.reservations_) : 0,
      mtd: monthInfo.reservations_ ? parseInt(monthInfo.reservations_) : 0,
      ytd: yearInfo.reservations_ ? parseInt(yearInfo.reservations_) : 0,
    }
  }

  async getOccupancyBreakdown() {

    let occupiedInfoRes = await msrModels.Occupancy.summaryOccupiedUnits(this.connection, this.date, this.properties);
    let occupiedInfo = occupiedInfoRes?.length && occupiedInfoRes[0];

    let complimentaryInfo = await msrModels.Occupancy.summaryComplimentaryUnits(this.connection, this.date, this.properties);
    let reservedInfo = await msrModels.Occupancy.summaryReservedUnits(this.connection, this.date, this.properties);
  

    this.occupancy_breakdown = {
      occupied: {
        unit_count: occupiedInfo.occupied_ ? parseInt(occupiedInfo.occupied_) : 0,
        sqft: occupiedInfo.occupied_sqft_ ? parseFloat(occupiedInfo.occupied_sqft_) : 0,
        rent: occupiedInfo.occupied_rent_ ? parseFloat(occupiedInfo.occupied_rent_) : 0,
        base_rent: occupiedInfo.occupied_base_rent_ ? parseFloat(occupiedInfo.occupied_base_rent_) : 0
      },
      reserved: {
        unit_count: reservedInfo.total_ ? parseInt(reservedInfo.total_) : 0,
        sqft: reservedInfo.total_reserved_sqft_ ? parseFloat(reservedInfo.total_reserved_sqft_) : 0,
        rent: reservedInfo.reservation_rent_ ? parseFloat(reservedInfo.reservation_rent_) : 0,
        base_rent: reservedInfo.reservation_base_rent_ ? parseFloat(reservedInfo.reservation_base_rent_) : 0,
      },
      complimentary: {
        unit_count: complimentaryInfo.complimentary_ ? parseInt(complimentaryInfo.complimentary_) : 0,
        sqft: complimentaryInfo.complimentary_sqft_ ? parseFloat(complimentaryInfo.complimentary_sqft_) : 0,
        rent: complimentaryInfo.complimentary_rent_ ? parseFloat(complimentaryInfo.complimentary_rent_) : 0,
        base_rent: complimentaryInfo.complimentary_base_rent_ ? parseFloat(complimentaryInfo.complimentary_base_rent_) : 0,
      },
      // unrentable: {
      //   unit_count: unRentableUnits.length && unRentableUnits[0].total_unrentable_ || 0,
      //   unit_percent: 0,
      //   sqft: unRentableUnits.length && unRentableUnits[0].total_unrentable_sqft_ || 0,
      //   sqft_percent: 0,
      //   rent: unRentableUnits.length && unRentableUnits[0].total_unrentable_baserent_ || 0
      // },

    }

    const { occupied } = this.occupancy_breakdown;

    this.occupancy_breakdown.vacant = {
      unit_count: this.totalUnits.count - occupied.unit_count,
      sqft: this.totalUnits.sqft - occupied.sqft,
      rent: 0,
      base_rent: this.totalUnits.base_rent - occupied.base_rent
    }

    for (let [key, value] of Object.entries(this.occupancy_breakdown)) {
      this.occupancy_breakdown[key].unit_percent = Math.round(this.occupancy_breakdown[key].unit_count/ this.totalUnits.count * 1e4)/1e2;
      this.occupancy_breakdown[key].sqft_percent = Math.round(this.occupancy_breakdown[key].sqft/ this.totalUnits.sqft * 1e4)/1e2;
    }

    this.occupancy_breakdown.total = {
      unit_count: (this.totalUnits && this.totalUnits.count) || 0,
      unit_percent: 100,
      sqft: (this.totalUnits && this.totalUnits.sqft) || 0,
      sqft_percent: 100,
      rent: (this.totalUnits && this.totalUnits.base_rent) || 0
    }


  }

  async getOccupancyDetails() {

    const oneYearBack = moment(this.date).subtract(1, 'year').format('YYYY-MM-DD');
    let pastYUnitDetailRes = await msrModels.Activity.totalUnitsByProperty(this.connection, oneYearBack, this.properties);
    let pastYUnitDetail = pastYUnitDetailRes?.length && pastYUnitDetailRes[0];

    let lastYearUnitDetail = {
      count: pastYUnitDetail.total_ ? parseInt(pastYUnitDetail.total_) : 0,
      sqft: pastYUnitDetail.total_sqft_ ? parseFloat(pastYUnitDetail.total_sqft_) : 0,
      rent: pastYUnitDetail.total_baserent_ ? parseFloat(pastYUnitDetail.total_baserent_) : 0
    }

    let pastOccupiedInfoRes = await msrModels.Occupancy.summaryOccupiedUnits(this.connection, oneYearBack, this.properties);
    let pastOccupiedInfo = pastOccupiedInfoRes?.length && pastOccupiedInfoRes[0];
    //let pastComplimentaryInfo = await msrModels.Occupancy.summaryComplimentaryUnits(this.connection, oneYearBack, this.properties);
    //console.log("pastComplimentaryInfo", pastComplimentaryInfo);
    let pastOccupiedBreakDown =  {
      unit_count: pastOccupiedInfo.occupied_ ? parseInt(pastOccupiedInfo.occupied_) : 0,
      sqft: pastOccupiedInfo.occupied_sqft_ ? parseFloat(pastOccupiedInfo.occupied_sqft_) : 0,
      rent: pastOccupiedInfo.occupied_rent_ ? parseFloat(pastOccupiedInfo.occupied_rent_) : 0
    };

    // let pastComplimentaryDown =  {
    //   unit_count: pastComplimentaryInfo.complimentary_ ? parseInt(pastComplimentaryInfo.complimentary_) : 0,
    //   sqft: pastComplimentaryInfo.complimentary_sqft_ ? parseFloat(pastComplimentaryInfo.complimentary_sqft_) : 0,
    //   rent: pastComplimentaryInfo.complimentary_rent_ ? parseFloat(pastComplimentaryInfo.complimentary_rent_) : 0
    // };

    // pastOccupiedBreakDown.unit_count += pastComplimentaryDown.unit_count;
    // pastOccupiedBreakDown.sqft += pastComplimentaryDown.sqft;
    // pastOccupiedBreakDown.rent += pastComplimentaryDown.rent;

    pastOccupiedBreakDown.unit_percent = pastOccupiedBreakDown.unit_count ? Math.round(pastOccupiedBreakDown.unit_count/ lastYearUnitDetail.count * 1e4)/1e2 : 0;
    pastOccupiedBreakDown.sqft_percent = pastOccupiedBreakDown.sqft ? Math.round(pastOccupiedBreakDown.sqft/lastYearUnitDetail.sqft * 1e4)/1e2 : 0;
    pastOccupiedBreakDown.econ = pastOccupiedBreakDown.rent ? Math.round(pastOccupiedBreakDown.rent / lastYearUnitDetail.rent * 1e4)/1e2 : 0;

    const { occupied } = this.occupancy_breakdown;
    occupied.econ = Math.round(occupied.rent / this.totalUnits.base_rent * 1e4)/1e2;

    this.occupancy = {
      sqft : {
        current: occupied.sqft_percent,
        last_year_change: occupied.sqft_percent - pastOccupiedBreakDown.sqft_percent,
      },
      units : {
        current: occupied.unit_percent,
        last_year_change: occupied.unit_percent - pastOccupiedBreakDown.unit_percent,
      },
      econ : {
        current: occupied.econ,
        last_year_change: occupied.econ - pastOccupiedBreakDown.econ,
      }
    }

  }


  getSpaceMetrices() {
    const { occupied, total, vacant } = this.occupancy_breakdown;

    this.space_metrics = {
      average_area_space: {
        occupied: occupied.sqft / occupied.unit_count || 0,
        vacant: vacant.sqft / vacant.unit_count || 0,
        total: total.sqft / total.unit_count || 0
      },
      average_rent_space: {
        occupied: occupied.rent / occupied.unit_count || 0,
        vacant: vacant.base_rent / vacant.unit_count || 0,
        total: total.rent / total.unit_count || 0
      },
      average_rent_area: {
        occupied: occupied.rent / occupied.sqft || 0,
        vacant: vacant.base_rent / vacant.sqft || 0,
        total: total.rent / total.sqft || 0
      }
    }
  }

  async getDelinquentTenantsLedger() {
    let DTamountResult = await msrModels.Delinquencies.summaryDelinquentAmount(this.connection, this.date, this.properties);
    let DTamount = DTamountResult?.length && DTamountResult[0];

    let DTunitResult = await msrModels.Delinquencies.summaryDelinquentCount(this.connection, this.date, this.properties);
    let DTunit = DTunitResult?.length && DTunitResult[0];

    let occupiedUnits = (this.occupancy_breakdown && this.occupancy_breakdown.occupied && this.occupancy_breakdown.occupied.unit_count) || 0;

    this.deliquencies = {
      deliquent_10: {
        amount: DTamount.owed_0_10 ? parseFloat(DTamount.owed_0_10) : 0,
        units: DTunit.units_0_10 ? parseInt(DTunit.units_0_10) : 0,
      },
      deliquent_30: {
        amount: DTamount.owed_11_30 ? parseFloat(DTamount.owed_11_30) : 0,
        units: DTunit.units_11_30 ? parseInt(DTunit.units_11_30) : 0,
      },
      deliquent_60: {
        amount: DTamount.owed_31_60 ? parseFloat(DTamount.owed_31_60) : 0,
        units: DTunit.units_31_60 ? parseInt(DTunit.units_31_60) : 0,
      },
      deliquent_90: {
        amount: DTamount.owed_61_90 ? parseFloat(DTamount.owed_61_90) : 0,
        units: DTunit.units_61_90 ? parseInt(DTunit.units_61_90) : 0,
      },
      deliquent_120: {
        amount: DTamount.owed_91_120 ? parseFloat(DTamount.owed_91_120) : 0,
        units: DTunit.units_91_120 ? parseInt(DTunit.units_91_120) : 0,
      },
      deliquent_180: {
        amount: DTamount.owed_121_180 ? parseFloat(DTamount.owed_121_180) : 0,
        units: DTunit.units_121_180 ? parseInt(DTunit.units_121_180) : 0,
      },
      deliquent_360: {
        amount: DTamount.owed_181_360 ? parseFloat(DTamount.owed_181_360) : 0,
        units: DTunit.units_181_360 ? parseInt(DTunit.units_181_360) : 0,
      },
      deliquent_gt_360: {
        amount: DTamount.owed_361 ? parseFloat(DTamount.owed_361) : 0,
        units: DTunit.units_361 ? parseInt(DTunit.units_361) : 0,
      }
    }

    //Total Delinquencies
    let total = {
      amount: 0,
      units: 0,
      percent_units: 0
    };
    for (let [key, value] of Object.entries(this.deliquencies)) {
      this.deliquencies[key].percent_units = occupiedUnits ? Math.round(value.units / occupiedUnits * 1e4)/1e2 : 0;
      total.amount += this.deliquencies[key].amount;
      total.units += this.deliquencies[key].units;
    }
    total.percent_units = occupiedUnits ? Math.round(total.units / occupiedUnits * 1e4)/1e2 : 0;
    this.deliquencies.total = total;

    //Delinquency greater than 30 Days
    let deliquent_gt_30 = {
      amount: this.deliquencies.total.amount - this.deliquencies.deliquent_10.amount - this.deliquencies.deliquent_30.amount,
      units: this.deliquencies.total.units - this.deliquencies.deliquent_10.units - this.deliquencies.deliquent_30.units,
    };
    deliquent_gt_30.percent_units = occupiedUnits ? Math.round(deliquent_gt_30.units / occupiedUnits * 1e4)/1e2 : 0;
    this.deliquencies.deliquent_gt_30 = deliquent_gt_30;

  }

  async getAutoPay() {
    let autoPayRes = await msrModels.AutoPay.summaryAutoPay(this.connection, this.date, this.properties);
    let autoPay = autoPayRes?.length && autoPayRes[0];
    let total_autopay = autoPay.autopay_ ? parseInt(autoPay.autopay_) : 0;
    const { occupied } = this.occupancy_breakdown;

    this.autoPay = {
      total: total_autopay,
      percentage: occupied && occupied.unit_count ? Math.round(total_autopay / occupied.unit_count * 1e4)/1e2 : 0
    }
  }

  async getInsurance() {
    let insuranceRes = await msrModels.Insurance.summaryInsurance(this.connection, this.date, this.properties);
    let insurance = insuranceRes?.length && insuranceRes[0];
    let total_insured = insurance.insurance_ ? parseInt(insurance.insurance_) : 0;
    const { occupied } = this.occupancy_breakdown;

    this.insurance = {
      total: total_insured,
      percentage: occupied && occupied.unit_count ? Math.round(total_insured / occupied.unit_count * 1e4)/1e2 : 0
    }
  }

  async getOverlock() {
    let overlock = await msrModels.Overlock.summaryOverlock(this.connection, this.date, this.properties);

    let total_overlocked = overlock.day_overlocks ? parseInt(overlock.day_overlocks) : 0;
    const { occupied } = this.occupancy_breakdown;

    this.overlock = {
      total: total_overlocked,
      percentage: occupied && occupied.unit_count ? Math.round(total_overlocked / occupied.unit_count * 1e4)/1e2 : 0
    }
  }

  async getUnchangedRent() {
    let rentUnchangedCol = await msrModels.RentUnChange.summarizedRentUnchanged(this.connection, this.date, this.properties);
    let rentUnchanged = rentUnchangedCol?.length && rentUnchangedCol[0];

    let total_rentUnchanged = rentUnchanged.rentunchanged_ ? parseInt(rentUnchanged.rentunchanged_) : 0;
    const { occupied } = this.occupancy_breakdown;

    this.rentUnchanged = {
      total: total_rentUnchanged,
      percentage: occupied && occupied.unit_count ? Math.round(total_rentUnchanged / occupied.unit_count * 1e4)/1e2 : 0
    }
  }

  fetchByLeadSource(leads, source) {
    if(leads && leads.length){
      let lead = leads.find(l => l.lead_source == source);
      return lead && lead.day_leads ? parseInt(lead.day_leads) : 0
    }
    return 0
  }

  async getLeads() {
    const monthStartDate = this.getFirstDayOfMonth(this.date);
    const yearStartDate = this.getFirstDayOfYear(this.date);

    const leads = await msrModels.Leads.summaryLeads(this.connection, this.date, this.properties, monthStartDate, yearStartDate);
    const leadsDateInfo = leads.filter(lc => lc.lead_date != null) || [];
    const leadsMonthInfo = leads.filter(lc => lc.lead_month != null && lc.lead_date == null) || [];
    const leadsYearInfo = leads.filter(lc => lc.lead_year != null && lc.lead_month == null) || [];

    const leadsConverted = await msrModels.Leads.leadsConverted(this.connection, this.date, this.properties, monthStartDate, yearStartDate);
    const leadsConvertedDateInfo = leadsConverted.find(lc => lc.lead_date != null) || {};
    const leadsConvertedMonthInfo = leadsConverted.find(lc => lc.lead_month != null && lc.lead_date == null) || {};
    const leadsConvertedYearInfo = leadsConverted.find(lc => lc.lead_year != null && lc.lead_month == null) || {};

    this.leads = {
      phone_leads: {
        daily: this.fetchByLeadSource(leadsDateInfo, 'Phone Leads'),
        mtd: this.fetchByLeadSource(leadsMonthInfo, 'Phone Leads'),
        ytd: this.fetchByLeadSource(leadsYearInfo, 'Phone Leads')
      },
      web_leads: {
        daily: this.fetchByLeadSource(leadsDateInfo, 'Web Leads'),
        mtd: this.fetchByLeadSource(leadsMonthInfo, 'Web Leads'),
        ytd: this.fetchByLeadSource(leadsYearInfo, 'Web Leads')
      },
      walk_in_leads: {
        daily: this.fetchByLeadSource(leadsDateInfo, 'Walk-In Leads'),
        mtd: this.fetchByLeadSource(leadsMonthInfo, 'Walk-In Leads'),
        ytd: this.fetchByLeadSource(leadsYearInfo, 'Walk-In Leads')
      },
      other_leads: {
        daily: this.fetchByLeadSource(leadsDateInfo, 'Others'),
        mtd: this.fetchByLeadSource(leadsMonthInfo, 'Others'),
        ytd: this.fetchByLeadSource(leadsYearInfo, 'Others')
      }
    };

    let total = {
      daily: 0,
      mtd: 0,
      ytd: 0
    };

    for (let [key, value] of Object.entries(this.leads)) {
      total.daily += this.leads[key].daily;
      total.mtd += this.leads[key].mtd;
      total.ytd += this.leads[key].ytd;
    }

    this.leads.total = total;

    this.leads.leads_converted = {
      daily: leadsConvertedDateInfo.day_converted_leads ? parseInt(leadsConvertedDateInfo.day_converted_leads) : 0,
      mtd: leadsConvertedMonthInfo.day_converted_leads ? parseInt(leadsConvertedMonthInfo.day_converted_leads) : 0,
      ytd: leadsConvertedYearInfo.day_converted_leads ? parseInt(leadsConvertedYearInfo.day_converted_leads) : 0,
    };

  }

  calculateRentVariance(newRent, oldRent) {
    return newRent - oldRent;
  }

  calculatePercentageVariance(newRent, oldRent) {
    return Math.round( ((newRent/oldRent) - 1) * 1e4)/1e2;
  }

  calculateAverageRentChange(newRent, oldRent, totalRentChanges) {
    return (this.calculateRentVariance(newRent, oldRent)/totalRentChanges)
  }

  async getRentChange() {
    const rentChange = await msrModels.RentChange.summarizedRentChange(this.connection, this.date, this.properties);

    const { less_than_six, six_eleven, twelve_seventeen, eighteen_twentyfour, above_twentyfour,
      less_than_six_new_rent_amount, six_eleven_new_rent_amount, twelve_seventeen_new_rent_amount, eighteen_twentyfour_new_rent_amount, above_twentyfour_new_rent_amount,
      less_than_six_old_rent_amount, six_eleven_old_rent_amount, twelve_seventeen_old_rent_amount, eighteen_twentyfour_old_rent_amount, above_twentyfour_old_rent_amount
    } = rentChange;

    this.rentChange = {
      six_month: {
        variance: this.calculateRentVariance(less_than_six_new_rent_amount, less_than_six_old_rent_amount) || 0,
        count: parseInt(less_than_six) || 0,
        prct_variance: this.calculatePercentageVariance(less_than_six_new_rent_amount, less_than_six_old_rent_amount) || 0,
        avg_change: this.calculateAverageRentChange(less_than_six_new_rent_amount, less_than_six_old_rent_amount, less_than_six) || 0
      },
      six_to_twelve_month: {
        variance: this.calculateRentVariance(six_eleven_new_rent_amount, six_eleven_old_rent_amount) || 0,
        count: parseInt(six_eleven) || 0,
        prct_variance: this.calculatePercentageVariance(six_eleven_new_rent_amount, six_eleven_old_rent_amount) || 0,
        avg_change: this.calculateAverageRentChange(six_eleven_new_rent_amount, six_eleven_old_rent_amount, six_eleven) || 0
      },
      twelve_to_eighteen_month: {
        variance: this.calculateRentVariance(twelve_seventeen_new_rent_amount, twelve_seventeen_old_rent_amount) || 0,
        count: parseInt(twelve_seventeen) || 0,
        prct_variance: this.calculatePercentageVariance(twelve_seventeen_new_rent_amount, twelve_seventeen_old_rent_amount) || 0,
        avg_change: this.calculateAverageRentChange(twelve_seventeen_new_rent_amount, twelve_seventeen_old_rent_amount, twelve_seventeen) || 0
      },
      eighteen_to_twenty_four_month: {
        variance: this.calculateRentVariance(eighteen_twentyfour_new_rent_amount, eighteen_twentyfour_old_rent_amount) || 0,
        count: parseInt(eighteen_twentyfour) || 0,
        prct_variance: this.calculatePercentageVariance(eighteen_twentyfour_new_rent_amount, eighteen_twentyfour_old_rent_amount) || 0,
        avg_change: this.calculateAverageRentChange(eighteen_twentyfour_new_rent_amount, eighteen_twentyfour_old_rent_amount, eighteen_twentyfour) || 0
      },
      twenty_four_month: {
        variance: this.calculateRentVariance(above_twentyfour_new_rent_amount, above_twentyfour_old_rent_amount) || 0,
        count: parseInt(above_twentyfour) || 0,
        prct_variance: this.calculatePercentageVariance(above_twentyfour_new_rent_amount, above_twentyfour_old_rent_amount) || 0,
        avg_change: this.calculateAverageRentChange(above_twentyfour_new_rent_amount, above_twentyfour_old_rent_amount, above_twentyfour) || 0
      }
    }

    let total_count = +less_than_six + +six_eleven + +twelve_seventeen + +eighteen_twentyfour + +above_twentyfour;
    let total_new_rent_amount = +less_than_six_new_rent_amount + +six_eleven_new_rent_amount + +twelve_seventeen_new_rent_amount + +eighteen_twentyfour_new_rent_amount + +above_twentyfour_new_rent_amount;
    let total_old_rent_amount = +less_than_six_old_rent_amount + +six_eleven_old_rent_amount + +twelve_seventeen_old_rent_amount + +eighteen_twentyfour_old_rent_amount + +above_twentyfour_old_rent_amount;

    this.rentChange.total = {
      variance: this.calculateRentVariance(total_new_rent_amount, total_old_rent_amount) || 0,
      count: parseInt(total_count) || 0,
      prct_variance: this.calculatePercentageVariance(total_new_rent_amount, total_old_rent_amount) || 0,
      avg_change: this.calculateAverageRentChange(total_new_rent_amount, total_old_rent_amount, total_count) || 0
    };
  }

  async getRevenues() {
    const monthStartDate = this.getFirstDayOfMonth(this.date);
    const yearStartDate = this.getFirstDayOfYear(this.date);

    const firstDayOfLastMonth = moment(monthStartDate).subtract(1, 'month').format('YYYY-MM-DD');
    const firstDayOfLastYear = moment(yearStartDate).subtract(1, 'year').format('YYYY-MM-DD');

    const oneMonthBack = moment(this.date).subtract(1, 'month').format('YYYY-MM-DD');
    const oneYearBack = moment(this.date).subtract(1, 'year').format('YYYY-MM-DD');

    let cmRevenue = await msrModels.NetRevenue.summaryNetRevenue(this.connection, monthStartDate, this.date, this.properties);
    this.currentMonthRevenue = cmRevenue && cmRevenue.length ? parseFloat(cmRevenue[0].net_revenue) : 0;

    let lmRevenue = await msrModels.NetRevenue.summaryNetRevenue(this.connection, firstDayOfLastMonth, oneMonthBack, this.properties);
    this.lastMonthRevenue = lmRevenue && lmRevenue.length ? parseFloat(lmRevenue[0].net_revenue) : 0;

    let cyRevenue = await msrModels.NetRevenue.summaryNetRevenue(this.connection, yearStartDate, this.date, this.properties);
    this.currentYearRevenue = cyRevenue && cyRevenue.length ? parseFloat(cyRevenue[0].net_revenue) : 0;

    let lyRevenue = await msrModels.NetRevenue.summaryNetRevenue(this.connection, firstDayOfLastYear, oneYearBack, this.properties);
    this.lastYearRevenue = lyRevenue && lyRevenue.length ? parseFloat(lyRevenue[0].net_revenue) : 0;

  }

  async getAccNetIncome() {
    let { PRODUCT_TYPES: pt } = Enums;

    const monthStartDate = this.getFirstDayOfMonth(this.date);
    const yearStartDate = this.getFirstDayOfYear(this.date);

    const firstDayOfLastMonth = moment(monthStartDate).subtract(1, 'month').format('YYYY-MM-DD');
    const firstDayOfLastYear = moment(yearStartDate).subtract(1, 'year').format('YYYY-MM-DD');

    const oneMonthBack = moment(this.date).subtract(1, 'month').format('YYYY-MM-DD');
    const oneYearBack = moment(this.date).subtract(1, 'year').format('YYYY-MM-DD');

    let cmRevenue = await msrModels.NetRevenue.summaryIncomeByProduct(this.connection, monthStartDate, this.date, this.properties, [pt.RENT]);
    this.currentMonthRevenue = cmRevenue && cmRevenue.length ? parseFloat(cmRevenue[0].net_income) : 0;

    let lmRevenue = await msrModels.NetRevenue.summaryIncomeByProduct(this.connection, firstDayOfLastMonth, oneMonthBack, this.properties, [pt.RENT]);
    this.lastMonthRevenue = lmRevenue && lmRevenue.length ? parseFloat(lmRevenue[0].net_income) : 0;

    let cyRevenue = await msrModels.NetRevenue.summaryIncomeByProduct(this.connection, yearStartDate, this.date, this.properties, [pt.RENT]);
    this.currentYearRevenue = cyRevenue && cyRevenue.length ? parseFloat(cyRevenue[0].net_income) : 0;

    let lyRevenue = await msrModels.NetRevenue.summaryIncomeByProduct(this.connection, firstDayOfLastYear, oneYearBack, this.properties, [pt.RENT]);
    this.lastYearRevenue = lyRevenue && lyRevenue.length ? parseFloat(lyRevenue[0].net_income) : 0;

  }

  fetchByProductType(revenues, type) {
    if(revenues && revenues.length){
      let revenue = revenues.find(r => r.product == type);
      return revenue && revenue.revenue_amount_ ? Math.abs(parseFloat(revenue.revenue_amount_)) : 0;
    }
    return 0
  }

  async getProductRevenues() {
    const monthStartDate = this.getFirstDayOfMonth(this.date);
    const yearStartDate = this.getFirstDayOfYear(this.date);

    const prodRevs = await msrModels.ProjectedIncome.summaryProductRevenue(this.connection, this.date, this.properties, monthStartDate, yearStartDate);
    const prodRevDateInfo = prodRevs.filter(pr => pr.revenue_date != null) || [];
    const prodRevMonthInfo = prodRevs.filter(pr => pr.revenue_month != null && pr.revenue_date == null) || [];
    const prodRevYearInfo = prodRevs.filter(pr => pr.revenue_year != null && pr.revenue_month == null) || [];

    this.revenue = {
      rent: {
        daily: this.fetchByProductType(prodRevDateInfo, 'rent'),
        mtd: this.fetchByProductType(prodRevMonthInfo, 'rent'),
        ytd: this.fetchByProductType(prodRevYearInfo, 'rent')
      },
      fee: {
        daily: this.fetchByProductType(prodRevDateInfo, 'fee'),
        mtd: this.fetchByProductType(prodRevMonthInfo, 'fee'),
        ytd: this.fetchByProductType(prodRevYearInfo, 'fee')
      },
      insurance: {
        daily: this.fetchByProductType(prodRevDateInfo, 'insurance'),
        mtd: this.fetchByProductType(prodRevMonthInfo, 'insurance'),
        ytd: this.fetchByProductType(prodRevYearInfo, 'insurance')
      },
      merchandise: {
        daily: this.fetchByProductType(prodRevDateInfo, 'merchandise'),
        mtd: this.fetchByProductType(prodRevMonthInfo, 'merchandise'),
        ytd: this.fetchByProductType(prodRevYearInfo, 'merchandise')
      },
      others: {
        daily: this.fetchByProductType(prodRevDateInfo, 'others'),
        mtd: this.fetchByProductType(prodRevMonthInfo, 'others'),
        ytd: this.fetchByProductType(prodRevYearInfo, 'others')
      }
    };

    let total = {
      daily: 0,
      mtd: 0,
      ytd: 0
    };

    for (let [key, value] of Object.entries(this.revenue)) {
      total.daily += this.revenue[key].daily;
      total.mtd += this.revenue[key].mtd;
      total.ytd += this.revenue[key].ytd;
    }

    this.revenue.total = total;
  }

  async getProductRevenuesAccrual() {
    let { PRODUCT_TYPES: pt } = Enums;

    const monthStartDate = this.getFirstDayOfMonth(this.date);
    const yearStartDate = this.getFirstDayOfYear(this.date);

    const prodRevs = await msrModels.ProjectedIncome.summaryProductRevenueAccrual(this.connection, this.date, this.properties, monthStartDate, yearStartDate);
    const prodRevDateInfo = prodRevs.filter(pr => pr.revenue_date != null) || [];
    const prodRevMonthInfo = prodRevs.filter(pr => pr.revenue_month != null && pr.revenue_date == null) || [];
    const prodRevYearInfo = prodRevs.filter(pr => pr.revenue_year != null && pr.revenue_month == null) || [];

    this.revenue = {
      rent: {
        daily: this.fetchByProductType(prodRevDateInfo, pt.RENT),
        mtd: this.fetchByProductType(prodRevMonthInfo, pt.RENT),
        ytd: this.fetchByProductType(prodRevYearInfo, pt.RENT)
      },
      merchandise: {
        daily: this.fetchByProductType(prodRevDateInfo, pt.MERCHANDISE),
        mtd: this.fetchByProductType(prodRevMonthInfo, pt.MERCHANDISE),
        ytd: this.fetchByProductType(prodRevYearInfo, pt.MERCHANDISE)
      },
      fee: {
        daily: this.fetchByProductType(prodRevDateInfo, pt.FEE),
        mtd: this.fetchByProductType(prodRevMonthInfo, pt.FEE),
        ytd: this.fetchByProductType(prodRevYearInfo, pt.FEE)
      },
      insurance: {
        daily: this.fetchByProductType(prodRevDateInfo, pt.INSURANCE),
        mtd: this.fetchByProductType(prodRevMonthInfo, pt.INSURANCE),
        ytd: this.fetchByProductType(prodRevYearInfo, pt.INSURANCE)
      },
      deposit: {
        daily: this.fetchByProductType(prodRevDateInfo, pt.DEPOSIT),
        mtd: this.fetchByProductType(prodRevMonthInfo, pt.DEPOSIT),
        ytd: this.fetchByProductType(prodRevYearInfo, pt.DEPOSIT)
      },
      auction: {
        daily: this.fetchByProductType(prodRevDateInfo, pt.AUCTION),
        mtd: this.fetchByProductType(prodRevMonthInfo, pt.AUCTION),
        ytd: this.fetchByProductType(prodRevYearInfo, pt.AUCTION)
      },
      tax: {
        daily: this.fetchByProductType(prodRevDateInfo, 'tax'),
        mtd: this.fetchByProductType(prodRevMonthInfo, 'tax'),
        ytd: this.fetchByProductType(prodRevYearInfo, 'tax')
      },
    };

    let total = {
      daily: 0,
      mtd: 0,
      ytd: 0
    };

    for (let [key, value] of Object.entries(this.revenue)) {
      total.daily = rounding.round(total.daily + this.revenue[key].daily);
      total.mtd = rounding.round(total.mtd + this.revenue[key].mtd);
      total.ytd = rounding.round(total.ytd + this.revenue[key].ytd);
    }

    this.revenue.total = total;
  }

  fetchInfoByProductType(liabilities, type, info_type) {
    if(liabilities && liabilities.length){
      let liability = liabilities.find(r => r.product == type);

      if(info_type){
        if(info_type === 'amount') {
          return liability && liability.revenue_amount_ ? Math.abs(parseFloat(liability.revenue_amount_)) : 0;
        }
        else if(info_type === 'tax') {
          return liability && liability.revenue_tax_ ? Math.abs(parseFloat(liability.revenue_tax_)) : 0;
        }
        else if(info_type === 'total') {
          return liability && liability.revenue_total_ ? Math.abs(parseFloat(liability.revenue_total_)) : 0;
        }
        else if (info_type === 'units'){
          return liability && liability.revenue_spaces_ ? parseInt(liability.revenue_spaces_) : 0;
        }
      }
    }
    return 0
  }

  async getLiabilities(){
    const liabilities = await msrModels.Liability.summaryLiabilities(this.connection, this.date, this.properties);
  
    const totalLiableUnits = await msrModels.Liability.summaryLiableUnits(this.connection, this.date, this.properties);

    this.liabilities = {
      prepaid_rent: {
        amount: this.fetchInfoByProductType(liabilities, 'Prepaid Rent', 'amount'),
        tax: this.fetchInfoByProductType(liabilities, 'Prepaid Rent', 'tax'),
        total: this.fetchInfoByProductType(liabilities, 'Prepaid Rent', 'total'),
        units: this.fetchInfoByProductType(liabilities, 'Prepaid Rent', 'units'),
      },
      prepaid_services: {
        amount: this.fetchInfoByProductType(liabilities, 'Prepaid Fees', 'amount'),
        tax: this.fetchInfoByProductType(liabilities, 'Prepaid Fees', 'tax'),
        total: this.fetchInfoByProductType(liabilities, 'Prepaid Fees', 'total'),
        units: this.fetchInfoByProductType(liabilities, 'Prepaid Fees', 'units'),
      },
      prepaid_insurance: {
        amount: this.fetchInfoByProductType(liabilities, 'Prepaid Insurance', 'amount'),
        tax: this.fetchInfoByProductType(liabilities, 'Prepaid Insurance', 'tax'),
        total: this.fetchInfoByProductType(liabilities, 'Prepaid Insurance', 'total'),
        units: this.fetchInfoByProductType(liabilities, 'Prepaid Insurance', 'units'),
      },
      // prepaid_unallocated: {
      //   amount: unAllocatedPayments.unallocated_amount_ ? Math.abs(parseFloat(unAllocatedPayments.unallocated_amount_)) : 0,
      //   units: unAllocatedPayments.unallocated_spaces_ ? parseInt(unAllocatedPayments.unallocated_spaces_) : 0
      // },
      miscellaneous_deposits: {
        amount: this.fetchInfoByProductType(liabilities, 'Miscellaneous Deposits', 'amount'),
        tax: this.fetchInfoByProductType(liabilities, 'Miscellaneous Deposits', 'tax'),
        total: this.fetchInfoByProductType(liabilities, 'Miscellaneous Deposits', 'total'),
        units: this.fetchInfoByProductType(liabilities, 'Miscellaneous Deposits', 'units'),
      }
    };

    let total = {
      amount: 0,
      tax: 0,
      total: 0,
      units: totalLiableUnits.revenue_spaces_ ? parseInt(totalLiableUnits.revenue_spaces_) : 0,
    };

    for (let [key, value] of Object.entries(this.liabilities)) {
      total.amount += this.liabilities[key].amount;
      total.tax += this.liabilities[key].tax;
      total.total += this.liabilities[key].total;
    }

    this.liabilities.total = total;
  }

  async getBaseRates() {
    //this.baseRates = await redshiftModels.Summary.baseRates(this.connection, this.date, this.properties);
  }

  async getAllownces() {
    const monthStartDate = this.getFirstDayOfMonth(this.date);
    const yearStartDate = this.getFirstDayOfYear(this.date);

    await this.getDiscounts(this.connection, this.date, this.properties, monthStartDate, yearStartDate);
    await this.getCreditsWithWriteOffs(this.connection, this.date, this.properties, monthStartDate, yearStartDate);
  }

  fetchRevByProductType(recognitions, type) {
    if(recognitions && recognitions.length){
      let recognition = recognitions.find(r => r.product_type == type);
      return recognition && recognition.recognition_amount ? Math.abs(parseFloat(recognition.recognition_amount)) : 0;
    }
    return 0
  }

  async getLiabilityRecognition() {
    let { PRODUCT_TYPES: pt } = Enums;

    const monthStartDate = this.getFirstDayOfMonth(this.date);
    const yearStartDate = this.getFirstDayOfYear(this.date);

    const prodRevRg = await msrModels.LiabilityRecognition.summaryLiabilityRecognition(this.connection, this.date, this.properties, monthStartDate, yearStartDate);
    const prodRevRgDateInfo = prodRevRg.filter(pr => pr.recognition_date != null) || [];
    const prodRevRgMonthInfo = prodRevRg.filter(pr => pr.recognition_month != null && pr.recognition_date == null) || [];
    const prodRevRgYearInfo = prodRevRg.filter(pr => pr.recognition_year != null && pr.recognition_month == null) || [];

    this.liability_recognition = {
      rent: {
        daily: this.fetchRevByProductType(prodRevRgDateInfo, pt.RENT),
        mtd: this.fetchRevByProductType(prodRevRgMonthInfo, pt.RENT),
        ytd: this.fetchRevByProductType(prodRevRgYearInfo, pt.RENT)
      },
      merchandise: {
        daily: this.fetchRevByProductType(prodRevRgDateInfo, pt.MERCHANDISE),
        mtd: this.fetchRevByProductType(prodRevRgMonthInfo, pt.MERCHANDISE),
        ytd: this.fetchRevByProductType(prodRevRgYearInfo, pt.MERCHANDISE)
      },
      fee: {
        daily: this.fetchRevByProductType(prodRevRgDateInfo, pt.FEE),
        mtd: this.fetchRevByProductType(prodRevRgMonthInfo, pt.FEE),
        ytd: this.fetchRevByProductType(prodRevRgYearInfo, pt.FEE)
      },
      insurance: {
        daily: this.fetchRevByProductType(prodRevRgDateInfo, pt.INSURANCE),
        mtd: this.fetchRevByProductType(prodRevRgMonthInfo, pt.INSURANCE),
        ytd: this.fetchRevByProductType(prodRevRgYearInfo, pt.INSURANCE)
      },
      deposit: {
        daily: this.fetchRevByProductType(prodRevRgDateInfo, pt.DEPOSIT),
        mtd: this.fetchRevByProductType(prodRevRgMonthInfo, pt.DEPOSIT),
        ytd: this.fetchRevByProductType(prodRevRgYearInfo, pt.DEPOSIT)
      },
      tax: {
        daily: this.fetchRevByProductType(prodRevRgDateInfo, 'tax'),
        mtd: this.fetchRevByProductType(prodRevRgMonthInfo, 'tax'),
        ytd: this.fetchRevByProductType(prodRevRgYearInfo, 'tax')
      },
      // others: {
      //   daily: this.fetchRevByProductType(prodRevRgDateInfo, 'others'),
      //   mtd: this.fetchRevByProductType(prodRevRgMonthInfo, 'others'),
      //   ytd: this.fetchRevByProductType(prodRevRgYearInfo, 'others')
      // }
    };

    let total = {
      daily: 0,
      mtd: 0,
      ytd: 0
    };

    for (let [key, value] of Object.entries(this.liability_recognition)) {
      total.daily = rounding.round(total.daily + this.liability_recognition[key].daily);
      total.mtd = rounding.round(total.mtd + this.liability_recognition[key].mtd);
      total.ytd = rounding.round(total.ytd + this.liability_recognition[key].ytd);
    }

    this.liability_recognition.total = total;
  }

  fetchARByProductType(receivables, type) {
    if(receivables && receivables.length){
      let receivable = receivables.find(r => r.product_type == type);
      return receivable && receivable.receivable_amount ? parseFloat(receivable.receivable_amount) : 0;
    }
    return 0;
  }

  async getAccountReceivable() {
    let { PRODUCT_TYPES: pt } = Enums;

    const monthStartDate = this.getFirstDayOfMonth(this.date);
    const yearStartDate = this.getFirstDayOfYear(this.date);

    const arAmount = await msrModels.AccountReceivable.summaryAccountReceivable(this.connection, this.date, this.properties);
    const arAmountActive = await msrModels.AccountReceivable.summaryAccountReceivable(this.connection, this.date, this.properties, true);
    const prodAR = await msrModels.AccountReceivable.summaryAccountReceivableBreakdown(this.connection, this.date, this.properties, monthStartDate, yearStartDate);
    const prodARDateInfo = prodAR.filter(pr => pr.receivable_date != null) || [];
    const prodARMonthInfo = prodAR.filter(pr => pr.receivable_month != null && pr.receivable_date == null) || [];
    const prodARYearInfo = prodAR.filter(pr => pr.receivable_year != null && pr.receivable_month == null) || [];

    this.account_receivable = {
      breakdown: {
        rent: {
          daily: this.fetchARByProductType(prodARDateInfo, pt.RENT),
          mtd: this.fetchARByProductType(prodARMonthInfo, pt.RENT),
          ytd: this.fetchARByProductType(prodARYearInfo, pt.RENT)
        },
        merchandise: {
          daily: this.fetchARByProductType(prodARDateInfo, pt.MERCHANDISE),
          mtd: this.fetchARByProductType(prodARMonthInfo, pt.MERCHANDISE),
          ytd: this.fetchARByProductType(prodARYearInfo, pt.MERCHANDISE)
        },
        fee: {
          daily: this.fetchARByProductType(prodARDateInfo, pt.FEE),
          mtd: this.fetchARByProductType(prodARMonthInfo, pt.FEE),
          ytd: this.fetchARByProductType(prodARYearInfo, pt.FEE)
        },
        insurance: {
          daily: this.fetchARByProductType(prodARDateInfo, pt.INSURANCE),
          mtd: this.fetchARByProductType(prodARMonthInfo, pt.INSURANCE),
          ytd: this.fetchARByProductType(prodARYearInfo, pt.INSURANCE)
        },
        deposit: {
          daily: this.fetchARByProductType(prodARDateInfo, pt.DEPOSIT),
          mtd: this.fetchARByProductType(prodARMonthInfo, pt.DEPOSIT),
          ytd: this.fetchARByProductType(prodARYearInfo, pt.DEPOSIT)
        },
        auction: {
          daily: this.fetchARByProductType(prodARDateInfo, pt.AUCTION),
          mtd: this.fetchARByProductType(prodARMonthInfo, pt.AUCTION),
          ytd: this.fetchARByProductType(prodARYearInfo, pt.AUCTION)
        },
        tax: {
          daily: this.fetchARByProductType(prodARDateInfo, 'tax'),
          mtd: this.fetchARByProductType(prodARMonthInfo, 'tax'),
          ytd: this.fetchARByProductType(prodARYearInfo, 'tax')
        },
        // others: {
        //   daily: this.fetchARByProductType(prodARDateInfo, 'others'),
        //   mtd: this.fetchARByProductType(prodARMonthInfo, 'others'),
        //   ytd: this.fetchARByProductType(prodARYearInfo, 'others')
        // }
      },
      amount: arAmount && arAmount.account_receivable ? parseFloat(arAmount.account_receivable) : 0,
      amount_active_lease: arAmountActive && arAmountActive.account_receivable ? parseFloat(arAmountActive.account_receivable) : 0
    };

    let total = {
      daily: 0,
      mtd: 0,
      ytd: 0
    };

    for (let [key, value] of Object.entries(this.account_receivable.breakdown)) {
      total.daily = rounding.round(total.daily + this.account_receivable.breakdown[key].daily);
      total.mtd = rounding.round(total.mtd + this.account_receivable.breakdown[key].mtd);
      total.ytd = rounding.round(total.ytd + this.account_receivable.breakdown[key].ytd);
    }

    this.account_receivable.breakdown.total = total;
  }

  async getDepositBalance() {
    let { PRODUCT_DEFAULT_TYPES: pdt } = Enums;

    const depositBalance = await msrModels.DepositBalance.summaryDepositBalance(this.connection, this.date, this.properties);
    const secDeposit = depositBalance.find(sd => sd.product_type == pdt.SECURITY_DEPOSIT);
    const cleanDeposit = depositBalance.find(sd => sd.product_type == pdt.CLEANING_DEPOSIT);

    this.deposit_balance = {
      security: {
        amount: secDeposit ? parseFloat(secDeposit.amount) : 0,
        count: secDeposit ? parseInt(secDeposit.count) : 0
      },
      cleaning: {
        amount: cleanDeposit ? parseFloat(cleanDeposit.amount) : 0,
        count: cleanDeposit ? parseInt(cleanDeposit.count) : 0
      }
    };

    let total = {
     amount: 0,
     count: 0
    };

    for (let [key, value] of Object.entries(this.deposit_balance)) {
      total.amount = rounding.round(total.amount + this.deposit_balance[key].amount);
      total.count += this.deposit_balance[key].count;
    }

    this.deposit_balance.total = total;
  }

  async getPrepaidLiabilities() {
    const monthStartDate = this.getFirstDayOfMonth(this.date);
    const yearStartDate = this.getFirstDayOfYear(this.date);
    
    const prepaidLiabilities = await msrModels.PrepaidLiabilities.summaryPrepaidLiabilities(this.connection, { 
      date: this.date, 
      property_ids: this.properties, 
      first_day_of_month: monthStartDate,
      first_day_of_year: yearStartDate 
    });
    
    let runningTotal = 0;
    const defaultValues = {
      daily: 0,
      mtd: 0,
      ytd: 0
    };

	  this.prepaid_liabilities = {
      rent: { ...defaultValues },
      merchandise: { ...defaultValues },
      fee: { ...defaultValues },
      insurance: { ...defaultValues },
      deposit: { ...defaultValues },
      tax: { ...defaultValues }
    };

    for(let i = 0; i < prepaidLiabilities.length; i++) {
      const { product_type, period, amount } = prepaidLiabilities[i];

      if(period === 'rt') {
        runningTotal = amount || 0;
        continue;
      }

      if(!this.prepaid_liabilities[product_type]) {
        this.prepaid_liabilities[product_type] = {};
      }
      
      this.prepaid_liabilities[product_type][period] = amount; 
    }

    let total = { ...defaultValues };
    for (let [key, value] of Object.entries(this.prepaid_liabilities)) {
      total.daily = rounding.round(total.daily + this.prepaid_liabilities[key].daily);
      total.mtd = rounding.round(total.mtd + this.prepaid_liabilities[key].mtd);
      total.ytd = rounding.round(total.ytd + this.prepaid_liabilities[key].ytd);
    }

    this.prepaid_liabilities.total = total;
    this.prepaid_liabilities.total.rt = runningTotal;
  }

  getFirstDayOfYear(date) {
    const firstDayOfYear = moment(date).startOf('year').format('YYYY-MM-DD');
    return firstDayOfYear;
  }

  getFirstDayOfMonth(date) {
    const firstDayOfMonth = moment(date).startOf('month').format('YYYY-MM-DD');
    return firstDayOfMonth;
  }

  async getRevenueByProductType(){
    const monthStartDate = this.getFirstDayOfMonth(this.date);
    const yearStartDate = this.getFirstDayOfYear(this.date);

    const revenue_by_products = await msrModels.DepositsRefunds.summaryRevenueByProductType(this.connection, this.date, this.properties, monthStartDate, yearStartDate);
   
    const dateInfo = revenue_by_products.filter(rbp => rbp.date != null) || [];
    const monthInfo = revenue_by_products.filter(rbp => rbp.month != null && rbp.date == null) || [];
    const yearInfo = revenue_by_products.filter(rbp => rbp.year != null && rbp.month == null) || [];

    this.revenue_by_products = {
      rent: {
        daily: dateInfo.find(rbp => rbp.product_types === 'rent')?.amount,
        mtd:  monthInfo.find(rbp => rbp.product_types === 'rent')?.amount,
        ytd:  yearInfo.find(rbp => rbp.product_types === 'rent')?.amount,
      },
      coverage: {
        daily: dateInfo.find(rbp => rbp.product_types === 'insurance')?.amount,
        mtd:  monthInfo.find(rbp => rbp.product_types === 'insurance')?.amount,
        ytd:  yearInfo.find(rbp => rbp.product_types === 'insurance')?.amount,
      },
      fee: {
        daily: dateInfo.find(rbp => rbp.product_types === 'fee')?.amount,
        mtd:  monthInfo.find(rbp => rbp.product_types === 'fee')?.amount,
        ytd:  yearInfo.find(rbp => rbp.product_types === 'fee')?.amount,
      },
      merchandise: {
        daily: dateInfo.find(rbp => rbp.product_types === 'merchandise')?.amount,
        mtd:  monthInfo.find(rbp => rbp.product_types === 'merchandise')?.amount,
        ytd:  yearInfo.find(rbp => rbp.product_types === 'merchandise')?.amount,
      },
      deposits: {
        daily: dateInfo.find(rbp => rbp.product_types === 'deposit')?.amount,
        mtd:  monthInfo.find(rbp => rbp.product_types === 'deposit')?.amount,
        ytd:  yearInfo.find(rbp => rbp.product_types === 'deposit')?.amount,
      },
      auction: {
        daily: dateInfo.find(rbp => rbp.product_types === 'auction')?.amount,
        mtd:  monthInfo.find(rbp => rbp.product_types === 'auction')?.amount,
        ytd:  yearInfo.find(rbp => rbp.product_types === 'auction')?.amount,
      },
      tax: {
        daily: dateInfo.find(rbp => rbp.product_types === 'tax')?.amount,
        mtd:  monthInfo.find(rbp => rbp.product_types === 'tax')?.amount,
        ytd:  yearInfo.find(rbp => rbp.product_types === 'tax')?.amount,
      }
    }

    for(let key in this.revenue_by_products){
      if(!this.revenue_by_products[key].daily) this.revenue_by_products[key].daily = 0
      if(!this.revenue_by_products[key].mtd) this.revenue_by_products[key].mtd = 0
      if(!this.revenue_by_products[key].ytd) this.revenue_by_products[key].ytd = 0
    }
    
    let total = {
      daily: 0,
      mtd: 0,
      ytd: 0
    };

    for (let [key, value] of Object.entries(this.revenue_by_products)) {
      total.daily = rounding.round(total.daily + this.revenue_by_products[key].daily);
      total.mtd = rounding.round(total.mtd + this.revenue_by_products[key].mtd);
      total.ytd = rounding.round(total.ytd + this.revenue_by_products[key].ytd);
    }

    this.revenue_by_products.total = total;
  }

}

module.exports = ManagementSummary;
