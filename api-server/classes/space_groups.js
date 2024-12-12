"use strict";
var { isEqual, intersectionWith } = require('lodash')
var Promise = require('bluebird')

var models  = require(__dirname + '/../models');
var utils  = require(__dirname + '/../modules/utils');
var validator = require('validator')
var moment      = require('moment');
const Property = require('./property');
// var Amenity = require(__dirname + '/../classes/amenity.js');
var e  = require(__dirname + '/../modules/error_handler.js');
var mask = require('json-mask');
var jwt         = require('jsonwebtoken');
const { findApiUnitPrices } = require('../models/units');
const { getPromotionsSold } = require('./promotion');
var settings    = require(__dirname + '/../config/settings.js');
var Hash = require(__dirname + '/../modules/hashes.js');
var Hashes = Hash.init();
var refreshUnitGroup = require(__dirname + '/../modules/refresh_unit_group.js');
var utils    = require(__dirname + '/../modules/utils.js');
var Unit = require(__dirname + '/../classes/unit.js');
class SpaceGroup {

	constructor(data) {
		data = data || {};
        this.id = data.id;
        this.name = data.name;
        this.description = data.description;
        this.property_id = data.property_id;
        this.active = data.active;
        this.created_at = data.created_at;
        this.modified_at = data.modified_at;
        this.Settings = {};
        this.unitGroupRefresh = false;
	}

	async validate(connection){
        console.log("this.name", this.name)
        if(!this.name) e.th(400, "Please enter a name");
        if(!this.property_id) e.th(400, "Property id missing");
        
        let existing = await models.SpaceGroup.findExisting(connection, this.name, this.property_id);
        if(existing.length && !existing.find(e => e.id === this.id)) e.th(409, "An existing property group already exists."); 
    
	}

	async find(connection){
        if (!this.id) e.th(500, "No id is set");
        let data = await models.SpaceGroup.findById(connection, this.id, this.property_id);
        if(!data) e.th(404)
        this.id = data.id;
        this.name = data.name;
        this.description = data.description;
        this.property_id = data.property_id;
        this.created_at = data.created_at;
        this.modified_at = data.modified_at;
        this.active = data.active;
    }

    async save(connection, cid = null){
        let data = {}
        await this.validate(connection);
        data.name = this.name;
        data.description = this.description;
        data.property_id = this.property_id;
        data.active = this.active;
        this.id = await models.SpaceGroup.save(connection, data, this.id);
        if(cid != null){
            await models.SpaceGroup.refreshUnitGroup(connection, this.id);
        }
    }
    

    async delete(connection){
        if (!this.id) e.th(500, "No id is set");
        try{
            await connection.beginTransactionAsync();
            await models.SpaceGroup.save(connection, {
                active: 0 
            }, this.id);
            await models.SpaceGroup.deleteUnitGroupUnits(connection, this.id);
            await connection.commitAsync();
        }catch(err){
            await connection.rollbackAsync();
            throw err;
        }
    }

    async findSettings(connection, property){
        if (!this.id) e.th(500, "No id is set");
        let space_types = []
        if(!property || !property.id){
            property = new Property({id: this.property_id});
            await property.find(connection);
        }
        space_types = await property.getUnitTypes(connection);
        this.Settings = {};
        for(let i = 0; i < space_types.length; i++){
            this.Settings[space_types[i].type] = {}
        }
    
        let profile_settings = await models.SpaceGroup.findSettings(connection, this.id);
        
        for(let i = 0; i < profile_settings.length; i++){
            if(!this.Settings[profile_settings[i].space_type]) continue;
            this.Settings[profile_settings[i].space_type] = profile_settings[i];
            this.Settings[profile_settings[i].space_type].amenities = await models.SpaceGroup.findAmenities(connection, profile_settings[i].id);
            this.Settings[profile_settings[i].space_type].tiers = [];

            if(profile_settings[i].tier_type === 'area'){
                this.Settings[profile_settings[i].space_type].tiers  = await models.SpaceGroup.findTiers(connection, profile_settings[i].id);
            }
        }
    }

    async findGroupsSettings(connection, property) {
        if (!this.id) e.th(400, "Unable to find Property Id");
        let space_types = []
        if (!property || !property.id) {
            property = new Property({ id: this.property_id });
            await property.find(connection);
        }
        space_types = await property.getUnitTypes(connection);
        this.Settings = {};
        for (let i = 0; i < space_types.length; i++) {
            this.Settings[space_types[i].type] = {}
        }
        // find sapce group settings using space group id
        let profile_settings = await models.SpaceGroup.findSettings(connection, this.id); 

        for (let i = 0; i < profile_settings.length; i++) {
            let space_type = profile_settings[i].space_type

            if (!this.Settings[space_type]) continue;

            this.Settings[space_type] = profile_settings[i];
            this.Settings[space_type].groups = this.Settings[space_type].groups || []
            // remove all unwanted keys from the query
            delete this.Settings[space_type].created_at
            delete this.Settings[space_type].unit_group_profile_id
            delete this.Settings[space_type].modified_at
            delete this.Settings[space_type].tier_default
            delete this.Settings[space_type].space_type_id
            delete this.Settings[space_type].space_type
            delete this.Settings[space_type].id
            delete this.Settings[space_type].tier_type
        }
    }

    async saveSettings(connection, data, space_type, cid = null){
        let save = {};
        if(!this.Settings[space_type]) e.th(400, "Invalid Space Type")
        let settings = this.Settings[space_type];
        save.unit_group_profile_id = this.id;
        save.space_type = space_type;
        
        save.tier_type = data.tier_type;
        save.tier_default = data.tier_type === "area" && !!data.tier_default;

        if(!save.tier_type || ['size', 'area'].indexOf(save.tier_type) < 0) e.th(400, "Please enter a valid tier_type")
        if(save.tier_type == 'area' && !data.tiers.length) e.th(400, "Please include as least 1 area tier");

        if(save.tier_default){
            await models.SpaceGroup.removeTierDefault(connection, space_type, this.id); 
        }
        
        let existingSettings = await models.SpaceGroup.findSettingsById(connection, settings.id); 
        let settings_id = await models.SpaceGroup.saveSettings(connection, save, settings && settings.id); 
        if(existingSettings){
            if(existingSettings[0].tier_type != save.tier_type) this.unitGroupRefresh = true;
        }
        save.id = settings_id;

        this.Settings[space_type] = save;
        await this.saveAmenities(connection, data.amenities, save.id);
        await this.saveTiers(connection, data.tiers, save.id);
        if(this.unitGroupRefresh){
            await models.SpaceGroup.refreshUnitGroup(connection, this.id);
            await refreshUnitGroup.triggerRateChangeCron(cid, { profile_id: this.id, property_id: data?.property_id });
        }
    }


