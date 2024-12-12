const moment = require('moment');
const models = require('../../models');
const e = require('../../modules/error_handler.js');
const rounding = require(`../../modules/rounding`);
const Lease = require('./../lease');

class LeaseRentChange {

    constructor(leaseData = {}, propertyData = {}) {

      this.data = leaseData;
      this.id = leaseData.id || leaseData.rentChangeId || null;

      this.type = leaseData.type || `auto`;
      this.date = moment(propertyData.date) || moment();
      this.leaseId = leaseData.lease_id || null;
      this.propertyId = propertyData.property?.id || null;
      this.unitId = leaseData.unit_id || null;
      this.moveInDate = moment(leaseData.move_in_date) || null;
      this.rentPlan = leaseData.rent_plan || {};
      this.rentPlanSettings = leaseData.rent_plan?.settings || [];
      this.stageRentPlanSetting = null;
      this.rentChangeIntervalMonths = null;
      this.lastRentChangeDate = !!leaseData.last_rent_change_date ? moment(leaseData.last_rent_change_date) : moment(this.moveInDate);
      this.lastCancelledRentChangeDate = !!leaseData.last_cancelled_rent_change_date ? moment(leaseData.last_cancelled_rent_change_date) : null;
      this.currentRent = leaseData.current_rent || null;
      this.setRate = leaseData.price?.set_rate || null;
      this.sellRate = leaseData.price?.sell_rate || null;
      this.paidUpto = moment(leaseData.paid_upto) || null;
      this.billDay = (leaseData.bill_day?.toString().length == 1 ? `0${leaseData.bill_day}`: leaseData.bill_day) || `01`;
      this.minimumRentChangeinterval = propertyData.property?.min_rent_change_interval || null;
      this.rentChangeQueueMonths = propertyData.property?.advance_rent_change_queue_months || 3;
      this.notificationPeriod = propertyData.property?.notification_period || 30;
      this.affectTimeline = true;
      this.roundTo = propertyData.property?.round_to || null;
      this.validRentChanges = [];
      this.userId = leaseData.userId;
      this.created_by = propertyData.created_by || propertyData.hbAppContactId || null;

      this.maximumRaise = {
        type: leaseData.rent_plan?.maximum_raise?.type || null,
        value: leaseData.rent_plan?.maximum_raise?.value || null
      }

      this.minimumRaise = {
        type: leaseData.rent_plan?.minimum_raise?.type || null,
        value: leaseData.rent_plan?.minimum_raise?.value || null
      }

      this.rentCap = {
        type: leaseData.rent_plan?.rent_cap?.type || null,
        value: leaseData.rent_plan?.rent_cap?.value || null
      }

      this.monthsSkipped = leaseData.monthsSkipped || 1;
      this.saveResult = null;

      this.notificationStatus = null
      this.notificationDate = null

      this.logData = {
        ...(!propertyData.date && { date: this.date }),   //include date in lease log only if there is no date in propertydata
        leaseId: this.leaseId || null,
        billDay: this.billDay,
        unit: {
          id: this.unitId,
          current_rent: this.currentRent,
          sell_rate: this.sellRate,
          set_rate: this.setRate,
        }
      }

    }

    async findById(connection, rentChangeId) {
      let result = await models.LeaseRentChange.findById(connection, rentChangeId);
      if (result) {
        this.id = result.id
        this.upload_id = result.upload_id
        this.notificationStatus = result.notification_status
        this.notificationDate = result.notification_sent
      }
    }

    async save(connection, data = this.data) {
      let result = await  models.LeaseRentChange.save(connection, data, this.id);
      if (result) {
        this.id = result.insertId;
        this.saveResult = result
      }
      return result
    }

    async saveNotificationDetails(connection, data, fields) {
      let result = await  models.LeaseRentChange.saveNotificationDetails(connection, data, fields);
      if (result) {
        this.id = result.insertId;
        this.saveResult = result
      }
      return result
    }
    
