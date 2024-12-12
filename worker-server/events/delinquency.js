'use strict';

var db = require(__dirname + '/../modules/db_handler.js');
var Lease = require('../classes/lease.js');
var models  = require('../models');

var utils = require(__dirname + '/../modules/utils.js');

const DelinquencyEvents = {
	async endDelinquency(connection, payload, shouldCommit = true) {
		console.log('End delinquency event: ', payload);

		try {
			let { res, lease_ids, contact_id } = payload;

			// const { local_company_id, contact: admin_contact } = res.locals;
			// const cid = res.locals.company_id

			const errors = [], updatedLeaseIds = [];
			for (let lease_id of lease_ids) {
				const lease = new Lease({ id: lease_id });
                await lease.find(connection);
				await lease.getCurrentBalance(connection);
				console.log(`lease_id ${lease_id} balance: `, lease.balance);
				

				if (lease.balance == 0) {

					// check delinquency first
					let getActiveDelinquecyWithLeaseId = await models.Delinquency.findByLeaseId(connection, lease_id);
					if(getActiveDelinquecyWithLeaseId){
						await lease.createLockRemovalTaskOnToOverLockState(connection);
					}    

					const { are_actions_execueted, errors: actions_errors } = await lease.endDelinquencyProcess(connection, { res, contact_id: contact_id }, shouldCommit) || {};
					if (are_actions_execueted) {
						updatedLeaseIds.push({ id: lease_id });
						errors.push(...actions_errors);
					}
				}
			}

			/*if (updatedLeaseIds?.length) {
				const { id: admin_contact_id = null } = admin_contact;
				let socket = new Socket({
					company_id: local_company_id,
					contact_id: admin_contact_id,
				});

				let connected = await socket.isConnected(admin_contact_id);
				console.log("Checking socket connection..", connected);
				if (connected) {
					console.log('Update leases via socket: ', Hash.obscure({
						leases: updatedLeaseIds
					}, { company_id: cid }))

					await socket.createEvent('delinquency_actions_update', 
						Hash.obscure({ leases: updatedLeaseIds }, { company_id: cid })
					);
				}
			}*/

			if (errors.length) {
				throw errors
			}
		} catch (err) {
			console.log('End delinquency event error: ', err);

			utils.sendLogs({
				event_name: ENUMS.LOGGING.RESET_DELINQUENCY_ACTIONS,
				logs: {
					payload: payload,
					error: err?.stack?.toString() || err?.message?.toString() || err
        		}
      		});
		} finally {
			console.log('End delinquency event done!');
		}
	}
}

module.exports = DelinquencyEvents

const ENUMS = require(__dirname + '/../modules/enums.js');
const Hash = require(__dirname + '/../modules/hashes.js');
const Hashes = Hash.init();
const Socket = require('../classes/sockets');