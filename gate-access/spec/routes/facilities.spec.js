var request = require('request-promise');
const index = require('../index.js');
const enums = require('../enums.js');
// beforeEach( async () => {
//     await index.createDatabase()
// }, 960000);   

test('Get all facilities for a company', async () => {
    var result = await request({ 
        
        uri: `${enums.host}/facilities`,
        method: 'GET',   
        json: true,
        headers: {
            'x-api-key': 'fac333'
        }
    });
    let expected = {
        "status": 200,
        "data": {
            "facilities": [
                {
                    "Credentials": {},
                    "GateConnection": {
                        "Credentials":  {},
                        "Groups":  {},
                        "Users":  {},
                        "facility_id": 1,
                        "gate_vendor_id": 0,
                        "id": "",
                        "logo": "",
                        "name": "",
                    },
                    "GateVendor":  [],
                    "Spaces":  [],
                    "Users":  [],
                    "active": 1,
                    "address": "100 main stree",
                    "address2": null,
                    "city": "Los Angeles",
                    "company_id": 1,
                    "description": "test description",
                    "external_id": null,
                    "facility_id": "1",
                    "gate_vendor_id": 7,
                    "id": 1,
                    "lat": null,
                    "lng": null,
                    "name": "Test Facility",
                    "state": "CA",
                    "zip": "90039",
            }
            ]
        }
    }
    expect(result).toStrictEqual(expected)

  });