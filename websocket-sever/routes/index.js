const express = require('express');

const router = express.Router();
const Auth = require('../modules/auth');
const e = require('../modules/error_handler');

module.exports = (app, sockets) => {
	app.get('/v1/', async (req, res) => {
		res.json({
			status: 200,
		});
	});

	router.get('/logged-in', async (req, res, next) => {
		try {
			const decoded = await Auth.checkToken();

			res.json({
				status: 200,
				data: {
					contact: decoded.contact,
					active: decoded.active,
					properties: decoded.properties,
				},
			});
		} catch (err) {
			console.log(err);
			next(err);
		}
	});

	router.post('/event', async (req, res, next) => {
		try {
			const isConnected = sockets.isConnected(req.body.contact_id);
			console.log('req.body', req.body);
			console.log('sockets.isConnected(req.body.contact_id)', isConnected);

			sockets.sendAlert(
				req.body.type,
				req.body.contact_id,
				req.body.payload,
				isConnected
			);

			res.json({
				status: 200,
			});
		} catch (err) {
			console.log(err);
			next(err);
		}
	});

	/* eslint consistent-return: 0 */
	router.get('/is-connected/:contact_id', async (req, res, next) => {
		try {
			const connection = sockets.isConnected(req.params.contact_id);

			if (connection) {
				return res.json({
					status: 200,
					message: 'Socket Connected',
				});
			}

			e.th(401, 'Not connected');
		} catch (err) {
			console.log(err);
			next(err);
		}
	});

	router.get('/is-connected/contact/:contact_id', async (req, res, next) => {
		try {
			const connection = sockets.isConnected(req.params.contact_id);

			if (connection) {
				return res.json({
					status: 200,
					data: {
						isConnected: true
					},
					message: 'Socket Connected',
				});
			}

			return res.json({
				status: 200,
				data: {
					connected: false
				},
				message: 'Socket is not connected',
			});

		} catch (err) {
			console.log(err);
			next(err);
		}
	});

	return router;
};
