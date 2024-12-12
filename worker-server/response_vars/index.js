'use strict';

module.exports = {
	// Address: require('./address.js'),
	// Activity: require('./activity.js'),
	// Admin: require('./admin.js'),
	// Amenity: require('./amenities.js'),
	// App: require('./app.js'),
	// Application: require('./application.js'),
	// Api: require('./api.js'),
	// Billing: require('./billing.js'),
	// Charge: require('./charges.js'),
	'/v1/contacts': require('./contact.js'),
	'/v1/categories': require('./category.js'),
	// Checklist: require('./checklists.js'),
	// Company: require('./company.js'), 
	// Cosigner: require('./cosigners.js'),
	// Discount: require('./discounts.js'),
	'/v1/documents': require('./documents.js'),
	// DocumentSign: require('./document_signs.js'),
	// Event: require('./event.js'),
	// Hours: require('./hours.js'),
	'/v1/insurance': require('./insurance.js'),
	'/v1/invoices': require('./invoices.js'),
	'/v1/leases': require('./lease.js'),
	// LeaseTemplate: require('./lease-templates.js'),
	// Maintenance: require('./maintenance.js'),
	// MaintenanceExtra: require('./maintenance-extras.js'),
	// MaintenanceType: require('./maintenance-types.js'),
	'/v1/leads': require('./leads.js'),
	// Notification: require('./notifications.js'),
	// Payment: require('./payments.js'),
	'/v1/products': require('./products.js'),
	'/v1/promotions': require('./promotions.js'),
	'/v1/properties': require('./property.js'),
	// Report: require('./reports.js'),
	'/v1/reservations': require('./reservations.js'), 
	// Setting: require('./settings.js'),
	// Service: require('./service.js'),
	// TaxLine: require('./tax-lines.js'),
	'/v1/tenants': require('./tenant.js'),
	// UnitCategory: require('./unitCategories.js'),
	'/v1/units': require('./unit.js'),
	// Upload: require('./upload.js'),
	 '/v1': require('./base.js'),
	// Vendor: require('./vendors.js')
};