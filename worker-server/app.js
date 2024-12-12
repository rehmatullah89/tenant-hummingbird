if (process.env.NEW_RELIC_LICENSE_KEY) {
    require('newrelic')
}

var express = require('express');
var path = require('path');
var favicon = require('serve-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var session      = require('express-session');
var SessionStore = require('express-mysql-session');
var fs = require('fs');
var http = require('http');
var https = require('https');
var bugsnag = require("bugsnag");
// bugsnag.register("9593fd4102fcf3b32f7d50e5d5b85b29");

//add timestamps in front of log messages
require('console-stamp')(console, '[HH:MM:ss.l]');
var Promise = require('bluebird');
var logger = require('morgan'); 
var multer  = require('multer');

var app = express();
var http = require('http').Server(app);
 
// app.use(bugsnag.requestHandler); // first middleware
 
  
// Mysql connection
// var mysql      = require('mysql');
// Promise.promisifyAll(require("mysql/lib/Connection").prototype);
// Promise.promisifyAll(require("mysql/lib/Pool").prototype);
var settings    = require('./config/settings.js');

// Kue
var kue = require('kue');
var ui = require('kue-ui');
var redis = require('redis');


var db = require('./modules/db_handler.js');
db.init();
console.log("initialized");
db.init_propay_db();

queue = kue.createQueue({
    redis: {
        createClientFactory: function(){
            return redis.createClient({
                port: '6379',
                host: settings.redis_host
            });
        }
    }
});
//
// client = redis.createClient({
//     port: '6379',
//     host: settings.redis_host
// });
// client.flushdb( function (err, succeeded) {
//     console.log(succeeded); // will be true if successfull
// });

queue.on( 'error', function( err ) {
    console.log( 'Oops... ', err );
});


var workerManager  = require('./modules/worker.js');
workerManager.initWorker();


// ui.setup({
//     apiURL: '/api', // IMPORTANT: specify the api url
//     baseURL: '/kue', // IMPORTANT: specify the base url
//     updateInterval: 3000
// });




app.use(logger('dev'));
app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.json({ limit: '50mb', type: 'application/*+json' }));
app.use(bodyParser.urlencoded({ limit: '50mb', extended: true }));
app.use(bodyParser.raw({ inflate: true, type: 'text/plain' }));


app.use(cookieParser());
app.use(multer({ dest: './uploads/' }));

app.locals.moment = require('moment');

// var pool  = mysql.createPool({
//     connectionLimit : 100,
//     host     : settings.db.host,
//     user     : settings.db.username,
//     password : settings.db.password,
//     database : settings.db.database,
//     dateStrings: true,
//     multipleStatements: true
// });
//
// pool.getConnectionAsync().then(function(conn) {
//     conn.release();
// }).catch(function(err){
//     console.error(err);
// });


// Start timers
var scheduler  = require('./modules/scheduler.js');
scheduler.kick({}, queue, kue);

// Disallow everything for now.
app.get('/robots.txt', function (req, res) {
    res.type('text/plain');
    res.send("User-agent: *\nDisallow: /");
});



app.use(function(req, res, next) {

   
    res.header("Access-Control-Allow-Origin", req.headers.origin);
    res.header("Access-Control-Allow-Credentials", "true");
    res.header("Access-Control-Allow-Methods", "GET,HEAD,OPTIONS,POST,PATCH,PUT,DELETE");
    res.header('Access-Control-Expose-Headers', 'Content-Length');
    res.header("Access-Control-Allow-Headers", "Access-Control-Allow-Origin, Origin, Referrer-Policy, X-Requested-With, Content-Type, Accept, Authorization, Cache-Control, Range");
    if (req.method === 'OPTIONS') {
        return res.sendStatus(200);
    }
    return next();
});
 


//app.use(bugsnag.errorHandler); // after all other middleware, but before any “error” middleware:


process.on('unhandledRejection', function (err, promise) {
    console.error("Unhandled rejection: " + (err && err.stack || err));
    bugsnag.notify(err);
});



if (app.get('env') === 'development') {
    app.use(function(err, req, res, next) {
        res.status(err.status || 500);
        res.render('error', {
            message: err.message,
            error: err
        });
    });
}

app.use(function(err, req, res, next) {
    res.status(err.status || 500);
    res.render('error', {
        message: err.message,
        error: {}
    });
});

app.use('/', require('./routes/index')(app));
app.use('/', require('./routes/dashboard')(app));
app.use('/', require('./routes/promotions')(app));
app.use('/', require('./routes/billing')(app));

// // Mount kue JSON api
// app.use('/api', kue.app);
// // Mount UI
// app.use('/kue', ui.app);

app.use(async (err, req, res, next) => {
    
    console.log("ERROR IN ERROR HANLDER ", err);
    console.log("ERROR CODEZZZ", err.code);
    console.log(err.stack);

    // if(settings.kafka.broker_address){
    //    kafkaLogger.log(err.stack);
    // }
    var code = err.code || 500;

    if (err.sqlMessage && err.sqlState) {
        console.log("SQL error.");
        code = 500;
    }

    res.status(code).json({
        status: code,
        data:{},
        msg: err.message || 'An error occurred'
    });

    if(!err.code || err.code >= 500){
        // res.locals.logging.error = err;
    }

});




// error handlers
process.on('unhandledRejection', function (err, promise) {
    console.error(settings.is_prod);
    console.error('*******');
    console.error("Unhandled rejection: " + (err && err.stack || err));
    if(settings.is_prod){
        bugsnag.notify(err);
    }
});


console.log('Attempting to start');

if (typeof(PhusionPassenger) != 'undefined') {
    http.listen('passenger');
} else {
    http.listen(settings.config.port);
}

console.log('up and running.');