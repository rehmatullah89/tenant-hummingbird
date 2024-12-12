"use strict"

const fsPromise = require('fs').promises;
const fs = require('fs');
const AWS = require("aws-sdk");
const moment = require('moment');
const { v4: uuidv4 } = require('uuid');

const Document = require(__dirname + '/document.js');
const settings = require(__dirname + '/../config/settings.js');

class DocumentManager extends Document {
  static END_POINT = settings.getDocumentManagerAppUrl(); 
  static RENDERER_END_POINT = settings.getDocumentManagerRendererUrl();

  constructor(data) {
    super(data);
    data = data || {};
    this.template = data.template || null;
    // s3 document key which we will download
    this.key = data.key || null;
    this.mergedTokens = [];
  }

  static getHeaders(payload = {}) {
    const { request_id, trace_id } = payload;

		let headers = {
			"X-storageapi-request-id" : request_id, 
			"X-storageapi-trace-id" : trace_id,
      "X-storageapi-key": process.env.GDS_API_KEY,
      "X-storageapi-date": moment().unix(),
      'X-tenant-doc-auth-token': process.env.DOCUMENT_MANAGER_TENANT_AUTH_TOKEN
		}
		
		return headers;
	}

  static extractData(payload) { 
    if(!process.env.DOCUMENT_MANAGER_APP_ID) e.th(500, 'DOCUMENT_MANAGER_APP_ID not set');

    const { result } = payload;
    return result?.applicationData[process.env.DOCUMENT_MANAGER_APP_ID][0]?.data || null;
  }

