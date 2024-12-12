const moment = require('moment');
const Hash = require("../modules/hashes");
const Hashes = Hash.init();
var e  = require('../modules/error_handler.js');
const models = require("../models");
const { getReportTimePeriod } = require("../modules/utils");

class ScheduleReport {
    
    constructor(data) {        
		this.data = [];		
		this.connection = data.connection;
		this.company_id = data.company_id;
		this.cid = data.cid;	        
    }

    scheduleToRun = (frequency, facility_date, executeManually) => {
        try {        
            let shouldRun = false;            
            let today = moment(facility_date).format("YYYY-MM-DD");
            let dayToRun = null;
    
            //All job will run on +1 day for a specific frequency
            switch (frequency.toLowerCase()) {
                case "end of day": 
                    dayToRun = moment().endOf("day").format("YYYY-MM-DD");
                    shouldRun = today === dayToRun;                    
                    break;
                case "end of week": //check if today is last week end date + 1 day?
                    dayToRun = moment().startOf("week").format("YYYY-MM-DD");   //2022-06-12
                    shouldRun = today === dayToRun;
                    break;
                case "end of month": //check if today is 1st day of month?
                    dayToRun = moment().clone().startOf("month").format("YYYY-MM-DD"); //2022-07-01 == 2022-07-01
                    shouldRun = today === dayToRun; 
                    break;
                case "end of quarter": //check if today is Quarter End date + 1 day?
                    dayToRun = moment().clone().startOf("quarter").format("YYYY-MM-DD");
                    shouldRun = today === dayToRun;
                    break;
                case "end of year":
                    dayToRun = moment().clone().startOf("year").format("YYYY-MM-DD");
                    shouldRun = today === dayToRun;
                    break;
                default:                
                    e.th(400, "Frequency not defined");
            }  
            
            shouldRun = shouldRun && moment(facility_date).get("hour") === 1 ? true: false;
            if (executeManually) shouldRun = true;
            console.log("->::Facility Date:", today, "dayToRun:", dayToRun, "shouldRun:", shouldRun, "Facility_hour:", moment(facility_date).get("hour"), "Executed Manually:", executeManually ? executeManually : false);
            return shouldRun;
    
        } catch (err) {
            console.log(err, "->::Error in scheduleToRun");           
            e.th(500, err.message);
        }
    }

    generateScheduleReportPayload = async (executeManually, schedule_report_master_id) => {
        try {
            let reports = [];
            let frequency = ["End of Day", "End of Week", "End of Month", "End of Quarter", "End of Year"];
            for (var i = 0; i < frequency.length; i++) {
                let masterData = await models.ScheduleReport.getMasterData(this.connection, this.company_id, frequency[i], schedule_report_master_id);

                for (let j = 0; j < masterData.length; j++) {

                    let mr = masterData[j];
                    let properties = JSON.parse(mr.properties);
                    let propertyList = properties && properties.map((p) => Hashes.decode(p)[0]).join(",")

                    console.log("->::generateScheduleReportPayload() - Share Report Title:", mr.share_report_title, "PropertyList:", propertyList, "Frequency:", frequency[i]);
                    const data = await models.ScheduleReport.getFacilityDetail(this.connection, propertyList);
                    let facility_datetime = (data?.length > 0 && data[0].facility_date) || null;
                    var obj = {};

                    let shouldRun = this.scheduleToRun(mr.frequency, facility_datetime, executeManually);
                    if (shouldRun) {
                        let emails = mr && mr.email_recipients && JSON.parse(mr.email_recipients);
                        let email_recipients = emails && emails.map((item) => item.email);
                        let phones = mr && JSON.parse(mr.sms_recipients);
                        let sms_recipients = phones && phones.map((item) => item.code + item.phone);
                        let co_workers = JSON.parse(mr.co_workers) && (JSON.parse(mr.co_workers)).length > 0 && await models.ScheduleReport.getCoWorkerDetails(this.connection, JSON.parse(mr.co_workers));

                        co_workers = co_workers && co_workers.length > 0 && co_workers.map((cw) => {
                            return {
                                contact_id: Hashes.encode(cw.contact_id),
                                email: cw.email,
                                first: cw.first,
                                last: cw.last,
                                status: cw.status
                            }
                        });

                        obj = {
                            share_report_title: mr.share_report_title,
                            properties: JSON.parse(mr.properties),
                            send_to: co_workers || [],
                            emails_recipients: email_recipients,
                            sms_recipients: sms_recipients
                            // created_date: mr.created_at,
                            // frequency: mr.frequency
                        }
                        let detailData = await models.ScheduleReport.getDetailData(this.connection, mr.id);

                        let reports = [];
                        reports = detailData.map((dd) => {
                            let reportTimePeriod = JSON.parse(dd.for_day);
                            let label = reportTimePeriod.label;
                            let curr_date = moment(facility_datetime).subtract(1,"day").format("YYYY-MM-DD");
                            let rtp_params = {
                                customStartDate : reportTimePeriod.start_date,
                                customEndDate : reportTimePeriod.end_date,
                                curr_date
                            };

                            let rtp = getReportTimePeriod(label, rtp_params);
                            let filters = null;

                            if (dd.static_dynamic === "dynamic" && dd.profile === 2) {
                                filters = typeof dd.filters === "string" ? JSON.parse(dd.filters) : dd.filters;
                                if (filters?.search && filters?.search?.report_date) {
                                    filters.search.report_date = rtp.end;
                                }
                                if (typeof filters === "string" && dd.format === "web") { //dynamic & pdf
                                    let f = JSON.parse(filters)
                                    f.search.report_date = rtp.end;
                                    //filters = JSON.stringify(f);
                                }
                            } else if (dd.static_dynamic === "dynamic" && dd.profile === 1) {
                                filters = JSON.parse(dd.filters);
                            }
                            return {
                                name: dd.report_title,
                                report_type: dd.report_type === null ? undefined : dd.report_type,
                                type: dd.type,
                                format: dd.format,
                                filters: filters === null ? undefined : filters,
                                timeZone: mr.timezone,
                                current_date: curr_date,
                                multiple_properties: dd.multiple_properties,
                                ...(dd.static_dynamic === "static" && {
                                    label,
                                    date: rtp.start || '',
                                    end_date: rtp.end || ''
                                }),
                                selected_label: reportTimePeriod,
                                unit_group_profile_id: dd.unit_group_profile_id === null ? "" : dd.unit_group_profile_id
                            }
                        })
                        obj.reports = reports;
                    }
                    if(Object.keys(obj).length){
                        this.data.push(obj);
                        reports.push(obj);
                    }
                };
            }
            return reports;

        } catch (err) {
            console.log(err, "->::Error in generateScheduleReportPayload");
            e.th(500, err.message);
        }
    }
}

module.exports = ScheduleReport;