"use strict";
const models  = require(__dirname + '/../models');
const e = require(__dirname + '/../modules/error_handler.js');
const {promisify} = require('util');

var apiKey = promisify(require("crypto").randomBytes);

class Company {

    constructor(company = {}){

        this.id = company.id;
        this.create(company);

    }

    async find(connection){

        if(!this.id) e.th(400, "Missing ID");
        let company =  await models.Company.findById(connection, this.id);
        if(!company) e.th(404);
        this.create(company);

    }

    create(company){
        this.name = company.name;
        this.active = company.active;
        this.token = company.token;
    }

    async save(connection){

        //TODO Validate name is unique, external id is unique if not null
        //TODO maybe have an active flag and a deleted flag..

        const data = {
            name: this.name,
            active: !!this.active,
            token: this.token
        };

        let result = await models.Company.save(connection,data, this.id );

        if(!this.id){
            this.id = result.insertId;
        }

    }

    async delete(connection){
        return await models.Company.delete(connection, this.id )
    }

    async validateName(connection){
        let company =  await models.Company.findByName(connection, this.id );
        if(company) e.th(409, "This company already exists");

    }
    verifyAccess(company_id){
        if(this.id === company_id) return;
        e.th(403, "Access Denied");
    }

    async generateApiKey(){
        let token = await apiKey(16);
        this.token = token.toString('hex');

    }

    async createDefaultArea(){

        await models.Company.findByToken(connection, this.token );
    }

    async createDefaultGate(){
        await models.Company.findByToken(connection, this.token );
    }

    async createDefaultGroup(){
        let group = models.Group
    }

    async createDefaultTimes(){
        let token = await apiKey(16);
        this.token = token.toString('hex');

    }

    async findByToken(connection){
        console.log("this.token", this.token);
        let company =  await models.Company.findByToken(connection, this.token );
        if(!company) e.th(404, "API key not found");
        this.id = company.id;
        this.token = company.token;
        this.name = company.token;
        this.active = company.active;

    }




}

module.exports = Company;
