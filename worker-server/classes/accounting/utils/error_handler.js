var e  = require(__dirname + '/../../modules/error_handler.js');

module.exports = {
  throwAccountingError(code, message) {
    if(code && message) { 
      e.th(code, `Accounting Error: ${message}`);
    }
  }
};
