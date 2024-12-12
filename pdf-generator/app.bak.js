var express = require('express')
var app = express();
const puppeteer = require('puppeteer');
const fs = require('fs');
const port = process.env.PDF_PORT || 80;
const bodyParser = require('body-parser');
var util = require('util');

const bullmq  = require('bullmq');
const IORedis = require('ioredis');
const connection = new IORedis({host: process.env.REDIS_HOST});
const Socket = require(__dirname + './classes/sockets.js');


const PdfQueue = new bullmq.Queue('pdf', { connection } );
const Queue = new bullmq.Queue('hummingbirdQueue', { connection } );

const { WorkflowManager } = require(__dirname + '/../modules/workflow_manager.js');
let workflowManager = new WorkflowManager(Queue);



const worker = new bullmq.Worker('pdf', async job => {

	let socket = {};

	console.log(job.data);

	if(job.data.company_id && job.data.contact_id){
		socket = new Socket({
			company_id: job.data.company_id,
			contact_id: job.data.contact_id,
		});
	}

	try {

		let pdfFile = await generate_report(job.data);
		job.data.file = pdfFile || "NO File Here!";

		if(job.data.workflow){
			await workflowManager.continueWorkflow(job, job.data);
		} else if(job.data.sendInMail) {
			console.log('Data from worker server => ', job.data)
			await Queue.add(job.data.type, job.data);
		}
		 else {

			await socket.createEvent("pdf_generated", {
				data: pdfFile,
				id: job.data.id,
				type: job.data.type,
				filename: job.data.filename,
				content_type: "application/pdf",
				success: true
			});
		}
	} catch(err) {
		console.log("ERROR", err.toString());
		if(socket.company_id){
			await socket.createEvent("pdf_generated", {
				id: job.data.id,
				type: job.data.type,
				message: err.toString(),
				success: false
			});
		} else {
			// await workflowManager.errorWrokflow(job);
		}
	}
},  { connection });

worker.on('completed', (job) => {
	console.log(`${job.id} has completed!`);
});

worker.on('failed', (job, err) => {
	console.log(`${job.id} has failed with ${err.message}`);
});



//const PdfQueue = new bullmq.Queue('pdf', { connection } );

app.use(bodyParser.urlencoded({ limit: '50mb', extended: true }));
app.use(bodyParser.json({limit: '50mb'}));
app.use(bodyParser.raw({ inflate: true, type: 'text/plain' }));
app.use(function(req, res, next) {
	res.header("Access-Control-Allow-Origin", req.headers.origin);
	res.header("Access-Control-Allow-Credentials", "true");
	res.header("Access-Control-Allow-Methods", "GET,HEAD,OPTIONS,POST,PATCH,PUT,DELETE");
	res.header('Access-Control-Expose-Headers', 'Content-Length');
	res.header("Access-Control-Allow-Headers", "Access-Control-Allow-Origin, Origin, Referrer-Policy, X-Requested-With, Content-Type, Accept, Authorization, Cache-Control, Range");
	if (req.method === 'OPTIONS') {
		res.header("Access-Control-Allow-Methods", "GET,HEAD,OPTIONS,POST,PATCH,PUT,DELETE");
		return res.sendStatus(200);
	}
	return next();
});

var mainBrowser = undefined;
const launch_browser = async () => {
	mainBrowser = await puppeteer.launch({
		args: ["--font-render-hinting medium", "--enable-font-antialiasing", '--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu']
	});
	mainBrowser.on('disconnected', launch_browser);
};

(async () => {
	try{
		await launch_browser();
	} catch(err){
		console.log(err);
	}
})();

const pdfConfig = {
	path: '/invoice.pdf', // Saves pdf to disk. TODO Delete file after sending back response.
	format: 'Letter',
	printBackground: true,
	// size: A4 landscape;
	margin: {
		top:  '0.8in',
		bottom: '0.8in',
		left: '0.8in',
		right: '0.8in'
	}
	// width: '8.3in',
	// height: '11.6in',

};


// respond with "hello world" when a GET request is made to the homepage
app.get('/', function (req, res) {

	(async () => {
		res.send('hello world');
	})();
});

app.post('/download', async (req, res) => {

	var url = req.body.url;
	console.log("req", req.body);
	try {
		const browser = await puppeteer.launch({
			args: ["--font-render-hinting medium", "--enable-font-antialiasing", '--no-sandbox', '--disable-setuid-sandbox'],
		});


		let resp = await page.goto( url );

		// await page.waitForSelector('#loaded');

		const pdf = await page.pdf(pdfConfig);

		await browser.close();

		//const buffer = await Webpage.generatePDF(url);
		// await page.screenshot({path: 'files/example.png'});

		// const file = await fs.readFileSync(__dirname + '/files/example.png', 'binary');
		// res.setHeader('Content-Length', file.length);
		res.sendFile('/invoice.pdf');

	} catch(error){
		console.log(error);
		res.end();
	}

});

