"use strict";

var models = require(`./../models`);
var settings = require(__dirname + '/../config/settings.js');

var Promise = require('bluebird');
var QB = require('node-quickbooks');
var validator = require('validator')
var moment = require('moment');


var fs = require("fs");
var e  = require(__dirname + '/../modules/error_handler.js');
var pandadocs      =  require(__dirname + '/../modules/pandadocs.js');
var Utils = require(__dirname + '/../modules/utils.js');
const ENUMS = require(__dirname + '/../modules/enums');
var Hashes = require(`./../modules/hashes`).init();
var rp = require('request-promise');

var pdf = require('html-pdf');
var hummus = require('hummus');

Promise.promisifyAll(fs);
Promise.promisifyAll(pdf);

var request = require("request-promise");

var path = require('path');

var options = {
  format: 'Letter',
  border: {
    top: "0.5in",            // default is 0, units: mm, cm, in, px
    right: "0.25in",
    bottom: "0.5in",
    left: "0.25in"
  }
};

function getGetOrdinal(n) {
  var s=["th","st","nd","rd"],
    v=n%100;
  return n+(s[(v-20)%10]||s[v]||s[0]);
}


class Document {

  constructor(data){

    data = data || {};
    this.id = data.id || null;
    this.name = data.name || null;
    this.document_type_id = data.document_type_id || null;
    this.description = data.description || null;
    this.company_id = data.company_id || data?.Company?.id || null;
    this.upload_id = data.upload_id || null;
    this.unit_type = data.unit_type || null;
    this.status = data.status || null;
    this.public = data.public || 0;
    this.Upload = data.Upload || {};
    this.DocumentType = data.DocumentType || {};
    this.msg = '';

    this.fileloc = '';
    this.revised_path = '';
    this.requires_signature = false;

    this.Company = data.Company || {};

    this.Details = {};
    this.mergedTokens = [];
    this.pricingTables = [];
    this.mergedTablesTokens = [];
    this.requiresSign = false;
    this.Signers = [];
  }



  static async getDocuments(company){
    return await pandadocs.getDocuments(company);
  }

  async getTemplateDetails(company){
    this.Details = await pandadocs.getTemplateDetails(this.id, company);
    return this.Details;
  }

  async createPandaDoc(lease, company){
    let body = {
      name: this.Details.name,
      template_uuid: this.id,
      recipients: this.Signers.map(s => {
          return {
            email: s.email,
            first_name: s.first,
            last_name: s.last,
            role: s.role
          }
      }),
      tokens: this.mergedTokens
    };
    
    if(this.pricingTables) {
      body.pricing_tables = [...this.pricingTables];
    }
    return await pandadocs.createDoc(body, company);
  }

  async updateDocument(){

    let URI = PANDADOCS_DOCUMENTS_URI + this.id + '/details';

    let response = await request({
      headers: {
        Authorization: 'Bearer ' + pandadocs.access_token
      },
      json:true,
      uri: URI,
      method: 'GET'
    });

    if(!response) {
      e.th(500, "Could not get a response from Panda Docs")
    }

    console.log("RESPONSE!!!!", response)

  }

  static async getUnitDocumentTemplates(connection, unit_id){

      let unit = new Unit({id: unit_id});
      await unit.find(connection);
      console.log("unit", unit);

  }

  static async generateDocument(data){

    console.log(data);

  }

  async find (connection){

    if(!this.id) e.th(500,"Document id not set");

    let data = await models.Document.findById(connection, this.id);
    if(!data) e.th(404, "Cannot find document");
    this.company_id = data.company_id;
    this.name = data.name;
    this.document_type_id = data.document_type_id;
    this.upload_id = data.upload_id;
    this.description = data.description;
    this.status = data.status;
    this.public = data.public;
    this.unit_type = data.unit_type;

    this.Upload = {};
    this.DocumentType = {};
    this.DocumentType = await models.Document.findTypeById(connection, this.document_type_id);

    if(!this.upload_id) return;
    this.Upload = new Upload({id: this.upload_id });

    await this.Upload.find(connection);
    
  }

  validate(){

    if (!this.name) e.th(422, 'Please enter a document name')
    if (!this.document_type_id) e.th(422, 'Please enter a document type')
    if (!this.company_id) e.th(500, 'Missing Company ID')

    return Promise.resolve();
  }

  async saveDocument(connection){
    
      var save = {
        name: this.name,
        document_type_id: this.document_type_id,
        company_id: this.company_id,
        upload_id: this.upload_id,
        unit_type: this.unit_type,
        description: this.description,
        status: this.status,
        public: this.public
      };
    
      this.id = await models.Document.save(connection, save, this.id);
  
    }

  delete(connection){
    var _this = this;
    return Promise.resolve().then(function() {
      if (_this.Upload) {
        return models.Upload.delete(connection, _this.Upload.id)
      }
      return true;
    }).then(function(){

      return models.Document.delete(connection, _this.id)
    });
  }

