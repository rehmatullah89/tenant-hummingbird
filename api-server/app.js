if (process.env.NEW_RELIC_LICENSE_KEY) {
  require('newrelic')
}

var express = require('express');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
// var kafkaLogger = require('./modules/kafka_logger')
//add timestamps in front of log messages
require('console-stamp')(console, '[HH:MM:ss.l]');
var Promise = require('bluebird');
var logger = require('morgan');
var multer = require('multer');
var setResHeaders = require('./middlewares/setResHeaders');

var helmet = require('helmet');

const bullmq = require('./modules/bullmq');
// initiate hummingbird queue
bullmq.init();

const utils = require(__dirname + '/modules/utils.js');
const { v4: uuidv4 } = require('uuid');
// var Hash = require(__dirname + '/modules/hashes.js');
// var Hashes = Hash.init(); 
var clsContext = require(__dirname + '/modules/cls_context.js');
let eventEmitter = null;

var control = require(__dirname + '/modules/site_control.js');
var onFinished = require('on-finished');
var app = express(); 
//let redshift = require(__dirname + '/modules/redshift.js');

app.use(helmet.hidePoweredBy());

app.enable('trust proxy');
var e = require(__dirname + '/modules/error_handler.js');

// const ca = fs.readFileSync('/etc/letsencrypt/live/api.leasecaptain.xyz/chain.pem', 'utf8');

var http = require('http').Server(app);
var https = require('https');
var io;
const os = require('os');

const Property = require(__dirname + '/classes/property');


let dynamo = require(__dirname + '/modules/dynamo_data.js');
var db = require(__dirname + '/modules/db_handler.js');



(async () => {
  /* only call dynamo init if on local or test server */
  if (process.env.NODE_ENV === 'local') {
    await dynamo.init();
  }

  if (process.env.NODE_ENV !== 'test') {
    await db.init();
    await db.init_propay_db();
    // if(process.env.NODE_ENV !== "local"){
    //   await db.initRedshift();
    // }
  }
})();

//TODO  what??????
if (typeof (PhusionPassenger) != 'undefined') {
  io = require('socket.io')(http);
} else {
  io = require('socket.io')(http);
}

// access control headers
app.use(setResHeaders);

var sockets = require('./modules/sockets.js');
sockets.init(io);
sockets.connect();

        /*res.fns = { 
          addStep: (name) => res.locals.logging.step_timer.push({ [name] : Date.now() -  res.locals.logging.timing_start })
        }*/

var settings = require('./config/settings.js');

app.locals.public = settings.public; 
app.locals.moment = require('moment');
app.locals.config = settings.config;

app.use(logger('dev'));
app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.json({ limit: '50mb', type: 'application/*+json' }));
app.use(bodyParser.urlencoded({ limit: '50mb', extended: true }));
app.use(bodyParser.raw({ inflate: true, type: 'text/plain' }));

app.use(cookieParser());
app.use(express.static(__dirname + '/public', { dotfiles: 'allow' }));
app.use(multer({ dest: './uploads/' }));


var request_context = require(__dirname + '/modules/request_context.js');
app.use(request_context.Middleware());

var test = false;

if (require.main !== module) {
  test = true;
}
 
app.use((req, res, next) => clsContext.addMiddleware(req, res, next));

app.use('/v1/', require('./routes/unauthenticated')(app, sockets));

app.use('*', async (req, res, next) => {
  // set up logging
  console.log("getting through");

  res.locals.logging = {
    host_machine_name: os.hostname() || null,
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
    addStep: (name) => res.locals.logging.step_timer.push({ [name]: Date.now() - res.locals.logging.timing_start })
  }
  res.locals.origin = req.headers.origin;
  res.locals.request_id = req.headers["X-storageapi-request-id"] || uuidv4();
  res.locals.trace_id = req.headers["X-storageapi-trace-id"] || res.locals.request_id;

  // we need to set the request id the response headers to easily trace requests
  res.set('X-request-id', res.locals.request_id);

  // Set cleanup function
  onFinished(res, async (err, res) => {
    
    await db.closeConnection(res.locals.connection);

    if (!res.locals.logging?.error) fireEvents(res);

    // if (process.env.NODE_ENV === 'test' || process.env.NODE_ENV === 'local' || process.env.NODE_ENV === 'data-validation') return;

    // TODO remove await, sendLogs should be fire and forget
    utils.sendLogs({ res: res });
  });
  next();
});


