var models = require('../models');
var e = require(__dirname + '/../modules/error_handler.js');

class LeaseStanding {
    constructor(data){
        this.id = data.id;
        this.name = data.name || "";
        this.sort = data.sort || 0;
        this.type = data.type || "";
        this.color = data.color || "";
        this.overlock = data.overlock || 0;
        this.deny_access = data.deny_access || 0;
    }

    async find(connection) {
        let lease_standing = {};
        if(!this.id && !this.name) e.th(500, 'Lease standing id not set');
        if(this.id){
            lease_standing = await models.LeaseStanding.findById(connection, this.id);
        } else {
            lease_standing = await models.LeaseStanding.findByName(connection, this.name);
        }
        if (!lease_standing) e.th(404,"Lease standing not found." );

        this.id = lease_standing.id;
        this.name = lease_standing.name;
        this.sort = lease_standing.sort ;
        this.type = lease_standing.type;
        this.color = lease_standing.color;
        this.overlock = lease_standing.overlock || 0;
        this.deny_access = lease_standing.deny_access || 0;
    }

    static async findAll(connection){
      return await models.LeaseStanding.findAll(connection);
    }

    async save(connection){
        await this.validate(connection);

        let save = {
            name: this.name,
            overlock: this.overlock,
            deny_access: this.deny_access
        };
        return await models.LeaseStanding.save(connection, save, this.id);
    }

    async validate (connection){
        if(!this.name) e.th(400, "Please enter a name for this lease standing.");

        let existing = await models.LeaseStanding.findByName(connection, this.name);
        if(existing && existing.find(e => e.id !== this.id)){
          e.th(409, "A lease standing with this name already exists");
        }
    }

    verifyAccess(company_id){
        // if (company_id !== this.company_id) {
        //   e.th(401,"You are not authorized to view this resource");
        // }
    }

    update(data){

        this.name = data.name;
        this.sort = data.sort || this.sort;
        this.type = data.type || null;
        this.color = data.color || null;
        this.overlock = data.overlock || 0;
        this.deny_access = data.deny_access || 0;
    }
}

module.exports = LeaseStanding;
