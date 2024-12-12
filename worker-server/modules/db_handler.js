var mysql       = require('mysql');
var Promise     = require('bluebird');
Promise.promisifyAll(require("mysql/lib/Connection").prototype);
Promise.promisifyAll(require("mysql/lib/Pool").prototype);
var e  = require('./error_handler.js');
var AWS = require("aws-sdk");
if (process.env.NODE_ENV === 'local') {
  AWS.config.update({
    region: process.env.AWS_REGION,
    endpoint: process.env.AWS_ENDPOINT
  });
}

var docClient = new AWS.DynamoDB.DocumentClient();
var ConnectionIterator = require(__dirname + '/./connection_iterator.js');

const databases = {};
let propay_database = {};

let handler = {
  load: async () => {

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
          connectionLimit : 50,
          host     : db.read_hostname,
          user     : db.user,
          password : db.password,
          dateStrings: true,
          multipleStatements: true
        });

        databases[db.name].write_pool =  await mysql.createPool({
          connectionLimit : 50,
          host     : db.write_hostname,
          user     : db.user,
          password : db.password,
          dateStrings: true,
          multipleStatements: true
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
      console.log("Err in init_propay_db ", err)
    }
  },

  get_propay_db_connection: async () => {
    let propay_connection = {};
    try{
      propay_connection = await propay_database.read_pool.getConnectionAsync();
    } catch (err){
      console.log("Error while getting propay db connection ", err);
    }
    return propay_connection;
  },

  close_propay_db_connection: async(propay_connection) => {
    try {
          await propay_connection.release();
    }
    catch(err) {
      console.log("Error while closing propay db connection ", err);
    }
  },

  getConnectionIterator: async (type = 'read') => {
    let companies = await handler.getAllCompanies();
    let ci = new ConnectionIterator(databases, companies, type);
    await ci.build();
    return ci;

  },
  getConnectionIteratorWithContinue: async (type = 'read') => {
    let companies = await handler.getAllCompanies();
    let ci = new ConnectionIterator(databases, companies, type);
    await ci.buildWithContinue();
    return ci;
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
      switch(method){
        case "GET":
          connection = await databases[mapping.database].read_pool.getConnectionAsync();
          connection.cid = mapping.company_id;
          connection.db = mapping.database;
          connection.pool_type = 'read_pool';
          await connection.changeUserAsync({database : mapping.collection });
          break;
        case "POST":
        case "PUT":
        case "DELETE":
        case "PATCH":
        default:
          connection = await databases[mapping.database].write_pool.getConnectionAsync();
          connection.cid = mapping.company_id;
          connection.db = mapping.database;
          connection.pool_type = 'write_pool';
          await connection.changeUserAsync({database : mapping.collection });
          break;
      }

      let redshift = null;

      return { connection, cid: mapping.company_id, redshift, local_company_id: mapping.hb_company_id } ;
    } catch(err) {
      console.log("ERROR", err);
      throw err;
    }
  },
  getConnectionByDBName: async (type, database_name, schema_name, log) => {
    let connection = {};
    try {
      if(!handler.isDatabaseExist(database_name))
        e.th(404, `Database with name '${database_name}' does not found.`)

        switch (type) {
        case "read":
          connection = await databases[database_name].read_pool.getConnectionAsync();
  
          connection.pool_type = 'read_pool';
          break;
        case "write":
          connection = await databases[database_name].write_pool.getConnectionAsync();
  
          connection.pool_type = 'write_pool';
          break;
      }
  
      connection.db = database_name;
      if (schema_name) {
        try {
          await connection.changeUserAsync({ database: schema_name });
  
        } catch (err) {
          console.log("Change user err", err);
        }
        if(!connection.config.database){
          throw "no database selected: " + log + " " + connection.threadId
        };
      }

      return connection;

    } catch (err) {
      console.log("ERROR", err);
      throw err;
    }

  },

  isDatabaseExist(db_name){
    if(Object.keys(databases).length === 0)
      return false;
    return Object.keys(databases).find(db => db === db_name);
  },

  getConnectionByType:  async (type, cid, subdomain, log) => {
    let mapping = {};
    if(cid){
      mapping = await handler.getMappingByCompanyId(cid);
    } else if (subdomain){
      mapping = await handler.getMappingBySubdomain(subdomain);
    } else {
      e.th(400, "Invalid parameters");
    }


    let connection = {};
    switch (type) {
      case "read":
        console.log('mapping', mapping)
        connection = await databases[mapping.database].read_pool.getConnectionAsync();

        connection.cid = mapping.company_id;
        connection.db = mapping.database;
        connection.pool_type = 'read_pool';
        try {

          await connection.changeUserAsync({database : mapping.collection });
        } catch(err) {
          console.log("Change user err", err);
        }
        break;
      case "write":
        connection = await databases[mapping.database].write_pool.getConnectionAsync();

        connection.cid = mapping.company_id;
        connection.db = mapping.database;
        connection.pool_type = 'write_pool';
        try {
          await connection.changeUserAsync({database : mapping.collection });

        } catch(err) {
          console.log("Change user err", err);
        }
        break;
      default:
    }
    // await new Promise(resolve => setTimeout(resolve, 1000));

    if(!connection.config.database){
      throw "no database selected: " + log + " " + connection.threadId
    };

    return connection;
  },

  closeConnection: async (connection) =>{
    try {

      let pool_type = connection.pool_type;
      let db = connection.db;
      console.log("Closing Connection", connection.threadId);
      if(databases[db][pool_type]._freeConnections.indexOf(connection) < 0){
        await connection.release();
      } else {
        return Promise.resolve();
      }
    } catch(err) {
      console.log("this error happened", err);
    }

  },

  async getDatabaseSchemas(connection, db_name){
    let db_schemas = await models.DB.getDatabaseSchemas(connection);
    db_schemas = db_schemas.map(sh => sh.Database);
    console.log(`Schemas for DB ${db_name}`, db_schemas);
    return db_schemas;
  },

  async getMappingByCompanyId(company_id){

    let params = {
      TableName: process.env.AWS_DYNAMO_MAPPINGS,
      Key: {
        company_id: company_id
      } 
    }
    
      let mapping = await docClient.get(params).promise();
    
    if(!mapping.Item) e.th(500, "A configuration error occurred");
    return mapping.Item;
  },

  async getAdminByEmail(email){
    let params = {
      TableName: process.env.AWS_DYNAMO_ADMINS,
      Key: {
        email: email
      }
    }
    let admin =  await docClient.get(params).promise();
    
    if(!admin.Item) e.th(404, "Admin not found");
    return admin.Item;
  },

  async getDatabaseByName(name){
    let params = {
      TableName: process.env.AWS_DYNAMO_DATABASES,
      Key: {
        name: name
      }
    }
    let database =  await docClient.get(params).promise();
    console.log("database", database)
    if(!database.Item) e.th(404, "Database not found");
    return database.Item;
  },

  async getRedshiftDatabaseByName(name){
    let params = {
      TableName: process.env.AWS_DYNAMO_REDSHIFT,
      Key: {
        name: name
      }
    }
    let database =  await docClient.get(params).promise();
    console.log("database", database);
    if(!database.Item) e.th(404, "Database not found");
    return database.Item;
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

  async getAllCompanies(subdomain){
    let companies_scan = await docClient.scan({
      TableName: process.env.AWS_DYNAMO_MAPPINGS,
      ScanIndexForward: false,
    }).promise();
    return companies_scan.Items;
  },

  async getCompaniesByNamespace(){
    let companies_scan = await docClient.scan({
      TableName: process.env.AWS_DYNAMO_MAPPINGS,
      ScanIndexForward: false,
      FilterExpression : `namespace=:namespace`,
      ExpressionAttributeValues : {':namespace' : process.env.NAMESPACE}
    }).promise();
    return companies_scan.Items;
  },

  async getAllAdmins(){
    let admin_scan = await docClient.scan({TableName: process.env.AWS_DYNAMO_ADMINS}).promise();
    return admin_scan.Items;
  },

  async getAllDatabases(){
    let db_scan = await docClient.scan({TableName: process.env.AWS_DYNAMO_DATABASES}).promise();
    return db_scan.Items;
  },

  async getAllRedshiftDatabases(){
   
    let db_scan = await docClient.scan({TableName: process.env.AWS_DYNAMO_REDSHIFT}).promise();
   
    return db_scan.Items;
  },

  async getAllScriptJobs() {
    let db_scan = await docClient.scan({ TableName: process.env.AWS_SCRIPT_JOBS }).promise();
    return db_scan.Items;
  },

  async addScripJobs(data) {
    let res = await docClient.put({
      TableName: process.env.AWS_SCRIPT_JOBS,
      Item: data
    }).promise();

    return res;
  },

  async updateScriptJob(id, update_params = {}) {
    if (!update_params || Object.keys(update_params).length === 0) e.th(400, 'No update_params provided.');
    let UpdateExpression = 'set ', ExpressionAttributeValues = {};

    Object.keys(update_params).forEach((key, index, keys) => {
      UpdateExpression += `${key} = :${key}${index !== keys.length - 1 ? ', ' : ''} `;
      ExpressionAttributeValues[`:${key}`] = update_params[key];
    });

    let res = await docClient.update({
      TableName: process.env.AWS_SCRIPT_JOBS,
      Key: {
        'id': id
      },
      UpdateExpression,
      ExpressionAttributeValues,
      ReturnValues: 'ALL_NEW'
    }).promise();

    return res;
  },

  async deleteScripJobById(id) {
    let res = await docClient.delete({
      TableName: process.env.AWS_SCRIPT_JOBS,
      Key: {
        'id': id
      }
    }).promise();

    return res;

  },

  async saveCompany(data, id){

    if(id){

    } else {

      return await docClient.put({
        TableName: process.env.AWS_DYNAMO_MAPPINGS,
        Item: data
      }).promise();
    }
  },

  async saveAdmin(data, id){

    return await docClient.put({
      TableName: process.env.AWS_DYNAMO_ADMINS,
      Item: data
    }).promise();

  },

  async saveDatabase(data, id){
    return await docClient.put({
      TableName: process.env.AWS_DYNAMO_DATABASES,
      Item: data
    }).promise();
  },

  async saveRedshiftDatabase(data, id){
    return await docClient.put({
      TableName: process.env.AWS_DYNAMO_REDSHIFT,
      Item: data
    }).promise();
  },


  async saveData(data){
    console.log("data", data);
    try {
      let response = await docClient.put({
        TableName: process.env.AWS_DYNAMO_INVOICES,
        Item: data
      }).promise();
      console.log(response);
      return response;
    } catch(err){
      console.log("Error saving logs:", err);
      return;
    }
  },


  async getLogs(type){

    let query = {
      TableName: process.env.AWS_DYNAMO_INVOICES,
      IndexName: 'record_type_index',
      KeyConditionExpression: "#record_type=:record_type",
      ExpressionAttributeNames: {
        "#record_type": "record_type",
      },
      ExpressionAttributeValues: {
        ":record_type": type
      },
      ScanIndexForward: false,
    };

    let queryResults = [];
    let items;
    do{
        items = await docClient.query(query).promise();
        items.Items.forEach((item) => queryResults.push(item));
        query.ExclusiveStartKey  = items.LastEvaluatedKey;
    }while(typeof items.LastEvaluatedKey != "undefined");

    console.log(`Logs to fetch for type: ${type}`);
    console.log(`Query: ${JSON.stringify(query)}`);

    return queryResults;
  },

  async deleteLogs(type, created_at){
    var params = {
      TableName: process.env.AWS_DYNAMO_INVOICES,
      Key:{
        "created_at": parseInt(created_at),
        // "type": type
      }
    };

    console.log("Attempting a conditional delete...", params);
    docClient.delete(params, function(err, data) {
      if (err) {
        console.error("Unable to delete item. Error JSON:", JSON.stringify(err, null, 2));
      } else {
        console.log("DeleteItem succeeded:", JSON.stringify(data, null, 2));
      }
    });
  }


};


module.exports = handler;
const models = require('../models');