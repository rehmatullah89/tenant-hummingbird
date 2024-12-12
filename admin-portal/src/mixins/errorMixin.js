import Vue from 'vue/dist/vue.common.js';
export const errorMixin = {
	data() {
		return {
			errorList: {}
		}
	},
	methods:{
		errorSet(name, msg){
			
			this.errorList[name] = msg;
		},
		errorClear(name){
			return Vue.delete(this.errorList, name);
		},
		errorHas(name){
			return name in this.errorList;
		},
		errorGet(name){
			return this.errorList[name];
		}
	}
};