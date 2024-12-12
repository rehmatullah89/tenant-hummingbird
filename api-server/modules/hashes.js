var Hashids = require("hashids");
var Hash;
var response_vars = require(__dirname + '/../response_vars/index.js');
var mask = require('json-mask');
var traverse = require('traverse');
var e = require(__dirname + '/./error_handler.js');


var HashFn = {
  hash: {},
  blacklist: [
    'gds_owner_id',
    'nectar_application_id',
    'qb_customer_id',
    'qb_id',
    'gds_id',
    'transaction_id',
    'client_id',
    'site_id',
    'propay_device_id',
    'document_id',
    'group_id',
    'foreign_id',
    'space_mix_id',
    'spacemix_category_id',
    'payment_trans_id',
    'refund_trans_id',
    'visitor_id',
    'book_id',
    'gds_application_id',
    'notification_document_id',
    'unit_group_id',
    'tier_id',
    'notification_document_id',
    'unit_group_hashed_id',
    'notification_document_id',
    'template_doc_id',
    'idv_id',
    'employee_id'
  ],
  whitelist: [
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
    'transferred_from',
    'lease_ids',
    'rent_change_ids'
  ],
  init() {
    this.hash = new Hashids('kjadshf78ayfhiuadf87afdhas', 10);
    return this.hash;
  },
  obscure(obj, req) {
    obj = this.makeHashes(obj, req.company_id);
    if (Array.isArray(obj)) {
      return obj.map(o => this.redact(o, req));
    } else {
      return this.redact(obj, req);
    }
  },



  unHash(req, res, next) {
    try {

      req.params = HashFn.clarify(req.params, res.locals.company_id);

      req.query = HashFn.clarify(req.query, res.locals.company_id);

      req.body = HashFn.clarify(req.body, res.locals.company_id);

      next();
    } catch (err) {
      console.log("err", err)
      e.th(400, "Invalid ID format")
    }
  },

  clarify(obj, company_id) {

    var _this = this;
    return traverse(obj).map(function (x) {
      if (this.key && ((this.key === 'id' || (this.key.substring(this.key.length - 3) === '_id' || _this.whitelist.indexOf(this.key) >= 0)) && _this.blacklist.indexOf(this.key) < 0)) {
        if (Array.isArray(x) && !x.length) return;
        if (this.isLeaf) {
          try {
            var newval = null;
            
            if (x && x !== 'undefined' && x !== 'null') {
              let decoded = _this.hash.decode(x);
              if (!company_id || decoded[decoded.length - 1] === company_id) {
                newval = decoded[0];
              } else if (company_id) {
                throw "invalid ID";
              }
            }
            this.update(newval);
          } catch (err) {
            throw "invalid ID";
          }
        } else if (Array.isArray(x)) {

          var newval = x.map(v => {
            let decoded = _this.hash.decode(v);

            if (!company_id || decoded[decoded.length - 1] === company_id) {
              return decoded[0];
            } else if (company_id) {
              throw "invalid ID";
            }
          });

          if (!newval.length) return;
          this.update(newval);
        }
      }
    });
  },

  makeHashes(obj, cid, extra = []) {
    let _this = this
    let _whitelist = [extra, _this.whitelist].flat(1)

    return traverse(obj).map(function (x) {
        if (
            this.isLeaf &&
            this.key &&
            (this.key === "id" ||
                this.key.substring(this.key.length - 3) === "_id" ||
                _whitelist.indexOf(this.key) >= 0) &&
            _this.blacklist.indexOf(this.key) < 0
        ) {
            let newval = x ? _this.hash.encode(x, cid) : null;
            this.update(newval)
        } else if (
            Array.isArray(obj) &&
            this.key &&
            (this.key === "id" ||
                this.key.substring(this.key.length - 3) === "_id" ||
                _whitelist.indexOf(this.key) >= 0) &&
            _this.blacklist.indexOf(this.key) < 0
        ) {
            return obj.map((o) => {
                let newval = o ? _this.hash.encode(o, cid) : null
                this.update(newval)
            })
        }
    })
  },

  redact(obj, req) {
    if (!req) return obj;
    try {
      let path = req.baseUrl.toLowerCase().replace(/companies\/([^§]*)\//, '');

      var fields = response_vars[path][req.route.path.toLowerCase()][req.method.toLowerCase()];
      return mask(obj, fields);
    } catch (err) {
      //console.error(err);
      return obj;
    }

  }
};


module.exports = HashFn;
