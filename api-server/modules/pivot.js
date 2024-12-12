var crossfilter = require("crossfilter2");

var Pivot = function (data, options) {

  var ndx = crossfilter(data);

  var pivotCol = options.column
  var pivotVal = options.value;
  var pivotRow = options.row;
  var pivotMetric = options.method || 'count';

  var out = [];


  let rows_group = data.map(d => d[pivotRow]);
  let cols_group = data.map(d => d[pivotCol]);

  let rows = [...new Set(rows_group)];
  let cols = [...new Set(cols_group)];

  let computed = []
  rows.forEach((row) => {
    let row_data = {};
    row_data[pivotRow] = row;
    cols.forEach(col => {
      row_data[col] = row_data[col] || 0;
      let filter_rows = data.filter((d, i) => d[pivotRow] === row && d[pivotCol] === col)
      filter_rows.map((d, i) => {
        console.log(pivotMetric);
        switch (pivotMetric.toLowerCase()) {
          case 'avg':
          case 'sum':
            row_data[col] += d[pivotVal];
            break;
          case 'lowest':
            row_data[col] = row_data[col] === 0 || row_data[col] > d[pivotVal] ? d[pivotVal] : row_data[col];
            break;
          case 'highest':
            row_data[col] = row_data[col] < d[pivotVal] ? d[pivotVal] : row_data[col];
            break;
          case 'earliest':
            row_data[col] = row_data[col] === 0 || row_data[col] > d[pivotVal] ? d[pivotVal] : row_data[col];
            break;
          case 'latest':
            row_data[col] = row_data[col] === 0 || row_data[col] < d[pivotVal] ? d[pivotVal] : row_data[col];
            break;
          case 'count':
            row_data[col]++;
            break;
        }
      });
      if (pivotMetric.toLowerCase() === 'avg') {
        row_data[col] = (row_data[col] / filter_rows.length) || 0;
      }
    });

    computed.push(row_data)
  });
  console.log(computed)

  return computed;


}




module.exports = Pivot;
