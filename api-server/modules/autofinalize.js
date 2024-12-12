'use strict';
// file to auto finalize
const Company = require('../classes/company');
const Property = require('../classes/property.js');
const Unit = require('../classes/unit.js');
const Lease  = require('../classes/lease.js');
const Todo = require('../classes/todo.js');

const eventEmitter = require('../events/index.js');

const db = require('./db_handler.js');
const utils    = require('./utils.js');
const Enums = require('./enums.js');


module.exports = {
 
/**
 * Method to auto finalize lease if it is created by a integration
 * This method will also trigger lease_finalized event
 * @param {Object} payload - Object must contain lease_id and cid
 */
  async autoFinalizeLease(payload) {
    const connection = await db.getConnectionByType('write', null, payload.cid);
    let logs = {};
    try {
      let lease = new Lease({ id: payload.lease_id })
      await lease.find(connection);

      if (lease.status != 2) throw new Error('Lease is not in pending state');
      let isIntegration = await lease.isIntegration(connection)
      if (!isIntegration) throw new Error('Lease is not created by an integration');
      let user = lease.CreatedBy;
      user.type = 'application';
      let allDocsSigned = await lease.hasAllDocumentsBeenSigned(connection);
      if (!allDocsSigned) throw new Error('All documents for this lease are not signed');
      await lease.getCurrentBalance(connection)
      if (lease.open_balance != 0) throw new Error('Lease is not fully paid');

      await lease.getTenants(connection);
      await lease.findPayments(connection);

      let unit = new Unit({ id: lease.unit_id })
      await unit.find(connection);
      let property = new Property({ id: unit.property_id });
      await property.find(connection);
      let company = new Company({ id: property.company_id });
      await company.find(connection);

      await connection.beginTransactionAsync();
      await lease.activate(connection, {company, logged_in_user: {id: lease?.created_by}});

      if (!lease.advance_rental) {
				await Lease.setAccessOnLease(connection, lease.id);
			}
      
      await Todo.dismissTasks(connection, lease.Tenants[0].contact_id, Enums.EVENT_TYPES_COLLECTION.LEAD, Enums.TASK_TYPE.CONTACT, user.id);
      await connection.commitAsync();

      eventEmitter.emit('lease_finalized', { company, property, user, payment: lease.Payments[0], lease, unit, 'contact_id': lease.Tenants[0].contact_id, 'status': 'Current', cid: payload.cid });

    } catch (error) {
      logs.error = error;
    //   console.log('error while trying to auto finalize lease ', error);
    }
    payload.event_name = 'LeaseAutoFinalization'
    await db.closeConnection(connection);
    utils.sendLogsToGDS('HB_API_Server', logs, '', logs.error ? 'error' : 'info', null, '', payload);
  }
}