  getRequiredFields(){
    var required = [];

    this.Upload.Pages.forEach(function(page){
      page.fields.forEach(function(field){
        field.merge_fields.forEach(function(mf){
          var key = Object.keys(mf)[0];
          required.push(key);
        });
      })
    });

    return required;

  }

  async setCompany(connection){

    if(!this.id) e.th(500,"Document id not set");
    this.Company = new Company({id: this.company_id});

    await this.Company.find(connection);


  }

  mergeFields(lease){

    var _this = this;

    if(!this.Upload.Pages) return;

    this.Upload.Pages.forEach(function(page){
      page.fields.forEach(function(field){
        if(field.type === "Merge"){
          field.merge_fields.forEach(function(mf){
            var key = Object.keys(mf)[0];
            var position = (mf.signer_position)? mf.signer_position - 1 : 0;
            mf.type = 'text';

            switch(key.toLowerCase()){
              // Contact
              case 'first':
                if(lease.Tenants[position]){
                  mf.render = lease.Tenants[position].Contact.first;
                }
                break;
              case 'last':

                if(lease.Tenants[position]) {
                  mf.render = lease.Tenants[position].Contact.last;
                }
                break;
              case 'email':

                if(lease.Tenants[position]){
                  mf.render = lease.Tenants[position].Contact.email;
                }
                break;
              case 'phone':
                if(lease.Tenants[position] && lease.Tenants[position].Contact.Phones.length){
                  mf.render = '';
                  var phone = lease.Tenants[position].Contact.Phones.filter(p => p.type.toLowerCase() == 'phone');
                  if(phone.length) mf.render = phone[0].phone;
                }
                break;
              case 'phone_home':

                if(lease.Tenants[position] && lease.Tenants[position].Contact.Phones.length){
                  console.log(lease.Tenants[position].Contact.Phones);
                  mf.render = '';
                  var phone = lease.Tenants[position].Contact.Phones.filter(p => ['home', 'home phone'].indexOf(p.type.toLowerCase()) > -1);
                  if(phone.length) mf.render = phone[0].phone;
                }
                break;
              case 'phone_cell':
                if(lease.Tenants[position] && lease.Tenants[position].Contact.Phones.length){
                  mf.render = '';
                  var phone = lease.Tenants[position].Contact.Phones.filter(p => ['cell', 'cell phone'].indexOf(p.type.toLowerCase()) > -1);
                  if(phone.length) mf.render = phone[0].phone;
                }
                break;
              case 'phone_business':
                if(lease.Tenants[position] && lease.Tenants[position].Contact.Phones.length){
                  mf.render = '';
                  var phone = lease.Tenants[position].Contact.Phones.filter(p => ['work', 'business phone'].indexOf(p.type.toLowerCase()) > -1);
                  if(phone.length) mf.render = phone[0].phone;
                }
              case 'ssn':
                if(lease.Tenants[position]) {
                  mf.render = lease.Tenants[position].Contact.ssn;
                }
                break;
              case 'gender':
                if(lease.Tenants[position]) {
                  mf.render = lease.Tenants[position].Contact.gender;
                }
                break;
              case 'tenant_address':
                if(lease.Tenants[position]) {
                  if(lease.Tenants[position].Contact.Addresses.length){
                    var address = lease.Tenants[position].Contact.Addresses.filter(a => a.type == 'home');
                    mf.render = address.length? address[0].Address.address: lease.Tenants[position].Contact.Addresses[0].Address.address;
                  }
                }
                break;
              case 'tenant_number':
                if(lease.Tenants[position]) {
                  if(lease.Tenants[position].Contact.Addresses.length){
                    var address = lease.Tenants[position].Contact.Addresses.filter(a => a.type == 'home');
                    mf.render = address.length ? address[0].number: lease.Tenants[position].Contact.Addresses[0].number || null;
                  }
                }
                break;
              case 'tenant_city':
                if(lease.Tenants[position]) {
                  if(lease.Tenants[position].Contact.Addresses.length){
                    var address = lease.Tenants[position].Contact.Addresses.filter(a => a.type == 'home');
                    mf.render = address.length? address[0].Address.city: lease.Tenants[position].Contact.Addresses[0].Address.city;
                  }
                }
                break;
              case 'tenant_state':
                if(lease.Tenants[position]) {
                  if(lease.Tenants[position].Contact.Addresses.length){
                    var address = lease.Tenants[position].Contact.Addresses.filter(a => a.type == 'home');
                    mf.render = address.length? address[0].Address.state: lease.Tenants[position].Contact.Addresses[0].Address.state;
                  }
                }
                break;
              case 'tenant_zip':
                if(lease.Tenants[position]) {
                  if(lease.Tenants[position].Contact.Addresses.length){
                    var address = lease.Tenants[position].Contact.Addresses.filter(a => a.type == 'home');
                    mf.render = address.length? address[0].Address.zip: lease.Tenants[position].Contact.Addresses[0].Address.zip;
                  }
                }
                break;
              case 'tenant_full_address':

                if(lease.Tenants[position]) {
                  if(lease.Tenants[position].Contact.Addresses.length){
                    var address = lease.Tenants[position].Contact.Addresses.filter(a => a.type == 'home');
                    var homeaddress = address.length ? address[0]: lease.Tenants[position].Contact.Addresses[0];

                    mf.render = homeaddress.Address.zip + ' ' + (homeaddress.number ? "#" +  homeaddress.number : '') + ' ' + homeaddress.city + ' ' + homeaddress.state + ' ' + homeaddress.zip;
                  }
                }

                break;
              case 'dob':
                if(lease.Tenants[position]) {

                  if(lease.Tenants[position].Contact.dob){
                    mf.render = moment(lease.Tenants[position].Contact.dob).format('MM/DD/YYYY');
                  }
                }
                break;
              case 'driver_license':
                if(lease.Tenants[position]) {
                  mf.render = lease.Tenants[position].Contact.driver_license;
                }
                break;
              case 'active_military':
                if(lease.Tenants[position]) {
                  mf.render = (lease.Tenants[position].Contact.active_military) ? 'Yes': 'No';
                }
                break;
              case 'military_branch':
                if(lease.Tenants[position]) {
                  mf.render = lease.Tenants[position].Contact.military_branch;
                }
                break;
              case 'emergency_contact':
                mf.render = '';

                if(lease.Tenants[position] && lease.Tenants[position].Contact.Relationships.length) {
                  var emergency = lease.Tenants[position].Contact.Relationships.filter(r => r.is_emergency);

                  if(emergency.length) mf.render  = emergency[0].Contact.first + ' ' + emergency[0].Contact.last;
                }
                break;
              case 'emergency_relationship':

                mf.render = '';

                if(lease.Tenants[position] && lease.Tenants[position].Contact.Relationships.length) {
                  var emergency = lease.Tenants[position].Contact.Relationships.filter(r => r.is_emergency);
                  if(emergency.length) mf.render  = emergency[0].type;
                }
                break;
              case 'emergency_phone':
                mf.render = '';

                if(lease.Tenants[position] && lease.Tenants[position].Contact.Relationships.length) {
                  var emergency = lease.Tenants[position].Contact.Relationships.filter(r => r.is_emergency);
                  if(emergency.length) {

                    if(emergency[0].Contact.Phones.length){
                      mf.render  = emergency[0].Contact.Phones[0].phone;
                    }
                  }
                }
                break;
              case 'emergency_email':
                mf.render = '';
                if(lease.Tenants[position] && lease.Tenants[position].Contact.Relationships.length) {
                  var emergency = lease.Tenants[position].Contact.Relationships.filter(r => r.is_emergency);
                  if(emergency.length) mf.render  = emergency[0].Contact.email;
                }
                break;

              case 'gate_code':
                mf.render = '';
                if(lease.Tenants[position] && lease.Tenants[position].Contact.Access && lease.Tenants[position].Contact.Access.length) {
                  var creds = lease.Tenants[position].Contact.Access[0];
                  mf.render  = creds.pin;
                }
                break;


              // Lease
              case 'rent':
                mf.render = "$" + Utils.formatMoney(lease.rent);
                break;
              case 'security_deposit':
                mf.render = (lease.security_deposit && lease.security_deposit > 0 )? "$" +  Utils.formatMoney(lease.security_deposit): "$0.00";
                break;
              case 'start':
                mf.render = moment(lease.start_date).format('MM/DD/YYYY');
                break;
              case 'end':
                mf.render = lease.end_date ? moment(lease.end_date).format('MM/DD/YYYY'): '';
                break;
              case 'duration':
                mf.render = lease.Unit.lease_duration + ' ' + lease.Unit.lease_duration_type;
                break;
              case 'terms':
                mf.render = lease.terms;
                break;
              case 'late_fee':
                mf.render = (lease.late_fee_type == 'dollars')? '$' + Utils.formatMoney(lease.late_fee) : lease.late_fee + "%";
                break;
              case 'late_fee_days':
                mf.render = lease.late_fee_days + ' days';
                break;
              case 'subsequent_late_fee':
                mf.render = (lease.late_fee_subsequent_type == 'dollars')? '$' + Utils.formatMoney(lease.late_fee_subsequent) : lease.late_fee_subsequent + "%";
                break;
              case 'subsequent_late_fee_days':
                mf.render = lease.late_fee_subsequent_days + ' days';
                break;
              case 'bill_day':
                mf.render = getGetOrdinal(lease.bill_day);
                break;
              case 'notes':
                mf.render = lease.notes;
                break;
              case 'lease_type':
                mf.render = lease.monthly ? 'Month to Month' : 'Fixed Length';
                break;
              case 'code':
                mf.render = lease.code;
                break;
              case 'move_in_charge':
                mf.render =  (lease.MoveInInvoice.id)? utils.formatMoney(lease.MoveInInvoice.total_due): '';
                break;
              case 'total_rent_due':
                mf.render =  (lease.total_rent_due) ? '$' + Utils.formatMoney(lease.total_rent_due): '';
                break;



              // Unit
              case 'address':
                mf.render = lease.Unit.Address.address;
                break;
              case 'city':
                mf.render = lease.Unit.Address.city;
                break;
              case 'state':
                mf.render = lease.Unit.Address.state;
                break;
              case 'zip':
                mf.render = lease.Unit.Address.zip;
                break;
              case 'number':
                mf.render = lease.Unit.number;
                break;
              case 'full_address':
                mf.render = lease.Unit.Address.address + "#" + lease.Unit.number + ' ' + lease.Unit.Address.city +  ' ' + lease.Unit.Address.state + ' ' + lease.Unit.Address.zip;
                break;
              case "mm/dd/yyyy":
                mf.render = moment().format('MM/DD/YYYY');
                break;
              case "dd/mm/yyyy":
                mf.render = moment().format('DD/MM/YYYY');
                break;
              case "m/d/yy":
                mf.render = moment().format('M/D/YY');
                break;
              case "d/m/yy":
                mf.render = moment().format('D/M/YY');
                break;
              case "weekday":
                mf.render = moment().format('dddd');
                break;

              case "monthday":
                mf.render = moment().format('Do');
                break;
              case "month":
                mf.render = moment().format('MMMM');
                break;
              case "year_long":
                mf.render = moment().format('YYYY');
                break;
              case "year_short":
                mf.render = moment().format('YY');
                break;
              case "floor":
                mf.render = lease.Unit.floor;
                break;




              // Unit Storage
              case "height":
                mf.render = lease.Unit.height;
                break;
              case "width":
                mf.render = lease.Unit.width;
                break;
              case "length":
                mf.render = lease.Unit.length;
                break;
              case "storage_type":
                mf.render = lease.Unit['unit type'];
                break;
              case "door_type":
                mf.render = lease.Unit['door type'];
                break;
              case "vehicle_storage":
                mf.render = lease.Unit['vehicle storage'];
                break;




              // Unit Residential
              case "beds":
                mf.render = lease.Unit.beds;
                break;
              case "baths":
                mf.render = lease.Unit.baths;
                break;
              case "parking":
                mf.render = lease.Unit.parking;
                break;
              case "sqft":
                mf.render = lease.Unit.sqft;
                break;
              case "pets":
                mf.render = lease.Unit.pets;
                break;
              case "furnished":
                mf.render = lease.Unit.furnished;
                break;
              case "laundry":
                mf.render = lease.Unit.laundry;
                break;
              case "unit_type":
                mf.render = lease.Unit['unit type'];
                break;
              case "year_built":
                mf.render = lease.Unit['year built'];
                break;

              case 'utilities':
                mf.type = 'utilities';
                mf.render = lease.Unit.Utilities;

                break;



              //Amenities
              case 'building_type':
                mf.type = 'amenity';
                mf.name = 'Building Type';

                mf.render = _this.parseActiveAmenities(lease.AmenityTypes.external[mf.name], lease.Unit.Amenities[mf.name]);
                break;
              case 'parking_options':
                mf.type = 'amenity';
                mf.name = 'Parking';
                mf.render = _this.parseActiveAmenities(lease.AmenityTypes.external[mf.name], lease.Unit.Amenities[mf.name]);
                break;
              case 'community_facilities':
                mf.type = 'amenity';
                mf.name = 'Community Facilities';
                mf.render = _this.parseActiveAmenities(lease.AmenityTypes.external[mf.name], lease.Unit.Amenities[mf.name]);
                break;
              case 'security_access':
                mf.type = 'amenity';
                mf.name = 'Security';
                mf.render = _this.parseActiveAmenities(lease.AmenityTypes.external[mf.name], lease.Unit.Amenities[mf.name]);
                break;

              case 'payment_options':
                mf.type = 'amenity';
                mf.name = 'Payment Options';
                mf.render = _this.parseActiveAmenities(lease.AmenityTypes.external[mf.name], lease.Unit.Amenities[mf.name]);
                break;
              case 'unit_features':
                mf.type = 'amenity';
                mf.name = 'Unit Features';
                mf.render = _this.parseActiveAmenities(lease.AmenityTypes.internal[mf.name], lease.Unit.Amenities[mf.name]);
                break;
              case 'appliances':
                mf.type = 'amenity';
                mf.name = 'Appliances';
                mf.render = _this.parseActiveAmenities(lease.AmenityTypes.internal[mf.name], lease.Unit.Amenities[mf.name]);
                break;
              case 'exterior':
                mf.type = 'amenity';
                mf.name = 'Exterior';
                mf.render = _this.parseActiveAmenities(lease.AmenityTypes.internal[mf.name], lease.Unit.Amenities[mf.name]);
                break;
              case 'heating_cooling':
                mf.type = 'amenity';
                mf.name = 'Heating and Cooling';
                mf.render = _this.parseActiveAmenities(lease.AmenityTypes.internal[mf.name], lease.Unit.Amenities[mf.name]);
                break;
              case 'rooms':
                mf.type = 'amenity';
                mf.name = 'Rooms';
                mf.render = _this.parseActiveAmenities(lease.AmenityTypes.internal[mf.name], lease.Unit.Amenities[mf.name]);
                break;
              case 'wiring':
                mf.type = 'amenity';
                mf.name = 'Wiring';
                mf.render = _this.parseActiveAmenities(lease.AmenityTypes.internal[mf.name], lease.Unit.Amenities[mf.name]);
                break;


              /* Storage Amenities */


              case 'moving options':
                mf.type = 'amenity';
                mf.name = 'Moving Options';
                mf.render = _this.parseActiveAmenities(lease.AmenityTypes.external[mf.name], lease.Unit.Amenities[mf.name]);
                break;
              case 'security':
                mf.type = 'amenity';
                mf.name = 'Security';
                mf.render = _this.parseActiveAmenities(lease.AmenityTypes.external[mf.name], lease.Unit.Amenities[mf.name]);
                break;
              case 'access':
                mf.type = 'amenity';
                mf.name = 'Access';
                mf.render = _this.parseActiveAmenities(lease.AmenityTypes.external[mf.name], lease.Unit.Amenities[mf.name]);
                break;
              case 'insurance':
                mf.type = 'amenity';
                mf.name = 'Insurance';
                mf.render = _this.parseActiveAmenities(lease.AmenityTypes.external[mf.name], lease.Unit.Amenities[mf.name]);
                break;


              case 'vehicle storage':
                mf.type = 'amenity';
                mf.name = 'Vehicle Storage';
                mf.render = _this.parseActiveAmenities(lease.AmenityTypes.external[mf.name], lease.Unit.Amenities[mf.name]);
                break;


              // Settings
              case 'tax_rate':
                console.log(_this.Company.Settings.taxRate);
                mf.render = _this.Company.Settings.taxRate + '%';
                break;

            }
          });
        } else {
          field.signed = null
        }
      });
    });

    return;

  }

