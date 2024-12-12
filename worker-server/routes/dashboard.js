var express = require("express");
var router = express.Router();
var db = require(__dirname + "/../modules/db_handler.js");
var control = require(__dirname + "/../modules/site_control.js");
const fs = require('fs');
const AccessControl = require("../classes/access_control");

var ServicesDashboard = require(__dirname + "/../dashboard/services.js");
var PayoutDelayDashboard = require(__dirname + "/../dashboard/payout_report.js");
var models  = require(__dirname + '/../models');

module.exports = function (app) {

  router.get("/dashboard/services", control.hasAccess(), async (req, res, next) => {
    try {

      let {
        company_id: payload_company_id, property_id = null,
        timeFrame, metric, start_date = null, end_date = null,
        db_level = false
      } = req.query;


      var cid = parseInt(payload_company_id) || null;
      let mapping = await db.getMappingByCompanyId(cid);
      var connection = await db.getConnectionByType("read", cid);
      let company_id = mapping.hb_company_id;

      db_level = db_level && JSON.parse(db_level);
      let filters = { timeFrame, metric, start_date, end_date };
      if(!db_level){
        filters = { ...filters, company_id, property_id };
      }
      
      let excel_file = await ServicesDashboard.downloadInExcel(connection, filters);
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
    }
    await db.closeConnection(connection);
  });

  router.get("/dashboard/payoutDelay", control.hasAccess(), async (req, res, next) => {
    try {
      let {
          company_id: payload_company_id,
          property_id = null,
          timeFrame,
          metric,
          start_date = null,
          end_date = null,
          download
      } = req.query;
      var cid = parseInt(payload_company_id) || null;
      let mapping = await db.getMappingByCompanyId(cid);
      var connection = await db.getConnectionByType("read", cid);
      let company_id = mapping.hb_company_id;
      let admin = res.locals.admin;

      let filters = {
          dryRun: true,
          timeFrame,
          metric,
          company_id: company_id,
          property_id: property_id,
          start_date,
          end_date,
          download
      };

      let metricData = await PayoutDelayDashboard.fetchPayoutDelayDashboardMetricsData(cid, {
          connection,
          filters,
          admin,
      });


      if (download) {
          let excel_file = await PayoutDelayDashboard.downloadPayoutExcel(metricData);
          const contents = fs.readFileSync(excel_file, { encoding: 'base64' });
          res.send({
              status: 200,
              data: contents,
          });
      }
      else {
          console.log("Mertic Data : ", metricData);
          res.send({
              status: 200,
              data: metricData,
          });
      }

    } catch (err) {
        next(err);
    }
    await db.closeConnection(connection);
  });
 
  	// Lease Configuration Status check

	router.get('/configuration/status', control.hasAccess(), async (req, res, next) => {
		
		try { 
			const { query: {c_id, p_id } = {} } = req;
			let mapping = await db.getMappingByCompanyId(parseInt(c_id));
			let connection = await db.getConnectionByType('read', mapping.company_id);
      let hb_c_id = mapping.hb_company_id;

      // delinquency configurations
      const delinquencyConfigurationRecordsPromise = models.Property.propertiesWithoutTriggers(connection, hb_c_id, p_id);//done 0
      // Lease configurations
      const leaseConfigurationRecordsPromise = models.Unit.getUnitsWithoutLeaseTemplate(connection, hb_c_id, p_id);//done 1
      // Accounting configurations
      const companyToggleAccountSettingsPromise = models.Setting.findCompanySetting(connection, 'toggleAccounting', hb_c_id)
        .then(async (companyToggleAccountSettings) => {
          if (companyToggleAccountSettings?.value == 1) {
            return (await models.AccountingTemplate.findDefaultTemplateById(connection, hb_c_id)).length > 0 ? 1 : 0;
          }
          return 0;
        });
      //  payment processor configurations
      const connectionPropertiesPromise = models.Property.propertiesInConnections(connection, hb_c_id, p_id); //done 3


      // Document Manager
      const companyGdsId = mapping?.gds_owner_id ? mapping.gds_owner_id : null;

      // Access Control configurations
      const accessControl = p_id ? new AccessControl({ property_id: p_id }) : new AccessControl();

      // Result from configuration class
      let accessConfigurationPromise = accessControl.getAccessConfiguration(connection, hb_c_id);
      let propertyListPromise = models.Property.findAllActive(connection, p_id, hb_c_id);
      
      // Tax configurations
      const getPropertiesUnitTypesResponsePromise = models.Unit.getPropertiesUnitTypes(connection, hb_c_id, p_id);
      const taxConfigurationRecordsPromise = models.Property.findPropertiesTaxProfiles(connection, hb_c_id, p_id);

      const promises = [
        delinquencyConfigurationRecordsPromise,  // delinquency
        leaseConfigurationRecordsPromise,  //lease 
        companyToggleAccountSettingsPromise, // Accounting 
        connectionPropertiesPromise,  // Payment processor
        accessConfigurationPromise, //For access control
        propertyListPromise,  //For access control
        getPropertiesUnitTypesResponsePromise, //Tax configurations
        taxConfigurationRecordsPromise, //Tax configurations
      ];

      const results = await Promise.allSettled(promises);

      const delinquencyConfigurationRecords = results[0]; // Delinquency
      const leaseConfigurationRecords = results[1]; // Lease
      const accountingDefaultTemplate = results[2]; // Accounting
      const connectionProperties = results[3]; // Payment processor
    
      // Access configurations
      let accessConfiguration = results[4]; // For access control
      let propertyList = results[5]; // For access control

      if (accessConfiguration.status !== 'rejected' && propertyList.status !== 'rejected') {
        if (!Array.isArray(results[4].value)) {
          accessConfiguration = [results[4].value];
        }else{
          accessConfiguration = results[4].value; 
        }
        propertyList = results[5].value; 
        const filteredProperties = propertyList.filter(property =>
          !accessConfiguration.some(config =>
            config && config.facility_id && config.facility_id == property.id.toString()
          )
        );
        accessConfiguration = filteredProperties;
      } else {
        accessConfiguration = (accessConfiguration.status == 'rejected') ? accessConfiguration : propertyList;
        propertyList = propertyList.status == 'rejected' ? [] : propertyList.value;
      }
    
      // Tax configurations
      let getPropertiesUnitTypesResponse = results[6]; // For tax
      let taxConfigurationRecords = results[7]; // For tax
    
      let mergedDataForTexProfiles;
    
      if (getPropertiesUnitTypesResponse.status !== 'rejected' && taxConfigurationRecords.status !== 'rejected') {
        const taxCategoriesArray = ['merchandise', 'fee', 'insurance', 'auction', 'deposit'];
        const checkForSpaceTypes = ['storage', 'residential', 'parking'];
        getPropertiesUnitTypesResponse = results[6].value; // For tax
        taxConfigurationRecords = results[7].value;

        let mergedTaxTypes = getPropertiesUnitTypesResponse.reduce((result, record) => {
          const types = record.storage_types.split(',');
          const mergedArray = [...types, ...taxCategoriesArray];
          result[record.property_id] = mergedArray;
          return result;
        }, {});

        let mergedTaxCategoriesArray = [...taxCategoriesArray, ...checkForSpaceTypes];

        let propertyIdsFromUnits = Object.keys(mergedTaxTypes).map(Number);
        let propertyIdsAll = propertyList.map(item =>(item.id));
        const missingIds = propertyIdsAll.filter(item => !propertyIdsFromUnits.includes(item));

        const updatedMergedArray = missingIds.reduce((result, id) => {
          result[id] = mergedTaxCategoriesArray.slice(); 
          return result;
        }, { ...mergedTaxTypes });

        mergedTaxTypes = updatedMergedArray;

        taxConfigurationRecords.forEach(record => {
          if (mergedTaxTypes[record.property_id]) {
            mergedTaxTypes[record.property_id] = mergedTaxTypes[record.property_id].filter(item => item !== record.profile_tax_type);
          }
        });

        try {
          const allPropertiesHavingUnits = await models.Property.findPropertiesByCompanyAndBulkIds(connection, hb_c_id, p_id ? [p_id] : []);
          mergedDataForTexProfiles = allPropertiesHavingUnits.map(record => {
            const property_id = record.property_id;
            const types = mergedTaxTypes[property_id] || [];
            if (types.length) {
              const adjustedTypes = types.join(', ');
              return {
                ...record,
                types: adjustedTypes
              };
            }
          });
          mergedDataForTexProfiles = mergedDataForTexProfiles.filter(item => item);
        } catch (error) {
          mergedDataForTexProfiles = error;
        }
      } else {
        mergedDataForTexProfiles = getPropertiesUnitTypesResponse.status === 'rejected'
          ? getPropertiesUnitTypesResponse
          : taxConfigurationRecords.status === 'rejected'
            ? taxConfigurationRecords
            : [];
      }
    
      res.send({
        status: 200,
        data: {
          lease_configuration: leaseConfigurationRecords,
          delinquency_configuration: delinquencyConfigurationRecords,
          accounting_configuration: accountingDefaultTemplate,
          payment_processor_configuration: connectionProperties,
          company_gds_owner_id: companyGdsId,
          tax_configuration: mergedDataForTexProfiles,
          access_configuration: accessConfiguration,
        }
      });      
      
		
			
		} catch(err){
			next(err);
		}

	});

  return router;
};
