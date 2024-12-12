var SendReportsRoutine = {

  async sendReportsToRecipients(data) {
    let payload = {};
    try {
      var connection = await db.getConnectionByType('write', data.cid);
      let company_data = await models.Company.findById(connection, data.company_id);

      let files = data.previous.reports_with_docid.map(report => 
        {
          let property = data.previous.property_info.find((property) => 
            {
              if (report.property_id) {
                return property.property_id == report.property_id;
              }
              else if (report.properties && report.properties[0]) {
                return property.property_id == report.properties[0];
              }
            }
          );

          let label = property?.property_id ? property.property_number ? (`${property.property_number} - ${property.property_name}`):`${property.property_name}` : company_data.name;

          return {
            "label": label,
            "id": report.docid,
            "category": report.name,
            ...(report.notify_end && report.notify_end !== report.notify_start &&{ "end_date" : moment(report.notify_end).format() }),
            ...(report.notify_start ? { "start_date": moment(report.notify_start).format() } : {"start_date":moment().format()}),
            ...(property?.facility_id && { "facility_id": property.facility_id }),
            "content_type": (report.format == 'xlsx' ? "text/csv" : "application/pdf")

          }
        }
      )

      await Promise.all(data.send_to.map(async contact => {
        data.emails_recipients.push(contact.email);
        let phones = await models.Contact.findPhones(connection, Hashes.decode(contact.contact_id)[0]);

        if (phones && phones.length) {
          let phone = phones.find(phone => phone.type == 'primary');
          (phone && phone.phone) && data.sms_recipients.push('+' + phone.phone);
        }

      }));

      console.log(data.emails_recipients, 'emails_recipients');
      console.log(data.sms_recipients, 'sms_recipients');

      data.emails_recipients = this.getValidEmails(data.emails_recipients);
      data.sms_recipients = this.getValidPhoneNumbers(data.sms_recipients);

      console.log(data.emails_recipients, 'Valid emails_recipients');
      console.log(data.sms_recipients, 'valid sms_recipients');


      var filenotify_url = `${settings.get_gds_url()}applications/${process.env.SHARE_REPORT_APP_ID}/v1/owners/${company_data.gds_owner_id}/folders/notify/`;
      var filenotify_options = {
        headers: {
          'X-storageapi-key': process.env.GDS_API_KEY, 
          'X-storageapi-date': moment().format('x'),
          "Content-Type": "application/json"
        },
        uri: filenotify_url,
        json: true, 
        method: 'POST',
        body: {
          "files": files,
          "recipients": {
            "email": data.emails_recipients,
            "phone": data.sms_recipients

          }
        }
      };

      console.log(filenotify_url,'filenotify_url');
      console.log(filenotify_options,'filenotify_options');

      var pdfnotify = await rp(filenotify_options);

      console.log(pdfnotify.applicationData, 'response data')
      console.log('notify endpoint successful!')

      utils.sendLogs({
        event_name: ENUMS.LOGGING.SEND_SHARE_REPORT,
        logs: {
          payload: data,
        }
      });

    } catch (err) {
      console.log('Error in sendReportsToRecipients');
      console.log("---ERROR----");
      console.log(err);

      utils.sendLogs({
        event_name: payload.event_name || ENUMS.LOGGING.SHARE_REPORT,
        logs: {
          payload: data,
          error: err?.stack || err?.msg || err
        }
      });

      throw err;

    }
    finally{
      await utils.closeConnection(pool, connection);
    }
  },

  getValidEmails(emails) {
    let
      valid_emails = emails.filter(email => utils.isValidEmail(email)) || [],
      excluded_emails = emails.filter(email => !utils.isValidEmail(email)) || [];

    console.log(excluded_emails, "excluded_emails");

    return valid_emails;
  },

  getValidPhoneNumbers(phones) {
    let
      valid_phones = phones.filter(phone => utils.isValidPhoneNumber(phone)) || [],
      excluded_phones = phones.filter(phone => !utils.isValidPhoneNumber(phone)) || [];

    console.log(excluded_phones, "excluded_phones");

    return valid_phones;
  },
}


module.exports = SendReportsRoutine;

var moment = require('moment');
var Company = require(__dirname + '/../classes/company.js');
var Promise = require('bluebird');
var Mail = require(__dirname + '/../modules/mail.js');
const Socket = require(__dirname + '/../classes/sockets.js');
var rp = require('request-promise');
var utils = require(__dirname + "/../modules/utils.js");
var models = require(__dirname + '/../models/index.js');
var db = require(__dirname + '/../modules/db_handler.js');
var pool = require(__dirname + "/../modules/db.js");
var settings = require(__dirname + '/../config/settings.js');
const ENUMS = require('../modules/enums');
var Hash = require(__dirname + '/../modules/hashes.js');
var Hashes = Hash.init();