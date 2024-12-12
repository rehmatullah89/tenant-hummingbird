var express = require("express");
var router = express.Router();
var db = require(__dirname + "/../modules/db_handler.js");
var control = require(__dirname + "/../modules/site_control.js");
const fs = require('fs');

var BillingVerification = require(__dirname + "/../billing/verification.js");
var models  = require(__dirname + '/../models');

module.exports = function (app) {

  router.post("/billing/verification", control.hasAccess(), async (req, res, next) => {
    try {
        const body = req.body;
        let company_id = null;
        var connection = {};

        if(body.rds_level){
            connection = await db.getConnectionByDBName("read", body.rds_instance, body.rds_schema);
        }else{
            let cid = parseInt(body.cid) || null;
            let mapping = await db.getMappingByCompanyId(cid);
            company_id = mapping.hb_company_id;
            connection = await db.getConnectionByType("read", cid);
        }

      let filters = { ...body, company_id };
      let excel_file = await BillingVerification.downloadInExcel(connection, filters);
      const contents = fs.readFileSync(excel_file, {encoding: 'base64'});

      try {
        fs.unlinkSync(excel_file);
        console.log(`File ${excel_file} has been deleted.`);
      } catch (error) {
        console.error(`Error deleting ${excel_file}: ${error.message}`);
      }
      
      res.send({
        status: 200,
        data: contents,
      });

    } catch (err) {
      next(err);
    } finally{
        await db.closeConnection(connection);
    }
  });

  return router;
};
