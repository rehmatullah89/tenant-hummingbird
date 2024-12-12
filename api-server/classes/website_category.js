'use strict';

let e = require(__dirname + '/../modules/error_handler.js');
var Hash = require(__dirname + '/../modules/hashes.js');
var Hashes = Hash.init();

class WebsiteCategory {
  constructor (data) {
    data = data || {};
    this.company_id = data.company_id || '';
    this.property_id = data.property_id || '';
    this.storage_types = data.storage_types?.length
      ? data.storage_types
      : ['residential', 'commercial', 'storage', 'parking'];
    this.website_category_amenities = data.website_category_amenities || [];
    this.space_feature_category = data.space_feature_category || null;
    this.units = data.units || [];
    this.amenity_options = data.amenity_options || {};
    this.amenity_properties = data.amenity_properties || {};
  }

  async validate (params, method) {
    if (params.some((param) => !param || param === 0)) {
      e.th(400, `Invalid parameters ( ${params} ) passed to ${method} `);
    }
  }
  /**
   * Method can be used to set  an amenity by category name
   * Sets 'space_feature_category'
   * @param {*} connection
   * @param {*} category_name Category name. Eg:- 'Space Features'
   * @returns {Promise<Object>} Returns space category object or null if category was not found.
   */
  async findAmenityCategoryByName (connection, category_name) {
    await this.validate([category_name], 'findAmenityCategoryByName');
    this.space_feature_category =
      await models.WebsiteCategory.findAmenityCategoryByName(
        connection,
        category_name
      );
    return this.space_feature_category;
  }

  /**
   * Method can be used to retrieve all the Website category amenities
   * Sets 'website_category_amenities'
   * @param {*} connection
   * @param {Array} types Array of space types. Eg:- ['storage', 'parking']
   * @returns {Promise<Array>} An array of object of Website Category Amenities
   */
  async findWebsiteCategoryAmenities (connection, types) {
    await this.validate(
      [types?.length, this.company_id],
      'findWebsiteCategoryAmenities'
    );
    let amenities = await models.WebsiteCategory.findWebsiteCategoryAmenities(
      connection,
      types
    );
    this.website_category_amenities = amenities;
    return amenities;
  }
  /**
   * This method creates Amenity with name 'Website Category' for all space types configured in context's 'storage_types' variable
   * The default value and options will be set as 'No Category'
   * The method will return an error if there is no space category with name 'Space Features'
   * @param {*} connection
   */
  async create (connection) {
    await this.findAmenityCategoryByName(connection, 'Space Features');

    if (!this.space_feature_category.id)
      e.th(400, "Cant find a category with name 'Space Features'");
    let existingAmenities = await this.findWebsiteCategoryAmenities(
      connection,
      this.storage_types
    );

    let missing_amenities = this.storage_types.filter(
      (type) =>
        !existingAmenities.some((amenity) => amenity.property_type === type)
    );

    if (missing_amenities.length) {
      let options = '{ "type": "select", "options": ["No Category"] }';
      try {
        await connection.beginTransactionAsync();
        await models.WebsiteCategory.createAmenityForWebsiteCategory(
          connection,
          this.space_feature_category.id,
          missing_amenities,
          options,
          'No Category'
        );
        await this.findWebsiteCategoryAmenities(connection, this.storage_types);
        await connection.commitAsync();
      } catch (e) {
        await connection.rollbackAsync();
      }
    }
  }
  /**
   * This method finds the amenity properties for Website category
   * Sets amenity_properties within the context
   * @param {*} connection
   * @returns {Promise<Array>} Array of amenity property objects
   */
  async findAmenityProperty (connection) {
    if (!this.space_feature_category) {
      await this.findAmenityCategoryByName(connection, 'Space Features');
    }
    if (!this.website_category_amenities.length) {
      await this.findWebsiteCategoryAmenities(connection, this.storage_types);
    }
    let amenity_properties = {};
    for (let amenity of this.website_category_amenities) {
      let amenity_property_config = {
        amenity_id: amenity.id,
        property_id: this.property_id,
        amenity_name: 'Website Category',
        amenity_category_id: this.space_feature_category.id,
        property_type: amenity.property_type,
      };
      let amenity_property = await models.WebsiteCategory.findAmenityProperties(
        connection,
        amenity_property_config
      );
      amenity_properties[amenity.property_type] = amenity_property?.[0] ?? {};
    }
    this.amenity_properties = amenity_properties;
    return amenity_properties;
  }

