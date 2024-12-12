
var moment      = require('moment');
var settings = require(__dirname + '/../config/settings.js');
var Hashes = require(__dirname + '/../modules/hashes.js').init();
var models      = require(__dirname + '/../models');
var Lease      = require(__dirname + '/../classes/lease.js');
var Property      = require(__dirname + '/../classes/property.js');
var Company      = require(__dirname + '/../classes/company.js');
var Contact      = require(__dirname + '/../classes/contact.js');
var Trigger      = require(__dirname + '/../classes/trigger.js');
var Activity      = require(__dirname + '/../classes/activity.js');
var e  = require(__dirname + '/../modules/error_handler.js');
var Mail = require(__dirname + '/../modules/mail.js');
var Utils = require(__dirname + '/../modules/utils.js');
var db = require(__dirname + '/../modules/db_handler.js');

var LeaseStatus = {

	async update(data, pool){

		var connection = await db.getConnectionByType('write', data.cid);
		try{

			let property = new Property({id:  data.property.id});

			await property.find(connection);
			await property.findTriggers(connection);
			// await property.resetLeaseStatuses(connection);

			let standings = await models.Setting.getLeaseStandings(connection)


			let company = new Company({id: property.company_id});
			await company.find(connection);
			let lease_errors = [];
			let all_leases = [];



			let closed_lease_errors = await models.Property.getClosedLeaseErrors(connection, data.property.id);
			console.log("FOUND ", closed_lease_errors.length, " closed_lease_errors ");

			for (let i =0;i < closed_lease_errors.length; i++){
				let lease = new Lease(closed_lease_errors[i]);
				await lease.find(connection);
				lease.proper_lease_status = standings.find(s => s.name.toLowerCase() == "lease closed").id;
				lease.status_type = "Closed Lease";
				models.Lease.save(connection, {lease_standing_id: lease.proper_lease_status}, lease.id);
				lease_errors.push(lease)
			}

			// get last status action for each delinquency Process
			
			await models.Delinquency.updateLeaseStandings(connection, property.id );

			//let invoices = await models.Lease.findMostOverdueInvoicesByProperty(connection, property.id );

			// get last status action for each delinquency Process

			// for (let i = 0; i < property.Triggers.length; i++) {

			// 	if(!property.Triggers[i].lease_standing_id) continue;
			// 	if(property.Triggers[i].trigger_reference !== 'past_due') continue;

			// 	let trigger = new Trigger(property.Triggers[i]);
			// 	await trigger.find(connection);
			// 	for (let j = 0; j < invoices.length; j++) {
			// 		if(moment().subtract(trigger.start, 'days').format('x') > moment(invoices[j].due).format('x')){
			// 			let lease = new Lease({id: invoices[j].lease_id });
			// 			await lease.find(connection);
			// 			if(lease.lease_standing_id !== trigger.lease_standing_id){
			// 				lease.proper_lease_status = trigger.lease_standing_id;
			// 				lease.status_type = "Trigger";
			// 				lease_errors.push(lease);
			// 				models.Lease.save(connection, {lease_standing_id: lease.proper_lease_status}, lease.id);
			// 			}
			// 			all_leases.push(lease);
			// 		}
			// 	}
			// }

		} finally{
			await db.closeConnection(connection);
		}
		
		return {
			status: true,
			data: {}
		};
	},

	async findDiscrepancies(data){

		var connection = await db.getConnectionByType('write', data.cid);

		try{

			let property = new Property({id:  data.property.id});

			let standings = await models.Setting.getLeaseStandings(connection)

			await property.find(connection);
			await property.findTriggers(connection);

			let company = new Company({id: property.company_id});
			await company.find(connection);
			let lease_errors = [];
			let all_leases = [];

			let closed_lease_errors = await models.Property.getClosedLeaseErrors(connection, data.property.id);
			

			for (let i =0;i < closed_lease_errors.length; i++){
				let lease = new Lease(closed_lease_errors[i]);
				await lease.find(connection);
				lease.proper_lease_status = standings.find(s => s.name.toLowerCase() === "lease closed").id;
				lease.status_type = "Closed Lease";
				all_leases.push(lease);
			}

			let invoices = await models.Lease.findMostOverdueInvoicesByProperty(connection, property.id );

			for (let i = 0; i < property.Triggers.length; i++) {

				if(!property.Triggers[i].lease_standing_id) continue;
				if(property.Triggers[i].trigger_reference !== 'past_due') continue;

				let trigger = new Trigger(property.Triggers[i]);
				await trigger.find(connection);
				for (let j = 0; j < invoices.length; j++) {
					if(moment().subtract(trigger.start, 'days').format('x') > moment(invoices[j].due).format('x')){
						let lease = {};

						let index = all_leases.findIndex(al => al.id === invoices[j].lease_id  );
						console.log("THIS INDEX", index);
						console.log("all_leases", all_leases.length);

						if(index < 0){
							lease = new Lease({id: invoices[j].lease_id });
							await lease.find(connection);
						} else {
							lease = all_leases[index]
						}

						console.log("lease", lease);

						lease.proper_lease_status = trigger.lease_standing_id;
						lease.status_type = "Trigger";
						
						if(index < 0){
							all_leases.push(lease);
						} else {
							all_leases[index] = lease;
						}
					}
				}
			}

			let open_lease_errors =  await models.Property.getOpenLeaseErrors(connection, data.property.id, all_leases.map(l => l.id));
			let pending_lease_errors =  await models.Property.getPendingLeaseErrors(connection, data.property.id);

			for (let i =0;i < open_lease_errors.length; i++){
				let lease = new Lease(open_lease_errors[i]);
				await lease.find(connection);
				lease.proper_lease_status = standings.find(s => s.name.toLowerCase() === "current").id;
				lease.status_type = "Active Lease";
				all_leases.push(lease);
			}

			for (let i =0; i < pending_lease_errors.length; i++){
				let lease = {};
				let index = all_leases.findIndex(al => al.id === invoices[i].lease_id  );
				if(index < 0){
					lease = new Lease({id: invoices[i].lease_id });
					await lease.find(connection);
				} else {
					lease = all_leases[index]
				}
				lease.proper_lease_status = standings.find(s => s.name.toLowerCase() === "pending").id;
				lease.status_type = "Pending Lease";
				if(index < 0){
					all_leases.push(lease);
				} else {
					all_leases[index] = lease;
				}
			}


			console.log("FOUND ", lease_errors.length, " Leases");

			// let csv = 'ID,ERROR TYPE,CURRENT STATUS,PROPER STATUS,START,END\r\n';
			let error_found = false;
			let save_data = [];
			for (let i =0;i < all_leases.length; i++){
				let lease = all_leases[i];
				
				if(lease.proper_lease_status !== lease.lease_standing_id){

					if(!data.dryrun){
						await models.Lease.save(connection, {lease_standing_id: lease.proper_lease_status}, lease.id);
					}
					lease.lease_standing_name = lease.lease_standing_id ? standings.find(s => s.id === lease.lease_standing_id).name : null;
					lease.proper_lease_status_name = lease.proper_lease_status ? standings.find(s =>  s.id === lease.proper_lease_status).name : null;
					save_data.push({
						id: lease.id,
						error_type: lease.status_type,
						lease_standing_id: lease.lease_standing_id,
						proper_lease_status: lease.proper_lease_status,
						lease_standing_name: lease.lease_standing_name,
						proper_lease_status_name: lease.proper_lease_status_name,
						lease_start: lease.start_date,
						lease_end: lease.end_date,
						unit_id: lease.unit_id
					})
				}
			}

			if(save_data.length){
				await db.saveData({
					created_at: + new Date(),
					record_type: 'status-discrepancies',
					property_id: data.property.id,
					company_id: data.cid,
					dryrun: data.dryrun,
					property_name: data.property.name,
					company_name: company.name,
					data: JSON.stringify(save_data),
					output: null,
					admin: data.admin.first + ' ' + data.admin.last
				})
			}


			// if(lease_errors.length){
				// 	let csv = 'ID,ERROR TYPE, CURRENT STATUS,PROPER STATUS,START,END\r\n';
				//
				// 	for (let i =0;i < lease_errors.length; i++){
				// 		let lease = lease_errors[i];
				// 		csv +=  lease.id + ',' + lease.status_type + ', ';
				// 		if(lease.lease_standing_id){
				// 			csv += standings.find(s => s.id === lease.lease_standing_id).name  + ' | ' + lease.lease_standing_id + ' , ';
				// 		} else {
				// 			csv += 'NULL,'
				// 		}
				// 		if(lease.proper_lease_status){
				// 			console.log("lease.proper_lease_status", lease.proper_lease_status);
				// 			csv += standings.find(s =>  s.id === lease.proper_lease_status).name  + ' | ' + lease.proper_lease_status + ' , ';
				// 		} else {
				// 			csv += 'NULL,'
				// 		}
				// 		csv += lease.start_date + ',' + lease.end_date + "\r\n";
				// 	}
				//
				// 	try{
				// 		let attachments = [
				// 			{
				// 				content_type: "text/csv",
				// 				name: company.name + "_" + property.name + "_status_discrepancies_" + moment(data.date, 'YYYY-MM-DD').format('MM/DD/YYYY') + '.csv',
				// 				content: Buffer.from(csv).toString('base64')
				// 			}
				// 		];
				// 		await this.sendResultsEmail(connection,csv, company, attachments)
				// 	} catch(err){
				// 		this.output += err.toString()
				// 		console.log("ERROR", err);
				// 	}

			// }
			console.log("lease_errors", lease_errors);

		} finally{
			await db.closeConnection(connection);
		}

		return {
			status: true,
			data: {}
		};
	},




	handlePastDue(connection, lease_id, company_id){

	},

	handleAuction(connection, lease_id, company_id){

	},
	handleLockout(connection, lease_id, company_id){
		var property = {};
		var lease = {};

		return Promise.resolve().then(() => {
			return  models.Property.findByLeaseId(connection, lease_id)
				.then(p => {
					property = new Property(p);
					return property.verifyAccess(company_id)
				})
				.then(() => property.getAccessControl(connection))
				.then(() => {
					if (!property.Access) return;
					lease = new Lease({ id: lease_id });
					return lease.find(connection)
				})
				.then(() => lease.canAccess(connection, company_id))
				.then(() => lease.getTenants(connection))
				.then(() => {
					return lease.Tenants.map(t => {
						return models.Contact.findAccessCredentials(connection, t.contact_id, property.id, property.access_id).then(c => {
							var creds = c.length ? c[0]: null;
							if(!creds) return;
							return property.Access.suspendUser(connection, creds);
						}).then(() => {
							var activity = new Activity();
							return activity.create(connection, company_id, null, 15, 35, t.contact_id);
						})
					})
				})

		})
	},
	async sendResultsEmail(connection, output, company, attachments){

		var email = {
			email:  'jeff@tenantinc.com',
			to:     'Jeff Ryan',
			subject: 'Status Descrepancies for ' + company.name,
			owner_id: company.gds_owner_id,
			from: "Tenant Resiliency",
			template: {
				name: 'basic-email',
				data: [
					{
						name: 'logo',
						content: company.getLogoPath()
					},
					{
						name: 'headline',
						content: 'Payment Breakdown'
					},
					{
						name: 'content',
						content: output
					}]
			},
			company_id: company.id,
			contact_id: 1010,
			attachments: attachments
		};

		await Mail.sendBasicEmail(null, email, output);

	},

}


module.exports = {
	update: function(data, pool){
		return LeaseStatus.update(data, pool);
	},
	findDiscrepancies: function(data, pool){
		return LeaseStatus.findDiscrepancies(data, pool);
	},

};