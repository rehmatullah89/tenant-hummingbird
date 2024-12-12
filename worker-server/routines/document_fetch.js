var moment      = require('moment');
var Promise = require('bluebird');
var e  = require(__dirname + '/../modules/error_handler.js');
var rp = require('request-promise');
var request = require('request');
var fs = require('fs');

var Upload      = require(__dirname + '/../classes/upload.js');

var DocumentFetcher = {
	fetch(data, connection){


		var upload = new Upload({id: data.id});
		let dest = '';
		return upload.find(connection).then(() => {
			return new Promise((reject,resolve) => {
				if(!upload.src) return reject;
				if(data.is_prod){
					dest = 'https://api.leasecaptain.com/v1/uploads/receive';
				} else {
					dest = 'https://api.leasecaptain.xyz/v1/uploads/receive';
				}
				const getReq = request.get(upload.src);
				const formData = {
					upload_id: upload.id,
					file: {
						value: getReq,
						options: {
							filename: upload.src.split('/')[upload.src.length - 1]
						}
					}
				};
				const sendReq =  request.post({url: dest, formData: formData})
				sendReq.on('response', (response) => {
					if (response.statusCode !== 200) {
						return reject('Response status was ' + response.statusCode);
					}
				});
				sendReq.on('end', () => {
					return resolve();
				});

				sendReq.on('error', (err) => {
					console.log(err);
					return reject();
				});
			});
		}).catch(err => {
			console.log(err);
			return;
		})

	}
}



module.exports = {
	fetch: function(data, connection){
		return DocumentFetcher.fetch(data, connection);
	}
};