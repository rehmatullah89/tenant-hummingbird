"use strict";

var request = require('request-promise');
var e  = require(__dirname + '/../modules/error_handler.js');


class Socket {

	constructor(data = {}) {
        this.token = data.token;
        this.contact_id = data.contact_id;
        this.company_id = data.company_id;

        this.endpoint = process.env.WEBSOCKET_SERVER_APP_ENDPOINT;
        //this.endpoint = 'http://sockets:3004/v1/';
        this.Payload = {},
        this.connected = false;
	}

  async createEvent(event_type, payload){

      try{
        var result = await request({
          uri: this.endpoint + 'event',
          body: {
              type: event_type,
              contact_id: this.contact_id,
              company_id: this.company_id,
              payload
          },
          method: 'POST',
          json: true
      });
      } catch(err) {
          throw err;
      }

      return result
  }

    async isConnected(contact_id){

        try{
          var result = await request({

              uri: this.endpoint + 'is-connected/' + contact_id,
              body: {},
              method: 'GET',
              json: true
          });
        } catch(err) {
            throw err;
        }

        return  this.connected = result.status === 200;
    }

    async contactIsConnected(contact_id){

        try{
          var result = await request({

              uri: this.endpoint + 'is-connected/contact/' + contact_id,
              body: {},
              method: 'GET',
              json: true
          });
        } catch(err) {
            throw err;
        }

        return  this.connected = result.status === 200;
    }

    async connectedContacts () {
        try {
            var result = await request({
                uri: this.endpoint + 'connected-contacts',
                body: {},
                method: 'GET',
                json: true
            });
            return result.contacts;
        } catch(err) {
            throw err;
        }
    }
}


module.exports = Socket;