app.use('/v1/companies/onboard', require('./routes/onboard-company')(app, sockets));

const fireEvents = (res) => {
  const events = clsContext.get('events');

  if (events && events.length) {
    eventEmitter = eventEmitter || require(__dirname + '/events/index.js');
    events.map(event => {
      for (e in event) {
        const eventName = e;
        const eventData = { res: res, cid: res.locals.company_id, ...event[e] }
        eventEmitter.emit(eventName, eventData);
      }
    });
  }
}


app.use('*', async (req, res, next) => {
  console.log("getting db connection");

  try {

    let subdomain = control.getDomain(req.headers);

    let { connection, cid, local_company_id } = await db.getConnection(req.method, req.baseUrl, subdomain, res.locals.company_id);
    connection.meta = {
      request_id: res.locals.request_id,
      trace_id: res.locals.trace_id
    }
    res.locals.connection = connection;
    res.locals.company_id = cid;
    res.locals.local_company_id = local_company_id;
    req.company_id = cid;
    
  } catch (err) {
    console.log("err", err);
    next(err);
  }
  next();
});
 
app.use('/v1/', require('./routes')(app, sockets));
app.use('/v1/companies/:company_id/', require('./routes/base-authenticated')(app, sockets));
app.use('/v1/companies/:company_id/access-control', require('./routes/access-control')(app, sockets));
app.use('/v1/companies/:company_id/admin', require('./routes/admin')(app, sockets));
app.use('/v1/companies/:company_id/activity', require('./routes/activity')(app, sockets));
app.use('/v1/companies/:company_id/applications', require('./routes/applications')(app, sockets));
app.use('/v1/companies/:company_id/billing', require('./routes/billing')(app, sockets));
app.use('/v1/companies/:company_id/categories', require('./routes/categories')(app, sockets));
app.use('/v1/companies/:company_id/companies', require('./routes/companies')(app, sockets));
app.use('/v1/companies/:company_id/contacts', require('./routes/contacts')(app, sockets));
app.use('/v1/companies/:company_id/dashboard', require('./routes/dashboard')(app, sockets));
app.use('/v1/companies/:company_id/documents', require('./routes/documents')(app, sockets));
app.use('/v1/companies/:company_id/events', require('./routes/events')(app, sockets));
app.use('/v1/companies/:company_id/hotleads', require('./routes/hotleads')(app, sockets));
app.use('/v1/companies/:company_id/insurance', require('./routes/insurance')(app, sockets));
app.use('/v1/companies/:company_id/leads', require('./routes/leads')(app, sockets));
app.use('/v1/companies/:company_id/leases', require('./routes/leases')(app, sockets));
app.use('/v1/companies/:company_id/invoices', require('./routes/invoices')(app, sockets));
app.use('/v1/companies/:company_id/notifications', require('./routes/notifications')(app, sockets));
app.use('/v1/companies/:company_id/payments', require('./routes/payments')(app, sockets));
app.use('/v1/companies/:company_id/product-categories', require('./routes/product-categories')(app, sockets));
app.use('/v1/companies/:company_id/products', require('./routes/products')(app, sockets));
app.use('/v1/companies/:company_id/properties/:property_id/space-groups', require('./routes/space_groups')(app, sockets));
// ******* Rate management *******
app.use('/v1/companies/:company_id/properties/:property_id/offers', require('./routes/offers.js')(app, sockets));
app.use('/v1/companies/:company_id/properties/:property_id/rate-management', require('./routes/property_rate_management')(app, sockets));
app.use('/v1/companies/:company_id/properties/:property_id/rate-management/space-groups', require('./routes/space_group_rate_management')(app, sockets));
// ******* ******* ******* *******  *******

