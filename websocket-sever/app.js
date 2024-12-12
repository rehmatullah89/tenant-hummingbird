// Express APP setup
const express = require('express');
const bodyParser = require('body-parser');

const app = express();
const http = require('http').Server(app);
const io = require('socket.io')(http);

app.use(bodyParser.urlencoded({ limit: '50mb', extended: true }));
app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.raw({ inflate: true, type: 'text/plain' }));

app.use((req, res, next) => {
	res.header('Access-Control-Allow-Origin', req.headers.origin);
	res.header('Access-Control-Allow-Credentials', 'true');
	res.header(
		'Access-Control-Allow-Methods',
		'GET,HEAD,OPTIONS,POST,PATCH,PUT,DELETE'
	);
	res.header('Access-Control-Expose-Headers', 'Content-Length');
	res.header(
		'Access-Control-Allow-Headers',
		'Access-Control-Allow-Origin, Origin, Referrer-Policy, X-Requested-With, Content-Type, Accept, Authorization, Cache-Control, Range'
	);

	if (req.method === 'OPTIONS') {
		return res.sendStatus(200);
	}
	return next();
});

// Scoket Connection
const sockets = require('./modules/sockets');

sockets.init(io);
sockets.connect();

app.use('/v1/', require('./routes')(app, sockets));

app.use((req, res, next) => {
	const err = new Error('404 Not Found');
	err.code = 404;
	next(err);
});

app.use((err, req, res, next) => {
	console.log('ERROR ', err);
	console.log('ERROR CODEZZZ', err.code);
	console.log(err.stack);
	if (res.headersSent) {
		console.log('use default error handler');
		return next(err);
	}
	if (err.isBoom) {
		console.log('Boom error');
		return res.status(err.output.statusCode).json({
			status: err.output.statusCode,
			data: {},
			msg: err.data.reduce((a, b) => ` ${a}${b.message}. `, ''),
		});
	}
	if (err.error && err.error.isJoi) {
		console.log('using Joi');
		let errorString = '';
		err.error.details.forEach((e) => {
			errorString += `${e.message}; `;
		});
		return res.status(400).json({
			status: 400,
			data: {},
			msg: errorString,
		});
	}
	if (err.sqlMessage && err.sqlState) {
		// log the error
		console.log('sql error');
		return res.status(500).json({
			status: 500,
			data: {},
			msg: 'An application error has occurred.',
		});
	}

	const code = err.code || 500;
	return res.status(code).json({
		status: code,
		data: {},
		msg: err.message || 'internal server error',
	});
});

// exception handler
process.on('uncaughtException', (err) => {
	console.log(`-------------------------- Caught exception: ${err}`);
	app.use((error, req, res) => {
		res.render('500');
	});
});

if (typeof PhusionPassenger !== 'undefined') {
	console.log('THIS IS PASSENGER');
	http.listen('passenger');
} else {
	console.log('THIS IS NOT PASSENGER');
	console.log(`listening on port: ${process.env.SOCKET_PORT}`);
	http.listen(process.env.SOCKET_PORT);
	// https.listen(443);
}
