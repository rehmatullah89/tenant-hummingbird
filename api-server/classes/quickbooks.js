"use strict";
var models  = require(__dirname + '/../models');
var settings    = require(__dirname + '/../config/settings.js');
var Promise = require('bluebird');

var QB = require('node-quickbooks');
var e  = require(__dirname + '/../modules/error_handler.js');

class QuickBooks {

  constructor(company_id, payment_gateway) {

        this.company_id = company_id;
        this.isConfigured = 0;
        this.msg = '';
        this.company_file = {};
        this.user_settings = {};
        this.qboPromise = {};
        this.qb_id = '';
        this.classDetails = {};

        this.income_accounts = [];
        this.tax_codes = [];
        this.payment_gateway = payment_gateway;

    }

    init(connection){
        return this.findSettings(connection)
            .then(userSettingsRes => {
                if(Object.keys(userSettingsRes).length === 0 && userSettingsRes.constructor === Object) {
                    throw "QuickBooks Not Configured";
                }
                return this.connect(userSettingsRes);
            }).then(company_file => {
                this.company_file = company_file;
                this.isConfigured = true;
                return true;
            }).catch(err => {
                this.msg = err.toString();
                this.isConfigured = false;
                return true;
            });
    }
    makeJob(connection, Scheduler, label, action, id){
        if(!this.company_id) e.th(500, "Company ID missing");
        return this.init(connection)
            .then(() => {
                if(!this.isConfigured) return true;
                return Scheduler.addJobs([{
                    category: 'quickbooks',
                    data: {
                        id: id,
                        action: action,
                        label: label,
                        company_id: this.company_id
                    }
                }], err =>{
                    if(err) console.log("ERROR", err);
                    console.log('wrote to job');
                    return true;
                });
            })
    }

    findSettings(connection){
        var _this = this;
        return models.Setting.findSettings(connection, 'quickbooks', this.company_id)
            .then(function(settingsRes){
                settingsRes.forEach(function(setting){


                    var connectionVals = ['qbOauthTokenSecret', 'qbOauthToken', 'qbRealmId'];

                    if(connectionVals.indexOf(setting.name) >= 0 && !setting.value ){
                        throw "QuickBooks Not Configured";
                    }
                    _this.user_settings[setting.name] = setting.value;
                });
                return _this.user_settings;
            })
            .catch(function(err){
                console.log(err);
                _this.isConfigured = 0;
                throw err;
            })
    }

    connect(userSettings){
        var _this = this;


        var qbo = new QB(settings.quickbooks.consumer_key,
            settings.quickbooks.consumer_secret,
            userSettings['qbOauthToken'],
            userSettings['qbOauthTokenSecret'],
            userSettings['qbRealmId'],
            settings.quickbooks.sandbox, // use the Sandbox
            settings.quickbooks.debug); // turn debugging on
        
        _this.qboPromise = Promise.promisifyAll(qbo);

        return _this.qboPromise.getCompanyInfoAsync(_this.user_settings['qbRealmId']).then(function(companyRes){

            if(!companyRes) throw "Company Not found";
            return companyRes;
        }).catch(function(err){
            console.log(err);
            console.log('QuickBooks Not Configured');
            _this.msg = err.toString();
            throw err;
        });
    }

    setPropertyClass(connection, lease_id){
        var _this = this;
        var property = {};

        return models.Property.findByLeaseId(connection, lease_id).then(function(propertyRes){
            if(!propertyRes) return false;
            property = propertyRes;
            return models.Property.findConnections(connection, property.id, 'quickbooks');
        }).then(function(con){
            if(!con) return false;
            try{
                var connectionDetails = JSON.parse(con.value);
                
                _this.classDetails = connectionDetails.qbClass;
            }catch(err){
                console.log(err); // failed to parse JSON properly
                // bugsnag.notify(err);
                return false;
            }
            
            return true;

        });

    }

