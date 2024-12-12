module.exports = {
    config: {
        env: process.env.NODE_ENV,
        SLACK_WEBHOOK_URL: process.env.SLACK_WEBHOOK_URL

    },
    is_prod: process.env.NODE_ENV === 'production',
    is_uat: process.env.NODE_ENV === 'development',
    get_gds_api_key() {
        return  process.env.GDS_API_KEY;
      },
    get_logging_app_url() {
    let key = process.env.GDS_LOGGING_APP_ID || 'app2b8a133205c44e05b2ed7db733d240a5';
    return `${this.get_gds_url()}applications/${key}`;
    },
    get_gds_url() {
        let protocol = process.env.GDS_PROTOCOL || 'https';
        let domain = process.env.GDS_DOMAIN || 'uat.tenantapi.com/v3/';
        return `${protocol}://${domain}`;
    }
}