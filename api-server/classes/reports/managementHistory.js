'use strict'

class ManagementHistory { 

  constructor(connection, data) {
    data = data || {};

    this.connection = connection;
    this.company = data.company;
    this.properties = data.properties
    this.start_date = data.start_date;
    this.end_date = '';
    this.date_range = [];

    this.deposits = {};
    this.reversals = {};
    this.revenue_by_products = {};
    this.discounts = {};
    this.write_offs = {};
    this.disc_wrt_total = {};
    this.credits_and_adjustments = {};
    this.prepaid_liabilities = {};
    this.liability_recognition = {};
    this.account_receivable = {};
    this.total_units = {};
    this.occupancy_by_count = {};
    this.occupancy_by_percentage = {};
    this.occupancy_by_sqft = {};
    this.occupancy_by_sqft_percentage = {}
    this.autopay_enrollment = {};
    this.insurance_enrollment = {};
    this.overlocked_spaces = {};
    this.rent_unchanged = {};
    this.lead_activity = {};
    this.delinquency_by_amount = {};
    this.delinquency_by_count = {};
    this.delinquency_by_percentage = {};
    this.rent_change_count = {};
    this.rent_change_variance = {};
    this.rent_change_variance_percentage = {};

    this.setEndDate();
  }

  async generate() {

    await this.getTotalUnits();
    await this.getDeposits();
    await this.getRevenueByProductType();
    await this.getProductRevenuesAccrual();
    await this.getAllowances();
    await this.getCreditsAndAdjustments();
    await this.getPrepaidLiabilities()
    await this.getLiabilityRecognition();
    await this.getAccountReceivable();
    await this.getRentalActivity();
    await this.getOccupancyBreakdown();
    await this.getAutopayEnrollment();
    await this.getInsuranceEnrollment();
    await this.getOverlockedSpaces();
    await this.getRentUnchanged();
    await this.getLeadActivity();
    await this.getDelinquencyBreakdown();
    await this.getRentChange();
  }

  async getDeposits() {
    let payload = {start_date: this.start_date, end_date: this.end_date, properties: this.properties}
    
    let deposits_data = await msrModels.DepositsRefunds.summaryDepositsByMonths(this.connection, payload);
    let reversals = await this.getRefunds();

    this.deposits = {
      cash: {metric: 'Cash'}, 
      check: {metric: 'Check'}, 
      gift_card: {metric: 'Gift Card'},
      ach:{metric: 'ACH Debit'}, 
      card: {metric: 'Debit/Credit Cards'},
      subtotal: {metric: 'Subtotal'},
      total: {metric: 'Total'}
    };

    this.reversals = {
      reversals: {metric: 'Refunds/Reversals'}, 
      nsf: {metric: 'NSF'}, 
      chargebacks:{metric: 'Chargebacks'}, 
      ach: {metric: 'ACH Reversal'},
      subtotal: {metric: 'Subtotal'}
    };

    for(let i=1; i<=Object.keys(this.date_range).length; i++){
        let month = this.date_range[`month${i}`];
        let deposit_data = deposits_data.find(item => item.payment_month === month);
        
        this.deposits.cash[`month${i}`] = deposit_data?.month_cash || 0;
        this.deposits.check[`month${i}`] = deposit_data?.month_check || 0;
        this.deposits.gift_card[`month${i}`] = deposit_data?.month_gift_card || 0;
        this.deposits.ach[`month${i}`] = deposit_data?.month_ach || 0;
        this.deposits.card[`month${i}`] = deposit_data?.month_card || 0;   
        this.deposits.subtotal[`month${i}`] = this.deposits.cash[`month${i}`] + this.deposits.check[`month${i}`] + this.deposits.ach[`month${i}`] + this.deposits.card[`month${i}`] + this.deposits.gift_card[`month${i}`];

        let refund_data = reversals.find(item => item.refund_month === month);
      
        this.reversals.reversals[`month${i}`] = refund_data?.reversals || 0;
        this.reversals.nsf[`month${i}`] = refund_data?.nsf || 0;
        this.reversals.chargebacks[`month${i}`] = refund_data?.chargebacks || 0;
        this.reversals.ach[`month${i}`] = refund_data?.ach || 0;   
        this.reversals.subtotal[`month${i}`] = this.reversals.reversals[`month${i}`] + this.reversals.nsf[`month${i}`] + this.reversals.chargebacks[`month${i}`] + this.reversals.ach[`month${i}`]

        this.deposits.total[`month${i}`] = this.deposits.subtotal[`month${i}`] - this.reversals.subtotal[`month${i}`];
    }

    this.deposits.reversals = this.reversals;
    return this.deposits;
  }

  async getRefunds() {   
    let payload = {start_date: this.start_date, end_date: this.end_date, properties: this.properties}
    const refunds = await msrModels.DepositsRefunds.summaryRefundsByMonths(this.connection, payload);
    return refunds;
  }

