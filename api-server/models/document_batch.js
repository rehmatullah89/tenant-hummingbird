const moment = require('moment');
const {getUtcTime} = require('../helpers/datetime');
const { conditionalAnd, conditionalAndIn, convertToLike, escape } = require('../helpers/sql');


module.exports = {

    async getDocBatches(connection, filter, opts) {

        if(filter.start_date){

            filter.start_date = getUtcTime(filter.start_date, {offset: filter.utc_offset, format: "YYYY-MM-DD HH:mm:ss", isISO : true});
        }
        
        if(filter.end_date){
            filter.end_date = getUtcTime(filter.end_date, {offset: filter.utc_offset, format: "YYYY-MM-DD HH:mm:ss", isISO: true});
        }

        if( filter.start_date && filter.end_date  && moment(filter.start_date).isAfter(filter.end_date)){
            throw new Error('invalid date filter: start date greater than end date');
        }
        
        // escape query values
        escape(connection, filter);
        escape(connection, opts);

        let { status, delivery_method, start_date, 
            end_date, property_id, document_type, 
            template_ids } = filter

        const { limit, offset } = opts;



        let sql = `SELECT 
                    db.property_id as property_id, db.id as document_batch_id, db.created_at, db.total_count, cu.last_downloaded as last_downloaded_on,
                    db.document_type, m.name as mailhouse_name,
                    IF(cdc.id, json_object('id',cdc.id, 'first_name',cdc.first, 'last_name',  cdc.last), NULL) as last_downloaded_by,
                    json_object('id',bcc.id, 'first_name',bcc.first, 'last_name',  bcc.last) as created_by,
                    dbd.id as document_delivery_id,
                    json_object('template_doc_id', db.document_manager_template_id) as template, 
                    json_object('method', json_object('id', dm.id, 'name', dm.name), 'mailhouse', m.name) as delivery,
                    json_object('id', cu.id, 'url', cu.src) as combined_document,

                    sum(case i.status when 'sent' then 1 else 0 end) as sent,
                    sum(case i.status when 'scheduled' then 1 else 0 end) as scheduled,
                    sum(case i.status when 'delivered' then 1 else 0 end) as delivered,
                    sum(case i.status when 'error' then 1 else 0 end) as error,
                    sum(case i.resolved when true then 1 else 0 end) as resolved,
                    sum(case i.status when 'pending' then 1 else 0 end) as pending,
                    sum(case i.status when 'bounced' then 1 else 0 end) as bounced,
                    sum(case i.status when 'opened' then 1 else 0 end) as opened,
                    sum(case i.status when 'clicked' then 1 else 0 end) as clicked,
                    sum(case i.status when 'spam' then 1 else 0 end) as spam,
                    sum(case du.generation_status when 'generated' then 1 else 0 end) as generation_completed,
                    sum(case du.generation_status when 'error' then 1 else 0 end) as generation_error,
                    sum(case du.generation_status when 'pending' then 1 else 0 end) as generation_pending,

                    sum(case du.generation_status when 'generated' then 1 else 0 end) +
                      sum(case du.generation_status when 'error' then 1 else 0 end) +
                      sum(case du.generation_status when 'pending' then 1 else 0 end)
                      as quantity

                    FROM document_batches as db
                    LEFT JOIN uploads as du
                    ON db.id = du.document_batch_id
                    LEFT JOIN uploads_interactions as ui
                    ON du.id = ui.upload_id
                    LEFT JOIN interactions as i
                    ON ui.interaction_id = i.id
                    LEFT JOIN delivery_methods as dm
                    ON i.delivery_methods_id = dm.id
                    LEFT JOIN mailhouses as m
                    ON dm.mailhouse_id = m.id
                    LEFT JOIN uploads as cu
                    ON db.upload_id = cu.id
                    LEFT JOIN contacts as cdc
                    ON cu.last_downloaded_by = cdc.id
                    LEFT JOIN contacts as bcc
                    ON db.created_by = bcc.id
                    LEFT JOIN document_batches_deliveries as dbd
                    ON i.document_batches_deliveries_id = dbd.id
                WHERE db.document_manager_template_id IS NOT NULL AND
                db.property_id = ${property_id}`
                
        sql = conditionalAndIn(document_type, sql, `db.document_type in (${document_type})`);

        // return empty result for empty valid template name check in document manager
        if(Array.isArray(template_ids) && template_ids.length === 0){
            return [];
        }

        sql = conditionalAndIn(template_ids, sql, `db.document_manager_template_id in (${template_ids})`);
        sql = conditionalAndIn(delivery_method, sql, `dm.name in (${delivery_method}) `);
        sql = conditionalAnd(start_date, sql, `db.created_at >= ${start_date}`);
        sql = conditionalAnd(end_date, sql, `db.created_at < ${end_date}`);

        sql += ` GROUP BY db.id, dm.id
                ORDER By db.created_at desc`;

        // TODO move hard coded mailhouses to config, will do this once we have mail house statuses are stable and on the next version
        sql = `SELECT
                    dat.property_id, dat.document_batch_id, dat.created_at, dat.total_count, dat.quantity, dat.document_type, dat.mailhouse_name,
                    dat.last_downloaded_on, dat.last_downloaded_by, dat.template, dat.document_delivery_id, dat.delivery, dat.combined_document,
                    json_object('generated', dat.generation_completed, 'error', dat.generation_error, 'pending', dat.generation_pending) as generation_status_count,
                    json_object('sent', dat.sent, 'delivered', dat.delivered, 'error', dat.error, 'in_progress', dat.pending,
                    'bounced', dat.bounced, 'opened', dat.opened, 'clicked', dat.clicked, 'spam', dat.spam, 'resolved', dat.resolved, 'scheduled', dat.scheduled) as interaction_status_count,
                    
                    IF(dat.generation_error > 0, 'error', 
 					IF(dat.generation_pending > 0, 'pending',
                     IF(dat.document_delivery_id IS NULL, 
                     IF(dat.generation_completed = dat.quantity, 'generated', '-') ,
 					IF(dat.mailhouse_name = 'Simple Certified', 
                     IF(dat.error > 0, 'error', 
                     IF((dat.delivered + dat.resolved + dat.sent) = dat.quantity, 'completed', 
                     IF(dat.pending > 0 OR dat.scheduled > 0, 'pending', '-'))),
 					IF(dat.mailhouse_name = 'Rpost', 
                    IF(dat.error > 0, 'error', 
                    IF((dat.delivered + dat.resolved + dat.opened) = dat.quantity, 'completed', 
                    IF(dat.sent > 0 OR dat.scheduled > 0, 'pending', '-'))), 
                    IF(dat.mailhouse_name = 'Hummingbird', 
                    IF(dat.error > 0 OR dat.bounced > 0, 'error', 
                    IF((dat.sent + dat.resolved) = dat.quantity, 'completed', 
                    IF(dat.pending > 0, 'pending','-'))),
                    '-')))))) as derived_status
        
                FROM

                (${sql}) as dat`;

            sql  =  `SELECT * FROM 
                    (${sql}) as main`
            
            
        if (status && status !== "NULL" && status.length > 0) {
            sql += ` WHERE main.derived_status in (${status})`;
        }

        sql += ` LIMIT ${offset}, ${limit}`;

        console.log(`docbatch sql ${sql}`);

        const result = await connection.queryAsync(sql);
        return result;
    },

    async filterEmptyBatches(connection, document_batch_id) {
        let sql = "select * from uploads where document_batch_id = " + connection.escape(document_batch_id);

        let result = await connection.queryAsync(sql);
        return result.length
    },

    async getDocBatchById(connection, filter) {
        escape(connection, filter);

        const { id } = filter

        let sql = `SELECT 
                    db.property_id as property_id, db.id, db.created_at, db.created_by,
                    db.total_count, db.document_manager_template_id, db.document_type, db.last_modified,
                    db.upload_id
                    FROM document_batches as db
       
                WHERE db.id = ${id}`;

        const result = await connection.queryAsync(sql);
        return result;
    },

    async getDocErrors(connection, filter, opts) {
        escape(connection, filter);
        escape(connection, opts);

        const { document_delivery_id, document_batch_id } = filter;
        const { limit, offset } = opts;

        let sql = `SELECT 
                        json_object('id', u.id, 'number', u.number, 'type', u.type) as unit,
                        json_object('id', c.id, 'first_name', c.first, 'last_name', c.last, 'type', up.contact_type) as contact
                        FROM document_batches as db
                        JOIN uploads as up
                        ON db.id = up.document_batch_id
                        JOIN uploads_leases as ul
                        ON up.id = ul.upload_id
                        JOIN leases as l
                        ON ul.lease_id = l.id
                        JOIN units as u
                        ON l.unit_id = u.id
                        JOIN contacts as c
                        ON up.contact_id = c.id
                        WHERE up.document_batch_id = ${document_batch_id} and up.generation_status = 'error'`;

        if (document_delivery_id) {

            sql += `UNION
                    SELECT 
                        json_object('id', u.id, 'number', u.number, 'type', u.type) as unit,
                        json_object('id', c.id, 'first_name', c.first, 'last_name', c.last, 'type', i.contact_type) as contact
                        FROM interactions as i
                        JOIN leases as l
                        ON i.lease_id = l.id
                        JOIN contacts as c 
                        ON i.contact_id = c.id
                        JOIN units as u
                        ON l.unit_id = u.id
                        WHERE i.document_batches_deliveries_id = ${document_delivery_id} and i.status in ('error', 'bounced')`
        }

        sql += ` LIMIT ${offset}, ${limit};`

        const result = await connection.queryAsync(sql);
        return result;
    },

    async getDocBatchPerGeneration(connection, filter, opts) {
        escape(connection, filter);
        let limit, offset;

        if(opts){
            escape(connection, opts);
            limit = opts.limit;
            offset = opts.offset;
        }
        
        let { property_id, docbatches } = filter;
        

        
        let sql = `SELECT db.id as document_batch_id,
                    sum(case u.generation_status when 'generated' then 1 else 0 end) as generation_completed,
                    sum(case u.generation_status when 'error' then 1 else 0 end) as generation_error,
                    sum(case u.generation_status when 'pending' then 1 else 0 end) as generation_pending,
                    count(*) as total_count
                    FROM document_batches as db
                    JOIN uploads as u
                    ON db.id = u.document_batch_id
                    WHERE db.property_id = ${property_id}
                    AND db.id in (${docbatches})
                    GROUP BY db.id`
            if(limit && offset){
                sql += `LIMIT ${offset}, ${limit}`;
            }
        console.log(sql);
        const result = await connection.queryAsync(sql);
        return result;
    },

    // TODO may have to alter json array note structure for resolved changes
    async getMailBatchDetails(connection, filter, opts) {

        // convert to search like before escaping
        convertToLike(filter, ['unit']);

        escape(connection, filter);
        escape(connection, opts);

        const { document_batch_id, document_delivery_id, contact_type, status, unit } = filter
        const { limit, offset } = opts;

        let sql = `SELECT 
                    JSON_OBJECT('id',
                            u.id,
                            'number',
                            u.number,
                            'type',
                            u.type) AS unit,
                    JSON_OBJECT('id',
                            c.id,
                            'first_name',
                            c.first,
                            'last_name',
                            c.last,
                            'email',
                            c.email,
                            'type',
                            i.contact_type,
                            'address',
                            JSON_OBJECT('address1',
                                    ad.address,
                                    'address2',
                                    ad.address2,
                                    'city',
                                    ad.city,
                                    'state',
                                    ad.state,
                                    'zip',
                                    ad.zip)) AS contact,
                    JSON_OBJECT('id', du.id, 'url', du.src) AS generated_document,
                    i.status AS status,
                    i.lease_id AS lease_id,
                    i.id AS interaction_id,
                    i.resolved AS resolved,
                    i.description as status_details,
                    JSON_OBJECT('object_id',
                            mail.id,
                            'tracking_number',
                            mail.tracking_number,
                            'acceptance_document_refid',
                            mail.acceptance_document_refid,
                            'delivery_document_refid',
                            mail.delivery_document_refid,
                            'electronic_return_receipt_refid',
                            mail.electronic_return_receipt_refid,
                            'xml_receipt_id',
                            NULL) AS meta,
                    (SELECT 
                            COUNT(*)
                        FROM
                            notes AS note
                        WHERE
                            note.interaction_id = i.id) AS note_count
                    FROM 
                        document_batches AS db
                            LEFT JOIN
                        uploads AS du ON db.id = du.document_batch_id
                            LEFT JOIN
                        uploads_interactions AS ui ON du.id = ui.upload_id
                            LEFT JOIN
                        interactions AS i ON ui.interaction_id = i.id
                            LEFT JOIN
                        mail ON i.id = mail.interaction_id
                            JOIN
                        delivery_methods AS dm ON i.delivery_methods_id = dm.id
                            JOIN
                        mailhouses AS m ON dm.mailhouse_id = m.id
                            LEFT JOIN
                        uploads_leases AS ul ON du.id = ul.upload_id
                            LEFT JOIN
                        leases AS l ON ul.lease_id = l.id
                            LEFT JOIN
                        units AS u ON l.unit_id = u.id
                            LEFT JOIN
                        contacts AS c ON du.contact_id = c.id
                            LEFT JOIN
                        contact_locations as cl ON c.id = cl.contact_id
                            LEFT JOIN
                        addresses AS ad ON cl.address_id = ad.id
                            LEFT JOIN 
                        document_batches_deliveries as dbd ON i.document_batches_deliveries_id = dbd.id
                        WHERE
                              (cl.primary = true OR cl.primary is NULL) AND db.id = ${document_batch_id} AND dbd.id = ${document_delivery_id}` ;
                    
            sql = conditionalAndIn(contact_type, sql, `i.contact_type in (${contact_type})`);
            sql = conditionalAndIn(status, sql, `i.status in (${status})`);
            sql = conditionalAnd(unit, sql, `u.number like ${unit}`);
            sql +=    ` LIMIT ${offset}, ${limit}`;

        console.log(sql);
        const result = await connection.queryAsync(sql);
        return result;

    },

    async getEMailBatchDetails(connection, filter, opts) {
        // convert tosearch like before escaping
        convertToLike(filter, ['unit']);
        escape(connection, filter);
        escape(connection, opts)

        const { document_batch_id, document_delivery_id, contact_type, status, unit } = filter
        const { limit, offset } = opts;

        let sql = `SELECT 
                        JSON_OBJECT('id',
                        u.id,
                        'number',
                        u.number,
                        'type',
                        u.type) AS unit,
                JSON_OBJECT('id',
                        c.id,
                        'first_name',
                        c.first,
                        'last_name',
                        c.last,
                        'email',
                        c.email,
                        'type',
                        i.contact_type,
                        'address',
                        JSON_OBJECT('address1',
                                ad.address,
                                'address2',
                                ad.address2,
                                'city',
                                ad.city,
                                'state',
                                ad.state,
                                'zip',
                                ad.zip)) AS contact,
                JSON_OBJECT('id', du.id, 'url', du.src) AS generated_document,
                i.status AS status,
                i.lease_id AS lease_id,
                i.id AS interaction_id,
                i.resolved AS resolved,
                i.description AS status_details,
                JSON_OBJECT('object_id',
                        emails.id,
                        'delivery_receipt_refid',
                        emails.delivery_receipt_refid) AS meta,
                (SELECT 
                        COUNT(*)
                    FROM
                        notes AS note
                    WHERE
                        note.interaction_id = i.id) AS note_count

                    FROM

                        document_batches AS db
                            LEFT JOIN
                        uploads AS du ON db.id = du.document_batch_id
                            LEFT JOIN
                        uploads_interactions AS ui ON du.id = ui.upload_id
                            LEFT JOIN
                        interactions AS i ON ui.interaction_id = i.id
                            LEFT JOIN
                        emails ON i.id = emails.interaction_id
                            JOIN
                        delivery_methods AS dm ON i.delivery_methods_id = dm.id
                            JOIN
                        mailhouses AS m ON dm.mailhouse_id = m.id
                            LEFT JOIN
                        uploads_leases AS ul ON du.id = ul.upload_id
                            LEFT JOIN
                        leases AS l ON ul.lease_id = l.id
                            LEFT JOIN
                        units AS u ON l.unit_id = u.id
                            LEFT JOIN
                        contacts AS c ON du.contact_id = c.id
                            LEFT JOIN
                        contact_locations as cl ON c.id = cl.contact_id
                            LEFT JOIN
                        addresses AS ad ON cl.address_id = ad.id
                            LEFT JOIN 
                        document_batches_deliveries as dbd ON i.document_batches_deliveries_id = dbd.id

                    WHERE 
                    (cl.primary = true OR cl.primary is NULL) AND db.id = ${document_batch_id} AND  dbd.id = ${document_delivery_id}`;

            sql = conditionalAndIn(contact_type, sql, `i.contact_type in (${contact_type})`);
            sql = conditionalAndIn(status, sql, `i.status in (${status})`);
            sql = conditionalAnd(unit, sql, `u.number like ${unit}`);
            sql += ` LIMIT ${offset}, ${limit}`;

        console.log(sql);
        const result = await connection.queryAsync(sql);
        return result;

    },

    async getDeliveryType(connection, document_delivery_id) {
        escape(connection, { document_delivery_id });

        let sql = `SELECT  dm.delivery_type as delivery_type
                    FROM document_batches_deliveries as dbd
                    JOIN delivery_methods as dm
                    where dbd.id =${document_delivery_id}`;

        const [result] = await connection.queryAsync(sql);
        return result;
    },

    async getDocBatchInfo(connection, filter) {
        escape(connection, filter);
        const { document_batch_id, document_delivery_id } = filter;

        let sql = `SELECT db.property_id as property_id, db.id as document_batch_id,
                        db.created_at as batch_created_at, dbd.id as document_delivery_id,
                        db.document_type as document_type, dm.name as delivery_method,
                        dm.delivery_type as delivery_type, m.name as mailhouse,
                        json_object('id', u.id, 'url', u.src) as combined_document,
                        json_object('template_doc_id', db.document_manager_template_id) as template
                        FROM document_batches as db
                        LEFT JOIN document_batches_deliveries as dbd
                        ON db.id = dbd.document_batch_id
                        LEFT JOIN delivery_methods as dm
                        ON dbd.delivery_methods_id = dm.id
                        LEFT JOIN mailhouses as m
                        ON dm.mailhouse_id = m.id
                        LEFT JOIN uploads as u
                        ON db.upload_id = u.id
                where db.id =  ${document_batch_id}`;

        sql = conditionalAnd(document_delivery_id, sql, `dbd.id = ${document_delivery_id}`);

        const [result] = await connection.queryAsync(sql);
        return result;
    },

    async getNonGeneratedDocs(connection, filter) {
        escape(connection, filter);
        const { document_batch_id } = filter
        let sql = `SELECT 
                        json_object('id', u.id, 'number', u.number, 'type', u.type) as unit,
                        json_object('id', c.id, 'first_name', c.first, 'last_name', c.last,'email, c.email, 'type', u.contact_type, 'address', json_object(
                            'address1', ad.address, 'address2', ad.address2, 'city', ad.city, 'state', ad.state, 'zip', ad.zip) as address) as contact,
                        FROM document_batches as db
                        JOIN uploads as u
                        ON db.id = u.document_batch_id
                        JOIN uploads_leases as ul
                        ON u.id = ul.upload_id
                        JOIN leases as l
                        ON ul.lease_id = l.id
                        JOIN units as u
                        ON l.unit_id = u.id
                        JOIN contacts as c
                        ON u.contact_id = c.id
                        LEFT JOIN contact_locations as cl
                        ON c.id = cl.contact_id
                        LEFT JOIN addresses as ad
                        ON cl.address_id = ad.id
                        WHERE i.document_batch_id = ${document_batch_id} and u.generation_status in ('error', 'pending')`;

        const results = await connection.queryAsync(sql);
        return results;
    },

    async getNondeliveryDocuments(connection, filter, opts) {

        convertToLike(filter, ['unit']);
        escape(connection, filter);
        escape(connection, opts);
        const { document_batch_id, contact_type, status, unit } = filter;
        const { limit, offset } = opts;

        let sql = `SELECT 
                    JSON_OBJECT('id',
                            un.id,
                            'number',
                            un.number,
                            'type',
                            un.type) AS unit,
                    JSON_OBJECT('id',
                            c.id,
                            'first_name',
                            c.first,
                            'last_name',
                            c.last,
                            'email',
                            c.email,
                            'type',
                            u.contact_type,
                            'address',
                            JSON_OBJECT('address1',
                                    ad.address,
                                    'address2',
                                    ad.address2,
                                    'city',
                                    ad.city,
                                    'state',
                                    ad.state,
                                    'zip',
                                    ad.zip)) AS contact,
                    JSON_OBJECT('id', u.id, 'url', u.src) AS generated_document,
                    u.generation_status AS status,
                    l.id AS lease_id,
                    NULL AS interaction_id,
                    JSON_OBJECT() AS meta,
                    '0' AS note_count
                FROM
                    document_batches AS db
                        JOIN
                    uploads AS u ON db.id = u.document_batch_id
                        JOIN
                    uploads_leases AS ul ON u.id = ul.upload_id
                        JOIN
                    leases AS l ON ul.lease_id = l.id
                        JOIN
                    units AS un ON l.unit_id = un.id
                        JOIN
                    contacts AS c ON u.contact_id = c.id
                        LEFT JOIN
                    contact_locations AS cl ON c.id = cl.contact_id
                        LEFT JOIN
                    addresses AS ad ON cl.address_id = ad.id
                WHERE
                    cl.primary = TRUE
                        AND u.document_batch_id = ${document_batch_id} `;

        sql = conditionalAndIn(contact_type, sql, `u.contact_type in (${contact_type})`);
        sql = conditionalAndIn(status, sql, `u.generation_status in (${status})`);
        sql = conditionalAnd(unit, sql, `un.number like ${unit}`);

        sql += ` LIMIT ${offset}, ${limit}`;

        const results = await connection.queryAsync(sql);
        return results;
    },

    async save(connection, data, doc_batch_id) {

        let sql = '';

        if (doc_batch_id) {
            sql = "update document_batches set ?  where id = " + connection.escape(doc_batch_id);
        } else {
            sql = "insert into document_batches set ?";
        }

        let result = await connection.queryAsync(sql, data);
        return doc_batch_id ? doc_batch_id : result.insertId;
    },
}