    listAccounts(criteria){
        if(!this.isConfigured) e.th(500, "QuickBooks is not configured");
        return this.qboPromise.findAccountsAsync(criteria).then(qbAccountsRes => {
            // only using income now
            this.income_accounts = qbAccountsRes.QueryResponse.Account;
            return true;
        })
    }

    listTaxCodes(){
        if(!this.isConfigured) e.th(500, "QuickBooks is not configured");
        return this.qboPromise.findTaxCodesAsync().then(qbTaxCodesRes => {
            this.tax_codes = qbTaxCodesRes.QueryResponse.TaxCode;
            return true;
        })
    }

    getQbTaxRate(connection, taxCode){
        var _this = this;
        var totalTaxRate = 0;
        return _this.qboPromise.getTaxCodeAsync(taxCode).catch(function(err){
            _this.msg = err.Fault.Error.reduce(function(str, msg) {
                str += msg.Message + ": " + msg.Detail  + "<br />";
                return str;
            }, '');
            throw _this.msg;
        }).then(function(taxCode){

            if(!taxCode.SalesTaxRateList) throw "TaxCode not found";
            var promises = [];

            taxCode.SalesTaxRateList.TaxRateDetail.forEach(function(taxRate){
                promises.push(
                    _this.qboPromise.getTaxRateAsync(taxRate.TaxRateRef.value)
                );
            });

            return Promise.all(promises);
        }).each(function(taxRateRes) {

            
            totalTaxRate += taxRateRes.RateValue;
            return true;
        }).then(function(){
            return totalTaxRate;
        }).catch(function(err){
            _this.msg = err.toString();
            throw _this.msg;
        })
    }

    getQbClassList(){
        var _this = this;

        var classList = [];
        return _this.qboPromise.findClassesAsync().catch(function(err){
            _this.msg = err.Fault.Error.reduce(function(str, msg) {
                str += msg.Message + ": " + msg.Detail  + "<br />";
                return str;
            }, '');
            throw _this.msg;
        }).then(function(classes){


            if(!classes.QueryResponse.Class) throw "Class List not found";
            classes.QueryResponse.Class.forEach(function(classEntry){
                
                if(classEntry.Active){
                    classList.push({
                        id: classEntry.Id,
                        name: classEntry.Name
                    });
                }
            });


            return classList;
        }).catch(function(err){
            _this.msg = err.toString();
            throw _this.msg;
        })
    }

    getQbLocationList(){
        var _this = this;

        var locationList = [];
        return _this.qboPromise.findLocationsAsync().catch(function(err){
            _this.msg = err.Fault.Error.reduce(function(str, msg) {
                str += msg.Message + ": " + msg.Detail  + "<br />";
                return str;
            }, '');
            throw _this.msg;
        }).then(function(locations){


            if(!locations.QueryResponse.Location) throw "TaxCode not found";
            locations.QueryResponse.Location.forEach(function(locationEntry){
                if(locationEntry.Active){
                    locationList.push({
                        id: locationEntry.Id,
                        name: locationEntry.Name
                    });
                }
            });


            return locationList;
        }).catch(function(err){
            _this.msg = err.toString();
            throw _this.msg;
        })
    }