  async getRevenueByProductType() {
    let payload = {start_date: this.start_date, end_date: this.end_date, properties: this.properties};

    let revenue_by_products = await msrModels.DepositsRefunds.summaryRevenueByProductTypeByMonths(this.connection, payload);

    this.revenue_by_products = {
      rent: {metric: 'Rent'}, 
      coverage: {metric: 'Coverage'}, 
      fee:{metric: 'Fee'}, 
      merchandise: {metric: 'Merchandise'},
      deposits: {metric: 'Deposits'},
      auction: {metric: 'Auction'},
      tax: {metric: 'Tax'},
      total: {metric: 'Total'}
    };

    for(let i=1; i<=Object.keys(this.date_range).length; i++){
      let month = this.date_range[`month${i}`];
      let product_data = revenue_by_products.find(item => item.payment_month === month);
      
      this.revenue_by_products.rent[`month${i}`] = product_data?.rent || 0;
      this.revenue_by_products.coverage[`month${i}`] = product_data?.insurance || 0;
      this.revenue_by_products.fee[`month${i}`] = product_data?.fee || 0;
      this.revenue_by_products.merchandise[`month${i}`] = product_data?.merchandise || 0;
      this.revenue_by_products.deposits[`month${i}`] = product_data?.deposit || 0;   
      this.revenue_by_products.auction[`month${i}`] = product_data?.auction || 0;
      this.revenue_by_products.tax[`month${i}`] = product_data?.tax || 0;

      this.revenue_by_products.total[`month${i}`] = this.revenue_by_products.rent[`month${i}`] + this.revenue_by_products.coverage[`month${i}`] + this.revenue_by_products.fee[`month${i}`] +
                                              this.revenue_by_products.merchandise[`month${i}`] + this.revenue_by_products.deposits[`month${i}`] +
                                              this.revenue_by_products.auction[`month${i}`] + this.revenue_by_products.tax[`month${i}`];

    }

    return this.revenue_by_products;
  }

  async getProductRevenuesAccrual() {
    let payload = {start_date: this.start_date, end_date: this.end_date, properties: this.properties};
    let revenue = await msrModels.ProjectedIncome.summaryProductRevenueAccrualByMonths(this.connection, payload);

    this.revenue = {
      rent: {metric: 'Rent'}, 
      coverage: {metric: 'Coverage'}, 
      fee:{metric: 'Fee'}, 
      merchandise: {metric: 'Merchandise'},
      deposits: {metric: 'Deposits'},
      auction: {metric: 'Auction'},
      tax: {metric: 'Tax'},
      total: {metric: 'Total'}
    };

    for(let i=1; i<=Object.keys(this.date_range).length; i++){
      let month = this.date_range[`month${i}`];
      let revenue_data = revenue.find(item => item.revenue_date === month);
      
      this.revenue.rent[`month${i}`] = revenue_data?.rent || 0;
      this.revenue.coverage[`month${i}`] = revenue_data?.insurance || 0;
      this.revenue.fee[`month${i}`] = revenue_data?.fee || 0;
      this.revenue.merchandise[`month${i}`] = revenue_data?.merchandise || 0;
      this.revenue.deposits[`month${i}`] = revenue_data?.deposit || 0;   
      this.revenue.auction[`month${i}`] = revenue_data?.auction || 0;
      this.revenue.tax[`month${i}`] = revenue_data?.tax || 0;

      this.revenue.total[`month${i}`] = this.revenue.rent[`month${i}`] + this.revenue.coverage[`month${i}`] + this.revenue.fee[`month${i}`] +
                                              this.revenue.merchandise[`month${i}`] + this.revenue.deposits[`month${i}`] +
                                              this.revenue.auction[`month${i}`] + this.revenue.tax[`month${i}`];

    }

    return this.revenue;
  }

  async getAllowances() {
    let date_range = this.getDateRange('EOM', 13, 'YYYY-MM-DD');
    let payload = {start_date: this.start_date, end_date: this.end_date, date_range, properties: this.properties};
    
    await this.getDiscounts(this.connection, payload);
    await this.getWriteOffs(this.connection, payload);

    this.disc_wrt_total = {
      total: {metric: 'Total'}
    }

    for(let i=1; i<=Object.keys(this.date_range).length; i++){
      this.disc_wrt_total.total[`month${i}`] = this.discounts.discount[`month${i}`] + 
                                          this.write_offs.write_offs[`month${i}`]
    }

  }

  async getDiscounts(connection, payload) {
    let discounts = await msrModels.Allowances.summarizedDiscountsByMonths(connection, payload);

    this.discounts = {
      discount: {metric: 'Discounts/Promotions'}, 
    };

    for(let i=1; i<=Object.keys(this.date_range).length; i++){
      let month = this.date_range[`month${i}`];
      let discount_month = discounts.find(item => item.discount_month === month);
      
      this.discounts.discount[`month${i}`] = discount_month?.discount_amount || 0;
    }

    return this.discounts;
  }

  async getWriteOffs(connection, payload) {
    let write_offs = await msrModels.Allowances.summarizedWriteOffsByMonths(connection, payload);

    this.write_offs = {
      write_offs: {metric: 'Write Offs'}, 
    };

    for(let i=1; i<=Object.keys(this.date_range).length; i++){
      let month = this.date_range[`month${i}`];
      let write_offs_month = write_offs.find(item => item.month === month);
      
      this.write_offs.write_offs[`month${i}`] = write_offs_month?.writeoffs || 0;
    }

    return this.write_offs;
  }

