var Hashids = require("hashids");
var Hash;
var response_vars    = require(__dirname + '/../response_vars/index.js');
var mask = require('json-mask');
var traverse = require('traverse');


module.exports = {
    hash: {},
    blacklist:[
        'qb_customer_id',
        'qb_id',
        'transaction_id',
        'client_id'
    ],
    whitelist:[
        'uploaded_by',
        'entered_by',
        'hold_token',
        'tenant_ids',
        'signer_ids',
        'property_ids',
        'type_ids',
        'accepted_by',
        'modified_by',
        'created_by',
        'assign_to',
    ],
    init(){
        this.hash = new Hashids('kjadshf78ayfhiuadf87afdhas', 10);
        return this.hash;
    },
    obscure(obj, req){

        obj = this.makeHashes(obj, req.params.company_id);
        
        if(Array.isArray(obj)){
            return obj.map(o => this.redact(o, req));
        } else {
            return this.redact(obj, req);
        }

    },

    clarify(obj){
        var _this = this;
        return traverse(obj).map(function (x) {

            if(this.key && ( (this.key === 'id' || (this.key.substring(this.key.length - 3) === '_id'  || _this.whitelist.indexOf(this.key) >= 0 )) && _this.blacklist.indexOf(this.key) < 0 )) {

                if(Array.isArray(x) && !x.length) return;

                if(this.isLeaf){
                    try{
                        var newval = (x) ? _this.hash.decode(x)[0] : null;
                        this.update(newval);
                    } catch(err){
                        return;
                    }
                } else if(Array.isArray(x)) {
                    var newval = x.map(v =>  _this.hash.decode(v)[0]);

                    if(!newval.length) return;
                    this.update(newval);
                }
            }
        });

    },

    makeHashes(obj, cid){
        var _this = this;
        return traverse(obj).map(function (x) {
            if(this.isLeaf && this.key && ( (this.key === 'id' || (this.key.substring(this.key.length - 3) === '_id'  || _this.whitelist.indexOf(this.key) >= 0 )) && _this.blacklist.indexOf(this.key) < 0  )) {
                var newval = (x) ? _this.hash.encode(x, cid): null;
                this.update(newval);
            } else if(Array.isArray(obj) && this.key && ( (this.key === 'id' || (this.key.substring(this.key.length - 3) === '_id'  || _this.whitelist.indexOf(this.key) >= 0 )) && _this.blacklist.indexOf(this.key) < 0  )){
                return obj.map(o => {
                    var newval = (o) ? _this.hash.encode(o, cid): null;
                    this.update(newval);
                });
            }
        });
    },

    redact(obj, req){
        if(!req) return obj;
        try {
            console.log(req.baseUrl.toLowerCase());
            console.log(req.route.path);
            console.log(req.method.toLowerCase());
            var fields = response_vars[req.baseUrl.toLowerCase()][req.route.path.toLowerCase()][req.method.toLowerCase()];

            return mask(obj, fields);
        } catch(err){
            //console.error(err);
            return obj;
        }

    },

    updateIds(obj,cid){
        if (!cid) throw "Company Id missing while updating ids";
        let _this = this;
        return traverse(obj).map(function (x) {
            if(this.key && ( (this.key === 'id' || (this.key.substring(this.key.length - 3) === '_id'  || _this.whitelist.indexOf(this.key) >= 0 )) && _this.blacklist.indexOf(this.key) < 0 )) {
                if(Array.isArray(x) && !x.length) return;
                if(this.isLeaf){
                    try{
                        let val = null;
                        let newval = null;
                        console.log("x", x)
                        if(x && x !== 'undefined' && x !== 'null'){
                          let decoded = _this.hash.decode(x);
                          val = decoded[0];
                          newval = _this.hash.encode(val,cid);
                        }
                        this.update(newval);
                      } catch(err){
                        throw "invalid value";
                      }
                } else if(Array.isArray(x)) {
                    let val = null;
                    let newval = x.map(v => {
                        let decoded = _this.hash.decode(v);
                        val = decoded[0];
                        return _this.hash.encode(val,cid);
                      });
                      
                      if(!newval.length) return;
                      this.update(newval);
                }
            }
        })    
    }
};