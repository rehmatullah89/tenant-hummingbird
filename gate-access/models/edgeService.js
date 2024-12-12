module.exports = {
  async findByFacilityId(connection, facility_id) {
    const _sql =
      "SELECT * FROM edge_service WHERE facility_id = " +
      connection.escape(facility_id);
    return connection.queryAsync(_sql);
  },

  async update(connection, facility_id, data) {
    const _sql =
      "UPDATE edge_service SET ? WHERE facility_id = " +
      connection.escape(facility_id);
    return connection.queryAsync(_sql, data);
  },

  async add(connection, data) {
    const _sql =
      "INSERT INTO edge_service SET ?";
    return connection.queryAsync(_sql, data);
  },

  async remove(connection, facility_id) {
    const _sql =
      "DELETE FROM edge_service WHERE facility_id = " +
      connection.escape(facility_id);
    return connection.queryAsync(_sql);
  },
};