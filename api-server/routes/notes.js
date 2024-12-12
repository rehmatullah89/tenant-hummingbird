const express = require("express");
let router = express.Router();

let Hash = require('../modules/hashes');
let Hashes = Hash.init();
let utils = require('../modules/utils');
let Note = require("../classes/note");
let control = require('../modules/site_control');
let { offsetPaginate } = require("../middlewares/pagination");
const user = require("../models/user");

// add 'contacts' to note_contexts when implementing comm notes
let note_contexts = ['interaction', 'contact'];

module.exports = function (app, sockets) {
    // Doc batches per property and filter
    router.post(
        '/',
        [control.hasAccess(["admin"]), Hash.unHash],
        async (req, res, next) => {
            try {

                let { content, context, context_id } = req.body;

                if (!note_contexts.includes(context)) {
                    throw new Error(`invalid context: ${context}`)
                }

                let connection = res.locals.connection;
                let _user = res.locals.contact;

                let note_id = await Note.addNote(
                    { content, context, context_id, user_id: user.id },
                    { connection }
                );

                utils.send_response(res, {
                    status: 200, data: {
                        note_id: Hash.obscure(note_id, req),
                        context, context_id: Hash.obscure(context_id, req)
                    }
                })
            } catch (error) {
                next(error);
            }
        }
    );
    router.get(
        '/notes-catagories',
        [control.hasAccess(["admin"]), Hash.unHash],
        async (req, res, next) => {
            try {
                let connection = res.locals.connection;
                let notes = await Note.getNotesCatagories(connection);
                utils.send_response(res, {
                    status: 200, data: {
                        notes_catagories: Hash.obscure(notes,req)
                    }
                })
            } catch (error) {
                next(error);
            }
        }
    );
    router.get(
        '/',
        [control.hasAccess(["admin"]), Hash.unHash, offsetPaginate],
        async (req, res, next) => {
            try {

                let { context, context_id } = req.query;

                if (!note_contexts.includes(context)) {
                    throw new Error(`invalid context ${context}`);
                }

                let connection = res.locals.connection;
                let notes = await Note.getNotes(
                    { context, context_id },
                    { connection }
                );

                utils.send_response(res, {
                    status: 200, data: {
                        notes: Hash.obscure(notes)
                    }
                })
            } catch (error) {
                next(error);
            }
        }
    );

    router.put('/:note_id', [control.hasAccess(['admin']), Hash.unHash], async (req, res, next) => {
        try {
            let connection = res.locals.connection;
            let params = req.params;
            let body = req.body;

            let note = new Note({id: params.note_id});
            await note.find(connection);
            await note.update(body);
            await note.save(connection);

            utils.send_response(res, {
                status: 200, data: {
                    notes: Hash.obscure(note, req)
                }
            })
        
        } catch (err) {
            next (err)
        }
    });

    return router;
};