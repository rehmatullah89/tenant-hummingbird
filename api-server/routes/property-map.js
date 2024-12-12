const e = require('express');
const propertyAmenity = require('../models/space-management/property-amenity');

express = require('express');

var control  = require(__dirname + '/../modules/site_control.js');
var Hash = require(__dirname + '/../modules/hashes.js');
var Hashes = Hash.init();
var router = express.Router();
var Schema = require(__dirname + '/../validation/property-map.js');

var Asset      = require('../classes/asset.js');
var Unit      = require('../classes/unit.js');
var utils    = require(__dirname + '/../modules/utils.js');
var moment = require('moment');

var Property  = require(__dirname + '/../classes/property.js');

const joiValidator = require('express-joi-validation')({
    passError: true
});

module.exports = function(app) {

	router.get('/:property_id/units', [control.hasAccess(['admin', 'api']),  Hash.unHash], async (req, res, next) => {
		var connection = res.locals.connection;

		try {
			let company = res.locals.active;
			let api = res.locals.api;
			let params = req.params;

			let property = new Property({id: params.property_id})
			await property.find(connection);
			await property.verifyAccess({company_id: company.id, properties: res.locals.properties});

			//await property.getUnitsForPropertyMap(connection, api, params);

			await property.getAllUnits(connection, api, params);


			utils.send_response(res, {
                status: 200,
				data: {
                    units: Hash.obscure(property.Units, req),
                }
            });
		} catch (err) {
			next(err);
		}
	});

	router.get('/:property_id/searchUnits', [control.hasAccess(['admin', 'api']),  Hash.unHash], async (req, res, next) => {
		var connection = res.locals.connection;

		try {
			let company = res.locals.active;
			let api = res.locals.api;
			let params = req.params;

			let property = new Property({id: params.property_id})
			await property.find(connection);
			await property.verifyAccess({company_id: company.id, properties: res.locals.properties});

			//await property.getSpacesForPropertyMap(connection, api, params);

			console.log('API', api);

			await property.getAllUnits(connection, api, params);


			utils.send_response(res, {
                status: 200,
				data: {
                    units: Hash.obscure(property.Units, req),
                }
            });
		} catch (err) {
			next(err);
		}
	});

	router.get('/:property_id/assets', [control.hasAccess(['admin','api']), Hash.unHash], async (req, res, next ) => {
		var connection = res.locals.connection;

		try {
			let company = res.locals.active;
			let api = res.locals.api;
			let params = req.params;

			
			let property = new Property({id: params.property_id})
			await property.find(connection);
			await property.verifyAccess({company_id: company.id, properties: res.locals.properties});

			await property.getFacilityMapAssets(connection);

			utils.send_response(res, {
                status: 200,
				data: {
                    assets: Hash.obscure(property.Assets, req),
                }
            });

		} catch (err) {

		}
	});

	router.put('/units', [control.hasAccess(['admin', 'api']), Hash.unHash], async (req, res, next ) => {
		var connection = res.locals.connection;

		try {
			let company = res.locals.active;
			let api = res.locals;
			let body = req.body;
			
			for (let unitNumber = 0; unitNumber < body.units.length; unitNumber++){
				let unit = new Unit({id: body.units[unitNumber].id})
				
				await unit.find(connection);
				await unit.verifyAccess(connection, company.id, res.locals.properties);

				unit.update(body.units[unitNumber]);
				console.log(unit)
				await unit.save(connection);
			}

			utils.send_response(res, {
                status: 200,
				data: {}
            });

		} catch (err) {
			next(err);
		}
	})

	router.put('/assets', [control.hasAccess(['admin', 'api']), Hash.unHash], async (req, res, next ) => {
		var connection = res.locals.connection;

		try {
			let company = res.locals.active;
			let api = res.locals;
			let body = req.body;
			
			for (let assetNumber = 0; assetNumber < body.assets.length; assetNumber++){
				let asset = new Asset({id: body.assets[assetNumber].id})
				
				// await asset.find(connection);
				asset.update(body.assets[assetNumber]);
				console.log(asset)
				await asset.save(connection);
			}

			utils.send_response(res, {
                status: 200,
				data: {}
            });

		} catch (err) {
			next(err);
		}
	})

	router.put('/:property_id/assets', [control.hasAccess(['admin', 'api']), Hash.unHash], async (req, res, next ) => {
		var connection = res.locals.connection;
		try {
			let company = res.locals.active;
			const { body, params } = req;
			const { property_id } = params;

			let property = new Property({id: property_id});
			await property.find(connection);
			await property.verifyAccess({company_id: company.id, properties: res.locals.properties});
			const reqData = {
				property_id: property_id,
				active_asset_items: body.assets
			}
			await connection.beginTransactionAsync();
			await Asset.bulkUpdate(connection, reqData);
			await connection.commitAsync();
			utils.send_response(res, {
                status: 200,
				data: { property_id: Hashes.encode(property_id, res.locals.company_id) }
            });

		} catch (err) {
			await connection.rollbackAsync();
			next(err);
		}
	})


	router.put('/:property_id/publish', [control.hasAccess(['admin', 'api']), Hash.unHash], async (req, res, next) => {
		var connection = res.locals.connection;

		try {
			let company = res.locals.active;
			let user = res.locals.contact || {};
			let map_published_at = moment().utc().format('YYYY-MM-DD HH:mm:ss');
			let params = req.params;
			const { property_id } = params;
			let property = new Property({id: property_id});

			await property.find(connection);
			await property.verifyAccess({company_id: company.id, properties: res.locals.properties});
			await property.updateData(connection, {
				map_published_at: map_published_at,
				map_published_by: user.id
			});

			utils.send_response(res, {
				status: 200,
				data: { property_id: property_id }
			});

		} catch(err) {
			next(err);
		}
	})

    return router;
}