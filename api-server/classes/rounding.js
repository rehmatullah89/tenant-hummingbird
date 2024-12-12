"use strict";

class Rounding {

  constructor(data) {
    data = data || {};
    this.id = data.id;
    this.object_id = data.object_id;
    this.object_type = data.object_type;
    this.rounding_type = data.rounding_type;
    this.status = data.status;
    this.created_by = data.created_by;
  }

  async save(connection) {
    let save = {
      object_id: this.object_id,
      object_type: this.object_type,
      rounding_type: this.rounding_type,
      status: this.status,
      created_by: this.created_by
    }

    let result = await models.Rounding.save(connection, save, this.id);
    if(!this.id) this.id = result.insertId; 
  }

  async findByObjectId(connection) {
    let result = await models.Rounding.findByObjectId(connection, this.object_id);
    if(!result) return
    this.id = result?.id;
    return result;
  }

  async update(connection) {
    let latest = await this.findByObjectId(connection);
    if(latest && latest.rounding_type === this.rounding_type) return;
    
    if(latest) {
      await models.Rounding.save(connection, {status: 0}, this.id);
      this.id = null;
    }
    this.rounding_type && await this.save(connection);
  }

  async deleteByObjectId(connection) {
    await models.Rounding.deleteByObjectId(connection, this.object_id);
  }

}

module.exports = Rounding;

var models  = require(__dirname + '/../models');
var e  = require(__dirname + '/../modules/error_handler.js');
