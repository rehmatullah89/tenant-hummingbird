const jwt       = require('jsonwebtoken');
var settings    = require(__dirname + '/../config/settings.js');
const e         = require(__dirname + '/../modules/error_handler.js');

module.exports = {

    async checkToken(){

        return async (req, res, next) => {

            const token = req.headers['authorization'];
            if(!token) e.th(401, "You are not logged in");

            return new Promise((resolve, reject) => {
                jwt.verify(token, settings.security.key, (err, decoded) => {
                    if (err || !decoded) reject("You are not logged in");
                    resolve(decoded);
                });
    
            }).catch(err => {
                e.th(401, err);
            })
        }
    },

    decodeToken(){

        return async (req, res, next) => {

            const token = req.headers['authorization'];
            if(!token) e.th(401, "You are not logged in");

            return new Promise((resolve, reject) => {
                jwt.verify(token, settings.security.key, (err, decoded) => {
                    if (err || !decoded) reject("You are not logged in");
                    res.locals.contact = decoded.contact;
                    res.locals.company = decoded.active;
                    next();
                });
    
            }).catch(err => {
                e.th(401, err);
            })
        }
    }
}