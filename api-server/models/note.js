const moment = require('moment');
const { escape } = require('../helpers/sql');

module.exports = {

    async add(connection, data) {
        // escape query values
        escape(connection, data);

        const { content, context, context_id, last_modified_by, notes_category_id } = data

        let sql = `INSERT INTO notes
        (content, ${context}, last_modified_by, notes_category_id)
       VALUES
       (${content}, ${context_id}, ${last_modified_by},${notes_category_id});`

        const result = await connection.queryAsync(sql);
        return result;
    },

    async get(connection, filter) {

        escape(connection, filter);
        const { context, context_id, } = filter;

        let sql = `SELECT * FROM notes as n join notes_categories as nc on n.notes_category_id = nc.id
        WHERE ${context} = ${context_id}`;

        const result = await connection.queryAsync(sql);
        return result
    },
    async getNotesCatagories(connection) {
        escape(connection);
        let sql = `SELECT * FROM notes_categories`;
        const result = await connection.queryAsync(sql);
        return result
    },

    findNotesByInteraction: function (connection, interaction_id) {
        let sql = `SELECT * FROM notes where interaction_id = ${connection.escape(interaction_id)}`;
        return connection.queryAsync(sql);
    },

    save: function (connection, data, note_id) {
        let sql = ``;

        if(note_id){
            sql = "UPDATE notes set ? where id = " + connection.escape(note_id);
          } else {
            sql = "insert into notes set ? ";
          }
        return connection.queryAsync(sql, data).then(r => note_id ? note_id : r.insertId);
    },

    findById: function(connection, note_id) {
        let sql = `SELECT * from notes where id = ${connection.escape(note_id)}`
        return connection.queryAsync(sql).then(r => r.length? r[0]: null);
    },

    findNotesByContactId: function (connection, contact_id, searchParams) {
        let sql = `SELECT n.id, n.content, n.interaction_id, n.created, n.last_modified, n.last_modified_by, n.contact_id, n.pinned, n.context, n.notes_category_id , nc.notes_category  from notes as n left join notes_categories nc on n.notes_category_id = nc.id where contact_id = ${connection.escape(contact_id)}`;
        if(searchParams?.filter){
            sql+=" and nc.id = "+ searchParams.filter
        }

        sql += ` order by pinned DESC, created DESC`;
        
        if (searchParams && searchParams.limit && searchParams.offset) {
            sql += ` limit ${searchParams.offset}, ${searchParams.limit}`;
        }

        return connection.queryAsync(sql);
    },

    async updateNotesContactId(connection, payload) {

        let sql = `
            UPDATE notes n
            INNER JOIN interactions i
                ON n.interaction_id = i.id 
            SET n.contact_id = ${connection.escape(payload.new_contact_id)}
            WHERE i.contact_id = ${connection.escape(payload.new_contact_id)}
                AND i.lease_id = ${connection.escape(payload.lease_id)}
        ;`

        console.log('updateNotesContactId SQL:',sql);
        return await connection.queryAsync(sql);
    }
}
