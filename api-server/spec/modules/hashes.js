const Hash = require('../../modules/hashes.js');
var Hashes = Hash.init();

module.exports = {
  run() {
    describe('makeHashes -> ', () => {

      beforeEach(() => {
        obj = {
          id: 123,
          name: 'John',
          email: 'john@example.com',
        };
        cid = 1;
      });

      it("should hash the 'id' property of a leaf node", () => {
        const result = Hash.makeHashes(obj, cid);
        const expectedResult = {
          id: '4OBqkJs129',
          name: 'John',
          email: 'john@example.com',
        };
        expect(result).toEqual(expectedResult);
      });

      it("should hash the 'id' property of a leaf node with extra whitelist keys", () => {
        obj = {...obj, white_test: 12345};
        const result = Hash.makeHashes(obj, 1, ['white_test']);

        // Assert the expected result
        const expectedResult = {
          id: '4OBqkJs129',
          name: 'John',
          email: 'john@example.com',
          white_test: 'Ej6W6lSYBe'
        };
        expect(result).toEqual(expectedResult);
      });

      it("should hash the 'id' property of an array of objects", () => {
        obj = {
          items: [
            { id: 1, name: 'Item 1' },
            { id: 2, name: 'Item 2' },
            { id: 3, name: 'Item 3' },
          ],
        };

        const result = Hash.makeHashes(obj, cid);
        const expectedResult = {
          items: [
            { id: 'WEj67IYBe3', name: 'Item 1' },
            { id: 'w420NsmBy1', name: 'Item 2' },
            { id: 'MojDGcJ2Ya', name: 'Item 3' },
          ],
        };
        expect(result).toEqual(expectedResult);
      });

      it("should hash the 'id' property of an array of objects with extra whitelist keys", () => {
        obj = {
          items: [
            { id: 1, name: 'Item 1', white_test: 11 },
            { id: 2, name: 'Item 2', test: 22},
            { id: 3, name: 'Item 3', test: 33 },
          ],
        };

        // Call the makeHashes method with extra whitelist keys
        const result = Hash.makeHashes(obj, cid, ['white_test']);

        // Assert the expected result
        const expectedResult = {
          items: [
            { id: 'WEj67IYBe3', name: 'Item 1', white_test: 'wnB91hrB6X' },
            { id: 'w420NsmBy1', name: 'Item 2', test: 22},
            { id: 'MojDGcJ2Ya', name: 'Item 3', test: 33 },
          ],
        };
        expect(result).toEqual(expectedResult);
      });
    });
  },
};
