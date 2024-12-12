'use strict';

const GLDefaultSubtype = require("./gl_default_subtype");

class GLPaymentDefaultSubtype extends GLDefaultSubtype {
    constructor(data = {}) {
		super(data);
        this.assembleGLPaymentDefaultSubtype(data);
    }
    
    assembleGLPaymentDefaultSubtype(data) {
        const { Payment } = data;        
		this.Payment = Payment;
    }

    getKey() {
        const { NON_CREDIT_ADJUSTMENT_SUB_METHODS }= ENUMS;

        let search = this.Payment.method;
        if(this.Payment.PaymentMethod.card_type?.length) {
            search = `${this.Payment.PaymentMethod.type}_${this.Payment.PaymentMethod.card_type}`;
        }
        
        if(this.Payment.method == 'adjustment') {
            if(Object.values(NON_CREDIT_ADJUSTMENT_SUB_METHODS).includes(this.Payment.sub_method)) {
                search = this.Payment.sub_method;
            } else {
                search = ACCOUNTING_ENUMS.GL_SUB_TYPES.CREDIT;
            }
        }

        search = search.toUpperCase();
        this.key = ACCOUNTING_ENUMS.GL_SUB_TYPES[search];
        return ACCOUNTING_ENUMS.GL_SUB_TYPES[search];
    }
}

module.exports = GLPaymentDefaultSubtype;

const ACCOUNTING_ENUMS = require("../utils/enums");
const ENUMS = require("../../../modules/enums");