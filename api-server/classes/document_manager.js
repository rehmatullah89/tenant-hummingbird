'use strict';

const fsPromise = require('fs').promises;
const fs = require('fs');
const AWS = require('aws-sdk');
const moment = require('moment');

const Document = require(__dirname + '/document.js');
const settings = require(__dirname + '/../config/settings.js');

class DocumentManager extends Document {
  static END_POINT = settings.getDocumentManagerAppUrl();

  constructor(data) {
    super(data);
    this.template = data.template || null;
    // s3 document key which we will download
    this.key = data.key || null;
  }

  static getHeaders(payload) {
    const { request_id, trace_id } = payload;

    let headers = {
      'X-storageapi-request-id': request_id,
      'X-storageapi-trace-id': trace_id,
      'X-storageapi-key': process.env.GDS_API_KEY,
      'X-storageapi-date': moment().unix(),
      'X-tenant-doc-auth-token': process.env.DOCUMENT_MANAGER_TENANT_AUTH_TOKEN
    };

    return headers;
  }

  static extractData(payload) {
    if (!process.env.DOCUMENT_MANAGER_APP_ID) e.th(500, 'DOCUMENT_MANAGER_APP_ID not set');

    const { result } = payload;
    return result?.applicationData[process.env.DOCUMENT_MANAGER_APP_ID][0]?.data || null;
  }

  static throwError(payload) {
    const { error } = payload;
    console.log('Document Manager error: ', JSON.stringify(error));
    const actualError = error.stack ? JSON.stringify(error?.stack) : JSON.stringify(error);

    const errorMessage = (error?.applicationData && error?.applicationData[process.env.DOCUMENT_MANAGER_APP_ID].length && error.applicationData[process.env.DOCUMENT_MANAGER_APP_ID][0]?.message) || null;

    if (errorMessage) {
      e.th(500, errorMessage, actualError);
    }

    e.th(500, 'Some internal or configuration error occured', actualError);
  }

  static async getTypes(payload) {
    const { request } = utils;

    const { api_info } = payload;
    const headers = DocumentManager.getHeaders(api_info.locals);
    const url = `${DocumentManager.END_POINT}/doctypes`;
    const method = 'GET';

    try {
      const result = await request(method, url, { headers });
      const documentTypes = DocumentManager.extractData({ result });
      return documentTypes;
    } catch (err) {
      DocumentManager.throwError({ error: err.error || err });
    }
  }

  static findNonMemoizedPropertiesGdsIds(properties, memoized_properties) {
    return properties.filter(p => {
      return p.id && !memoized_properties[p.id];
    }).map(p => p.id);
  }

  /**
   * 
   * @param {*} connection 
   * @param {*} properties_to_fetch  properties per template
   * @param {*} memoized_properties 
   * @param {*} payload 
   */
  static async setMemoizedProperties(connection, properties_to_fetch, memoized_properties, payload) {

    const { should_encode } = payload;
    // 
    const properties = await models.Property.findByGdsIds(connection, properties_to_fetch);

    // properties onboarded on docmanager might not be in local instance
    if (properties.length != properties_to_fetch.length) {
      e.th(500, 'Cannot find properties by gds_ids');
    }

    for (let i = 0; i < properties.length; i++) {
      if (should_encode) {
        properties[i].id = Hashes.encode(properties[i].id, connection.cid);
      }

      memoized_properties[properties[i].gds_id] = properties[i];
    }
  }

  static async findAndAssembleProperties(connection, document, payload) {
    const { memoizedProperties } = payload;

    document.Properties = [];
    const propertiesToFetchByGdsIds = DocumentManager.findNonMemoizedPropertiesGdsIds(document.properties, memoizedProperties);

    if (propertiesToFetchByGdsIds.length) {
      await DocumentManager.setMemoizedProperties(connection, propertiesToFetchByGdsIds, memoizedProperties, { ...payload });
    }

    for (let j = 0; j < document.properties.length; j++) {
      if (!document.properties[j]?.id) continue;
      let property = memoizedProperties[document.properties[j].id];
      document.Properties[j] = property;
    }
  }