    async saveAmenities(connection, amenities = [], settings_id){
        
        amenities = amenities.filter((a, i) => amenities.findIndex(am => a.amenity_property_id == am.amenity_property_id) === i);
        let newAmenityData= [];
        let amenityExistingData = await models.SpaceGroup.getAmenities(connection, settings_id)
        await models.SpaceGroup.removeAmenities(connection, settings_id);
        for(let i = 0; i < amenities.length; i++){
            let amenity = await models.Amenity.findPropertyAmenityById(connection,  amenities[i].amenity_property_id);
            let save = {
                amenity_property_id: amenity.id,
                unit_group_profile_settings_id: settings_id, 
                sort: i
            }
            await models.SpaceGroup.saveAmenities(connection, save, amenities[i].id)
            newAmenityData.push(save);
        }
        if(!await utils.equalArrays(amenityExistingData, newAmenityData)) this.unitGroupRefresh = true;
    }

    async saveTiers(connection, tiers = [], settings_id){
        let last_tier = 0;
        let tiersExistingData = await models.SpaceGroup.getTiers(connection, settings_id)
        let newTiersData= []
        await models.SpaceGroup.removeTiers(connection, settings_id);

        for(let i = 0; i < tiers.length; i++){
            let save = {
                unit_group_profile_settings_id: settings_id, 
                min_sqft: last_tier,
                max_sqft: tiers[i],
            }
       
            await models.SpaceGroup.saveTiers(connection, save)
            last_tier = tiers[i]
            newTiersData.push(save)
        }

        let save = {
            unit_group_profile_settings_id: settings_id, 
            min_sqft: last_tier,
            max_sqft: null,
        }
        await models.SpaceGroup.saveTiers(connection, save)
        newTiersData.push(save)
        if(!await utils.equalArrays(tiersExistingData, newTiersData)) this.unitGroupRefresh = true;
    }

    async findProfileByProperty(connection) {
        return await models.SpaceGroup.findProfileByProperty(connection, this.property_id); 
    }

    async findBreakdown(connection){


        let keys = Object.keys(this.Settings);
        for(let i = 0; i < keys.length; i++){
            let key = keys[i];
            let space_type = key; 
            
            let breakdown =  await models.SpaceGroup.findBreakdown(connection, this.id, space_type);
            for(let j = 0; j < breakdown.length; j++){
                breakdown[j].breakdown = breakdown[j].breakdown                 || "All Units"
                this.Settings[breakdown[j].type].groups = this.Settings[breakdown[j].type].groups || {}
                this.Settings[breakdown[j].type].groups[breakdown[j].breakdown] =  this.Settings[breakdown[j].type].groups[breakdown[j].breakdown]|| []
                this.Settings[breakdown[j].type].num_spaces = this.Settings[breakdown[j].type].num_spaces || 0;
                this.Settings[breakdown[j].type].num_groups = this.Settings[breakdown[j].type].num_groups || 0
                this.Settings[breakdown[j].type].groups[breakdown[j].breakdown].push({ 
                    id: breakdown[j].tier, 
                    area: breakdown[j].area, 
                    min_sqft: breakdown[j].min_sqft,
                    max_sqft: breakdown[j].max_sqft,
                    size: breakdown[j].size, 
                    num_spaces: breakdown[j].num_spaces,
                    tier_type: breakdown[j].tier_type,
    
                });
                this.Settings[breakdown[j].type].num_spaces += breakdown[j].num_spaces;
                this.Settings[breakdown[j].type].num_groups++
            }
        }
    }

    async getTemplates(connection, spaceTypes = [], propertyObj) {
        const resolver = spaceTypes.reduce((acc, spaceType) => {
            acc[spaceType] = propertyObj.getTemplates(connection, spaceType)
            return acc
        }, {})
        return Promise.props(resolver)
    }

    async getCostArray(connection, api, { lowest_unit, template, currDate, company_id}) {
        let reqBody = {
            start_date: currDate,
            promotions: lowest_unit?.promotions || [],
            coupons: [],
            insurance_id: null,
            billed_months: 0,
            hold_token: null,
            products: [],
            reservation_id: null,
        };
        let unit = new Unit({
            id: lowest_unit.id
        });
        template.Template.bill_day = 'Anniversary'
        await unit.find(connection)
        try {
            let data = await unit.rentUnit(connection, {
                api: api,
                params: reqBody,
                template: template.Template || {},
                company_id,
                reservation: {},
                save: false,
                contact: {},
                token: lowest_unit || {}
            });
            return Unit.formatLeaseSetup(data, unit);
        } catch (err) {
            return Promise.resolve();
        }
    }

