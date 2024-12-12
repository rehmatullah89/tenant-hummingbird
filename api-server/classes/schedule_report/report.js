var models  = require("../../models");
var e  = require('../../modules/error_handler.js');
const Report = require("../../classes/report");
const Property = require("../../classes/property");

class ScheduleReport {
    constructor(data) {
        this.company_id = data.company_id;
        this.share_report_id = data.share_report_id || 0;                
    }
    
    async getScheduleReports(connection) {
        if(!this.company_id) e.th(500, "Comapny id is required");
        try {                        
            let collections = await models.Report.getAllCollections(connection, this.company_id , null);
            let masterData = await models.ScheduleReport.getMasterDataByComapnyId(connection, this.company_id);            
            let result = masterData.map(async (mr)=> {                                 
                let properties = [];
                let props = JSON.parse(mr.properties);

                if(props && props.length) {
                  // removing "undefined" or "null" entries from props array.
                  props = props.filter(el => el != undefined || el != null);
                  let property = new Property({ ids: props });                
                  properties = await property.getPropertyList(connection);                  
                }

                let co_workers = JSON.parse(mr.co_workers) && (JSON.parse(mr.co_workers)).length > 0 && await models.ScheduleReport.getCoWorkerDetails(connection, JSON.parse(mr.co_workers));
                var obj = {
                    id: mr.id,
                    company_id: mr.company_id,
                    share_report_title: mr.share_report_title,                    
                    properties: properties,
                    send_to: co_workers || [],
                    emails_recipients: JSON.parse(mr.email_recipients),
                    sms_recipients: JSON.parse(mr.sms_recipients),
                    created_date: mr.created_at,
                    timezone: mr.timezone,
                    frequency: mr.frequency
                }                
                let detailData = await models.ScheduleReport.getDetailDataByScheduleReportId(connection, mr.id);

                let reports = [];
                reports = detailData.map((dd)=> {
                    let collection_id = dd.r_collection_id ;
                    let collection_name = '';
                    if(collection_id){

                        let collection = collections.find(c=>
                            collection_id == c.id
                        )
                        collection_name = collection.name
                        
                    }
                    else if ((!collection_id) && dd.r_type == 'application' )
                    {
                        collection_name = 'Application Reports'
                        let collection = collections.find(c=>
                            collection_name == c.name
                        )
                        collection_id = collection.id;
                        
                        
                    }
                    else{
                        collection_name ='Custom Reports'
                        let collection = collections.find(c=>
                            collection_name == c.name
                        )
                        collection_id = collection.id;

                    }
                    return {
                      name: dd.report_title,
                      collection_id: dd.collection_id,
                      report_id: dd.report_id,
                      report_type: dd.report_type,
                      type: dd.type === null ? undefined: dd.type,
                      format: dd.format,
                      property_id: dd.property_id === null ? undefined: dd.property_id,
                      filters: dd.filters !== null ? JSON.parse(dd.filters): undefined,          
                      report_period: JSON.parse(dd.for_day),          
                      static_dynamic: dd.static_dynamic,
                      unit_group_profile_id: dd.unit_group_profile_id === null ? undefined : dd.unit_group_profile_id,
                      file_type: dd.file_type,
                      profile: dd.profile,
                      original_report:{
                          
                        "id": dd.report_id ,
                        "contact_id":dd.contact_id,
                        "company_id":dd.company_id,
                        "name": dd.report_title,
                        "description": dd.description,
                        "sort": dd.sort,
                        "filters": dd.r_filters,
                        "path": dd.path,
                        "template": dd.template,
                        "template_type": dd.template_type,
                        "is_default": dd.is_default,
                        "type": dd.r_type,
                        "report_category": dd.report_category,
                        "download_xls": dd.download_xls,
                        "download_pdf": dd.download_pdf,
                        "multiple_properties": dd.multiple_properties,
                        "end_date": dd.end_date,
                        "collection_id":collection_id,
                        "collection_name":collection_name,
                        "is_banker": dd.is_banker,
                        "is_investor": dd.is_investor,
                        "is_custom": collection_name == 'Custom Reports' ? 1 : 0
                    }

                    }        
                })     
                obj.reports = reports;
                return obj;
            });
            return await Promise.all(result); 
        } catch(err) {
            e.th(500, err.message);
        }
    }
        
