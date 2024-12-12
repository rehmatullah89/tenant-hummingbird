var express     = require('express');
var router      = express.Router();
var models      = require(__dirname + '/../models');
var validator   = require('validator');
var moment      = require('moment');
var Hash        = require(__dirname + '/../modules/hashes.js');
var Hashes      = Hash.init();
var utils       = require(__dirname + '/../modules/utils.js');
var control     = require(__dirname + '/../modules/site_control.js');
var Enums  = require(__dirname + '/../modules/enums.js');
var eventEmitter = require(__dirname + '/../events/index.js');
var Company    = require(__dirname + '/../classes/company.js');

var Auctions  = require(__dirname + '/../classes/auctions.js');
var Note  = require(__dirname + '/../classes/note.js');
const {LeaseAuction, AuctionAsset, AuctionInfo, AuctionClient}  = require('../classes/lease_auction');
const Upload = require('../classes/upload');
var Lease = require(__dirname + '/../classes/lease.js');
var Contact = require(__dirname + '/../classes/contact.js');
var Payment = require(__dirname + '/../classes/payment.js');
var Todo = require(__dirname + '/../classes/todo.js');
var Property = require(__dirname + '/../classes/property.js');
var Invoice = require(__dirname + '/../classes/invoice.js');
let Interaction = require(__dirname + '/../classes/interaction.js');
var e = require(__dirname + '/../modules/error_handler.js');
const joiValidator = require('express-joi-validation')({
  passError: true
});

const getQueue = require("../modules/queue");
const Queue = getQueue('hummingbirdQueue');

