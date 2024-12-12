const LeaseProtectedPropertyItem = {
    bulkSave(connection, payload) {
        const { data } = payload;	 
        const sql = `insert into lease_protected_property_items (lease_id, protected_property_item_id, created_by) values ? `;
        
        console.log('Lease protected property items data: ', data);

        return connection.queryAsync(sql, [
            data.map(d => [
                connection.escape(d.lease_id), 
                connection.escape(d.protected_property_item_id),
                connection.escape(d.created_by)
            ])
        ]);
    },

    bulkRemove(connection, payload) {
        const { data, removed_items } = payload;
        const sql = `update lease_protected_property_items set ? where id in (${removed_items.map(item => connection.escape(item.id))})`;

        return connection.queryAsync(sql, data);
    },

    findActive(connection, payload) {
        const { lease_id } = payload;
        const sql = `select * from lease_protected_property_items lppi where lppi.deleted_at is NULL and lease_id  = ${connection.escape(lease_id)}`;  
                
        return connection.queryAsync(sql);
    },

    findAll(connection, payload) {
        const { lease_id } = payload;
        const sql = `
            select lppi.id, ppi.id as protected_property_item_id, ppi.name, ppi.note from 
                lease_protected_property_items lppi right join protected_property_items ppi
                on lppi.protected_property_item_id = ppi.id and lppi.lease_id = ${connection.escape(lease_id)} and lppi.deleted_at is NULL
            where ppi.active = 1;                
        `;  
                
        return connection.queryAsync(sql);
    }
}

module.exports = LeaseProtectedPropertyItem;