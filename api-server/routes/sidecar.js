const express = require("express");
const router = express.Router();

let Hash = require('../modules/hashes');
let Hashes = Hash.init();
let control = require('../modules/site_control');
let utils = require('../modules/utils');
let dbHandler = require('../modules/db_handler');
let e = require("../modules/error_handler.js");
const moment = require("moment");

const POOL_TYPE = {
    READ_POOL : "read_pool",
    WRITE_POOL: "write_pool"
}

module.exports = function(app, sockets){
    router.get("/connectionpool", [control.hasAccess(["admin"]), Hash.unHash],
    async (req, res, next) =>{
        try {

            let connection = res.locals.connection;
            let _info = { read:{}, write:{}}

            let readPool = await dbHandler.getPoolInfo(POOL_TYPE.READ_POOL, connection);
            let writePool = await dbHandler.getPoolInfo(POOL_TYPE.WRITE_POOL, connection);

            _info.read.allConnections = readPool._allConnections?.length
            _info.read.freeConnections = readPool._freeConnections?.length
            _info.read.acquiringConnections = readPool._acquiringConnections?.length

            _info.write.allConnections = writePool._allConnections?.length
            _info.write.freeConnections = writePool._freeConnections?.length
            _info.write.acquiringConnections = writePool._acquiringConnections?.length

            utils.send_response(res, {
                status: 200, data: {
                    poolInfo: _info,
                    timestamp: moment().utc().format()
                }
            })
          

        } catch (error) {
            console.log(error);
            next(error);
        }
    }
    )

    return router;
}