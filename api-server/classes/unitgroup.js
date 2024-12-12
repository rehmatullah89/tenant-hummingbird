"use strict";

const models = require(__dirname + '/../models');
const moment = require('moment');
var e  = require(__dirname + '/../modules/error_handler.js');


const { updateGdsUnitPrice } = require('../modules/messagebus_subscriptions');
class UnitGroup {
  constructor(data) {
    this.id = data.id || null;
    this.unit_group_profile_id = data.unit_group_profile_id || null;
    this.unit_group_hashed_id = data.unit_group_hashed_id || null;
    this.label = data.label || null;
    this.space_type = data.space_type || null;
    this.amenities = data.amenities || null;
  }
  /**
   * It returns all the units in a unit group.
   * @param connection
   * @returns An array of all the units in the unit group.
   */
  async getAllUnits(connection) {

    let allUnits = await models.UnitGroup.findAllUnitsByHashedId(connection, this.unit_group_hashed_id)
    return allUnits;
  }
  /**
   * It updates the sell rate of all units in a unit group
   * @param connection
   * @param price The new price for the unit group
   * @param modified_by The contact id of the user who is making the change.
   * @returns An array of all the rate changed units.
   */
  async bulkUpdateRateChanges(connection, price, company_id, property_id, modified_by, integrationConfig) {
    const allUnits = await this.getAllUnits(connection);
    if (!allUnits.length) {
      e.th(400, 'No units found for the selected unit group')
    }
    if (allUnits[0].property_id !== property_id) e.th(400, "The provided space group hashed ID is not listed under the property")
    let updateRent;

    try {
      let unitIds = allUnits.map(unit => unit.id);
      if (integrationConfig.appId && integrationConfig.isNectarRequest) {
        let verified = await models.Unit.verifyBulkAndRateEngine(connection, unitIds, company_id, integrationConfig.appId, property_id);
        if(!verified) e.th(403, "You do not have permission to edit this resource");
      }

      let currentDate = moment().format('YYYY-MM-DD HH:mm:ss');
      
      await connection.beginTransactionAsync();
      await models.UnitGroup.updateEndDateForUnits(connection, unitIds, currentDate);
      updateRent = await models.UnitGroup.changeRateForUnits(connection, unitIds, price, currentDate, modified_by);
      
      await connection.commitAsync();
    } catch (err) {
      await connection.rollbackAsync();
      throw err;
    }
    if (updateRent?.insertId) {
      for (let unit of allUnits) {
        updateGdsUnitPrice(connection, unit.property_id, unit.id, price);
      }
    }
    return allUnits
  }

}

module.exports = UnitGroup;