    async update(connection, data) {
      let existedRentChange = await models.LeaseRentChange.fetchRentChangesById(connection, this.id);

      if (["skipped", "cancelled"].includes(data.status)) {
        if (existedRentChange?.status !== "initiated") e.th(400, `Cannot update status to '${data.status}'`);
      }
      if (data.status === 'skipped') {
        if (existedRentChange?.status !== "skipped") {
          await models.LeaseRentChange.insertRentChangeEntry(connection, {
            ...existedRentChange,
            ...{
              target_date: existedRentChange.target_date,
              effective_date: moment(existedRentChange.effective_date).add(this.monthsSkipped, 'month').format("YYYY-MM-DD HH:mm:ss"),
              status: 'initiated',
              service_id: null,
              affect_timeline: existedRentChange.affect_timeline,
              change_type: existedRentChange.change_type,
              change_value: existedRentChange.change_value,
              change_amt: existedRentChange.change_amt,
              new_rent_amt: existedRentChange.new_rent_amt,
              upload_id: existedRentChange.upload_id
            }
          })
          data.service_id = null
        }
      }

      data.status_updated_at = new Date;

      let result = await models.LeaseRentChange.update(connection, data, this.id);
      if (result.affectedRows == 0) e.th(400, "Invalid rent change id")
      return result.affectedRows
    }

    calculateConstraints() {
      if (this.maximumRaise)
        this.maximumRaise.dollarAmount = this.calculateDollarAmount(this.maximumRaise.type, this.maximumRaise.value);

      if (this.minimumRaise)
        this.minimumRaise.dollarAmount = this.calculateDollarAmount(this.minimumRaise.type, this.minimumRaise.value);

      if (this.rentCap)
        this.rentCap.dollarAmount = this.calculateDollarAmount(this.rentCap.type, this.rentCap.value, true);

      console.log(`Maximum Raise: $${this.maximumRaise?.dollarAmount}, | Minimum Raise: $${this.minimumRaise?.dollarAmount}, | Rent Cap: $${this.rentCap.dollarAmount}`);

      this.logData.constraints = {
        maximumRaise: this.maximumRaise,
        minimumRaise: this.minimumRaise,
        rentCap: this.rentCap
      }
    }

    /**
     * Calculates and return total amount or change amount depending on target flag
     * @param { String } changeType
     * @param { Number } changeValue
     * @param { Boolean } target If set to true, the total amount will be retured. If false, change amount will be returned
     * @returns Calculated target value or change value
     */
    calculateDollarAmount(changeType, changeValue, target = false) {
      let changeDollarAmount, targetDollarAmount;

      switch (changeType) {

        case `dollar_amount`: 
          changeDollarAmount = changeValue;
          targetDollarAmount = changeValue;
          break;

        case `rent_percent`:
          changeDollarAmount = this.currentRent * changeValue * 1e6 / 1e8;
          targetDollarAmount = this.currentRent + changeDollarAmount;
          break;

        // Variance = ((newRent - sellRate) * 100 / sellRate) & newRent = (currentRent + changeAmount)
        case `rent_sell_variance_percent`:
          targetDollarAmount = (changeValue + 100) * this.sellRate * 1e6 / 1e8;
          changeDollarAmount = targetDollarAmount - this.currentRent;
          break;

        case `sell_rate_percent`:
          changeDollarAmount = this.sellRate * changeValue * 1e6 / 1e8;
          targetDollarAmount = changeDollarAmount;
          break;

        case `set_rate_percent`:
          changeDollarAmount = this.setRate * changeValue * 1e6 / 1e8;
          targetDollarAmount = changeDollarAmount;
          break;

      }

      if (target) return targetDollarAmount;
      return changeDollarAmount;
    }

    ignoreLeaseRentChange() {
      let 
        todayIsBeforeLastRentChange = (this.date).isSameOrBefore(this.lastRentChangeDate),
        isCurrentRentGreaterThanRentCap = this.currentRent >= this.rentCap.dollarAmount;

      if (todayIsBeforeLastRentChange) {
        console.log(`Today(${this.date.format(`YYYY-MM-DD`)}) can't be on or before move in date or last rent change date(${this.lastRentChangeDate.format(`YYYY-MM-DD`)}) of the lease. Ignoring lease ${this.leaseId}`);
        return true;
      };
      if (isCurrentRentGreaterThanRentCap) {
        console.log(`Current Rent for ${this.leaseId} is already greater than the Rent Cap setting. Ignoring!`);
        return true;
      }
    }

