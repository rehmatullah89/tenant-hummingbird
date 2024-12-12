const express = require('express');
const router = express.Router();
const pool = require('../modules/db.js');
const utils    = require('../modules/utils.js');

const GateService = require('../services/gateService');

module.exports = function(app) {

	app.get('/v1/', async (req,res) => {
        res.json({
            status: 200
		});
		await utils.closeConnection(pool, req.connection);
    });

    // Gets a list of all gate vendors
	app.get('/v1/gate-vendors',  async (req,res, next) => {
		try{
			const gateVendors = await GateService.findAllGateVendors( req.connection );
			res.json({
				status: 200,
				data: {
					gateVendors
				}
			});
		} catch(err){
			next(err);
		}
		await utils.closeConnection(pool, req.connection);
	});

    return router;

}