  async getCreditsAndAdjustments(){
    let payload = {start_date: this.start_date, end_date: this.end_date, properties: this.properties};
    const credits_and_adjustments = await msrModels.CreditsAndAdjustments.summaryAdjustmentsAndCreditsByMonths(this.connection, payload);

    this.credits_and_adjustments = {
      credits: {metric: 'Store Credits'}, 
      transfer: {metric: 'Transfer'}, 
      auction:{metric: 'Auction'}, 
      move_out: {metric: 'Prorate Move-Out'},
      security_deposit: {metric: 'Security Deposit'},
      cleaning_deposit: {metric: 'Cleaning Deposit'},
      total: {metric: 'Total'}
    }

    for(let i=1; i<=Object.keys(this.date_range).length; i++){
      let month = this.date_range[`month${i}`];
      let adj_credit_data = credits_and_adjustments.find(item => item.adjustment_credit_month === month);
      
      this.credits_and_adjustments.credits[`month${i}`] = adj_credit_data?.credits || 0;
      this.credits_and_adjustments.transfer[`month${i}`] = adj_credit_data?.transfer || 0;
      this.credits_and_adjustments.auction[`month${i}`] = adj_credit_data?.auction || 0;
      this.credits_and_adjustments.move_out[`month${i}`] = adj_credit_data?.move_out || 0;
      this.credits_and_adjustments.security_deposit[`month${i}`] = adj_credit_data?.security_deposit || 0;   
      this.credits_and_adjustments.cleaning_deposit[`month${i}`] = adj_credit_data?.cleaning_deposit || 0;

      this.credits_and_adjustments.total[`month${i}`] = this.credits_and_adjustments.credits[`month${i}`] + this.credits_and_adjustments.transfer[`month${i}`] + 
                                                        this.credits_and_adjustments.auction[`month${i}`] + this.credits_and_adjustments.move_out[`month${i}`] + 
                                                        this.credits_and_adjustments.security_deposit[`month${i}`] + this.credits_and_adjustments.cleaning_deposit[`month${i}`];
    }

    return this.getCreditsAndAdjustments;
  }

  async getPrepaidLiabilities(){
    let date_range = this.getDateRange('EOM', 13, 'YYYY-MM-DD');
    let payload = {start_date: this.start_date, properties: this.properties, date_range};
    
    const prepaid_liabilities = await msrModels.PrepaidLiabilities.summaryPrepaidLiabilitiesByMonths(this.connection, payload);
    this.prepaid_liabilities = {
      rent: {metric: 'Rent'}, 
      coverage: {metric: 'Coverage'}, 
      fee:{metric: 'Fee'}, 
      merchandise: {metric: 'Merchandise'},
      deposits: {metric: 'Deposits'},
      tax: {metric: 'Tax'},
      total: {metric: 'Total'}
    }

    for(let i=1; i<=Object.keys(this.date_range).length; i++){
      let month = this.date_range[`month${i}`];
      let pre_liability_data = prepaid_liabilities.find(item => item.liability_month === month);
      
      this.prepaid_liabilities.rent[`month${i}`] = pre_liability_data?.rent || 0;
      this.prepaid_liabilities.coverage[`month${i}`] = pre_liability_data?.insurance || 0;
      this.prepaid_liabilities.fee[`month${i}`] = pre_liability_data?.fee || 0;
      this.prepaid_liabilities.merchandise[`month${i}`] = pre_liability_data?.merchandise || 0;
      this.prepaid_liabilities.deposits[`month${i}`] = pre_liability_data?.deposit || 0;   
      this.prepaid_liabilities.tax[`month${i}`] = pre_liability_data?.tax || 0;

      this.prepaid_liabilities.total[`month${i}`] = this.prepaid_liabilities.rent[`month${i}`] + this.prepaid_liabilities.coverage[`month${i}`] + 
                                                        this.prepaid_liabilities.fee[`month${i}`] + this.prepaid_liabilities.merchandise[`month${i}`] + 
                                                        this.prepaid_liabilities.deposits[`month${i}`] + this.prepaid_liabilities.tax[`month${i}`];
    }

    return this.prepaid_liabilities;
  }

  async getLiabilityRecognition() {
    let payload = {start_date: this.start_date, end_date: this.end_date, properties: this.properties};
    const prod_rev_rg = await msrModels.LiabilityRecognition.summaryLiabilityRecognitionByMonths(this.connection, payload);

    this.liability_recognition = {
      rent: {metric: 'Rent'}, 
      coverage: {metric: 'Coverage'}, 
      fee:{metric: 'Fee'}, 
      merchandise: {metric: 'Merchandise'},
      deposits: {metric: 'Deposits'},
      tax: {metric: 'Tax'},
      total: {metric: 'Total'}
    }

    for(let i=1; i<=Object.keys(this.date_range).length; i++){
      let month = this.date_range[`month${i}`];
      let rg_data = prod_rev_rg.find(item => item.recognition_month === month);
      
      this.liability_recognition.rent[`month${i}`] = rg_data?.rent || 0;
      this.liability_recognition.coverage[`month${i}`] = rg_data?.insurance || 0;
      this.liability_recognition.fee[`month${i}`] = rg_data?.fee || 0;
      this.liability_recognition.merchandise[`month${i}`] = rg_data?.merchandise || 0;
      this.liability_recognition.deposits[`month${i}`] = rg_data?.deposits || 0;   
      this.liability_recognition.tax[`month${i}`] = rg_data?.tax || 0;

      this.liability_recognition.total[`month${i}`] = this.liability_recognition.rent[`month${i}`] + this.liability_recognition.coverage[`month${i}`] + 
                                                        this.liability_recognition.fee[`month${i}`] + this.liability_recognition.merchandise[`month${i}`] + 
                                                        this.liability_recognition.deposits[`month${i}`] + this.liability_recognition.tax[`month${i}`];
    }

    return this.liability_recognition;
  }

