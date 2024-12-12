
var moment  = require('moment');
var momentTimeZone = require('moment-timezone')
var numeral  = require('numeral');
var parsePhoneNumber  = require('libphonenumber-js');
var fs = require('fs');
var request = require('request');
var AWS = require("aws-sdk");
var e  = require(__dirname + '/../modules/error_handler.js');

var awsStorage = require(__dirname + '/../classes/aws_storage');

module.exports = {

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

	formatDateServices: value => {
		if (!value) return '';
		return moment(value).format('MMM DD, YYYY');
	},

	formatLocalFromNow: value => {
		if (!value) return '';
		return moment.utc(value).local().fromNow();
	},

	formatLocalDateTime: (value, timeZone) => {
		if (!value) return '';
		return moment.utc(value).tz(timeZone).format('MM/DD/YYYY [at] H:mm');
	},
	formatLocalDateTimeCustom: (value, timeZone, format) => {
		if (!value) return '';
		return moment.utc(value).tz(timeZone).format(format);
	},
	formatDateTimeCustom: (value, format) => {
		if (typeof value == 'undefined' ||  value === false || value === null  ){
			return '';
		} else {
			return moment.utc(value).local().format(format);
		}
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

		if(!value || !value.length) return '';
		value = value[0].phone;

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

	formatMoney: (value,showDoller = true) => {
		if( value === "non") return ''
		if (typeof value === 'undefined' ||  value === false || value === null  || isNaN(value)) return `${showDoller ? '$': ''}${0.00}`
		if(value < 0) {
			value *= -1;
			value = value.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})
			return `(${showDoller ? '$': ''}${value})`;
		} else {
			value = value.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})
			return `${showDoller ? '$': ''}${value}`;
		}
	},

	formatNumber: (value, dp=0, placeholder='') => {
		if (typeof value == 'undefined' || value === null  ) return placeholder;
		return value.toLocaleString(undefined, {minimumFractionDigits: 0, maximumFractionDigits: 0});
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
		if (!str) return '';
		return str.charAt(0).toUpperCase() + str.slice(1);
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

	dayEnding(i){
		var days = [];
		var v;
		var s= ["th","st","nd","rd"];
		v=i%100;
		var label = i + (s[(v-20)%10]||s[v]||s[0]);
		return label;
	},

	formatMoneyInMillion: function(value) {
		if (typeof value === 'undefined' ||  value === false || value === null  ) return '';
		if(value < 0){
		return "($" + Math.abs(Math.round(value * 1e2) / 1e2).toFixed(2) + ')';
		}
		return numeral(value).format('$0.00a');
	},

	formatNumberInMillion: function(value) {
		if (typeof value === 'undefined' ||  value === false || value === null  ) return '';
		return numeral(value).format('0 a');
	},

	formatFacilityAddress(address){
		if(!address || !address.address) return '';
		const country = address.country ? address.country + ' ' : '';
		let fullAddress = address.address + ', ' + address.city + ', ' + address.state + ', ' + country + address.zip;
        return fullAddress
	},
	formatUTCToLocalDateTime(value, utc_offset, format) {
		return moment(value).utcOffset(utc_offset).format(format)
	},
	formatFacilityName(facility){
		if(!facility) return '';
		let fullAddress = `${facility.number || ''} - ${facility.name || ''}`
        return fullAddress
	},
	formatLocalTimeZone(timeZone, format, timeZineFlag=false) {
		let str = '';
		str = momentTimeZone.tz(timeZone).format(format);
		str += timeZineFlag ? ' ' + momentTimeZone.tz(timeZone).zoneAbbr(): ''
		return str ;
	},
	async getLogoPath(url, company_name){
		let logosFolder =  `${__dirname}/../public/logos`;
		let env = process.env.NODE_ENV || 'env';

		var filename = require('path').basename(url).split('.')[0];
		let logoName =  `${env}-${company_name}-${filename}.png`;
		let logoFile = `${logosFolder}/${logoName}`;
		
		console.log(`env name is: ${env}`);
		console.log(`Company name is: ${company_name}`);
		console.log(`Logo filename is: ${filename}`);

		console.log(`logo fullname is: ${logoName}`);

		if (!fs.existsSync(logosFolder)){
		  fs.mkdirSync(logosFolder);
		}
	
		if (fs.existsSync(logoFile)){
		  return {
			status: 200,
			path: logoFile
		  };
		} else {
			let result = await awsStorage.fileExists(logoName);
			if(result){
				let downloaded = await awsStorage.download(logoFile,logoName).catch(err => {
					console.log("Could not download from S3: ",err);
					return {
						status: 500,
						path: null
					}
				})
				if(downloaded){
					return {
						status: 200,
						path: logoFile
					};
				}
			}
			else {
				let obj = await this.downloadLogoFromCloud(logoFile,url).catch(errObj => {
					console.log("Error occurred while downloading from Cloud");
					return errObj
				})
				if(obj && obj.status === 200){
					let upload_response = await awsStorage.upload(logoName,logoFile);
					if(upload_response) return obj;
				}
			}
		}
	},
	async downloadLogoFromCloud(logoFile,url){
		let extension = url.split('.').pop();
		url = extension && extension.toLowerCase() === 'png'? url: 'https://res.cloudinary.com/storelocal/image/fetch/f_png/'+url;
		let file = fs.createWriteStream(logoFile);
		return new Promise((resolve, reject) => {
			request({
				uri: url,
				gzip: true
			})
			.pipe(file)
			.on('close', () => {
				console.log(`The logo file downloading finished`);
				resolve({
				status: 200,
				path: logoFile
				});
			})
			.on('error', (error) => {
				console.log('Error while downloading logo',error);
				reject(error);
			})
		}).catch(() => ({
			status: 500,
			path: null
		}
		));
	},
	formatDateServicesWithDay: value => {
		if (!value) return '';
		return moment(value).format('dddd, MMM DD, YYYY');
	},

	formatPersontage: value =>{
		if (typeof value == 'undefined' ||  value === false || value === null  || isNaN(value)) return '0.00%';
		if(value < 0){
			value *= -1;
			return '(' + Math.round(value * 1e1) / 1e1 + '%)'
		}
		return Math.round(value * 1e1) / 1e1 + '%'
	},

	formatDecimalPercentage: value => {
		if (typeof value == 'undefined' ||  value === false || value === null  || isNaN(value) ) return '0.00%';
		if(value < 0){
			value *= -1;
			return '(' + ((value * 100) * 1e1 / 1e1).toFixed(2) + '%)'
		}
		return `${parseFloat((value * 100) * 1e1 / 1e1).toFixed(2)}%`;
	},

	transformPropertyEmails(emails) {
		return emails.filter(e => e.email)
	},

	formatInitials(name){
		const alphabetRegex = /^[A-Za-z]/;
		const first = name.first && name.first.match(alphabetRegex);
		const last = name.last && name.last.match(alphabetRegex);
		return `${first ? first[0].toUpperCase() + '.' : ''}${last ? last[0].toUpperCase() + '.' : ''}`;

	}
};