const generate_report = async (body) => {


	let url = body.url;
	let webhook = body.webhook;
	if(!url) return false;
	let pdf_name ='/' + body.filename;
	let rand =  Math.floor(Math.random() * Math.floor(10000000000))
	console.log("url", url);
	console.time('TotalTime_' + rand)
	console.time('OpeningNewPageInBrowser_' + rand)
	let page = await mainBrowser.newPage();
	console.timeEnd('OpeningNewPageInBrowser_' + rand)

	//page.setDefaultTimeout(5 * 60 * 1000)
	page.on('console', msg => console.log('PAGE LOG:', msg.text()));	//Setting up page console to local
	await page.evaluate(() => console.log(`url is ${location.href}`));


	// Setting up error log from the page

	page.on('error', (err) => {
		console.log('error: ', err)
	})

	page.on('pageerror', (err) => {
		console.log('pageerror: ', err)
	})
	// page.on('requestfailed', async (err) => {
	// 	console.error('REQUEST_FAILED:\n' + util.inspect(err))
	// })

	let pdfOptions = {}
	if (body.type ===  'generic' ) {
		pdfOptions = {
			path: pdf_name,
			width: 1123,
			height: 794,
			printBackground: true,
			margin: {
				top: '0.2in',
				bottom:'0.2in',
				left:'0.2in',
				right:'0.2in'
			}
		}
	} else {
		pdfOptions = {
			path: pdf_name,
			format: 'Letter',
			printBackground: true,
			margin: {
				top: '0.2in',
				bottom:'0.2in',
				left:'0.2in',
				right:'0.2in'
			}
		}
	}

	console.time('UrlLoadingInPage_' + rand)
	await page.goto( url, { waitUntil: 'networkidle2', timeout: 0 });
	//await page.waitFor(3000);
	console.timeEnd('UrlLoadingInPage_' + rand)

	console.time('SelectorLoading_' + rand)
	await page.waitForSelector('#loaded');
	console.timeEnd('SelectorLoading_' + rand)

	console.time('ConvertToPdf_' + rand)
	const pdfFile = await page.pdf({ ...pdfOptions })
	console.timeEnd('ConvertToPdf_' + rand)

	console.log('Page format config', { ...pdfOptions })

	// res.contentType("application/pdf");
	// post file to webhook
	// res.send(pdfFile)
	console.log("done!");

	await page.close();

	return pdfFile;


}

app.post('/download-pdf', async (req, res) => {

	if(!req.body.url || !req.body.webhook) return res.end();

	await PdfQueue.Queue.add('generatePdf', req.body);

	res.end();

	//await generate_report(req.body);
// 	req.setTimeout(0)
});



//
// app.post('/download-pdf', function (req, res) {
//
// // 	req.setTimeout(0)
// 	var url = req.body.url;
//
// 	console.log(url);
// 	if(!url) return res.end();
// 	var pdf_name ='/' + req.body.pdf_name;
// 	var page;
// 	(async () => {
// 		let rand =  Math.floor(Math.random() * Math.floor(10000000000))
// 		try {
// 			console.time('TotalTime_' + rand)
// 			console.time('OpeningNewPageInBrowser_' + rand)
// 			page = await mainBrowser.newPage();
// 			console.timeEnd('OpeningNewPageInBrowser_' + rand)
//
// 			//page.setDefaultTimeout(5 * 60 * 1000)
// 			page.on('console', msg => console.log('PAGE LOG:', msg.text()));	//Setting up page console to local
// 			await page.evaluate(() => console.log(`url is ${location.href}`));
//
//
// 			// Setting up error log from the page
//
// 			page.on('error', (err) => {
// 				console.log('error: ', err)
// 			})
// 			page.on('pageerror', (err) => {
// 				console.log('pageerror: ', err)
// 			})
// 			// page.on('requestfailed', async (err) => {
// 			// 	console.error('REQUEST_FAILED:\n' + util.inspect(err))
// 			// })
//
// 			console.time('UrlLoadingInPage_' + rand)
// 			await page.goto( url, { waitUntil: 'networkidle2', timeout: 0 });
// 			console.timeEnd('UrlLoadingInPage_' + rand)
//
// 			console.time('SelectorLoading_' + rand)
// 			await page.waitForSelector('#loaded');
// 			console.timeEnd('SelectorLoading_' + rand)
//
// 			let pdfOptions = {}
// 			if (req.body.is_generic) {
// 				pdfOptions = {
// 					width: 1123,
// 					height: 794,
// 					printBackground: true,
// 				}
// 			} else {
// 				pdfOptions = {
// 					path: pdf_name,
// 					format: 'Letter',
// 					printBackground: true,
// 					margin: {
// 						top: '0.8in',
// 						bottom:'0.8in',
// 						left:'0.8in',
// 						right:'0.8in'
// 					}
// 				}
// 			}
//
// 			console.time('ConvertToPdf_' + rand)
// 			const pdfFile = await page.pdf({ ...pdfOptions })
// 			console.timeEnd('ConvertToPdf_' + rand)
//
// 			res.contentType("application/pdf");
//
// 			console.time('SendPdfToApiServer_' + rand)
// 			res.send(pdfFile)
// 			console.timeEnd('SendPdfToApiServer_' + rand)
//
// 		} catch(error) {
// 			console.log('error while scraping url =>', error);
// 			res.end();
// 		} finally {
// 			console.time('ClosingPage_' + rand)
// 			await page.close()
// 			console.timeEnd('ClosingPage_' + rand)
// 			console.timeEnd('TotalTime_' + rand)
// 		}
// 	})();
// });