  mergeTokens(connection, lease){

    this.mergedTokens = pandadocs.mergeTokens(connection, lease, this.Details);
    // Need to check if we can remove pricing table
    this.pricingTables = pandadocs.makePricingTables( lease, this.Details);
    this.requiresSign = pandadocs.requiresSign( this.Details);

  }

  setSigners(lease){


    if(!this.Details || !this.Details.fields) e.th(500, 'Document details not set');
    if(!this.Details.roles.length) {
      console.log('no roles');
      return;
    }


    if(!lease.Tenants.length) e.th(500, 'There are no tenants to sign this lease!');
    this.Signers = [{
      upload_id: null,
      contact_id: lease.Tenants[0].Contact.id,
      email: lease.Tenants[0].Contact.email || 'admin@tenantinc.com',
      first: lease.Tenants[0].Contact.first,
      last: lease.Tenants[0].Contact.last,
      role: 'Tenant',
      status: this.requiresSign
    }];

    return;

  }

  parseActiveAmenities(allAmenities, activeAmenities){
    var render = [];
    if(!activeAmenities) return '';

    allAmenities.forEach(a => {
      var renderData = {
        name: a.name,
        type: a.options.type,
        value: null,
        status: false
      };

      activeAmenities.forEach(unitAmenity => {
        if(unitAmenity.name === a.name){
          renderData.value = unitAmenity.value,
            renderData.status = true
        }
      });
      render.push(renderData);

    });

    return render;
  }

