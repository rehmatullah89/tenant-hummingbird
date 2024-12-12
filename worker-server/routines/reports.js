
var moment      = require('moment');

var jade = require('jade');
var fs = require('fs');
var Hash = require(__dirname + '/../modules/hashes.js');
var Hashes = Hash.init();
var settings = require(__dirname + '/../config/settings.js');

var models  = require(__dirname + '/../models');

var Promise = require('bluebird');

var Lease = require(__dirname + '/../classes/lease.js');
var Invoice = require(__dirname + '/../classes/invoice.js');
var MaintenanceRequest   = require(__dirname + '/../classes/maintenance_request.js');
var Company   = require(__dirname + '/../classes/company.js');

var Mail = require(__dirname + '/../modules/mail.js');

var XLSX        = require('xlsx');

var ReportObj = {

    getReportDetails:function(connection, data){

        var report = {};

        return Promise.resolve().then(() => {

            if(data.one_time) return data.Report;

            return models.Report.findScheduledReportById(connection, data.report_id)

        }).then(function(reportRes) {
            report = reportRes;

            if(data.one_time) {
                report.toSend = report.send_to;
                return report;
            }

            try{
                report.toSend = JSON.parse(report.send_to);
            } catch(err){
                throw err;
            }


            try{
                if(report.data.length){
                    report.data = JSON.parse(report.data);
                }
            }catch(err) {
                console.log(err);
                throw "Poorly formed data. Could not decode"
            }


            report.timePeriod = {
                start:'',
                end: ''
            }
            switch (report.time_period){
                case 'daily':
                    report.timePeriod.end = null;
                    report.timePeriod.start = moment().subtract(1, 'day').format('YYYY-MM-DD');
                    break;
                case 'weekly':
                    report.timePeriod.end = moment().format('YYYY-MM-DD');
                    report.timePeriod.start = moment().subtract(1, 'week').add(1, 'day').format('YYYY-MM-DD');
                    break;
                case 'monthly':
                    report.timePeriod.end = moment().format('YYYY-MM-DD');
                    report.timePeriod.start = moment().subtract(1, 'month').add(1, 'day').format('YYYY-MM-DD');
                    break;
            }

            return report;

        });

    },
    
    maintenance_summary: function(data, pool){
        var connection;
        var company = {};
        var report = {};
        var emailContent = '';
        var timePeriod = {};
        var toSend = [];
        var maintenanceRequests = [];
        var maintenanceRequestCount = 0;

        var opened = {};
        var resolved = {};

        var statusCount = {
            total: {
                opened: 0,
                resolved:0
            },
            Standard:{
                opened: 0,
                resolved:0
            },
            Urgent:{
                opened: 0,
                resolved:0
            },
            Emergency:{
                opened: 0, 
                resolved:0
            }
        };

        return pool.getConnectionAsync().then(function(conn) {
            connection = conn;

            return models.Report.findScheduledReportById(connection, data.report_id);
        }).then(function(reportRes) {
            report = reportRes;

            company = new Company({ id: report.company_id });
            return company.find(connection);

        }).then(function() {

            try{
                toSend = JSON.parse(report.send_to);
            } catch(err){
                throw err;
            }
            return models.Maintenance.findOpenTickets(connection, {offset: 0, limit: 50}, report.company_id)
                .mapSeries(function(maintenance){
                    
                    var maintenanceRequest = new MaintenanceRequest({ id: maintenance.id});
                    return maintenanceRequest.find(connection, company.id).then(() => {
                         return maintenanceRequest.getLease(connection);
                    }).then(() => {
                        return maintenanceRequest;
                    })
                })

        }).then(function(mrRes) {
            maintenanceRequests = mrRes;
            return  models.Maintenance.findOpenTicketCount(connection);
        }).then(function(otRes) {
            maintenanceRequestCount = otRes;

            switch (report.time_period){
                case 'daily':
                    timePeriod.end = null;
                    timePeriod.start = moment().subtract(1, 'day').format('MM/DD/YYYY');
                    break;
                case 'weekly':
                    timePeriod.end = moment().format('MM/DD/YYYY');
                    timePeriod.start = moment().subtract(1, 'week').format('MM/DD/YYYY');
                    break;
                case 'monthly':
                    timePeriod.end = moment().format('MM/DD/YYYY');
                    timePeriod.start = moment().subtract(1, 'month').format('MM/DD/YYYY');
                    break;
            }


            return Promise.join(
                models.Maintenance.findMaintenanceOpenedByPeriod(connection, report.company_id, timePeriod.start, timePeriod.end),
                models.Maintenance.findMaintenanceResolvedByPeriod(connection, report.company_id, timePeriod.start, timePeriod.end)
            );

            
        }).spread(function(openedRes, resolvedRes){
            opened = openedRes;
            resolved = resolvedRes;

            opened.forEach(function(m){
                statusCount.total.opened++;
                statusCount[m.severity].opened++;
            });

            resolved.forEach(function(m){
                statusCount.total.resolved++;
                statusCount[m.severity].resolved++;
            });

            return true;

        }).then(function() {

            return new Promise(function(resolve, reject) {

                jade.renderFile(__dirname + '/../views/maintenance_summary.jade', {
                    maintenance: Hash.obscure(maintenanceRequests),
                    maintenanceCount: maintenanceRequestCount,
                    statusCount: statusCount,
                    moment: moment,
                    company: Hash.obscure(company),
                    timePeriod:timePeriod,
                    settings: settings
                }, function(err, html){
                    if(err) reject(err);
                    return resolve(html);
                });
            }).then(function(html){
                emailContent += html;
                return true;
            });

        }).then(function() {

            var emails = [];

            toSend.forEach(function(email){
                emails.push({
                    email: email,
                    to: company.name + ' Administrator',
                    from: company.name + ' Reports',
                    subject: 'Maintenance Requests Summary',
                    template: {
                        name: 'invoice',
                        data: [
                            {
                                name: 'logo',
                                content: company.getLogoPath()
                            },
                            {
                                name: 'content',
                                content: emailContent
                            }
                        ]
                    }
                }); 
            });
            return emails;
        }).then(function(emails) {
            var promises = [];

            emails.forEach(function (e) {
              promises.push(Mail.sendInvoice(null, e));
            });

            return Promise.all(promises);
        }).then(function() {

            connection.release();
            return emailContent;

        }).catch(function(err){
            connection.release();
            console.log(err);
            console.log(err.stack);
            return false;
        });
    },
    invoice_detail:function(data, pool){
        var connection;
        var company = {};
        var report = {};
        var emailContent = '';
        var timePeriod = {};
        var toSend = [];

        return pool.getConnectionAsync().then(function(conn) {
            connection = conn;

            return Report.findScheduledReportById(connection, data.report_id);
        }).then(function(reportRes) {
            report = reportRes;

            return Company.findById(connection, report.company_id);
        }).then(function(companyRes) {

            company = companyRes;

            toSend = JSON.parse(report.send_to);

            switch (report.time_period){
                case 'daily':
                    timePeriod.end = null;
                    timePeriod.start = moment().subtract(1, 'day').format('MM/DD/YYYY');
                    break;
                case 'weekly':
                    timePeriod.end = moment().format('MM/DD/YYYY');
                    timePeriod.start = moment().subtract(1, 'week').format('MM/DD/YYYY');
                    break;
                case 'monthly':
                    timePeriod.end = moment().format('MM/DD/YYYY');
                    timePeriod.start = moment().subtract(1, 'month').format('MM/DD/YYYY');
                    break;
            }
            return Billing.findInvoicesByPeriod(connection, report.company_id, timePeriod.start, timePeriod.end).map(function(invoiceRes){
            var invoice = new Invoice({ id: invoiceRes.id });
                console.log(invoice);


                return invoice.find(connection).then(function(){
                    invoice.total();
                    return invoice;
                });

            });

        }).then(function(invoices) {
            return new Promise(function(resolve, reject) {
                jade.renderFile(__dirname + '/../views/invoice_detail.jade', {
                    invoices: invoices,
                    moment: moment,
                    company: company,
                    timePeriod:timePeriod,
                    settings: settings
                }, function(err, html){
                    if(err) reject(err);
                    return resolve(html);
                });
            }).then(function(html){
                emailContent += html;
                return true;
            });


        }).then(function() {

            var emails = [];

            toSend.forEach(function(email){
                emails.push({
                    email: email,
                    to: company.name + ' Administrator',
                    from: company.name + ' Reports',
                    subject: 'Master Invoice List for ' + moment().format('MM/DD/YYYY'),
                    template: {
                        name: 'invoice',
                        data: [
                            {
                                name: 'content',
                                content: emailContent
                            }
                        ]
                    }
                });
            });
            return emails;
        }).then(function(emails) {
            var promises = [];

            emails.forEach(function (e) {
                promises.push(Mail.sendInvoice(null,e));
            });

            return Promise.all(promises);
        }).then(function() {

            connection.release();
            return emailContent;

        }).catch(function(err){
            connection.release();
            console.log(err);
            console.log(err.stack);
            return false;
        });
    },
    invoice_summary:function(data, pool){
        var connection;
        var company = {};
        var report = {};
        var emailContent = '';
        var timePeriod = {};
        var toSend = [];

        return pool.getConnectionAsync().then(function(conn) {
            connection = conn;

            return Report.findScheduledReportById(connection, data.report_id);
        }).then(function(reportRes) {
            report = reportRes;

            return Company.findById(connection, report.company_id);
        }).then(function(companyRes) {

            company = companyRes;

            toSend = JSON.parse(report.send_to);

            switch (report.time_period){
                case 'daily':
                    timePeriod.end = null;
                    timePeriod.start = moment().subtract(1, 'day').format('MM/DD/YYYY');
                    break;
                case 'weekly':
                    timePeriod.end = moment().format('MM/DD/YYYY');
                    timePeriod.start = moment().subtract(1, 'week').format('MM/DD/YYYY');
                    break;
                case 'monthly':
                    timePeriod.end = moment().format('MM/DD/YYYY');
                    timePeriod.start = moment().subtract(1, 'month').format('MM/DD/YYYY');
                    break;
            }

            return Billing.findInvoicesByPeriod(connection, report.company_id, timePeriod.start, timePeriod.end);


        }).then(function(invoices) {
            
            return new Promise(function(resolve, reject) {
                jade.renderFile(__dirname + '/../views/invoice_summary.jade', {
                    invoices: invoices,
                    moment: moment,
                    Hashes: Hashes,
                    company: company,
                    timePeriod:timePeriod,
                    settings: settings
                }, function(err, html){
                    if(err) reject(err);
                    return resolve(html);
                });
            }).then(function(html){
                emailContent += html;
                return true;
            });


        }).then(function() {

            var emails = [];

            toSend.forEach(function(email){
                emails.push({
                    email: email,
                    to: company.name + ' Administrator',
                    from: company.name + ' Reports',
                    subject: 'Master Invoice List for ' + moment().format('MM/DD/YYYY'),
                    template: {
                        name: 'invoice',
                        data: [
                            {
                                name: 'content',
                                content: emailContent
                            }
                        ]
                    }
                });
            });
            return emails;
        }).then(function(emails) {
            var promises = [];

            emails.forEach(function (e) {
                promises.push(Mail.sendInvoice(null,e));
            });

            return Promise.all(promises);
        }).then(function() {
            connection.release();
            return emailContent;

        }).catch(function(err){
            connection.release();
            console.log(err);
            console.log(err.stack);
            return false;
        });
    },
    charges_summary : function(data, pool){
        var connection;
        var company = {};
        var report = {};
        var emailContent = '';
        var timePeriod = {};
        var toSend = [];
        var company_id;
        var leases;

        return pool.getConnectionAsync().then(function(conn) {
            connection = conn;

            return Report.findScheduledReportById(connection, data.report_id);

        }).then(function(reportRes) {
            report = reportRes;
            company_id = report.company_id

            return Company.findById(connection, company_id);

        }).then(function(companyRes) {

            company = companyRes;

            toSend = JSON.parse(report.send_to);

            switch (report.time_period){
                case 'daily':
                    timePeriod.end = null;
                    timePeriod.start = moment().subtract(1, 'day').format('MM/DD/YYYY');
                    break;
                case 'weekly':
                    timePeriod.end = moment().format('MM/DD/YYYY');
                    timePeriod.start = moment().subtract(1, 'week').format('MM/DD/YYYY');
                    break;
                case 'monthly':
                    timePeriod.end = moment().format('MM/DD/YYYY');
                    timePeriod.start = moment().subtract(1, 'month').format('MM/DD/YYYY');
                    break;
            }


            return models.Lease.findCurrentByCompanyId(connection, company_id).mapSeries(function(lease){

                lease = new Lease({
                    id: lease.id
                });

                return lease.find(connection).then(function(){
                    return lease.getCurrentCharges(connection).then(function(){
                        return lease.values();
                    })
                })
            })

        }).then(function(leasesRes){
            leases = leasesRes;
            console.log(leases);
            return new Promise(function(resolve, reject) {
                jade.renderFile(__dirname + '/../views/charges_summary.jade', {
                    leases: leases,
                    moment: moment,
                    Hashes: Hashes,
                    company: company,
                    timePeriod:timePeriod,
                    settings: settings
                }, function(err, html){
                    if(err) reject(err);
                    return resolve(html);
                });
            }).then(function(html){
                emailContent += html;
                return true;
            });


        }).then(function() {

            var emails = [];

            toSend.forEach(function(email){
                emails.push({
                    email: email,
                    to: company.name + ' Administrator',
                    from: company.name + ' Reports',
                    subject: 'Summary of Charges for ' + moment().format('MM/DD/YYYY'),
                    template: {
                        name: 'invoice',
                        data: [
                            {
                                name: 'content',
                                content: emailContent
                            }
                        ]
                    }
                });
            });
            return emails;
        }).then(function(emails) {
            var promises = [];

            emails.forEach(function (e) {
                promises.push( Mail.sendInvoice(null,e));
            });

            return Promise.all(promises);
        }).then(function() {
            connection.release();
            return emailContent;

        }).catch(function(err){
            connection.release();
            console.log(err);
            console.log(err.stack);
            return false;
        });

    },
    
    billing_summary: function(data, pool){

        var connection;
        var company = {};
        var report = {};
        var emailContent = '';
        var timePeriod = {};
        var toSend = [];
        var company_id;
        var leases;
        var date = data.date || moment().format('YYYY-MM-DD');
        var products = '';
        var rows = [[ 'Unit', 'Product Name', 'Cost', 'Billing Period Start', 'Billing Period End', "Invoice Date", 'Paid' ]];

        var _this = this;
        return pool.getConnectionAsync().then(function(conn) {
            connection = conn;

            return _this.getReportDetails(connection,data);

        }).then(function(reportRes) {

            report = reportRes;

            products = report.data;

            company = new Company({ id: report.company_id });
            return company.find(connection);

        }).then(function() {

            return models.Report.findBilledProducts(connection, report.timePeriod, products)

        }).then(function(products) {

            return _this.assembleBillingReport(products);

        }).then(function(wb) {

            var filename = "billing_report_" + moment().format('x');

            XLSX.writeFile(wb, settings.config.base_path + 'downloads/' + filename + '.xlsx', {bookSST: false});
            return filename;

        }).then(function(filename) {

            var bitmap = fs.readFileSync(settings.config.base_path + 'downloads/' + filename + '.xlsx');

            // convert binary data to base64 encoded string
            return new Buffer(bitmap).toString('base64');

        }).then(function(filestring) {

            console.log(filestring);
            connection.release();
            return _this.sendReport(filestring, date, company, report.toSend);



        }).catch(function(err){
            connection.release();
            console.log(err);
            console.log(err.stack);
            return false;
        });

    },
    sendReport(filestring, date, company, toSend){

        // Find email address
        toSend.push('jeff@h6design.com');

        var promises = [];

        toSend.forEach(e => {
            var email = {
                email: e,
                owner_id: company.gds_owner_id,
                to: company.name + ' Administrator',
                from: company.name + ' Reports',
                subject: company.name + " Billed Products Report " ,
                template: {
                    name: 'basic-email',
                    data: [
                        {
                            name: 'logo',
                            content: company.getLogoPath()
                        },
                        {
                            name: 'headline',
                            content:  'Billed Products Report'
                        },
                        {
                            name: 'content',
                            content: "Please find attached your billed products report for " +  company.name + " on " + moment(date, 'YYYY-MM-DD').format('MM/DD/YYYY')
                        }]
                },
                attachments:[{
                    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                    name: company.name + "_auto_payments_" + moment(date, 'YYYY-MM-DD').format('MM/DD/YYYY'),
                    content: filestring
                }]
            };
            promises.push(Mail.sendReport(email));
        });

        return Promise.all(promises);

    },
    assembleBillingReport:function(products){

        var wb = {
            SheetNames: ['Payments'],
            Sheets: {}
        };

        var sheets = {
            Payments: {
                row: 1,
                ws: {
                    "A1": { v: 'Address', t: 's' },
                    "B1": { v: 'Product Name', t: 's' },
                    "C1": { v: 'Cost', t: 's' },
                    "D1": { v: 'Billing Period Start', t: 's' },
                    "E1": { v: 'Billing Period End', t: 's' },
                    "F1": { v: 'Invoice Date', t: 's' },
                    "G1": { v: 'Paid', t: 's' }
                }
            }
        };


        return Promise.mapSeries(products, (p, i) => {

            sheets.Payments.ws[XLSX.utils.encode_cell({ c:0, r:i+1   })] = { v: p.address + ' #' + p.number + ', ' + p.city + ' ' + p.state + ' ' + p.zip, t: 's' };
            sheets.Payments.ws[XLSX.utils.encode_cell({ c:1, r:i+1   })] = { v: p.product_name, t: 's' };
            sheets.Payments.ws[XLSX.utils.encode_cell({ c:2, r:i+1   })] = { v: p.cost, t: 's' };
            sheets.Payments.ws[XLSX.utils.encode_cell({ c:3, r:i+1   })] = { v: moment(p.start_date).format('MM/DD/YYYY'), t: 's' };
            sheets.Payments.ws[XLSX.utils.encode_cell({ c:4, r:i+1   })] = { v: moment(p.end_date).format('MM/DD/YYYY'), t: 's' };
            sheets.Payments.ws[XLSX.utils.encode_cell({ c:5, r:i+1   })] = { v: moment(p.date).format('MM/DD/YYYY'),  t: 's' };
            sheets.Payments.ws[XLSX.utils.encode_cell({ c:6, r:i+1   })] = { v: (p.payment_amount > 0)? 'Yes': 'No', t: 's' };



        }).then(function(){
            for (var index in wb.SheetNames) {
                wb.Sheets.Payments = sheets[wb.SheetNames[index]].ws;
                wb.Sheets.Payments['!ref'] = XLSX.utils.encode_range({
                    s: {
                        r: 0,
                        c: 0
                    },
                    e: {
                        r: products.length,
                        c: 7
                    }
                });
            }
            return wb;
        });

    }
};

module.exports = {
    invoice_detail: function(data, pool){

        return ReportObj.invoice_detail(data, pool)
    },
    invoice_summary: function(data, pool){

        return ReportObj.invoice_summary(data, pool)
    },
    charges_summary: function(data, pool){

        return ReportObj.charges_summary(data, pool)
    },
    maintenance_summary: function(data, pool){

        return ReportObj.maintenance_summary(data, pool)
    },
    billing_summary: function(data, pool){
        return ReportObj.billing_summary(data, pool)
    }
};
