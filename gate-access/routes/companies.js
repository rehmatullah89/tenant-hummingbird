const express = require('express');
const router = express.Router();
const CompanyService = require('../services/companyService');
const pool = require('../modules/db.js');
const utils    = require('../modules/utils.js');


module.exports = app => {


	app.post('/v1/companies/', async (req,res, next) => {

		try{
			const company = new CompanyService({name: req.body.name, active: 1});

			await company.validateName( req.connection );
			await company.generateApiKey( );
			await company.save( req.connection );
			// await company.createDefaultArea( req.connection );
			// await company.createDefaultGate( req.connection );
			// await company.createDefaultTimes( req.connection );
			// await company.createDefaultGroup( req.connection );
			res.json({
				status: 200,
				data: {
					company: company
				}
			});
		} catch(err){
			console.log(err);
			next(err);
		}
		await utils.closeConnection(pool, req.connection);
	});


	return router;

}