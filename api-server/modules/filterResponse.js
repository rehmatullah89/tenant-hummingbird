
var response_vars    = require(__dirname + '/../response_vars/index.js');
var mask = require('json-mask');

module.exports = {

	filter (data, req){
		var _this = this;
		
		try{
			var fields = response_vars[req.baseUrl.toLowerCase()][req.route.path.toLowerCase()][req.method.toLowerCase()];

			return mask(data, fields);
		} catch(err){
			throw err.toString();
		}
	}

};