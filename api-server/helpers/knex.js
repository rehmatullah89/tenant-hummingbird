
/**
 * We can use knex as a querybuilder with out using any connection
 */

const knex = require('knex')({ client: 'mysql' });

module.exports = knex;