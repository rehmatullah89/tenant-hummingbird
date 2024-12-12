// add timestamps in front of log messages
const express = require('express');
const kue = require('kue');
const redis = require('redis');
require('console-stamp')(console, '[HH:MM:ss.l]');
const schedule = require('node-schedule');

const app = express();
const http = require('http').Server(app);
const settings = require('./config/settings');

// Kue

const queue = kue.createQueue({
	redis: {
		createClientFactory: () =>
			redis.createClient({
				port: '6379',
				host: settings.redis_host,
			}),
	},
});

queue.on('error', (err) => {
	console.log('Oops... ', err);
});

// Start timers
const defaultSchedules = [
	// {
	//     time: '30 55 23 * * *',
	//     fn: () => {
	//         queue.create('runReportsRoutine').save();
	//     }
	// },
	/* {
        time: '0 45 * * * *',
        fn:  () => {
           queue.create('runTriggers').save();
        }

    },
    {
        time: '0 5 * * * *',
        fn:  () => {
            queue.create('runInvoiceCreateRoutine').save();
        }
    },
    {
        time: '0 30 * * * *',
        fn:  () => {
            queue.create('runProcessAutoPaymentsRoutine').save();
        }
    }, */
	{
		time: '0 1 * * * *',
		fn: () => {
			queue.create('runCloseOfDayRoutine').save();
		},
	},
	{
		time: '0 10 * * * *',
		fn: () => {
			queue.create('runTransactionsRoutine').save();
		},
	},
	{
		time: '0 35 * * * *',
		fn: () => {
			queue.create('runAuctionDayRoutine').save();
		},
	},
	{
		time: '0 40 * * * *',
		fn: () => {
			queue.create('runRateRaiseRoutine').save();
		},
	},
	{
		time: '0 45 * * * *',
		fn: () => {
			queue.create('runAdvanceRentalRoutine').save();
		},
	},
	{
		time: '0 50 * * * *',
		fn: () => {
			queue.create('runAutoExpireLeadsRoutine').save();
		},
	},
	{
		time: '0 55 * * * *',
		fn: () => {
			queue.create('runScheduleExportsRoutine').save();
		},
	},
	{
		time: '0 0 9 * * *', // runs 9 AM everyday , where the worker kicker runs
		fn: () => {
			queue.create('runPropertyProgressRoutine').save();
		},
	},
	{
		time: '0 15 * * * *', // runs every hour at 15 min. Added by BCT Team for Schedule Report
		fn: () => {
			queue.create('runScheduleReport').save();
		},
	},
];

defaultSchedules.forEach((s) => {
	console.log('Setting up the schedules', s.time);
	schedule.scheduleJob(s.time, s.fn.bind(null));
});

process.on('unhandledRejection', (err) => {
	console.error(settings.is_prod);
	console.error('*******');
	console.error(`Unhandled rejection: ${(err && err.stack) || err}`);
	// Send mail? sms? log to error reporting
});

console.log('Kicker is up and running.');
queue.create('testKicker').save();

app.get('/v1', (req, res) => {
	res.json({
		status: 200,
	});
});

app.use((req, res, next) => {
	console.log('ROUTE NOT FOUND');
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
	app.use((_err, req, res) => {
		res.render('500');
	});
});

if (typeof PhusionPassenger !== 'undefined') {
	console.log('THIS IS PASSENGER');
	http.listen('passenger');
} else {
	console.log('THIS IS NOT PASSENGER');
	console.log(`listening on port: ${process.env.PORT}`);
	http.listen(process.env.PORT);
	// https.listen(443);
}