  setPaths(lease_id){


    // this.fileloc = settings.config.base_path + 'public/img/uploads/' + this.Upload.model + '/' + this.Upload.foreign_id + '/' + this.Upload.filename;
    // this.revised_path = settings.config.base_path + 'public/img/uploads/lease/' + lease_id + '/' + this.Upload.filename;
    // try{
    // 	fs.existsSync(settings.config.base_path + 'public/img/uploads/lease') || fs.mkdirSync(settings.config.base_path + 'public/img/uploads/lease');
    // 	fs.existsSync(settings.config.base_path + 'public/img/uploads/lease/'+  lease_id) || fs.mkdirSync(settings.config.base_path + 'public/img/uploads/lease/'+  lease_id);
    // } catch(err){
    // 	throw err;
    // }

    this.fileloc = this.Upload.file_path;
    this.revised_path = settings.config.base_path  + settings.img_path + moment().format('x') + '_' + this.Upload.filename;


    return true;
  }

  generate(connection, lease, logged_in_user, ip_address){
    var _this = this;
    var newUpload = {};
    var signers = [];
    var signatureFields = [];
    var fontSize = 9;
    var signers = {
      'tenant': {},
      'cosigner': {},
      'admin': {}
    }

    return Promise.resolve().then(() => {

      if (!_this.fileloc) throw new Error("File Location not set");
      if (!_this.revised_path) throw new Error("Save File Location not set");

      var page_width = 612;
      var page_height = 792;

      try {

        var pdfReader = hummus.createReader(_this.fileloc);
        var pdfWriter = hummus.createWriterToModify(_this.fileloc, {
          modifiedFilePath: _this.revised_path
        });

        var font = pdfWriter.getFontForFile(settings.config.base_path + 'fonts/OpenSans-Regular.ttf');
        var boldFont = pdfWriter.getFontForFile(settings.config.base_path + 'fonts/OpenSans-ExtraBold.ttf');
        var uncheckedFont = pdfWriter.getFontForFile(settings.config.base_path + 'fonts/fa-regular-400.ttf');
        var checkedFont = pdfWriter.getFontForFile(settings.config.base_path + 'fonts/fa-solid-900.ttf');

        _this.Upload.Pages.forEach((page, index) => {
          // Get Page Dimmension
          var parsedPage = pdfReader.parsePage(index);
          var media = parsedPage.getMediaBox();
          page_width = media[2] - media[0];
          page_height = media[3] - media[1];

          var pageModifier = new hummus.PDFPageModifier(pdfWriter, index, true);
          var ctx = pageModifier.startContext().getContext();




          page.fields.forEach(field => {

            var t;
            if (field.type == 'Signature' || field.type == 'Initials') {
              this.requires_signature = true;
            } else {

              var textRenders = field.merge_fields.map(function (f) {
                return (f.type == 'text') ? f.render: null;
              });


              var textToPrint = textRenders.join(' ');
              if(textToPrint.length){
                _this.printText(textToPrint, field, font, page_width, page_height, ctx, fontSize);
              }
              // render amenities
              field.merge_fields.map(function (f) {
                if(f.type == 'amenity'){
                  _this.printAmenity(f, field, font, boldFont, checkedFont, uncheckedFont, page_width, page_height, ctx, fontSize);

                }
              });
              // render utilities
              field.merge_fields.map(function (f) {
                if(f.type == 'utilities'){
                  _this.printUtilities(f, field, font, boldFont, page_width, page_height, ctx, fontSize);
                }
              });
            }
          });
          pageModifier.endContext().writePage();
        });
        pdfWriter.end();
        return true;

      } catch (err) {
        console.log(err);
        throw err;
      }
    }).then(() => {

      var uploadData = {
        //	foreign_id: lease.id,
        filename: this.Upload.filename,
        //	model: "lease",
        document_type_id: this.Upload.document_type_id,
        uploaded_by: logged_in_user || null,
        //	type: 'lease',
        upload_date: moment.utc().format('YYYY-MM-DD HH:mm:ss'),
        extension: this.Upload.extension,
        mimetype: this.Upload.mimetype,
        name: this.Upload.name,
        description: this.Upload.description,
        file_path: this.revised_path,
        fileloc: settings.img_path +  this.Upload.filename
      }

      newUpload = new Upload(uploadData);
      return newUpload.save(connection)
        .then(() => newUpload.saveUploadLease(connection, lease.id))
        .then(() => newUpload.makePages(connection))
        .then(function(){
          return Promise.mapSeries(_this.Upload.Pages, (page, i) => {
            return Promise.mapSeries(page.fields, (field, j) => {
              if(field.type != 'Signature' && field.type != 'Initials') return;

              var newField = {
                x_start: field.x_start,
                y_start: field.y_start,
                width: field.width,
                type: field.type,
                signer_type: field.signer_type,
                signer_position: field.signer_position,
                height: field.height,
                page_id: newUpload.Pages[i].id
              }


              return models.Document.saveField(connection, newField).then((newField_id)=>{

                newField.id = newField_id;

                var t;
                switch(newField.signer_type){
                  case 'Tenant':
                    if (!lease.Tenants[newField.signer_position - 1]) break;
                    t = lease.Tenants[newField.signer_position - 1];
                    signers.tenant[t.id] = signers.tenant[t.id] || { fields: [] };
                    signers.tenant[t.id].tenant_id = t.id;
                    signers.tenant[t.id].fields.push(newField);
                    break;
                  case 'Cosigner':
                    if (!lease.Tenants[newField.signer_position - 1] || !lease.Tenants[newField.signer_position - 1].Cosigner) break;

                    t = lease.Tenants[newField.signer_position - 1];
                    signers.cosigner[t.id] = signers.cosigner[t.id] || { fields: [] };
                    signers.cosigner[t.id].tenant_id = t.id;
                    signers.cosigner[t.id].cosigner_id = t.Cosigner.id;
                    signers.cosigner[t.id].fields.push(newField);
                    break;
                  case 'Administrator':
                    break;
                }

                return;

              });
            })

          });

          // return newUpload.transferSignatureFields(connection, _this.Upload.Pages)
        });

    }).then(function(){

      return newUpload.find(connection);

    }).then(function(){
      if(!signers.tenant) return;
      return Promise.mapSeries(Object.keys(signers.tenant), tenant_id => {
        var s = signers.tenant[tenant_id];

        var sgnr = new Signer({
          tenant_id: tenant_id,
          upload_id: newUpload.id
        });

        return sgnr.create(connection, s.fields, logged_in_user, ip_address).then(() => {
          newUpload.signers.push(sgnr);
          return true;
        })

      });
    }).then(function(){

      if(!signers.cosigner) return;

      return Promise.mapSeries(Object.keys(signers.cosigner), tenant_id => {
        var s = signers.cosigner[tenant_id];

        var cosgnr = new Signer({
          tenant_id: tenant_id,
          cosigner_id: s.cosigner_id,
          upload_id: newUpload.id
        });

        return cosgnr.create(connection, s.fields, logged_in_user, ip_address).then(() => {

          newUpload.cosigners.push(cosgnr);
          return true;

        })

      });
    }).then(() => newUpload);

  }