    async findGroupsBreakdown(connection, property, amenities, promotions, api = {}, return_cost = "false") {

        let unitIds = null
        if (amenities?.length)  {
            unitIds = []
            amenities.forEach(function(amenity) {
                amenity.value = amenity.value?.toLowerCase().trim();
            });

            let amenityIds = amenities.map(amenity=>amenity.id)

            let unitAmenities = await models.Unit.getAvailableUnitsByFilteredAmenities(connection, property.id, amenityIds);

            let unitAmenityObject = unitAmenities.reduce((acc, curr) => {
    
                let res = {
                    id: curr.amenity_id,
                    value: curr.value?.toLowerCase().trim()
                }
                
                if(curr.unit_id in acc) acc[curr.unit_id].push(res)
                else acc[curr.unit_id] = [res]
                return acc
            }, {})

            for (let key in unitAmenityObject) {
                let value = unitAmenityObject[key]
                let intersectionValue = intersectionWith(amenities, value, (val1, val2) => {
                    return (isEqual(val1.id, val2.id) && isEqual(val1.value, val2.value))
                });

                if (intersectionValue.length == amenities.length) {
                    unitIds.push(key)
                }
            }

            if (!unitIds.length) {
                e.th(400,"No available units found for the given amenity filters")
            }
        }

        let breakdown = await models.SpaceGroup.findGroupBreakdown(connection, this.id, property.id, promotions, unitIds);

        let breakdown_name = []
        let currDate = moment().utcOffset(parseInt(property.utc_offset)).format('YYYY-MM-DD');

        let spacetype_templates = await this.getTemplates(connection, Array.from(new Set(breakdown.map(group => group.type))) , property);

        let spaceGroupCosts = await Promise.props(breakdown.reduce((accumulator, group) => {
            if(group.lowest_unit && return_cost == "true") {
                accumulator[group.unit_group_hashed_id] = this.getCostArray(
                    connection,
                    api,
                    {
                        lowest_unit: group.lowest_unit,
                        template: spacetype_templates[group.type],
                        currDate,
                        company_id: property.company_id
                    }
                )
            }
            return accumulator
        }, {}))


        for (let j = 0; j < breakdown.length; j++) {
            let breakdown_type = breakdown[j].type;
            let size_tier_type = false;

            this.Settings[breakdown_type].num_spaces = this.Settings[breakdown_type].num_spaces || 0;
            this.Settings[breakdown_type].num_groups = this.Settings[breakdown_type].num_groups || 0;

            // set a flag based on the tier type
            if((breakdown[j].tier_type).toLowerCase() == "size"){
                size_tier_type =  true;
            }
            let unit_group_amenities = breakdown[j]?.amenities ?? []
            if (breakdown[j].vacant_units_count > 0) {
                unit_group_amenities = unit_group_amenities.filter(amenity=> amenity.available_units > 0)
            } 
            
            // if (breakdown_name.includes( breakdown[j].breakdown)== false){
            this.Settings[breakdown_type].groups.push({
                name:  breakdown[j].breakdown || "all units",
                amenities: breakdown[j]?.breakdown_amenities || [],
                tiers: [{
                    ...size_tier_type?  {tier_id: breakdown[j].unit_group_hashed_id} : {tier_id: breakdown[j].unit_group_hashed_id},
                    ...size_tier_type?  {description:  breakdown[j].size} : { description:  breakdown[j].area},
                    ...size_tier_type?  { min_sqft:  null}: { min_sqft:  breakdown[j].min_sqft},
                    ...size_tier_type?  { max_sqft:   null} : { max_sqft:   breakdown[j].max_sqft},
                    ...size_tier_type?  { width: breakdown[j].width} : {width:  null},
                    ...size_tier_type?  { length: breakdown[j].length} : {length:  null},
                    units: {
                        count: breakdown[j].num_spaces,
                        min_price: breakdown[j].min_price,
                        max_price: breakdown[j].max_price
                    },
                    vacant:{
                        count: breakdown[j].vacant_units_count,
                        min_price: breakdown[j].vac_min_price,
                        max_price: breakdown[j].vac_max_price
                    },
                    amenities: unit_group_amenities,
                    promo: breakdown[j]?.promotions ?? [],
                    insurance: [],
                    costs: spaceGroupCosts[breakdown[j].unit_group_hashed_id] ?? {}
                }]
            });
            breakdown_name.push( breakdown[j].breakdown)
            this.Settings[breakdown[j].type].num_spaces += breakdown[j].num_spaces;
            this.Settings[breakdown[j].type].num_groups++
        }
    }

