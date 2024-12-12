var mysql       = require('mysql');
var Promise     = require('bluebird');
Promise.promisifyAll(require("mysql/lib/Connection").prototype);
Promise.promisifyAll(require("mysql/lib/Pool").prototype);

//var test = process.env.NODE_ENV == 'test';

var pool  = mysql.createPool({
	connectionLimit : 1000,
	host     : process.env.MYSQL_HOST,
	user     : process.env.MYSQL_USER,
	password : process.env.MYSQL_PASSWORD,
	database : process.env.MYSQL_DATABASE,
	dateStrings: true,
	multipleStatements: true
});
 
pool.on('connection', function (connection) {});

pool.on('enqueue', function () {});

pool.on('acquire', function (connection) { console.log('acquired', connection.threadId) });

pool.on('release', function (connection) { console.log('release', connection.threadId) });

module.exports = pool;
