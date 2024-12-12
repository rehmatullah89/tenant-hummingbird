let express = require("express");
let router = express.Router();
let models = require(__dirname + "/../models");

let Hash = require(__dirname + "/../modules/hashes.js");
let Hashes = Hash.init();

let control = require(__dirname + "/../modules/site_control.js");

let e = require(__dirname + "/../modules/error_handler.js");
let utils = require(__dirname + "/../modules/utils.js");
let Company = require(__dirname + "/../classes/company.js");
const joiValidator = require("express-joi-validation")({
  passError: true,
});

let Schema = require(__dirname + "/../validation/index.js");
let db = require(__dirname + "/../modules/db_handler.js");
const os = require('os');

module.exports = function (app) {
  app.use("/v1/companies/onboard", async (req, res, next) => {
    let connection;
    try {
      connection = await db.getConnectionByDb(req.method, req.body.database, req.body.collection);
      res.locals.connection = connection;
      next();
    } catch (error) {
      let err = new Error("Error occurred while getting database connection");
      err.code = 400;
      next(err);
    }
  });

  /* Endpoint to create companies for dev portal */
  router.post(
    "/",
    [joiValidator.body(Schema.onboardCompany),
    control.hasScopes(["createOwner", "createFacility"])],
    async (req, res, next) => {
      let connection = res.locals.connection;
      try {
        await connection.beginTransactionAsync();

        let company = new Company(req.body);
        await company.createCompany(connection, req.body);
        let companyDetails = await company.findBySubdomain(connection);
        if (!companyDetails) e.th(400, "Failed to create company");

        let dynamoDbEntries = await db.getAllCompanies();
        let latestDynamoHbCompanyId = Math.max(...dynamoDbEntries.map(companies => companies.company_id)) ?? 0;
        let newDynamoCompanyId = latestDynamoHbCompanyId + 1;

        let data = {
          ...req.body,
          ...{
            company_id: newDynamoCompanyId,
            hashed_company_id: Hashes.encode(newDynamoCompanyId),
            hb_company_id: company.id,
          },
        };
        await db.saveCompany(data);
        let createdCompany = await db.getMappingBySubdomain(req.body.subdomain);
        company.hashed_company = createdCompany?.hashed_company_id;
        await company.updateCompanyDetails(connection, req.body);

        let properties = await models.Property.findPropertyBySubdomain(connection, req.body.subdomain);
        let response = {
          id: "",
          name: company?.name,
          gds_owner_id: company?.gds_owner_id,
          subdomain: company?.subdomain,
          email: company?.email,
          phone: company?.phone,
          properties: properties,
        };
        req.company_id = company?.id;
        let hashedCompanyId = company.hashed_company;
        let hashedResponse = Hash.obscure(response, req);
        hashedResponse["id"] = hashedCompanyId;
        await connection.commitAsync();

        utils.send_response(res, {
          status: 200,
          data: hashedResponse
        });
      } catch (err) {
        await connection.rollbackAsync();
        next(err);
      }
    }
  );

  return router;
};
