"use strict";

var rp = require('request-promise');
var moment = require('moment');
const ENUMS = require('../modules/enums');
const accounting_enums = require('./accounting/utils/enums');

class AccountingExport {
    constructor(data) {
        this.company_id =  data.company_id;
        this.property_id = data.property_id;
        this.property_ids = data.property_ids;
        this.start_date = data.start_date;
        this.end_date = data.end_date;
        this.type = data.type;
        this.format = data.format;
        this.send_to = data.send_to;
        this.generated_by = data.generated_by;
        this.export_range = data.export_range;
        this.timeZone = data.timeZone;
        this.data_range_string = '';
        this.book_id = data.book_id;
    }

    async generateDocument(connection) {

        let dateStr = '';
        let export_range = this.export_range;
        if(['yesterday','date'].indexOf(export_range) > -1) {
            dateStr = moment(this.end_date).format('YYYY-MM-DD');
        } else if (export_range === 'last_seven_days') {
            dateStr = "Last Seven Days";
        } else if (export_range === 'last_calendar_month') {
            dateStr = "Last Month";
        } else if (export_range === 'date_range') {
            dateStr = `${moment(this.start_date).format('MMM DD, YYYY')} - ${moment(this.end_date).format('MMM DD, YYYY')}`;
        }
        

        if(this.format !== 'csv_yardi-financial-journal-ipp' && !this.book_id) {
            e.th(400, "Book id is missing");
        }
        
        let accounting_settings = await this.getCompanySettings(connection);
        let isNewSequence = accounting_settings['yardiExportTransactionNoFormat'] === ENUMS.SETTINGS.ACCOUNTING.yardiExportTransactionNoFormat.options.new_sequence_new_export;
        let export_ref_transaction = accounting_settings['yardiExportRefColumn'] === ENUMS.SETTINGS.ACCOUNTING.yardiExportRefColumn.options.transaction;
        let format_yardi_book_id = accounting_settings['recordCashBookData'] === ENUMS.SETTINGS.ACCOUNTING.recordCashBookData.options.both_books;
        
        let properties = await this.fetchProperties(connection)

        let company = new Company({id: this.company_id});
        await company.find(connection);
        await company.getWebLogURL();
        this.company = company;
        this.data_range_string = dateStr;

        if(this.format === 'pdf') {
            let params = {
                company_id: this.company_id,
                property_ids: this.property_ids,
                start_date: this.start_date,
                end_date: this.end_date,
                book_id: this.book_id
            }
            let report_data = await models.Report.findGeneralLedgerSummary(connection, params);
            
            let transformed_report_data = this.transformExportReport(report_data, properties)

            let url = Settings.get_pdf_generator_app_url() + '/v2/general-ledger';
            
            let _data = {
                company,
                data: transformed_report_data,
                start_date: this.start_date,
                end_date: this.end_date,
                timeZone: this.timeZone
            }

            var options = {
                uri: url,
                json: true,
                method: 'POST',
                body: _data
            };
            try {

                var pdf = await rp(options);
                if(pdf.status) {
                    return {
                        file: pdf,
                        extension: 'pdf',
                        content_type: "application/pdf"
                    }
                }

            } catch(err){
                console.error("PDF Error => ",err);
                return {
                    file: null,
                    status: 500,
                    err
                }
            }
        } else if (['csv_quickbooks','csv_yardi','csv_sageintacct', 'csv_yardifinancialjournal','csv_yardi-financial-journal-ipp'].indexOf(this.format) > -1){
            let report = new Report({
                name: "",
                type: "CSV",
                connection: connection,
                company: company,
                format: this.format.split("_")[1],
                filters: {
                    search:{
                        company_id: this.company_id,
                        property_ids: this.property_ids,
                        start_date: this.start_date,
                        end_date: this.end_date,
                        isSummarized: this.type == 'summarized'? true : false,
                        book_id: this.book_id,
                        isNewSequence,
                        export_ref_transaction,
                        format_yardi_book_id
                    }
                }
            });
            let csv = await report.generate();
            return {
                file: csv,
                extension: 'csv',
                content_type: "text/csv"
            }
        } else if (this.format === 'iif_quickbooks'){
            let report = new Report({
                name: "",
                type: "CSV",
                connection: connection,
                company: company,
                format: this.format.split("_")[0],
                filters: {
                    search:{
                        company_id: this.company_id,
                        property_ids: this.property_ids,
                        start_date: this.start_date,
                        end_date: this.end_date,
                        isSummarized: this.type == 'summarized'? true : false,
                        book_id: this.book_id
                    }
                }
            });
            let iif = await report.generate();
            return {
                file: iif,
                extension: 'iif',
                content_type: "text/csv"
            }
        } else if (this.format === 'iifQuickbooks_class_code'){
            let report = new Report({
                name: "",
                type: "CSV",
                connection: connection,
                company: company,
                format: this.format.split("_")[0],
                filters: {
                    search:{
                        company_id: this.company_id,
                        property_ids: this.property_ids,
                        start_date: this.start_date,
                        end_date: this.end_date,
                        isSummarized: this.type == 'summarized'? true : false,
                        book_id: this.book_id
                    }
                }
            });
            let iif = await report.generate();
            return {
                file: iif,
                extension: 'iif',
                content_type: "text/csv"
            }
        } else if (['csv_charges_detail'].indexOf(this.format) > -1){
            let report = new Report({
                name: "",
                type: "CSV",
                connection: connection,
                company: company,
                format: 'charges_detail',
                filters: {
                    search:{
                        company_id: this.company_id,
                        property_ids: this.property_ids,
                        start_date: this.start_date,
                        end_date: this.end_date,
                        isSummarized: this.type == 'summarized'? true : false,
                        book_id: this.book_id
                    }
                }
            });
            let csv = await report.generate();
            return {
                file: csv,
                extension: 'csv',
                content_type: "text/csv"
            }
        } else if(this.format === 'pdf_accountant_summary') {
            let params = {
                company_id: this.company_id,
                property_ids: this.property_ids,
                start_date: this.start_date,
                end_date: this.end_date,
                book_id: this.book_id
            }
            let report_data = await models.Report.AccountantSummary(connection, params);
            let data = [];
            properties.forEach(p => {
                let property_data = report_data.filter(x=>x.property_id === p.id);
                if(property_data?.length){
                    let books = ['0','1'];
                    let event_categories = Object.values(accounting_enums.EVENT_CATEGORY);
                    let temp = null;
                    let property_section = {
                        property: p,
                        event_sections: []
                    }
                    books.forEach(b=>{
                        event_categories.forEach(c=>{
                            temp = property_data.filter(x=>x.book_id === b && x.event_category === c);
                            if(temp?.length) {
                                property_section.event_sections.push({
                                    book_type: b === '0' ? 'Cash': 'Accural',
                                    event_category: c,
                                    entries: temp
                                })
                            }
                        })
                    })
                    data.push(property_section);
                }
            });

            if(!data.length && properties.length > 0) {
                data.push({
                    property: properties[0],
                    event_sections: []
                })
            }

            let url = Settings.get_pdf_generator_app_url() + '/v2/accountant-summary';
            
            let _data = {
                company,
                data,
                start_date: this.start_date,
                end_date: this.end_date,
                timeZone: this.timeZone
            }

            var options = {
                uri: url,
                json: true,
                method: 'POST',
                body: _data
            };
            try {

                var pdf = await rp(options);
                if(pdf.status) {
                    return {
                        file: pdf,
                        extension: 'pdf',
                        content_type: "application/pdf"
                    }
                }

            } catch(err){
                console.error("PDF Error => ",err);
                return {
                    file: null,
                    status: 500,
                    err
                }
            }
        } else if(['pdf_balance_sheet'].indexOf(this.format) > -1){
            let params = {
                company_id: this.company_id,
                property_ids: this.property_ids,
                end_date: this.end_date,
                book_id: this.book_id
            }
            let report_data = await models.Report.balanceSummary(connection, params);
            let data = [];
            properties.forEach(p => {
                let property_data = report_data.filter(x=>x.property_id === p.id);
                if(property_data?.length){
                    let books = ['0','1'];
                    let temp = null;
                    let property_section = {
                        property: p,
                        event_sections: []
                    }
                    books.forEach(b=>{
                        temp = property_data.filter(x => x.book_id === b);
                        if(temp?.length) {
                            property_section.event_sections.push({
                                book_type: b === '0' ? 'Cash': 'Accrual',
                                entries: temp
                            })
                        }
                    })
                    data.push(property_section);
                }
            });

            if(!data.length && properties.length > 0) {
                data.push({
                    property: properties[0],
                    event_sections: []
                })
            }

            let url = Settings.get_pdf_generator_app_url() + '/v2/balance-summary';
            let _data = {
                company,
                data,
                end_date: this.end_date,
                timeZone: this.timeZone
            }

            var options = {
                uri: url,
                json: true,
                method: 'POST',
                body: _data
            };
            try {

                var pdf = await rp(options);
                if(pdf.status) {
                    return {
                        file: pdf,
                        extension: 'pdf',
                        content_type: "application/pdf"
                    }
                }

            } catch(err){
                console.error("PDF Error => ",err);
                return {
                    file: null,
                    status: 500,
                    err
                }
            }
        }
               
    }

