const models = require('../models');
const DocumentManager = require('../classes/document_manager');
const _ = require('lodash');
const ENUMS = require('../modules/enums');


class DocumentBatch {
    constructor(data) {
        this.id = data.id;
        this.property_id = data.property_id;
        this.total_count = data.total_count;
        this.document_type = data.document_type;
        this.document_manager_template_id = data.document_manager_template_id;


        this.created_by = data.created_by;
        this.status = data.status;

        // ===========status===========
        this.sent = data.sent;
        this.completed = data.completed;
        this.error = data.error;
        this.resolved = data.resolved;
        this.inprogress = data.inprogress;
        // ===============================

        //consolidated upload
        this.upload_id = data.upload_id;
        
        this.batch_delivery_id = data.batch_delivery_id;
        this.Documents = [];
        this.DeliveryBatches = [];

    }

    async find(connection) {

        let _docBatch = await models.DocumentBatch.findDocumentBatchById(connection, this.id);
        
        this.id = _docBatch.id;
        this.property_id = _docBatch.property_id;
        this.created_at = _docBatch.created_at;
        this.upload_id = _docBatch.upload_id;
        this.document_manager_template_id = _docBatch.document_manager_template_id;
        this.document_type = _docBatch.document_type;
        this.created_by = _docBatch.created_by;

        // await this.getTotalCount();
        // await this.getBatchStatus();
        // await this.getCreatedBy();
 

    }


    async getDocuments(connection) {
        let uploads = await models.DocumentBatch.getDocuments(connection, this.id);
        const Upload = require('../classes/upload');
        for (let i = 0; i < uploads.length; i++) {
            let upload = new Upload(uploads[i]);
            upload.setBucketNameByDocumentType(ENUMS.DOCUMENT_TYPES.UN_SIGNED);
            this.Documents.push(upload);
        }

    }

    async getTotalCount() {
        this.total_count = 0;
    }


    async getBatchStatus() {
        this.status = 0;
    }

    async getCreatedBy() {
        this.created_by = null
    }


    async save(connection) {

        var save = {
            property_id: this.property_id,
            document_manager_template_id: this.document_manager_template_id,
            created_by: this.created_by,
            upload_id: this.upload_id,
            document_type: this.document_type
        };

        this.id = await models.DocumentBatch.save(connection, save, this.id)
    }

    async saveDelivery(connection, delivery_methods_id, created_by) {
        let delivery_id = await models.DocumentBatch.saveDelivery(connection, {
            delivery_methods_id: delivery_methods_id,
            document_batch_id: this.id,
            created_by: created_by
        });

        this.batch_delivery_id = delivery_id;
        return delivery_id;
    }

    async deleteUploadInteraction(connection, upload_id) {
        return await models.Interaction.deleteUploadInteraction(connection, upload_id);
    }

    async getDocumentBatchFromRateChange(connection, document_batch_id) {
		return await models.DocumentBatch.getDocumentBatchFromRateChange(connection, document_batch_id);
	}

    async getDeliveryMethodsId(connection, document_batch_id) {
        return await models.DocumentBatch.getDeliveryMethodsId(connection, document_batch_id);
    }

    static async getDeliveryById(connection, batch_delivery_id) {
        return await models.DocumentBatch.getDeliveryById(connection, batch_delivery_id);
    }

    static async getDeliveryMethods(connection, methods) {
        let batch_delivery_ids = methods.map(obj => obj.document_batch_delivery_id);
        return await models.DocumentBatch.getDeliveryMethods(connection, batch_delivery_ids);
    }

    static async getDocBatchInfo(filter, { connection }, ctx) {

        let _docBatches = await models.DocumentBatch.getDocBatches(connection, filter);
        let templateIds = _docBatches.map((x) => x.template_id);
        let template = await DocumentManager.getTemplateNames(ctx, templateIds);

        if (_.isEmpty(template)) {
            throw new Error(`getDocBatchInfo: template name(s) empty!`)
        }

        // map template names to _docbatches
        _docBatches = _docBatches.map(x => {
            let _t = filter(y => { y.id === x.template_id });
            _t = _t || {};
            x.template_name = _t.name;
            x.template_key = _t.key;
        });

        return _docBatches;
    }

    static async getDocBatchInfoById(id, { connection }, ctx) {

        let [_docBatch] = await models.DocumentBatch.getDocBatchById(connection, { id });
        let [template] = DocumentManager.getTemplateNames(ctx, [_docBatch.template_id]);

        if (!template) {
            throw new Error(`getDocBatchInfoById: template name(s) empty!`)
        }

        _docBatch.template_name = template.name;
        _docBatch.template_key = template.key;

        return _docBatch;
    }

    /**
     * 
     * @param {*} id document batch delivery Id
     * @param {*} param {connection}
     */
    static async getDocBatchErrorsPerDeliveryId(id, { connection }, { limit, offset }) {

        let _docBatches = await models.DocumentBatch.getDocErrors(connection, { id, limit, offset });
        return _docBatches;
    }

    static async getDocBatchDetailsPerDelivery(filter, { connection }, { limit, offset }) {

        const { id, delivery_type } = filter;
        let _results;


        if (delivery_type === 'mail') {
            _results = await models.DocumentBatch.getMailBatchDetailsPerDelivery(connection, { id, limit, offset });
        }
        else if (delivery_type === 'email') {
            _results = await models.DocumentBatch.getEMailBatchDetailsPerDelivery(connection, { id, limit, offset });
        }
        else {
            throw new Error('unknown delivery_type!');
        }

        return _results;
    }

    async updateDocumentBatchIdForUploads(connection, uploadIds) {
        await models.DocumentBatch.updateDocumentBatchIdForUploads(connection, this.id, uploadIds);
    }

    async getDocumentBatchByTypeAndDate(connection, date) {
        if (!this.property_id || !this.document_type || !date) return;

        let documentBatch = await models.DocumentBatch.fetchRentChangeDocumentBatchByDateAndType(connection, this.property_id, this.document_type, date);
        if (!documentBatch) return;

        this.id = documentBatch.id;
        this.property_id = documentBatch.property_id;
        this.upload_id = documentBatch.upload_id;
        this.status = documentBatch.status;
        this.document_manager_template_id = documentBatch.document_manager_template_id;
        this.created_at = documentBatch.created_at;
        this.created_by = documentBatch.created_by;
    }

}

module.exports = DocumentBatch;

