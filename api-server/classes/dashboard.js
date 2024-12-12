"use strict";

var models  = require(__dirname + '/../models');
var settings    = require(__dirname + '/../config/settings.js');
var validator = require('validator')
var moment      = require('moment');
var validation      = require('../modules/validation.js');
var e  = require(__dirname + '/../modules/error_handler.js');

class Dashboard {

  constructor(data) {

    data = data || {};
    this.id = data.id;
    this.name = data.name;
    this.company_id = data.company_id;
    this.contact_id = data.contact_id;
    this.label =  data.label;
    this.dashboard =  data.name;
    this.dashboard_type_id =  data.dashboard_type_id;
    // this.title =  data.title;
    this.subtitle =  data.subtitle;
    // this.description =  data.description;
    this.kpi =  data.kpi;
    this.type =  data.type;
    this.x =  data.x;
    this.y =  data.y;
    this.w =  data.w;
    this.h =  data.h;
    this.i =  data.i;
    this.datasource = data.datasource;
    this.data = {};
    this.DashboardType = {};
  }

  update(data, contact_id, company_id){
      this.name = data.name;
      this.company_id = company_id;
      this.contact_id = contact_id;
      this.label =  data.label;
      this.dashboard =  data.name;
      this.dashboard_type_id =  data.dashboard_type_id;
      // this.title =  data.title;
      this.subtitle =  data.subtitle;
      // this.description =  data.description;
      this.datasource =  data.datasource;
      this.kpi =  data.kpi;
      this.type =  data.type;
      this.x =  data.x;
      this.y =  data.y;
      this.w =  data.w;
      this.h =  data.h;
      this.i =  data.i;



  }


  async find(connection){
    let dashboard = await models.Dashboard.findById(connection, this.id);

    this.update(dashboard, dashboard.contact_id, dashboard.company_id);
  }


  async getDashboardType(connection){
    let dashboardType =  await models.Dashboard.findTypeById(connection, this.dashboard_type_id);

    this.minW = dashboardType.minW;
    this.minH = dashboardType.minH;
    this.maxW = dashboardType.maxW;
    this.maxH = dashboardType.maxH;
    this.datasource = dashboardType.datasource;
    this.label = dashboardType.label;
    console.log("this.datasource", this.datasource);
    return dashboardType;


  }

  async save(connection){
    let data = {
      name: this.name,
      company_id: this.company_id,
      contact_id: this.contact_id,
      dashboard_type_id: this.dashboard_type_id,
      // label: this.label,
      type: this.type,
      // title: this.title,
      subtitle: this.subtitle,
      // description: this.description,
      kpi: this.kpi,
      i: this.i,
      x: this.x,
      w: this.w,
      y: this.y,
      h: this.h
    };

    let result = await models.Dashboard.save(connection, data, this.id);
    if(!this.id) this.id = result.insertId;

  }

  async makeOfType(connection, dashboard_type_id, contact_id, company_id){
    this.dashboard_type_id = dashboard_type_id;
    let dashboardType = await this.getDashboardType(connection);
    dashboardType.dashboard_type_id = dashboardType.id;
    dashboardType.w = 3;
    dashboardType.h = 2;
    dashboardType.x = 0;
    dashboardType.y = 0;
    dashboardType.i = 0;
    dashboardType.subtitle = dashboardType.description;
    // dashboardType.name = dashboardType.name;
    this.update(dashboardType, contact_id, company_id);

  }


  verifyAccess(contact_id, company_id){
    if(this.contact_id !== contact_id){
      e.th(403, "You do not have access to this dashboard")
    }
    if(this.company_id !== company_id){
      e.th(403, "You do not have access to this dashboard")
    }
  }

  static async getUserDashboards(connection, company_id, contact_id){
    let dashboard_list = await models.Dashboard.find(connection, company_id, contact_id);
    let dashboards = [];
    for(let i = 0 ; i < dashboard_list.length; i++){
      let dashboard = new Dashboard(dashboard_list[i]);
      await dashboard.getDashboardType(connection);
      dashboards.push(dashboard);
      console.log(dashboards);
    }
    return dashboards;
  }

  static async findExistingByUser(connection, contact_id, company_id, dashboard_type_id){
    return await models.Dashboard.findExistingByUser(connection, company_id, contact_id, dashboard_type_id);
  }

  static async getDashboardTypes(connection){
    return await models.Dashboard.findDashboardTypes(connection);
  }

}

module.exports = Dashboard;