  /**
   * This methods creates records in 'amenity_property' table for all 'Website Category' amenities.
   * In this method, We collect the 'category' of each unit for a given unit type ('storage', 'parking') and sets
   * a distinct set of these categories as options for the corresponding space type in 'amenity_property' table.
   * The options will also contain a category called as 'No Category'
   *
   * The category of each unit is determined by the 'category_id' field, which is a foreign key
   * to the 'unit_categories' table. The 'name' field in this table denotes the website category
   * or unit category of each unit and this will be an option in 'amenity_options' field in 'amenity_property' table.
   * @param {*} connection
   */
  async createAmenityProperty (connection) {
    if (!this.space_feature_category) {
      await this.findAmenityCategoryByName(connection, 'Space Features');
    }
    if (!this.website_category_amenities.length) {
      await this.findWebsiteCategoryAmenities(connection, this.storage_types);
    }
    await this.findActiveUnits(connection);
    for (let amenity of this.website_category_amenities) {
      let amenity_property_config = {
        amenity_id: amenity.id,
        property_id: this.property_id,
        amenity_name: 'Website Category',
        amenity_category_id: this.space_feature_category.id,
        property_type: amenity.property_type,
      };
      let options = ['No Category'];

      let existing_amenity_unit =
        await models.WebsiteCategory.findAmenityProperties(
          connection,
          amenity_property_config
        );

      if (existing_amenity_unit.length) continue;

      if (this.amenity_options[amenity.property_type]) {
        options = Array.from(this.amenity_options[amenity.property_type]);
      }
      let amenity_options = `{ "type": "select", "options": ${JSON.stringify(
        options
      )} }`;
      try {
        connection.beginTransactionAsync();
        await models.WebsiteCategory.createAmenityPropertyForWebsiteCategory({
          ...{
            connection: connection,
            amenity_options: amenity_options,
          },
          ...amenity_property_config,
        });
        connection.commitAsync();
      } catch (err) {
        e.th(400, err);
        connection.rollbackAsync();
      }
    }
  }

