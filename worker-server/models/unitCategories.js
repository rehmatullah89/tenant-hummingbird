
module.exports = {

    findCategoryList:function(connection, company_id, property_id){


        if(property_id){
            var sql = "Select * from unit_categories where status = 1 and company_id = " + connection.escape(company_id) + " and id in (select category_id from units where property_id = " +  connection.escape(property_id) + " ) ORDER BY sort asc, id DESC";
        } else {
            var sql = "Select * from unit_categories where status = 1 and company_id = " + connection.escape(company_id) + " ORDER BY sort asc, id DESC";
        }

        return connection.queryAsync( sql );
    },
    findById:function(connection, id){

        var sql = "Select * from unit_categories where id = " + connection.escape(id);
        return connection.queryAsync( sql )
            .then(function(catRes){
                return catRes[0] || null
            });

    },
    save: function(connection, data, id){

        var sql;
        if(id){
            sql = "UPDATE unit_categories set ? where id = " + connection.escape(id);
        } else {
            sql = "insert into unit_categories set ? ";
        }
        return connection.queryAsync(sql, data);

    },
    delete: function(connection, id){
        var sql = "update unit_categories set status = 0 where  id = " + connection.escape(id);
        
        return connection.queryAsync(sql);
    },
    unsetUnits(connection, id){

        var sql = "update units set category_id = null where category_id = " + connection.escape(id);
        return connection.queryAsync(sql);

    },
    getBreakdown(connection, category_id, company_id, property_id){

        if(!company_id && !property_id) return false;

        var sql = `SELECT MAX(upc.set_rate) AS max, MIN(upc.set_rate) AS min, count(u.id) as count
                    FROM unit_price_changes upc
                    JOIN units u ON upc.unit_id = u.id
                    JOIN properties p ON p.id  = u.property_id
                    WHERE p.company_id =  ${connection.escape(company_id)} and u.category_id =  ${connection.escape(category_id)}`

        if(property_id){
            sql +=   ` and u.property_id = ${connection.escape(property_id)}` ;
        }

        return connection.queryAsync(sql).then(function(result){
            if(!result.length) return { min: null, max: null, count: null };
            return result[0];
        });

    },
    getAvailableBreakdown(connection, category_id, company_id, property_id){

        // check Lease
        // check Available Date
        // check Reservation
        // check Hold

        if(!company_id && !property_id) return false;

        var sql = 'Select count(id) as count, min((select upc.set_rate from unit_price_changes upc where upc.unit_id = units.id)) as min, max((select upc.set_rate from unit_price_changes upc where upc.unit_id = units.id)) as max FROM units WHERE ' +
                'available_date <= CURDATE() ' +
                'and status = 1  ' +
                'and id not in( select unit_id from unit_holds where expires >= now()) ' +
                'and id not in (  ' +
                    'select unit_id from leases where ' +
                        'start_date <= CURDATE() ' +
                        'and status >= 0 ' +
                        'and (end_date is null or end_date >= CURDATE()) ' +
                ') ' +
                'and id not in ( ' +
                    'select unit_id from leases where ' +
                    'start_date <= CURDATE() ' +
                    'and status = 0 ' +
                    'and (end_date is null or end_date >= CURDATE()) ' +
                    'and (select expires from reservations where reservations.lease_id = leases.id) >= now() ' +
                ')';

        if(property_id){
            sql +=   ' and property_id =  ' + connection.escape(property_id) ;
        }

        if(company_id)  {
            sql +=   ' and property_id in (select id from properties where company_id =  ' + connection.escape(company_id) + ') ';
        }
        sql += ' and category_id = ' + connection.escape(category_id);

        return connection.queryAsync(sql).then(function(result){
            if(!result.length) return { min: null, max: null, count: null };
            return result[0];
        });


    }


};

