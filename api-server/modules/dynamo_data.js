var AWS = require("aws-sdk");

if (process.env.NODE_ENV === 'local' || process.env.NODE_ENV === 'test') {
  AWS.config.update({
    region: process.env.AWS_REGION,
    endpoint: process.env.AWS_ENDPOINT
  });
}

var dynamodb = new AWS.DynamoDB();
var docClient = new AWS.DynamoDB.DocumentClient();

var propay_dev = {
  TableName : process.env.AWS_DYNAMO_PROPAY,
  KeySchema: [
    { AttributeName: "name", KeyType: "HASH"}
  ],
  AttributeDefinitions: [
    { AttributeName: "name", AttributeType: "S" },
  ],
  ProvisionedThroughput: {
    ReadCapacityUnits: 10,
    WriteCapacityUnits: 10
  }
};

var databases_dev = {
  TableName : process.env.AWS_DYNAMO_DATABASES,
  KeySchema: [
    { AttributeName: "name", KeyType: "HASH"}
  ],
  AttributeDefinitions: [
    { AttributeName: "name", AttributeType: "S" },
  ],
  ProvisionedThroughput: {
    ReadCapacityUnits: 10,
    WriteCapacityUnits: 10
  }
};

var redshift_dev = {
  TableName : process.env.AWS_DYNAMO_REDSHIFT,
  KeySchema: [
    { AttributeName: "name", KeyType: "HASH"}
  ],
  AttributeDefinitions: [
    { AttributeName: "name", AttributeType: "S" },
  ],
  ProvisionedThroughput: {
    ReadCapacityUnits: 10,
    WriteCapacityUnits: 10
  }
};

var invoices_dev = {
  TableName : process.env.AWS_DYNAMO_INVOICES,
  KeySchema: [
    { AttributeName: "created_at", KeyType: "HASH"}
  ],
  AttributeDefinitions: [
    { AttributeName: "created_at", AttributeType: "N" },
    { AttributeName: "type", AttributeType: "S"}
  ],
  ProvisionedThroughput: {
    ReadCapacityUnits: 10,
    WriteCapacityUnits: 10
  },
  GlobalSecondaryIndexes: [
    {
      IndexName: 'type_index',
      KeySchema: [
        {
          AttributeName: 'type',
          KeyType: 'HASH',
        }
      ],
      Projection: {
        "ProjectionType": "ALL"
      },
      ProvisionedThroughput: {
        ReadCapacityUnits: 10,
        WriteCapacityUnits: 10
      },
    }
  ]
};

var mappings_dev = {
  TableName : process.env.AWS_DYNAMO_MAPPINGS,
  KeySchema: [
    { AttributeName: "company_id", KeyType: "HASH"}
  ],
  AttributeDefinitions: [
    { AttributeName: "company_id", AttributeType: "N"},
    { AttributeName: "subdomain", AttributeType: "S"}
  ],
  ProvisionedThroughput: {
    ReadCapacityUnits: 10,
    WriteCapacityUnits: 10
  },
  GlobalSecondaryIndexes: [
    {
      IndexName: 'subdomain_index',
      KeySchema: [
        {
          AttributeName: 'subdomain',
          KeyType: 'HASH',
        }
      ],
      Projection: {
        "ProjectionType": "ALL"
      },
      ProvisionedThroughput: {
        ReadCapacityUnits: 10,
        WriteCapacityUnits: 10
      },
    }
  ]
};

var admins_dev = {
  TableName : process.env.AWS_DYNAMO_ADMINS,
  KeySchema: [
    { AttributeName: "email", KeyType: "HASH"}
  ],
  AttributeDefinitions: [
    { AttributeName: "email", AttributeType: "S"}
  ],
  ProvisionedThroughput: {
    ReadCapacityUnits: 10,
    WriteCapacityUnits: 10
  }
};


var script_jobs_dev = {
  TableName: process.env.AWS_SCRIPT_JOBS,
  KeySchema: [
    { AttributeName: "id", KeyType: "HASH" }
  ],
  AttributeDefinitions: [
    { AttributeName: "id", AttributeType: "S" },
  ],
  ProvisionedThroughput: {
    ReadCapacityUnits: 10,
    WriteCapacityUnits: 10
  }
};


var databases_data = [
  {
    TableName: process.env.AWS_DYNAMO_DATABASES,
    Item: {
      name: 'local',
      user : "hb",
      password : "b",
      read_hostname: "mysql",
      write_hostname: "mysql",
      redshift_hostname: "redshift"
    }
  },
  // {
  //   TableName: process.env.AWS_DYNAMO_DATABASES,
  //   Item: {
  //     name: 'dev',
  //     read_hostname: 'hummingbird-dev.crn4oqw9fes3.us-east-1.rds.amazonaws.com',
  //     password: 'manonfire&99',
  //     write_hostname: 'hummingbird-dev.crn4oqw9fes3.us-east-1.rds.amazonaws.com',
  //     user: 'admin',
  //     redshift_hostname: 'redshift'
  //   }
  // },
  // {
  //   TableName: process.env.AWS_DYNAMO_DATABASES,
  //   Item: {
  //     name: 'uat',
  //     read_hostname: 'hummingbird-uat.crn4oqw9fes3.us-east-1.rds.amazonaws.com',
  //     password: 'manonfire&99',
  //     write_hostname: 'hummingbird-uat.crn4oqw9fes3.us-east-1.rds.amazonaws.com',
  //     user: 'admin',
  //     redshift_hostname: 'redshift'
  //   }
  // },
  // {
  //   TableName: process.env.AWS_DYNAMO_DATABASES,
  //   Item: {
  //     name: 'staging',
  //     read_hostname: 'hummingbird-staging.crn4oqw9fes3.us-east-1.rds.amazonaws.com',
  //     password: 'manonfire&99',
  //     write_hostname: 'hummingbird-staging.crn4oqw9fes3.us-east-1.rds.amazonaws.com',
  //     user: 'admin',
  //     redshift_hostname: 'redshift'
  //   }
  // },
  // {
  //   TableName: process.env.AWS_DYNAMO_DATABASES,
  //   Item: {
  //     name: 'production',
  //     read_hostname: 'hummingbird-prod.crn4oqw9fes3.us-east-1.rds.amazonaws.com',
  //     password: 'manonfire&99',
  //     write_hostname: 'hummingbird-prod.crn4oqw9fes3.us-east-1.rds.amazonaws.com',
  //     user: 'admin',
  //     redshift_hostname: 'redshift'
  //   }
  // }
];

