// Auth Routes

export default {
  HASH: 'hash/',
  UNHASH: 'unhash/',
  ADMINS: 'admins/',
	COMPANIES: 'companies/',
	DATABASES: 'databases/',
	REDSHIFTS: 'redshift-databases/',
  JOBS: 'jobs/',
	LOGIN_URL: 'login/',
	RESET_PASSWORD: 'reset-password/',
	FORGOT_USERNAME: 'forgot-username/',
	SET_PASSWORD: 'set-password/',
	SWITCH_COMPANY: 'switch-company/',
	SET_PROPERTIES: 'companies/:company_id/set-properties/',
  PROPERTIES: 'properties/',
	REGISTER: 'register/',
  GET_LOGS: 'logs/',
  DELETE_LOGS: 'logs/',
  GENERATE_INVOICES: 'generate-invoices/',
  GENERATE_STATUS_DISCREPANCIES: 'generate-status-discrepancies/',
  GENERATE_AUTOPAYMENTS: 'generate-autopayments/',
  GENERATE_RECONCILE: 'generate-reconcile/',
  GENERATE_TRIGGERS: 'generate-triggers/',
  GET_TRIGGERS: 'triggers/',
  MIGRATE: 'migrate-companies/',
  RESUBSCRIBE: 'resubscribe-properties/',
  SUBSCRIBE: 'subscribe-message-bus/',
  //Added by BCT
  ADD_ONBOARDING_COMPANY:'onboarding-companies',
  STATUS_ONBOARDING_COMPANY:'onboarding-companies-status',
  ADD_ONBOARDING_PROPERTY:'onboarding-properties',
  ONBOARDING_EMAIL: 'onboarding-email',
  TECHNICAL_CONTACTS:'technical-contacts',
  GENERATE_EXPORTS: 'populate-exports',
  GENERATE_INVOICE_ALLOCATION: 'generate-invoice-allocation',
  GENERATE_PAYMENT_ALLOCATION: 'adjust-reserve-balance',
}
