

let rp = require('request-promise');
let moment = require('moment');
let settings = require('../config/settings');
let utils = require('./utils');

let headers = {
  "x-storageapi-key": process.env.GDS_API_KEY,
  "x-storageapi-date": moment().format('x'),
  "Content-Type": "application/json"
};

var VerificationStatus = {

  async checkVerifiedTokenStatus(data) {
    let website_info = {
      uri: `${settings.get_communication_app_url()}/owners/${data?.owner_id}/otp/${data?.verification_token}/`,
      headers,
      json: true,
      method: 'get',
    }
    let res = await rp(website_info);
    if(res){
      return utils.getApplicationData(res, process.env.COMMUNICATION_APP_KEY);
    }
  },

};

module.exports = {
  checkVerifiedTokenStatus: async function(gds_owner_id){
    return await VerificationStatus.checkVerifiedTokenStatus(gds_owner_id);
  },
}