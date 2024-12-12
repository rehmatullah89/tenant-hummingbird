var express = require('express');
var router = express.Router();
var models = require(__dirname + '/../models');
var utils    = require(__dirname + '/../modules/utils.js');
var control  = require(__dirname + '/../modules/site_control.js');
var ENUMS = require(__dirname + '/../modules/enums.js');
var Hash = require(__dirname + '/../modules/hashes.js');
var Hashes = Hash.init();

module.exports = function(app, sockets) {

    router.get('/',  [control.hasAccess(['admin', 'api']), Hash.unHash], async(req, res, next) => {
        try{
            let company = res.locals.active;
            var connection = res.locals.connection;

            let spaceMix = [];
            spaceMix = spaceMix.concat(await models.Unit.getUnitOptionsByCategory(connection, company.id));

            spaceMix = Hash.obscure(spaceMix, req);

            for(let i = 0; i < spaceMix.length; i++ ){
                spaceMix[i].id = utils.base64Encode(`${ENUMS.SPACETYPE[spaceMix[i].unit_type.toUpperCase()]},${spaceMix[i].spacemix_category_id},${spaceMix[i].width},${spaceMix[i].length},${spaceMix[i].height}`);
                spaceMix[i].category_id = Hashes.encode(spaceMix[i].spacemix_category_id, res.locals.company_id);
            }

            utils.send_response(res, {
                status: 200,
                data: {
                  space_mix: spaceMix
                }
            });


        } catch(err) {
            next(err);
        }

    });

    return router;
}
