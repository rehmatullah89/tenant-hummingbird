console.log("THIS IS IN THE TEST");
console.log("index.spec: Started loading tests");

const objects = {
    classes: require('./classes'),
    helpers: require('./helpers'),
    modules: require('./modules'),
    middlewares: require('./middlewares')
};

// const app = require('../app')
describe("Main ->", function() {

    // Configure Jasmine to ignore moments deprecation warnings
    jasmine.getEnv().beforeEach(function() {
        spyOn(console, 'warn');
    });

    for ([o_key] of Object.entries(objects)){
        for ([key] of Object.entries(objects[o_key])){
            describe(`${o_key} -> ${key} ->`, function() {
                objects[o_key][key].run();
            });
        }
    }
    
});