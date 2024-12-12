import Vue from 'vue'
import Vuex from 'vuex'

Vue.use(Vuex);


import Authentication from './modules/authentication.js';
import Notifications  from './modules/notifications.js';
// import Status from './modules/status.js';
// import Navigation from './modules/navigation.js';

import createPersistedState from "vuex-persistedstate";
import * as Cookies from "js-cookie";



const authenticationStore = new Authentication();
const notificationsStore = new Notifications();

export default new Vuex.Store({
  strict: process.env.NODE_ENV !== 'production',
  //plugins: [vuexCookie.plugin],
  plugins: [
    createPersistedState({
      paths:[
        // 'authenticationStore',
      ],
      storage: {
        getItem: (key) => Cookies.get(key),
        // Please see https://github.com/js-cookie/js-cookie#json, on how to handle JSON.
        setItem: (key, value) =>
          Cookies.set(key, value, { expires: 3, secure: true }),
        removeItem: (key) => Cookies.remove(key),
      }
    })
  ],
  modules: {
    authenticationStore,
    notificationsStore
    // statusStore,
    // navigationStore
  }
})
