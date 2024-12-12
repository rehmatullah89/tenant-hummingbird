var moment  = require('moment');
var e  = require(__dirname + '/../modules/error_handler.js');
var request = require("request-promise");
var request_og = require("request");

const panda_client_id = "ba7335f7a341c51ecc24";
const panda_client_secret = "0ea6a2a00ef594a42fcd168a9f745dd83a154fcc";
var utils = require(__dirname + '/../modules/utils.js');

var fillTemplate = require('es6-dynamic-template');

let PANDADOCS_DOCUMENTS_URI = 'https://api.pandadoc.com/public/v1/documents/';
let PANDADOCS_TEMPLATES_URI = 'https://api.pandadoc.com/public/v1/templates/';
let GDS_PANDADOC_TOKEN_URI = process.env.GDS_PANDADOC_TOKEN_URI;
let GDS_PANDADOC_APP_ID = process.env.GDS_PANDADOC_APP_ID;
let GDS_API_KEY = process.env.GDS_API_KEY;
const fs = require("fs");
var pandadocs = {
}

module.exports = {

  async getToken(company){

    if(!company || !company.gds_owner_id) e.th(500, "Missing company id");
    let token_request = GDS_PANDADOC_TOKEN_URI + 'owners/' + company.gds_owner_id + '/credentials/';
    console.log("token_request", token_request)
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

    } catch(err) {
      
      throw err;
    }
    console.log("response", JSON.stringify(response.applicationData, null, 2));
    let pandadocs = response.applicationData[GDS_PANDADOC_APP_ID][0].data;

    return pandadocs;

    // pandadocs.access_token = response.access_token;
    // pandadocs.refresh_token = response.refresh_token;

  },

  async getDocuments(company, params = {}) {
    const { count, page, tag } = params;
    let token = await this.getToken(company);

    let url = `${PANDADOCS_TEMPLATES_URI}?count=${count}&page=${page}`;
    if(tag) {
      url += `&tag=${tag}`;
    }

    try {

      var response = await request({
        headers: {
          Authorization: 'Bearer ' + token.access_token
        },
        uri: url,
        method: 'GET',
        json:true
      });
    } catch(err){
      console.log("THIS THE ERROR", err);
      throw err
    }

    if(!response.results) {
      e.th(500, "Could not get a response from Panda Docs")
    }
    return response.results;
  
  },

  async getTemplateDetails(template_id, company){

    let token = await this.getToken(company);
    let URI = PANDADOCS_TEMPLATES_URI + template_id + '/details';

    let response = await request({
      headers: {
        Authorization: 'Bearer ' + token.access_token
      },
      json:true,
      uri: URI,
      method: 'GET'
    });

    if(!response) {
      e.th(500, "Could not get a response from Panda Docs")
    }

    return response;

  },

  async getLeaseDocuments(company,params){
    let token = await this.getToken(company);
    let results = [];
    // let all_documents = [];
    // let filtered_documents = [];

    let document_type = params.tag ? [params.tag]: [
      'lease', 'autopay', 'enroll-coverage',
       'deny-coverage', 'vehicle', 'military', 'other'
    ];

      for(var i=0 ; i<document_type.length; i++){
        try{
          var response = await request({
            headers: {
              Authorization: 'Bearer ' + token.access_token
            },
            uri: PANDADOCS_TEMPLATES_URI + '?tag=' + document_type[i]+ '&count=' + params.count + '&page=' + params.page,
            method: 'GET',
            json:true
          });
  
          if(!response.results) {
            e.th(500, "Could not get a response from Panda Docs")
          }
          else{
            // if (response.results.length>0) {
            //   if (filtered_documents.length === 0) {
            //     filtered_documents = response.results;
            //   }
            //   else filtered_documents = filtered_documents.concat(response.results);
            // }
            
            results.push({key: document_type[i], value: response.results});
          }
        }
        catch(err){
          console.log("THIS THE ERROR", err);
          throw err;
        }
        
      }

      // try{
      // results.push({key: 'other', value: await this.getDocuments(company, params)}) ;
      // }
      // catch(err){
      //   console.log("THIS THE ERROR", err);
      //   throw err;
      // }
    
    // let mapped_ids = filtered_documents.map(x => x.id);
    // const others = all_documents.filter(value => !mapped_ids.includes(value.id));
    return results;
  },

  async createDoc(data, company){

    let token = await this.getToken(company);

    let response = await request({
      headers: {
        Authorization: 'Bearer ' + token.access_token
      },
      body: data,
      json:true,
      uri: PANDADOCS_DOCUMENTS_URI,
      method: 'POST'
    });

    if(!response) {
      e.th(500, "Could not get a response from Panda Docs")
    }
    return response;

  },

  async sendDocument(document_id, company){

    let token = await this.getToken(company);
    let URI = PANDADOCS_DOCUMENTS_URI + document_id + '/send';

    let response = await request({
      headers: {
        Authorization: 'Bearer ' + token.access_token
      },
      body:{
        message: 'Message Sent from API',
        subject: "Panda Doc File",
        silent: true
      },
      json:true,
      uri: URI,
      method: 'POST'
    });

    if(!response) {
      e.th(500, "Could not get a response from Panda Docs")
    }

    return response;
  },

  async download(document_id, company, path){

    let token = await this.getToken(company);
    let URI = PANDADOCS_DOCUMENTS_URI + document_id + '/download/';

    return await new Promise((resolve, reject) => {
      // await fs.writeFile('/home/app/hummingbird/uploads/' + utils.slugify(upload.name) + '.pdf', new Buffer(file));
      let file = fs.createWriteStream(path);
      var chunks = [];
      console.log("path", path)
      var received_bytes = 0;
      var total_bytes = 0;

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
      .on('response', function(data) {

        total_bytes = parseInt(data.headers['content-length']);
      })
      .on('data', function(chunk) {
        received_bytes += chunk.length;
        var percentage = ((received_bytes * 100) / total_bytes).toFixed(2);
        console.log(percentage + "% | " + received_bytes + " bytes downloaded out of " + total_bytes + " bytes.");
      })
      .on('finish', (data) => {
        console.log("downloading pandadoc finished", data);
        if (fs.existsSync(this.fileloc)) {
          var stats = fs.statSync(this.fileloc)
          console.log("DOWNLOADED FILE EXISTS", stats);
        } else {
          console.log("DOWNLOADED FILE DOESN'T EXIST");
        }
        resolve();
      })
      .on('error', (error) => {
        console.log("downloading pandadoc error", error)
        reject(error);
      })
    })

  },

  async getSession(document_id, signer, company){
    let token = await this.getToken(company);
    let URI = PANDADOCS_DOCUMENTS_URI + document_id + '/session' ;

    console.log("signer", signer);

    let response = await request({
      headers: {
        Authorization: 'Bearer ' + token.access_token
      },
      body:{
        "recipient": signer.email,
        "lifetime": 10000
      },
      json:true,
      uri: URI,
      method: 'POST'
    });

    if(!response) {
      e.th(500, "Could not get a response from Panda Docs")
    }

    return response;
  },

  async getStatus(document_id, company){
    let token = await this.getToken(company);
    let URI = PANDADOCS_DOCUMENTS_URI + document_id ;

    let response = await request({
      headers: {
        Authorization: 'Bearer ' + token.access_token
      },
      json:true,
      uri: URI,
      method: 'GET'
    });

    if(!response) {
      e.th(500, "Could not get a response from Panda Docs")
    }
    return response;
  },

  requiresSign(details){
      if(!details.fields || !details.fields.length) return false;
      return !!details.fields.find(d => d.name === 'Signature' || d.name === 'Initials')
  },

  mergeTokens(lease, details){
      // UNTIL We support multiple signers
      let position = 0;
      if(!details|| !details.tokens) e.th(500, 'Document details not set');
      if(!details.tokens.length) return;
      // console.log("details.tokens", details.tokens);


      details.tokens.map(t => {
        console.log("tokenname", t.name);
        switch(t.name){
          case 'Tenant.FirstName':
            if(!lease.Tenants.length) e.th(400, "There were no tenants found while attempting to create this document");
            t.value = lease.Tenants[position].Contact.first;
            break;
          case 'Tenant.LastName':
            if(!lease.Tenants.length) e.th(400, "There were no tenants found while attempting to create this document");
            t.value = lease.Tenants[position].Contact.last;
            break;

          case 'Tenant.Email':
            if(!lease.Tenants.length) e.th(400, "There were no tenants found while attempting to create this document");
            t.value = lease.Tenants[position].Contact.email;
            break;
          case 'Tenant.Company':
            if(!lease.Tenants.length) e.th(400, "There were no tenants found while attempting to create this document");
            t.value = lease.Tenants[position].Contact.company;
            break;
          case 'Tenant.HomePhone':
            if(!lease.Tenants.length) e.th(400, "There were no tenants found while attempting to create this document");
            if(lease.Tenants[position].Contact.Phones.length) {
              let phone = lease.Tenants[position].Contact.Phones.find(p => p.type.toLowerCase() === 'home') ;
              t.value = phone? utils.formatPhone(phone.phone) : ' ';
            }
            break;
          case 'Tenant.Phone':
            if(!lease.Tenants.length) e.th(400, "There were no tenants found while attempting to create this document");
            if(lease.Tenants[position].Contact.Phones.length) {
              t.value = utils.formatPhone(lease.Tenants[position].Contact.Phones[0].phone);
            }
            break;
          case 'Tenant.State':
            if(!lease.Tenants.length) e.th(400, "There were no tenants found while attempting to create this document");
            if(lease.Tenants[position].Contact.Addresses.length) {
              t.value = lease.Tenants[position].Contact.Addresses[position].Address.state;
            }
            break;
          case 'Tenant.Country':
            if(!lease.Tenants.length) e.th(400, "There were no tenants found while attempting to create this document");
            if(lease.Tenants[position].Contact.Addresses.length) {
              t.value = lease.Tenants[position].Contact.Addresses[position].Address.country || '';
            }
            break;
          case 'Tenant.StreetAddress':
            if(!lease.Tenants.length) e.th(400, "There were no tenants found while attempting to create this document");
            if(lease.Tenants[position].Contact.Addresses.length) {
              t.value = lease.Tenants[position].Contact.Addresses[0].Address.address;
            }
            break;
          case 'Tenant.City':
            if(!lease.Tenants.length) e.th(400, "There were no tenants found while attempting to create this document");
            if(lease.Tenants[position].Contact.Addresses.length) {
              t.value = lease.Tenants[position].Contact.Addresses[0].Address.city;
            }
            break;
          case 'Tenant.PostalCode':
            if(!lease.Tenants.length) e.th(400, "There were no tenants found while attempting to create this document");
            if(lease.Tenants[position].Contact.Addresses.length) {
              t.value = lease.Tenants[position].Contact.Addresses[0].Address.zip;
            }
            break;
          case 'Tenant.DLNumber':
            if(!lease.Tenants.length) e.th(400, "There were no tenants found while attempting to create this document");
            if(lease.Tenants[position].Contact) {
              const dlNumber = lease.Tenants[position].Contact.driver_license;
              t.value = '****' + dlNumber.slice(-4);
            }
            break;
          case 'Tenant.Title':
            if(!lease.Tenants.length) e.th(400, "There were no tenants found while attempting to create this document");
            if(lease.Tenants[position].Contact) {
              t.value = lease.Tenants[position].Contact.salutation;
            };
            break;
          case 'Tenant.AltEmail':
            if(!lease.Tenants.length) e.th(400, "There were no tenants found while attempting to create this document");
            if(!lease.Tenants[position].Contact.Relationships || lease.Tenants[position].Contact.Relationships.length ) {
              t.value = lease.Tenants[position].Contact.Relationships[0].Contact.email  || ' ' ;
              break;
            }
            break;
          case 'Tenant.AltName':
            if(!lease.Tenants.length) e.th(400, "There were no tenants found while attempting to create this document");
            if(!lease.Tenants[position].Contact.Relationships || lease.Tenants[position].Contact.Relationships.length ) {
              t.value = ' ';
              t.value = lease.Tenants[position].Contact.Relationships[0].Contact.first + ' ' + lease.Tenants[position].Contact.Relationships[0].Contact.last;
              break;
            }
            break;
          case 'Tenant.AltPhone':
            if(!lease.Tenants.length) e.th(400, "There were no tenants found while attempting to create this document");
            if(!lease.Tenants[position].Contact.Relationships || !lease.Tenants[position].Contact.Relationships.length ) {
              t.value = ' ';
              break;
            }
            if(!lease.Tenants[position].Contact.Relationships[0].Contact.Phones || !lease.Tenants[position].Contact.Relationships[0].Contact.Phones.length){
              t.value = ' ';
              break;
            }
            t.value = utils.formatPhone(lease.Tenants[position].Contact.Relationships[0].Contact.Phones[0].phone);
            break;

          case 'Tenant.AltAddress1':
            if(!lease.Tenants.length) e.th(400, "There were no tenants found while attempting to create this document");
            if(lease.Tenants[position].Contact.Relationships && lease.Tenants[position].Contact.Relationships.length && lease.Tenants[position].Contact.Relationships[0].Contact.Addresses.length ) {
              t.value = lease.Tenants[position].Contact.Relationships[0].Contact.Addresses[0].Address.address;
            }
            break;
          case 'Tenant.AltAddress2':
            if(!lease.Tenants.length) e.th(400, "There were no tenants found while attempting to create this document");
            if(lease.Tenants[position].Contact.Relationships && lease.Tenants[position].Contact.Relationships.length && lease.Tenants[position].Contact.Relationships[0].Contact.Addresses.length ) {
              t.value = lease.Tenants[position].Contact.Relationships[0].Contact.Addresses[0].Address.address2;
            }
            break;

          case 'Tenant.AltCity':
            if(!lease.Tenants.length) e.th(400, "There were no tenants found while attempting to create this document");
            if(lease.Tenants[position].Contact.Relationships && lease.Tenants[position].Contact.Relationships.length && lease.Tenants[position].Contact.Relationships[0].Contact.Addresses.length ) {
              t.value = lease.Tenants[position].Contact.Relationships[0].Contact.Addresses[0].Address.city;
            }
            break;
          case 'Tenant.AltState':
            if(!lease.Tenants.length) e.th(400, "There were no tenants found while attempting to create this document");
            if(lease.Tenants[position].Contact.Relationships && lease.Tenants[position].Contact.Relationships.length && lease.Tenants[position].Contact.Relationships[0].Contact.Addresses.length ) {
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
            if(!lease.Tenants.length) e.th(400, "There were no tenants found while attempting to create this document");
            if(lease.Tenants[position].Contact.Relationships && lease.Tenants[position].Contact.Relationships.length && lease.Tenants[position].Contact.Relationships[0].Contact.Addresses.length ) {
              t.value = lease.Tenants[position].Contact.Relationships[0].Contact.Addresses[0].Address.zip;
            }
            break;

          case 'Tenant.MoveInDate':
            t.value = moment(lease.start_date, 'YYYY-MM-DD').format('M/D/YYYY');
            break;

          case 'Tenant.MoveInDiscount':
            if(!lease.promotion_id){
              break;
            }
            t.value = lease.Promotion.name;
            break;
          case 'Document.GrandTotal':
          case 'Facility.TotalMovingCost':
          case 'Tenant.TotalMoveInCost':
            console.log("HJeres the invoice", lease.MoveInInvoice);
            t.value = (lease.MoveInInvoice.total_due)? utils.formatMoney(lease.MoveInInvoice.total_due - lease.MoveInInvoice.total_discounts): '';
            break;

          case 'Tenant.InsurancePremium': {
            if(!lease.InsuranceServices.length) {
              t.value =  'N/A';
              break;
            };
            t.value = utils.formatMoney(lease.InsuranceServices[0].price);
            break;
          }

          case 'Tenant.ProratedInsurancePremium': {
            if(!lease.MoveInInvoice.id) break;
            let billed_insurance = lease.MoveInInvoice.InvoiceLines.find(i  => i.Product.default_type === 'insurance')
            t.value =  billed_insurance ? utils.formatMoney(billed_insurance.cost): 0;
            break;
          }

          case 'Facility.AdminFee': {

            if(!lease.MoveInInvoice.total_due) break;

            let billed_fee = lease.MoveInInvoice.InvoiceLines.find(i  => i.Product.default_type === 'late')
            t.value =  billed_fee ? utils.formatMoney(billed_fee.cost): 0;
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
          case 'Document.RefNumber':
            break;
          case 'Facility.Name':
            t.value = lease.Property.name;
            break;
          case 'Facility.Address1':
            t.value = lease.Property.Address.address;
            break;
          case 'Facility.Address2':
            t.value = lease.Property.Address.address2 || ' ' ;
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
            if(lease.Property.Phones.length){
              t.value = utils.formatPhone(lease.Property.Phones[0].phone);
            }
            break;
          case 'Facility.Email':
            if(lease.Property.Emails.length){
              t.value = lease.Property.Emails[0].email;
            }
            break;
          case 'Tenant.ProratedRent':
            if(!lease.MoveInInvoice.id) break;
            let billed_rent = lease.MoveInInvoice.InvoiceLines.find(i  => i.Product.default_type === 'rent')
            t.value =  billed_rent ?  utils.formatMoney(billed_rent.cost) : 0;
            break;
          case 'Tenant.Rent':
          case 'Facility.RentalRate':
          case 'Facility.Rate':
            t.value = utils.formatMoney(lease.rent);
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
            t.value = lease.bill_day;
            break;

            case 'Facility.RentDueDateWithSuffix':
            t.value = utils.dayEnding(lease.bill_day);
            break;

          case 'Tenant.ActiveMilitaryNo':
            t.value = !lease.Tenants[position].Contact.Military.active;
            break;
          case 'Tenant.ActiveMilitaryYes':
            t.value = !!lease.Tenants[position].Contact.Military.active;
            break;
          case 'Tenant.Address1':
            if(lease.Tenants[position].Contact.Addresses.length) {
              t.value = lease.Tenants[position].Contact.Addresses[0].Address.address || ' ' ;
            }
            break;
          case 'Tenant.Address2':
            if(lease.Tenants[position].Contact.Addresses.length) {
              t.value = lease.Tenants[position].Contact.Addresses[0].Address.address2 || ' ' ;
            }
            break;

          case 'Tenant.CellPhone':
            if(!lease.Tenants.length) e.th(400, "There were no tenants found while attempting to create this document");
            if(!lease.Tenants[position].Contact.Phones || !lease.Tenants[position].Contact.Phones.length ) {
              t.value = ' ';
              break;
            }
            let phone = lease.Tenants[position].Contact.Phones.find(p => ['mobile', 'cell'].indexOf(p.type.toLowerCase() >= 0));
            t.value = utils.formatPhone(phone.phone) || ' ';
            break;

          case 'Tenant.GateAccessCode':
            if(!lease.Tenants.length) e.th(400, "There were no tenants found while attempting to create this document");

            if(lease.Tenants[position].Contact.Access && lease.Tenants[position].Contact.Access.length){
               let access =  lease.Tenants[position].Contact.Access.find(p => p.property_id === lease.Property.id);
              console.log(access);
               t.value = access.pin;

            } else {
              t.value = ' ';
            }
            break;
          case 'Tenant.Name':
            if(!lease.Tenants.length) e.th(400, "There were no tenants found while attempting to create this document");
            t.value = lease.Tenants[position].Contact.first + ' ' + lease.Tenants[position].Contact.last;
            break;

          case 'Tenant.UnitId':
            t.value = lease.Unit.number;
            break;

          // case 'Tenant.UnitSize':
          //   t.value = lease.Unit.Category.name;
          //   break;

          case 'Tenant.CardExpDate':
            if(lease.PaymentMethods.length){
              t.value = lease.PaymentMethods[0].exp_warning;
            }
            break;

          case 'Tenant.CardName':
            if(lease.PaymentMethods.length){
              t.value =  lease.PaymentMethods[0].name_on_card;
            }
            break;
          case 'Tenant.CardNumber':
            if(lease.PaymentMethods.length){
              t.value = lease.PaymentMethods[0].card_end;
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
        }

        t.value = t.value || ' ';
        // t.value += ' ' + t.name;
        return t;
      });

      // console.log(details.tokens);
      // e.th(400, "test");

      return details.tokens;
    },

  makePricingTables(lease, details ){
     if(!details.pricing || !details.pricing.tables || !details.pricing.tables.length) return;
      let template = details.pricing.tables[0];
      let pricing_table = {
        name: template.name,
        options: {
          currency: "USD",

        },
        sections: []
      };
      let applied = 0;

      for(let i = 0 ; i < lease.PastDue.length; i++){
          let section = {
            title: 'Invoice #' +  lease.PastDue[i].number,
            default: true,
            rows: []
          };
          applied += lease.PastDue[i].balance === lease.PastDue[i].total_due ? 0 : lease.PastDue[i].total_due - lease.PastDue[i].balance;
        for(let j = 0 ; j < lease.PastDue[i].InvoiceLines.length; j++){
            let line = lease.PastDue[i].InvoiceLines[j];
            section.rows[j] = {
              options: {
                optional: false,
                optional_selected: false,
                qty_editable: false,
              },
              data:{
                name: line.Product.name,
                description: line.Product.description,
                price: line.cost,
                qty: line.qty,

              }
            }
            if(line.TaxLines && line.TaxLines.length){
              section.rows[j].data.tax_first = {
                value: line.TaxLines.reduce((a,b) =>  a + b.taxrate, 0),
                type: "percent"
              }
            }


          }
          pricing_table.sections.push(section)
        }
        if(applied > 0){
          pricing_table.options.discount = {
            is_global: true,
            type: "absolute",
            name: "Applied Payments/Discounts",
            value: applied
          }
        }
        console.log(JSON.stringify(pricing_table, null, 2));

        return pricing_table;


    }

}