  async getAccountReceivable() {
    let payload = {start_date: this.start_date, end_date: this.end_date, properties: this.properties};
    const prod_acc_recv = await msrModels.AccountReceivable.summaryAccountReceivableBreakdownByMonths(this.connection, payload);

    this.account_receivable = {
      rent: {metric: 'Rent'}, 
      coverage: {metric: 'Coverage'}, 
      fee:{metric: 'Fee'}, 
      merchandise: {metric: 'Merchandise'},
      deposits: {metric: 'Deposits'},
      auction: {metric: 'Auction'},
      tax: {metric: 'Tax'},
      total: {metric: 'Total'}
    }

    for(let i=1; i<=Object.keys(this.date_range).length; i++){
      let month = this.date_range[`month${i}`];
      let ar_data = prod_acc_recv.find(item => item.receivable_month === month);
      
      this.account_receivable.rent[`month${i}`] = ar_data?.rent || 0;
      this.account_receivable.coverage[`month${i}`] = ar_data?.insurance || 0;
      this.account_receivable.fee[`month${i}`] = ar_data?.fee || 0;
      this.account_receivable.merchandise[`month${i}`] = ar_data?.merchandise || 0;
      this.account_receivable.deposits[`month${i}`] = ar_data?.deposits || 0;   
      this.account_receivable.auction[`month${i}`] = ar_data?.auction || 0;  
      this.account_receivable.tax[`month${i}`] = ar_data?.tax || 0;

      this.account_receivable.total[`month${i}`] = this.account_receivable.rent[`month${i}`] + this.account_receivable.coverage[`month${i}`] + 
                                                        this.account_receivable.fee[`month${i}`] + this.account_receivable.merchandise[`month${i}`] + 
                                                        this.account_receivable.deposits[`month${i}`] + this.account_receivable.tax[`month${i}`] + 
                                                        this.account_receivable.auction[`month${i}`]
    }

    return this.account_receivable;
  }

  async getRentalActivity() {
    let payload = {start_date: this.end_date, end_date: this.start_date, properties: this.properties};
    const move_ins = await msrModels.Activity.summaryMoveInByMonths(this.connection, payload);
    const move_outs = await msrModels.Activity.summaryMoveOutByMonths(this.connection, payload);
    const transfers = await msrModels.Activity.summaryTransfersByMonths(this.connection, payload);
    const reservations = await msrModels.Activity.summaryReservedUnitsByMonths(this.connection, payload);

    this.rental_activity = {
      move_ins: {metric: 'Move-Ins'}, 
      move_outs: {metric: 'Move-Outs'},
      transfers: {metric: 'Transfers'},
      net_rental_activity: {metric: 'Net Rental Activity'},
      reservations: {metric: 'Reservations'},
    }

    for(let i=1; i<=Object.keys(this.date_range).length; i++) {
      let month = this.date_range[`month${i}`];
      let mi_data = move_ins.find(item => item.move_in_month === month);
      let mo_data = move_outs.find(item => item.move_out_month === month);
      let transfer_data = transfers.find(item => item.transfer_month === month);
      let reservation_data = reservations.find(item => item.reservation_month === month);

      this.rental_activity.move_ins[`month${i}`] = mi_data?.move_in_count || 0;
      this.rental_activity.move_outs[`month${i}`] = mo_data?.move_out_count || 0;
      this.rental_activity.net_rental_activity[`month${i}`] = (this.rental_activity.move_ins[`month${i}`] - this.rental_activity.move_outs[`month${i}`])
      this.rental_activity.transfers[`month${i}`] = transfer_data?.transfer_count || 0;
      this.rental_activity.reservations[`month${i}`] = reservation_data?.reservation_count || 0;
    }

    return this.rental_activity;
  }