app.post('/download-invoice/:invoice_id', function (req, res) {

	var invoice_id = req.params.invoice_id;
	var url = req.body.url;

	(async () => {
		try {
			const browser = await puppeteer.launch({
				args: ["--font-render-hinting medium", "--enable-font-antialiasing", '--no-sandbox', '--disable-setuid-sandbox'],
			});

			const page = await browser.newPage();

			let resp = await page.goto( url + '/reports/web/invoice/' + invoice_id);
			await page.waitForSelector('#loaded');

			const pdf = await page.pdf(pdfConfig);

			await browser.close();

			//const buffer = await Webpage.generatePDF(url);
			// await page.screenshot({path: 'files/example.png'});

			// const file = await fs.readFileSync(__dirname + '/files/example.png', 'binary');
			// res.setHeader('Content-Length', file.length);
			res.sendFile('/invoice.pdf');

		} catch(error){
			console.log(error);
			res.end();
		}

	})();
});

app.post('/url-pdf', function (req, res) {

	console.info(`Request received for url: ${req.body.url}`)
	req.setTimeout(0)
	var url = req.body.url;
	var pdf_name ='/' + req.body.pdf_name;
	var page;
	(async () => {
		try {

			console.time('OpeningNewPageInBrowser')
			page = await mainBrowser.newPage();
			console.timeEnd('OpeningNewPageInBrowser')

			page.setDefaultTimeout(5 * 60 * 1000)
			page.on('console', msg => console.log('PAGE LOG:', msg.text()));	//Setting up page console to local
			await page.evaluate(() => console.log(`url is ${location.href}`));


			// Setting up error log from the page

			page.on('error', (err) => {
				console.log('error: ', err)
			});
			page.on('pageerror', (err) => {
				console.log('pageerror: ', err)
			});
			console.time('UrlLoadingInPage');
			await page.goto( url, { waitUntil: 'networkidle2' });
			await page.waitForSelector('#loaded');
			console.timeEnd('UrlLoadingInPage');
			console.log("HTML has been loaded. Following is the content of page.");
			// const html = await page.content();
			// console.log(html);

			let pdfOptions = {}
			if (req.body.is_generic) {
				pdfOptions = {
					width: 1123,
					height: 794,
					printBackground: true,
				}
			} else {
				pdfOptions = {
					path: pdf_name,
					format: 'Letter',
					printBackground: true,
					margin: {
						top: '0.8in',
						bottom:'0.8in',
						left:'0.8in',
						right:'0.8in'
					}
				}
			}

			console.time('ConvertToPdf')
			const pdfFile = await page.pdf({ ...pdfOptions })
			console.timeEnd('ConvertToPdf')

			res.contentType("application/pdf");

			console.time('SendPdfToApiServer')
			res.send(pdfFile)
			console.timeEnd('SendPdfToApiServer')

		} catch(error) {
			console.log('error while scraping url =>', error);
			res.end();
		} finally {
			console.time('ClosingPage')
			await page.close()
			console.timeEnd('ClosingPage')
		}
	})();
});



app.use('/v2',require('./routes/reports')());

var server = app.listen(port, () => console.log(`Example app listening on port ${port}!`))
// server.timeout = 5 * 60 * 1000;