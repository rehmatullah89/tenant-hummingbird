var express = require('express');
var router = express.Router();
var moment      = require('moment');
var settings    = require(__dirname + '/../config/settings.js');
var Hash = require(__dirname + '/../modules/hashes.js');
var Hashes = Hash.init();
var response = {};
var control  = require(__dirname + '/../modules/site_control.js');
var Promise = require('bluebird');
var validator = require('validator');
var utils    = require(__dirname + '/../modules/utils.js');
var models = require(__dirname + '/../models');
var e  = require(__dirname + '/../modules/error_handler.js');
var Activity = require(__dirname + '/../classes/activity.js');

var Schema = require(__dirname + '/../validation/promotions.js');
const joiValidator = require('express-joi-validation')({
    passError: true
});

var eventEmitter = require(__dirname + '/../events/index.js');

module.exports = function(app) {

    router.get('/', [control.hasAccess(['admin', 'api']), Hash.unHash],  async (req, res, next) => {
        console.log(res.locals.properties, "res.locals.properties");
        try{
            var connection = res.locals.connection;
            let promotions = [];
            let company = res.locals.active;
            let query = req.query;
            let promotions_list = await Promotion.findByCompanyId(connection, company.id, query);
            let dbPromotions = promotions_list || [];
            for(let i = 0; i < dbPromotions.length; i++){
                let promotion = new Promotion(promotions_list[i]);
                await promotion.find(connection);
                await promotion.findPromoTypesByPromotionId(connection);
                await promotion.findPromoRulesByPromotionId(connection);
                await promotion.formatPromoRules(connection);
                await promotion.getProperties(connection, res.locals.properties);

                const transformedData = promotion.transformData();
                console.log("PROMOTION: ", transformedData);
                promotions.push(transformedData);
            }

            utils.send_response(res, {
                status: 200,
                data: {
                    promotions: Hash.obscure(promotions, req)
                }
            });


        } catch(err) {
            next(err);
        }



    });

    router.get('/types', [control.hasAccess(['admin', 'api']), Hash.unHash],  async (req, res, next) => {


        try{

          var connection = res.locals.connection;
            let company = res.locals.active;

            let promotion_types = await Promotion.findTypes(connection, company.id );

            utils.send_response(res, {
                status: 200,
                data: {
                    promotion_types: Hash.obscure(promotion_types, req)
                }
            });


        } catch(err) {
            next(err);
        }



    });

    router.post('/', [control.hasAccess(['admin']), joiValidator.body(Schema.create), control.hasPermission('manage_promotions'), Hash.unHash], async(req, res, next) =>{

        try{

            var connection = res.locals.connection;
            let contact = res.locals.contact;
            let company = res.locals.active;
            let user = res.locals.contact || {};

            let body = req.body;
            let params = req.params;
            body.created_by = user.id;

            let promotion = new Promotion();

            let foundPromo = await Promotion.validateName(connection, body.name, company.id);
            if(foundPromo.length) {
                e.th(409, "A promotion with this name already exists. Please choose a new name.")
            }

            let promos = await Promotion.findByCompanyId(connection, company.id);

            promotion.make(connection, body, company.id, promos.length);
            await promotion.setPromoTypes(connection, body.PromotionTypes || [], company.id);
            await promotion.setPromoRules(body.PromotionRules || []);


            await connection.beginTransactionAsync();
            await promotion.save(connection);
            await promotion.updateProperties(connection, body.Properties, res.locals.properties);
            await connection.commitAsync();

            utils.send_response(res, {
                status: 200,
                data: {
                    promotion_id: Hashes.encode(promotion.id, res.locals.company_id)
                }
            });

            eventEmitter.emit('promotion_created', {company, contact, promotion, cid: res.locals.company_id, locals: res.locals});


        } catch(err) {
            await connection.rollbackAsync();
            next(err);
        }



    });

    router.put('/:promotion_id', [control.hasAccess(['admin']), control.hasPermission('manage_promotions'), joiValidator.body(Schema.create), Hash.unHash], async (req, res, next) => {

        try{

            var connection = res.locals.connection;
            let contact = res.locals.contact;
            let company = res.locals.active;

            let body = req.body;
            body.PromotionTypes = body.PromotionTypes || [];
            body.PromotionRules = body.PromotionRules || [];
            let params = req.params;

            let promotion = new Promotion({id: params.promotion_id});
            await promotion.find(connection)

            await promotion.verifyAccess(company.id);

            if(promotion.name != body.name){
                let foundPromo = await Promotion.validateName(connection, body.name, company.id, promotion.id);
                if(foundPromo.length) {
                    e.th(409, "A promotion with this name already exists. Please choose a new name.")
                }
            }

            await connection.beginTransactionAsync();


            await promotion.removePromoTypes(connection, body.PromotionTypes.map(pt => pt.promotion_type_id));
            await promotion.removePromoRules(connection, body.PromotionRules.filter(pt => pt.id).map(pt => pt.id));

            await promotion.findPromoTypesByPromotionId(connection);
            await promotion.findPromoRulesByPromotionId(connection);

            promotion.update(body);

            await promotion.setPromoTypes(connection, body.PromotionTypes, company.id);
            await promotion.setPromoRules(body.PromotionRules || []);

            await promotion.save(connection);

            await promotion.updateProperties(connection, body.Properties, res.locals.properties);

            await connection.commitAsync();

            utils.send_response(res, {
                status: 200,
                data: {
                    promotion_id: Hashes.encode(promotion.id, res.locals.company_id)
                }

            });

            eventEmitter.emit('promotion_updated', {company, contact, promotion, cid: res.locals.company_id, locals: res.locals});


        } catch(err) {
            await connection.rollbackAsync();
            next(err);
        }


    });

    router.put('/:promotion_id/status', [control.hasAccess(['admin']), Hash.unHash], async (req, res, next) => {

        var connection = res.locals.connection;
        try{
            
            let contact = res.locals.contact;
            let company = res.locals.active;
            let body = req.body;
            let api = res.locals.api;

            utils.hasPermission({connection, company_id: company.id, contact_id: contact.id, api, permissions: ['enable_promotions', 'manage_promotions']});

            let params = req.params;

            let promotion = new Promotion({id: params.promotion_id});

            await promotion.updateEnable(connection, body.enable);

            utils.send_response(res, {
                status: 200,
                data: {
                    promotion_id: Hashes.encode(promotion.id, res.locals.company_id)
                }

            });

            eventEmitter.emit('promotion_updated', {company, contact, promotion, cid: res.locals.company_id, locals: res.locals});


        } catch(err) {
            await connection.rollbackAsync();
            next(err);
        }


    });

    router.delete('/:promotion_id', [control.hasAccess(['admin']), control.hasPermission('manage_promotions'), Hash.unHash], async (req, res, next) => {

        try{

           var connection = res.locals.connection;
            let contact = res.locals.contact
            let company = res.locals.active;

            let body = req.body;
            let params = req.params;

            let promotion = new Promotion({id: params.promotion_id});
            await promotion.find(connection);
            await promotion.verifyAccess(company.id);
            await promotion.delete(connection);

            utils.send_response(res, {
                status: 200,
                data: {}
            });

            eventEmitter.emit('promotion_deleted', {company, contact, promotion, cid: res.locals.company_id, locals: res.locals});


        } catch(err) {
            next(err);
        }



    });

    router.post('/sort', [control.hasAccess(['admin']), joiValidator.body(Schema.sort), control.hasPermission('manage_promotions'), Hash.unHash], async (req, res, next) => {

        try{

            var connection = res.locals.connection;
            let contact = res.locals.contact
            let company = res.locals.active;

            let body = req.body;
            let params = req.params;

            for(let i = 0; i < body.promotions.length; i++ ){
                let promotion = new Promotion({id: body.promotions[i].id });
                await promotion.find(connection);
                await promotion.verifyAccess(company.id);
                promotion.sort = i;
                await promotion.save(connection);

            }

            utils.send_response(res, {
                status: 200,
                data: {
                }

            });

            eventEmitter.emit('promotions_sorted', {company, contact, cid: res.locals.company_id, locals: res.locals});


        } catch(err) {
            next(err);
        }



    });
    
    router.get('/sold', [control.hasAccess(['admin', 'api']), Hash.unHash], async (req, res, next) => {
      try {

        const query = req.query;
        const company = res.locals.active;
        const connection = res.locals.connection;
        let searchParams = {};
        let { limit, offset } = { ...utils.cleanQueryParams(query) };
        searchParams = { limit, offset }
        searchParams.from_date = query.from_date || "";
        searchParams.to_date = query.to_date || "";
        searchParams.property_id = query.property_id || "";

        const promotionsSold = await Promotion.getPromotionsSold(connection, company.id, searchParams, false)
        const promotionsSoldCount = await Promotion.getPromotionsSold(connection, company.id, searchParams, true)
        if (searchParams.property_id) {
            // encrypting for paging
          if (Array.isArray(searchParams.property_id) && searchParams.property_id.length) {
            let tempProperties = []
            for (let propertyId of searchParams.property_id) {
              tempProperties.push(Hashes.encode(propertyId, company.id));
            }
            searchParams.property_id = tempProperties;
          } else {
            searchParams["property_id"] = Hashes.encode(searchParams.property_id, company.id)
          }
        }
        const paging = utils.generatePagingObject(req, searchParams, promotionsSoldCount, promotionsSold.length);

        utils.send_response(res, {
          status: 200,
          data: {
            promotions: Hash.obscure(promotionsSold, req),
            paging
          }
        })
      } catch (err) {
        next(err)
      }
    });

    router.get('/:promotion_id/coupons', [control.hasAccess(['admin', 'api']), Hash.unHash], async (req, res, next) => {

        try{

            var connection = res.locals.connection;
            let contact = res.locals.contact;
            let company = res.locals.active;

            let params = req.params;

            let promotion = new Promotion({id: params.promotion_id});

            await promotion.find(connection);
            await promotion.verifyAccess(company.id);
            await promotion.findCoupons(connection);

            utils.send_response(res, {
                status: 200,
                data: {
                    coupons: Hash.obscure(promotion.Coupons, req)
                }

            });


        } catch(err) {
            next(err);
        }


    });

    router.post('/:promotion_id/coupons', [control.hasAccess(['admin', 'api']), joiValidator.body(Schema.coupon), control.hasPermission('manage_promotions'), Hash.unHash], async (req, res, next) => {

        try{

            var connection = res.locals.connection;
            let contact = res.locals.contact;
            let company = res.locals.active;

            let body = req.body;
            let params = req.params;

            let promotion = new Promotion({id: params.promotion_id});

            await promotion.find(connection);
            await promotion.verifyAccess(company.id);
            await promotion.verifyUniqueCouponCode(connection, body.code, null, company.id);

            let coupon  = await promotion.saveCoupon(connection, body);


            utils.send_response(res, {
                status: 200,
                data: {
                    coupon_id: Hashes.encode(coupon.id, res.locals.company_id)
                }

            });


            eventEmitter.emit('coupon_created', {company, contact, promotion, coupon, cid: res.locals.company_id, locals: res.locals});

        } catch(err) {
            next(err);
        }


    });

    router.put('/:promotion_id/coupons/:coupon_id', [control.hasAccess(['admin', 'api']), joiValidator.body(Schema.coupon), control.hasPermission('manage_promotions'), Hash.unHash], async (req, res, next) => {

        try{

            var connection = res.locals.connection;
            let contact = res.locals.contact;
            let company = res.locals.active;

            let body = req.body;
            let params = req.params;

            let promotion = new Promotion({id: params.promotion_id});

            await promotion.find(connection);
            await promotion.verifyAccess(company.id);

            let coupon = await promotion.findCoupon(connection, params.coupon_id);
            coupon = promotion.updateCoupon(connection, coupon, body);

            await promotion.saveCoupon(connection, body,  params.coupon_id);

            utils.send_response(res, {
                status: 200,
                data: {
                    coupon_id: Hashes.encode(coupon.id, res.locals.company_id)
                }

            });


            eventEmitter.emit('coupon_created', {company, contact, promotion, coupon, cid: res.locals.company_id, locals: res.locals});

        } catch(err) {
            next(err);
        }


    });

    router.get('/:promotion_id', [control.hasAccess(['admin', 'api']), Hash.unHash], async (req, res, next) => {

        try{

            var connection = res.locals.connection;
            let contact = res.locals.contact
            let company = res.locals.active;

            let body = req.body;
            let params = req.params;

            let promotion = new Promotion({id: params.promotion_id});

            await promotion.find(connection);
            await promotion.verifyAccess(company.id);
            await promotion.findPromoTypesByPromotionId(connection);
            await promotion.findPromoRulesByPromotionId(connection);
            await promotion.formatPromoRules(connection);

            utils.send_response(res, {
                status: 200,
                data: {
                    promotion: Hash.obscure(promotion, req)
                }
            });


        } catch(err) {
            next(err);
        }


    });

    


    return router;
};

var Promotion = require(__dirname + '/../classes/promotion.js');
var Discount = require(__dirname + '/../classes/discount.js');
