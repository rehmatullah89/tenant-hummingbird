"use strict";

module.exports = {
  
  /* Finding the unit group by id. */
  findById(connection, id) {
    let sql = `SELECT * FROM unit_groups WHERE id = ${id}`;
    return connection.queryAsync(sql);
  },

  /* Finding the unit group by hashedId. */
  findByHashedId(connection, hashedId) {
    let sql = `SELECT id FROM unit_groups WHERE unit_group_hashed_id = '${hashedId}';`
    return connection.queryAsync(sql);
  },

  /* Finding all the units in a unit group by using unit_group_id*/
  findAllUnits(connection, unit_group_id) {
    let sql = `SELECT * FROM units WHERE id IN (SELECT unit_id FROM unit_group_units WHERE unit_groups_id IN (SELECT id FROM unit_groups WHERE id = '${unit_group_id}'));`
    return connection.queryAsync(sql);
  },

  /**
   * It finds all units that are in a unit group with a unit group hashed id
   * @param connection
   * @param unit_group_hashed_id The unit group hashed id 
   * @returns An array of objects containing units
   */
  findAllUnitsByHashedId(connection, unit_group_hashed_id) {
    let sql = `SELECT * FROM units WHERE id IN (SELECT unit_id  FROM unit_group_units WHERE unit_groups_id IN (SELECT id FROM unit_groups WHERE unit_group_hashed_id = '${unit_group_hashed_id}'));`
    return connection.queryAsync(sql);
  },

  /**
   * It updates the end date of the unit price change event for all units in a unit group
   * @param connection
   * @param hashedId The hashedId of the unit group
   * @param end_dateTime The dateTime that the price change should end.Should be current time
   */
  updateEndDateForUnits(connection, unitIds, end_dateTime) {
    let sql = `UPDATE unit_price_changes set end = '${end_dateTime}' where unit_id in (${unitIds.join(', ')}) and end is null;`
    return connection.queryAsync(sql);
  },

  /**
   * Retrieve a map of unit IDs and their corresponding set rates.
   *
   * @function
   * @param {Object} connection - A database connection object.
   * @param {Array<number>} unitIds List of units
   * @returns {Map<string, number>} A map where the keys are unit IDs (strings) and the values
   * are the set rates (numbers) associated with each unit.
   */
  async getUnitSetRates(connection, unitIds) {

    let query = `SELECT upc.unit_id, upc.set_rate
      FROM unit_price_changes upc
      JOIN (
        SELECT unit_id, MAX(id) AS max_id
        FROM unit_price_changes
        WHERE unit_id IN (?)
        GROUP BY unit_id
      ) max_ids
      ON upc.unit_id = max_ids.unit_id AND upc.id = max_ids.max_id
      ORDER BY upc.id DESC;`

    let result = await connection.queryAsync(query, [unitIds]);
    return new Map(result.map(row => [row.unit_id, row.set_rate]));
  },
  
  /**
   * It sets a new sell price for a unit in the unit group
   * @param {object} connection
   * @param {Array<number>} unitIds List of units
   * @param {string} price The new price for the unit
   * @param {string} start_dateTime The dateTime that the new price will take effect.Should be current time
   * @param {string} modified_by The contact id of the user who is making the change.
   */
  async changeRateForUnits(connection, unitIds, price, start_dateTime, modified_by) {
    let unitSetRates = await this.getUnitSetRates(connection, unitIds)
    let query = `INSERT INTO
        unit_price_changes(unit_id, price, set_rate, start, modified_by) VALUES ?`

    let data = unitIds.map(unit_id => [
      unit_id,
      price,
      unitSetRates.get(unit_id),
      start_dateTime,
      modified_by
    ]);

    return connection.queryAsync(query, [data]);
  }


}