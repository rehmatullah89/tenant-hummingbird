const UserService = require('../../services/userService.js');
var mysql       = require('mysql');
var Promise     = require('bluebird');
Promise.promisifyAll(require("mysql/lib/Connection").prototype);
Promise.promisifyAll(require("mysql/lib/Pool").prototype);
const pool = require('../../modules/db.js');

let connection
beforeAll(async () => {
    connection = await pool.getConnectionAsync();
})

test('test userService.find() find get one user', async () => {
    let user = new UserService({
        user_id: 2,
        facility_id: 1
    })

    await user.find(connection);

    let expected = new UserService({
        id: 1,
        user_id: "2",
        facility_id: 1,
        group_id: undefined,
        company_id: 1,
        pin: undefined,
        first: 'John',
        last: 'Adams',
        email: 'test@tenantinc.com',
        phone:  undefined,
        status: 'ACTIVE',
        external_id: undefined,
        modified: '2021-10-24 17:59:36',
        active: 1
    })

    expect(user).toStrictEqual(expected);

    
})

test('test userService.find() throw 404 error', async () => {
    let user = new UserService({
        user_id: 2222,
        facility_id: 1
    })
    
    try {
        await user.find(connection);
        throw new Error('user.find not supposed to pass')
    } catch (e) {
        expect(e.code).toEqual(404) 
    }    
})