  printText(textToPrint, field, font, page_width, page_height, ctx, fontSize){

    var cursor = 0;
    textToPrint.split("\n").map((t, i) => {
      var textDimensions = font.calculateTextDimensions(t,10);
      var fieldWidth = field.width * page_width;
      var numChars = t.length;
      var textSegmentLength = Math.floor((fieldWidth/textDimensions.width) * numChars);

      var re = new RegExp('.{1,' + textSegmentLength + '}',"g");
      var textSegments = t.match(re);

      if(!textSegments) textSegments = [' '];

      textSegments.forEach((segment, j) => {
        ctx.writeText(
          segment.replace(/^\s+|\s+$/g, ''),
          page_width * field.x_start + 3,
          page_height - (page_height * field.y_start) - 14 - ( (cursor) * 14),
          {
            font: font,
            size: fontSize,
            colorspace: 'gray',
            color: 0x00
          }
        );
        cursor++;
      })

    });

  }

  printUtilities(f, field, font, boldFont, page_width, page_height, ctx, fontSize){
    if(!f.render) return false;

    var cursor = 0;

    f.render.forEach(u => {
      ctx.writeText(
        u.name.replace(/^\s+|\s+$/g, ''),
        page_width * field.x_start + 3,
        page_height - (page_height * field.y_start) - 14 - ( (cursor) * 14),
        {
          font: boldFont,
          size: fontSize,
          colorspace: 'gray',
          color: 0x00
        }
      );
      var textDimensions = font.calculateTextDimensions(u.description,10);
      var fieldWidth = field.width * page_width;
      var numChars = u.description.length;
      var textSegmentLength = Math.floor((fieldWidth/textDimensions.width) * numChars);

      var re = new RegExp('.{1,' + textSegmentLength + '}',"g");
      var textSegments = u.description.match(re);

      if(!textSegments) textSegments = [' '];

      textSegments.forEach((segment, j) => {
        cursor++;
        ctx.writeText(
          segment.replace(/^\s+|\s+$/g, ''),
          page_width * field.x_start + 3,
          page_height - (page_height * field.y_start) - 14 - ( (cursor) * 14),
          {
            font: font,
            size: fontSize,
            colorspace: 'gray',
            color: 0x00
          }
        );
      });
      cursor++;
      cursor++;

      // mf.render += u.name + "\n" + u.description + "\n \n";
    });

  }

