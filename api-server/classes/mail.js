"use strict";

var models  = require(__dirname + '/../models');
var e  = require(__dirname + '/../modules/error_handler.js');


class Mail {
  constructor(data) {
    this.id = data.id;
    this.tracking_number = data.tracking_number || null;
    this.interaction_id = data.interaction_id || null;
    this.acceptance_document_refid = data.acceptance_document_refid || null;
    this.delivery_document_refid = data.delivery_document_refid || null;
    this.electronic_return_receipt_refid =
      data.electronic_return_receipt_refid || null;
  }

  validate() {
    return Promise.resolve();
  }

  verifyId() {
    return Promise.resolve().then(() => {
      if (!this.id) e.th(400, "Missing ID");
      return true;
    });
  }

  async find(connection) {
    let data = await models.Mail.findById(connection, this.id);

    this.id = data.id;
    this.interaction_id = data.interaction_id;
    this.tracking_number = data.tracking_number;
    this.acceptance_document_refid = data.acceptance_document_refid;
    this.delivery_document_refid = data.delivery_document_refid;
    this.electronic_return_receipt_refid = data.electronic_return_receipt_refid;
  }

  async findByInteractionId(connection) {
    let data = await models.Mail.findByInteractionId(connection, this.interaction_id);

    if (!data) e.th(404, `No Mail with interaction_id ${this.interaction_id} has been found`);

    this.id = data.id;
    this.tracking_number = data.tracking_number;
    this.acceptance_document_refid = data.acceptance_document_refid;
    this.delivery_document_refid = data.delivery_document_refid;
    this.electronic_return_receipt_refid = data.electronic_return_receipt_refid;
  }

  // data = [{"type": "AcceptanceDoc","doc_id": ""},{"type": "DeliveryDoc","doc_id": ""}]

  async updateSrc(data) {
    this.acceptance_document_refid = data.find(
      e => (e.type = "AcceptanceDoc")
    )?.doc_id;

    this.delivery_document_refid = data.find(
      e => (e.type = "DeliveryDoc")
    )?.doc_id;

    this.electronic_return_receipt_refid = data.find(
      e => (e.type = "SignatureDoc")
    )?.doc_id;
  }

  async save(connection) {
    var save = {
      interaction_id: this.interaction_id,
      tracking_number: this.tracking_number,
      acceptance_document_refid: this.acceptance_document_refid,
      delivery_document_refid: this.delivery_document_refid,
      electronic_return_receipt_refid: this.electronic_return_receipt_refid
    };

    this.id = await models.Mail.save(connection, save, this.id);
    return;
  }
}
module.exports = Mail;

