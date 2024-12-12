var settings    = require(__dirname + '/../config/settings.js');

var moment = require('moment');

module.exports = {

	search(connection, conditions, searchParams, company_id, count){
		var sql;
		if(count){
			sql = "SELECT count(*) as count ";
		} else {
			sql = "SELECT *, (select name from document_types where documents.document_type_id = document_types.id) as  document_type ";
		}
		sql += " FROM documents where 1 = 1 and status = 1 and company_id = " +  connection.escape(company_id);

		if(conditions.search){
			sql += " and LOWER(name) like = " + connection.escape("%" + conditions.search.toLowerCase() + "%");
		}


    if(!conditions.all){
      sql += " and  upload_id is not null ";
    }


		if(searchParams){
			if(searchParams.sort){
				sql += " order by ";
				switch (searchParams.sort){
					default:
						sql += searchParams.sort;
				}
				sql += ' ' + searchParams.sortdir;
			}
			sql += " limit ";
			sql += searchParams.offset;
			sql += ", ";
			sql += searchParams.limit;
		}
		console.log(sql);
		return connection.queryAsync(sql);
	},

	findById:function(connection, document_id) {

		var sql = "Select * from documents where id = " + connection.escape(document_id);

		return connection.queryAsync(sql).then(result => result.length ? result[0] : null);
	},

	findByCompanyId:function(connection, company_id, params) {

		var sql = "Select * from documents where company_id = " + connection.escape(company_id) + " and status = 1 ";

		if(params.type){
			sql += " and document_type = " + connection.escape(params.type);
		}

		if(params.public !== null ){
			sql += " and public = " + connection.escape(params.public);
		}

		return connection.queryAsync(sql);
	},

	saveDocumentType(connection, data, document_type_id){

		var sql;

		if(document_type_id){
			sql = "UPDATE document_types set ? where id = " + connection.escape(document_type_id);
		} else {
			sql = "INSERT INTO document_types set ?";
		}

		return connection.queryAsync(sql, data).then(r => document_type_id ? document_type_id: r.insertId);
	},

	findDocumentTypeByName(connection, name, company_id){

		var sql = "Select * from document_types where company_id = " + connection.escape(company_id) + " and name = " + connection.escape(name);

		return connection.queryAsync(sql).then(dt => { if(!dt.length) return null; return dt[0]; });

	},

	findTypesByCompanyId:function(connection, company_id) {

		var sql = "Select * from document_types where company_id = " + connection.escape(company_id);
		return connection.queryAsync(sql);

	},

	findDocumentTypeById(connection, id, company_id){
		var sql = "Select * from document_types where id = " + connection.escape(id);

		if(company_id){
			sql += " and company_id = " +  connection.escape(company_id)
		}

		return connection.queryAsync(sql).then(dt => { if(!dt.length) return null; return dt[0]; });

	},
	// TODO find and remove this - Redundant
	findTypeById:function(connection, id, company_id) {

		var sql = "Select * from document_types where id = " + connection.escape(id);

		if(company_id){
			sql += " and company_id = " +  connection.escape(company_id)
		}
		return connection.queryAsync(sql).then(dt => { if(!dt.length) return null; return dt[0]; });

	},

	save:function(connection, data, document_id){
		var sql;
		if(document_id){
			sql = "UPDATE documents set ? where id = " + connection.escape(document_id);
		} else {
			sql = "INSERT INTO documents set ?";
		}
		return connection.queryAsync(sql, data).then(function(response){
			if(document_id) return document_id;
			if(response.insertId) return response.insertId;
		});
	},

	saveLeaseDoc:function(connection, data, lease_doc_id){
		var sql;
		if(lease_doc_id){
			sql = "UPDATE documents_leases set ? where id = " + connection.escape(lease_doc_id);
		} else {
			sql = "INSERT INTO documents_leases set ?";
		}
		return connection.queryAsync(sql, data).then(function(response){
			if(lease_doc_id) return lease_doc_id;
			if(response.insertId) return response.insertId;
		});
	},

	saveSignStatus:function(connection, data){
		var sql = "INSERT INTO signing_activity set ?";

		return connection.queryAsync(sql, data).then(function(response){
			return response.insertId;
		});

	},

	findSignStatusById:function(connection, sign_id){
		var sql = "SELECT * FROM signing_activity where id = " + connection.escape(sign_id);
		return connection.queryAsync(sql).then(function(response){
			return response.length ? response[0]: null;
		});

	},

	savePage:function(connection, data, page_id){
		var sql;
		if(page_id){
			sql = "UPDATE pages set ? where id = " + connection.escape(page_id);
		} else {
			sql = "INSERT INTO pages set ?";
		}
		return connection.queryAsync(sql, data).then(function(response){
			if(page_id) return page_id;
			if(response.insertId) return response.insertId;
		});
	},

	delete:function(connection, document_id){
		var sql = "update documents set status = 0 where id = " + connection.escape(document_id);
		return connection.queryAsync(sql);
	},

	findPagesByUploadId(connection, upload_id){

		var sql = "Select * from pages where upload_id = " + connection.escape(upload_id);
		return connection.queryAsync(sql);

	},

	findFieldsByPageId(connection, page_id){
		var sql = "Select * from document_fields where page_id = " + connection.escape(page_id);

		return connection.queryAsync(sql);
	},

	saveField(connection, data, field_id){
		var sql;
		if(field_id){
			sql = "UPDATE document_fields set ? where id = " + connection.escape(field_id);
		} else {
			sql = "INSERT INTO document_fields set ?";
		}

		return connection.queryAsync(sql, data).then(function(response){

			return field_id ? field_id :response.insertId;
		});

	},

	deleteField(connection, field_id){
		var sql = "DELETE from document_fields where id = " + connection.escape(field_id);
		return connection.queryAsync(sql);
	},

	findSignsOfDocument(connection, upload_id, tenant_id){

		var sql = "Select * from signing_activity where upload_id = " + connection.escape(upload_id) + ' and tenant_id = ' + connection.escape(tenant_id) + ' order by id asc';

		return connection.queryAsync(sql);

	},

	findAllSignsOfDocument(connection, upload_id){
		var sql = "Select * from signing_activity where upload_id = " + connection.escape(upload_id) + ' order by id asc';
		return connection.queryAsync(sql);

	},

	findActiveReversals(connection, document_id, params = {}) {
		const { Properties } = params;
		const sql = `select r.*, p.name as property_name from reversals r left join properties p on p.id = r.property_id where document_id = ${connection.escape(document_id)}
			${ Properties?.length ? `and property_id in ( ${Properties.map(p => connection.escape(p.id || p)).join(', ')} )` : '' }`
		
		return connection.queryAsync(sql);
	},

	findActiveRateChange(connection, document_id, params = {}) {
		const { Properties } = params;
		const sql = `select *, rc.name as rate_change_name ${Properties?.length ? ` , p.name as property_name ` : ''} from rate_changes rc 
				${ Properties?.length ? ` join properties p on rc.property_id = p.id ` : ''}
			where document_id = ${connection.escape(document_id)} and deleted_at is null and skipped is null and reviewed is null and completed is null
				${ Properties?.length ? ` and property_id in ( ${Properties.map(p => connection.escape(p.id || p)).join(', ')} )` : '' }`

		return connection.queryAsync(sql);
	},

	findActiveRateChangeConfigurations(connection, document_id, params = {}) {
		const { Properties } = params;
		const sql = `select *, rcc.name as rate_change_name ${Properties?.length ? ` , p.name as property_name ` : ''} from rate_change_configurations rcc 
				${ Properties?.length ? ` join properties p on rcc.property_id = p.id` : ''}
			where document_id = ${connection.escape(document_id)} and deleted_at is null
				${ Properties?.length ? ` and property_id in ( ${Properties.map(p => connection.escape(p.id || p)).join(', ')} )` : '' }`;

		return connection.queryAsync(sql);
	},

	findActiveTriggers(connection, document_id, params = {}) {
		const { Properties } = params;
		const sql = `
			select *, tg.name as tg_name, t.name as t_name ${ Properties.length ? ` , p.name as property_name ` : '' } from trigger_attachment ta
				join triggers t on ta.trigger_id = t.id 
				join trigger_groups tg on tg.id = t.trigger_group_id
				${ Properties?.length ? ` join property_trigger_groups ptg on ptg.trigger_group_id = tg.id join properties p on p.id = ptg.property_id and ptg.deleted_at is null ` : '' }
			where document_id = ${connection.escape(document_id)} and ta.active = 1 and t.active = 1 and tg.active = 1
				${ Properties?.length ? ` and ptg.property_id in ( ${Properties.map(p => connection.escape(p.id || p)).join(', ')} )` : ''};		
		`;
		
		return connection.queryAsync(sql);
	}
};