  printAmenity(f, field, font, boldFont, checkedFont, uncheckedFont, page_width, page_height, ctx, fontSize){


    if(!f.render) return false;
    var cursor = 0;

    // Write Title
    ctx.writeText(
      f.name,
      page_width * field.x_start + 3,
      page_height - (page_height * field.y_start) - 14 - ( cursor  * 14),
      {
        font: boldFont,
        size: fontSize,
        colorspace: 'gray',
        color: 0x00
      }
    );
    cursor++;
    cursor++;
    f.render.forEach(r => {

      if(r.type == 'checkbox'){
        ctx.writeText(
          r.status ?'':'',
          page_width * field.x_start + 3,
          page_height - (page_height * field.y_start) - 14 - ( cursor * 14),
          {
            font: r.status? checkedFont : uncheckedFont,
            size: fontSize,
            colorspace: 'gray',
            color: 0x00
          }
        );

        //write text
        ctx.writeText(
          r.name.replace(/^\s+|\s+$/g, ''),
          page_width * field.x_start + 18,
          page_height - (page_height * field.y_start) - 14 - ( cursor * 14),
          {
            font: font,
            size: fontSize,
            colorspace: 'gray',
            color: 0x00
          }
        );
      } else if (r.type == 'text' && r.status){
        var textToPrint = r.name.replace(/^\s+|\s+$/g, '') + ": " +  r.value.replace(/^\s+|\s+$/g, '')
        textToPrint.split("\n").map((t, i) => {
          var textDimensions = font.calculateTextDimensions(t,10);
          var fieldWidth = field.width * page_width;
          var numChars = t.length;
          var textSegmentLength = Math.floor((fieldWidth/textDimensions.width) * numChars);

          var re = new RegExp('.{1,' + textSegmentLength + '}',"g");
          var textSegments = t.match(re);

          if(!textSegments) textSegments = [' '];

          textSegments.forEach((segment, j) => {
            ctx.writeText(
              segment.replace(/^\s+|\s+$/g, ''),
              page_width * field.x_start + 3,
              page_height - (page_height * field.y_start) - 14 - ( (cursor) * 14),
              {
                font: font,
                size: fontSize,
                colorspace: 'gray',
                color: 0x00
              }
            );
            cursor++;
          })

        });


      }
      cursor++;
    });

  }

