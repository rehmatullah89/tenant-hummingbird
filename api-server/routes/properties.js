var express = require('express');
var router = express.Router();
var moment = require('moment');
var Promise = require('bluebird');
var rp = require('request-promise');

var settings = require(__dirname + '/../config/settings.js');
var flash = require(__dirname + '/../modules/flash.js');
var validation = require(__dirname + '/../modules/validation.js');
var utils = require(__dirname + '/../modules/utils.js');

var Hash = require(__dirname + '/../modules/hashes.js');
var ENUMS = require(__dirname + '/../modules/enums.js');
var Hashes = Hash.init();
var util = require('util');

var XLSX = require('xlsx');
var fs = require('fs');
var validator = require('validator');
var models = require(__dirname + '/../models');
var control = require(__dirname + '/../modules/site_control.js');
var Connection = require(__dirname + '/../classes/connection.js');
var QuickBooks = require(__dirname + '/../classes/quickbooks.js');
var Unit = require(__dirname + '/../classes/unit.js');
var Upload = require('../classes/upload.js');
var Address = require('../classes/address.js');
var Contact = require(__dirname + '/../classes/contact.js');
var Category = require(__dirname + '/../classes/category.js');
var Property = require(__dirname + '/../classes/property.js');
var Promotion = require(__dirname + '/../classes/promotion.js');
const SpaceGroupPromotions = require(__dirname + '/../classes/space-group-management/promotions.js')


var Company = require(__dirname + '/../classes/company.js');
var Product = require(__dirname + '/../classes/product.js');
var Payment = require(__dirname + '/../classes/payment.js');
var Invoice = require(__dirname + '/../classes/invoice.js');
var Settings = require(__dirname + '/../classes/settings.js');
var ClosingDay = require(__dirname + '/../classes/closing_day.js');
var InvoiceLine = require(__dirname + '/../classes/invoice_lines.js');
var Mailhouse = require(__dirname + '/../classes/mailhouse.js');
var Template = require('../classes/template.js');
var Service = require('../classes/service.js');
var Lease = require('../classes/lease.js');
var Reversal = require(__dirname + '/../classes/reversal.js');
var breadcrumbs = [];
var Activity = require(__dirname + '/../classes/activity.js');
var UnitGroup = require('../classes/unitgroup.js');
let WebsiteCategory = require('../classes/website_category.js');
const Report = require('../classes/report');
var e = require(__dirname + '/../modules/error_handler.js');
var UnitSearch = require(__dirname + '/../modules/unit_searcher.js');
var eventEmitter = require(__dirname + '/../events/index.js');
var { subscribeGDSEvent, getGDSSubscriptions, updateGDSEvent } = require('./../modules/messagebus_subscriptions');
var { subscribeSimpleCertified, subscribeRpost, getRpostSubscription, getSimpleCertifiedSubscription } = require('./../modules/mail_services.js');
var refreshUnitGroup = require(__dirname + '/../modules/refresh_unit_group.js');
var db = require(__dirname + '/../modules/db_handler.js');

var Joi = require('joi');
const joiValidator = require('express-joi-validation')({
  passError: true
});

var Schema = require(__dirname + '/../validation/properties.js');