    saveCustomer(connection, customer, type){
        var _this = this;
        var data = {
            Active: true
        };

        if(type == 'lease') {
            data.DisplayName = customer.Unit.Address.address + ' #' + customer.Unit.number + ' ' + customer.Unit.Address.city + ' ' + customer.Unit.Address.state + ' ' + customer.Unit.Address.zip + ' - Lease #' + customer.id;


        } else if(type == 'payment') {
            data.DisplayName = customer.first + " " + customer.last;
        }
        var qbCustomer;
        return Promise.resolve().then(function(){

            if(customer.qb_id){
                return _this.qboPromise.getCustomersAsync( customer.qb_id.toString()).then(function(qbCustomerRes){
                    if(qbCustomerRes.QueryResponse && qbCustomerRes.QueryResponse.Customer.length) {
                        return qbCustomerRes.QueryResponse && qbCustomerRes.QueryResponse.Customer;
                    }
                    return false;
                }).catch(function(err){

                    _this.msg = err.Fault.Error.reduce(function(str, msg) {
                        str += msg.Message + ": " + msg.Detail  + "<br />";
                        return str;
                    }, '');

                    throw _this.msg;
                });
            } else {
                return _this.qboPromise.findCustomersAsync({ DisplayName: data.DisplayName }).then(function(qbCustomerRes){

                    if(qbCustomerRes.QueryResponse.Customer && qbCustomerRes.QueryResponse.Customer.length) {
                        return qbCustomerRes.QueryResponse && qbCustomerRes.QueryResponse.Customer[0];
                    }
                    return false;
                }).catch(function(err){

                    _this.msg = err.Fault.Error.reduce(function(str, msg) {
                        str += msg.Message + ": " + msg.Detail  + "<br />";
                        return str;
                    }, '');

                    throw _this.msg;
                });
            }

            return false;

        }).then(function(customerRes) {

            qbCustomer = customerRes;

            if (qbCustomer) {
                return qbCustomer;
            }

            // No customer found, we should save it.
            return _this.qboPromise.createCustomerAsync(data).catch(function(err){


                _this.msg = err.Fault.Error.reduce(function(str, msg) {
                    str += msg.Message + ": " + msg.Detail  + "<br />";
                    return str;
                }, '');
                throw _this.msg;
            })

        }).then(function (createRes) {
            qbCustomer = createRes;
            customer.qb_id = createRes.Id;

            if (type == 'lease') {
                return models.Lease.save(connection, {qb_id: customer.qb_id}, customer.id)
                    .then(function (saveRes) {

                        return qbCustomer;
                    })

            } else if (type == 'user') {
                return models.User.save(connection, {qb_id: customer.qb_id}, customer.id).then(function () {
                    return qbCustomer;
                })
            } else if (type == 'payment') {
                return models.Payment.savePaymentMethod(connection, {qb_customer_id: customer.qb_id}, customer.id).then(function () {
                    return qbCustomer;
                })
            }

        }).then(function(updateRes){
            return updateRes;
        }).catch(function(err){
            _this.msg = err.toString();
            return false;
        });


    }

    setPaymentDetails(newData, currentData){

        var _this = this;
        currentData = currentData || {};

        try{
            currentData.DepositToAccountRef = {
                value: _this.qbPaymentDepositAccount
            }
            currentData.ARAccountRef = {
                value: _this.qbPaymentARAccount
            }

            currentData.TotalAmt = newData.amount;
            currentData.PaymentRefNum = newData.number;

            currentData.ProcessPayment = false;

            if(newData.qb_id){
                currentData.Id = newData.qb_id;
            }

            if(newData.CustomerRef){
                currentData.CustomerRef = newData.CustomerRef;
            }

            currentData.TxnDate = newData.date;

            var totalApplied = 0;
            currentData.Line = [];
            newData.appliedPayments.forEach(function(line){
                var linked = {};
                
                totalApplied += line.amount;
                linked.Amount = line.amount;
                linked.LinkedTxn = [
                    {
                        TxnId: line.Invoice.qb_id,
                        TxnType: "Invoice"
                    }
                ];

                currentData.Line.push(linked);
            });

            currentData.UnappliedAmt = ( newData.amount - totalApplied).toFixed(2);

        } catch(err){

            throw err;
        }

        return currentData;
    }

