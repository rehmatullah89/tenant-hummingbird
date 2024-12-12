'use strict';

var pool = require(__dirname + '/../modules/db.js');
var utils    = require(__dirname + '/../modules/utils.js');
var db = require(__dirname + '/../modules/db_handler.js');

const Contact = {

  async updateContactStatus(payload) {
    // console.log('updateContactStatus payload ', payload);
    // var connection = await db.getConnectionByType('write', payload.cid)
    // console.log("updateContactStatus connection", connection);
    // try {
    //   let contact = payload.contact;
    //   // await contact.getStatus(connection);
    //
    // } catch(err) {
    //     console.log('Contact Update error ', err);
    // }
    //
    // await db.closeConnection(connection);
  }
}


module.exports = Contact;
