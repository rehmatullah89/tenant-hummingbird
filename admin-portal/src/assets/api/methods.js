import Vue from 'vue'
function serialize(obj){
	return Object.keys(obj).map(function(k){
		return encodeURIComponent(k) + '=' + encodeURIComponent(obj[k])
	}).join('&');
}

function redirectToLogin(response, storeContext, context){

	if ( (response.status == 401 || (response.body.success == false || response.body.code == 401) || response.body.status == 401) && storeContext) {

		if(context) context.errorSet('Login', response.body.msg);

		if (storeContext.getters && storeContext.getters['authenticationStore/getActiveRoute'].name !== 'Login'){
			storeContext.$route.query.redirect = storeContext.getters['authenticationStore/getActiveRoute'].path;
			storeContext.$router.push(storeContext.$store.getters['authenticationStore/getActiveRoute'].path);
		}

		if (storeContext.$store && storeContext.$store.getters && storeContext.$store.getters['authenticationStore/getActiveRoute'].name !== 'Login'){
			storeContext.$route.query.redirect = storeContext.$store.getters['authenticationStore/getActiveRoute'].path;
			storeContext.$router.push(storeContext.$store.getters['authenticationStore/getActiveRoute'].path);
		}
	}
	else if ( (response.status == 401 || (response.body.success == false || response.body.code == 401) || (response.body.status == 401) ) && !storeContext) {

		window.location.href = "/login";

	}
	throw new Error(!response.body.msg ? response.msg : response.body.msg);
}