  //Fetches data for all occupancy widgets altogether
  async getOccupancyBreakdown() {
    let date_range = this.getDateRange('EOM', 13, 'YYYY-MM-DD');
    let payload = {date_range, properties: this.properties};

    let occupied_complimentary_units = await msrModels.Occupancy.occupiedAndComplimentaryUnitsByMonths(this.connection, payload);
    let reserved_units = await msrModels.Occupancy.summaryReservedUnitsByMonths(this.connection, payload); 

    this.occupancy_by_count = {
      occupied_count: {metric: 'Occupied Count'},
      vacant_count: {metric: 'Vacant Count'},
      complimentary_count: {metric: 'Complimentary Count (not in total)'},
      reserved_count: {metric: 'Reserved Count (not in total)'},
      total_count: {metric: 'Total Count'}
    }

    this.occupancy_by_percentage = {
      occupied: {metric: 'Occupied %'},
      vacant: {metric: 'Vacant %'},
      complimentary: {metric: 'Complimentary % (not in total)'},
      reserved: {metric: 'Reserved % (not in total)'},
      total: {metric: 'Total %'}
    }

    this.occupancy_by_sqft = {
      occupied_sqft: {metric: 'Occupied SQ FT'},
      vacant_sqft: {metric: 'Vacant SQ FT'},
      complimentary_sqft: {metric: 'Complimentary SQ FT (not in total)'},
      reserved_sqft: {metric: 'Reserved SQ FT (not in total)'},
      total_sqft: {metric: 'Total SQ FT'}
    }

    this.occupancy_by_sqft_percentage = {
      occupied_sqft_percent: {metric: 'Occupied %SQ FT'},
      vacant_sqft_percent: {metric: 'Vacant %SQ FT'},
      complimentary_sqft_percent: {metric: 'Complimentary %SQ FT (not in total)'},
      reserved_sqft_percent: {metric: 'Reserved %SQ FT (not in total)'},
      total_sqft_percent: {metric: 'Total %SQ FT'}
    }

    for(let i=1; i<=Object.keys(this.date_range).length; i++){
      let month = this.date_range[`month${i}`];
      let occupied_complimentary = occupied_complimentary_units.find(item => item.month === month);
      let total_for_month = this.total_units.find(item => item.month === month);
      let reserved = reserved_units.find(item => item.month === month);

      this.occupancy_by_count.occupied_count[`month${i}`] = occupied_complimentary?.occupied_count || 0;
      this.occupancy_by_count.vacant_count[`month${i}`] = (total_for_month?.total_count || 0) - (occupied_complimentary?.occupied_count || 0);
      this.occupancy_by_count.complimentary_count[`month${i}`] = occupied_complimentary?.complimentary_count || 0;
      this.occupancy_by_count.reserved_count[`month${i}`] = reserved?.reserved_count || 0;
      this.occupancy_by_count.total_count[`month${i}`] = total_for_month?.total_count || 0;

      this.occupancy_by_percentage.occupied[`month${i}`] = this.formatPercentage(Math.round(this.occupancy_by_count.occupied_count[`month${i}`]/ this.occupancy_by_count.total_count[`month${i}`] * 1e4)/1e2 || 0);
      this.occupancy_by_percentage.vacant[`month${i}`] = this.formatPercentage(Math.round(this.occupancy_by_count.vacant_count[`month${i}`]/ this.occupancy_by_count.total_count[`month${i}`] * 1e4)/1e2 || 0);
      this.occupancy_by_percentage.complimentary[`month${i}`] = this.formatPercentage(Math.round(this.occupancy_by_count.complimentary_count[`month${i}`]/ this.occupancy_by_count.total_count[`month${i}`] * 1e4)/1e2 || 0);
      this.occupancy_by_percentage.reserved[`month${i}`] = this.formatPercentage(Math.round(this.occupancy_by_count.reserved_count[`month${i}`]/ this.occupancy_by_count.total_count[`month${i}`] * 1e4)/1e2 || 0);
      this.occupancy_by_percentage.total[`month${i}`] = 100;

      this.occupancy_by_sqft.occupied_sqft[`month${i}`] = occupied_complimentary?.occupied_sqft || 0;
      this.occupancy_by_sqft.vacant_sqft[`month${i}`] = (total_for_month?.total_sqft || 0) - (occupied_complimentary?.occupied_sqft || 0);
      this.occupancy_by_sqft.complimentary_sqft[`month${i}`] = occupied_complimentary?.complimentary_sqft || 0;
      this.occupancy_by_sqft.reserved_sqft[`month${i}`] = reserved?.reserved_sqft || 0;
      this.occupancy_by_sqft.total_sqft[`month${i}`] =  total_for_month?.total_sqft || 0;

      this.occupancy_by_sqft_percentage.occupied_sqft_percent[`month${i}`] = this.formatPercentage(Math.round(this.occupancy_by_sqft.occupied_sqft[`month${i}`]/ this.occupancy_by_sqft.total_sqft[`month${i}`] * 1e4)/1e2 || 0);
      this.occupancy_by_sqft_percentage.vacant_sqft_percent[`month${i}`] = this.formatPercentage(Math.round(this.occupancy_by_sqft.vacant_sqft[`month${i}`]/ this.occupancy_by_sqft.total_sqft[`month${i}`] * 1e4)/1e2 || 0);
      this.occupancy_by_sqft_percentage.complimentary_sqft_percent[`month${i}`] = this.formatPercentage(Math.round(this.occupancy_by_sqft.complimentary_sqft[`month${i}`]/ this.occupancy_by_sqft.total_sqft[`month${i}`] * 1e4)/1e2 || 0);
      this.occupancy_by_sqft_percentage.reserved_sqft_percent[`month${i}`] = this.formatPercentage(Math.round(this.occupancy_by_sqft.reserved_sqft[`month${i}`]/ this.occupancy_by_sqft.total_sqft[`month${i}`] * 1e4)/1e2 || 0);
      this.occupancy_by_sqft_percentage.total_sqft_percent[`month${i}`] = 100

    }
    
  }

  async getTotalUnits() {
    let date_range = this.getDateRange('EOM', 13, 'YYYY-MM-DD');
    let payload = {date_range, properties: this.properties};

    this.total_units = await msrModels.Activity.totalUnitsDataByMonths(this.connection, payload)
  }

  async getAutopayEnrollment() {
    let dates = this.getDateRange('EOM', 13, 'YYYY-MM-DD');
    let autopay_summary = await msrModels.AutoPay.summaryAutopayByMonths(this.connection,  { dates, property_ids: this.properties });
    this.autopay_enrollment = {
      count: { metric: 'Autopay Enrollment' }
    };

    for(let i=1; i<=Object.keys(this.date_range).length; i++) {
      let month = this.date_range[`month${i}`];
      let data = autopay_summary.find(ap => ap.month === month);
      this.autopay_enrollment.count[`month${i}`] = data?.autopay_count || 0;
    }

    return this.autopay_enrollment;
  }

  async getInsuranceEnrollment() {
    let dates = this.getDateRange('EOM', 13, 'YYYY-MM-DD');
    let insurance_summary = await msrModels.Insurance.summaryInsuranceByMonths(this.connection,  { dates, property_ids: this.properties });
    this.insurance_enrollment = {
      count: { metric: 'Insurance/Protection Enrollment'}
    };

    for(let i=1; i<=Object.keys(this.date_range).length; i++) {
      let month = this.date_range[`month${i}`];
      let data = insurance_summary.find(ap => ap.month === month);
      this.insurance_enrollment.count[`month${i}`] = data?.insurance_count || 0;
    }

    return this.insurance_enrollment;
  }

  async getOverlockedSpaces() {
    let dates = this.getDateRange('EOM', 13, 'YYYY-MM-DD');
    let overlock_summary = await msrModels.Overlock.summaryOverlockByMonths(this.connection,  { dates, property_ids: this.properties });
    this.overlocked_spaces = {
      count:  { metric: 'Overlocked Spaces'}
    };

    for(let i=1; i<=Object.keys(this.date_range).length; i++) {
      let month = this.date_range[`month${i}`];
      let data = overlock_summary.find(ap => ap.month === month);
      this.overlocked_spaces.count[`month${i}`] = data?.overlock_count || 0;
    }

    return this.overlocked_spaces;
  }