    computeRentPlanSettingForLeaseStage() {
      let
        rentPlanSettings = this.rentPlanSettings.sort((a, b)=> a.sort_order - b.sort_order),
        daysElapsedFromMoveIn = this.date.diff(this.moveInDate, 'days'),
        daysElapsedInRentPlan = 0;

      for (let i = 0; i < rentPlanSettings.length; i++) {
        let plan = rentPlanSettings[i];

        this.stageRentPlanSetting = plan;
        daysElapsedInRentPlan += plan.month * 30;

        console.log(`Days: `, daysElapsedInRentPlan, daysElapsedFromMoveIn);

        if (daysElapsedInRentPlan >= daysElapsedFromMoveIn) {
          this.rentChangeIntervalMonths = plan.month;
          break;
        } else if (!!plan.recurrence_interval) {
          this.rentChangeIntervalMonths = plan.recurrence_interval;
        }
      }

      if (this.rentChangeIntervalMonths) {
        this.logData.rentPlan = {
          id: this.rentPlan?.id,
          trigger: {
            setting: this.stageRentPlanSetting,
            interval: this.rentChangeIntervalMonths
          }
        };
        console.log(`stageRentPlanSettings: ${JSON.stringify(this.stageRentPlanSetting, null, 4)} | rentChangeIntervalMonths: ${this.rentChangeIntervalMonths}`);
      } else {
        console.log(`No further rent change stage for lease ${this.leaseId} in the assigned Rent Plan.`);
      }
    }

    calculateNextRentChangeDate() {
      const lastRentChangeCancelled = this.isLastRentChangeCancelled();

      const dateToCalculateFrom = lastRentChangeCancelled ? moment(this.lastCancelledRentChangeDate) : moment(this.lastRentChangeDate);

      if (lastRentChangeCancelled && moment(this.date).isSameOrBefore(dateToCalculateFrom)) {
        console.log(`The stage up-to ${dateToCalculateFrom.format(`YYYY-MM-DD`)} is cancelled. Ignoring this lease.`);
        return;
      }

      this.nextRentChangeDate = dateToCalculateFrom.add(this.rentChangeIntervalMonths * 30, 'days');
      console.log(`nextRentChangeDate:`, this.nextRentChangeDate.format(`YYYY-MM-DD`));

      this.logData.lastRentChange = {
        date: dateToCalculateFrom,
        status: lastRentChangeCancelled ? `Cancelled` : `Deployed`
      }

    }

    isLastRentChangeCancelled() {
      if (!!this.lastCancelledRentChangeDate && (this.lastCancelledRentChangeDate.isAfter(this.lastRentChangeDate))) {
        console.log(`Last Rent Change for lease ${this.leaseId} was cancelled.`);
        return true;
      }
    }

    isLeaseInStage() {
      let 
        minDate = moment(this.date).add(this.notificationPeriod, 'days'),
        maxDate = moment(this.date).add(this.rentChangeQueueMonths, `months`).endOf(`month`);

      console.log(`Today:`, this.date.format(`YYYY-MM-DD`) , `| minDate:`, minDate.format(`YYYY-MM-DD`),`| maxDate:`, maxDate.format(`YYYY-MM-DD`));

      if (this.nextRentChangeDate.isBetween(minDate, maxDate, null, [])) {
        this.logData.stage = {
          status: `in_stage`,
          minDate,
          maxDate,
          targetDate: this.nextRentChangeDate
        }
        return true;
      }
      console.log(`Lease ${this.leaseId} not in stage`);
    }

    isNextRentChangeDateInPast() {
      if (this.nextRentChangeDate.isSameOrBefore(this.date)) {
        let missedTargetDate = this.nextRentChangeDate
				this.nextRentChangeDate = moment(this.date).add(this.notificationPeriod, 'days');
				console.log(`Rent Change date for ${this.leaseId} is already past. A new rent change for ${this.nextRentChangeDate.format(`YYYY-MM-DD`)} (${this.notificationPeriod} days - Notification period from today) will be queued for this lease`);
        this.logData.stage = {
          status: `target_date_missed`,
          missedTargetDate,
          newtargetDate: this.nextRentChangeDate
        }
        return true;
      }
    }

