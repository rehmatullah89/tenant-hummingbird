let Contact = require(__dirname + "/../classes/contact");

/**
 * This method will return all details for contacts
 * @param  {Object} connection
 * @param  {Object} api
 * @param  {String} company_id
 * @param  {String} contact_id
 * @param  {Array} properties
 * @returns {Object} contact details
 */
getContactDetails = async function(
  connection,
  api,
  company_id,
  contact_id,
  properties
) {
  let contact = new Contact({
    id: contact_id
  });

  await contact.find(connection);
  await contact.verifyAccess(company_id);
  await contact.getContactDetails(connection, api);
  await contact.getLeases(connection, company_id, properties);
  await contact.getStatus(connection, properties);

  for (let i = 0; i < contact.Leases.length; i++) {
    await contact.Leases[i].getCurrentBalance(connection);
    await contact.Leases[i].getMetrics(connection);
  }

  await contact.getReservations(connection, properties);
  await contact.getOldReservations(connection, properties);
  await contact.getPending(connection, properties);
  await contact.getLeads(connection, properties);

  contact.Lead = contact.Leads.length ? contact.Leads[0] : {};

  if (
    Object.keys(contact.Business).length === 0 &&
    contact.Business.constructor === Object
  )
    contact.Business.Address = {};
  if (
    Object.keys(contact.Military).length === 0 &&
    contact.Military.constructor === Object
  )
    contact.Military.Address = {};
    
  return contact;
};

module.exports = getContactDetails;