  async getRentUnchanged() {
    let dates = this.getDateRange('EOM', 13, 'YYYY-MM-DD');
    let rent_unchanged_summary = await msrModels.RentUnChange.summaryRentUnchangedMyMonths(this.connection,  { dates, property_ids: this.properties });
    this.rent_unchanged = {
      count: { metric: 'No Rent Change in Last 12 Months'}
    };

    for(let i=1; i<=Object.keys(this.date_range).length; i++) {
      let month = this.date_range[`month${i}`];
      let data = rent_unchanged_summary.find(ap => ap.month === month);
      this.rent_unchanged.count[`month${i}`] = data?.rent_unchanged_count || 0;
    }

    return this.rent_unchanged;
  }

  async getLeadActivity() {
    let leads_summary = await msrModels.Leads.summaryLeadsByMonths(this.connection, { start_date: this.end_date, end_date: this.start_date, property_ids: this.properties });
    let leads_converted = await msrModels.Leads.leadsConvertedByMonths(this.connection, { start_date: this.end_date, end_date: this.start_date, property_ids: this.properties });
    this.lead_activity = {
      web_leads: { metric: 'Web Leads' },
      walk_in_leads: { metric: 'Walk-in Leads' },
      phone_leads: { metric: 'Phone Leads' },
      other_leads: { metric: 'Other Leads' },
      total_leads: { metric: 'Total Leads' },
      leads_converted: { metric: 'Leads Converted' }
    };

    for(let i=1; i<=Object.keys(this.date_range).length; i++) {
      let month = this.date_range[`month${i}`];

      let web_leads = leads_summary.find(ap => ap.month === month && ap.source === 'Web Leads');
      this.lead_activity.web_leads[`month${i}`] = web_leads?.leads_count || 0;

      let walk_in_leads = leads_summary.find(ap => ap.month === month && ap.source === 'Walk-In Leads');
      this.lead_activity.walk_in_leads[`month${i}`] = walk_in_leads?.leads_count || 0;

      let phone_leads = leads_summary.find(ap => ap.month === month && ap.source === 'Phone Leads');
      this.lead_activity.phone_leads[`month${i}`] = phone_leads?.leads_count || 0;

      let other_leads = leads_summary.find(ap => ap.month === month && ap.source === 'Others');
      this.lead_activity.other_leads[`month${i}`] = other_leads?.leads_count || 0;

      this.lead_activity.total_leads[`month${i}`]  = this.lead_activity.web_leads[`month${i}`] + this.lead_activity.walk_in_leads[`month${i}`] + this.lead_activity.phone_leads[`month${i}`] + this.lead_activity.other_leads[`month${i}`];

      let converted_leads = leads_converted.find(ap => ap.month === month);
      this.lead_activity.leads_converted[`month${i}`] = converted_leads?.leads_count || 0;
    }
    return this.lead_activity;
  }

