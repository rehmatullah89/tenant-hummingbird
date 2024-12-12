var crypto = require('crypto');
var config    = require(__dirname + '/../config/settings.js');
var Promise = require('bluebird');
var apiKey = Promise.promisify(require("crypto").randomBytes);


var Hash = require(__dirname + '/../modules/hashes.js');
var Hashes = Hash.init();

var jwt = require('jsonwebtoken');
var settings    = require(__dirname + '/../config/settings.js');

var errors  = require(__dirname + '/../modules/error_handler.js');
var e  = require(__dirname + '/./error_handler.js');

function hash(passwd, salt) {
    return crypto.createHmac('sha256', salt.toString('base64')).update(passwd).digest('hex');
};

let site_control =  {
	getDomain(headers){

		var refererDomain = (headers.origin) ? headers.origin.replace(/(^\w+:|^)\/\//, '').split('/')[0] : '';
		if (!refererDomain) return false;
		var refererParts = refererDomain.split('.');
		return refererParts[0];

	},
	hasAccess: function(allowed){ 
		return async (req, res, next) => {

			var token = req.headers['authorization'];

			if(!token) return res.send({ success: 500, msg: 'Missing authorization credentials.' });


			jwt.verify(token, settings.security.key, async (err, decoded) => {

				
				if (err) return res.status(401).send({ status: 401, msg: 'You are not logged in or your session has expired.  Please log in to continue.' });

				// verify that logged in user is accessing though the proper domain
				// console.log("decoded", decoded);
				var subdomain = site_control.getDomain(req.headers);
				console.log("decoded", decoded);
				if(process.env.NODE_ENV !== 'local' && !['admin', 'beta-admin'].includes(subdomain)){
					return res.status(401).send({ status: 401, msg: 'You are not logged in or your session has expired.  Please log in to continue.' });
				}

				// if(allowed.indexOf(decoded.contact.role) < 0 && !superAdmin)  {
				// 	return res.status(403).send(errors.get(403, "You are not allowed to access this resource"));
				// };

				if(allowed && allowed.length){
					if(allowed.indexOf('superadmin') >= 0 && !decoded.superadmin ){
						return res.status(403).send({ status: 403, msg: "You are not allowed to access this resource" });
					}					
				}

				// if everything is good, save to request for use in other routes
				res.locals.admin = decoded;
				return next();
			});

			// if(process.env['test']){
			// 	req.session.user = config.test[process.env['test']].user;
			// 	req.session.active = config.test[process.env['test']].active;
			// } else {

			// }

		}
	},
    
    generateApiKey: function(fn){
        return apiKey(16);
        // TODO verify no other keys in database
    },
    validateApiKey: function(req, res, next) {

        var apiKey = req.query.key;

        pool.getConnection(function(err, connection) {
            var sql = 'Select * from api_keys where apikey = ' + connection.escape(apiKey);
            if(err){
                res.send(400, 'An error occurred');
            } else {
                connection.query(sql, function (err, result) {
                    if (result.length) {
                        req.account = result[0];
                        connection.release();
                        next();
                    } else {
                        var data = {
                            msg:'Missing or incorrect authorization header'
                        };
                        res.status(400).send(JSON.stringify(data));
                    }
                });
            }


        })
    },

	encode: function(){
        var cipher = crypto.createCipher(config.security.algorithm, config.security.key);
        return cipher.update(JSON.stringify(obj), 'utf8', 'hex') + cipher.final('hex');
    },

	decode: function(hash){
        var decipher = crypto.createDecipher(config.security.algorithm, config.security.key);
        return JSON.parse(decipher.update(hash, 'hex', 'utf8') + decipher.final('utf8'));
    },
    hashPassword:function(passwordString, salt) {
	    return hash(passwordString, salt);
    },

};

module.exports = site_control;






