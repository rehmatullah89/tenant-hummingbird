var { queryArrayParamsToLower } = require('../../middlewares/queryArrayParamsToLower');

let req, res, next;
module.exports = {
	run(){
        beforeEach(() => {
            req = { query: {} };
            res = {};
            next = jasmine.createSpy('next');
        });
        
        it('should lowercase and replace spaces with underscores for specified query array parameters', () => {
            req.query = {
                fruits: ['Apple', 'Banana', 'Orange'],
                colors: ['Red', 'Green', 'Blue'],
                other: 'value'
            };
        
            const qlist = ['fruits', 'colors'];
            const middleware = queryArrayParamsToLower(qlist);
            middleware(req, res, next);
        
            expect(req.query.fruits).toEqual(['apple', 'banana', 'orange']);
            expect(req.query.colors).toEqual(['red', 'green', 'blue']);
            expect(req.query.other).toBe('value');
            expect(next).toHaveBeenCalled();
        });
    }
}
