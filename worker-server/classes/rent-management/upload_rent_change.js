
const PropertyRentManagementSettingsModel = require(__dirname + "/../../models/rent-management/property_rent_management_settings.js")
const CompanyRentManagementModel = require(__dirname + "/../../models/rent-management/company_rent_management.js")
const PropertyRentManagement = require("./property_rent_management.js");
const ManualRentChange = require(__dirname + "/../../classes/rent-management/manual_rent_change.js")
const LeaseRentChangeModel = require(__dirname + "/../../models/rent-management/lease_rent_change.js")
const ContactModel = require(__dirname + "/../../models/contact.js")
const Upload = require(__dirname + "/../../classes/upload.js")
const Lease = require('../lease.js');
var XLSX = require('xlsx-color');
const { v4: uuidv4 } = require('uuid');

var request = require("request-promise");
const moment = require('moment');
const Socket = require(__dirname + '/../../classes/sockets.js');
const CompanyModel = require(__dirname + '/../../models/company.js')
var Hash = require(__dirname + '/../../modules/hashes.js');
var Hashes = Hash.init();
var axios = require("axios");
var e = require(__dirname + '/../../modules/error_handler.js');




class UploadRentChanges {
	constructor(data) {
		this.company_id = data.company.id ?? null
		this.gds_owner_id = data.company.gds_owner_id ?? null
		this.document_id = data.document_id ?? null
		this.template = data.template ?? null
		this.column_structure = data.column_structure ?? {}
		this.socket_details = data.socket_details ?? {}
		this.failedLeases = []
		this.validLeases = []
		this.is_admin = data.is_admin || false;
		this.bypass_notification_period = data.bypass_notification_period ?? false;
		this.additionalColumns = [
			{
				key: 'status',
				label: "Status"
			},
			{
				key: 'reason',
				label: 'Reason'
			}
		];
		this.user_id = data.socket_details.contact_id ?? null;
		this.traceId = uuidv4()
	}
	
	/**
	 * Retrieves the download URL for a document from the file app
	 * @param {string} ownerId - The ID of the owner.
	 * @returns {string} The download URL of the document.
	 */
	async getDownloadUrlByDocId() {
		this.fileConfig = {}
		const FILE_APP_ID = process.env.GDS_FILE_APP_ID
		const GDS_FILE_APP_TOKEN_URI = process.env.GDS_FILE_APP_TOKEN_URI
		const URL = `${GDS_FILE_APP_TOKEN_URI}owners/${this.gds_owner_id}/files/${this.document_id}/`;

		try {
			let response = await request({
				headers: {
					'X-storageapi-key': process.env.GDS_API_KEY,
					'X-storageapi-date': moment().unix(),
				},
				uri: URL,
				method: 'GET',
				json: true
			});
			let file = response.applicationData[FILE_APP_ID][0].file
			this.fileConfig = {
				name: file.file_name,
				type: file.file_type,
				mimetype: file.content_type,
				download_url: file.download_url,
				size: file.file_size
			}
		} catch (error) {
			console.log("Could not fetch the document from the file app", error);
			throw error
		}
	}

	modifyAsteriskFields(jsonData, asterisk = true) {
		let editableFields = [
			'Property Id',
			'Lease Id',
			'Effective Date (MM/DD/YYYY)',
			'New Rent'
		]
		
		jsonData.forEach((data, index) => {
			jsonData[index] = Object.entries(data).reduce((acc, [key, value]) => {
				let newKey = key
				if (asterisk) {
					if (!key.includes('__EMPTY')) {

						if (key.includes("*")) {
							newKey = key.replace(/\*/g, '');
						}
						acc[newKey] = value;
					}
				} else {
					if (editableFields.includes(key)) {
						newKey = `${key}*`
					}
					acc[newKey] = value;
				}
				return acc;
			}, {});
		})
		return jsonData
	}

