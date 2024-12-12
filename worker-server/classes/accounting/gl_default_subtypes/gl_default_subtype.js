'use strict';

class GLDefaultSubtype {
    constructor(data = {}) {
        this.assembleGLDefaultSubType(data);
    }
    
    assembleGLDefaultSubType(data) {
        const { id, gl_account_subtype_id, key, created_at, created_by, modified_at, modified_by, deleted_at, deleted_by } = data;        

        this.id = id;
        this.gl_account_subtype_id = gl_account_subtype_id;
        this.key = key;
        this.created_at = created_at;
        this.created_by = created_by;
        this.modified_at = modified_at;
        this.modified_by = modified_by;
        this.deleted_at = deleted_at;
        this.deleted_by = deleted_by;
    }

    getKey() {
        return ENUMS.GL_SUB_TYPES[this.key];        
    }
}

module.exports = GLDefaultSubtype;

const ENUMS = require("../utils/enums");