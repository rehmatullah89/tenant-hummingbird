const moment = require('moment');
const { conditionalAnd, escape } = require('../modules/helpers/sql');

const tableName = 'document_batches';

const DocumentBatches = module.exports = {


    async save(connection, data, doc_batch_id){
		var sql = '';
		if(doc_batch_id){
			sql = "update document_batches set ?  where id = " + connection.escape(doc_batch_id);
		} else {
			sql = "insert into document_batches set ?";
		}
        let result = await connection.queryAsync(sql, data);
        return doc_batch_id ? doc_batch_id : result.insertId;
    },

    async saveDelivery(connection, data, doc_batch_delivery_id) {
        var sql = '';
		if(doc_batch_delivery_id){
			sql = "update document_batches_deliveries set ?  where id = " + connection.escape(doc_batch_delivery_id);
		} else {
			sql = "insert into document_batches_deliveries set ?";
		}
        let result = await connection.queryAsync(sql, data);
        return doc_batch_delivery_id ? doc_batch_delivery_id : result.insertId;
    }, 

    async getDeliveryMethodsId(connection, document_batch_id) {
        var sql = "Select delivery_methods_id from document_batches_deliveries where document_batch_id = " + connection.escape(document_batch_id);

        let result = await connection.queryAsync(sql);
        return result.length ? result[0].delivery_methods_id : {};
    },

    async getDeliveryById(connection,  doc_batch_delivery_id) {
        var sql = `Select dbd.*, dm.name as delivery_method, dm.delivery_type as delivery_type, dm.gds_key as gds_key  from document_batches_deliveries dbd LEFT JOIN delivery_methods dm on dbd.delivery_methods_id = dm.id where dbd.id = ${connection.escape(doc_batch_delivery_id)}`;
        
        let result = await connection.queryAsync(sql);
        return result.length ? result[0] : {};
    },

    async getDeliveryMethods(connection,  doc_batch_delivery_ids) {
        var sql = `
            SELECT
                dbd.*,
                dm.name as delivery_method,
                dm.gds_key as gds_key
            FROM
                document_batches_deliveries dbd
            LEFT JOIN
                delivery_methods dm ON dbd.delivery_methods_id = dm.id
            WHERE
                dbd.id in (${connection.escape(doc_batch_delivery_ids)})
        `;
        return await connection.queryAsync(sql);
    }, 

    async getDocumentBatchFromRateChange(connection, document_batch_id) {
        var sql = "SELECT db.id, rc.upload_id, rc.email_text, rc.email_subject, rc.id as rate_change_id from rate_changes as rc LEFT JOIN document_batches as db on rc.upload_id = db.upload_id WHERE db.id = " + 
        connection.escape(document_batch_id);

        console.log(sql);

        return connection.queryAsync(sql).then(function(emailInfo){
            return emailInfo[0] || null;
        });

    },

    async getDocBatches(connection, filter) {
        // escape query values
        escape(connection, filter);

        // TODO status filter, need to clarify the status with the product team before 
        // implementing this
        const { status, delivery, startdate, enddate, property_id, limit, offset } = filter

        if (startdate && enddate && moment(startdate).isAfter(enddate)) {
            throw new Error('invalid date filter: start date greater than end date');
        }

        let sql = `SELECT p.id as property_id,
                    db.id as document_batch_id, db.document_manager_template_id as template_id, 
                    db.created_at, db.total_count, db.last_downloaded,
                    dm.name as delivery_method, m.name as delivered_by, 
                    sum(case st.type when 'sent' then 1 else 0 end) as sent,
                    sum(case st.type when 'delivered' then 1 else 0 end) as completed,
                    sum(case st.type when 'error' then 1 else 0 end) as error,
                    sum(case st.type when 'resolved' then 1 else 0 end) as resolved,
                    sum(case st.type when 'pending' then 1 else 0 end) as inprogress,
                    count(*) as total_count
                    FROM properties as p
                    JOIN document_batches as db
                    ON p.id = db.property_id
                    JOIN document_batches_deliveries as dbd
                    ON db.id = dbd.document_batch_id
                    JOIN interactions as i
                    ON dbd.id = i.document_batches_deliveries_id
                    JOIN status_types as st
                    ON i.status_type_id = st.id
                    JOIN delivery_methods as dm
                    ON dbd.delivery_methods_id = dm.id
                    JOIN mailhouses as m
                    ON dm.mailhouse_id = m.id
                WHERE p.id = ${property_id}`

        sql = conditionalAnd(delivery, sql, `dm.name = ${delivery} `);
        sql = conditionalAnd(startdate, sql, `db.created_at >= ${startdate}`);
        sql = conditionalAnd(enddate, sql, `db.created_at <= ${enddate}`);

        sql += `GROUP BY db.id, m.name, dm.name
                ORDER By db.last_downloaded desc
                LIMIT ${offset}, ${limit};`;

        const result = await connection.queryAsync(sql);
        return result
    }, 

    async findDocumentBatchById(connection, id) {
        let sql = `SELECT * from document_batches where id = ${connection.escape(id)}`;
        const result = await connection.queryAsync(sql);
        return result.length ? result[0] : {};
    }, 

    async getDocBatchById(connection, filter) {
        escape(connection, filter);
        
        const { id, delivery, startdate, enddate, limit, offset } = filter

        let sql = `SELECT p.id as property_id,
                    db.id as document_batch_id, db.document_manager_template_id as template_id, 
                    db.created_at, db.total_count, db.last_downloaded,
                    dm.name as delivery_method, m.name as delivered_by, 
                    sum(case st.type when 'sent' then 1 else 0 end) as sent,
                    sum(case st.type when 'delivered' then 1 else 0 end) as completed,
                    sum(case st.type when 'error' then 1 else 0 end) as error,
                    sum(case st.type when 'resolved' then 1 else 0 end) as resolved,
                    sum(case st.type when 'pending' then 1 else 0 end) as inprogress,
                    count(*) as total_count
                    FROM properties as p
                    JOIN document_batches as db
                    ON p.id = db.property_id
                    JOIN document_batches_deliveries as dbd
                    ON db.id = dbd.document_batch_id
                    JOIN interactions as i
                    ON dbd.id = i.document_batches_deliveries_id
                    JOIN status_types as st
                    ON i.status_type_id = st.id
                    JOIN delivery_methods as dm
                    ON dbd.delivery_methods_id = dm.id
                    JOIN mailhouses as m
                    ON dm.mailhouse_id = m.id
                WHERE db.id = ${id}`

        sql = conditionalAnd(delivery, sql, `dm.name = ${delivery} `);
        sql = conditionalAnd(startdate, sql, `db.created_at >= ${startdate}`);
        sql = conditionalAnd(enddate, sql, `db.created_at <= ${enddate}`);

        sql += `GROUP BY db.id, m.name, dm.name
    ORDER By db.last_downloaded desc
    LIMIT ${offset}, ${limit};`;
        console.log("sql", sql)
        const result = await connection.queryAsync(sql);
        return result;
    }, 

    async getDocErrors(connection, filter) {
        escape(connection, filter);

        const { id, limit, offset } = filter;

        let sql = `SELECT 
                    u.number as unit_number, c.first as first_name, c.last as last_name
                    FROM interactions as i
                    JOIN leases as l
                    ON i.lease_id = l.id
                    JOIN contacts as c
                    ON i.contact_id = c.id
                    JOIN units as u
                    ON l.unit_id = u.id
                    WHERE i.document_batches_deliveries_id = ${id} and i.status = 'error'
                ORDER BY u.number
                LIMIT ${offset}, ${limit};`;

        const result = await connection.queryAsync(sql);
        return result;

    }, 

    // TODO may have to alter json array note structure for resolved changes
    async getMailBatchDetailsPerDelivery(connection, filter) {
        escape(connection, filter);

        const { id, limit, offset } = filter;

        let sql = `SELECT 
                    u.number as unit_number, c.first as first_name, c.last as last_name, i.contact_type as contact_type,
                    i.status as status,
                    p.id as property_id,
                    db.id as document_batch_id, dbd.id as doc_delivery_id,
                    i.id as interaction_id, i.contact_id as contact_id, i.primary_contact_id as primary_contact_id,
                    i.lease_id as lease_id, mail.id as mail_id, mail.tracking_number, mail.acceptance_document_refid as acc_doc_src,
                    mail.delivery_document_refid as del_doc_src, mail.electronic_return_receipt_refid as elec_receipt_src,
                    dm.id as delivery_methods_id, dm.name as delivery_method,dm.delivery_type as delivery_type, m.name as mailhouse,
                    ad.address as address1, ad.address2 as address2, ad.city as city, ad.state as state,
                    json_arrayagg(CAST(IF(notes.id is null, "{}", json_object('id', notes.id, 'content', notes.content)) as JSON)) as notes
                    FROM properties as p
                    JOIN document_batches as db
                    ON p.id = db.property_id
                    JOIN document_batches_deliveries as dbd
                    ON db.id = dbd.document_batch_id
                    JOIN interactions as i
                    ON dbd.id = i.document_batches_deliveries_id
                    JOIN mail
                    ON i.id = mail.interaction_id
                    JOIN delivery_methods as dm
                    ON dbd.delivery_methods_id = dm.id
                    JOIN mailhouses as m
                    ON dm.mailhouse_id = m.id
                    JOIN leases as l
                    ON i.lease_id = l.id
                    JOIN contacts as c
                    ON i.contact_id = c.id
                    JOIN units as u
                    ON l.unit_id = u.id
                    LEFT JOIN contact_locations as cl
                    ON c.id = cl.contact_id
                    LEFT JOIN addresses as ad
                    ON cl.address_id = ad.id
                    LEFT JOIN notes
                    ON i.id = notes.interaction_id
                    where dbd.id = ${id}
                    GROUP BY i.id, mail.id, ad.address, ad.address2, ad.city, ad.state
                    ORDER by i.created DESC
                LIMIT ${offset}, ${limit};`;

        const result = await connection.queryAsync(sql);
        return result;

    }, 

    async getEMailBatchDetailsPerDelivery(connection, filter) {
        escape(connection, filter);

        const { id, limit, offset } = filter;

        let sql = `SELECT 
                    u.number as unit_number, c.first as first_name, c.last as last_name, i.contact_type as contact_type,
                    i.status as status,
                    p.id as property_id,
                    db.id as document_batch_id, dbd.id as doc_delivery_id,
                    i.id as interaction_id, i.contact_id as contact_id, i.primary_contact_id as primary_contact_id,
                    i.lease_id as lease_id, emails.id as email_id, 
                    dm.id as delivery_methods_id, dm.name as delivery_method,dm.delivery_type as delivery_type, m.name as mailhouse,
                    ad.address as address1, ad.address2 as address2, ad.city as city, ad.state as state,
                    json_arrayagg(CAST(IF(notes.id is null, "{}", json_object('id', notes.id, 'content', notes.content)) as JSON)) as notes
                    FROM properties as p
                    JOIN document_batches as db
                    ON p.id = db.property_id
                    JOIN document_batches_deliveries as dbd
                    ON db.id = dbd.document_batch_id
                    JOIN interactions as i
                    ON dbd.id = i.document_batches_deliveries_id
                    JOIN emails
                    ON i.id = emails.interaction_id
                    JOIN delivery_methods as dm
                    ON dbd.delivery_methods_id = dm.id
                    JOIN mailhouses as m
                    ON dm.mailhouse_id = m.id
                    JOIN leases as l
                    ON i.lease_id = l.id
                    JOIN contacts as c
                    ON i.contact_id = c.id
                    JOIN units as u
                    ON l.unit_id = u.id
                    LEFT JOIN contact_locations as cl
                    ON c.id = cl.contact_id
                    LEFT JOIN addresses as ad
                    ON cl.address_id = ad.id
                    LEFT JOIN notes
                    ON i.id = notes.interaction_id
                    WHERE dbd.id = ${id}
                    GROUP BY i.id, emails.id, ad.address, ad.address2, ad.city, ad.state
                    ORDER by i.created DESC
                LIMIT ${offset}, ${limit};`;

        const result = await connection.queryAsync(sql);
        return result;
    },

    async getDocuments(connection, document_batch_id){
        let sql = `SELECT * FROM uploads where document_batch_id = ${document_batch_id}`;
        console.log("getDocuments", sql)
        return await connection.queryAsync(sql);
    },

    async updateDocumentBatchIdForUploads(connection, documentBatchId, uploadIds) {
        sql = `
            UPDATE uploads SET document_batch_id = ${connection.escape(documentBatchId)}
            WHERE
                id IN (${connection.escape(uploadIds)})
        `;
        let result = await connection.queryAsync(sql);
        console.log("Result for upload table update: ", result)
    },

    async fetchRentChangeDocumentBatchByDateAndType(connection, propertyId, documentType, date) {
        const sql = `
            SELECT *
            FROM document_batches db
            WHERE
                document_type = ${ connection.escape(documentType) } AND
                property_id = ${ connection.escape(propertyId) } AND
                DATE(created_at) = DATE(${ connection.escape(date) })
        `;
        let result = await connection.queryAsync(sql);
        return result.length ? result[0] : null
    }
}


module.exports = DocumentBatches;

