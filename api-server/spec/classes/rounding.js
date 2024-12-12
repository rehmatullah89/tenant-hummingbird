const Rounding = require('../../classes/rounding');
const models = require('../../models');

module.exports = {
	run(){
        let data;
        let connection;

        beforeEach(() => {
            data = {
                id: 2,
                object_id: 123,
                object_type: 'example',
                rounding_type: 'round',
                status: 1,
                created_by: 'user123',
            };

            connection = {
                query: jasmine.createSpy('query'),
            };
        });

        describe('save', () => {
            it('should save the rounding data', async () => {
                const rounding = new Rounding(data);
                spyOn(models.Rounding, 'save').and.returnValue({ insertId: 1 });

                await rounding.save(connection);

                expect(models.Rounding.save).toHaveBeenCalledWith(connection, {
                    object_id: data.object_id,
                    object_type: data.object_type,
                    rounding_type: data.rounding_type,
                    status: data.status,
                    created_by: data.created_by,
                }, undefined);

                expect(rounding.id).toBe(1);
            });
        });
    }
}