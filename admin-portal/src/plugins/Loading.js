const  Loading = {
	install (Vue) {
		Vue.mixin({
			data() {
				return {
					loading_elements:[]
				}
			},
			methods:{
				startLoading(name){
					this.errorClear('login');
					if(this.loading_elements.indexOf(name) < 0 ) this.loading_elements.push(name);
				},
				stopLoading(name){
					return this.loading_elements.splice( this.loading_elements.indexOf(name), 1 );
				},

				isLoading(name){

					return this.loading_elements.indexOf(name) >= 0;
				},
				validate(context, contextField){

				  console.log("context", context)
          if(!contextField && (!context || !context.$options )) return false;
					contextField = contextField || context.$options.name;
					return Promise.resolve()
						.then(() => {
							context.errorClear(contextField);
							return context.$validator.validateAll()
						})
						.then(status => {
							if (!status) {
								context.errorSet(contextField, "You have errors on your form.  Please fix them before continuing");
								return false;
							}
							return true;
						});

				}
			}
		})
	}
};

export default Loading;
