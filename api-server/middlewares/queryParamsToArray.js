const utils = require('../modules/utils');

exports.queryParamsToArray = (qlist)=>{
    return (req, res, next)=>{
        for(let q of qlist){
            req.query[q] = utils.commaSeparatedToArray(req.query[q]);
        }
        next();
    }
}