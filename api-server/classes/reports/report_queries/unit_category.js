class unitQueries {
  constructor(data) {
    this.id = data.id;

    this.queries = {
      unit_category_id:  this.id,
      unit_category:    '(SELECT name from unit_categories where id = ' + this.id + ')',
    }
  }

}

module.exports = unitQueries;
