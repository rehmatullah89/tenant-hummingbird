"use strict";

const redis = require('redis');
const { promisify } = require('util');
var e  = require(__dirname + '/../modules/error_handler.js');

class RedisClient {
    constructor() {
        this.client = redis.createClient({host: process.env.REDIS_HOST});
        this.client.on('error', (err) => console.log('Redis Error:', err));
        this.getAsync = promisify(this.client.get).bind(this.client);
        this.setAsync = promisify(this.client.set).bind(this.client);
    }

    redisKey(key){
        if(!key.document_id) {console.log("key.document_id is mandatory. >>> check --> redisKey()"); return;};
        if(!key.company_id) {console.log("key.company_id is mandatory. >>> check --> redisKey()"); return;};
        return key.document_id+"_"+key.company_id;
    }

    async getValue(req_key) {
        let key = this.redisKey(req_key);
        if(!key){console.log("Key is not Set. >>> check --> getValue()"); return;}
        return await this.getAsync(key);
    }

    setValue(req_key, value, ttl) {
        let key = this.redisKey(req_key);
        if(!key){console.log("Key is not Set. >>> check --> setValue()"); return;}
        if (ttl) {
            return this.setAsync(key, value, 'EX', ttl);
        } else {
            return this.setAsync(key, value);
        }
    }

    async getAllKeys(patternWithCompanyId) {
        const keysAsync = promisify(this.client.keys).bind(this.client);
        return await keysAsync(patternWithCompanyId);
    }

    async delKeys(pattern) {
        if(pattern != "*"){ // this condition is being used so that, all keys can't be deleted mistakenly.
            const keysAsync = promisify(this.client.keys).bind(this.client);
            const delAsync = promisify(this.client.del).bind(this.client);
            console.log("Deleting The Redis Values For Pattern: ", pattern);
            const keys = await keysAsync(pattern);
            if (keys.length > 0) {
                await delAsync(keys);
            }
        }
    }



}

module.exports = RedisClient;