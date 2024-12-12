"use strict";

var models  = require(__dirname + '/../models');
var settings    = require(__dirname + '/../config/settings.js');
var Promise = require('bluebird');
var validator = require('validator')
var moment      = require('moment');
var validation      = require('../modules/validation.js');
const Property = require('./property.js');
var control    = require(__dirname + '/../modules/site_control.js');
var e  = require(__dirname + '/../modules/error_handler.js');
var Hash = require(__dirname + '/../modules/hashes.js');
var Hashes = Hash.init();
var utils    = require(__dirname + '/../modules/utils.js');

class GL_Export {
    
    constructor(data){
        data = data || {};
        this.id = data.id;
        this.company_id = data.company_id;
        this.property_id = data.property_id;
        this.amount = data.amount;
        this.credit_debit_type = data.credit_debit_type;
        this.created_at = data.created_at || moment().format('YYYY-MM-DD HH:mm:ss');
        this.export_date = data.export_date;
        this.book_id = data.book_id;
        this.company_gl_account_id = data.company_gl_account_id;
    }

    async save(connection){

        let save = {
            company_id: this.company_id,
            property_id: this.property_id,
            amount: this.amount,
            credit_debit_type: this.credit_debit_type,
            created_at: this.created_at,
            export_date: this.export_date,
            book_id: this.book_id,
            company_gl_account_id: this.company_gl_account_id,
            gl_event_company_id: this.gl_event_company_id,
        };

        let result = await models.GL_Export.save(connection, save, this.id);
        return result;
    }

    async bulkSave(connection, export_data, books, uuid, property_id, source){
        try{
            const exportData = [];
            let totalCreditAmount = 0, totalDebitAmount = 0;
            let range = books.length > 1 ? 2 : 1
            let book_id = books.length > 1 ? '1' : books[0];

            let data = {property_id, transaction_id: uuid, book_id, range};
            let trannum = await trannumNumberGenerator.generate(connection.cid, data);
            
            
            export_data.map(d => {
                if(d.credit_debit_type === 'credit') {
                    totalCreditAmount += d.amount;
                } else if(d.credit_debit_type === 'debit') {
                    totalDebitAmount += d.amount;
                }

                exportData.push({
                    ...d,
                    source: source || 'default',
                    trannum: range == 2 && d.book_id == 0 ? trannum - 1 : trannum
                });
            })

            totalCreditAmount = Math.round(totalCreditAmount * 1e2) / 1e2;
            totalDebitAmount = Math.round(totalDebitAmount * 1e2) / 1e2;

            console.log('Credit: ', totalCreditAmount);
            console.log('Debit: ', totalDebitAmount);

            if(totalCreditAmount != totalDebitAmount) {
                e.th(500, 'Credit amount must be equal to debit amount');
            }

            await models.GL_Export.bulkSave(connection, exportData);

            // let bookId = books.length > 1 ? 2 : +books[0];
            // let prop_trannum = await models.GL_Export.getPropertiesTrannum(connection, property_id);
            // let data = {'property_id': property_id, 'trannum': 1, 'transaction_id': uuid, 'book_id': bookId, 'prop_trannum_id': prop_trannum?.id};
            // await models.GL_Export.savePropertiesTrannum(connection, data);
            
        }catch(err){
            utils.sendLogs({
                event_name: ENUMS.LOGGING.ACCOUNTING,
                logs: {
                    payload: export_data,
                    error: err?.stack || err?.msg || err
                }
            });
            console.log("Export Data not saved", err)
        }
    }
    
}

module.exports = GL_Export;

const ENUMS = require('../modules/enums');
var trannumNumberGenerator = require('../modules/trannum_number_generator');
