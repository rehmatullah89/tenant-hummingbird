var models  = require(__dirname + '/../models');

class Asset {

    constructor(data) {
        data = data || {};
        this.id = data.id || null;
        this.property_id = data.property_id || null;
        this.floor = data.floor || null;
        this.asset = data.asset || null;
        this.x = data.x || null;
        this.y = data.y || null;
        this.rotate = data.rotate || null;
        this.width = data.width || null;
        this.height = data.height || null;
        this.length = data.length || null;
    }

    async find (connection) {
        if (!this.id) e.th(500, 'Asset id is not set');
        let asset = await models.Asset.findById(connection, this.id)

        if (!asset) e.th(404, 'Asset not found');

        this.id = asset.id;
        this.property_id = asset.property_id;
        this.floor = asset.floor;
        this.asset = asset.asset;
        this.x = asset.x;
        this.y = asset.y;
        this.rotate = asset.rotate;
        this.width = asset.width;
        this.height = asset.height;
        this.length = asset.length;
    }

    async save (connection) {
        let save = {
            id: this.id,
            property_id: this.property_id,
            floor: this.floor,
            asset: this.asset,
            x: this.x,
            y: this.y,
            rotate: this.rotate,
            width: this.width,
            height: this.height, 
            length: this.length
        }

        await models.Asset.save(connection, save, this.id);
    }

    update(data){
		if(typeof data.property_id !== 'undefined') this.property_id = data.property_id || '';
		if(typeof data.floor !== 'undefined') this.floor = data.floor || '';
		if(typeof data.asset !== 'undefined') this.asset = data.asset || '';
		if(typeof data.x !== 'undefined') this.x = data.x || '';
		if(typeof data.y !== 'undefined') this.y = data.y;
		if(typeof data.rotate !== 'undefined') this.rotate = data.rotate || 0;
		if(typeof data.width !== 'undefined') this.width = data.width || '';
		if(typeof data.height !== 'undefined') this.height = data.height || '';
        if(typeof data.length !== 'undefined') this.length = data.length || '';
	}

    static transformBulkUpdateSaveData(payload) {
        const { asset_items } = payload;
        const assetItems = [];
        for(var i in asset_items) {
            const { id, property_id, floor, asset, x, y, rotate, width, height, length } = asset_items[i];
            assetItems.push([id, property_id, floor, asset, x, y, rotate, width, height, length]);
        }
        return assetItems;
    }

    static async bulkUpdate(connection, payload) {
        const { property_id, active_asset_items } = payload;
        const updateSaveAssetItems = Asset.transformBulkUpdateSaveData({ asset_items: active_asset_items });
        const previousAssetItems = await models.Assets.findPropertyMapAssets(connection, property_id);
        const removedAssetItems = previousAssetItems.filter(p => !active_asset_items.some(a => a.id === p.id));
        if(updateSaveAssetItems?.length) {
            await models.Asset.bulkUpdateSave(connection, { data: updateSaveAssetItems });
        }
        if(removedAssetItems?.length) {
            await models.Asset.bulkRemove(connection, { data: removedAssetItems });
        }
    }
}



module.exports = Asset;