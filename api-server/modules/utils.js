var moment = require('moment');
var e = require(__dirname + '/./error_handler.js');
var context = require(__dirname + '/./request_context.js');
var settings = require(__dirname + '/../config/settings.js');
var rp = require('request-promise');
var { sendEmail } = require(__dirname + '/./mail.js');
const { v4: uuidv4 } = require('uuid');
const LogRedact = require(__dirname + '/./log_redaction.js');
const DEFAULT_PAGE_PARAMS = {
  limit: 20,
  offset: 0
};

const MAX_PAGE_LIMIT = 100;
const CONCISE_PAGE_LIMIT = 10000;

var utils = {
  component: 'HB_API_Server',
  /**
   * Clean query params by assigning default values, capping limit and offset
   *
   * Predefined default values:
   * - limit = 20
   * - offset = 0
   * @param {Object} query Query param object
   * @param {Object} defaultValues Object to pass default values
   * @returns {Object} Object with cleaned query param data
   */
  cleanQueryParams(query, defaultValues = {}, isConcise = false) {
    let cleanedQueryParams = {};
    let defaultParams = { ...DEFAULT_PAGE_PARAMS, ...defaultValues };
    // Assign default values
    for (let param in defaultParams) {
      cleanedQueryParams[param] = query[param] || defaultParams[param];
    }
    return { ...cleanedQueryParams, ...this.cleanLimitOffset(cleanedQueryParams, isConcise) };
  },
   /**
   *
   * @param {Object} data key value pairs on basis of { field: value }
   * @returns {String} prepared statement
   */
  generateUpdateQueryPatch(data) {
    return Object.keys(data)
      .map((key) => [`${key} = ?`])
      .join(',')
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
    let valid = keys.every((e) => schema.includes(e))
    let escape_sequence = Array(isArray ? 1 : keys.length)
      .fill('?')
      .join(',')

    if (!valid) throw new Error('Please provide valid data')

    if (isArray) {
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
  /**
   *
   * @param {Object} target object to pick keys from
   * @param {Array} keys list of keys to be picked
   * @returns {Object} object which contains picked up data
   */
  pick(target, keys) {
    return keys.reduce((obj, key) => {
      if (target && target.hasOwnProperty(key)) {
        obj[key] = target[key]
      }
      return obj
    }, {})
  },
  sortBy(key) {
    return function (a, b) {
      if (a[key] < b[key]) {
        return -1
      }
      if (a[key] > b[key]) {
        return 1
      }
      return 0
    }
  },
  /**
   * Clean limit and offset by assigning defaults and capping max possible value
   * @param {Object} params Query param object
   * @returns {Object} Object with cleaned limit and offset data
   */
  cleanLimitOffset(params, isConcise = false) {
    return {
      limit: this.cleanLimit(params, isConcise),
      offset: this.cleanOffset(params)
    };
  },
  /**
   * Clean limit by assigning defaults and capping max possible value
   * @param {Object} params Query param object
   * @returns {Object} Cleaned limit value
   */
  cleanLimit(params, isConcise = false) {
    const defaultLimit = DEFAULT_PAGE_PARAMS["limit"];

    let { limit } = { ...params };
    limit = Number.parseInt(limit) || defaultLimit;
    if (limit <= 0) limit = defaultLimit;
    limit = Math.min(limit, isConcise ? CONCISE_PAGE_LIMIT : MAX_PAGE_LIMIT);
    return limit;
  },
  /**
   * Clean offset by assigning defaults and capping min possible value
   * @param {Object} params Query param object
   * @returns {Object} Cleaned offset value
   */
  cleanOffset(params) {
    const defaultOffset = DEFAULT_PAGE_PARAMS["offset"];

    let { offset } = { ...params };
    offset = Number.parseInt(offset) || defaultOffset;
    if (offset < 0) offset = defaultOffset;

    return offset
  },
  /**
   * Method to generate paging for api
   * Query parameters requiring encoding must be encoded before calling method
   * Query parameters with same key must have all the values in an Array
   * @param  {Object} req get url details
   * @param  {Object} query containing query params
   * @param  {Number} totalCount
   * @param  {Number} currentCount
   * @returns {Object} Returns a object containing paging info(next and prev page links)
  */
  generatePagingObject(req, query, totalCount, currentCount, isConcise = false) {
    const baseURL = `${settings.config.protocol || "http"}://${req.headers.host
      }${req.baseUrl}${req.path}?`;
    const limit = this.cleanLimit(query, isConcise);
    let paging = {};
    paging.total = paging.count = 0;
    if (totalCount) paging.total = totalCount;
    if (currentCount) paging.count = currentCount;
    if (totalCount && limit)
      paging.num_pages = Math.ceil(totalCount / limit);

    return { ...paging, ... this.generatePageLinks(baseURL, query, totalCount, currentCount, isConcise) };
  },
  /**
   * Method to generate next and prev links
   * Query parameters requiring encoding must be encoded before calling method
   * Query parameters with same key must have all the values in an Array
   * @param  {Object} baseURL get url details
   * @param  {Object} query containing query params
   * @param  {Number} totalCount
   * @param  {Number} currentCount
   * @returns {Object} returns a object containing next and prev links
  */
  generatePageLinks(baseURL, query, totalCount, currentCount, isConcise = false) {
    let next = baseURL;
    let prev = baseURL;
    let { limit, offset } = { ...this.cleanLimitOffset(query, isConcise) };

    let getPreviousOffset = () => {
      // Maximum offset value is capped to total result count
      const maxOffset = Math.min(offset, totalCount);
      const diff = maxOffset - limit;
      return diff > 0 ? diff : 0;
    };

    let getPreviousLimit = () => Math.min(offset, limit);

    for (let key in query) {
      switch (key) {
        case "offset":
          next += `&offset=${limit + offset}`;
          prev += `&offset=${getPreviousOffset()}`;
          break;

        case "limit":
          next += `&limit=${limit}`;
          prev += `&limit=${getPreviousLimit()}`;
          break;

        default:
          if (!query[key]) {
            continue;
          }
          if (Array.isArray(query[key]) && query[key].length) {
            // handling multiple same query params
            for (let val of query[key]) {
              next += `&${key}=${val}`;
              prev += `&${key}=${val}`;
            }
          } else {
            next += `&${key}=${query[key]}`;
            prev += `&${key}=${query[key]}`;
          }
          break;
      }
    }
    // Removing & symbol from first query parameter
    next = next.replace('&', "");
    prev = prev.replace('&', "");
    // Return prev and next link only if data is available
    if (!(offset + currentCount < totalCount)) {
      next = null;
    }
    if (offset === 0 || totalCount === 0) {
      prev = null;
    }
    return { next, prev };
  },
  /**
   * check if date is valid or not
   * @param {string} date
   * @param {object} config config for validation
   * @param {string} config.dateFormat Change date format default YYYY-MM-DD
   * @param {string} config.errMessage Custom error message date validation
   * @param {boolean} config.isFutureCheck Check for future date
   * @return {boolean} true
   */
  validateDateFormat(date, config) {
    let dateFormat = config?.dateFormat || 'YYYY-MM-DD';
    let errorMessage = config?.errMessage || `Required date format is (${dateFormat})`;
    if (!moment(date, dateFormat, true).isValid()) e.th(400, errorMessage);
    if (config?.isFutureCheck && moment(date).isAfter()) e.th(400, "Invalid Date. The date entered is in the future");
    return true
  },

  /**
   * An error will be raised if the from date is less than the to date and both dates will be validated
   * fromDate is a required field
   * @param {string} fromDate From date / start date
   * @param {string} toDate To date / end date
   * @param {object} config config for validation
   * @param {string} config.fromDateErrMessage Custom error message for missing from date
   * @param {string} config.toDateErrMessage Custom error message for missing from date
   * @param {string} config.dateFormat Change date format default YYYY-MM-DD
   * @param {string} config.errMessage Custom error message date validation
   * @param {boolean} config.checkToDate Flag to check for to date
   * @param {boolean} config.isFutureCheck Check for future date
   */
  dateRangeValidator(fromDate, toDate, config) {

    const { dateFormat = 'YYYY-MM-DD', fromDateErrMessage = 'From date is required', toDateErrMessage = 'To date is required', checkToDate = false, errMessage = '', isFutureCheck = false } = { ...config }

    if (!fromDate) e.th(400, fromDateErrMessage);
    if (checkToDate && !toDate) e.th(400, toDateErrMessage);

    this.validateDateFormat(fromDate, { dateFormat, errMessage, isFutureCheck });
    this.validateDateFormat(toDate, { dateFormat, errMessage, isFutureCheck });
    if (moment(toDate, dateFormat).toDate() < moment(fromDate, dateFormat).toDate()) { e.th(400, 'Invalid Date range') };
  },

  findTimeframe: function (data) {
    var timeframe = {
      start: '',
      end: ''
    }
    if (data.timeframe) {
      switch (data.timeframe) {
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

      if (data.timeframe == "Custom") {
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
    value = value.toString();

    var numbers = value.replace(/\D/g, '');
    var char = {};
    var start = 0;

    if (value.length === 10) {
      char = { 0: '(', 3: ') ', 6: '-' };
    } else {
      char = { 1: '(', 4: ') ', 7: '-' };
      start = 1;
    }

    value = '+1 '

    for (var i = start; i < numbers.length; i++) {
      value += (char[i] || '') + numbers[i];
    }
    return value;
  },

  formatSSN: value => {
    if (!value) return '';
    value = value.toString();
    return value.substr(0, 3) + '-' + value.substr(3, 2) + '-' + value.substr(5);
  },

  parsePhoneNumber: (phones, require_sms, require_primary) => {
    if (!phones || !phones.length) return null;

    let phone_numbers = phones.filter(p => {
      if (require_sms && !p.sms) return null;
      if (require_primary && !p.primary) return null;
      return true
    }).map(p => {
      let parsed_phone = String(p.phone);
      if (parsed_phone.length < 11) {
        parsed_phone = 1 + parsed_phone;
      }
      if (parsed_phone.charAt(0) !== '+') {
        parsed_phone = '+' + parsed_phone;
      }
      return parsed_phone;

    })

    return phone_numbers.length ? phone_numbers[0] : null


  },

  formatMoney: value => {
    // x = x.toFixed(2);
    // var pattern = /(-?\d+)(\d{3})/;
    // while (pattern.test(x))
    // 	x = x.replace(pattern, "$1,$2");
    // return x;

    if (typeof value === 'undefined' || value === false || value === null) return '';
    if (value < 0) {
      return "($" + Math.abs(Math.round(value * 1e2) / 1e2).toFixed(2) + ')';
    }
    return "$" + (Math.round(value * 1e2) / 1e2).toFixed(2);

  },

  formatNumber: value => {
    if (typeof value == 'undefined' || value === false || value === null) return '';
    return value;
  },

  slugify: function (text) {
    return text.toString().toLowerCase()
      .replace(/\s+/g, '-')           // Replace spaces with -
      .replace(/[^\w\-]+/g, '')       // Remove all non-word chars
      .replace(/\-\-+/g, '-')         // Replace multiple - with single -
      .replace(/^-+/, '')             // Trim - from start of text
      .replace(/-+$/, '');            // Trim - from end of text
  },
  capitalizeFirst: function (str) {
    if(!str) return str;
    return str.charAt(0).toUpperCase() + str.slice(1);
  },
  nl2br: function (str, is_xhtml) {
    var breakTag = (is_xhtml || typeof is_xhtml === 'undefined') ? '<br />' : '<br>';
    return (str + '').replace(/([^>\r\n]?)(\r\n|\n\r|\r|\n)/g, '$1' + breakTag + '$2');
  },
  capitalizeAll: function (str) {
    return str.replace(/(^|\s)[a-z]/g, function (f) { return f.toUpperCase(); });
  },
  saveTiming(connection, req, locals) {
    var trackingData = {
      api_id: locals.api ? locals.api.id : null,
      contact_id: locals.contact ? locals.contact.id : null,
      ip_address: req.headers['x-forwarded-for'] || req.connection.remoteAddress,
      endpoint: req.originalUrl,
      query: JSON.stringify(req.query),
      time: Date.now() - locals.timing
    }
    var trackingSql = "insert into tracking set ? ";
    return connection.queryAsync(trackingSql, trackingData);
  },

  dayEnding(i) {
    var days = [];
    var v;
    var s = ["th", "st", "nd", "rd"];
    v = i % 100;
    var label = i + (s[(v - 20) % 10] || s[v] || s[0]);
    return label;
  },
  async hasPermission(payload) {

    let {connection, company_id, permissions = [], contact_id, api} = payload;

    //let permissions = context.getValue('permissions');
    if (!api?.id) {
      let data = {company_id, contact_id: contact_id, permissions}
      let unauthorized_permissions = await models.Contact.hasPermissions(connection, data)

      if(unauthorized_permissions?.length)
        e.th(403, "You are not allowed to access this resource");
    }
  },
  base64Encode(value) {
    return Buffer.from(value).toString('base64');
  },
  base64Decode(encodedString) {
    return Buffer.from(encodedString, 'base64').toString('ascii');
  },
  stringToEnumValue(e, key) {
    for (const [k, v] of Object.entries(e)) {
      if (k === key) return v;
    }
    return null;
  },
  stringToEnumKey(e, value) {
    for (const [k, v] of Object.entries(e)) {
      if (v === value) return k;
    }
    return null;
  },
  getISOOffset(date) {
    if (!date) return null;
    return moment.parseZone(date).format('Z');
  },
  async handleErrors(component, logs) {
    let emails = settings.error_recipients;
    
    for(let i = 0; emails.length; i++){
        if(!emails[i]) { 
            return;
        }
        try {    
            await sendEmail(null, emails[i].to, emails[i].email, null, 'account@tenantinc.com', logs.env + ": HB Event Handler",  "Error: " + component, JSON.stringify(logs, null, 2), null, null, null);
        } catch(err){
            console.log("couldnt sent email", err);
        }
    }
    return;
  }, 
  send_response(res, payload) {
    payload.status = payload.status || 200;
    payload.data = payload.data || {};
    payload.message = payload.message || '';
    // TODO strip credit card and other sensitive data out of logs

    res.locals.response = payload;
    res.status(payload.status).json(payload);
  },
  async sendLogsToGDS(component = 'HB_API_Server', logs, origin, log_level, request_id, trace_id = '', payload = {}) {
    
    if (process.env.NODE_ENV === 'test' || process.env.NODE_ENV === 'local' || process.env.NODE_ENV === 'data-validation') return;
    
    const { event_name } = payload;
    
    request_id = request_id || uuidv4();
    logs.env = process.env.NODE_ENV;

    console.log("Find S3 link on New Relic using request id => ", request_id);
    console.log("Find S3 link on New Relic using trace_id id => ", trace_id);
    console.log("endpoint url: ", logs?.endpoint);
    
    if (logs.timing_start) {
      logs.timing = Date.now() - logs.timing_start;
    }
    try {
      
      if(logs && component){
        switch(component){
          case 'HB_AUTHNET_INTEGRATION':
            logs = LogRedact.redactAuthnetIntegration(logs); 
            break;
          case 'HB_GATE_ACCESS_APP':
            logs = LogRedact.redactGateAccessAppLogs(logs); 
            break;
          default: 
            logs = LogRedact.redact(logs); 

        }
      }
    } catch(err){ 
      console.log("Redaction Error", err)
      logs.redaction_error = err.toString();
    }
    // console.log("logs", JSON.stringify(logs, null, 2))


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
        origin: origin,
        component: component,
        log_level: log_level,
        log: logs,
        event_name: event_name
      }
    }

    try {
      var response =  await rp(data);
    } catch(err) {
      logs.error = err; 
      // lets not try to immediately send back to the logger, lets handle it through email or slack. 
      // await utils.sendLogsToGDS(utils.component, logs, res.locals.origin, 'error', res.locals.request_id, res.locals.trace_id, payload); 
      utils.sendToSlack(utils.component, data); 
      logs.notify = true;
    }

    if(logs.notify){
        logs.request_id = request_id;
        logs.trace_id = trace_id;
        await utils.handleErrors(component, logs)
    }
    return response;
  },

  async shortenUrl(url) {
    try {
      var result = await rp({
        headers: {
          "X-Api-Key": settings.url_shortner.api_key,
          "Content-Type": 'application/json'
        },
        uri: settings.url_shortner.app_url,
        method: 'POST',
        body: {
          longUrl: url
        },
        json: true
      });
      return result;
    } catch (err) {
      console.log(`Error occured while shortening url ${url}`, err);
      throw err;
    }
  },
  formatLocalDateTimeCustom: (value, timeZone, format) => {
    if (!value) return '';
    return moment.utc(value).tz(timeZone).format(format);
  },
  removeFromObjectByKey(key, object) {
    if (!(key in object)) {
      throw "Key doesn't exsist in Object";
    }
    delete object[key];
  },
  removeFromArrayOfObjectsByKey(key, array_of_objects) {
    for (const object of array_of_objects) {
      this.removeFromObjectByKey(key, object);
    }
  },
  orderKeys(obj, keysOrder) {
    keysOrder.forEach((key) => {
      const value = obj[key]
      delete obj[key]
      obj[key] = value
    })
  },
  constructLogs(payload) {
    const { res, logs } = payload;

    let loggingData = {};
    if (res) {
      loggingData = {
        cid: res.locals.company_id,
        ...res.locals.logging,
        contact_id: res.locals.contact?.id,
        role: res.locals.contact?.role,
        company_id: res.locals.active?.id,
        response: res.locals.response
      };

      // add error stack trace to log payload
      if (res.locals.logging.error) {
        loggingData.error_stack = res.locals.logging.error.stack;
      }

      //TODO reduntant but keeping it for now, should be removed later after testing the 
      // new relic logs
      loggingData.reqId = res.locals.request_id;
    }

    return { ...loggingData, ...logs };
  },
  async sendLogs(payload) { 
    let logs = {};
    const { res } = payload;
    try {
        logs = utils.constructLogs(payload);
        await utils.sendLogsToGDS(utils.component, logs, res?.locals?.origin, logs.error ? 'error': 'info', res?.locals?.request_id, res?.locals?.trace_id, payload);
    } catch(err) {
        logs.error = err;
        await utils.sendLogsToGDS(utils.component, logs, res?.locals?.origin, 'error', res?.locals?.request_id, res?.locals?.trace_id, payload);
    }
  },
  async sendToSlack(component, logs){
    console.log("process.env.SLACK_LOGGING_URL", process.env.SLACK_LOGGING_URL)
    let reqObj = {
        headers: {
            "content-type": "application/json",
        },
        body: {
            text: JSON.stringify({ component, logs })
        },
        json: true,
        method: "POST",
        uri: process.env.SLACK_LOGGING_URL,
    };
    return await rp(reqObj);
  }, 
  sendEventLogs(payload) {
    if (process.env.NODE_ENV === 'test' || process.env.NODE_ENV === 'local') return;

    const { error, data, eventName } = payload;
    const logData = { event_name: eventName };
    let { res, ...eventData } = data;

    const logs = {};
    logs.event_data = eventData;

    logs.event_error = error?.stack?.toString() || error?.message?.toString() || error;
    logs.error = true;

    utils.sendLogs({ res: res, logs: logs, ...logData });
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
  validateFunctionParams(payload = {}) {
    const { required_params = [], function_description } = payload;
    let error = '';

    for (let j = 0; j < required_params.length; j++) {
      const property = Object.keys(required_params[j])[0];

      if (!required_params[j][property]) {
        error = error !== '' ? error += ', ' : error;
        error += property;
      }
    }

    if (error != '') {
      error += ` is required to ${function_description}`;
      e.th(500, error);
    }
  },
  r(value, decimals = 2) {
    let decimal_places = [1e0, 1e1, 1e2, 1e3, 1e4, 1e5, 1e6, 1e7, 1e8, 1e9];
    return Math.round(value * decimal_places[decimals]) / decimal_places[decimals];
  },
  /* Finding the common elements in two arrays. */
  findCommonElements(array1, array2) {
    return array1?.filter(el => array2.includes(el));
  },
  async equalArrays(a, b) {
    if (a.length !== b.length) return false;
    const ser = o => JSON.stringify(Object.keys(o).sort().map(k => [k, o[k]]));
    a = new Set(a.map(ser));
    return b.every(o => a.has(ser(o)));
  },
  /**
   * Method for authorising the users access to a given list of properties
   * @param {Array, Number} requestedProperties Array of properties or a property ID to validate
   * @param {Array} authorisedProperties Array of properties from res.locals
   * @returns An array of properties
   * @throws {Forbidden} Exception if any one of the `requestedProperties` are not found in `authorisedProperties`
  */
  validateProperties(requestedProperties, authorisedProperties) {
    let properties = Array.isArray(requestedProperties) ? requestedProperties : requestedProperties ? [requestedProperties] : []
    if (properties?.length) {
      for (let property of properties) {
        if (!authorisedProperties.includes(property)) {
          e.th(403, "");
        }
      }
      return properties
    } else {
      if (authorisedProperties.length) {
        return authorisedProperties
      } else {
        e.th(403, "");
      }
    }
  },
  normalizeJson(json = {}, type = 'stringify') {
    return Object.entries(json || {}).reduce((acc, entry) => {
      let [ key, val ] = entry || []
      acc[key] = val ? JSON[type](val) : null
      return acc
    }, {})
  },
  /**
   * Method to clean phonenumbers
   * Cleans the passed in phonenumber of symbols and formatting
   * A 10 digit phonenumber is assumed to be a US number and country code 1 is added as prefix
   * @param {String} number The phone number to be cleaned
   * @returns Cleaned phone number
   */
  cleanPhoneNumber(number) {
    if (!number) return '';
    const phone = number.toString().replace(/\D+/g, '');
    return phone.length === 10 ? `1${phone}` : phone;
  },

  commaSeparatedToArray(value){
    
    if(typeof value === 'string'){
      let _array = value.split(',');
      return _array;
    }

    return [];
  },

  /**
   * Function that takes an object as argument and sets any keys with falsy values to null
   * It iterates over each key in the object and checks if its value is falsy.
   * If it is, the value is set to null.
   * The function then returns the updated object with null values for any falsy keys.
   */
  nullifyFalsyValues(obj) {
    for (let key in obj) {
      if (!obj[key]) obj[key] = null;
    }
    return obj;
  },
  
  /*
   * Method to restrict duplicate query parameters
   * @param {object} query Query parameters
   * @param {string} Name of the query parameter to avoid duplicate
   * @return {string} return the query parameter value
   */
  restrictDuplicateQueryParams (query, queryParam) {
    if (query[queryParam] instanceof Array && query[queryParam].length > 1) {
        e.th(400, `Duplicate '${queryParam}' query parameters are not allowed`);
    } else return query[queryParam];
  },

  convertToArray(value) {
    // TODO handle undefined and null values
    return Array.isArray(value) ? value : [value];
  }
  
};

module.exports = utils;
var models    = require(__dirname + '/../models');
