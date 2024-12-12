var moment = require('moment');

module.exports = {
    save: function (connection, data, id) {
        var sql;
        if (id) {
            sql = "UPDATE trigger_groups set ? where id = " + connection.escape(id);
        } else {
            sql = "insert into trigger_groups set ?";
        }
        return connection.queryAsync(sql, data);
    },

    addProperties: function(connection, property_ids, trigger_group_id, contact_id){
        var sql = "INSERT INTO property_trigger_groups (property_id, trigger_group_id, created_by) VALUES ?";
        var values = [];
        property_ids.forEach(propertyId => {
            values.push([propertyId ,trigger_group_id, contact_id]);
        });

        return connection.queryAsync(sql, [values]);
    },

    removeProperties: function(connection, payload){
        let {propertyTriggerGroupIds = [], contact_id} = payload;

        let sql = `Update property_trigger_groups 
                    set deleted_by = ${contact_id}, deleted_at = now()         
                    where id in (${propertyTriggerGroupIds.map(id => connection.escape(id)).join(',')})`
        return connection.queryAsync(sql);
    },

    findByCompanyId: function(connection, company_id){
      var sql = "Select * from trigger_groups where active = 1 and company_id = " + connection.escape(company_id);
      return connection.queryAsync(sql);
    },

    findById: function (connection, trigger_group_id) {
        var sql = "Select *, " +
            "(select count(*) from triggers where active = 1 and trigger_group_id = trigger_groups.id) as triggers_count, "+
            "(select MAX(start) from triggers where active = 1 and trigger_group_id = trigger_groups.id) as duration "+
            "from trigger_groups where active = 1 and id = " + connection.escape(trigger_group_id);
        return connection.queryAsync(sql).then(function (qryRes) {
            return qryRes[0] || null;
        });
    },

    findByName: async function (connection, name, company_id){
        var sql = `SELECT * FROM trigger_groups WHERE name = ${connection.escape(name)} AND active = 1 AND company_id = ${connection.escape(company_id)}`;
        var res = await connection.queryAsync(sql);
        return res[0] || null;
    },

    findWithDuplicateNames: async function (connection, name, company_id){
        var sql = `SELECT * FROM trigger_groups WHERE ( name = ${connection.escape(name + ' - Copy')} or name like ${connection.escape(name + ' - Copy (%)')} ) AND active = 1 AND company_id = ${connection.escape(company_id)}`;
        return connection.queryAsync(sql);
    },

    findProperties: (connection, trigger_group_id) => {
        var sql = "SELECT * FROM property_trigger_groups where trigger_group_id = " + connection.escape(trigger_group_id) + " and deleted_at is null";
        return connection.queryAsync(sql);
    },

    delete: function (connection, id) {
        var sql = "UPDATE trigger_groups set active = 0 where id = " + connection.escape(id);
        return connection.queryAsync(sql);
    },

    findAttachements(connection, id, payload = {}) {
        const { is_active = true } = payload;
        const sql = `select ta.* from triggers t join trigger_attachment ta on ta.trigger_id = t.id where t.trigger_group_id = ${id} and ta.document_id is not null ${is_active ? ' and t.active = 1 and ta.active = 1' : ''}`;
        console.log('Trigger group Attachments ', sql);
        return connection.queryAsync(sql);
    },

    findByPropertyIds(connection, p_ids, tg_ids){
        let sql = `Select * from property_trigger_groups where property_id in (${p_ids.map(id => connection.escape(id)).join(',')}) and trigger_group_id not in (${tg_ids.map(id => connection.escape(id)).join(',')}) and deleted_at is null`;
        return connection.queryAsync(sql);
    },

    findGroupsByPropertyIds(connection, data) {
        let {property_ids, trigger_group_ids} = data

        let sql = `Select tg.name as trigger_group_name, ptg.id, ptg.property_id, concat(ifnull(p.number,''),case when p.number is not null then ' - ' else '' end, ifnull(a.city, ''), case when a.city is not null then ' - ' else '' end, ifnull(a.address, ''), ifnull(a.address2,'')) as property_name
                    from property_trigger_groups  ptg
                        inner join trigger_groups tg on tg.id = ptg.trigger_group_id and active = 1
                        inner join properties p on p.id = ptg.property_id
                        inner join addresses a on a.id = p.address_id
                    where ptg.property_id in (${property_ids.map(id => connection.escape(id)).join(',')})  
                        and ptg.deleted_at is null`;

        if(trigger_group_ids?.length){
            sql += ` and ptg.trigger_group_id not in (${trigger_group_ids.map(id => connection.escape(id)).join(',')})`
        }

        sql += ` ORDER BY ptg.property_id;`

        return connection.queryAsync(sql);
    },

    findByPropertyIds(connection, p_ids, tg_ids){
        let sql = `Select * from property_trigger_groups where property_id in (${p_ids.map(id => connection.escape(id)).join(',')}) and trigger_group_id not in (${tg_ids.map(id => connection.escape(id)).join(',')}) and deleted_at is null`;
        return connection.queryAsync(sql);
    },

    findGroupsByPropertyIds(connection, data) {
        let {property_ids, trigger_group_ids} = data

        let sql = `Select tg.name as trigger_group_name, ptg.id, ptg.property_id, concat(ifnull(p.number,''),case when p.number is not null then ' - ' else '' end, ifnull(a.city, ''), case when a.city is not null then ' - ' else '' end, ifnull(a.address, ''), ifnull(a.address2,'')) as property_name
                    from property_trigger_groups  ptg
                        inner join trigger_groups tg on tg.id = ptg.trigger_group_id and active = 1
                        inner join properties p on p.id = ptg.property_id
                        inner join addresses a on a.id = p.address_id
                    where ptg.property_id in (${property_ids.map(id => connection.escape(id)).join(',')})  
                        and ptg.deleted_at is null`;

        if(trigger_group_ids?.length){
            sql += ` and ptg.trigger_group_id not in (${trigger_group_ids.map(id => connection.escape(id)).join(',')})`
        }

        sql += ` ORDER BY ptg.property_id;`

        return connection.queryAsync(sql);
    }
};
