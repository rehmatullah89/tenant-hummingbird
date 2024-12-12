var models = require(__dirname + '/../models');


class DeliveryMethod {
    constructor(data) {
        data = data || {}
        this.id = data.id;
        this.name = data.name;
        this.mailhouse_id = data.mailhouse_id;
        this.gds_key = data.gds_key;
        this.delivery_type = this.delivery_type;
    }

    async find(connection) {
        let delivery_method = await models.DeliveryMethod.findById(connection, this.id);
        this.assembleDeliveryMethod(delivery_method);
        return true;
    }

    async findByGdsKey(connection, gds_key) {
         let delivery_method = await models.DeliveryMethod.findByGdsKey(connection, gds_key);
         this.assembleDeliveryMethod(delivery_method);
         return true;
    }
    

    assembleDeliveryMethod(data) {
        this.id= data.id
        this.name= data.name
        this.mailhouse_id= data.mailhouse_id
        this.gds_key= data.gds_key
        this.delivery_type= data.delivery_type
    }

}

module.exports = DeliveryMethod