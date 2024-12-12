var AWS = require("aws-sdk");

if (process.env.NODE_ENV === 'local' || process.env.NODE_ENV === 'test') {
  AWS.config.update({
    region: process.env.AWS_REGION,
    endpoint: process.env.AWS_ENDPOINT
  });
}

var dynamodb = new AWS.DynamoDB();
var docClient = new AWS.DynamoDB.DocumentClient();

var databases_dev = {
    TableName : "databases_dev",
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

var mappings_dev = {
    TableName : "mappings_dev",
    KeySchema: [
        { AttributeName: "company_id", KeyType: "HASH"},
    ],
    AttributeDefinitions: [
        { AttributeName: "company_id", AttributeType: "N"},
    ],
    ProvisionedThroughput: {
        ReadCapacityUnits: 10,
        WriteCapacityUnits: 10
    }
};

var databases_data = [
        {
            TableName: 'databases_dev',
            Item: {
                "name": 'local',
                "user" : "hb",
                "password" : "b",
                "read_hostname": "mysql",
                "write_hostname": "mysql"
            }
        },
        {
            TableName: 'databases_dev',
            Item: {
                name: 'uat',
                user : "hb",
                password : "b",
                read_hostname: "mysql",
                write_hostname: "mysql"
            }
        },
];


var get_data = [
    {
        TableName: 'databases_dev',
        Key: {
            "name": 'local'
        }
    },
    {
        TableName: 'databases_dev',
        Item: {
            name: 'uat'
        }
    },
];


var mappings_data = [
    {
        TableName: 'mappings_dev',
        Item: {
            database: 'local',
            company_id : 1,
            subdomain: 'sandbox',
            collection: 'hummingbird'
        }
    },
    {
        TableName: 'mappings_dev',
        Item: {
            database: 'uat',
            company_id : 9,
            subdomain: 'platinum',
            collection: 'hummingbird'
        }
    },
];

var get_mappings_data = [
    {
        TableName: 'mappings_dev',
        Key: {
            company_id: 1
        }
    },
    {
        TableName: 'mappings_dev',
        Key: {
            company_id: 9
        }
    },
];



const run = async () => {
    try {
        const first_results = await dynamodb.createTable(databases_dev).promise();
        const second_results = await dynamodb.createTable(mappings_dev).promise();
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
