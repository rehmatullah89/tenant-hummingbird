"use strict";

class InvestorBankerCollection {
    constructor(data) {
        data = data || {};
        this.id = data.id;
        this.collection_id = data.collection_id;
        this.company_id = data.company_id;
        this.report_id = data.report_id;
        this.is_default = data.is_default;
        this.active = data.active;
        this.filter = data.filter;
        this.created_date = data.created_date;
    }
}

class AddonReportCollection {
	constructor(data) {
		data = data || {};
		this.id = data.id;
		this.company_id = data.company_id;
        this.reports = [];
        // this.collection_type = "";  //banker, investor
	}

    async addReports(connection, body) {
        if(!this.id) e.th(500, "Collection id not set");
        if(!this.company_id) e.th(500, "Comapny id not set");
        if(!(body.collection_type && ["banker_box","investor_reports"].includes(body.collection_type))) e.th(500, "collection type is invalid"); 
        
        this.reports = body.reports;

        let data = [];
        let collection_type = body.collection_type; // "banker_box", "investor_reports"

        let existingReports = await this.getSavedReportsAddonsData(connection, collection_type , body.collection_id , this.company_id);
        
        this.reports.forEach((report) => {

           let alreadyAddedItemIndex = existingReports.findIndex((item, index)=> item.report_id == report.report_id);
            if(!(alreadyAddedItemIndex >=0)) {
                data.push([this.id, report.report_id, this.company_id]);
            }            
        });

        data && data.length > 0 && await models.AddonReportCollection.addDetailData(connection, data);        

    }

    async getSavedReportsAddonsData(connection, collection_type , collection_id , company_id) {
        let result = await models.AddonReportCollection.getSavedReportsAddonsData(connection, collection_type , collection_id , company_id);        
        let data = [];
        result.forEach((item) => {
          let investorBankerCollection = new InvestorBankerCollection();
          investorBankerCollection.id = item.id;
          investorBankerCollection.collection_id = item.collection_id;
          investorBankerCollection.report_id = item.report_id;
          investorBankerCollection.company_id = item.company_id;
          investorBankerCollection.is_default = item.is_default;
          investorBankerCollection.active = item.active;
          investorBankerCollection.filter = item.filter;
          investorBankerCollection.created_date = item.created_date;  
          data.push(investorBankerCollection);
        });
        return data;
    }

}

module.exports = AddonReportCollection;

const models  = require('../models');
const e  = require('../modules/error_handler.js');