    async findOSR(connection, date, property){

        if(!property || !property.id){
            property = new Property({id: this.property_id});
            await property.find(connection);
        }

        let results = await models.SpaceGroup.findOSR(connection, this.id, date);
        let report = { groups: {}, summary: {} };

        let report_fields = [ 
            'num_spaces', 
            'reservation_count', 
            'complimentary_count', 
            'lifetime_value', 
            'lifetime_value_agg', 
            'gross_complimentary', 
            'gross_offline', 
            'disc_amount', 
            'promo_amount', 
            'tenants_over_sell_rate', 
            'tenants_under_sell_rate',  
            'gross_potential', 
            'gross_occupied', 
            'actual_occupied', 
            'area_occupancy', 
            'available_units', 
            'offline_units', 
            'total_area', 
            'avg_rent_area_mo', 
            'avg_rent_area_ann', 
            'promo_ind', 
            'occupied_units', 
            'economic_occupancy',
            'gross_available', 
            'occupied_area', 
            'available_area', 
            'offline_area', 
            'num_leases_mo', 
            'num_leases',       
        ];

        for(let i = 0; i < results.length; i++){
            let row = results[i];

            for (let j = 0; j < report_fields.length; j++){
                let key = report_fields[j];

                if(typeof row[key] === 'undefined' || row[key] === null) continue;
                
                // TOTAL section on bottom of page 1
                report.summary[key] = report.summary[key] || 0;
                report.summary[key] = utils.r(report.summary[key] + row[key]);

                 //  Space group section on top of page 1
                report.groups[row.type] = report.groups[row.type] || { groups: {}, summary: {} };
                report.groups[row.type].summary[key] = report.groups[row.type].summary[key] || 0;
                report.groups[row.type].summary[key] = utils.r(report.groups[row.type].summary[key] + row[key]);
            
                //  Group Summary Info
                row.breakdown = row.breakdown || "All Units";
                report.groups[row.type].groups[row.breakdown] = report.groups[row.type].groups[row.breakdown] || { groups: {}, summary: {} };
                report.groups[row.type].groups[row.breakdown].summary[key] = report.groups[row.type].groups[row.breakdown].summary[key] || 0;
                report.groups[row.type].groups[row.breakdown].summary[key] = utils.r(report.groups[row.type].groups[row.breakdown].summary[key] + row[key]);
            }

            if(row.tier_type === 'area'){
                row.area =  row.area || "All Areas";
                row.label = row.area;
                report.groups[row.type].groups[row.breakdown].groups[row.area] = row;
            } else {
                row.size = row.size || "All Sizes";
                row.label = row.size;
                report.groups[row.type].groups[row.breakdown].groups[row.size] = row;
            }
        }

        // handle non-summation aggregate data.  

        let summary_groups = {
            'total_area' : 0,
            'total_set_rate': 0,
            'total_sell_rate': 0, 
            'los': 0, 
            'los_mo': 0,
            'physical_vacancy': 0,
            'actual_occupied': 0
        }

        for(const property_type in report.groups){
            let amenity_groups = {
                'total_area' : 0,
                'total_set_rate': 0,
                'total_sell_rate': 0,
                'los': 0,
                'los_mo': 0,
                'actual_occupied': 0
            }
            for(const amenities in report.groups[property_type].groups){
                console.log("amenities", amenities)
                let size_groups = {
                    'total_area' : 0,
                    'total_set_rate': 0,
                    'total_sell_rate': 0,
                    'los': 0,
                    'los_mo': 0,
                    'actual_occupied': 0,
                    'economic_occupancy': 0
                }

                for(const size in report.groups[property_type].groups[amenities].groups){
                    size_groups['total_area'] += report.groups[property_type].groups[amenities].groups[size]['total_area'];
                    size_groups['total_set_rate'] += report.groups[property_type].groups[amenities].groups[size]['num_spaces'] * report.groups[property_type].groups[amenities].groups[size]['avg_set_rate'];
                    size_groups['total_sell_rate'] += report.groups[property_type].groups[amenities].groups[size]['num_spaces'] * report.groups[property_type].groups[amenities].groups[size]['avg_sell_rate'];
                    size_groups['los'] += report.groups[property_type].groups[amenities].groups[size]['num_leases'] * report.groups[property_type].groups[amenities].groups[size]['avg_length_of_stay'];
                    size_groups['los_mo'] += report.groups[property_type].groups[amenities].groups[size]['num_leases_mo'] * report.groups[property_type].groups[amenities].groups[size]['avg_los_mo'];
                    size_groups['actual_occupied'] += report.groups[property_type].groups[amenities].groups[size]['actual_occupied'];
                    size_groups['economic_occupancy'] += report.groups[property_type].groups[amenities].groups[size]['num_spaces'] * report.groups[property_type].groups[amenities].groups[size]['economic_occupancy'];

                }
            
                report.groups[property_type].groups[amenities].summary['area_per_space'] = utils.r(size_groups['total_area'] / report.groups[property_type].groups[amenities].summary['num_spaces']);
                report.groups[property_type].groups[amenities].summary['economic_occupancy'] = utils.r(size_groups['economic_occupancy'] / report.groups[property_type].groups[amenities].summary['num_spaces']);

                report.groups[property_type].groups[amenities].summary['avg_set_rate'] = utils.r(size_groups['total_set_rate'] / report.groups[property_type].groups[amenities].summary['num_spaces']);
                report.groups[property_type].groups[amenities].summary['avg_sell_rate'] = utils.r(size_groups['total_sell_rate'] / report.groups[property_type].groups[amenities].summary['num_spaces']);
                report.groups[property_type].groups[amenities].summary['avg_rent'] = utils.r(size_groups['actual_occupied'] / report.groups[property_type].groups[amenities].summary['occupied_units']);
                
                report.groups[property_type].groups[amenities].summary['income_occupancy_pct'] = utils.r(report.groups[property_type].groups[amenities].summary['actual_occupied'] / report.groups[property_type].groups[amenities].summary['gross_occupied'], 4);
                report.groups[property_type].groups[amenities].summary['space_occupancy_pct'] = utils.r(report.groups[property_type].groups[amenities].summary['occupied_units'] / report.groups[property_type].groups[amenities].summary['num_spaces'], 4);
                report.groups[property_type].groups[amenities].summary['area_occupancy_pct'] = utils.r(report.groups[property_type].groups[amenities].summary['occupied_area'] / report.groups[property_type].groups[amenities].summary['total_area'], 4);
                report.groups[property_type].groups[amenities].summary['economic_occupancy_pct'] = utils.r(report.groups[property_type].groups[amenities].summary['actual_occupied'] / report.groups[property_type].groups[amenities].summary['gross_potential'], 4);
                report.groups[property_type].groups[amenities].summary['physical_vacancy'] = utils.r(report.groups[property_type].groups[amenities].summary['gross_occupied'] - report.groups[property_type].groups[amenities].summary['gross_potential']);
                
                report.groups[property_type].groups[amenities].summary['physical_vacancy_pct'] = utils.r(report.groups[property_type].groups[amenities].summary['physical_vacancy'] / report.groups[property_type].groups[amenities].summary['gross_potential'], 4);
                report.groups[property_type].groups[amenities].summary['gross_occupied_pct'] = utils.r(report.groups[property_type].groups[amenities].summary['gross_occupied'] / report.groups[property_type].groups[amenities].summary['gross_potential'], 4);
                report.groups[property_type].groups[amenities].summary['gross_complimentary_pct'] = utils.r(report.groups[property_type].groups[amenities].summary['gross_complimentary'] / report.groups[property_type].groups[amenities].summary['gross_potential'], 4);
                report.groups[property_type].groups[amenities].summary['gross_offline_pct'] = utils.r(report.groups[property_type].groups[amenities].summary['gross_offline'] / report.groups[property_type].groups[amenities].summary['gross_potential'], 4);
                report.groups[property_type].groups[amenities].summary['actual_occupied_pct'] = utils.r(report.groups[property_type].groups[amenities].summary['actual_occupied'] / report.groups[property_type].groups[amenities].summary['gross_potential'], 4);
                report.groups[property_type].groups[amenities].summary['promotions_pct'] = utils.r(report.groups[property_type].groups[amenities].summary['promo_amount'] / report.groups[property_type].groups[amenities].summary['gross_potential'], 4);
                report.groups[property_type].groups[amenities].summary['discount_pct'] = utils.r(report.groups[property_type].groups[amenities].summary['disc_amount'] / report.groups[property_type].groups[amenities].summary['gross_potential'], 4);

                report.groups[property_type].groups[amenities].summary['space_occupancy_occupied_pct'] = utils.r(report.groups[property_type].groups[amenities].summary['occupied_units'] / report.groups[property_type].groups[amenities].summary['num_spaces'], 4); // space occupancy - occupied
                report.groups[property_type].groups[amenities].summary['space_occupancy_vacant_pct'] = utils.r(report.groups[property_type].groups[amenities].summary['available_units'] / report.groups[property_type].groups[amenities].summary['num_spaces'], 4);
                report.groups[property_type].groups[amenities].summary['space_occupancy_offline_pct'] = utils.r(report.groups[property_type].groups[amenities].summary['offline_units'] / report.groups[property_type].groups[amenities].summary['num_spaces'], 4);
                
                report.groups[property_type].groups[amenities].summary['area_occupancy_occupied_pct'] = utils.r(report.groups[property_type].groups[amenities].summary['occupied_area'] / report.groups[property_type].groups[amenities].summary['total_area'], 4); // space occupancy - occupied
                report.groups[property_type].groups[amenities].summary['area_occupancy_vacant_pct'] = utils.r(report.groups[property_type].groups[amenities].summary['available_area'] / report.groups[property_type].groups[amenities].summary['total_area'], 4);
                report.groups[property_type].groups[amenities].summary['area_occupancy_offline_pct'] = utils.r(report.groups[property_type].groups[amenities].summary['offline_area'] / report.groups[property_type].groups[amenities].summary['total_area'], 4);
                
                report.groups[property_type].groups[amenities].summary['avg_area_space_occupied'] = utils.r(report.groups[property_type].groups[amenities].summary['occupied_area'] / report.groups[property_type].groups[amenities].summary['occupied_units']);
                report.groups[property_type].groups[amenities].summary['avg_area_space_vacant'] = utils.r(report.groups[property_type].groups[amenities].summary['available_area'] / report.groups[property_type].groups[amenities].summary['available_units']);
                report.groups[property_type].groups[amenities].summary['avg_area_space_offline'] = utils.r(report.groups[property_type].groups[amenities].summary['offline_area'] / report.groups[property_type].groups[amenities].summary['offline_units']);
                report.groups[property_type].groups[amenities].summary['avg_area_space'] = utils.r(report.groups[property_type].groups[amenities].summary['total_area'] / report.groups[property_type].groups[amenities].summary['num_spaces']);
        
                report.groups[property_type].groups[amenities].summary['avg_rent_space_occupied'] = utils.r(report.groups[property_type].groups[amenities].summary['avg_rent']);
                report.groups[property_type].groups[amenities].summary['avg_rent_space_vacant'] = utils.r(report.groups[property_type].groups[amenities].summary['gross_available'] / report.groups[property_type].groups[amenities].summary['available_units']);
                report.groups[property_type].groups[amenities].summary['avg_rent_space_offline'] = utils.r(report.groups[property_type].groups[amenities].summary['gross_offline'] / report.groups[property_type].groups[amenities].summary['offline_units']);
                report.groups[property_type].groups[amenities].summary['avg_rent_space'] = utils.r(report.groups[property_type].groups[amenities].summary['gross_occupied'] / report.groups[property_type].groups[amenities].summary['num_spaces']);
                
                report.groups[property_type].groups[amenities].summary['avg_rent_area_total'] = utils.r(report.groups[property_type].groups[amenities].summary['gross_occupied'] / report.groups[property_type].groups[amenities].summary['total_area']);
                report.groups[property_type].groups[amenities].summary['avg_rent_area_occupied'] = utils.r(report.groups[property_type].groups[amenities].summary['actual_occupied'] / report.groups[property_type].groups[amenities].summary['occupied_area']);
                report.groups[property_type].groups[amenities].summary['avg_rent_area_available'] = utils.r(report.groups[property_type].groups[amenities].summary['gross_available'] / report.groups[property_type].groups[amenities].summary['available_area']);
                report.groups[property_type].groups[amenities].summary['avg_rent_area_offline'] = utils.r(report.groups[property_type].groups[amenities].summary['gross_offline'] / report.groups[property_type].groups[amenities].summary['offline_area']);
                        
                        
                report.groups[property_type].groups[amenities].summary['avg_los'] = utils.r(size_groups['los'] / report.groups[property_type].groups[amenities].summary['num_leases']);
                report.groups[property_type].groups[amenities].summary['avg_los_mo'] = utils.r(size_groups['los_mo'] / report.groups[property_type].groups[amenities].summary['num_leases_mo']);

                amenity_groups['total_area'] += size_groups['total_area']
                amenity_groups['total_set_rate'] += size_groups['total_set_rate']
                amenity_groups['total_sell_rate'] += size_groups['total_sell_rate']
                amenity_groups['los'] += size_groups['los']
                amenity_groups['los_mo'] += size_groups['los_mo']
                amenity_groups['actual_occupied'] += size_groups['actual_occupied']
            }
        
            report.groups[property_type].summary['area_per_space'] = utils.r(amenity_groups['total_area'] / report.groups[property_type].summary['num_spaces']);

            report.groups[property_type].summary['avg_set_rate'] = utils.r(amenity_groups['total_set_rate'] / report.groups[property_type].summary['num_spaces']);
            report.groups[property_type].summary['avg_sell_rate'] = utils.r(amenity_groups['total_sell_rate'] / report.groups[property_type].summary['num_spaces']);
            report.groups[property_type].summary['avg_rent'] = utils.r(amenity_groups['actual_occupied'] / report.groups[property_type].summary['occupied_units']);

          
            report.groups[property_type].summary['income_occupancy_pct'] = utils.r(report.groups[property_type].summary['actual_occupied'] / report.groups[property_type].summary['gross_occupied'], 4);
            report.groups[property_type].summary['space_occupancy_pct'] = utils.r(report.groups[property_type].summary['occupied_units'] / report.groups[property_type].summary['num_spaces'], 4);
            report.groups[property_type].summary['area_occupancy_pct'] = utils.r(report.groups[property_type].summary['occupied_area'] / report.groups[property_type].summary['total_area'], 4);
            report.groups[property_type].summary['economic_occupancy_pct'] = utils.r(report.groups[property_type].summary['actual_occupied'] / report.groups[property_type].summary['gross_potential'], 4);
            report.groups[property_type].summary['physical_vacancy'] = utils.r(report.groups[property_type].summary['gross_occupied'] - report.groups[property_type].summary['gross_potential']);
            
            report.groups[property_type].summary['physical_vacancy_pct'] = utils.r(report.groups[property_type].summary['physical_vacancy'] / report.groups[property_type].summary['gross_potential'], 4);
            report.groups[property_type].summary['gross_occupied_pct'] = utils.r(report.groups[property_type].summary['gross_occupied'] / report.groups[property_type].summary['gross_potential'], 4);
            report.groups[property_type].summary['gross_complimentary_pct'] = utils.r(report.groups[property_type].summary['gross_complimentary'] / report.groups[property_type].summary['gross_potential'], 4);
            report.groups[property_type].summary['gross_offline_pct'] = utils.r(report.groups[property_type].summary['gross_offline'] / report.groups[property_type].summary['gross_potential'], 4);
            report.groups[property_type].summary['actual_occupied_pct'] = utils.r(report.groups[property_type].summary['actual_occupied'] / report.groups[property_type].summary['gross_potential'], 4);
            report.groups[property_type].summary['promotions_pct'] = utils.r(report.groups[property_type].summary['promo_amount'] / report.groups[property_type].summary['gross_potential'], 4);
            report.groups[property_type].summary['discount_pct'] = utils.r(report.groups[property_type].summary['disc_amount'] / report.groups[property_type].summary['gross_potential'], 4);
            
            report.groups[property_type].summary['space_occupancy_occupied_pct'] = utils.r(report.groups[property_type].summary['occupied_units'] / report.groups[property_type].summary['num_spaces'], 4); // space occupancy - occupied
            report.groups[property_type].summary['space_occupancy_vacant_pct'] = utils.r(report.groups[property_type].summary['available_units'] / report.groups[property_type].summary['num_spaces'], 4);
            report.groups[property_type].summary['area_occupancy_offline_pct'] = utils.r(report.groups[property_type].summary['offline_units'] / report.groups[property_type].summary['num_spaces'], 4);
            
            report.groups[property_type].summary['area_occupancy_occupied_pct'] = utils.r(report.groups[property_type].summary['occupied_area'] / report.groups[property_type].summary['total_area'], 4); // space occupancy - occupied
            report.groups[property_type].summary['area_occupancy_vacant_pct'] = utils.r(report.groups[property_type].summary['available_area'] / report.groups[property_type].summary['total_area'], 4);
            report.groups[property_type].summary['area_occupancy_offline_pct'] = utils.r(report.groups[property_type].summary['offline_area'] / report.groups[property_type].summary['total_area'], 4);
            
            report.groups[property_type].summary['avg_area_space_occupied'] = utils.r(report.groups[property_type].summary['occupied_area'] / report.groups[property_type].summary['occupied_units']);
            report.groups[property_type].summary['avg_area_space_vacant'] = utils.r(report.groups[property_type].summary['available_area'] / report.groups[property_type].summary['available_units']);
            report.groups[property_type].summary['avg_area_space_offline'] = utils.r(report.groups[property_type].summary['offline_area'] / report.groups[property_type].summary['offline_units']);
            report.groups[property_type].summary['avg_area_space_total'] = utils.r(report.groups[property_type].summary['total_area'] / report.groups[property_type].summary['num_spaces']);
    
            report.groups[property_type].summary['avg_rent_space_occupied'] = utils.r(report.groups[property_type].summary['avg_rent']);
            report.groups[property_type].summary['avg_rent_space_vacant'] = utils.r(report.groups[property_type].summary['gross_available'] / report.groups[property_type].summary['available_units']);
            report.groups[property_type].summary['avg_rent_space_offline'] = utils.r(report.groups[property_type].summary['gross_offline'] / report.groups[property_type].summary['offline_units']);
            report.groups[property_type].summary['avg_rent_space_total'] = utils.r(report.groups[property_type].summary['gross_occupied'] / report.groups[property_type].summary['num_spaces']);

            report.groups[property_type].summary['avg_rent_area_total'] = utils.r(report.groups[property_type].summary['gross_occupied'] / report.groups[property_type].summary['total_area']);
            report.groups[property_type].summary['avg_rent_area_occupied'] = utils.r(report.groups[property_type].summary['actual_occupied'] / report.groups[property_type].summary['occupied_area']);
            report.groups[property_type].summary['avg_rent_area_available'] = utils.r(report.groups[property_type].summary['gross_available'] / report.groups[property_type].summary['available_area']);
            report.groups[property_type].summary['avg_rent_area_offline'] = utils.r(report.groups[property_type].summary['gross_offline'] / report.groups[property_type].summary['offline_area']);
                    
            report.groups[property_type].summary['avg_los'] = utils.r(amenity_groups['los'] / report.groups[property_type].summary['num_leases']);
            report.groups[property_type].summary['avg_los_mo'] = utils.r(amenity_groups['los_mo'] / report.groups[property_type].summary['num_leases_mo']);

            summary_groups['total_area'] += amenity_groups['total_area'];
            summary_groups['total_set_rate'] += amenity_groups['total_set_rate']
            summary_groups['total_sell_rate'] += amenity_groups['total_sell_rate']
            summary_groups['los'] += amenity_groups['los']
            summary_groups['los_mo'] += amenity_groups['los_mo']
            summary_groups['actual_occupied'] += amenity_groups['actual_occupied']
            
        }
        report.summary['area_per_space'] = utils.r(summary_groups['total_area'] / report.summary['num_spaces']);
        report.summary['avg_set_rate'] = utils.r(summary_groups['total_set_rate'] / report.summary['num_spaces']);
        report.summary['avg_sell_rate'] = utils.r(summary_groups['total_sell_rate'] / report.summary['num_spaces']);
        report.summary['avg_rent'] = utils.r(summary_groups['actual_occupied'] / report.summary['occupied_units']);
        
        report.summary['income_occupancy_pct'] = utils.r(report.summary['actual_occupied'] / report.summary['gross_occupied'], 4);
        report.summary['space_occupancy_pct'] = utils.r(report.summary['occupied_units'] / report.summary['num_spaces'], 4);
        report.summary['area_occupancy_pct'] = utils.r(report.summary['occupied_area'] / report.summary['total_area'], 4);
        report.summary['economic_occupancy_pct'] = utils.r(report.summary['actual_occupied'] / report.summary['gross_potential'], 4);
        report.summary['physical_vacancy'] = utils.r(report.summary['gross_occupied'] - report.summary['gross_potential']);
        
        report.summary['physical_vacancy_pct'] = utils.r(report.summary['physical_vacancy'] / report.summary['gross_potential'], 4);
        report.summary['gross_occupied_pct'] = utils.r(report.summary['gross_occupied'] / report.summary['gross_potential'], 4);
        report.summary['gross_complimentary_pct'] = utils.r(report.summary['gross_complimentary'] / report.summary['gross_potential'], 4);
        report.summary['gross_offline_pct'] = utils.r(report.summary['gross_offline'] / report.summary['gross_potential'], 4);
        report.summary['actual_occupied_pct'] = utils.r(report.summary['actual_occupied'] / report.summary['gross_potential'], 4);
        report.summary['promotions_pct'] = utils.r(report.summary['promo_amount'] / report.summary['gross_potential'], 4);
        report.summary['discount_pct'] = utils.r(report.summary['disc_amount'] / report.summary['gross_potential'], 4);

        report.summary['space_occupancy_occupied_pct'] = utils.r(report.summary['occupied_units'] / report.summary['num_spaces'], 4);
        report.summary['space_occupancy_vacant_pct'] = utils.r(report.summary['available_units'] / report.summary['num_spaces'], 4);
        report.summary['space_occupancy_offline_pct'] = utils.r(report.summary['offline_units'] / report.summary['num_spaces'], 4);
        
        report.summary['area_occupancy_occupied_pct'] = utils.r(report.summary['occupied_area'] / report.summary['total_area'], 4);
        report.summary['area_occupancy_vacant_pct'] = utils.r(report.summary['available_area'] / report.summary['total_area'], 4);
        report.summary['area_occupancy_offline_pct'] = utils.r(report.summary['offline_area'] / report.summary['total_area'], 4);
        
        report.summary['avg_area_space_occupied'] = utils.r(report.summary['occupied_area'] / report.summary['occupied_units']);
        report.summary['avg_area_space_vacant'] = utils.r(report.summary['available_area'] / report.summary['available_units']);
        report.summary['avg_area_space_offline'] = utils.r(report.summary['offline_area'] / report.summary['offline_units']);
        report.summary['avg_area_space_total'] = utils.r(report.summary['total_area'] / report.summary['num_spaces']);
       
        report.summary['avg_rent_space_occupied'] = utils.r(report.summary['avg_rent']);
        report.summary['avg_rent_space_vacant'] = utils.r(report.summary['gross_available'] / report.summary['available_units']);
        report.summary['avg_rent_space_offline'] = utils.r(report.summary['gross_offline'] / report.summary['offline_units']);
        report.summary['avg_rent_space'] = utils.r(report.summary['gross_occupied'] / report.summary['num_spaces']);
        
        report.summary['avg_rent_area_total'] = utils.r(report.summary['gross_occupied'] / report.summary['total_area']);
        report.summary['avg_rent_area_occupied'] = utils.r(report.summary['actual_occupied'] / report.summary['occupied_area']);
        report.summary['avg_rent_area_available'] = utils.r(report.summary['gross_available'] / report.summary['available_area']);
        report.summary['avg_rent_area_offline'] = utils.r(report.summary['gross_offline'] / report.summary['offline_area']);
                
        report.summary['avg_los'] = utils.r(summary_groups['los'] / report.summary['num_leases']);
        report.summary['avg_los_mo'] = utils.r(summary_groups['los_mo'] / report.summary['num_leases_mo']);

        console.log("REPORT OUTPUT", JSON.stringify(report, null, 2))
    
        return report; 
    }

    
    static async findByProperty(connection, property_id){
        let response = await models.SpaceGroup.findByProperty(connection, property_id);
        response?.forEach((profile) => profile.editable = { 1: true, 0: false }[profile.editable])
        return response
    }

