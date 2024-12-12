const models = require('../models');
const DocumentManager = require('../classes/document_manager');
const _ = require('lodash');

class DocumentBatch {
    constructor(data) {

        this.id = data.id;
        this.property_id = data.property_id;
        this.total_count = data.total_count;
        this.template_id = data.template_id;
        this.document_type = data.document_type;

        this.upload_id = data.upload_id; //consolidated upload
        this.created_at = data.created_at || moment.now();
        this.last_modified = data.last_modified || moment.now();
        this.created_by = data.created_by;
    }

    static async getDocBatchInfo(filter, opts, ctx) {
        
        let template_ids;

        let { connection, limit, offset } = opts

        let { template_name, property_id } = filter;

        let property = await models.Property.findById(connection, property_id);

        if(!property){
            throw new Error(`property not found! propertyId ${property_id}`);
        }

        if (template_name) {
            template_ids = await DocumentManager.getTemplatesPerProperty(ctx, property.gds_id, template_name);
            template_ids = template_ids.map(x => (x.id));
        }

        // get docbatches per document batch

        let  _docBatches = await models.DocumentBatch.getDocBatches(connection, { ...filter, template_ids, utc_offset: property.utc_offset, timezone: property.time_zone}, { limit, offset });

        if(!_.isEmpty(_docBatches)){
            let templateIds = _docBatches.map((x) => (x.template.template_doc_id));
            templateIds = [...new Set(templateIds)];
            let templates = await DocumentManager.getTemplateNames(ctx, templateIds);
            
            if (_.isEmpty(templates)) {
                throw new Error(`getDocBatchInfo: template name(s) empty!`)
            }
    
            // map template names to _docbatches
            _docBatches = _docBatches.map(x => {
                let [_t] = templates.filter(y => (y.id === x.template.template_doc_id ));
                _t = _t || {};
                x.template.name = _t.name;
                x.template.key = _t.key;
                return x;
            });
        }

        return _docBatches;
    }

    async find(connection) {

        let _docBatch = await models.DocumentBatch.getDocBatchById(connection, { id: this.id });
        this.id = _docBatch.id;
        this.property_id = _docBatch.property_id;
        this.created_at = _docBatch.created_at;
        this.last_modified = _docBatch.last_modified;
        this.upload_id = _docBatch.upload_id;
        this.template_id = _docBatch.document_manager_template_id;
        this.total_count = _docBatch.total_count;
        this.created_by = _docBatch.created_by;
        this.document_type = _docBatch.document_type
    }

    async save(connection) {

        let _obj = {
            property_id: this.property_id,
            document_manager_template_id: this.template_id,
            created_by: this.created_by,
            upload_id: this.upload_id,
            document_type: this.document_type,
            total_count: this.total_count,
        }

        this.id = await models.DocumentBatch.save(connection, _obj, this.id);
    }

    static async getDocBatchInfoById(id, { connection }, ctx) {
        let [_docBatch] = await models.DocumentBatch.getDocBatchById(connection, { id });
        let [template] = DocumentManager.getTemplateNames(ctx, [_docBatch.template_id]);

        if (!template) {
            throw new Error(`getDocBatchInfoById: template name(s) empty!`);
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
    static async getDocErrorsPerBatch(filter, opts, ctx) {
        let { connection, limit, offset } = opts;
        let _docBatches = await models.DocumentBatch.getDocErrors(connection, filter, { limit, offset });
        return _docBatches;
    }

    static async getDocBatchDetails(filter, opts, ctx) {

        let _results = [];

        const { document_delivery_id, document_batch_id, contact_type, status, unit } = filter;
        const { connection, offset, limit } = opts;

        let _docBatchInfo = await models.DocumentBatch.getDocBatchInfo(connection, filter);

        if(_docBatchInfo){
        const [templateInfo] = await DocumentManager.getTemplateNames(ctx, [_docBatchInfo.template.template_doc_id])

        if(!templateInfo){
            throw new Error(`template name not found!`);
        }

        _docBatchInfo.template.name = templateInfo.name;

            if (!document_delivery_id) {
                _results = await models.DocumentBatch.getNondeliveryDocuments(connection, { document_batch_id, contact_type, status, unit }, { offset, limit });
                return { batch_info: _docBatchInfo, documents: _results };
            }

            let { delivery_type } = _docBatchInfo;

            if (!delivery_type) {
                throw new Error('Could not find delivery type of document batch!')
            }

            if (delivery_type === 'mail') {
                _results = await models.DocumentBatch.getMailBatchDetails(connection, { document_batch_id, document_delivery_id, contact_type, status, unit }, { limit, offset });
            }

            else if (delivery_type === 'email') {
                _results = await models.DocumentBatch.getEMailBatchDetails(connection, { document_batch_id, document_delivery_id, contact_type, status, unit }, { limit, offset });
            }
        }
        
        return { batch_info: _docBatchInfo, documents: _results };
    }

}

module.exports = DocumentBatch;