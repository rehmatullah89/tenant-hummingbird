var settings    = require(__dirname + '/../config/settings.js');
var moment      = require('moment');
var request = require("request-promise");

let cms_manager = {
    getOwnerPermissions() {
        return ["superuser", "export_report", "manage_employees", "edit website", "edit tracking script"];
    },
    getFacilityPermissions() {
        return ["export_report", "edit_web"];
    },
    save(owner_id, data, req) {
        let managerAppId = process.env.MANAGER_APP_ID || "app15817840cba742c58e47a621aef006d9";
        let URI = settings.get_gds_url() + `applications/${managerAppId}/v1/owners/${owner_id}/managers/`
        try {
            request({
                headers: {
                    'authorization': "Hummingbird " +req.headers['authorization'],
                    'X-storageapi-date': moment().unix(),
                },
                body: data,
                json:true,
                uri: URI,
                method: 'POST'
            });
            console.log(">>> UPDATED CMS MANAGER", data)
        }catch(err) {
            console.error(">>> FAILED TO UPDATE CMS MANAGER", err)
        }
    }
}
module.exports = cms_manager;