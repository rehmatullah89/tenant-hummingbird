module.exports = {
    db: {
      username: process.env.MYSQL_USER,
      password: process.env.MYSQL_PASSWORD,
      host: process.env.MYSQL_HOST,
      database: process.env.MYSQL_DATABASE,
    },
    environment_name: 'app',
    redis: {},
    redis_host: process.env.REDIS_HOST,
    config: {
      env: process.env.NODE_ENV,
      port: process.env.API_PORT,
      domain: process.env.DOMAIN,
      ip: process.env.IP_ADDRESS,
      base_path: process.env.BASE_PATH,
      protocol: process.env.PROTOCOL,
      defaultFromEmail: process.env.DEFAULTFROMEMAIL || "account@tenantinc.com",
      get_base_url: (subdomain = 'api') => {
        let url = process.env.API_PROTOCOL + '://api.' + process.env.DOMAIN;
        if(process.env.API_PORT !== 80 && process.env.API_PORT !== 443){
          url += ":" +  process.env.API_PORT
        }
        url +="/v1/";
        return url;
      }
    },
    is_prod: process.env.NODE_ENV === 'production',
    is_uat: process.env.NODE_ENV === 'uat',
    is_staging: process.env.NODE_ENV === 'staging',
    baseURL: '',
    img_path: 'files/',
    mandrill_api_key: process.env.MANDRILL_API_KEY,
    twilio: {
      accountSid: process.env.TWILIO_ACCOUNT_SID,
      authToken: process.env.TWILIO_AUTH_TOKEN,
    },
	
    nectar_secret: process.env.NECTAR_SOURCE_SECRET_TOKEN,
    forte: {
        prod: {
            base_url:  process.env.FORTE_PROD_BASE_URL,
            organization_id: process.env.FORTE_PROD_ORG_ID,
            api_access_id: process.env.FORTE_PROD_ACCESS_ID,
            api_secure_key: process.env.FORTE_PROD_API_SECURE_KEY,
        },
        dev:{
            base_url:  process.env.FORTE_DEV_BASE_URL,
            organization_id: process.env.FORTE_DEV_ORG_ID,
            api_access_id: process.env.FORTE_DEV_ACCESS_ID,
            api_secure_key: process.env.FORTE_DEV_API_SECURE_KEY,
        }
    },
    quickbooks:{
        application_id: process.env.QUICKBOOKS_APP_ID,
        request_token: 'https://oauth.intuit.com/oauth/v1/get_request_token',
        user_authorization: 'https://appcenter.intuit.com/Connect/Begin',
        access_token: 'https://oauth.intuit.com/oauth/v1/get_access_token',
        disconnect_url: 'https://appcenter.intuit.com/api/v1/connection/disconnect',
        consumer_key: process.env.QUICKBOOKS_CONSUMER_KEY,
        consumer_secret: process.env.QUICKBOOKS_CONSUMER_SECRET,
        sandbox: process.env.QUICKBOOKS_SANDBOX,
        debug: process.env.QUICKBOOKS_DEBUG
    },
    security: {
        algorithm: process.env.SECURITY_ALGORITHM,
        key: process.env.SECURITY_KEY
    },
    kafka: {
      broker_address: process.env.KAFKA_BROKER
    },
    ledger: {
      base_url: process.env.ACCOUNTING_BASE_URL
    },
    message_bus_app_id: process.env.MESSAGE_BUS_APP_ID,
    dossier_app_id: process.env.DOSSIER_APP_ID,
    getBaseUrl(subdomain){
      return  process.env.WEB_PROTOCOL + '://' + subdomain + '.' + process.env.DOMAIN;
    },
  get_gds_api_key() {
    return  process.env.GDS_API_KEY;
  },
    get_gds_url() {
        let protocol = process.env.GDS_PROTOCOL || 'https';
        let domain = process.env.GDS_DOMAIN || 'uat.tenantapi.com/v3/';
        return `${protocol}://${domain}`;
    },
    get_messagebus_app_url() {
      let key = process.env.MESSAGE_BUS_APP_ID || 'app890184b2e17e432ea6eaa33dd47e7ba9';
      return `${this.get_gds_url()}applications/${key}/v1`;

    },
    get_communication_app_url() {
        let key = process.env.COMMUNICATION_APP_KEY || 'app46ee9e2226c4443293a471b42dab6c20';
        return `${this.get_gds_url()}applications/${key}/v1`;
    },
    get_website_app_url() {
      let key = process.env.WEBSITE_APP_KEY || 'app485ad426341647cfb0df5615500e3295';
      return `${this.get_gds_url()}applications/${key}/v1`;
    },
    get_logging_app_url() {
      let key = process.env.GDS_LOGGING_APP_ID || 'app2b8a133205c44e05b2ed7db733d240a5';
      return `${this.get_gds_url()}applications/${key}`;
    },
    get_sockets_app_url() {
      return `${process.env.WEBSOCKET_SERVER_APP_ENDPOINT || 'http://sockets:3004/v1/'}`
    },
    zoom: {
      api_key : process.env.ZOOM_API_KEY || 'TnEIX-I4QIylb5_VJ_-MMw',
      api_secret : process.env.ZOOM_API_SECRET || 'KGmrbM590wT6KjGMuCO3Ly9GMG9YcZ29FSJV',
      meeting_number : process.env.ZOOM_MEETING_NUMBER || '95157513404',
      meeting_password : process.env.ZOOM_MEETING_PASSWORD || '429658',
      leave_url : process.env.ZOOM_LEAVE_URL || 'http://sandbox.hummingbird.local/dashboard',
      role : process.env.ZOOM_HOST_ROLE || 0
    },
    get_pdf_generator_app_url() {
      let url = `${process.env.PDF_GENERATOR_ENDPOINT || 'http://pdf'}`;
      url +=  `:${process.env.PDF_PORT || ':3003'}`;
      url += '/v2/'; 
      return url;
    },
    url_shortner: {
      app_url: process.env.URL_SHORTNER_APP_URL || 'https://renter.link/rest/v1/short-urls',
      api_key: process.env.URL_SHORTNER_APP_API_KEY || '1d6e7df29d6c446fbbe8bae71d2a72d1',
    },
    error_recipients: [
      {
        to:  'Tenant QA',
        email: 'errors@tenantinc.com'
      } 
    ],
    getDocumentManagerAppUrl() {
      // static END_POINT = 'https://docmanager.tenant-platform-dev.com/api/v1';
      const DOCUMENT_MANAGER_APP_ID = process.env.DOCUMENT_MANAGER_APP_ID;
      const endPoint = `${this.get_gds_url()}applications/${DOCUMENT_MANAGER_APP_ID}/api/v1`;
      return endPoint;
    },
    document_manager: {
      bucket_name: process.env.DOCUMENT_MANAGER_BUCKET_NAME || 'dev.document.renderer'
    }
};
console.log("process.env.REDIS_HOST", process.env.REDIS_HOST);
