
var moment      = require('moment');
var jade = require('jade');

var settings = require(__dirname + '/../config/settings.js');
var Hashes = require(__dirname + '/../modules/hashes.js').init();

var models      = require(__dirname + '/../models');
var Lease      = require(__dirname + '/../classes/lease.js');
var Activity      = require(__dirname + '/../classes/activity.js');
var Invoice      = require(__dirname + '/../classes/invoice.js');

var db = require(__dirname + '/../modules/db_handler.js');


var Promise = require('bluebird');

// This file / functions are not used
var Invoices = {
    connection: {},
    company_id: 0,
    maxInvoiceNumber: 0,
    lateDay: 0,
    company: {},
    processedPropertyBills: [],
    masterInvoiceList: [],
    masterInvoiceHtml: '',
    chargesList: [],
    data: {},

    createInvoice: function(data, pool){
        var connection = {};
        var company_id = data.company_id;
        var company=  {};
        var lease_id;
        var lease = {};

        return db.getConnectionByType('write', data.company_id).then(function(conn) {
            connection = conn;
            return connection.beginTransactionAsync();
        }).then(function() {

            return models.Company.findById(connection, company_id);
        }).then(function(companyRes) {
            company = companyRes;
            lease_id = data.lease_id;
            lease = new Lease({
                id: lease_id
            });
            return lease.find(connection);
        }).then(function(saveRes){
            return lease.getCurrentCharges(connection, company_id)
        }).then(function(chargesRes){
            if(!chargesRes) throw new Error(lease.msg);
            return lease.saveInvoice(connection, company_id)
        }).then(function(leaseRes){
            if(!leaseRes) throw new Error(lease.msg);
            return connection.commitAsync();

        }).then(function(leaseRes){

            var activity = new Activity({
                company_id: company_id,
                lease_id: lease_id,
                activity_types_id: 6,
                status: 1,
                read: 0,
                details: JSON.stringify({
                    invoice_id: lease.Invoice.id
                })
            });

            return activity.save(connection);

        }).then(function(leaseRes){

            connection.release();
            return {
                status: true,
                data: {
                    invoice_id: lease.Invoice.id,
                    company_id: company_id
                }
            };

        }).catch(function(err){
            console.log(err);
            console.log(err.stack);
            return connection.rollbackAsync().then(function(){
                var activity = new Activity({
                    company_id: company_id,
                    lease_id: lease_id,
                    activity_types_id: 6,
                    status: 0,
                    read: 0,
                    details: JSON.stringify({
                        label: "The following error occurred while trying to auto-create an invoice",
                        error: err.toString(),
                        stack: err.stack
                    })
                });
                return activity.save(connection);
            }).then(function(){
                connection.release();
                return {
                    status: false,
                    msg: err
                };
            });
        })
    },

    getInvoiceHtml:function(data, pool){
        var connection = {};
        var company_id = data.company_id;
        var invoice_id = data.invoice_id;
        var company = {};
        var invoice = {};
        var lease = {};

        return db.getConnectionByType('write', data.company_id).then(function(conn) {
            connection = conn;

            return models.Company.findById(connection, company_id);
        }).then(function(companyRes) {
            company = companyRes;

            invoice = new Invoice({ id: invoice_id });

            return invoice.find(connection).then(function(){
                return invoice.total();
            })

        }).then(function(invoiceRes){

            return models.Payment.findPaymentsByInvoiceId(connection, invoice_id);
        }).then(function(paymentsRes){


            lease = new Lease({ id: invoice.lease_id });

            return lease.find(connection);


        }).then(function(paymentsRes){


            return new Promise(function(resolve, reject) {
                jade.renderFile(__dirname + '/../views/invoice.jade', {
                    invoice: invoice,
                    lease: lease,
                    moment: moment,
                    company: company,
                    settings: settings
                }, function(err, html){
                    if(err) reject(err);
                    return resolve(html);
                });
            });

        }).then(function(html){
            connection.release();
            return {
                status: true,
                data: {
                    lease: lease,
                    company: company,
                    invoiceHtml: html
                }
            };

        }).catch(function(err){

            connection.release();
            console.log(err.stack);
            console.log(err);
            
            return {
                status: false,
                msg: err
            };
        });






    },
    
    createTenantsEmail: function(lease, html, company){
        var _this = this;
        var emails = [];

        lease.Tenants.forEach(function(tenant){
            
            emails.push({
                email:  tenant.Contact.email,
                to:     tenant.Contact.first + ' ' + tenant.Contact.last,
                from: company.name + ' Reports',
                subject: 'Invoice for ' + moment().format('MM/DD/YYYY'),
                template: {
                    name: 'invoice',
                    data: [
                        {
                            name: 'content',
                            content: html
                        }
                    ]
                }
            });
        });


        return emails;


    },
    createSummaryEmail: function(admins, html, company){
        var _this = this;
        var emails = [];

        


        emails.push({
            email: 'jeff@h6design.com',
            to: 'Jeff Ryan',
            subject: 'Master Invoice List for ' + moment().format('MM/DD/YYYY'),
            from: company.name + " Invoices",
            template: {
                name: 'invoice',
                data: [
                    {
                        name: 'content',
                        content: html
                    }
                ]
            }
        });

        if(settings.config.env == 'production'){
            emails.push({
                email: 'rachael@412living.com',
                to: 'Rachael Schwerin',
                from: company.name + ' Reports',
                subject: 'Master Invoice List for ' + moment().format('MM/DD/YYYY'),
                template: {
                    name: 'invoice',
                    data: [
                        {
                            name: 'content',
                            content: html
                        }
                    ]
                }
            });
        }

        return emails;
    },
    assembleInvoice: function(property, unit, propertyBillsRes, charges){
        var _this = this;

        var invoiceLines = [];
        // Rent
        var invoice = {
            Invoice:{
                number: _this.maxInvoiceNumber,
                paid: 0,
                date: moment().format('YYYY-MM-DD'),
                due: moment().add(_this.daysUntilLate,'days').format('YYYY-MM-DD'),
                lease_id: Hashes.decode(unit.Lease.id)[0]
            }
        };

        if(!unit.billedRentThisMonth){
            invoiceLines.push({
                qty: 1,
                amount: unit.Lease.rent,
                date: moment().format('YYYY-MM-DD'),
                product_id: 1,
                product_name: "Rent"
            });
        }

        var invoiceLine = {};


        propertyBillsRes.forEach(function(pb){
            invoiceLine = {
                qty: 1,
                date: moment().format('YYYY-MM-DD'),
                product_id: pb.product_id,
                product_name: pb.product_name
            };
            if(pb.custom){
                try{
                    var custom = JSON.parse(pb.custom);
                    if(custom[unit.id].amount > 0){
                        invoiceLine.amount = custom[unit.id];
                    }
                } catch(err){
                    console.log(err);
                }
            }
            if(!invoiceLine.amount){
                switch(pb.splittype){
                    case 'units':
                        invoiceLine.amount = (parseFloat(pb.amount) /  property.Units.length).toFixed(2);
                        break;
                    case 'leases':
                        invoiceLine.amount = (parseFloat(pb.amount) /  property.lease_count).toFixed(2);
                        break;
                    case 'tenants':
                        invoiceLine.amount = (parseFloat(pb.amount) /  property.sum_tenants).toFixed(2);
                        break;
                    case 'sqft':
                        invoiceLine.amount = (parseFloat(pb.amount) /  property.sum_sqft).toFixed(2);
                        break;
                }
            }

            _this.processedPropertyBills.push(pb.id);

            invoiceLines.push(invoiceLine);

        });


        if(charges.length){
            charges.forEach(function(charge){
                invoiceLines.push({
                    qty: charge.qty,
                    amount: charge.amount,
                    date: charge.date,
                    product_name: charge.product_name,
                    product_id: Hashes.decode(charge.product_id)[0]
                });

                _this.chargesList.push(Hashes.decode(charge.id)[0] );
            });
        }

        invoice.Unit = unit;
        invoice.InvoiceLines = invoiceLines || [];

        _this.masterInvoiceList.push(invoice);
        _this.maxInvoiceNumber++;
        return invoice;

    }

};



module.exports = {
    create: function(data, pool){
        return Invoices.createInvoice(data, pool);
    },
    getInvoiceHtml: function(data, pool){
        return Invoices.getInvoiceHtml(data, pool);
    },
    createTenantsEmail: function(lease, html, company){
        return Invoices.createTenantsEmail(lease, html, company);
    }
};