    calculateEffectiveDateForRentChange(targetDate = this.nextRentChangeDate, billDay = this.billDay) {
      let 
        effectiveDate,
        targetDay = moment(targetDate).format(`DD`),
        targetMonth = moment(targetDate).format(`YYYY-MM`),
        oneMonthAfterTarget = moment(targetDate).add(1, 'month').format(`YYYY-MM`),
        lastDayOfTargetMonth = moment(targetDate).endOf(`month`).format(`DD`),
        lastDayOfOneMonthAfterTarget = moment(oneMonthAfterTarget).endOf(`month`).format(`DD`);

      if (parseInt(lastDayOfTargetMonth) < parseInt(billDay)) {
        effectiveDate = `${ targetMonth }-${ lastDayOfTargetMonth }`
      } else if (parseInt(targetDay) <= parseInt(billDay)) {
        effectiveDate = `${ targetMonth }-${ billDay }`;
      } else if (parseInt(lastDayOfOneMonthAfterTarget) < parseInt(billDay)) {
        effectiveDate = `${ oneMonthAfterTarget }-${ lastDayOfOneMonthAfterTarget }`;
      } else {
        effectiveDate = `${ oneMonthAfterTarget }-${ billDay }`;
      }

      this.effectiveDate = moment(effectiveDate);
      return this.effectiveDate;
    }

    isRentChangeWithinMinimumInterVal() {
      let rentChangeInterval = moment(this.effectiveDate).diff(this.lastRentChangeDate, `days`);
      if (!this.minimumRentChangeinterval || (rentChangeInterval > (this.minimumRentChangeinterval * 30))) return;

      console.log(`Lease ${this.leaseId} does not meet minimum rent change interval. Ignoring`);
      return true;
    }

    calculateEffectiveDateForPrepaidTenants() {
      let 
        prePayRentRaise = this.rentPlan.prepay_rent_raise,
        paidUpto = this.paidUpto || null;

      if (!prePayRentRaise && paidUpto && paidUpto.isSameOrAfter(this.effectiveDate)) {
        let dayAfterPrepay = moment(paidUpto).add(1, `days`);
        this.calculateEffectiveDateForRentChange(dayAfterPrepay);
        console.log(`The lease ${this.leaseId} is prepaid upto ${paidUpto.format(`YYYY-MM-DD`)} and the Rent Plan doesn't allow rent raise for pre-paid tenants. Scheduling a rent change after paid-through date (${this.effectiveDate.format(`YYYY-MM-DD`)})`);
      }

      this.logData.prePay = {
        paidUpto,
        allowRentRaise: !!prePayRentRaise
      }
    }

    findRentChangeTypeAndValue() {
      if (this.stageRentPlanSetting.target) {
        this.logData.rentCalculation = { type: `target` };

        if (this.isTargetAchieved()) {
          this.logData.rentCalculation.targetAchieved = true;
          this.changeType = this.stageRentPlanSetting.target.after.change_type;
          this.changeValue = this.stageRentPlanSetting.target.after.change_value;
        } else {
          this.logData.rentCalculation.targetAchieved = false;
          this.changeType = this.maximumRaise.type;
          this.changeValue = this.maximumRaise.value;
        }
      } else {
        this.logData.rentCalculation = { type: `increase_by` }
        this.changeType = this.stageRentPlanSetting.increase_by.change_type;
        this.changeValue = this.stageRentPlanSetting.increase_by.change_value;
      }
      this.logData.rentCalculation = {
        ...this.logData.rentCalculation,
        changeType: this.changeType,
        changeValue: this.changeValue
      }
    }

    isTargetAchieved() {
      let 
        targetType = this.stageRentPlanSetting.target.before.target_type,
        targetValue = this.stageRentPlanSetting.target.before.target_value,
        targetRent = this.calculateDollarAmount(targetType, targetValue, true);

      console.log(`Target Type: ${targetType}, | Target Value: ${targetValue}, | Target Rent: ${targetRent}`)
      return this.currentRent >= targetRent;
    }

    calculateRentChange() {
      this.rentChangeAmount = this.calculateDollarAmount(this.changeType, this.changeValue);
      console.log(`Change Type: ${this.changeType}, | Change Value: ${this.changeValue}, | Calculated Rent Change amount: ${this.rentChangeAmount}`);

      this.logData.rentCalculation = {
        ...this.logData.rentCalculation,
        changeAmount: this.rentChangeAmount
      }
    }

    applyMaximumRaiseConstraint() {
      if (this.maximumRaise?.dollarAmount && (this.rentChangeAmount > this.maximumRaise?.dollarAmount)) {
        console.log(`Maximum Rent Raise constraint kicked in.`)

        this.rentChangeAmount = this.maximumRaise?.dollarAmount;
        this.changeType = this.maximumRaise?.type;
        this.changeValue = this.maximumRaise?.value;

        this.calculateNewRent();
        this.logData.constraints.applied = `maximum_raise` ;
      }
    }