	/**
	 * Parses an Excel document from the given URL
	 * and returns the transformed JSON data.
	 * @param {string} document_url - The URL of the Excel document.
	 * @returns {Array} - The transformed data from the Excel document.
	 */
	async parseDocument() {
		try {
			let response = await axios.get(this.fileConfig.download_url, { responseType: 'arraybuffer' })
			const options = {
				cellDates: true,
				cellText: false,
			};
			const workbook = XLSX.read(response.data, options);
			const sheetPromises = workbook.SheetNames.map(sheetName => {
				return new Promise(resolve => {
					const sheet = workbook.Sheets[sheetName];
					const jsonData = XLSX.utils.sheet_to_json(sheet, { defval: "", raw: false, dateNF: 'mm/dd/yyyy' });
					if (!jsonData.length) e.th(500, `Cannot process given rent change data`);
					let modifiedData = this.modifyAsteriskFields(jsonData)
					resolve(modifiedData);
				});
			});
			const sheetData = await Promise.all(sheetPromises);
			return [].concat(...sheetData);
		} catch (error) { throw error }
	}

	/**
	 * Restructures the document data based on the column structure.
	 * @param {boolean} structured - Indicates if the data should be structured or not.
	 * @param {Array} structuredData - The structured data to be mapped.
	 * @returns {Array} - The transformed data based on the column structure.
	 */
	restructureDocumentData(structured = false, structuredData) {
		let isEffectiveDate = (key) => key === "rentchange_effective_date"
		this.column_structure.push(...this.additionalColumns)
		const mappedStructure = this.column_structure.reduce((obj, column) => {
			if (structured) {
				obj[column.key] = column.label;
			} else {
				if (column.key === 'lease_rent') column.label = null;
				if (isEffectiveDate(column.key)) column.label = `${column.label} (MM/DD/YYYY)`
				obj[column.label] = column.key;
			}
			return obj;
		}, {});
		
		/**
		 * Transforms the data based on the mapped structure.
		 * @param {Object} data - The data to be transformed.
		 * @returns {Object} - The transformed data.
		*/
		const transformData = (data) => {
			const obj = {};
			for (const key in data) {
				if (isEffectiveDate(key)) {
					let isStandardFormat = moment(data[key], 'MM/DD/YYYY', true).isValid();
					let givenFormat = isStandardFormat ? "MM-DD-YYYY" : "YYYY-MM-DD";
					let date = data[key];
					data[key] = date ? moment(date, givenFormat).format("MM/DD/YYYY") : "";
				}
				if (key == "Tagged" && isNaN(data[key])) {
					data[key] = data[key] == "Y" ? 1 : 0
				}
				if (key == "rentchange_tagged" && !isNaN(data[key])) {
					data[key] = data[key] == 1 ? "Y" : "N"
				}
				
				const value = data[key];
				const mappedKey = mappedStructure[key];
				if (mappedKey !== undefined) {
					obj[mappedKey] = value;
				} else {
					obj[key] = value;
				}
			}
			return obj;
		};
		
		if (!structured) {
			let tempData = this.sheet_data_og.map(transformData)
			let hashedData = [...Hash.makeHashes(tempData, this.company_id)];
			let clarifiedArray = Hash.clarify(hashedData) || []
			clarifiedArray.forEach((data, index) => {
				data['unique_id'] = this.sheet_data_og[index]['unique_id'] = uuidv4()
				
			})
			return clarifiedArray
		} else {
			let mappedData = structuredData.map(transformData);
			this.sheet_data_og = this.sheet_data_og.map(item => ({
				...item,
				...mappedData.find((data) => (data['unique_id'] === item['unique_id'])),
			}));
		}
	}


