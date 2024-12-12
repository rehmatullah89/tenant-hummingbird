

var moment  = require('moment');
var parsePhoneNumber = require('libphonenumber-js/max');
var rp = require('request-promise');
const { v4: uuidv4 } = require('uuid');
const os = require('os');
const LogRedact = require(__dirname + '/./log_redaction.js');
const ENUMS = require(__dirname + '/../modules/enums');
module.exports = {
	component: 'HB_WORKER_SERVER',

	findTimeframe: function(data){
		var timeframe = {
			start: '',
			end: ''
		}
		if(data.timeframe){
			switch(data.timeframe){
				case "1 - 30 Days":
					timeframe.start = 30;
					timeframe.end = 1;
					break;
				case "31 - 90 Days":
					timeframe.start = 90;
					timeframe.end = 31;
					break;
				case "Over 90 Days":
					timeframe.start = null;
					timeframe.end = 91;
					break;
				case "Lifetime":
					timeframe.start = null;
					timeframe.end = null;
					break;
				case "Month To Date":
					console.log("MONTH TO DATE")
					timeframe.start = moment().startOf('Month').format('YYYY-MM-DD');
					timeframe.end = moment().format('YYYY-MM-DD');
					break;
				case "Last Month":
					timeframe.start = moment().subtract(1, 'Month').startOf('Month').format('YYYY-MM-DD');
					timeframe.end = moment().subtract(1, 'Month').endOf('Month').format('YYYY-MM-DD');
					break;
				case "Last 30 Days":
					timeframe.start = moment().subtract(30, 'Days').format('YYYY-MM-DD');;
					timeframe.end = moment().format('YYYY-MM-DD');
					break;
				case "This Year":
					timeframe.start = moment().startOf('Year').format('YYYY-MM-DD');
					timeframe.end = moment().format('YYYY-MM-DD');
					break; 

			}

			if(data.timeframe == "Custom") {
				timeframe.start = moment().diff(moment(data.start), 'days');
				timeframe.end = moment().diff(moment(data.end), 'days');
			}

		}
		return timeframe;
	}, 

	formatDate: value => {
		if (!value) return '';
		return moment(value).format('MM/DD/YYYY');
	},

	formatLocalFromNow: value => {
		if (!value) return '';
		return moment.utc(value).local().fromNow();
	},

	formatLocalDateTime: value => {
		if (!value) return '';
		return moment.utc(value).local().format('MM/DD/YYYY [at] h:mm a');
	},

	formatLocalTime: value => {
		if (!value) return '';
		return moment(value).local().format('h:mm a');

	},
	formatLocalDate: value => {
		if (!value) return '';
		return moment(value).local().format('MM/DD/YYYY');
	},
	formatPhone: value => {
		if (!value) return '';

		var parsedPhoneNumber = parsePhoneNumber('+' + value);

		if(parsedPhoneNumber && parsedPhoneNumber.isValid()){
			if(parsedPhoneNumber.country === 'US'){
				return '+1 ' + parsedPhoneNumber.formatNational();
			} else {
				return parsedPhoneNumber.formatInternational();
			}
		} else {
			value = value.toString();

			var numbers = value.replace(/\D/g, ''),  char = {0:'(',3:') ',6:'-'};
			value = '';
			for (var i = 0; i < numbers.length; i++) {
				value += (char[i]||'') + numbers[i];
			}
			return value;
		}
	},

	formatSSN: value => {
		if (!value) return '';
		value = value.toString();
		return value.substr(0, 3) + '-' + value.substr(3, 2) + '-' + value.substr(5);
	},


	formatMoney: value => {
		// x = x.toFixed(2);
		// var pattern = /(-?\d+)(\d{3})/;
		// while (pattern.test(x))
		// 	x = x.replace(pattern, "$1,$2");
		// return x;

		if (typeof value === 'undefined' ||  value === false || value === null  ) return '';
		if(value < 0){
			return "($" + Math.abs(Math.round(value * 1e2) / 1e2).toFixed(2) + ')';
		}
		return "$" + (Math.round(value * 1e2) / 1e2).toFixed(2);

	},

	formatNumber: value => {
		if (typeof value == 'undefined' ||  value === false || value === null  ) return '';
		return value;
	},

	slugify: function(text){
		return text.toString().toLowerCase()
			.replace(/\s+/g, '-')           // Replace spaces with -
			.replace(/[^\w\-]+/g, '')       // Remove all non-word chars
			.replace(/\-\-+/g, '-')         // Replace multiple - with single -
			.replace(/^-+/, '')             // Trim - from start of text
			.replace(/-+$/, '');            // Trim - from end of text
	},
	capitalizeFirst: function(str){
		return str.charAt(0).toUpperCase() + str.slice(1);
	},
	captializeAll: function(str){
		return str.replace(/(^|\s)[a-z]/g, function(f){ return f.toUpperCase(); });
	},
	nl2br: function(str, is_xhtml){
		var breakTag = (is_xhtml || typeof is_xhtml === 'undefined') ? '<br />' : '<br>';
		return (str + '').replace(/([^>\r\n]?)(\r\n|\n\r|\r|\n)/g, '$1' + breakTag + '$2');
	},
	capitalizeAll: function(str){
		return str.replace(/(^|\s)[a-z]/g, function(f){ return f.toUpperCase(); });
	},
	saveTiming(connection, req, locals){
		var trackingData = {
			api_id: locals.api ? locals.api.id: null,
			contact_id: locals.contact ? locals.contact.id: null,
			ip_address: req.headers['x-forwarded-for'] || req.connection.remoteAddress,
			endpoint: req.originalUrl,
			query: JSON.stringify(req.query),
			time:  Date.now() - locals.timing
		}
		var trackingSql = "insert into tracking set ? ";
		return connection.queryAsync(trackingSql, trackingData);
	},
	async closeConnection(pool,connection){
		console.log("Closing Connection", connection.threadId);
		if(pool._freeConnections.indexOf(connection) < 0){
			connection.release();
		}
		return Promise.resolve();

	},
	dayEnding(i){
		var days = [];
		var v;
		var s= ["th","st","nd","rd"];
		v=i%100;
		var label = i + (s[(v-20)%10]||s[v]||s[0]);
		return label;
	},
	base64Encode(value){
		return Buffer.from(value).toString('base64');
	},
	base64Decode(encodedString){
		return Buffer.from(encodedString, 'base64').toString('ascii');
	},
	getApplicationData(response, appId) {
		if(response?.applicationData?.[appId]?.length) {
			return response?.applicationData?.[appId]?.[0];
		}
	},
	async handleErrors(component, logs){
		let emails = settings.error_recipients || [];
		
		for(let i = 0; emails.length; i++){
			if(!emails[i]) {
				return;
			}
			try {    
				await sendEmail(null, emails[i].to, emails[i].email, null, logs.env + ": HB Event Handler",  "Error: " + component, JSON.stringify(logs, null, 2), null, null, null, 'standard_email');
			} catch(err){
				console.log("couldnt sent email", err);
			}
		}
		return;
	  }, 
	async sendLogsToGDS(component = 'HB_WORKER_SERVER', logs, origin, log_level, request_id, trace_id = '', payload = {}) {

		if (process.env.NODE_ENV === 'test' || process.env.NODE_ENV === 'local') return;
		const { event_name, large_size_log = false, summary } = payload;
		
		console.log('IN SEND LOGS', event_name, ENUMS.LOGGING.SEND_EMAIL)
		request_id = request_id || uuidv4();
		logs.env = process.env.NODE_ENV;
		
		if(logs.timing_start){
			logs.timing = Date.now() - logs.timing_start;
		}
		try {
			if(logs && event_name){
				switch(event_name){
					case ENUMS.LOGGING.SEND_SMS:
						logs = LogRedact.redactSendSMS(logs); 
						break;

					case ENUMS.LOGGING.SEND_EMAIL:
						logs = LogRedact.redactSendEmail(logs); 
						break;
				
					case ENUMS.LOGGING.GATE_ACCESS:
						logs = LogRedact.redactGateAccessAppLogs(logs); 
						break;
					case ENUMS.LOGGING.GENERATE_SHARE_REPORTS:
						logs = LogRedact.redactGenerateShareReports(logs); 
						break;
				}
			}

		} catch(err){ 
			console.log("Redaction Error", err)
			logs.redaction_error = err.toString();
		  }


 
		// if(logs.request?.card?.number){
		// 	logs.request.card.number = '####-' + logs.request.card.number.slice(-4);
		//   }
		//   if(logs.request?.card_number){
		// 	logs.request.card_number = '####-' + logs.request.card_number.slice(-4);
		//   }
		
		// if(logs.request?.paymentMethod?.card_number){
		//   logs.request.paymentMethod.card_number = '####-' + logs.request.paymentMethod.card_number.slice(-4);
		// }
		
		// if(logs.createTransactionRequest?.transactionRequest?.payment?.creditCard?.cardNumber?.length) {
		// 	logs.createTransactionRequest.transactionRequest.payment.creditCard.cardNumber = '####-' + logs.createTransactionRequest.transactionRequest.payment.creditCard.cardNumber.slice(-4);
		// }
	
		// if(logs.createCustomerPaymentProfileRequest?.paymentProfile?.payment?.creditCard?.cardNumber?.length) {
		// 	logs.createCustomerPaymentProfileRequest.paymentProfile.payment.creditCard.cardNumber = '####-' + logs.createCustomerPaymentProfileRequest.paymentProfile.payment.creditCard.cardNumber.slice(-4);
		// }
		
		// if(logs.request?.payment_method?.card_number?.length) {
		//   logs.request.payment_method.card_number = '####-' + logs.request.payment_method.card_number.slice(-4);
		// }
		
		// if(logs.request?.payment_method?.cvv2?.length) {
		//   logs.request.payment_method.cvv2 = logs.request.payment_method.cvv2.replace(/./gi, '*');
		// }
		
		// if(logs.request?.card?.cvn) {
		// 	logs.request.card.cvn = logs.request.card.cvn.replace(/./gi, '*');
		//   }
		
		var data = {
		  uri: `${settings.get_logging_app_url()}/log`,
		  headers: {
			"x-storageapi-key": settings.get_gds_api_key(),
			"X-storageapi-trace-id": trace_id,
			"X-storageapi-request-id": request_id,
			"X-storageapi-date": moment().format('x'),
		  },
		  method: 'POST',
		  json: true,
		  body: {
			origin: origin || 'hb_worker_server',
			component: component,
			log_level: log_level,
			log: logs,
			event_name: event_name
		  }
		}
		if (summary) {
			data.body.summary = summary
		}
		console.log("Log data", JSON.stringify(data, null, 4))
		// if (process.env.NODE_ENV === 'test' || process.env.NODE_ENV === 'local') return;
		let response =  await rp(data);
		 console.log("response", response)
		 if(large_size_log){
			console.log("Logs for property => ", logs.payload?.property_id, " are moved to S3...");
			console.log("Find S3 link on New Relic using request id => ", request_id);
		 }
		if(logs.notify){
			logs.request_id = request_id;
			logs.trace_id = trace_id;
			await this.handleErrors(component, logs)
		}
		return response;
	  },
	async shortenUrl(url){
		try {
			var result = await rp({
				headers: {
					"X-Api-Key": settings.url_shortner.api_key,
					"Content-Type": 'application/json'
				},
				uri: settings.url_shortner.app_url,
				method: 'POST',
				body:{
					longUrl: url
				},
				json: true
			});
			return result;
		} catch (err) {
			console.log(`Error occured while shortening url ${url}`,err);
			throw err;
		}
	},
	async sendLogs(payload) {
		const { res } = payload;
		const { component = this.component, logs, origin = res?.locals.origin, request_id = res?.locals.request_id, trace_id = res?.locals.trace_id } = payload;
		logs.host_machine_name = os.hostname() || null,
		await this.sendLogsToGDS(component, logs, origin, logs.error ? 'error': 'info', request_id, trace_id, payload);
	},
	async request(method, url, payload = {}) {
		if (!method || !url) {
			return e.th(500, 'method and url are required to make a request');
		}

		let { headers = {}, query_params, json = true, body = {}, is_form_data = null } = payload;
		const uri = query_params ? `${url}?${query_params}` : `${url}`;

		const requestObj = {
			headers: headers,
			uri: uri,
			method: method,
			json: json
		};

		if (is_form_data) {
			requestObj.formData = body;
		} else {
			requestObj.body = body;
		}

		let response = '';
		try {
			console.log('Utils - Request obj: ', JSON.stringify(requestObj, null, 2));
			response = await rp(requestObj);
			console.log('Utils - Response obj: ', JSON.stringify(response, null, 2));
		} catch (err) {
			throw err;
		}

		return response;
	},
	logTimestampDifference(label, lastTimestamp) {
		const currentTimestamp = new Date();
		const timeDifference = currentTimestamp - lastTimestamp;
		console.log(`${label}: ${timeDifference} ms`);
		return currentTimestamp;
	},

	//Added by BCT team for Schedule Report
	getReportTimePeriod(label, params){
		let { customStartDate, customEndDate, curr_date } = params;
		curr_date = curr_date || moment().format("YYY-MM-DD");
		let rptTimePeriod = {
			start: customStartDate ? moment(customStartDate).format("YYYY-MM-DD"): null,
			end: customEndDate  ? moment(customEndDate).format("YYYY-MM-DD"): null
		};
		if (!label) {
			return rptTimePeriod;
		}
		
		switch(label.toLowerCase()){
			case 'today':
				rptTimePeriod.start = moment(curr_date).format("YYYY-MM-DD");
				rptTimePeriod.end = moment(curr_date).format("YYYY-MM-DD");
				break;
			case 'yesterday':
				rptTimePeriod.start = moment(curr_date).subtract(1, 'day').format("YYYY-MM-DD");
				rptTimePeriod.end = moment(curr_date).subtract(1, 'day').format("YYYY-MM-DD");
				break;
			case 'last 7 days':
				rptTimePeriod.start = moment(curr_date).subtract(6, 'day').startOf('day').format("YYYY-MM-DD");
				rptTimePeriod.end = moment(curr_date).endOf('day').format("YYYY-MM-DD");
				break;
			case 'last 30 days':
				rptTimePeriod.start = moment(curr_date).subtract(29, 'day').startOf('day').format("YYYY-MM-DD");
				rptTimePeriod.end = moment(curr_date).endOf('day').format("YYYY-MM-DD");
				break;
			case 'last month':
				rptTimePeriod.start = moment(curr_date).subtract(1, "months").startOf("month").format("YYYY-MM-DD"); 
				rptTimePeriod.end = moment(curr_date).subtract(1, "months").endOf("month").format("YYYY-MM-DD");
				break;
			case 'this month':
				rptTimePeriod.start = moment(curr_date).startOf('month').format("YYYY-MM-DD"); 
				rptTimePeriod.end = moment(curr_date).endOf('day').format("YYYY-MM-DD");
				break;
			case 'year to date':
				rptTimePeriod.start = moment(curr_date).startOf('year').format("YYYY-MM-DD");
				rptTimePeriod.end = moment(curr_date).endOf('day').format("YYYY-MM-DD");
				break;
			case 'custom range':
			case 'custom date':
				rptTimePeriod.start = customStartDate ? moment(customStartDate).format("YYYY-MM-DD"): null;
				rptTimePeriod.end = customEndDate  ? moment(customEndDate).format("YYYY-MM-DD"): null;
				break;
			case 'all time':
				break;
		}
		return rptTimePeriod;
	},

	isFalsy(obj) {
		return Object.values(obj).every(value => {
		  // 👇️ check for multiple conditions
		  if (value === null || value === undefined || value === '') {
			return true;
		  }
		  return false;
		})
	},

	async equalArrays(a, b) {
		if (a.length !== b.length) return false;
		const ser = o => JSON.stringify(Object.keys(o).sort().map( k => [k, o[k]] ));
		a = new Set(a.map(ser));
		return b.every( o => a.has(ser(o)) );
	},

	/**
     *
     * @param {Object} data key value pairs on basis of { field: value }
     * @returns {String} prepared statement
     */
	generateUpdateQueryPatch(data) {
		return Object.keys(data).map(key => [`${key} = ?`]).join(",")
	},

	/**
	 *
	 * @param {Object | Array} data object that should be validated against
	 * @param {Array} schema base schema that contains 
	 * @returns {Object} keys
	 */
	generateInsertQueryPatch(data = {}, schema = []) {
		const isArray = Array.isArray(data)
		let values = []
		let sample = Array.isArray(data) && data.length ? data[0] : data
		let keys = Object.keys(sample)
		let valid = keys.every(e => schema.includes(e))
		let escape_sequence = Array(isArray ? 1 : keys.length).fill('?').join(',')

		if(!valid) throw new Error('Please provide valid data')

		if(isArray) {
			values = data.reduce((acc, curr) => {
			acc.push(Object.values(curr))
			return acc
			}, [])
		} else {
			values = Object.values(sample)
			escape_sequence = escape_sequence.replace(/(.*)/, '($1)')
		}

		return {
			fields: keys.join(','),
			escape_sequence,
			values: values
		}
	},
	
	isValidEmail(email){
		if(!email || email === '') return false;
		let validRegex = /(?:[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*|"(?:[\x01-\x08\x0b\x0c\x0e-\x1f\x21\x23-\x5b\x5d-\x7f]|\\[\x01-\x09\x0b\x0c\x0e-\x7f])*")@(?:(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?|\[(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?|[a-z0-9-]*[a-z0-9]:(?:[\x01-\x08\x0b\x0c\x0e-\x1f\x21-\x5a\x53-\x7f]|\\[\x01-\x09\x0b\x0c\x0e-\x7f])+)\])/;
		return email.match(validRegex) ? true: false;
	},

	isValidPhoneNumber(phone){
		/* phone must be in a string of this form "+country_codePhone_num" (without any space)
			i.e., +16102347033 here country_code: 1, phone_num: 6102347033 */
		if(!phone || phone === '') return false;
		if(phone[0] != '+') phone = '+' + phone;
		return parsePhoneNumber(phone).isValid();
	},

	/**
	 * This function finds and returns the sum of a property of an object in an array of objects
	 * @param { Array } array Array of object with the property to find sum of
	 * @param { String } propertyKey Key of the property to find the sum
	 * @returns Sum of the corresponding property in the array
	 */
	findSumOfObjectPropertyInArray(array = [], propertyKey =``) {
		if (!array.length) return;

		const sum = (array.map(item => item[propertyKey]).reduce((a, b) => parseFloat(a) + parseFloat(b)));
		return Math.round(sum * 1e2) / 1e2;
	},

	/**
	 * This function expects an array of objects and a list of property names to return
	 * an array of objects with properties that are provided in the list of properties.
	 * If a property is not found in the object, null will be returned as the property value.
	 * @param { Array } array Array of objects to extract properties from
	 * @param { Array } properties Array of property names as string to extract
	 * @param { String } type Can be either 'array' or 'object'. An array of object will be
	 * returned if the type is object and an array of array will be returned if the type is array.
	 * Default type is 'object'.
	 */
	extractPropertiesFromArrayOfObjects(array = [], properties = [], type = `object`) {
		if (!array?.length || !properties?.length) return;
		if (![`object`, `array`].includes(type)) return `type parameter should either be object or array`;

		let newArray = [];
		for (let object of array) {
			if (typeof object != `object`) return `Please provide an array of objects`

			let newObject = {}, newInnerArray = [];
			for (let property of properties) {
				newObject[property] = object[property] || null;
				newInnerArray.push(object[property] || null);
			}
			if (type == `object`) newArray.push(newObject)
			else newArray.push(newInnerArray)
		}
		return newArray;
	},
	r(value, decimals = 2) {
		let decimal_places = [1e0, 1e1, 1e2, 1e3, 1e4, 1e5, 1e6, 1e7, 1e8, 1e9];
		return Math.round(value * decimal_places[decimals]) / decimal_places[decimals];
	},

};

var settings    = require(__dirname + '/../config/settings.js');