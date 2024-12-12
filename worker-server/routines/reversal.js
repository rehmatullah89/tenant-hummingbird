const db = require('../modules/db_handler.js');
const Hash = require('../modules/hashes.js');

const ReversalRoutines = {
	process_reversal: async (data) => {
		const {
			cid,
			contact_id,
			refund_id,
			socket_details,
		} = data;
		const connection = await db.getConnectionByType('write', cid);
		const refund = new Refund({ id: refund_id });
		try {
			const leases = await Lease.getRefundDetails(connection, { refund_id });
			data.lease_id = leases[0].id;
			const shouldGenerateReversalDocument = !data.upload_id;
			data.reversal = { leases };
			if(shouldGenerateReversalDocument) {
				data.upload_id = await ReversalRoutines.generate_reversal_document(data);
				await refund.save(connection, { upload_id: data.upload_id });
			}
			if(data.upload_id) {
				const upload = new Upload({ id: data.upload_id });
				await upload.find(connection);
				data.upload = upload;
				await refund.sendReversalDocEmail(connection, data);
				await ReversalRoutines.sendNotification({
					cid,
					payload: {
						refund_id,
						upload_id: upload.id,
						upload_src: upload.src
					},
					socket_details,
				});
			}
		} catch (err) {
			console.log('Process Reversal Routine Error: ', err);
			await refund.saveRefundDelivery(connection, {
				refund_id,
				error: err.message,
				created_by: contact_id,
				modified_by: contact_id
			});
		} finally {
			await db.closeConnection(connection);
		}

	},

	async generate_reversal_document (data) {
		try {
			const { document: { upload_id } } = await DocumentManagerRoutines.generateDocument(data);
			return upload_id;
		} catch (err) {
				console.log('Generate Reversal Document Error: ', err);
				throw err;
		}
	},

	async sendNotification(data) {
    try {
      console.log("Send Notification data", data);
			if(!data || !data.socket_details) return;

      const { cid, payload, socket_details: { company_id, contact_id } } = data;
      const socket = new Socket({
        company_id,
        contact_id,
      });

      const connected = await socket.isConnected(contact_id);
      console.log("Checking socket connection..", connected);
      if (!connected) return;

      await socket.createEvent("reversal_process_update", Hash.obscure(payload, { params: { company_id: cid }}));
      return data;
    } catch (err) {
      console.log('Send Notification error: ', err);
      throw err;
    }
  },
};

module.exports = {
  process_reversal: async (data) => {
		return ReversalRoutines.process_reversal(data);
  },
};

const DocumentManagerRoutines = require('../routines/document_manager.js');
const Lease = require('../classes/lease');
const Refund = require('../classes/refund');
const Socket = require('../classes/sockets.js');
const Upload = require('../classes/upload');