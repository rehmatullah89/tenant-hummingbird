'use strict';
var BaseStaticReport = require(__dirname + '/base_static_report.js');
var ReportQueries = require('../report_queries')

let lease_id            = " l.id ";
// let unit_id             = " l.unit_id ";
let property_id         = " CAST(p.id AS CHAR) ";

class LeaseRentChangeReport extends BaseStaticReport{
  constructor(configuration) {
    super(configuration.data, configuration.report_name, configuration.template);
    this.name = configuration.name || "";
    this.company_id = configuration.company_id || "";
    this.connection = configuration.connection;
    this.properties = configuration.properties;

    let tenantRentManagement = new ReportQueries.LeaseRentChanges({id: lease_id, property_id})

    this.sql_fragments = Object.assign({},
      tenantRentManagement.queries
    )

    this.sql_tables = `
      FROM leases l 
      JOIN units u ON u.id = l.unit_id
      JOIN properties p ON p.id = u.property_id
    `
    this.sql_conditions = `
      WHERE
      p.company_id = ${this.company_id} AND 
      l.status = 1 AND 
      ( end_date > CURDATE() or end_date IS NULL )
    `

    this.sort = `
      ORDER BY
        CAST(u.number AS SIGNED),
        u.number
    `
    if(this.properties?.length){
      this.sql_conditions += `AND p.id IN (${this.properties.join(', ')})`;
    }
  }

  async getData() {
    let queries = "SELECT ";

    let keys = Object.keys(this.sql_fragments)
    keys.forEach((key) => {
      this.sql_fragments[key] = `${this.sql_fragments[key]} AS ${key}`
    })
    queries += Object.values(this.sql_fragments).join(", ")
    let query = queries + this.sql_tables + this.sql_conditions + this.sort
    
    let result = await this.connection.queryAsync(query);
    let nullifyFields = ["rentchange_effective_date", "tenant_new_rent"]
    for (let item of result) {
      item["rentchange_tagged"] = 'N'
      nullifyFields.forEach((key) => {
        if (item.hasOwnProperty(key)) {
          item[key] = null;
        }
      })
    }
    this.data = result
  } 

  setWorkSheet() {
    this.worksheets.push({
      name: this.name,
      tables: [
        { 
          data: this.data,
          merge_columns: this.merge_columns,
          styles: {
            "custom_size": true
          }
        }
      ]
    });
  }

  renderStyles(workSheet, styles){
    if (styles['custom_size']) {
      this.setCustomSize(workSheet);
    }
  }

  setCustomSize(workSheet){
    let fields = this.getFields()

    for (let i = 0; i < this.data.length; i++) {
      let d = this.data[i]
      for (let key of Object.keys(fields)) {
        workSheet['!rows'] = workSheet['!rows'] || [];
        workSheet['!cols'] = workSheet['!cols'] || [];
        let columnIndex = Object.keys(fields).indexOf(key)
        let c = fields[key]
        let styleObj = {
          width: c.width || c.super_header.length,
          height: c.height || 15
        }
        
        let customHeight = { hpt: styleObj.height, hpx: styleObj.height / 0.75, hidden: false, customHeight: true };
        workSheet['!rows'][0] = workSheet['!rows'][i + 1] = customHeight
        workSheet['!cols'][columnIndex] = { wch: styleObj.width + 3 };
      }
    }
  }
}
module.exports = LeaseRentChangeReport;