    static async findDefaultTiers(connection, property_id, space_type){
		return await models.SpaceGroup.findDefaultTiers(connection, property_id, space_type)
    }

    async getOffers(connection, api, property, company_id, unit_group_id, amenity_val, promotion) {
        let unitGroupId = unit_group_id;
        let amenityArray = amenity_val;
        let promotionArray = promotion;
        let unitArray = [];
    
        let unitDetailsArray = await models.SpaceGroup.getOffers(
            connection,
            property.id,
            company_id,
            unitGroupId,
            amenityArray,
            promotionArray
        );
        if (unitDetailsArray.length == 0) e.th(400,"No available units found for the given group")
        let uniquePriceUnits = unitDetailsArray.filter(function(unitDetailsArray) {
            let key = Math.floor(unitDetailsArray.u_price);
            if (!this[key]) {
                this[key] = true;
                return true;
            }
        }, Object.create(null));
        let availableUnits = [];
        let valuePriceTier = await models.SpaceGroup.getValuePriceTier(connection, property.id);
        if (valuePriceTier.length == 0){
            unitArray = [ generateOffers(unitDetailsArray[0],null) ]
        }

        if (valuePriceTier.length !== 0){
            let betterVal = valuePriceTier.find(u => u.tier_type === 'better')
            let bestVal = valuePriceTier.find(u => u.tier_type === 'best')

            const isValConfigAvailable = betterVal.min_difference_in_price > 0 || bestVal.min_difference_in_price > 0
            availableUnits = uniquePriceUnits;

            if (unitDetailsArray.length > 1) {
                if (uniquePriceUnits.length <= 2 && isValConfigAvailable) {
                    availableUnits = unitDetailsArray;
                    if (betterVal.min_difference_in_price == 0) {
                        availableUnits = [unitDetailsArray[0], unitDetailsArray[unitDetailsArray.length-1]]
                    } else if (uniquePriceUnits.length == 2 && unitDetailsArray.length > 3) {
                        availableUnits = [...unitDetailsArray.slice(0,2), unitDetailsArray[unitDetailsArray.length-1]]
                    }
                }
            }
            unitArray = generateUnits(availableUnits);
            unitArray = generateValuePrice(valuePriceTier, unitArray);
        }

        for (let i in unitArray) {
            let promos = []
            for (let j in unitArray[i].promotions) {
                if(unitArray[i].promotions[j].type == "regular") {
                    let promoIds = []
                    let promotions = {
                        "promotion_id": unitArray[i].promotions[j].id
                    }
                    promoIds.push(promotions)
                    promos = Array.from(new Set(promoIds.map(a => a.promotion_id)))
                    .map(id => {
                        return promoIds.find(a => a.promotion_id === id)
                    })
                }
            }
            let currDate = await property.getLocalCurrentDate(connection);
            let reqBody = {
                start_date: currDate,
                //promotions : (query && query.promotions && query.promotions.length && query.promotions.filter((p, index, self) => self.findIndex(t => t.promotion_id === p && p.promotion_id) === index)) || [],
                promotions: promos,
                coupons: [],
                insurance_id: null,
                billed_months: 0,
                hold_token: null,
                products: [],
                reservation_id: null,
            };
    
            await property.find(connection);
    
            let reservation = {};
            let contact = {};
            if (unitArray[i].type) {
                let temp = await property.getTemplates(connection, unitArray[i].type);
                temp.Template.bill_day = 'Anniversary'
                let unit = new Unit({
                    id: unitArray[i].unit_id
                });
    
                await unit.find(connection)
                await unit.setSpaceMixId(connection)
                unitArray[i].space_mix_id = unit.space_mix_id
    
                let data = await unit.rentUnit(connection, {
                    api,
                    params: reqBody,
                    template: temp.Template || {},
                    company_id,
                    reservation,
                    save: false,
                    contact,
                    token: unitArray[i]
                });
    
                let results = Unit.formatLeaseSetup(data, unit);
                unitArray[i].costs = results
            }
        } 
        return unitArray;
    }
}

