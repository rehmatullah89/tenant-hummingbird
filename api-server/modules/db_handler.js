var mysql       = require('mysql');
var Promise     = require('bluebird');
Promise.promisifyAll(require("mysql/lib/Connection").prototype);
Promise.promisifyAll(require("mysql/lib/Pool").prototype);
var e  = require(__dirname + '/./error_handler.js');
var w  = require(__dirname + '/./wrapper.js');

var AWS = require("aws-sdk");

console.log("process.env.NODE_ENV ", process.env.NODE_ENV )
if (process.env.NODE_ENV === 'local' || process.env.NODE_ENV === 'test') {
  AWS.config.update({
    region: process.env.AWS_REGION,
    endpoint: process.env.AWS_ENDPOINT
  });
}

var docClient = new AWS.DynamoDB.DocumentClient();
var ConnectionIterator = require(__dirname + '/./connection_iterator.js');

const databases = {};

const pgp = require('pg-promise') ({
  error(error, err) {
    console.log("e", err);
    if (err.cn) {
      // A connection-related error;
      //
      // Connections are reported back with the password hashed,
      // for safe errors logging, without exposing passwords.
      console.log('CN:', err.cn);
      console.log('EVENT:', error.message || error);
    }
  }
});

const { Pool } = require('pg');
const companies = require('../routes/companies');
const redshift_databases = {};

let propay_database = {};