// ******* Rent management *******  *******
app.use('/v1/companies/:company_id/rent-management', require('./routes/company_rent_management')(app, sockets));
app.use('/v1/companies/:company_id/properties/:property_id/rent-management', require('./routes/property_rent_management')(app, sockets));
// ******* ******* ******* *******  *******

app.use('/v1/companies/:company_id/properties', require('./routes/properties')(app, sockets));
app.use('/v1/companies/:company_id/non-hummingbird-properties', require('./routes/non-hummingbird-properties')(app, sockets));
app.use('/v1/companies/:company_id/property-map', require('./routes/property-map')(app, sockets));
app.use('/v1/companies/:company_id/promotions', require('./routes/promotions')(app, sockets));
app.use('/v1/companies/:company_id/property-groups', require('./routes/property-groups')(app, sockets));
app.use('/v1/companies/:company_id/reports', require('./routes/reports')(app, sockets));
app.use('/v1/companies/:company_id/reservations', require('./routes/reservations')(app, sockets));
app.use('/v1/companies/:company_id/settings', require('./routes/settings')(app, sockets));
app.use('/v1/companies/:company_id/space-types', require('./routes/space_types')(app, sockets));
// app.use('/v1/companies/:company_id/space-groups', require('./routes/space_groups')(app, sockets));
app.use('/v1/companies/:company_id/templates', require('./routes/templates')(app, sockets));
app.use('/v1/companies/:company_id/tenants', require('./routes/tenants')(app, sockets));
app.use('/v1/companies/:company_id/tenant-payments-applications', require('./routes/tenant_payments_applications')(app, sockets));
app.use('/v1/companies/:company_id/tenant-payments-equipment-purchase', require('./routes/tenant_payments_equipment_purchase')(app, sockets));
app.use('/v1/companies/:company_id/todos', require('./routes/todos')(app, sockets));
app.use('/v1/companies/:company_id/triggers', require('./routes/triggers')(app, sockets));
app.use('/v1/companies/:company_id/units', require('./routes/units')(app, sockets));
app.use('/v1/companies/:company_id/uploads', require('./routes/uploads')(app, sockets));
app.use('/v1/companies/:company_id/interactions', require('./routes/interactions')(app, sockets));
app.use('/v1/companies/:company_id/gds-integration', require('./routes/gds-integration')(app, sockets));
app.use('/v1/companies/:company_id/tasks', require('./routes/tasks')(app, sockets));
app.use('/v1/companies/:company_id/rate-management', require('./routes/rate-management')(app, sockets));
app.use('/v1/companies/:company_id/tax-profile', require('./routes/tax-profile')(app, sockets));
app.use('/v1/companies/:company_id/auctions', require('./routes/auctions')(app, sockets));
app.use('/v1/companies/:company_id/space-mix', require('./routes/space-mix')(app, sockets));
app.use('/v1/companies/:company_id/services', require('./routes/services')(app, sockets));
app.use('/v1/companies/:company_id/accounting', require('./routes/accounting')(app, sockets));
app.use('/v1/companies/:company_id/space-management', require('./routes/space-management')(app, sockets));
app.use('/v1/companies/:company_id/onboarding', require('./routes/onboarding')(app, sockets));
app.use("/v1/companies/:company_id/document-batches", require('./routes/document_batches')(app, sockets));
app.use("/v1/companies/:company_id/mailing-doc", require('./routes/mailing_docs')(app, sockets));
app.use('/v1/companies/:company_id/mailhouses', require('./routes/mailhouse')(app, sockets));
app.use('/v1/companies/:company_id/charm', require('./routes/charm-integration')(app, sockets));
app.use('/v1/companies/:company_id/delivery-methods', require('./routes/delivery_methods')(app, sockets));
app.use("/v1/companies/:company_id/notes", require('./routes/notes')(app, sockets));