  static throwError(payload) {
    const { error } = payload;
    const errorMessage = (error?.applicationData && error?.applicationData[process.env.DOCUMENT_MANAGER_APP_ID].length && error.applicationData[process.env.DOCUMENT_MANAGER_APP_ID][0]?.message) || null;
    
    if(errorMessage) {
      e.th(500, errorMessage);
    }

    e.th(500, JSON.stringify(error) || error);
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
    } catch(err) {
      DocumentManager.throwError({ error: err.error || err });
    }
  }

  transformTokens() {
    let transformedData = {};

    for(let i = 0; i < this.mergedTokens.length; i++) {
      let keys = this.mergedTokens[i].name.split('.');
      if(!transformedData[keys[0]]) {
        transformedData[keys[0]] = {};
      }

      transformedData[keys[0]][keys[1]] = this.mergedTokens[i].value;
    }

    return transformedData;
  }

  static findNonMemoizedPropertiesGdsIds(properties, memoized_properties) {
    return properties.filter(p => {
      return p.id && !memoized_properties[p.id];
    }).map(p => p.id);
  }

  static async setMemoizedProperties(connection, properties_to_fetch, memoized_properties) {
    const properties = await models.Property.findByGdsIds(connection, properties_to_fetch);
    if(properties.length != properties_to_fetch.length) {
      e.th(500, 'Cannot find properties by gds_ids');
    }

    for(let i = 0; i < properties.length; i++) {
      memoized_properties[properties[i].gds_id] = properties[i];
    }
  }

  static async findAndAssembleProperties(connection, document, payload) {
    const { memoizedProperties } = payload;

    document.Properties = [];
    const propertiesToFetchByGdsIds = DocumentManager.findNonMemoizedPropertiesGdsIds(document.properties, memoizedProperties);
    if(propertiesToFetchByGdsIds.length) {
      await DocumentManager.setMemoizedProperties(connection, propertiesToFetchByGdsIds, memoizedProperties);
    }
    
    for(let j = 0; j < document.properties.length; j++) {
      if(!document.properties[j]?.id) continue;
      let property = memoizedProperties[document.properties[j].id];
      document.Properties[j] = property;
    }
  }

  static async attachPropertyDetails(connection, documents_param, params) { 
    // memoizedProperties contain properties which are already fetched from DB so we don't need to fetch them again
    const memoizedProperties = {};
    const documents = [...documents_param];

    for(let i = 0; i < documents.length; i++) {
      if(!params.property_id) {
        await DocumentManager.findAndAssembleProperties(connection, documents[i], { memoizedProperties });
      }

      delete(documents[i].properties);      
    }

    return documents;
  }

  static appendQueryStrings(queryParams, params) {
    for(let key in params) {
      if(params[key]) {
        queryParams += `&${key}=${params[key]}`;
      }
    }

    return queryParams;
  }

  static appendQueryArray(queryParams, obj) {
    if(!Object.keys(obj)?.length) return queryParams;

    const key = Object.keys(obj)[0];
    const arr = obj[key] || [];

    for(let i = 0; i < arr.length; i++) {
      queryParams += `&${key}[]=${arr[i]}`;
    }

    return queryParams;
  }

  static async getDocuments(connection, company, params, payload) {
    if(!company.gds_owner_id) {
      return e.th(500, 'company gds_owner_id is required to get documents');
    }

    const { request } = utils;
    
    const url = `${DocumentManager.END_POINT}/templates`;    
    const { type, count, page, property_gds_id } = params;
    let queryParams = `companyId=${company.gds_owner_id}`;
    queryParams = DocumentManager.appendQueryStrings(queryParams, { count, page, propertyId: property_gds_id });
    queryParams = DocumentManager.appendQueryArray(queryParams, { type: type });

    const { api_info } = payload;
    const headers = DocumentManager.getHeaders(api_info.locals);
    const method = 'GET';

    try {
      const result = await request(method, url, {
        query_params: queryParams,
        headers
      });

      const documentsRes = DocumentManager.extractData({ result });
      const documents = await DocumentManager.attachPropertyDetails(connection, documentsRes, { property_id: property_gds_id });
      return documents;
    } catch(err) { 
      DocumentManager.throwError({ error: err.error || err });
    }
  }

  async getTemplateDetails(payload = {}) {
    if (!this.id) {
      return e.th(500, 'document_id is required to get details of document');
    }

    const { request } = utils;
    const url = `${DocumentManager.END_POINT}/templates/${this.id}`;

    const { api_info } = payload;
    const headers = DocumentManager.getHeaders(api_info?.locals);
    const method = 'GET';

    try {
      const result = await request(method, url, { headers });
      const documentRes = DocumentManager.extractData({ result });
      this.Details = documentRes;
      // We are using details tokens like this in panadocs so keeping it consistent
      this.Details.tokens = documentRes.tokenData?.tokens;
      return this.Details;
    } catch (err) {
      DocumentManager.throwError({ error: err.error || err });
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

    if(isUpdatingDocument) {
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
    if(this.Properties?.length) {
      this.Properties = await models.Property.findByIds(connection, this.Properties);    
      this.Properties = await Property.findGDSIds(connection, this.Properties);
      propertyGdsIds = this.Properties.map(p => { return { id: p.gds_id }});
    }
  
    const { request } = utils;
    const requestBody = {
      name: this.name,
      type: this.DocumentType.name,
      properties: propertyGdsIds,
      description: this.description || '',
      companyId: this.Company.gds_owner_id
    };

    if(this.template?.path) {
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
    } catch(err) {
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
    } catch(err) {
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
    } catch(err) {
      DocumentManager.throwError({ error: err.error || err });
    }
  }

  async mergeTokens(connection, lease, payload = {}) {
    if(payload.reversal?.leases?.length) {
      this.Details.reversal = {
        leases: payload.reversal.leases
      }
    }
    this.mergedTokens = pandadocs.mergeTokens(connection, lease, this.Details) || [];
    
    this.mergedTablesTokens = await document.makeTables(connection, { company: this.Company, lease, tables: this.Details.tokenData?.tables });
  }

  async render(payload = {}) {
    const { api_info, cid } = payload;

    if (!this.Company?.gds_owner_id || !cid) {
      return e.th(500, 'cid and company is required to download the document.');
    }

    const transformedTokens = this.transformTokens();
    const headers = DocumentManager.getHeaders(api_info?.locals);
    const { request } = utils;
   
    const url = `${DocumentManager.RENDERER_END_POINT}/documents`;
    const method = 'POST';

    // Generated document details are sent to this url
    //const webHookUrl = `${settings.getBaseUrl('api')}/v1/companies/${Hashes.encode(cid)}/documents/generated`;
    // const webHookUrl = `https://test_url.com/v1/companies/${Hashes.encode(cid)}/documents/generated`;
    console.log("request", request)
    console.log("headers", headers)
   // console.log("webHookUrl", webHookUrl)
    const requestBody = {
      templateId: this.id,
    // webhook: webHookUrl,
      uId: uuidv4(),
      companyId: this.Company.gds_owner_id,
      data: { 
        ...transformedTokens,
        table: this.mergedTablesTokens 
      }
    };

    console.log('Render: ', JSON.stringify(requestBody));

    try {
      const result = await request(method, url, { headers, body: requestBody });
      console.log("result", result)
      const documentsRes = DocumentManager.extractData({ result });
      console.log("documentsRes", documentsRes)
      return documentsRes;
    } catch(err) {
      console.log("Error in render request, err: ", err)
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
    }

    let s3Promise = new AWS.S3({
      endpoint: 'https://s3.amazonaws.com',
      region: process.env.AWS_REGION
    }).getObject(awsParams).promise();

    try {
      return await s3Promise;
    } catch(err) {
      console.log("Document manager download file error: ", err);
      e.th(500, err);
    }
  }


  async getGeneratedDocument(payload = {}) {
    const { api_info, cid, fileId } = payload;
    
    if (!this.Company?.gds_owner_id || !cid) {
      return e.th(500, 'cid and company is required to download the document.');
    }

    const headers = DocumentManager.getHeaders(api_info?.locals);
    const { request } = utils;
   
    const url = `${DocumentManager.RENDERER_END_POINT}/documents/${fileId}`;
    const method = 'GET';

    // Generated document details are sent to this url
    
    console.log("request", request)
    console.log("headers", headers)
    
    

    // console.log('Render: ', JSON.stringify(requestBody));

    try {
      const result = await request(method, url, { headers });
      console.log("getGeneratedDocument result", JSON.stringify(result, null, 2))
      const documentsRes = DocumentManager.extractData({ result });
      console.log("documentsRes", documentsRes)
      return documentsRes;
    } catch(err) {
      DocumentManager.throwError({ error: err.error || err });
    }
  }

}

module.exports = DocumentManager;

const pandadocs = require('../modules/pandadocs');
const document = require('../modules/document');
const Hash = require(__dirname + '/../modules/hashes.js');
const Hashes = Hash.init();
const e = require(__dirname + '/../modules/error_handler.js');
const utils = require("../modules/utils");

const Property = require('./property.js');
const models = require('../models');