// generate token for offer
function generateToken(valueTier, unitId, price, amenities,promos) {
    const tokenData = {
        value_tier: valueTier,
        unit_id: Hashes.encode(unitId),
        price: price,
        amenities: amenities,
        promotions: promos
    };
    return jwt.sign(mask(tokenData, "value_tier,price,unit_id,amenities,promotions"), settings.security.key, {
        expiresIn: 60 * 45, // expires in 45 min
    });
}

function generateUnits(unitDetails) {
    const unitsLength = unitDetails.length ?? 0;
    let unitArray = [];
    let result = {};
    let unitType = []

    if (unitsLength > 0) {
        unitType.push({
            tier: unitsLength == 1 ? "best" : "good",
            unit: unitDetails[0]
        })
    }
    if (unitsLength > 2) {
        unitType.push({
            tier: "better",
            unit: unitDetails[unitsLength - 2]
        })
    }
    if (unitsLength > 1) {
        unitType.push({
            tier: "best",
            unit: unitDetails[unitsLength - 1]
        })
    }

    for (let index = 0; index < unitType.length; index++) {
        const unitObject = unitType[index];
        result = generateOffers(unitObject.unit, unitObject.tier);
        unitArray.push(result);
    }

    return unitArray;
}

function generateOffers(unit, val) {
    let tkn = {
        value_tier: val,
        unit_id: unit.id,
        price: unit.u_price,
        amenities: unit.amenities,
        promotions: (unit?.promotions ?? []).filter(item => item.type == 'regular').map(({name, id} = {}) => ({name, id}))
    };
    let dossierVal = { dossier: {
        token: generateToken(tkn.value_tier, tkn.unit_id, tkn.price, tkn.amenities,tkn.promotions)
    }}
    let convenient_amenity = {
        id: 0,
        name: "Convenience",
        type : "string",
        value: "Convenient",
        sort_order: -1
        }
    if (tkn.value_tier == "better"){
        convenient_amenity.value = "More Convenient"
    } else if (tkn.value_tier == "best"){
        convenient_amenity.value = "Most Convenient"
    }

   let result = {
        unit_id: unit.id,
        price: unit.u_price,
        type: unit.space_type,
        space_mix_id: null,
        value_tier: {
            type: val,
            label: val,
        },
        promotions: (unit.promotions ?? []).map(({
            id,
            name,
            type,
            description
        } = {}) => ({
            id,
            name,
            type,
            description,
        })),
        amenities: (unit.amenities ?? []),
        costs: null

    };
    result.amenities.push(convenient_amenity)
    if (val !== null){
        result = {...result,...dossierVal}
    }

    return result;
}

