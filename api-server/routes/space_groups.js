var express = require('express');
var router = express.Router({ mergeParams: true });
var moment      = require('moment');
const HashFn = require('../modules/hashes');
const { unHash, clarify, hash } = require('../modules/hashes');
const { request } = require('../modules/utils');

var settings    = require(__dirname + '/../config/settings.js');
var Hash = require(__dirname + '/../modules/hashes.js');
var Hashes = Hash.init();
var control  = require(__dirname + '/../modules/site_control.js');
var utils    = require(__dirname + '/../modules/utils.js');
var Settings  = require(__dirname + '/../classes/settings.js');

var eventEmitter = require(__dirname + '/../events/index.js');
var e  = require(__dirname + '/../modules/error_handler.js');

const joiValidator = require('express-joi-validation')({
	passError: true
});

var Schema = require(__dirname + '/../validation/settings.js');
var PromotionsSchema = require(__dirname + '/../validation/promotions.js');
var UnitSearch = require(__dirname + '/../modules/unit_searcher.js');
var db = require(__dirname + '/../modules/db_handler.js');
 

module.exports = function(app, sockets) {

 
	router.get('/', [control.hasAccess(['admin', 'api']), Hash.unHash], async (req, res, next) =>  {
		var connection = res.locals.connection;
		try{
            let company = res.locals.active;
            let params = req.params;
            
            let property = new Property({id: params.property_id })
            await property.find(connection);
            await property.verifyAccess({company_id: company.id}); 
        
            let spaceGroups = await SpaceGroup.findByProperty(connection, property.id);

            spaceGroups = spaceGroups;
            
			utils.send_response(res, {
				status: 200,
				data: {
          spaceGroups: Hash.obscure(spaceGroups, req)
				}
			});

		} catch(err){
			next(err)
		}
    });

    router.post('/', [control.hasAccess(['admin', 'api']), Hash.unHash], async (req, res, next) =>  {
      try{
          var connection = res.locals.connection;
            let company = res.locals.active;
            let cid = res.locals.company_id;
            let params = req.params;
            let body = req.body;
           body.active = 1;
            
            let property = new Property({id: params.property_id })
            await property.find(connection);
            await property.verifyAccess({company_id: company.id}); 
            body.property_id = property.id;
            let spaceGroup = new SpaceGroup(body);
            await spaceGroup.save(connection, cid);
            
			utils.send_response(res, {
				status: 200,
				data: {
                    space_group: Hash.obscure(spaceGroup, req)
				}
			});

		} catch(err){
            console.log("err", err)
			next(err)
		}
    });


    router.get('/:space_group_id', [control.hasAccess(['admin', 'api']), Hash.unHash], async (req, res, next) =>  {

      try{
          var connection = res.locals.connection;
          let company = res.locals.active;
          let params = req.params;
          let body = req.body;
          console.log("body", body)
          
          let property = new Property({id: params.property_id })
          await property.find(connection);
          await property.verifyAccess({company_id: company.id}); 
          body.property_id = property.id;
          let spaceGroup = new SpaceGroup({id: params.space_group_id});
          await spaceGroup.find(connection);



			utils.send_response(res, {
				status: 200,
				data: {
                    spaceGroup: Hash.obscure(spaceGroup, req)
				}
			});

		} catch(err){
			next(err)
		}
    });


    router.put('/:space_group_id', [control.hasAccess(['admin', 'api']), Hash.unHash], async (req, res, next) =>  {

		var connection = res.locals.connection;
		try{
            let company = res.locals.active;
            let params = req.params;
            let body = req.body;
            
            
            let property = new Property({id: params.property_id })
            await property.find(connection);
            await property.verifyAccess({company_id: company.id}); 
            body.property_id = property.id;
            let spaceGroup = new SpaceGroup({id: params.space_group_id});
            await spaceGroup.find(connection);
            if(!spaceGroup.active) e.th(404);
            spaceGroup.name = body.name;
            spaceGroup.description = body.description;
            await spaceGroup.save(connection);

			utils.send_response(res, {
				status: 200,
				data: {
                    spaceGroup: Hash.obscure(spaceGroup, req)
				}
			});

		} catch(err){
			next(err)
		}
    });


    router.delete('/:space_group_id', [control.hasAccess(['admin', 'api']), Hash.unHash], async (req, res, next) =>  {

		var connection = res.locals.connection;
		try{
            let company = res.locals.active;
            let params = req.params;
            
            let property = new Property({id: params.property_id })
            await property.find(connection);
            await property.verifyAccess({company_id: company.id}); 
            let spaceGroup = new SpaceGroup({id: params.space_group_id});
            await spaceGroup.find(connection);
            
            await spaceGroup.delete(connection);

			utils.send_response(res, {
				status: 200,
				data: {
}
			});

		} catch(err){
			next(err)
		}
    });

      router.get('/:space_group_id/groups', [control.hasAccess(['admin','api']), Hash.unHash], async (req, res, next) =>  {

        try{
          res.locals.connection = await db.exchangeForReadAccess(res.locals.connection);
          var connection = res.locals.connection;
          let api =  res.locals.api || {};
              let company = res.locals.active;
              let params = req.params;
              let query= req.query
  
              let amenities = query.amenities|| null;;
              let promotions = query.promotions|| null;
              let return_cost = query.cost || "false";
  
              if (amenities != null){
                amenities = HashFn.clarify(JSON.parse(query.amenities), res.locals.company_id);
              }
              if (promotions != null){
                promotions = HashFn.clarify(JSON.parse(query.promotions), res.locals.company_id);
              }
  
              let property = new Property({id: params.property_id })
              await property.find(connection);
              await property.verifyAccess({company_id: company.id}); 
              let spaceGroup = new SpaceGroup({id: params.space_group_id});
              await spaceGroup.find(connection);
              await spaceGroup.findGroupsSettings(connection, property);
              await spaceGroup.findGroupsBreakdown(connection, property, amenities, promotions, api, return_cost);
              utils.send_response(res, {
                status: 200,
                data: {
                 spaceGroupProfile: Hash.obscure({ ...spaceGroup.Settings, id: params.space_group_id }, req)
                }
              });
    
        } catch(err){
          next(err)
        }
        });

    router.get('/:space_group_id/settings', [control.hasAccess(['admin']), Hash.unHash], async (req, res, next) =>  {

		var connection = res.locals.connection;
		try{
          let company = res.locals.active;
          let params = req.params;
          let property = new Property({id: params.property_id })
          await property.find(connection);
          await property.verifyAccess({company_id: company.id}); 
          
          
          let spaceGroup = new SpaceGroup({id: params.space_group_id});
          await spaceGroup.find(connection);
          await spaceGroup.findSettings(connection, property);
          await spaceGroup.findBreakdown(connection);
          

      
          utils.send_response(res, {
            status: 200,
            data: {
              spaceGroupSettings: Hash.obscure(spaceGroup.Settings, req)
            }
          });

		} catch(err){
			next(err)
		}
    });

    router.get('/:space_group_id/settings/:space_type', [control.hasAccess(['admin']), Hash.unHash], async (req, res, next) =>  {

      var connection = res.locals.connection;
      try{
          let company = res.locals.active;

          let property = new Property({id: params.property_id })
          await property.find(connection);
          await property.verifyAccess({company_id: company.id}); 
          body.property_id = property.id;
          let spaceGroup = new SpaceGroup({id: params.space_group_id});
          await spaceGroup.find(connection);
          
          await spaceGroup.findSettingsBySpaceTypeId(connection, params.space_type_id);


          utils.send_response(res, {
            status: 200,
            data: {
            }
          });

      } catch(err){
        next(err)
      }
    });


    router.put('/:space_group_id/settings/:space_type',  [control.hasAccess(['admin', 'api']), Hash.unHash], async (req, res, next) =>  {

      var connection = res.locals.connection;
      try{
              let company = res.locals.active;
              let params = req.params;
              let body = req.body; 
              let property = new Property({id: params.property_id })
              await property.find(connection);
              await property.verifyAccess({company_id: company.id}); 
              body.property_id = property.id;
              let spaceGroup = new SpaceGroup({id: params.space_group_id});
              
              await spaceGroup.find(connection);
              
              await connection.beginTransactionAsync();
              if(!spaceGroup.active) e.th(404);
              
              spaceGroup.name = body.name;
              spaceGroup.description = body.description;
              await spaceGroup.save(connection);
              await spaceGroup.findSettings(connection, property);
              // dynamo company id is passed to get the connection on worker
              await spaceGroup.saveSettings(connection, body, params.space_type, connection.cid);
              await connection.commitAsync();


        utils.send_response(res, {
          status: 200,
          data: {
              spaceGroup: Hash.obscure(spaceGroup, req)
          }
        });

      } catch(err){
        connection.rollbackAsync();
        next(err)
      }
    });
    
    
    router.get('/:space_type/default-tiers', [control.hasAccess(['admin', 'api']), Hash.unHash], async (req, res, next) =>  {

      var connection = res.locals.connection;
      try{
          let company = res.locals.active;
          let params = req.params;

          let property = new Property({id: params.property_id })
          await property.find(connection);
          await property.verifyAccess({company_id: company.id}); 
          
          let tiers = await SpaceGroup.findDefaultTiers(connection, property.id, params.space_type );
          console.log("tiers", tiers)


          utils.send_response(res, {
            status: 200,
            data: {
              tiers
            }
          });

      } catch(err){
        next(err)
      }
    });

    /**
    * @description get rate management configuration of that space-group
    */
    router.get(
      '/:space_group_tier_hash/promotions',
      [control.hasAccess(['admin', 'api']), Hash.unHash],
      async (req, res, next) => {
          const { connection, active } = res.locals
          try {
              let SpaceGroupPromotionManager = new SpaceGroupPromotions({ ...req.params, company_id: active.id })

              // basic validation checks
              await SpaceGroupPromotionManager.validate(connection)

              let response = await SpaceGroupPromotionManager.get(connection)

              utils.send_response(res, {
                  status: 200,
                  data: { promotions: Hash.obscure(response, req) }
              })
          } catch (error) {
              next(error)
          }
      }
    )

    /**
    * @description this will create/update value pricing configuration.
    */
    router.put(
      '/:space_group_tier_hash/promotions',
      [control.hasAccess(['admin']), joiValidator.body(PromotionsSchema.createSpaceGroupPromotions), Hash.unHash],
      async (req, res, next) => {
          const { connection, active } = res.locals
          const { params, body } = req
          try {
              const SpaceGroupPromotionManager = new SpaceGroupPromotions({ ...params, company_id: active.id }, body)

              await SpaceGroupPromotionManager.validateRequestBody(connection)

              let response = await SpaceGroupPromotionManager.saveOrUpdate(connection)

              utils.send_response(res, {
                  status: 200,
                  data: { promotions: Hash.obscure(response, req) }
              })
          } catch (error) {
              next(error)
          }
      }
    )

	return router;

};

const SpaceGroupPromotions = require(__dirname + '/../classes/space-group-management/promotions.js')
const SpaceGroup  = require(__dirname + '/../classes/space_groups.js');
const Property  = require(__dirname + '/../classes/property.js');