  static async attachPropertyDetails(connection, documents_param, params) {
    // memoizedProperties contain properties which are already fetched from DB so we don't need to fetch them again
    const memoizedProperties = {};
    const documents = [...documents_param];

    for (let i = 0; i < documents.length; i++) {
      if (params.should_fetch_property_details) {
        await DocumentManager.findAndAssembleProperties(connection, documents[i], { memoizedProperties, ...params });
      }

      delete (documents[i].properties);
    }

    return documents;
  }

  static appendQueryStrings(queryParams, params) {
    for (let key in params) {
      if (params[key]) {
        queryParams += `&${key}=${params[key]}`;
      }
    }

    return queryParams;
  }

  static appendQueryArray(queryParams, obj) {
    if (!Object.keys(obj)?.length) return queryParams;

    const key = Object.keys(obj)[0];
    const arr = obj[key] || [];

    for (let i = 0; i < arr.length; i++) {
      queryParams += `&${key}[]=${arr[i]}`;
    }

    return queryParams;
  }

  static async getDocuments(connection, company, params, payload) {
    if (!company.gds_owner_id) {
      return e.th(500, 'company gds_owner_id is required to get documents');
    }

    const { request } = utils;

    const url = `${DocumentManager.END_POINT}/templates`;
    const { type, count, page, property_gds_ids } = params;
    let queryParams = `companyId=${company.gds_owner_id}`;
    queryParams = DocumentManager.appendQueryStrings(queryParams, { count, page });
    queryParams = DocumentManager.appendQueryArray(queryParams, { type: type });
    queryParams = DocumentManager.appendQueryArray(queryParams, { propertyId: property_gds_ids });

    const { api_info, should_fetch_property_details = false } = payload;
    const headers = DocumentManager.getHeaders(api_info.locals);
    const method = 'GET';

    try {
      console.log("queryParams", queryParams)

      const result = await request(method, url, {
        query_params: queryParams,
        headers
      });

      const documentsRes = DocumentManager.extractData({ result });
      const documents = await DocumentManager.attachPropertyDetails(connection, documentsRes, { should_fetch_property_details, should_encode: true });
      return documents;
    } catch (err) {
      console.log("err", err.stack)
      DocumentManager.throwError({ error: err.error || err });
    }
  }

  static async getTemplateNames(ctx, templates) {
    const url = `${DocumentManager.END_POINT}/templates/names`;
    const headers = DocumentManager.getHeaders(ctx.locals);
    const method = 'POST';

    try {
      const result = await request(method, url, {
        headers, body: { templates }
      });

      const documentsRes = DocumentManager.extractData({ result });

      return documentsRes;
    } catch (error) {
      DocumentManager.throwError({ error });
    }
  }


  static async getTemplatesPerProperty(ctx, property_id, template_name) {
    const url = `${DocumentManager.END_POINT}/templates?propertyId[]=${property_id}&templateName=${template_name}`;
    const headers = DocumentManager.getHeaders(ctx.locals);
    const method = 'GET';
    try {
      const result = await request(method, url, {
        headers
      });

      const documentsRes = DocumentManager.extractData({ result });

      console.log(documentsRes);

      return documentsRes;

    } catch (error) {
      DocumentManager.throwError({ error });
    }
  }

  validateUpdatingDocument() {
    if (!this.Company?.gds_owner_id || !this.name || !this.DocumentType.name) {
      return e.th(500, 'company gds_owner_id, name, type are required to update document');
    }
  }

  validateCreatingDocument() {
    if (!this.Company?.gds_owner_id || !this.name || !this.DocumentType.name || !this.template) {
      return e.th(500, 'company gds_owner_id, name, type and template are required to save document');
    }
  }