function generatePrice(unit_array, min_diff_price) {

    let goodPrice = (unit_array.find(ar => ar.value_tier.type === 'good') || {})?.price || 0
    let valuePrice = goodPrice + (goodPrice * min_diff_price / 100)
    return valuePrice
}

function generateValuePrice(valPriceData, unitValData) {
    let updatedValPriceData = []
    let unitPrice = -1
    for (let i = 0; i < (valPriceData.length || 0); i++) {
        let item = valPriceData[i]
        let valPrice = generatePrice(unitValData, item.min_difference_in_price)
        let val = unitValData.find(t => t.value_tier.type === item.tier_type)

        if (val) {
            if (valPrice < val.price) {
                valPrice = val.price
            }
            if (unitPrice == valPrice) {
                updatedValPriceData.pop()
            }
            unitPrice = valPrice
            let promotions = val?.promotions?.filter(item => item.type == 'regular').map(({name, id} = {}) => ({name, id})) ?? []
            updatedValPriceData.push({
                ...val,
                dossier: {
                    token: generateToken(val.value_tier, val.unit_id, valPrice, val.amenities, promotions)
                },
                price: valPrice,
                value_tier: {
                    type: item.tier_type,
                    label: item.label
                }
            })
        }

    }

    let betterVal = valPriceData.find(u => u.tier_type === 'better')
    let goodVal = valPriceData.find(u => u.tier_type === 'good')
    if (updatedValPriceData.length == 1){
        if (goodVal) {
            updatedValPriceData.push({
                value_tier: {
                    type: goodVal.tier_type,
                    label: goodVal.label
                }
            })
        }
        if (betterVal) {
            updatedValPriceData.push({
                value_tier: {
                    type: betterVal.tier_type,
                    label: betterVal.label
                }
            })
        }
   }else if(updatedValPriceData.length == 2 && betterVal){ 
        updatedValPriceData.push({
            value_tier: {
                type: betterVal.tier_type,
                label: betterVal.label
            }
        })
    }

    let sort_order = ["good", "better", "best"];
    updatedValPriceData = mapOrder(updatedValPriceData, sort_order, 'value_tier');

    return updatedValPriceData
}

function mapOrder(array, order, key) {

    array.sort(function(a, b) {
        var A = a[key]?.type,
            B = b[key]?.type;

        if (order.indexOf(A) > order.indexOf(B)) {
            return 1;
        } else {
            return -1;
        }
    });

    return array;
};


module.exports = SpaceGroup;