    async addScheduleReport(connection, body) {
        if(!this.company_id) e.th(500, "Comapny id is required");
        try {
            let co_workers = body.send_to && body.send_to.length > 0 && body.send_to.map((cw)=> cw.contact_id);
            let schedule_rpt_master_data = {
                share_report_title: body.share_report_title,
                frequency: body.frequency,
                properties: JSON.stringify(body.properties),
                co_workers: JSON.stringify(co_workers),
                email_recipients: JSON.stringify(body.emails_recipients),
                sms_recipients: JSON.stringify(body.sms_recipients),
                created_by: body.created_by,
                timezone: body.timeZone,
                company_id: this.company_id,
                includes_banker: body.schedule_type == 'banker_box' ? 1 : 0,
                includes_investor: body.schedule_type == 'investor_reports' ? 1 : 0
            };           
                          
            let masterData = await models.ScheduleReport.addMasterData(connection, schedule_rpt_master_data);
            let data = [];
            for(let i = 0; i < body.reports.length; i++) {
                let shedule_rpt_detail_data = [
                   masterData.insertId, 
                   body.reports[i].collection_id,
                   body.reports[i].report_id,
                   body.reports[i].name, 
                   body.reports[i].report_type=== undefined? null : body.reports[i].report_type, 
                   body.reports[i].type, 
                   body.reports[i].format,	
                   body.reports[i].property_id=== undefined? null : body.reports[i].property_id, 
                   body.reports[i].filters=== undefined? null : JSON.stringify(body.reports[i].filters),                
                   JSON.stringify(body.reports[i].report_period),                 
                   body.reports[i].static_dynamic || "dynamic",
                   body.reports[i].unit_group_profile_id,
                   body.reports[i].file_type,
                   body.reports[i].profile
                ];
                data.push(shedule_rpt_detail_data);                
            }

            await models.ScheduleReport.addDetailData(connection, data);

          } catch(err) {            
            e.th(500, err.message);
        }
    }

    async deleteScheduleReport(connection) {   
        if(!(this.company_id && this.share_report_id)) e.th(500, "Comapny and/or share report id is required");
                
        var dataFound = await models.ScheduleReport.getMasterData(connection, this.share_report_id);
        if(dataFound && dataFound.length > 0) {           
           await models.ScheduleReport.deleteDetailData(connection, this.share_report_id);           
           await models.ScheduleReport.deleteMasterData(connection, this.share_report_id);
           return {
               success: true,
               message: "Schedule report data has been deleted."
           }
       } else {
           return {
               success: false,
               message: "Schedule report data not found."
           }
       }
   }

   async updateScheduleReport(connection, body) {
        if(!(this.company_id && this.share_report_id)) e.th(500, "Comapny and/or share report id is required");
        let co_workers = body.send_to && body.send_to.length > 0 && body.send_to.map((cw)=> cw.contact_id);
        let schedule_rpt_master_data = {
            share_report_title: body.share_report_title,
            frequency: body.frequency,
            properties: JSON.stringify(body.properties),
            co_workers: JSON.stringify(co_workers),
            email_recipients: JSON.stringify(body.emails_recipients),
            sms_recipients: JSON.stringify(body.sms_recipients),
            last_update_at: Date.now(),
            timeZone: body.timeZone,
            company_id: this.company_id
        };           

      try {        
        await models.ScheduleReport.updateMasterData(connection, schedule_rpt_master_data, this.share_report_id);        
        await models.ScheduleReport.deactivateSheduleReportDetailData(connection, this.share_report_id);
        let data = [];
        for(let i = 0; i < body.reports.length; i++) {        
          let shedule_rpt_update_data = {                     
            format: body.reports[i].format,	                
            filters: body.reports[i].filters=== undefined? null : JSON.stringify(body.reports[i].filters),                
            for_day: JSON.stringify(body.reports[i].report_period),                 
            active: 1          
          }                        
          let detailsDataUpdated = await models.ScheduleReport.updateScheduleReportDetailData(connection, shedule_rpt_update_data, this.share_report_id, body.reports[i].name);

          if(detailsDataUpdated.changedRows === 0 && detailsDataUpdated.affectedRows=== 0) { //No record found, so add the record                                                  
            let shedule_rpt_detail_data = [
              this.schedule_report_id, 
              body.reports[i].collection_id,
              body.reports[i].report_id,
              body.reports[i].name, 
              body.reports[i].report_type=== undefined? null : body.reports[i].report_type, 
              body.reports[i].type, 
              body.reports[i].format,	
              body.reports[i].property_id=== undefined? null : body.reports[i].property_id, 
              body.reports[i].filters=== undefined? null : JSON.stringify(body.reports[i].filters),                
              JSON.stringify(body.reports[i].report_period),                 
              body.reports[i].static_dynamic || "dynamic",
              body.reports[i].unit_group_profile_id,
              body.reports[i].file_type,
              body.reports[i].profile
           ];
           data.push(shedule_rpt_detail_data);
          }          
        }
        data && data.length > 0 && await models.ScheduleReport.addDetailData(connection, data);

      } catch(err) {
        e.th(500, err);
      }
    }
}

module.exports = ScheduleReport;