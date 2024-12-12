var moment = require('moment');
var e = require(__dirname + '/../modules/error_handler.js');
var request = require("request-promise");
var axios = require("axios");
var request_og = require("request");

const panda_client_id = "ba7335f7a341c51ecc24";
const panda_client_secret = "0ea6a2a00ef594a42fcd168a9f745dd83a154fcc";
var utils = require(__dirname + '/../modules/utils.js');
const ENUM = require(__dirname + '/../modules/enums.js');

var fillTemplate = require('es6-dynamic-template');

let PANDADOCS_DOCUMENTS_URI = 'https://api.pandadoc.com/public/v1/documents/';
let PANDADOCS_TEMPLATES_URI = 'https://api.pandadoc.com/public/v1/templates/';
let GDS_PANDADOC_TOKEN_URI = process.env.GDS_PANDADOC_TOKEN_URI;
let GDS_PANDADOC_APP_ID = process.env.GDS_PANDADOC_APP_ID;
let GDS_API_KEY = process.env.GDS_API_KEY;
const fs = require("fs");
var pandadocs = {}

var pd = {

    async getToken(company) {
        console.log("pandadocs getToken");
        if (!company || !company.gds_owner_id) e.th(500, "Missing company id");
        let token_request = GDS_PANDADOC_TOKEN_URI + 'owners/' + company.gds_owner_id + '/credentials/';

        try {
            var response = await request({
                headers: {
                    'X-storageapi-key': GDS_API_KEY,
                    'X-storageapi-date': moment().unix(),
                    'Content-Type': 'application/json'
                },
                uri: token_request,
                method: 'GET',
                json: true
            });

        } catch (err) {
            throw err;
        }
        console.log("response", JSON.stringify(response.applicationData, null, 2));
        let pandadocs = response.applicationData[GDS_PANDADOC_APP_ID][0].data;

        return pandadocs;

        // pandadocs.access_token = response.access_token;
        // pandadocs.refresh_token = response.refresh_token;

    },

    async getDocuments(company, count = 0) {
        console.log("pandadocs getDocuments");

        let token = await this.getToken(company);

        try {
            var response = await request({
                headers: {
                    Authorization: 'Bearer ' + token.access_token
                },
                uri: PANDADOCS_TEMPLATES_URI,
                method: 'GET',
                json: true
            });
        } catch (err) {
            console.log("PANDADOCS ERROR!!!, getDocuments", err);
            console.log("err.statusCode", err.statusCode);
            if(err.statusCode === 429){
                count++;
                if(count > 10) e.th(err.statusCode, err.statusMessage)
                await new Promise(resolve => setTimeout(resolve, count * 1000));
                return await pd.getDocuments(company, count);
            } else {
                e.th(err.statusCode, err.statusMessage)
            }
        }

        if (!response.results) {
            e.th(500, "Could not get a response from Panda Docs")
        }
        return response.results;
    },

    async getTemplateDetails(template_id, company, count = 0) {
        console.log("pandadocs getTemplateDetails");
        let token = await this.getToken(company);
        let URI = PANDADOCS_TEMPLATES_URI + template_id + '/details';
        try {
            var response = await request({
                headers: {
                    Authorization: 'Bearer ' + token.access_token
                },
                json: true,
                uri: URI,
                method: 'GET'
            });
        } catch (err) {
            console.log("PANDADOCS ERROR!!!, getTemplateDetails", err);
            console.log("err.statusCode", err.statusCode);
            if(err.statusCode === 429){
                count++;
                if(count > 10) e.th(err.statusCode, err.statusMessage);
                await new Promise(resolve => setTimeout(resolve, count * 1000));
                return await pd.getTemplateDetails(template_id, company, count);
            } else {
                e.th(err.statusCode, err.statusMessage)
                
            }
        }

        if (!response) {
            e.th(500, "Could not get a response from Panda Docs")
        }

        return response;

    },

    async createDoc(data, company, count = 0) {
        console.log("pandadocs createDoc");
        let token = await this.getToken(company);

        try {
            var response = await request({
                headers: {
                    Authorization: 'Bearer ' + token.access_token
                },
                body: data,
                json: true,
                uri: PANDADOCS_DOCUMENTS_URI,
                method: 'POST'
            });
        } catch (err) {
            console.log("PANDADOCS ERROR!!!, createDoc", err);
            console.log("err.statusCode", err.statusCode);
            if(err.statusCode === 429){
                count++;
                if(count > 10) e.th(err.statusCode, err.statusMessage);
                await new Promise(resolve => setTimeout(resolve, count * 30000));
                return await pd.createDoc(data, company, count);
            } else {
                e.th(err.statusCode, err.statusMessage)
            }
        }
        if (!response) {
            e.th(500, "Could not get a response from Panda Docs")
        }
        return response;

    },

    async sendDocument(document_id, company, count = 0) {
        console.log("pandadocs sendDocument");
        let token = await this.getToken(company);
        let URI = PANDADOCS_DOCUMENTS_URI + document_id + '/send';
        try {
            var response = await request({
                headers: {
                    Authorization: 'Bearer ' + token.access_token
                },
                body: {
                    message: 'Message Sent from API',
                    subject: "Panda Doc File",
                    silent: true
                },
                json: true,
                uri: URI,
                method: 'POST'
            });
        } catch (err) {
            console.log("PANDADOCS ERROR!!!, sendDocument", err);
            console.log("err.statusCode", err.statusCode);
            if(err.statusCode === 429){
                count++;
                if(count > 10) e.th(err.statusCode, err.statusMessage);
                await new Promise(resolve => setTimeout(resolve, count * 1000));
                return await pd.sendDocument(document_id, company, count);
            } else {
                e.th(err.statusCode, err.statusMessage)
            }
        }
        if (!response) {
            e.th(500, "Could not get a response from Panda Docs")
        }

        return response;
    },

    async download(document_id, company, path, count = 0) {
        console.log("pandadocs download");
        let token = await this.getToken(company);
        let URI = PANDADOCS_DOCUMENTS_URI + document_id + '/download/';

        try{

            return await new Promise((resolve, reject) => {
                // await fs.writeFile('/home/app/hummingbird/uploads/' + utils.slugify(upload.name) + '.pdf', new Buffer(file));
                let file = fs.createWriteStream(path);
                var chunks = [];
                
                return request({
                    /* Here you should specify the exact link to the file you are trying to download */
                    uri: URI,
                    headers: {
                        Authorization: 'Bearer ' + token.access_token,
                        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
                        'Accept-Encoding': 'gzip, deflate, br',
                        'Accept-Language': 'en-US,en;q=0.9,fr;q=0.8,ro;q=0.7,ru;q=0.6,la;q=0.5,pt;q=0.4,de;q=0.3',
                        'Cache-Control': 'max-age=0',
                        'Connection': 'keep-alive',
                        'Upgrade-Insecure-Requests': '1'
                    },
                    /* GZIP true for most of the websites now, disable it if you don't need it */
                    gzip: true
                })
                .pipe(file)
                .on('finish', () => {
                    resolve();
                })
                .on('error', async (err) => {
                    console.log("PANDADOCS ERROR!!!, download", err);
                    console.log("err.statusCode", err.statusCode);
                    if(err.statusCode === 429){
                        
                        count++;
                        if(count > 10) reject(err);
                        await new Promise(resolve => setTimeout(resolve, count * 1000));
                        await pd.download(document_id, company, path, count = 0);
                        resolve();
                    } else {
                        reject(err);
                    }
                })
            })
        } catch(err){
            e.th(err.statusCode, err.statusMessage)
        }

        if (fs.existsSync(path)) {
            var stats = fs.statSync(path)
            console.log("DOWNLOADED FILE EXISTS", stats);
        } else {
            console.log("DOWNLOADED FILE DOESN'T EXIST");
        }

        return;

    },

    async getSession(document_id, signer, company, count = 0) {
        console.log("pandadocs getSession");
        let token = await this.getToken(company);
        let URI = PANDADOCS_DOCUMENTS_URI + document_id + '/session';

        try {
            var response = await request({
                headers: {
                    Authorization: 'Bearer ' + token.access_token
                },
                body: {
                    "recipient": signer.email,
                    "lifetime": 10000
                },
                json: true,
                uri: URI,
                method: 'POST'
            });
        } catch (err) {
            if(err.statusCode === 429){
                count++;
                if(count > 10) e.th(err.statusCode, err.statusMessage);
                await new Promise(resolve => setTimeout(resolve, count * 1000));
                return await pd.getSession(document_id, signer, company, count);
            } else {
                console.log("THIS THE ERROR", err);
                e.th(err.statusCode, err.statusMessage)
            }
        }
        if (!response) {
            e.th(500, "Could not get a response from Panda Docs")
        }
        console.log("getSession", response);
        return response;
    },

    async getStatus(document_id, company, count) {
        console.log("pandadocs getStatus");
        let token = await this.getToken(company);
        let URI = PANDADOCS_DOCUMENTS_URI + document_id;
        try {
            var response = await request({
                headers: {
                    Authorization: 'Bearer ' + token.access_token
                },
                json: true,
                uri: URI,
                method: 'GET'
            });
        } catch (err) {
            if(err.statusCode === 429){
                count++;
                if(count > 10) e.th(err.statusCode, err.statusMessage);
                await new Promise(resolve => setTimeout(resolve, count * 1000));
                return await pd.getStatus(document_id, company, count);
            } else {
                console.log("THIS THE ERROR", err);
                e.th(err.statusCode, err.statusMessage)
            }
        }

        if (!response) {
            e.th(500, "Could not get a response from Panda Docs")
        }
        return response;
    },

    requiresSign(details) {
        console.log("pandadocs requiresSign");
        if (!details.fields || !details.fields.length) return false;
        return !!details.fields.find(d => d.name === 'Signature' || d.name === 'Initials')
    },

    mergeTokens(connection, lease, details) {
        console.log("pandadocs mergeTokens", details);
        // UNTIL We support multiple signers
        let position = 0;
        if (!details || !details.tokens) e.th(500, 'Document details not set');
        if (!details.tokens.length) return;
        // console.log("details.tokens", details.tokens);

        details.tokens.map(async t => {
            console.log("tokenname", t.name);
            switch (t.name) {
                case 'Tenant.FirstName':
                    if (!lease.Tenants.length) e.th(400, "There were no tenants found while attempting to create this document");
                    t.value = lease.Tenants[position].Contact.first;
                    break;
                case 'Tenant.LastName':
                    if (!lease.Tenants.length) e.th(400, "There were no tenants found while attempting to create this document");
                    t.value = lease.Tenants[position].Contact.last;
                    break;

                case 'Tenant.Email':
                    if (!lease.Tenants.length) e.th(400, "There were no tenants found while attempting to create this document");
                    t.value = lease.Tenants[position].Contact.email;
                    break;
                case 'Tenant.Company':
                    if (!lease.Tenants.length) e.th(400, "There were no tenants found while attempting to create this document");
                    t.value = lease.Tenants[position].Contact.Company && lease.Tenants[position].Contact.Company.name;
                    break;
                case 'Tenant.HomePhone':
                    if (!lease.Tenants.length) e.th(400, "There were no tenants found while attempting to create this document");
                    if (lease.Tenants[position].Contact.Phones.length) {
                        let phone = lease.Tenants[position].Contact.Phones.find(p => p.type.toLowerCase() === 'home');
                        t.value = phone ? utils.formatPhone(phone.phone) : ' ';
                    }
                    break;
                case 'Tenant.Phone':
                    if (!lease.Tenants.length) e.th(400, "There were no tenants found while attempting to create this document");
                    if (lease.Tenants[position].Contact.Phones.length) {
                        t.value = utils.formatPhone(lease.Tenants[position].Contact.Phones[0].phone);
                    }
                    break;
                case 'Tenant.Country':
                    if (!lease.Tenants.length) e.th(400, "There were no tenants found while attempting to create this document");
                    if (lease.Tenants[position].Contact.Addresses.length) {
                        t.value = lease.Tenants[position].Contact.Addresses[position].Address.country || '';
                    }
                    break;
                case 'Tenant.State':
                    if (!lease.Tenants.length) e.th(400, "There were no tenants found while attempting to create this document");
                    if (lease.Tenants[position].Contact.Addresses.length) {
                        t.value = lease.Tenants[position].Contact.Addresses[position].Address.state;
                    }
                    break;
                case 'Tenant.StreetAddress':
                    if (!lease.Tenants.length) e.th(400, "There were no tenants found while attempting to create this document");
                    if (lease.Tenants[position].Contact.Addresses.length) {
                        t.value = lease.Tenants[position].Contact.Addresses[0].Address.address;
                    }
                    break;
                case 'Tenant.City':
                    if (!lease.Tenants.length) e.th(400, "There were no tenants found while attempting to create this document");
                    if (lease.Tenants[position].Contact.Addresses.length) {
                        t.value = lease.Tenants[position].Contact.Addresses[0].Address.city;
                    }
                    break;
                case 'Tenant.PostalCode':
                    if (!lease.Tenants.length) e.th(400, "There were no tenants found while attempting to create this document");
                    if (lease.Tenants[position].Contact.Addresses.length) {
                        t.value = lease.Tenants[position].Contact.Addresses[0].Address.zip;
                    }
                    break;
                case 'Tenant.DLNumber':
                    if (!lease.Tenants.length) e.th(400, "There were no tenants found while attempting to create this document");
                    if (lease.Tenants[position].Contact) {
                        const dlNumber = lease.Tenants[position].Contact.driver_license;
                        t.value = '****' + dlNumber.slice(-4);
                    }
                    break;
                case 'Tenant.DLProvince':
                    if (!lease.Tenants.length) e.th(400, "There were no tenants found while attempting to create this document");
                    if (lease.Tenants[position].Contact) {
                        t.value = lease.Tenants[position].Contact.driver_license_state;
                    }
                    break;
                case 'Tenant.Title':
                    if (!lease.Tenants.length) e.th(400, "There were no tenants found while attempting to create this document");
                    if (lease.Tenants[position].Contact) {
                        t.value = lease.Tenants[position].Contact.salutation;
                    };
                    break;
                case 'Tenant.AltEmail':
                    // TODO verify if this is the correct way to handle this...
                    if (!lease.Tenants.length) e.th(400, "There were no tenants found while attempting to create this document");
                    if (!lease.Tenants[position].Contact.Relationships || lease.Tenants[position].Contact.Relationships.length) {
                        t.value = lease.Tenants[position].Contact.Relationships[0].Contact.email || ' ';
                        break;
                    }
                    break;
                case 'Tenant.AltName':
                    if (!lease.Tenants.length) e.th(400, "There were no tenants found while attempting to create this document");
                    if (!lease.Tenants[position].Contact.Relationships || lease.Tenants[position].Contact.Relationships.length) {
                        t.value = ' ';
                        t.value = lease.Tenants[position].Contact.Relationships[0].Contact.first + ' ' + lease.Tenants[position].Contact.Relationships[0].Contact.last;
                        break;
                    }
                    break;
                case 'Tenant.AltPhone':
                    if (!lease.Tenants.length) e.th(400, "There were no tenants found while attempting to create this document");
                    if (!lease.Tenants[position].Contact.Relationships || !lease.Tenants[position].Contact.Relationships.length) {
                        t.value = ' ';
                        break;
                    }
                    if (!lease.Tenants[position].Contact.Relationships[0].Contact.Phones || !lease.Tenants[position].Contact.Relationships[0].Contact.Phones.length) {
                        t.value = ' ';
                        break;
                    }
                    t.value = utils.formatPhone(lease.Tenants[position].Contact.Relationships[0].Contact.Phones[0].phone);
                    break;

                case 'Tenant.AltAddress1':
                    if (!lease.Tenants.length) e.th(400, "There were no tenants found while attempting to create this document");
                    if (lease.Tenants[position].Contact.Relationships && lease.Tenants[position].Contact.Relationships.length && lease.Tenants[position].Contact.Relationships[0].Contact.Addresses.length) {
                        t.value = lease.Tenants[position].Contact.Relationships[0].Contact.Addresses[0].Address.address;
                    }
                    break;
                case 'Tenant.AltAddress2':
                    if (!lease.Tenants.length) e.th(400, "There were no tenants found while attempting to create this document");
                    if (lease.Tenants[position].Contact.Relationships && lease.Tenants[position].Contact.Relationships.length && lease.Tenants[position].Contact.Relationships[0].Contact.Addresses.length) {
                        t.value = lease.Tenants[position].Contact.Relationships[0].Contact.Addresses[0].Address.address2;
                    }
                    break;

                case 'Tenant.AltCity':
                    if (!lease.Tenants.length) e.th(400, "There were no tenants found while attempting to create this document");
                    if (lease.Tenants[position].Contact.Relationships && lease.Tenants[position].Contact.Relationships.length && lease.Tenants[position].Contact.Relationships[0].Contact.Addresses.length) {
                        t.value = lease.Tenants[position].Contact.Relationships[0].Contact.Addresses[0].Address.city;
                    }
                    break;
                case 'Tenant.AltState':
                    if (!lease.Tenants.length) e.th(400, "There were no tenants found while attempting to create this document");
                    if (lease.Tenants[position].Contact.Relationships && lease.Tenants[position].Contact.Relationships.length && lease.Tenants[position].Contact.Relationships[0].Contact.Addresses.length) {
                        t.value = lease.Tenants[position].Contact.Relationships[0].Contact.Addresses[0].Address.state;
                    }
                    break;
                case 'Tenant.AltCountry':
                    if(!lease.Tenants.length) e.th(400, "There were no tenants found while attempting to create this document");
                    if(lease.Tenants[position].Contact.Relationships && lease.Tenants[position].Contact.Relationships.length && lease.Tenants[position].Contact.Relationships[0].Contact.Addresses.length ) {
                        t.value = lease.Tenants[position].Contact.Relationships[0].Contact.Addresses[0].Address.country || '';
                    }
                    break;
                case 'Tenant.AltPostalCode':
                    if (!lease.Tenants.length) e.th(400, "There were no tenants found while attempting to create this document");
                    if (lease.Tenants[position].Contact.Relationships && lease.Tenants[position].Contact.Relationships.length && lease.Tenants[position].Contact.Relationships[0].Contact.Addresses.length) {
                        t.value = lease.Tenants[position].Contact.Relationships[0].Contact.Addresses[0].Address.zip;
                    }
                    break;

                case 'Tenant.MoveInDate':
                    t.value = moment(lease.start_date, 'YYYY-MM-DD').format('M/D/YYYY');
                    break;

                case 'Tenant.MoveInDiscount':
                    if (!lease.Discounts.length) {
                        break;
                    }
                    t.value = lease.Promotion;
                    break;
                case 'Document.GrandTotal':
                case 'Facility.TotalMovingCost':
                case 'Tenant.TotalMoveInCost':
                    t.value = (lease.MoveInInvoice.total_due) ? utils.formatMoney(lease.MoveInInvoice.total_due - lease.MoveInInvoice.total_discounts) : '';
                    break;

                case 'Tenant.InsurancePremium':{
                        if (!lease.ActiveInsuranceService) {
                            if(!lease.FutureInsuranceService){
                                t.value = 'N/A';
                                break;
                            }
                            t.value = utils.formatMoney(lease.FutureInsuranceService.Insurance.premium_value);
                            break;
                        };
                        t.value = utils.formatMoney(lease.ActiveInsuranceService.Insurance.premium_value);
                        break;
                    }

                case 'Tenant.ProratedInsurancePremium':
                    {
                        if (!lease.MoveInInvoice.id) break;
                        let billed_insurance = lease.MoveInInvoice.InvoiceLines.find(i => i.Product.default_type === 'insurance')
                        t.value = billed_insurance ? utils.formatMoney(billed_insurance.cost) : 0;
                        break;
                    }

                case 'Tenant.NewRate':
                    {
                        if (!lease.new_rate) break;
                        t.value = utils.formatMoney(lease.new_rate);
                        break;
                    }

                case 'Tenant.NewRateDate':
                    {
                        if (!lease.new_rate_date) break;
                        t.value = moment(lease.new_rate_date, 'YYYY-MM-DD').format('M/D/YYYY');
                        break;
                    }

                case 'Facility.AdminFee':
                    {

                        if (!lease.MoveInInvoice.total_due) break;

                        let billed_fee = lease.MoveInInvoice.InvoiceLines.find(i => i.Product.default_type === 'late')
                        t.value = billed_fee ? utils.formatMoney(billed_fee.cost) : 0;
                        break;
                    }

                case 'Agreement.Name':

                    break;
                case 'Document.CreatedDate':
                    t.value = moment().format('MM/DD/YYYY');
                    break;
                case 'Document.Date':
                    t.value = moment().format('MM/DD/YYYY');
                    break;
                case 'Document.DatePlus5':
                    t.value = moment().add(5,'d').format('MM/DD/YYYY');
                    break;
                case 'Document.DatePlus7':
                    t.value = moment().add(7, 'd').format('MM/DD/YYYY');
                    break;
                case 'Document.DatePlus10':
                    t.value = moment().add(10,'d').format('MM/DD/YYYY');
                    break;
                case 'Document.DatePlus14':
                    t.value = moment().add(14,'d').format('MM/DD/YYYY');
                    break;
                case 'Document.DatePlus15':
                    t.value = moment().add(15,'d').format('MM/DD/YYYY');
                    break;
                case 'Document.DatePlus30':
                    t.value = moment().add(30,'d').format('MM/DD/YYYY');
                    break;
                case 'Document.DatePlus60':
                    t.value = moment().add(60,'d').format('MM/DD/YYYY');
                    break;
                case 'Document.RefNumber':
                    break;
                case 'Facility.Name':
                    t.value = lease.Property.name;
                    break;
                case 'Facility.Website':
                    t.value = lease.Property.landing_page;
                    break;
                case 'Facility.Address1':
                    console.log("lease.Property", lease.Property);
                    t.value = lease.Property.Address.address;
                    break;
                case 'Facility.Address2':
                    t.value = lease.Property.Address.address2 || ' ';
                    break;
                case 'Facility.City':
                    t.value = lease.Property.Address.city;
                    break;
                case 'Facility.State':
                    t.value = lease.Property.Address.state;
                    break;
                case 'Facility.Country':
                    t.value = lease.Property.Address.country || '';
                    break;
                case 'Facility.PostalCode':
                    t.value = lease.Property.Address.zip;
                    break;
                case 'Facility.Zipcode':
                    t.value = lease.Property.Address.zip;
                    break;
                case 'Facility.Phone':
                    if (lease.Property.Phones.length) {
                        t.value = utils.formatPhone(lease.Property.Phones[0].phone);
                    }
                    break;
                case 'Facility.Email':
                    if (lease.Property.Emails.length) {
                        t.value = lease.Property.Emails[0].email;
                    }
                    break;
                case 'Tenant.ProratedRent':
                    if (!lease.MoveInInvoice.id) break;
                    let billed_rent = lease.MoveInInvoice.InvoiceLines.find(i => i.Product.default_type === 'rent')
                    t.value = billed_rent ? utils.formatMoney(billed_rent.cost) : 0;
                    break;
                case 'Tenant.Rate':
                case 'Tenant.Rent':
                case 'Facility.RentalRate':
                case 'Facility.Rate':
                case 'Space.Rent':
                    if(lease && lease.Services && lease.Services.length){
                        let leaseRentServices = lease.Services.filter(f => f.name === 'Rent');
                        if(leaseRentServices && leaseRentServices.length){
                            let rentService = leaseRentServices.length > 1? leaseRentServices.filter(f => (moment(f.start_date) < moment()) && (moment(f.end_date) > moment() || f.end_date === null)) : leaseRentServices
                            t.value = rentService && rentService.length? utils.formatMoney(rentService[0].price): '';
                        } else t.value = ''
                        
                    } else t.value = '';
                    break;
                case 'Tenant.MonthlyCost':
                    if (lease?.monthly_cost)
                        t.value = lease.monthly_cost > 0 ? utils.formatMoney(lease.monthly_cost) : '';
                    break;
                case 'Tenant.UnitID':
                case 'Facility.UnitID':
                    t.value = "#" + lease.Unit.number;
                    break;
                case 'Facility.UnitSize':
                    t.value = lease.Unit.width + ' x ' + lease.Unit.length;
                    break;
                case 'Facility.UnitType':
                    t.value = lease.Unit.type;
                    break;
                case 'Facility.RentDueDate':
                case 'Facility.RentDueDateWithSuffix':
                case 'Tenant.RentDueDate':
                    t.value = utils.dayEnding(lease.bill_day);
                    break;
                case 'Tenant.ActiveMilitaryNo':
                    t.value = String(!lease.Tenants[position].Contact.Military.active);
                    break;
                case 'Tenant.ActiveMilitaryYes':
                    t.value = String(!!lease.Tenants[position].Contact.Military.active);
                    break;
                case 'Tenant.Address1':
                    if (lease.Tenants[position].Contact.Addresses.length) {
                        t.value = lease.Tenants[position].Contact.Addresses[0].Address.address || ' ';
                    }
                    break;
                case 'Tenant.Address2':
                    if (lease.Tenants[position].Contact.Addresses.length) {
                        t.value = lease.Tenants[position].Contact.Addresses[0].Address.address2 || ' ';
                    }
                    break;

                case 'Tenant.CellPhone':
                    if (!lease.Tenants.length) e.th(400, "There were no tenants found while attempting to create this document");
                    if (!lease.Tenants[position].Contact.Phones || !lease.Tenants[position].Contact.Phones.length) {
                        t.value = ' ';
                        break;
                    }
                    let phone = lease.Tenants[position].Contact.Phones.find(p => ['mobile', 'cell phone'].indexOf(p.type.toLowerCase() >= 0));
                    t.value = utils.formatPhone(phone.phone) || ' ';
                    break;

                case 'Tenant.GateAccessCode':
                    if (!lease.Tenants.length) e.th(400, "There were no tenants found while attempting to create this document");

                    if (lease.Tenants[position].Contact.Access && lease.Tenants[position].Contact.Access) {
                        let access = lease.Tenants[position].Contact.Access;
                        t.value = access && access.pin;

                    } else {
                        t.value = ' ';
                    }
                    break;
                case 'Tenant.Name':
                    if (!lease.Tenants.length) e.th(400, "There were no tenants found while attempting to create this document");
                    t.value = lease.Tenants[position].Contact.first + ' ' + lease.Tenants[position].Contact.last;
                    break;

                case 'Tenant.UnitId':
                    t.value = lease.Unit.number;
                    break;

                    // case 'Tenant.UnitSize':
                    //   t.value = lease.Unit.Category.name;
                    //   break;

                case 'Tenant.CardExpDate':
                    if (lease.PaymentMethods && lease.PaymentMethods.length) {
                        var card = lease.PaymentMethods.find(f => f.type === 'card');
                        var expWarning = card && card.exp_warning;
                        t.value = expWarning? moment(expWarning, 'YYYY-MM-DD').format('M/D/YYYY'): '';
                    }
                    break;

                case 'Tenant.CardName':
                    if (lease.PaymentMethods && lease.PaymentMethods.length) {
                        var card = lease.PaymentMethods.find(f => f.type === 'card');
                        t.value = card && card.name_on_card || '';
                    }
                    break;
                case 'Tenant.CardNumber':
                    if (lease.PaymentMethods && lease.PaymentMethods.length) {
                        var card = lease.PaymentMethods.find(f => f.type === 'card');
                        t.value = card && card.card_end || '';
                    }
                    break;
                case 'Tenant.BankAccountNo':
                    if (lease.PaymentMethods && lease.PaymentMethods.length) {
                        let card = lease.PaymentMethods.find(f => f.type === 'ach');
                        t.value = card && card.card_end || '';
                    }
                    break;
                case 'Tenant.BankRoutingNo':
                    if (lease.PaymentMethods && lease.PaymentMethods.length) {
                        var card = lease.PaymentMethods.find(f => f.type === 'ach');
                        t.value = card && card.routing_number || '';
                    }
                    break;
                case 'Tenant.CardBusinessName':
                    if (lease.PaymentMethods && lease.PaymentMethods.length) {
                        var card = lease.PaymentMethods.find(f => f.type === 'ach');
                        t.value = card && card.name_on_card || '';
                    }
                    break;
                case 'Tenant.AccountType':
                    if (lease.PaymentMethods && lease.PaymentMethods.length) {
                        var card = lease.PaymentMethods.find(f => f.type === 'ach');
                        t.value = card && card.card_type || '';
                    }
                    break;

                case 'PricingTable1.Discount':
                    break;
                case 'PricingTable1.Quantity':
                    t.value = "1";
                    break;
                case 'PricingTable1.Subtotal':
                    t.value = "$99.99";
                    break;
                case 'PricingTable1.Total':
                    t.value = "$1000.00";
                    break;

                case 'Tenant.MilitaryBranchName':
                    if (!lease.Tenants.length) e.th(400, "There were no tenants found while attempting to create this document");
                    t.value = lease.Tenants[position].Contact.Military && lease.Tenants[position].Contact.Military.branch;
                    break;
                    // case 'Tenant.MilitaryCommandingOfficer':
                    //   t.value = !lease.Tenants[position].Contact.Military? lease.Tenants[position].Contact.Military.branch: '';
                    break;
                case 'Tenant.MilitaryContactEmail':
                    if (!lease.Tenants.length) e.th(400, "There were no tenants found while attempting to create this document");
                    t.value = lease.Tenants[position].Contact.Military && lease.Tenants[position].Contact.Military.email;
                    break;
                case 'Tenant.MilitaryContactPhone':
                    if (!lease.Tenants.length) e.th(400, "There were no tenants found while attempting to create this document");
                     var phoneNumber = lease.Tenants[position].Contact.Military && lease.Tenants[position].Contact.Military.phone;
                     t.value = utils.formatPhone(phoneNumber)
                    break;
                case 'Tenant.CompanyName':
                    if (!lease.Tenants.length) e.th(400, "There were no tenants found while attempting to create this document");
                    t.value = lease.Tenants[position].Contact.Business && lease.Tenants[position].Contact.Business.name;
                    break;

                    //Vehicle Information
                case 'Vehicle.Make':
                    if (!lease.Vehicles) e.th(400, "There were no vehicles found while attempting to create this document");
                    t.value = lease.Vehicles.make;
                    break;
                case 'Vehicle.Manufacturer':
                    if (!lease.Vehicles) e.th(400, "There were no vehicles found while attempting to create this document");
                    t.value = lease.Vehicles.make;
                    break;
                case 'Vehicle.Model':
                    if (!lease.Vehicles) e.th(400, "There were no vehicles found while attempting to create this document");
                    t.value = lease.Vehicles.model;
                    break;
                case 'Vehicle.Color':
                    if (!lease.Vehicles) e.th(400, "There were no vehicles found while attempting to create this document");
                    t.value = lease.Vehicles.color;
                    break;
                case 'Vehicle.Year':
                    if (!lease.Vehicles) e.th(400, "There were no vehicles found while attempting to create this document");
                    t.value = lease.Vehicles.year;
                    break;
                case 'Vehicle.LicensePlateNo':
                    if (!lease.Vehicles) e.th(400, "There were no vehicles found while attempting to create this document");
                    t.value = lease.Vehicles.license_plate_number;
                    break;
                case 'Vehicle.RegState':
                    if (!lease.Vehicles) e.th(400, "There were no vehicles found while attempting to create this document");
                    t.value = lease.Vehicles.license_plate_state;
                    break;
                case 'Vehicle.VIN':
                    if (!lease.Vehicles) e.th(400, "There were no vehicles found while attempting to create this document");
                    t.value = lease.Vehicles.vechile_identification_number;
                    break;
                case 'Vehicle.ApproxValue':
                    if (!lease.Vehicles) e.th(400, "There were no vehicles found while attempting to create this document");
                    t.value = lease.Vehicles.approximation_value ? utils.formatMoney(lease.Vehicles.approximation_value) : 0;
                    break;
                case 'Vehicle.InsuranceProvider':
                    if (!lease.Vehicles) e.th(400, "There were no vehicles found while attempting to create this document");
                    t.value = lease.Vehicles.insurance_provider_name;
                    break;
                case 'Vehicle.LegalOwnerName':
                    if (!lease.Vehicles) e.th(400, "There were no vehicles found while attempting to create this document");

                    if (!lease.Vehicles.legal_owner) {
                        t.value = '';
                    } else {
                        t.value = `${lease.Vehicles.legal_owner.first_name || ""} ${lease.Vehicles.legal_owner.last_name || ""}`;
                    }
                    break;
                case 'Vehicle.LegalOwnerAddress1':
                    if (!lease.Vehicles) e.th(400, "There were no vehicles found while attempting to create this document");

                    if (!lease.Vehicles.legal_owner) {
                        t.value = '';
                    } else {
                        t.value = lease.Vehicles.legal_owner.address || '';
                    }

                    break;
                case 'Vehicle.LegalOwnerAddress2':
                    if (!lease.Vehicles) e.th(400, "There were no vehicles found while attempting to create this document");

                    if (!lease.Vehicles.legal_owner) {
                        t.value = '';
                    } else {
                        t.value = lease.Vehicles.legal_owner.address2 || '';
                    }

                    break;
                case 'Vehicle.LegalOwnerCity':
                    if (!lease.Vehicles) e.th(400, "There were no vehicles found while attempting to create this document");

                    if (!lease.Vehicles.legal_owner) {
                        t.value = '';
                    } else {
                        t.value = lease.Vehicles.legal_owner.city || '';
                    }

                    break;
                case 'Vehicle.LegalOwnerState':
                    if (!lease.Vehicles) e.th(400, "There were no vehicles found while attempting to create this document");

                    if (!lease.Vehicles.legal_owner) {
                        t.value = '';
                    } else {
                        t.value = lease.Vehicles.legal_owner.state || '';
                    }

                    break;
                case 'Vehicle.LegalOwnerCountry':
                    if (!lease.Vehicles) e.th(400, "There were no vehicles found while attempting to create this document");

                    if (!lease.Vehicles.legal_owner) {
                        t.value = '';
                    } else {
                        t.value = lease.Vehicles.legal_owner.country || '';
                    }

                    break;
                case 'Vehicle.LegalOwnerPostalCode':
                    if (!lease.Vehicles) e.th(400, "There were no vehicles found while attempting to create this document");

                    if (!lease.Vehicles.legal_owner) {
                        t.value = '';
                    } else {
                        t.value = lease.Vehicles.legal_owner.zip || '';
                    }

                    break;
                    // case 'Vehicle.RegOwnerDetails':
                    //   if(!lease.Vehicles) e.th(400, "There were no vehicles found while attempting to create this document");
                    //   t.value = lease.Vehicles.RegOwnerDetails;
                    //   break;
                case 'Vehicle.RegOwnerName':
                    if (!lease.Vehicles) e.th(400, "There were no vehicles found while attempting to create this document");

                    if (!lease.Vehicles.registered_owner) {
                        t.value = '';
                    } else {
                        t.value = `${lease.Vehicles.registered_owner.first_name || ""} ${lease.Vehicles.registered_owner.last_name || ""}`;
                    }

                    break;
                case 'Vehicle.RegOwnerAddress1':
                    if (!lease.Vehicles) e.th(400, "There were no vehicles found while attempting to create this document");

                    if (!lease.Vehicles.registered_owner) {
                        t.value = '';
                    } else {
                        t.value = lease.Vehicles.registered_owner.address || '';
                    }

                    break;
                case 'Vehicle.RegOwnerAddress2':
                    if (!lease.Vehicles) e.th(400, "There were no vehicles found while attempting to create this document");

                    if (!lease.Vehicles.registered_owner) {
                        t.value = '';
                    } else {
                        t.value = lease.Vehicles.registered_owner.address2 || '';
                    }

                    break;
                case 'Vehicle.RegOwnerCity':
                    if (!lease.Vehicles) e.th(400, "There were no vehicles found while attempting to create this document");

                    if (!lease.Vehicles.registered_owner) {
                        t.value = '';
                    } else {
                        t.value = lease.Vehicles.registered_owner.city || '';
                    }

                    break;
                case 'Vehicle.RegOwnerState':
                    if (!lease.Vehicles) e.th(400, "There were no vehicles found while attempting to create this document");

                    if (!lease.Vehicles.registered_owner) {
                        t.value = '';
                    } else {
                        t.value = lease.Vehicles.registered_owner.state || '';
                    }

                    break;
                case 'Vehicle.RegOwnerCountry':
                    if (!lease.Vehicles) e.th(400, "There were no vehicles found while attempting to create this document");

                    if (!lease.Vehicles.registered_owner) {
                        t.value = '';
                    } else {
                        t.value = lease.Vehicles.registered_owner.country || '';
                    }

                    break;
                case 'Vehicle.RegOwnerPostalCode':
                    if (!lease.Vehicles) e.th(400, "There were no vehicles found while attempting to create this document");

                    if (!lease.Vehicles.registered_owner) {
                        t.value = '';
                    } else {
                        t.value = lease.Vehicles.registered_owner.zip || '';
                    }
                    break;
                case 'Tenant.BusinessName':
                    if (!lease.Tenants.length) e.th(400, "There were no tenants found while attempting to create this document");
                    if (lease.Tenants[position].Contact && lease.Tenants[position].Contact.Business) {
                        t.value = lease.Tenants[position].Contact.Business.name;
                    }
                    break;
                case 'Tenant.WorkPhone':
                    if (!lease.Tenants.length) e.th(400, "There were no tenants found while attempting to create this document");
                    if (lease.Tenants[position].Contact && lease.Tenants[position].Contact.Phones.length) {
                        let phone = lease.Tenants[position].Contact.Phones.find(p => p.type.toLowerCase() === 'work');
                        t.value = phone ? utils.formatPhone(phone.phone) : ' ';
                    }
                    break;
                case 'Tenant.DLState':
                    if (!lease.Tenants.length) e.th(400, "There were no tenants found while attempting to create this document");
                    if (lease.Tenants[position].Contact) {
                        t.value = lease.Tenants[position].Contact.driver_license_state;
                    }
                    break;
                case 'Tenant.DLCountry':
                    if (!lease.Tenants.length) e.th(400, "There were no tenants found while attempting to create this document");
                    if (lease.Tenants[position].Contact) {
                        t.value = lease.Tenants[position].Contact.driver_license_country;
                    }
                    break;
                case 'Tenant.DLExpDate':
                    if (!lease.Tenants.length) e.th(400, "There were no tenants found while attempting to create this document");
                    if (lease.Tenants[position].Contact) {
                        t.value = lease.Tenants[position].Contact.driver_license_exp;
                    }
                    break;
                case 'Tenant.SSN':
                    if (!lease.Tenants.length) e.th(400, "There were no tenants found while attempting to create this document");
                    if (lease.Tenants[position].Contact && lease.Tenants[position].Contact.ssn) {
                        t.value = `###-##-${lease.Tenants[position].Contact.ssn.toString().substring(5)}`;
                    }
                    break;
                case 'Tenant.AuthorizedAccessPersons':
                    if (!lease.Tenants.length) e.th(400, "There were no tenants found while attempting to create this document");
                    if (lease.Tenants[position].Contact && lease.Tenants[position].Contact.Relationships && lease.Tenants[position].Contact.Relationships.length) {
                        let authorizedPerson = lease.Tenants[position].Contact.Relationships.find(p => p.is_authorized === 1);
                        t.value = authorizedPerson ? authorizedPerson.Contact.first + ' ' + authorizedPerson.Contact.last : '';
                    }
                    break;
                case 'Tenant.Access1Name':
                    if (!lease.Tenants.length) e.th(400, "There were no tenants found while attempting to create this document");
                    if (lease.Tenants[position].Contact && lease.Tenants[position].Contact.Relationships && lease.Tenants[position].Contact.Relationships.length) {
                        let authorizedPerson = lease.Tenants[position].Contact.Relationships.find(p => p.is_authorized === 1);
                        t.value = authorizedPerson ? authorizedPerson.Contact.first + ' ' + authorizedPerson.Contact.last : '';
                    }
                    break;
                case 'Tenant.Access1Phone':
                    if (!lease.Tenants.length) e.th(400, "There were no tenants found while attempting to create this document");
                    if (lease.Tenants[position].Contact && lease.Tenants[position].Contact.Relationships && lease.Tenants[position].Contact.Relationships.length) {
                        let authorizedPerson = lease.Tenants[position].Contact.Relationships.find(p => p.is_authorized === 1);
                        let phones = (authorizedPerson && authorizedPerson.Contact && authorizedPerson.Contact.Phones) || null;
                        let primaryPhone = phones && phones.length > 0? phones.find(x => x.primary): null;
                        t.value = (primaryPhone && primaryPhone.phone && utils.formatPhone(primaryPhone.phone)) || '';
                    }
                    break;
                case 'Tenant.BillingAddress1':
                    if (lease.PaymentMethods && lease.PaymentMethods.length && lease.PaymentMethods[0].Address) {
                        t.value = lease.PaymentMethods[0].Address.address || '';
                    }
                    break;
                case 'Tenant.BillingAddress2':
                    if (lease.PaymentMethods && lease.PaymentMethods.length && lease.PaymentMethods[0].Address) {
                        t.value = lease.PaymentMethods[0].Address.address2 || '';
                    }
                    break;
                case 'Tenant.BillingCity':
                    if (lease.PaymentMethods && lease.PaymentMethods.length && lease.PaymentMethods[0].Address) {
                        t.value = lease.PaymentMethods[0].Address.city || '';
                    }
                    break;
                case 'Tenant.BillingState':
                    if (lease.PaymentMethods && lease.PaymentMethods.length && lease.PaymentMethods[0].Address) {
                        t.value = lease.PaymentMethods[0].Address.state || '';
                    }
                    break;
                case 'Tenant.BillingCountry':
                    if (lease.PaymentMethods && lease.PaymentMethods.length && lease.PaymentMethods[0].Address) {
                        t.value = lease.PaymentMethods[0].Address.country || '';
                    }
                    break;
                case 'Tenant.BillingPostalCode':
                    if (lease.PaymentMethods && lease.PaymentMethods.length && lease.PaymentMethods[0].Address) {
                        t.value = lease.PaymentMethods[0].Address.zip || '';
                    }
                    break;
                case 'Tenant.CCName':
                    if (lease.PaymentMethods && lease.PaymentMethods.length) {
                        var card = lease.PaymentMethods.find(f => f.type === 'card');
                        t.value = card && card.name_on_card || '';
                    }
                    break;
                case 'Tenant.CCLast4':
                    if (lease.PaymentMethods && lease.PaymentMethods.length) {
                        var card = lease.PaymentMethods.find(f => f.type === 'card');
                        t.value = card && card.card_end || '';
                    }
                    break;
                case 'Tenant.CCExpDate':
                    if (lease.PaymentMethods && lease.PaymentMethods.length) {
                        var card = lease.PaymentMethods.find(f => f.type === 'card');
                        t.value = card && card.exp_warning || '';
                    }
                    break;
                case 'Tenant.BankCity':
                    if (lease.PaymentMethods && lease.PaymentMethods.length) {
                        var ach = lease.PaymentMethods.find(f => f.type === 'ach');
                        var address = ach && ach.Address;
                        t.value = address && address.city || '';
                    }
                    break;
                case 'Tenant.BankState':
                    if (lease.PaymentMethods && lease.PaymentMethods.length) {
                        var ach = lease.PaymentMethods.find(f => f.type === 'ach');
                        var address = ach && ach.Address;
                        t.value = address && address.state || '';
                    }
                    break;
                case 'Tenant.BankCountry':
                    if (lease.PaymentMethods && lease.PaymentMethods.length) {
                        var ach = lease.PaymentMethods.find(f => f.type === 'ach');
                        var address = ach && ach.Address;
                        t.value = address && address.country || '';
                    }
                    break;
                case 'Tenant.BankPostalCode':
                    if (lease.PaymentMethods && lease.PaymentMethods.length) {
                        var ach = lease.PaymentMethods.find(f => f.type === 'ach');
                        var address = ach && ach.Address;
                        t.value = address && address.zip || '';
                    }
                    break;
                case 'Tenant.BankRoutingNum':
                    if (lease.PaymentMethods && lease.PaymentMethods.length) {
                        var ach = lease.PaymentMethods.find(f => f.type === 'ach');
                        t.value = ach && ach.routing_number || '';
                    }
                    break;
                case 'Tenant.BankAccountNum':
                    if (lease.PaymentMethods && lease.PaymentMethods.length) {
                        var ach = lease.PaymentMethods.find(f => f.type === 'ach');
                        t.value = ach && ach.account_number || '';
                    }
                    break;
                case 'Tenant.VehicleMake':
                    if (!lease.Vehicles) e.th(400, "There were no vehicles found while attempting to create this document");
                    t.value = lease.Vehicles.make ? lease.Vehicles.make : '';
                    break;
                case 'Tenant.VehicleModel':
                    if (!lease.Vehicles) e.th(400, "There were no vehicles found while attempting to create this document");
                    t.value = lease.Vehicles.model ? lease.Vehicles.model : '';
                    break;
                case 'Tenant.VehicleID':  
                    if (!lease.Vehicles) e.th(400, "There were no vehicles found while attempting to create this document");
                    t.value = lease.Vehicles.vechile_identification_number ? lease.Vehicles.vechile_identification_number : '';
                    break;
                case 'Tenant.VehicleYear':
                    if (!lease.Vehicles) e.th(400, "There were no vehicles found while attempting to create this document");
                    t.value = lease.Vehicles.year ? lease.Vehicles.year : '';
                    break;
                case 'Tenant.VehicleLicense':
                    if (!lease.Vehicles) e.th(400, "There were no vehicles found while attempting to create this document");
                    t.value = lease.Vehicles.license_plate_number ? lease.Vehicles.license_plate_number : '';
                    break;;
                    
                case 'Tenant.VehicleTrailerLicense':
                    if (!lease.Vehicles) e.th(400, "There were no vehicles found while attempting to create this document");
                    if(lease.Vehicles && lease.Vehicles.type.toLowerCase() === 'trailer'){
                        t.value = lease.Vehicles.license_plate_number ? lease.Vehicles.license_plate_number : '';
                    } else t.value = '';
                    break;
                case 'Tenant.StoreVehicleYes':
                    t.value = lease.Vehicles ? true : false;
                    break;
                case 'Tenant.StoreVehicleNo':
                    t.value = lease.Vehicles ? false : true;
                    break;
                case 'Tenant.MilitaryID':
                    if (!lease.Tenants.length) e.th(400, "There were no tenants found while attempting to create this document");
                    if (lease.Tenants[position].Contact && lease.Tenants[position].Contact.Military) {
                        t.value = lease.Tenants[position].Contact.Military.identification_number;
                    }
                    break;
                case 'Tenant.MilitaryETSDate':
                    if (!lease.Tenants.length) e.th(400, "There were no tenants found while attempting to create this document");
                    if (lease.Tenants[position].Contact && lease.Tenants[position].Contact.Military) {
                        t.value = lease.Tenants[position].Contact.Military.service_expiration;
                    }
                    break;
                case 'Tenant.MilitaryUnitName':
                    if (!lease.Tenants.length) e.th(400, "There were no tenants found while attempting to create this document");
                    if (lease.Tenants[position].Contact && lease.Tenants[position].Contact.Military) {
                        t.value = lease.Tenants[position].Contact.Military.unit_name;
                    }
                    break;
                case 'Tenant.MilitaryBranchName':
                    if (!lease.Tenants.length) e.th(400, "There were no tenants found while attempting to create this document");
                    if (lease.Tenants[position].Contact && lease.Tenants[position].Contact.Military) {
                        t.value = lease.Tenants[position].Contact.Military.branch;
                    }
                    break;
                case 'Tenant.MilitaryRank':
                    if (!lease.Tenants.length) e.th(400, "There were no tenants found while attempting to create this document");
                    if (lease.Tenants[position].Contact && lease.Tenants[position].Contact.Military) {
                        t.value = lease.Tenants[position].Contact.Military.rank;
                    }
                    break;
                case 'Tenant.MilitaryAddress1':
                    if (!lease.Tenants.length) e.th(400, "There were no tenants found while attempting to create this document");
                    if (lease.Tenants[position].Contact && lease.Tenants[position].Contact.Military && lease.Tenants[position].Contact.Military.Address) {
                        t.value = lease.Tenants[position].Contact.Military.Address.address;
                    }
                    break;
                case 'Tenant.MilitaryAddress2':
                    if (!lease.Tenants.length) e.th(400, "There were no tenants found while attempting to create this document");
                    if (lease.Tenants[position].Contact && lease.Tenants[position].Contact.Military && lease.Tenants[position].Contact.Military.Address) {
                        t.value = lease.Tenants[position].Contact.Military.Address.address2;
                    }
                    break;
                case 'Tenant.MilitaryCity':
                    if (!lease.Tenants.length) e.th(400, "There were no tenants found while attempting to create this document");
                    if (lease.Tenants[position].Contact && lease.Tenants[position].Contact.Military && lease.Tenants[position].Contact.Military.Address) {
                        t.value = lease.Tenants[position].Contact.Military.Address.city;
                    }
                    break;
                case 'Tenant.MilitaryState':
                    if (!lease.Tenants.length) e.th(400, "There were no tenants found while attempting to create this document");
                    if (lease.Tenants[position].Contact && lease.Tenants[position].Contact.Military && lease.Tenants[position].Contact.Military.Address) {
                        t.value = lease.Tenants[position].Contact.Military.Address.state;
                    }
                    break;
                case 'Tenant.MilitaryCountry':
                    if (!lease.Tenants.length) e.th(400, "There were no tenants found while attempting to create this document");
                    if (lease.Tenants[position].Contact && lease.Tenants[position].Contact.Military && lease.Tenants[position].Contact.Military.Address) {
                        t.value = lease.Tenants[position].Contact.Military.Address.country;
                    }
                    break;
                case 'Tenant.MilitaryPostalCode':
                    if (!lease.Tenants.length) e.th(400, "There were no tenants found while attempting to create this document");
                    if (lease.Tenants[position].Contact && lease.Tenants[position].Contact.Military && lease.Tenants[position].Contact.Military.Address) {
                        t.value = lease.Tenants[position].Contact.Military.Address.zip;
                    }
                    break;
                case 'Tenant.MilitaryPhone':
                    if (!lease.Tenants.length) e.th(400, "There were no tenants found while attempting to create this document");
                    if (lease.Tenants[position].Contact && lease.Tenants[position].Contact.Military) {
                        t.value = utils.formatPhone(lease.Tenants[position].Contact.Military.phone);
                    }
                    break;
                case 'Tenant.MilitaryEmail':
                    if (!lease.Tenants.length) e.th(400, "There were no tenants found while attempting to create this document");
                    if (lease.Tenants[position].Contact && lease.Tenants[position].Contact.Military) {
                        t.value = lease.Tenants[position].Contact.Military.email;
                    }
                    break;
                case 'Tenant.AltCellPhone':
                    if (!lease.Tenants.length) e.th(400, "There were no tenants found while attempting to create this document");
                    if (lease.Tenants[position].Contact && lease.Tenants[position].Contact.Relationships && lease.Tenants[position].Contact.Relationships.length && lease.Tenants[position].Contact.Relationships[0].Contact && lease.Tenants[position].Contact.Relationships[0].Contact.Phones && lease.Tenants[position].Contact.Relationships[0].Contact.Phones.length) {
                        let phone = lease.Tenants[position].Contact.Relationships[0].Contact.Phones.find(p => ['mobile', 'cell'].indexOf(p.type.toLowerCase() >= 0));
                        t.value = phone ? utils.formatPhone(phone.phone) : ' ';
                    }
                    break;
                case 'Tenant.AltHomePhone':
                    if (!lease.Tenants.length) e.th(400, "There were no tenants found while attempting to create this document");
                    if (lease.Tenants[position].Contact && lease.Tenants[position].Contact.Relationships && lease.Tenants[position].Contact.Relationships.length && lease.Tenants[position].Contact.Relationships[0].Contact && lease.Tenants[position].Contact.Relationships[0].Contact.Phones && lease.Tenants[position].Contact.Relationships[0].Contact.Phones.length) {
                        let phone = lease.Tenants[position].Contact.Relationships[0].Contact.Phones.find(p => p.type.toLowerCase() === 'home');
                        t.value = phone ? utils.formatPhone(phone.phone) : ' ';
                    }
                    break;
                case 'Tenant.AltWorkPhone':
                    if (!lease.Tenants.length) e.th(400, "There were no tenants found while attempting to create this document");
                    if (lease.Tenants[position].Contact && lease.Tenants[position].Contact.Relationships && lease.Tenants[position].Contact.Relationships.length && lease.Tenants[position].Contact.Relationships[0].Contact && lease.Tenants[position].Contact.Relationships[0].Contact.Phones && lease.Tenants[position].Contact.Relationships[0].Contact.Phones.length) {
                        let phone = lease.Tenants[position].Contact.Relationships[0].Contact.Phones.find(p => p.type.toLowerCase() === 'work');
                        t.value = phone ? utils.formatPhone(phone.phone) : ' ';
                    }
                    break;
                case 'Tenant.EmployerName':
                    if (!lease.Tenants.length) e.th(400, "There were no tenants found while attempting to create this document");
                    if (lease.Tenants[position].Contact && lease.Tenants[position].Contact.Employment && lease.Tenants[position].Contact.Employment.length) {
                        t.value = lease.Tenants[position].Contact.Employment.employer;
                    }
                    break;
                case 'Tenant.EmployerCellPhone':
                    if (!lease.Tenants.length) e.th(400, "There were no tenants found while attempting to create this document");
                    if (lease.Tenants[position].Contact && lease.Tenants[position].Contact.Employment && lease.Tenants[position].Contact.Employment.length) {
                        t.value = utils.formatPhone(lease.Tenants[position].Contact.Employment.phone);
                    }
                    break;
                case 'Tenant.MoveInTaxFee':
                    if (!lease.Tenants.length) e.th(400, "There were no tenants found while attempting to create this document");
                    t.value = (lease.MoveInInvoice && lease.MoveInInvoice.total_tax) ? utils.formatMoney(lease.MoveInInvoice.total_tax) : '';
                    break;
                case 'Document.Time':
                    t.value = moment().utc().format("hh:mm:ss a");
                    break;
                case 'Tenant.VehicleBoatYes':
                    t.value = lease.Vehicles && lease.Vehicles.type.toLowerCase() === 'boat' ? 'Yes' : '';
                    break;
                case 'Tenant.VehicleAutomobileYes':
                    t.value = lease.Vehicles && lease.Vehicles.type.toLowerCase() === 'automobile' ? 'Yes' : '';
                    break;
                case 'Tenant.VehicleMotorYes':
                    t.value = lease.Vehicles && lease.Vehicles.type.toLowerCase() === 'motor' ? 'Yes' : '';
                    break;
                case 'Tenant.VehicleCarYes':
                    t.value = lease.Vehicles && lease.Vehicles.type.toLowerCase() === 'car' ? 'Yes' : '';
                    break;
                case 'Tenant.VehicleRecreationalYes':
                    t.value = lease.Vehicles && lease.Vehicles.type.toLowerCase() === 'recreational' ? 'Yes' : '';
                    break;
                case 'Tenant.VehicleTrailerYes':
                    t.value = lease.Vehicles && lease.Vehicles.type.toLowerCase() === 'trailer' ? 'Yes' : '';
                    break;
                case 'Tenant.VehicleMotorcycleYes':
                    t.value = lease.Vehicles && lease.Vehicles.type.toLowerCase() === 'motorcycle' ?  'Yes' : '';
                    break;
                case 'Tenant.VehicleOtherYes':
                    t.value = lease.Vehicles && lease.Vehicles.type.toLowerCase() === 'other' ? 'Yes' : '';
                    break;
                case 'Tenant.VehicleIfOtherDesc':
                    if(lease.Vehicles && lease.Vehicles.type.toLowerCase() === 'other'){
                        t.value = (lease.Vehicles.make ? lease.Vehicles.make : '') + ' ' + (lease.Vehicles.model ? lease.Vehicles.model : '');
                    } else t.value = '';
                    break;
                case 'Tenant.BoatRegistrationNo':
                    if(lease.Vehicles && lease.Vehicles.type.toLowerCase() === 'boat'){
                        t.value = lease.Vehicles.registration_number ? lease.Vehicles.registration_number : '';
                    } else t.value = '';
                    break;
                case 'Tenant.BoatSerialNo':
                    if(lease.Vehicles && lease.Vehicles.type.toLowerCase() === 'boat'){
                        t.value = lease.Vehicles.serial_number ? lease.Vehicles.serial_number : '';
                    } else t.value = '';
                    break;
                case 'Tenant.BoatName':
                    if(lease.Vehicles && lease.Vehicles.type.toLowerCase() === 'boat'){
                        t.value = lease.Vehicles.name ? lease.Vehicles.name : '';
                    } else t.value = '';
                    break;
                case 'Tenant.BoatHorsePower':
                    if(lease.Vehicles && lease.Vehicles.type.toLowerCase() === 'boat'){
                        t.value = lease.Vehicles.horsepower ? lease.Vehicles.horsepower : '';
                    } else t.value = '';
                    break;
                case 'Tenant.BoatLength':
                    if(lease.Vehicles && lease.Vehicles.type.toLowerCase() === 'boat'){
                        t.value = lease.Vehicles.length ? lease.Vehicles.length : '';
                    } else t.value = '';
                    break;
                case 'Tenant.BoatHomePort':
                    if(lease.Vehicles && lease.Vehicles.type.toLowerCase() === 'boat'){
                        t.value = lease.Vehicles.home_port ? lease.Vehicles.home_port : '';
                    } else t.value = '';
                    break;
                case 'Tenant.IfBoatAddressDifferent':
                    if(lease.Vehicles && lease.Vehicles.type.toLowerCase() === 'boat'){
                        if (!lease.Tenants.length) e.th(400, "There were no tenants found while attempting to create this document");
                        let addr = lease.Tenants[position].Contact.Addresses.find(a => a.id === lease.Vehicles.registered_address_id);
                        t.value = addr ? 'No' : 'Yes';
                    } else t.value = '';
                    break;
                case 'Tenant.MotorVINNo':
                    if(lease.Vehicles && lease.Vehicles.type.toLowerCase() === 'motor'){
                        t.value = lease.Vehicles.vechile_identification_number ? lease.Vehicles.vechile_identification_number : '';
                    } else t.value = '';
                    break;
                case 'Tenant.MotorManufacturer':
                    if(lease.Vehicles && lease.Vehicles.type.toLowerCase() === 'motor'){
                        t.value = lease.Vehicles.make ? lease.Vehicles.make : '';
                    } else t.value = '';
                    break;
                case 'Tenant.MotorDocumentNo':
                    if(lease.Vehicles && lease.Vehicles.type.toLowerCase() === 'motor'){
                        t.value = lease.Vehicles.registration_upload_id ? lease.Vehicles.registration_upload_id : '';
                    } else t.value = '';
                    break;
                case 'Tenant.MotorYear':
                    if(lease.Vehicles && lease.Vehicles.type.toLowerCase() === 'motor'){
                        t.value = lease.Vehicles.year ? lease.Vehicles.year : '';
                    } else t.value = '';
                    break;
                case 'Tenant.MotorLienHolderDetails':
                    if(lease.Vehicles && lease.Vehicles.type.toLowerCase() === 'motor'){
                        t.value = lease.Vehicles.lien_holder ? lease.Vehicles.lien_holder : '';
                    } else t.value = '';
                    break;
                case 'Tenant.TrailerVIN':
                    if(lease.Vehicles && lease.Vehicles.type.toLowerCase() === 'trailer'){
                        t.value = lease.Vehicles.vechile_identification_number ? lease.Vehicles.vechile_identification_number : '';
                    } else t.value = '';
                    break;
                case 'Tenant.IfTrailerAddressDifferent':
                    if(lease.Vehicles && lease.Vehicles.type.toLowerCase() === 'trailer'){
                        if (!lease.Tenants.length) e.th(400, "There were no tenants found while attempting to create this document");
                        let taddr = lease.Tenants[position].Contact.Addresses.find(a => a.id === lease.Vehicles.registered_address_id);
                        t.value = taddr ? 'No' : 'Yes';
                    } else t.value = '';
                    break;
                case 'Tenant.TrailerLicensePlateNo':
                    if(lease.Vehicles && lease.Vehicles.type.toLowerCase() === 'trailer'){
                        t.value = lease.Vehicles.license_plate_number ? lease.Vehicles.license_plate_number : '';
                    } else t.value = '';
                    break;
                case 'Tenant.TrailerExpiration':
                    if(lease.Vehicles && lease.Vehicles.type.toLowerCase() === 'trailer'){
                        t.value = lease.Vehicles.registration_exp ? lease.Vehicles.registration_exp : '';
                    } else t.value = '';
                    break;
                case 'Tenant.TrailerInsuranceProvider':
                    if(lease.Vehicles && lease.Vehicles.type.toLowerCase() === 'trailer'){
                        t.value = lease.Vehicles.insurance_provider_name ? lease.Vehicles.insurance_provider_name : '';
                    } else t.value = '';
                    break;
                case 'Tenant.TrailerApproxValue':
                    if(lease.Vehicles && lease.Vehicles.type.toLowerCase() === 'trailer'){
                        t.value = lease.Vehicles.approximation_value ? lease.Vehicles.approximation_value : '';
                    } else t.value = '';
                    break;
                case 'Tenant.TrailerRegistrationState':
                    if(lease.Vehicles && lease.Vehicles.type.toLowerCase() === 'trailer'){
                        t.value = lease.Vehicles.state ? lease.Vehicles.state : '';
                    } else t.value = '';
                    break;
                case 'Tenant.TrailerRegistrationCountry':
                    if(lease.Vehicles && lease.Vehicles.type.toLowerCase() === 'trailer'){
                        t.value = lease.Vehicles.country ? lease.Vehicles.country : '';
                    } else t.value = '';
                    break;
                case 'Tenant.TrailerLienHolderDetails':
                    if(lease.Vehicles && lease.Vehicles.type.toLowerCase() === 'trailer'){
                        t.value = lease.Vehicles.lien_holder ? lease.Vehicles.lien_holder : '';
                    } else t.value = '';
                    break;
                case 'Tenant.TrailerInsPolicyNumber':
                    if(lease.Vehicles && lease.Vehicles.type.toLowerCase() === 'trailer'){
                        t.value = lease.Vehicles.insurance_policy_upload_id ? lease.Vehicles.insurance_policy_upload_id : '';
                    } else t.value = '';
                    break;
                case 'Tenant.VehicleVIN':
                    if (!lease.Vehicles) e.th(400, "There were no vehicles found while attempting to create this document");
                    t.value = lease.Vehicles.vechile_identification_number ? lease.Vehicles.vechile_identification_number : '';
                    break;
                case 'Tenant.VehicleYear':
                    if (!lease.Vehicles) e.th(400, "There were no vehicles found while attempting to create this document");
                    t.value = lease.Vehicles.year ? lease.Vehicles.year : '';
                    break;
                case 'Tenant.VehicleManufacturer':
                    if (!lease.Vehicles) e.th(400, "There were no vehicles found while attempting to create this document");
                    t.value = lease.Vehicles.make ? lease.Vehicles.make : '';
                    break;
                case 'Tenant.VehicleRegState':
                    if (!lease.Vehicles) e.th(400, "There were no vehicles found while attempting to create this document");
                    t.value = lease.Vehicles.state ? lease.Vehicles.state : '';
                    break;
                case 'Tenant.VehicleRegCountry':
                    if (!lease.Vehicles) e.th(400, "There were no vehicles found while attempting to create this document");
                    t.value = lease.Vehicles.country ? lease.Vehicles.country : '';
                    break;
                case 'Tenant.VehicleApproxValue':
                    if (!lease.Vehicles) e.th(400, "There were no vehicles found while attempting to create this document");
                    t.value = lease.Vehicles.approximation_value ? lease.Vehicles.approximation_value : '';
                    break;
                case 'Tenant.VehicleInsProvider':
                    if (!lease.Vehicles) e.th(400, "There were no vehicles found while attempting to create this document");
                    t.value = lease.Vehicles.insurance_provider_name ? lease.Vehicles.insurance_provider_name : '';
                    break;
                case 'Tenant.VehicleMakeModel':
                    if (!lease.Vehicles) e.th(400, "There were no vehicles found while attempting to create this document");
                    t.value = lease.Vehicles.model ? lease.Vehicles.model : '';
                    break;
                case 'Tenant.VehicleLicPlateNo':
                    if (!lease.Vehicles) e.th(400, "There were no vehicles found while attempting to create this document");
                    t.value = lease.Vehicles.license_plate_number ? lease.Vehicles.license_plate_number : '';
                    break;
                case 'Tenant.VehicleExpiration':
                    if (!lease.Vehicles) e.th(400, "There were no vehicles found while attempting to create this document");
                    t.value = lease.Vehicles.registration_exp ? lease.Vehicles.registration_exp : '';
                    break;
                case 'Tenant.VehiclePolicyNumber':
                    if (!lease.Vehicles) e.th(400, "There were no vehicles found while attempting to create this document");
                    t.value = lease.Vehicles.insurance_policy_upload_id ? lease.Vehicles.insurance_policy_upload_id : '';
                    break;
                case 'Tenant.VehicleLienHolderDetails':
                    if (!lease.Vehicles) e.th(400, "There were no vehicles found while attempting to create this document");
                    t.value = lease.Vehicles.lien_holder ? lease.Vehicles.lien_holder : '';
                    break;
                case 'Tenant.IfVehicleAddressDifferent':
                    if (!lease.Vehicles) e.th(400, "There were no vehicles found while attempting to create this document");
                    if (!lease.Tenants.length) e.th(400, "There were no tenants found while attempting to create this document");
                    let vaddr = lease.Tenants[position].Contact.Addresses.find(a => a.id === lease.Vehicles.registered_address_id);
                    t.value = vaddr ? 'No' : 'Yes';
                    break;
                case 'Facility.LegalName':
                    t.value = lease.Property.legal_name ? lease.Property.legal_name : '';
                    break;
                case 'Facility.AfterHoursPhone':
                    if (lease.Property && lease.Property.Phones.length) {
                        let phone = lease.Property.Phones.find(p => p.type.toLowerCase() === 'after hours');
                        t.value = phone ? utils.formatPhone(phone.phone) : '';
                    }
                    break;
                case 'Facility.LateFee':
                    t.value = lease.Property.LateFee ? utils.formatMoney(lease.Property.LateFee): '';
                    break;
                case 'Facility.SecurityDeposit':
                    if (!lease.MoveInInvoice.total_due) break;
                    let security_fee = lease.MoveInInvoice.InvoiceLines.find(i => i.Product.default_type === 'security')
                    t.value = security_fee ? utils.formatMoney(security_fee.cost) : 0;
                    break;
                case 'Insurance.PremiumCoverage':
                    if (!lease.ActiveInsuranceService) {
                        if (!lease.FutureInsuranceService) {
                            t.value = 'N/A';
                            break;
                        }
                        t.value = lease.FutureInsuranceService.Insurance?.coverage ? lease.FutureInsuranceService.Insurance.coverage : "N/A";
                        break;
                    };
                    t.value = lease.ActiveInsuranceService.Insurance?.coverage ? lease.ActiveInsuranceService.Insurance.coverage : "N/A";
                    break;
                case 'Insurance.ServiceStartDate':
                    if (lease && lease.ActiveInsuranceService) {
                        let insurance = lease.ActiveInsuranceService;
                        t.value = insurance.start_date ? insurance.start_date : '';
                    } else t.value = '';
                    break;
                case 'Tenant.RentPaidThruDate':
                    console.log("lease.paid_through_date", lease.rent_paid_through);
                    t.value =  moment(lease.rent_paid_through, 'YYYY-MM-DD').format('MM/DD/YYYY');
                    break;
                case 'Tenant.NextRentDueDate':
                    if (!lease.start_date) break;
                    let futureMonth = moment(lease.start_date).add(1, 'M').format('YYYY-MM-DD');
                    if (lease.bill_day === 1) {
                        t.value = moment(futureMonth).set('date', 1).format('YYYY-MM-DD');
                        break;
                    }
                    t.value = futureMonth;
                    break;
                case 'Tenant.MotorInboardorOutboard':
                    //not implemented yet
                    t.value = '';
                    break;
                case 'Field.Initials':
                    //not implemented yet
                    t.value = '';
                    break;
                case 'Field.Signature':
                    //not implemented yet
                    t.value = '';
                    break;
                case 'Storsmart.FacilityNumber':
                    //not implemented yet
                    t.value = '';
                    break;
                case 'Tenant.EmployerAddress1':
                    if(lease.Tenants && lease.Tenants.length && lease.Tenants[position].Contact && lease.Tenants[position].Contact.Business && lease.Tenants[position].Contact.Business.Address)
                        t.value = lease.Tenants[position].Contact.Business.Address.address;
                    else 
                        t.value = '';
                    break;
                case 'Tenant.EmployerAddress2':
                    if(lease.Tenants && lease.Tenants.length && lease.Tenants[position].Contact && lease.Tenants[position].Contact.Business && lease.Tenants[position].Contact.Business.Address)
                        t.value = lease.Tenants[position].Contact.Business.Address.address2;
                    else 
                        t.value = '';
                    break;
                case 'Tenant.EmployerCity':
                    if(lease.Tenants && lease.Tenants.length && lease.Tenants[position].Contact && lease.Tenants[position].Contact.Business && lease.Tenants[position].Contact.Business.Address)
                        t.value = lease.Tenants[position].Contact.Business.Address.city;
                    else 
                        t.value = '';
                    break;
                case 'Tenant.EmployerState':
                    if(lease.Tenants && lease.Tenants.length && lease.Tenants[position].Contact && lease.Tenants[position].Contact.Business && lease.Tenants[position].Contact.Business.Address)
                        t.value = lease.Tenants[position].Contact.Business.Address.state;
                    else 
                        t.value = '';
                    break;
                case 'Tenant.EmployerCountry':
                    if(lease.Tenants && lease.Tenants.length && lease.Tenants[position].Contact && lease.Tenants[position].Contact.Business && lease.Tenants[position].Contact.Business.Address)
                        t.value = lease.Tenants[position].Contact.Business.Address.country || '';
                    else 
                        t.value = '';
                    break;
                case 'Tenant.EmployerPostalCode':
                    if(lease.Tenants && lease.Tenants.length && lease.Tenants[position].Contact && lease.Tenants[position].Contact.Business && lease.Tenants[position].Contact.Business.Address)
                        t.value = lease.Tenants[position].Contact.Business.Address.zip;
                    else 
                        t.value = '';
                    break;
                case 'Tenant.EmployerWorkPhone':
                    if(lease.Tenants && lease.Tenants.length && lease.Tenants[position].Contact && lease.Tenants[position].Contact.Business)
                        t.value = lease.Tenants[position].Contact.Business.phone;
                    else 
                        t.value = '';
                    break;
                case 'Tenant.EmployerEmail':
                    //not implemented yet
                    t.value = '';
                    break;
                case 'Tenant.MoveInRetailCost':
                    //not implemented yet
                    t.value = '';
                    break;
                case 'Tenant.LienHolderDetails':
                    //not implemented yet
                    t.value = '';
                    break;
                case 'Tenant.MilitaryDeploymentBase':
                    //not implemented yet
                    t.value = '';
                    break;
                case 'Tenant.MilitaryCommandingOfficer':
                    //not implemented yet
                    t.value = '';
                    break;
                case 'Tenant.BankName':
                    //not implemented yet
                    t.value = '';
                    break;
                case 'Tenant.BankBranch':
                    //not implemented yet
                    t.value = '';
                    break;
                case 'Tenant.WorkEmail':
                    //not implemented yet
                    t.value = '';
                    break;
                case 'Facility.Fax ':
                    //not implemented yet
                    t.value = '';
                    break;
                case 'Facility.WebURL':
                    //not implemented yet
                    t.value = '';
                    break;

                    // New Implemented - Start

                case 'Tenant.CompanyAddress1':{
                    if (!lease.Tenants.length) e.th(400, "There were no tenants found while attempting to create this document");
                    let address = lease.Tenants[position].Contact && lease.Tenants[position].Contact.Addresses && lease.Tenants[position].Contact.Addresses.length && lease.Tenants[position].Contact.Addresses[0].Address;
                    t.value = address? address.address: '';
                    break;
                }
                case 'Tenant.CompanyAddress2':{
                    if (!lease.Tenants.length) e.th(400, "There were no tenants found while attempting to create this document");
                    let address = lease.Tenants[position].Contact && lease.Tenants[position].Contact.Addresses && lease.Tenants[position].Contact.Addresses.length && lease.Tenants[position].Contact.Addresses[0].Address;
                    t.value = address? address.address2: '';
                    break;
                }
                case 'Tenant.CompanyCity':{
                    if (!lease.Tenants.length) e.th(400, "There were no tenants found while attempting to create this document");
                    let address = lease.Tenants[position].Contact && lease.Tenants[position].Contact.Addresses && lease.Tenants[position].Contact.Addresses.length && lease.Tenants[position].Contact.Addresses[0].Address;
                    t.value = address? address.city: '';
                    break;
                }
                case 'Tenant.CompanyState':{
                    if (!lease.Tenants.length) e.th(400, "There were no tenants found while attempting to create this document");
                    let address = lease.Tenants[position].Contact && lease.Tenants[position].Contact.Addresses && lease.Tenants[position].Contact.Addresses.length && lease.Tenants[position].Contact.Addresses[0].Address;
                    t.value = address? address.state: '';
                    break;
                }
                case 'Tenant.CompanyCountry':{
                    if (!lease.Tenants.length) e.th(400, "There were no tenants found while attempting to create this document");
                    let address = lease.Tenants[position].Contact && lease.Tenants[position].Contact.Addresses && lease.Tenants[position].Contact.Addresses.length && lease.Tenants[position].Contact.Addresses[0].Address;
                    t.value = address? address.country: '';
                    break;
                }
                case 'Tenant.CompanyPostalCode':{
                    if (!lease.Tenants.length) e.th(400, "There were no tenants found while attempting to create this document");
                    let address = lease.Tenants[position].Contact && lease.Tenants[position].Contact.Addresses && lease.Tenants[position].Contact.Addresses.length && lease.Tenants[position].Contact.Addresses[0].Address;
                    t.value = address? address.zip: '';
                    break;
                }
                case 'Tenant.CompanyPhone':{
                    if (!lease.Tenants.length) e.th(400, "There were no tenants found while attempting to create this document");
                    let company = lease.Tenants[position] && lease.Tenants[position].Contact && lease.Tenants[position].Contact.Company;
                    t.value = company? utils.formatPhone(company.phone): '';
                    break;
                }
                case 'Tenant.CompanyEmail':{
                    if (!lease.Tenants.length) e.th(400, "There were no tenants found while attempting to create this document");
                    let company = lease.Tenants[position] && lease.Tenants[position].Contact && lease.Tenants[position].Contact.Company;
                    t.value = company? company.email: '';
                    break;
                }
                case 'Tenant.BankRoutingNo':{
                    if (lease.PaymentMethods && lease.PaymentMethods.length) {
                        var ach = lease.PaymentMethods.find(f => f.type === 'ach');
                        t.value = ach && ach.routing_number || '';
                    }
                    break;
                }
                case 'Tenant.ActiveMilitary.Yes':{
                    if (!lease.Tenants.length) e.th(400, "There were no tenants found while attempting to create this document");
                    let contact = lease.Tenants[position].Contact; 
                    t.value = contact && contact?.Military?.active ? "Yes": "";
                    break;
                }
                case 'Tenant.ActiveMilitary.No':{
                    if (!lease.Tenants.length) e.th(400, "There were no tenants found while attempting to create this document");
                    let contact = lease.Tenants[position].Contact; 
                    t.value = contact && (contact?.Military?.active == null || contact?.Military?.active == false) ? "Yes" : "";
                    break;
                }
                case 'Tenant.ActiveMilitary':{
                    if (!lease.Tenants.length) e.th(400, "There were no tenants found while attempting to create this document");
                    let contact = lease.Tenants[position].Contact;
                    t.value = contact && contact?.Military?.active ? "Yes": "No";
                    break;
                }
                case 'Tenant.ServicememberName':{
                    //TODO: Verify from BD
                    if (!lease.Tenants.length) e.th(400, "There were no tenants found while attempting to create this document");
                    let milContact = lease.Tenants[position].Contact && lease.Tenants[position].Contact.Military;
                    t.value = `${milContact && milContact.first_name}  ${milContact && milContact.last_name}`;
                    break;
                }
                case 'Tenant.Lien.No':{
                    //TODO: Verify from BD, The lien tokens were not verified by DB. I guess those doesn't exit in HB yet. This comment is valid for all of follwing lien tokens.
                    if (!lease.Tenants.length) e.th(400, "There were no tenants found while attempting to create this document");
                    //let contact = lease.Tenants[position].Contact
                    t.value = '';//contact && contact.driver_license;
                    break;
                }
                case 'Tenant.Lien.Yes':{
                    if (!lease.Tenants.length) e.th(400, "There were no tenants found while attempting to create this document");
                    t.value = '';
                    break;
                }
                case 'Tenant.LienProperty':{
                    if(lease.Tenants?.length && lease.Tenants[position].Contact && lease.Tenants[position].Contact.Relationships?.length) {
                        let lien_contacts = lease.Tenants[position].Contact.Relationships.filter(x=> x.is_lien_holder == 1);
                        t.value = lien_contacts.length ? 'Yes':'No';
                    }
                    else 
                        t.value = 'No';
                    break;
                }
                case 'Tenant.LienHolderName':{
                    if(lease.Tenants && lease.Tenants.length && lease.Tenants[position].Contact && lease.Tenants[position].Contact.Relationships && lease.Tenants[position].Contact.Relationships.length) {
                        let lien_contact = lease.Tenants[position].Contact.Relationships.filter(x=> x.is_lien_holder);
                        t.value = lien_contact && `${lien_contact[0].Contact.first} ${lien_contact[0].Contact.last}`;
                    }
                    else 
                        t.value = '';
                    break;
                }
                case 'Tenant.LienHolderFirstName':{
                    if(lease.Tenants && lease.Tenants.length && lease.Tenants[position].Contact && lease.Tenants[position].Contact.Relationships && lease.Tenants[position].Contact.Relationships.length) {
                        let lien_contact = lease.Tenants[position].Contact.Relationships.filter(x=> x.is_lien_holder);
                        t.value = lien_contact && lien_contact[0].Contact.first;
                    }
                    else 
                        t.value = '';
                    break;
                }
                case 'Tenant.LienHolderLastName':{
                    if(lease.Tenants && lease.Tenants.length && lease.Tenants[position].Contact && lease.Tenants[position].Contact.Relationships && lease.Tenants[position].Contact.Relationships.length) {
                        let lien_contact = lease.Tenants[position].Contact.Relationships.find(x=> x.is_lien_holder);
                        t.value = lien_contact && lien_contact[0].Contact.last;
                    }
                    else 
                        t.value = '';
                    break;
                }
                case 'Tenant.LienHolderAddress1':{
                    if(lease.Tenants && lease.Tenants.length && lease.Tenants[position].Contact && lease.Tenants[position].Contact.Relationships && lease.Tenants[position].Contact.Relationships.length) {
                        let lien_contact = lease.Tenants[position].Contact.Relationships.find(x=> x.is_lien_holder);
                        t.value = lien_contact && lien_contact.Contact.Addresses.length && lien_contact.Contact.Addresses[0].Address.address;
                    }
                    else 
                        t.value = '';
                    break;
                }
                case 'Tenant.LienHolderAddress2':{
                    if(lease.Tenants && lease.Tenants.length && lease.Tenants[position].Contact && lease.Tenants[position].Contact.Relationships && lease.Tenants[position].Contact.Relationships.length) {
                        let lien_contact = lease.Tenants[position].Contact.Relationships.find(x=> x.is_lien_holder);
                        t.value = lien_contact && lien_contact.Contact.Addresses.length && lien_contact.Contact.Addresses[0].Address.address2;
                    }
                    else 
                        t.value = '';
                    break;
                }
                case 'Tenant.LienHolderCity':{
                    if(lease.Tenants && lease.Tenants.length && lease.Tenants[position].Contact && lease.Tenants[position].Contact.Relationships && lease.Tenants[position].Contact.Relationships.length) {
                        let lien_contact = lease.Tenants[position].Contact.Relationships.find(x=> x.is_lien_holder);
                        t.value = lien_contact && lien_contact.Contact.Addresses.length && lien_contact.Contact.Addresses[0].Address.city;
                    }
                    else 
                        t.value = '';
                    break;
                }
                case 'Tenant.LienHolderState':{
                    if(lease.Tenants && lease.Tenants.length && lease.Tenants[position].Contact && lease.Tenants[position].Contact.Relationships && lease.Tenants[position].Contact.Relationships.length) {
                        let lien_contact = lease.Tenants[position].Contact.Relationships.find(x=> x.is_lien_holder);
                        t.value = lien_contact && lien_contact.Contact.Addresses.length && lien_contact.Contact.Addresses[0].Address.state;
                    }
                    else 
                        t.value = '';
                    break;
                }
                case 'Tenant.LienHolderCountry':{
                    if(lease.Tenants && lease.Tenants.length && lease.Tenants[position].Contact && lease.Tenants[position].Contact.Relationships && lease.Tenants[position].Contact.Relationships.length) {
                        let lien_contact = lease.Tenants[position].Contact.Relationships.find(x=> x.is_lien_holder);
                        t.value = lien_contact && lien_contact.Contact.Addresses.length && lien_contact.Contact.Addresses[0].Address.country;
                    }
                    else 
                        t.value = '';
                    break;
                }
                case 'Tenant.LienHolderPostalCode':{
                    if(lease.Tenants && lease.Tenants.length && lease.Tenants[position].Contact && lease.Tenants[position].Contact.Relationships && lease.Tenants[position].Contact.Relationships.length) {
                        let lien_contact = lease.Tenants[position].Contact.Relationships.find(x=> x.is_lien_holder);
                        t.value = lien_contact && lien_contact.Contact.Addresses.length && lien_contact.Contact.Addresses[0].Address.zip;
                    }
                    else 
                        t.value = '';
                    break;
                }
                case 'Tenant.LienHolderPhone':{
                    if(lease.Tenants && lease.Tenants.length && lease.Tenants[position].Contact && lease.Tenants[position].Contact.Relationships && lease.Tenants[position].Contact.Relationships.length) {
                        let lien_contact = lease.Tenants[position].Contact.Relationships.find(x=> x.is_lien_holder);
                        t.value = lien_contact && lien_contact.Contact.Phones.length && utils.formatPhone(lien_contact.Contact.Phones[0].phone);
                    }
                    else 
                        t.value = '';
                    break;
                }
                case 'Tenant.LienHolderEmail':{
                    //TODO: Verify from BD
                    // if (!lease.Tenants.length) e.th(400, "There were no tenants found while attempting to create this document");
                    t.value = '';
                    break;
                }
                case 'Tenant.InsuranceCompanyName':{
                    // if (!lease.Tenants.length) e.th(400, "There were no tenants found while attempting to create this document");
                    t.value = lease.InsuranceServices && lease.InsuranceServices.length? lease.InsuranceServices[0].name : '';
                    break;
                }
                case 'Tenant.InsurancePolicyNo':{
                    // if (!lease.Tenants.length) e.th(400, "There were no tenants found while attempting to create this document");
                    t.value = lease.InsuranceServices && lease.InsuranceServices.length? lease.InsuranceServices[0].id : '';
                    break;
                }
                case 'Tenant.InsuranceExpDate':{
                    let insurance = lease.Insurance && lease.Insurance.length && lease.InsuranceServices[0];
                    t.value = insurance && insurance.servicePeriodEnd? moment(insurance.servicePeriodEnd, 'YYYY-MM-DD').format('M/D/YYYY'): '';
                    break;
                }
                case 'Space.Rate':{
                    t.value = lease && lease.Unit && lease.Unit? lease.Unit.price: '';
                    break;
                }
                case 'Space.ID':{
                    let unit = lease.Unit;
                    t.value = unit? unit.number : '';
                    break;
                }
                case 'Space.Size':{
                    let unit = lease.Unit;
                    t.value = `${unit? unit.width: ''} x ${unit? unit.length: ''}`
                    break;
                }
                case 'Space.Type':{
                    let unit = lease.Unit;
                    t.value = unit? unit.type: '';
                    break;
                }
                case 'Tenant.GateCode':{
                    if (!lease.Tenants.length) e.th(400, "There were no tenants found while attempting to create this document");

                    if (lease.Tenants[position].Contact.Access && lease.Tenants[position].Contact.Access) {
                        let access = lease.Tenants[position].Contact.Access;
                        t.value = access && access.pin;

                    } else {
                        t.value = ' ';
                    }
                    break;
                }
                case 'Tenant.MoveInCost':{
                    //TODO: I think this is not correct. But due to fact that this has been marked as not impt for now so skipping it.
                    // if (!lease.MoveInInvoice.length) e.th(400, "There were no MoveInInvoice found while attempting to create this document");
                    t.value = lease.MoveInInvoice && lease.MoveInInvoice.InvoiceLines && lease.MoveInInvoice.InvoiceLines.length? lease.MoveInInvoice.InvoiceLines[0].cost: '';
                    break;
                }
                case 'Facility.SalesTax':{
                    //TODO: Set valid facility cose here.
                    let price =  lease.MoveInInvoice.InvoiceLines[0].totalTax;
                    t.value = price? utils.formatMoney(price): '';
                    break;
                }
                case 'Tenant.MerchandiseCost':{
                    //TODO: Not correct Merchandise cost
                    let price = lease.MoveInInvoice.InvoiceLines[0].total;
                    t.value = price? utils.formatMoney(price): '';
                    break;
                }
                case 'Facility.PublicAuctionFee':{
                    let product = lease.Property.Products.filter(p => p.name.toLowerCase().includes('public auction'));
                    product = product && product.length ? await lease.Property.getProductDetails(connection, product[0].id, lease.rent): null;
                    let price = product && product.price;
                    t.value = price ? utils.formatMoney(price): '';
                    break;
                }
                case 'Facility.CleaningFee':{
                    let product = lease.Property.Products.filter(p => p.name.toLowerCase().includes('cleaning'));
                    product = product && product.length ? await lease.Property.getProductDetails(connection, product[0].id, lease.rent): null;
                    let price = product && product.price;
                    t.value = price ? utils.formatMoney(price): '';
                    break;
                }
                case 'Tenant.AuctionDate':{
                    if(lease.lease_auction && lease.lease_auction.scheduled_date){
                        let auctionDateTime = lease.lease_auction.scheduled_date.split(" ");
                        t.value = auctionDateTime.length? moment(auctionDateTime[0], 'YYYY-MM-DD').format('M/D/YYYY'): '';
                    } else t.value = '';
                    break;
                }
                case 'Tenant.AuctionTime':{
                    if(lease.lease_auction && lease.lease_auction.scheduled_date){
                        let auctionDateTime = lease.lease_auction.scheduled_date.split(" ");
                        t.value = auctionDateTime.length >= 2? moment(auctionDateTime[1], ["HH:mm:ss"]).format("hh:mm A"): '';
                    } else t.value = '';
                    break;
                }
                case 'Auction.EndDate':{
                    if(lease.lease_auction && lease.lease_auction.modified_at_local){
                        let modifiedDateTime = lease.lease_auction.modified_at_local.split(" ");
                        t.value = modifiedDateTime.length? moment(modifiedDateTime[0], 'YYYY-MM-DD').format('M/D/YYYY'): '';
                    } else t.value = '';
                    break;
                }
                case 'Auction.SaleDate':{
                    let payment = lease.lease_auction && lease.lease_auction.payment;
                    if(payment){
                        t.value = payment.date? moment(payment.date, 'YYYY-MM-DD').format('M/D/YYYY'): '';
                    } else t.value = '';
                    break;
                }
                case 'Auction.SaleDatePlus3':{
                    let payment = lease.lease_auction && lease.lease_auction.payment;
                    if(payment){
                        t.value = payment.date ? moment(payment.date, 'YYYY-MM-DD').add(3,'d').format('M/D/YYYY'): '';
                    } else t.value = '';
                    break;
                }
                case 'Auction.FinalBidAmt':{
                    let amt = lease.lease_auction && lease.lease_auction.amount
                    if(amt){
                        t.value = amt;
                    }else t.value = '';
                    break;
                }
                case 'Auction.CleaningDeposit':{
                    if(lease.lease_auction && lease.lease_auction.cleaning_deposit){
                        t.value = lease.lease_auction.cleaning_deposit;
                    } else t.value = '';
                    break;
                }
                case 'PostAuction.FinalBalDue':{
                    let lien_amt = lease.lease_auction && lease.lease_auction.lien_amount || 0;
                    let amt = lease.lease_auction && lease.lease_auction.amount || 0;
                    let balDue = lien_amt - amt;
                    t.value = balDue > 0 ? balDue: 0;
                    break;
                }
                case 'Tenant.MoveOutDate':{
                    t.value = lease.moved_out? moment(lease.moved_out, 'YYYY-MM-DD').format('M/D/YYYY'): '';
                    break;
                }
                case 'Tenant.LeaseChangeDate':{
                    t.value = '';
                    break;
                }
                case 'Tenant.LeaseSignDate':{
                    let signedDates = lease.Uploads && lease.Uploads.map(m => m.signers.map(s => s.signed)).flat().filter(f => f).sort();
                    let latestDateTime = signedDates && signedDates.length && signedDates[0];
                    let latestDate = latestDateTime && latestDateTime.split(' ')[0];
                    t.value = latestDate? moment(latestDate, 'YYYY-MM-DD').format('M/D/YYYY'): '';
                    break;
                }
                case 'Tenant.LeaseNo':{
                    t.value = '';
                    break;
                }
                case 'Tenant.FutureMoveInCost':{
                    t.value = '';
                    break;
                }
                case 'Facility.LienNoticeFee':{
                    let product = lease.Property.Products.filter(p => p.name.toLowerCase().includes('lien notice'));
                    product = product && product.length ? await lease.Property.getProductDetails(connection, product[0].id, lease.rent): null;
                    let price = product && product.price;
                    t.value = price ? utils.formatMoney(price): '';
                    break;
                }
                case 'Facility.LockCutFee':{
                    let product = lease.Property.Products.filter(p => p.name.toLowerCase().includes('lock cut'));
                    product = product && product.length ? await lease.Property.getProductDetails(connection, product[0].id, lease.rent): null;
                    let price = product && product.price;
                    t.value = price ? utils.formatMoney(price): '';
                    break;
                }
                case 'Facility.AdvertisingFee':{
                    let product = lease.Property.Products.filter(p => p.name.toLowerCase().includes('advertising'));
                    product = product && product.length ? await lease.Property.getProductDetails(connection, product[0].id, lease.rent): null;
                    let price = product && product.price;
                    t.value = price ? utils.formatMoney(price): '';
                    break;
                }
                case 'Facility.LienSaleFee':{
                    let product = lease.Property.Products.filter(p => p.name.toLowerCase().includes('lien sale fee'));
                    product = product && product.length ? await lease.Property.getProductDetails(connection, product[0].id, lease.rent): null;
                    let price = product && product.price;
                    t.value = price ? utils.formatMoney(price): '';
                    break;
                }
                case 'Facility.LienSaleChargeFee':{
                    let product = lease.Property.Products.filter(p => p.name.toLowerCase().includes('lien sale charge'));
                    product = product && product.length ? await lease.Property.getProductDetails(connection, product[0].id, lease.rent): null;
                    let price = product && product.price;
                    t.value = price ? utils.formatMoney(price): '';
                    break;
                }
                case 'Facility.KeyDepositFee':{
                    let product = lease.Property.Products.filter(p => p.name.toLowerCase().includes('key deposit'));
                    product = product && product.length ? await lease.Property.getProductDetails(connection, product[0].id, lease.rent): null;
                    let price = product && product.price;
                    t.value = price ? utils.formatMoney(price): '';
                    break;
                }
                case 'Tenant.TotalPastDue': {
                    let totalPastDue = lease.PastDue && lease.PastDue.length ? lease.PastDue.reduce((a, b) => a + b.balance, 0) :0;
                    t.value = totalPastDue > 0 ? utils.formatMoney(totalPastDue): '';
                    break;
                }
                case 'Tenant.TotalDue': {
                    let totalTotalDueBalance = lease.TotalDue && lease.TotalDue.length > 0 ? lease.TotalDue.reduce((a, b) => a + b.balance, 0) : 0;
                    t.value = totalTotalDueBalance > 0 ? utils.formatMoney(totalTotalDueBalance) : '';
                    break;
                }
                case 'Tenant.PastDue.PT1':{
                    t.value = '';
                    break;
                }
                case 'Tenant.ScheduledCharges.PT2':{
                    t.value = '';
                    break;
                }
                case 'Tenant.NewLeaseTerms.LT1':{
                    t.value = '';
                    break;
                }
                case 'Document.Notice1Date':{
                    t.value = '';
                    break;
                }
                case 'Tenant.PTDPlus1':{
                    t.value = '';
                    break;
                }
                case 'Tenant.LienAmount':{
                    t.value = '';
                    break;
                }
                case 'Tenant.RentWithTax':
                    if (!lease.RentRaise && !lease.RentRaise.rent_with_tax) break;
                    t.value = utils.formatMoney(lease.RentRaise.rent_with_tax);
                    break;
                case 'Tenant.NewRentWithTax':
                    if (!lease.RentRaise && !lease.RentRaise.new_rent_with_tax) break;
                    t.value = utils.formatMoney(lease.RentRaise.new_rent_with_tax);
                    break;
                case 'Tenant.MonthlyCharge':
                    if (!lease.RentRaise && !lease.RentRaise.monthly_charges) break;
                    t.value = utils.formatMoney(lease.RentRaise.monthly_charges);
                    break;
                case 'Tenant.NewMonthlyCharge':
                    if (!lease.RentRaise && !lease.RentRaise.new_monthly_charges) break;
                    t.value = utils.formatMoney(lease.RentRaise.new_monthly_charges);
                    break;
                case 'Tenant.VehicleStorage':
                    t.value = lease.has_vehicle_storage ? 'Yes':'No'
                    break;
                case 'Storing.SensitiveData':
                    t.value = lease.sensitive_info_stored ? 'Yes':'No'
                    break;
                case 'Tenant.MoveInRent':
                    t.value = lease.MoveInInvoice && lease.MoveInInvoice.move_in_rent
                    break;
                case 'Recipient.name':
                    t.value = `${lease.Recipient.first} ${lease.Recipient.first}`;
                    break;
                case 'Recipient.address':
                    t.value = lease.Recipient.Addresses.length ? lease.Recipient.Addresses[0].address : "";
                    break;
                case 'Recipient.address2':
                    t.value = lease.Recipient.Addresses.length ? lease.Recipient.Addresses[0].address2 : "";
                    break;
                case 'Recipient.city':
                    t.value = lease.Recipient.Addresses.length ? lease.Recipient.Addresses[0].city : "";
                    break;
                case 'Recipient.state':
                    t.value = lease.Recipient.Addresses.length ? lease.Recipient.Addresses[0].state : "";
                    break;
                case 'Recipient.country':
                    t.value = lease.Recipient.Addresses.length ? lease.Recipient.Addresses[0].country : "";
                    break;
                case 'Recipient.PostalCode':
                    t.value = lease.Recipient.Addresses.length ? lease.Recipient.Addresses[0].zip : "";
                    break;
                case 'Tenant.RentPastDueDays':
                    t.value = lease.rent_past_due_days || "";
                    break;
                case 'Tenant.StoredContents':
                    t.value = lease.stored_contents || "";
                    break;
                case 'Lease.PaymentCycle':
                    t.value = lease.payment_cycle || "Monthly";
                    break;
                case 'Lease.PaymentCycleRent':
                    t.value = lease.payment_cycle_rent + '' || "";
                    break;
                case 'ReversalSpace.ID':
                    t.value = "";
                    if(details.reversal?.leases) {
                        t.value = details.reversal.leases.map(obj => obj.number).join(', ');
                    }
                    break;
                // New Implemented - End
            }

            t.value = t.value || ' ';
            // t.value += ' ' + t.name;
            return t;
        });

        console.log("Filled out tokens!", details.tokens);
        // e.th(400, "test");

        return details.tokens;
    },

    makePricingTablesOld(lease, details) {
        if (!details.pricing || !details.pricing.tables || !details.pricing.tables.length) return;
        let template = details.pricing.tables[0];
        let pricing_table = {
            name: template.name,
            options: {
                currency: "USD",

            },
            sections: []
        };
        let applied = 0;

        let sectionRows = [];
        let section = {
            title: 'Invoice',
            default: true,
            rows: []
        };

        for (let i = 0; i < lease.PastDue.length; i++) {
            applied += lease.PastDue[i].balance === lease.PastDue[i].total_due ? 0 : lease.PastDue[i].total_due - lease.PastDue[i].balance;
            for (let j = 0; j < lease.PastDue[i].InvoiceLines.length; j++) {
                let line = lease.PastDue[i].InvoiceLines[j];
                sectionRows.push({
                    options: {
                        optional: false,
                        optional_selected: false,
                        qty_editable: false,
                    },
                    data: {
                        name: line.Product.name,
                        description: line.Product.description,
                        price: line.cost,
                        qty: line.qty,
                        ...(line.TaxLines && line.TaxLines.length && { 
                            tax_first: {
                                value: line.TaxLines.reduce((a, b) => a + b.taxrate, 0),
                                type: "percent"
                            }
                        })
                    },
                    custom_fields: {  
                        due_date: line.start_date ? moment(line.start_date).format('MM/DD/YYYY'): ''
                    }
                });
            }
        }

        section.rows = sectionRows;
        pricing_table.sections.push(section)
        if (applied > 0) {
            pricing_table.options.discount = {
                is_global: true,
                type: "absolute",
                name: "Applied Payments/Discounts",
                value: applied
            }
        }
        console.log(JSON.stringify(pricing_table, null, 2));

        return pricing_table;
    },

    makePricingTables(lease, details) {
        if (!details.pricing || !details.pricing.tables || !details.pricing.tables.length) return;
        let pricing_tables = [];
        for(let t=0; t < details.pricing.tables.length; t++) {
            let template = details.pricing.tables[t];
            let pricing_table = {
                name: template.name,
                options: {
                    currency: "USD",
                },
                sections: []
            };

            let applied = 0;
            let sectionRows = [];
            let section = {
                title: 'Invoice',
                default: true,
                rows: []
            };

            let invoices = [];
            if(template.name === ENUM.PRICING_TABLE.OPEN_INVOICES) {
                invoices = [ ...lease.PastDue ]
            } else if (template.name === ENUM.PRICING_TABLE.FUTURE_CHARGES_WITH_FEE) {
                invoices = [ ...lease.FutureCharges ]
            }

            for (let i = 0; i < invoices.length ; i++) {
                applied += invoices[i].balance === invoices[i].total_due ? 0 : invoices[i].total_due - invoices[i].balance;
                for (let j = 0; j < invoices[i].InvoiceLines.length; j++) {
                    let line = invoices[i].InvoiceLines[j];
                    sectionRows.push({
                        options: {
                            optional: false,
                            optional_selected: false,
                            qty_editable: false,
                        },
                        data: {
                            name: line.Product.name,
                            description: line.Product.description,
                            price: line.cost,
                            qty: line.qty,
                            sku: line.start_date ? moment(line.start_date).format('MM/DD/YYYY'): '',
                            ...(line.TaxLines && line.TaxLines.length && { 
                                tax_first: {
                                    value: line.TaxLines.reduce((a, b) => a + b.taxrate, 0),
                                    type: "percent"
                                }
                            })
                        }
                    });
                }
            }

            section.rows = sectionRows;
            pricing_table.sections.push(section)
            if (applied > 0) {
                pricing_table.options.discount = {
                    is_global: true,
                    type: "absolute",
                    name: "Applied Payments/Discounts",
                    value: applied
                }
            }
            pricing_tables.push(pricing_table);

            console.log(JSON.stringify(pricing_table, null, 2));
        }

        return pricing_tables;
    }


}

module.exports = pd;
