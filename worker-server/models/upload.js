var Settings      = require(__dirname + '/../config/settings.js');
var Hashes  = require(__dirname + '/../modules/hashes.js').init();
var e  = require(__dirname + '/../modules/error_handler.js');
const validUploadEntities = [
    'contact',
    'document',
    'lease',
    'property',
    'signer',
    'submessage',
    'lease_revision',
    'unit'
];

module.exports = {



    findByForeignId: function(connection, foreign_id){
        var sql = "Select * from uploads where status = 1 and foreign_id = " + connection.escape(foreign_id);

        return connection.queryAsync(sql).then(res => res.length ? res[0]: null);
    },

    findSigners(connection, upload_id, signer_id){
        var sql = "SELECT * from uploads_signers where upload_id = " + connection.escape(upload_id);

        if(signer_id){
            sql += " and id = " + connection.escape(signer_id)
        }
        return connection.queryAsync(sql).then(r => {
            if(signer_id) return r.length ? r[0]: null;
            return r;
        });
    },

    saveEntitySort(connection, enitity_table, sort, upload_id){
        var sql = "UPDATE " + enitity_table + ' set sort = ' + sort + ' where upload_id = ' + connection.escape(upload_id)
        return connection.queryAsync(sql);
    },

    findRevisionByUploadId(connection, upload_id){
        var sql = "SELECT * from uploads_revisions where upload_id = " + connection.escape(upload_id);
        return connection.queryAsync(sql);
    },

    findByEntity: function(connection, entity, entity_id, document_type_id, count){

        if(validUploadEntities.indexOf(entity) < 0) e.th(400, 'Invalid entity');
        var table = '';
        if(entity == 'property'){
            table = 'uploads_properties';
        } else {
            table = 'uploads_' + entity + 's';
        }

        var field = entity + '_id';

        var sql = "Select ";


        if(count){
            sql += ' count(*) as count ';
        } else {
            sql += ' * ';
        }

        sql += " from " + table + " where (select filename from uploads where uploads.id =  " + table + ".upload_id  ) is not null and  (select status from uploads where uploads.id =  " + table + ".upload_id  ) = 1 and " + field + " = " + connection.escape(entity_id);


        if(document_type_id){
            sql += " and (select document_type_id from uploads where uploads.id =  " + table + ".upload_id  ) = " + connection.escape(document_type_id);
        }
        sql += " order by sort ASC ";
        return connection.queryAsync(sql);

    },

    findCountByForeignId: function(connection, model, foreign_id, type){
        var uploadSql = "Select count(*) as count from uploads where status = 1 and foreign_id = " + connection.escape(foreign_id) + " and model = " + connection.escape(model);
        if(type){
            uploadSql += " and type = " + connection.escape(type);
        }

        return connection.queryAsync(uploadSql).then(function(uploadRes){
            return uploadRes[0].count;
        });
    },

    findById: function(connection, upload_id){

        var uploadSql = "Select * from uploads where status = 1 and id = " + connection.escape(upload_id);
        return connection.queryAsync(uploadSql).then(function(uploadRes){

            return uploadRes[0] || null;
        });
    },

    findByLeaseId: function(connection, upload_id, date){

        var uploadSql = "Select * from uploads where status = 1 and id in ( select upload_id from uploads_leases where lease_id = " + connection.escape(upload_id) +" ) and upload_date = " + connection.escape(date) ;
        return connection.queryAsync(uploadSql).then(function(uploadRes){
            return uploadRes[0] || null;
        });
    },

    save: function(connection, data, upload_id){
        var sql = '';
        if(upload_id){
            sql = "Update uploads set ? where id =  " + connection.escape(upload_id);
        } else {
            sql = "insert into uploads set ? ";
        }

        console.log("upload doc sql",sql,data);
        
        return connection.queryAsync(sql, data).then(function(result){
	        return upload_id || result.insertId
        })
    },

    saveUploadContact(connection, data, uploads_contact_id){
        var sql = '';
        if(uploads_contact_id){
            sql = "Update uploads_contacts set ? where id =  " + connection.escape(uploads_contact_id);
        } else {
            sql = "insert into uploads_contacts set ? ";
        }

        return connection.queryAsync(sql, data).then(function(result){
            return uploads_contact_id || result.insertId
        })
    },

    saveUploadLease(connection, data, uploads_lease_id){
        var sql = '';
        if(uploads_lease_id){
            sql = "Update uploads_leases set ? where id =  " + connection.escape(uploads_lease_id);
        } else {
            sql = "insert into uploads_leases set ? ";
        }

        return connection.queryAsync(sql, data).then(function(result){
            return uploads_lease_id || result.insertId
        })
    },

    saveUploadInteraction(connection, data, uploads_interaction_id){
        var sql = '';
        if(uploads_interaction_id){
            sql = "Update uploads_interactions set ? where id =  " + connection.escape(uploads_interaction_id);
        } else {
            sql = "insert into uploads_interactions set ? ";
        }
        return connection.queryAsync(sql, data).then(function(result){
            return uploads_interaction_id || result.insertId
        })
    },

    saveUploadDocument(connection, data, uploads_document_id){
        var sql = '';
        if(uploads_document_id){
            sql = "Update uploads_documents set ? where id =  " + connection.escape(uploads_document_id);
        } else {
            sql = "insert into uploads_documents set ? ";
        }

        return connection.queryAsync(sql, data).then(function(result){
            return uploads_document_id || result.insertId
        })
    },

    saveUploadRevision(connection, data, upload_revision_id){
        var sql = '';
        if(upload_revision_id){
            sql = "Update uploads_revisions set ? where id =  " + connection.escape(upload_revision_id);
        } else {
            sql = "insert into uploads_revisions set ? ";
        }

        return connection.queryAsync(sql, data).then(function(result){
            return upload_revision_id || result.insertId
        })
    },

    saveUploadProperty(connection, data, uploads_property_id){
        var sql = '';
        if(uploads_property_id){
            sql = "Update uploads_properties set ? where id =  " + connection.escape(uploads_property_id);
        } else {
            sql = "insert into uploads_properties set ? ";
        }
        return connection.queryAsync(sql, data).then(function(result){
            return uploads_property_id || result.insertId
        })
    },

    saveUploadSigner(connection, data, uploads_signer_id){
        var sql = '';
        if(uploads_signer_id){
            sql = "Update uploads_signers set ? where id =  " + connection.escape(uploads_signer_id);
        } else {
            sql = "insert into uploads_signers set ? ";
        }
        return connection.queryAsync(sql, data).then(function(result){
            return uploads_signer_id || result.insertId
        })
    },

    saveUploadSubmessage(connection, data, uploads_submessage_id){
        var sql = '';
        if(uploads_submessage_id){
            sql = "Update uploads_submessages set ? where id =  " + connection.escape(uploads_submessage_id);
        } else {
            sql = "insert into uploads_submessages set ? ";
        }
        return connection.queryAsync(sql, data).then(result => uploads_submessage_id || result.insertId)
    },

    saveUploadUnit(connection, data, uploads_unit_id){
        var sql = '';
        if(uploads_unit_id){
            sql = "Update uploads_units set ? where id =  " + connection.escape(uploads_unit_id);
        } else {
            sql = "insert into uploads_units set ? ";
        }
        return connection.queryAsync(sql, data).then(function(result){
            return uploads_unit_id || result.insertId
        })
    },

    delete: function(connection, upload_id){

        var deleteSql = "update uploads set status = 0 where id = " + connection.escape(upload_id);

        return connection.queryAsync(deleteSql);
    },

    findByName(connection, name, date){
        var sql = `SELECT * from uploads where name like '%${name}%' and date(upload_date) = ${connection.escape(date)};`;
        console.log('findByName sql => ', sql);
        return connection.queryAsync(sql);
    },
    saveBulkDdocumentBatches(connection, docuemnt_batch_id, upload_ids){
        if(!upload_ids.length) return;
        var sql = `UPDATE uploads set document_batch_id = ${connection.escape(docuemnt_batch_id) } where id in (${upload_ids.map(u => connection.escape(u))})`;
        return connection.queryAsync(sql)

    }
};