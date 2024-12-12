var express = require('express');
var router = express.Router({ mergeParams: true });

const HashFn = require('../modules/hashes');

var Hash = require(__dirname + '/../modules/hashes.js');
var Hashes = Hash.init();
var control  = require(__dirname + '/../modules/site_control.js');
var utils    = require(__dirname + '/../modules/utils.js');
var e  = require(__dirname + '/../modules/error_handler.js');

const joiValidator = require('express-joi-validation')({
	passError: true
});


module.exports = function () {

    router.get("/", [control.hasAccess(["admin", "api"]), Hash.unHash], async (req, res, next) => {
        const { connection, active } = res.locals;
        const { params } = req;
        let api =  res.locals.api || {};
        let property = new Property({id: params.property_id});

        try {
            let query = req.query;
            if (!query.unitGroupId) e.th(400, "UnitGroupId id not set");
            let unitGroupId = utils.restrictDuplicateQueryParams(query, "unitGroupId");

            let promotionArray = query.promotions || [];
            let amenityArray = query.amenities || [];

            if (amenityArray?.length > 0) {
                amenityArray = HashFn.clarify(JSON.parse(query.amenities), active.id);
            }
            if (promotionArray?.length > 0){
                promotionArray = HashFn.clarify(JSON.parse(query.promotions), active.id);
            }
            let spaceGroupManager = new SpaceGroup({ ...params, company_id:active.id});
            let offers = await spaceGroupManager.getOffers(
                connection,
                api,
                property,
                active.id,
                unitGroupId,
                amenityArray,
                promotionArray
            );
            utils.send_response(res, {
                status: 200,
                data: {
                    offers: Hash.obscure(offers, req),
                },
            });
        } catch (err) {
            next(err);
        }
    });

    return router;
};
  
  
  const SpaceGroup  = require(__dirname + '/../classes/space_groups.js');
  const Property  = require(__dirname + '/../classes/property.js');