	/**
	 * Validates lease IDs for rent changes.
	 * @param {Connection} connection - The database connection.
	 * @param {Array} rentChanges - The array of rent changes.
	 */
	async validateLeaseIds(connection, rentChanges) {
		try {
			let groupLeaseByProperties = {}
			rentChanges.forEach((rc) => {
				if (rc.rentchange_property_id) {
					let property = rc.rentchange_property_id
					if (!groupLeaseByProperties[property]) groupLeaseByProperties[property] = []
					groupLeaseByProperties[property].push({ lease_id: rc.lease_id, unique_id: rc.unique_id })
				}
			})

			for (let property_id in groupLeaseByProperties) {
				let validLeases = []
				if (groupLeaseByProperties[property_id].length) {
					let leases = groupLeaseByProperties[property_id].map(e => e.lease_id)
					let invalidLeases = await PropertyRentManagementSettingsModel.getInvalidLeaseIdsByLeaseIds(connection, leases, property_id);
					let errorLeases = groupLeaseByProperties[property_id].filter(e => {
						let ids = invalidLeases.map(data => {
							if (data.lease_status) e.lease_status = data.lease_status
							return data.id
						})
						return ids.includes(e.lease_id)
					})
					if (errorLeases.length) {
						errorLeases.forEach((data) => {
							let reason = data.lease_status == "Moved out" ? `Lease has been ${data.lease_status}` : "Invalid lease ID"
							let obj = {
								rentchange_property_id: property_id,
								lease_id: data.lease_id,
								unique_id: data.unique_id,
								status: "error",
								rentchange_tagged: 0,
								rentchange_recent_note: "",
								error_type: 'lease_err',
								reason: this.addErrors([reason])
							}
							this.failedLeases.push(obj)
						})
					}
					validLeases = rentChanges.filter(rc => !invalidLeases.map(lease => lease.id).includes(rc.lease_id)
						&& rc.rentchange_property_id == property_id).map(rc => rc.lease_id)

					if (validLeases.length) {
						this.validLeases.push({
							property_id,
							lease_id: validLeases,
							status: "success"
						})
					}
				}
			}
		} catch (error) { throw error }
	}

	/**
	 * Sets the rent change payload structure for manual rent change.
	 * @param {Array} lease_ids - The array of lease IDs.
	 * @param {string} property_id - The ID of the property.
	 * @param {Array} sheetData - The sheet data containing rent change information.
	 * @returns {Array} - The rent change structure for the specified lease IDs and property ID.
	 */
	setRentChangeStructure(lease_ids, property_id, sheetData) {
		return sheetData.filter((rc) => (lease_ids.includes(rc.lease_id) && rc.rentchange_property_id == property_id))
			.map((rc) => ({
				lease_id: rc.lease_id,
				unique_id: rc.unique_id,
				property_id: rc.rentchange_property_id,
				change_value: rc.tenant_new_rent,
				change_type: "fixed",
				target_date: rc.rentchange_effective_date,
				affect_timeline: true,
				note: rc.rentchange_recent_note,
			}))
	}

