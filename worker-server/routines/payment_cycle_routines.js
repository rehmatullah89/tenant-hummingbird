var Company = require(__dirname + '/../classes/company.js');
var Property = require(__dirname + '/../classes/property.js');
var Lease = require('../classes/lease.js');
var Invoice = require('../classes/invoice.js');
var Product = require(__dirname + '/../classes/product.js');
var Discount = require(__dirname + '/../classes/discount.js');
var Service = require(__dirname + '/../classes/service.js');
var Product = require(__dirname + '/../classes/product.js');
var models = require('../models');

var moment = require('moment');
var e = require(__dirname + '/../modules/error_handler.js');
var Utils = require(__dirname + '/../modules/utils.js');
var db = require(__dirname + '/../modules/db_handler.js');
var Enums = require(__dirname +'/../modules/enums.js');
const queue = require('../modules/queue');


var PaymentCycles = {
    async revertPaymentCycle(data, job) {

        try {       
            var connection = await db.getConnectionByType('write', data.cid);
           
             
            let company = new Company({id: data.property.company_id});
            await company.find(connection); 
 

            let property = new Property({id: data.property.id});
            await property.find(connection, company.id)
            await property.getTemplates(connection);

            let date = data.date;
            
            if(!date){
                date = await property.getLocalCurrentDate(connection); 
                console.log("getLocalCurrentDate", date)
            }  
            let payment_cycles = await models.Lease.getPaymentCyclesForReversion(connection, date, property.id, data.lease_id);

            for(let i = 0; i < payment_cycles.length; i++ ){
                try {
                    let payment_cycle = payment_cycles[i];
                    let lease= new Lease({id: payment_cycle.lease_id}); 
                    await lease.find(connection);
                    let invoices_to_void = await models.Invoice.fetchFutureInvoicesByDateAndLeaseId(connection, lease.id, payment_cycle.start_date, 'active');
                    invoices_to_void = await Invoice.getInvoicesObjects(connection, invoices_to_void);

                    await connection.beginTransactionAsync();

                    await lease.removePaymentCycles(connection, date);

                    let total_to_bill = 0, open_payments = [];
                    for(let j = 0; j < invoices_to_void.length; j++){
                        let invoice = invoices_to_void[j];

                        if (!invoice.InvoiceLines.find(il => il.Product.default_type === 'rent' && il.Product.category_type === 'rent')) continue; 
                        
                        if(invoice.due < date){
                            // we need to calculate the discounts
                            total_to_bill += invoice.discounts;
                        } else {
                            if(invoice?.Payments?.length > 0){
                                let applied_payments = Invoice.getAppliedPayments(invoice);
                                open_payments = [...open_payments, ...applied_payments];
                                let ipb_ids = await invoice.unapplyPayments(connection);
                                for (let k = 0; k < ipb_ids.length; k++) {
                                    await models.Payment.updateInvoiceLineAllocation(connection, ipb_ids[k]);
                                }
                            }
                            await invoice.void_invoice(connection);
                        }
                    }
                    
                    
                    // get rent adjustment service
                    // make invoices 
                    let product = new Product({
                        name: "Rent Adjustment" 
                    }) 
                    
                    
                    try {
                        await product.findByName(connection, company.id);
                    } catch(err){
                        
                        e.th(404, `No rent adjustment product was found for company ${company.id}. Cannot process reversion.`)
                    }
                    
                    
                    var s = new Service({
                        lease_id: lease.id,
                        product_id: product.id,
                        price: total_to_bill,
                        qty: 1,
                        start_date: date,
                        end_date: date,
                        recurring: 0,
                        prorate: 0,
                        prorate_out: 0,
                        service_type: 'lease',
                    });
                
                    s.Product = product;
                    
                    
                    let invoice = new Invoice({
                        lease_id: lease.id,
                        user_id: null,
                        date: date,
                        due: date,
                        company_id: company.id,
                        type: "auto",
                        status: 1
                    });
                    
                    invoice.Lease = lease;
                    invoice.Company = company;
                    
                    await invoice.makeFromServices(connection, [s], lease, moment(date, 'YYYY-MM-DD').startOf('day'), moment(date, 'YYYY-MM-DD').startOf('day'), [], data.company_id);
                    await invoice.save(connection);

                    if(open_payments?.length > 0){
                        await Lease.applyUnallocatedBalanceOnLease(connection, company.id, lease.id, open_payments);
                    }

                    await connection.commitAsync();

                } catch(err){
                    console.log(`Error occured while reverting payment cycle`, err);
                    await connection.rollbackAsync();
                    Utils.sendLogs({
                        event_name: Enums.LOGGING.PAYMENT_CYCLE_REVERSION,
                        logs: {
                            payload: {
                                cid: data.cid,
                                company_id: data.property.company_id,
                                ...payment_cycles[i]
                            },
                            error: err?.stack || err?.msg || err
                        }
                    })
                    

                }
                if(job){
                    await queue.updateProgress(job, { total: payment_cycles.length, done: i + 1 });
                }
            }


        } catch(err){
            console.log("err", err)
        }



    }
}



module.exports = {
	...PaymentCycles,
};



  // get payment cycle, 
//   try {

//     if(!lease.payment_cycle){
//         e.th(409, "Lease is is not on a payment cycle", 'info')
//     }


//     await lease.findOpenInvoices(connection);
//     for(let i = 0; i < lease.OpenInvoices.length; i++){
//         console.log("lease.Invoices", lease.OpenInvoices[i]);
//     }


//     console.log("lease", lease);
//     console.log("action", action);
//     console.log("date", date);




// } catch(err){
//     throw err;
//     console.log("err", err)
// }
// if not in a pyament cycle return, 

// get promotion on the current past due invoice

// get all invoices with that promotion applied to it

// void future invoices, calculate amount of discount