var redshift_data = [
  {
    TableName: process.env.AWS_DYNAMO_REDSHIFT,
    Item: {
      name: 'UAT Redshift 1',
      user : "admin",
      password : "Manonfire&99",
      hostname: "hummingbird-reporting-dev.cqaqrtxgm1vs.us-east-1.redshift.amazonaws.com",
      database: "hummingbird"
    }
  },

]
var mappings_data = [
  {
    TableName: process.env.AWS_DYNAMO_MAPPINGS,
    Item: {
      company_id : 1,
      hb_company_id: 1,
      database: 'local',
      redshift: 'UAT Redshift 1',
      gds_owner_id: "fac9d40739e0ad056669f8905e60760571a",
      name: "Sandbox",
      redshift_schema: 'hummingbird',
      subdomain: 'sandbox',
      collection: process.env.MYSQL_DATABASE,
      namespace: 'default'
    }
  },
  {
    TableName: process.env.AWS_DYNAMO_MAPPINGS,
    Item: {
      database: 'local',
      company_id : 2,
      hb_company_id: 9,
      name: "Platinum",
      subdomain: 'platinum',
      collection: 'hummingbird',
      namespace: 'beta'
    }
  },
];

var admin_data = [
  {
    TableName: process.env.AWS_DYNAMO_ADMINS,
    Item: {
      admin_id: 1,
      first: 'jeff',
      last: 'Ryan',
      email: 'jeff@h6design.com',
      
      password: '87356f88e1edbae82d939b454f80e7182b0eb017f9ca17212af0e957db42dc10',
      // password: '2d65bf56400bb453531eb6079a401d2f2bb9b42b8d3da71170da74f82334d943',
      superadmin: true
    }
  }
];

var propay_data = [
  {
    TableName: process.env.AWS_DYNAMO_PROPAY,
    Item: {
      host: 'mysql',
      name: 'local',
      user: 'hb',
      password: 'b'
    }
  }
];

const init = async () => {

  try {

    console.log("createTable!!", admins_dev)
    
    await dynamodb.createTable(admins_dev).promise();
    await dynamodb.createTable(invoices_dev).promise();
  
    await dynamodb.createTable(databases_dev).promise();
    await dynamodb.createTable(mappings_dev).promise();
    await dynamodb.createTable(script_jobs_dev).promise();

    await dynamodb.createTable(propay_dev).promise();
	
    for(let i = 0; i < admin_data.length;i++){
      await docClient.put(admin_data[i]).promise();
    }

    for(let i = 0; i < databases_data.length;i++){
      await docClient.put(databases_data[i]).promise();
    }
    for(let i = 0; i < mappings_data.length;i++){
      await docClient.put(mappings_data[i]).promise();
    }

    for(let i = 0; i < propay_data.length;i++){
      await docClient.put(propay_data[i]).promise();
    }

    if(process.env.NODE_ENV !== "local" && process.env.NODE_ENV !== "test"){
      await dynamodb.createTable(redshift_dev).promise();
      for(let i = 0; i < redshift_data.length;i++){
        await docClient.put(redshift_data[i]).promise();
      }
    }

  } catch (err) {
    console.log("here");
    console.error("ERROR:",  JSON.stringify(err, null, 2));
  }

  // try{
  //   let m = await getMappingByCompanyId(1);
  //   console.log("m", m);
  //   let m2 = await getMappingByCompanyId(2);
  //   console.log("m2", m2);
  //   let m3 = await getMappingBySubdomain('sandbox');
  //   console.log("m3", m3);
  //   let m4 = await getMappingBySubdomain('platinum');
  //   console.log("m4", m4);
  // } catch (err) {
  //   console.error("ERROR:",  JSON.stringify(err, null, 2));
  //   console.error(err.stack);
  // }

}

//
// const getMappingByCompanyId = async (company_id) => {
//   let params = {
//     TableName: process.env.AWS_DYNAMO_MAPPINGS,
//     Key: {
//       company_id: company_id
//     }
//   }
//   let mapping =  await docClient.query(params).promise();
//   if(!mapping.Item) e.th(500, "A configuration error occurred");
//   return mapping.Item;
// }
//
// const getMappingBySubdomain = async (subdomain) =>{
//   let params = {
//     TableName: process.env.AWS_DYNAMO_MAPPINGS,
//     IndexName: 'subdomain_index',
//     KeyConditionExpression: "subdomain = :v_subdomain",
//     ExpressionAttributeValues: { ":v_subdomain": subdomain }
//   }
//
//   let mappings =  await docClient.get(params).promise();
//   if(mappings.Items.length !== 1) e.th(500, "A configuration error occurred");
//   return mappings.Items[0];
// }


module.exports = {
  init
};
