var Promise = require('bluebird');
var fillTemplate = require('es6-dynamic-template');


module.exports = {

	activity: {},

	generate(activity){
		this.activity = activity;

		// console.log("Activity_id", activity.id);
		// console.log(activity.ActivityObject);
		// console.log(activity.ActivityAction);
		// console.log(activity.Object);

		var actor = '';
		if(activity.contact_id){
			actor =  this.actor.contact;
		} else if(activity.apikey_id && activity.Api){
			actor =  this.actor.api;
		} else {
			actor =  this.actor.system;
		}

		return Promise.resolve().then(() => {
			var activityObject = activity.ActivityObject.name.toLowerCase();
			var activityAction = activity.ActivityAction.name.toLowerCase();

			if(this.templates[activityObject] && typeof this.templates[activityObject][activityAction] == 'function'){
				return this.templates[activityObject][activityAction]();
			}

			if(typeof this.templates[activityObject] == 'function') {
				return this.templates[activityObject]();
			}

			return this.templates.generic(activity);

		}).then(output => {
			return {
				text: fillTemplate(actor + output.text, activity),
				link: fillTemplate(output.link, activity),
				can_undo: output.can_undo
			}
		});
	},

	actor:{
		contact: '${Contact.first} ${Contact.last} ',
		api: '${Api.description} ',
		system: 'System '
	},


	templates: {
		generic(){
			return {
				text: ' ${ActivityAction.name} ${ActivityObject.label}',
				link: null
			}
		},
		account: {
			accessed() {
				return {
					text: ' logged into their account',
					link: null
				}
			}
		},
		// password: {
		// 	created() { return '${Contact.first} ${Contact.last} created a password' },
		// 	updated() { return  '${Contact.first} ${Contact.last} changed their password' } ,
		// 	denied() { return  '' }
		// },
		// category: {
		// 	created() { return  '${Contact.first} ${Contact.last} created the category "${Object.name}"' },
		// 	updated() { return  '${Contact.first} ${Contact.last} edited the category "${Object.name}"' },
		// 	deleted() { return  '${Contact.first} ${Contact.last} deleted the category "${Object.name}"' }
		// },
		// lead_status: {
		// 	updated() { return  '${Contact.first} ${Contact.last} set the status for ${Object.first} ${Object.last} to <em>"${description}"</em>' },
		//
		// },
		promotion: {
			sorted() {
				return {
					text: ' sorted the promotions',
					link: null
				}
			},
		},
		// },
		// lead: {
		// 	created() { return  '${Contact.first} ${Contact.last} entered ${Object.first} ${Object.last} as a new lead' },
		// 	updated() { return  '${Contact.first} ${Contact.last} updated lead information for ${Object.first} ${Object.last} ' },
		// 	deleted() { return  '${Contact.first} ${Contact.last} archived the lead ${Object.first} ${Object.last}' },
		// },
		// apikey: {
		// 	created() { return  '${Contact.first} ${Contact.last} created a new api the key "${Object.key}"' },
		// 	deleted() { return  '${Contact.first} ${Contact.last} deleted the api key "${Object.key}"' },
		// },
		// settings: {
		// 	updated() { return  '${Contact.first} ${Contact.last} updated the ${description} settings' },
		// },
		// product: {
		// 	created() { return  '${Contact.first} ${Contact.last} created a new product called "${Object.name}"' },
		// 	updated() { return  '${Contact.first} ${Contact.last} edited the product "${Object.name}"' },
		// 	deleted() { return  '${Contact.first} ${Contact.last} deleted the product "${Object.name}"' },
		// },
		//
		// insurance: {
		// 	created() { return  '${Contact.first} ${Contact.last} added the insurance product "${Object.name}"' },
		// 	updated() { return  '${Contact.first} ${Contact.last} edited the insurance product "${Object.name}"' },
		// 	deleted() { return  '${Contact.first} ${Contact.last} deleted the insurance product "${Object.name}"' },
		// },
		//
		// property_template: {
		// 	created() { return  '${Contact.first} ${Contact.last} added a lease template to a property' },
		// 	deleted() { return  '${Contact.first} ${Contact.last} removed a lease template from "${Object.name}"' },
		// },
		//
		// property:{
		// 	created() { return  '${Contact.first} ${Contact.last} added a property at "${Object.Address.address}"' },
		// 	updated() { return  '${Contact.first} ${Contact.last} updated the property at "${Object.Address.address}"' },
		// 	deleted() { return  '${Contact.first} ${Contact.last} deleted a new property' }
		// },
		// property_price:{
		// 	created() { return  '' },
		// 	updated() { return '' },
		// 	deleted() { return '' },
		// },
		// property_connection:{
		//     created() { return  '' },
		//     updated() { return '' },
		//     deleted() { return '' }
		// },
		// property_hours:{
		// 	created() { return  '' },
		// 	updated() { return '' },
		// 	deleted() { return ''},
		// },
		// units:{
		// 	created() { return  '' },
		// 	updated() { return '' },
		// 	deleted() { return '' }
		// },
		// unit_amenities:{
		// 	created() { return  '' },
		// 	updated() { return '' },
		// 	deleted() { return '' },
		// },
		// lease:{
		// 	created() { return  '' },
		// 	updated() { return '' },
		// 	initiated() {  return '${Contact.first} ${Contact.last} initiated a lease' },
		// 	closed() {  return '${Contact.first} ${Contact.last} closed a lease' },
		// 	deleted() { return '' }
		// },
		// reservation:{
		// 	created() { return  '' },
		// 	updated() { return '' },
		// 	deleted() { return '' }
		// },
		// application:{
		// 	created() { return  '' },
		// 	updated() { return '' },
		// 	deleted() { return '' }
		// },
		// access_control:{
		// 	created() { console.log("THIS", this); this.templates.access_control.all() },
		// 	updated() {  this.templates.access_control.all() },
		// 	deleted() {  this.templates.access_control.all() },
		// 	all(){
		// 		return {
		// 			text: '${Contact.first} ${Contact.last} ${Action.name} ${Object.access.name } access control for ${Object.property.name }',
		// 			link: '/properties/${Object.property.id}/access'
		// 		}
		// 	}
		// },
		// phone_call_received:{
		// 	created() { return  '${Object.first} ${Object.last} called in' },
		// },
		// email_received: {
		// 	created() { return  '${Object.first} ${Object.last} send in an email' },
		// },
		// contact_form: {
		// 	created() { return  '${Object.first} ${Object.last} filled out a contact form' },
		// },
		// customer_walked_in:{
		// 	created() { return  '${Object.first} ${Object.last} walked in' },
		// },
		property_utility_bill:{
			created() {
				return {
					text: '${Contact.first} ${Contact.last} entered monthly utility bills',
					link: '',
				}
			},
			deleted() {
				return {
					text: '${Contact.first} ${Contact.last} deleted a monthly utility bill', // bill_id
					link: '',
				}
			}
		},
		// utility_bill:{
		// 	created() {
		//
		// 	}
		// },
		payment_application:{
			created() {
				return {
					text: ' applied a payment to an invoice',
					link: '',
				}
			},
			deleted() {
				return {
					text: ' unapplied a payment from an invoice',
					link: '',
				}
			},
		},
		// payment:{
		// 	created() { return  '${Contact.first} ${Contact.last} made a payment' },
		//
		// },
		// payment_method:{
		// 	created() { return  '' },
		// 	deleted() { return  '' },
		// },
		//
		checklist_item: {
			// created() { return  '' },
			updated() {
				return {
					text: ' marked a checklist item as ${description}',
					link: '',
				}
			}
			// deleted() { return  '' }
		},
		tenant:{
			created() {
				return {
					text: ' added a tenant to a lease',
					link: '',
				}
			}
		},
		// maintenance_request:{
		// 	created() { return  '' },
		// 	deleted() { return  '' }
		// },
		// access:{
		// 	created() { return  '' },
		// 	deleted() { return  '' }
		// },
		// contact:{
		// 	created() { return  '' },
		// 	deleted() { return  '' }
		// },
		// document_type:{
		// 	created() { return  '' },
		// 	deleted() { return  '' }
		// },
		document:{
			generated() {
				return {
					text: ' ${ActivityAction.name} a document for a lease',
					link: ''
				}
			},
		},
		// page_field:{
		// 	created() { return  '' },
		// 	deleted() { return  '' }
		// },
		// link_to_sign:{
		// 	created() { return  '' },
		// 	deleted() { return  '' }
		// },
		invoice:{
			deleted() {
				return {
					text: ' voided an invoice',
					link: ''
				}
			}
		},
		// statement_of_charges: {
		// 	created() { return  '' },
		// 	deleted() { return  '' }
		// },
		// maintenance_extras:{
		// 	created() { return  '' },
		// 	deleted() { return  '' }
		// },
		// maintenance_type:{
		// 	created() { return  '' },
		// 	deleted() { return  '' }
		// },
		// autopay_config:{
		// 	created() { return  '' },
		// 	deleted() { return  '' }
		// },
		// property_email:{
		// 	created() { return  '' },
		// 	deleted() { return  '' }
		// },
		// property_phone:{
		// 	created() { return  '' },
		// 	deleted() { return  '' }
		// },
		service:{

			deleted() {
				return {
					text: ' removed a service from a lease',
					link: ''
				}
			}
		},
		// welcome_email:{
		// 	created() { return  '' },
		// 	deleted() { return  '' }
		// },
		upload:{
			created() {
				return {
					text: ' uploaded a file',
					link: ''
				}
			},

		}

	}
}