var ENUMS = require(__dirname + '/../../modules/enums.js');

module.exports = {
    
    isPropertyAmenitiesExist: function(connection, name, property_type, company_id) {
        const sql = `SELECT id FROM amenities WHERE status = 1 AND name = ${connection.escape(name)} AND property_type = ${connection.escape(property_type)} AND (company_id is null || company_id = ${connection.escape(company_id)})`;
        return connection.queryAsync(sql).then(result => {
            return result.length > 0;
        });
    },
    
    updatePropertyAmenities: function(connection, property_amenities) {
        let queries = "";
        property_amenities.forEach(function (amenity) {
            const str = `UPDATE amenity_property SET ? WHERE id = ${connection.escape(amenity.id)};`
            queries += connection.format(str, amenity);
        });
        return connection.queryAsync(queries).then(result => {
            return result;
        });
    },

    findPropertyAmenityData: function(connection, id) {
        let sql = `SELECT amenity_id, property_id, amenity_name, amenity_category_id, amenity_options FROM amenity_property WHERE id = ${connection.escape(id)}`;
        return connection.queryAsync(sql).then(r => r.length ? r[0]: null);
    },


    getAllAmenities : function(connection, params) {
        let sql = `SELECT b.amenity_id, b.amenity_name as property_amenity_name, b.id as property_amenity_mapping_id , b.property_id,
            b.amenity_category_id, b.amenity_options as property_options, b.default_value as property_default_value,
            b.sort_order as property_sort_order, ac.name as property_category_name
            FROM amenity_property AS b
            LEFT JOIN amenity_categories as ac on ac.id = b.amenity_category_id Where b.deleted_at is null AND ac.id != 11 AND b.property_id IN (`+ connection.escape(params.properties)+`)
            ORDER BY ac.name, b.amenity_name ASC`;
        return connection.queryAsync(sql).then(function(propertyMasterAmenityList) {
            return propertyMasterAmenityList;
        });
    },
   
    getAllAmenitiesWithPropertyMapping : function(connection, params) {
        let sql = `
            SELECT 
                a.id as amenity_id,
                a.name as master_amenity_name,
                a.property_type,
                a.category_id as master_category_id,a.options,
                b.id as property_amenity_mapping_id,
                b.amenity_name as property_amenity_name,
                b.property_id,
                b.amenity_category_id,
                b.amenity_options as property_options,
                b.default_value as property_default_value,
                b.sort_order as property_sort_order,
                a.field_type,
                c.name as master_category_name,
                c.type as category_type,
                ac.name as property_category_name,
                (SELECT count(au.amenity_property_id) FROM amenity_units as au WHERE au.amenity_property_id=b.id AND au.unit_id IN 
                    (select concat(id) FROM units WHERE property_id = ${connection.escape(params.property_id)} )) as amenity_assigned_count 
            FROM amenities AS a 
                LEFT JOIN amenity_property AS b on a.id = b.amenity_id AND b.deleted_at is null AND (b.property_id is null || b.property_id=`+ connection.escape(params.property_id) + `) 
                LEFT JOIN amenity_categories as ac  on ac.id = b.amenity_category_id
                LEFT JOIN amenity_categories as c  on c.id = a.category_id
            WHERE a.status = 1 
                AND (a.company_id is null || a.company_id = ${connection.escape(params.company_id)} )
                AND c.id != ${ENUMS.AMENITY_CATEGORY.SPACE_INFORMATION}`;

        if (params.space_type) {
            sql += ` AND a.property_type = `+connection.escape(params.space_type);
        }  

        if (params.type && (params.type == 'list' || params.type == 'edit' || params.type === 'edit_list')) {
            sql += ` AND b.property_id = ${connection.escape(params.property_id)}`;
        }
            
        if (params.amenity_id) {
            sql += ` AND a.id =`+connection.escape( params.amenity_id); 
        }
        if (!params.amenity_id) {
            if(params.type && params.type == 'list')
                sql += ` ORDER BY case when b.sort_order is null then 2 else 1 end, b.sort_order asc`;
            else            
                sql += ` ORDER BY case when ac.name is null then c.name else ac.name end, case when b.amenity_name is null then a.name else b.amenity_name end`;
        }
        console.log("getAllAmenitiesWithPropertyMapping-sql", sql)
        return connection.queryAsync(sql).then(function(propertyMasterAmenityList) {
            return propertyMasterAmenityList;
        });
    },
    
    getAmenityCategories : function(connection) {
        let sql = "SELECT * FROM amenity_categories where id <> "+ENUMS.AMENITY_CATEGORY.SPACE_INFORMATION+" ORDER BY name ASC";
        return connection.queryAsync(sql).then(function(categoryList) {
            return categoryList;
        });
    },
    
    amenityNameDuplicateInMaster: function(connection, amenity, company_id, space_type) {
        let sql = `SELECT name FROM amenities
        WHERE id<>${connection.escape(amenity.amenity_id)} AND name=${connection.escape(amenity.amenity_name)} AND property_type=${connection.escape(space_type)} AND (company_id = ${connection.escape(company_id)} ||  company_id is null) AND status = 1
        `;
        return connection.queryAsync(sql).then(function(list) {
            return list;
        });
    },
    
    amenityNameDuplicateInProperty: function(connection, amenity, space_type) {
        let sql = `SELECT amenity_name FROM amenity_property
        WHERE id<>${connection.escape(amenity.id)} AND amenity_name=${connection.escape(amenity.amenity_name)} AND property_id=${connection.escape(amenity.property_id)} AND property_type=${connection.escape(space_type)}
        AND deleted_at is null
        `;
        return connection.queryAsync(sql).then(function(list) {
            return list;
        });
    },

    validateSpaceNumber: function(connection, unitList, propertyId) {
        let sql = `SELECT number FROM units WHERE number IN (?) AND property_id = ${connection.escape(propertyId)}`;
        return connection.queryAsync(sql, [unitList]).then(function(categoryList) {
            return categoryList;
        });
    },

    getSpaceNumber: function(connection, units) {
        let sql = `SELECT number FROM units WHERE id IN (?)`;
        return connection.queryAsync(sql, [units]).then(result => {
            return result;
        });
    },

    checkLeased: function(connection, units) {
        let sql = `Select distinct(unit_id) from leases where unit_id IN (?) and status <> 0`;
        return connection.queryAsync(sql, [units]).then(result => {
            return result;
        });
    },

    checkActiveLeased: function(connection, units, currDate) {
        let sql = `Select distinct(unit_id) from leases where start_date <= '${currDate}' and (end_date > '${currDate}' or end_date is null ) and status = 1 and unit_id IN (?)`;
        return connection.queryAsync(sql, [units]).then(result => {
            return result;
        });
    },

    deleteSpaces: function(connection, user, units) {
        const sql = `UPDATE units SET number = CONCAT(number, '-D', CURRENT_TIMESTAMP), deleted_by = ${connection.escape(user.id)}, deleted = now() WHERE id IN (?)`;
        return connection.queryAsync(sql, [units]).then(result => {
            return result;
        });
    },
    findAmenityProperties: function(connection, units) {
        let sql = `Select amenity_property_id from amenity_units where unit_id IN (${units})`;
        return connection.queryAsync(sql).then(a => a.length ? a : null );
    },
    deactivateSpaces: function(connection, spacesToDeactivate,activation_status,user_id) {
        
        const sql = `UPDATE units SET activation_status = ${activation_status},modified_by = ${user_id}  WHERE id IN (?)`;
        return connection.queryAsync(sql, [spacesToDeactivate]).then(result => {
            return result;
        });
    },
}