	/**
	 * Apply styling to the rent changes report worksheet.
	 * @param {Object} workSheet - The worksheet object.
	 * @returns {void}
	 */
	applyStyle(workSheet, headers) {
		/* Columns that are to be checked and applied styles */
		let specificColumn = {
			status: '',
			tagged: ''
		}
		for (const cell in workSheet) {
			if (cell[0] === '!') continue; // Skip non-cell objects

			const column = cell.replace(/\d+/g, ''); // Get the column name
			const cellValue = workSheet[cell]?.v?.toString().toLowerCase();
			if (['status', 'tagged'].includes(cellValue)) {
				specificColumn[cellValue] = column
			}
		}

		/** Default height and width of the cells */
		const cellHeight = 15;
		const colors = {
			success: "E1FAE3",
			tagged: "FFF9DA",
			error: "F8E5E1"
		}

		const range = XLSX.utils.decode_range(workSheet['!ref']);
		workSheet['!cols'] = workSheet['!cols'] || [];
		for (let rowNum = range.s.r ; rowNum <= range.e.r; rowNum++) {
			const statusCellAddress = specificColumn.status + (rowNum + 1)
			const taggedCellAddress = specificColumn.tagged + (rowNum + 1)
			const statusCell = workSheet[statusCellAddress];
			const taggedCell = workSheet[taggedCellAddress];
			for (let colNum = range.s.c; colNum <= range.e.c; colNum++) {
				const rowCellAddress = XLSX.utils.encode_cell({ r: rowNum, c: colNum });
				if (workSheet[rowCellAddress]) {

					let rowCellStyle = workSheet[rowCellAddress]?.s || {};
					if (statusCell?.v === 'success') rowCellStyle.fill = { fgColor: { rgb: colors.success } }; // Green color for success rc row
					if (statusCell?.v === 'error') rowCellStyle.fill = { fgColor: { rgb: colors.error } }; // Red color for failed rc row
					if (taggedCell?.v == 'Y') rowCellStyle.fill = { fgColor: { rgb: colors.tagged } };  // Yellow color for tagged rc row
					let borderStyle = { style: 'thin', color: { rgb: 'D9D9D9' } }
					rowCellStyle.border = {
						top: { ...borderStyle },
						bottom: { ...borderStyle },
						left: { ...borderStyle },
						right: { ...borderStyle },
					};
					if (statusCell?.v === 'no changes')  rowCellStyle = {} // Unstyled for no changes rc row

					workSheet[rowCellAddress].s = rowCellStyle;
					let cellValue = workSheet[rowCellAddress]?.v?.toString()
					if (headers.includes(cellValue)) {
						let headerWidth = cellValue.length
						if (cellValue === "Notes" || cellValue === "Reason") headerWidth += 20
						else headerWidth += 5
						workSheet['!cols'][colNum] = { wch: headerWidth };

					}
				}
			}
			workSheet['!rows'] = workSheet['!rows'] || [];
			let customHeight = { hpt: cellHeight, hpx: cellHeight / 0.75, hidden: false, customHeight: true };
			workSheet['!rows'][0] = workSheet['!rows'][rowNum] = customHeight
		}

	}

	/**
	 * Generates an XLSX sheet based on the provided json data
	 * and applies styles conditionally
	 * Sends updates during the generation process and upon completion.
	 */
	async generateXLSXSheet() {
		this.send_update("generate");
		let modifiedSheetData = []
		try {
			this.filename = `uploaded_rent_change_report.xlsx`;
			this.mimeType = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
			this.fileContent = "";

			/** Remove unwanted fields from worksheet */
			const sheetData = this.sheet_data_og.map(({ ['error_type']: errorType, ['unique_id']: uniqueId, ...rest }) => rest);
			modifiedSheetData = this.modifyAsteriskFields(sheetData, false)

			/** Sort out worksheet data conditionally based on status and tagged */
			modifiedSheetData.sort((a, b) => {
				const statusOrder = {
					'error': -3,
					'success': -2,
					'no changes': 1,
				};
			
				const taggedOrder = {
					'Y': -1,
					'N': 1,
				};
			
				const statusComparison = statusOrder[a.Status] - statusOrder[b.Status];
				if (statusComparison !== 0) {
					return statusComparison;
				}
			
				if (a.Status === 'success') {
					const taggedComparison = taggedOrder[a['Tagged']] - taggedOrder[b['Tagged']];
					if (taggedComparison !== 0) {
						return taggedComparison;
					}
				}
			
				return 0;
			});

			/** Convert JSON data to sheet structure */
			const workSheet = XLSX.utils.json_to_sheet(modifiedSheetData);
			const workBook = XLSX.utils.book_new();
			XLSX.utils.book_append_sheet(workBook, workSheet, 'Sheet 1');

			/** Apply styles for the worksheet */
			let headers = Object.keys(modifiedSheetData[0])
			this.applyStyle(workSheet, headers)

			this.fileContent = XLSX.write(workBook, { type: 'buffer', bookType: 'xlsx' });
			this.pushRentChangeLogs(modifiedSheetData, "generate")
		} catch (error) {
            console.log("Error while generating rent change report", error)
			this.pushRentChangeLogs(modifiedSheetData, "generate", error)
			throw error
			
		}
	}

