module.exports = {
  async deposits(connection, date, properties, first_day_of_month, first_day_of_year){
    let sql = `

    WITH mvw_payments_MS as (
    SELECT p.property_id, p.contact_id, p.date as payment_date , 
           sum(case when p.method = 'cash' then p.amount else 0 end) as day_cash, 
           sum(case when p.method = 'check' then p.amount else 0 end) as day_check,
           sum(case when p.method = 'ach' then p.amount else 0 end) as day_ach,
           sum(case when p.method = 'card' then p.amount else 0 end) as day_card,
           sum(case when p.method not in ( 'cash', 'check', 'ach', 'card' ) then p.amount else 0 end) as day_others
    from hummingbird.payments p
    where p.status = 1 
      and p.credit_type = 'payment' 
      and p.method not in ('credit', 'loss')
      and p.property_id in (${properties.join(', ')})
              and p.date BETWEEN '${first_day_of_year}' and '${date}' 
    group by p.property_id, contact_id, p.date )


        SELECT p.property_id, p.payment_date , date_format(p.payment_date,'%m') as payment_month, date_format( p.payment_date,'%Y') as payment_year, 
            sum(p.day_cash) as cash_, 
            sum(p.day_check) as check_,
            sum(day_ach) as ach_,
            sum(day_card) as card_,
            sum(day_others) as others_
        from mvw_payments_MS p
        where p.property_id in (${properties.join(', ')})
        and p.payment_date = '${date}'
        group by p.property_id, p.payment_date, date_format( p.payment_date,'%m'), date_format(p.payment_date,'%Y')
        union all 
        SELECT p.property_id, null as payment_date , date_format( p.payment_date,'%m') as payment_month, date_format(p.payment_date,'%Y') as payment_year, 
            sum(p.day_cash) as cash_, 
            sum(p.day_check) as check_,
            sum(day_ach) as ach_,
            sum(day_card) as card_,
            sum(day_others) as others_
        from mvw_payments_MS p
        where p.property_id in (${properties.join(', ')})
        and p.payment_date BETWEEN '${first_day_of_month}' and '${date}' 
        group by p.property_id, date_format( p.payment_date,'m%'), date_format(p.payment_date,'%Y')
        union all 
        SELECT p.property_id, null as payment_date ,null as payment_month, date_format( p.payment_date,'%Y') as payment_year, 
            sum(p.day_cash) as cash_, 
            sum(p.day_check) as check_,
            sum(day_ach) as ach_,
            sum(day_card) as card_,
            sum(day_others) as others_
        from mvw_payments_MS p
        where p.property_id in (${properties.join(', ')})
        and p.payment_date BETWEEN '${first_day_of_year}' and '${date}' 
        group by p.property_id, date_format(p.payment_date,'%Y');
`;
// 211ms
    return await connection.queryAsync(sql).then(r => r.length ? r: []);
  },

  async refunds(connection, date, properties, first_day_of_month, first_day_of_year){
    let sql = `
    
    WITH mvw_refunds_ms as (
    
    select p.property_id , p.contact_id, 
    convert(date_format(r.date),'%Y-%m-%d'),DATE) as refund_date, 
    sum(r.amount) as day_refund
    from hummingbird.payments p 
    join hummingbird.refunds r on r.payment_id = p.id 
    join hummingbird.properties pr on p.property_id = pr.id 
    where p.status = '1'
      and p.method not in ('credit', 'loss')
    and  p.property_id in (${properties.join(', ')})
              and r.date BETWEEN '${first_day_of_year}' and '${date}'          
    group by p.property_id, p.contact_id, convert(date_format(r.date),'%Y-%m-%d'),DATE))
    select r.property_id ,r.refund_date, date_format( r.refund_date,'%m') as refund_month, date_format( r.refund_date,'%Y') as refund_year, sum(r.day_refund) as refund_
    from mvw_refunds_ms r
    where r.property_id in (${properties.join(', ')}) and r.refund_date = '${date}'
    group by r.property_id, r.refund_date, date_format(r.refund_date,'%m'), date_format( r.refund_date,'%Y')
    union ALL 
    select r.property_id ,null as refund_date, date_format( r.refund_date,'%m') as refund_month, date_format( r.refund_date,'%Y') as refund_year, sum(r.day_refund) as refund_
    from mvw_refunds_ms r
    where r.property_id in (${properties.join(', ')}) and r.refund_date BETWEEN '${first_day_of_month}' and '${date}'
    group by r.property_id, r.refund_date, date_format(r.refund_date,'%m'), date_format( r.refund_date,'%Y')
    union all 
    select r.property_id ,null as refund_date, null as refund_month, date_format( r.refund_date,'%Y') as refund_year, sum(r.day_refund) as refund_
    from mvw_refunds_ms r
    where r.property_id in (${properties.join(', ')}) and r.refund_date BETWEEN '${first_day_of_year}' and '${date}'
    group by r.property_id, r.refund_date, date_format(r.refund_date,'%m'), date_format( r.refund_date,'%Y');
`;
// 175ms
    return await connection.queryAsync(sql).then(r => r.length ? r: []);
  },

  async discounts(connection, date, properties, first_day_of_month, first_day_of_year){
    let sql = `
        with mvw_discounts_ms as (select i.property_id, i.date as invoice_date, i.due as invoice_due_date, i.void_date as invoice_void_date, SUM(IFNULL(total_discounts, 0)) as day_discounts 
    from hummingbird.invoices i 
    join hummingbird.properties p on p.id = i.property_id 
    where i.date BETWEEN '${first_day_of_year}' and '${date}'
    group by i.property_id, i.date, i.due, i.void_date
        )
        select d.property_id, d.invoice_date, date_format( d.invoice_date,'%m') as invoice_month, date_format( d.invoice_date,'%Y') as invoice_year,
            SUM(d.day_discounts) as discounts_ 
        from mvw_discounts_ms d 
        where d.property_id in (${properties.join(', ')})
        and d.invoice_date = '${date}'
        and (d.invoice_void_date is null or convert(date_format(d.invoice_void_date,'%Y-%m-%d'),DATE)> '${date}')
        group by d.property_id, d.invoice_date, date_format( d.invoice_date,'%m'), date_format( d.invoice_date,'%Y')
        union all
        select d.property_id, null invoice_date, date_format( d.invoice_date,'%m') as invoice_month, date_format( d.invoice_date,'%Y') as invoice_year,
            SUM(d.day_discounts) as discounts_ 
        from mvw_discounts_ms d 
        where d.property_id in (${properties.join(', ')})
        and d.invoice_date BETWEEN '${first_day_of_month}' and '${date}'
        and (d.invoice_void_date is null or convert(date_format(d.invoice_void_date,'%Y-%m-%d'),DATE) > '${date}')
        group by d.property_id, date_format( d.invoice_date,'%m'), date_format( d.invoice_date,'%Y')
        union all
        select d.property_id, null invoice_date, null as invoice_month, date_format( d.invoice_date,'%Y') as invoice_year,
            SUM(d.day_discounts) as discounts_ 
        from mvw_discounts_ms d 
        where d.property_id in (${properties.join(', ')})
        and d.invoice_date BETWEEN '${first_day_of_year}' and '${date}'
        and (d.invoice_void_date is null or convert(date_format(d.invoice_void_date,'%Y-%m-%d'),DATE) > '${date}')
        group by d.property_id, date_format( d.invoice_date,'%Y'); 
    `;
// 620ms
    return await connection.queryAsync(sql).then(r => r.length ? r: []);
  },

  async creditsWithWriteOffs(connection, date, properties, first_day_of_month, first_day_of_year){
    let sql = `
    with mvw_credits_ms as (SELECT p.property_id, contact_id, ipb.date as credit_date, 
           sum(case when p.method = 'credit' and ifnull(p.sub_method, '0') not in ('auction', 'deposit') then ipb.amount else 0 end) as day_credit, 
           sum(case when p.method = 'loss' then ipb.amount else 0 end) as day_writeoffs,
           sum(case when p.method = 'credit' and p.sub_method = 'auction' then ipb.amount else 0 end) as day_auction,
           sum(case when p.method = 'credit' and p.sub_method = 'deposit' then ipb.amount else 0 end) as day_deposit
    from hummingbird.payments p
    join hummingbird.invoices_payments_breakdown ipb on ipb.payment_id = p.id
    where p.status = 1 
      and p.method in ('credit', 'loss')
      and   p.property_id in (${properties.join(', ')})
              and ipb.date  BETWEEN '${first_day_of_year}' and '${date}'
    group by p.property_id, p.contact_id, ipb.date)
              SELECT c.property_id, c.credit_date, date_format( c.credit_date,'%m') as credit_month, date_format( c.credit_date,'%Y') as credit_year,
                  sum(c.day_credit) as credit_, 
                  sum(c.day_writeoffs) as writeoffs_
              from mvw_credits_ms c
              where c.property_id in (${properties.join(', ')})
              and c.credit_date = '${date}'
              group by c.property_id, c.credit_date, date_format( c.credit_date,'%m'), date_format( c.credit_date,'%Y')
              union all
              SELECT c.property_id, null as credit_date, date_format( c.credit_date,'%m') as credit_month, date_format( c.credit_date,'%Y') as credit_year,
                  sum(c.day_credit) as credit_, 
                  sum(c.day_writeoffs) as writeoffs_
              from mvw_credits_ms c
              where c.property_id in (${properties.join(', ')})
              and c.credit_date BETWEEN '${first_day_of_month}' and' ${date}'
              group by c.property_id, date_format( c.credit_date,'%m'), date_format( c.credit_date,'%Y')
              union all
              SELECT c.property_id, null as credit_date, null as credit_month, date_format( c.credit_date,'%Y') as credit_year,
                  sum(c.day_credit) as credit_, 
                  sum(c.day_writeoffs) as writeoffs_
              from mvw_credits_ms c
              where c.property_id in (${properties.join(', ')})
              and c.credit_date BETWEEN '${first_day_of_year}' and '${date}'
              group by c.property_id, date_format( c.credit_date,'%Y');
       `;
// 211ms
    return await connection.queryAsync(sql).then(r => r.length ? r: []);
  },

  async transfers(connection, date, properties, first_day_of_month, first_day_of_year){
    let sql = `
              with mvw_transfers_ms as ( SELECT u.property_id, t.date as transfer_date, COUNT(l.id)  as day_transfers
    from hummingbird.leases l
    join hummingbird.units u on u.id = l.unit_id 
    join hummingbird.transfers t on t.from_lease_id = l.id
    where l.status = 1  and u.property_id in (${properties.join(', ')})
    and t.date between '${first_day_of_year}' and '${date}'
    group by u.property_id, t.date)
    select rt.property_id , date(rt.transfer_date) as transfer_date, date_format( rt.transfer_date,'%m') as transfer_month, date_format( rt.transfer_date,'%Y') as transfer_year,
                  sum(rt.day_transfers) as day_transfers
              from mvw_transfers_ms rt
              where rt.property_id in ((${properties.join(', ')}))
              and rt.transfer_date = '${date}'
              group by rt.property_id , date(rt.transfer_date), date_format( rt.transfer_date,'%m'), date_format( rt.transfer_date,'%Y')
              union all
              select rt.property_id , null as transfer_date, date_format( rt.transfer_date,'%m') as transfer_month, date_format( rt.transfer_date,'%Y') as transfer_year,
                  sum(rt.day_transfers) as day_transfers
              from mvw_transfers_ms rt
              where rt.property_id in ((${properties.join(', ')}))
              and rt.transfer_date between '${first_day_of_month}' and '${date}'
              group by rt.property_id, date_format( rt.transfer_date,'%m'), date_format( rt.transfer_date,'%Y')
              union all
              select rt.property_id , null as transfer_date, null as transfer_month, date_format( rt.transfer_date,'%Y') as transfer_year,
                  sum(rt.day_transfers) as day_transfers
              from mvw_transfers_ms rt
              where rt.property_id in ((${properties.join(', ')}))
              and rt.transfer_date between '${first_day_of_year}' and '${date}'
              group by rt.property_id, date_format( rt.transfer_date,'%Y');
    `;
// 178ms
    return await connection.queryAsync(sql).then(r => r.length ? r: []);
  },

  async moveIns(connection, date, properties, first_day_of_month, first_day_of_year) {
    let sql = `
              with mvw_rental_moveins_ms as ( SELECT u.property_id, l.start_date as start_date , COUNT(l.id) as day_movins 
    from hummingbird.leases l
    join hummingbird.units u on u.id = l.unit_id 
    where l.status = 1  and u.property_id in (${properties.join(', ')})
              and l.start_date BETWEEN '${first_day_of_year}' and '${date}'
    group by u.property_id, l.start_date)
    SELECT mi.property_id, mi.start_date as start_date, date_format( mi.start_date,'%m') as movein_month, date_format( mi.start_date,'%Y') as movein_year,
                  SUM(mi.day_movins) as movins_ 
              from mvw_rental_moveins_ms mi
              where mi.property_id in (${properties.join(', ')})
              and mi.start_date = '${date}'
              group by mi.property_id, mi.start_date, date_format( mi.start_date,'%m'), date_format( mi.start_date,'%Y')
              union all
              SELECT mi.property_id, null as start_date, date_format( mi.start_date,'%m') as movein_month, date_format( mi.start_date,'%Y') as movein_year,
                  SUM(mi.day_movins) as movins_ 
              from mvw_rental_moveins_ms mi
              where mi.property_id in (${properties.join(', ')})
              and mi.start_date BETWEEN '${first_day_of_month}' and '${date}'
              group by mi.property_id, date_format( mi.start_date,'%m'), date_format( mi.start_date,'%Y')
              union all
              SELECT mi.property_id, null as start_date, null movein_month, date_format( mi.start_date,'%Y') as movein_year,
                  SUM(mi.day_movins) as movins_ 
              from mvw_rental_moveins_ms mi
              where mi.property_id in (${properties.join(', ')})
              and mi.start_date BETWEEN '${first_day_of_year}' and '${date}'
              group by mi.property_id, date_format( mi.start_date,'%Y');
    `;
// 177ms
    return await connection.queryAsync(sql).then(r => r.length ? r: []);

  },

  async moveOuts(connection, date, properties, first_day_of_month, first_day_of_year) {
    let sql = `
    with mvw_rental_moveouts_ms as (
    SELECT u.property_id, l.end_date as end_date, COUNT(l.id)  as day_moveouts 
    from hummingbird.leases l
    join hummingbird.units u on u.id = l.unit_id 
    where l.status = 1 and u.property_id in (${properties.join(', ')})
              and l.end_date BETWEEN '${first_day_of_year}' and '${date}' 
    group by u.property_id, l.end_date)
    SELECT mo.property_id, mo.end_date as end_date, date_format( mo.end_date,'%m') as moveout_month, date_format( mo.end_date,'%Y') as moveout_year,
                  SUM(mo.day_moveouts ) as moveouts_ 
              from mvw_rental_moveouts_ms mo
              where mo.property_id in (${properties.join(', ')})
              and mo.end_date = '${date}'
              group by mo.property_id, mo.end_date, date_format( mo.end_date,'%m'), date_format( mo.end_date,'%Y')
              union all
              SELECT mo.property_id, null as end_date, date_format( mo.end_date,'%m') as moveout_month, date_format( mo.end_date,'%Y') as moveout_year,
                  SUM(mo.day_moveouts) as moveouts_ 
              from mvw_rental_moveouts_ms mo
              where mo.property_id in (${properties.join(', ')})
              and mo.end_date BETWEEN '${first_day_of_month}' and '${date}'
              group by mo.property_id, date_format( mo.end_date,'%m'), date_format( mo.end_date,'%Y')
              union all
              SELECT mo.property_id, null as end_date, null as moveout_month, date_format( mo.end_date,'%Y') as moveout_year,
                  SUM(mo.day_moveouts) as moveouts_ 
              from mvw_rental_moveouts_ms mo
              where mo.property_id in (${properties.join(', ')})
              and mo.end_date BETWEEN '${first_day_of_year}' and '${date}'
              group by mo.property_id, date_format( mo.end_date,'%Y');
    `;
// 188ms
    return await connection.queryAsync(sql).then(r => r.length ? r: []);

  },

  async reservedUnits(connection, date, properties, first_day_of_month, first_day_of_year) {
    let sql = `
    with mvw_reservation_ms as (
    SELECT u.property_id, u.id as unit_id, convert(date_format(CONVERT_TZ ( r.created, '+00:00', p.timezone_abrv ),'%Y-%m-%d'),DATE)  as reservation_date, 
    convert(date_format(CONVERT_TZ ( r.expires, '+00:00', p.timezone_abrv  ),'%Y-%m-%d'),DATE) as expiration_date, l.id as lease_id, l.status as status, 
    l.start_date as lease_start_date, 1 as day_reservations, ifnull(nullif(trim(au.value), ''), '0') as day_sqft, l.rent as reservation_rent
    from hummingbird.reservations r
    join hummingbird.leases l on l.id = r.lease_id 
    join hummingbird.units u on u.id = l.unit_id 
    join hummingbird.properties p on p.id = u.property_id 
    join hummingbird.amenity_units au on au.unit_id = u.id 
    join hummingbird.amenities a on a.id = au.amenity_id 
                    and a.property_type = u.type 
                    and a.name = 'Sqft'
    where u.property_id in (${properties.join(', ')})
              and r.created BETWEEN '${first_day_of_year}' and '${date}')
    SELECT ru.property_id, ru.reservation_date, date_format( ru.reservation_date,'%m') as reservation_month, date_format( ru.reservation_date,'%Y') as reservation_year,
                  SUM(day_reservations) as reservations_
              from mvw_reservation_ms ru
              where ru.property_id in (${properties.join(', ')})
              and ru.reservation_date = '${date}'
              group by ru.property_id, ru.reservation_date, date_format( ru.reservation_date,'%m'), date_format( ru.reservation_date,'%Y')
              union all
              SELECT ru.property_id, null as reservation_date, date_format( ru.reservation_date,'%m') as reservation_month, date_format( ru.reservation_date,'%Y') as reservation_year,
                  SUM(day_reservations) as reservations_
              from mvw_reservation_ms ru
              where ru.property_id in (${properties.join(', ')})
              and ru.reservation_date BETWEEN '${first_day_of_month}' and '${date}'
              group by ru.property_id, date_format( ru.reservation_date,'%m'), date_format( ru.reservation_date,'%Y')
              union all
              SELECT ru.property_id, null as reservation_date, null as reservation_month, date_format( ru.reservation_date,'%Y') as reservation_year,
                  SUM(day_reservations) as reservations_
              from mvw_reservation_ms ru
              where ru.property_id in (${properties.join(', ')})
              and ru.reservation_date BETWEEN '${first_day_of_year}' and '${date}'
              group by ru.property_id, date_format( ru.reservation_date,'%Y');
    `;
// 243ms
    return await connection.queryAsync(sql).then(r => r.length ? r: []);
  },

  async occupiedUnitsExcludingComplimentary(connection, date, properties) {
    let sql = `
          with mvw_occupied_ms as ( 
    select u.property_id, l.start_date as lease_start_date, l.end_date as lease_end_date, u.id as occupied_units, s.start_date as start_date, s.end_date as end_date, 
    ifnull(nullif(trim(au.value), ''), '0') as occupied_sqft, s.price as occupied_rent, 0 as occupied_base_rent
    from hummingbird.units u 
    join hummingbird.leases l on l.unit_id = u.id 
    join hummingbird.services s on s.lease_id = l.id
                    and s.product_id = u.product_id 
    join hummingbird.amenity_units au on au.unit_id = u.id 
    join hummingbird.amenities a on a.id = au.amenity_id 
                    and a.property_type = u.type 
                    and a.name = 'Sqft'
     where l.status = 1 
       and s.price > 0
       and s.status = 1 
       and u.property_id in (${properties.join(', ')})
                and ('${date}' between s.start_date and ifnull(s.end_date, '${date}' )))
       select ou.property_id, count(ou.occupied_units) as occupied_, sum(cast(ou.occupied_sqft as decimal(10,2))) as occupied_sqft_, sum(ou.occupied_rent) as occupied_rent_, sum(upc.price) as occupied_base_rent_
            from mvw_occupied_ms ou
            join hummingbird.unit_price_changes upc on upc.unit_id = ou.occupied_units
            where ou.property_id in (${properties.join(', ')})
                and ('${date}' between ou.start_date and ifnull(ou.end_date, '${date}' ))
                and (ou.lease_end_date is null or ou.lease_end_date > '${date}')
                and ('${date}' between upc.start and ifnull(upc.end, '${date}'))
                and not exists (select 1
                from hummingbird.unit_price_changes upc2
                where upc2.unit_id = upc.unit_id
                and upc2.start = upc.end
                and convert(date_format(upc2.start,'%Y-%m-%d'),DATE)  <= '${date}')
            group by ou.property_id;
 
    `;
// 214ms
    return await connection.queryAsync(sql).then(r => r.length ? r[0]: {});
  },

  async complimentaryUnits(connection, date, properties) { //complimentaryUnits
    let sql = `
    with mvw_complimentary_ms as (
    
    select u.property_id, s.start_date as start_date, s.end_date as end_date, l.start_date as lease_start_date, l.end_date as lease_end_date, 
    u.id as complimentary_units, ifnull(nullif(trim(au.value), ''), '0') as complimentary_sqft, 0 as complimentary_units_rent, 0 as complimentary_base_rent
    from hummingbird.units u 
    join hummingbird.leases l on l.unit_id = u.id 
    join hummingbird.services s on s.lease_id = l.id
                    and s.product_id = u.product_id 
    join hummingbird.amenity_units au on au.unit_id = u.id 
    join hummingbird.amenities a on a.id = au.amenity_id 
                    and a.property_type = u.type 
                    and a.name = 'Sqft'
    where l.status = 1 
      and s.price = 0
      and s.status = 1
                  and ('${date}' between s.start_date and ifnull(s.end_date, '${date}' ))
                and (l.end_date is null or l.end_date > '${date}')
      )
      select cu.property_id, count(cu.complimentary_units) as complimentary_, sum(cast(cu.complimentary_sqft as decimal(10,2))) as complimentary_sqft_, sum(upc.price) as complimentary_base_rent_
            from mvw_complimentary_ms cu
            join hummingbird.unit_price_changes upc on upc.unit_id = cu.complimentary_units
            where cu.property_id in (${properties.join(', ')})
                and ('${date}' between cu.start_date and ifnull(cu.end_date, '${date}' ))
                and (cu.lease_end_date is null or cu.lease_end_date > '${date}')
                and ('${date}' between convert(date_format(upc.start,'%Y-%m-%d'),DATE) and ifnull(convert(date_format(upc.end,'%Y-%m-%d'),DATE), '${date}'))
                and not exists (select 1
                    from hummingbird.unit_price_changes upc2
                    where upc2.unit_id = upc.unit_id
                    and upc2.start = upc.end
                    and convert(date_format(upc2.start ,'%Y-%m-%d'),DATE) <= '${date}')
            group by cu.property_id;
    `;
// 192ms

    return await connection.queryAsync(sql).then(r => r.length ? r[0]: {});
  },

  async totalUnits(connection, date, properties) {
    let sql = `
    with mvw_total_ms as (
    select u.property_id , convert(date_format(CONVERT_TZ ( u.created, '+00:00',p.timezone_abrv ),'%Y-%m-%d'),DATE) as created_date, 
    convert(date_format(CONVERT_TZ ( u.deleted, '+00:00', p.timezone_abrv),'%Y-%m-%d'),DATE) as removed_date, 
    u.status, convert(date_format(CONVERT_TZ ( upc.start, '+00:00',p.timezone_abrv ),'%Y-%m-%d'),DATE) as price_start_date, 
    convert(date_format(CONVERT_TZ ( upc.end, '+00:00',p.timezone_abrv ),'%Y-%m-%d'),DATE) as price_end_date, 
    u.id as units_count, cast(ifnull(nullif(trim(au.value), ''), '0') as decimal(10,2)) as units_sqft, upc.price as units_base_rent
    from hummingbird.units u 
    join hummingbird.unit_price_changes upc on upc.unit_id = u.id
    join hummingbird.properties p on p.id = u.property_id
    join hummingbird.amenity_units au on au.unit_id = u.id 
    join hummingbird.amenities a on a.id = au.amenity_id 
                    and a.property_type = u.type 
                    and a.name = 'Sqft'
    where u.property_id in (${properties.join(', ')})
                   )
    select tu.property_id, count(tu.units_count) as total_, sum(cast(tu.units_sqft as decimal(10,2))) as total_sqft_, sum(tu.units_base_rent) as total_baserent_
              from mvw_total_ms tu
              where tu.property_id in (${properties.join(', ')})
              and '${date}' between tu.created_date and ifnull(tu.removed_date, '${date}')
              and '${date}' between convert(date_format(tu.price_start_date,'%Y-%m-%d'),DATE) and ifnull(convert(date_format(tu.price_end_date,'%Y-%m-%d'),DATE), '${date}')
              and not exists (select 1
                              from mvw_total_ms tu2
                              where tu2.units_count = tu.units_count
                              and tu2.price_start_date = tu.price_end_date
                              and convert(date_format(tu2.price_start_date ,'%Y-%m-%d'),DATE) <= '${date}')
              group by tu.property_id;
    `;

   return await connection.queryAsync(sql).then(r => r.length ? r[0]: {});
  },
// 220ms
async unRentableUnits(connection, date, properties) {
    let sql = `
    with mvw_total_ms as (
    select u.property_id , convert(date_format(CONVERT_TZ ( u.created, '+00:00',p.timezone_abrv ),'%Y-%m-%d'),DATE) as created_date, 
    convert(date_format(CONVERT_TZ (  u.deleted, '+00:00', p.timezone_abrv),'%Y-%m-%d'),DATE) as removed_date, 
    u.status, convert(date_format(CONVERT_TZ ( upc.start,'+00:00',p.timezone_abrv ),'%Y-%m-%d'),DATE) as price_start_date, 
    convert(date_format(CONVERT_TZ ( upc.end, '+00:00',p.timezone_abrv ),'%Y-%m-%d'),DATE) as price_end_date, 
    u.id as units_count, cast(ifnull(nullif(trim(au.value), ''), '0') as decimal(10,2)) as units_sqft, upc.price as units_base_rent
    from hummingbird.units u 
    join hummingbird.unit_price_changes upc on upc.unit_id = u.id
    join hummingbird.properties p on p.id = u.property_id
    join hummingbird.amenity_units au on au.unit_id = u.id 
    join hummingbird.amenities a on a.id = au.amenity_id 
                    and a.property_type = u.type 
                    and a.name = 'Sqft'
    where u.property_id in (${properties.join(', ')})
             )
        select tu.property_id, count(tu.units_count) as total_unrentable_, sum(tu.units_sqft) as total_unrentable_sqft_, sum(tu.units_base_rent) as total_unrentable_baserent_
        from mvw_total_ms tu
        where tu.property_id in (${properties.join(', ')})
        and '${date}' between tu.created_date and ifnull(tu.removed_date, '${date}')
        and '${date}' between convert(date_format(tu.price_start_date,'%Y-%m-%d'),DATE) and ifnull(convert(date_format(tu.price_end_date,'%Y-%m-%d'),DATE), '${date}')
        and not exists (select 1
                        from mvw_total_ms tu2
                        where tu2.units_count = tu.units_count
                        and tu2.price_start_date = tu.price_end_date
                        and convert(date_format(tu2.price_start_date ,'%Y-%m-%d'),DATE) <= '${date}')
        and tu.status = '0'
        group by tu.property_id;
    `;
// 173ms
    return await connection.queryAsync(sql).then(r => r.length ? r[0]: {});
  },

  async reservedUnitsInfo(connection, date, properties) {
    let sql = `
    with mvw_reservation_ms as (
    SELECT u.property_id, u.id as unit_id, convert(date_format(CONVERT_TZ ( r.created, '+00:00', p.timezone_abrv ),'%Y-%m-%d'),DATE)  as reservation_date, 
    convert(date_format(CONVERT_TZ ( r.expires, '+00:00', p.timezone_abrv  ),'%Y-%m-%d'),DATE) as expiration_date, l.id as lease_id, l.status as status, 
    l.start_date as lease_start_date, 1 as day_reservations, ifnull(nullif(trim(au.value), ''), '0') as day_sqft, l.rent as reservation_rent
    from hummingbird.reservations r
    join hummingbird.leases l on l.id = r.lease_id 
    join hummingbird.units u on u.id = l.unit_id 
    join hummingbird.properties p on p.id = u.property_id 
    join hummingbird.amenity_units au on au.unit_id = u.id 
    join hummingbird.amenities a on a.id = au.amenity_id 
                    and a.property_type = u.type 
                    and a.name = 'Sqft'
    where u.property_id in (${properties.join(', ')}))
    
    select tu.property_id, sum(tu.day_reservations) as total_, sum(tu.day_sqft) as total_reserved_sqft_, sum(tu.reservation_rent) as reservation_rent_
              from mvw_reservation_ms tu
              where tu.property_id in (${properties.join(', ')})
              and tu.reservation_date <= '${date}'
              and ifnull(case when tu.status <> 1 then tu.expiration_date else tu.lease_start_date end, '${date}' )> '${date}'
              and (tu.status <> 1 or (tu.lease_start_date <= '${date}' and tu.status = 1))
              group by tu.property_id; 
    `;


    return await connection.queryAsync(sql).then(r => r.length ? r[0]: {});
  },

  async autoPay(connection, date, properties) {
    let sql = `
    with mvw_autopay_ms as ( select u.property_id , date(CONVERT_TZ (lpm.created_at, '+00:00', p.timezone_abrv )) as start_date, 
             date(ifnull(CONVERT_TZ(lpm.deleted, '+00:00', p.timezone_abrv),l.end_date)) as end_date, count(1) as day_autopay
    from hummingbird.units u 
    join hummingbird.leases l on l.unit_id = u.id 
    join hummingbird.leases_payment_methods lpm on lpm.lease_id = l.id 
    join hummingbird.properties p on p.id = u.property_id
    where l.status = '1' 
    and u.property_id in (${properties.join(', ')})
          and '${date}' between lpm.created_at and ifnull(l.end_date, '${date}')
    group by u.property_id , date(CONVERT_TZ (lpm.created_at, '+00:00',p.timezone_abrv )), date(ifnull(CONVERT_TZ(lpm.deleted,'+00:00',p.timezone_abrv), l.end_date))
    )
          select a.property_id, sum(a.day_autopay) as autopay_
          from mvw_autopay_ms a 
          where a.property_id in (${properties.join(', ')})
          and '${date}' between a.start_date and ifnull(a.end_date, '${date}')
          group by a.property_id;
        
    `;
// 263ms
    return await connection.queryAsync(sql).then(r => r.length ? r[0]: {});
 },

 async insurance(connection, date, properties) {
    let sql = `
    with mvw_insurance_ms as ( select u.property_id , s.start_date, ifnull(s.end_date, l.end_date ) as end_date, count(1) as day_insurance
    from hummingbird.units u 
    join hummingbird.leases l on l.unit_id = u.id 
    join hummingbird.services s on s.lease_id = l.id 
    join hummingbird.products p on p.id = s.product_id 
                   and p.default_type = 'insurance'
                   and s.status = 1
    where l.status = 1 and
    u.property_id in (${properties.join(', ')})
              and '${date}' between s.start_date and ifnull(ifnull(s.end_date, l.end_date ) , '${date}')
    group by u.property_id , s.start_date, ifnull(s.end_date, l.end_date ))
        select i.property_id, sum(i.day_insurance) as insurance_ 
        from mvw_insurance_ms i
        where i.property_id in (${properties.join(', ')})
        and '${date}' between i.start_date and ifnull(i.end_date, '${date}')
        group by i.property_id;
    `;
// 215ms
    return await connection.queryAsync(sql).then(r => r.length ? r[0]: {});
  },

  async overlock(connection, date, properties) {
    let sql = `
        select u.property_id , count(1) as day_overlocks
        from hummingbird.units u
        join hummingbird.overlocks o on o.unit_id = u.id
        where u.property_id in (${properties.join(', ')})
        and convert(date_format(o.created,'%Y-%m-%d'),DATE) <= '${date}'
        and o.status = 1
        group by u.property_id
    `;

    return await connection.queryAsync(sql).then(r => r.length ? r[0]: {});
  },

  async rentUnchanged(connection, date, properties) {
    let sql = `
        select u.property_id , date_format('${date}','%Y-%m-%d') as report_date, count(s.lease_id ) as rentunchanged_
        from hummingbird.units u
        join hummingbird.leases l on l.unit_id = u.id
        join hummingbird.services s on s.lease_id = l.id
                                and s.product_id = u.product_id
                                and date('${date}') between s.start_date and ifnull(s.end_date, '${date}')
                                and TIMESTAMPDIFF( day, s.start_date,'${date}' ) >= 365
        where u.property_id in (${properties.join(', ')})
            and l.status = 1
            and l.start_date < '${date}'
        and (l.end_date is null or l.end_date > '${date}')
        group by u.property_id;
    `;
// 108ms
     return await connection.queryAsync(sql).then(r => r.length ? r[0]: {});
  },

  async rentChange(connection, date, properties) {
    let sql = `
        select rc.property_id,
            sum(case when timestampdiff(month, rc.last_rent_change, report_date ) <6 then 1 else 0 end) as less_than_six,
            sum(case when timestampdiff(month, rc.last_rent_change, report_date ) between 6 and 11 then 1 else 0 end) as six_eleven,
            sum(case when timestampdiff(month, rc.last_rent_change, report_date ) between 12 and 17 then 1 else 0 end) as twelve_seventeen,
            sum(case when timestampdiff(month, rc.last_rent_change, report_date ) between 18 and 24 then 1 else 0 end) as eighteen_twentyfour,
            sum(case when timestampdiff(month, rc.last_rent_change, report_date ) >24 then 1 else 0 end) as above_twentyfour,
            sum(case when timestampdiff(month, rc.last_rent_change, report_date ) <6 then rc.new_rent_amount else 0 end) as less_than_six_new_rent_amount,
            sum(case when timestampdiff(month, rc.last_rent_change, report_date ) between 6 and 11 then rc.new_rent_amount else 0 end) as six_eleven_new_rent_amount,
            sum(case when timestampdiff(month, rc.last_rent_change, report_date ) between 12 and 17 then rc.new_rent_amount else 0 end) as twelve_seventeen_new_rent_amount,
            sum(case when timestampdiff(month, rc.last_rent_change, report_date ) between 18 and 24 then rc.new_rent_amount else 0 end) as eighteen_twentyfour_new_rent_amount,
            sum(case when timestampdiff(month, rc.last_rent_change, report_date ) >24 then rc.new_rent_amount else 0 end) as above_twentyfour_new_rent_amount,
            sum(case when timestampdiff(month, rc.last_rent_change, report_date ) <6 then rc.old_rent_amount else 0 end) as less_than_six_old_rent_amount,
            sum(case when timestampdiff(month, rc.last_rent_change, report_date ) between 6 and 11 then rc.old_rent_amount else 0 end) as six_eleven_old_rent_amount,
            sum(case when timestampdiff(month, rc.last_rent_change, report_date ) between 12 and 17 then rc.old_rent_amount else 0 end) as twelve_seventeen_old_rent_amount,
            sum(case when timestampdiff(month, rc.last_rent_change, report_date ) between 18 and 24 then rc.old_rent_amount else 0 end) as eighteen_twentyfour_old_rent_amount,
            sum(case when timestampdiff(month, rc.last_rent_change, report_date ) >24 then rc.old_rent_amount else 0 end) as above_twentyfour_old_rent_amount
        from (select u.property_id , date('${date}') as report_date , l.id as lease_id, max(s.start_date) as last_rent_change, sum(s.price) as new_rent_amount, sum(so.price) as old_rent_amount
        from hummingbird.units u 
        join hummingbird.leases l on l.unit_id = u.id 
        join hummingbird.services s on s.lease_id = l.id 
            and s.product_id = u.product_id 
            and s.start_date <= '${date}'
            and s.start_date <> l.start_date
        join hummingbird.services so on so.lease_id = s.lease_id 
            and timestampdiff(day, date(so.end_date), date(s.start_date)) = 1
        where u.property_id in (${properties.join(', ')})
            and l.status = 1
            and l.start_date < '${date}'
            and (l.end_date is null or l.end_date > '${date}')
        group by u.property_id , l.id) as rc
        group by rc.property_id	 ;
    `;
// 110ms
    return await connection.queryAsync(sql).then(r => r.length ? r[0]: {});
  },

  async delinquentTenantsLedgerAmounts(connection, date, properties) {
    let sql = `
        SELECT o.property_id, o.report_date, 
            sum(case when days_unpaid between 0 and 10 then o.total_amount - o.total_paid else 0 end) as owed_0_10,
            sum(case when days_unpaid between 11 and 30 then o.total_amount - o.total_paid else 0 end) as owed_11_30,
            sum(case when days_unpaid between 31 and 60 then o.total_amount - o.total_paid else 0 end) as owed_31_60,
            sum(case when days_unpaid between 61 and 90 then o.total_amount - o.total_paid else 0 end) as owed_61_90,
            sum(case when days_unpaid between 91 and 120 then o.total_amount - o.total_paid else 0 end) as owed_91_120,
            sum(case when days_unpaid between 121 and 180 then o.total_amount - o.total_paid else 0 end) as owed_121_180,
            sum(case when days_unpaid between 181 and 360 then o.total_amount - o.total_paid else 0 end) as owed_181_360,
            sum(case when days_unpaid > 360 then o.total_amount - o.total_paid else 0 end) as owed_361
        from (select u.property_id , '${date}' report_date, i.lease_id , i.id as invoice_id, timestampdiff(day, i.due,'${date}' ) as days_unpaid, 
    (ifnull(i.subtotal, 0) + ifnull(i.total_tax , 0) - ifnull(i.total_discounts ,0)) as total_amount, sum(ifnull(ipb.amount,0)) as total_paid
            from hummingbird.invoices i
            join hummingbird.leases l on l.id = i.lease_id
            join hummingbird.units u on u.id = l.unit_id
            left outer join hummingbird.invoices_payments_breakdown ipb on ipb.invoice_id = i.id
                                                                      and ipb.date <='${date}'
            where i.due <= '${date}'
                and (i.void_date is null or convert(date_format(i.void_date ,'%Y-%m-%d'),DATE) > '${date}')
                and l.status = 1
                and (l.end_date is null or l.end_date > '${date}')
                and u.property_id in (${properties.join(', ')})
            group by u.property_id , i.lease_id , i.id, timestampdiff(day, i.due,'${date}' ), ifnull(i.subtotal, 0) + ifnull(i.total_tax , 0) - ifnull(i.total_discounts,0)
            having ifnull(total_amount,0)-ifnull(total_paid,0) > 0
            ) o
        group by o.property_id, o.report_date;
        `
// 201 ms
    return await connection.queryAsync(sql).then(r => r.length ? r[0]: {});
  },

  async delinquentTenantsLedgerUnits(connection, date, properties) {
    let sql = `
        SELECT property_id, report_date, 
            sum(case when days_unpaid between 0 and 10 then 1 else 0 end) as units_0_10, 
            sum(case when days_unpaid between 11 and 30 then 1 else 0 end) as units_11_30,
            sum(case when days_unpaid between 31 and 60 then 1 else 0 end) as units_31_60,
            sum(case when days_unpaid between 61 and 90 then 1 else 0 end) as units_61_90,
            sum(case when days_unpaid between 91 and 120 then 1 else 0 end) as units_91_120,
            sum(case when days_unpaid between 121 and 180 then 1 else 0 end) as units_121_180,
            sum(case when days_unpaid between 181 and 360 then 1 else 0 end) as units_181_360,
            sum(case when days_unpaid > 360 then 1 else 0 end) as units_361
        from (   
          select up.property_id, up.report_date, up.lease_id, max(up.days_unpaid) as days_unpaid
      from (
        select u.property_id , '${date}' AS report_date, i.lease_id , i.id as invoice_id, timestampdiff(day, i.due,'${date}' ) as days_unpaid,
            (ifnull(i.subtotal, 0) + ifnull(i.total_tax , 0) - ifnull(i.total_discounts,0 )) as total_amount, sum(ifnull(ipb.amount,0)) as total_paid
                from hummingbird.invoices i
                join hummingbird.leases l on l.id = i.lease_id
                join hummingbird.units u on u.id = l.unit_id
                left outer join hummingbird.invoices_payments_breakdown ipb on ipb.invoice_id = i.id
                                                                          and ipb.date <='${date}' 
                where i.due <= '${date}'
                and (i.void_date is null or convert(date_format(i.void_date ,'%Y-%m-%d'),DATE) > '${date}')
                and l.status = 1
                and (l.end_date is null or l.end_date > '${date}')
                and u.property_id in (${properties.join(', ')})
                group by u.property_id , i.lease_id , i.id, timestampdiff(day, i.due,'${date}' ), ifnull(i.subtotal, 0) + ifnull(i.total_tax , 0) - ifnull(i.total_discounts,0)
                having total_amount-total_paid > 0
            ) up
          group by up.property_id, up.report_date, up.lease_id
          ) o
        group by o.property_id, o.report_date;
    `;
// 166ms
    return await connection.queryAsync(sql).then(r => r.length ? r[0]: {});
  },

  async calculateRevenue(connection, start_date, end_date, properties) {
      let sql = `
          select i.property_id , sum((il.qty * il.cost) - il.total_discounts) as net_revenue
          from hummingbird.invoices i
          join hummingbird.invoice_lines il on il.invoice_id = i.id
          join hummingbird.products p on p.id = il.product_id
              and p.type not in ('deposit')
              and p.default_type not in ('auction')
          where i.property_id in (${properties.join(', ')})
          and i.due between '${start_date}' and '${end_date}'
          and (i.void_date is null or convert(date_format(i.void_date ,'%Y-%m-%d'),DATE) > '${end_date}')
          group by i.property_id;
          `;
// 107ms
    return await connection.queryAsync(sql).then(r => r.length ? r: []);
  },

  async leads(connection, date, properties, first_day_of_month, first_day_of_year) {
    let sql = `
      with mvw_leads_ms as (
        select ld.property_id, c.id as contact_id, case when ld.source in ('Phone Call') then 'Phone Leads'
                                            when ld.source in ('Walk-In') then 'Walk-In Leads'
                                            when ld.source in ('Company Website', 'internet', 'Tenant Website',
                                                                 'Store Local', 'Tenant V2 Website', 'Tenant v2',
                                                                 'Online Search', 'Tenant Website Final', 'Website',
                                                                 'Tenant Website V2', 'Social Media') then 'Web Leads'
                                            else 'Others' end as "source", min(date(CONVERT_TZ (c.created, '+00:00', p.timezone_abrv ))) as lead_date
          from hummingbird.contacts c 
          join hummingbird.leads ld on ld.contact_id = c.id
          join hummingbird.properties p on p.id = ld.property_id 
          where  ld.property_id in (${properties.join(', ')})
            and c.created between '${first_day_of_year}' and '${date}'
          group by ld.property_id , c.id, case when ld.source in ('Phone Call') then 'Phone Leads'
                                                    when ld.source in ('Walk-In') then 'Walk-In Leads'
                                                    when ld.source in ('Company Website', 'internet', 'Tenant Website',
                                                                         'Store Local', 'Tenant V2 Website', 'Tenant v2',
                                                                         'Online Search', 'Tenant Website Final', 'Website',
                                                                         'Tenant Website V2', 'Social Media') then 'Web Leads'
                                                    else 'Others' end 
            )
  
        select l.property_id, l.lead_date as lead_date, l.source as lead_source, date_format( l.lead_date,'%m') as lead_month, date_format( l.lead_date,'%Y') as lead_year,
            count(l.contact_id) as day_leads
        from mvw_leads_ms l
        where l.property_id in (${properties.join(', ')})
        and l.lead_date = '${date}'
        group by l.property_id, l.lead_date, l.source, date_format( l.lead_date,'%m'), date_format( l.lead_date,'%Y')
        union all
        select l.property_id, null as lead_date, l.source as lead_source, date_format( l.lead_date,'%m') as lead_month, date_format( l.lead_date,'%Y') as lead_year,
            count(l.contact_id) as day_leads
        from mvw_leads_ms l
        where l.property_id in (${properties.join(', ')})
        and l.lead_date between '${first_day_of_month}' and '${date}'
        group by l.property_id, l.source, date_format( l.lead_date,'%m'), date_format( l.lead_date,'%Y')
        union all
        select l.property_id, null as lead_date, l.source as lead_source, null as lead_month, date_format( l.lead_date,'%Y') as lead_year,
            count(l.contact_id) as day_leads
        from mvw_leads_ms l
        where l.property_id in (${properties.join(', ')})
        and l.lead_date between '${first_day_of_year}' and '${date}'
        group by l.property_id, l.source, date_format( l.lead_date,'%Y');
    `;
// 182ms
    return await connection.queryAsync(sql).then(r => r.length ? r: []);
  },

  async leadsConverted(connection, date, properties, first_day_of_month, first_day_of_year) {
    let sql = `
    with mvw_converted_leads_ms as ( select u.property_id, cl.contact_id, min(l.start_date) as lead_start_date
    from hummingbird.contact_leases cl
    join hummingbird.leases l on l.id = cl.lease_id
    join hummingbird.units u on u.id = l.unit_id
    where cl.primary = 1
       and l.status = 1
       and u.property_id in ((74))
  and l.start_date between '${first_day_of_year}' and '${date}'
    group by u.property_id , cl.contact_id)
  select cl.property_id, cl.lead_start_date as lead_date, date_format( cl.lead_start_date,'%m') as lead_month, date_format(cl.lead_start_date,'%Y') as lead_year,
      count(cl.contact_id) as day_converted_leads
  from mvw_converted_leads_ms cl
  where cl.property_id in ((74))
  and cl.lead_start_date = '${date}'
  group by cl.property_id, cl.lead_start_date, date_format(cl.lead_start_date,'%m'), date_format(cl.lead_start_date,'%Y')
  union all
  select cl.property_id, null as lead_date, date_format( cl.lead_start_date,'%m') as lead_month, date_format( cl.lead_start_date,'%Y') as lead_year,
      count(cl.contact_id) as day_converted_leads
  from mvw_converted_leads_ms cl
  where cl.property_id in ((74))
  and cl.lead_start_date between '${first_day_of_month}' and '${date}'
  group by cl.property_id, date_format( cl.lead_start_date,'%m'), date_format(cl.lead_start_date,'%Y')
  union all
  select cl.property_id, null as lead_date, null as lead_month, date_format(cl.lead_start_date,'%Y') as lead_year,
      count(cl.contact_id) as day_converted_leads
  from mvw_converted_leads_ms cl
  where cl.property_id in ((74))
  and cl.lead_start_date between '${first_day_of_year}' and '${date}'
  group by cl.property_id, date_format(cl.lead_start_date,'%Y');
    `;
    return await connection.queryAsync(sql).then(r => r.length ? r: []);
  },

  async productRevenue(connection, date, properties, first_day_of_month, first_day_of_year) {
      let sql = `
with mvw_invoices_details_ms as (select i.property_id , convert(date_format(i.due,'%Y-%m-%d'),DATE) as invoice_date, i.void_date as invoice_void_date, i.status,
    case when p.default_type = 'rent' then 'rent'
       when p.default_type = 'insurance' then 'insurance'
       when p.default_type = 'late' then 'fee'
       when p.default_type = 'product' then 'merchandise'
       else 'others' end as product, 
    sum((ifnull(il.qty, 0)*ifnull(il.cost,0)) - ifnull(il.total_discounts,0)) as revenue_amount, sum(ifnull(il.total_tax, 0 )) as tax_amount
    from hummingbird.invoices i 
    join hummingbird.invoice_lines il on il.invoice_id = i.id 
    join hummingbird.products p on p.id = il.product_id 
    where p.type not in ('deposit')
      and p.default_type not in ('auction')
            and i.property_id in (${properties.join(', ')})
          and convert(date_format(i.due,'%Y-%m-%d'),DATE) between '${first_day_of_year}' and '${date}'
    group by i.property_id, case when p.default_type = 'rent' then 'rent'
                   when p.default_type = 'insurance' then 'insurance'
                   when p.default_type = 'late' then 'fee'
                   when p.default_type = 'product' then 'merchandise'
                   else 'others' end, convert(date_format(i.due,'%Y-%m-%d'),DATE), i.void_date, i.status)
          select ih.property_id, ih.product, ih.invoice_date as revenue_date, date_format( ih.invoice_date,'%m') as revenue_month, date_format( ih.invoice_date,'%Y') as revenue_year, sum(ih.revenue_amount) as revenue_amount_
          from mvw_invoices_details_ms ih
          where ih.property_id in (${properties.join(', ')})
          and ih.invoice_date = '${date}'
          and (ih.invoice_void_date is null or convert(date_format(ih.invoice_void_date,'%Y-%m-%d'),DATE) > '${date}')
          group by ih.property_id, ih.product, ih.invoice_date, date_format( ih.invoice_date,'%m'), date_format( ih.invoice_date,'%Y')
          union all
          select ih.property_id, ih.product, null as revenue_date, date_format( ih.invoice_date,'%m') as revenue_month, date_format( ih.invoice_date,'%Y') as revenue_year, sum(ih.revenue_amount) as revenue_amount_
          from mvw_invoices_details_ms ih
          where ih.property_id in (${properties.join(', ')})
          and ih.invoice_date between '${first_day_of_month}' and '${date}'
          and (ih.invoice_void_date is null or convert(date_format(ih.invoice_void_date,'%Y-%m-%d'),DATE) > '${date}')
          group by ih.property_id, ih.product, date_format( ih.invoice_date,'%m'), date_format( ih.invoice_date,'%Y')
          union all
          select ih.property_id, ih.product, null as revenue_date, null as revenue_month, date_format( ih.invoice_date,'%Y') as revenue_year, sum(ih.revenue_amount) as revenue_amount_
          from mvw_invoices_details_ms ih
          where ih.property_id in (${properties.join(', ')})
          and ih.invoice_date between '${first_day_of_year}' and '${date}'
          and (ih.invoice_void_date is null or convert(date_format(ih.invoice_void_date,'%Y-%m-%d'),DATE) > '${date}')
          group by ih.property_id, ih.product, date_format( ih.invoice_date,'%Y');
      `;
// 219ms
      return await connection.queryAsync(sql).then(r => r.length ? r: []);
  },

  async liabilities(connection, date, properties) {
      let sql = `
            select a.property_id, a.product, a.report_date, sum(a.revenue_amount_) as revenue_amount_, count(distinct a.lease_id) as revenue_spaces_
      from (
          select u.property_id, i.lease_id, case when p.default_type = 'rent' then 'Prepaid Rent'
                  when p.default_type = 'insurance' then 'Prepaid Insurance'
                  when p.default_type in ('late', 'product') then 'Prepaid Fees'
                  else 'Miscellaneous Deposits' end as product, '${date}' as report_date,
                  sum(ifnull(ila.amount, 0)) as revenue_amount_
          from hummingbird.invoices i
          join hummingbird.leases l on l.id = i.lease_id
          join hummingbird.units u on u.id = l.unit_id
          join hummingbird.invoice_lines il on il.invoice_id = i.id
          join hummingbird.invoice_lines_allocation ila on ila.invoice_line_id = il.id
          join hummingbird.invoices_payments_breakdown ipb on ipb.id = ila.invoice_payment_breakdown_id
          join hummingbird.payments pm on pm.id = ipb.payment_id
          join hummingbird.products p on p.id = il.product_id
          where u.property_id in (${properties.join(', ')})
          and p.default_type <> 'product'
          and ila.date<= '${date}'
          and (l.end_date is null or l.end_date > '${date}')
          and ila.type <> 'tax'
          and ((pm.credit_type not in ('credit', 'loss') and p.default_type not in ('rent', 'insurance', 'late', 'product')) or (p.default_type in ('rent', 'insurance', 'late', 'product')))
          and (i.void_date is null or i.void_date > '${date}')
          and ((i.due > '${date}' and p.default_type in ('rent', 'insurance', 'late', 'product')) or (convert(date_format(i.created_at,'%Y-%m-%d'),DATE) <= '${date}' and p.default_type not in ('rent', 'insurance', 'late', 'product')))
          group by u.property_id, i.lease_id, case when p.default_type = 'rent' then 'Prepaid Rent'
                  when p.default_type = 'insurance' then 'Prepaid Insurance'
                  when p.default_type in ('late', 'product') then 'Prepaid Fees'
                  else 'Miscellaneous Deposits' end
          having sum(ifnull(ila.amount, 0)) > 0 ) a
          group by a.property_id, a.product, a.report_date;
      `;

      return await connection.queryAsync(sql).then(r => r.length ? r: []);
  },
// 334ms
async unAllocatedPayments(connection, date, properties) {
      let sql = `
    select fr.property_id, sum(fr.unallocated_amount) as unallocated_amount_, sum(fr.unallocated_spaces) as unallocated_spaces_
          from (
          select up.property_id, up.contact_id, up.unallocated_amount, count(l.id) as unallocated_spaces
          from (
          select tp.property_id, tp.contact_id, ifnull(ifnull(tp.total_amount,0) - ifnull(rp.refund_amount, 0) - ifnull(ap.allocated_amount, 0),0) as unallocated_amount
          from
          (select p.property_id , p.contact_id , sum(ifnull(p.amount, 0)) as total_amount
          from hummingbird.payments p
          where p.property_id in (${properties.join(', ')})
          and p.status = 1
          and p.credit_type = 'payment'
          and p.method not in ('credit', 'loss')
          and p.date <= '${date}'
          group by p.property_id , p.contact_id) tp
          left outer join (SELECT p.property_id, p.contact_id, sum(ifnull(ip.amount,0)) as allocated_amount
                          from hummingbird.payments p
                          join hummingbird.invoices_payments_breakdown ip on ip.payment_id = p.id
                          where p.property_id in (${properties.join(', ')})
                          and convert(date_format(ip.created,'%Y-%m-%d'),DATE) <= '${date}'
                          and p.credit_type = 'payment'
                          and p.method not in ('credit', 'loss')
                          group by p.property_id, p.contact_id) as ap on ap.property_id = tp.property_id
                                                                      and ap.contact_id = tp.contact_id
          left outer join (SELECT p.property_id, p.contact_id, sum(ifnull(r.amount, 0)) as refund_amount
                          from hummingbird.payments p
                          join hummingbird.refunds r on r.payment_id = p.id
                          where p.property_id in (${properties.join(', ')})
                          and convert(date_format(r.date,'%Y-%m-%d'),DATE) <= '${date}'
                          and p.status = 1
                          and p.credit_type = 'payment'
                          and p.method not in ('credit', 'loss')
                          group by p.property_id, p.contact_id) as rp on rp.property_id = tp.property_id
                                                                      and rp.contact_id = tp.contact_id
          where ifnull(ifnull(tp.total_amount,0) - ifnull(rp.refund_amount, 0) - ifnull(ap.allocated_amount, 0),0) > 0) as up
          join hummingbird.contact_leases cl on cl.contact_id = up.contact_id
          join hummingbird.leases l on l.id = cl.lease_id
          where l.end_date is null
          group by up.property_id, up.contact_id, up.unallocated_amount) fr
          group by fr.property_id;
      `;
// 230ms
      return connection.queryAsync(sql).then(r => r.length ? r[0] : {});
  },

  async totalLiableUnits(connection, date, properties) {
      let sql = `
          select tf.property_id, tf.report_date, count(tf.lease_id) as revenue_spaces_
          from (
          select u.property_id, '${date}' as report_date, i.lease_id as lease_id, sum(ifnull(ila.amount, 0)) as liability_amount
          from hummingbird.invoices i
          join hummingbird.leases l on l.id = i.lease_id
          join hummingbird.units u on u.id = l.unit_id
          join hummingbird.invoice_lines il on il.invoice_id = i.id
          join hummingbird.invoice_lines_allocation ila on ila.invoice_line_id = il.id
          join hummingbird.invoices_payments_breakdown ipb on ipb.id = ila.invoice_payment_breakdown_id
          join hummingbird.payments pm on pm.id = ipb.payment_id
          join hummingbird.products p on p.id = il.product_id
          where u.property_id in (${properties.join(', ')})
          and p.default_type <> 'product'
          and ila.date<= '${date}'
          and (l.end_date is null or l.end_date > '${date}')
          and ila.type <> 'tax'
          and ((pm.credit_type not in ('credit', 'loss') and p.default_type not in ('rent', 'insurance', 'late', 'product')) or (p.default_type in ('rent', 'insurance', 'late', 'product')))
          and (i.void_date is null or i.void_date > '${date}')
          and ((i.due > '${date}' and p.default_type in ('rent', 'insurance', 'late', 'product')) or (convert(date_format(i.created_at,'%Y-%m-%d'),DATE) <= '${date}' and p.default_type not in ('rent', 'insurance', 'late', 'product')))
          group by u.property_id, i.lease_id
          having sum(ifnull(ila.amount, 0))>0
          union
          select up.property_id, '${date}' as report_date, l.id as lease_id, unallocated_amount
          from (
          select tp.property_id, tp.contact_id, ifnull(ifnull(tp.total_amount,0) - ifnull(rp.refund_amount, 0) - ifnull(ap.allocated_amount, 0),0) as unallocated_amount
          from
          (select p.property_id , p.contact_id , sum(ifnull(p.amount, 0)) as total_amount
          from hummingbird.payments p
          where p.property_id in (${properties.join(', ')})
          and p.status = 1
          and p.credit_type = 'payment'
          and p.method not in ('credit', 'loss')
          and p.date <= '${date}'
          group by p.property_id , p.contact_id) tp
          left outer join (SELECT p.property_id, p.contact_id, sum(ifnull(ip.amount, 0)) as allocated_amount
                          from hummingbird.payments p
                          join hummingbird.invoices_payments_breakdown ip on ip.payment_id = p.id
                          where p.property_id in (${properties.join(', ')})
                          and convert(date_format(ip.created,'%Y-%m-%d'),DATE) <= '${date}'
                          and p.status = 1
                          and p.credit_type = 'payment'
                          and p.method not in ('credit', 'loss')
                          group by p.property_id, p.contact_id) as ap on ap.property_id = tp.property_id
                                                                      and ap.contact_id = tp.contact_id
          left outer join (SELECT p.property_id, p.contact_id, sum(ifnull(r.amount, 0)) as refund_amount
                          from hummingbird.payments p
                          join hummingbird.refunds r on r.payment_id = p.id
                          where p.property_id in (${properties.join(', ')})
                          and convert(date_format(r.date,'%Y-%m-%d'),DATE) <= '${date}'
                          and p.status = 1
                          and p.credit_type = 'payment'
                          and p.method not in ('credit', 'loss')
                          group by p.property_id, p.contact_id) as rp on rp.property_id = tp.property_id
                                                                      and rp.contact_id = tp.contact_id
          where ifnull(ifnull(tp.total_amount,0) - ifnull(rp.refund_amount, 0) - ifnull(ap.allocated_amount, 0),0) >0) as up
          join hummingbird.contact_leases cl on cl.contact_id = up.contact_id
          join hummingbird.leases l on l.id = cl.lease_id
          where l.end_date is null) tf
          group by tf.property_id, tf.report_date;
      `;

      return connection.queryAsync(sql).then(r => r.length ? r[0] : {});
   },
// 563ms
async baseRates(connection, date, properties) {
    let sql = `
        select upc.* , max(created) over (partition by unit_id order by created desc rows between 1 PRECEDING and 1 FOLLOWING) as end_date
        from unit_price_changes upc  
        where upc.unit_id = 12144
        order by created asc;    
    `;
// 93ms
    return await connection.queryAsync(sql).then(r => r.length ? r: []);
  },
};
