var moment                  = require('moment');
var rp                      = require('request-promise');
var pool 		            = require(__dirname + '/../modules/db.js');
var ChargesSummaryRoutines  = require(__dirname + '/../routines/charges_summary_routines.js');
var AccountingRoutines      = require(__dirname + '/../routines/accounting.js');
var Settings                = require(__dirname + '/../config/settings.js');
var utils                   = require(__dirname + '/../modules/utils.js');
var db                      = require(__dirname + '/../modules/db_handler.js');
const queue                 = require(__dirname + '/../modules/queue');
const Enums                 = require(__dirname + '/../modules/enums.js');
var Invoice                 = require(__dirname + '/../classes/invoice.js');
var models                  = require(__dirname + '/../models');

var InvoiceRoutines = {

    async createInvoiceRoutine(data, job) {
        try {
            /* IMPORTANT */
            // Code for Generating Invoice Number is within a transaction. DO NOT create nested transactions
            var connection = await db.getConnectionByType('write', data.cid);

            let property = new Property({ id: data.property.id });
            await property.find(connection);
            await property.getPhones(connection);
            await property.getEmails(connection);
            await property.getEffectiveDate(connection);

            let company = new Company({ id: data.property.company_id });
            await company.find(connection);

            data.company_id = company.id;
            data.property_ids = [property.id];
            data.company = company;
            data.property = property;
            console.log("Data :: ", data)
            console.log("Property :: ", property)

            await ChargesSummaryRoutines.generateInvoices(connection, data, job);
            
        } catch (err) {
            console.log("---ERROR----");
            console.log(err);
            console.log(err.stack);
        }

        await db.closeConnection(connection);


        return data;
	},

    async generateAdvanceInvoicesExports(data) {
        try {
            const { cid, date, property: { id : propertyId } } = data;
            var connection = await db.getConnectionByType('write', cid);

            const property = new Property({ id: propertyId });
            await property.find(connection);

            let advanceInvoices = await property.findAdvanceInvoicesWithoutExports(connection, {
                date
            });

            console.log("Advance invoices: " , advanceInvoices);

            for(let i = 0; i < advanceInvoices.length; i++) {
                let event = {
                    cid,
                    event_id: Enums.ACCOUNTING.EVENTS.GENERATING_INVOICE, 
                    invoice_id: advanceInvoices[i].id, 
                    property_id: propertyId,
                    date: date
                }
                
                await AccountingEvent.generateAccountingExport(connection, event);                
            }

        } catch (err) {
            console.log('Advance invoices events routine error: ', err);
            console.log(err.stack);
        } finally {
            await utils.closeConnection(pool, connection);
            return data;
        }
    },

    async recognizeAdvancePaidInvoicesRoutine(data, job) {
        try {
            const { cid, date, property: { id : propertyId } } = data;

            var connection = await db.getConnectionByType('write', cid);
            const property = new Property({ id: propertyId });
            await property.find(connection);
            let advancePaidInvoices = await property.findAdvancePaidInvoices(connection, date);
            console.log("Advance paid invoices: " , advancePaidInvoices);

            for(let i = 0; i < advancePaidInvoices.length; i++) {
                try {
                    let event = {
                        cid,
                        event_id: Enums.ACCOUNTING.EVENTS.REVENUE_RECOGNITION, 
                        invoice_id: advancePaidInvoices[i].id, 
                        property_id: propertyId,
                        advance_payment: advancePaidInvoices[i].advance_payment,
                        date: date
                    }
    
                    await AccountingEvent.generateAccountingExport(connection, event); 
                } catch (err) {
                    console.log(`Revenue Recognition jb failed for ${advancePaidInvoices[i]?.id}, Error: `, err);
                    console.log(err.stack);
                }

                if(job){
                    await queue.updateProgress(job, { total: advancePaidInvoices.length, done: i + 1 });
                }
            }

        } catch (err) {
            console.log('Advance paid invoices routine error: ', err);
            console.log(err.stack);
        } finally {
            await utils.closeConnection(pool, connection);
            return data;
        }
    },

    async generateInvoiceAllocation(data, job) {
        try {
            let { cid, company_id, property_id, invoice_id } = data;

            var connection = await db.getConnectionByType('write', cid);
            
            if (!company_id || !property_id) {
                e.th(500, 'Missing Company or Property ID')
            }
            
            let invoice_breakdowns = await Invoice.findInvoiceAndBreakdowns(connection, company_id, { property_id, invoice_id });
            for(let i = 0; i  < invoice_breakdowns.length; i++){
                let invoice_breakdown = invoice_breakdowns[i];
    
                try{
                    await connection.beginTransactionAsync();
    
                    await models.Payment.clearPreviousAllocationsExports(connection, invoice_breakdown.invoice_id, invoice_breakdown.breakdown_ids, invoice_breakdown.refund_ids);
    
                    let breakdown_ids = invoice_breakdown.breakdown_ids ? invoice_breakdown.breakdown_ids.split(',') : [];
                    let refund_ids = invoice_breakdown.refund_ids ? invoice_breakdown.refund_ids.split(',') : [];

                    if(breakdown_ids && breakdown_ids.length){
                        for(let i = 0; i  < breakdown_ids.length; i++){
                            let invoice_breakdown_id = breakdown_ids[i];
                            await models.Payment.updateInvoiceLineAllocation(connection, invoice_breakdown_id);
                        }
    
                        await AccountingRoutines.generatePaymentsExports(connection, { cid, property_id, breakdown_ids });
                    }

                    if(invoice_breakdown.invoice_id){
                        await AccountingRoutines.generateRevenueRecognitionExports(connection, { cid, property_id, invoice_id: invoice_breakdown.invoice_id });
                    }

                    if(refund_ids && refund_ids.length){
                        await AccountingRoutines.generateRefundExports(connection, { cid, property_id, refund_ids });
                    }
                        
                    await connection.commitAsync();
    
                } catch(err){
                    console.log(`Allocation generation failed for invoice_id = ${invoice_breakdown.invoice_id}, breakdownIds = ${invoice_breakdown.breakdown_ids}:`, err);
                    await connection.rollbackAsync();
                }

                if(job){
                    await queue.updateProgress(job, { total: invoice_breakdowns.length, done: i + 1 });
                }
            }

        } catch (err) {
            console.log('Generate Invoice Allocation routine error: ', err);
            console.log(err.stack);
        } finally {
            await utils.closeConnection(pool, connection);
            return data;
        }
    },

    transformAndSendLogs(data){
        const { cid, company_id, property_id, failed_to_save, failed_to_email, failed_to_generate  } = data;
        const generated_invoices = data.generated_invoices.filter(obj => obj.invoices && obj.invoices.some(invoice => invoice.InvoiceLines?.length));
        const logThreshold = Settings.getNewRelicLogSize();
        let totalBufferSize = 0;
        let large_size_log = false;

        const transformService = (s) => ({
            id: s.id,
            lease_id: s.lease_id,
            product_id: s.product_id,
            price: s.price,
            start_date: s.start_date,
            recurring: s.recurring,
            prorate: s.prorate,
            prorate_out: s.prorate_out,
            last_billed: s.last_billed,
            Product: {
                id: s.Product.id,
                name: s.Product.name,
                status: s.Product.status,
                taxrate: s.Product.taxrate,
                taxable: s.Product.taxable,
                type: s.Product.type
            }
          });

        const transformLease = (lease) => {
            const { id, unit_id, start_date, bill_day, create_invoice_day, Tenants, Unit, Services, Property, primary_contact_id, enable_payment_cycles, revert_payment_cycle } = lease;
            const transformTenant = (t) => ({
                id: t.id,
                contact_id: t.contact_id,
                lease_id: t.lease_id,
                type: t.type,
                primary: t.primary
              });

              return {
                id,
                unit_id,
                start_date,
                bill_day,
                create_invoice_day,
                Tenants: Tenants.map(transformTenant),
                Unit: {
                  id: Unit.id,
                  property_id: Unit.property_id,
                  address_id: Unit.address_id,
                  category_id: Unit.category_id,
                  type: Unit.type,
                  number: Unit.number
                },
                Services: Services.map(transformService),
                Property: {
                  id: Property.id,
                  company_id: Property.company_id,
                  address_id: Property.address_id,
                  name: Property.name,
                  number: Property.number
                },
                primary_contact_id,
                enable_payment_cycles,
                revert_payment_cycle
              };
            };

            const transformInvoice = (invoice) => {
                const { id, lease_id, property_id, contact_id, number, date, due, type, status, period_start, period_end, total_tax, total_discounts, balance, InvoiceLines, total_due, sub_total, rent_total, utilities_total, error = '' } = invoice;
                
                const transformTaxLine = (t) => ({
                    id: t.id,
                    invoice_line_id: t.invoice_line_id,
                    taxrate: t.taxrate,
                    amount: t.amount,
                    tax_profile_id: t.tax_profile_id
                });
                const transformDiscountLine = (d) => ({
                    id: d.id,
                    invoice_line_id: d.invoice_line_id,
                    discount_id: d.discount_id,
                    amount: d.amount
                });

                const transformInvoiceLine = (l) => ({
                    id: l.id,
                    product_id: l.product_id,
                    cost: l.cost,
                    date: l.date,
                    start_date: l.start_date,
                    end_date: l.end_date,
                    service_id: l.service_id,
                    Service: transformService(l.Service),
                    TaxLines: l.TaxLines.map(transformTaxLine),
                    DiscountLines: l.DiscountLines.map(transformDiscountLine),
                    totalTax: l.totalTax,
                    totalDiscounts: l.totalDiscounts,
                    subtotal: l.subtotal
                });

                return {
                    id, 
                    lease_id, 
                    property_id, 
                    contact_id, 
                    number, 
                    date, 
                    due, 
                    type, 
                    status, 
                    period_start, 
                    period_end, 
                    total_tax, 
                    total_discounts, 
                    balance, 
                    total_due, 
                    sub_total,
                    rent_total, 
                    utilities_total,
                    InvoiceLines: InvoiceLines.map(transformInvoiceLine),
                    failed_reason: error
                }
            };

        const transformGenerated = (invoice) => ({
            info: invoice.info,
            lease: transformLease(invoice.lease),
            invoices: invoice.invoices.map(transformInvoice)
        });

        const transformFailedToGenerate = (failed) => ({
            info: failed.info,
            lease: transformLease(failed.lease),
          });
        
        
        const generatedInvoices = generated_invoices.map(transformGenerated);
        const failedToGenerate = failed_to_generate.map(transformFailedToGenerate);
        const failedToSave = failed_to_save.map(transformInvoice);
        const failedToEmail = failed_to_email.map(transformInvoice);

        const transformedInvoices = [
            ...generatedInvoices.map(transformGenerated),
            ...failedToGenerate.map(transformFailedToGenerate),
            ...failedToSave.map(transformInvoice),
            ...failedToEmail.map(transformInvoice)
          ];

        for (let i = 0; i < transformedInvoices.length; i++) {
            const jsonString = JSON.stringify(transformedInvoices[i]);
            const bufferSize = Buffer.byteLength(jsonString);
            totalBufferSize += bufferSize;
          
            if (totalBufferSize >= logThreshold) {
              large_size_log = true;
              break;
            }
          }

        utils.sendLogs({
            event_name: Enums.LOGGING.GENERATE_INVOICE,
            large_size_log,
            logs: {
                payload: {
                    cid,
                    company_id,
                    property_id,
                    generatedInvoices,
                    failedToGenerate,
                    failedToSave,
                    failedToEmail
                },
            }
        })
    },

    async sendInvoicesEmailsForCompanies(data, job){
        try{
            const { companies, created_date_start, created_date_end, due_date_start, due_date_end } = data;
            for(let i =0; i < companies.length; i++){
                try{
                    var connection = await db.getConnectionByType('write', companies[i].company_id);
                    let company_invoices = await models.Invoice.getUnPaidUnEmailedAutoInvoices(connection, {company_id: companies[i].hb_company_id, created_date_start, created_date_end, due_date_start, due_date_end});
                    if(company_invoices && company_invoices.length){
                        console.log("Found ", company_invoices.length, " amount of invoices for company ", companies[i].name);
                        for (let j = 0; j < company_invoices.length; j++){
                            try{

                                let company = new Company({id: companies[i].hb_company_id, subdomain: companies[i].subdomain, gds_owner_id: companies[i].gds_owner_id, name: companies[i].name});

                                let invoice = new Invoice({id: company_invoices[j].invoice_id});
                                await invoice.find(connection);
                                await invoice.findProperty(connection, companies[i].hb_company_id);
                                await invoice.Lease.findAutoPaymentMethods(connection);
                                await invoice.Lease.Unit.setSpaceMixId(connection);

                                invoice.InvoiceLines.forEach(async il => {
                                    if(il.Service && !il.Service.Product){
                                        il.Service.Product = new Product({ id: il.Service.product_id });
                                        await il.Service.Product.find(connection);
                                    }
                                })

                                await ChargesSummaryRoutines.sendInvoiceToGds(companies[i].company_id, company, invoice, invoice.Lease, invoice.Property);
                            } catch(err) {
                                console.log("Error while sending invoice ", company_invoices[j].invoice_id, " of company ", companies[i].name);
                                console.log("Invoice error => ", err);
                                utils.sendLogs({
                                    event_name: Enums.LOGGING.SEND_EMAIL_INVOICE,
                                    logs: {
                                        payload: {
                                            cid: companies[i].company_id,
                                            hb_company_id: companies[i].hb_company_id,
                                            company_name: companies[i].name,
                                            lease_id: company_invoices[j].lease_id,
                                            invoice_id: company_invoices[j].invoice_id,
                                            contact_id: company_invoices[j].contact_id
                                        },
                                        reason: 'failed_to_email_invoice',
                                        error: err?.stack || err?.message || err
                                    }
                                })
                            }

                            if(job){
                                await queue.updateProgress(job, { total: company_invoices.length, done: j + 1 });
                            }
                        }
                    }else {
                        console.log("No invoices to be emailed for company => ", companies[i].name);
                    }
                }catch(error) {
                    console.log("Error while sending invoices email of company => ", companies[i].name);
                    console.log("Company error => ", error);
                } finally {
                    await utils.closeConnection(pool, connection);
                }
            }
        } catch(err){
            console.log("Error in invoice email job =>", err);
        } finally{
            console.log("Done with emailing all the invoices for all companies...");
        }  
    },
}

module.exports = {
	createInvoiceRoutine: async(data, job) =>{
		return await InvoiceRoutines.createInvoiceRoutine(data, job);
	},
    recognizeAdvancePaidInvoicesRoutine: async (data, job) => {
        return await InvoiceRoutines.recognizeAdvancePaidInvoicesRoutine(data, job);
    },
    generateAdvanceInvoicesExports: async (data) => {
        return await InvoiceRoutines.generateAdvanceInvoicesExports(data);
    },
    generateInvoiceAllocation: async (data, job) => {
        return await InvoiceRoutines.generateInvoiceAllocation(data, job);
    },
    sendInvoicesEmailsForCompanies: async(data, job) =>{
		return await InvoiceRoutines.sendInvoicesEmailsForCompanies(data, job);
	},
};

var Company = require(__dirname + '/../classes/company.js');
var db = require(__dirname + '/../modules/db_handler.js');
const AccountingEvent = require(__dirname + '/../events/accounting.js');
const Property = require(__dirname + '/../classes/property.js');
const Product = require(__dirname + '/../classes/product.js');