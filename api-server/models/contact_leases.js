var settings    = require(__dirname + '/../config/settings.js');

var moment = require('moment');
var Promise         = require('bluebird');
var Sql             = require(__dirname + '/../modules/sql_snippets.js');

let ContactLeases = {

	findTenantsByLeaseId(connection, lease_id){

		var sql = "select * from contact_leases where type = 'tenant' and lease_id = " + connection.escape(lease_id) + ' order by sort asc';

		return connection.queryAsync(sql);
	},
	findById(connection, id){

		var sql = "select * from contact_leases where id = " + connection.escape(id);

		return connection.queryAsync(sql).then(r =>  r.length? r[0]: null);

	},

	updatePrimaryContactLeases: async function(connection, lease_id) {
			let sql = "select * from contact_leases where lease_id = " + connection.escape(lease_id) + " and `primary` = 1"
			let primaryContactLeaseExists = await connection.queryAsync(sql).then(contact_lease => contact_lease.length > 0 ? true : false);

			if(!primaryContactLeaseExists) {
				// default case
				sql = "update contact_leases set `primary` = 1 where id in (select * from (SELECT MIN(id) FROM contact_leases where lease_id = " + connection.escape(lease_id) + ") as id);"
				return connection.queryAsync(sql);
			}
	},
	save: async (connection, data) => {
		var sql = "INSERT INTO contact_leases set ? ";
		let response = await connection.queryAsync(sql, data).then(response => response.insertId);
		await ContactLeases.updatePrimaryContactLeases(connection, data.lease_id);
		return response;
	},
	remove(connection, id, lease_id){

		var sql = "DELETE FROM contact_leases where id = " + connection.escape(id) + ' and lease_id = ' + connection.escape(lease_id);
		return connection.queryAsync(sql);

	},
	search(connection, conditions = {}, searchParams, company_id, count){
		var sql = '';
		if(count){
			sql = "SELECT count(*) as count ";
		} else {

			sql = "Select *, ";
			sql += "(SELECT count(id) from contact_leases where contact_id = contacts.id and lease_id in (select id from leases where status = 1)) as leases, ";
			sql += " (SELECT phone from contact_phones where contact_id = contacts.id and `primary` = 1) as phone ";
			// sql +=  '(SELECT SUM((qty*cost) - IFNULL((SELECT SUM(amount) FROM discount_line_items WHERE invoice_line_id = invoice_lines.id), 0) + ROUND(((qty * cost) - IFNULL((SELECT SUM(amount) FROM discount_line_items WHERE invoice_line_id = invoice_lines.id AND pretax = 1),0)) * IFNULL( (SELECT SUM(taxrate/100) FROM tax_line_items WHERE invoice_line_id = invoice_lines.id) , 0), 2)) FROM invoice_lines WHERE invoice_id in ( select id from invoices where status > -1 and due < CURDATE() and invoices.lease_id in ( select lease_id from contact_leases where contact_id = contacts.id))) - (SELECT IFNULL(SUM(amount),0)  FROM invoices_payments WHERE invoice_id in ( select id from invoices where status > -1 and due < CURDATE() and invoices.lease_id in (select lease_id from contact_leases where contact_id = contacts.id))) AS balance ';
		}



		sql += " FROM contacts where 1 = 1  " ;
		sql += " and id in (select contact_id from contact_leases where lease_id in (select id from leases where status = 1 ";

		sql +=	")) " ;
		sql += " and company_id = " + connection.escape(company_id);


		if(conditions.name){
			sql += " and concat(first, ' ' , last) like " + connection.escape("%" + conditions.name + "%");
		}

		if(conditions.email){
			sql += " and email like " + connection.escape("%" + conditions.email + "%");
		}

		if(conditions.property_id.length){
			sql += " and id in (select contact_id from contact_leases where lease_id in (select id from leases where unit_id in (select id from units where property_id = " + connection.escape(conditions.property_id) + " ))) ";
		}


		if(conditions.current){
			sql += " and id in (select contact_id from contact_leases where lease_id in (select id from leases where start_date <= CURDATE() and (end_date is null || end_date > CURDATE()))) ";
		}

		if(!count && conditions.past_due){
			sql += " HAVING balance > 0 ";
		} else if (conditions.past_due){

			sql += ' and (SELECT SUM((qty*cost) - IFNULL((SELECT SUM(amount) FROM discount_line_items WHERE invoice_line_id = invoice_lines.id), 0) + ROUND(((qty * cost) - IFNULL((SELECT SUM(amount) FROM discount_line_items WHERE invoice_line_id = invoice_lines.id AND pretax = 1),0)) * IFNULL( (SELECT SUM(taxrate/100) FROM tax_line_items WHERE invoice_line_id = invoice_lines.id) , 0), 2)) FROM invoice_lines WHERE invoice_id in ( select id from invoices where status > -1 and due < CURDATE() and invoices.lease_id in ( select lease_id from contact_leases where contact_id = contacts.id))) - (SELECT IFNULL(SUM(amount),0)  FROM invoices_payments WHERE invoice_id in ( select id from invoices where status > -1 and due < CURDATE() and invoices.lease_id in (select lease_id from contact_leases where contact_id = contacts.id))) > 0 ';

		}

		if(searchParams){
			if(searchParams.sort){
				sql += " order by ";
				switch (searchParams.sort){
					case 'name':
						sql += " concat(first, ' ' , last) ";
						break;
					case 'email':
						sql += " email ";
						break;
					default:
						sql += searchParams.sort;

				}
				sql += ' ' + searchParams.sortdir;
			}

			if(searchParams.limit){
				sql += " limit ";
				sql += searchParams.offset;
				sql += ", ";
				sql += searchParams.limit;
			}
		}
		console.log("searchParams", searchParams);
		console.log("sql", sql);
		return connection.queryAsync(sql);
	},
	findAll: async function(connection, searchParams, count, company_id, properties) {
		let statusQueries = {
			all: ``,
			active: ` AND ( end_date > CURRENT_DATE() OR end_date is null )`,
			inactive: ` AND ( end_date < CURRENT_DATE())`
		}
		let sql = `SELECT ${count ? "count(cl.id) AS count" : "cl.*"}
					 FROM
						contact_leases cl
						JOIN leases l ON cl.lease_id = l.id
						JOIN units u ON l.unit_id = u.id
						JOIN properties p ON u.property_id = p.id
					 WHERE l.status = 1`
		if (searchParams.status) sql += statusQueries[searchParams.status]
		sql += ` AND p.company_id = ${company_id} AND p.id IN (${properties})`
		if (searchParams.property_id) sql += ` AND p.id IN (${connection.escape(searchParams.property_id)})`
		if (searchParams && searchParams.limit) {
			if (!count) {
				sql +=
				` LIMIT ${connection.escape(parseInt(searchParams.offset))},${connection.escape(parseInt(searchParams.limit))}`;
			};
		}
		sql += ';'
		return connection.queryAsync(sql)
			.then(function (tenantResp) {
				return res = count ? tenantResp?.[0]?.count : tenantResp;
			})
			.catch(function (err) {
				console.log(err);
				return [];
			})
	},
	findAllContacts(connection, leaseIds) {

        let sql =  `
		SELECT
			cl.contact_id,
			cl.lease_id
        FROM
            contact_leases cl 
		WHERE 
			cl.lease_id IN (${leaseIds})
`
        return connection.queryAsync(sql).then(function (leasesRes) {
            if (!leasesRes.length) return [];
            return leasesRes;

        }).catch(function (err) {
            console.log(err);
            return [];
        });
    },
    async findContactDetails(connection, lease_id, params){

        let sql = `SELECT
                        cl.id, cl.contact_id, cl.lease_id, cl.sort, cl.type, cl.created_at,
                        JSON_OBJECT (
                            'id', l.id,
                            'unit_id', l.unit_id,
                            'start_date', l.start_date,
                            'end_date', l.end_date,
                            'bill_day', l.bill_day, 'terms', l.terms,
                            'rent', l.rent,
                            'status', l.status,
                            'send_invoice', l.send_invoice,
                            'security_deposit', l.security_deposit,
                            'moved_out', l.moved_out
                        ) AS Lease,
                        (SELECT IFNULL(JSON_OBJECT (
                        'id', c.id,
                        'salutation', c.salutation,
                        'first', c.first,
                        'middle', c.middle,
                        'last', c.last,
                        'suffix', c.suffix,
                        'email', c.email,
                        'company', c.company,
                        'dob', c.dob,
                        'ssn', c.ssn,
                        'gender', c.gender,
                        'driver_license', c.driver_license,
                        'source', c.source,
                        'Phone',
                            IFNULL(
                                (
                                SELECT
                                    JSON_ARRAYAGG(
                                    JSON_OBJECT(
                                        'id', cp.id,
                                        'type', cp.type,
                                        'phone', cp.phone,
                                        'sms', cp.sms
                                    )
                                    )
                                FROM
                                    contact_phones cp
                                WHERE
                                    cp.contact_id = cl.contact_id
                                ),
                                JSON_ARRAY()
                            ),
                        'Addresses',
                            IFNULL(
                                (
                                SELECT
                                    JSON_ARRAYAGG(
                                    JSON_OBJECT(
                                        'id', cl2.id,
                                        'type', cl2.type,
                                        'Address',
                                            (
                                            SELECT
                                            JSON_OBJECT(
                                                'id', a.id,
                                                'address',a.address,
                                                'address2',a.address2,
                                                'city', a.city,
                                                'state', a.state,
                                                'neighborhood', a.neighborhood,
                                                'zip', a.zip,
                                                'country', a.country,
                                                'lat', a.lat,
                                                'lng', a.lng,
                                                'formatted_address', a.formatted_address,
                                                'region', a.region,
                                                'district', a.district
                                            )
                                            FROM
                                                addresses a
                                            WHERE
                                                cl2.address_id = a.id
                                        )
                                    )
                                )
                                FROM
                                    contact_locations cl2
                                WHERE
                                    cl2.contact_id = cl.contact_id
                            ), JSON_ARRAY()
                        ),
                        'Business',
                            IFNULL(
                                (
                                SELECT
                                    JSON_OBJECT(
                                    'id', cb.id,
                                    'contact_id', cb.contact_id,
                                    'address_id', cb.address_id,
                                    'name', cb.name,
                                    'phone', cb.phone,
                                    'phone_type', cb.phone_type,
                                    'country_code', cb.country_code,
                                    'Address',
                                        (
                                        SELECT
                                            JSON_OBJECT(
                                                'id', a2.id,
                                                'address', a2.address,
                                                'address2', a2.address2,
                                                'city',a2.city,
                                                'state', a2.state,
                                                'neighborhood',a2.neighborhood,
                                                'zip', a2.zip, 'country',a2.country,
                                                'lat', a2.lat,
                                                'lng',a2.lng,
                                                'formatted_address', a2.formatted_address,
                                                'region', a2.region,
                                                'district',a2.district
                                            )
                                        FROM
                                            addresses a2
                                        WHERE
                                            cb.address_id = a2.id
                                        )
                                    )
                                FROM
                                    contact_businesses cb
                                WHERE
                                    cb.contact_id = cl.contact_id
                                limit
                                    1
                                ),
                                JSON_OBJECT()
                            )
                        ), JSON_OBJECT()))AS Contact,
                        IFNULL(
                        (
                            SELECT
                            JSON_OBJECT(
                                'id', r.id,
                                'lease_id', r.lease_id,
                                'expires', DATE_FORMAT(r.expires, "%Y-%m-%d %H:%i:%s"),
                                'created', DATE_FORMAT(r.created, "%Y-%m-%d %H:%i:%s"),
                                'time', DATE_FORMAT(r.time, "%Y-%m-%d %H:%i:%s")
                            )
                            FROM
                                reservations r
                            WHERE
                                r.lease_id = l.id
                        ),
                        JSON_OBJECT()
                        ) AS Reservation
                    FROM
                        contact_leases cl
                        LEFT JOIN leases l ON l.id = cl.lease_id
                        LEFT JOIN contacts c ON c.id = cl.contact_id
                    WHERE
                        cl.lease_id IN (${lease_id})`;
        if (params?.limit) {
            sql += ` LIMIT ${connection.escape(parseInt(params.limit))}`;
        }
        return connection.queryAsync(sql).then(r =>  r.length? r : []);
    },

    async updateContactLeaseContactId(connection, payload){
        let sql = `
            UPDATE 
            contact_leases 
            SET contact_id = ${connection.escape(payload.new_contact_id)}
            WHERE contact_id = ${connection.escape(payload.contact_id)}
                AND lease_id = ${connection.escape(payload.lease_id)};
        `;

        console.log("updateContactLeaseContactId SQL:", sql)
        return await connection.queryAsync(sql);
    },
    
    async updateConfidenceInterval(connection, lease_id, confidence_interval){
        let sql = `UPDATE contact_leases SET confidence_interval = ${connection.escape(confidence_interval)} WHERE lease_id = ${connection.escape(lease_id)};`
        return connection.queryAsync(sql)
    },

    async updateContactLeaseContactId(connection, payload){
        let sql = `
            UPDATE 
            contact_leases 
            SET contact_id = ${connection.escape(payload.new_contact_id)}
            WHERE contact_id = ${connection.escape(payload.contact_id)}
                AND lease_id = ${connection.escape(payload.lease_id)};
        `;

        console.log("updateContactLeaseContactId SQL:", sql)
        return await connection.queryAsync(sql);
    },

    async findTenantDetails(connection, lease_ids) {
        if (!Array.isArray(lease_ids) || !lease_ids.length) return [];
        let sql = `SELECT
                        cl.id, cl.contact_id, cl.lease_id, cl.sort, cl.type, cl.created_at,
                        (SELECT IFNULL(JSON_OBJECT (
                        'id', c.id,
                        'salutation', c.salutation,
                        'first', c.first,
                        'middle', c.middle,
                        'last', c.last,
                        'suffix', c.suffix,
                        'email', c.email,
                        'company', c.company,
                        'dob', c.dob,
                        'ssn', c.ssn,
                        'gender', c.gender,
                        'driver_license', c.driver_license,
                        'source', c.source,
                        'status', (
                            IF( (SELECT count(id) FROM leases WHERE unit_id IN (SELECT id FROM units WHERE property_id = u.property_id) AND status = 2 AND id IN (SELECT lease_id FROM contact_leases WHERE contact_id = c.id)) > 0, "Pending", 
                                IF( (SELECT count(id) FROM leads WHERE property_id = u.property_id AND contact_id = c.id AND status = 'active') > 0, "Active Lead",
                                    IF( (SELECT count(id) FROM leases WHERE unit_id IN (SELECT id FROM units WHERE property_id = u.property_id) AND status = 1 AND lease_standing_id = (SELECT id FROM lease_standings WHERE name = "Delinquent") AND (end_date is null OR end_date > CURDATE()) AND id IN (SELECT lease_id FROM contact_leases WHERE contact_id = c.id)) > 0, "Delinquent", 
                                        IF( (SELECT count(id) FROM leases WHERE unit_id IN (SELECT id FROM units WHERE property_id = u.property_id) AND status = 1 AND lease_standing_id = (SELECT id FROM lease_standings WHERE name = "Current") AND (end_date is null OR end_date > CURDATE()) AND id IN (SELECT lease_id FROM contact_leases WHERE contact_id = c.id)) > 0, "Current",
                                            IF( (SELECT count(id) FROM leases WHERE unit_id IN (SELECT id FROM units WHERE property_id = u.property_id) AND status = 1 AND lease_standing_id = (SELECT id FROM lease_standings WHERE name = "Suspended") AND (end_date is null OR end_date > CURDATE()) AND id IN (SELECT lease_id FROM contact_leases WHERE contact_id = c.id)) > 0, "Suspended",    
                                                IF( (SELECT count(id) FROM leases WHERE unit_id IN (SELECT id FROM units WHERE property_id = u.property_id) AND status = 1 AND lease_standing_id = (SELECT id FROM lease_standings WHERE name = "Gate Lockout") AND (end_date is null OR end_date > CURDATE()) AND id IN (SELECT lease_id FROM contact_leases WHERE contact_id = c.id)) > 0, "Gate Lockout",  
                                                    IF( (SELECT count(id) FROM leases WHERE unit_id IN (SELECT id FROM units WHERE property_id = u.property_id) AND status = 1 AND lease_standing_id = (SELECT id FROM lease_standings WHERE name = "Active Lien") AND (end_date is null OR end_date > CURDATE()) AND id IN (SELECT lease_id FROM contact_leases WHERE contact_id = c.id)) > 0, "Active Lien",    
                                                        IF( (SELECT count(id) FROM leases WHERE unit_id IN (SELECT id FROM units WHERE property_id = u.property_id) AND status = 1 AND lease_standing_id = (SELECT id FROM lease_standings WHERE name = "Auction") AND (end_date is null OR end_date > CURDATE()) AND id IN (SELECT lease_id FROM contact_leases WHERE contact_id = c.id)) > 0, "Auction", 
                                                            IF( (SELECT count(id) FROM leases WHERE unit_id IN (SELECT id FROM units WHERE property_id = u.property_id) AND status = 1 AND end_date < CURDATE() AND id IN (SELECT lease_id FROM contact_leases WHERE contact_id = c.id) AND id IN ( SELECT lease_id FROM invoices WHERE status = 1 AND subtotal + total_tax - total_discounts > total_payments)) > 0, "Balance Due",   
                                                                IF( (SELECT count(id) FROM leases WHERE unit_id IN (SELECT id FROM units WHERE property_id = u.property_id) AND status = 1 AND end_date < CURDATE() AND id IN (SELECT lease_id FROM contact_leases WHERE contact_id = c.id)) > 0, "Lease Closed", 
                                                                    IF( (SELECT count(id) FROM leads WHERE property_id = u.property_id AND contact_id = c.id AND status = 'retired') > 0, "Retired Lead", 
                                                                        ""
                                                                    )
                                                                )  
                          
                                                            )
                                                        )
                                                    )
                                                )
                                            )
                                        )
                                    )
                                )
                            ) 
                          ),
                        'Phones',
                            IFNULL(
                                (
                                SELECT
                                    JSON_ARRAYAGG(
                                    JSON_OBJECT(
                                        'id', cp.id,
                                        'type', cp.type,
                                        'phone', cp.phone,
                                        'sms', IF(cp.sms <> 0, cast(TRUE AS json) , cast(FALSE AS json)),
                                        'primary', cp.primary
                                    )
                                    )
                                FROM
                                    contact_phones cp
                                WHERE
                                    cp.contact_id = cl.contact_id
                                ),
                                JSON_ARRAY()
                            ),
                        'Addresses',
                            IFNULL(
                                (
                                SELECT
                                    JSON_ARRAYAGG(
                                    JSON_OBJECT(
                                        'id', cl2.id,
                                        'type', cl2.type,
                                        'Address',
                                            (
                                            SELECT
                                            JSON_OBJECT(
                                                'id', a.id,
                                                'address',a.address,
                                                'address2',a.address2,
                                                'city', a.city,
                                                'state', a.state,
                                                'neighborhood', a.neighborhood,
                                                'zip', a.zip,
                                                'country', a.country,
                                                'lat', a.lat,
                                                'lng', a.lng,
                                                'formatted_address', a.formatted_address,
                                                'region', a.region,
                                                'district', a.district
                                            )
                                            FROM
                                                addresses a
                                            WHERE
                                                cl2.address_id = a.id
                                        )
                                    )
                                )
                                FROM
                                    contact_locations cl2
                                WHERE
                                    cl2.contact_id = cl.contact_id
                            ), JSON_ARRAY()
                        )
                        ), JSON_OBJECT())) AS Contact
                    FROM
                        contact_leases cl
                        JOIN leases l ON l.id = cl.lease_id
                        JOIN contacts c ON c.id = cl.contact_id
                        JOIN units u ON u.id = l.unit_id
                    WHERE
                        cl.lease_id IN (${lease_ids})`;
        
        return connection.queryAsync(sql).then(r =>  r.length? r : []);
    }
}

module.exports = ContactLeases;