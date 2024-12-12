import Vue from 'vue'
import moment from 'moment';
import momentTimeZone from 'moment-timezone';
import { parsePhoneNumber }  from 'libphonenumber-js';

Vue.filter('formatDate', function(value){
	if (!value || moment(value).format('MM/DD/YYYY') == 'Invalid date') return '';
	return moment(value).format('MM/DD/YYYY');
});

Vue.filter('formatDateServices', function(value){
	if (!value || moment(value).format('MM/DD/YYYY') == 'Invalid date') return '';
	return moment(value).format('MMM DD, YYYY');
});

Vue.filter('formatDateDocuments', function(value){
	if (!value || moment(value).format('MM/DD/YYYY') == 'Invalid date') return '';
	return moment(value).subtract(8, 'hours').format('MMM DD, YYYY [@] h:mma');
});

Vue.filter('formatLocalFromNow', function(value){
	if (!value) return '';
	return moment.utc(value).local().fromNow();
});

Vue.filter('formatSmallDate', function(value){
	if (!value) return '';
	return moment(value).format('M/D/YY');
});

Vue.filter('formatLocalDateTime', function(value){
	if (!value) return '';
	return moment.utc(value).local().format('MM/DD/YYYY [at] h:mm a');
});

Vue.filter("formatTime12Hour", function (value) {
  if (!value) return "";

  return moment(value).format("hh:mm a");
});

Vue.filter('formatLocalDateTimeServices', function(value){
	if (!value) return '';
	return moment.utc(value).local().format('MMM DD, YYYY [@] h:mma');
});

Vue.filter('formatDateTime', function(value){
	if (!value) return '';
	return moment.utc(value).format('MM/DD/YYYY [at] h:mm a');
});


Vue.filter('formatLocalTime', function(value){
	if (!value) return '';
	return moment.utc(value).local().format('h:mm a');
});

Vue.filter('formatLocalDate', function(value){
	if (!value) return '';
	return moment(value).local().format('MM/DD/YYYY');
});

Vue.filter('formatLocalShortDate', function(value){
	if (!value) return '';
	return moment(value).local().format('MMM DD, YYYY');
});

Vue.filter('formatFileSize', function(value, b=2){
	if (!value) return '';
	const c=0>b?0:b,d=Math.floor(Math.log(value)/Math.log(1024));
	return parseFloat((value/Math.pow(1024,d)).toFixed(c))+" "+["Bytes","KB","MB","GB","TB","PB","EB","ZB","YB"][d];
});


Vue.filter('formatPhone', function(value){
	if (!value) return '';
  try {
	  var parsedPhoneNumber = parsePhoneNumber('+' + value);

    if(parsedPhoneNumber && parsedPhoneNumber.isValid()){
      if(parsedPhoneNumber.country === 'US'){
        return '+1 ' + parsedPhoneNumber.formatNational();
      } else {
        return parsedPhoneNumber.formatInternational();
      }
    } else {
      value = value.toString();

      var numbers = value.replace(/\D/g, ''), char = {0: '(', 3: ') ', 6: '-'};
      value = '';
      for (var i = 0; i < numbers.length; i++) {
        value += (char[i] || '') + numbers[i];
      }
    }
  } catch(err){
    console.log(err)
  }
  return value;

});

Vue.filter('formatPhoneFacility', function(value){
	if (!value) return '';
	value = value.toString();

	var numbers = value.replace(/\D/g, ''),  char = {0:'(',3:') ',6:'-'};
	value = '';
	for (var i = 0; i < numbers.length; i++) {
	  value += (char[i]||'') + numbers[i];
	}
	return value;

});

Vue.filter('hbFormatPhone', function(value){
	if (!value) return '';
	value = value.toString();

	var numbers = value.replace(/\D/g, ''),  char = {0:'(',3:') ',6:'-'};
	value = '';
	for (var i = 0; i < numbers.length; i++) {
	  value += (char[i]||'') + numbers[i];
	}
	return value;

});

