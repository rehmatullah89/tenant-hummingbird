
let wrapper = {
    // object - object whose method is to be wrapped
    // method - method to be wrapped
    // wrapper - function to be executed instead of the original 
    wrap(object, method, wrapper){

        // Stores the original method
        var fn = object[method];

        // Return an overwritten method
        return object[method] = function(){
            return  wrapper.apply(this, [this].concat([fn.bind(this)].concat(
                Array.prototype.slice.call(arguments))));
        };
    }
}

module.exports = wrapper;