module.exports = function (app, sockets) {

  router.get('/list', [control.hasAccess(['admin']), Hash.unHash], async (req, res, next) => {
    var connection = res.locals.connection;
    try {

      let company = res.locals.active;
      let contact = new Contact({ id: res.locals.contact.id });
      await contact.find(connection);
      await contact.getRole(connection, company.id);

      let properties = await Property.findListByCompanyId(connection, company.id, res.locals.properties);

      utils.send_response(res, {
        status: 200,
        data: {
          properties: Hash.obscure(properties, req)
        }
      });


    } catch (err) {
      next(err);
    }



  });

  /// TODO better support paging

  router.get('/', [control.hasAccess(['admin', 'api']), Hash.unHash], async (req, res, next) => {
    var connection = res.locals.connection;

    try {
      let company = res.locals.active;
      let contact = {};
      let base_properties = [];

      if (res.locals.contact) {
        contact = new Contact({ id: res.locals.contact.id });
        await contact.find(connection, company.id);
        res.fns.addStep('fetchedContact');
        await contact.getRole(connection, company.id);
        res.fns.addStep('fetchedRole');
        base_properties = contact.Properties.map(p => p.id)
      }

      let searchParams = {
        all: req.query.all || false,
        search: req.query.search || '',
        limit: req.query.limit || 200,
        offset: req.query.offset || 0
      };

      let property_list = await Property.findAggregatedByCompanyId(connection, company.id, searchParams, base_properties, res.locals.properties);
      let totalCount = property_list.length;
      // let totalCount = await Property.findByCompanyId(connection, company.id, searchParams, base_properties, res.locals.properties, true);

      res.fns.addStep('fetchedPropertiesList');
      let properties = [];
      for (let i = 0; i < property_list.length; i++) {
        let p = property_list[i];
        let property = new Property(p);
        // await property.find(connection);

        property.Address = {
          id: p.address_id, 
          address: p.address,
          address2: p.address2,
          city: p.city,
          state: p.state,
          neighborhood: p.neighborhood,
          zip: p.zip,
          country: p.country,
          lat: p.lat, 
          lng: p.lng, 
          formatted_address: p.formatted_address,
          region: p.region,
          district: p.district
        }
        property.unit_count = p.unit_count;
        property.lease_count = p.lease_count;
        property.occupancy = utils.r(p.lease_count / p.unit_count * 100);
      
        // await property.getAddress(connection);
        await property.getPhones(connection);
        await property.getEmails(connection);
        // await property.getImages(connection);
        // await property.getUnitCount(connection);
        // await property.getLeaseCount(connection);
        // await property.getOccupancy(connection);
        // await property.isDayClosed(connection);

        properties.push(property);
      }
      res.fns.addStep('fetchedPropertiesData');

      utils.send_response(res, {
        status: 200,
        data: {
          properties: Hash.obscure(properties, req),
          paging: {
            total: totalCount,
            count: properties.length
          }
        },
        message: ''
      });
    } catch (err) {
      next(err);
    }
  });

  router.get('/locations/:type', [control.hasAccess(['admin', 'api']), Hash.unHash], async (req, res, next) => {

    var connection = res.locals.connection;
    try {

      let contact = res.locals.contact;
      let company = res.locals.active;
      var params = req.params;

      let properties = await Property.findByType(connection, company.id, params.type, res.locals.properties);

      utils.send_response(res, {
        status: 200,
        data: {
          properties: Hash.obscure(properties.filter(p => p), req),
        },
        message: ''
      });



    } catch (err) {
      next(err);
    }

  });

  // Space-Mix - Categories

  router.get('/:property_id/space-mix', [control.hasAccess(['admin', 'api']), Hash.unHash], async (req, res, next) => {

    try {
      res.locals.connection = await db.exchangeForReadAccess(res.locals.connection);
      var connection = res.locals.connection;


      let company = res.locals.active;
      let query = req.query;
      let params = req.params;
      
      let property = new Property({ id: params.property_id });
      await property.find(connection);

      let spaceMix = [];
      let groupingProfile = await property.getGroupingProfile(connection, "Website Category Space Group");
      let groupingProfileId = groupingProfile?.id;
      let useGroupingProfile = !!groupingProfileId && !query.legacy;

      if (useGroupingProfile) {
        spaceMix = spaceMix.concat(await models.Unit.getUnitsOptionsByGroupingProfile(connection, groupingProfileId));
      } else {
        spaceMix = spaceMix.concat(await models.Unit.getUnitOptionsByCategory(connection, company.id, [property.id]));  
      }

      //Just to avoid to hash the id field of space-mix we are obscuring object here and the generate the space_mix id
      spaceMix = Hash.obscure(spaceMix, req);
      spaceMix.map(s => {
        
        // If grouping profile with name 'Website Category Space Group' exist then group id will be assigned. Otherwise, space-mix id will be used.
        s.id = useGroupingProfile ? s.space_group : utils.base64Encode(`${ENUMS.SPACETYPE[s.unit_type.toUpperCase()]},${s.spacemix_category_id},${s.width},${s.length},${s.height}`);
        s.category_id = Hashes.encode(s.spacemix_category_id, res.locals.company_id);
        let attr = [{
          name: "width",
          value: s["width"]
        }, {
          name: "length",
          value: s["length"]
        }, {
          name: "height",
          value: s["height"]
        }, {
          name: "unit_type",
          value: s["unit_type"]
        }];
        s.Attributes = attr;
        delete s.unit_type;
        delete s.spacemix_category_id;
        delete s.space_group;
        return s;
      });

      utils.send_response(res, {
        status: 200,
        data: {
          space_mix: spaceMix
        }
      });

    } catch (err) {
      next(err);
    }


  });

  // Space-Mix - by Id - return units of that category

  router.get('/:property_id/space-mix/:space_mix_id/units/available', [control.hasAccess(['admin', 'api']), Hash.unHash], async (req, res, next) => {

    try {
      res.locals.connection = await db.exchangeForReadAccess(res.locals.connection);
      var connection = res.locals.connection;


      let api = res.locals.api;
      let company = res.locals.active;
      let params = req.params;
      let query = req.query;
      let { limit, offset } = { ...utils.cleanQueryParams(query, { limit: 20 }, true) };

      let queryParams = {
        limit,
        offset
      }

      let property = new Property({ id: params.property_id });
      
      let unitGroupDetails = await property.getUnitGroupById(connection, params.space_mix_id)
      
      if (unitGroupDetails) {
        await property.verifyUnitGroupAccess(connection, property.id, params.space_mix_id);
        await property.getUnitGroupUnits(connection, api, params.space_mix_id, true, queryParams, res.fns.addStep);
      } else {
        let space_mix_ids = utils.base64Decode(params.space_mix_id).split(',');
        await property.find(connection);
        await property.getUnitsInSpaceMix(connection, api, company.id, [params.property_id], space_mix_ids, true, queryParams, res.fns.addStep, unitGroupDetails);
      }
      let paging = utils.generatePagingObject(req, { limit, offset }, property.unitCount, property.Units.length);

      utils.send_response(res, {
        status: 200,
        data: {
          units: Hash.obscure(property.Units, req),
          paging
        }
      });


    } catch (err) {
      next(err);
    }


  });

  router.get('/:property_id/space-mix/:space_mix_id/units', [control.hasAccess(['admin', 'api']), Hash.unHash], async (req, res, next) => {
    try {

      res.locals.connection = await db.exchangeForReadAccess(res.locals.connection);
      var connection = res.locals.connection;
      
      let api = res.locals.api;
      let company = res.locals.active;
      let params = req.params;
      let query = req.query;
      let { limit, offset } = { ...utils.cleanQueryParams(query, { limit: 20 }, true) };

      let queryParams = {
        limit,
        offset
      }


      let property = new Property({ id: params.property_id });
      let unitGroupDetails = await property.getUnitGroupById(connection, params.space_mix_id)

      if (unitGroupDetails) {
        await property.verifyUnitGroupAccess(connection, property.id, params.space_mix_id);
        await property.getUnitGroupUnits(connection, api, params.space_mix_id, false, queryParams, res.fns.addStep);
      } else {
        let space_mix_ids = utils.base64Decode(params.space_mix_id).split(',');
  
        await property.find(connection);
        res.fns.addStep('findProperty');
        await property.getUnitsInSpaceMix(connection, api, company.id, [params.property_id], space_mix_ids, false, queryParams, res.fns.addStep, unitGroupDetails);
      }

      let paging = utils.generatePagingObject(req, { limit, offset }, property.unitCount, property.Units.length);

      utils.send_response(res, {
        status: 200,
        data: {
          units: Hash.obscure(property.Units, req),
          paging
        }
      });


    } catch (err) {
      next(err);
    }

  });

  router.get('/:property_id/space-mix/:space_mix_id/promotions', [control.hasAccess(['admin', 'api']), Hash.unHash], async (req, res, next) => {
    try {
        res.locals.connection = await db.exchangeForReadAccess(res.locals.connection);
        var connection = res.locals.connection;
        let company = res.locals.active;
        let params = req.params;
        let spaceMixId = params.space_mix_id;
        let property = {};
        let promotionsList;

        const unitGroups = await models.Unit.verifyUnitGroupAccess(connection, params.property_id, spaceMixId);
        let hasUnitGroups = unitGroups?.length;
        if (hasUnitGroups) {
          const promotions = new SpaceGroupPromotions({space_group_tier_hash: spaceMixId, company_id: company.id});
          promotionsList = (await promotions.get(connection)) ?? [];
          for (const item of promotionsList) {
            Object.assign(item, {
              Coupons: [],
              PromotionRules: [],
              PromotionTypes: [],
              Properties: [],
              Units: [],
              round: item?.rounding,
              Creator: item?.created_by ? new Contact({ id: item.created_by }) : null
            });
            delete item?.rounding;
            delete item?.website_promotion_type;
            delete item?.public;
            if (item.Creator) await item.Creator.find(connection);
          }
        } else {
          property = new Property({ id: params.property_id });
          await property.find(connection);
          await property.getPromotionsInSpaceMix(connection, company.id, spaceMixId);
          promotionsList = property.Promotions
        }

        res.json({
          status: 200,
          data: {
            promotions: Hash.obscure(promotionsList, req)
          }
        });
      } catch (err) {
        next(err);
      }
    }
  );


  /**** Property Application Configuration ****/
  router.get('/:property_id/application', [control.hasAccess(['admin']), Hash.unHash], async (req, res, next) => {

    var connection = res.locals.connection;
    try {

      let contact = res.locals.contact;
      let company = res.locals.active;
      var params = req.params;
      let property = new Property({ id: params.property_id });
      await property.find(connection);
      console.log("PROPERTIES", res.locals.properties);
      console.log("PROPERTy id", property.id);

      await property.verifyAccess({company_id: company.id, properties: res.locals.properties});
      await property.getApplicationConfig(connection);


      utils.send_response(res, {
        status: 200,
        data: {
          fields: Hash.obscure(property.ApplicationConfig, req)
        },
        message: ''
      });



    } catch (err) {
      next(err);
    }



  });

  router.post('/:property_id/application', [control.hasAccess(['admin']), joiValidator.body(Schema.applicationConfig), control.hasPermission('manage_facility_settings'), Hash.unHash], async (req, res, next) => {

    var connection = res.locals.connection;
    try {

      let contact = res.locals.contact;
      let company = res.locals.active;

      var params = req.params;
      var body = req.body;
      let property = new Property({ id: params.property_id });
      await property.find(connection);
      await property.verifyAccess({connection, company_id: company.id, properties: res.locals.properties, contact_id: contact.id, permissions: ['manage_facility_settings']});
      await property.getApplicationConfig(connection);

      await property.saveApplicationConfig(connection, body.fields);


      utils.send_response(res, {
        status: 200,
        data: {},
        message: ''
      });

      eventEmitter.emit('application_configuration_updated', { company, contact, property, cid: res.locals.company_id, locals: res.locals });

    } catch (err) {
      next(err);
    }



  });

  /**** Property Lease Template Configuration ****/
  router.get('/:property_id/templates', [control.hasAccess(['admin']), Hash.unHash], async (req, res, next) => {

    try {
      var connection = res.locals.connection;

      let company = res.locals.active;
      let params = req.params;

      let property = new Property({ id: params.property_id });
      await property.find(connection);
      await property.verifyAccess({company_id: company.id, properties: res.locals.properties});
      await property.getTemplates(connection);
      
      utils.send_response(res, {
        status: 200,
        data: {
          templates: Hash.obscure(property.LeaseTemplates, req)
        }
      });

    } catch (err) {
      next(err);
    }


  });

  router.post('/:property_id/templates', [control.hasAccess(['admin']), joiValidator.body(Schema.setTemplate), control.hasPermission('manage_facility_settings'), Hash.unHash], async (req, res, next) => {


    var connection = res.locals.connection;
    try {

      let contact = res.locals.contact;
      let company = res.locals.active;
      var params = req.params;
      var body = req.body;
      let property = new Property({ id: params.property_id });
      await property.find(connection);
      await property.verifyAccess({connection, company_id: company.id, properties: res.locals.properties, contact_id: contact.id, permissions: ['manage_facility_settings']});
      let template = await property.createTemplate(connection, body);

      utils.send_response(res, {
        status: 200,
        data: {},
        message: ''
      });

      eventEmitter.emit('template_added_to_property', { company, contact, property, template, cid: res.locals.company_id, locals: res.locals });

    } catch (err) {
      next(err);
    }



  });

  router.delete('/:property_id/templates/:template_id', [control.hasAccess(['admin']), control.hasPermission('manage_facility_settings'), Hash.unHash], async (req, res, next) => {

    var connection = res.locals.connection;
    try {

      let contact = res.locals.contact;
      let company = res.locals.active;

      var params = req.params;
      let property = new Property({ id: params.property_id });
      await property.find(connection);

      await property.verifyAccess({connection, company_id: company.id, properties: res.locals.properties, contact_id: contact.id, permissions: ['manage_facility_settings']});

      let template = await property.getTemplate(connection, params.template_id);
      await property.deleteTemplate(connection, params.template_id);

      utils.send_response(res, {
        status: 200,
        data: {},
        message: ''
      });

      eventEmitter.emit('template_removed_from_property', { company, contact, property, template, cid: res.locals.company_id, locals: res.locals });

    } catch (err) {
      next(err);
    }



  });

  router.post('/', [control.hasAccess(['admin', 'api']), joiValidator.body(Schema.createProperty), Hash.unHash], async (req, res, next) => {

    // TODO - Should we update the list?
    var connection = res.locals.connection;
    try {
      await connection.beginTransactionAsync();

      let contact = res.locals.contact
      let company = res.locals.active;

      let body = req.body;
      let params = req.params;

      let property = new Property(body);
      property.company_id = company.id;

      let address = new Address(body.Address);
      await address.findOrSave(connection);
      property.address_id = address.id;
      property.Address = address;

      await property.verifyUnique(connection);
      await property.save(connection);

      //Giving the property access to the user creating it by default
      if (res?.locals?.contact?.id) {
        contact = new Contact({ id: res.locals.contact.id });
        await contact.find(connection);
        await contact.getRole(connection, company.id);
        await contact.savePropertyAccess(connection, property.id);
      }

      await connection.commitAsync();

      utils.send_response(res, {
        status: 200,
        data: {
          property_id: Hashes.encode(property.id, res.locals.company_id)
        },

      });

      eventEmitter.emit('property_created', { company, contact, property, cid: res.locals.company_id, locals: res.locals });


    } catch (err) {
      await connection.rollbackAsync();
      next(err);
    }



  });


  router.put('/:property_id', [control.hasAccess(['admin']), control.hasPermission('manage_facility_info'), joiValidator.body(Schema.updateProperty), Hash.unHash], async (req, res, next) => {


    var connection = res.locals.connection;
    try {

      let contact = res.locals.contact
      let company = res.locals.active;

      let body = req.body;
      let params = req.params;

      let property = new Property({ id: params.property_id });
      await property.find(connection);
      await property.verifyAccess({connection, company_id: company.id, properties: res.locals.properties, contact_id: contact.id, permissions: ['manage_facility_info']});
      await property.getPhones(connection);
      await property.getEmails(connection);

      if (body.Address) {
        let address = new Address(body.Address);
        await address.findOrSave(connection);
        body.address_id = address.id;
      }

      property.update(body);
      await property.verifyUnique(connection);
      await property.save(connection);

      utils.send_response(res, {
        status: 200,
        data: {
          property_id: Hashes.encode(property.id, res.locals.company_id)
        },

      });

      eventEmitter.emit('property_updated', { company, contact, property, cid: res.locals.company_id, locals: res.locals });



    } catch (err) {
      next(err);
    }



  });

  router.get('/:property_id/images', [control.hasAccess(['admin']), Hash.unHash], async (req, res, next) => {

    try {

      var connection = res.locals.connection;

      let company = res.locals.active;
      let params = req.params;

      let property = new Property({ id: params.property_id });
      await property.find(connection);
      await property.verifyAccess({company_id: company.id, properties: res.locals.properties});
      await property.getImages(connection);


      utils.send_response(res, {
        status: 200,
        data: {
          images: Hash.obscure(property.Images, req)
        }
      });

    } catch (err) {
      next(err);
    }


  });

  router.get('/:property_id/units/list', [control.hasAccess(['admin', 'api']), Hash.unHash], async (req, res, next) => {

    var connection = res.locals.connection;

    try {
      let api = res.locals.api;
      let contact = res.locals.contact;
      let company = res.locals.active;

      let params = req.params;
      let query = req.query;

      let limit = parseInt(query.limit) || 20;
      if (limit > 100) limit = 100;
      if (limit == -1) limit = null;

      var offset = parseInt(query.offset) || 0;

      let property = new Property({ id: params.property_id });
      await property.find(connection);
      await property.verifyAccess({company_id: company.id, properties: res.locals.properties});
      await property.getUnits(connection, api, { limit: limit, offset: offset, order: 'units.number ASC' });

      var paging = {
        total: property.unitCount,
        count: property.Units.length
      };

      if (limit >= 0) {
        paging.next = settings.config.protocol + "://" + req.headers.host + req.baseUrl.toLowerCase() + '/' + Hashes.encode(property.id, res.locals.company_id) + '/units?limit=' + limit + '&offset=' + (offset + limit);
        paging.prev = settings.config.protocol + "://" + req.headers.host + req.baseUrl.toLowerCase() + '/' + Hashes.encode(property.id, res.locals.company_id) + '/units?limit=' + limit + '&offset=' + ((offset - limit) > 0 ? offset - limit : 0);
      }

      utils.send_response(res, {
        status: 200,
        data: {
          units: Hash.obscure(property.Units, req),
          paging: paging
        }
      });


    } catch (err) {
      next(err);
    }



  });


  router.get('/:property_id/units/bulk', [control.hasAccess(['admin', 'api']), Hash.unHash], async (req, res, next) => {

    var connection = res.locals.connection;

    try {
      let api = res.locals.api;
      let contact = res.locals.contact;
      let company = res.locals.active;

      let params = req.params;
      let query = req.query;

      let conditions = {
        company_id: (company && company.id) || null,
        property_id: params.property_id || null,
        limit: query.limit || null,
        offset: query.offset || null,
      }

      let units = await Unit.findAll(connection, conditions);

      console.log("Units Count: ", units.length);

      utils.send_response(res, {
        status: 200,
        data: {
          units: Hash.obscure(units, req),
        }
      });

    } catch (err) {
      next(err);
    }

  });

  router.get('/:property_id/insurances', [control.hasAccess(['admin', 'api']), Hash.unHash], async (req, res, next) => {
    var connection = res.locals.connection;

    try {
      let company = res.locals.active;
      let query = req.query;
      let params = req.params;

      let filterParams = {
        unit_type: query.unit_type
      }

      let property = new Property({ id: params.property_id });
      await property.find(connection);
      await property.getInsurances(connection, company.id, filterParams);

      utils.send_response(res, {
        status: 200,
        data: {
          insurances: Hash.obscure(property.Insurances, req)
        }
      });
    } catch (err) {
      next(err);
    }


  });

  router.get('/:property_id/units', [control.hasAccess(['admin', 'api']), Hash.unHash], async (req, res, next) => {
    
    try {
      
      res.locals.connection = await db.exchangeForReadAccess(res.locals.connection);
      var connection = res.locals.connection;
      
      let api = res.locals.api;
      let contact = res.locals.contact;
      let company = res.locals.active;

      let params = req.params;
      let query = req.query;
      let defaultLimit = query.concise ? { limit: 200 } : {}
      let isConcise = !!query.concise;
      let { limit, offset } = { ...utils.cleanQueryParams(query, defaultLimit, isConcise) };
      let property = new Property({ id: params.property_id });
      await property.find(connection);
      await property.verifyAccess({company_id: company.id, properties: res.locals.properties});
      if (query.concise) {
        let totalUnits = await models.Unit.find(connection, {
          ...params,
          conditions: {
            property_id: params.property_id
          }
        }, true)
        property.unitCount = totalUnits
        let units = await property.getConcisePropertyUnits(connection, {
          limit: limit,
          offset: offset,
          order: 'u.number ASC',
          grouping_profile_id: query.grouping_profile_id
        })
        for (let unit of units) {
          let amenities = {}
          let unitAmenities = unit.Amenities || []
          for (let amenity of unitAmenities) {
            if (amenity.id) {
              let key = amenity.category_name ?? 'No Category'
              amenities[key] = amenities[key] || []
              amenities[key].push(amenity)
            }
          }
          unit['Amenities'] = amenities
        }
        property.Units = units
      } else {
        await property.getUnits(connection, api, { limit: limit, offset: offset, order: 'units.number ASC', grouping_profile_id: query.grouping_profile_id, skipAmenities: true});
        for (let i = 0; i < property.Units.length; i++) {
          await property.Units[i].setSpaceMixId(connection);
          await property.Units[i].getAmenities(connection);
          if (property.Units[i].Lease) {
            await property.Units[i].Lease.getRentRaiseDetails(connection, "future")
            await property.Units[i].Lease.getTransferStatus(connection)
            await property.Units[i].Lease.getPastRentRaise(connection)
            await property.Units[i].Lease.getActiveRent(connection)
          }

        }
      }

      let paging = utils.generatePagingObject(req, { limit, offset }, property.unitCount, property.Units.length, isConcise);

      utils.send_response(res, {
        status: 200,
        data: {
          units: Hash.obscure(property.Units, req),
          paging: paging
        }
      });


    } catch (err) {
      next(err);
    }


  });

  router.get('/:property_id/units/featured', [control.hasAccess(['admin', 'api']), Hash.unHash], async (req, res, next) => {

    var connection = res.locals.connection;
    try {

      let api = res.locals.api;
      let contact = res.locals.contact;
      let company = res.locals.active;
      let params = req.params;
      let query = req.query;

      let limit = parseInt(query.limit) || 20;
      if (limit > 100) limit = 100;
      if (limit == -1) limit = null;

      var offset = parseInt(query.offset) || 0;

      let property = new Property({ id: params.property_id });
      await property.find(connection);
      await property.verifyAccess({company_id: company.id, properties: res.locals.properties});
      await property.getUnits(connection, api, { conditions: { featured: 1 }, limit: limit, offset: offset, order: 'units.number ASC' });

      for (let i = 0; i < property.Units.length; i++) {
        await property.Units[i].getCurrentLease(connection);
        await property.Units[i].getNextLeaseStart(connection);
        if (property.Units[i].Lease) {
          await property.Units[i].Lease.getTenants(connection)
        }
      }

      var paging = {
        total: property.unitCount,
        count: property.Units.length
      };

      if (limit >= 0) {
        paging.next = settings.config.protocol + "://" + req.headers.host + req.baseUrl.toLowerCase() + '/' + Hashes.encode(property.id, res.locals.company_id) + '/units/featured?limit=' + limit + '&offset=' + (offset + limit);
        paging.prev = settings.config.protocol + "://" + req.headers.host + req.baseUrl.toLowerCase() + '/' + Hashes.encode(property.id, res.locals.company_id) + '/units/featured?limit=' + limit + '&offset=' + ((offset - limit) > 0 ? offset - limit : 0);
      }
      utils.send_response(res, {
        status: 200,
        data: {
          units: Hash.obscure(property.Units, req),
          paging: paging
        }
      });


    } catch (err) {
      next(err);
    }


  });

  router.get('/:property_id/units/available', [control.hasAccess(['admin', 'api']), Hash.unHash], async (req, res, next) => {

    var connection = res.locals.connection;
    try {

      let api = res.locals.api;
      let contact = res.locals.contact;
      let company = res.locals.active;
      let params = req.params;
      let query = req.query;

      let limit = parseInt(query.limit) || 20;
      if (limit > 100) limit = 100;
      if (limit == -1) limit = null;

      let offset = parseInt(query.offset) || 0;

      let conditions = {
        end_date: query.end_date,
        start_date: query.start_date,
      }

      let property = new Property({ id: params.property_id });
      await property.find(connection);
      await property.verifyAccess({company_id: company.id, properties: res.locals.properties});
      await property.getAvailableUnits(connection, api, conditions, { limit: limit, offset: offset });

      var paging = {
        total: property.unitCount,
        count: property.Units.length
      };

      if (limit >= 0) {
        paging.next = settings.config.protocol + "://" + req.headers.host + req.baseUrl.toLowerCase() + '/' + Hashes.encode(property.id, res.locals.company_id) + '/units/available?limit=' + limit + '&offset=' + (offset + limit);
        paging.prev = settings.config.protocol + "://" + req.headers.host + req.baseUrl.toLowerCase() + '/' + Hashes.encode(property.id, res.locals.company_id) + '/units/available?limit=' + limit + '&offset=' + ((offset - limit) > 0 ? offset - limit : 0);
      }

      utils.send_response(res, {
        status: 200,
        data: {
          units: Hash.obscure(property.Units, req),
          paging: paging
        }
      });


    } catch (err) {
      next(err);
    }


  });

  router.get('/:property_id/categories', [control.hasAccess(['admin', 'api']), Hash.unHash], async (req, res, next) => {

    var connection = res.locals.connection;
    try {

      let api = res.locals.api;
      let contact = res.locals.contact;
      let company = res.locals.active;
      let params = req.params;

      let property = new Property({ id: params.property_id });
      await property.find(connection);
      await property.verifyAccess({company_id: company.id, properties: res.locals.properties});

      let categories = await Category.getCategoryDetails(connection, company.id, { properties: params.property_id && [params.property_id] });

      utils.send_response(res, {
        status: 200,
        data: {
          categories: Hash.obscure(categories, req)
        }
      });


    } catch (err) {
      next(err);
    }


  });

  router.get('/:property_id/space-types', [control.hasAccess(['admin', 'api']), Hash.unHash], async (req, res, next) => {


    var connection = res.locals.connection;
    try {

      let api = res.locals.api;
      let contact = res.locals.contact;
      let company = res.locals.active;
      let params = req.params;

      let property = new Property({ id: params.property_id });
      await property.find(connection);
      await property.verifyAccess({company_id: company.id, properties: res.locals.properties});

      let space_types = await property.getUnitTypes(connection);

      utils.send_response(res, {
        status: 200,
        data: {
          space_types: Hash.obscure(space_types, req)
        }
      });


    } catch (err) {
      next(err);
    }


  });

  router.get('/:property_id/products', [control.hasAccess(['admin', 'api']), Hash.unHash], async (req, res, next) => {

    var connection = res.locals.connection;
    try {

      let api = res.locals.api;
      let contact = res.locals.contact;
      let company = res.locals.active;
      let params = req.params;
      let query = req.query;
      let property = new Property({ id: params.property_id });
      await property.find(connection);
      await property.verifyAccess({company_id: company.id, properties: res.locals.properties});
      await property.getProducts(connection, null, query.search, query.type, query.category_type || null);

      let res_data = (query.category_type === "service" ? property.Products.filter(item => item.amount_type !== 'scheduled') : property.Products);

      utils.send_response(res, {
        status: 200,
        data: {
          products: Hash.obscure(res_data, req)
        }
      });


    } catch (err) {
      next(err);
    }


  });

  router.put('/:property_id/products/:product_id', [control.hasAccess(['admin']), joiValidator.body(Schema.createProduct), Hash.unHash], async (req, res, next) => {


    var connection = res.locals.connection;
    try {

      let api = res.locals.api;
      let contact = res.locals.contact;
      let company = res.locals.active;
      let params = req.params;
      let body = req.body;

      let property = new Property({ id: params.property_id });
      await property.find(connection);
      await property.verifyAccess({company_id: company.id, properties: res.locals.properties});

      let product = new Product({ id: params.product_id });
      await product.find(connection);
      await product.verifyAccess(company.id);
      await property.setProductOverride(connection, params.product_id, body);
      if (body.Rules && body.Rules.length) await product.updateRules(connection, body.Rules, property.id);

      utils.send_response(res, {
        status: 200,
        data: {
          products: Hash.obscure(property.Products, req)
        }
      });

      eventEmitter.emit('property_product_price_updated', { company, contact, property, product, cid: res.locals.company_id, locals: res.locals });


    } catch (err) {
      next(err);
    }


  });

  router.delete('/:property_id/products/:product_id', [control.hasAccess(['admin']), Hash.unHash], async (req, res, next) => {

    var connection = res.locals.connection;
    try {

      let contact = res.locals.contact;
      let company = res.locals.active;
      let params = req.params;
      let body = req.body;

      let property = new Property({ id: params.property_id });
      await property.find(connection);
      await property.verifyAccess({company_id: company.id, properties: res.locals.properties});

      let product = new Product({ id: params.product_id });
      await product.find(connection);
      await product.verifyAccess(company.id);
      await product.deleteProperty(connection, null, property.id);
      await product.updateRules(connection, [], property.id);

      utils.send_response(res, {
        status: 200,
        data: {
        }
      });


    } catch (err) {
      next(err);
    }


  });

  router.get('/:property_id/connections', [control.hasAccess('admin'), Hash.unHash], async (req, res, next) => {


    var connection = res.locals.connection;
    try {

      let api = res.locals.api;
      let contact = res.locals.contact;
      let company = res.locals.active;
      let params = req.params;
      let type = req.query.type || null;

      let property = new Property({ id: params.property_id });
      await property.find(connection);
      await property.verifyAccess({company_id: company.id, properties: res.locals.properties});

      await property.getConnections(connection, type);

      utils.send_response(res, {
        status: 200,
        data: {
          connections: Hash.obscure(property.Connections, req)
        }
      });




    } catch (err) {
      next(err);
    }


  });

  router.get('/:property_id/connections/address', [control.hasAccess('admin'), Hash.unHash], async (req, res, next) => {

    var connection = res.locals.connection;
    try {
      let api = res.locals.api;
      let contact = res.locals.contact;
      let company = res.locals.active;
      let params = req.params;
      let type = req.query.type || null;
      let cardDevices = [];

      let property = new Property({ id: params.property_id });
      await property.find(connection);
      await property.verifyAccess({ company_id: company.id, properties: res.locals.properties });

      await property.getConnections(connection, type);
      if (Array.isArray(property.Connections)) {
        // Filter connections with type=card and get device information
        const cardConnections = property.Connections.filter(connection => connection.type === "card");

        // Extract device information for each card connection
        cardDevices = cardConnections.map(connection => connection.Devices && connection.Devices[0]);
        console.log("cardDevices :: ", cardDevices[0]);

      }
      utils.send_response(res, {
        status: 200,
        data: {
          IPaddress: cardDevices && cardDevices[0] && cardDevices[0].ip && cardDevices[0].port ? Hash.obscure(cardDevices[0].ip + ':' + cardDevices[0].port, req) : null,
          lan: cardDevices && cardDevices[0] && cardDevices[0].lan ? Hash.obscure(cardDevices[0].lan, req) : 0
        }
      });
    } catch (err) {
      next(err);
    }


  });

  router.post('/:property_id/connections', [control.hasAccess(['admin']), control.hasPermission('manage_payment_gateways'), joiValidator.body(Schema.propertyConnection), Hash.unHash], async (req, res, next) => {
    var connection = res.locals.connection;
    try {

      let api = res.locals.api;
      let contact = res.locals.contact;
      let company = res.locals.active;

      let params = req.params;
      let body = req.body;
      body.created_by = contact.id

      let property = new Property({ id: params.property_id });
      await property.find(connection);
      await property.verifyAccess({connection, company_id: company.id, properties: res.locals.properties, contact_id: contact.id, permissions: ['manage_payment_gateways']});




      let payment_connection = new Connection(body);
      payment_connection.property_id = params.property_id;
      await payment_connection.save(connection);


      utils.send_response(res, {
        status: 200,
        data: {
          connection_id: Hashes.encode(payment_connection.id, res.locals.company_id)
        }
      });

      eventEmitter.emit('property_connection_created', { company, contact, property, payment_connection, cid: res.locals.company_id, locals: res.locals });

    } catch (err) {
      next(err);
    }
  });

  router.post('/:property_id/connections/:connection_id/devices/:device_id/validate', [control.hasAccess(['admin', 'api']), control.hasPermission('manage_payment_gateways'), Hash.unHash], async (req, res, next) => {
    var connection = res.locals.connection;

    try {

      let contact = res.locals.contact;
      let company = res.locals.active;
      let api = res.locals.api;

      let params = req.params;
      let query = req.query;


      let property = new Property({ id: params.property_id });
      await property.find(connection);
      await property.verifyAccess({connection, company_id: company.id, properties: res.locals.properties, contact_id: contact? contact.id : null, permissions: ['manage_payment_gateways'], api});

      let payment_connection = new Connection({ id: params.connection_id });
      await payment_connection.find(connection);
      await payment_connection.verifyAccess(params.property_id);

      // get IP address in case the IP address has changed. 
      let ip_address = query.fallback_ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress;
      ip_address = ip_address.replace("::ffff:", "");

      let paymentMethod = await property.getPaymentMethod(connection, 'card', null, params.device_id);
      let conn = property.Connections[0];
      try {
        await conn.checkDeviceHeartBeat(connection, paymentMethod, params.device_id, ip_address);

      } catch (err) {
        console.log("err", err);
        e.th(406, "Could not connect to credit card reader.")
      }


      utils.send_response(res, {
        status: 200,
        data: {

        }
      });

    } catch (err) {
      next(err);
    }
  });

  router.put('/:property_id/connections/:connection_id', [control.hasAccess(['admin']), control.hasPermission('manage_payment_gateways'), joiValidator.body(Schema.propertyConnection), Hash.unHash], async (req, res, next) => {

    var connection = res.locals.connection;
    try {

      let api = res.locals.api;
      let contact = res.locals.contact;
      let company = res.locals.active;

      let params = req.params;
      let body = req.body;
      body.modified_by = contact.id

      let property = new Property({ id: params.property_id });
      await property.find(connection);
      await property.verifyAccess({connection, company_id: company.id, properties: res.locals.properties, contact_id: contact.id, permissions: ['manage_payment_gateways']});
      let payment_connection = new Connection({ id: params.connection_id });
      await payment_connection.find(connection);
      await payment_connection.verifyAccess(params.property_id);
      await payment_connection.update(body);
      await payment_connection.save(connection);


      utils.send_response(res, {
        status: 200,
        data: {
          connection_id: Hashes.encode(payment_connection.id, res.locals.company_id)
        }
      });

      eventEmitter.emit('property_connection_updated', { company, contact, property, payment_connection, cid: res.locals.company_id, locals: res.locals });

    } catch (err) {
      next(err);
    }


  });

  router.delete('/:property_id/connections/:connection_id', [control.hasAccess(['admin']), control.hasPermission('manage_payment_gateways'), Hash.unHash], async (req, res, next) => {

    var connection = res.locals.connection;
    try {

      let api = res.locals.api;
      let contact = res.locals.contact;
      let company = res.locals.active;
      let params = req.params;


      let property = new Property({ id: params.property_id });
      await property.find(connection);
      await property.verifyAccess({connection, company_id: company.id, properties: res.locals.properties, contact_id: contact.id, permissions: ['manage_payment_gateways']});

      let payment_connection = new Connection({ id: params.connection_id });
      await payment_connection.find(connection);
      await payment_connection.verifyAccess(params.property_id);
      await connection.beginTransactionAsync();
      await payment_connection.savePreviousConnection(connection, contact.id);
      await payment_connection.deleteConnection(connection);
      await connection.commitAsync();

      utils.send_response(res, {
        status: 200,
        data: {}
      });

      eventEmitter.emit('property_connection_deleted', { company, contact, property, payment_connection, cid: res.locals.company_id, locals: res.locals });

    } catch (err) {
      await connection.rollbackAsync();
      next(err);
    }


  });

  router.get('/:property_id', [control.hasAccess(['admin', 'api', 'tenant']), Hash.unHash], async (req, res, next) => {

    var connection = res.locals.connection;
    try {

      let api = res.locals.api;
      let contact = res.locals.contact;
      let company = res.locals.active;
      let params = req.params;

      let property = new Property({ id: params.property_id });
      await property.find(connection);
      await property.verifyAccess({company_id: company.id, properties: res.locals.properties});
      await property.getImages(connection);
      await property.getPhones(connection);
      await property.getEmails(connection);
      await property.getAddress(connection);
      await property.getUnitCount(connection);
      await property.getLeaseCount(connection);

      utils.send_response(res, {
        status: 200,
        data: {
          property: Hash.obscure(property, req)
        }
      });


    } catch (err) {
      next(err);
    }


  });

  /***** HOURS ****/

  router.get('/:property_id/hours', [control.hasAccess(['admin', 'api']), Hash.unHash], async (req, res, next) => {


    var connection = res.locals.connection;
    try {

      let api = res.locals.api;
      let contact = res.locals.contact;
      let company = res.locals.active;
      let params = req.params;


      let property = new Property({ id: params.property_id });
      await property.find(connection);
      await property.verifyAccess({company_id: company.id, properties: res.locals.properties});
      await property.getHours(connection);


      utils.send_response(res, {
        status: 200,
        data: {
          hours: Hash.obscure(property.Hours, req)
        }
      });


    } catch (err) {
      next(err);
    }


  });

  router.post('/:property_id/hours', [control.hasAccess(['admin']), joiValidator.body(Schema.createPropertyHours), control.hasPermission('manage_facility_info'), Hash.unHash], async (req, res, next) => {

    var connection = res.locals.connection;
    try {

      let api = res.locals.api;
      let contact = res.locals.contact;
      let company = res.locals.active;
      let params = req.params;
      let body = req.body;


      let property = new Property({ id: params.property_id });
      await property.find(connection);
      await property.verifyAccess({connection, company_id: company.id, properties: res.locals.properties, contact_id: contact.id, permissions: ['manage_facility_info']});

      let hours = await property.saveHours(connection, body);

      utils.send_response(res, {
        status: 200,
        data: {
          hours: Hash.obscure(hours, req)
        }
      });
      eventEmitter.emit('property_hours_created', { company, contact, property, hours, cid: res.locals.company_id, locals: res.locals });

    } catch (err) {
      next(err);
    }


  });

  /** t **/
  router.put('/:property_id/hours/:hours_id', [control.hasAccess(['admin']), joiValidator.body(Schema.updatePropertyHours), control.hasPermission('manage_facility_info'), Hash.unHash], async (req, res, next) => {

    var connection = res.locals.connection;
    try {

      let api = res.locals.api;
      let contact = res.locals.contact;
      let company = res.locals.active;
      let params = req.params;
      let body = req.body;


      let property = new Property({ id: params.property_id });
      await property.find(connection);
      await property.verifyAccess({connection, company_id: company.id, properties: res.locals.properties, contact_id: contact.id, permissions: ['manage_facility_info']});

      let hours = await property.getHours(connection, params.hours_id);

      if (!hours) e.th(404);

      hours = property.updateHours(hours, body);
      await property.saveHours(connection, hours);

      utils.send_response(res, {
        status: 200,
        data: Hash.obscure({
          hours_id: req.params.hours_id,
          property_id: req.params.property_id
        }, req)
      });
      eventEmitter.emit('property_hours_updated', { company, contact, property, hours, cid: res.locals.company_id, locals: res.locals });

    } catch (err) {
      next(err);
    }


  });

  router.delete('/:property_id/hours/:hours_id', [control.hasAccess(['admin']), control.hasPermission('manage_facility_info'), Hash.unHash], async (req, res, next) => {

    var connection = res.locals.connection;
    try {

      let api = res.locals.api;
      let contact = res.locals.contact;
      let company = res.locals.active;
      let params = req.params;


      let property = new Property({ id: params.property_id });
      await property.find(connection);
      await property.verifyAccess({connection, company_id: company.id, properties: res.locals.properties, contact_id: contact.id, permissions: ['manage_facility_info']});


      let hours = await property.getHours(connection, params.hours_id);

      if (!hours) e.th(404);

      await property.deleteHours(connection, hours.id)


      utils.send_response(res, {
        status: 200,
        data: {
        }
      });
      eventEmitter.emit('property_hours_deleted', { company, contact, property, hours, cid: res.locals.company_id, locals: res.locals });

    } catch (err) {
      next(err);
    }


  });

  router.post('/:property_id/email', [control.hasAccess(['admin']), joiValidator.body(Schema.createEmail), control.hasPermission('manage_facility_info'), Hash.unHash], async (req, res, next) => {
    var connection = res.locals.connection;
    try {
      let contact = res.locals.contact;
      let company = res.locals.active;
      let params = req.params;
      let body = req.body;


      let property = new Property({ id: params.property_id });
      await property.find(connection);
      await property.verifyAccess({connection, company_id: company.id, properties: res.locals.properties, contact_id: contact.id, permissions: ['manage_facility_info']});

      await property.getEmails(connection);

      let email = await property.saveEmail(connection, body);

      utils.send_response(res, {
        status: 200,
        data: {
          email: Hash.obscure(email, req)
        }
      });

      eventEmitter.emit('property_email_created', { company, contact, property, email, cid: res.locals.company_id, locals: res.locals });

    } catch (err) {
      next(err);
    }



  });

  router.post('/:property_id/phone', [control.hasAccess(['admin']), joiValidator.body(Schema.createPhone), control.hasPermission('manage_facility_info'), Hash.unHash], async (req, res, next) => {


    var connection = res.locals.connection;
    try {


      let contact = res.locals.contact;
      let company = res.locals.active;
      let params = req.params;
      let body = req.body;


      let property = new Property({ id: params.property_id });
      await property.find(connection);
      await property.verifyAccess({connection, company_id: company.id, properties: res.locals.properties, contact_id: contact.id, permissions: ['manage_facility_info']});
      await property.getPhones(connection);

      let phone = await property.savePhone(connection, body);

      utils.send_response(res, {
        status: 200,
        data: {
          phone: Hash.obscure(phone, req)
        }
      });

      eventEmitter.emit('property_phone_created', { company, contact, property, phone, cid: res.locals.company_id, locals: res.locals });

    } catch (err) {
      next(err);
    }


  });

  router.delete('/:property_id/email/:email_id', [control.hasAccess(['admin']), control.hasPermission('manage_facility_info'), Hash.unHash], async (req, res, next) => {

    var connection = res.locals.connection;
    try {

      let contact = res.locals.contact;
      let company = res.locals.active;
      let params = req.params;
      let body = req.body;

      let property = new Property({ id: params.property_id });
      await property.find(connection);
      await property.verifyAccess({connection, company_id: company.id, properties: res.locals.properties, contact_id: contact.id, permissions: ['manage_facility_info']});
      await property.getEmails(connection);

      let email = await property.deleteEmail(connection, params.email_id);

      utils.send_response(res, {
        status: 200,
        data: {}
      });

      eventEmitter.emit('property_email_deleted', { company, contact, property, email, cid: res.locals.company_id, locals: res.locals });

    } catch (err) {
      next(err);
    }


  });

  router.delete('/:property_id/phone/:phone_id', [control.hasAccess(['admin']), control.hasPermission('manage_facility_info'), Hash.unHash], async (req, res, next) => {


    var connection = res.locals.connection;
    try {

      let contact = res.locals.contact;
      let company = res.locals.active;
      let params = req.params;
      let body = req.body;

      let property = new Property({ id: params.property_id });
      await property.find(connection);
      await property.verifyAccess({connection, company_id: company.id, properties: res.locals.properties, contact_id: contact.id, permissions: ['manage_facility_info']});
      await property.getPhones(connection);

      let phone = await property.deletePhone(connection, params.phone_id);

      utils.send_response(res, {
        status: 200,
        data: {}
      });

      eventEmitter.emit('property_phone_deleted', { company, contact, property, phone, cid: res.locals.company_id, locals: res.locals });

    } catch (err) {
      next(err);
    }


  });

  /*** ACCESS CONTROL ***/

  router.get('/:property_id/generate-access-code', [control.hasAccess(['admin', 'tenant', 'api']), Hash.unHash], async (req, res, next) => {

    var connection = res.locals.connection;
    try {

      let contact = res.locals.contact;
      let company = res.locals.active;
      let params = req.params;

      let property = new Property({ id: params.property_id });
      await property.find(connection);
      await property.verifyAccess({company_id: company.id, properties: res.locals.properties});
      await property.getAccessControl(connection, contact.id);

      let code = await property.Access.generateCode();

      utils.send_response(res, {
        status: 200,
        data: {
          access_type: property.Access.name,
          code: code
        }
      });


    } catch (err) {
      next(err);
    }


  });

  router.post('/:property_id/validate-access-code', [control.hasAccess(['admin', 'tenant', 'api']), Hash.unHash], async (req, res, next) => {

    var connection = res.locals.connection;
    try {

      let contact = res.locals.contact;
      let company = res.locals.active;
      let params = req.params;

      let property = new Property({ id: params.property_id });
      await property.find(connection);
      await property.verifyAccess({company_id: company.id, properties: res.locals.properties});
      await property.getAccessControl(connection, contact.id);

      let code = await property.Access.validateCode(req.body.code);

      utils.send_response(res, {
        status: 200,
        data: {
          access_type: property.Access.name
        }
      });


    } catch (err) {
      next(err);
    }


  });

  router.get('/:property_id/generate-space-code', [control.hasAccess(['admin', 'tenant', 'api']), Hash.unHash], async (req, res, next) => {

    var connection = res.locals.connection;
    try {

      let contact = res.locals.contact;
      let company = res.locals.active;
      let params = req.params;
      let query = req.query;

      let property = new Property({ id: params.property_id });
      await property.find(connection);
      await property.verifyAccess({company_id: company.id, properties: res.locals.properties});
      await property.getAccessControl(connection, contact?.id);

      let unit = new Unit({
        id: query.unit_id
      })
      await unit.find(connection);

      let code = await property.Access.generateSpaceCode(unit.number, unit.id);

      utils.send_response(res, {
        status: 200,
        data: {
          access_type: property.Access.name,
          code: code
        }
      });


    } catch (err) {
      next(err);
    }


  });

  router.post('/:property_id/validate-space-access-code', [control.hasAccess(['admin', 'tenant', 'api']), Hash.unHash], async (req, res, next) => {

    var connection = res.locals.connection;
    try {

      let contact = res.locals.contact;
      let company = res.locals.active;
      let params = req.params;

      let property = new Property({ id: params.property_id });
      await property.find(connection);
      await property.verifyAccess({company_id: company.id, properties: res.locals.properties});
      await property.getAccessControl(connection, contact?.id);

      let unit = new Unit({
        id: req.body.unit_id
      })
      await unit.find(connection);

      let code = await property.Access.validateSpaceCode(req.body.code, unit.number, unit.id);

      utils.send_response(res, {
        status: 200,
        data: {
          code
        }
      });


    } catch (err) {
      next(err);
    }


  });

  /* Todo refactor to use async/await */
  router.get('/:property_id/access/', [control.hasAccess(['admin', 'api']), Hash.unHash], function (req, res, next) {
    var connection = res.locals.connection;
    var contact = res.locals.contact;
    var company = res.locals.active;
    var property = {};
    var params = req.params;


    property = new Property({ id: params.property_id });
    return property.find(connection)
      .then(() => property.verifyAccess({company_id: company.id, properties: res.locals.properties}))
      .then(() => property.getAccessControl(connection, contact.id))
      .then(() => {

        console.log("property.Access", property.Access);
        utils.send_response(res, {
          status: 200,
          data: {
            access: property.Access.access_id ? Hash.obscure(property.Access.display(), req) : {},
            property_access_id: Hashes.encode(property.Access.access_id, res.locals.company_id),
            property_access_name: property.Access.access_name
          },
        });
      })
      .catch(next)

  });

  router.delete('/:property_id/access/', [control.hasAccess(['admin']), control.hasPermission('manage_gates'), Hash.unHash], async (req, res, next) => {

    var connection = res.locals.connection;
    try {

      let contact = res.locals.contact;
      let company = res.locals.active;
      let params = req.params;

      let property = new Property({ id: params.property_id });
      await property.find(connection);
      await property.verifyAccess({connection, company_id: company.id, properties: res.locals.properties, contact_id: contact.id, permissions: ['manage_gates']});
      await property.getAccessControl(connection, contact.id);
      await property.deleteAccess(connection, contact.id);


      utils.send_response(res, {
        status: 200,
        data: {}
      });


      eventEmitter.emit('property_access_deleted', { company, contact, property, access: property.Access, cid: res.locals.company_id, locals: res.locals });
    } catch (err) {
      next(err);
    }


  });

  router.get('/:property_id/access/:type', [control.hasAccess(['admin']), Hash.unHash], function (req, res, next) {
    var connection = res.locals.connection;
    var contact = res.locals.contact;
    var company = res.locals.active;
    var templates = [];
    var params = req.params;
    var property = new Property({ id: params.property_id });

    return property.find(connection)
      .then(() => property.verifyAccess({company_id: company.id, properties: res.locals.properties}))
      .then(function () {
        return property.getAccessControl(connection, contact.id);
      }).then(function () {
        utils.send_response(res, {
          status: 200,
          data: {
            access: Hash.obscure(property.Access, req)
          },
        });
      })

      .catch(next)

  });

  /** Depricated **/
  router.post('/search', [control.hasAccess(['admin', 'api']), Hash.unHash], async (req, res, next) => {
    var connection = res.locals.connection;
    try {

      let contact = res.locals.contact;
      let company = res.locals.active;
      let params = req.params;
      let search = '';
      let properties = [];
      if (!req.body.search) {
        search = '';
      } else {
        search = req.body.search.toLowerCase().replace(',', '') || '';
      }

      let property_list = await models.Property.searchByAddress(connection, search, company.id);

      for (let i = 0; i < property_list.length; i++) {
        let property = new Property({ id: params.property_id });
        await property.find(connection);
        await property.getAddress(connection);
        await property.getUnitCount(connection);
        await property.getLeaseCount(connection);

        properties.push(property);

      }

      utils.send_response(res, {
        status: 200,
        data: {
          properties: Hash.obscure(properties, req),
          pagination: {
            num_results: properties.length
          }
        }
      });

    } catch (err) {
      next(err);
    }

  });

  /** Depricated **/
  // router.get('/findById/:property_id', control.hasAccess(['admin', 'api']), function(req, res, next) {
  //
  //     var property = {};
  //
  //     var property_id = Hashes.decode(req.params.property_id)[0];
  //     var company_id = res.locals.active.id;
  //
  //     var connection;
  //     pool.getConnectionAsync().then(function(conn) {
  //         connection = conn;
  //
  //         property = new Property({id:property_id, company_id: company_id });
  //         return property.find(connection);
  //
  //     }).then(propertyRes =>{
  //
  //         utils.send_response(res, {
  //             status: 200,
  //             data: Hash.obscure(property)
  //
  //         })
  //     })
  //     .then(() => utils.saveTiming(connection, req, res.locals))
  //     .catch(next)
  //     .finally(() => utils.closeConnection(pool, connection))
  // });

  /* Supported Columns
  *
  *  number, category, floor,type, description, price, available_date
  *
  *
  *
  * */
  /** Depricated **/
  router.post('/:property_id/upload-units', [control.hasAccess(['admin']), Hash.unHash], async (req, res, next) => {

    var connection = res.locals.connection;
    try {

      let contact = res.locals.contact;
      let company = res.locals.active;
      let params = req.params;

      let property = new Property({ id: params.property_id });
      await property.find(connection);
      await property.verifyAccess({company_id: company.id, properties: res.locals.properties});

      let invoice = {};

      if (!fs.existsSync(settings.config.base_path + req.files.file.path)) e.th("file not found")
      var workbook = XLSX.readFile(settings.config.base_path + req.files.file.path);

      let sheetName = workbook.Props.SheetNames[0];
      let data = [];
      let sheet = workbook.Sheets[sheetName];

      var sheet_json = XLSX.utils.sheet_to_json(sheet, { header: 1 });
      let imported_numbers = [];
      let header = sheet_json[0].map(e => e.toLowerCase());

      if (header.indexOf('number') < 0) {
        e.th(400, "Please include a number column");
      }

      if (header.indexOf('price') < 0) {
        e.th(400, "Please include a price column");
      }

      if (header.indexOf('type') < 0) {
        e.th(400, "Please include a type column that is either storage or residential");
      }

      if (header.indexOf('first_name') < 0) {
        e.th(400, "Please include a first name");
      }

      if (header.indexOf('price') < 0) {
        e.th(400, "Please include a price column");
      }

      if (header.indexOf('lease_start') < 0) {
        e.th(400, "Please include a lease_start column");
      }

      // get Product Ready
      let product = new Product({
        name: "Balance Forward"
      });

      try {
        await product.findByName(connection, company.id);

      } catch (err) {

        product.company_id = company.id;
        product.price = 0;
        product.status = 1;
        product.type = 'product';
        product.default_type = 'rent';
        product.taxable = 0;
        product.taxrate = 0;
        await product.save(connection);

      }





      for (let i = 1; i < sheet_json.length; i++) {
        if (!sheet_json[i].length) continue;
        let unit = new Unit();
        let lease = new Lease();
        let invoice = new Invoice();
        let category = {};
        let category_name = sheet_json[i][header.indexOf('category')];
        if (category_name) {
          category = new Category({
            name: sheet_json[i][header.indexOf('category')],
            company_id: company.id
          });
          await category.findOrSave(connection);
        }

        let available_date = header.indexOf('available_date') >= 0 && sheet_json[i][header.indexOf('available_date')] ? moment(sheet_json[i][header.indexOf('available_date')], 'M/DD/YY').format('YYYY-MM-DD') : null;
        let type = sheet_json[i][header.indexOf('type')];
        let description = sheet_json[i][header.indexOf('description')] || '';
        let floor = sheet_json[i][header.indexOf('floor')] || 1;
        let number = sheet_json[i][header.indexOf('number')];
        let status = sheet_json[i][header.indexOf('status')] || 1;
        let price = sheet_json[i][header.indexOf('price')] ? sheet_json[i][header.indexOf('price')].replace(/[^0-9.]/g, "") : null;
        let bill_day = sheet_json[i][header.indexOf('bill_day')];

        let start_date = sheet_json[i][header.indexOf('lease_start')];
        let security_deposit = sheet_json[i][header.indexOf('security_deposit')];
        let end_date = sheet_json[i][header.indexOf('end_date')];


        let first_name = sheet_json[i][header.indexOf('first_name')];
        let last_name = sheet_json[i][header.indexOf('last_name')];
        let email = sheet_json[i][header.indexOf('email')];
        let company_field = header.indexOf('company') && sheet_json[i][header.indexOf('company')];
        let dob = sheet_json[i][header.indexOf('dob')];
        let ssn = sheet_json[i][header.indexOf('ssn')];
        let driver_license = sheet_json[i][header.indexOf('driver_license')];
        let notes = sheet_json[i][header.indexOf('notes')];
        let home_phone = sheet_json[i][header.indexOf('home_phone')] ? sheet_json[i][header.indexOf('home_phone')].replace(/[^0-9]/g, "") : null;
        let cell_phone = sheet_json[i][header.indexOf('cell_phone')] ? sheet_json[i][header.indexOf('cell_phone')].replace(/[^0-9]/g, "") : null;
        let work_phone = sheet_json[i][header.indexOf('work_phone')] ? sheet_json[i][header.indexOf('work_phone')].replace(/[^0-9]/g, "") : null;
        let address = sheet_json[i][header.indexOf('address')];
        let address2 = sheet_json[i][header.indexOf('address2')];
        let city = sheet_json[i][header.indexOf('city')];
        let state = sheet_json[i][header.indexOf('state')];
        let zip = sheet_json[i][header.indexOf('zip')];
        let balance = sheet_json[i][header.indexOf('balance')] ? sheet_json[i][header.indexOf('balance')].replace(/[^0-9.]/g, "") : null;

        let alternate_first = sheet_json[i][header.indexOf('alternate_first')];
        let alternate_last = sheet_json[i][header.indexOf('alternate_last')];
        let alternate_email = sheet_json[i][header.indexOf('alternate_email')];
        let alternate_phone = sheet_json[i][header.indexOf('alternate_phone')];
        let alternate_phone_type = sheet_json[i][header.indexOf('alternate_phone_type')];



        if (!type) e.th(400, "Error on line " + (i + 1) + ': Please enter a unit type');
        if (!number) e.th(400, "Error on line " + (i + 1) + ': Please enter a number for this unit');
        // if(!last_name) e.th(400, "Error on line " + (i + 1) + ': No last name found.');
        // if(!first_name) e.th(400, "Error on line " + (i + 1) + ' (UNIT ' + unit.number + ') : No first name found.');
        // if(!start_date) e.th(400, "Error on line " + (i + 1) + ' (UNIT ' + unit.number + ') : No lease start date found.');
        if (!price) e.th(400, "Error on line " + (i + 1) + ' (UNIT ' + unit.number + ') : No price found.');


        unit.property_id = property.id;
        unit.address_id = property.address_id;

        unit.description = description;
        unit.available_date = available_date;
        unit.type = type.toLowerCase();
        unit.category_id = category.id || null;
        unit.floor = floor;
        unit.number = number;
        unit.active = 1;
        unit.status = status;
        unit.price = price.replace(/[^0-9.]/g, "");

        lease.rent = price.replace(/[^0-9.]/g, "");
        lease.security_deposit = security_deposit || null;
        lease.start_date = start_date ? moment(start_date, 'M/D/YY').format('YYYY-MM-DD') : null;
        lease.end_date = end_date || null;
        lease.bill_day = bill_day ? bill_day.replace(/[^0-9.]/, '') : null;
        lease.notes = notes;
        lease.status = 1;



        if (balance && balance > 0) {

          let nextBillDate = lease.getNextBillingDate(moment(), true);
          nextBillDate.subtract(1, 'month');
          invoice.date = nextBillDate.format('YYYY-MM-DD');
          invoice.due = nextBillDate.format('YYYY-MM-DD');
          invoice.period_start = nextBillDate.format('YYYY-MM-DD');
          invoice.period_end = nextBillDate.format('YYYY-MM-DD');
          invoice.company_id = company.id;
          let inline = new InvoiceLine({
            product_id: product.id,
            qty: 1,
            status: 1,
            type: 'manual',
            cost: balance,
            date: nextBillDate.format('YYYY-MM-DD'),
            start_date: nextBillDate.format('YYYY-MM-DD'),
            end_date: nextBillDate.format('YYYY-MM-DD')
          });
          inline.Product = product;
          inline.product_id = product.id;

          if (!inline.product_id) {
            e.th('test');
          }
          invoice.addLine(inline)
        }

        // create invoice line
        // save invoice;

        await property.getTemplates(connection, unit.type);

        lease.unit_id = unit.id;

        // let contact = new Contact({company_id: property.company_id});
        //
        // let cntct = {
        //   company_id: company.id,
        //   first: first_name,
        //   last: last_name,
        //   email: email || null,
        //   company: company_field || null,
        //   dob: dob || null,
        //   ssn: ssn || null,
        //   driver_license: driver_license || null,
        //   Phones: [],
        //   Addresses: [],
        //   Relationships: []
        // };
        // console.log(first_name)
        // console.log(last_name)
        // console.log(cntct)

        let cntct = {};
        let cInfo = {
          first: first_name,
          last: last_name,
          email: email,
          Phones: [home_phone, cell_phone, work_phone]
        }
        let found_contact = await Contact.checkExisting(connection, cInfo, company.id)

        if (found_contact) {

          cntct = new Contact(found_contact);

          await cntct.find(connection);
          await cntct.getPhones(connection);
          await cntct.getContactRelationships(connection);

          cntct.company = company_field ? company_field : cntct.company;
          cntct.email = email ? email : cntct.email;
          cntct.dob = dob ? dob : cntct.dob;
          cntct.ssn = ssn ? ssn : cntct.ssn;
          cntct.driver_license = driver_license ? driver_license : cntct.driver_license;

        } else {
          cntct = new Contact({
            company_id: company.id,
            first: first_name,
            last: last_name,
            email: email || null,
            company: company_field || null,
            dob: dob || null,
            ssn: ssn || null,
            driver_license: driver_license || null
          });
        }

        if (home_phone && home_phone.trim().length && !cntct.Phones.find(p => p.phone === home_phone)) {
          cntct.Phones.push({
            phone: home_phone,
            type: 'Home',
            sms: false
          })
        }

        if (cell_phone && cell_phone.trim().length && !cntct.Phones.find(p => p.phone === cell_phone)) {
          cntct.Phones.push({
            phone: cell_phone,
            type: 'Cell',
            sms: true
          })
        }

        if (work_phone && work_phone.trim().length && !cntct.Phones.find(p => p.phone === work_phone)) {
          cntct.Phones.push({
            phone: work_phone,
            type: 'Work',
            sms: true
          })
        }

        if (address && !cntct.Addresses.find(a => a.Address.address === address)) {
          cntct.Addresses.push({
            Address: {
              address: address,
              address2: address2 || null,
              city: city,
              state: state,
              zip: zip
            }
          })
        }

        // if(alternate_first ){
        //   let alt = {
        //     Contact: {
        //       first: alternate_first,
        //       last: alternate_last,
        //       email: email || null,
        //       Phones:[]
        //     }
        //   }
        //   if(alternate_phone){
        //
        //     alt.Contact.Phones.push({
        //       type:   alternate_phone_type || 'home',
        //       phone:  alternate_phone,
        //     });
        //
        //   }
        //   cntct.Relationships.push(alt)
        // }

        //  contact.update(cntct);

        try {
          await unit.validate(connection);
        } catch (err) {
          e.th(400, "Error on line " + (i + 1) + ': ' + err);
        }

        if (imported_numbers.indexOf(unit.number) >= 0) {
          e.th(400, "Error on line " + (i + 1) + ': A unit with this number is already being imported');
        }
        imported_numbers.push(unit.number);

        console.log("data", {
          contact: cntct,
          unit: unit,
          lease: lease,
          property: property
        });



        data.push({
          contact: cntct,
          unit: unit,
          lease: lease,
          property: property,
          invoice: invoice
        });

      }

      util.inspect(data);
      await connection.beginTransactionAsync();
      let errors = [];
      for (let i = 0; i < data.length; i++) {
        try {
          // Save UNit
          await data[i].unit.save(connection);

          // save contact
          if (data[i].contact.first && data[i].contact.last) {

            // validate lease start
            if (!data[i].lease.start_date) e.th(400, "Please include a lease start date.");
            if (!data[i].lease.rent) e.th(400, "Please include the monthly rent.");
            await data[i].contact.save(connection, company.id);
            data[i].lease.unit_id = data[i].unit.id;

            // save Lease
            await data[i].lease.create(connection, data[i].unit, data[i].property.LeaseTemplates[data[i].unit.type], [data[i].contact], data[i].property.company_id);

            // save Invoice
            if (data[i].invoice.InvoiceLines && data[i].invoice.InvoiceLines.length) {
              data[i].invoice.lease_id = data[i].lease.id;
              await data[i].invoice.save(connection);
            }


            // Save Payment

          }

        } catch (err) {
          console.log("err", err);
          throw "test";
          errors.push("Error on line " + (i + 1) + ': ' + err);
        }
      }
      await connection.commitAsync();


      if (errors.length) {
        e.th(400, errors.join('<br />'));
      }

      utils.send_response(res, {
        status: 200,
        data: {}
      })

    } catch (err) {
      console.log("EERROOOEEO", err);
      await connection.rollbackAsync();
      next(err);
    }



  });

  /** Depricated **/
  router.post('/:property_id/upload-tenants', [control.hasAccess(['admin']), Hash.unHash], async (req, res, next) => {

    var connection = res.locals.connection;
    try {

      let user = res.locals.contact;
      let company = res.locals.active;
      let params = req.params;

      let property = new Property({ id: params.property_id });
      await property.find(connection);
      await property.verifyAccess({company_id: company.id, properties: res.locals.properties});

      var workbook = XLSX.readFile(settings.config.base_path + req.files.file.path);

      let data = [];
      let sheetName = workbook.Props.SheetNames[0];

      let units = [];
      let sheet = workbook.Sheets[sheetName];

      let sheet_json = XLSX.utils.sheet_to_json(sheet, { header: 1 });
      let imported_numbers = [];
      console.log("sheet_json", sheet_json);
      let header = sheet_json[0].map(e => e.toLowerCase());

      if (header.indexOf('first_name') < 0) {
        e.th(400, "Please include a first name");
      }
      if (header.indexOf('unit_number') < 0) {
        e.th(400, "Please include a unit number");
      }

      if (header.indexOf('rent') < 0) {
        e.th(400, "Please include a rent column");
      }
      if (header.indexOf('lease_start') < 0) {
        e.th(400, "Please include a lease_start column");
      }

      let errors = [];

      for (let i = 1; i < sheet_json.length; i++) {

        if (!sheet_json[i].length) continue;
        let unit = new Unit();
        let lease = new Lease();

        let lease_start = moment(sheet_json[i][header.indexOf('lease_start')], 'M/D/YY');

        lease.rent = sheet_json[i][header.indexOf('rent')].replace(/[^0-9.]/, '');
        lease.security_deposit = sheet_json[i][header.indexOf('security_deposit')] || null;
        lease.start_date = lease_start.format('YYYY-MM-DD');
        lease.end_date = sheet_json[i][header.indexOf('end_date')] || null;
        lease.bill_day = sheet_json[i][header.indexOf('bill_day')].replace(/[^0-9.]/, '');
        lease.notes = sheet_json[i][header.indexOf('notes')];
        lease.status = 1;


        unit.number = sheet_json[i][header.indexOf('unit_number')];
        unit.property_id = property.id;

        if (!sheet_json[i][header.indexOf('unit_number')]) e.th(400, "Error on line " + (i + 1) + ' No unit number found.');
        if (!sheet_json[i][header.indexOf('first_name')]) e.th(400, "Error on line " + (i + 1) + ' (UNIT ' + unit.number + ') : No first name found.');
        if (!sheet_json[i][header.indexOf('lease_start')]) e.th(400, "Error on line " + (i + 1) + ' (UNIT ' + unit.number + ') : No lease start date found.');
        if (!sheet_json[i][header.indexOf('rent')]) e.th(400, "Error on line " + (i + 1) + ' (UNIT ' + unit.number + ') : No rent found.');

        try {
          await unit.find(connection);
          await unit.verifyAccess(connection, company.id, res.locals.properties);
          await unit.getCurrentLease(connection);
          await unit.getHold(connection);
          await unit.setState(connection);
          await unit.canRent(lease_start, null, null);

        } catch (err) {
          errors.push("Error on line " + (i + 1) + ' (UNIT ' + unit.number + ') : ' + err);

        }

        await property.getTemplates(connection, unit.type);

        lease.unit_id = unit.id;

        if (imported_numbers.indexOf(unit.number) >= 0) {
          errors.push("Error on line " + (i + 1) + ': A tenant with this unit number is already being imported.');
        }
        imported_numbers.push(unit.number);

        let contact = new Contact({ company_id: property.company_id });
        let c = {
          company_id: company.id,
          first: sheet_json[i][header.indexOf('first_name')],
          last: sheet_json[i][header.indexOf('last_name')],
          email: sheet_json[i][header.indexOf('email')] || null,
          company: sheet_json[i][header.indexOf('company')] || null,
          dob: sheet_json[i][header.indexOf('dob')] || null,
          ssn: sheet_json[i][header.indexOf('ssn')] || null,
          driver_license: sheet_json[i][header.indexOf('driver_license')] || null,
          Phones: [],
          Addresses: [],
          Relationships: []
        };


        if (header.indexOf('home_phone') >= 0 && sheet_json[i][header.indexOf('home_phone')] && sheet_json[i][header.indexOf('home_phone')].length) {
          c.Phones.push({
            phone: sheet_json[i][header.indexOf('home_phone')].trim().replace(/[^0-9]/, ''),
            type: 'Home',
            sms: false
          })
        }

        if (header.indexOf('cell_phone') >= 0 && sheet_json[i][header.indexOf('cell_phone')] && sheet_json[i][header.indexOf('cell_phone')].length) {
          c.Phones.push({
            phone: sheet_json[i][header.indexOf('cell_phone')].trim().replace(/[^0-9]/, ''),
            type: 'Cell',
            sms: true
          })
        }

        if (header.indexOf('work_phone') >= 0 && sheet_json[i][header.indexOf('work_phone')] && sheet_json[i][header.indexOf('work_phone')].length) {
          c.Phones.push({
            phone: sheet_json[i][header.indexOf('work_phone')].trim().replace(/[^0-9]/, ''),
            type: 'Work',
            sms: true
          })
        }


        if (header.indexOf('address') >= 0 && sheet_json[i][header.indexOf('address')]) {
          c.Addresses.push({
            Address: {
              address: sheet_json[i][header.indexOf('address')],
              address2: sheet_json[i][header.indexOf('address2')] || null,
              city: sheet_json[i][header.indexOf('city')],
              state: sheet_json[i][header.indexOf('state')],
              zip: sheet_json[i][header.indexOf('zip')]
            }
          })
        }


        if (header.indexOf('alternate_first') >= 0 && sheet_json[i][header.indexOf('alternate_first')]) {

          let alt = {
            Contact: {
              first: sheet_json[i][header.indexOf('alternate_first')],
              last: sheet_json[i][header.indexOf('alternate_last')],
              email: sheet_json[i][header.indexOf('alternate_email')] || null,
              Phones: []
            }
          }

          if (header.indexOf('alternate_phone') >= 0 && sheet_json[i][header.indexOf('alternate_phone')]) {

            alt.Contact.Phones.push({
              type: sheet_json[i][header.indexOf('alternate_phone_type')] || 'home',
              phone: sheet_json[i][header.indexOf('alternate_phone')],
            });

          }
          c.Relationships.push(alt)

        }
        await contact.update(connection, c);
        data.push({
          contact: contact,
          unit: unit,
          lease: lease,
          property: property
        });
      }

      if (errors.length) {
        e.th(400, errors.join('<br />'));
      }
      errors = [];

      await connection.beginTransactionAsync();
      for (let i = 0; i < data.length; i++) {
        try {

          console.log("contact", data[i].contact);

          await data[i].contact.save(connection);
          await data[i].lease.create(connection, data[i].unit, data[i].property.LeaseTemplates[data[i].unit.type], [data[i].contact], data[i].property.company_id);

          // console.log(data[i]);
          //
          // let lease = new Lease();
          // lease.unit_id = data[i].unit.id;
          // lease.rent = data[i].rent || null;
          // lease.security_deposit = data[i].security_deposit || null;
          // lease.start_date = data[i].start_date;
          // lease.end_date = data[i].end_date || null;
          // lease.bill_day = data[i].bill_day;
          // lease.promotion_id = data[i].promotion_id;
          // lease.send_invoice = data[i].send_invoice;
          // lease.notes = data[i].notes;
          // lease.terms = data[i].terms;
          // await lease.create(connection);

        } catch (err) {
          errors.push("Error on line " + (i + 1) + ': ' + err);
        }
      }

      if (errors.length) {
        e.th(400, errors.join('<br />'));
      }


      await connection.commitAsync();

      utils.send_response(res, {
        status: 200,
        data: {}
      })



      //        eventEmitter.emit('property_access_deleted', {company, contact, property, access: property.Access, locals: res.locals});
    } catch (err) {
      console.log("EERROOOEEO", err);
      await connection.rollbackAsync();
      next(err);
    }



  });

  router.post('/:property_id/upload', [control.hasAccess(['admin']), control.hasPermission('manage_facility_info'), Hash.unHash], async (req, res, next) => {

    var company = res.locals.active;
    var loggedInContact = res.locals.contact;
    var api = res.locals.api;

    try {

      var params = req.params;
      var body = req.body;
      var files = req.files;
      var connection = res.locals.connection;

      let property = new Property({ id: params.property_id });
      await property.find(connection);
      await property.verifyAccess({company_id: company.id, properties: res.locals.properties});

      let file_list = [];
      if (Array.isArray(files.file)) {
        file_list = files.file;
      } else {
        file_list.push(files.file);
      }
      let saved_uploads = []
      for (let i = 0; i < file_list.length; i++) {
        let file = file_list[i];
        let upload = new Upload();
        await upload.setDocumentType(connection, body.document_type_id, body.document_type, company.id)
        upload.setFile(file, body.src);
        upload.uploaded_by = loggedInContact ? loggedInContact.id : null;
        await upload.save(connection);
        await upload.saveUploadProperty(connection, property.id);
        saved_uploads.push({ id: upload.id });
      }

      utils.send_response(res, {
        status: 200,
        data: {
          upload_id: Hash.obscure(saved_uploads, req)
        }
      });
      eventEmitter.emit('file_uploaded_to_lease', { api, contact: loggedInContact, company, cid: res.locals.company_id, locals: res.locals });

    } catch (error) {
      next(error);
    }
  });

  // router.put('/:property_id/upload/sort', [control.hasAccess(['admin']), control.hasPermission('manage_facility_info')], function(req, res, next) {
  //
  //     var body = req.body;
  //     var params = req.params;
  //     var connection;
  //     var company = res.locals.active;
  //     var property = {};
  //     var contact = res.locals.contact;
  //
  //     pool.getConnectionAsync() .then(function(conn) {
  //             connection = conn;
  //             property = new Property({id: params.property_id});
  //             return property.find(connection);
  //         })
  //         .then(() => property.verifyAccess(company.id, res.locals.properties))
  //         .then(() => {
  //             return Promise.mapSeries(body.uploads, (upload, i) => {
  //                 return models.Upload.saveEntitySort(connection, 'uploads_properties', i, upload.id, params.property_id);
  //             });
  //         }).then(() => {
  //             utils.send_response(res, {
  //                 status: 200
  //             })
  //         })
  //         .then(() => utils.saveTiming(connection, req, res.locals))
  //         .catch(next)
  //         .finally(() => utils.closeConnection(pool, connection))
  // });


  router.put('/:property_id/units/:unit_id', [control.hasAccess(['admin']), joiValidator.body(Schema.createUnit), control.hasPermission('edit_space'), Hash.unHash], function (req, res, next) {
    var company = res.locals.active;
    var contact = res.locals.contact;
    var cid = res.locals.company_id;
    var body = req.body;
    var params = req.params;
    var unit = new Unit({ id: params.unit_id });
    var unitGroupRefresh = false;
    var connection = res.locals.connection;
    var property = params.property_id;

    return unit.find(connection)
      .then(() => unit.verifyAccess(connection, company.id, res.locals.properties))
      .then(() => {
        
        unit.number = body.number;
        unit.floor = body.floor;
        unit.featured = body.featured || 0;
        unit.description = body.description;
        unit.price = body.price;
        unit.set_rate = body.set_rate
        unit.status = body.status;
        unit.available_date = body.available_date || null;
        unit.category_id = body.category_id;
        unit.product_id = body.product_id;
        unit.modified_by = contact?.id;
        return unit.save(connection, contact.id);

      })
      .then(() => {
        return Promise.map(Object.keys(body), field => {
          return models.Amenity.findAmenityByName(connection, field, body.type).map(async (amenity) => {
            let amenity_property = await models.Amenity.findAmenityPropertyIdx(connection, amenity.id, params.property_id);
            if (amenity_property.length > 0) {
              if (await models.Amenity.checkRefreshUnitGroupCondition(connection, amenity_property[0].id, body[field], unit.id, true)) {
                unitGroupRefresh = true;
              }

              //Temporary fix to handle floor amenity data being replaced by floor property
              //from units table while editing space info(See INC-4083 for more details)
              if (field == `floor`) {
                let existingFloorAmenityData = (await models.Amenity.findAmenityUnits(connection, amenity_property[0].id, unit.id))[0];
                if (existingFloorAmenityData?.value && isNaN(existingFloorAmenityData?.value)) return;
              }

              return models.Amenity.saveUnitFeatures(connection, amenity_property[0].amenity_id, amenity_property[0].id, body[field], unit.id);
            }
            // return models.Amenity.findPropertyAmenityByName(connection, field, body.type, params.property_id).map(amenity => {
            //     return models.Amenity.saveUnitFeatures(connection, amenity.id, body[field], unit.id);
          });
        });
      })
      .then(async () => {
        if (!body.length) {
          let a = await models.Amenity.findUnitAmenityByName(connection, "Length", body.type, unit.id);
          body.length = a.length && a[0].value;
        }
        if (!body.width) {
          let a = await models.Amenity.findUnitAmenityByName(connection, "Width", body.type, unit.id);
          body.width = a.length && a[0].value;
        }

        let sqrft = body.length === '' || body.width === '' ? '' : body.length * body.width;
        return models.Amenity.findAmenityByName(connection, "Sqft", body.type).map(async (amenity) => {
          let amenity_property = await models.Amenity.findAmenityPropertyIdx(connection, amenity.id, params.property_id);
          if (amenity_property.length > 0) {
            if (await models.Amenity.checkRefreshUnitGroupCondition(connection, amenity_property[0].id, sqrft, unit.id, true)) {
              unitGroupRefresh = true;
            }
            let x = await models.Amenity.saveUnitFeatures(connection, amenity_property[0].amenity_id, amenity_property[0].id, sqrft, unit.id);
            // call refresh unit group trigger
            if (unitGroupRefresh) {
              await refreshUnitGroup.callRefreshUnitGroupProcedure(cid, { property_id: property });
            }
            return x

          }
          // return models.Amenity.findPropertyAmenityByName(connection, "Sqft", body.type, params.property_id).map(amenity => {
          //     return models.Amenity.saveUnitFeatures(connection, amenity.id, sqrft, unit.id);
        });
      })
      .then(async () => {
        var activity = new Activity();
        return activity.create(connection, company.id, contact.id, 3, 16, params.unit_id);
      })
      .then(() => {
        utils.send_response(res, {
          status: 200,
          data: {}
        });

        eventEmitter.emit('promotion_unit_update', { company, contact, units: [unit.id], cid: res.locals.company_id, locals: res.locals });
      })

      .catch(next)



  });

  // 87 lines

  router.post('/:property_id/units', [control.hasAccess(['admin']), joiValidator.body(Schema.createUnit), control.hasPermission('edit_space'), Hash.unHash], async (req, res, next) => {


    var connection = res.locals.connection;
    try {

      let contact = res.locals.contact;
      let company = res.locals.active;
      let body = req.body;
      let params = req.params;

      let category = {};
      let address = {};
      let product = {};

      let property = new Property({ id: params.property_id });
      await property.find(connection);
      await property.verifyAccess({connection, company_id: company.id, properties: res.locals.properties, contact_id: contact.id, permissions: ['edit_space']});

      if (body.category_id) {
        category = new Category({ id: body.category_id });
        await category.find(connection);
        await category.verifyAccess(company.id);
      }

      if (body.address_id) {
        address = new Address({ id: body.address_id });
        await address.find(connection);
      } else if (body.Address) {
        address = new Address(body.Address);
        await address.findOrSave(connection)

      } else {
        e.th(400, "Please include an address object or address_id")
      }

      if (body.product_id) {
        product = new Product({ id: body.product_id });
        await product.find(connection);
        await product.verifyAccess(company.id);
      } else if (body.Product) {
        product = new Product(body.Product);
        product.company_id = company.id;
        await product.save(connection);

      } else {
        e.th(400, "Please include an product object or product_id")
      }


      await connection.beginTransactionAsync();


      let unit = new Unit(body);
      unit.property_id = property.id;
      unit.address_id = address.id;
      unit.product_id = product.id;
      await unit.save(connection);


      for (let field in body) {

        let amenities = await models.Amenity.findPropertyAmenityByName(connection, field, body.type, property.id);

        for (let i = 0; i < amenities.length; i++) {
          let amenity_property = await models.Amenity.findAmenityPropertyIdx(connection, amenities[i].id, params.property_id);
          if (amenity_property.length > 0) await models.Amenity.saveUnitFeatures(connection, amenity_property[0].amenity_id, amenity_property[0].id, body[field], unit.id)

        }

      }

      // return Promise.map(Object.keys(body), function (field) {
      //     return models.Amenity.findAmenityByName(connection, field, body.type).each(function (amenity) {
      //         return models.Amenity.saveUnitFeatures(connection, amenity.id, body[field], unit.id);
      //     });
      // });

      await connection.commitAsync();

      //
      // var activity = new Activity();
      // return activity.create(connection,company.id,contact.id, 2, 16, unit.id);

      utils.send_response(res, {
        status: 200,
        data: {
          unit_id: Hashes.encode(unit.id, res.locals.company_id)
        }
      });



      eventEmitter.emit('unit_created', { company, contact, property, unit, cid: res.locals.company_id, locals: res.locals });

    } catch (err) {
      await connection.rollbackAsync();
      next(err);
    }



    // .then(() => {
    //     if (body.address_id) {
    //         address = new Address({id: body.address_id});
    //         return address.find(connection);
    //     } else if (body.Address) {
    //         address = new Address(body.Address);
    //         return address.findOrSave(connection)
    //
    //     }
    //     e.th(400, "Please include an address object or address_id")
    // })
    // .then(() => connection.beginTransactionAsync())
    // .then(() => {
    //     unit = new Unit(body);
    //     unit.property_id = property.id;
    //     unit.address_id = address.id;
    //     return unit.save(connection);
    //
    // })
    // .then(() => {
    //     // save Amenities --
    //     return Promise.map(Object.keys(body), function (field) {
    //         return models.Amenity.findAmenityByName(connection, field, body.type).each(function (amenity) {
    //             return models.Amenity.saveUnitFeatures(connection, amenity.id, body[field], unit.id);
    //         });
    //     });
    //
    // })
    // .then(() => connection.commitAsync())
    // .then(() => {
    //     var activity = new Activity();
    //     return activity.create(connection,company.id,contact.id, 2, 16, unit.id);
    // })
    // .then(() => {
    //     utils.send_response(res, {
    //         status: 200,
    //         data: {
    //             unit_id: Hashes.encode(unit.id)
    //         }
    //     });
    // })
    // .then(() => utils.saveTiming(connection, req, res.locals))
    // .catch(err => {
    //     return connection.rollbackAsync().then(() => next(err));
    // })
    // .finally(() => utils.closeConnection(pool, connection))
  });

  //** Utilities FROM Billing **//


  // Property Utilities

  router.get('/:property_id/utilities', [control.hasAccess('admin'), Hash.unHash], async (req, res, next) => {


    var connection = res.locals.connection;
    try {

      let contact = res.locals.contact;
      let company = res.locals.active;
      let params = req.params;

      let property = new Property({ id: params.property_id });
      await property.find(connection);
      await property.verifyAccess({company_id: company.id, properties: res.locals.properties});


      let utilities = await property.getUtilities(connection);

      utils.send_response(res, {
        status: 200,
        data: {
          utilities: Hash.obscure(utilities, req),
          splitTypes: models.Billing.splitTypes,
        }
      });


    } catch (err) {
      next(err);
    }


  });

  router.post('/:property_id/utilities', [control.hasAccess(['admin']), joiValidator.body(Schema.utility), control.hasPermission('manage_facility_info'), Hash.unHash], async (req, res, next) => {

    var connection = res.locals.connection;
    try {

      let contact = res.locals.contact;
      let company = res.locals.active;
      let params = req.params;
      let body = req.body;

      let property = new Property({ id: params.property_id });
      await property.find(connection);
      await property.verifyAccess({connection, company_id: company.id, properties: res.locals.properties, contact_id: contact.id, permissions: ['manage_facility_info']});

      let product = new Product({ id: body.product_id });
      await product.find(connection);
      await product.verifyAccess(company.id)

      if (product.default_type != 'utility') {
        e.th(400, "Invalid Product Type")
      }

      // TODo verify Vendor access as well.


      let utility = await property.saveUtility(connection, body);

      utils.send_response(res, {
        status: 200,
        data: {
          utility_id: Hashes.encode(utility.id, res.locals.company_id)
        }
      });

      eventEmitter.emit('property_utility_created', { company, contact, property, utility, cid: res.locals.company_id, locals: res.locals });

    } catch (err) {
      next(err);
    }


  })

  router.put('/:property_id/utilities/:utility_id', [control.hasAccess(['admin']), joiValidator.body(Schema.updateUtility), control.hasPermission('manage_facility_info'), Hash.unHash], async (req, res, next) => {


    var connection = res.locals.connection;
    try {

      let contact = res.locals.contact;
      let company = res.locals.active;
      let params = req.params;
      let body = req.body;

      let property = new Property({ id: params.property_id });
      await property.find(connection);
      await property.verifyAccess({connection, company_id: company.id, properties: res.locals.properties, contact_id: contact.id, permissions: ['manage_facility_info']});

      let utilities = await property.getUtilities(connection);
      let existing = utilities.find(u => u.id === params.utility_id);

      if (!existing) e.th(404);
      if (existing.property_id !== params.property_id) {
        e.th(400, "This utility does not belong to this property")
      }

      let utility = await property.updateUtility(connection, existing, body);

      utility = await property.saveUtility(connection, utility);


      utils.send_response(res, {
        status: 200,
        data: {
          utility_id: Hashes.encode(utility.id, res.locals.company_id)
        }
      });

      eventEmitter.emit('property_utility_updated', { company, contact, property, utility, cid: res.locals.company_id, locals: res.locals });

    } catch (err) {
      next(err);
    }


  })

  router.delete('/:property_id/utilities/:utility_id', [control.hasAccess(['admin']), control.hasPermission('manage_facility_info'), Hash.unHash], async (req, res, next) => {



    var connection = res.locals.connection;
    try {

      let contact = res.locals.contact;
      let company = res.locals.active;
      let params = req.params;


      let property = new Property({ id: params.property_id });
      await property.find(connection);
      await property.verifyAccess({connection, company_id: company.id, properties: res.locals.properties, contact_id: contact.id, permissions: ['manage_facility_info']});

      let utilities = await property.getUtilities(connection);
      let utility = utilities.find(u => u.id === params.utility_id);

      if (!utility) e.th(404);

      await property.deleteUtility(connection, utility);


      utils.send_response(res, {
        status: 200,
        data: {}
      });

      eventEmitter.emit('property_utility_deleted', { company, contact, property, utility, cid: res.locals.company_id, locals: res.locals });

    } catch (err) {
      next(err);
    }


  });



  // Billing

  router.post('/:property_id/utility-bills', [control.hasAccess(['admin']), joiValidator.body(Schema.propertyBill), Hash.unHash], async (req, res, next) => {

    try {
      let company = res.locals.active;
      let contact = res.locals.contact;
      let body = req.body;
      let params = req.params;
      var connection = res.locals.connection;

      await connection.beginTransactionAsync();

      let lease_count = 0;
      let sum_sqft = 0;
      let sum_tenants = 0;
      let date = moment([moment().format('YYYY'), moment().format('MM') - 1]);


      let property = new Property({ id: params.property_id });
      await property.find(connection);
      property.verifyAccess({company_id: company.id, properties: res.locals.properties});
      await property.getUnits(connection);

      for (let i = 0; i < property.Units.length; i++) {
        if (property.Units[i].Lease) {
          await property.Units[i].Lease.getTenants(connection);
          sum_tenants += property.Units[i].Lease.Tenants.length;
          lease_count++;
        }

        sum_sqft += +property.Units[i].sqft || 1;
      }


      for (let i = 0; i < body.property_bills.length; i++) {
        let bill = body.property_bills[i];

        if (!bill.amount) continue;
        if (!bill.utility_id) e.th(500, "An error occurred, please refresh the page and try again.")


        let utility = await models.Billing.findById(connection, bill.utility_id);
        if (!utility) e.th(404, "Utility not found.")
        if (utility.property_id != property.id) e.th(400, "This utility does not belong to this product");

        let existingBill = await models.Billing.searchForPropertyBill(connection, utility.id, utility.property_id, moment());

        if (existingBill.length) {
          e.th(409, "Bills for this property have already been entered for this month. Please refresh this page to see the charges")
        }

        let product = new Product({ id: utility.product_id });
        await product.find(connection);
        await product.verifyAccess(company.id);


        if (bill.custom) {
          let custom_total = 0;
          for (let unit_id in bill.custom) {
            custom_total += +bill.custom[unit_id];
          }
          if (custom_total != bill.amount) {
            console.log(custom_total);
            console.log(bill.amount);
            e.th(400, "The total doesn't match the sum of all the units billed.")
          }

        }


        var toSave = {
          name: utility.name,
          data: {
            property_id: property.id,
            bill_id: utility.id,
            date: date.format('YYYY-MM-DD'),
            amount: bill.amount,
            custom: bill.custom ? JSON.stringify(bill.custom) : null
          }
        };


        let property_bill_result = await models.Billing.savePropertyBill(connection, toSave.data);
        toSave.data.id = property_bill_result.id;

        for (let j = 0; j < property.Units.length; j++) {
          if (!property.Units[j].Lease) continue;

          var service = {
            qty: 1,
            product_id: utility.product_id,
            property_bill_id: toSave.data.id,
            lease_id: property.Units[j].Lease.id,
            start_date: date.clone().startOf('month').format('YYYY-MM-DD'),
            end_date: date.clone().endOf('month').format('YYYY-MM-DD'),
            recurring: 0,
            prorate: 0,
            prorate_out: 0,
            taxable: 0,
            name: product.name
          };

          if (toSave.data.custom) {
            try {
              var custom = JSON.parse(toSave.data.custom);
              service.price = custom[Hashes.encode(property.Units[j].id, res.locals.company_id)];
            } catch (err) {
              console.log(err);
            }
          }

          if (!service.price) {
            switch (utility.splittype) {
              case 'units':
                service.price = Math.round((+toSave.data.amount / property.Units.length) * 1e2) / 1e2;
                break;
              case 'leases':
                service.price = Math.round((+toSave.data.amount / lease_count) * 1e2) / 1e2;
                break;
              case 'tenants':
                if (property.Units[j].Lease && property.Units[j].Lease.Tenants) {
                  service.price = Math.round(((+toSave.data.amount / sum_tenants) * property.Units[j].Lease.Tenants.length) * 1e2) / 1e2;
                } else {
                  service.price = 0;
                }
                break;
              case 'sqft':
                service.price = Math.round((+toSave.data.amount / sum_sqft) * 1e2) / 1e2;
                break;
            }
          }

          if (service.price > 0) {
            var s = new Service(service);
            await s.save(connection);
          }
        }

      }
      await connection.commitAsync();

      utils.send_response(res, {
        status: 200,
        data: {}
      });


      eventEmitter.emit('monthly_utilities_entered', { contact, company, property, cid: res.locals.company_id, locals: res.locals });

    } catch (err) {
      await connection.rollbackAsync();
      next(err);
    }



  });



  // Maintenance Setup - Types

  router.get('/:property_id/maintenance-types', [control.hasAccess(['admin']), Hash.unHash], async (req, res, next) => {


    var connection = res.locals.connection;
    try {

      let contact = res.locals.contact;
      let company = res.locals.active;
      let params = req.params;

      let property = new Property({ id: params.property_id });
      await property.find(connection);
      await property.verifyAccess({company_id: company.id, properties: res.locals.properties});
      await property.getMaintenanceTypes(connection);



      utils.send_response(res, {
        status: 200,
        data: {
          maintenance_types: Hash.obscure(property.MaintenanceTypes, req)
        }
      });


    } catch (err) {
      next(err);
    }


  });

  router.post('/:property_id/maintenance-types', [control.hasAccess(['admin']), control.hasPermission('manage_maintenance'), Hash.unHash], async (req, res, next) => {


    var connection = res.locals.connection;
    try {

      let contact = res.locals.contact;
      let company = res.locals.active;
      let params = req.params;
      let body = req.body;

      let property = new Property({ id: params.property_id });
      await property.find(connection);
      await property.verifyAccess({connection, company_id: company.id, properties: res.locals.properties, contact_id: contact.id, permissions: ['manage_maintenance']});

      let maintenance_type = await property.saveMaintenanceType(connection, body);

      utils.send_response(res, {
        status: 200,
        data: {
          maintenance_type_id: Hashes.encode(maintenance_type.id, res.locals.company_id)
        }
      });
      eventEmitter.emit('maintenance_type_created', { company, contact, property, maintenance_type, cid: res.locals.company_id, locals: res.locals });

    } catch (err) {
      next(err);
    }


  });

  router.put('/:property_id/maintenance-types/:maintenance_type_id', [control.hasAccess(['admin']), control.hasPermission('manage_maintenance'), Hash.unHash], async (req, res, next) => {


    var connection = res.locals.connection;
    try {

      let contact = res.locals.contact;
      let company = res.locals.active;
      let params = req.params;
      let body = req.body;

      let property = new Property({ id: params.property_id });
      await property.find(connection);
      await property.verifyAccess({connection, company_id: company.id, properties: res.locals.properties, contact_id: contact.id, permissions: ['manage_maintenance']});
      await property.getMaintenanceTypes(connection);

      let maintenance_type = property.MaintenanceTypes.find(mt => mt.id == params.maintenance_type_id);

      if (!maintenance_type) e.th(404);

      maintenance_type = property.updateMaintenanceType(maintenance_type, body);

      await property.saveMaintenanceType(connection, maintenance_type);

      utils.send_response(res, {
        status: 200,
        data: {
          maintenance_type_id: Hashes.encode(maintenance_type.id, res.locals.company_id)
        }
      });
      eventEmitter.emit('maintenance_type_updated', { company, contact, property, maintenance_type, cid: res.locals.company_id, locals: res.locals });

    } catch (err) {
      next(err);
    }


  });

  router.delete('/:property_id/maintenance-types/:maintenance_type_id', [control.hasAccess(['admin']), control.hasPermission('manage_maintenance'), Hash.unHash], async (req, res, next) => {


    var connection = res.locals.connection;
    try {

      let contact = res.locals.contact;
      let company = res.locals.active;
      let params = req.params;


      let property = new Property({ id: params.property_id });
      await property.find(connection);
      await property.verifyAccess({connection, company_id: company.id, properties: res.locals.properties, contact_id: contact.id, permissions: ['manage_maintenance']});
      await property.getMaintenanceTypes(connection);

      let maintenance_type = property.MaintenanceTypes.find(mt => mt.id == params.maintenance_type_id);

      if (!maintenance_type) e.th(404);

      await property.deleteMaintenanceType(connection, maintenance_type.id);

      utils.send_response(res, {
        status: 200,
        data: {
          maintenance_type_id: Hashes.encode(maintenance_type.id, res.locals.company_id)
        }
      });

      eventEmitter.emit('maintenance_type_deleted', { company, contact, property, maintenance_type, cid: res.locals.company_id, locals: res.locals });

    } catch (err) {
      next(err);
    }


  });



  // Maintenance Setup - Extras

  router.get('/:property_id/maintenance-extras', [control.hasAccess(['admin']), Hash.unHash], async (req, res, next) => {

    var connection = res.locals.connection;
    try {

      let contact = res.locals.contact;
      let company = res.locals.active;
      let params = req.params;

      let property = new Property({ id: params.property_id });
      await property.find(connection);
      await property.verifyAccess({company_id: company.id, properties: res.locals.properties});

      await property.getMaintenanceExtras(connection);

      utils.send_response(res, {
        status: 200,
        data: {
          maintenance_extras: Hash.obscure(property.MaintenanceExtras, req)
        }
      });

    } catch (err) {
      next(err);
    }

  });

  router.post('/:property_id/maintenance-extras', [control.hasAccess(['admin']), joiValidator.body(Schema.maintenanceExtra), control.hasPermission('manage_maintenance'), Hash.unHash], async (req, res, next) => {


    var connection = res.locals.connection;
    try {

      let contact = res.locals.contact;
      let company = res.locals.active;
      let params = req.params;
      let body = req.body;

      let property = new Property({ id: params.property_id });
      await property.find(connection);
      await property.verifyAccess({connection, company_id: company.id, properties: res.locals.properties, contact_id: contact.id, permissions: ['manage_maintenance']});

      let maintenance_extra = await property.saveMaintenanceExtra(connection, body);

      utils.send_response(res, {
        status: 200,
        data: {
          maintenance_extra_id: Hashes.encode(maintenance_extra.id, res.locals.company_id)
        }
      });
      eventEmitter.emit('maintenance_extra_created', { company, contact, property, maintenance_extra, cid: res.locals.company_id, locals: res.locals });


    } catch (err) {
      next(err);
    }


  });

  router.put('/:property_id/maintenance-extras/:maintenance_extra_id', [control.hasAccess(['admin']), joiValidator.body(Schema.maintenanceExtra), control.hasPermission('manage_maintenance'), Hash.unHash], async (req, res, next) => {


    var connection = res.locals.connection;
    try {

      let contact = res.locals.contact;
      let company = res.locals.active;
      let params = req.params;
      let body = req.body;

      let property = new Property({ id: params.property_id });
      await property.find(connection);
      await property.verifyAccess({connection, company_id: company.id, properties: res.locals.properties, contact_id: contact.id, permissions: ['manage_maintenance']});

      await property.getMaintenanceExtras(connection);


      let maintenance_extra = property.MaintenanceExtras.find(me => me.id == params.maintenance_extra_id);
      if (!maintenance_extra) e.th(404);


      maintenance_extra = property.updateMaintenanceExtra(maintenance_extra, body);

      await property.saveMaintenanceExtra(connection, maintenance_extra);

      utils.send_response(res, {
        status: 200,
        data: {
          maintenance_extra_id: Hashes.encode(maintenance_extra.id, res.locals.company_id)
        }
      });
      eventEmitter.emit('maintenance_extra_updated', { company, contact, property, maintenance_extra, cid: res.locals.company_id, locals: res.locals });


    } catch (err) {
      next(err);
    }


  });

  router.delete('/:property_id/maintenance-extras/:maintenance_extra_id', [control.hasAccess('admin'), control.hasPermission('manage_maintenance'), Hash.unHash], async (req, res, next) => {

    var connection = res.locals.connection;
    try {

      let contact = res.locals.contact;
      let company = res.locals.active;
      let params = req.params;
      let body = req.body;

      let property = new Property({ id: params.property_id });
      await property.find(connection);
      await property.verifyAccess({connection, company_id: company.id, properties: res.locals.properties, contact_id: contact.id, permissions: ['manage_maintenance']});

      await property.getMaintenanceExtras(connection);


      let maintenance_extra = property.MaintenanceExtras.find(me => me.id == params.maintenance_extra_id);
      if (!maintenance_extra) e.th(404);

      await property.deleteMaintenanceExtra(connection, maintenance_extra.id);

      utils.send_response(res, {
        status: 200,
        data: {
          data: {}
        }
      });
      eventEmitter.emit('maintenance_extra_deleted', { company, contact, property, maintenance_extra, cid: res.locals.company_id, locals: res.locals });


    } catch (err) {
      next(err);
    }


  });

  router.get('/:property_id/batch-close', [control.hasAccess(['admin']), Hash.unHash], async (req, res, next) => {

    var connection = res.locals.connection;
    try {

      let contact = res.locals.contact;
      let company = res.locals.active;
      let params = req.params;
      let body = req.body;

      let property = new Property({ id: params.property_id });
      await property.find(connection);
      await property.verifyAccess({company_id: company.id, properties: res.locals.properties});

      let pm = await property.getPaymentMethod(connection, 'card');
      await pm.batchClose(connection);

      utils.send_response(res, {
        status: 200,
        data: {
          data: {}
        }
      });
      // TODO ACTION
      // eventEmitter.emit('batch closed', {company, contact, property, maintenance_extra, locals: res.locals});


    } catch (err) {
      next(err);
    }


  });

  router.get('/:property_id/units/overlock', [control.hasAccess(['admin', 'api']), Hash.unHash], async (req, res, next) => {

    var connection = res.locals.connection;

    try {
      let api = res.locals.api;
      let company = res.locals.active;
      let params = req.params;

      let property = new Property({ id: params.property_id });
      await property.find(connection);
      await property.verifyAccess({company_id: company.id, properties: res.locals.properties});
      await property.getOverlockedUnits(connection, api);

      utils.send_response(res, {
        status: 200,
        data: {
          units: Hash.obscure(property.Units, req)
        }
      });

    } catch (err) {
      next(err);
    } finally {

    }

  });

  router.get('/:property_id/units/to-overlock', [control.hasAccess(['admin', 'api']), Hash.unHash], async (req, res, next) => {

    var connection = res.locals.connection;

    try {
      let api = res.locals.api;
      let company = res.locals.active;
      let params = req.params;

      let property = new Property({ id: params.property_id });
      await property.find(connection);
      await property.verifyAccess({company_id: company.id, properties: res.locals.properties});
      await property.getUnitsToOverlock(connection, api);
      console.log("UNITS", property.Units.length);
      utils.send_response(res, {
        status: 200,
        data: {
          units: Hash.obscure(property.Units, req)
        }
      });

    } catch (err) {
      next(err);
    } finally {

    }
  });

  router.get('/:property_id/units/to-unlock', [control.hasAccess(['admin', 'api']), Hash.unHash], async (req, res, next) => {

    var connection = res.locals.connection;

    try {
      let api = res.locals.api;
      let company = res.locals.active;
      let params = req.params;

      let property = new Property({ id: params.property_id });
      await property.find(connection);
      await property.verifyAccess({company_id: company.id, properties: res.locals.properties});
      await property.getUnitsToUnlock(connection, api);

      utils.send_response(res, {
        status: 200,
        data: {
          units: Hash.obscure(property.Units, req)
        }
      });

    } catch (err) {
      next(err);
    } finally {

    }

  });

  router.get('/:property_id/permissions', [control.hasAccess(['admin']), Hash.unHash], async (req, res, next) => {
    var connection = res.locals.connection;

    try {
      let company = res.locals.active;
      let contact = res.locals.contact;
      let params = req.params;

      let property = new Property({ id: params.property_id });
      await property.find(connection);
      await property.verifyAccess({company_id: company.id, properties: res.locals.properties});
      let permissions = await property.getPermissions(connection, company.id, contact.id);

      utils.send_response(res, {
        status: 200,
        data: {
          permissions: Hash.obscure(permissions, req)
        }
      });

    } catch (err) {
      next(err);
    } finally {

    }
  });

  router.post('/:property_id/invoices', [control.hasAccess(['admin', 'api']), Hash.unHash], async (req, res, next) => {

    var connection = res.locals.connection;

    try {

      let logged_in_user = res.locals.contact || {};
      let api = res.locals.api || {};
      let company = res.locals.active;
      let properties = res.locals.properties;

      let body = req.body;
      let params = req.params;
      let payment = {};
      let paymentMethod = {};
      let events = [];
      let contact = {};
      let lease = {};
      let period_end = {};
      let period_start = moment().startOf('day');


      if (!body.InvoiceLines || !Array.isArray(body.InvoiceLines) || !body.InvoiceLines.length) e.th(400, "This invoice contains no lines");

      let property = new Property({ id: params.property_id });
      await property.find(connection);
      await property.verifyAccess({company_id: company.id});
      let datetime = await property.getLocalCurrentDate(connection, 'YYYY-MM-DD');
      body.property_id = property.id;
      body.date = datetime;
      body.due = body.due ? body.due : datetime;
      body.period_start = body.period_start ? body.period_start : datetime;
      body.period_end = body.period_end ? body.period_end : datetime;

      if (body.contact_id) {
        contact = new Contact({ id: body.contact_id });
        await contact.find(connection);
        await contact.verifyAccess(company.id);
      } else if (body.contact) {
        contact = new Contact({ company_id: company.id, ...body.contact });
        contact.assembleContact(body.contact);
        contact.company_id = company.id;
        if (!body.dryrun) {
          await connection.beginTransactionAsync();
          await contact.save(connection);
          body.contact_id = contact.id;
          await connection.commitAsync();
        }
      } else if (!body.dryrun) {
        e.th(400, "Contact missing")
      }

      if (!body.lease_id) {
        if (contact && contact.id) {
          await contact.getLeases(connection, company.id, [property.id], { all: true, sort_by_desc: true });
          if (contact.Leases && contact.Leases.length) {
            body.lease_id = contact.Leases[0].id;
          }
          console.log('Body after getLeases =>', JSON.stringify(body));
        }
      }

      if (body.lease_id) {
        lease = new Lease({ id: body.lease_id });
        await lease.find(connection);
        await lease.canAccess(connection, company.id, properties);
      }

      let invoice = new Invoice({ created_by: logged_in_user.id, apikey_id: api.id });
      invoice.create(body, company.id);

      await invoice.generateLines(connection, body.InvoiceLines, [], company.id, lease.unit_id);
      // await invoice.calculatePayments();
      // await invoice.getOpenPayments(connection);
      await invoice.total();

      if (!body.dryrun) {
        await connection.beginTransactionAsync();

        await invoice.save(connection);

        // if(body.use_credits) {
        //   if(body.Invoices && body.Invoices.length){
        //       invoice.credits_amount_used = body.Invoices[0].credits_amount_used;
        //   }
        //   await contact.reconcile(connection, property.id, [invoice], true);
        // }

        let invoices = [{
          id: invoice.id,
          amount: body.Invoices && body.Invoices.length ? body.Invoices[0].amount : invoice.balance
        }];

        if (body.payment.id) {

          events.push('invoice_created');
          // Apply existing payment to invoices

          payment = new Payment({ id: body.payment.id });
          await payment.find(connection);
          await payment.verifyAccess(connection, company.id, res.locals.properties);
          await payment.getPaymentApplications(connection);
          await payment.applyToInvoices(connection, [{ id: invoice.id, amount: invoice.balance }]);
        } else if (body.payment.amount) {

          paymentMethod = await contact.getPaymentMethod(connection, property, body.payment.payment_method_id, body.payment.type, body.payment.source, body.paymentMethod);

          payment = new Payment();
          body.payment.contact_id = contact.id;
          await payment.create(connection, body.payment, paymentMethod, null, logged_in_user.id);
          events.push('payment_created');

          await payment.getPaymentApplications(connection);

          if (payment.status && payment.payment_remaining && invoice.id) {
            await payment.applyToInvoices(connection, invoices);
          }

          await payment.charge(connection, company.id, false, logged_in_user);
          //events.push('payment_method_charged');

        }

        await connection.commitAsync();
        if (payment && payment.status_desc && payment.status_desc.toLowerCase() === "partially approved") {
          e.th(400, "This payment was only  authorized for $" + payment.amount.toFixed(2) + ' and has been voided');
        }
      }

      let data = {};

      data.invoice = Hash.obscure(invoice, req);
      if (!body.dryrun) {
        data.payment = {
          id: Hashes.encode(payment.id, res.locals.company_id),
          amount: payment.amount,
          status_desc: payment.status_desc
        };
      }


      utils.send_response(res, {
        status: 200,
        data: data,
        msg: 'Your Payments have been processed successfully'
      });

      if (!body.dryrun) {
        ///eventEmitter.emit('invoice_created', {company, contact, invoice, locals: res.locals});
        // EMIT ALL THE EVENTS THAT HAPPENED
        lease = Object.keys(lease).length === 0 && lease.constructor === Object ? undefined : lease;
        events.map(e => {
          eventEmitter.emit(e, { lease, contact, company, payment, paymentMethod, invoice, cid: res.locals.company_id, locals: res.locals });
        });
      }

    } catch (err) {
      await connection.rollbackAsync();
      next(err);
    }



  });

  router.get('/:property_id/resubscribe-message-bus', [control.hasAccess(['admin', 'api']), Hash.unHash], async (req, res, next) => {

    var connection = null;
    var params = req.params;
    let local_company = res.locals.active;
    let headers = {
      "x-storageapi-key": process.env.GDS_API_KEY,
      "x-storageapi-date": moment().format('x'),
      "Content-Type": "application/json"
    };

    try {

      connection = res.locals.connection;

      var company = new Company({ id: local_company.id });
      await company.find(connection);

      var property = new Property({ id: params.property_id, company_id: company.id });
      await property.find(connection);

      var root_path = '/v1/gds-integration';

      let subscriptions = await getGDSSubscriptions(connection, params.property_id, local_company.id);
      // console.log("subscriptions", subscriptions);

      for (let i = 0; i < subscriptions.length; i++) {
        if (subscriptions[i].application_id !== process.env.HUMMINGBIRD_APP_ID) continue;
        console.log("subscription  !!!!!!", subscriptions[i]);
        try {
          await updateGDSEvent(connection, subscriptions[i], Hashes.encode(res.locals.company_id), params.property_id)
        } catch (err) {
          console.log("err", err);
        }
      }
      utils.send_response(res, {
        status: 200
      });

    } catch (err) {
      console.log("Error occurred while subscribing gds events");
      console.log(err);
      next(err);
    }

  });

  router.get('/:property_id/mailhouses', [control.hasAccess(['admin', 'api']), Hash.unHash], async (req, res, next) => {
	
	try {
		let params = req.params;
		let connection = res.locals.connection;
		let local_company = res.locals.active;
		let company = new Company({id: local_company.id});

		let property = new Property({ id: params.property_id, company_id: company.id });
		await property.find(connection);

		let isRpostSubscribed = await getRpostSubscription(connection, params.property_id, local_company.id);
		let isSimpleCertifiedSubscribed = await getSimpleCertifiedSubscription(connection, params.property_id, local_company.id);

		let subscribed = ['Hummingbird']
		if (isRpostSubscribed) subscribed.push('RPost');
		if (isSimpleCertifiedSubscribed) subscribed.push('Simple Certified');

		utils.send_response(res, {
			status: 200,
			data: subscribed
		  });
	} catch(err) {
		console.log("Error occurred while getting subscriptions");
      	console.log(err);
      	next(err);
	}

  })


  router.post('/:property_id/subscribe-message-bus', [control.hasAccess(['admin', 'api']), Hash.unHash], async (req, res, next) => {

    var connection = null;
    var params = req.params;
    let local_company = res.locals.active;
    let hashed_cid = req.originalUrl.split('/')[3];
    let headers = {
      "x-storageapi-key": process.env.GDS_API_KEY,
      "x-storageapi-date": moment().format('x'),
      "Content-Type": "application/json"
    };

    try {
      connection = res.locals.connection;
      var company = new Company({ id: local_company.id });
      await company.find(connection);

      var property = new Property({ id: params.property_id, company_id: company.id });
      await property.find(connection);

      var root_path = '/v1/companies/' + hashed_cid + '/gds-integration';

      var events_to_subscribe = [
        await subscribeGDSEvent(connection, params.property_id, local_company.id, `${root_path}/phone-call-event`, 'urn:gds:schema:events:com.tenantinc:phone-call'),
        await subscribeGDSEvent(connection, params.property_id, local_company.id, `${root_path}/inbound-email`, 'urn:gds:schema:events:com.tenantinc:inbound-email'),
        await subscribeGDSEvent(connection, params.property_id, local_company.id, `${root_path}/inbound-sms`, 'urn:gds:schema:events:com.tenantinc:inbound-sms'),
        await subscribeGDSEvent(connection, params.property_id, local_company.id, `${root_path}/email-delivery`, 'urn:gds:schema:events:com.tenantinc:email-delivery'),
        await subscribeGDSEvent(connection, params.property_id, local_company.id, `${root_path}/email-bounce`, 'urn:gds:schema:events:com.tenantinc:email-bounce'),
        await subscribeGDSEvent(connection, params.property_id, local_company.id, `${root_path}/email-spam`, 'urn:gds:schema:events:com.tenantinc:email-spam'),
        await subscribeGDSEvent(connection, params.property_id, local_company.id, `${root_path}/email-open`, 'urn:gds:schema:events:com.tenantinc:email-open'),
        await subscribeGDSEvent(connection, params.property_id, local_company.id, `${root_path}/email-click`, 'urn:gds:schema:events:com.tenantinc:email-click'),
        await subscribeGDSEvent(connection, params.property_id, local_company.id, `${root_path}/update-user-verification`, 'urn:gds:schema:events:com.passport-app:user-verification-update')
      ];
      var response = await Promise.allSettled(events_to_subscribe);

      utils.send_response(res, {
        status: 200
      });

    } catch (err) {
      console.log("Error occured while subscribing gds events");
      console.log(err);
      next(err);
    }

  });

  router.get('/:property_id/tax-rates', [control.hasAccess(['admin', 'api']), Hash.unHash], async (req, res, next) => {
    var connection = res.locals.connection;
    try {
      let params = req.params;
      let company = res.locals.active;

      let property = new Property({ id: params.property_id });
      await property.find(connection);
      await property.verifyAccess({company_id: company.id, properties: res.locals.properties});
      await property.getTaxRates(connection);

      utils.send_response(res, {
        status: 200,
        data: {
          tax_rates: Hash.obscure(property.TaxRates, req)
        }
      });


    } catch (err) {
      next(err);
    }


  });

  router.get('/:property_id/tax-profiles', [control.hasAccess(['admin']), Hash.unHash], async (req, res, next) => {
    var connection = res.locals.connection;
    try {
      let params = req.params;
      let company = res.locals.active;

      let property = new Property({ id: params.property_id });
      await property.find(connection);
      await property.verifyAccess({company_id: company.id, properties: res.locals.properties});

      let taxProfiles = await property.getTaxProfiles(connection);

      utils.send_response(res, {
        status: 200,
        data: {
          tax_profiles: Hash.obscure(taxProfiles, req)
        }
      });


    } catch (err) {
      next(err);
    }


  });

  router.post('/:property_id/tax-rates', [control.hasAccess(['admin']), joiValidator.body(Schema.editTaxRate), Hash.unHash], async (req, res, next) => {
    var connection = res.locals.connection;

    try {
      let body = req.body;
      let params = req.params;
      let company = res.locals.active;

      await connection.beginTransactionAsync();

      let property = new Property({ id: params.property_id });
      await property.find(connection);
      await property.verifyAccess({company_id: company.id, properties: res.locals.properties});

      let savedTaxRates = await property.saveBulkTaxRate(connection, body.tax_rates);

      await connection.commitAsync();

      utils.send_response(res, {
        status: 200,
        data: {
          tax_rates: Hash.obscure(savedTaxRates, req)
        }
      });


    } catch (err) {
      await connection.rollbackAsync();
      next(err);
    }


  });
  // TODO WHERE is this used ? this is not standard REST format
  router.get('/list/:company_id', [control.hasAccess(['superadmin']), Hash.unHash], async (req, res, next) => {
    var connection = res.locals.connection;
    try {

      let params = req.params;
      let company = new Company({ id: params.company_id });
      await company.find(connection);

      let property_list = await Property.findListByCompanyId(connection, company.id);

      let properties = [];
      for (let i = 0; i < property_list.length; i++) {
        let property = new Property({ id: property_list[i].id });
        await property.find(connection);
        properties.push(property);
      }

      utils.send_response(res, {
        status: 200,
        data: {
          properties: Hash.obscure(properties, req)
        }
      });


    } catch (err) {
      next(err);
    }



  });

  router.get("/:property_id/files", [control.hasAccess(['admin']), Hash.unHash], async (req, res, next) => {
    var connection = res.locals.connection;

    try {
      let company = res.locals.active;
      let query = req.query

      if (('start_date' in query && !('end_date' in query)) || (!('start_date' in query) && 'end_date' in query)) {
        e.th(400, "Need both Start Date and End Date")
      }

      let params = req.params;

      let property = new Property({ id: params.property_id })
      await property.find(connection);
      await property.verifyAccess({company_id: company.id, properties: res.locals.properties});

      let response = await property.getListofFilesinGDS(company, query)

      utils.send_response(res, {
        status: 200,
        data: {
          files: response.data,
          pagination: response.pagination
        }
      })

    } catch (err) {
      next(err)
    }

  });

  router.get("/:property_id/files/:file_key", [control.hasAccess(['admin']), Hash.unHash], async (req, res, next) => {

    var connection = res.locals.connection;
    try {
      let company = res.locals.active;
      let contact = res.locals.contact;
      let params = req.params;

      let property = new Property({ id: params.property_id })
      await property.find(connection);
      await property.verifyAccess({company_id: company.id, properties: res.locals.properties});

      let file_key = params.file_key;

      let response = await property.getFilefromGDS(company, file_key)
      let updated_file = await property.updateFileGDS(company, contact, file_key)

      response.attributes.last_downloaded_on = updated_file.data.last_downloaded_on
      response.attributes.downloaded_by = updated_file.data.downloaded_by

      utils.send_response(res, {
        status: 200,
        data: {
          file: response
        }
      })

    } catch (err) {
      next(err)
    }


  });

  router.post('/:property_id/closing-day', [control.hasAccess(['admin'])], async (req, res, next) => {

    var connection = res.locals.connection;
    try {

      let contact = res.locals.contact;
      let params = Hash.clarify(req.params);
      let property = new Property({ id: params.property_id });
      let off_set = await property.getUtcOffset(connection);


      let closing_day = new ClosingDay({
        property_id: params.property_id,
        date: moment().utcOffset(parseInt(off_set)).format('YYYY-MM-DD'),
        time: moment().utcOffset(parseInt(off_set)).format("HH:mm:ss"),
        active: 1,
        created_by: contact.id
      });


      let id = await closing_day.save(connection);

      utils.send_response(res, {
        status: 200,
        data: {
          id: Hashes.encode(id, res.locals.company_id)
        },

      });

    } catch (err) {
      next(err);
    }
  });

  router.put('/:property_id/inactive-closing-day', [control.hasAccess(['admin'])], async (req, res, next) => {

    var connection = res.locals.connection;
    try {

      let params = Hash.clarify(req.params);
      let contact = res.locals.contact;

      let property = new Property({ id: params.property_id });
      let curr_date = await property.getLocalCurrentDate(connection);

      let closing_day = new ClosingDay();
      await closing_day.find(connection, {
        property_id: params.property_id,
        date: curr_date,
        active: 1
      })

      await connection.beginTransactionAsync();

      let id = await closing_day.setInactive(connection, contact.id);
      await closing_day.updateEffectiveDate(connection);

      await connection.commitAsync();

      utils.send_response(res, {
        status: 200,
        data: {
          id: Hashes.encode(id, res.locals.company_id)
        },

      });

    } catch (err) {
      await connection.rollbackAsync();
      next(err);
    }
  });

  router.get('/:property_id/transactional', [control.hasAccess(['admin']), control.hasPermission('manage_settings_bill')], async (req, res, next) => {
    var connection = res.locals.connection;

    try {
      const params = Hash.clarify(req.params);
      const company = res.locals.active;
      const { property_id } = params;
      const settings = new Settings({ company_id: company.id, property_id: property_id });
      const transactionalSettings = await settings.getTransactionalSettings(connection);
      utils.send_response(res, {
        status: 200,
        data: transactionalSettings
      });
    } catch (err) {
      next(err);
    }
  });

  router.post('/:property_id/transactional', [control.hasAccess(['admin'])], async (req, res, next) => {
    try {
      var connection = res.locals.connection;
      const params = Hash.clarify(req.params);
      const { property_id } = params;
      const company = res.locals.active;

      await connection.beginTransactionAsync();
      await Settings.saveMultiple(connection, {
        property_id: property_id,
        company_id: company.id,
        settings: req.body,
        setting_category: 'transactional',
        api_info: res
      });
      await connection.commitAsync();

      utils.send_response(res, {
        status: 200,
        data: {}
      });
    } catch (err) {
      await connection.rollbackAsync();
      next(err);
    }
  });

  router.get('/:property_id/reversal', [control.hasAccess(['admin'])], async (req, res, next) => {
    var connection = res.locals.connection;

    try {
      const params = Hash.clarify(req.params);
      const company = res.locals.active;
      const { property_id } = params;
      const reversal = new Reversal();
      const reversalSettings = await reversal.findPropertySettings(connection, { company_id: company.id, property_id: property_id });
      utils.send_response(res, {
        status: 200,
        data: {
          reversals: Hash.obscure(reversalSettings, req)
        }
      });
    } catch (err) {
      next(err);
    }
  });

  router.post('/:property_id/reversal', [control.hasAccess(['admin']), control.hasPermission('manage_settings_bill'), Hash.unHash], async (req, res, next) => {
    var connection = res.locals.connection;

    try {
      const { property_id } = req.params;
      let { body } = req;
      let company = res.locals.active;
      let reversal = new Reversal();
      await reversal.bulkSaveSettings(connection, { data: body, company, property_id });
      utils.send_response(res, {
        status: 200,
        data: {}
      });
    } catch (err) {
      await connection.rollbackAsync();
      next(err);
    }
  });

  router.get('/:property_id/documents', [control.hasAccess(['admin']), Hash.unHash], async (req, res, next) => {
    let connection = res.locals.connection;

    try {
      const company = res.locals.active;
      const { params, query } = req;

      const { property_id } = params;
      const { limit, offset, type } = query;

      const property = new Property({ id: property_id });
      await property.getGDSId(connection);

      let documentInstanceType = null;
      if (!type?.length) documentInstanceType = DocumentManager;
      const documentFactory = new DocumentFactory({ static_instance: true, type: type?.length && type[0], instance_type: documentInstanceType });
      const document = documentFactory.createDocument();

      let documents;
      let searchParams = {};
      if (documentFactory.instance_type === Document) {
        searchParams = {
          count: limit || 100,
          page: offset || 1,
        };
        type?.length ? searchParams.tag = type[0] : '';
        documents = await document.getDocuments(company, searchParams);
      } else {
        searchParams = {
          property_gds_ids: [property.gds_id]
        };
        limit ? searchParams.count = limit : '';
        offset ? searchParams.page = offset : '';
        type?.length ? searchParams.type = type : '';
        documents = await document.getDocuments(connection, company, searchParams, {
          api_info: res
        });
      }

      utils.send_response(res, {
        status: 200,
        data: { documents }
      });

    } catch (err) {
      next(err);
    }
  });

  router.delete('/:property_id/documents/:document_id', [control.hasAccess(['admin'])], async (req, res, next) => {
    let connection = res.locals.connection;

    try {
      let { params } = req;
      params = Hash.clarify(params);
      let { document_id, property_id } = params;

      const property = new Property({ id: property_id });
      await property.getGDSId(connection);

      const document = new DocumentManager({ id: document_id, Properties: [property] });
      await document.deleteProperty({
        api_info: res
      });

      utils.send_response(res, {
        status: 200,
        data: {
          document_id: document_id,
          property_id: Hashes.encode(property_id, res.locals.company_id)
        }
      });
    } catch (err) {
      next(err);
    }
  });

  router.get('/:property_id/leases', [control.hasAccess(['admin', 'api']), Hash.unHash], async (req, res, next) => {
    
    try {
      res.locals.connection = await db.exchangeForReadAccess(res.locals.connection);
      let connection = res.locals.connection;
      const { property_id } = req.params;
      let { limit, offset } = { ...utils.cleanQueryParams(req.query) };
      let searchParams = { limit, offset }

      const leases = await Lease.findAllByProperty(connection, searchParams, property_id, false);
      const totalCount = await Lease.findAllByProperty(connection, searchParams, property_id, true);

      const paging = utils.generatePagingObject(req, searchParams, totalCount, leases.length)

      utils.send_response(res, {
        status: 200,
        data: { leases: Hash.obscure(leases, req), paging }
      });

    } catch (err) {
      next(err);
    }
  });

  router.get('/:property_id/mailhouses/delivery-methods', [control.hasAccess(['admin', 'api']), Hash.unHash], async (req, res, next) => {
    let connection = res.locals.connection;

    try {
      let types = req.query.types;
	  let params = req.params
      const { property_id } = params;

	  let local_company = res.locals.active;

      let mailhouse = new Mailhouse();
      
	  let deliveryMethods = [];
	  
	  let isRpostSubscribed = await getRpostSubscription(connection, params.property_id, local_company.id);
	  let isSimpleCertifiedSubscribed = await getSimpleCertifiedSubscription(connection, params.property_id, local_company.id);
	
		if (isRpostSubscribed) {
			let rpostDeliveryMethods = await mailhouse.findRpostDeliveryMethods(connection, types)
			deliveryMethods = deliveryMethods.concat(rpostDeliveryMethods)
		}

		if (isSimpleCertifiedSubscribed) {
			let simpleCertifiedDeliveryMethods = await mailhouse.findSimpleCertifiedDeliveryMethods(connection, types)
			deliveryMethods = deliveryMethods.concat(simpleCertifiedDeliveryMethods)
		}
		let hummingbird_delivery_methods = await mailhouse.findHummingbirdDeliveryMethods(connection, types)
		deliveryMethods = deliveryMethods.concat(hummingbird_delivery_methods)

      utils.send_response(res, {
        status: 200,
        data: {
          deliveryMethods: Hash.obscure(deliveryMethods, req)
        }
      });

    } catch (err) {
      next(err);
    }
  });

  router.get('/:property_id/settings/reservation', [control.hasAccess(['admin']), Hash.unHash], async (req, res, next) => {
    const connection = res.locals.connection;

    try {
      const company = res.locals.active;
      const { property_id } = req.params;

      const reservationSettings = await Settings.getByCategory(connection, { setting_category: 'reservation', company_id: company.id, property_id });

      utils.send_response(res, {
        status: 200,
        data: reservationSettings
      });
    } catch (err) {
      next(err);
    }
  });

  router.get('/:property_id/units/rate-changes', [control.hasAccess(['admin', 'api']), Hash.unHash], async (req, res, next) => {
    let connection = res.locals.connection;
    let { property_id } = req.params
    let { limit, offset } = { ...utils.cleanQueryParams(req.query, { limit: 100 }, true) };
    let { from_date, to_date } = req.query
    let search_params = { limit, offset }
    
    try {
      if (from_date) {
        utils.validateDateFormat(from_date)
        search_params['from_date'] = from_date
      }
      if (to_date) {
        utils.validateDateFormat(to_date)
        search_params['to_date'] = to_date
        if (from_date && (moment(from_date).isAfter(to_date))) e.th(400, 'to_date must be greater than from_date')
      }

      let { data, total_records } = await Property.findUnitsRateChanges(connection, property_id, search_params)
      const paging = utils.generatePagingObject(req, search_params, total_records, data.length, true);
      utils.send_response(res, {
        status: 200,
        data: { unit_rate_changes: Hash.obscure(data, req), paging }
      });
    } catch (err) {
      next(err);
    }
  });

  router.post('/:property_id/settings/reservation', [control.hasAccess(['admin']), Hash.unHash], joiValidator.body(Schema.reservationSettings), async (req, res, next) => {
    const connection = res.locals.connection;

    try {
      const company = res.locals.active;
      const { property_id } = req.params;

      await connection.beginTransactionAsync();
      await Settings.saveMultiple(connection, {
        property_id: property_id,
        company_id: company.id,
        settings: req.body,
        setting_category: 'reservation',
        api_info: res
      });
      await connection.commitAsync();

      utils.send_response(res, {
        status: 200,
        data: {}
      });
    } catch (err) {
      next(err);
    }
  });

  router.post('/:property_id/unit-groups/:unit_group_id/rate-changes', [control.hasAccess(['admin']), Hash.unHash], joiValidator.body(Schema.unitGroupRateChange), async (req, res, next) => {

    try {
      const { api, contact, isNectarRequest, appId, active: company, connection } = res.locals;
      const price = req.body.price;
      const { property_id, unit_group_id } = req.params
  
      const unitGroup = new UnitGroup({ unit_group_hashed_id: unit_group_id })
      const rateChangedUnits = await unitGroup.bulkUpdateRateChanges(connection, price, company.id, property_id, contact.id, { isNectarRequest, appId });
      if (rateChangedUnits.length) {
        const unit_ids = rateChangedUnits.map(uid => uid.id)
        eventEmitter.emit('units_bulk_edited', { company, contact, api, units: unit_ids.join(', '), cid: res.locals.company_id, locals: res.locals });
        eventEmitter.emit('promotion_unit_update', { company, contact, units: unit_ids, cid: res.locals.company_id, locals: res.locals });
      }

      utils.send_response(res, {
        status: 200,
        data: {}
      });
    } catch (err) {
      next(err);
    }
  });

  router.get('/:property_id/unit-groups/:unit_group_id/promotions', [control.hasAccess(['admin', 'api']), Hash.unHash], async (req, res, next) => {
    let connection = res.locals.connection;
    let { property_id, unit_group_id } = req.params
    let label = req.query.label || null
    let { limit, offset } = { ...utils.cleanQueryParams(req.query, { limit: 100 }) };
    let search_params = { limit, offset }
    let data = { unit_group_id, property_id, label, limit, offset }
    try {
      let { unit_group_promos, total_records } = await Property.findUnitGroupPromos(connection, data)
      for (let promo of unit_group_promos) {
        promo['units'] = promo['units'].map(unit_id => Hashes.encode(unit_id, res.locals.company_id))
      }
      const paging = utils.generatePagingObject(req, search_params, total_records, unit_group_promos.length);
      utils.send_response(res, {
        status: 200,
        data: { unit_group_promotions: Hash.obscure(unit_group_promos, req), paging }
      });
    } catch (err) {
      next(err);
    }
  });

  router.post('/:property_id/unit-groups/:unit_group_id/promotions', [control.hasAccess(['admin', 'api']), Hash.unHash], joiValidator.body(Schema.Promotions), async (req, res, next) => {
    let connection = res.locals.connection;
    let { unit_group_id, property_id } = req.params
    let contact = res.locals.contact;
    let company = res.locals.active;
    let user = res.locals.contact || {};
    let body = req.body;
    body.created_by = user.id;
    body.label = 'promotion';
    body.pretax = 1;
    try {

      let unitGroup = new UnitGroup({ unit_group_hashed_id: unit_group_id })
      let unitGroupsUnits = await unitGroup.getAllUnits(connection);
      let promotion = new Promotion();
      let foundPromo = await Promotion.validateName(connection, body.name, company.id);
      if (foundPromo.length) {
        e.th(409, "A promotion with this name already exists. Please choose a new name.")
      }

      let promos = await Promotion.findByCompanyId(connection, company.id);

      promotion.make(connection, body, company.id, promos.length);
      await promotion.setPromoTypes(connection, body.PromotionTypes || [], company.id);
      await connection.beginTransactionAsync();
      await promotion.save(connection);
      await promotion.updateProperties(connection, [{ id: property_id }], res.locals.properties);
      for (let unit of unitGroupsUnits) {
        let data = {
          unit_id: unit.id,
          promotion_id: promotion.id,
          discount: null
        }
        await models.Promotion.savePromoUnit(connection, data);
      }

      await connection.commitAsync();


      utils.send_response(res, {
        status: 200,
        data: Hash.obscure({ id: promotion.id }, req)
      });
      eventEmitter.emit('promotion_created', { company, contact, promotion, cid: res.locals.company_id, locals: res.locals });

    } catch (err) {
      await connection.rollbackAsync();
      next(err);
    }
  });

  router.post('/delinquency-workflows', [control.hasAccess(['admin']), Hash.unHash], async(req, res, next) => {

    var connection = res.locals.connection;
    try{
        let {property_ids, trigger_group_id} = req.body;
        let data = await Property.findDelinquencyWorkflows(connection, {property_ids, trigger_group_id})

        utils.send_response(res, {
            status: 200,
            data: Hash.obscure(data, req),
            message: ''
        });

    } catch(err) {
        next(err);
    }

  });

  router.post('/:property_id/mailhouse/simple-certified', [control.hasAccess(['admin', 'api']), Hash.unHash], async (req, res, next) => {
    let connection = res.locals.connection;
    let company = res.locals.active;
    const { property_id } = req.params;
    let hashed_cid = req.originalUrl.split('/')[3];
    let root_path = '/v1/companies/' + hashed_cid + '/gds-integration';

    try {
      await subscribeSimpleCertified(connection, property_id, company.id, req.body.username, req.body.password, req.body.group_name, req.body.partner_key, req.body.client_code);

      let property = new Property({ id: property_id });
      await property.find(connection);

      let events_to_subscribe = [
        await subscribeGDSEvent(connection, property.gds_id, company.id, `${root_path}/certified-update`, 'urn:gds:schema:events:com.communication-app:certified-mail-status-update')
      ]

      await property.subscribeCertifiedEvents(connection, company.id, hashed_cid, events_to_subscribe)

      console.log("REACHED SImple certified")
      utils.send_response(res, {
        status: 200
      });

    } catch (err) {
      next(err);
    }
  });

  router.post('/mailhouse/rpost', [control.hasAccess(['admin', 'api']), Hash.unHash], async (req, res, next) => {
    let connection = res.locals.connection;
    let local_company = res.locals.active;
    let hashed_cid = req.originalUrl.split('/')[3];
    let root_path = '/v1/companies/' + hashed_cid + '/gds-integration';

    try {
      let properties = req.body.properties;
      let company = new Company({ id: local_company.id });
      company.find(connection);

      let mailhouses = []

      for (let propertyNumber = 0; propertyNumber < properties.length; propertyNumber++) {
        let propertyId = properties[propertyNumber]
        let property = new Property({ id: propertyId });

        await property.find(connection);
        await subscribeRpost(connection, property.id, company.id, req.body.username, req.body.username, req.body.password, req.body.client_id);

        let events_to_subscribe = [
          await subscribeGDSEvent(connection, property.gds_id, company.id, `${root_path}/certified-update`, 'urn:gds:schema:events:com.communication-app:rpost-status-update')
        ];

        await property.subscribeCertifiedEvents(connection, company.id, hashed_cid, events_to_subscribe)

      }



      console.log("REACHED RPOST")
      utils.send_response(res, {
        status: 200,
        data: {
          mailhouse: Hash.obscure(mailhouses, req)
        }

      });

    } catch (err) {
      next(err);
    }
  });
  router.post('/delinquency-workflows', [control.hasAccess(['admin']), Hash.unHash], async(req, res, next) => {

    var connection = res.locals.connection;
    try{
        let {property_ids, trigger_group_id} = req.body;
        let data = await Property.findDelinquencyWorkflows(connection, {property_ids, trigger_group_id})

        utils.send_response(res, {
            status: 200,
            data: Hash.obscure(data, req),
            message: ''
        });

    } catch(err) {
        next(err);
    }

  });

  router.get('/:property_id/accounting-template', [control.hasAccess(['admin']), Hash.unHash], async(req, res, next) => {

    try{
        const { connection, local_company_id} = res.locals;
        const { property_id } = req.params;

        let property = new Property({id: property_id, company_id: local_company_id});
        await property.findAccountingTemplate(connection);

        utils.send_response(res, {
            status: 200,
            data: Hash.obscure(property.PropertyAccountingTemplate, req),
            message: ''
        });

    } catch(err) {
        next(err);
    }

  });

  router.put('/:property_id/accounting-template/:accounting_template_id', [control.hasAccess(['admin']), Hash.unHash], async(req, res, next) => {

    try{
        const connection = res.locals.connection;
        const { property_id, accounting_template_id } = req.params;
        const {id: admin_id} = res.locals.contact;

        let property = new Property({id: property_id});
        await property.updateAccountingTemplate(connection, {admin_id, accounting_template_id});

        utils.send_response(res, {
            status: 200,
            data: [],
            message: 'Accounting template updated for property.'
        });

    } catch(err) {
        next(err);
    }

  });


  // generates reports at property level
  router.get('/:property_id/reports/:type', [control.hasAccess(['admin', 'api']), Hash.unHash], async (req, res, next) => {
    const connection = res.locals.connection;

    try {
      const company = res.locals.active;
      const { property_id, type } = req.params;
      if (!(res.locals.properties.includes(property_id))) e.th(403, 'You do not have access to this resource');
      let { date, space_group_id, start_date, end_date } = req.query;
      const current_date = moment.utc().format("YYYY-MM-DD");

      let reportData;
      if (type === "occupancy-statistics-report") {
        if (!space_group_id) e.th(400, "Space group id required");
        utils.validateDateFormat(date, { dateFormat: "YYYY-MM-DD", errorMessage: "Invalid date. Please enter the date in the format YYYY-MM-DD", isFutureCheck: true });
        reportData = await Report.osrReportData(connection, property_id, date, space_group_id);
      } else if (type === "management-summary") {
        utils.validateDateFormat(date, {dateFormat: "YYYY-MM-DD", errorMessage: "Invalid date. Please enter the date in the format YYYY-MM-DD", isFutureCheck: true });
        reportData = await Report.msrReportData(connection, [property_id], date, company, ENUMS.REPORTS.MSR_TYPE.CASH);
      } else if (type === "coverage-details") {
        start_date = start_date || current_date;
        end_date = end_date || current_date;
        const data = await Report.coverageDetails(connection, [property_id], res.locals.local_company_id, start_date, end_date);
        reportData = Hash.obscure(data, req)

      }

      utils.send_response(res, {
        status: 200,
        data: reportData
      });
    } catch (err) {
      next(err);
    }
  });

  router.post(
    '/:property_id/website-category-amenity',[control.hasAccess(['admin', 'api']), Hash.unHash],async (req, res, next) => {
      const connection = res.locals.connection;
      const { property_id } = req.params;
      const company = res.locals.active;
      //check access permission ?
      try {
        let websiteCategory = new WebsiteCategory({
          company_id: company.id,
          property_id: property_id,
        });
        //creates records in 'amenities' table
        await websiteCategory.create(connection); 
        //creates records in 'amentiy_property' table
        await websiteCategory.createAmenityProperty(connection); 
        //creates records in 'amenity_units' table
        await websiteCategory.createAmenityUnit(connection); 
        //creates records in 'unit_group_profiles' 'unit_group_profile_settings' 'unit_group_profile_settings_amenities' 'unit_group_profile_settings_tiers'
        await websiteCategory.createSpaceGroupProfile(connection); 
        utils.send_response(res, {
          status: 200,
          data: 'success',
          message: {
            total_units: websiteCategory?.units?.length ?? 0
          }
        });
      } catch (e) {
        next(e);
      }
    }
  );

  // get converted leads data at property level
  router.get('/:property_id/converted-leads', [control.hasAccess(['admin', 'api']), Hash.unHash], async (req, res, next) => {
    const connection = res.locals.connection;

    try {
      const company = res.locals.active;
      const { property_id } = req.params;
      let { start_date, end_date } = req.query;

      if (!(res.locals.properties.includes(property_id))) e.th(403, 'You do not have access to this resource');
      let data = await models.Lead.getConvertedLeads(connection, {company_id: company.id, property_id, start_date, end_date })

      utils.send_response(res, {
        status: 200,
        data
      });
    } catch (err) {
      next(err);
    }
  });

  return router;
};

const DocumentFactory = require('../classes/document_factory');
const DocumentManager = require('../classes/document_manager');
const Document = require('../classes/document');
const property = require('../models/property.js');
const { Console } = require('console');


