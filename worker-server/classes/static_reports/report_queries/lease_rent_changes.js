class LeaseRentChangeQueries {
    constructor(data) {
      this.leaseId = data.id;
      this.property_id = data.property_id
    
      this.queries = {

        lease_id: this.leaseId,
        rentchange_property_id: this.property_id,
        property_name: `p.name`,
        tenant_name: `( 
          SELECT CONCAT(c.\`first\`, ' ', c.\`last\`)
          FROM contacts c
          JOIN contact_leases cl ON cl.contact_id = c.id AND cl.primary = 1
          WHERE cl.lease_id = l.id
          ORDER BY c.id ASC
          LIMIT 1
        )`,
        unit_number: `(u.number)`,
        current_rent: `(
          SELECT s.price
          FROM services s 
          JOIN products p ON 
            s.product_id = p.id AND
            p.default_type = 'rent'
          WHERE
            s.lease_id = l.id AND
            s.status = 1 AND
            s.start_date < CURDATE() AND 
            (
              s.end_date IS NULL OR
              s.end_date >= CURDATE()     
            )
          ORDER BY start_date DESC 
          LIMIT 1
        )`,
        rentchange_effective_date: `(
          SELECT DATE_FORMAT(lrr.effective_date, '%Y-%m-%d')
          FROM lease_rent_changes lrr
          WHERE 
            lrr.lease_id = l.id AND
            lrr.status IN ('initiated','approved') AND
            lrr.effective_date > CURDATE() AND 
            lrr.deleted_at IS NULL
          ORDER BY lrr.effective_date DESC
          LIMIT 1
        )`,
        tenant_new_rent: `(
          SELECT new_rent_amt
          FROM lease_rent_changes lrr 
          WHERE
            lrr.lease_id =  l.id  AND
            lrr.status IN ('initiated','approved') AND
            lrr.effective_date > CURDATE() AND 
            lrr.deleted_at IS NULL
          ORDER BY lrr.effective_date
          ASC LIMIT 1
        )`
      }
    }
  }
  
  module.exports = LeaseRentChangeQueries;
  
  
  