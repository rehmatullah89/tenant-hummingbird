'use strict';
var moment      = require('moment');
var models      = require(__dirname + '/../../models');

class Occupancy {

  constructor(connection, company, date, properties) {
    this.company =  company;
    this.connection =  connection;
    this.properties = properties;
    this.date = date;


    this.CategoryOptions = [];
    this.ReportSections = [];


  }

  async generate(){

    await this.getCategoryOptions();
    await this.getOccupancyStats();
    return this.ReportSections;
  }

  async getCategoryOptions(){
    this.CategoryOptions = await models.UnitCategory.findCategoriesAtProperties(this.connection, this.company.id, this.properties);
  }

  async getOccupancyStats(){

    for(let i = 0; i < this.CategoryOptions.length; i++){
      let breakdown = await models.Summary.getOccupancyStatsBySize(this.connection, this.CategoryOptions[i].id, this.properties, 'storage' );
      let summary = await models.Summary.getOccupancyStatsForCategory(this.connection, this.CategoryOptions[i].id, this.properties, 'storage' );
      this.ReportSections.push({
        category: this.CategoryOptions[i],
        breakdown: breakdown,
        summary: summary
      })
    }

  }

}

// const sql_fragments = require(__dirname + '/../report_queries/activity.js');
module.exports = Occupancy;
