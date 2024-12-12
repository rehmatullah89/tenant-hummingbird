const PropertyRevenueManagement = require(`./generic_queries/property_revenue_management`);

class PropertyRentManagement extends PropertyRevenueManagement {
  constructor(data) {
    super(data);

    this.queries = {
      ...this.queries,
      spacegroup_rent_increase_plans: `(SELECT NULL)` //added to include a 'rent increase plan' button in client side data viewer
    }

  }

}

module.exports = PropertyRentManagement;