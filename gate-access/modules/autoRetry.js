const request = require('request-promise');
const logger = require(__dirname + '/../modules/logger.js')

async function requestWithAutoRetry(reqObj, numberOfTries = 1){
    return new Promise( (resolve, reject) => {
        
        const MAX_RETRY = 5;
        let increasingTimeout = 500; //0.01s
        let retries = 0;
        
        //definition of caller function
        const caller = async () => {
            await request(reqObj)
            .then( response => {
                if (response && response.errorCode === 10) throw response
                resolve(response)
            })
            .catch( error => {
            console.log("ERROR", error)
            let status = error.statusCode || 200
            let errorCode = error.errorCode //Check Noke error code
            console.log("status", status)
            console.log("errorCode", errorCode)
            console.log("numberOfTries", numberOfTries)
            if( retries <= numberOfTries && retries < MAX_RETRY && ((status <= 599 && status >= 500) || errorCode === 10)){
                //each time increase by (2 * 0.5)s for 10 max retry
                increasingTimeout = increasingTimeout * 2;
                logger.error(`Request failed, retrying after ${increasingTimeout / 1000}s and ${numberOfTries > MAX_RETRY ? MAX_RETRY - retries: numberOfTries - retries } retries left`);
                setTimeout(caller, increasingTimeout);
                retries++;
            }else{
                reject(error)
            }
            })
        }
        
        //Call function caller
        retries = 1;
        caller();
    })
}

module.exports = requestWithAutoRetry;