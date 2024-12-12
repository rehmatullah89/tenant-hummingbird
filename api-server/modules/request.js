var request = require("request");
class Request {

	constructor(method,base_url,end_point,headers,data){

        this.method = method;
        this.uri = base_url + end_point;
        this.form = data || {};
        this.headers = headers;

        console.log("this.uri", this.uri)
    }
    makeRequest(){
        return new Promise((res,rej) =>{
            request({method: this.method,
                    uri: this.uri,
                    headers: this.headers,
                    form: this.form,
                    },
                    function (e,r,b){
                    if(e) rej(e);
                    else res(r);
                })
            })
        }

}
module.exports = Request;