  async getDelinquencyBreakdown() {
    let dates = this.getDateRange('EOM', 13, 'YYYY-MM-DD');
    let summary_delinquent_amount = await msrModels.Delinquencies.summaryDelinquentAmountByMonths(this.connection, { dates, property_ids: [this.properties] });
    let summary_delinquent_count = await msrModels.Delinquencies.summaryDelinquentCountByMonths(this.connection, { dates, property_ids: [this.properties] });

    this.delinquency_by_amount = {
      delinquent_amount_10: { metric: '0-10' },
      delinquent_amount_30: { metric: '11-30' },
      delinquent_amount_60: { metric: '31-60' },
      delinquent_amount_90: { metric: '61-90' },
      delinquent_amount_120: { metric: '91-120' },
      delinquent_amount_180: { metric: '121-180' },
      delinquent_amount_360: { metric: '181-360' },
      delinquent_amount_gtr_360: { metric: '361+' }
    }

    this.delinquency_by_count = {
      delinquent_count_10: { metric: '0-10' },
      delinquent_count_30: { metric: '11-30' },
      delinquent_count_60: { metric: '31-60' },
      delinquent_count_90: { metric: '61-90' },
      delinquent_count_120: { metric: '91-120' },
      delinquent_count_180: { metric: '121-180' },
      delinquent_count_360: { metric: '181-360' },
      delinquent_count_gtr_360: { metric: '361+' }
    }

    this.delinquency_by_percentage = {
      delinquent_percentage_10: { metric: '0-10' },
      delinquent_percentage_30: { metric: '11-30' },
      delinquent_percentage_60: { metric: '31-60' },
      delinquent_percentage_90: { metric: '61-90' },
      delinquent_percentage_120: { metric: '91-120' },
      delinquent_percentage_180: { metric: '121-180' },
      delinquent_percentage_360: { metric: '181-360' },
      delinquent_percentage_gtr_360: { metric: '361+' }
    }

    let delinquency_amount_total = { metric: 'Total' };
    let delinquency_amount_total_gtr_30 = { metric: 'Greater than 30 Days' };
    let delinquency_count_total = { metric: 'Total' };
    let delinquency_count_total_gtr_30 = { metric: 'Greater than 30 Days' };
    let delinquency_percentage_total = { metric: 'Total' };
    let delinquency_percentage_total_gtr_30 = { metric: 'Greater than 30 Days' };

    for(let i=1; i<=Object.keys(this.date_range).length; i++) {
      let month = this.date_range[`month${i}`];

      let summary_amount = summary_delinquent_amount.find(ap => ap.month === month);
      Object.keys(this.delinquency_by_amount).forEach((key) => {
        this.delinquency_by_amount[key][`month${i}`] = parseFloat(summary_amount && summary_amount[key] || 0);
        delinquency_amount_total[`month${i}`] = (delinquency_amount_total[`month${i}`] || 0) + this.delinquency_by_amount[key][`month${i}`];
      });
      delinquency_amount_total_gtr_30[`month${i}`] = delinquency_amount_total[`month${i}`] - this.delinquency_by_amount.delinquent_amount_10[`month${i}`] - this.delinquency_by_amount.delinquent_amount_30[`month${i}`];

      let summary_count = summary_delinquent_count.find(ap => ap.month === month);
      Object.keys(this.delinquency_by_count).forEach((key) => {
        this.delinquency_by_count[key][`month${i}`] = parseInt(summary_count && summary_count[key] || 0);
        delinquency_count_total[`month${i}`] = (delinquency_count_total[`month${i}`] || 0) + this.delinquency_by_count[key][`month${i}`];
      });
      delinquency_count_total_gtr_30[`month${i}`] = delinquency_count_total[`month${i}`] - this.delinquency_by_count.delinquent_count_10[`month${i}`] - this.delinquency_by_count.delinquent_count_30[`month${i}`];

      Object.keys(this.delinquency_by_percentage).forEach(
        key => this.delinquency_by_percentage[key][`month${i}`] = this.formatPercentage(Math.round(this.delinquency_by_count[key.replace('percentage', 'count')][`month${i}`] / this.occupancy_by_count.occupied_count[`month${i}`] * 1e4) / 1e2)
      );
      delinquency_percentage_total[`month${i}`] = this.formatPercentage(Math.round(delinquency_count_total[`month${i}`] / this.occupancy_by_count.occupied_count[`month${i}`] * 1e4) / 1e2);
      delinquency_percentage_total_gtr_30[`month${i}`] = this.formatPercentage(Math.round(delinquency_count_total_gtr_30[`month${i}`] / this.occupancy_by_count.occupied_count[`month${i}`] * 1e4) / 1e2);
    }

    this.delinquency_by_amount.total = delinquency_amount_total;
    this.delinquency_by_amount.total_gtr_30 = delinquency_amount_total_gtr_30;
    this.delinquency_by_count.total = delinquency_count_total;
    this.delinquency_by_count.total_gtr_30 = delinquency_count_total_gtr_30;
    this.delinquency_by_percentage.total = delinquency_percentage_total;
    this.delinquency_by_percentage.total_gtr_30 = delinquency_percentage_total_gtr_30;

    return {
      delinquency_by_amount: this.delinquency_by_amount,
      delinquency_by_count: this.delinquency_by_count,
      delinquency_by_percentage: this.delinquency_by_percentage
    };
  }