Vue.filter('dayEnding', function(i){
  var days = [];
  var v;
  var s= ["th","st","nd","rd"];
  v=i%100;
  var label = i + (s[(v-20)%10]||s[v]||s[0]);
  return label;
});




Vue.filter('capitalize', function(value){
	if (!value) return '';
	value = value.toString();
	return value.charAt(0).toUpperCase() + value.slice(1);
});



Vue.filter('formatSSN', function(value){
	if (!value) return '';
	value = value.toString();
	return value.substr(0, 3) + '-' + value.substr(3, 2) + '-' + value.substr(5);
});

Vue.filter('formatMoney', function(value){
	if (typeof value == 'undefined' ||  value === false || value === null  ) return '';
	if(value < 0){
		return "($" + Math.abs(Math.round(value * 1e2) / 1e2).toFixed(2) + ')';
	}
	return "$" + (Math.round(value * 1e2) / 1e2).toFixed(2);
});

Vue.filter('formatNumber', function(value){

	if (typeof value == 'undefined' ||  value === false || value === null  ) return '';
  return value;

});


Vue.filter('formatMinutes', function(value){
	if (value === false || value === null  ) return '';
	return  parseInt(value) > 9 ? "" + parseInt(value): "0" + parseInt(value);
});


Vue.filter('nl2br', function(str){
	if (typeof str === 'undefined' || str === null) {
		return '';
	}
	var breakTag = '<br />';
	return (str + '').replace(/([^>\r\n]?)(\r\n|\n\r|\r|\n)/g, '$1' + breakTag + '$2');
});

Vue.filter('slugify', function(text){
	return text.toString().toLowerCase()
		.replace(/\s+/g, '-')           // Replace spaces with -
		.replace(/[^\w-]+/g, '')       // Remove all non-word chars
		.replace(/--+/g, '-')         // Replace multiple - with single -
		.replace(/^-+/, '')             // Trim - from start of text
		.replace(/-+$/, '');            // Trim - from end of text
});

Vue.filter('formatMoneyWithComma', function(value,digits){

	if (typeof value == 'undefined' ||   isNaN(value) || value === false || value === null  ) {
    value = 0;
  }

	if (typeof digits == 'undefined') {
		digits = 2
	}
	return value.toLocaleString(undefined, {minimumFractionDigits: digits, maximumFractionDigits: digits})
});

Vue.filter('formatMoneyAndAddComma', function(value){

	if (typeof value == 'undefined' ||  value === false || value === null  ) return '';

	let result = Math.abs(Math.round(value * 1e2) / 1e2).toFixed(2);
	result = result.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})
	return (value < 0 ? "(" : "") + "$" + result + (value < 0 ? ")" : "");
});

Vue.filter('formatPercentage', function(value){
	if (typeof value == 'undefined' ||  value === false || value === null  ) return '0.0%';
	let result = Math.round(value * 1e1) / 1e1;
	return result.toLocaleString(undefined, {minimumFractionDigits: 1, maximumFractionDigits: 1}) + '%'
});

Vue.filter('formatLocalDateTimeLong', function(value,timeFlag){
	if (!value) return '';
	if (timeFlag) {
		return moment.utc(value).local().format('dddd, MMMM DD, YYYY');
	} else {
		return moment.utc(value).local().format('dddd, MMMM DD, YYYY h:mm:ss A');
	}
});

Vue.filter('formatDateTimeCustom', function(value, format){
	if (typeof value == 'undefined' ||  value === false || value === null  ){
		return '';
	} else {
		return moment.utc(value).local().format(format);
	}
});

Vue.filter('formatDateCustom', function(value, format){
	if (typeof value == 'undefined' ||  value === false || value === null  ){
		return '';
	} else {
		return moment(value).format(format);
	}
});

Vue.filter('userlocalTime',function(timeZone,format){
	return moment.tz(timeZone).format(format)+` ${moment.tz(timeZone).zoneAbbr()}` ;
});

Vue.filter('EmptyStringFiller', function(value){
	return value ? value : '-----';
});
