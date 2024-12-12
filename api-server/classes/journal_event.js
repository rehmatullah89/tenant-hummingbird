"use strict";

var models      = require(__dirname + '/../models');
var moment      = require('moment');
var e  = require(__dirname + '/../modules/error_handler.js');
var Hash = require(__dirname + '/../modules/hashes.js');
var Hashes = Hash.init();
var Excel = require('exceljs');
var utils    = require(__dirname + '/../modules/utils.js');

class JournalEvent {

  constructor(data) {
    data = data || {};
    this.id = data.id;
    this.gl_event_id = data.gl_event_id;
    this.book_id = data.book_id;
    this.company_id = data.company_id;
    this.gl_account_credit_id = data.gl_account_credit_id;
    this.gl_account_debit_id = data.gl_account_debit_id;
    this.accounting_template_id = data.accounting_template_id;
    this.active = data.active;
    this.created_at = data.created_at;
    this.deleted_at = data.deleted_at;
    this.deleted_by = data.deleted_by;
  }

  async find(connection, payload) {
    const { filters } = payload;

    const glEventCompany = await models.AccountingTemplate.findAccountingEvents(connection, { filters });

    if(glEventCompany?.length) {
			this.assembleEvent(glEventCompany[0]);
			return glEventCompany[0];
		}
  }

  async save(connection, payload) {
    const { event } = payload;

		let result = await models.Accounting.saveJournalEvent(connection, event);
		this.id = this.id || result.insertId;
		return this.id;
	}
  
  async create(connection) {
    const event = {
      gl_event_id: this.gl_event_id,
      book_id: this.book_id,
      company_id: this.company_id,
      gl_account_credit_id: this.gl_account_credit_id,
      gl_account_debit_id: this.gl_account_debit_id,
      accounting_template_id: this.accounting_template_id,
      active: this.active
    };

    return await this.save(connection, { event });
  }

  // sb: optimize if possible
  static async findAllEvents(connection, accounting_template_id, payload = {}) {
      const { fetch_accounts } = payload;

      if(!accounting_template_id) e.th(400,'Template id is missing');
      
      let allEvents;
      if(fetch_accounts) {
        allEvents = await models.Accounting.findGlEventDetailsByTemplateId(connection, accounting_template_id);
      } else {
        allEvents = await models.Accounting.findAccountingEvents(connection, { filters: { accounting_template_id }});
      }

      if(allEvents && allEvents.length > 0){
        for(let i=0; i<allEvents.length; i++){
          let overrides = await models.Accounting.findOverridesByEventId(connection,allEvents[i].id);
          allEvents[i].Overrides = overrides && overrides.length > 0? overrides : [];
        };
      }
      return allEvents;  
  }

  async clearJournalEvent(connection, payload) {
    const { admin_contact } = payload;
    await models.Accounting.clearJournalEvent(connection, this.id, admin_contact.id);
  }

  assembleEvent(data){
    this.id = data.id;
    this.gl_event_id = data.gl_event_id;
    this.book_id = data.book_id;
    this.company_id = data.company_id;
    this.gl_account_credit_id = data.gl_account_credit_id || null;
    this.gl_account_debit_id = data.gl_account_debit_id || null;
    this.accounting_template_id = data.accounting_template_id;
    this.active = data.active;
    this.created_at = data.created_at;
    this.deleted_at = data.deleted_at || null;
    this.deleted_by = data.deleted_by || null;
  }

