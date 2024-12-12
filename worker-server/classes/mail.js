"use strict";

var models  = require(__dirname + '/../models');
var e  = require(__dirname + '/../modules/error_handler.js');


class Mail {
	constructor(data) {
		this.id = data.id;
        
        this.tracking_number = data.tracking_number;
        this.interaction_id = data.interaction_id;
        this.acceptance_document_refid = data.acceptance_document_refid;
        this.delivery_document_refid = data.delivery_document_refid;
        this.electronic_return_receipt_refid = data.electronic_return_receipt_refid;
	}

	validate(){
		return Promise.resolve();
	}

	verifyId(){

		return Promise.resolve().then(() => {
			if(!this.id) e.th(400, "Missing ID");
			return true;
		})
	}

	async find(connection){
        let data = await models.Mail.findById(connection, this.id)

        this.id = data.id;
        this.interaction_id = data.interaction_id;
        this.tracking_number = data.tracking_number;
        this.acceptance_document_refid = data.acceptance_document_refid;
        this.delivery_document_refid = data.delivery_document_refid;
        this.electronic_return_receipt_refid = data.electronic_return_receipt_refid;
		
	}

	async save(connection){
		
        var save = {
            interaction_id: this.interaction_id,
            tracking_number: this.tracking_number,
            acceptance_document_refid: this.acceptance_document_refid,
            delivery_document_refid: this.delivery_document_refid,
            electronic_return_receipt_refid: this.electronic_return_receipt_refid
        };
        
        this.id = await models.Mail.save(connection, save, this.id)
		return;
	}

}
module.exports = Mail;