    async fetchProperties(connection){
        let properties = await Property.findInBulk(connection, this.property_ids);
        let props_address_ids = properties.map(prop => prop.address_id);
        let props_addresses = await models.Address.findByIdsInBulk(connection, props_address_ids);
        let props_phones = await models.Property.findPhonesInBulk(connection, this.property_ids);

        properties.forEach(prop => {
            prop.Address = props_addresses.find(p_ad => p_ad.id === prop.address_id);
            
            let phones = props_phones.find(pp => pp.property_id === prop.id);
            phones = phones && phones.id ? [phones] : [];
            prop.Phones = phones.map(phone => {
                phone.phone = phone.phone?.toString();
                phone.type = Utils.capitalizeAll(phone.type);
                return phone;
            })
        });

        return properties;
    }

    transformExportReport(report_data, properties) {
        let transformed_report_data = [];

        properties.forEach(property => {
            let filtered_report =  report_data.filter(rd => rd.property_id === property.id);
            transformed_report_data.push({property, report_data: filtered_report})
        });
        
        return transformed_report_data;
    }

    save(connection) {
        let data = {
            company_id: this.company_id,	  
            property_ids: JSON.stringify(this.property_ids),	
			start_date: this.start_date,  	
			end_date: this.end_date,  		
			type: this.type,		
			format: this.format,		
			send_to: this.send_to,
            export_range: this.export_range,
            generated_by: this.generated_by
        }

        return models.Report.saveAccountingExport(connection, data);
    }

    static updateAccountingExportedDate(connection, data) {
        return models.Report.updateAccountingExportedDate(connection, data);
    }

    async getCompanySettings(connection) {
        const settings = await SettingClass.findSettings(connection, 'accounting', this.company_id);
        const { ACCOUNTING: ACCOUNTING_SETTINGS } = ENUMS.SETTINGS;
        for(let s in ACCOUNTING_SETTINGS) {
          settings[s] = settings[s] || ACCOUNTING_SETTINGS[s].default;
        }
    
        return settings;
    }

}

module.exports = AccountingExport;

var models      = require(__dirname + '/../models');
var Settings = require(__dirname + '/../config/settings.js');
var Property = require(__dirname + '/property.js');
var Company = require(__dirname + '/company.js');
var Report      = require("./report");
const SettingClass = require('./settings');
var Utils = require(__dirname + '/../modules/utils.js');
var e  = require(__dirname + '/../modules/error_handler.js');