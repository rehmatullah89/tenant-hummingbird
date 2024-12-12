var settings    = require(__dirname + '/../config/settings.js');
var moment = require('moment');

module.exports = {
    async findById(connection, id){
        var sql = `Select tpa.*, tpd.entity_type, tpd.registration_code, tpd.first_name, tpd.last_name, tpd.dob, dba, tpd.website, tpd.business_email, tpd.ein, tpd.legal_name, tpd.property_timezone, tpd.will_purchase_equipment, tpd.ship_to_alternate, tpd.beneficiary_owners, tpd.terms, tpd.submit_by, tpd.modified_by, tpp_f.country_code as f_country_code, tpp_f.phone as f_phone, tpp_f.extension as f_extension, tpp_b.country_code as b_country_code, tpp_b.phone as b_phone, tpp_b.extension as b_extension, fa.address as f_address, fa.address2 as f_address2, fa.city as f_city, fa.state as f_state, fa.country as f_country, fa.zip as f_zip, ca.address as c_address, ca.address2 as c_address2, ca.city as c_city, ca.state as c_state, ca.country as c_country, ca.zip as c_zip, sa.address as s_address, sa.address2 as s_address2, sa.city as s_city, sa.state as s_state, sa.country as s_country, sa.zip as s_zip, la.address as l_address, la.address2 as l_address2, la.city as l_city, la.state as l_state, la.country as l_country, la.zip as l_zip from tenant_payments_applications as tpa
        left join tenant_payments_details as tpd on tpa.id = tpd.tenant_payments_applications_id 
        left join tenant_payments_phones as tpp_f on tpp_f.id = tpd.facility_phone_id
        left join tenant_payments_phones as tpp_b on tpp_b.id = tpd.business_phone_id
        left join addresses as fa on fa.id = tpd.facility_address_id
        left join addresses as ca on ca.id = tpd.customer_address_id
        left join addresses as sa on sa.id = tpd.shipping_address_id
        left join addresses as la on la.id = tpd.legal_address_id
        where tpa.id = ${connection.escape(id)}`;
            
        let result = await connection.queryAsync(sql);
        return result.length ? result[0] : null;
    },

    async findByAccountNumber(connection, account_number){

        var sql = `Select tpa.*, tpd.entity_type, tpd.registration_code, tpd.first_name, tpd.last_name, tpd.dob, dba, tpd.website, tpd.business_email, tpd.ein, tpd.legal_name, tpd.property_timezone, tpd.will_purchase_equipment, tpd.ship_to_alternate, tpd.beneficiary_owners, tpd.terms, tpd.submit_by, tpd.modified_by, tpp_f.country_code as f_country_code, tpp_f.phone as f_phone, tpp_f.extension as f_extension, tpp_b.country_code as b_country_code, tpp_b.phone as b_phone, tpp_b.extension as b_extension, fa.address as f_address, fa.address2 as f_address2, fa.city as f_city, fa.state as f_state, fa.country as f_country, fa.zip as f_zip, ca.address as c_address, ca.address2 as c_address2, ca.city as c_city, ca.state as c_state, ca.country as c_country, ca.zip as c_zip, sa.address as s_address, sa.address2 as s_address2, sa.city as s_city, sa.state as s_state, sa.country as s_country, sa.zip as s_zip, la.address as l_address, la.address2 as l_address2, la.city as l_city, la.state as l_state, la.country as l_country, la.zip as l_zip from tenant_payments_applications as tpa
        left join tenant_payments_details as tpd on tpa.id = tpd.tenant_payments_applications_id 
        left join tenant_payments_phones as tpp_f on tpp_f.id = tpd.facility_phone_id
        left join tenant_payments_phones as tpp_b on tpp_b.id = tpd.business_phone_id
        left join addresses as fa on fa.id = tpd.facility_address_id
        left join addresses as ca on ca.id = tpd.customer_address_id
        left join addresses as sa on sa.id = tpd.shipping_address_id
        left join addresses as la on la.id = tpd.legal_address_id
        where account_number = ${connection.escape(account_number)}`;
        let result = await connection.queryAsync(sql);
        return result.length ? result[0] : null;
    },

    async findByPropertyId(connection, property_id){

        var sql = `Select tpa.*, tpd.entity_type, tpd.registration_code, tpd.first_name, tpd.last_name, tpd.dob, dba, tpd.website, tpd.business_email, tpd.ein, tpd.legal_name, tpd.property_timezone, tpd.will_purchase_equipment, tpd.ship_to_alternate, tpd.beneficiary_owners, tpd.terms, tpd.submit_by, tpd.modified_by, tpp_f.country_code as f_country_code, tpp_f.phone as f_phone, tpp_f.extension as f_extension, tpp_b.country_code as b_country_code, tpp_b.phone as b_phone, tpp_b.extension as b_extension, fa.address as f_address, fa.address2 as f_address2, fa.city as f_city, fa.state as f_state, fa.country as f_country, fa.zip as f_zip, ca.address as c_address, ca.address2 as c_address2, ca.city as c_city, ca.state as c_state, ca.country as c_country, ca.zip as c_zip, sa.address as s_address, sa.address2 as s_address2, sa.city as s_city, sa.state as s_state, sa.country as s_country, sa.zip as s_zip, la.address as l_address, la.address2 as l_address2, la.city as l_city, la.state as l_state, la.country as l_country, la.zip as l_zip from tenant_payments_applications as tpa
        left join tenant_payments_details as tpd on tpa.id = tpd.tenant_payments_applications_id 
        left join tenant_payments_phones as tpp_f on tpp_f.id = tpd.facility_phone_id
        left join tenant_payments_phones as tpp_b on tpp_b.id = tpd.business_phone_id
        left join addresses as fa on fa.id = tpd.facility_address_id
        left join addresses as ca on ca.id = tpd.customer_address_id
        left join addresses as sa on sa.id = tpd.shipping_address_id
        left join addresses as la on la.id = tpd.legal_address_id
        where property_id = ${connection.escape(property_id)}`;
        let result = await connection.queryAsync(sql);
        return result.length ? result[0] : null;
    },

    async save(connection, data, application_id) {
        var sql;
        if(application_id){
            sql = "UPDATE tenant_payments_applications set ? where id = " + connection.escape(application_id);
        } else {
            sql = "INSERT INTO tenant_payments_applications set ?";
        }
        return connection.queryAsync(sql, data);

    },
    async findTenantPaymentsDetailsByApplicationId(connection, application_id) {
        var sql = `Select * from tenant_payments_details where tenant_payments_applications_id = ${connection.escape(application_id)}`;   
        let result = await connection.queryAsync(sql);
        return result.length ? result[0] : null;
    },
    async findBeneficiariesByApplicationId(connection, application_id) {
        var sql = `Select tpb.*, a.address, a.address2, a.city, a.state, a.country, a.zip from tenant_payments_beneficiaries as tpb left join addresses a on tpb.address_id = a.id where tpb.deleted_by is null and tpb.tenant_payments_applications_id = ${connection.escape(application_id)}`;
        return await connection.queryAsync(sql);
    },
    bulkUpdateSave(connection, payload) {
        const { data } = payload;	 
        const sql = `INSERT INTO tenant_payments_beneficiaries (id, tenant_payments_applications_id, address_id, first_name, last_name, dob, same_as_director, ownership) VALUES ? ON DUPLICATE KEY UPDATE tenant_payments_applications_id=VALUES(tenant_payments_applications_id), address_id=VALUES(address_id), first_name=VALUES(first_name), last_name=VALUES(last_name), dob=VALUES(dob), same_as_director=VALUES(same_as_director), ownership=VALUES(ownership)`;
        return connection.queryAsync(sql, [data]);
    },
    bulkRemove(connection, payload) {
        const { data } = payload;
        const sql = `delete from tenant_payments_beneficiaries where id in (${data.map(item => connection.escape(item.id))})`;
        return connection.queryAsync(sql, data);
    },
    bulkDelete(connection, beneficiary_ids, payload) {
        const sql = "UPDATE tenant_payments_beneficiaries set ? where id in ( " + beneficiary_ids.map(x => connection.escape(x)).join(',') +  " )";
        console.log('bulkDelete sql =>', sql);
        return connection.queryAsync(sql, payload);
    },
    saveBankHistory(connection, payload) {
        const { data } = payload;
        var sql;
        sql = "INSERT INTO tenant_payments_bank_history set ?";
        return connection.queryAsync(sql, data);
    },
    async saveTenantPaymentsDetails(connection, data, tenant_payment_details_id) {
        var sql;
        if(tenant_payment_details_id){
            sql = "UPDATE tenant_payments_details set ? where id = " + connection.escape(tenant_payment_details_id);
        } else {
            sql = "INSERT INTO tenant_payments_details set ?";
        }
        return connection.queryAsync(sql, data);
    },
    async savePhone(connection, data, phone_id) {
        var sql;
        if(phone_id){
            sql = "UPDATE tenant_payments_phones set ? where id = " + connection.escape(phone_id);
        } else {
            sql = "INSERT INTO tenant_payments_phones set ?";
        }
        return connection.queryAsync(sql, data);
    },
    async findTierInfo(connection, property_id) {
      var sql = `Select timezone_abrv from properties where id = ${connection.escape(property_id)}`;
        let result = await connection.queryAsync(sql);
        return result.length ? result[0] : null;

    },
    async findPropertyZip(connection, property_id) {
      var sql = `Select zip from addresses where id = (Select address_id from properties where id = ${connection.escape(property_id)})`;
        console.log("findPropertyZip", sql);
        let result = await connection.queryAsync(sql);
        return result.length ? result[0] : null;
    },
    async delete(connection, id){
        var sql = `update tenant_payments_applications set status = 'deleted' where id = ${connection.escape(id)}`;
        return await connection.queryAsync(sql);

    }

};
