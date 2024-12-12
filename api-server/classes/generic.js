'use strict';

class Generic {
    static async lockTableRows(connection, payload = {}) {
        await models.Generic.lockTableRows(connection, { ... payload });
    }
}

module.exports = Generic;

const models = require('../models');