export default {

	postFile(context, url,  data, files, contextField){
    context = context.$options ? context: null;

		contextField = contextField || context.$options.name;
		context.startLoading(contextField);
		context.errorClear(contextField);
		var formData = new FormData();

		for (var i = 0; i < files.length; i++) {
			formData.append('file', files[i]);
		}


		for(var key in data){
			if (!data.hasOwnProperty(key)) continue;
			formData.append(key, data[key]);
		}


		return context.$http.post(url, formData, {
			headers: {
				'Content-Type': 'multipart/form-data'
			}
		}).then(response => {
			context.stopLoading(contextField);
			if(response.body.status === true || response.body.status == 200) {
				if (response.body.msg){
					context.successSet(contextField, response.body.msg);
				}
				return response.body.data;
			}

			throw new Error(response.body.msg);

		}, response => {

			context.stopLoading(contextField);
			if(response.status == 401 && response.body.code == 'LOGIN'){
				context.errorSet('Login', response.body.msg);
				context.$router.push('/login');

			} else {
				if (response.body.msg) throw response.body.msg;
			}

		}).catch((err) => {
      var msg = err ? err.toString() : "An error occurred.";
      if(context){
        context.stopLoading(contextField);
        context.errorSet(contextField, msg);
      }
      return Promise.reject(err);
		});

	},

	post(context, url,  data, contextField = ''){
		context = context && context.$options ? context : null;
		if(context){
			contextField = contextField || context.$options.name;
			context.startLoading(contextField);
			context.errorClear(contextField);
		}
		return Vue.http.post(url, data).then(response => {
			if(context) context.stopLoading(contextField);
      console.log(response.body);
			if(response.body.status === true || response.body.status === 200) {
				if (response.body.msg){
					if(context) context.successSet(contextField, response.body.msg);
				}
				return response.body.data;
			}
			console.log(response.body);
			throw new Error(response.body.msg);

		}, response => {

      if(context) context.stopLoading(contextField);

		if(response.status == 401 && response.body.code == 'LOGIN'){
			if(context){
				context.errorSet('Login', response.body.msg);
				context.$router.push('/login');
			}
		} else {
			throw response.body.msg;
		}
		}).catch((err) => {
			var msg = err ? err.toString() : "An error occurred.";
			if(context){
				context.stopLoading(contextField);
				context.errorSet(contextField, msg);
      }
			return Promise.reject(err);
		});
	},

  put(context, url,  data, contextField){
    context = context && context.$options ? context : null;
    if(context){
      contextField = contextField || context.$options.name;
      context.startLoading(contextField);
      context.errorClear(contextField);
    }
		return Vue.http.put(url, data).then(response => {
      if(context) context.stopLoading(contextField);
			if(response.body.status === true || response.body.status === 200) {
				if (response.body.msg){
          if(context) context.successSet(contextField, response.body.msg);
				}
				return response.body.data;
			}

			throw new Error(response.body.msg);
		}, response => {
      if(context) context.stopLoading(contextField);

			if(response.status === 401 && response.body.code === 'LOGIN'){
        if(context){
          context.errorSet('Login', response.body.msg);
          context.$router.push('/login');
        }
			} else {
				throw response.body.msg;
			}
		}).catch((err) => {
      var msg = err ? err.toString() : "An error occurred.";
      if(context){
        context.stopLoading(contextField);
        context.errorSet(contextField, err);
      }
			return Promise.reject(err);
		})
	},

  patch(context, url,  data, contextField){
    context = context && context.$options ? context : null;
    if(context){
      contextField = contextField || context.$options.name;
      context.startLoading(contextField);
      context.errorClear(contextField);
    }
		return Vue.http.patch(url, data).then(response => {
      if(context) context.stopLoading(contextField);
			if(response.body.status === true || response.body.status === 200) {
				if (response.body.msg){
          if(context) context.successSet(contextField, response.body.msg);
				}
				return response.body.data;
			}
			throw new Error(response.body.msg);
		}, response => {
      if(context) context.stopLoading(contextField);

			if(response.status === 401 && response.body.code === 'LOGIN'){
        if(context){
          context.errorSet('Login', response.body.msg);
          context.$router.push('/login');
        }
			} else {
				throw response.body.msg;
			}
		}).catch((err) => {
      var msg = err ? err.toString() : "An error occurred.";
      if(context){
        context.stopLoading(contextField);
        context.errorSet(contextField, msg);
      }
			return Promise.reject(err);
		})
	},

  get(context, url, data, contextField){

	let storeContext = context;
    context = context && context.$options ? context : null;
	  if(data) url += '?' + serialize(data);
    if(context){
      contextField = contextField || context.$options.name;
      context.startLoading(contextField);
      context.errorClear(contextField);
	}

	return Vue.http.get(url).then(response => {
      		if(context) context.stopLoading(contextField);
			if(response.body.status === true || response.body.status == 200) {
				if (response.body.msg){
          			if(context) context.successSet(contextField, response.body.msg);
				}
				return response.body.data;
			}

			redirectToLogin(response, storeContext);

		}, response => {
			if(context) context.stopLoading(contextField);
			if(response && response.body){
				redirectToLogin(response, storeContext, context);
			}
			throw response;
		}).catch((err) => {
      var msg = err ? err.toString() : "An error occurred.";
      if(context){
        context.stopLoading(contextField);
        context.errorSet(contextField, msg);
      }
      return Promise.reject(err);
		})
	},

  delete(context, url, id, contextField){

    context = context && context.$options ? context : null;

    if(context){
      contextField = contextField || context.$options.name;
      context.startLoading(contextField);
      context.errorClear(contextField);
    }

		if(id) url += id;

		return Vue.http.delete(url).then(response => {
      if(context) context.stopLoading(contextField);
      if(response.body.status === true || response.body.status == 200) {
        if (response.body.msg){
          if(context) context.successSet(contextField, response.body.msg);
        }
        return response.body.data;
      }

			throw new Error(response.body.msg);

		}, response => {

      if(context) context.stopLoading(contextField);
      if(response.status == 401 && response.body.code == 'LOGIN'){
        if(context) context.errorSet('Login', response.body.msg);
        Vue.router.push('/login');

      } else {
        throw response.body.msg;
      }
		}).catch((err) => {
      var msg = err ? err.toString() : "An error occurred.";
      if(context){
        context.stopLoading(contextField);
        context.errorSet(contextField, msg);
      }
      return Promise.reject(err);
		})
	}
}