  /**
   * This method retrieves the id, type, category_name of all the active/valid units under a given property
   * Sets units, amenity_options
   * @param {*} connection
   * @returns {Promise<Array>} An array of unit objects.
   */
  async findActiveUnits (connection) {
    await this.validate([this.property_id], 'findActiveUnits');
    const amenity_options = {};
    const units = await models.WebsiteCategory.findActiveUnits(
      connection,
      this.property_id
    );
    this.units = units;
    for (let unit of units) {
      if (!unit.type || !this.storage_types.includes(unit.type))
        e.th(
          400,
          `Unit does not have a valid type: ${Hashes.encode(
            unit.id,
            this.company_id
          )}`
        );
      if (unit.type in amenity_options) {
        amenity_options[unit.type].add(unit.category_name);
      } else {
        amenity_options[unit.type] = new Set([
          unit.category_name,
          'No Category',
        ]);
      }
    }
    this.amenity_options = amenity_options;
    return units;
  }
  /**
   * This method creates records in 'amenity_units' table for all units under a given property.
   * Each record will be created with its associated space types website categroy 'amenity_id' and 'amenity_property_id'
   * Value will be each units category_name (mentioned in {createAmenityPropertiesForWebSiteCategory})
   * @param {*} connection
   */
  async createAmenityUnit (connection) {
    if (!this.units.length) await this.findActiveUnits(connection);
    if (!this.website_category_amenities.length)
      await this.findWebsiteCategoryAmenities(connection, this.storage_types);
    let website_category_amenity_id = {};
    this.website_category_amenities.forEach(
      (amenity) =>
        (website_category_amenity_id[amenity.property_type] = amenity.id)
    );
    await this.findAmenityProperty(connection);
    for (let unit of this.units) {
      if (!unit.category_name) {
        console.log(`No unit category for ${unit.id}`);
        continue;
      }
      let params = {
        amenity_id: website_category_amenity_id[unit.type],
        amenity_property_id: this.amenity_properties[unit.type].id,
        value: unit.category_name,
        unit_id: unit.id,
      };
      let existing_amenity_unit = await this.findExistingAmenityUnits(
        connection,
        params
      );

      if (existing_amenity_unit.length) continue;
      params['connection'] = connection;
      try {
        connection.beginTransactionAsync();
        await models.WebsiteCategory.createAmenityUnitsForWebsiteCategory({
          ...params,
        });
        connection.commitAsync();
      } catch (err) {
        connection.rollbackAsync();
        e.th(400, err);
      }
    }
  }
  /**
   * This method retrieves all the records from 'amentiy_units' table that satisfies the field values given in 'params' parameter.
   * @param {*} connection
   * @param {Object} params An object where keys correspond to 'amentiy_units' table fields and values are used for filtering records.
   * @returns {Promise<Array>} Array of amenity unit objects
   */
  async findExistingAmenityUnits (connection, params) {
    let amenity_units = models.WebsiteCategory.findExistingAmenityUnits(
      connection,
      params
    );
    return amenity_units;
  }
  /**
   * This method creates records in 'unit_group_profile_settings_amenities' table for a given
   * 'unit_group_profile_settings_id' (foreign key to 'unit_group_profile_settings')
   * @param {*} connection
   * @param {*} unit_group_profile_settings_id foreign key to 'unit_group_profile_settings'
   * @param {*} space_type Space type ('storage', 'parking')
   */
  async configureSpaceGroupProfileAmenities (
    connection,
    unit_group_profile_settings_id,
    space_type
  ) {
    await this.validate(
      [unit_group_profile_settings_id, space_type],
      'configureSpaceGroupProfileAmenities'
    );
    //add this to context ? reusable
    let website_category_amenity_id = {};
    this.website_category_amenities.forEach(
      (amenity) =>
        (website_category_amenity_id[amenity.property_type] = amenity.id)
    );

    if (
      !website_category_amenity_id[space_type] ||
      !this.amenity_properties[space_type]?.id
    ) {
      e.th(
        400,
        `(Website category/amenity property) not found for ${space_type}`
      );
    }
    let params = {
      unit_group_profile_settings_id: unit_group_profile_settings_id,
      amenity_id: website_category_amenity_id[space_type],
      amenity_property_id: this.amenity_properties[space_type].id,
      sort: 0,
    };
    let existing_amenity_config = [];
    existing_amenity_config =
      await models.WebsiteCategory.findExistingSpaceGroupAmenityConfig(
        connection,
        params
      );
    if (!existing_amenity_config.length) {
      params['connection'] = connection;
      try {
        connection.beginTransactionAsync();
        await models.WebsiteCategory.configureAmenitiesForSpaceGroupProfile({
          ...params,
        });
        connection.commitAsync();
      } catch (err) {
        connection.rollbackAsync();
        e.th(400, err);
      }
    }
  }
  /**
   * This method creates records in 'unit_group_profile_settings_tiers' for a given 'unit_group_profile_settings_id'
   * (foreign key to 'unit_group_profile_settings'). min_sqft will be set as 0.
   * @param {*} connection
   * @param {*} unit_group_profile_settings_id foreign key to 'unit_group_profile_settings'
   */
  async configureSpaceGroupProfileTiers (
    connection,
    unit_group_profile_settings_id
  ) {
    await this.validate(
      [unit_group_profile_settings_id],
      'configureSpaceGroupProfileTiers'
    );
    let params = {
      unit_group_profile_settings_id: unit_group_profile_settings_id,
      min_sqft: 0,
    };
    let existing_tiers =
      await models.WebsiteCategory.findExistingSpaceGroupTiers(
        connection,
        params
      );
    if (!existing_tiers.length) {
      params['connection'] = connection;
      try {
        connection.beginTransactionAsync();
        await models.WebsiteCategory.configureTiersForSpaceGroupProfile({
          ...params,
        });
        connection.commitAsync();
      } catch (e) {
        connection.rollbackAsync();
        e.th(400, err);
      }
    }
  }
  /**
   * This method will create records in 'unit_group_profile_settings' for a given 'space_group_profile_id'.
   * The 'space_group_profile_id' is a foreign key to 'unit_group_profiles' table. Records will be creatd for 'storage' and 'parking' space types.
   * 'tier_type' will be set as 'size' and 'tier_defaults' will be set as '0'.
   * @param {*} connection
   * @see {@link configureSpaceGroupProfileAmenities} Calls this method to configure amenity settings in 'unit_group_profile_settings_amenities' table.
   * @see {@link configureSpaceGroupProfileTiers} Calls this method to configure tier settings in 'unit_group_profile_settings_tiers' table.
   */
  async configureSpaceGroupProfileSettings (connection) {
    await this.validate(
      [this.space_group_profile_id],
      'configureSpaceGroupProfileSettings'
    );
    //Grouping profiles are configured for storage and parking. Need to check if its to be done for residential and commercial as well
    let storage_types = ['storage', 'parking'];
    let exisiting_settings = [];
    for (let type of storage_types) {
      let space_group_profile_settings_id = '';
      let params = {
        unit_group_profile_id: this.space_group_profile_id,
        space_type: type,
        tier_type: 'size',
        tier_default: 0,
      };
      exisiting_settings =
        await models.WebsiteCategory.findExistingSpaceGroupProfileSettings(
          connection,
          params
        );
      if (exisiting_settings.length) {
        space_group_profile_settings_id = exisiting_settings[0]?.id;
      } else {
        params['connection'] = connection;
        try {
          connection.beginTransactionAsync();
          space_group_profile_settings_id =
            await models.WebsiteCategory.configureSpaceGroupProfileSettings({
              ...params,
            });
          connection.commitAsync();
        } catch (err) {
          connection.rollbackAsync();
          e.th(400, err);
        }
      }
      if (!space_group_profile_settings_id)
        e.th(
          400,
          `Could not find or create settings for grouping profile ${Hashes.encode(
            this.space_group_profile_id,
            this.company_id
          )}`
        );
      await this.configureSpaceGroupProfileAmenities(
        connection,
        space_group_profile_settings_id,
        type
      );
      await this.configureSpaceGroupProfileTiers(
        connection,
        space_group_profile_settings_id
      );
    }
  }
  /**
   * This method creates read-only space group profile in 'unit_group_profiles' table with the name 'Website Category Space Group'
   * The 'editable' field in this table will be set as '0' (So that this profile is read-only)
   * @param {*} connection
   * @see {@link configureSpaceGroupProfileSettings} Calls this method to configure additional settings for the created grouping profile.
   */
  async createSpaceGroupProfile (connection) {
    let space_group_profile_id = '';
    let params = {
      property_id: this.property_id,
      name: 'Website Category Space Group',
      description: 'Website Category Space Group',
      active: 1,
    };
    let existing_unit_group_profile =
      await models.WebsiteCategory.findExistingUnitGroupProfile(
        connection,
        params
      );
    if (existing_unit_group_profile?.length) {
      space_group_profile_id = existing_unit_group_profile[0].id;
    } else {
      params['connection'] = connection;
      try {
        connection.beginTransactionAsync();
        space_group_profile_id =
          await models.WebsiteCategory.createSpaceGroupProfile({ ...params });
        connection.commitAsync();
      } catch (err) {
        connection.rollbackAsync();
        e.th(400, err);
      }
    }
    if (!space_group_profile_id)
      e.th(400, 'Could not find or create space group profile');
    this.space_group_profile_id = space_group_profile_id;
    await this.configureSpaceGroupProfileSettings(connection);
  }
}
module.exports = WebsiteCategory;
const models = require(__dirname + '/../models');