let handler = {
  load: async () => {

  },

  initRedshift: async () => {

    try {
      let databases_scan = await docClient.scan({TableName: process.env.AWS_DYNAMO_REDSHIFT}).promise();
      for (let i = 0; i < databases_scan.Items.length; i++) {
        let db = databases_scan.Items[i];

        redshift_databases[db.name] = {
          name: db.name
        }
        redshift_databases[db.name].db = new Pool({
          user: db.user,
          database: db.database,
          password: db.password,
          port: db.port || 5439,
          host: db.hostname,
          max: 100
        });


        // redshift_databases[db.name].db.connect()
        //   .then(obj => {
        //     // Can check the server version here (pg-promise v10.1.0+):
        //     const serverVersion = obj.client.serverVersion;
        //     obj.done(); // success, release the connection;
        //   })
        //   .catch(error => {
        //     console.log('ERROR:', error.message || error);
        //   })
      }
    } catch (err) {
      console.log("Err", err)
    }

  },
  init: async () => {
    try {
      // PULL List of databases
      let databases_scan = await docClient.scan({TableName: process.env.AWS_DYNAMO_DATABASES}).promise();
      
      for(let i = 0; i < databases_scan.Items.length; i++){
        
        let db = databases_scan.Items[i];
      
        databases[db.name] = {
          name: db.name
        }

        databases[db.name].read_pool =  await mysql.createPool({
          connectionLimit : 500,
          host     : db.read_hostname,
          user     : db.user,
          password : db.password,
          dateStrings: true,
          multipleStatements: true,
          typeCast:function (field, next) {
            if (field.type === 'JSON') {
              return JSON.parse(field.string());
            } else {
              return next();
            }
          }
        });

        databases[db.name].write_pool =  await mysql.createPool({
          connectionLimit : 500,
          host     : db.write_hostname,
          user     : db.user,
          password : db.password,
          dateStrings: true,
          multipleStatements: true,
          typeCast:function (field, next) {
            if (field.type === 'JSON') {
              return JSON.parse(field.string());
            } else {
              return next();
            }
          }
        });
      }
      
    } catch(err){
      console.log("Err", err)
    }

  },
 
  init_propay_db: async () => {
    try {
      let databases_scan = await docClient.scan({TableName: process.env.AWS_DYNAMO_PROPAY}).promise();
      let db = databases_scan.Items[0];
      propay_database = {
        name: db.name
      }
      propay_database.read_pool =  await mysql.createPool({
        connectionLimit : 1,
        host     : db.host,
        user     : db.user,
        password : db.password,
        database : db.name,
        dateStrings: true,
        multipleStatements: true,
      });

    } catch(err){
      console.log("Err", err)
      //throw err
    }
  },

  get_propay_db_connection: async () => {
    let propay_connection = {};
    try{
      propay_connection = await propay_database.read_pool.getConnectionAsync();
    } catch (err){
      console.log("Error while getting connection ", err);
    }
    return propay_connection;
  },

  close_propay_db_connection: async(propay_connection) => {
    try {
          await propay_connection.release();
    }
    catch(err) {
      console.log("Error while closing ", err);
    }
  },

  getConnectionIterator: async (type = 'read') => {
    let companies = await handler.getAllCompanies();
    let ci = new ConnectionIterator(databases, companies, type);
    await ci.build();
    return ci;
  },
  exchangeForReadAccess: async (connection) => {
    let new_connection = await databases[connection.db].read_pool.getConnectionAsync();
    new_connection.cid =  connection.cid;
    new_connection.db = connection.db;
    new_connection.pool_type = 'read_pool';
    new_connection.collection = connection.collection;
    await new_connection.changeUser({database : new_connection.collection });
    await handler.closeConnection(connection);
    return new_connection; 
  }, 
  exchangeForWriteAccess: async (connection) => {
    let new_connection = await databases[connection.db].write_pool.getConnectionAsync();
    new_connection.cid =  connection.cid;
    new_connection.db = connection.db;
    new_connection.pool_type = 'write_pool';
    new_connection.collection = connection.collection;
    await new_connection.changeUser({database : new_connection.collection });
    await handler.closeConnection(connection);
    return new_connection; 

  }, 
  exchangeForReadAccess: async (connection) => {
    let new_connection = await databases[connection.db].read_pool.getConnectionAsync();
    new_connection.cid =  connection.cid;
    new_connection.db = connection.db;
    new_connection.pool_type = 'read_pool';
    new_connection.collection = connection.collection;
    await new_connection.changeUser({database : new_connection.collection });
    await handler.closeConnection(connection);
    return new_connection; 

  }, 
  wrapBeginTransaction: async (connection) => {
    if(!connection.wrapped) { 
      w.wrap(connection, 'beginTransactionAsync', async(connection, original, lock_func, params) => {
          console.log('Wrapper BeginTransaction');
          original();
          if(lock_func && params) {
            if(typeof lock_func === 'function') await lock_func(connection, params);
          }
      });

      connection.wrapped = true;
    }
  },

  // Removing the automatic separation of read and write databases
  // database handling will default to the write database, and routes can exchange the connection for read access at the route level. 
  getConnectionByDb:  async (method, database, collection) => {

    try {

      let connection = {};
      // switch(method){
      //   case "GET":
      //     connection = await databases[database].read_pool.getConnectionAsync();
      //     connection.db = database;
      //     connection.pool_type = 'read_pool';
      //     connection.collection = collection;
      //     await connection.changeUser({database : collection });
      //     break;
      //   case "POST":
      //   case "PUT":
      //   case "DELETE":
      //   case "PATCH":
      //   default:
          connection = await databases[database].write_pool.getConnectionAsync();
          connection.db = database;
          connection.pool_type = 'write_pool';
          connection.collection = collection;
          await connection.changeUser({database : collection });
          await handler.wrapBeginTransaction(connection);
         // break;
    //  }

      return connection ;
    } catch(err) {
      console.log("ERROR", err);
      throw err;
    }
  },

  /* TODO White/Blacklist certain routes if different access in needed */
  getConnection:  async (method, route, subdomain, company_id) => {

    let mapping = {};
    try {

      if(company_id){
        mapping = await handler.getMappingByCompanyId(company_id);
      } else if (subdomain){
        mapping = await handler.getMappingBySubdomain(subdomain);
      } else {
        e.th(400, "Invalid parameters");
      }
      
      let connection = {};

      connection = await databases[mapping.database].write_pool.getConnectionAsync();
      connection.cid = mapping.company_id;
      connection.db = mapping.database;
      connection.pool_type = 'write_pool';
      connection.collection = mapping.collection;
      await connection.changeUser({database : mapping.collection });
      await handler.wrapBeginTransaction(connection);

      return { connection, cid: mapping.company_id, local_company_id: mapping.hb_company_id } ;
    } catch(err) {
      console.log("ERROR", err);
      throw err;
    }
  },
  getConnectionByType:  async (type, subdomain, company_id) => {

    let mapping = {};

    if(company_id){

      mapping = await handler.getMappingByCompanyId(company_id);
    } else if (subdomain){
      mapping = await handler.getMappingBySubdomain(subdomain);
    } else {
      e.th(400, "Invalid parameters");
    }
    
    
    mapping.collection = process.env.NODE_ENV == 'test' ? 'test' : mapping.collection;
    
    let connection = {};
    switch (type) {
      case "read":
        connection = await databases[mapping.database].read_pool.getConnectionAsync();
        connection.cid = mapping.company_id;
        connection.db = mapping.database;
        connection.pool_type = 'read_pool';

        await connection.changeUser({database : mapping.collection });
        break;
      case "write":
    
        connection = await databases[mapping.database].write_pool.getConnectionAsync();
    
        connection.cid = mapping.company_id;
        connection.db = mapping.database;
        connection.pool_type = 'write_pool';
        await connection.changeUser({database : mapping.collection });
        break;
      default:
    }
    return connection;
  },
  closeConnection: async (connection) => {
    try {
      let pool_type = connection.pool_type;
      let db = connection.db;
      if(databases[db][pool_type]._freeConnections.indexOf(connection) < 0){
        await connection.release();
      }

    } catch(err) {
      console.log("this error happened", err);
    }

    // try {
    //   if(redshift){
    //     await redshift.release();
    //   }
    // } catch(err) {
    //   console.log("this error happened", err);
    // }
  },
  async getPoolInfo(pooltype, connection){
      let db = connection.db;
      return databases[db][pooltype];
  }
  ,
  async getMappingByCompanyId(company_id){
    
    let params = {
      TableName: process.env.AWS_DYNAMO_MAPPINGS,
      Key: {
        company_id: company_id
      }
    }
  
    let mapping =  await docClient.get(params).promise();
  
    if(!mapping.Item) e.th(500, "A configuration error occurred");
    return mapping.Item;
  },
  async getMappingBySubdomain(subdomain){
    let params = {
      TableName: process.env.AWS_DYNAMO_MAPPINGS,
      IndexName: 'subdomain_index',
      KeyConditionExpression: "subdomain = :v_subdomain",
      ExpressionAttributeValues: { ":v_subdomain": subdomain }
    }

    let mappings =  await docClient.query(params).promise();
    
    if(mappings.Items.length !== 1) e.th(500, "A configuration error occurred");
    return mappings.Items[0];
  },

  async saveCompany(data){
    return await docClient.put({
      TableName: process.env.AWS_DYNAMO_MAPPINGS,
      Item: data
    }).promise();
  },

  async getAllCompanies(subdomain){
    let companies_scan = await docClient.scan({
      TableName: process.env.AWS_DYNAMO_MAPPINGS,
      ScanIndexForward: false,
    }).promise();
    return companies_scan.Items;
  },
};


module.exports = handler;
