var StaticReport = require('../../classes/static_report.js')
const bullmq  = require('bullmq');
const IORedis = require('ioredis');
const redis_connection = new IORedis({host: process.env.REDIS_HOST});
const Queue = new bullmq.Queue('hummingbirdQueue', { connection: redis_connection } );
// var moment      = require('moment');

class PropertyRentManagementReport  {
    constructor(data) {
        this.property_id = data.property_id ?? ""
        this.company = data.company ?? {}
        this.type = data.body.type ?? ""
        this.format = data.body.format ?? "xlsx"
        this.document_id = data.body.document_id ?? {}
        this.config = {}
        this.bypass_notification_period = data.body.bypass_notification_period ?? false
    }

    async generate(connection) {
        let report = new StaticReport({
            data: {},
            name: this.config.name,
            type: this.type,
            format: this.format,
            property_id: this.property_id,
            company_id: this.company.id,
            properties: [ this.property_id ],
            connection
        })

        report.setUpReport();
        await report.generate();

        return report.reportClass.path;
    }

    async getReportStructure() {
        let report = new StaticReport({
            type: this.type,
            properties: [ this.property_id ],
            company_id: this.company.id
        })
        report.setUpReport();
        let fieds = await report.reportClass.getFields();
        return Object.values(fieds);
    }

    async initiateUploadRentChanges(connection, structure, socketConf) {
        await Queue.add('upload_rent_changes', {
            document_id: this.document_id,
            company: this.company,
            column_structure: structure,
            template: this.type,
            property_id: this.property_id,
            socket_details: socketConf,
            is_admin: true,
            bypass_notification_period: this.bypass_notification_period
        }, { priority: 1 });
    }
}

module.exports = PropertyRentManagementReport