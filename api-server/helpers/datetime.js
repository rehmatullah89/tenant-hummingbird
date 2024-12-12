const moment = require('moment-timezone');

/**
 * Currently faclilities are saving static utc offsets with timzone abbrev
 * Static utc offsets doesn't account for daylight savings
 * time zone abbrev is not unique per standard timezones 
 * 
 * We should save the standard timezone names to account
 *  1. daylight savings
 *  2. future changes in the timezone rules 
 */

const _defaultFormat = "YYYY-MM-DDTHH:mm:ss"; 
const _defaultOffset = "+00:00"

/**
 * Converts date string in standard formats to UTC 
 * if there is no timeZone available,  fallback to use the static offset
 * default offset is utc +00:00
 * default format "YYYY-MM-DDTHH:mm:ss"
 * 
 * @param {*} date 
 * @param {*} opts { offset, timeZone, format }
 * @returns 
 */
exports.getUtcTime = (date, opts) =>{
    const {offset = _defaultOffset, timeZone, format = "YYYY-MM-DDTHH:mm:ssZ", isISO} = opts

    let _date = date;

    if(isISO){
        _date = date.replace(/[zZ]/g,'')
    }

    _date = moment(_date).format(_defaultFormat);

    if(timeZone){
        return moment.tz(_date, timeZone).utc().format(format);
    }

    /**
     * offset is the standard offset seen from utc time
     */

   return moment(_date).utcOffset(parseInt(offset), true).format(format);
}

