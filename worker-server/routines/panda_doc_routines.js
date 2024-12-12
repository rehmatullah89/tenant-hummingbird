var moment      = require('moment');
var Promise = require('bluebird');
var e  = require(__dirname + '/../modules/error_handler.js');

// var pool = require(__dirname + '/../modules/db.js');
var db = require(__dirname + '/../modules/db_handler.js');


// var utils    = require(__dirname + '/../modules/utils.js');

var Hash = require(__dirname + '/../modules/hashes.js');
var Hashes = Hash.init();

const Socket = require(__dirname + '/../classes/sockets.js');

var PandaDocGenerator = {
    create_panda_doc: async(data) =>{

        try{
            console.log("create_panda_doc Data", data)
            var connection = await db.getConnectionByType('write', data.cid);
            // var connection = await pool.getConnectionAsync();
            // TODO Can we generate for non leases?

            let lease = new Lease({ id: data.lease_id });
            await lease.find(connection);

            let company = new Company({id: data.company_id});
            await company.find(connection);

            // MOVED above the lease query so we can conditionally get the lease info.
            let document = new Document({id: data.document_id});
            await document.getTemplateDetails(company);
            console.log("create_panda_doc document", document.Details.tokens);
            await lease.findFull(connection, company, [], document);

            if(data.rent_change_lease_id){
                await lease.getRentRaiseDetails(connection, company, data.rent_change_lease_id);
            }

            await document.mergeTokens(connection, lease);

            if(document.requiresSign){
              await document.setSigners(lease);
            }

            let response = await document.createPandaDoc(lease, company);
            let upload_data = {
                foreign_id: response.id,
                name: response.name,
                contact_id : data?.contact_id,
                uploaded_by : data?.uploaded_by,
                mimetype: 'application/pdf'
            };            
            let upload = new Upload(upload_data);


            await upload.setDocumentType(connection, null, 'file', company.id);

            //await upload.setFileName();

            await upload.save(connection);

            upload.setSrc(data.cid);

            await upload.saveUploadLease(connection, lease.id);

            if(document.requiresSign) {
              for (let i = 0; i < document.Signers.length; i++) {
                await upload.saveUploadSigner(connection, document.Signers[i]);
              }
            }

            data.upload_id = upload.id;
            data.requires_sign = document.requiresSign;

            console.log("We have generated the document")
            

        } catch(err) {
            console.log("error", err);
            await db.closeConnection(connection);
            //await utils.closeConnection(pool, connection);
            if(err.code) throw err;
            else  e.th(err.statusCode, err.message);
        }

         await db.closeConnection(connection);
         return data;
    },
    async send_pandadoc(data, count = 0) {
        console.log("routines send_pandadoc", data);
        try {
            var connection = await db.getConnectionByType('write', data.cid);

            let company = new Company({id: data.company_id});
            await company.find(connection);

            let lease = new Lease({ id: data.lease_id });
            await lease.find(connection);

            data.Upload = new Upload({
                id: data.upload_id
            });

            await data.Upload.find(connection);
            await data.Upload.findSigners(connection, company.id);


            // Needs to be ready to download.
            let r = await data.Upload.getStatus(company);
            console.log("check status ", r.status);
            if(r.status !== 'document.draft') {
                console.log("not ready ", count);
                count++;
                if(count > 10) e.th(409, r.status);
                await new Promise(resolve => setTimeout(resolve, count * 1000));
                return await PandaDocGenerator.send_pandadoc(data, count);
            } else {
                console.log("()()()()()()()()()()  READY!!! ");
            }

            console.log("check requires sign");
            if(data.requires_sign) {
                console.log("requires sign");

                console.log("status is good! send ");
                data.Upload.setSource({
                    cid:data.cid
                });
                await data.Upload.sendDocument(company);
            }

            console.log("Socket Info ", data.socket_details);

            if(data.socket_details){
                if(data.requires_sign) {
                    await this.send_update(data, 'ready', connection)
                }
            };

            await this.save_file(connection, data, company);

            if(data.checklist_id){
              await lease.updateChecklistItem(connection, { upload_id: data.Upload.id, completed: false}, data.checklist_id);
            }


            if(data.socket_details){
                await this.send_update(data, 'loaded', connection);
            }

            await db.closeConnection(connection);
            return data;

        } catch(err) {
            console.log(err.stack);
            console.log(err);
            await db.closeConnection(connection);
            throw err;
        }
    },
    async save_file (connection, data, company) {
        data.Upload.setFileName();
        await data.Upload.downloadPandaDoc(company);
        await data.Upload.save(connection);
        return;
    },

    async download_signed_pandadoc(data){

        try {
            var connection = await db.getConnectionByType('write', data.cid);

            let upload = new Upload({ id: data.upload_id });
            await upload.find(connection);
            await upload.findSigners(connection);

            let company = new Company({id: data.company_id});
            await company.find(connection);

            await this.save_file(connection, { Upload: upload }, company);

            let admins = await Contact.findAdminsByPropertyId(connection, company.id,   data.property_id);

            for(let i = 0; i < admins.length; i++){
                await this.send_update({
                    checklist_id: data.checklist_id,
                    lease_id: data.lease_id,
                    company_id: company.id,
                    document_id: data.foreign_id,
                    status: "finished",
                    completed: true,
                    socket_details: {
                        company_id: company.id,
                        contact_id: admins[i].contact_id
                    },
                    Upload: upload
                }, 'finished', connection);
            }

        } catch(err) {
            await db.closeConnection(connection);
            console.log(err.stack);
            console.log(err);
            throw err;
        }
        await db.closeConnection(connection);
    },

    async download_pandadoc(data){

        try {

            var connection = await db.getConnectionByType('write', data.cid);

            let upload = new Upload({ id: data.upload_id });
            await upload.find(connection);
            await upload.findSigners(connection);
            upload.document = await upload.download(data.company);


            await db.closeConnection(connection);
            return upload;
        } catch(err) {
            console.log(err.stack);
            console.log(err);
            await db.closeConnection(connection);
            throw err;
        }

    },


    async send_update(data, status, connection) {

        let socket = new Socket({
            company_id: data.socket_details.company_id,
            contact_id: data.socket_details.contact_id,
        });

        try {
            let connected = await socket.isConnected(data.socket_details.contact_id);
            console.log("ARE We CONNECTED", connected);
            if(!connected) return;

            await socket.createEvent("pandadoc_generation_update", Hash.obscure({
                checklist_id: data.checklist_id,
                lease_id: data.lease_id,
                document_id: data.document_id,
                status: status,
                completed: data.completed,
                Upload: {
                    id: data.Upload.id,
                    src: data.Upload.src,
                    name: data.Upload.name,
                    upload_date: data.Upload.upload_date,
                    filename: data.Upload.filename,
                    mimetype: data.Upload.mimetype,
                    signers: data.Upload.signers.map(s => {
                        return {
                            id: s.id,
                            email: s.email,
                            signed: s.signed,
                            status: s.status,
                            Contact: {
                                id: s.Contact.id,
                                first: s.Contact.first,
                                last: s.Contact.last,
                                Phones: s.Contact.Phones
                            }
                        }
                    })
                },

            }, {params: {company_id: connection.cid}}));
        } catch(err){
            console.log("Cant send socket event", err);
            return;
        }
    },

    panda_doc_error: async (data) => {

        if(!data.socket_details) return;

        let socket = {};

        socket = new Socket({
            company_id: data.socket_details.company_id,
            contact_id: data.socket_details.contact_id,
        });

        await socket.createEvent("pandadoc_generation_update",  {
            checklist_id: data.checklist_id,
            lease_id: data.lease_id,
            document_id: data.document_id,
            status: 'error'
        });
    },

    panda_doc_success: async (wf) => {
        let data = wf.dependencies[0].data;
        console.log("panda_doc_success data", data);
    }
}



module.exports = {
    create_panda_doc: async(data) => {
        return await PandaDocGenerator.create_panda_doc(data);
    },
    send_pandadoc: async(data) => {
        return await PandaDocGenerator.send_pandadoc(data);
    },
    panda_doc_error: async(data) => {
        return await PandaDocGenerator.panda_doc_error(data);
    },
    panda_doc_success: async(data) => {
        return await PandaDocGenerator.panda_doc_success(data);
    },
    download_signed_pandadoc: async(data) => {
        return await PandaDocGenerator.download_signed_pandadoc(data);
    },
    download_pandadoc: async(data) => {
        return await PandaDocGenerator.download_pandadoc(data);
    },
};


var Contact      = require(__dirname + '/../classes/contact.js');
var Company      = require(__dirname + '/../classes/company.js');
var Lease      = require(__dirname + '/../classes/lease.js');
var Document      = require(__dirname + '/../classes/document.js');
var Upload      = require(__dirname + '/../classes/upload.js');