//import { errorMixin } from '../mixins/errorMixin.js';

export const loadingMixin = {
	data() {
		return {
			loading:[]
		}
	},
	methods:{
		startLoading(name){
			this.errorClear('login');
			if(this.loading.indexOf(name) < 0 ) this.loading.push(name);
		},
		stopLoading(name){
			return this.loading.splice( this.loading.indexOf(name), 1 );
		},
		isLoading(name){
			return this.loading.indexOf(name) >= 0;
		}
	}
};