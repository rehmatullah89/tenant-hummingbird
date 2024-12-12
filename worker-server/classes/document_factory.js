'use strict';

class DocumentFactory {
  constructor(data) {
    data = data || {};
    this.static_instance = data.static_instance || false;
    this.document_data = data.document_data || {};
    this.type = data.type || null;
    this.instance_type = data.instance_type || null;
  }
  
  createSignedDocument() {
    this.instance_type = Document;
    return this.static_instance ? Document : new Document(this.document_data);
  }
  
  createUnSignedDocument() {
    this.instance_type = DocumentManager;
    return this.static_instance ? DocumentManager : new DocumentManager(this.document_data);
  }

  createDocument() {
    if(this.instance_type && this.static_instance) {
      return this.instance_type;
    } else if(this.instance_type) {
      return new this.instance_type(this.document_data);
    }

    const { SIGNED_DOCUMENT_TYPES } = ENUMS;

		const isSignedDocumentType = this.type && SIGNED_DOCUMENT_TYPES.some(dt => dt.value === this.type);
		if (!this.type || isSignedDocumentType) {
      return this.createSignedDocument();
		}

    return this.createUnSignedDocument();
  }
}

module.exports = DocumentFactory;

const ENUMS = require('../modules/enums');

const Document = require('./document');
const DocumentManager = require('./document_manager');