'use strict';
var BaseReport = require(__dirname + '/base_report.js');
var Promise = require('bluebird');
var models = require(__dirname + '/../../../models');

class CSV extends BaseReport{
	constructor(connection, company, filters, format) {
		super(connection, company, filters, format);
	}

	generateData(){

        this.setConditions();
		if(this.format === 'yardi'){
            return models.Report.findYardiDetails(this.connection,this.conditions).then(data => {
                this.data = data;
                this.config = yardiConfig;
                return true;
            });
		} else if(this.format === ENUMS.ACCOUNTING.EXPORT_FORMATS.YARDI_FINANCIAL_JOURNAL) {
            return models.Report.findYardiDetails(this.connection,this.conditions).then(data => {
                this.data = data;
                this.config = yardiFinancialJournalConfig;
                return true;
            });
		} else if(this.format === ENUMS.ACCOUNTING.EXPORT_FORMATS.YARDI_FINANCIAL_JOURNAL_IPP) {
            return models.Report.findYardiIPPDetails(this.connection,this.conditions).then(data => {
                this.data = data;
                this.config = yardiFinancialJournalConfig;
                return true;
            });
		}
        else if(this.format === 'quickbooks'){
            return  models.Report.findQuickBookLedgerSummary(this.connection,this.conditions, this.searchParams).then(data=>{
                this.data = data;
                this.config = quickbookConfig;
                return true;
            });
		} else if (this.format === 'iif'){
            return  models.Report.findQuickBookIIFDetails(this.connection,this.conditions, this.searchParams).then(data=>{
                let rows = [];

                if(data && data.length) {

                    rows.push({
                        trans: '!TRNS',
                        trans_id: 'TRNSID',
                        tran_type: 'TRNSTYPE',
                        date: 'DATE',
                        facility_name: 'NAME',
                        account_number: 'ACCNT',
                        amount: 'AMOUNT',
                        account_name: 'MEMO'
                    });
                    rows.push({
                        trans: '!SPL',
                        trans_id: 'SPLID',
                        tran_type: 'TRNSTYPE',
                        date: 'DATE',
                        facility_name: 'NAME',
                        account_number: 'ACCNT',
                        amount: 'AMOUNT',
                        account_name: 'MEMO'
                    });

                    rows.push({
                        trans: '!ENDTRNS',
                    });
    
                    const map = new Map();
                    let dbRows = new Array(...data);
                    dbRows.forEach(r => {
                        if(map.has(r.trannum)){
                            let { value } = map.get(r.trannum);
                            value.push(r);
                            map.set(r.trannum, {value});
                        } else {
                            map.set(r.trannum, {value: [r]});
                        }
                    })
    
                    map.forEach(({value},key) =>{
                        rows.push({
                            trans: 'TRNS',
                            tran_type: value[0].tran_type,
                            trans_id: value[0].trannum,
                            date: value[0].date,
                            facility_name: value[0].facility_name,
                            account_number: 'Store Clearing Account',
                            amount: '0.00',
                            account_name: ''
                        });
                        value.forEach((val,key) => {
                            rows.push({
                                trans: 'SPL',
                                tran_type: val.tran_type,
                                trans_id: val.trannum,
                                date: val.date,
                                facility_name: val.facility_name,
                                account_number: val.account_number,
                                amount: val.amount,
                                account_name: val.account_name
                            });
                        });
    
                        rows.push({
                            trans: 'ENDTRNS',
                        });
                    })
                }

                this.data = [ ...rows ];
                this.config = quickbookiifConfig;
                return true;
            });
		} else if (this.format === 'iifQuickbooks'){
            return  models.Report.findQuickBookIIFDetails(this.connection,this.conditions, this.searchParams).then(data=>{
                let rows = [];

                if(data && data.length) {

                    rows.push({
                        trans: '!TRNS',
                        trans_id: 'TRNSID',
                        tran_type: 'TRNSTYPE',
                        date: 'DATE',
                        facility_name: 'NAME',
                        account_number: 'ACCNT',
                        amount: 'AMOUNT',
                        facility_number: 'CLASS',
                        account_name: 'MEMO'
                    });
                    rows.push({
                        trans: '!SPL',
                        trans_id: 'SPLID',
                        tran_type: 'TRNSTYPE',
                        date: 'DATE',
                        facility_name: 'NAME',
                        account_number: 'ACCNT',
                        amount: 'AMOUNT',
                        facility_number: 'CLASS',
                        account_name: 'MEMO'
                    });

                    rows.push({
                        trans: '!ENDTRNS',
                    });
    
                    const map = new Map();
                    let dbRows = new Array(...data);
                    dbRows.forEach(r => {
                        if(map.has(r.trannum)){
                            let { value } = map.get(r.trannum);
                            value.push(r);
                            map.set(r.trannum, {value});
                        } else {
                            map.set(r.trannum, {value: [r]});
                        }
                    })
    
                    map.forEach(({value},key) =>{
                        rows.push({
                            trans: 'TRNS',
                            tran_type: value[0].tran_type,
                            trans_id: value[0].trannum,
                            date: value[0].date,
                            facility_name: value[0].facility_name,
                            facility_number: value[0].facility_number,
                            account_number: 'Store Clearing Account',
                            amount: '0.00',
                            account_name: ''
                        });
                        value.forEach((val,key) => {
                            rows.push({
                                trans: 'SPL',
                                tran_type: val.tran_type,
                                trans_id: val.trannum,
                                date: val.date,
                                facility_name: val.facility_name,
                                facility_number: val.facility_number,
                                account_number: val.account_number,
                                amount: val.amount,
                                account_name: val.account_name
                            });
                        });
    
                        rows.push({
                            trans: 'ENDTRNS',
                        });
                    })
                }

                this.data = [ ...rows ];
                this.config = quickbookiifClassCodeConfig;
                return true;
            });
        
        } else if(this.format === 'sageintacct'){
            return  models.Report.findSageIntacctDetails(this.connection,this.conditions, this.searchParams).then(data=>{
                this.data = data;
                this.config = sageIntacctConfig;
                return true;
            });
		} else if(this.format === 'charges_detail'){
            return  models.Report.findChargesDetails(this.connection,this.conditions).then(data=>{
                this.data = data;
                this.config = chargesDetailsConfig;
                return true;
            });
		}
	}
    setConditions(){
        this.conditions.company_id = this.filters.search.company_id  || null;
		this.conditions.property_ids = this.filters.search.property_ids || null;
		this.conditions.property_id = this.filters.search.property_id ||  null;
        this.conditions.start_date = this.filters.search.start_date  ||  null;
        this.conditions.end_date = this.filters.search.end_date  ||  null;
        this.conditions.isSummarized = this.filters.search.isSummarized  ||  null;
        this.conditions.book_id = this.filters.search.book_id  ||  null;
        this.conditions.isNewSequence = this.filters.search.isNewSequence  ||  null;
        this.conditions.export_ref_transaction = this.filters.search.export_ref_transaction  ||  null;
        this.conditions.format_yardi_book_id = this.filters.search.format_yardi_book_id  ||  null;
        this.conditions.format = this.format;
	}
}

const ENUMS = require('../../../modules/enums');

var quickbookConfig = require(__dirname + '/../report_layouts/quick_book.js');
var quickbookiifConfig = require(__dirname + '/../report_layouts/quick_book_iif.js');
var quickbookiifClassCodeConfig = require(__dirname + '/../report_layouts/quick_book_iif_class_code.js');
var yardiConfig = require(__dirname + '/../report_layouts/yardi.js');
var yardiFinancialJournalConfig = require(__dirname + '/../report_layouts/yardi_financial_journal.js');
var sageIntacctConfig = require(__dirname + '/../report_layouts/sage_intacct.js');
var chargesDetailsConfig = require(__dirname + '/../report_layouts/charges_detail.js');
module.exports = CSV;