  async save(connection, payload) {
    const isUpdatingDocument = !!this.id;
    let url = '';
    let method = '';

    if (isUpdatingDocument) {
      this.validateUpdatingDocument();
      url = `${DocumentManager.END_POINT}/templates/${this.id}`;
      method = 'PUT';
    } else {
      this.validateCreatingDocument();
      url = `${DocumentManager.END_POINT}/templates`;
      method = 'POST';
    }

    const { api_info } = payload;
    let propertyGdsIds = [];
    if (this.Properties?.length) {
      this.Properties = await models.Property.findByIds(connection, this.Properties);
      this.Properties = await Property.findGDSIds(connection, this.Properties);
      propertyGdsIds = this.Properties.map(p => { return { id: p.gds_id }; });
    }

    const { request } = utils;
    const requestBody = {
      name: this.name,
      type: this.DocumentType.name,
      properties: propertyGdsIds,
      description: this.description || '',
      companyId: this.Company.gds_owner_id
    };

    if (this.template?.path) {
      const { originalname = '', mimetype = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', path } = this.template;

      const file = fs.readFileSync(path);
      requestBody.template = `mime:${mimetype};fileName:${originalname};base64:${utils.base64Encode(file)}`;
      const filePath = `${settings.config.base_path}${path}`;
      await fsPromise.unlink(filePath);
    }

    const headers = DocumentManager.getHeaders(api_info.locals);
    try {
      const result = await request(method, url, { body: requestBody, headers });
      const documentsRes = DocumentManager.extractData({ result });
      return documentsRes?.id;
    } catch (err) {

      DocumentManager.throwError({ error: err.error || err });
    }
  }

  async delete(payload) {
    if (!this.id) {
      return e.th(500, 'document_id is required to delete document');
    }

    const { api_info } = payload;
    const headers = DocumentManager.getHeaders(api_info.locals);
    const { request } = utils;
    const url = `${DocumentManager.END_POINT}/templates/${this.id}`;
    const method = 'DELETE';

    try {
      const result = await request(method, url, { headers });
      const property = DocumentManager.extractData({ result });
      return property?.id;
    } catch (err) {
      DocumentManager.throwError({ error: err.error || err });
    }
  }

  async deleteProperty(payload) {
    const { api_info } = payload;

    if (!this.id || !this.Properties?.length) {
      return e.th(500, 'document_id and properties are required to delete document');
    }

    const headers = DocumentManager.getHeaders(api_info.locals);
    const { request } = utils;
    const url = `${DocumentManager.END_POINT}/templates/${this.id}/properties/${this.Properties[0].gds_id}`;
    const method = 'DELETE';

    try {
      const result = await request(method, url, { headers });
      const documentsRes = DocumentManager.extractData({ result });
      return documentsRes.id;
    } catch (err) {
      DocumentManager.throwError({ error: err.error || err });
    }
  }

  async download(company) {
    if (!company?.gds_owner_id || !this.key) {
      return e.th(500, 'company gds_owner_id and document key is required to download the document');
    }

    let awsParams = {
      Bucket: settings.document_manager.bucket_name,
      Key: `${company.gds_owner_id}/templates/${this.key}`
    };

    let s3Promise = new AWS.S3({
      endpoint: 'https://s3.amazonaws.com',
      region: process.env.AWS_REGION
    }).getObject(awsParams).promise();

    try {
      return await s3Promise;
    } catch (err) {
      console.log('Document manager download file error: ', err);
      e.th(500, err);
    }
  }

  async findActiveReversalsUsingDocument(connection) {
    utils.validateFunctionParams({
      required_params: [{ 'id': this.id }],
      function_description: 'find active reversals using document'
    });

    const reversals = await models.Document.findActiveReversals(connection, this.id, { Properties: this.Properties });

    let reversalsList = [];
    for (let i = 0; i < reversals.length; i++) {
      const { type, property_name } = reversals[i];

      let reversalDetails = `Billing - ${type} reversal`;
      if (property_name) {
        reversalDetails += ` at property: ${property_name}`;
      } else {
        reversalDetails += ' at corporate level';
      }

      reversalsList.push(reversalDetails);
    }

    return reversalsList;
  }

  async findActiveRateChangesUsingDocument(connection) {
    utils.validateFunctionParams({
      required_params: [{ 'id': this.id }],
      function_description: 'find active rate changes using document'
    });

    const rateChanges = await models.Document.findActiveRateChange(connection, this.id, { Properties: this.Properties });

    let rateChangesList = [];
    for (let i = 0; i < rateChanges.length; i++) {
      const { rate_change_name, property_name } = rateChanges[i];
      let rateChangeDetails = `Rent Change - ${rate_change_name}`;
      if (this.Properties?.length) {
        rateChangeDetails += ` at property: ${property_name}`;
      }

      rateChangesList.push(rateChangeDetails);
    }

    return rateChangesList;
  }

  async findActiveRateChangeConfigurationsUsingDocument(connection) {
    utils.validateFunctionParams({
      required_params: [{ 'id': this.id }],
      function_description: 'find active rate change configuration using document'
    });

    const rateChangeConfigurations = await models.Document.findActiveRateChangeConfigurations(connection, this.id, { Properties: this.Properties });

    let rateChangeConfigurationsList = [];
    for (let i = 0; i < rateChangeConfigurations.length; i++) {
      const { rate_change_name, property_name } = rateChangeConfigurations[i];
      let rateChangeConfigDetails = `Rent Change - ${rate_change_name}`;
      if (this.Properties?.length) {
        rateChangeConfigDetails += ` at property: ${property_name}`;
      }

      rateChangeConfigurationsList.push(rateChangeConfigDetails);
    }

    return rateChangeConfigurationsList;
  }

  async findActiveTriggersUsingDocument(connection) {
    utils.validateFunctionParams({
      required_params: [{ 'id': this.id }],
      function_description: 'find active triggers using document'
    });

    const triggers = await models.Document.findActiveTriggers(connection, this.id, { Properties: this.Properties });

    let triggersList = [];
    for (let i = 0; i < triggers.length; i++) {
      const { tg_name: triggerGroupName, t_name: triggerName, property_name } = triggers[i];
      let triggerDetails = `Delinquency - ${triggerGroupName}: ${triggerName}`;
      if (this.Properties?.length) {
        triggerDetails += ` at property: ${property_name}`;
      }

      triggersList.push(triggerDetails);
    }

    return triggersList;
  }

  async findActiveProcesses(connection) {
    utils.validateFunctionParams({
      required_params: [{ 'id': this.id }],
      function_description: 'find active processes'
    });

    let processList = [];
    processList.push(...await this.findActiveReversalsUsingDocument(connection));
    processList.push(...await this.findActiveRateChangesUsingDocument(connection));
    processList.push(...await this.findActiveRateChangeConfigurationsUsingDocument(connection));
    processList.push(...await this.findActiveTriggersUsingDocument(connection));

    return processList;
  }

  async getActiveProcessesDetails(connection, payload) {
    const { is_corporate } = payload;

    utils.validateFunctionParams({
      required_params: [{ 'id': this.id }],
      function_description: 'get active processes details'
    });

    if (!is_corporate && !this.Properties.length) {
      e.th(500, 'Properties are required to check active processes at property level');
    }

    let shouldAllowUpdate = true;
    let processes = await this.findActiveProcesses(connection);
    const activeProcessFoundAtProperties = this.Properties?.length && processes.length;
    const checkAtCompanyLevel = is_corporate?.toString().toLowerCase() === 'true';

    if (activeProcessFoundAtProperties) {
      shouldAllowUpdate = false;
    } else if (checkAtCompanyLevel) {
      this.Properties = [];
      processes = await this.findActiveProcesses(connection);
    }

    return {
      allow_update: shouldAllowUpdate,
      active_processes: processes
    }
  }
}

module.exports = DocumentManager;

const Hash = require('../modules/hashes.js');
const Hashes = Hash.init();
const e = require('../modules/error_handler.js');
const utils = require('../modules/utils');
const Property = require('./property.js');
const models = require('../models');
const { request } = require('../modules/utils');