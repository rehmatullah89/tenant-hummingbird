var settings    = require(__dirname + '/../config/settings.js');
var Promise      = require('bluebird');
var moment = require('moment');



module.exports = {
    findById: function(connection, company_id){
        var userSql = "SELECT * FROM companies WHERE active = 1 and id = " + connection.escape(company_id);
        return connection.queryAsync(userSql).then(function(companyRes){
            return companyRes[0] || null;
        });

    },

    findByPropertyId: function(connection, property_id){
        var userSql = "SELECT * FROM companies WHERE active = 1 and id = (select company_id from properties where id = " + connection.escape(property_id) + ")";
        return connection.queryAsync(userSql).then(function(companyRes){
            return companyRes[0] || null;
        });

    },
    findBySubdomain: function(connection, subdomain){
        var userSql = "SELECT * FROM companies WHERE active = 1 and subdomain = " + connection.escape(subdomain);
        
        return connection.queryAsync(userSql).then(function(companyRes){
            return companyRes[0] || null;
        });

    },

    findCompaniesToInvoice: function(connection, queue){

        var today = moment();
        var thisDay = today.format('D');
        var thisMonth = today.format('MM');
        var thisYear = today.format('YYYY');
        var daysInThisMonth = moment(thisYear + "-" + thisMonth, "YYYY-MM").daysInMonth();
        var daysArray = [];
        var job;

        if(thisDay >= daysInThisMonth){
            while (daysInThisMonth <= 31){
                daysArray.push(connection.escape(daysInThisMonth));
                daysInThisMonth++;
            }
        } else {
            daysArray.push(thisDay);
        }

        var settingsQuery = "Select distinct(company_id) from settings where name = 'invoiceSendDay' and value in ( " + daysArray.join(',') + " )";


        return connection.queryAsync(settingsQuery).then(function(settingsRes){

            if(settingsRes.length){
                settingsRes.forEach(function(company){
                    job = queue.create('processInvoices', {
                        id: company.company_id,
                        action: 'invoices',
                        label: 'process'
                    }).save(function(err){
                        if( err ) console.error( err );
                    })
                });
            }
            return true;
        })
    },
    

    findAll: function(connection, subdomain){
        var userSql = "SELECT * FROM companies WHERE active = 1";
        return connection.queryAsync(userSql).then(function(companyRes){
            return companyRes;
        });
    },

    save: function(connection, data, company_id){

        var sql;

        if(company_id){
            sql = "UPDATE companies set ? where id = " + connection.escape(company_id);
        } else {
            sql = "insert into companies set ?";
        }
        return connection.queryAsync(sql, data).then(result => {
            return company_id ? company_id: result.insertId;
        });
    },

    findByCompanyName: function(connection, name){
        var userSql = "SELECT * FROM companies WHERE active = 1 and name = " + connection.escape(name);
        
        return connection.queryAsync(userSql).then(function(companyRes){
            return companyRes[0] || null;
        });

    },
};