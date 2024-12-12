'use strict';

const GLDefaultSubtype = require("./gl_default_subtype");

class GLProductDefaultSubtype extends GLDefaultSubtype {
    constructor(data = {}) {
        super(data);
        this.assembleGLProductDefaultSubtype(data);
    }
    
    assembleGLProductDefaultSubtype(data) {
        const { Product, Unit } = data;        
        this.Product = Product;
        this.Unit = Unit;
    }

    getKey() {
        this.Product.slug = this.Product.slug || this.Product.default_type; 
        let search = this.Product.slug;
        if(this.Product.slug == 'rent') {
            search = `${this.Unit.type}_rent`;
        }

        search = search.toUpperCase();
        this.key = ENUMS.GL_SUB_TYPES[search];
        return ENUMS.GL_SUB_TYPES[search];        
    }
}

module.exports = GLProductDefaultSubtype;

const ENUMS = require("../utils/enums");