    setInvoiceDetails(newData, currentData){
        var _this = this;
        var total_tax = 0;
        var total_amount = 0;
        var taxlines = [];
        var tax_code = 0;

        currentData = currentData || {};

        try {
            currentData.DocNumber = newData.number;
            currentData.TxnDate = newData.date;
            currentData.DueDate = newData.due;
            currentData.TotalAmt = newData.getTotal().toFixed(2);
            currentData.ApplyTaxAfterDiscount = "true";
            // Todo Make this customizable
            currentData.PrintStatus = "PrintComplete";
            currentData.EmailStatus = "EmailSent";

            currentData.Line = [];

            if(newData.qb_id){
                currentData.Id = newData.qb_id;
            }

            if(newData.CustomerRef){
                currentData.CustomerRef = newData.CustomerRef;
            }


            //    currentData.
            var total_tax  = 0;
            var invoiceLineData = {};
            newData.InvoiceLines.forEach(function(inLine, index) {
                total_amount += (inLine.cost * inLine.qty);

                if(inLine.type == 'charge'){
                    if (!inLine.Product.qb_id) throw new Error(inLine.Product.name + " not linked");
                    invoiceLineData = {
                        LineNum: index + 1,
                        Description: inLine.Product.name,
                        Amount: (inLine.cost * inLine.qty).toFixed(2),
                        DetailType: "SalesItemLineDetail",
                        SalesItemLineDetail: {
                            ItemRef: {
                                value: inLine.Product.qb_id,
                                name: inLine.Product.name
                            },
                            UnitPrice: inLine.Product.amount || '',
                            Qty: inLine.Product.qty || 1
                        }
                    };
                    // Settings

                    if(_this.classDetails.id){
                        invoiceLineData.SalesItemLineDetail.ClassRef = {
                            value: _this.classDetails.id,
                            name: _this.classDetails.name
                        }
                    }

                    if (inLine.TaxLines.length) {

                        inLine.TaxLines.forEach(function (txln) {
                            if(txln.qb_tax_code){
                                tax_code = txln.qb_tax_code;
                            }
                            total_tax += txln.amount + 0;
                            if(tax_code){
                                taxlines.push({
                                    Amount: txln.amount,
                                    DetailType: "TaxLineDetail",
                                    TaxLineDetail: {
                                        TaxRateRef: {
                                            value: tax_code || _this.user_settings.qbTaxCode
                                        },
                                        PercentBased: true,
                                        TaxPercent: txln.taxrate,
                                        NetAmountTaxable: (inLine.cost * inLine.qty).toFixed(2)

                                    }
                                });
                            }
                        });
                        if(tax_code) {
                            invoiceLineData.SalesItemLineDetail.TaxCodeRef = {
                                value: tax_code
                            }
                        } else {
                            invoiceLineData.SalesItemLineDetail.TaxCodeRef = {
                                value: "TAX"
                            }
                        }
                    }

                    if (inLine.qb_id) {
                        invoiceLineData.Id = inLine.qb_id;
                    }

                } else if (inLine.type == "discount"){
                    invoiceLineData = {
                        LineNum: index + 1,
                        Description: inLine.Discount.Promotion.name,
                        Amount: (inLine.cost * inLine.qty).toFixed(2),
                        DetailType: "DiscountLineDetail",
                        DiscountLineDetail: {
                            PercentBased:false,
                            TaxCodeRef: {
                                value: tax_code || _this.user_settings.qbTaxCode
                            }
                        }
                    };

                    if(_this.classDetails.id){
                        invoiceLineData.DiscountLineDetail.ClassRef = {
                            value: _this.classDetails.id,
                            name: _this.classDetails.name
                        }
                    }
                }
                currentData.Line.push(invoiceLineData);
            });

            total_amount += total_tax;

            if(total_tax > 0){
                currentData.TxnTaxDetail = {
                    "TxnTaxCodeRef": {
                        "value": tax_code || _this.user_settings.qbTaxCode || "CustomSalesTax"
                    },
                    "TotalTax":  total_tax.toFixed(2),
                    "TaxLine": taxlines
                };
            }

            currentData.TotalAmt = total_amount.toFixed(2);

            return currentData;

        } catch(err){
            _this.msg = err.toString();
            throw _this.msg;
        }

    }

