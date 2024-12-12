module.exports = {
    db: {
        username: process.env.MYSQL_USER,
        password: process.env.MYSQL_PASSWORD,
        host: process.env.MYSQL_HOST,
        database: process.env.MYSQL_DATABASE,
    },
    environment_name: 'worker',
    redis: {},
    redis_host: process.env.REDIS_HOST,
    config: {
        env: process.env.NODE_ENV,
        port: process.env.WORKER_PORT,
        domain: process.env.DOMAIN,
        ip: process.env.IP_ADDRESS,
        base_path: process.env.BASE_PATH,
        protocol: process.env.PROTOCOL,
        get_base_url: () => {
            let url = process.env.API_PROTOCOL + '://api.' + process.env.DOMAIN;
            if(process.env.API_PORT !== 80 && process.env.API_PORT !== 443){
                url += ":" +  process.env.API_PORT
            }
            url +="/v1/";
            return url;
        }
    },
    jobDB: {},
    img_path: 'files/',
    is_prod: process.env.NODE_ENV === 'production',
    is_uat: process.env.NODE_ENV === 'uat',
    is_staging: process.env.NODE_ENV === 'staging',
    //is_prod: true,
    base_path: '/home/node/storage/',
    mandrill_api_key: process.env.MANDRILL_API_KEY,
    twilio: {
        accountSid: process.env.TWILIO_ACCOUNT_SID,
        authToken: process.env.TWILIO_AUTH_TOKEN,
    },
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
    api_base_url: process.env.WEB_PROTOCOL + '://' + process.env.API_SUBDOMAIN + '.' + process.env.DOMAIN + ':' +  process.env.API_PORT + '/v1',
    getBaseUrl(subdomain){
        return  process.env.API_PROTOCOL + '://' + subdomain + '.' + process.env.DOMAIN;
    },
    get_gds_url() {
        let protocol = process.env.GDS_PROTOCOL || 'https';
        let domain = process.env.GDS_DOMAIN || 'uat.tenantapi.com/v3/';
        return `${protocol}://${domain}`;
    },
    get_logging_app_url() {
        let key = process.env.GDS_LOGGING_APP_ID || 'app2b8a133205c44e05b2ed7db733d240a5';
        return `${this.get_gds_url()}applications/${key}`;
      },
    get_messagebus_app_url() {
        let key = process.env.MESSAGE_BUS_APP_ID || 'app890184b2e17e432ea6eaa33dd47e7ba9';
        return `${this.get_gds_url()}applications/${key}/v1`;

    },
    get_communication_app_url() {
        let key = process.env.COMMUNICATION_APP_KEY || 'app46ee9e2226c4443293a471b42dab6c20';
        return `${this.get_gds_url()}applications/${key}/v1`;
    },
    get_sockets_app_url() {
        return `${process.env.WEBSOCKET_SERVER_APP_ENDPOINT || 'http://sockets:3004/v1/'}`
    },
    get_configured_reporting_emails(){
        let reporting_emails = process.env.WORKER_SERVER_REPORTING_EMAILS;
        let emailTo = (reporting_emails && reporting_emails !== "" && reporting_emails.split(',').map(m => m.trim())) || ['zrehman@ssidecisions.com'];
        return emailTo;
    },
    get_configured_reporting_email_names(){
        let names = process.env.WORKER_SERVER_REPORTING_EMAIL_NAMES;
        let email_names = (names && names !== "" && names.split(',').map(m => m.trim())) || ['Zeb'];
        return email_names;
    },
    get_website_app_url() {
        let key = process.env.WEBSITE_APP_KEY || 'app485ad426341647cfb0df5615500e3295';
        return `${this.get_gds_url()}applications/${key}/v1`;
    },
    get_pdf_generator_app_url() {
        let url = `${process.env.PDF_GENERATOR_ENDPOINT || 'http://pdf'}`;
        url +=  `:${process.env.PDF_PORT || ':3003'}`;
        return url;
    },
    url_shortner: {
        app_url: process.env.URL_SHORTNER_APP_URL || 'https://renter.link/rest/v1/short-urls',
        api_key: process.env.URL_SHORTNER_APP_API_KEY || '1d6e7df29d6c446fbbe8bae71d2a72d1',
    },
    get_gds_api_key() {
        return  process.env.GDS_API_KEY;
    },
    getDocumentManagerBaseUrl() {
        return `${this.get_gds_url()}applications/${process.env.DOCUMENT_MANAGER_APP_ID}`;
    },
    document_manager: {
        bucket_name: process.env.DOCUMENT_MANAGER_BUCKET_NAME
    },
    getDocumentManagerAppUrl() {
        // static END_POINT = 'https://docmanager.tenant-platform-dev.com/api/v1';
        const endPoint = `${this.getDocumentManagerBaseUrl()}/api/v1`;
        return endPoint;
    },
    getDocumentManagerRendererUrl() {
        const endPoint = `${this.getDocumentManagerBaseUrl()}/renderer/api/v1`;
        return endPoint;
    },
    get_share_report_app_url() {
        let key = process.env.SHARE_REPORT_APP_ID ||  "app1ebb2d356270415a8828fd005b3ed2d8";
        return key;
    },
    getNewRelicLogSize() {
        let threshold = process.env.NEW_RELIC_LOGS_SIZE_THRESHOLD ||  20000;
        return threshold;
    },
    getInvoiceConsolidationUrl() {
        return process.env.INVOICE_CONSOLIDATION_URL;
    }
};
