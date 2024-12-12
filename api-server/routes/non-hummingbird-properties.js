let express = require("express");
let router = express.Router();
let utils = require(__dirname + "/../modules/utils.js");

let Hash = require(__dirname + "/../modules/hashes.js");
let Hashes = Hash.init();
let control = require(__dirname + "/../modules/site_control.js");
let Address = require("../classes/address.js");
let Contact = require(__dirname + "/../classes/contact.js");
let Property = require(__dirname + "/../classes/property.js");
let eventEmitter = require(__dirname + "/../events/index.js");

const joiValidator = require("express-joi-validation")({
  passError: true,
});

let Schema = require(__dirname + "/../validation/properties.js");
let e = require("../modules/error_handler");

module.exports = function (app, sockets) {
  router.post(
    "/",
    [control.hasAccess(["admin", "api"]), joiValidator.body(Schema.createNonHbProperty), Hash.unHash],
    async (req, res, next) => {
      // TODO - Should we update the list?
      let connection = res.locals.connection;
      try {
        await connection.beginTransactionAsync();

        let contact = res.locals.contact;
        let company = res.locals.active;

        let body = req.body;
        let params = req.params;

        let property = new Property(body);
        property.company_id = company.id;

        let address = new Address(body.Address);
        await address.findOrSave(connection);
        property.address_id = address.id;
        property.Address = address;

        await property.verifyUniqueNonHbProperty(connection);
        await property.saveNonHbProperty(connection, body);

        //Giving the property access to the user creating it by default

        if (res?.locals?.contact?.id) {
          contact = new Contact({ id: res.locals.contact.id });
          await contact.find(connection);
          await contact.getNonHbRole(connection, company.id);
          await contact.saveNonHbPropertyAccess(connection, property.id);
        }

        await connection.commitAsync();

        utils.send_response(res, {
          status: 200,
          data: {
            property_id: Hashes.encode(property.id, res.locals.company_id),
          },
        });
        eventEmitter.emit("property_created", {
          company,
          contact,
          property,
          cid: res.locals.company_id,
          locals: res.locals,
        });
      } catch (err) {
        await connection.rollbackAsync();
        next(err);
      }
    }
  );

  router.get("/", [control.hasAccess(["admin", "api"]), Hash.unHash], async (req, res, next) => {
    let connection = res.locals.connection;

    try {
      let totalCount = 0;
      let company = res.locals.active;
      let contact = {};
      let base_properties = [];
      let nonHbProperties = [];
      if (res.locals.contact) {
        contact = new Contact({ id: res.locals.contact.id });
        await contact.find(connection, company.id);
        await contact.getNonHbRole(connection, company.id);
        base_properties = contact.NonHbProperties.map((p) => p.id);
        base_properties = base_properties.length ? base_properties : [];
        nonHbProperties = await contact.findNonHbProperty(connection, company.id);
      }

      let searchParams = {
        all: req.query.all || false,
        search: req.query.search || "",
        limit: req.query.limit || 200,
        offset: req.query.offset || 0,
      };
      /* Finding the total number of properties for a company.*/
      let totalProperties = await Property.findNonHbPropertyByCompanyId(
        connection,
        company.id,
        searchParams,
        base_properties,
        nonHbProperties,
        true
      );
      totalCount = totalProperties?.[0]?.count ?? 0;
      let property_list = await Property.findNonHbPropertyByCompanyId(
        connection,
        company.id,
        searchParams,
        base_properties,
        nonHbProperties,
        false
      );
      let properties = [];
      for (let i = 0; i < property_list.length; i++) {
        let property = new Property({ id: property_list[i].id });

        await property.findNonHbProperty(connection);
        await property.getAddress(connection);
        properties.push(property);
      }

      utils.send_response(res, {
        status: 200,
        data: {
          properties: Hash.obscure(properties, req),
          paging: {
            total: totalCount,
            count: properties.length,
          },
        },
        message: "",
      });
    } catch (err) {
      next(err);
    }
  });

  router.get("/:property_id", [control.hasAccess(["admin", "api"]), Hash.unHash], async (req, res, next) => {
    let connection = res.locals.connection;
    try {
      let contact = res.locals.contact;
      let company = res.locals.active;
      let params = req.params;

      let property = new Property({ id: params.property_id });
      await property.findNonHbProperty(connection);

      contact = new Contact({ id: contact.id });
      await contact.find(connection, company.id);
      await contact.getNonHbRole(connection, company.id);
      let authorizedProperties = contact.NonHbProperties.map((property) => property.id);
      if (!authorizedProperties.length) e.th(403, "Not authorized");
      await property.verifyAccess({company_id: company.id, properties: authorizedProperties});

      utils.send_response(res, {
        status: 200,
        data: {
          property: Hash.obscure(property, req),
        },
      });
    } catch (err) {
      next(err);
    }
  });

  router.put(
    "/:property_id",
    [
      control.hasAccess(["admin", "api"]),
      control.hasPermission("manage_facility_info"),
      joiValidator.body(Schema.updateNonHummingbirdProperty),
      Hash.unHash,
    ],
    async (req, res, next) => {
      let connection = res.locals.connection;
      try {
        let contact = res.locals.contact;
        let company = res.locals.active;
        let { body, params } = req;

        let property = new Property({ id: params.property_id });
        await property.findNonHbProperty(connection);

        contact = new Contact({ id: contact.id });
        await contact.find(connection, company.id);
        await contact.getNonHbRole(connection, company.id);
        let authorizedProperties = contact.NonHbProperties.map((property) => property.id);
        if (!authorizedProperties.length) e.th(403, "Not authorized");
        await property.verifyAccess({company_id: company.id, properties: authorizedProperties});

        if (body.Address) {
          let address = new Address(body.Address);
          await address.findOrSave(connection);
          body.address_id = address.id;
        }

        property.update(body);
        await property.verifyUniqueNonHbProperty(connection);
        await property.saveNonHbProperty(connection, body);

        utils.send_response(res, {
          status: 200,
          data: {
            property_id: Hashes.encode(property.id, res.locals.company_id),
          },
        });
      } catch (err) {
        next(err);
      }
    }
  );

  return router;
};
