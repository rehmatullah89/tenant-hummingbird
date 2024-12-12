const moment = require('moment');

module.exports = {
  generateFileName(params) {

    let { format, type, start_date, end_date } = params;
    let filename = 'general-ledger';

    if(format){
        let format_split = format.split('_');
        if(['csv_quickbooks','csv_yardi', 'csv_yardifinancialjournal'].indexOf(format) > -1){
            filename += `-${format_split[1]}`;
        } else if(['csv_sageintacct', 'pdf_accountant_summary','csv_charges_detail','csv_charges_journal','pdf_charges_journal', 'pdf_balance_sheet'].indexOf(format) > -1){
            filename = `${format_split[1]}`;
        }
    }

    filename += type && `-${type}`;
    
    if(moment(start_date).isSame(end_date)){
        filename += end_date ? `-${moment(end_date).format('YYYY-MM-DD')}` : '';
    } else {
        filename += start_date ? `-${moment(start_date).format('YYYY-MM-DD')}` : '';
        filename += end_date ? `-${moment(end_date).format('YYYY-MM-DD')}` : '';
    }

    return filename;
  }
};