	/**
	 * Validates rent changes and performs manual rent changes.
	 * @param {Connection} connection - MySQL connection.
	 * @param {Array} rentChanges - The array of rent changes.
	 */
	async initiateRentChange(connection, rentChanges) {
		try {
			this.successRentChanges = []
		if (this.validLeases.length) {
			this.send_update("push");
			for (let rc of this.validLeases) {
				const manualRentChange = new ManualRentChange({
					property_id: rc.property_id,
					company_id: this.company_id,
					user_id: this.user_id,
					dynamo_company_id: this.socket_details.company_id,
					is_admin: this.is_admin,
					bypass_notification_period: this.bypass_notification_period
				})
				/* Set a structured payload for manual rent change */
				let rentChangePayload = this.setRentChangeStructure(rc.lease_id, rc.property_id, rentChanges)
				/* Prepare data to manual rent change, check rent change conditions and validations */
				await manualRentChange.checkConditions(
					connection,
					rentChangePayload,
					true
				)

				/** Proceed manual rent change*/
				await manualRentChange.bulkManualRentChange(connection).then(({success_lease_ids, failure_lease_ids}) => {

					if (success_lease_ids.length) {
						success_lease_ids.forEach((data) => {
							let successObj = {
								unique_id: data.unique_id,
								rentchange_property_id: data.property_id,
								lease_id: data.lease_id,
								rentchange_tagged: data.tagged,
								tenant_new_rent: data.new_rent,
								rentchange_effective_date: data.target_date,
								rentchange_status: data.rent_change_status,
								status: "success",
								reason: '',
								rentchange_recent_note: data.note
							}
							// successObj['rentchange_recent_note'] = data.error ?
							// 	"Rent change tagged due to the following reasons: \n" + this.addErrors(data.error)
							// 	: "The change has been made through XLSX upload"
							this.successRentChanges.push(successObj)
						})
					}
					
					if (failure_lease_ids.length) {
						failure_lease_ids.forEach((data) => {
							let errorObj = {
								unique_id: data.unique_id,
								rentchange_property_id: data.property_id,
								lease_id: data.lease_id,
								rentchange_tagged: data.tagged,
								tenant_new_rent: data.new_rent,
								rentchange_effective_date: data.target_date,
								status: "error",
								rentchange_recent_note: '',
								reason: this.addErrors(data.error)
							}
							this.failedLeases.push(errorObj)
						})
					}
				})
			}
		}
		/** Combine all failed and success rent changes */
		let mergeData = [...this.failedLeases, ...this.successRentChanges, ...this.unChangedData]
		// let hashedData = [...Hash.makeHashes(mergeData, this.company_id)];
		let hashedData = [...mergeData];

		/** Add missing property id and lease id using raw sheet data */
		hashedData.forEach((data, index) => {
			data['unique_id'] = mergeData[index]['unique_id']
			if (!data.rentchange_property_id) {
				let invalidPropertyIndex = this.sheet_data_og.findIndex(e => data?.unique_id == e?.unique_id)
				if (invalidPropertyIndex !== -1) {
					let invalidProperty = this.sheet_data_og[invalidPropertyIndex];
					data.rentchange_property_id = invalidProperty['Property Id']
				}
			}
			if (!data.lease_id) {
				let invalidPropertyIndex = this.sheet_data_og.findIndex(e => data?.unique_id == e?.unique_id)
				if (invalidPropertyIndex !== -1) {
					let invalidProperty = this.sheet_data_og[invalidPropertyIndex];
					data.lease_id = invalidProperty['Lease Id']
				}
			}
		})
		/** Restructure rent changes as JSON to sheet data */
		this.restructureDocumentData(true, hashedData)
		this.pushRentChangeLogs(mergeData, "initiate")
		} catch (error) {
			this.pushRentChangeLogs(rentChanges, "initiate", error)
			throw error
			
		}
	}

	addErrors(errors) {
		let count = errors.length > 1;
		return errors.map((err, idx) => {
			return count ? `${idx + 1}. ${err} ` : err
		}).join('\n')
	}

