

const CompanyService = require('../services/companyService');
const pool = require(__dirname + '/db.js');

module.exports = {

    access(allowed){

        return async (req, res, next) => {

            if(req.headers['x-api-key']){
               try{

                var api_key = req.headers['x-api-key'];

                let company = new CompanyService({token: api_key});
                await company.findByToken(req.connection);
                if(company.id && company.active) {
                    res.locals.company = company;
                    next();
                } else {
                    return res.send({ code: 401, success: false, msg: 'API key not found.'});

                }
               } catch(err){
                   console.log("error",  err);
                   next(err)
               }
            } else {
                res.send({ code: 401, success: false, msg: 'You are not logged in or your session has expired.  Please log in to continue.' });
            }
        }


    }
}