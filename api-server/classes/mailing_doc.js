
const MailingDoc = require('../models/mailing_doc');

class MailingDocSrv {
    constructor(data) {

    }

    async getMailingDocs(filter, { connection }) {
        let mailingDocModel = new MailingDoc();
        let _mailingDocs = await mailingDocModel.getMailingDocs(connection, filter);
        return _mailingDocs;
    }

    async getMailingDocById(filter, { connection }) {
        let mailingDocModel = new MailingDoc();
        let _mailingDoc = await mailingDocModel.getById(connection, filter);
        return _mailingDoc;
    }

}

module.exports = new MailingDocSrv();