var AWS = require("aws-sdk");

if (process.env.NODE_ENV === 'local' || process.env.NODE_ENV === 'test') {
    AWS.config.update({
      region: process.env.AWS_REGION,
      endpoint: process.env.AWS_ENDPOINT
    });
  }

var dynamodb = new AWS.DynamoDB();
var docClient = new AWS.DynamoDB.DocumentClient();

var databases_test = {
    TableName : "$AWS_DYNAMO_DATABASES",
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

var mappings_test = {
    TableName : "$AWS_DYNAMO_MAPPINGS",
    KeySchema: [
        { AttributeName: "company_id", KeyType: "HASH"},
    ],
    AttributeDefinitions: [
        { AttributeName: "company_id", AttributeType: "N"},
        {AttributeName: "subdomain", AttributeType: "S"},
    ],
    GlobalSecondaryIndexes: [
        {
            "IndexName": "subdomain_index",
            "KeySchema": [
                {"AttributeName":"subdomain","KeyType":"HASH"}
            ],
            "Projection": {
                "ProjectionType":"ALL"
            },
            "ProvisionedThroughput": {
                "ReadCapacityUnits": 5,
                "WriteCapacityUnits": 5
            },
        },
    ],
    ProvisionedThroughput: {
        ReadCapacityUnits: 10,
        WriteCapacityUnits: 10
    }
};

var databases_data = [
        {
            TableName: '$AWS_DYNAMO_DATABASES',
            Item: {
                "name": 'local',
                "user" : "$TEST_USER",
                "password" : "$TEST_PASSWORD",
                "read_hostname": "mysql",
                "write_hostname": "mysql"
            }
        },
        {
            TableName: '$AWS_DYNAMO_DATABASES',
            Item: {
                name: '$NAME',
                user : "$TEST_USER",
                password : "$TEST_PASSWORD",
                read_hostname: "mysql",
                write_hostname: "mysql"
            }
        },
];


var get_data = [
    {
        TableName: '$AWS_DYNAMO_DATABASES',
        Key: {
            "name": 'local'
        }
    },
    {
        TableName: '$AWS_DYNAMO_DATABASES',
        Item: {
            name: '$NAME'
        }
    },
];


var mappings_data = [
    {
        TableName: '$AWS_DYNAMO_MAPPINGS',
        Item: {
            database: 'local',
            company_id : 1,
            subdomain: 'sandbox',
            collection: 'hummingbird'
        }
    },
    {
        TableName: '$AWS_DYNAMO_MAPPINGS',
        Item: {
            database: '$DATABASE',
            company_id : 9,
            subdomain: 'platinum',
            collection: 'hummingbird'
        }
    },
];

var get_mappings_data = [
    {
        TableName: '$AWS_DYNAMO_MAPPINGS',
        Key: {
            company_id: 1
        }
    },
    {
        TableName: '$AWS_DYNAMO_MAPPINGS',
        Key: {
            company_id: 9
        }
    },
];



const run = async () => {
    try {
        const first_results = await dynamodb.createTable(databases_test).promise();
        const second_results = await dynamodb.createTable(mappings_test).promise();
        const put_query1 = await docClient.put(databases_data[0]).promise();
        const put_query2 = await docClient.put(databases_data[1]).promise();
        //
        const put_query3 = await docClient.put(mappings_data[0]).promise();
        const put_query4 = await docClient.put(mappings_data[1]).promise();
        //
        // const get_query = await docClient.get(get_data[0]).promise();
        // const get_query2 = await docClient.get(get_mappings_data[0]).promise();
        // const get_query3 = await docClient.get(get_mappings_data[1]).promise();

        // console.log(JSON.stringify(get_query2, null, 2));
        // console.log(JSON.stringify(get_query3, null, 2));


    } catch (err) {
        console.error("ERROR:",  JSON.stringify(err, null, 2));
    }
};


run();