    saveInvoice(connection, invoice, type){
        var _this = this;

        var data;
        var qbInvoice;

        return Promise.resolve().then(function() {

            return _this.setPropertyClass(connection, invoice.lease_id);

        }).then(function() {

            // If invoice exists
            if(invoice.qb_id){
                return _this.qboPromise.findInvoicesAsync({ Id: invoice.qb_id.toString()}).then(function(qbInvoiceRes){
                    if(qbInvoiceRes.QueryResponse && qbInvoiceRes.QueryResponse.Invoice.length) {
                        return qbInvoiceRes.QueryResponse && qbInvoiceRes.QueryResponse.Invoice[0];
                    }
                    return false;
                }).catch(function(err){
                    _this.msg = err.Fault.Error.reduce(function(str, msg) {
                        str += msg.Message + ": " + msg.Detail  + "<br />";
                        return str;
                    }, '');
                    throw _this.msg;
                }).then(function(existingInvoice){
                    return _this.setInvoiceDetails(invoice, existingInvoice);
                })

            } else {
                // Invoice doesn't exist

                if(invoice.Lease.qb_id){
                    // If customer exists
                    invoice.CustomerRef = {
                        value:  invoice.Lease.qb_id
                    };

                    return _this.setInvoiceDetails(invoice);

                } else {
                    // Customer doesn't exist, save them.
                    return _this.saveCustomer(connection, invoice.Lease, 'lease').then(function(qbCustomer){
                        invoice.Lease.qb_id = qbCustomer.Id;
                        return qbCustomer;
                    }).then(function(qbCustomer){
                        if(!qbCustomer) throw _this.msg;
                        // change to support user,id as well.
                        invoice.CustomerRef = {
                            value:  qbCustomer.Id
                        };
                        return _this.setInvoiceDetails(invoice);

                    })
                }


            }


        }).then(function(invoiceRes) {

            if (!invoiceRes) throw _this.msg;

            data = invoiceRes;

            // Either update or save new
            if (data.Id) {
                return _this.qboPromise.updateInvoiceAsync(data).catch(function (err) {
                    _this.msg = err.Fault.Error.reduce(function (str, msg) {
                        str += msg.Message + ": " + msg.Detail + "<br />";
                        return str;
                    }, '');
                    throw _this.msg;
                })
            } else {
                return _this.qboPromise.createInvoiceAsync(data).catch(function (err) {
                    _this.msg = err.Fault.Error.reduce(function (str, msg) {
                        str += msg.Message + ": " + msg.Detail + "<br />";
                        return str;
                    }, '');
                    throw _this.msg;
                })
            }

        }).then(function(qbInvoiceRes){
            qbInvoice = qbInvoiceRes;
            invoice.qb_id = qbInvoice.Id;
            return models.Invoice.saveInvoice(connection, { qb_id: qbInvoice.Id }, invoice.id);

        }).then(function(invoiceRes){
            return true;
        }).catch(function(err){
            console.log(err);
            console.log(err.stack);
            _this.msg = err.toString();
            return false;
        });
    }

