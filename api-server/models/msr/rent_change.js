var moment = require('moment');

module.exports = {

    //Summarized
    async summarizedRentChange(connection, date, properties) {
        let sql = `
            with cte_rent_change_leases as (${this.getRentChangeLeases(date, properties)})
            select rc.property_id,
                sum(case when rc.months_rent_change <6 then 1 else 0 end) as less_than_six,
                sum(case when rc.months_rent_change between 6 and 11 then 1 else 0 end) as six_eleven,
                sum(case when rc.months_rent_change between 12 and 17 then 1 else 0 end) as twelve_seventeen,
                sum(case when rc.months_rent_change between 18 and 24 then 1 else 0 end) as eighteen_twentyfour,
                sum(case when rc.months_rent_change >24 then 1 else 0 end) as above_twentyfour,
                sum(case when rc.months_rent_change <6 then rc.new_rent else 0 end) as less_than_six_new_rent_amount,
                sum(case when rc.months_rent_change between 6 and 11 then rc.new_rent else 0 end) as six_eleven_new_rent_amount,
                sum(case when rc.months_rent_change between 12 and 17 then rc.new_rent else 0 end) as twelve_seventeen_new_rent_amount,
                sum(case when rc.months_rent_change between 18 and 24 then rc.new_rent else 0 end) as eighteen_twentyfour_new_rent_amount,
                sum(case when rc.months_rent_change >24 then rc.new_rent else 0 end) as above_twentyfour_new_rent_amount,
                sum(case when rc.months_rent_change <6 then rc.old_rent else 0 end) as less_than_six_old_rent_amount,
                sum(case when rc.months_rent_change between 6 and 11 then rc.old_rent else 0 end) as six_eleven_old_rent_amount,
                sum(case when rc.months_rent_change between 12 and 17 then rc.old_rent else 0 end) as twelve_seventeen_old_rent_amount,
                sum(case when rc.months_rent_change between 18 and 24 then rc.old_rent else 0 end) as eighteen_twentyfour_old_rent_amount,
                sum(case when rc.months_rent_change >24 then rc.old_rent else 0 end) as above_twentyfour_old_rent_amount
            from cte_rent_change_leases rc
            group by rc.property_id
        `;
        
        console.log('summarizedRentChange query:', sql);
        // 110ms
        return await connection.queryAsync(sql).then(r => r.length ? r[0]: {});
    },

    async summarizedRentChangeMyMonths(connection, payload) {
        let { dates, property_ids } = payload;
        let sql = `
            with cte_rent_change_leases as (${this.getRentChangeLeases(dates, property_ids)})
            select rc.property_id, DATE_FORMAT(rc.report_date, '%M-%y') as month,
                sum(case when rc.months_rent_change <6 then 1 else 0 end) as less_than_six,
                sum(case when rc.months_rent_change between 6 and 11 then 1 else 0 end) as six_eleven,
                sum(case when rc.months_rent_change between 12 and 17 then 1 else 0 end) as twelve_seventeen,
                sum(case when rc.months_rent_change between 18 and 24 then 1 else 0 end) as eighteen_twentyfour,
                sum(case when rc.months_rent_change >24 then 1 else 0 end) as above_twentyfour,
                sum(case when rc.months_rent_change <6 then rc.new_rent else 0 end) as less_than_six_new_rent_amount,
                sum(case when rc.months_rent_change between 6 and 11 then rc.new_rent else 0 end) as six_eleven_new_rent_amount,
                sum(case when rc.months_rent_change between 12 and 17 then rc.new_rent else 0 end) as twelve_seventeen_new_rent_amount,
                sum(case when rc.months_rent_change between 18 and 24 then rc.new_rent else 0 end) as eighteen_twentyfour_new_rent_amount,
                sum(case when rc.months_rent_change >24 then rc.new_rent else 0 end) as above_twentyfour_new_rent_amount,
                sum(case when rc.months_rent_change <6 then rc.old_rent else 0 end) as less_than_six_old_rent_amount,
                sum(case when rc.months_rent_change between 6 and 11 then rc.old_rent else 0 end) as six_eleven_old_rent_amount,
                sum(case when rc.months_rent_change between 12 and 17 then rc.old_rent else 0 end) as twelve_seventeen_old_rent_amount,
                sum(case when rc.months_rent_change between 18 and 24 then rc.old_rent else 0 end) as eighteen_twentyfour_old_rent_amount,
                sum(case when rc.months_rent_change >24 then rc.old_rent else 0 end) as above_twentyfour_old_rent_amount
            from cte_rent_change_leases rc
            group by rc.property_id, DATE_FORMAT(rc.report_date, '%M-%y')
        `;

        console.log('summarizedRentChangeMyMonths query:', sql);
        return await connection.queryAsync(sql).then(r => r.length ? r: []);
    },

    //Detailed
    detailRentChange(connection, company_id, property_id, date) {
        date =  moment(date).format('YYYY-MM-DD');
  
        let sql = `
            with cte_rent_change_leases as (${this.getRentChangeLeases(date, [property_id])})

            select 
                rc.name, rc.unit_number, rc.date as date,
                CASE WHEN rc.days_rent_change <= 1 THEN concat(rc.days_rent_change, " Day") 
                    WHEN rc.days_rent_change > 1 THEN concat(rc.days_rent_change, " Days") 
                END as days_rent_change,
                rc.new_rent, rc.old_rent, rc.variance_amt, rc.percentage,
                CASE WHEN rc.months_rent_change < 6 THEN "<6 Months"
                    WHEN rc.months_rent_change between 6 and 11 THEN "<12 Months"
                    WHEN rc.months_rent_change between 12 and 17 THEN "<18 Months"
                    WHEN rc.months_rent_change between 18 and 24 THEN "<24 Months"
                    WHEN rc.months_rent_change >24 THEN ">24 Months"
                END as rate_categorie
            from cte_rent_change_leases rc
        `;

        console.log('detailRentChange query:', sql);
        return connection.queryAsync(sql);
    },
  
    detailRentNotChange(connection, company_id, property_id, date) {
        date =  moment(date).format('YYYY-MM-DD');
  
        let sql = `
            with cte_rent_not_change_leases as (${this.getRentUnChangeLeases(date, [property_id])})
            select * from cte_rent_not_change_leases
        `;

        console.log('detailRentNotChange query:', sql);
        return connection.queryAsync(sql);
    },

    //Snippet
    getRentChangeLeases(dates, properties){
        dates = Array.isArray(dates)? dates:[dates];
        let sql = `
            select
                concat(c.first,' ',c.last) as name,
                u.number as unit_number,
                max(s.start_date) as date,
                timestampdiff(day, max(s.start_date), date(t.date)) as days_rent_change,
                s.price as new_rent,
                so.price as old_rent,
                s.price - so.price as variance_amt,
                (s.price - so.price) * 100.00 / s.price  as percentage,
                timestampdiff(month, s.start_date, date(t.date)) as months_rent_change,
                u.property_id,
                l.id as lease_id, 
                s.start_date as last_rent_change,
                t.date as report_date
            from units u 
            join leases l on l.unit_id = u.id and l.status = 1
            join (${dates.map(date => `SELECT '${date}' as date`).join(' UNION ALL ')}) t
                on l.start_date < t.date and (l.end_date is null or l.end_date > t.date)
            join services s on s.lease_id = l.id 
                and s.product_id = u.product_id 
                and t.date between s.start_date and ifnull(s.end_date, t.date)
                and s.start_date <> l.start_date
            join services so on so.lease_id = s.lease_id 
                and timestampdiff(day, date(so.end_date), date(s.start_date)) = 1
            join contact_leases cl on cl.lease_id = l.id and cl.primary = 1
            join contacts c on c.id = cl.contact_id
            where u.property_id in (${properties.join(', ')})
            group by u.property_id, l.id, t.date
        `;

        return sql;
    },

    getRentUnChangeLeases(dates, properties){
        dates = Array.isArray(dates)? dates: [dates]
        let sql = `
            select 
                concat(c.first,' ',c.last) as name,
                u.number as unit_number,
                l.start_date as move_in,
                date(max(s.start_date)) as last_change_date,
                CASE WHEN datediff(date(t.date), date(max(s.start_date))) <= 1 THEN concat(datediff(date(t.date), date(max(s.start_date))), " Day") 
                    WHEN datediff(date(t.date), date(max(s.start_date))) > 1 THEN concat(datediff(date(t.date), date(max(s.start_date))), " Days")
                END as days_rent_change,
                sum(s.price) as current_rate,
                (SELECT upc.set_rate FROM unit_price_changes upc WHERE upc.unit_id = u.id ORDER BY upc.id DESC LIMIT 1) as sell_rate,
                sum(s.price) - (SELECT upc.set_rate FROM unit_price_changes upc WHERE upc.unit_id = u.id ORDER BY upc.id DESC LIMIT 1) as variance_amt,
                (sum(s.price) - (SELECT upc.set_rate FROM unit_price_changes upc WHERE upc.unit_id = u.id ORDER BY upc.id DESC LIMIT 1)) * 100.00 / sum(s.price) as percentage,
                u.property_id,
                t.date as date
            from units u
                join leases l on l.unit_id = u.id and l.status = 1
                join (${dates.map(date => `SELECT '${date}' as date`).join(' UNION ALL ')}) t
                    on l.start_date < t.date and (l.end_date is null or l.end_date > t.date)
                join services s on s.lease_id = l.id
                    and s.product_id = u.product_id
                    and date(t.date) between s.start_date and ifnull(s.end_date, t.date)
                    and DATEDIFF(t.date, s.start_date ) >= 365
                join contact_leases cl on cl.lease_id = l.id
                join contacts c on c.id = cl.contact_id
            where u.property_id in (${properties.join(', ')})
            group by u.property_id, l.id, t.date
        `;

        return sql;
    },

}