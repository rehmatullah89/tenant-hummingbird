import Vue from 'vue';
// import 'ag-grid-enterprise';
// import "@ag-grid-enterprise/all-modules/dist/styles/ag-grid.css";
// import "@ag-grid-enterprise/all-modules/dist/styles/ag-theme-alpine.css";

// import {AllModules} from "@ag-grid-enterprise/all-modules";
import {LicenseManager} from "@ag-grid-enterprise/core";
LicenseManager.setLicenseKey("CompanyName=Tenant Inc,LicensedApplication=Hummingbird,LicenseType=SingleApplication,LicensedConcurrentDeveloperCount=4,LicensedProductionInstancesCount=1,AssetReference=AG-009150,ExpiryDate=28_July_2021_[v2]_MTYyNzQyNjgwMDAwMA==d48881ecca41e02fe68291559475716e");

import App from './App.vue';
// import './registerServiceWorker';
import router from './router';

import store from './store';
import vuetify from './plugins/vuetify';

import  VueResource from 'vue-resource';
import  VueClip from 'vue-clip';
import  StatusMessages from './plugins/StatusMessages.js';
import  HBLoading from './plugins/Loading.js';

import VeeValidate from 'vee-validate';
import draggable from 'vuedraggable';
import VueObserveVisibility from 'vue-observe-visibility';

import { VueMaskDirective } from 'v-mask';
Vue.directive('mask', VueMaskDirective);



// custom components

import HbBladeHeader from './aviary/HbBladeHeader.vue';
import HbBreadcrumb from './aviary/HbBreadcrumb.vue';
import HbBtn from './aviary/HbBtn.vue';
import HbHeaderInfo from './aviary/HbHeaderInfo.vue';
import HbHeader from './aviary/HbHeader.vue';
import HbHeaderActions from './aviary/HbHeaderActions.vue';
import HbIcon from './aviary/HbIcon.vue';
import HbIconGroup from './aviary/HbIconGroup.vue';
import HbInfoCard from './aviary/HbInfoCard.vue';
import HbModal from './aviary/HbModal.vue';
import HbNotification from './aviary/HbNotification.vue';
import HbPageHeader from './aviary/HbPageHeader.vue';
import HbStatus from './aviary/HbStatus.vue';
import HbLink from './aviary/HbLink.vue';
import HbTooltip from './aviary/HbTooltip.vue';


import HBAutoComplete from './aviary/HBAutoComplete.vue';
import HbSuccessError from './aviary/HbSuccessError.vue';
import HbForm from './aviary/HbForm.vue';

// custom components

Vue.component('hb-blade-header', HbBladeHeader);
Vue.component('hb-breadcrumb', HbBreadcrumb);
Vue.component('hb-btn', HbBtn);
Vue.component('hb-header-info', HbHeaderInfo);
Vue.component('hb-header', HbHeader);
Vue.component('hb-header-actions', HbHeaderActions);
Vue.component('hb-icon', HbIcon);
Vue.component('hb-icon-group', HbIconGroup);
Vue.component('hb-info-card', HbInfoCard);
Vue.component('hb-modal', HbModal);
Vue.component('hb-notification', HbNotification);
Vue.component('hb-page-header', HbPageHeader);
Vue.component('hb-status', HbStatus);
Vue.component('hb-link', HbLink);
Vue.component('hb-autocomplete', HBAutoComplete);
Vue.component('HbSuccessError', HbSuccessError);
Vue.component('HbForm', HbForm);
Vue.component('HbTooltip', HbTooltip);



Vue.use(VeeValidate, {
  events: 'blur'
});

Vue.use(VueResource);
Vue.use(VueClip);
Vue.use(StatusMessages);
Vue.use(HBLoading);
Vue.use(draggable);
Vue.use(VueObserveVisibility);
//Vue.use(VueGridLayout);

// Vue Resource Configuration
Vue.http.options.xhr = { withCredentials : true };
// var paths = location.hostname.split('.');
//var subdomain = paths[0];

console.log("process.env.VUE_APP_WORKER_SUBDOMAIN ", process.env ) 

// Vue.http.options.root = process.env.VUE_APP_API_PROTOCOL + '://' + process.env.VUE_APP_WORKER_SUBDOMAIN + '.' + process.env.VUE_APP_DOMAIN;
// Vue.http.options.root = process.env.VUE_APP_API_PROTOCOL + '://worker.' + process.env.VUE_APP_DOMAIN;

Vue.http.options.root = process.env.VUE_APP_API_PROTOCOL + '://' + process.env.VUE_APP_WORKER_SUBDOMAIN + '.' + process.env.VUE_APP_DOMAIN;

if( process.env.VUE_APP_WORKER_PORT && process.env.VUE_APP_WORKER_PORT !== "80"){
  Vue.http.options.root += ":" + process.env.VUE_APP_WORKER_PORT;
}  


console.log("process.env.VUE_APP_WORKER_SUBDOMAIN ", process.env )

 

Vue.http.interceptors.push((request, next)  => {

  if (store.getters['authenticationStore/checkAuth']){
    request.headers.set('authorization', localStorage.getItem('auth_token'));
  }

  next(function (response) {

    if(!response.body){
      console.log('General Err interceptors', JSON.stringify(response))
      response.body = {
        status: 500,
        msg: 'We could not process your request. Please try again later.'
      };
    }
    //TODO Fix this!
    if(response.body.status && response.body.status === 401){
      return store.dispatch('authenticationStore/logout');
      // invalidate login
      // set not logged in flag,
      // show login modal,
      // repeat the requests

    }
  }.bind(this));
});

// TODO Add router callbacks beforeEach
require('./filters');

Vue.config.productionTip = false;

new Vue({
  router,
  store,
  vuetify,
  render: h => h(App)
}).$mount('#app');
