var express = require('express');
var router = express.Router();
var utils    = require(__dirname + '/../modules/utils.js');
var Hash = require(__dirname + '/../modules/hashes.js');
var control  = require(__dirname + '/../modules/site_control.js');
var PropertyAmenities = require(__dirname + '/../classes/space_management/property_amenities.js');
var Hashes = Hash.init();

const getQueue = require("../modules/queue");
const Queue = getQueue('hummingbirdQueue');

module.exports = function(app) {
	router.get('/test',  async(req, res, next) => {
        utils.send_response(res, {
            status: 200,
            data: "Api's working!"
        });
    });

    router.get('/amenities', [control.hasAccess(['admin']), Hash.unHash], async(req, res, next) => {
        var company = res.locals.active;
        var connection = res.locals.connection;

        try {
            const properties = req.query.properties.split(',').map((p) => Hashes.decode(p)[0]);
            const propertyAmenities = new PropertyAmenities({ companyId: company.id });
            const PropertyAmenityList = await propertyAmenities.getAllPropertyAmenityDetails(connection, properties);

            utils.send_response(res, {
                status: 200,
                data: {
                    amenities: Hash.obscure(PropertyAmenityList, req)                    
                },
                msg: "Amenities retrieved successfully!"
            });
        } catch(err) {
            next(err);
        }
    })

    router.get('/properties/:property_id/space-type/:space_type/amenities', [control.hasAccess(['admin']), Hash.unHash], async(req, res, next) => {
        var company = res.locals.active;
        var connection = res.locals.connection;

        try {
            const type = req.query.type || 'add';
            const propertyAmenities = new PropertyAmenities({
                propertyId: req.params.property_id,
                spaceType: req.params.space_type,
                companyId: company.id
            });
            const PropertyAmenityList = await propertyAmenities.getPropertyAmenityDetails(connection, type);

            utils.send_response(res, {
                status: 200,
                data: {
                    amenities: Hash.obscure(PropertyAmenityList, req)                    
                },
                msg: "Amenities retrieved successfully!"
            });    
        } catch(err) {
            next(err);
        }
    })

    router.put('/property-amenities', [control.hasAccess(['admin'])], async(req, res, next) => {
        var connection = res.locals.connection;
        var contact = res.locals.contact;
        var company_id =  res.locals.company_id;
        var company =  res.locals.active;
        const body = Hash.clarify(req.body);
		try {
            const amenities = body.amenities;
            const isDelete = body.isDelete;
            const spaceType = body.spaceType;
            const propertyAmenities = new PropertyAmenities({ amenityList: amenities, spaceType: spaceType });
            await propertyAmenities.bulkUpdatePropertyAmenityDetails(connection, contact, company_id, company, isDelete);
            
			utils.send_response(res, {
				status: 200,
				data: "Amenities update process started!"
			});
		} catch(err) {
            next(err);
		}
	});
    
    router.put('/property-amenities/sort-order', [control.hasAccess(['admin'])], async(req, res, next) => {
        var connection = res.locals.connection;
        
		try {
            const propertyAmenities = new PropertyAmenities({ amenityList: Hash.clarify(req.body) });
            await propertyAmenities.updatePropertyAmenitiesSortOrder(connection);
            
			utils.send_response(res, {
                status: 200,
				data: "Amenities sort order updated Successfully!"
			});
		} catch(err) {
			next(err);
		}
	});

    router.get('/properties/:property_id/amenities/:amenity_id', [control.hasAccess(['admin']), Hash.unHash], async(req, res, next) => {
        var company = res.locals.active;
        var connection = res.locals.connection;

        try {
            const type = req.query.type || 'edit';
            const propertyAmenities = new PropertyAmenities({
                propertyId: req.params.property_id,
                amenityId: req.params.amenity_id,
                companyId: company.id
            });
            const PropertyAmenity = await propertyAmenities.getPropertyAmenityDetails(connection, type);

            utils.send_response(res, {
                status: 200,
                data: {
                    amenity: Hash.obscure(PropertyAmenity[0], req)                    
                },
                msg: "Amenity retrieved successfully!"
            });
    
        } catch(err) {
            next(err);
        }
    });
    
    router.get('/amenity-categories', [control.hasAccess(['admin']), Hash.unHash], async(req, res, next) => {   
        var connection = res.locals.connection;
        
        try {
            const propertyAmenities = new PropertyAmenities();
            const CategoryList = await propertyAmenities.getAmenityCategories(connection);
            
            utils.send_response(res, {
                status: 200,
                data: {
                    categories: Hash.obscure(CategoryList, req)                                    
                },
                msg: "Data retrieved successfully!"
            });
        } catch(err) {
            next(err);
        }
    });

    router.put('/property-amenity/:property_amenity_id', [control.hasAccess(['admin'])], async(req, res, next) => {
        var company = res.locals.active;
        var connection = res.locals.connection;
        var params = req.params;
        try {
            const data = {
                id: params.property_amenity_id,
                amenity_id: req.body.amenity_id,
                property_id: req.body.property_id,
                amenity_name:  req.body.property_amenity_name || req.body.master_amenity_name,
                amenity_category_id:  req.body.amenity_category_id || req.body.master_category_id,
                amenity_options: req.body.property_options || req.body.options,
                default_value: req.body.property_default_value,
                sort_order: req.body.property_sort_order,
                companyId: company.id,
                spaceType: req.body.property_type
            }
            const propertyAmenities = new PropertyAmenities(Hash.clarify(data));
            await propertyAmenities.updatePropertySingleAmenity(connection, res.locals.company_id);
    
            utils.send_response(res, {
                status: 200,
                data: `${data.amenity_name} has been updated.`
            });
        } catch(err) {
            next(err);
        }
    });
    
    router.post('/amenities', [control.hasAccess(['admin'])], async(req, res, next) => {
		var connection = res.locals.connection;
        var contact = res.locals.contact;
        var company_id =  res.locals.company_id;
        var company =  res.locals.active;

		try {
            const propertyAmenities = new PropertyAmenities();
            const amenity = Hash.clarify(req.body);

            amenity['company_id'] = res.locals.active.id;
            await propertyAmenities.createPropertyAmenity(connection, amenity, contact, company_id, company);

            utils.send_response(res, {
                status: 200,
                data: `Process Started to add ${amenity.name} in ${amenity.property_type}.`,
            });
		} catch(err) {
			next(err);
		}
	});

    router.post('/spaces', [control.hasAccess(['admin'])], async(req, res, next) => {
		var connection = res.locals.connection;
        var contact = res.locals.contact;
        var company = res.locals.active;
		try {
            const unitList = req.body.unitList;
            const propertyAmenities = new PropertyAmenities({propertyId: Hashes.decode(req.body.spaceDetails.property_id)[0]});
            let existingAmenities = await propertyAmenities.validateSpaceNumber(connection, unitList);


            const diff = unitList.filter(value => !existingAmenities.includes(value));

            if(diff.length >= 0){
              req.body.unitList = diff
              req.body.duplicateList = existingAmenities;
            }


            /* kicks off the process to create spaces and add amenities to that spaces. See Workers */
            if(existingAmenities.length === 0 || diff.length > 0){
              existingAmenities = [];
              await Queue.add('spaces_creation', {
                  cid: res.locals.company_id,
                  company_id: company.id,
                  contact_id: contact.id,
                  info: req.body,
                  socket_details: {
                      company_id: res.locals.company_id,
                      contact_id: contact.id
                  }
              }, {priority: 1});
            }

            utils.send_response(res, {
                status: 200,
                msg: existingAmenities.length > 0 ? "Duplicate Spaces" : "Spaces creation process started successfully!",
                data: {
                    duplicates: existingAmenities,
                    addedSpaces: diff ?? []
                }
              });


    } catch(err) {
      next(err);
    }
  });

    router.post('/space-amenities', [control.hasAccess(['admin'])], async(req, res, next) => {
        var contact = res.locals.contact;
        var company = res.locals.active;
        req.body.property_id = res.locals.properties;
		try {
            /* kicks off the process to update amenities to the provided unit list. See Workers */

            await Queue.add('unit_amenity_update', {
                cid: res.locals.company_id,
                company_id: company.id,
                contact_id: contact.id,
                info: req.body,
                socket_details: {
                    company_id: res.locals.company_id,
                    contact_id: contact.id
                }
            }, {priority: 1});

            utils.send_response(res, {
                status: 200,
                data: "Space amenity update process started successfully!"
            });
		} catch(err) {
			next(err);
		}
	});

    router.put('/delete-spaces', [control.hasAccess(['admin'])], async(req, res, next) => {
		var connection = res.locals.connection;
        var contact = res.locals.contact;
		try {
            await connection.beginTransactionAsync();
            const propertyAmenities = new PropertyAmenities();
            const units = req.body.units;
            const { result, leased } = await propertyAmenities.deleteSpaces(connection, contact, units, res.locals.company_id, res.locals.properties);
            await connection.commitAsync();

            if (result) {

                
                utils.send_response(res, {
                    status: 200,
                    data: "Spaces deleted Successfully!",
                });
            } else {
                utils.send_response(res, {
                    status: 409,
                    data: {},
                    msg: {
                        message: "The space/s below currently have a lease history or a pending lease. Deselect all the below spaces to delete other spaces.",
                        leased: leased
                    }
                });
            }
		} catch(err) {
			await connection.rollbackAsync();
			next(err);
		}
	});

    router.put('/deactivate-spaces', [control.hasAccess(['admin'])], async(req, res, next) => {
		var connection = res.locals.connection;
        var contact = res.locals.contact;

		try {
            const propertyAmenities = new PropertyAmenities({propertyId: Hashes.decode(req.body.propertyId)[0]});
            const { deactivate, units } = req.body;
            const { result, leased } = await propertyAmenities.deactivateSpaces(connection, contact, deactivate, units);

            if (result) {
                utils.send_response(res, {
                    status: 200,
                    data: `Spaces ${deactivate ? 'Deactivated': 'Activated'} Successfully!`,
                });
            } else {
                utils.send_response(res, {
                    status: 409,
                    data: {},
                    msg: {
                        message: "The space/s below currently have an active lease or a pending lease. Deselect all the below spaces to deactivate other spaces.",
                        leased: leased
                    }
                });
            }
		} catch(err) {
			next(err);
		}
	});

    return router;
}