import api from '../../assets/api.js';
import Vue from 'vue';
const types = {
    SET_LOADED: 'SET_LOADED',
    SET_ROLES: 'SET_ROLES',
    SET_ROLE_PERMISSIONS: 'SET_ROLE_PERMISSIONS',
    SET_CID: 'SET_CID',
    SET_USER_DATA: 'SET_USER_DATA',
    SET_COMPANY_DATA: 'SET_COMPANY_DATA',
    SET_GLOBAL_SETTINGS: 'SET_GLOBAL_SETTINGS',
    ACTIVE_ROUTE: 'ACTIVE_ROUTE',
    AUTHENTICATE: 'AUTHENTICATE',
    UPDATE_AUTH: 'UPDATE_AUTH',
    REMOVE_DATA: 'REMOVE_DATA',
    ADMIN_TYPE : 'ADMIN_TYPE'
}

class Authentication {
	constructor() {
		this.namespaced = true;
		this.state = {
      cid: null,
      contact: {
          role: null
      },
      activeRoute: '',
      is_authenticated: false,
      company: {
          name: null,
          logo: null
      },
      global_settings: {
          zoom_url: null
      },
      auth_token: '',
      activeNav: '',
      roles:[],
      rolePermissions : [],
      site_loaded: false,
      localStorage: window.localStorage,
      admin_tyoe : false
		};
		this.getters = {
            getCid: state => console.log("company", state.cid) || state.cid,
            getUserType: state => state.contact.role,
            getUserData: state => state.contact,
            getSubdomain: state => state.company.subdomain,
            getCompanyName: state => state.company.name,
            getCompany: state =>  state.company,
            getCompanyLogo: state => state.company.logo,
            getCompanyNames: state => { return state.contact.Companies ? state.contact.Companies.map(company=>company.name) : [] },
            getZoomURL: state => state.global_settings.zoom_url,
            isAdmin: state => state.is_authenticated && state.contact.role === 'admin',
            // isSuperAdmin: state => state.is_authenticated && state.contact.role === 'admin' && state.contact.id === 'DeMjRz0jrZ',
            isSuperAdmin: state => state.is_authenticated && state.contact.role === 'admin',
            isTenant: state => state.is_authenticated && state.contact.role === 'tenant',
            isCocoonAdmin: state => state.is_authenticated && state.admin_type === 'cocoonadmin',
            getToken: state => state.auth_token,
            getAuthHeader: state => state.localStorage.getItem('auth_token'),
            checkAuth: state => state.is_authenticated,
            isLoaded: state => state.site_loaded,
            hasPermission: state => { state.roles.filter(function(role){
                var permissions = Object.keys(state.activeRoute.meta.permissions);
                if(permissions.indexOf(role.name) > -1){
                    var permitted = state.activeRoute.meta.permissions[role.name];
                    return role.rolesPermissions.filter(function(r){
                        if(permitted.indexOf(r.name) > -1 ) {
                            return r.state;
                        }
                        return false
                    }).length;
                }
                return false;
            }).length; },
            rolePermission: (state) => (param = '') => {
                let check = state.rolePermissions.find(role => role.label === param);
                return check ? true : false;
            },
            getActiveRoute: state => state.activeRoute,
            getAdminType: state => state.localStorage.getItem('admin_type')
        };
		  this.actions = {
        authenticate({commit, dispatch}, payload){
            // localStorage.setItem('auth_token', payload.auth_token);
            // commit(types.AUTHENTICATE, payload.is_authenticated);
            dispatch('setAuthenticated', payload);
            commit(types.UPDATE_AUTH, payload.auth_token);
        },
			  setLoaded({commit}, payload) {
            commit(types.SET_LOADED, true);
        },
        setRoles({commit}, payload){
            commit(types.SET_ROLES, payload.roles);
        },
        setRolePermissions({commit}, payload){
            commit(types.SET_ROLE_PERMISSIONS, payload);
        },
        setUserData({commit}, payload) {
            commit(types.SET_USER_DATA, payload);
        },
        setCid({commit}, payload) {
          console.log("payload", payload)
          commit(types.SET_CID, payload);
        },
        activeRoute({commit}, payload) {
            commit(types.ACTIVE_ROUTE, payload);
        },
        setAuthenticated({commit}, payload) {
            localStorage.setItem('auth_token', payload.auth_token);
            commit(types.AUTHENTICATE, payload.is_authenticated);
        },
        logout({commit}, payload) {
            localStorage.removeItem('auth_token');
            localStorage.removeItem('admin_type');
            // TODO: This should be an API Call
            Vue.http.get('logout').then( response=>{
                if(response.body.status){
                    commit(types.UPDATE_AUTH);
                    commit(types.REMOVE_DATA);
                    commit(types.ADMIN_TYPE);
                }
            });
        },
        updateAuth({commit}, payload) {
            var jwt = localStorage.getItem('auth_token');

            if(jwt) {
                commit(types.UPDATE_AUTH, jwt);
                commit(types.AUTHENTICATE, true);
            } else {
                commit(types.AUTHENTICATE, false);
            }
        },
        setAdminType({commit}, payload) {
            localStorage.setItem('admin_type', payload);
            commit(types.ADMIN_TYPE, payload);
        },
        async getLoggedInUser({commit, dispatch, getters}, reload) {

          if (!getters.isLoaded || reload) {
            let response = await Vue.http.get('logged-in-user');
            if (response.body.code === 401 || response.body.status === 401) {
              Vue.router.push('/login');
            } else if (response.body.status) {
              commit(types.SET_USER_DATA, {
                contact: response.body.data.contact
              });
              commit(types.SET_LOADED, true);
            }
          }
        },
        updateAdminType({commit}) {
            var adminType = localStorage.getItem('admin_type');
            
            if(adminType) {
                commit(types.SET_USER_DATA, {
                    contact: {role : adminType}
                  });
                commit(types.ADMIN_TYPE, adminType);
            }
        },

		};
		this.mutations = {
      [types.SET_LOADED](state, isLoaded) {
        state.site_loaded = isLoaded;
      },
      [types.ACTIVE_ROUTE](state, payload) {
        state.activeRoute = payload;
      },
      [types.AUTHENTICATE](state, payload) {
        state.is_authenticated = payload;
      },
      [types.UPDATE_AUTH](state, payload) {
          state.auth_token = payload;
      },
      [types.SET_ROLES](state, payload) {
          state.roles = payload;
      },
      [types.SET_ROLE_PERMISSIONS](state, payload) {
          state.rolePermissions = payload;
      },
      [types.SET_USER_DATA](state, payload) {
          state.contact = payload.contact? payload.contact: payload;
      },
      [types.SET_CID](state, payload) {
        state.cid = payload.cid;
      },
      [types.SET_COMPANY_DATA](state, payload) {
          state.company = payload.company;
      },
      [types.SET_GLOBAL_SETTINGS](state, payload) {
          state.global_settings = payload;
      },
      [types.REMOVE_DATA](state, payload) {
          state.cid = null;
          state.contact = {};
          state.company = {};
          state.roles = [];
          state.rolePermissions = [];
      },
      [types.ADMIN_TYPE](state, payload) {  
        state.admin_type = payload;
    }
		};
	}
}

export default Authentication;
