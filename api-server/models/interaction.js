module.exports = {

  async save(connection, data, interaction_id) {
    var sql;
    if (interaction_id) {
      sql = "UPDATE interactions set ? where id = " + connection.escape(interaction_id);
    } else {
      sql = "insert into interactions set ?";
    }
    const result = await connection.queryAsync(sql, data);

    return interaction_id ? interaction_id : result.insertId;
  },

  findByContactId: function (connection, contact_id, conditions = {}, searchParams, count) {
    var sql = '';
    if (count) {
      sql = "SELECT count(*) as count ";
    } else {
      sql = "SELECT * ";
    }

    sql += "from interactions where primary_contact_id = " + connection.escape(contact_id);

    if (conditions.content) {
      sql += " and content like " + connection.escape("%" + conditions.content + "%");
    }

    sql += " order by created DESC";

    if (searchParams) {
      sql += " limit ";
      sql += searchParams.offset;
      sql += ", ";
      sql += searchParams.limit;
    }
    console.log("SQL WHEN USED:", sql);
    return connection.queryAsync(sql);
  },

  findById: function (connection, interaction_id) {

    var sql = "Select * from interactions where id =  " + connection.escape(interaction_id);

    return connection.queryAsync(sql).then((result) => { return result ? result[0] : null });
  },

  findAllbyInteractionId(connection, interaction_id) {
    let sql = `SELECT *,
      (select * from mail m where m.interaction_id = interactions.id),
      (select * from emails e where e.interaction_id = interactions.id)
      (select * from sms where sms.interaction_id = interactions.id)
      (select * from phone_calls pc where pc.interaction_id = interactions.id)
      (select * from notes n where n.interaction_id = interactions.id)
      FROM interactions where document_batches_deliveries = ${interaction_id};`

    return connection.queryAsync(sql);
  },

  /**
   * This function updates the interactions table with the payload
   * @param {*} connection SQL connection object
   * @param {*} payload object with data to be inserted to interactions table as key-value pairs
   * @param {*} idArray Array of interactions id
   * @returns SQL update response
   */
  async bulkUpdate(connection, payload, idArray = []) {
    if ((!idArray?.length > 0)) return;

    let sql = `UPDATE interactions SET ? WHERE id IN (${ idArray.join(`, `) })`;
    return await connection.queryAsync(sql, payload)
  },


  findAllInteractorsByContactId(connection, company_id, properties = [], read_status, searchParams) {
    properties.push(0); // Include the non identified property_id interactions as well

    var sql = `CALL getInteractorsUnread(${connection.escape(company_id)}, '${properties.map(p => connection.escape(p)).join(",")}')`;
	if (read_status === 0) {
		sql = `CALL getInteractorsUnread(${connection.escape(company_id)}, '${properties.map(p => connection.escape(p)).join(",")}')`;

	
		if (searchParams) {
			if (searchParams.search) {
				sql = `CALL getInteractorsUnreadSearch(${connection.escape(searchParams.search)}, ${connection.escape(company_id)}, '${properties.map(p => connection.escape(p)).join(",")}', ${connection.escape(searchParams.limit)}, ${connection.escape(searchParams.offset)})`;
			}
			if (searchParams.type === "tenant") {
				sql = `CALL getInteractorsUnreadTenant(${connection.escape(company_id)}, '${properties.map(p => connection.escape(p)).join(",")}', ${connection.escape(searchParams.limit)}, ${connection.escape(searchParams.offset)})`;
				if (searchParams.search) {
					sql = `CALL getInteractorsUnreadTenantSearch(${connection.escape(searchParams.search)}, ${connection.escape(company_id)}, '${properties.map(p => connection.escape(p)).join(",")}', ${connection.escape(searchParams.limit)}, ${connection.escape(searchParams.offset)})`;
				}					
			}
			if (searchParams.type === "leads") {
				sql = `CALL getInteractorsUnreadLeads(${connection.escape(company_id)}, '${properties.map(p => connection.escape(p)).join(",")}', ${connection.escape(searchParams.limit)}, ${connection.escape(searchParams.offset)})`;
				if (searchParams.search) {		
					sql = `CALL getInteractorsUnreadLeadsSearch(${connection.escape(searchParams.search)}, ${connection.escape(company_id)}, '${properties.map(p => connection.escape(p)).join(",")}', ${connection.escape(searchParams.limit)}, ${connection.escape(searchParams.offset)})`;
				}
			}	
	
		}
    }
	if (read_status === 1) {
		sql = `CALL getInteractorsRead(${connection.escape(company_id)},  '${properties.map(p => connection.escape(p)).join(",")}', ${connection.escape(searchParams.limit)}, ${connection.escape(searchParams.offset)})`;

	
		if (searchParams) {
			if (searchParams.search) {
				sql = `CALL getInteractorsSearch(${connection.escape(searchParams.search)}, ${connection.escape(company_id)}, '${properties.map(p => connection.escape(p)).join(",")}', ${connection.escape(searchParams.limit)}, ${connection.escape(searchParams.offset)})`;
			}
			if (searchParams.type === "tenant") {
				sql = `CALL getInteractorsTenant(${connection.escape(company_id)}, '${properties.map(p => connection.escape(p)).join(",")}', ${connection.escape(searchParams.limit)}, ${connection.escape(searchParams.offset)})`;
				if (searchParams.search) {
					sql = `CALL getInteractorsTenantSearch(${connection.escape(searchParams.search)}, ${connection.escape(company_id)}, '${properties.map(p => connection.escape(p)).join(",")}', ${connection.escape(searchParams.limit)}, ${connection.escape(searchParams.offset)})`;
				}					
			}
			if (searchParams.type === "leads") {
				sql = `CALL getInteractorsLeads(${connection.escape(company_id)}, '${properties.map(p => connection.escape(p)).join(",")}', ${connection.escape(searchParams.limit)}, ${connection.escape(searchParams.offset)})`;
				if (searchParams.search) {		
					sql = `CALL getInteractorsLeadsSearch(${connection.escape(searchParams.search)}, ${connection.escape(company_id)}, '${properties.map(p => connection.escape(p)).join(",")}', ${connection.escape(searchParams.limit)}, ${connection.escape(searchParams.offset)})`;
				}
			}	
	
		}
    }
    console.log("SQL WHERE USED", sql);
	return connection.queryAsync(sql);
  },

  getCompanyOwnerId(connection, company_id) {
    var sql = `SELECT gds_owner_id FROM companies where id = ${connection.escape(company_id)}`;
    console.log("getCompanyOwnerId", sql);
    return connection.queryAsync(sql);
  },

  getFacilityIds(connection, properties) {
    if (properties.length) {
      var sql = `SELECT gds_id FROM properties where id in (${properties.map(p => connection.escape(p)).join(", ")})`;
      console.log("getFacilityIds", sql);
      return connection.queryAsync(sql);
    }
  },

  getOwnerId(connection, company_name) {
    var sql = "SELECT id FROM owner where business_name = '" + company_name + "'";
    console.log("getOwnerId", sql);
    return connection.query(sql).then(r => r.rows.length ? r.rows : []);
  },

  getContactDetailsByEmail(connection, email) {
    //var sql = "SELECT * FROM contacts where email = '" + email + "' and status = 'active' LIMIT 1";
    var sql = `select ct.*, cp.id as phone_id,  cp.phone as phone, addresses.address, addresses.address2, addresses.city, addresses.zip
    from contacts ct, contact_phones cp, addresses where email = '`
    sql += email
    sql += `' and status = 'active' and cp.contact_id = ct.id and \`primary\` = 1 and addresses.id =
    (select contact_locations.address_id from contact_locations where contact_locations.contact_id = ct.id and contact_locations.primary = 1 )
     order by contact_id desc LIMIT 1`
    console.log("getContactDetailsByEmail", sql);
    return connection.queryAsync(sql);
  },

  getContactDetailsByPhone(connection, phone) {
    //var sql = "SELECT * FROM contacts where email = '" + email + "' and status = 'active' LIMIT 1";
    var sql = `select ct.*, cp.id as phone_id,  cp.phone as phone, addresses.address, addresses.address2, addresses.city, addresses.zip
    from contacts ct, contact_phones cp, addresses where phone = '`
    sql += phone
    sql += `' and status = 'active' and cp.contact_id = ct.id and \`primary\` = 1 and addresses.id =
    (select contact_locations.address_id from contact_locations where contact_locations.contact_id = ct.id and contact_locations.primary = 1 )
     order by contact_id desc LIMIT 1`
    console.log("getContactDetailsByEmail", sql);
    return connection.queryAsync(sql);
  },

  getEmailContactDetailsBySearch(connection, searchParams) {
    if (searchParams.search.length > 0) {
      var sql = `select DISTINCT(email) as email, first, last from contacts where (select concat(contacts.first, ' ' , contacts.last) like ${connection.escape("%" + searchParams.search + "%")})`;
      console.log("getContactDetailsBySearch", sql);
      return connection.queryAsync(sql);
    }
  },

  getSMSContactDetailsBySearch(connection, searchParams) {
    if (searchParams.search.length > 0) {
      var sql = `select DISTINCT(cp.phone) as phone, ct.id, first, last from contacts ct, contact_phones cp where cp.contact_id = ct.id and (select concat(ct.first, ' ' , ct.last) like  ${connection.escape("%" + searchParams.search + "%")})`;
      console.log("getContactDetailsBySearch", sql);
      return connection.queryAsync(sql);
    }
  },
  
  findAllUnreadMessages(connection, company_id, properties = []) {

    let sql = `select count(i.read) as unread_count from interactions i join contacts c 
              on i.primary_contact_id = c.id 
              where i.read = 0 and company_id = ${connection.escape(company_id)}`;

    if (properties.length) {
      properties.push(0); // Include the non identified property_id interactions as well
      sql += ` and i.property_id IN (${properties.map(p => connection.escape(p)).join(", ")})`;
    }

    sql += ` limit 100`;
    console.log("findAllUnreadMessages", sql);
    return connection.queryAsync(sql).then(count => count.length ? count[0] : null);
  },

  // findAllInteractorsByContactId(connection, company_id, properties = [], searchParams){

  //   var sql = `Select * from (SELECT
  //               c.id,
  //               l.id as lid,
  //               ls.id as lease_id,
  //               c.company_id,
  //               c.first,
  //               c.middle,
  //               c.last,
  //               c.email,
  //               c.opt_out,
  //               (SELECT count(*) = 0 
  //                 FROM interactions i
  //                 WHERE i.contact_id = c.id and (i.read is null or i.read = '0')) AS responded,
  //               IFNULL((SELECT IF(ls.id IS NOT NULL, 1, 0) 
  //                 FROM leases l
  //                 WHERE l.id in (ls.id)
  //                 AND l.status = 1 LIMIT 1), 0) AS is_tenant,
  //               (SELECT phone
  //                 FROM contact_phones
  //                 WHERE contact_id = c.id LIMIT 1) AS phone
  //           FROM
  //               contacts c
  //               INNER JOIN interactions ii on ii.contact_id = c.id
  //               LEFT JOIN leads l on l.contact_id = c.id
  //               LEFT JOIN contact_leases cl on cl.contact_id = c.id
  //               LEFT JOIN  leases ls on ls.id = cl.lease_id
  //           WHERE
  //             (l.id is not null or ls.id is not null)
  //             AND c.company_id = ${connection.escape(company_id)}`

  //   if(properties.length){
  //     sql += ` AND ((ls.id is NULL AND l.property_id in ( ${properties.map(p => connection.escape(p)).join(", ")}))
  //             OR  ls.id in (select id from leases where unit_id in (select id from units where property_id in ( ${properties.map(p => connection.escape(p)).join(", ")})))
  //             )`;
  //   }

  //   sql +=  ` GROUP BY c.id
  //            ORDER BY responded, c.id) i`;

  //   if(searchParams){

  //     sql += ' WHERE 1 = 1'

  //     if(searchParams.search){
  //       sql += ` AND (select concat(i.first, ' ' , i.last) like ${connection.escape("%" + searchParams.search + "%")})`; 
  //     }

  //     if(searchParams.type){
  //       sql += ` AND i.is_tenant = ${searchParams.type === "tenant" ? 1 : 0}`; 
  //     }

  //     if(searchParams.limit && searchParams.offset){
  //       sql += ` limit ${searchParams.offset}, ${searchParams.limit}`;
  //     }
  //   }

  //   console.log("sql", sql);
  //   return connection.queryAsync(sql);

  // },

  findAllInteractionsByContactId(connection, contact_id, conditions, searchParams, properties = []) {

    let sql = `Select * from interactions where primary_contact_id = ${connection.escape(contact_id)}`;
	
    if (properties.length) {
      properties.push(0); // Include the non identified property_id interactions as well
      sql += ` and property_id IN (${properties.map(p => connection.escape(p)).join(", ")})`;
    }
	
	if (searchParams && searchParams.space_number && searchParams.space_number != 'Tenant') { 
      sql += ` and space = ${connection.escape(searchParams.space_number)}`;
    }
	
    if (conditions.context) {
	sql += ` and context = ${connection.escape(conditions.context)}`;
    }

    if (conditions.delivery_methods_id) {
      sql += ` and delivery_methods_id = ${connection.escape(conditions.delivery_methods_id)}`;
    }

    sql += ` order by pinned desc, \`read\` asc, created desc `

    if (searchParams && searchParams.limit && searchParams.offset) {
      sql += ` limit ${searchParams.offset}, ${searchParams.limit}`;
    }
	console.log("sql", sql);
    return connection.queryAsync(sql);

  },

  async findByGDSNotificationId(connection, gds_notification_id) {
    let sql = `Select * from interactions where gds_notification_id = ${connection.escape(gds_notification_id)}`
    return connection.queryAsync(sql).then((result) => { return result ? result[0] : null });
  },

  async getInteractorDetails(connection, contact_id) {
    let sql = `SELECT *, 
      (select count(id) from interactions where interactions.primary_contact_id = contacts.id and \`read\` = 0 ) > 0 as has_unread, 
      (select MAX(created) from interactions where interactions.primary_contact_id = contacts.id ) as last_message_time,
      (select entered_by = contact_id from interactions where interactions.primary_contact_id = contacts.id and interactions.id = (select MAX(id) from interactions where primary_contact_id = contacts.id ) ) as responded,
      (select content from interactions where primary_contact_id = contacts.id and  interactions.id = (select MAX(id) from interactions  where primary_contact_id = contacts.id  ) ) as last_message_text
      from contacts where id = ${connection.escape(contact_id)}`


    console.log("SQL", sql);

    return connection.queryAsync(sql).then((result) => { return result ? result[0] : null });
  },
   
  async findUploadInteraction(connection, interaction_id) {
    let sql = `select * from uploads_interactions ui join uploads u on ui.upload_id = u.id where ui.interaction_id = ${connection.escape(interaction_id)}`
    console.log("SQL", sql);

    return connection.queryAsync(sql).then((result) => { return result ? result[0] : null });
  },

  async saveStatus(connection, data) {
    let sql = `insert into status_history set ?`
    const result = await connection.queryAsync(sql, data);
    return data.interaction_id ? data.interaction_id : result.insertId;

  },
  async findNotes(connection, interaction_id) {
    let sql = `SELECT n.* from notes n join interactions i on n.interaction_id = i.id
    where n.interaction_id = ${interaction_id} order by id DESC`;

    return await connection.queryAsync(sql);

  },

  // async findUploadInteraction(connection, interaction_id) {
    // let sql = `select * from uploads_interactions ui join uploads u on ui.upload_id = u.id where ui.interaction_id = ${connection.escape(interaction_id)}`
    // console.log("SQL", sql);

    // return connection.queryAsync(sql).then((result) => { return result ? result[0] : null });
  // },

  async updateInteractionContactId(connection, payload) {

    let sql = `
      UPDATE interactions 
      SET contact_id = ${connection.escape(payload.new_contact_id)},
	    primary_contact_id = ${connection.escape(payload.new_contact_id)},
	    contact_type = 'primary'
      WHERE contact_id = ${connection.escape(payload.contact_id)}
        AND lease_id = ${connection.escape(payload.lease_id)}
    ;`
    console.log('updateInteractionContactId SQL:',sql);
    return await connection.queryAsync(sql);
  }
};
