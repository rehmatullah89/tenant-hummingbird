
class ReportQueries {

  constructor(){
      this.property_id = '';
      this.unit_id = '';
      this.lease_id = '';
      this.tenant_id = '';
      this.contact_id = '';
      this.property_address_id = '';
      this.category_id = '';

      this.queries = {
        property: (field) => this.build(field, 'properties', 'id', '=', this.property_id),
        property_address: (field) => this.build(field, 'addresses', 'id', '=', this.property_address_id),
        unit: (field) => this.build(field, 'units', 'id', '=', this.unit_id),
        tenant: (field) => this.build(field, 'contacts', 'id', '=', this.contact_id),
        category: (field) => this.build(field, 'unit_categories', 'id', '=', this.category_id),
      }
  }
  build(field, table, fkey = 'id', comp = '=', val ){
    return `(select ${field} from ${table} where ${table}.${fkey} ${comp} ${val}) ` ;
  }
  property(fields){
    let obj = {};
    fields.forEach(f => {
      obj[f] =  this.queries.property(f.split('_')[1])
    });
    return obj
  }
  unit(fields){
    let obj = {};
    fields.forEach(f => {
      if(f === 'unit_available_date'){
        obj[f] =  this.queries.unit('available_date');
      } else if(f === 'unit_category'){
        obj[f] =  this.queries.category('name');
      } else {
        obj[f] =  this.queries.unit(f.split('_')[1])
      }
    });
    return obj
  }
  unit_summary(fields){
    let obj = {};
    fields.forEach(f => {
      if(f === 'unit_rent_variance'){
        obj[f] =  this.queries.unit('available_date');
      }
    });
    return obj

  }

}


module.exports = ReportQueries;
