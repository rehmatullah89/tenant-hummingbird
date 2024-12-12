module.exports = {
    getCurrentCharges: function(connection, property, lease) {

        var invoices = [];

        property.lease_count = 0;
        property.sum_sqft = 0;
        property.sum_tenants = 0;
        property.Units = [];

        var searchParams = {
            conditions: {
                property_id: property.id
            }
        };

        return Unit.find(connection, searchParams, ['Lease']).each(function (unit) {
            var promises = [];
            property.sum_sqft += parseInt(unit.sqft) || 0;

            if (unit.Lease) {
                property.lease_count++;
                return App.find(connection, 'leases_tenants', {conditions: {lease_id: unit.Lease.id}})
                    .then(function (tenantsRes) {

                        property.sum_tenants += tenantsRes.length;
                        unit.Lease.Tenants = tenantsRes;
                        console.log(unit);
                        return unit;
                    })
            }
            return unit;
        }).then(function (units) {
            property.Units = units;
            // Get bills on file for that property
            var sql = "Select *, " +
                " (select splitType from bills where bills.id = bills_properties.bill_id) as splittype, " +
                " (select name from products where products.id = (select product_id from bills where bills.id = bills_properties.bill_id)) as product_name, " +
                " (select product_id from bills where bills.id = bills_properties.bill_id) as product_id " +
                " from bills_properties where property_id = " + connection.escape(property.id) + " and billed_for = 0 ";

            return connection.queryAsync(sql);

        }).then(function (propertyBillsRes) {

            var invoiceLines = [];

            return Promise.map(property.Units, function (unit) {
                invoiceLines = [];
                if (unit.id == lease.unit_id && unit.Lease) {

                    if (!lease.hasBeenBilled) {
                        invoiceLines.push({
                            qty: 1,
                            amount: lease.rent,
                            date: moment().format('YYYY-MM-DD'),
                            product_id: 1,
                            product_name: 'Rent'
                        });
                    }

                    var invoiceLine = {};

                    propertyBillsRes.forEach(function (pb) {


                        invoiceLine = {
                            qty: 1,
                            date: moment().format('YYYY-MM-DD'),
                            product_id: pb.product_id,
                            product_name: pb.product_name
                        };

                        if (pb.custom) {
                            try {
                                var custom = JSON.parse(pb.custom)
                                invoiceLine.amount = custom[unit.id];
                                console.log(custom);
                            } catch (err) {
                                console.log(err);
                            }
                        }

                        if (!invoiceLine.amount) {
                            switch (pb.splittype) {
                                case 'units':
                                    invoiceLine.amount = (parseFloat(pb.amount) / property.Units.length).toFixed(2);
                                    break;
                                case 'leases':
                                    invoiceLine.amount = (parseFloat(pb.amount) / property.lease_count).toFixed(2);
                                    break;
                                case 'tenants':
                                    // TODO ( Amount / sum_tennts ) * num tenants in unit
                                    if (unit.Lease && unit.Lease.Tenants) {
                                        invoiceLine.amount = (  ( parseFloat(pb.amount) / property.sum_tenants ) * unit.Lease.Tenants.length  ).toFixed(2);
                                    } else {
                                        invoiceLine.amount = 0;
                                    }
                                    break;
                                case 'sqft':
                                    //TODO  ( Amount / sum_sqft ) * sq_ft in unit
                                    invoiceLine.amount = ( (parseFloat(pb.amount) / property.sum_sqft) * unit.sqft ).toFixed(2);
                                    break;
                            }
                        }

                        if (invoiceLine.amount > 0) {
                            invoiceLines.push(invoiceLine);
                        }


                    });
                    return invoiceLines;
                }
                return false;
            });

        }).then(function (invoiceLines) {
            return invoiceLines;
        }).catch(function (err) {
            console.error(err);
            console.error(err.stack);
            return false;
        })
    }
};


function format_list(list_name, api_field, field_index, formatter, value, cb) {
    if(formatter){
        if(formatter['type'] == 'select'){
            value = '<select>';
            $.ajax({
                url: '/api.php',
                type: 'POST',
                data: {
                    function: formatter['api_function'],
                    token: getCookie('token'),
                },
                error: function() {
                    console.log('An error occurred connecting to server. Please check your network');
                },
                dataType: 'json',
                success: function(json) {
                    if (json.status) {
                        $.each(json.data[formatter['api_function']], function() {
                            if(this.user_id == api_field){
                                value = value + '<option selected=selected value=' + this.user_id + '>' + this.name + '</option>';
                                console.log('this' + value);
                            }else{
                                value = value + '<option value=' + this.user_id + '>' + this.name + '</option>';
                                console.log('this' + value);
                            }
                        });
                        value.concat('</select>');
                        cb(value);
                    } else{
                        alert(json.message);
                    }
                }
            });

        }
        if(formatter['type'] == 'currency'){
            cb('$ ' + parseFloat(value).toFixed(2).replace(/(\d)(?=(\d\d\d)+(?!\d))/g, "$1,"));

        }
        if(formatter['type'] == 'options'){
            if(value == null){
                value = '';
            }
            var self = $.grep(window[list_name].fields, function(e){ return e.api_field == api_field; });
            var option = self[0].options;
            cb(option[value]);
        }
        if(formatter['type'] == 'text'){
            cb(value);
        }
    }
}