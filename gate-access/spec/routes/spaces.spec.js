var request = require('request-promise');
const index = require('../index.js');
const enums = require('../enums.js');

test('Get all facilities for a company', async () => {
    var result = await request({ 
        
        uri: `${enums.host}/facilities/1/spaces`,
        method: 'GET',   
        json: true,
        headers: {
            'x-api-key': 'fac333'
        }
    });
    let expected = {
        "status": 200,
        "data": {
            spaces: [
                {
                  id: 1,
                  name: 'A1',
                  space_id: '1',
                  facility_id: '1',
                  status: '1',
                  active: 1,
                  access_area_id: null,
                  modified: '2021-10-24 17:59:36',
                  external_id: null,
                  Users: []
                }
              ]
        }
    }
    expect(result).toStrictEqual(expected)

  });