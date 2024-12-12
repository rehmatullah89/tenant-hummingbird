var express = require('express');
var router = express.Router();
var moment      = require('moment');
var Promise = require('bluebird');

var Hash = require(__dirname + '/../modules/hashes.js');
var Hashes = Hash.init();
var settings    = require(__dirname + '/../config/settings.js');
var control  = require(__dirname + '/../modules/site_control.js');

var models =  require(__dirname + '/../models');
var User = require(__dirname + '/../classes/user.js');
var Contact = require(__dirname + '/../classes/contact.js');
var Company = require(__dirname + '/../classes/company.js');
var Activity = require(__dirname + '/../classes/activity.js');
var Property = require(__dirname + '/../classes/property.js');
var Settings = require(__dirname + '/../classes/settings.js');
var utils    = require(__dirname + '/../modules/utils.js');
var e  = require(__dirname + '/../modules/error_handler.js');
var eventEmitter = require(__dirname + '/../events/index.js');
var Role = require(__dirname + '/../classes/role.js');


module.exports = function(app) {

    router.get('/roles', [control.hasAccess(['admin', 'api']), Hash.unHash], async(req, res, next) => {
        try{
          var connection = res.locals.connection;
            let contact = res.locals.contact;

            let company = new Company(res.locals.active);
            await company.getRoles(connection);
              console.log(company);
            utils.send_response(res, {
                status: 200,
                data: {
                    roles: Hash.obscure(company.Roles, req)
                }
            });


        } catch(err) {
            next(err);
        }
    });

    router.post('/roles',  [control.hasAccess(['admin', 'api']), control.hasPermission('manage_roles'), Hash.unHash],  async(req, res, next) => {

        try{

            var connection = res.locals.connection;

            let api = res.locals.api;
            let contact = res.locals.contact;
            let company = res.locals.active;

            let body = req.body;
            let params = req.params;

            let role = new Role();
            body.company_id = company.id;
            role.update(body);
            await connection.beginTransactionAsync();
            await role.save(connection);
            await role.updatePermissions(connection, body.Permissions);
            await connection.commitAsync();

            utils.send_response(res, {
                status: 200,
                data: {
                role_id: Hashes.encode(role.id, res.locals.company_id)
                }
            });

            eventEmitter.emit('role_created', {company, contact, api, role, cid: res.locals.company_id, locals: res.locals});


            } catch(err) {
                await connection.rollbackAsync();
                next(err);
            }



    });

    router.put('/roles/:role_id',  [control.hasAccess(['admin', 'api']), control.hasPermission('manage_roles'), Hash.unHash],  async(req, res, next) => {

        try {
      let gds_owner_id = res.locals.active.gds_owner_id;
      var connection = res.locals.connection;
      let contact = res.locals.contact;
      let company = res.locals.active;
      let api = res.locals.api;
      let cmsPermissions = []
      let body = req.body;
      let params = req.params;

      let role = new Role({id: params.role_id});
      await role.find(connection);
      await role.verifyAccess(company.id);

      role.update(body);
      await connection.beginTransactionAsync();
      await role.save(connection);
      await role.updatePermissions(connection, body.Permissions);
      await connection.commitAsync();

      await role.getPermissions(connection)
      let permissions = role.Permissions;

      permissions?.forEach(permission => {
        if(permission.category === "CMS") {
          cmsPermissions.push(permission.label)
        }
      })

      await role.updateCmsManagers(connection, cmsPermissions, company, role.id, res, req)

      utils.send_response(res, {
        status: 200,
        data: {
        role_id: Hashes.encode(role.id, res.locals.company_id)
        }
      });

      eventEmitter.emit('role_updated', {company, contact, api, cid: res.locals.company_id, locals: res.locals});


        } catch(err) {
      await connection.rollbackAsync();
      next(err);
        }



    });

    router.delete('/roles/:role_id', [control.hasAccess(['admin', 'api']), control.hasPermission('manage_roles'), Hash.unHash], async(req, res, next) => {

        let company = res.locals.active;
        let params = req.params;
        var connection = res.locals.connection;

        try {
            let role = new Role({id: params.role_id});
            await role.find(connection);
            await role.verifyAccess(company.id);
            await role.checkRoleInUse(connection);
            await role.delete(connection);
            utils.send_response(res, {
                status: 200
            });

              eventEmitter.emit('role_deleted', {company, contact, cid: res.locals.company_id, locals: res.locals});

        } catch (err) {
            console.log(err);
            next(err);
        }


      });

    router.get('/:contact_id',  [control.hasAccess(['admin', 'api']), Hash.unHash],  async(req, res, next) =>  {

        try{

          var connection = res.locals.connection;

            let user = res.locals.contact;
            let company = res.locals.active;
            let query = req.query;
            let params = req.params;

            let contact = new Contact({id: params.contact_id});
            await  contact.find(connection, company.id);
        
            await  contact.getPhones(connection)
            await  contact.getNonHbRole(connection, company.id);
            await  contact.getRole(connection, company.id);
            await contact.getPropertiesByRoles(connection, company.id)
			

            if(!contact.roles.includes('admin')) e.th(404, "Resource not found")
            await contact.findUserName(connection)

            contact.RolesProperties?.forEach( rp => {
                rp.Properties = rp.Properties?.map(p => Hashes.encode(p, res.locals.company_id))
                rp.NonHbProperties = rp.NonHbProperties?.map(p => Hashes.encode(p, res.locals.company_id))
            })

            utils.send_response(res, {
                status: 200,
                data: {
                    admin: Hash.obscure(contact, req)
                }
            });

        } catch(err) {
            next(err);
        }

    });

    router.post('/',  [control.hasAccess(['admin', 'api']), control.hasPermission('manage_admins'), Hash.unHash],  async(req, res, next) => {


        try{

          var connection = res.locals.connection;

            let user = res.locals.contact;
            let company = res.locals.active;
            let api = res.locals.api;

            let body = req.body;
            let RolesProperties = req.body.RolesProperties || [];
            let contact = {};

            RolesProperties?.forEach( rp => {
                rp.Properties = rp.Properties?.map(p => Hashes.decode(p)[0])
                rp.NonHbProperties = rp.NonHbProperties?.map(p => Hashes.decode(p)[0])
            })
            
            await connection.beginTransactionAsync();

            await Contact.validateAdminEmail(connection, body.email,company.id);
            contact = new Contact();
            contact.makeAdmin(body);
            await contact.save(connection);

            //await contact.saveAllRoles(connection, company.id);
            //await contact.getRole(connection, company.id);

            //translating payload so third parties will not be affected
            if(!RolesProperties.length){
                let role_properties = {};
                role_properties.role_id = body.role_id;
                role_properties.Properties = body.Properties?.map(p => p.id)
                role_properties.NonHbProperties = body.NonHbProperties?.map(p => p.id)

                await contact.getRole(connection, company.id);
                role_properties.id = contact.Roles[0]?.id;

                RolesProperties.push(role_properties);
            }


            // if(body.Properties && body.Properties.length){
            //     for (let i = 0; i < body.Properties.length; i++){
            //         let property = new Property({id: body.Properties[i].id});
            //         await property.find(connection);
            //         await property.verifyAccess({connection, company_id: company.id, contact_id: user.id, permissions: ['manage_admins']});
            //     }
            // }

            for(let j = 0; j < RolesProperties.length; j++ ){
                let rp = RolesProperties[j];

                for(let i = 0; i < rp?.Properties.length; i++){
                    let property = new Property({id: rp.Properties[i]});
                    await property.find(connection);
                    await property.verifyAccess({connection, company_id: company.id, contact_id: user.id, permissions: ['manage_admins'], api});
                }
            }            

			// await contact.updateRole(connection, company.id, body.role_id, body.Properties, body.NonHbProperties);

            await contact.updateRoles(connection, company.id, RolesProperties, body?.status);

            let x = contact.prop;

            connection.commitAsync();      
            
            // see if translation needed            
            await Contact.saveCmsManager(connection, res, req, body)
            utils.send_response(res, {
                status: 200,
                data: {
                    admin: Hash.obscure(contact, req)
                }
            });

            eventEmitter.emit('admin_created', {company, user, contact, cid: res.locals.company_id, locals: res.locals});


        } catch(err) {
            connection.rollbackAsync();
            next(err);
        }



    });

    router.get('/:contact_id/notifications',  [control.hasAccess(['admin']), Hash.unHash],  async (req, res, next) => {

        try{

          var connection = res.locals.connection;
            let user = res.locals.contact;
            let company = res.locals.active;
            let params = req.params;


            let contact = new Contact({id: params.contact_id});
            await contact.find(connection, company.id);
            await contact.getCompanies(connection);

            let company_role = contact.Companies.find(c => c.id == company.id);
            if(!company_role) e.th(409, "This user is not an administrator");

            let notifications =  await Settings.findAdminNotifications(connection, contact.id, company.id);

            utils.send_response(res, {
                status: 200,
                data: {
                    notifications: Hash.obscure(notifications, req)
                }
            });


        } catch(err) {
            next(err);
        }



    });

    router.put('/:contact_id/notifications', [control.hasAccess(['admin']), Hash.unHash], async (req, res, next) => {


        try{
          var connection = res.locals.connection;
            let user = res.locals.contact
            let company = res.locals.active;

            let body = req.body;
            let params = req.params;

            let contact = new Contact({id: params.contact_id});
            await contact.find(connection, company.id);
            await contact.getCompanies(connection);

            let company_role = contact.Companies.find(c => c.id === company.id);
            if(!company_role) e.th(409, "This user is not an administrator");


      let notifications = await Settings.findAdminNotifications(connection, contact.id, company.id);

            for(let i = 0; i < body.notifications.length; i++ ){
              let n = notifications.find(n => n.activity_action_id === body.notifications[i].activity_action_id && n.activity_object_id === body.notifications[i].activity_object_id );

        if(n){
          n.text = body.notifications[i].text;
          n.email = body.notifications[i].email;
          if(n.text || n.email){
                    await Settings.saveAdminNotifications(connection, n, n.id);
          } else {
                  await Settings.deleteAdminNotification(connection, contact.id, n.id);
          }
        } else {
          let notification = Settings.makeAdminNotifications(body.notifications[i], contact.id, company.id);
          if(notification.text || notification.email) {
            await Settings.saveAdminNotifications(connection, notification);
          }
        }
            }

            utils.send_response(res, {
                status: 200,
                data: {
                    data: {}
                }
            });

            eventEmitter.emit('admin_notifications_updated', {company, user, contact, cid: res.locals.company_id, locals: res.locals});


        } catch(err) {

            next(err);
        }



    });

    router.get('/:contact_id/activity',  [control.hasAccess(['admin']), Hash.unHash],  async (req, res, next) => {

        try{
          var connection = res.locals.connection;

            let user = res.locals.contact;
            let company = res.locals.active;
            let query = req.query;
            let params = req.params;


            let searchParams = {};

            searchParams.limit = query.limit || 20;
            searchParams.offset = query.offset || 0;

            let conditions = {
                contact_id: params.contact_id,
                company_id: company.id
            }

            let contact = new Contact({id: params.contact_id});
            await contact.find(connection, company.id);
            await contact.getCompanies(connection);

            console.log("COMPANIES", contact.Companies);
            console.log("searchParams", searchParams);
            console.log("conditions", conditions);
            
            
            let company_role = contact.Companies.find(c => c.id == company.id);
            if(!company_role) e.th(409, "This user is not an administrator");

            let activity_list = await Activity.findAdminActivity(connection, conditions, searchParams, false);

            console.log("activity_list", activity_list);

            let count = await Activity.findAdminActivity(connection, conditions, searchParams, true);

            let activity = [];

            for(let i = 0; i < activity_list.length; i++ ){
                var a = new Activity({id: activity_list[i].id});
                await a.find(connection);
                await a.findContact(connection, company.id);
                await a.findActivityObject(connection);
                await a.findActivityAction(connection);
                await a.findObject(connection);
                await a.buildMessage();
                activity.push(a);
            }


            utils.send_response(res, {
                status: 200,
                data: {
                    activity: Hash.obscure(activity, req),
                    result_count: count[0].count
                }
            });


        } catch(err) {
            next(err);
        }



    });

    router.get('/', [control.hasAccess(['admin', 'api']), Hash.unHash],  async (req, res, next) => {

        try{
          var connection = res.locals.connection;

            let user = res.locals.contact;
            let company = res.locals.active;

            let admins = await Contact.findAdminsByCompanyId(connection, company.id)

            utils.send_response(res, {
                status: 200,
                data: {
                    admins: Hash.obscure(admins, req)
                }
            });


        } catch(err) {
            next(err);
        }



    });

    router.get('/active/users', [control.hasAccess(['admin', 'api']), Hash.unHash],  async (req, res, next) => {

        try{
            var connection = res.locals.connection;
            let company = res.locals.active;
            let admins = await Contact.findActiveAdminsByCompanyId(connection, company.id)

            utils.send_response(res, {
                status: 200,
                data: {
                    admins: Hash.obscure(admins, req)
                }
            });

        } catch(err) {
            next(err);
        }
    });

    router.delete('/:contact_id', [control.hasAccess(['admin', 'api']), Hash.unHash], async (req, res, next) => {

        var connection = res.locals.connection;

        try{

            let user = res.locals.contact;
            let company = res.locals.active;

            let params = req.params;

            let contact = new Contact({id: params.contact_id})
            await contact.find(connection, company.id);

            await contact.delete(connection);

            utils.send_response(res, {
                status: 200,
                data: {}
            });

            eventEmitter.emit('admin_deleted', {company, user, contact, cid: res.locals.company_id, locals: res.locals});


            } catch(err) {
            next(err);
        }



    });

    router.get('/:contact_id/permissions', [control.hasAccess(['admin', 'api']), Hash.unHash], async(req, res, next) => {
        try{
          var connection = res.locals.connection;

            let user = res.locals.contact;
            let company = res.locals.active;
            let params = req.params;


            let contact = new Contact({id: params.contact_id});
            await contact.find(connection, company.id);
            await contact.getPermissions(connection, company.id);

            utils.send_response(res, {
                status: 200,
                data: Hash.obscure(contact.Permissions, req)
            });


        } catch(err) {
            next(err);
        }


    } );

    router.put('/roles/:role_id/permissions',  [control.hasAccess(['admin', 'api']), control.hasPermission('manage_roles'), Hash.unHash],  async(req, res, next) => {

        try{
          var connection = res.locals.connection;
            let contact = res.locals.contact;
            let company = res.locals.active;
            let api = res.locals.api;

            let body = req.body;
            let params = req.params;

            let role = new Role({id: params.role_id});
            await role.find(connection);
            await role.verifyAccess(company.id);

            await connection.beginTransactionAsync();
            await role.updatePermissions(connection, body.permissions);
            await connection.commitAsync();

            utils.send_response(res, {
                status: 200,
                data: {
                role_id: Hashes.encode(role.id, res.locals.company_id)
                }
            });

            eventEmitter.emit('role_updated', {company, contact, api, group, cid: res.locals.company_id, locals: res.locals});


        } catch(err) {
            await connection.rollbackAsync();
            next(err);
        }



    });

    router.put('/:contact_id/role', [control.hasAccess(['admin', 'api']), control.hasPermission('manage_permissions'), Hash.unHash], async (req, res, next) => {

        try{
          var connection = res.locals.connection;

            let user = res.locals.contact;
            let company = res.locals.active;
            let api = res.locals.api;

            let body = req.body;
            let params = req.params;

            let contact = new Contact({id: params.contact_id});
            await contact.find(connection, company.id);
            await contact.getRole(connection, company.id);

      for(let i = 0; i < body.Properties.length; i++){
        let property = new Property({id: body.Properties[i].id});
        await property.find(connection);
        await property.verifyAccess({connection, company_id: company.id, contact_id: user.id, permissions: ['manage_permissions'], api});
      }

            await contact.updateRole(connection, company.id, body.role_id, body.Properties);

            utils.send_response(res, {
                status: 200,
                data: {
                    data: {}
                }
            });


        } catch(err) {

            next(err);
        }



    });

    // Test Failing reason: No permission for manage_admins
    router.put('/:contact_id', [control.hasAccess(['admin', 'api']), control.hasPermission('manage_admins'), Hash.unHash], async (req, res, next) => {
        try{
          var connection = res.locals.connection;

            let user = res.locals.contact;
            let company = res.locals.active;
            let permissions = res.locals.permissions;
            let api = res.locals.api;

            let body = req.body;
            let params = req.params;
            let RolesProperties = req.body.RolesProperties || [];

            
            let admin = new Contact({id: params.contact_id});
            let contact = {};
            
            RolesProperties?.forEach( rp => {
                rp.Properties = rp.Properties?.map(p => Hashes.decode(p)[0])
                rp.NonHbProperties = rp.NonHbProperties?.map(p => Hashes.decode(p)[0])
            })

    //   for (let i = 0; i < body.Properties.length; i++){
    //     let property = new Property({id: body.Properties[i].id});
    //     await property.find(connection);
    //     await property.verifyAccess({connection, company_id: company.id, contact_id: user.id, permissions: ['manage_admins']});
    //   }

            

      await Contact.validateAdminEmail(connection, body.email,company.id,params.contact_id);
            await connection.beginTransactionAsync();

            if(admin){

                contact = new Contact({id: admin.id});
                await contact.find(connection, company.id);
                let data = {
                    first: body.first,
                    last: body.last,
                    email: body.email,
                    employee_id: body.employee_id
                }

                contact.Phones = contact.Phones || [];

                if (body.phone) {
                    contact.Phones = [{
                    id: contact.Phones.length? contact.Phones[0].id : null,
                    type: 'primary',
                    phone: body.phone,
                    primary: contact.Phones.length ? contact.Phones[0].primary: 0
                }];

            }

                await models.Contact.updateContact(connection, admin.id, data);
                await contact.savePhone(connection)

            }
            await Contact.saveCmsManager(connection, res, req, body)
            try{
              utils.hasPermission({connection, company_id: company.id, contact_id: user? user.id : null, api, permissions:['manage_permissions']})
            //   await contact.updateRole(connection, company.id, body.role_id, body.Properties, body.NonHbProperties, body.pin, body.status);

                if(!RolesProperties.length){
                    let role_properties = {};
                    role_properties.role_id = body.role_id;
                    role_properties.Properties = body.Properties?.map(p => p.id);
                    role_properties.NonHbProperties = body.NonHbProperties.map(p => p.id);

                    await contact.getRole(connection, company.id);
                    role_properties.id = contact.Roles[0]?.id;

                    RolesProperties.push(role_properties);
                }

                for(let j = 0; j < RolesProperties.length; j++ ){
                    let rp = RolesProperties[j];

                    for(let i = 0; i < rp?.Properties.length; i++){
                        let property = new Property({id: rp.Properties[i]});
                        await property.find(connection);
                        await property.verifyAccess({connection, company_id: company.id, contact_id: user? user.id : null, permissions: ['manage_admins'], api});
                    }
                }
                
                await contact.updateRoles(connection, company.id, RolesProperties, body.status);
            } catch(err){
              console.log(err);
      }


            connection.commitAsync();

            contact.RolesProperties?.forEach( rp => {
                rp.Properties = rp.Properties?.map(p => Hashes.encode(p, res.locals.company_id))
                rp.NonHbProperties = rp.NonHbProperties?.map(p => Hashes.encode(p, res.locals.company_id))
            })

            utils.send_response(res, {
                status: 200,
                data: {
                    admin: Hash.obscure(contact, req)
                }
            });

            eventEmitter.emit('admin_created', {company, user, contact, cid: res.locals.company_id, locals: res.locals});


        } catch(err) {
            connection.rollbackAsync();
            next(err);
        }


    });

    return router;

};