  async updateOverrides(connection,overrides,contact_id,company_id){
      let alr_overrides = await models.Accounting.findOverridesByEventId(connection,this.id);

      if(!alr_overrides.length && !overrides.length) return;

      let to_remove = alr_overrides && alr_overrides.length > 0? alr_overrides.filter(x1 => overrides.every(x2 => x1.id != x2.id)) : [];
      let to_add = alr_overrides && alr_overrides.length > 0? overrides.filter(x1 => alr_overrides.every(x2 => x1.id != x2.id)) : overrides.filter(x1 =>{return !x1.id});
      let to_update = alr_overrides && alr_overrides.length > 0? overrides.filter(o1 => alr_overrides.some(o2 => {return o1.id && o1.id === o2.id})) : overrides.filter(x1 =>{return x1.id});
      
      if(to_remove && to_remove.length > 0){
        let _ids = to_remove.filter(p => p.id).map(p => p.id).join(',');
        await models.Accounting.removeOverride(connection, contact_id, _ids.replace(/,\s*$/, ""))
      }
      if(to_add && to_add.length > 0){
          for(let i = 0; i < to_add.length; i++){
              let o = to_add[i];
              let _data = {
                  company_id: company_id,
                  gl_event_company_id: this.id,
                  product_type: o.product_type,
                  product_id: o.product_id,
                  credit_debit_type: o.credit_debit_type,
                  actual_gl_account_id: o.actual_gl_account_id,
                  override_gl_account_id: o.override_gl_account_id,
                  active: 1,
                  created_by: contact_id
              }
              await models.Accounting.saveOverride(connection,_data)
          }
      }
      if(to_update && to_update.length > 0){
          for(let i = 0; i < to_update.length; i++){
            let o = to_update[i];
            let _data = {};
            if(typeof o.product_type !== 'undefined') _data.product_type = o.product_type || null;
            if(typeof o.product_id !== 'undefined') _data.product_id = o.product_id || null;
            if(typeof o.actual_gl_account_id !== 'undefined') _data.actual_gl_account_id = o.actual_gl_account_id || null;
            if(typeof o.override_gl_account_id !== 'undefined') _data.override_gl_account_id = o.override_gl_account_id || null;
            await models.Accounting.saveOverride(connection,_data,o.id);
          }
      }
      

  }

  async update(connection,data,contact_id,company_id) {

    if(typeof data.gl_account_credit_id !== 'undefined') this.gl_account_credit_id = data.gl_account_credit_id || null;
    if(typeof data.gl_account_debit_id !== 'undefined') this.gl_account_debit_id = data.gl_account_debit_id || null;
    await models.Accounting.saveJournalEvent(connection,this,this.id);
    await this.updateOverrides(connection,data.overrides,contact_id,company_id);
  }

  static async downloadTemplate(connection,payload){
    const { accounting_template_id } = payload;
    if(!accounting_template_id) e.th(400,'Template id is missing');

    let data = {};
    let events = [];

    let allEvents = await models.Accounting.findGlEventDetailsByTemplateId(connection, accounting_template_id);
    let cashEvents = allEvents && allEvents.length > 0? allEvents.filter(e => e.book_id === '0') : [];
    let accrualEvents = allEvents && allEvents.length > 0? allEvents.filter(e => e.book_id === '1') : [];

    if(!cashEvents.length && !accrualEvents.length) e.th("400", 'No event found');

    if(cashEvents && cashEvents.length > 0 && accrualEvents && accrualEvents.length > 0 ){
      let uniqueEvents = allEvents.filter((event,index,all_events_array) => all_events_array.findIndex(e=> (e.gl_event_id === event.gl_event_id)) === index);
      uniqueEvents.forEach(e => {
        let o = Object.assign({});
        let cash_event = cashEvents.find(ev => ev.gl_event_id === e.gl_event_id);
        let accrual_event = accrualEvents.find(ev => ev.gl_event_id === e.gl_event_id);
        o.id = e.id;
        o.name = e.event_name;
        o.cash_credit_gl_code = cash_event?.credit_account_code || '';
        o.cash_credit_description = cash_event?.credit_account_name || '';
        o.cash_debit_gl_code = cash_event?.debit_account_code || '';
        o.cash_debit_description = cash_event?.debit_account_name || '';
        o.accrual_credit_gl_code = accrual_event?.credit_account_code || '';
        o.accrual_credit_description = accrual_event?.credit_account_name || '';
        o.accrual_debit_gl_code = accrual_event?.debit_account_code || '';
        o.accrual_debit_description = accrual_event?.debit_account_name || '';
        events.push(o);
      })

      data = {
        book_type: 'double',
        events: events
      }
    }else{
      allEvents.forEach(e => {
        let o = Object.assign({});
        o.id = e.id;
        o.name = e.event_name;
        o.credit_gl_code = e.credit_account_code;
        o.credit_description = e.credit_account_name;
        o.debit_gl_code = e.debit_account_code;
        o.debit_description = e.debit_account_name;

        events.push(o);
      })
      data = {
        book_type: cashEvents && cashEvents.length > 0? 'cash' : 'accrual',
        events: events
      }
    }
    const buffer_response = await this.generateExcelFile(data);
    return buffer_response;
  }