app.use('/v1/companies/:company_id/sidecar', require('./routes/sidecar')(app, sockets));



// app.use('/v1/companies/:company_id/applications', require('./routes/applications')(app, sockets));
// app.use('/v1/companies/:company_id/calendar', require('./routes/calendar')(app, sockets));
// app.use('/v1/companies/:company_id/calls', require('./routes/calls')(app, sockets));
// app.use('/v1/companies/:company_id/maintenance', require('./routes/maintenance')(app, sockets));
// app.use('/v1/companies/:company_id/users', require('./routes/users')(app, sockets));
// app.use('/v1/companies/:company_id/my-account', require('./routes/tenant-view')(app, sockets));
// app.use('/v1/companies/:company_id/vendors', require('./routes/vendors')(app, sockets));

// catch 404 and forward to error handler
app.use(function (req, res, next) {
  var err = new Error('404 Not Found');
  err.code = 404;
  next(err);
});


// global error handler
app.use(async (err, req, res, next) => {
  console.log("gobal Error handler", err);
  console.log(err.stack);

  // set the error for onfinished to log
  res.locals.logging.error = err;

  let errorString = err.message || "An error has occurred.";
  let err_actual_cause = err.actual_cause;
  let code = err.code || 500;

  // what is "isBoom" ?
  if (err.isBoom) {
    console.log("is Boom.");
    code = err.output.statusCode;
    errorString = err.data.reduce((a, b) => a += b.message + '. ', '');
  } else if (err.error && err.error.isJoi) {
    console.log("Joi error.");

    let _str = '';
    err.error.details.forEach(e => {
      _str += e.message + '; ';
    });

    errorString = _str;
    code = 400;

  } else if (err.error && !err.error.isJoi) {
    code = err.error.code || 500;
    errorString = err.error.message || err.error.msg || errorString;
    err_actual_cause = err.error.actual_cause || null;

  } else if (err.sqlMessage && err.sqlState) {
    console.log("SQL error.");
    code = 500;
  }

  utils.send_response(res, {
    status: code,
    data: {},
    msg: errorString,
    actual_cause: err_actual_cause });
});

// error handlers
process.on('unhandledRejection', function (err, promise, daf) {
  console.error(settings.is_prod);
  console.error('*******');
  console.error("Unhandled rejection: " + (err && err.stack || err));
  if (settings.is_prod) {
    //   bugsnag.notify(err);
  }
});

if (app.get('env') === 'local') {
  app.use(function (err, req, res, next) {
    res.status(err.status || 500);
    res.send(err);
  });
}


http.on('checkExpectation', (err, socket) => {
  http.end('HTTP/1.1 400 Bad Request\r\n\r\n');
});

http.on('connect', (err, socket) => {
  console.log("connect");
});

if (process.env.NODE_ENV !== 'test') {
  if (typeof (PhusionPassenger) != 'undefined') {
    console.log("THIS IS PASSENGER");
    http.listen('passenger');
  } else {
    console.log("THIS IS NOT PASSENGER")
    console.log("listening on port: " + settings.config.port);
    http.listen(settings.config.port);
    // https.listen(443);
  }
}

exports.closeServer = function () {
  http.close();
};

exports.loadDatabase = async () => {
  try {
    console.log("initing dynamo");
    await dynamo.init();
    console.log("done initing dynamo");
  } catch (err) {
    console.log("dynamo.init()", err)
  }

  try {
    console.log("initing DB");
    await db.init();
    console.log("done initing DB");
  } catch (err) {
    console.log("db.init()", err)
  }
};
exports.getConnection = async () => {

  try {
    let connection = await db.getConnectionByType("write", null, 1);
    return connection;
  } catch (err) {
    console.log(err)
  }
};


exports.loadTests = function (user_type) {

  if (!user_type) return false;
  app.use(function (err, req, res, next) {
    res.status(err.code || 500).json({
      status: err.code || 500,
      msg: err.toString()
    });
  });
};

console.log("done");