    calculateNewRent() {
      this.newRent = this.currentRent + this.rentChangeAmount;
      this.logData.rentCalculation.rent = this.newRent
    }

    applyRentCapConstraint() {
      if (this.rentCap.dollarAmount && (this.newRent > this.rentCap.dollarAmount)) {
        console.log(`Rent Cap constraint kicked in.`);

        this.newRent = this.rentCap.dollarAmount;
        this.adjustRentChangeAmount();

        this.logData.constraints.applied = `rent_cap` ;
      }
    }

    applyMinimumRaiseConstraint() {
      let changeAmount = this.newRent - this.currentRent;
      if (this.minimumRaise?.dollarAmount && (changeAmount < this.minimumRaise?.dollarAmount)) {
        console.log(`Minimum Rent Raise constraint kicked in.`);

        this.rentChangeAmount = this.minimumRaise?.dollarAmount;
        this.changeType = this.minimumRaise.type;
        this.changeValue = this.minimumRaise.value;

        this.calculateNewRent();
        this.logData.constraints.applied = `minimum_raise`;
      }
    }

    roundNewRent() {
      //TODO: Function modified to mitigate the issues in HB rounding module. Use the HB rounding module completely after addressing the bugs.
      if (!this.roundTo) return;

      const roundTo = this.roundTo.replace(/-/g, "_");

      if ((this.newRent % 1) !== 0) {
        if ([`up_half`, `down_half`].includes(roundTo))
          this.newRent = LeaseRentChange.roundToHalfDollars(this.newRent, roundTo);
        else
          this.newRent = rounding.convert({ value: this.newRent, type: roundTo });
      }

      this.newRent = this.newRent.toFixed(2);

			this.adjustRentChangeAmount();
      this.logData.rounding = {
        roundTo,
        roundedRent: this.newRent
      }
      return this.newRent;
    }

    adjustRentChangeAmount() {
      this.rentChangeAmount = parseFloat((this.newRent - this.currentRent).toFixed(2));
    }

    /**
     * Temporary function to use until bugs in HB rounding module is fixed.
     * @param { number } amount
     * @param { string } roundingType
     */
    static roundToHalfDollars(amount, roundingType) {
      let
        roundedValues = {},
        decimalPart = LeaseRentChange.getDecimalPart(amount)
      ;

      if (decimalPart > 0.5) roundedValues =  {
        down_half: Math.floor(amount) + 0.5,
        up_half: Math.ceil(amount)
      }

      else if (decimalPart < 0.5) roundedValues =  {
        down_half: Math.floor(amount),
        up_half: Math.floor(amount) + 0.5
      }

      return roundedValues[roundingType] || amount;
    }

    static getDecimalPart(value) {
      const decimalPart = ((value + '').split('.'))[1];
      return parseFloat(`0.${decimalPart}`);
    }

    static checkIfEffectiveDateWithinMinimumInterval(rentChangeDate, newEffectiveDate, minRentChangeInterval) {
      let
          minDate = moment(rentChangeDate).subtract(minRentChangeInterval, `month`).startOf(`month`).format(`YYYY-MM-DD`),
          maxDate = moment(rentChangeDate).add(minRentChangeInterval, `month`).endOf(`month`).format(`YYYY-MM-DD`);

      return (moment(newEffectiveDate).isBetween(minDate, maxDate, null, []));
    }