	async compareDataChanges(connection, rentChange) {
		let hasChange = true
        let lease = new Lease({ id: rentChange.lease_id });
        let leaseData = await lease.findUnitLeaseData(connection);
        let effectiveDate = ManualRentChange.calculateEffectiveDate(leaseData?.bill_day, rentChange.rentchange_effective_date);
		let propertySettings = await PropertyRentManagementSettingsModel.getConfiguration(connection, rentChange.rentchange_property_id);
		let roundType = propertySettings?.round_to || null;

		if (!roundType) {
			let companySettings = await CompanyRentManagementModel.getConfiguration(connection, this.company_id);
			roundType = companySettings?.round_to
		}
        let newRent = ManualRentChange.calculateRounding(roundType, rentChange.tenant_new_rent);
		let queryData = {
			property_id: rentChange.rentchange_property_id,
			lease_id: rentChange.lease_id,
			new_rent_amt: newRent,
			effective_date: `${moment(effectiveDate).format("YYYY-MM-DD")} 00:00:00`
		}
		let result = await LeaseRentChangeModel.compareDateChanges(connection, queryData)

		if (['approved', 'deployed'].includes(result?.status)) hasChange = false
		return hasChange
	}

	async filterDuplicateEntries(rentChanges) {
		let duplicateEntries = [];
		let combinations = {};
		let filteredData = [];
		
		rentChanges.forEach((data, index) => {
			const combinationKey = `${data.lease_id}-${data.rentchange_property_id}`;
			
			if (combinations[combinationKey]) {
				duplicateEntries.push(data);
			} else {
				combinations[combinationKey] = true;
				filteredData.push(data); // Move the unique entry to filteredData
			}
		});
	
		duplicateEntries.forEach(data => { // Move the duplicate entry to this.failedLeases
			this.failedLeases.push({
				unique_id: data.unique_id,
				rentchange_property_id: data.rentchange_property_id,
				lease_id: data.lease_id,
				tenant_new_rent: data.tenant_new_rent,
				rentchange_tagged: 0,
				rentchange_effective_date: data.rentchange_effective_date,
				status: "error",
				reason: "Duplicate Entry"
			});
		});
	
		return filteredData; // Return the array without duplicates
	}
	
	/**
	 * Cleans up the rent change data by removing invalid entries and generating error objects for failed leases.
	 * Invalid entries are identified based on criteria such as invalid lease ID, property ID, effective date format, and new rent value.
	 * @param {Array} rentChanges - The array of rent change data to be cleaned up.
	 * @returns {Array} The cleaned up rent change data array, excluding invalid entries.
	 */
	async cleanupData(connection, rentChanges) {
		let cleanedArray = []
		this.unChangedData = []
		let filteredData = await this.filterDuplicateEntries(rentChanges)
		for (let data of filteredData) {
			let errorList = []
			let obj = {
				unique_id: data.unique_id,
				rentchange_property_id: data.rentchange_property_id,
				lease_id: data.lease_id,
				tenant_new_rent: data.tenant_new_rent,
				rentchange_tagged: 0,
				rentchange_effective_date: data.rentchange_effective_date,
				status: "error",
			}
			if (!data["lease_id"]) errorList.push("Invalid lease ID")
			if (!data["rentchange_property_id"]) errorList.push("Invalid property ID")
			let isValidDate = moment(data['rentchange_effective_date'], 'MM/DD/YYYY', true).isValid()
			if (!isValidDate) errorList.push("Invalid effective date format")
			let newRent = parseFloat(data.tenant_new_rent)
			if (isNaN(newRent) || (newRent < 1)) errorList.push("Invalid new rent")

			obj["reason"] = this.addErrors(errorList)
			if (errorList.length) this.failedLeases.push(obj)
			else {
				let hasChange = await this.compareDataChanges(connection, data);
				if (hasChange) cleanedArray.push(data)
				else {
					obj['rentchange_tagged'] = data.rentchange_tagged
					obj['status'] = 'no changes'
					this.unChangedData.push(obj)
				}
			}
		}
		return cleanedArray
	}

