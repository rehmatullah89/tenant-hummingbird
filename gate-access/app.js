if (process.env.NEW_RELIC_LICENSE_KEY) {
	require('newrelic')
}

// Express APP setup
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const onFinished = require('on-finished');
const utils = require(__dirname + '/modules/utils.js');
const { v4: uuidv4 } = require('uuid');
require('console-stamp')(console, '[mmm dd yyyy HH:MM:ss.l]');
const morgan = require('morgan');
const logger = require(__dirname + '/modules/logger.js')

const app = express();


var session = require('cls-hooked').createNamespace('gatePortals')


var http = require('http').Server(app);

app.use(morgan('dev'));
app.use(bodyParser.urlencoded({ limit: '50mb', extended: true }));
app.use(bodyParser.json({limit: '50mb'}));
app.use(bodyParser.raw({ inflate: true, type: 'text/plain' }));

// Things that should be in the route files
 
// MYSQL CLIENT SETUP
const pool = require(__dirname + '/modules/db.js'); 

 
// GET Some ID from route and build the class here. before passing it along.
app.use(function(req, res, next) {
    session.bindEmitter(req);
    session.bindEmitter(res);

	res.locals.request_id = uuidv4();
	res.set('X-tenant-request-id', res.locals.request_id)
	res.locals.trace_id = req.headers["X-storageapi-trace-id"] || res.locals.request_id;

	//logging
	res.locals.logging = {
		endpoint: req.url,
		ip: req.ip,
		method: req.method,
		request: req.body,
		headers: req.headers,
		query: req.query,
		error: null,
		timing_start: Date.now(),
		trace_id: res.locals.trace_id
	};

    session.run(function() {
      session.set('transaction', res.locals.logging);
      next();
    });
  });

app.use('/v1/*',  async (req, res, next) => {

	// set up logging
	res.locals.logging = {
		endpoint: req.baseUrl,
		ip: req.ip,
		method: req.method,
		request: req.body,
		headers: req.headers,
		query: req.query,
		error: null,
		timing_start: Date.now(),
		step_timer: [],
	};

	res.fns = {
		addStep: (name) => res.locals.logging.step_timer.push({ [name] : Date.now() -  res.locals.logging.timing_start })
	  }
	res.locals.origin = req.headers.origin;
	res.locals.request_id = req.headers["X-storageapi-request-id"] || uuidv4();
	res.locals.trace_id = req.headers["X-storageapi-trace-id"] || res.locals.request_id;


	res.locals.timing = Date.now();
	try{
		req.connection = await pool.getConnectionAsync();
	} catch(err){
		logger.error("there was a connection error: " + err)
		next(err)
	}

	

	onFinished(req, async (err, req) => {
		await utils.closeConnection(pool, req.connection);
		if (process.env.NODE_ENV === 'test' || process.env.NODE_ENV === 'local') return;
		let logs = {}
		try{
		  res.locals.logging.timing = Date.now() - res.locals.logging.timing_start;
		  logs = {
			...res.locals.logging,
			company_id: res.locals.active?.id,
			response: res.locals.response
		  };
		  await utils.sendLogsToGDS(logs, res.locals.origin, logs.error ? 'error': 'info', res.locals.request_id,  res.locals.trace_id);
		} catch(err){
			console.log("Error in sending logs to GDS: ", logs, "trace_id:", res.locals.trace_id, err);
		}
	})

	next();
});

app.use('/v1/', require('./routes')(app));
app.use('/v1/facilities/:facility_id/spaces', require('./routes/spaces')(app));
app.use('/v1/facilities/:facility_id/groups', require('./routes/groups')(app));
app.use('/v1/facilities/:facility_id/gates', require('./routes/gates')(app));
app.use('/v1/facilities/:facility_id/areas', require('./routes/areas')(app));
app.use('/v1/companies', require('./routes/companies')(app));
app.use('/v1/facilities/:facility_id/users', require('./routes/users')(app));
app.use('/v1/facilities/', require('./routes/facilities')(app));

app.use(function(req, res, next) {
	console.log("ROUTE NOT FOUND");
	var err = new Error('404 Not Found');
	err.code = 404;
	next(err);
});

app.use((err, req, res, next) => {

	logger.error("ERROR ", err);
	logger.debug("ERROR CODEZZZ", err.code);
	logger.debug(err.stack);
	
	if (res.headersSent) {
	 console.log("use default error handler");
	 return next(err)
 }
	if (err.isBoom) {
		logger.debug("Boom error")
		return res.status(err.output.statusCode).json({
			status: err.output.statusCode,
			data:{},
			msg: err.data.reduce( (a,b) =>  a += b.message + '. ', '' )
		});
	} else if(err.error && err.error.isJoi) {
		logger.debug("using Joi")
		var errorString = '';
		err.error.details.forEach(e =>{
			errorString += e.message + '; ';
		});
		res.status(400).json({
			status: 400,
			data:{},
			msg: errorString
		});
	} else if(err.sqlMessage && err.sqlState) {
		// log the error
		logger.debug("sql error")
		res.status(500).json({
			status: 500,
			data:{},
			msg: "An application error has occurred."
		});
	} else {
		var code = err.code || 500;
		res.status(code).json({
			status: code,
			data:{},
			msg: err.message || 'internal server error'
		});
	}

	res.locals.logging.error = err;
});

// exception handler
	process.on('uncaughtException', function (err) {
	  logger.error('-------------------------- Caught exception: ' + err);
	    app.use(function(err, req, res, next){
	        res.render('500');
	    });
	});

if (typeof(PhusionPassenger) != 'undefined') {
	logger.info("THIS IS PASSENGER");
	http.listen('passenger');

} else {

	logger.info("THIS IS NOT PASSENGER");
	logger.info("listening on port: " + process.env.PORT) 
	http.listen(process.env.GATE_PORT);
	// https.listen(443);
}