    static async computeDatesForInvoiceAdjustment(connection, rentChange = {}) {
      if (!rentChange?.id || !rentChange?.lease_id || !rentChange?.effective_date) return;

      let
        lease = new Lease({ id: rentChange.lease_id}),
        invoices = await lease.getFutureInvoicesByDate(connection, rentChange?.effective_date, 'active') || [],
        rentChangeNotifiedOn = moment(rentChange.notified_on).format(`YYYY-MM-DD`),
        rentChangeCreatedAt =  moment(rentChange.created_at).format(`YYYY-MM-DD`);

      if (!invoices.length) return;

      // automatic rent change with prepay rent raise enabled in rent plan
      if (rentChange.type == `auto` && rentChange.prepay_rent_raise) return {
        note: `Automatic rent change; Prepay Rent Raise enabled`,
        startDateForAdjustingInvoices: moment(rentChange?.effective_date).format(`YYYY-MM-DD`),
        newEffectiveDateForRentChange: null
      };

      let
        invoicesSortedByPeriodStart = invoices.sort((a, b) => moment(a.period_start).diff(moment(b.period_start))),
        paidInvoices = [], openInvoices = [];

      invoicesSortedByPeriodStart.forEach(invoice => {
        if (invoice.total_payments == invoice.total_amount) paidInvoices.push(invoice)
        else openInvoices.push(invoice);
      });

      let
        lastPaidInvoice = paidInvoices[paidInvoices.length - 1] || null,
        firstOpenInvoice = openInvoices[0] || null;

      // no fully paid invoice
      if (!lastPaidInvoice) {
        return {
          note: `No paid invoices. Adjusting all open future invoices`,
          startDateForAdjustingInvoices: firstOpenInvoice?.period_start,
          newEffectiveDateForRentChange: null
        };
      }

      // manual rent change - prepay rent raise allowed by manager
      if (rentChange.type == `manual`) {
        /* if there was atleast one prepaid invoice before creating the manual rent change, it assumes that manager
        confirmed prepay rent raise while scheduling. Hence adjusting all invoices after rent change effective date. */

        let firstInvoicePrepaidBeforeSchedulingRentChange = paidInvoices.find(invoice => (moment(invoice?.last_paid_on).startOf(`day`).isBefore(rentChangeCreatedAt)));

        if (firstInvoicePrepaidBeforeSchedulingRentChange) return {
          note: `Manual rent change; Prepaid before scheduling`,
          startDateForAdjustingInvoices: moment(rentChange?.effective_date).format(`YYYY-MM-DD`),
          newEffectiveDateForRentChange: null
        };
      };

      if (moment(lastPaidInvoice?.last_paid_on).isBefore(rentChangeNotifiedOn)) {
        return {
          note: `Fully paid invoices are paid before notification (${rentChangeNotifiedOn}). ${firstOpenInvoice ? 'Adjusting only the open invoices' : 'No open invoices to adjust'}`,
          startDateForAdjustingInvoices: firstOpenInvoice?.period_start,
          newEffectiveDateForRentChange: firstOpenInvoice?.period_start || moment(lastPaidInvoice.period_end).add(1, `day`).format(`YYYY-MM-DD`)
        };
      } else {
        let firstInvoicePaidAfterNotification = paidInvoices.find(invoice => moment(invoice.last_paid_on).isSameOrAfter(rentChangeNotifiedOn));
        let leaseRentChange = new LeaseRentChange;
        return {
          note: `Invoice paid after notification (${rentChangeNotifiedOn})`,
          startDateForAdjustingInvoices: firstInvoicePaidAfterNotification?.period_start,
          newEffectiveDateForRentChange:  leaseRentChange.calculateEffectiveDateForRentChange(firstInvoicePaidAfterNotification?.period_start, rentChange.bill_day)
        };
      }

    }

    static generateActionsPayload(rentChange = {}, data = {}) {
      let
        updateData = null,
        notesData = null,
        insertData = null
      ;

      updateData = {
        data: data.update,
        id: rentChange.id
      };

      if (data.note?.content) {
        notesData = {
          ...data.note,
          lease_id: rentChange.lease_id,
          rent_change_id: rentChange.id,
          contact_id: rentChange.contact_id,
          creation_type: `auto`,
          context: `rent_management`,
          pinned: 0
        };
      };

      if (data.insert) {
        insertData = [
          rentChange.type,
          rentChange.lease_id,
          rentChange.property_id,
          rentChange.rent_plan_id,
          data.insert?.rent_plan_trigger,
          data.insert?.status,
          data.insert?.tagged,
          rentChange.affect_timeline,
          rentChange.change_type,
          rentChange.change_value,
          rentChange.change_amt,
          rentChange.new_rent_amt,
          moment(rentChange.target_date).format(`YYYY-MM-DD`),
          data.insert?.effective_date,
          rentChange.created_by,
          data.insert?.last_modified_by,
          data.insert?.skipped_by,
          data.insert?.cancelled_by,
          data.insert?.deployment_month
        ];
      };
      return { updateData, notesData, insertData };
    }

