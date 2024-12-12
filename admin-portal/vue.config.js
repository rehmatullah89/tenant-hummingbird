// process.env.VUE_APP_API_PORT = process.env.API_PORT;
// process.env.VUE_APP_WORKER_SUBDOMAIN =  process.env.WORKER_SUBDOMAIN;
// process.env.VUE_APP_WORKER_PORT =  process.env.WORKER_PORT;
// process.env.VUE_APP_DOMAIN = process.env.DOMAIN;
// process.env.VUE_APP_API_PROTOCOL = process.env.API_PROTOCOL;
// process.env.VUE_APP_WEBSOCKET_SERVER_APP_ENDPOINT = process.env.WEBSOCKET_SERVER_APP_ENDPOINT_PUBLIC;

module.exports = {
  "transpileDependencies": [ 
    "vuetify"
  ],
  lintOnSave: false,
  devServer: {
    disableHostCheck: true,
  },
  configureWebpack: config => {
    console.log("VUE_APP_API_SUBDOMAIN", process.env.VUE_APP_API_SUBDOMAIN)
    if (process.env.NODE_ENV === 'production') {
      // mutate config for production...
    } else {
      // mutate for development...
    }
  },
  chainWebpack: config => {
    // remove vue-cli-service's progress output
    config.plugins.delete('progress')
  },
  pages: {
    index: {
      // entry for the page
      entry: './src/main.js',
    }
  }
}
