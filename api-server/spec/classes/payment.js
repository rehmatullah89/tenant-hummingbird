const moment = require('moment');
const Payment = require('../../classes/payment');

module.exports = {
	run(){
        describe('createCredit', () => {
            let credit;
            let connection;
            let data;
            let contact_id;
          
            beforeEach(() => {
                credit = new Payment();
                connection = {};
                data = {
                    amount: 100,
                    date: '2023-06-13',
                    property_id: 'property123',
                    contact_id: 'contact123',
                    number: 'credit123',
                    sub_method: 'sub_method123',
                    notes: 'Some notes',
                    lease_id: 'lease123'
                };
                contact_id = 'contact123';
            });
          
            it('should set the properties correctly and call setPaymentMethodTypeId and save', async () => {
                spyOn(credit, 'setPaymentMethodTypeId');
                spyOn(credit, 'save');
            
                await credit.createCredit(connection, data, contact_id);
            
                expect(credit.amount).toBe(100);
                expect(credit.date).toBe('2023-06-13');
                expect(credit.created).toBe(moment().format('YYYY-MM-DD HH:mm:ss'));
                expect(credit.property_id).toBe('property123');
                expect(credit.contact_id).toBe('contact123');
                expect(credit.number).toBe('credit123');
                expect(credit.method).toBe('credit');
                expect(credit.sub_method).toBe('submethod123');
                expect(credit.credit_type).toBe('credit');
                expect(credit.notes).toBe('Some notes');
                expect(credit.accepted_by).toBe('contact123');
                expect(credit.lease_id).toBe('lease123');
            
                expect(credit.setPaymentMethodTypeId).toHaveBeenCalledWith(connection, { type: 'Credit' });
                expect(credit.save).toHaveBeenCalledWith(connection);
            });
          
            it('should throw an error if lease_id is missing', async () => {
                const invalidData = { ...data, lease_id: undefined };
            
                await expectAsync(credit.createCredit(connection, invalidData, contact_id)).toBeRejectedWith(
                    new Error('Missing lease id')
                );
            });
          
            it('should call setPaymentMethodTypeId and save in the correct order', async () => {
                const setPaymentMethodTypeIdSpy = spyOn(credit, 'setPaymentMethodTypeId').and.callThrough();
                const saveSpy = spyOn(credit, 'save').and.callThrough();
              
                await credit.createCredit(connection, data, contact_id);
              
                expect(setPaymentMethodTypeIdSpy).toHaveBeenCalledBefore(saveSpy);
            });
        });
    }
}