module.exports = function(app) {


  router.get('/', [control.hasAccess(['admin']), Hash.unHash], async(req, res, next) => {
    try{
      var connection = res.locals.connection;
      var company = res.locals.active;

      let auctions =  await Auctions.findAll(connection, company.id);

      utils.send_response(res, {
        status: 200,
        data: {
          auctions: Hash.obscure(auctions[0], req),
        }
      });

    } catch(err) {
      next(err);
    }
  });

  router.get('/:auction_id', [control.hasAccess(['admin']), Hash.unHash], async(req, res, next) => {

    try{
      var connection = res.locals.connection;
      let params = req.params;
      var company = res.locals.active;

      let auctions = new Auctions({id : params.auction_id, company_id : company.id});
      let result =  await auctions.findById(connection);
      utils.send_response(res, {
        status: 200,
        data: {
          auctions: Hash.obscure(result, req),
        }
      });

    } catch(err) {
      next(err);
    }
  });

  router.put('/', [control.hasAccess(['admin']), Hash.unHash], async(req, res, next) => {

    try {
      var connection = res.locals.connection;
      var company = res.locals.active;

      var body = req.body;

      body.company_id = company.id;
      let  auction = new Auctions(body);
      await auction.update(connection);

      utils.send_response(res, {
        status: 200,
        data: {
          auction: Hashes.encode(auction.id, res.locals.company_id)
        }
      });
    } catch(err){
      next(err);
    }

  });

  router.post('/', [control.hasAccess(['admin']), Hash.unHash], async(req, res, next) => {


    try {
      var connection = res.locals.connection;
      let company = new Company(res.locals.active);
      let body = req.body;
      body.company_id = company.id;
      let  auctions = new Auctions(body);
      await auctions.save(connection);

      utils.send_response(res, {
        status: 200,
        data: {
          auctions_id: Hashes.encode(auctions.id, res.locals.company_id)
        }
      });

    } catch(err){
      next(err);
    }

  });

  //Auction Manager Upload, View, Publish, Cancel routes

  router.post('/leases/:lease_id/upload', [control.hasAccess(['admin', 'api']), Hash.unHash], async (req, res, next) => {
    let company = res.locals.active;
    let contact = res.locals.contact;
    let api = res.locals.api;
    try {
      let params = req.params;
      let body = req.body;
      let files = req.files;
      let connection = res.locals.connection;

      let lease = new Lease({id: params.lease_id});
      await lease.find(connection);
      await lease.canAccess(connection, company.id, res.locals.properties);

      let fileList = [];
      if (Array.isArray(files.file)) {
        fileList = files.file;
      } else {
        fileList.push(files.file);
      }

      let categories = '';
      if (body.categories && body.categories.trim() !== '') {
        categories = JSON.stringify(body.categories.split(',').map(item => item.trim()));
      }

      let savedUploads = [];
      for (let i = 0; i < fileList.length; i++) {
        let file = fileList[i];
        let upload = new Upload();
        await upload.setDocumentType(connection, body.document_type_id, body.document_type[i] || 'file', company.id);
        upload.setFile(file, body.src);
        upload.description = body.caption[i];
        upload.uploaded_by = contact ? contact.id : null;
        upload.status = 1;
        await upload.save(connection);
        await upload.find(connection);
        await upload.saveAuctionAssets(connection, lease.id, categories, body.description);
        let auctionAsset = new AuctionAsset(upload, categories, body.description);
        savedUploads.push(auctionAsset);
      }
      utils.send_response(res, {
        status: 200,
        data: {
          uploads: Hash.obscure(savedUploads, req)
        }
      });
    } catch (error) {
      next(error);
    }
  });

  router.get('/leases/:lease_id/uploads', [control.hasAccess(['admin', 'api', 'tenant']), Hash.unHash], async (req, res, next) => {
    let connection = res.locals.connection;
    try {
      let params = req.params;
      let company = res.locals.active;
      let lease = new Lease({id: params.lease_id});

      await lease.find(connection);
      if (!lease.status) e.th(404, "Lease not found");
      await lease.canAccess(connection, company.id, res.locals.properties);
      await lease.getAuctionAssets(connection);

      let storedUploads = lease.AuctionAssets;
      utils.send_response(res, {
        status: 200,
        data: {
          uploads: Hash.obscure(storedUploads, req)
        }
      })
    } catch (err) {
      next(err);
    }
  });

  router.post('/lease-auction/:auction_id/publish', [control.hasAccess(['admin']), Hash.unHash], async(req, res, next) => {
    try {
      let connection = res.locals.connection;
      let contact = res.locals.contact;
      let company_id = res.locals.company_id;
      let params = req.params;
      let body = req.body;

      let leaseAuction = new LeaseAuction({id: params.auction_id});
      await leaseAuction.findById(connection);

      let lease = new Lease({id: leaseAuction.lease_id});
      await lease.find(connection);
      await lease.findUnit(connection);
      await lease.getCurrentBalance(connection);
      await lease.getAuctionAssets(connection);
      await lease.getTenants(connection);
      await lease.getAuctionAssets(connection);

      let categories = lease.AuctionAssets[0].categories;
      let unit = lease.Unit;
      let tenantContact = lease.Tenants[0].Contact;
      let address = tenantContact.Addresses[0].Address;
      let contactId = Hashes.encode(tenantContact.id, company_id);
      let propertyId = Hashes.encode(lease.Property.id, company_id);

      let startDateTime = body.startDateTime;
      let endDateTime = body.endDateTime;
      let contents = body.contents;
      let notes = body.notes;
      let vendor = body.vendor;

      let uploadInfo = body.uploads.map(upload => {
        let asset = lease.AuctionAssets.find(asset => asset.id === upload.id);
        if (asset) {
          return {
            id: asset.id,
            src: asset.src
          };
        }
        return null;
      }).filter(Boolean);

      let imageUrls = uploadInfo.map(upload => upload.src);
      let uploadIds = uploadInfo.map(upload => upload.id);

      let auctionInfo = new AuctionInfo();
      let publishPayload = auctionInfo.createPublishPayload(propertyId, unit, tenantContact, address, contactId,
        startDateTime, endDateTime, leaseAuction.auction_type, lease.balance, imageUrls, contents, categories, notes, vendor);

      let auctionListPayload = {
        "auctions": [publishPayload]
      };

      let auction = new AuctionClient(connection.meta);
      let result = await auction.publish(auctionListPayload, Hashes.encode(company_id), Hashes.encode(params.auction_id, company_id));
      console.log(JSON.stringify(result));

      if(result.status == 200){
        let upload = new Upload();
        let publishedBy = contact ? contact.id : null;
        await upload.updateAuctionAssets(connection, uploadIds, params.auction_id, auctionInfo.action, publishedBy);
      }
      utils.send_response(res, {
        status: result.status, ...result
      });
    } catch(err){
      next(err);
    }

  });

  router.put('/lease-auction/:auction_id/cancel', [control.hasAccess(['admin']), Hash.unHash], async(req, res, next) => {
    try {
      let connection = res.locals.connection;
      let contact = res.locals.contact;
      let company_id = res.locals.company_id;
      let params = req.params;
      let body = req.body;

      let leaseAuction = new LeaseAuction({id: params.auction_id});
      await leaseAuction.findById(connection);

      let lease = new Lease({id: leaseAuction.lease_id});
      await lease.find(connection);
      await lease.findUnit(connection);
      await lease.getAuctionAssets(connection);

      let unit = lease.Unit;
      let reason = body.reason;
      let description = body.description;
      let uploadIds = lease.AuctionAssets?.filter(asset => asset.is_published === 1)?.map(asset => asset.id) || [];
      let vendor = body.vendor;
      let auctionInfo = new AuctionInfo();
      let cancelPayload = auctionInfo.createCancelPayload(Hash.obscure(unit, req), reason, description, vendor);

      let cancelAuctionListPayload = {
        "cancelAuctions": [cancelPayload]
      };

      let auction = new AuctionClient(connection.meta);
      let result = await auction.cancel(cancelAuctionListPayload, Hashes.encode(company_id), Hashes.encode(params.auction_id, company_id));
      console.log(JSON.stringify(result));

      if(result.status == 200){
        let upload = new Upload();
        let cancelledBy = contact ? contact.id : null;
        await upload.updateAuctionAssets(connection, uploadIds, params.auction_id, auctionInfo.action, cancelledBy);
      }
      utils.send_response(res, {
        status: result.status, ...result
      });
    } catch(err){
      next(err);
    }

  });

  //Lease Auction routes

  router.post('/lease-auction', [control.hasAccess(['admin']), Hash.unHash], async(req, res, next) => {

    
    try {
      var connection = res.locals.connection;
      let company = new Company(res.locals.active);
      let user = res.locals.contact || {};
      let body = req.body;
      body.created_by = user.id;
      let auction_status = Enums.LEASE_AUCTION_STATUS.SCHEDULED;
      let lease = new Lease({id: body.lease_id});
      await lease.find(connection);
      await lease.getProperty(connection);

      await connection.beginTransactionAsync();

      if(body.notes){
        let note = new Note({});
        let data = {
            content: body.notes,
            pinned: 0,
            contact_id: body.contact_id,
            last_modified_by: user.id
        }
        await note.update(data);
        await note.save(connection);
      }

      if(body.deleted){

        let  lease_auction = new LeaseAuction({id : body.lease_auction_id});
        await lease_auction.findById(connection);
        await Todo.dismissTasks(connection, lease.id, Enums.EVENT_TYPES_COLLECTION.AUCTION, Enums.TASK_TYPE.LEASE, user.id);
        await lease_auction.update(connection, {deleted_at: moment().format('YYYY-MM-DD HH:mm:ss')});
        eventEmitter.emit('auction', {company, user, lease, "event_type": Enums.EVENT_TYPES.AUCTION.CUT_LOCK_SCHEDULE_AUCTION, cid: res.locals.company_id, locals: res.locals});

      }

      let  lease_auction = new LeaseAuction({...body, contact_id: null});


      await lease_auction.save(connection);
      let property_date = await lease_auction.addUtcOffSetInDate(connection, lease.Property.id);
      if(property_date === moment(body.scheduled_date).format('YYYY-MM-DD')){
        auction_status = Enums.LEASE_AUCTION_STATUS.AUCTION_DAY;
        await Todo.dismissTasks(connection, lease.id, Enums.EVENT_TYPES_COLLECTION.AUCTION, Enums.TASK_TYPE.LEASE, user.id);
        eventEmitter.emit('auction', {company, user, lease, "event_type": Enums.EVENT_TYPES.AUCTION.AUCTION_DAY, cid: res.locals.company_id, locals: res.locals});
      }
      await lease.updateAuctionStatus(connection, auction_status);

      await connection.commitAsync();

      utils.send_response(res, {
        status: 200,
        data: {
          auction_id: Hashes.encode(lease_auction.id, res.locals.company_id)
        }
      });

    } catch(err){
      await connection.rollbackAsync();
      next(err);
    }

  });

  router.get('/lease-auction/:auction_id', [control.hasAccess(['admin']), Hash.unHash], async(req, res, next) => {

    var connection = res.locals.connection;
    try{
      let params = req.params;
      let company = new Company(res.locals.active);

      let lease_auction = new LeaseAuction({id : params.auction_id});
      await lease_auction.findById(connection, company.id);

      utils.send_response(res, {
        status: 200,
        data: {
          lease_auction: Hash.obscure(lease_auction, req),
        }
      });



    } catch(err) {
      next(err);
    }


  });

  router.put('/lease-auction/:auction_id', [control.hasAccess(['admin']), Hash.unHash], async(req, res, next) => {

    var connection = res.locals.connection;
    try {
      let company = new Company(res.locals.active);
      var body = req.body;
      var params = req.params;
      let user = res.locals.contact || {};
      let api = res.locals.api || {};

      if(body.notes){
        let note = new Note({});
          let data = {
              content: body.notes,
              pinned: 0,
              contact_id: body.contact_id,
              last_modified_by: user.id
          }
          await note.update(data);
          await note.save(connection);
      }

      await connection.beginTransactionAsync();
      let  lease_auction = new LeaseAuction({id : params.auction_id});
      await lease_auction.findById(connection);

      body.contact_id = null;
      lease_auction.assembleLeaseAuction({...body});
      body.modified_at = moment().format('YYYY-MM-DD HH:mm:ss');

      let lease = new Lease({id: body.lease_id});
      await lease.find(connection);
      await lease.getTenants(connection);
      await lease.getProperty(connection);

      const leaseContact = lease.Tenants?.find(t => t.primary == 1);
      // await lease_auction.addUtcOffSetInDate(connection, body.scheduled_date, lease.Property.id);
      let property_date = await lease_auction.addUtcOffSetInDate(connection, lease.Property.id);
      if(property_date === moment(body.scheduled_date).format('YYYY-MM-DD') && lease.auction_status !== Enums.LEASE_AUCTION_STATUS.AUCTION_DAY && !body.Contact){
        auction_status = Enums.LEASE_AUCTION_STATUS.AUCTION_DAY;
        await Todo.dismissTasks(connection, lease.id, Enums.EVENT_TYPES_COLLECTION.AUCTION, Enums.TASK_TYPE.LEASE, user.id);
        await lease.updateAuctionStatus(connection, auction_status);
        eventEmitter.emit('auction', {company, user, lease, "event_type": Enums.EVENT_TYPES.AUCTION.AUCTION_DAY, cid: res.locals.company_id, locals: res.locals});
      }

      if(body.Contact && body.Contact.first && body.Contact.last){
        let contact = new Contact({id: body.Contact.id || null});
        contact.company_id = company.id;
        await contact.update(connection, body.Contact);
        await contact.save(connection);
        body.contact_id = contact.id;
      }
      //create payment task if payment object is not in body
      if(body.payment){
        contact = new Contact({id: body.contact_id});
        await contact.find(connection);

        paymentMethod = await contact.getPaymentMethod(connection, lease.Property, body.payment.payment_method_id, body.payment.type, body.payment.source, body.paymentMethod );

        payment = new Payment();
        body.payment.date = body.start_date;
        body.payment.property_id = lease.Property.id;
        body.payment.contact_id = body.contact_id;
        await payment.create(connection, body.payment, paymentMethod, null, user ? user.id : null);
        body.payment_id = payment.id;

        await payment.getPaymentApplications(connection);
        await lease.getPastDueInvoices(connection, moment(property_date).add(1, 'day').format('YYYY-MM-DD'));

        let pastDueInvoices = lease.PastDue;
        body.lien_amount = pastDueInvoices.reduce((a, p) => a + p.balance, 0);

        let auctionInvoice = await lease_auction.generateAuctionInvoice(connection, company.id, lease.Property.id, body.contact_id, user.id, api.id);
        await auctionInvoice.save(connection);
        body.bid_invoice_id = auctionInvoice.id;

        //Create credit payment and apply to the lien invoices
        //Start
        let auction_invoice_line = auctionInvoice.InvoiceLines.find(x=>x.Product.slug === Enums.AUCTION_PRODUCTS.REMAINING_BID);
        var data = {
          amount: auction_invoice_line.subtotal, // remaining bid amount
          property_id: lease.Property.id,
          contact_id: contact.id, // bider contact_id
          lease_id: lease.id,
          sub_method: Enums.ADJUSTMENT_SUB_METHOD.AUCTION,
          notes: "Winning Bid credit adjustment",
        }
        auctionInvoice.amount = data.amount;
        let creditPayment = new Payment();
        await creditPayment.createAdjustment(connection, data, user.id);
        await creditPayment.getPaymentApplications(connection);
        await creditPayment.applyToInvoices(connection, [auctionInvoice], {
          applied_line: {
            invoice_line_id: auction_invoice_line.id,
            type: 'line'
          },
          admin_id: user.id
        });

        pastDueInvoices.unshift(auctionInvoice); // add auction invoice again for remaining balance payment
        let payment_remaining = payment.payment_remaining;

        for(let i = 0; i < pastDueInvoices.length; i++){
          if(pastDueInvoices[i].balance <= payment_remaining){
            pastDueInvoices[i].amount = pastDueInvoices[i].balance;
            payment_remaining -= pastDueInvoices[i].balance;
            payment_remaining= Math.round(payment_remaining * 1e2) / 1e2
          } else {
            pastDueInvoices[i].amount = payment_remaining;
            payment_remaining = 0;
          }

          if(!payment_remaining) break;
        }

        //handling excess payment 
        if(payment_remaining > 0) {
          let retainedRevenueInvoice = await lease_auction.generateRetainedRevenueInvoice(connection, company.id, lease.Property.id, leaseContact.contact_id, user.id, api.id,payment_remaining);
          await retainedRevenueInvoice.save(connection);
          retainedRevenueInvoice.amount = payment_remaining;
          pastDueInvoices.push(retainedRevenueInvoice);
        }

        await payment.applyToInvoices(connection, pastDueInvoices, { ignore_contact_id: true, admin_id: user.id });
        await payment.charge(connection, company.id, false, user);
        
        await Todo.dismissTasks(connection, lease.id, Enums.EVENT_TYPES_COLLECTION.AUCTION, Enums.TASK_TYPE.LEASE, user.id);
        await lease.updateAuctionStatus(connection, Enums.LEASE_AUCTION_STATUS.MOVE_OUT);
        eventEmitter.emit('auction', {company, user, lease, "event_type": Enums.EVENT_TYPES.TENANT.MOVE_OUT, cid: res.locals.company_id, locals: res.locals});
        //End
      }

      if(!body.payment && (body.Contact && body.Contact.first && body.Contact.last) && lease.auction_status !== Enums.LEASE_AUCTION_STATUS.AUCTION_PAYMENT){
        auction_status = Enums.LEASE_AUCTION_STATUS.AUCTION_PAYMENT;
        await Todo.dismissTasks(connection, lease.id, Enums.EVENT_TYPES_COLLECTION.AUCTION, Enums.TASK_TYPE.LEASE, user.id);
        await lease.updateAuctionStatus(connection, auction_status);
        eventEmitter.emit('auction', {company, user, lease, "event_type": Enums.EVENT_TYPES.AUCTION.AUCTION_PAYMENT, cid: res.locals.company_id, locals: res.locals});
      }

      await lease_auction.update(connection, body);
      await lease_auction.saveAuctionFees(connection,company.id);
      await connection.commitAsync();

      utils.send_response(res, {
        status: 200,
        data: {
          lease_auction_id: Hashes.encode(lease_auction.id, res.locals.company_id),
          payment_id: Hashes.encode(body.payment_id, res.locals.company_id),
        }
      });

    } catch(err){
      await connection.rollbackAsync();
      next(err);
    }


  });

  router.delete('/lease-auction/:auction_id', [control.hasAccess(['admin']), Hash.unHash], async(req, res, next) => {

    try {
      var connection = res.locals.connection;
      let company = new Company(res.locals.active);
      var params = req.params;
      let user = res.locals.contact || {};

      await connection.beginTransactionAsync();


      let  lease_auction = new LeaseAuction({id : params.auction_id});
      await lease_auction.findById(connection);

      let lease = new Lease({id: lease_auction.lease_id});
      await lease.find(connection);

      await lease.updateAuctionStatus(connection, Enums.LEASE_AUCTION_STATUS.SCHEDULE);
      await Todo.dismissTasks(connection, lease.id, Enums.EVENT_TYPES_COLLECTION.AUCTION, Enums.TASK_TYPE.LEASE, user.id);
      await lease_auction.update(connection, {deleted_at: moment().format('YYYY-MM-DD HH:mm:ss')});
      await connection.commitAsync();

      eventEmitter.emit('auction', {company, user, lease, "event_type": Enums.EVENT_TYPES.AUCTION.CUT_LOCK_SCHEDULE_AUCTION, cid: res.locals.company_id, locals: res.locals});

      utils.send_response(res, {
        status: 200,
      });

    } catch(err){
      await connection.rollbackAsync();
      next(err);
    }


  });

  router.post('/generate-auction-invoice', [control.hasAccess(['admin']), Hash.unHash], async(req, res, next) => {

    var connection = res.locals.connection;

    try {
      let company = new Company(res.locals.active);
      let user = res.locals.contact || {};
      let api = res.locals.api || {};
      let body = req.body;

      var params = {
        lease_id: body.lease_id,
        amount: body.amount,
        cleaning_deposit: body.cleaning_deposit,
        tax_exempt: body.tax_exempt,
        BuyerPremium: body.BuyerPremium
      };

      let lease_auction = new LeaseAuction(params);
      let invoice = await lease_auction.generateAuctionInvoice(connection, company.id, body.property_id, body.contact_id, user.id, api.id);

      utils.send_response(res, {
        status: 200,
        data: Hash.obscure({invoice}, req),
      });



    } catch(err){
      next(err);
    }

  });


  /* TODO - use minimum time between beginning a transaction and committing the transaction. Looks like there is a lot of call here while the db is locked. */
  router.post('/lease-auction/:auction_id/refund', [control.hasAccess(['admin']), Hash.unHash], async(req, res, next) => {


    try {
      var connection = res.locals.connection;
      let company = new Company(res.locals.active);
      let user = res.locals.contact || {};
      let body = req.body;
      var params = req.params;

      let  lease_auction = new LeaseAuction({id : params.auction_id});
      await lease_auction.findById(connection);

      let lease = new Lease({id: lease_auction.lease_id});
      await lease.find(connection);
      await lease.getTenants(connection);
      await lease.getProperty(connection);

      let payment = new Payment({id: lease_auction.payment_id});
      await payment.find(connection);

      await connection.beginTransactionAsync();

      await payment.getPaymentApplications(connection);
      let invoicePayment;
      let invoice_payment_breakdown_id;
      if (payment.AppliedPayments && payment.AppliedPayments.length){
        invoicePayment = payment.AppliedPayments[0];
        let amount_to_unapply = body.amount || null
        let new_amount = 0
        if(amount_to_unapply && amount_to_unapply > 0) {
          new_amount = invoicePayment.amount - amount_to_unapply
        }
        
        let allocations = await payment.getCleaningDepositInvoiceLines(connection, invoicePayment.id)
        if(!allocations?.length) {
          e.th(400, "No allocation against cleaning deposit invoice line.");
        }

        invoice_payment_breakdown_id = await payment.unapply(connection, invoicePayment.id, new_amount, {
          applied_line: {
            invoice_line_id: allocations[0].invoice_line_id,
            type: 'line'
          }
        });
      }

      await payment.canReverse(connection,{by_pass:true});
      await payment.refund(connection, company, body.amount, body.ref_num,  "cleaning deposit refund", null, [invoice_payment_breakdown_id]);
      lease_auction.refund_id = payment.Refund.id;
      await lease_auction.update(connection, lease_auction);

      let invoice = new Invoice({id: invoicePayment.invoice_id});
      await invoice.find(connection);
      invoice.amount = body.amount;

      var data = {
        amount: body.amount,
        property_id: lease.Property.id,
        contact_id: lease_auction.contact_id,
        lease_id: lease.id,
        sub_method: Enums.ADJUSTMENT_SUB_METHOD.CLEANING_DEPOSIT,
        notes: "Cleaning deposit refund adjustment",
        
      }
      let creditPayment = new Payment();
      await creditPayment.createAdjustment(connection, data, user.id);
      await creditPayment.getPaymentApplications(connection);
      await creditPayment.applyToInvoices(connection, [invoice]);

      await connection.commitAsync();

      utils.send_response(res, {
        status: 200,
        data: {
          lease_auction_id: Hashes.encode(lease_auction.id, res.locals.company_id)
        }
      });

    } catch(err){
      await connection.rollbackAsync();
      next(err);
    }

  });

  return router;

};