  static async generateExcelFile(data){
    const config = {
      cell_width: 14.0,
      cell_height: 19.75,
      book_type: data.book_type
  }
  
  var events = data.events;
  var column_key = '';
  var primary_heading = {size: 12, bold: true};
  var secondary_heading = {size: 10, bold: true};
  var normal_text = {size: 10};
  var center_align = { vertical: 'middle', horizontal: 'center' };
  var normal_border = {top: {style:'thin'},left: {style:'thin'},bottom: {style:'thin'},right: {style:'thin'}};
  var wrap_text = { wrapText: true };
  var accrual_debit_fill = {
      type: 'pattern',
      pattern:'solid',
      fgColor: { argb:'FFFFF2CC' }
  };
  var accrual_credit_fill = {
      type: 'pattern',
      pattern:'solid',
      fgColor: { argb:'FFFFE599' }
  };
  var cash_debit_fill = {
      type: 'pattern',
      pattern:'solid',
      fgColor: { argb:'FFCFE2F3' }
  };
  var cash_credit_fill= {
      type: 'pattern',
      pattern:'solid',
      fgColor: { argb:'FF9FC5E8' }
  };
  
  if(config.book_type != 'double'){
      column_key = config.book_type + '_';
  }

  const workbook = new Excel.Workbook();
  const worksheet = workbook.addWorksheet('sheet', {properties:{ defaultColWidth:config.cell_width}});


  // add column headers
  worksheet.columns = config.book_type === 'double'? [
    { header: 'Event', key: 'event_heading', width: 12.7 },
    { header: 'GL code', key: 'accrual_debit_gl_code'},
    { header: 'Description', key: 'accrual_debit_description'},
    { header: 'GL code', key: 'accrual_credit_gl_code'},
    { header: 'GL name', key: 'accrual_credit_description'},
    { header: 'GL code', key: 'cash_debit_gl_code'},
    { header: 'GL name', key: 'cash_debit_description'},
    { header: 'GL code', key: 'cash_credit_gl_code'},
    { header: 'GL name', key: 'cash_credit_description'},
  ]:[
    { header: 'Event', key: column_key + 'event_heading', width: 12.7},
    { header: 'GL code', key: column_key + 'debit_gl_code'},
    { header: 'GL name', key: column_key + 'debit_description'},
    { header: 'GL code', key: column_key + 'credit_gl_code'},
    { header: 'GL name', key: column_key + 'credit_description'},
  ];
  
  var bookHeading = [];
  var debitCreditHeading = [];

  if(config.book_type === 'double'){
    bookHeading[2] = 'Accrual Book';
    bookHeading[6] = 'Cash Book';
    debitCreditHeading[2] = 'DEBIT (+)';
    debitCreditHeading[4] = 'CREDIT (-)';
    debitCreditHeading[6] = 'DEBIT (+)';
    debitCreditHeading[8] = 'CREDIT (-)';
    // insert new row and return as row object
  }else{
    bookHeading[2] = utils.capitalizeFirst(config.book_type) + " Book";
    debitCreditHeading[2] = 'DEBIT (+)';
    debitCreditHeading[4] = 'CREDIT (-)';
  }
  worksheet.insertRow(1, debitCreditHeading);
  worksheet.insertRow(1, bookHeading);
  worksheet.insertRow(1, ['Master Journal Templates']);
  
  worksheet.mergeCells('B2:E2');
  worksheet.mergeCells('B3:C3');
  worksheet.mergeCells('D3:E3');
  worksheet.mergeCells('A2:A4');


  worksheet.getCell('A2').value = 'Event';


  worksheet.getCell('B2').alignment = center_align;
  worksheet.getCell('B3').alignment = center_align;
  worksheet.getCell('D3').alignment = center_align;

  if(config.book_type === 'double'){
    worksheet.mergeCells('A1:I1');

    worksheet.mergeCells('F2:I2');

    worksheet.mergeCells('F3:G3');
    worksheet.mergeCells('H3:I3');

    worksheet.getCell('F2').alignment = center_align;
    worksheet.getCell('F3').alignment = center_align;
    worksheet.getCell('H3').alignment = center_align;

    worksheet.getCell('F2').font = primary_heading;
    worksheet.getCell('F3').font = secondary_heading;
    worksheet.getCell('H3').font = secondary_heading;
    worksheet.getCell('F4').font = secondary_heading;
    worksheet.getCell('G4').font = secondary_heading;
    worksheet.getCell('H4').font = secondary_heading;
    worksheet.getCell('I4').font = secondary_heading;

  }else{
    worksheet.mergeCells('A1:E1');
  }

  if(config.book_type === 'double'){
    for(let i = 0; i < events.length; i++){
        const rowValues = [];
        const e = events[i];
        rowValues[1] = e.name;
        rowValues[2] = e.accrual_debit_gl_code? e.accrual_debit_gl_code : 'N/A';
        rowValues[3] = e.accrual_debit_description? e.accrual_debit_description : 'N/A';
        rowValues[4] = e.accrual_credit_gl_code? e.accrual_credit_gl_code : 'N/A';
        rowValues[5] = e.accrual_credit_description? e.accrual_credit_description : 'N/A';
        rowValues[6] = e.cash_debit_gl_code? e.cash_debit_gl_code : 'N/A';
        rowValues[7] = e.cash_debit_description? e.cash_debit_description : 'N/A';
        rowValues[8] = e.cash_credit_gl_code? e.cash_credit_gl_code : 'N/A';
        rowValues[9] = e.cash_credit_description? e.cash_credit_description : 'N/A';

        let newRow = worksheet.addRow(rowValues);

        newRow._cells.forEach(e => {
            worksheet.getCell(e._value.model.address).alignment = wrap_text;
            worksheet.getCell(e._value.model.address).font = normal_text;
        });

        let event_name_cell = newRow._cells[0]._value.model.address;
        worksheet.getCell(event_name_cell).font = secondary_heading;
        worksheet.getCell(event_name_cell).alignment = wrap_text;
        worksheet.getCell(event_name_cell).border = normal_border;
        this.mergeonNA(newRow,worksheet);
    }
  }else{
    for(let i = 0; i < events.length; i++){
        const rowValues = [];
        const e = events[i];

        rowValues[1] = e.name;
        rowValues[2] = e.debit_gl_code? e.debit_gl_code : 'N/A' ;
        rowValues[3] = e.debit_description? e.debit_description: 'N/A' ;
        rowValues[4] = e.credit_gl_code? e.credit_gl_code : 'N/A' ;
        rowValues[5] = e.credit_description? e.credit_description : 'N/A' ;

        let newRow = worksheet.addRow(rowValues);

        newRow._cells.forEach(e => {
            worksheet.getCell(e._value.model.address).alignment = wrap_text;
            worksheet.getCell(e._value.model.address).font = normal_text;
        });

        let event_name_cell = newRow._cells[0]._value.model.address;
        worksheet.getCell(event_name_cell).font = secondary_heading;
        worksheet.getCell(event_name_cell).alignment = wrap_text;
        worksheet.getCell(event_name_cell).border = normal_border;
        this.mergeonNA(newRow,worksheet);
    }
  }

  let start = 3;
  let end = start + 2 + events.length;

  if(config.book_type === 'double'){
    while(start < end){
        worksheet.getCell('B'+ start).fill = accrual_debit_fill;
        worksheet.getCell('B'+ start).border = normal_border;
        worksheet.getCell('C'+ start).fill = accrual_debit_fill;
        worksheet.getCell('C'+ start).border = normal_border;

        worksheet.getCell('D'+ start).fill = accrual_credit_fill;
        worksheet.getCell('D'+ start).border = normal_border;
        worksheet.getCell('E'+ start).fill = accrual_credit_fill;
        worksheet.getCell('E'+ start).border = normal_border;

        worksheet.getCell('F'+ start).fill = cash_debit_fill;
        worksheet.getCell('F'+ start).border = normal_border;
        worksheet.getCell('G'+ start).fill = cash_debit_fill;
        worksheet.getCell('G'+ start).border = normal_border;

        worksheet.getCell('H'+ start).fill = cash_credit_fill;
        worksheet.getCell('H'+ start).border = normal_border;
        worksheet.getCell('I'+ start).fill = cash_credit_fill;
        worksheet.getCell('I'+ start).border = normal_border;

        start++;
    }
    worksheet.getCell('F2').border = normal_border;
  }
  else if(config.book_type === 'accrual'){
      while(start < end){
        worksheet.getCell('B'+ start).fill = accrual_debit_fill;
        worksheet.getCell('B'+ start).border = normal_border;
        worksheet.getCell('C'+ start).fill = accrual_debit_fill;
        worksheet.getCell('C'+ start).border = normal_border;

        worksheet.getCell('D'+ start).fill = accrual_credit_fill;
        worksheet.getCell('D'+ start).border = normal_border;
        worksheet.getCell('E'+ start).fill = accrual_credit_fill;
        worksheet.getCell('E'+ start).border = normal_border;

        start++;
      }
  }else{
    while(start < end){
        worksheet.getCell('B'+ start).fill = cash_debit_fill;
        worksheet.getCell('B'+ start).border = normal_border;
        worksheet.getCell('C'+ start).fill = cash_debit_fill;
        worksheet.getCell('C'+ start).border = normal_border;

        worksheet.getCell('D'+ start).fill = cash_credit_fill;
        worksheet.getCell('D'+ start).border = normal_border;
        worksheet.getCell('E'+ start).fill = cash_credit_fill;
        worksheet.getCell('E'+ start).border = normal_border;

        start++;
    }
  }

  worksheet.getCell('A2').border = normal_border;
  worksheet.getCell('A1').border = normal_border;

  
  worksheet.getCell('A1').font = primary_heading;
  worksheet.getCell('A2').font = primary_heading;
  worksheet.getCell('B2').font = primary_heading;
  worksheet.getCell('B3').font = secondary_heading;
  worksheet.getCell('D3').font = secondary_heading;
  worksheet.getCell('B4').font = secondary_heading;
  worksheet.getCell('C4').font = secondary_heading;
  worksheet.getCell('D4').font = secondary_heading;
  worksheet.getCell('E4').font = secondary_heading;

  try{
    const buffer = await workbook.xlsx.writeBuffer();
    return buffer;
  }catch(err){
    console.log("err ",err);
  }
  }

  static mergeonNA(row,worksheet){
    for(const e of row._cells){
        let range = '';
        let index = e._value.model.address.slice(1);
        let value = e._value.model.value;
        if(value === 'N/A'){
            let char_code = e._value.model.address.charCodeAt(0);
            let next_char = String.fromCharCode(++char_code);
            range = e._value.model.address + ':' + next_char + index;
            worksheet.mergeCells(range);
        }
    }
}
  
}

module.exports = JournalEvent;