  update(body){

    this.name = body.name;
    this.description = body.description;
    this.document_type_id = body.document_type_id;
    this.public = body.public || 0

    return Promise.resolve();
  }

  verifyAccess(company_id){

    if(this.company_id !== company_id) e.th(403, "Not authorized");
    return Promise.resolve();

  }

	async generateMergeDocuments(connection, data){

		let {company_id, property_id, document_type, date, generate_doc, dry_run } = data;

    let upload_result = [];
    let file = null;
    let filename = '';

		try {

      let property = new Property({id: property_id});
      await property.find(connection);
        
      let company = new Company({id: company_id});
      await company.find(connection);

      if(!property.gds_id){
        try{
          property.gds_id = await this.getGDSPropertyMappingId(connection, property.id);
        } catch(err){
          console.log("Could Not Find GDS ID", err);
        }
      }

      if(document_type === ENUMS.MERGE_DOCUMENT_TYPES.RENT_MANAGEMENT) {

        upload_result = await models.PropertyRentChange.fetchRentChangeDocumentsByCreationDate(connection, property_id, date);
        filename = upload_result?.length && `rent_change_documents_${property.name.toLowerCase().replace(' ', '_')}_${date}`

      } else if(document_type === ENUMS.MERGE_DOCUMENT_TYPES.DELINQUENCY) {

        filename =  "delinquency_documents_" + property.name.toLowerCase().replace(' ', '_');
        let combineDocument = await models.Upload.findByName(connection, filename, date) || [];

  			if(combineDocument.length === 0) {
          upload_result = await models.Delinquency.getDelinquentDocumentsByPropertyId(connection, property_id, date);
        }

      } else {
        e.th(500, "Missing document_type");
      }

      if(generate_doc && upload_result && upload_result.length > 0){
        file = await this.MergeDocuments(connection, { documents: upload_result, company, filename, property, dry_run, date });
      }

		} catch (err) {
			console.log("error while merging document => ", err);
		}

    return {
      file: file,
      data: upload_result
    }
	}