    savePayment(connection, payment){
        var _this = this;

        var data;
        var qbPayment;

        return Promise.resolve().then(function() {

            // If invoice exists
            if(payment.qb_id){

                return _this.qboPromise.findPaymentAsync(payment.qb_id.toString()).then(function(qbPaymentRes){
                    if(qbPaymentRes.QueryResponse && qbPaymentRes.QueryResponse.Payment.length) {
                        return qbPaymentRes.QueryResponse && qbPaymentRes.QueryResponse.Payment[0];
                    }
                    return false;
                }).catch(function(err){
                    _this.msg = err.Fault.Error.reduce(function(str, msg) {
                        str += msg.Message + ": " + msg.Detail  + "<br />";
                        return str;
                    }, '');
                    throw _this.msg;
                }).then(function(existingPayment){
                    return _this.setPaymentDetails(payment, existingPayment);
                })

            } else {

                // Invoice doesn't exist
                if(payment.Lease.qb_id){
                    // If customer exists
                    payment.CustomerRef = {
                        value:  payment.Lease.qb_id
                    };
                    return _this.setPaymentDetails(payment);
                } else {
                    // Customer doesn't exist, save them.
                    return _this.saveCustomer(connection, payment.Lease, 'lease').then(function(qbCustomer){
                        payment.Lease.qb_id = qbCustomer.Id;
                        return qbCustomer;
                    }).then(function(qbCustomer){
                        if(!qbCustomer) throw _this.msg;
                        // change to support user,id as well.
                        payment.CustomerRef = {
                            value:  qbCustomer.Id
                        };
                        return _this.setPaymentDetails(payment);

                    })
                }
            }

        }).then(function(paymentRes){

            data = paymentRes;

            // Either update or save new
            if (data.Id) {
                return _this.qboPromise.updatePaymentAsync(data).catch(function (err) {
                    _this.msg = err.Fault.Error.reduce(function (str, msg) {
                        str += msg.Message + ": " + msg.Detail + "<br />";
                        return str;
                    }, '');
                    throw _this.msg;
                })
            } else {
                return _this.qboPromise.createPaymentAsync(data).catch(function (err) {
                    _this.msg = err.Fault.Error.reduce(function (str, msg) {
                        str += msg.Message + ": " + msg.Detail + "<br />";
                        return str;
                    }, '');
                    throw _this.msg;
                })
            }

        }).then(function(qbPaymentRes){
            qbPayment = qbPaymentRes;
            payment.qb_id = qbPayment.Id;
          return models.Payment.save(connection, {
            payment_gateway: this.payment_gateway,
            qb_id: qbPayment.Id
          }, payment.id);

        }).then(function(invoiceRes){

            return true;

        }).catch(function(err){

            _this.msg = err.toString();
            return false;
        });

    }

    saveItem(product){
        var _this = this;
        var sync_token;
        var data = {
            Name : product.name,
            Active : (product.active) ? "true":"false",
            FullyQualifiedName: product.name,
            Taxable: (product.taxable) ? "true":"false",
            UnitPrice: product.price,
            IncomeAccountRef: {
                value: product.qb_income_account
            },
            Type: "Service",
            SalesTaxIncluded: false
        };

        var item = {};

        return Promise.resolve().then(function(){

            if(product.qb_id) {
                // this product has been synced, get the token for updating
                return _this.qboPromise.findItemsAsync({ Id: product.qb_id.toString() }).then(function(qbItemRes){
                    if(qbItemRes.QueryResponse && qbItemRes.QueryResponse.Item.length) {
                        return qbItemRes.QueryResponse && qbItemRes.QueryResponse.Item[0];
                    }
                    return false;
                });
            } else {
                // If this product hasn't been synced, sync it
                return _this.qboPromise.findItemsAsync({Name: data.Name}).then(function(qbItemRes){
                    if(qbItemRes.QueryResponse  && qbItemRes.QueryResponse.Item){
                        qbItemRes.QueryResponse.Item.forEach(function(qbItem){
                            if(qbItem.Name === data.Name){
                                item = qbItem;
                            }
                        });
                    }

                    if(item.Id) return item;

                    return false;
                });
            }
        }).then(function(itemRes){
            item = itemRes;

            if(!item){
                // No Item found, we should save it.
                return _this.qboPromise.createItemAsync(data);
            } else {
                // Set product.qb_id
                product.qb_id = item.Id;
                // update item with new values
                item.Name = data.Name;
                item.Active = data.Active;
                item.FullyQualifiedName = data.FullyQualifiedName;
                item.Taxable = data.Taxable;
                item.UnitPrice = data.UnitPrice;
                item.IncomeAccountRef = data.IncomeAccountRef;
                return _this.qboPromise.updateItemAsync(item);
            }

        }).then(function(itemSaveRes){
            product.qb_id = itemSaveRes.Id;
            return true;
        }).catch(function(err){

            _this.msg = err.Fault.Error.reduce(function(str, msg) {
                str += msg.Message + ": " + msg.Detail  + "<br />";
                return str;
            }, '');
            console.log(_this.msg);
            return false;
        });

    }


}


module.exports = QuickBooks;
