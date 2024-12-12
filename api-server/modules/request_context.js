var context = require('request-context');

module.exports = {

    Middleware() {
        if(context) {
            return context.middleware('request');
        }
    },

    setValue(property, data) {
        if(context) {
            context.set(`request:${property}`, data);
        }
    },

    getValue(property) {
        if(context) {
            let data = context.get(`request:${property}`);
            if(data) return data;
        }
    }
}
