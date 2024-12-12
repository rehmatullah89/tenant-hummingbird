const Payouts = {

  getPaymentDetailsOfPendingPayouts(connection, property_id, end_date) {
    let sql = `SELECT id, amount
      FROM payments WHERE property_id = ${property_id}
      AND status = 1 AND payout_id = 1 AND method IN ('card', 'ach')
      AND payment_gateway = 'tenant_payments'
      AND ReconcilingDescription = 'MATCH_FOUND'
      AND date < '${end_date}'`;
    console.log(sql);
    return connection.queryAsync(sql);
  },

  getRefundDetailsOfPendingPayouts(connection, property_id) {
    let sql = `SELECT id, amount
      FROM refunds WHERE type IN ('refund', 'chargeback', 'ach')
      AND payout_id = 1 AND payment_id IN 
      (SELECT id FROM payments WHERE property_id = ${property_id} 
        AND method IN ('card', 'ach'))`;
    console.log(sql);
    return connection.queryAsync(sql);
  },

  getAccountNumberOfTheProperty(connection, property_id) {
    let sql = `SELECT account_number
      FROM tenant_payments_applications
      WHERE property_id = ${property_id}`;
    return connection.queryAsync(sql);
  },

  createPayoutInfo(connection, transaction_id, amount, created, status, property_id, balance) {
    var data = {
			transaction_id: transaction_id,
			amount: amount,
			payout_date: created,
			status: status,
      property_id: property_id,
      gateway_balance: balance
		}
    let sql = `INSERT INTO payouts SET ?`;
    return connection.queryAsync(sql, data).then(result => result.insertId);
  },

  getPayoutInfo(connection, payout_id) {
    let sql = `SELECT * FROM payouts WHERE id = ${payout_id}`;
    return connection.queryAsync(sql);
  },

  updatePaymentsWithPayoutID(connection, payout_id, payment_id_list) {
    let sql = `UPDATE payments SET payout_id = ${payout_id}
    WHERE id IN (${payment_id_list})`;
    return connection.queryAsync(sql);
  },

  updateRefundsWithPayoutID(connection, payout_id, refund_id_list) {
    let sql = `UPDATE refunds SET payout_id = ${payout_id}
    WHERE id IN (${refund_id_list})`;
    return connection.queryAsync(sql);
  },

  getPayoutDelayData(connection, property_id, company_id, payout_date, endDate) {
    let sql = '';
    if (property_id && endDate) {
      sql = `SELECT property_id,transaction_id,amount,payout_date,status,name
          from
          (
          SELECT po.property_id, po.transaction_id, po.amount, max(po.payout_date) as payout_date, po.status, p.name,
           ROW_NUMBER() OVER (PARTITION BY po.property_id,date(po.payout_date) order by po.payout_date desc) AS rn
            FROM hummingbird.payouts as po inner join hummingbird.properties as p on po.property_id = p.id
      WHERE p.company_id = ${company_id} AND po.property_id = '${property_id}' and
      Date(po.payout_date) between '${payout_date}' AND '${endDate}' AND (po.property_id, DATE(po.payout_date)) NOT IN (
        SELECT po.property_id, DATE(payout_date)
        FROM hummingbird.payouts
        WHERE status = '00' and property_id = po.property_id)
      GROUP BY po.property_id, po.transaction_id, po.amount, po.status, p.name
      ORDER BY po.property_id
        ) as t
        where t.rn = 1;`;
    } else if (property_id && !endDate) {
      sql = `SELECT property_id,transaction_id,amount,payout_date,status,name
      from
      (
      SELECT po.property_id, po.transaction_id, po.amount, max(po.payout_date) as payout_date, po.status, p.name,
       ROW_NUMBER() OVER (PARTITION BY po.property_id,date(po.payout_date) order by po.payout_date desc) AS rn
        FROM hummingbird.payouts as po inner join hummingbird.properties as p on po.property_id = p.id
  WHERE p.company_id = ${company_id} AND po.property_id = '${property_id}' and
  Date(po.payout_date) = '${payout_date}' AND (po.property_id, DATE(po.payout_date)) NOT IN (
    SELECT po.property_id, DATE(payout_date)
    FROM hummingbird.payouts
    WHERE status = '00' and property_id = po.property_id)
  GROUP BY po.property_id, po.transaction_id, po.amount, po.status, p.name
  ORDER BY po.property_id 
    ) as t
    where t.rn = 1;`;
    } else if (endDate && !property_id) {
      sql = `SELECT property_id,transaction_id,amount,payout_date,status,name
      from
      (
      SELECT po.property_id, po.transaction_id, po.amount, max(po.payout_date) as payout_date, po.status, p.name,
       ROW_NUMBER() OVER (PARTITION BY po.property_id,date(po.payout_date) order by po.payout_date desc) AS rn
        FROM hummingbird.payouts as po inner join hummingbird.properties as p on po.property_id = p.id
  WHERE p.company_id = ${company_id} AND
  Date(po.payout_date) between '${payout_date}' AND '${endDate}' AND (po.property_id, DATE(po.payout_date)) NOT IN (
    SELECT po.property_id, DATE(payout_date)
    FROM hummingbird.payouts
    WHERE status = '00' and property_id = po.property_id)
  GROUP BY po.property_id, po.transaction_id, po.amount, po.status, p.name
  ORDER BY po.property_id
    ) as t
    where t.rn = 1;`;
    } else {
      sql = `SELECT property_id,transaction_id,amount,payout_date,status,name
      from
      (
      SELECT po.property_id, po.transaction_id, po.amount, max(po.payout_date) as payout_date, po.status, p.name,
       ROW_NUMBER() OVER (PARTITION BY po.property_id,date(po.payout_date) order by po.payout_date desc) AS rn
        FROM hummingbird.payouts as po inner join hummingbird.properties as p on po.property_id = p.id
  WHERE p.company_id = ${company_id} AND
  Date(po.payout_date) = '${payout_date}' AND (po.property_id, DATE(po.payout_date)) NOT IN (
    SELECT po.property_id, DATE(payout_date)
    FROM hummingbird.payouts
    WHERE status = '00' and property_id = po.property_id)
  GROUP BY po.property_id, po.transaction_id, po.amount, po.status, p.name
  ORDER BY po.property_id
    ) as t
    where t.rn = 1;`;
    }
    console.log('getPayoutDelayData', sql);
    return connection.queryAsync(sql);
  },
  getPreviousDateRecord(connection, property_id, payout_date,) {
    let sql = '';
    sql = `SELECT * FROM payouts as po
               WHERE po.property_id = '${property_id}' AND DATE(po.payout_date) = '${payout_date}' - INTERVAL 1 DAY
                AND (po.property_id, DATE(po.payout_date)) NOT IN (
                SELECT property_id, DATE(payout_date)
                FROM hummingbird.payouts
                WHERE status = '00' and property_id = po.property_id)`;
    console.log('getPayoutDelayData', sql);
    return connection.queryAsync(sql);
  },

    getComputePayoutRequiredForProperty(connection, company_id, property_id, table_name) {
      let sql = `SELECT compute_payout, send_email FROM tenant.${table_name} 
                    WHERE cid = ${company_id} AND property_id = ${property_id}`;
      console.log('getComputePayoutRequiredForProperty', sql);
      return connection.queryAsync(sql);
    }
};

module.exports = Payouts;