  async MergeDocuments(connection, data){

    let {documents, company, property, date, filename, dry_run} = data;

    let uploads = [];
    let Upload = require('./upload.js');

		if(documents.length){
      for(let i=0; i< documents.length;i++) {
        uploads.push(new Upload( { ...documents[i] } ));
      }

			let combined_file = await Upload.combineToFileBuffer(uploads, filename);

			let upload = new Upload({
				name: filename,
				filename: combined_file.file_name,
				fileloc: combined_file.file_loc,
				mimetype: 'application/pdf',
				file: combined_file.file_data.toString('base64'),
        upload_date: date && moment(date).format('YYYY-MM-DD HH:mm:ss')
			});

      if(!dry_run) {
        await upload.setDocumentType(connection, null, 'file', property.company_id);
        await upload.save(connection);
        let file_data = await upload.sendFiletoS3(property, company, uploads);
      }

      return upload;
		}

		return;
	}

  async getGDSPropertyMappingId (connection, property_id) {

    try {
      const property = new Property({ id: property_id});
      await property.find(connection);
      if(property && property.gds_id){
        return property.gds_id;
      }
    } catch (err) {
      console.log(err);
      console.log("Property doesn't exist.");
    }

    let headers = {
      "x-storageapi-key": process.env.GDS_API_KEY,
      "x-storageapi-date": moment().format('x'),
      "Content-Type": "application/json"
    };

    var requestOptions = {
      uri: `${settings.get_gds_url()}pmses/translate`,
      headers,
      json: true,
      method: 'post',
      body: [
        {
          "facility": Hashes.encode(property_id),
          "pmstype": "leasecaptain",
        }
      ]
    };

    var response = await rp(requestOptions);
    return response?.data?.[0]?.facility?.gdsid || null
  }

}

module.exports = Document;

var Property = require('./property.js');
var Unit = require('./unit.js');
var Upload = require('./upload.js');
var Signer = require('./signer.js');
var Company = require('./company.js');
var RateChange = require('./rate_change.js');