	async triggerValidationAndRentUpdates(connection, rentChanges) {
		let stage = "validation"
		let logData = {
			document_id: this.document_id,
			rent_changes: rentChanges
		}
		let cleanedArray = []
		try {
			this.send_update("validate")
			if (this.socket_details.requesting_app_id) {
				let contact = await ContactModel.findContactByAppId(connection, this.socket_details.requesting_app_id)
				this.user_id = contact.id ?? null
			}

			cleanedArray = await this.cleanupData(connection, rentChanges)
			await this.validateLeaseIds(connection, cleanedArray)
			// return;
		} catch (error) {
			this.pushRentChangeLogs(logData, stage, error)
			throw error
		}
		await this.initiateRentChange(connection, cleanedArray).catch(err => { throw err })
		await this.generateXLSXSheet()
	}

	/**
	 * Sends an update through a socket connection with the specified state and payload.
	 * @param {string} state - The state of the update. It determines the type of update being sent.
	 * @param {Object} payload - The payload associated with the update.
	 */
	async send_update(state) {
		let payload = {}
		if (state === "success") {
			payload = {
				data: this.fileContent,
				content_type: this.mimeType,
				filename: this.filename
			}
		} else if (state === "error") {
			payload.message = "Couldn't process your document. An error occurred in your document"
		}
		let message = {
			process: {
				title: "Processing Document",
				text: "We are processing your document, it may take some time."
			},
			validate: {
				title: "Validating Rent Changes",
				text: "We are validating your document, it may take some time."
			},
			push: {
				title: "Processing Rent Changes",
				text: "We are processing your rent changes, it will be completed shortly."
			},
			generate: {
				title: "Generating Rent Changes Report",
				text: "We are generating your rent changes Report, it should begin downloading shortly."
			}

		}

		const socket = new Socket({
			company_id: this.socket_details.company_id,
			contact_id: this.socket_details.contact_id,
		});
		try {
			const connected = await socket.isConnected(this.socket_details.contact_id);
			if (!connected) return;

			await socket.createEvent("upload_rent_change_update", {
				state,
				message: message?.[state],
				payload
			});
		} catch (err) {
			console.log("Cant send socket event", err);
			return;
		}
	}


	async aggregateRentChanges() {
		let stage = "aggregation"
		this.send_update("process")
		try {
			await this.getDownloadUrlByDocId()
			this.sheet_data_og = await this.parseDocument()
			let document = this.restructureDocumentData()
			this.pushRentChangeLogs({
				document_id: this.document_id,
				rent_changes: document
			}, stage)
			return document
		} catch (err) {
			this.pushRentChangeLogs({
				document_id: this.document_id
			}, stage, err)
			console.error("Error while aggregating rent changes:", err);
			throw err;
		}
	}

	async saveDocumentAndHistory(connection, property_id, deployment_month = null) {
		try {
			let uploadData = {
				foreign_id: this.fileConfig.id,
				filename: this.fileConfig.name,
				uploaded_by: this.user_id || null,
				type: this.fileConfig.type,
				upload_date: moment.utc().format('YYYY-MM-DD HH:mm:ss'),
				extension: 'xlsx',
				mimetype: this.fileConfig.mimetype,
				size: this.fileConfig.size,
				name: this.fileConfig.name?.replace(/\.[^\/.]+$/, '') || null,
				src: this.fileConfig.download_url,
				contact_id: this.user_id || null
			}

			let upload = new Upload(uploadData)
			await upload.save(connection, { should_upload: false })
			if (!this.is_admin) {
				let historyData =  {
					deployment_month,
					property_id,
					action: "upload",
					upload_id: upload.id,
					created_by: this.user_id
				}
				await LeaseRentChangeModel.saveExportRentChangeHistory(connection, historyData)
			}
			  
		} catch (error) {
			e.th(500, `Couldn't save given rent change data - ${error}`);
			
		}
	}

	pushRentChangeLogs(data, stage, error = null) {
		PropertyRentManagement.sendRentManagementCronLogs({
			data: data,
			stage: stage,
			time: (new Date).toLocaleString(),
			trace_id: this.traceId
		}, error, 'UPLOAD_RENT_CHANGE');
	}
}

module.exports = UploadRentChanges