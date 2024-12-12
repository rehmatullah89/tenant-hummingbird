import Vue from 'vue'
import VueRouter from 'vue-router'
import store from '../store'

Vue.use(VueRouter);

import ConfigurationRoutes from './configurationRoutes.js';
import BaseRoutes from './baseRoutes.js';
import ToolsRoutes from './toolsRoutes.js';
import ResiliencyRoutes from './resiliencyRoutes.js';
// import Onboarding from './onboarding.js';
import ServicesRoutes from './servicesRoutes.js'

const routes = [].concat(
  ConfigurationRoutes,
  BaseRoutes,

  ToolsRoutes,
  ResiliencyRoutes,
  // Onboarding,
  ServicesRoutes
);


const router = new VueRouter({
  mode: 'history',
  base: process.env.BASE_URL,
  routes
});

router.beforeEach( async (to, from, next) => {
  store.dispatch('authenticationStore/activeRoute', to);
  store.dispatch('authenticationStore/updateAuth');
  store.dispatch('authenticationStore/updateAdminType');  
  
  if (to.matched.some(record => record.meta.requiresAuth)) {
    // this route requires auth, check if logged in
    // if not, redirect to login page.
    if(!store.getters['authenticationStore/checkAuth']){
      // store.dispatch('statusStore/setStatus', {
      //   status: false,
      //   message: "You are not logged in. Please log in to continue"
      // });
      next({
        path: '/login',
        query: { redirect: to.fullPath }
      });

    } 
    else {
      // console.log(store.getters['authenticationStore/getUserType']);
      // if(to.meta.hasAccess && to.meta.hasAccess.indexOf(store.getters['authenticationStore/getUserType']) < 0){
      //  // this.errorSet('Login', "You are not authorized to access that location");
      //   if(store.getters['authenticationStore/getUserType']=== 'cocoonadmin') {
      //     next({
      //       path: '/onboarding',
      //       query: { redirect: to.fullPath }
      //     });
      //   }
      // }
      next();
    }
  } else {
    // if(to.meta.hasAccess && to.meta.hasAccess.indexOf(store.getters['authenticationStore/getUserType']) < 0){
    //   if(store.getters['authenticationStore/getUserType']=== 'cocoonadmin') {
    //      next({
    //        path: '/onboarding',
    //        query: { redirect: to.fullPath }
    //      });
    //    }
    //  }
    next();

  }
});

router.beforeEach( (to, from, next) => {
  store.dispatch('authenticationStore/setLoaded', true);
  next();
});

export default router
