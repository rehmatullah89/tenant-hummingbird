'use strict';

let e = require(__dirname + '/../modules/error_handler.js');
let sql_helper = require(__dirname + '/../modules/sql_helper.js');

function validate (params, method) {
  if (params.some((param) => !param && param !== 0)) {
    e.th(400, `Invalid parameters ( ${params} ) passed to ${method} `);
  }
}

const WebsiteCategory = {
  findAmenityCategoryByName (connection, category_name) {
    validate([category_name], 'models.findAmenityCategoryByName');
    let sql = `
            SELECT * FROM amenity_categories ac WHERE ac.name = "${category_name}" ORDER BY ac.id DESC; 
        `;

    console.log('\n Find space feature category:\n', sql, '\n');

    return connection
      .queryAsync(sql)
      .then((result) => (result.length ? result[0] : {}));
  },

  findWebsiteCategoryAmenities (connection, property_types) {
    validate(
      [property_types?.length],
      'models.findWebsiteCategoryAmenities'
    );
    let sql = `
            SELECT 
                * 
            FROM 
                amenities 
            WHERE 
                name = 'Website Category'
                AND property_type IN (${property_types.map(
                  (type) => `"${type}"`
                )})
                AND status = '1';
        `;

    console.log('\n Find website category Amenities:\n', sql, '\n');

    return connection.queryAsync(sql).then((result) => {
      return result.length ? result : [];
    });
  },

  createAmenityForWebsiteCategory (
    connection,
    space_feature_category_id,
    storage_types,
    options,
    default_value
  ) {
    validate(
      [
        space_feature_category_id,
        storage_types,
        options,
        default_value,
      ],
      'models.createAmenityForWebsiteCategory'
    );
    const values = storage_types.map(
      (type) =>
        `('Website Category', '${type}', 1, ${space_feature_category_id}, '${options}', '${default_value}')`
    );
    const sql = `INSERT INTO amenities (name, property_type, status, category_id, options, default_value) VALUES ${values};`;

    console.log('\nCreating website category as Amenity:\n', sql, '\n');

    return connection.queryAsync(sql);
  },

  findActiveUnits (connection, property_id) {
    validate([property_id], 'models.findActiveUnits');
    const sql = `
            SELECT 
                u.id,
                u.type,
                (SELECT uc.name FROM unit_categories uc WHERE uc.id = u.category_id) as category_name
            FROM 
                units u
            WHERE
                u.deleted IS NULL
                AND u.id NOT IN (
                    SELECT 
                        usc.unit_id 
                    FROM 
                        unit_status_changes usc
                    WHERE 
                        usc.status = "deactivated" 
                            AND usc.id IN 
                                (
                                    SELECT 
                                        max(usc1.id) 
                                    FROM 
                                        unit_status_changes AS usc1 
                                    where usc1.status in ("deactivated", "activated")
                                    GROUP BY usc1.unit_id
                                )
                            )
                AND u.property_id IN (${property_id});
        `;
    console.log('\n Find Active units:\n', sql, '\n');
    return connection
      .queryAsync(sql)
      .then((result) => (result.length ? result : []));
  },

  findAmenityProperties (connection, params) {
    let condition_query = sql_helper.convertObjectToSqlCondition(
      params,
      '=',
      'AND',
      'ap'
    );
    let sql = `
        SELECT 
            *
        FROM
            amenity_property ap
        WHERE 
            ${condition_query}
        ORDER BY ap.id DESC
        LIMIT 1
    `;
    console.log('\n Find Amenity properties:\n', sql, '\n');
    return connection
      .queryAsync(sql)
      .then((result) => (result.length ? result : []));
  },

  createAmenityPropertyForWebsiteCategory ({
    connection,
    property_id,
    amenity_id,
    amenity_category_id,
    property_type,
    amenity_options,
  }) {
    validate(
      [
        property_id,
        amenity_id,
        amenity_category_id,
        property_type,
        amenity_options,
      ],
      'models.createAmenityPropertyForWebsiteCategory'
    );
    let sql = `
        INSERT INTO amenity_property
            (amenity_id, property_id, amenity_name, amenity_category_id, default_value, property_type, field_type, sort_order, amenity_options)
        VALUES 
            (${amenity_id}, ${property_id}, 'Website Category', ${amenity_category_id}, 'No Category', '${property_type}', 'text', NULL, '${amenity_options}');
        `;
    console.log('\n Create Amenity property:\n', sql, '\n');
    return connection.queryAsync(sql);
  },

  createAmenityUnitsForWebsiteCategory ({
    connection,
    amenity_id,
    amenity_property_id,
    value,
    unit_id,
  }) {
    validate(
      [amenity_id, amenity_property_id, value, unit_id],
      'models.createAmenityUnitsForWebsiteCategory'
    );
    let sql = `
      INSERT INTO amenity_units
        (unit_id, amenity_id, amenity_property_id, value) VALUES
        (${unit_id}, ${amenity_id}, '${amenity_property_id}', '${value}');
    `;
    console.log('\n Create Amenity Units:\n', sql, '\n');
    return connection.queryAsync(sql);
  },

  findExistingAmenityUnits (connection, params) {
    let condition_query = sql_helper.convertObjectToSqlCondition(
      params,
      '=',
      'AND',
      'au'
    );
    let sql = `
      SELECT
        * 
      FROM 
        amenity_units au
      WHERE 
        ${condition_query}
    `;
    console.log('\n Find existing Amenity units:\n', sql, '\n');
    return connection
      .queryAsync(sql)
      .then((result) => (result.length ? result : []));
  },

  findExistingUnitGroupProfile (connection, params) {
    let condition_query = sql_helper.convertObjectToSqlCondition(
      params,
      '=',
      'AND',
      'ugp'
    );
    let sql = `
      SELECT
        *
      FROM
        unit_group_profiles ugp
      WHERE
        ${condition_query}
      ORDER BY
        ugp.id
      DESC
    `;
    console.log('\n Find existing unit group profiles:\n', sql, '\n');
    return connection
      .queryAsync(sql)
      .then((result) => (result.length ? result : []));
  },

  createSpaceGroupProfile ({
    connection,
    property_id,
    name,
    description,
    active,
  }) {
    validate(
      [property_id, name, description, active],
      'models.createSpaceGroupProfile'
    );
    let sql = `
    INSERT INTO unit_group_profiles
      (property_id, name, description, active, editable) VALUES 
      (${property_id}, '${name}', '${description}', ${active}, 0);
    `;
    console.log('\n Create space group profile:\n', sql, '\n');
    return connection.queryAsync(sql).then((result) => result?.insertId);
  },
  findExistingSpaceGroupProfileSettings (connection, params) {
    let condition_query = sql_helper.convertObjectToSqlCondition(
      params,
      '=',
      'AND',
      'ugps'
    );
    let sql = `
      SELECT
        *
      FROM
      unit_group_profile_settings ugps
      WHERE
        ${condition_query}
      ORDER BY
        ugps.id
      DESC
    `;
    console.log('\n Find existing space group profile settings:\n', sql, '\n');
    return connection
      .queryAsync(sql)
      .then((result) => (result.length ? result : []));
  },
  configureSpaceGroupProfileSettings ({
    connection,
    unit_group_profile_id,
    space_type,
    tier_type,
    tier_default,
  }) {
    validate(
      [unit_group_profile_id, space_type, tier_type, tier_default],
      'models.configureSpaceGroupProfileSettings'
    );
    let sql = `
    INSERT INTO unit_group_profile_settings
      (unit_group_profile_id, space_type, tier_type, tier_default) VALUES 
      (${unit_group_profile_id}, '${space_type}', '${tier_type}', ${tier_default});
    `;
    console.log('\n Create space group profile settings:\n', sql, '\n');
    return connection.queryAsync(sql).then((result) => result?.insertId);
  },

  findExistingSpaceGroupAmenityConfig (connection, params) {
    let condition_query = sql_helper.convertObjectToSqlCondition(
      params,
      '=',
      'AND',
      'ugpsa'
    );
    let sql = `
      SELECT
        *
      FROM
      unit_group_profile_settings_amenities ugpsa
      WHERE
        ${condition_query}
      ORDER BY
        ugpsa.id
      DESC
    `;
    console.log('\n Find Existing space group amenity settings:\n', sql, '\n');
    return connection
      .queryAsync(sql)
      .then((result) => (result.length ? result : []));
  },
  configureAmenitiesForSpaceGroupProfile ({
    connection,
    unit_group_profile_settings_id,
    amenity_id,
    amenity_property_id,
    sort,
  }) {
    validate(
      [unit_group_profile_settings_id, amenity_id, amenity_property_id, sort],
      'models.configureAmenitiesForSpaceGroupProfile'
    );
    let sql = `
      INSERT INTO unit_group_profile_settings_amenities
        (unit_group_profile_settings_id, amenity_id, amenity_property_id, sort) VALUES
        (${unit_group_profile_settings_id}, ${amenity_id}, ${amenity_property_id}, ${sort});
    `;
    console.log('\n Create unit group profile amenity settings:\n', sql, '\n');
    return connection.queryAsync(sql).then((result) => result?.insertId);
  },

  findExistingSpaceGroupTiers (connection, params) {
    let condition_query = sql_helper.convertObjectToSqlCondition(
      params,
      '=',
      'AND',
      'ugpst'
    );
    let sql = `
      SELECT
        *
      FROM
      unit_group_profile_settings_tiers ugpst
      WHERE
        ${condition_query}
      ORDER BY
        ugpst.id
      DESC
    `;
    console.log('\n Find existing space group tiers:\n', sql, '\n');
    return connection
      .queryAsync(sql)
      .then((result) => (result.length ? result : []));
  },
  configureTiersForSpaceGroupProfile ({
    connection,
    unit_group_profile_settings_id,
    min_sqft,
  }) {
    validate(
      [unit_group_profile_settings_id, min_sqft],
      'models.configureTiersForSpaceGroupProfile'
    );
    let sql = `
      INSERT INTO unit_group_profile_settings_tiers
        (unit_group_profile_settings_id, min_sqft, max_sqft) VALUES 
        (${unit_group_profile_settings_id}, ${min_sqft}, NULL);
    `;
    console.log('\n Create space group profile tiers:\n', sql, '\n');
    return connection.queryAsync(sql);
  },
};
module.exports = WebsiteCategory;