    static async saveNotes(connection, notesPayLoad = [{}]) {
      if (!(notesPayLoad.length > 0)) return;

      let
          relationPayload = [],
          saveNotesResult = await models.LeaseRentChange.insertNotes(connection, notesPayLoad)
      ;

      for (let i = 0; i < notesPayLoad.length; i++) {
          let
              relationTableData = [
                  (saveNotesResult[i]?.insertId ?? saveNotesResult?.insertId),
                  notesPayLoad[i].lease_id,
                  notesPayLoad[i].rent_change_id,
                  notesPayLoad[i].type,
                  notesPayLoad[i].creation_type
              ]
          ;
          relationPayload.push(relationTableData);
      }

      let saveRelationResult = await models.LeaseRentChange.insertNotesRelation(connection, relationPayload);

      if (saveRelationResult.affectedRows != (saveNotesResult?.length ?? saveNotesResult?.affectedRows))
          e.th (500, `Error while saving notes`);

      return saveRelationResult;
    }

    static async saveRentChangeDataAndNotes(connection, payload = {}) {
      let
          insertResult, updateResult, notesResult,
          { insertPayload = [], updatePayload = [], notesPayload = [] } = payload,
          rentChangeFields = [
              `type`,
              `lease_id`,
              `property_id`,
              `rent_plan_id`,
              `rent_plan_trigger`,
              `status`,
              `tagged`,
              `affect_timeline`,
              `change_type`,
              `change_value`,
              `change_amt`,
              `new_rent_amt`,
              `target_date`,
              `effective_date`,
              `created_by`,
              `last_modified_by`,
              `skipped_by`,
              `cancelled_by`,
              `deployment_month`
          ];

      if (insertPayload.length)
          insertResult = await models.LeaseRentChange.bulkInsertForSkipRentChanges(connection, insertPayload, rentChangeFields);
      if (updatePayload.length)
          updateResult = await models.LeaseRentChange.bulkUpdateLeaseRentChanges(connection, updatePayload);
      if (notesPayload.length)
          notesResult = await LeaseRentChange.saveNotes(connection, notesPayload);
    }

    static async addDeletedAtForConflictingRentChanges(connection, payload) {
      if (payload?.length == 0) return;
      let
          conditionsArray = [],
          data = { deleted_at: new Date }
      ;
      payload.forEach((rentChange) => {
          conditionsArray.push(`(
              lease_id = ${rentChange[1]} AND
              property_id = ${rentChange[2]} AND
              status IN ('skipped', 'cancelled') AND
              DATE_FORMAT(effective_date, "%b %Y") = DATE_FORMAT('${rentChange[13]}', "%b %Y")
          )`)
      });

      let condition = conditionsArray.join(` OR `);
      await models.LeaseRentChange.bulkUpdateLeaseRentChange(connection, data, condition);
    }

    /**
     * Function to Cancel Rent changes
     * Directly call cancelRentChanges function after assigning validRentChanges property of this object's instance with an array of object. The object should contain lease_id, rent_change_id, contact_id
     * @param { SqlConnectionObject } connection 
     * @param { object } fields
     */
    async cancelRentChanges(connection, fields = {}) {
      let status = `cancelled`, updatePayload = [],  notesPayload = [];
      
      this.validRentChanges.forEach((rentChange)=> {
          let data = {
              update: {
                  status,
                  status_updated_at: new Date,
                  cancelled_by: this.userId,
                  last_modified_by: this.userId,
                  ...fields
              },
              note: {
                  content: rentChange?.note,
                  last_modified_by: this.userId,
                  type: status
              }
          };
      
          let { updateData, notesData } = LeaseRentChange.generateActionsPayload(rentChange, data);
          if (updateData) updatePayload.push(updateData);
          if (notesData) notesPayload.push(notesData);

      });
      await LeaseRentChange.saveRentChangeDataAndNotes(connection, { updatePayload, notesPayload });
    }

    /**
     * Function to get all rent changes for a property that has to be cancelled when disabling automation from admin portal.
     * Fetch all rent changes with status in [ initiated, approved ] and add note.
     * Set affect_timeline false for each rent change that has to be cancelled.
     * @param { SqlConnectionObject } connection 
     */
    async cancelAutomatedRentChangesByPropertyId(connection) {
      this.validRentChanges = await models.LeaseRentChange.findAutomatedRentChangesByPropertyId(connection, this.propertyId)
      if (!this.validRentChanges.length)
        return

      this.validRentChanges.map(rentChange => (
        rentChange.note = `The rent change is cancelled due to disabling the automated rent changes from admin portal`
      ))  
      this.cancelRentChanges(connection, { affect_timeline: false })
    }
};

module.exports = LeaseRentChange

