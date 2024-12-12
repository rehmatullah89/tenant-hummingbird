var moment = require('moment');
var Payouts   = require(__dirname + '/../models/payouts.js');
var models   = require(__dirname + '/../models');
var TenantPaymentsPayouts  = require(__dirname + '/../classes/tenant_payments_payouts.js');
var Contact = require(__dirname + '/../classes/contact.js');
var Property = require(__dirname + '/../classes/property.js');
var Company = require(__dirname + '/../classes/company.js');
var Roles = require(__dirname + '/../models/roles.js');
var rp = require('request-promise');
var { sendBasicEmail } 	= require(__dirname +'/../modules/mail.js');
const settings = require('../config/settings');

const is_manual_sweep_enabled = process.env.ENABLE_MANUAL_SWEEP;

var TenantPaymentsPayoutsRoutines = {

	async calculatePayout(data) {
		let paymentDetails = null;
		let refundDetails = null;
		let payoutAmount = 0;
		let paymentAggregate = 0;
		let refundAggregate = 0;
		console.log(data.property_id, " Calculate payout");
		try { // date for all pending payments for day before yesterday
			let notAfterDate = moment(data.date, "YYYY-MM-DD").subtract(1, "day").format("YYYY-MM-DD 00:00:00");

			console.log(data.property_id, "todays date : ", data.date);
			console.log(data.property_id, "notAfter : ", notAfterDate);

			// get all pending payments until day before yesterday
			paymentDetails = await Payouts.getPaymentDetailsOfPendingPayouts(data.connection, 
				data.property_id, notAfterDate);
				console.log(data.property_id, "paymentDetails ", paymentDetails);
			// get all pending refunds until now
			refundDetails = await Payouts.getRefundDetailsOfPendingPayouts(data.connection,
				data.property_id);
				console.log(data.property_id, "refundDetails ", refundDetails);
			for (let i = 0; i < paymentDetails.length; i++){
				paymentAggregate += paymentDetails[i].amount;
			}
			for (let i = 0; i < refundDetails.length; i++){
				refundAggregate += refundDetails[i].amount;
			}
			payoutAmount = paymentAggregate - refundAggregate;
			payoutAmount = payoutAmount.toFixed(2);
		} catch (err) {				
			console.log(data.property_id, "Error in calculatePayout : ", err);
			await TenantPaymentsPayoutsRoutines.sendPayoutErrorEmail(data.property_id, err);
		}
		finally {
			return {paymentDetails, refundDetails, payoutAmount}	
		}
	},

	async processPayout(data, payoutDetails) {
		console.log(data.property_id, "processPayout");
		let payoutDollars = payoutDetails.payoutAmount;
		let payoutCents = String(payoutDollars).replace('.', ''); //payment processor expects in this format
		let balanceCents = 0;
		let balanceDollars = null;
		let balanceDetails = null;
		let payoutInfo = null;
		let utc_date_time = moment.utc().format("YYYY-MM-DD HH:mm:ss");
		console.log(data.property_id, "Payout Amount in cents ", payoutCents);

		try {
			let accountList = await Payouts.getAccountNumberOfTheProperty(
											data.connection, data.property_id);
			let tenantPaymentPayouts = new TenantPaymentsPayouts(
						data.property_id, accountList[0].account_number);
			balanceDetails = await tenantPaymentPayouts.getAccountBalanceDetails();
			balanceCents = balanceDetails.availableBalance;
			console.log(data.property_id, "Account Balance in cents : ", balanceCents);
			balanceDollars = balanceCents ? (balanceCents / 100).toFixed(2) : 0.00;
			if (is_manual_sweep_enabled == 'false') {
				payoutInfo = {payoutID : 2};
				throw 'Manual sweep is disabled';
			}
			if (payoutCents >= 100) { //min balance in account should be 100 cents for payouts	
				if (balanceCents >= payoutCents) {
					let result = await tenantPaymentPayouts.payout(payoutCents);
					let payoutID = await Payouts.createPayoutInfo(data.connection, result.transactionID, 
						payoutDollars, result.dateTime, result.status, result.propertyID, balanceDollars);
					payoutInfo	= {payoutID : payoutID, transactionID : result.transactionID, 
									amount : payoutDollars, dateTime : result.dateTime, 
									status : result.status, propertyID : result.propertyID, 
									balance: balanceDollars};				  
					console.log(data.property_id, "PayoutInfo : ", payoutInfo);
					// Payout == balance, else there is an issue with payout calculation
					if (balanceCents > payoutCents) {
						console.log(data.property_id, "Payout triggered, balance more than payout amount");
						await TenantPaymentsPayoutsRoutines.sendPayoutErrorEmail(
							data.property_id, "Alert - Payout triggered, but balance more than payout,"
									+ " please check computation,"
									+ " payout is " + payoutDollars
									+ " and balance is " + balanceDollars);
					}
					if (payoutInfo.status != '0') { // Unsuccessfull payout
						console.log(data.property_id, "Payout unsuccessful, status ", payoutInfo.status);
						await TenantPaymentsPayoutsRoutines.sendPayoutErrorEmail(
							data.property_id, "Alert - Payout unsuccessful, status is " + payoutInfo.status);
						await TenantPaymentsPayoutsRoutines.sendDelayEmailToAdminWithPermission(
									data.connection, data.property_id, data.company_id, data.send_email);							
					}
				} else { // Balance less than payout case, issue with payout calculation
					await Payouts.createPayoutInfo(data.connection, null, 
								payoutDollars, utc_date_time, 'Balance less than payout',
								data.property_id, balanceDollars);
					console.log(data.property_id, "Balance less than payout amount");
					await TenantPaymentsPayoutsRoutines.sendPayoutErrorEmail(
								data.property_id, "Alert - Balance less than payout,"
								+ " please check computation, "
								+ " payout is " + payoutDollars	+ " and balance is " + balanceDollars);
					await TenantPaymentsPayoutsRoutines.sendDelayEmailToAdminWithPermission(
								data.connection, data.property_id, data.company_id, data.send_email);
				}
			} else { // Payout less than $1 case
				console.log(data.property_id, "Payout Amount is less than $1 : ", payoutCents);
				await Payouts.createPayoutInfo(data.connection, null, payoutDollars, 
						utc_date_time, 'Payout less than $1.00', data.property_id, balanceDollars);
				if (payoutCents == 0) { // Payout zero case
					console.log(data.property_id, "Payout Amount is 0");
					await TenantPaymentsPayoutsRoutines.sendPayoutErrorEmail(
							data.property_id, "Payout Amount is 0");
				} else {   // Payout -ve or 1-99 cents case
					console.log(data.property_id, "Payout Amount is ", payoutDollars);
					await TenantPaymentsPayoutsRoutines.sendPayoutErrorEmail(data.property_id,
						 	"Payout Amount less than 100 cents, payout amount is " + payoutDollars);
				}
			}
		} catch (err) {  // Error scenarios
			console.log(data.property_id, "Error while payout : ", err);
			await Payouts.createPayoutInfo(data.connection, null, payoutDollars, utc_date_time, 
									err.toString().slice(0, 45), data.property_id, balanceDollars);				
			await TenantPaymentsPayoutsRoutines.sendPayoutErrorEmail(
						data.property_id, "Alert - Error while payout, error is : " + err);
			await TenantPaymentsPayoutsRoutines.sendDelayEmailToAdminWithPermission(
								data.connection, data.property_id, data.company_id, data.send_email);
		}
		finally {
			// payoutInfo is null for error/no payout/less balance scenarios
			return payoutInfo;
		}
	},

	async updatePayoutInfo(data, payoutDetails, payoutInfo) {
		try {
			console.log(data.property_id, "Entering updatePayoutInfo");
			let paymentIDList = [];
			let refundIDList = [];
			if ((payoutInfo != null && payoutInfo.status == '0')
						|| (is_manual_sweep_enabled == 'false')) {
				for (let i = 0; i < payoutDetails.paymentDetails.length; i++) {
					paymentIDList[i] = payoutDetails.paymentDetails[i].id;
				}
				for (let i = 0; i < payoutDetails.refundDetails.length; i++) {
					refundIDList[i] = payoutDetails.refundDetails[i].id;
				}
				if (paymentIDList.length > 0) {
					let res = await Payouts.updatePaymentsWithPayoutID(data.connection,
														payoutInfo.payoutID, paymentIDList);
					console.log(data.property_id, "payments table updated with payout ID ", res);
				}
				if (refundIDList.length > 0) {
					let res = await Payouts.updateRefundsWithPayoutID(data.connection,
														payoutInfo.payoutID, refundIDList);
					console.log(data.property_id, "refunds table updated with payout ID ", res);
				}
			}
		} catch (err) {				
			console.log(data.property_id, "Error in updatePayoutInfo : ", err);
			await TenantPaymentsPayoutsRoutines.sendPayoutErrorEmail(
							data.property_id, "Error in updatePayoutInfo : " + err);
		} finally {
			console.log(data.property_id, "Exit updatePayoutInfo");
		}
	},

	async sendPayoutErrorEmail(property_id, content) {
		if (is_manual_sweep_enabled == 'false') {
			return;		
		}
		let details = {
			to: process.env.TENANT_PAYMENTS_PAYOUTS_REPORTING_NAME,
			email: process.env.TENANT_PAYMENTS_PAYOUTS_REPORTING_EMAIL,
			subject: settings.config.env + ": Tenant Payments Payouts " + property_id,
			from: 'Tenant Payments Payouts'
		};
		content = content + " for property " + property_id;
		await sendBasicEmail(null, details, content, 'standard_email', null);
	},

	async sendDelayEmailToAdminWithPermission(connection, property_id, company_id, send_email) {
		console.log(property_id, "sendDelayEmailToAdminWithPermission");
		if (!send_email || is_manual_sweep_enabled == 'false') {
			console.log(property_id, "sendDelayEmailToAdminWithPermission : Email will not be sent");
			return;
		}
		try {
			let email_sent = false;
			let company = new Company({id: company_id});
			await company.find(connection);
			
			let adminList = await Contact.findAdminsByPropertyId(connection, company_id, property_id);
			
			for (let i = 0; i < adminList.length; i++) {
				let permissionList = await Roles.findPropertyPermissionsLabel(connection, 
											company_id, adminList[i].contact_id, property_id);
				if (permissionList.find(obj => obj.label === 'payout_email')) {
					await TenantPaymentsPayoutsRoutines.sendPayoutDelayEmail(connection, 
												property_id, company.gds_owner_id, adminList[i].email);
					email_sent = true;
				}
			}
			if (email_sent == false) {
				let property_emails = await models.Property.findEmails(connection, property_id);
				for (let i = 0; i < property_emails.length; i++) {
					email_sent = await TenantPaymentsPayoutsRoutines.sendPayoutDelayEmail(connection, 
									property_id, company.gds_owner_id, property_emails[i].email);
				}
			}
			if (email_sent == false) {
				await TenantPaymentsPayoutsRoutines.sendPayoutErrorEmail(
					property_id, "Alert - No Admin email found to alert payout delay");
			}
		} catch (err) {
			console.log(property_id, "Error in sendDelayEmailToAdminWithPermission : ", err);
			await TenantPaymentsPayoutsRoutines.sendPayoutErrorEmail(
				property_id, "Alert - Error in sendDelayEmailToAdminWithPermission: " + err);
		}													
    },
	
	async sendPayoutDelayEmail(connection, property_id, gds_owner_id, recipient_email) {
		
		console.log(property_id, "sendPayoutDelayEmail to : ", recipient_email);

		if (recipient_email == null || recipient_email == '' || recipient_email == ' ') {
			return false;
		}

		let property = new Property({id: property_id});
		await property.find(connection);

		var email_payload = {
			interaction_created:false,
			messages: [ 
				{
					from: 
						{
							email : process.env.ONBOARDING_FROM_EMAIL,
							name : 'Tenant Payments'
						},
					to: [{email : recipient_email}],
					subject: "Payout Delayed"
				}
			],
			owner_id: gds_owner_id,
			variables: {
				template: {
					body: 
					`<html>
						<body>
							We've encountered an issue sending today's Tenant Payments payout for the property ${property.name}.
							(Payout's typically arrive in your bank account the following banking day after send.)<br/>
							<br>We are aware of the issue and are working to correct it. The payout will be tried again tomorrow.
						</body>
					</html>`.replace( /[\r\n]+/gm, ""),
					template_name: 'tenant_payment_account_update',
					date: moment().format('M/D/Y'),
					title: 'Payout Delayed'
				}
			}
		};
		let uri = `${settings.get_communication_app_url()}/messages/`;
		let post_data = {
			method: 'POST',
			uri,
			body: email_payload,
			headers: {
				'Content-Type': 'application/vnd+gds.email',
				'X-storageapi-key': process.env.GDS_API_KEY,
				'X-storageapi-date': Date.now()
			},
			gzip: true,
			json: true
		}
		rp(post_data);
		return true;
	},

  	async getDelayedPayout(connection, data) {
		let payoutDelayDetails = null;

		console.log("Delayed Payout Details for property : ", data.property_id);
		try {

			payoutDelayDetails = await Payouts.getPayoutDelayData(connection,
				data.property_id, data.company_id,data.date, data.endDate);
			payoutDelayDetails = await this.computeSubsequentFailuarDays(connection, payoutDelayDetails, data.date);

		} catch (err) {
			console.log(data.property_id, "Error in getting Delayed payout details : ", err);
		}
		finally {
			return payoutDelayDetails;
		}
	},

	async computeSubsequentFailuarDays(connection, data, payout_date) {

		let consecutiveFailureCount = 0;
		let result = null;
		try {
			for (const row of data) {
				do {
					result = await Payouts.getPreviousDateRecord(connection, row.property_id, payout_date)
					if (result.length < 1)
						break;
					else
						consecutiveFailureCount++;
						payout_date = moment(payout_date, 'YYYY-MM-DD').subtract(1, 'day').format('YYYY-MM-DD');
				} while (result.length >= 1)
				console.log("consecutiveFailureCount for property ::", row.property_id, " is ", consecutiveFailureCount);
				row.successiveFailure = consecutiveFailureCount;
				row.firstFailedPayout = payout_date;
			}
		} catch (err) {
			console.log(data.property_id, "Error in Computing subsequent Failure data : ", err);
		} finally {
			return data;
		}
	}
};
	
module.exports = TenantPaymentsPayoutsRoutines;

