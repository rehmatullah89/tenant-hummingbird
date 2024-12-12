"use strict";
class OnboardingDocument {

  constructor(data){

    data = data || {};
    this.id = data.id;
    this.name = data.name;    
    this.type = data.type;
    this.subtype = data.subtype;
    this.state = data.state;
    this.label = data.label;
    this.overrides = data.overrides || 0;
    this.required = data.required || 0;
    this.company_id = data.company_id;
    this.status = data.status;
    this.company_document_id = data.ocd_id;
    this.overrides_doc_id = data.overrides_doc_id;
    this.override_document_name = data.override_document_name;
  }

  async getOnboardingDocuments(connection){
    let params = {};
    this.state ? params['state'] = this.state : '';
    this.type ? params['type'] = this.type : '';
    let documentList = await models.Onboarding.getAllDocuments(connection, this.company_id, params);
    return documentList;
  }

  async find(connection){
      if(!this.id) e.th(500, "Document ID not set");

      let data = await models.Onboarding.findDocumentById(connection, this.company_id, this.id);
      if(!data) e.th(404, "Document not set");
      this.id = data.id;
      this.name = data.name;    
      this.type = data.type;
      this.subtype = data.subtype;
      this.state = data.state;
      this.label = data.label;
      this.overrides = data.overrides || 0;
      this.status = data.status;      
      this.company_document_id = data.ocd_id;
      this.overrides_doc_id = data.overrides_doc_id;
      this.override_document_name = data.override_document_name;
  }

   make(data){ //todo cant where it is used (removed async as not needed)
    this.id = data.id;
    this.name = data.name;    
    this.type = data.type;
    this.subtype = data.subtype;
    this.state = data.state;
    this.label = data.label;
    this.overrides = data.overrides || 0;
    this.status = data.status;      
    this.company_document_id = data.ocd_id;
    this.overrides_doc_id = data.overrides_doc_id;
    this.override_document_name = data.override_document_name;
  }

  async save(connection, document_id){
    if(!this.id) e.th(500, "Document ID not set");
    let save = {
      company_id: this.company_id,
      document_id : document_id || this.id,
      status : this.status,
      overrides_doc_id : this.overrides_doc_id
    };
    let result = await models.Onboarding.saveCompanyDocument(connection, save, this.company_document_id);
    this.company_document_id = (result.insertId) ? result.insertId: this.company_document_id;
    return result;
  }

  async saveUploadedDocument(connection, data){
    let save = {
      name : data.name,  
      type : data.type,
      subtype : data.subtype,
      state : data.state,
      label : data.label,
      overrides : data.overrides || 0
    }
    let result = await models.Onboarding.saveDocument(connection, save, data.id);
    return (result.insertId) ? result.insertId: this.id;
  }

  async deleteDocument(connection){
    let id = this.type == 'other' ? this.id : this.overrides_doc_id;
    let result = await models.Onboarding.deleteDocument(connection, this.type , id, this.company_document_id);
    return result;
  }

  static async propertyBulkMapping(connection, companyId ,propertyId){
    await models.Onboarding.propertyBulkMapping(connection, companyId ,propertyId)
  }
  
  static async getSpacemixData(connection,data){
    let result = await models.Onboarding.getAllSpacemixData(connection,data.company_name,data.property_name);
    return result.length;
  }

  static async saveSpacemixThroughProcedure(connection , payload){
    await models.Onboarding.saveSpacemixThroughProcedure(connection, payload );
  }

  static async updatePropertyStatusByPropertyID(connection ,data, propertyID){
    await models.Onboarding.updatePropertyStatusByPropertyID(connection,data, propertyID );
  }

  static async deleteSpacemixThroughProcedure(connection , payload){
    await models.Onboarding.deleteSpacemixThroughProcedure(connection, payload );
  }



}

module.exports = OnboardingDocument;
var models  = require(__dirname + '/../../models');
var e  = require(__dirname + '/../../modules/error_handler.js');