  async getRentChange() {
    let dates = this.getDateRange('EOM', 13, 'YYYY-MM-DD');
    const rent_change_summary = await msrModels.RentChange.summarizedRentChangeMyMonths(this.connection,  { dates, property_ids: this.properties });

    this.rent_change_count = {
      less_than_six_months: { metric: 'Less than 6 Months' },
      six_to_twelve_months: { metric: '6-12 Months' },
      twelve_to_eighteen_months: { metric: '12-18 Months' },
      eighteen_to_twenty_four_months: { metric: '18-24 Months' },
      gtr_than_twenty_four_months: { metric: 'Greater than 24 Months' },
      total : { metric: 'Total' }
    }

    this.rent_change_variance = {
      less_than_six_months: { metric: 'Less than 6 Months' },
      six_to_twelve_months: { metric: '6-12 Months' },
      twelve_to_eighteen_months: { metric: '12-18 Months' },
      eighteen_to_twenty_four_months: { metric: '18-24 Months' },
      gtr_than_twenty_four_months: { metric: 'Greater than 24 Months' },
      total : { metric: 'Total' }
    }

    this.rent_change_variance_percentage = {
      less_than_six_months: { metric: 'Less than 6 Months' },
      six_to_twelve_months: { metric: '6-12 Months' },
      twelve_to_eighteen_months: { metric: '12-18 Months' },
      eighteen_to_twenty_four_months: { metric: '18-24 Months' },
      gtr_than_twenty_four_months: { metric: 'Greater than 24 Months' },
      total : { metric: 'Total' }
    }

    for(let i=1; i<=Object.keys(this.date_range).length; i++) {
      let month = this.date_range[`month${i}`];
      let data = rent_change_summary.find(ap => ap.month === month);

      this.rent_change_count.less_than_six_months[`month${i}`] = parseInt(data?.less_than_six || 0);
      this.rent_change_count.six_to_twelve_months[`month${i}`] = parseInt(data?.six_eleven || 0);
      this.rent_change_count.twelve_to_eighteen_months[`month${i}`] = parseInt(data?.twelve_seventeen || 0);
      this.rent_change_count.eighteen_to_twenty_four_months[`month${i}`] = parseInt(data?.eighteen_twentyfour || 0);
      this.rent_change_count.gtr_than_twenty_four_months[`month${i}`] = parseInt(data?.above_twentyfour || 0);
      this.rent_change_count.total[`month${i}`] = this.rent_change_count.less_than_six_months[`month${i}`] + this.rent_change_count.six_to_twelve_months[`month${i}`] + this.rent_change_count.twelve_to_eighteen_months[`month${i}`] + this.rent_change_count.eighteen_to_twenty_four_months[`month${i}`] + this.rent_change_count.gtr_than_twenty_four_months[`month${i}`];

      let total_new_rent_amount = parseFloat(data?.less_than_six_new_rent_amount || 0) + parseFloat(data?.six_eleven_new_rent_amount || 0) + parseFloat(data?.twelve_seventeen_new_rent_amount || 0) + parseFloat(data?.eighteen_twentyfour_new_rent_amount || 0) + parseFloat(data?.above_twentyfour_new_rent_amount || 0);
      let total_old_rent_amount = parseFloat(data?.less_than_six_old_rent_amount || 0) + parseFloat(data?.six_eleven_old_rent_amount || 0) + parseFloat(data?.twelve_seventeen_old_rent_amount || 0) + parseFloat(data?.eighteen_twentyfour_old_rent_amount || 0) + parseFloat(data?.above_twentyfour_old_rent_amount || 0);

      this.rent_change_variance.less_than_six_months[`month${i}`] = this.calculateVariance(parseFloat(data?.less_than_six_new_rent_amount || 0), parseFloat(data?.less_than_six_old_rent_amount || 0));
      this.rent_change_variance.six_to_twelve_months[`month${i}`] = this.calculateVariance(parseFloat(data?.six_eleven_new_rent_amount || 0), parseFloat(data?.six_eleven_old_rent_amount || 0));
      this.rent_change_variance.twelve_to_eighteen_months[`month${i}`] = this.calculateVariance(parseFloat(data?.twelve_seventeen_new_rent_amount || 0), parseFloat(data?.twelve_seventeen_old_rent_amount || 0));
      this.rent_change_variance.eighteen_to_twenty_four_months[`month${i}`] = this.calculateVariance(parseFloat(data?.eighteen_twentyfour_new_rent_amount || 0), parseFloat(data?.eighteen_twentyfour_old_rent_amount || 0));
      this.rent_change_variance.gtr_than_twenty_four_months[`month${i}`] = this.calculateVariance(parseFloat(data?.above_twentyfour_new_rent_amount || 0), parseFloat(data?.above_twentyfour_old_rent_amount || 0));
      this.rent_change_variance.total[`month${i}`] = this.calculateVariance(total_new_rent_amount, total_old_rent_amount);

      this.rent_change_variance_percentage.less_than_six_months[`month${i}`] = this.formatPercentage(this.calculatePercentageVariance(parseFloat(data?.less_than_six_new_rent_amount || 0), parseFloat(data?.less_than_six_old_rent_amount || 0)) || 0);
      this.rent_change_variance_percentage.six_to_twelve_months[`month${i}`] = this.formatPercentage(this.calculatePercentageVariance(parseFloat(data?.six_eleven_new_rent_amount || 0), parseFloat(data?.six_eleven_old_rent_amount || 0)) || 0);
      this.rent_change_variance_percentage.twelve_to_eighteen_months[`month${i}`] = this.formatPercentage(this.calculatePercentageVariance(parseFloat(data?.twelve_seventeen_new_rent_amount || 0), parseFloat(data?.twelve_seventeen_old_rent_amount || 0)) || 0);
      this.rent_change_variance_percentage.eighteen_to_twenty_four_months[`month${i}`] = this.formatPercentage(this.calculatePercentageVariance(parseFloat(data?.eighteen_twentyfour_new_rent_amount || 0), parseFloat(data?.eighteen_twentyfour_old_rent_amount || 0)) || 0);
      this.rent_change_variance_percentage.gtr_than_twenty_four_months[`month${i}`] = this.formatPercentage(this.calculatePercentageVariance(parseFloat(data?.above_twentyfour_new_rent_amount || 0), parseFloat(data?.above_twentyfour_old_rent_amount || 0)) || 0);
      this.rent_change_variance_percentage.total[`month${i}`] = this.formatPercentage(this.calculatePercentageVariance(total_new_rent_amount, total_old_rent_amount) || 0);
    }

    return {
      rent_change_count: this.rent_change_count,
      rent_change_variance: this.rent_change_variance,
      rent_change_variance_percentage: this.rent_change_variance_percentage
    }
  }

  setEndDate() {
    this.end_date = moment(this.start_date).subtract(12, 'months').startOf('month').format('YYYY-MM-DD');
  }

  getRange(category, period, format) {
    if(!this.start_date) return;
    
    format = format || 'MMMM-YY';
    let result = {};

    switch(category){
      case 'month':
        for(let i=1; i<=period; i++){

          if(i==1)
            result[`month${i}`] = moment(this.start_date).startOf('month').format(format);
          else
            result[`month${i}`] = moment(this.start_date).startOf('month').subtract(i-1, 'months').format(format);
        }
    } 

    this.date_range = result;
    return result;
  }

  getDateRange(category, period, format) {
    if(!this.start_date) return;
    
    format = format || 'MMMM-YY';
    let result = [];

    switch(category){
      case 'EOM':
        for(let i=1; i<=period; i++){

          if(i==1)
            result.push(moment(this.start_date).format(format))
          else
            result.push(moment(this.start_date).subtract(i-1, 'months').endOf('month').format(format));
        }
    }

    return result;
  }

  formatPercentage(value) {
    return Math.round(value * 1e1)/1e1;
  }

  calculateVariance(value1, value2) {
    return value1 - value2;
  }

  calculatePercentageVariance(value1, value2) {
    return Math.round( ((value1/value2) - 1) * 1e4)/1e2;
  }
}

module.exports = ManagementHistory;

var moment      = require('moment');
var models      = require(__dirname + '/../../models');
var Enums       = require(__dirname + '/../../modules/enums.js');
var msrModels = require(__dirname + '/../../models/msr');